/**
 * TESORERIA — la cassa vera, con le scadenze vere.
 *
 * Qui vive la differenza tra "utile" e "sopravvivenza": il ristorante
 * incassa oggi ma paga fornitori a 30gg, F24 il 16 del mese dopo,
 * IVA a trimestre, quattordicesima a luglio, tredicesima e acconto IVA
 * a dicembre, saldo+primo acconto a giugno, secondo acconto a novembre.
 * Il TFR matura come debito silenzioso e esce solo quando qualcuno se ne va.
 *
 * Calendario scadenze implementato (semplificato ma realistico):
 *   16/2  → IVA nessuna (Q4 va a marzo), 4ª rata minimali INPS anno prec.
 *   16/3  → saldo IVA Q4 + conguaglio annuale
 *   16/5  → IVA Q1 + 1ª rata minimali INPS
 *   30/6  → saldo imposte anno prec. + 1° acconto + saldo/1° acconto contributi
 *   20/8  → IVA Q2 + 2ª rata minimali INPS
 *   16/11 → IVA Q3 + 3ª rata minimali INPS
 *   30/11 → 2° acconto imposte + 2° acconto contributi
 *   27/12 → acconto IVA (88%, metodo storico semplificato)
 *   ogni 16 del mese → contributi e ritenute dipendenti del mese precedente
 */

import { FiscalConfig } from "./fiscal-config.ts";
import { Ristorante, Dipendente, ChiusuraAnnuale, fmt } from "./engine.ts";

// ─────────────────────────────────────────────── Tipi

export interface Movimento {
  anno: number;
  mese: number;
  causale: string;
  importo: number; // positivo = entrata, negativo = uscita
}

export interface Tesoreria {
  saldo: number;
  fidoMax: number;
  /** debito TFR maturato verso i dipendenti (esce solo a fine rapporto) */
  tfrMaturato: number;
  /** IVA a debito accumulata nel trimestre corrente */
  ivaTrimestre: number;
  /** IVA versata negli ultimi 4 trimestri (per l'acconto di dicembre) */
  ivaVersataAnno: number;
  /** fatture fornitori da pagare (dilazione 30gg) */
  debitiFornitori: number;
  /** F24 dipendenti del 16 del mese successivo */
  f24MeseSuccessivo: number;
  /** imposte da saldare a giugno (chiusura anno precedente, al netto acconti) */
  saldoImposte: number;
  /** base per gli acconti dell'anno in corso (= imposta anno precedente) */
  baseAcconti: number;
  /** idem per i contributi del titolare eccedenti i minimali */
  saldoContributi: number;
  baseAccontiContributi: number;
  insolvente: boolean;
  movimenti: Movimento[];
}

export function nuovaTesoreria(saldoIniziale: number, cfg: FiscalConfig): Tesoreria {
  return {
    saldo: saldoIniziale,
    fidoMax: cfg.tesoreria.fidoDefault,
    tfrMaturato: 0,
    ivaTrimestre: 0,
    ivaVersataAnno: 0,
    debitiFornitori: 0,
    f24MeseSuccessivo: 0,
    saldoImposte: 0,
    baseAcconti: 0,
    saldoContributi: 0,
    baseAccontiContributi: 0,
    insolvente: false,
    movimenti: [],
  };
}

// ─────────────────────────────────────────────── Helpers

function paga(t: Tesoreria, anno: number, mese: number, causale: string, importo: number) {
  if (importo === 0) return;
  t.saldo += importo;
  t.movimenti.push({ anno, mese, causale, importo });
}

/** Lordo effettivo del mese: doppia mensilità a luglio (14ª) e dicembre (13ª). */
function lordoDelMese(d: Dipendente, mese: number, cfg: FiscalConfig): number {
  const base = cfg.ccnlLordoMensile[d.ruolo] * d.superminimo;
  const extra = mese === 7 || mese === 12 ? base : 0; // CCNL Pubblici Esercizi: 14 mensilità
  return base + extra;
}

