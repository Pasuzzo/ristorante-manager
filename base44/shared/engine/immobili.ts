/**
 * IMMOBILI — la bacheca dei locali disponibili.
 *
 * ═══ PERCHÉ NON SI PRENDONO DAI PORTALI IMMOBILIARI ═══
 * Immobiliare.it, Idealista, Casa.it e Subito vietano lo scraping nei
 * termini di servizio: gli annunci sono contenuti protetti e il database
 * è tutelato. Inoltre sarebbe fragile (cambia l'HTML, il gioco si rompe)
 * e sbagliato per il game design: un annuncio vero sparisce, e chi
 * ricomincia la partita non ritroverebbe mai lo stesso locale.
 *
 * ═══ COSA SI USA INVECE ═══
 * Le quotazioni OMI dell'Agenzia delle Entrate: per ogni zona omogenea
 * di ogni comune danno l'intervallo min/max in €/mq sia di VENDITA sia
 * di LOCAZIONE, per tipologia immobiliare. Sono dati ufficiali, gratuiti,
 * semestrali, scaricabili in CSV, e vanno bene per un uso offline.
 *
 * Il modulo genera annunci PLAUSIBILI ancorati a quei valori reali:
 * il prezzo è vero, l'annuncio è di fantasia. Vantaggi: nessun problema
 * legale, nessuna dipendenza di rete durante il gioco, e il seed rend
 * la bacheca riproducibile.
 *
 * ⚠️ LICENZA: i dati OMI vanno citati come "Agenzia Entrate - OMI".
 * La licenza NON è un'aperta CC-BY e l'uso commerciale non è
 * esplicitamente concesso: se il gioco diventa a pagamento, verifica le
 * condizioni contrattuali sul portale dell'Agenzia prima di pubblicare.
 *
 * ⚠️ Il download richiede autenticazione (SPID / Fisconline / Entratel),
 * quindi NON si può automatizzare dentro il gioco: si scarica il CSV a
 * mano una volta a semestre e si carica nell'entità `ZonaOmi`.
 */

// ─────────────────────────────────────────────── Dati OMI

/** Una riga di quotazione OMI, come arriva dal CSV (semplificata). */
export interface QuotazioneOmi {
  comune: string;
  provincia: string;
  /** codice zona OMI (es. "B1") */
  zona: string;
  /** descrizione della zona come la scrive l'Agenzia */
  descrizioneZona: string;
  /** tipologia: per noi interessa "Negozi" e "Laboratori" */
  tipologia: string;
  /** posizione commerciale per i negozi: ottima / normale / scadente */
  posizioneCommerciale: "ottima" | "normale" | "scadente";
  /** €/mq di compravendita */
  vendiraMin: number;
  vendiraMax: number;
  /** €/mq AL MESE di locazione */
  affittoMin: number;
  affittoMax: number;
  semestre: string; // es. "2026-1"
}

/**
 * Seed di esempio per Rimini — VALORI PLAUSIBILI, NON UFFICIALI.
 * Da sostituire con il CSV vero scaricato dall'Agenzia delle Entrate.
 * Servono solo a far girare il generatore prima di avere i dati reali.
 */
export const OMI_ESEMPIO: QuotazioneOmi[] = [
  { comune: "Rimini", provincia: "RN", zona: "B1", descrizioneZona: "Centro storico", tipologia: "Negozi", posizioneCommerciale: "ottima", vendiraMin: 2400, vendiraMax: 3600, affittoMin: 14, affittoMax: 22, semestre: "2026-1" },
  { comune: "Rimini", provincia: "RN", zona: "B2", descrizioneZona: "Marina Centro", tipologia: "Negozi", posizioneCommerciale: "ottima", vendiraMin: 2800, vendiraMax: 4200, affittoMin: 18, affittoMax: 28, semestre: "2026-1" },
  { comune: "Rimini", provincia: "RN", zona: "C1", descrizioneZona: "Semicentro / Viserba", tipologia: "Negozi", posizioneCommerciale: "normale", vendiraMin: 1500, vendiraMax: 2200, affittoMin: 9, affittoMax: 14, semestre: "2026-1" },
  { comune: "Rimini", provincia: "RN", zona: "D1", descrizioneZona: "Periferia / zona artigianale", tipologia: "Negozi", posizioneCommerciale: "scadente", vendiraMin: 900, vendiraMax: 1400, affittoMin: 5, affittoMax: 9, semestre: "2026-1" },
  { comune: "Rimini", provincia: "RN", zona: "E1", descrizioneZona: "Forese / extraurbano", tipologia: "Negozi", posizioneCommerciale: "scadente", vendiraMin: 650, vendiraMax: 1000, affittoMin: 4, affittoMax: 7, semestre: "2026-1" },
];

