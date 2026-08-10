/**
 * MOTORE ECONOMICO/FISCALE — Ristorante Manager
 *
 * Filosofia: il motore NON sa niente di gameplay (clienti, recensioni,
 * attributi dello staff). Riceve in input i ricavi lordi del mese
 * (che un giorno arriveranno dal "match engine" del servizio) e produce
 * il quadro economico completo: buste paga, IVA, imposte, cassa, rischi.
 *
 * Tick di simulazione: 1 mese. Chiusura fiscale: a fine anno.
 * Tutte le funzioni sono pure salvo tickMese che usa un RNG iniettabile
 * (per test deterministici e replay delle partite).
 */

import { FISCAL_2026, FiscalConfig } from "./fiscal-config.ts";

// ─────────────────────────────────────────────── Tipi

export type FormaGiuridica = "ditta_forfettaria" | "ditta_ordinaria" | "srls" | "srl";

export type Ruolo = keyof typeof FISCAL_2026.ccnlLordoMensile;

export interface Dipendente {
  id: string;
  nome: string;
  ruolo: Ruolo;
  /** true = assunto regolarmente; false = in nero */
  inRegola: boolean;
  /** moltiplicatore sul minimo CCNL (1 = paga minima, 1.2 = +20%…) */
  superminimo: number;
}

export interface Ristorante {
  nome: string;
  forma: FormaGiuridica;
  /** anno di attività (1 = primo anno; rileva per forfettario startup 5%) */
  annoAttivita: number;
  cassa: number;
  dipendenti: Dipendente[];
  /** costi fissi mensili: affitto, utenze, assicurazioni… */
  costiFissiMensili: number;
  /** food cost come frazione dei ricavi (es. 0.32) */
  foodCostPct: number;
}

export interface EsitoMese {
  mese: number; // 1..12
  ricaviLordi: number; // IVA inclusa
  ricaviNetti: number; // imponibile
  ivaVendite: number;
  ivaAcquisti: number;
  ivaDaVersare: number;
  costoMateriePrime: number; // netto IVA
  costoPersonale: number;
  costiFissi: number;
  ispezioneSubita: boolean;
  sanzioni: number;
  utileOperativoMese: number;
  cassaFinale: number;
  eventi: string[];
}

export interface ChiusuraAnnuale {
  ricaviNettiAnnui: number;
  utileAnteImposte: number;
  contributiTitolare: number;
  imposte: number;
  dettaglio: string[];
  utileNetto: number;
}

// ─────────────────────────────────────────────── Payroll

/** Costo aziendale mensile di un dipendente (media su 12 mesi, 14 mensilità incluse). */
export function costoMensileDipendente(d: Dipendente, cfg: FiscalConfig): number {
  const lordoBase = cfg.ccnlLordoMensile[d.ruolo] * d.superminimo;
  const lordoAnnuo = lordoBase * cfg.inps.dipendenti.mensilita;
  if (!d.inRegola) {
    // in nero: si paga "il netto in busta" cash, niente contributi né TFR.
    // Approssimazione: netto ≈ 78% del lordo contrattuale.
    return (lordoAnnuo * 0.78) / 12;
  }
  const oneri =
    cfg.inps.dipendenti.aliquotaDatore + cfg.inps.dipendenti.inail + cfg.inps.dipendenti.tfr;
  return (lordoAnnuo * (1 + oneri)) / 12;
}

/** Contributi annui evasi per un lavoratore in nero (per il recupero in ispezione). */
function contributiEvasiAnnui(d: Dipendente, cfg: FiscalConfig): number {
  const lordoAnnuo = cfg.ccnlLordoMensile[d.ruolo] * d.superminimo * cfg.inps.dipendenti.mensilita;
  return lordoAnnuo * (cfg.inps.dipendenti.aliquotaDatore + cfg.inps.dipendenti.inail);
}

// ─────────────────────────────────────────────── Imposte