// ─────────────────────────────────────────────── Tick mensile di cassa

export interface InputMese {
  anno: number;
  mese: number; // 1..12
  ricaviLordi: number; // IVA inclusa
  sanzioni: number; // da ispezioni (calcolate dal motore)
}

export function tickCassa(
  r: Ristorante,
  t: Tesoreria,
  inp: InputMese,
  cfg: FiscalConfig
): string[] {
  const { anno, mese } = inp;
  const eventi: string[] = [];
  const forfait = r.forma === "ditta_forfettaria";

  // 1) INCASSI — la ristorazione incassa subito (contanti/POS)
  paga(t, anno, mese, "Incassi", inp.ricaviLordi);

  // 2) FORNITORI — pago le fatture del mese scorso, accumulo quelle di oggi
  paga(t, anno, mese, "Fornitori (fatture mese prec.)", -t.debitiFornitori);
  const ricaviNetti = inp.ricaviLordi / (1 + cfg.iva.somministrazione);
  const materieNette = ricaviNetti * r.foodCostPct;
  const ivaAcquisti = materieNette * cfg.iva.mediaAcquisti;
  t.debitiFornitori = materieNette + ivaAcquisti; // pagherò il mese prossimo

  // 3) IVA del mese → accumulo nel trimestre (nel forfettario non esiste)
  if (!forfait) {
    const ivaVendite = inp.ricaviLordi - ricaviNetti;
    t.ivaTrimestre += Math.max(0, ivaVendite - ivaAcquisti);
  }

  // 4) STIPENDI — netto in busta a fine mese; contributi+ritenute nel F24 del 16
  paga(t, anno, mese, "F24 dipendenti (16 del mese)", -t.f24MeseSuccessivo);
  t.f24MeseSuccessivo = 0;
  for (const d of r.dipendenti) {
    const lordo = lordoDelMese(d, mese, cfg);
    if (d.inRegola) {
      paga(t, anno, mese, `Stipendio netto ${d.nome}`, -lordo * (1 - cfg.tesoreria.ritenuteDipendente));
      t.f24MeseSuccessivo +=
        lordo * (cfg.inps.dipendenti.aliquotaDatore + cfg.inps.dipendenti.inail) +
        lordo * cfg.tesoreria.ritenuteDipendente;
      t.tfrMaturato += lordo * cfg.inps.dipendenti.tfr;
    } else {
      paga(t, anno, mese, `Paga cash ${d.nome} (nero)`, -lordo * 0.78);
    }
  }
  if (mese === 7) eventi.push("💶 Quattordicesima: mese doppio di stipendi");
  if (mese === 12) eventi.push("💶 Tredicesima: mese doppio di stipendi");

  // 5) COSTI FISSI e SANZIONI
  paga(t, anno, mese, "Costi fissi", -r.costiFissiMensili);
  if (inp.sanzioni > 0) paga(t, anno, mese, "Sanzioni ispezione", -inp.sanzioni);

  // 6) SCADENZE FISCALI DEL MESE
  if (!forfait && (mese === 5 || mese === 8 || mese === 11 || mese === 3)) {
    // liquidazione trimestrale (marzo = Q4 anno precedente, semplificato)
    if (t.ivaTrimestre > 0) {
      paga(t, anno, mese, `Liquidazione IVA trimestrale`, -t.ivaTrimestre);
      t.ivaVersataAnno += t.ivaTrimestre;
      eventi.push(`🧾 IVA trimestrale: ${fmt(t.ivaTrimestre)}`);
      t.ivaTrimestre = 0;
    }
  }
  if (!forfait && mese === 12 && t.ivaVersataAnno > 0) {
    const acconto = (t.ivaVersataAnno / 3) * cfg.tesoreria.quotaAccontoIva;
    paga(t, anno, mese, "Acconto IVA 27/12", -acconto);
    t.ivaTrimestre -= acconto; // andrà a conguaglio nella liquidazione di marzo
    t.ivaVersataAnno = 0;
    eventi.push(`🧾 Acconto IVA di dicembre: ${fmt(acconto)}`);
  }

  // minimali INPS commercianti in 4 rate (5, 8, 11, 2)
  if (r.forma !== "srl" && r.forma !== "srls" && [5, 8, 11, 2].includes(mese)) {
    const rata = (cfg.inps.commercianti.minimaleReddito * cfg.inps.commercianti.aliquota) / 4;
    paga(t, anno, mese, "Rata minimali INPS commercianti", -rata);
  }

  // giugno: saldo + primo acconto
  if (mese === 6) {
    const primoAccImposte = t.baseAcconti * cfg.tesoreria.quotaPrimoAcconto;
    const primoAccContributi = t.baseAccontiContributi * cfg.tesoreria.quotaPrimoAcconto;
    const totale = t.saldoImposte + primoAccImposte + t.saldoContributi + primoAccContributi;
    if (totale > 0) {
      paga(t, anno, mese, "Saldo imposte anno prec. + 1° acconto", -(t.saldoImposte + primoAccImposte));
      paga(t, anno, mese, "Saldo contributi + 1° acconto", -(t.saldoContributi + primoAccContributi));
      eventi.push(`⚡ LA STANGATA DI GIUGNO: ${fmt(totale)} tra saldi e acconti`);
      t.saldoImposte = 0;
      t.saldoContributi = 0;
    }
  }
  // novembre: secondo acconto
  if (mese === 11) {
    const secondo =
      t.baseAcconti * cfg.tesoreria.quotaSecondoAcconto +
      t.baseAccontiContributi * cfg.tesoreria.quotaSecondoAcconto;
    if (secondo > 0) {
      paga(t, anno, mese, "2° acconto imposte e contributi", -secondo);
      eventi.push(`⚡ Secondo acconto di novembre: ${fmt(secondo)}`);
    }
  }

  // 7) FIDO E INTERESSI
  if (t.saldo < 0) {
    const interessi = -t.saldo * (cfg.tesoreria.tassoScoperto / 12);
    paga(t, anno, mese, "Interessi su scoperto", -interessi);
    eventi.push(`🏦 In rosso di ${fmt(-t.saldo)}: interessi ${fmt(interessi)}`);
  }
  if (t.saldo < -t.fidoMax) {
    t.insolvente = true;
    eventi.push(`💀 INSOLVENZA: sforato il fido di ${fmt(t.fidoMax)}. Game over (o piano di rientro).`);
  }

  return eventi;
}

