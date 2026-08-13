/**
 * IL CRUSCOTTO DEL COMMERCIALISTA — quello che ti sarebbe servito sapere
 * un mese prima.
 *
 * Non calcola niente di nuovo: proietta in avanti quello che tesoreria,
 * contratti e controlli già sanno. Il valore non è nel numero, è nel
 * TEMPO: vedere a marzo che a giugno arrivano saldo, primo acconto e
 * quattordicesima ravvicinati è ciò che ti salva.
 *
 * La qualità dell'avviso scala col commercialista scelto: quello online
 * ti manda il promemoria, lo studio strutturato ti dice cosa fare prima.
 */

import type { FiscalConfig } from "./fiscal-config.ts";

export type Certezza = "certa" | "stimata";

export interface Scadenza {
  mesiAvanti: number;   // 0 = questo mese
  mese: number;         // 1..12
  voce: string;
  importo: number;
  certezza: Certezza;
  /** true per le scadenze che affossano la cassa se non le prepari */
  critica: boolean;
}

export interface Consiglio {
  gravita: "info" | "attenzione" | "allarme";
  testo: string;
}

export interface CruscottoInput {
  mese: number;
  forma: string;
  /** dalla tesoreria */
  f24MeseSuccessivo: number;
  ivaTrimestre: number;
  saldoImposte: number;
  baseAcconti: number;
  saldoContributi: number;
  baseAccontiContributi: number;
  tfrMaturato: number;
  cassa: number;
  fidoMax: number;
  /** costo del personale del mese (somma delle buste) */
  costoPersonaleMese: number;
  /** rate di sanzioni ancora da pagare */
  rateSanzioniMese: number;
  /** livello del commercialista: 0..1 */
  affidabilitaCommercialista: number;
  bonusBandi: number;
  /** segnali dal resto del motore */
  durcIrregolare: boolean;
  obblighiFormativiMancanti: number;
  foodCostAttuale: number;
  quotaNeraAnno: number;
  rischioFiscale: number;
  ferieMaturateGiorni: number;
}

const NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const avanti = (mese: number, n: number) => ((mese - 1 + n) % 12) + 1;

/**
 * Scadenze dei prossimi N mesi. Le date seguono il calendario che
 * tesoreria.ts già applica: F24 il 16, IVA trimestrale, acconti a giugno
 * e novembre, acconto IVA a dicembre, 14ª a luglio e 13ª a dicembre.
 */