export function irpefProgressiva(imponibile: number, cfg: FiscalConfig): number {
  let residuo = Math.max(0, imponibile);
  let precedente = 0;
  let imposta = 0;
  for (const s of cfg.irpef.scaglioni) {
    const quota = Math.min(residuo, s.fino - precedente);
    if (quota <= 0) break;
    imposta += quota * s.aliquota;
    residuo -= quota;
    precedente = s.fino;
  }
  imposta += Math.max(0, imponibile) * cfg.irpef.addizionaliFlat;
  return imposta;
}

/** Chiusura fiscale annuale in base alla forma giuridica. */
export function chiusuraAnnuale(
  r: Ristorante,
  ricaviNettiAnnui: number,
  costiDeducibiliAnnui: number,
  cfg: FiscalConfig
): ChiusuraAnnuale {
  const dettaglio: string[] = [];
  const utileAnteImposte = ricaviNettiAnnui - costiDeducibiliAnnui;
  let imposte = 0;
  let contributiTitolare = 0;

  switch (r.forma) {
    case "ditta_forfettaria": {
      if (ricaviNettiAnnui > cfg.forfettario.limiteRicavi) {
        dettaglio.push(
          `⚠️ Ricavi ${fmt(ricaviNettiAnnui)} > limite ${fmt(cfg.forfettario.limiteRicavi)}: ` +
            `dall'anno prossimo esci dal forfettario!`
        );
      }
      // reddito forfettizzato: i costi reali NON contano
      const redditoForfait = ricaviNettiAnnui * cfg.forfettario.coeffRedditivita;
      contributiTitolare = contributiCommercianti(redditoForfait, cfg);
      const imponibile = Math.max(0, redditoForfait - contributiTitolare);
      const aliquota =
        r.annoAttivita <= cfg.forfettario.anniStartup
          ? cfg.forfettario.impostaSostitutivaStartup
          : cfg.forfettario.impostaSostitutiva;
      imposte = imponibile * aliquota;
      dettaglio.push(
        `Forfettario: reddito forfait ${fmt(redditoForfait)} (coeff. 40%), ` +
          `imposta sostitutiva ${(aliquota * 100).toFixed(0)}% = ${fmt(imposte)}`
      );
      break;
    }
    case "ditta_ordinaria": {
      contributiTitolare = contributiCommercianti(Math.max(0, utileAnteImposte), cfg);
      const imponibile = Math.max(0, utileAnteImposte - contributiTitolare);
      imposte = irpefProgressiva(imponibile, cfg);
      dettaglio.push(`Ordinario: IRPEF progressiva su ${fmt(imponibile)} = ${fmt(imposte)}`);
      break;
    }
    case "srls":
    case "srl": {
      const ires = Math.max(0, utileAnteImposte) * cfg.srl.ires;
      // IRAP semplificata: sul risultato + costo personale (proxy del valore produzione)
      const irap = Math.max(0, utileAnteImposte + costiDeducibiliAnnui * 0.35) * cfg.srl.irap;
      imposte = ires + irap;
      dettaglio.push(`SRL: IRES 24% = ${fmt(ires)}, IRAP ≈ ${fmt(irap)}`);
      dettaglio.push(`(l'utile netto resta in società: per prelevarlo servono dividendi o stipendio amministratore)`);
      break;
    }
  }

  const utileNetto = utileAnteImposte - imposte - contributiTitolare;
  return { ricaviNettiAnnui, utileAnteImposte, contributiTitolare, imposte, dettaglio, utileNetto };
}

function contributiCommercianti(reddito: number, cfg: FiscalConfig): number {
  const base = Math.max(reddito, cfg.inps.commercianti.minimaleReddito);
  return base * cfg.inps.commercianti.aliquota;
}

// ─────────────────────────────────────────────── Tick mensile