// ─────────────────────────────────────────────── Annuncio generato

export type StatoImmobileAnnuncio = "da_ristrutturare" | "grezzo" | "buono" | "chiavi_in_mano";
export type TipoOfferta = "affitto" | "vendita" | "entrambi";

export interface Annuncio {
  id: string;
  titolo: string;
  descrizione: string;
  comune: string;
  zonaOmi: string;
  descrizioneZona: string;
  posizioneCommerciale: "ottima" | "normale" | "scadente";
  mq: number;
  postiStimati: number;
  postiEsterniPossibili: number;
  stato: StatoImmobileAnnuncio;
  impiantiPresenti: boolean;
  tipoOfferta: TipoOfferta;
  /** canone mensile richiesto (se affittabile) */
  canoneMensile?: number;
  /** prezzo di vendita richiesto (se in vendita) */
  prezzoVendita?: number;
  /** già stato un ristorante: cappa e allacci ci sono, ma c'è l'avviamento da pagare */
  exRistorante: boolean;
  /** buonuscita richiesta dal gestore uscente */
  avviamento?: number;
  /** punti di forza e criticità, per l'UI */
  pro: string[];
  contro: string[];
  /** moltiplicatore di passaggio, da passare al motore ricavi */
  passaggio: number;
  fonteQuotazione: string;
}

// ─────────────────────────────────────────────── Generatore

const STATI: Array<{ s: StatoImmobileAnnuncio; peso: number; scontoCanone: number; etichetta: string }> = [
  { s: "da_ristrutturare", peso: 25, scontoCanone: 0.62, etichetta: "da ristrutturare completamente" },
  { s: "grezzo", peso: 22, scontoCanone: 0.78, etichetta: "al grezzo, impianti da completare" },
  { s: "buono", peso: 35, scontoCanone: 1.0, etichetta: "in buono stato" },
  { s: "chiavi_in_mano", peso: 18, scontoCanone: 1.22, etichetta: "chiavi in mano, pronto ad aprire" },
];

const PASSAGGIO_POSIZIONE = { ottima: 1.3, normale: 1.0, scadente: 0.72 };

function pesca<T extends { peso: number }>(arr: T[], rng: () => number): T {
  const tot = arr.reduce((s, x) => s + x.peso, 0);
  let r = rng() * tot;
  for (const x of arr) { r -= x.peso; if (r <= 0) return x; }
  return arr[arr.length - 1];
}

const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

export interface OpzioniBacheca {
  /** quanti annunci mostrare */
  quanti?: number;
  /** budget del giocatore: filtra ciò che è fuori portata */
  budgetMax?: number;
  /** superficie desiderata */
  mqMin?: number;
  mqMax?: number;
  soloAffitto?: boolean;
}