export function previsioniScadenze(inp: CruscottoInput, cfg: FiscalConfig, mesiAvanti = 4): Scadenza[] {
  const out: Scadenza[] = [];
  const societa = inp.forma === "srl" || inp.forma === "srls";
  const forfait = inp.forma === "ditta_forfettaria";

  for (let k = 0; k <= mesiAvanti; k++) {
    const m = avanti(inp.mese, k);

    // F24 dipendenti: ogni mese, sul mese precedente
    if (inp.f24MeseSuccessivo > 0) {
      out.push({
        mesiAvanti: k, mese: m, voce: "F24 contributi e ritenute dipendenti",
        importo: k === 0 ? inp.f24MeseSuccessivo : inp.costoPersonaleMese * 0.42,
        certezza: k === 0 ? "certa" : "stimata", critica: false,
      });
    }

    // IVA trimestrale
    if (!forfait && [3, 5, 8, 11].includes(m)) {
      const iva = Math.max(0, k === 0 ? inp.ivaTrimestre : inp.ivaTrimestre * (1 + k * 0.3));
      if (iva > 0) {
        out.push({
          mesiAvanti: k, mese: m, voce: "Liquidazione IVA trimestrale",
          importo: iva, certezza: k === 0 ? "certa" : "stimata", critica: true,
        });
      }
    }

    // acconto IVA di dicembre
    if (!forfait && m === 12 && inp.ivaTrimestre > 0) {
      out.push({ mesiAvanti: k, mese: m, voce: "Acconto IVA (27/12)", importo: inp.ivaTrimestre * 0.88, certezza: "stimata", critica: true });
    }

    // minimali INPS commercianti, 4 rate
    if (!societa && [2, 5, 8, 11].includes(m)) {
      out.push({
        mesiAvanti: k, mese: m, voce: "Rata minimali INPS commercianti",
        importo: (cfg.inps.commercianti.minimaleReddito * cfg.inps.commercianti.aliquota) / 4,
        certezza: "certa", critica: false,
      });
    }

    // giugno: la stangata
    if (m === 6) {
      const tot = inp.saldoImposte + inp.baseAcconti * cfg.tesoreria.quotaPrimoAcconto
        + inp.saldoContributi + inp.baseAccontiContributi * cfg.tesoreria.quotaPrimoAcconto;
      if (tot > 0) out.push({ mesiAvanti: k, mese: m, voce: "Saldo imposte + primo acconto", importo: tot, certezza: "certa", critica: true });
    }
    // novembre: secondo acconto
    if (m === 11) {
      const tot = (inp.baseAcconti + inp.baseAccontiContributi) * cfg.tesoreria.quotaSecondoAcconto;
      if (tot > 0) out.push({ mesiAvanti: k, mese: m, voce: "Secondo acconto imposte e contributi", importo: tot, certezza: "certa", critica: true });
    }

    // mensilità aggiuntive
    if (m === 7) out.push({ mesiAvanti: k, mese: m, voce: "Quattordicesima", importo: inp.costoPersonaleMese, certezza: "stimata", critica: true });
    if (m === 12) out.push({ mesiAvanti: k, mese: m, voce: "Tredicesima", importo: inp.costoPersonaleMese, certezza: "stimata", critica: true });

    // rate sanzioni in corso
    if (inp.rateSanzioniMese > 0) {
      out.push({ mesiAvanti: k, mese: m, voce: "Rata sanzioni", importo: inp.rateSanzioniMese, certezza: "certa", critica: false });
    }
  }
  return out.sort((a, b) => a.mesiAvanti - b.mesiAvanti);
}

/** Quanto esce, mese per mese, nei prossimi N mesi. */
export function usciteProiettate(scadenze: Scadenza[], mesiAvanti = 4): Array<{ mesiAvanti: number; mese: number; totale: number }> {
  const per = new Map<number, { mese: number; totale: number }>();
  for (const s of scadenze) {
    if (s.mesiAvanti > mesiAvanti) continue;
    const e = per.get(s.mesiAvanti) ?? { mese: s.mese, totale: 0 };
    e.totale += s.importo;
    per.set(s.mesiAvanti, e);
  }
  return [...per.entries()]
    .map(([mesiAvanti, v]) => ({ mesiAvanti, ...v }))
    .sort((a, b) => a.mesiAvanti - b.mesiAvanti);
}

/**
 * I consigli. Quanti ne vedi e con quanto anticipo dipende da chi ti
 * tiene la contabilità: è il motivo per cui pagare uno studio serio non
 * è una spesa cosmetica.
 */