export function tickMese(
  r: Ristorante,
  mese: number,
  ricaviLordi: number,
  cfg: FiscalConfig,
  rng: () => number = Math.random
): EsitoMese {
  const eventi: string[] = [];

  // Inflazione mensile sui costi fissi e sul food cost
  const inflMensile = Math.pow(1 + cfg.inflazioneAnnua, 1 / 12) - 1;
  r.costiFissiMensili *= 1 + inflMensile;

  // IVA
  const ricaviNetti = ricaviLordi / (1 + cfg.iva.somministrazione);
  const ivaVendite = ricaviLordi - ricaviNetti;
  const costoMateriePrime = ricaviNetti * r.foodCostPct;
  const ivaAcquisti = costoMateriePrime * cfg.iva.mediaAcquisti;
  // Nel forfettario l'IVA non si applica: incassi tutto, ma non detrai nulla
  const forfait = r.forma === "ditta_forfettaria";
  const ivaDaVersare = forfait ? 0 : Math.max(0, ivaVendite - ivaAcquisti);

  // Personale
  const costoPersonale = r.dipendenti.reduce((s, d) => s + costoMensileDipendente(d, cfg), 0);

  // Ispezione lavoro nero
  const irregolari = r.dipendenti.filter((d) => !d.inRegola);
  let sanzioni = 0;
  let ispezioneSubita = false;
  if (irregolari.length > 0) {
    const p = cfg.lavoroNero.probIspezioneBase + cfg.lavoroNero.probPerIrregolare * irregolari.length;
    if (rng() < p) {
      ispezioneSubita = true;
      for (const d of irregolari) {
        const s =
          cfg.lavoroNero.sanzioneMin +
          rng() * (cfg.lavoroNero.sanzioneMax - cfg.lavoroNero.sanzioneMin);
        sanzioni += s;
        if (cfg.lavoroNero.recuperoContributi) sanzioni += contributiEvasiAnnui(d, cfg);
        d.inRegola = true; // regolarizzazione forzata
      }
      eventi.push(
        `🚨 Ispezione! ${irregolari.length} lavoratori in nero scoperti: ` +
          `sanzioni e recupero contributi per ${fmt(sanzioni)}. Ora sono regolarizzati.`
      );
    }
  }

  const utileOperativoMese =
    (forfait ? ricaviLordi : ricaviNetti) -
    costoMateriePrime * (forfait ? 1 + cfg.iva.mediaAcquisti : 1) -
    costoPersonale -
    r.costiFissiMensili -
    sanzioni;

  r.cassa += utileOperativoMese - ivaDaVersare;

  return {
    mese,
    ricaviLordi,
    ricaviNetti,
    ivaVendite,
    ivaAcquisti,
    ivaDaVersare,
    costoMateriePrime,
    costoPersonale,
    costiFissi: r.costiFissiMensili,
    ispezioneSubita,
    sanzioni,
    utileOperativoMese,
    cassaFinale: r.cassa,
    eventi,
  };
}

// ─────────────────────────────────────────────── Costituzione

export function costituisci(
  nome: string,
  forma: FormaGiuridica,
  budgetIniziale: number,
  cfg: FiscalConfig
): { ristorante: Ristorante; spese: number; log: string[] } {
  const log: string[] = [];
  const costoForma =
    forma === "ditta_forfettaria" || forma === "ditta_ordinaria"
      ? cfg.costituzione.dittaIndividuale
      : forma === "srls"
        ? cfg.costituzione.srls
        : cfg.costituzione.srl;
  const spese = costoForma + cfg.costituzione.sciaELicenze;
  log.push(`Costituzione ${forma}: ${fmt(costoForma)} + SCIA/licenze ${fmt(cfg.costituzione.sciaELicenze)}`);
  log.push(`Budget iniziale ${fmt(budgetIniziale)} → cassa ${fmt(budgetIniziale - spese)}`);
  return {
    ristorante: {
      nome,
      forma,
      annoAttivita: 1,
      cassa: budgetIniziale - spese,
      dipendenti: [],
      costiFissiMensili: 0,
      foodCostPct: 0.32,
    },
    spese,
    log,
  };
}

// ─────────────────────────────────────────────── Utility

export function fmt(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}