// ─────────────────────────────────────────────── Chiusura d'anno

/**
 * Da chiamare dopo la chiusura fiscale: registra i debiti che scadranno
 * a giugno/novembre dell'anno successivo. Gli acconti già versati
 * quest'anno si scomputano dal saldo.
 */
export function registraChiusura(t: Tesoreria, ch: ChiusuraAnnuale, cfg: FiscalConfig) {
  const accontiVersati = t.baseAcconti; // 50%+50% = 100% dell'imposta anno prima
  t.saldoImposte = Math.max(0, ch.imposte - accontiVersati);
  t.baseAcconti = ch.imposte;

  const minimaliVersati =
    cfg.inps.commercianti.minimaleReddito * cfg.inps.commercianti.aliquota;
  const accContribVersati = t.baseAccontiContributi;
  t.saldoContributi = Math.max(0, ch.contributiTitolare - minimaliVersati - accContribVersati);
  t.baseAccontiContributi = Math.max(0, ch.contributiTitolare - minimaliVersati);
}

/** Fine rapporto: il TFR maturato esce dalla cassa. */
export function liquidaTfr(t: Tesoreria, anno: number, mese: number, quota: number) {
  paga(t, anno, mese, "Liquidazione TFR", -quota);
  t.tfrMaturato -= quota;
}