export function consigliCommercialista(inp: CruscottoInput, scadenze: Scadenza[]): Consiglio[] {
  const out: Consiglio[] = [];
  const q = inp.affidabilitaCommercialista;
  /** orizzonte di preavviso: 1 mese per l'online, 4 per lo studio strutturato */
  const orizzonte = q >= 0.96 ? 4 : q >= 0.9 ? 3 : 1;

  // ── Cassa contro scadenze
  const prossime = scadenze.filter((s) => s.mesiAvanti > 0 && s.mesiAvanti <= orizzonte && s.critica);
  const totale = prossime.reduce((a, s) => a + s.importo, 0);
  if (totale > 0) {
    const copertura = inp.cassa + inp.fidoMax - totale;
    if (copertura < 0) {
      out.push({
        gravita: "allarme",
        testo: `Nei prossimi ${orizzonte} mesi scadono ${Math.round(totale).toLocaleString("it-IT")}€ tra imposte e mensilità: con la cassa di oggi non ci arrivi. Muoviti adesso, non a giugno.`,
      });
    } else if (copertura < totale * 0.3) {
      out.push({
        gravita: "attenzione",
        testo: `${Math.round(totale).toLocaleString("it-IT")}€ di scadenze entro ${orizzonte} mesi: ci arrivi, ma senza margine. Metti da parte da questo mese.`,
      });
    }
  }

  if (inp.cassa < 0) {
    out.unshift({
      gravita: "allarme",
      testo: `Sei in rosso di ${Math.round(-inp.cassa).toLocaleString("it-IT")}€ sul fido: ogni mese paghi interessi e il margine di manovra si stringe. Prima di tutto il resto, rimetti in ordine la cassa.`,
    });
  }

  // ── Concentrazioni pericolose
  const giugno = scadenze.find((s) => s.mese === 6 && s.critica && s.mesiAvanti <= orizzonte);
  const luglio = scadenze.find((s) => s.mese === 7 && s.critica && s.mesiAvanti <= orizzonte);
  if (giugno && luglio) {
    out.push({
      gravita: "attenzione",
      testo: "Attenzione a giugno e luglio: saldo, primo acconto e quattordicesima cadono a due settimane di distanza. È il punto in cui saltano più ristoranti.",
    });
  }

  // ── Segnali dal resto della gestione
  if (inp.durcIrregolare) {
    out.push({ gravita: "allarme", testo: "DURC irregolare: finché non rientri sei fuori da bandi e sgravi. Sistemare i contributi è la priorità." });
  }
  if (inp.obblighiFormativiMancanti > 0 && q >= 0.9) {
    out.push({
      gravita: "attenzione",
      testo: `${inp.obblighiFormativiMancanti} corsi obbligatori mancanti o scaduti: in un'ispezione è la prima cosa che chiedono.`,
    });
  }
  if (inp.foodCostAttuale > 0.42) {
    out.push({
      gravita: "attenzione",
      testo: `Food cost al ${Math.round(inp.foodCostAttuale * 100)}%: sopra il 40% il margine non regge. Prezzi, fornitori o menu — qualcosa va toccato.`,
    });
  }
  if (inp.rischioFiscale > 0.45 && q >= 0.9) {
    out.push({
      gravita: "allarme",
      testo: "I conti dichiarati non stanno insieme con gli acquisti. Con questi numeri una verifica è questione di tempo, e la ricostruzione dei ricavi la fanno loro.",
    });
  } else if (inp.quotaNeraAnno > 0.2 && q >= 0.96) {
    out.push({
      gravita: "attenzione",
      testo: "Una quota rilevante degli incassi non passa dai registri: il risparmio di oggi è un debito potenziale, e ti chiude l'accesso ai contributi pubblici.",
    });
  }
  if (inp.ferieMaturateGiorni > 60) {
    out.push({
      gravita: "info",
      testo: `${Math.round(inp.ferieMaturateGiorni)} giorni di ferie maturati e non goduti: è un debito in bilancio, e prima o poi va smaltito.`,
    });
  }
  if (inp.tfrMaturato > inp.cassa * 0.5 && inp.tfrMaturato > 5_000) {
    out.push({
      gravita: "attenzione",
      testo: `TFR accantonato ${Math.round(inp.tfrMaturato).toLocaleString("it-IT")}€: se qualcuno se ne va, esce dalla cassa tutto insieme.`,
    });
  }

  if (!out.length) {
    out.push({ gravita: "info", testo: q >= 0.9 ? "Conti in ordine. Niente da segnalare questo mese." : "Nessun promemoria." });
  }
  // il commercialista scarso ne vede meno
  return q >= 0.9 ? out : out.slice(0, 2);
}

export const nomeMeseIt = (m: number) => NOMI_MESI[((m - 1) % 12 + 12) % 12];