export function generaAnnuncio(q: QuotazioneOmi, id: string, rng: () => number): Annuncio {
  const mq = Math.round(lerp(60, 260, Math.pow(rng(), 1.4)));
  const stato = pesca(STATI, rng);
  const exRistorante = rng() < 0.35;
  const impiantiPresenti = exRistorante || stato.s === "chiavi_in_mano" || rng() < 0.15;

  // posizione nell'intervallo OMI: più il locale è messo bene, più sta in alto
  const t = Math.min(1, Math.max(0, (rng() * 0.7) + (stato.s === "chiavi_in_mano" ? 0.3 : stato.s === "buono" ? 0.15 : 0)));
  const canoneMqMese = lerp(q.affittoMin, q.affittoMax, t) * stato.scontoCanone;
  const prezzoMq = lerp(q.vendiraMin, q.vendiraMax, t) * (0.85 + stato.scontoCanone * 0.15);

  const rOfferta = rng();
  const tipoOfferta: TipoOfferta = rOfferta < 0.62 ? "affitto" : rOfferta < 0.85 ? "vendita" : "entrambi";

  const postiStimati = Math.floor((mq * 0.6) / 1.4); // ~60% è sala, 1,4 mq a coperto
  const postiEsterniPossibili = q.posizioneCommerciale === "scadente" ? Math.floor(rng() * 8) : Math.floor(rng() * 26);

  const pro: string[] = [];
  const contro: string[] = [];
  if (q.posizioneCommerciale === "ottima") pro.push("Posizione commerciale ottima: molto passaggio");
  if (q.posizioneCommerciale === "scadente") contro.push("Posizione defilata: dovrai portarti i clienti da solo");
  if (impiantiPresenti) pro.push("Cappa e allacci già presenti: risparmi circa 21.500 €");
  else contro.push("Nessun impianto: cappa, canna fumaria e allacci a tuo carico");
  if (stato.s === "chiavi_in_mano") pro.push("Pronto ad aprire: allestimento minimo");
  if (stato.s === "da_ristrutturare") contro.push("Ristrutturazione pesante: mesi di lavori e budget alto");
  if (postiEsterniPossibili > 14) pro.push(`Spazio esterno per ~${postiEsterniPossibili} coperti (paga il suolo pubblico)`);
  if (mq / Math.max(1, postiStimati) < 1.3) contro.push("Metratura stretta per i coperti dichiarati");

  let avviamento: number | undefined;
  if (exRistorante) {
    avviamento = Math.round((canoneMqMese * mq) * (6 + rng() * 18));
    pro.push("Già attivo come ristorante: licenze e layout collaudati");
    contro.push(`Buonuscita richiesta dal gestore uscente: ${eur(avviamento)}`);
  }

  const titolo = `${exRistorante ? "Ristorante avviato" : "Locale commerciale"} ${mq} mq — ${q.descrizioneZona}`;

  return {
    id, titolo,
    descrizione: `${mq} mq ${stato.etichetta}, in zona ${q.descrizioneZona} (${q.comune}). ` +
      `Posizione commerciale ${q.posizioneCommerciale}. ` +
      `${impiantiPresenti ? "Impianti di aspirazione presenti." : "Impianti da realizzare."} ` +
      `Circa ${postiStimati} coperti interni${postiEsterniPossibili ? ` più ${postiEsterniPossibili} esterni` : ""}.`,
    comune: q.comune, zonaOmi: q.zona, descrizioneZona: q.descrizioneZona,
    posizioneCommerciale: q.posizioneCommerciale,
    mq, postiStimati, postiEsterniPossibili,
    stato: stato.s, impiantiPresenti, tipoOfferta,
    canoneMensile: tipoOfferta !== "vendita" ? Math.round(canoneMqMese * mq) : undefined,
    prezzoVendita: tipoOfferta !== "affitto" ? Math.round(prezzoMq * mq / 1000) * 1000 : undefined,
    exRistorante, avviamento, pro, contro,
    passaggio: PASSAGGIO_POSIZIONE[q.posizioneCommerciale] * (0.92 + rng() * 0.16),
    fonteQuotazione: `Agenzia Entrate - OMI, zona ${q.zona}, semestre ${q.semestre}`,
  };
}

/** La bacheca: annunci filtrati sul budget e sulle preferenze del giocatore. */
export function generaBacheca(
  quotazioni: QuotazioneOmi[],
  opt: OpzioniBacheca,
  rng: () => number
): Annuncio[] {
  const quanti = opt.quanti ?? 8;
  const out: Annuncio[] = [];
  let tentativi = 0;
  while (out.length < quanti && tentativi < quanti * 12) {
    tentativi++;
    const q = quotazioni[Math.floor(rng() * quotazioni.length)];
    const a = generaAnnuncio(q, `imm-${tentativi}-${Math.floor(rng() * 1e6)}`, rng);
    if (opt.soloAffitto && a.tipoOfferta === "vendita") continue;
    if (opt.mqMin && a.mq < opt.mqMin) continue;
    if (opt.mqMax && a.mq > opt.mqMax) continue;
    if (opt.budgetMax) {
      // costo d'ingresso: cauzione + avviamento, oppure prezzo pieno se compri
      const ingresso = a.tipoOfferta === "vendita"
        ? (a.prezzoVendita ?? 0)
        : (a.canoneMensile ?? 0) * 4.5 + (a.avviamento ?? 0);
      if (ingresso > opt.budgetMax) continue;
    }
    out.push(a);
  }
  return out;
}

/** Converte l'annuncio scelto nella ConfigLocale usata da costi-avvio.ts. */
export function annuncioAConfigLocale(a: Annuncio, modalita: "affitto" | "acquisto" | "acquisto_mutuo") {
  return {
    titolo: modalita,
    zona: a.posizioneCommerciale === "ottima" ? "centro_storico"
        : a.posizioneCommerciale === "normale" ? "semicentro" : "periferia",
    mq: a.mq,
    quotaCucina: 0.3,
    postiASedere: a.postiStimati,
    postiEsterni: a.postiEsterniPossibili,
    stato: a.stato,
    impiantiPresenti: a.impiantiPresenti,
    exRistorante: a.exRistorante,
    /** canone REALE dell'annuncio: sovrascrive la stima per zona */
    canoneRealeMensile: a.canoneMensile,
    prezzoRealeVendita: a.prezzoVendita,
    avviamento: a.avviamento,
    passaggio: a.passaggio,
  };
}

function eur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}