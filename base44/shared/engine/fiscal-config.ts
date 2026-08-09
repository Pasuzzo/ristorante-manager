/**
 * PARAMETRI FISCALI ITALIA — anno d'imposta 2026
 * Tutti i numeri del gioco vivono qui: aggiornare questo file ogni anno
 * (Legge di Bilancio, circolari INPS, dati Istat) senza toccare il motore.
 *
 * Fonti principali:
 * - IRPEF 2026: L. 199/2025 art. 1 co. 3 (23% / 33% / 43%)
 * - Forfettario: L. 190/2014 e succ. mod. (limite 85.000€, coeff. ATECO 56 = 40%)
 * - IVA somministrazione alimenti: 10%
 * - Valori CCNL Pubblici Esercizi e INPS: INDICATIVI, da verificare/aggiornare
 */

export interface ScaglioneIrpef {
  fino: number; // limite superiore dello scaglione (Infinity per l'ultimo)
  aliquota: number;
}

export const FISCAL_2026 = {
  anno: 2026,

  // ── Inflazione (Istat NIC — nel gioco andrà letta da API/serie storica) ──
  inflazioneAnnua: 0.018, // 1,8% indicativo: parametro di scenario

  // ── IRPEF (ditta individuale in regime ordinario) ──
  irpef: {
    scaglioni: [
      { fino: 28_000, aliquota: 0.23 },
      { fino: 50_000, aliquota: 0.33 }, // ridotta dal 35% con L. 199/2025
      { fino: Infinity, aliquota: 0.43 },
    ] as ScaglioneIrpef[],
    // semplificazione di gioco: addizionali regionale+comunale come flat
    addizionaliFlat: 0.022,
  },

  // ── Regime forfettario ──
  forfettario: {
    limiteRicavi: 85_000,
    coeffRedditivita: 0.40, // ATECO 56 (ristorazione)
    impostaSostitutiva: 0.15,
    impostaSostitutivaStartup: 0.05, // primi 5 anni, se requisiti
    anniStartup: 5,
  },

  // ── SRL ──
  srl: {
    ires: 0.24,
    irap: 0.039, // aliquota base (varia per regione)
  },

  // ── IVA ──
  iva: {
    somministrazione: 0.10, // vendite al tavolo/banco
    mediaAcquisti: 0.10, // semplificazione: IVA media su acquisti detraibile
  },

  // ── Contributi INPS ──
  inps: {
    // Gestione commercianti (titolare ditta individuale) — valori indicativi
    commercianti: {
      aliquota: 0.2448,
      minimaleReddito: 18_555, // sotto questo si pagano comunque i minimi
    },
    // Dipendenti (CCNL Pubblici Esercizi) — costo a carico datore, indicativo
    dipendenti: {
      aliquotaDatore: 0.295, // INPS carico azienda
      inail: 0.015,
      tfr: 0.0691, // accantonamento annuo
      mensilita: 14, // tredicesima + quattordicesima nel CCNL
    },
  },

  // ── Retribuzioni lorde mensili CCNL Pubblici Esercizi (INDICATIVE) ──
  ccnlLordoMensile: {
    lavapiatti: 1_550,
    commis: 1_620,
    cameriere: 1_700,
    barista: 1_700,
    cuoco: 1_820,
    chef: 1_980,
    direttore: 2_150,
  } as Record<string, number>,

  // ── Lavoro nero: rischio e sanzioni ──
  lavoroNero: {
    // probabilità mensile di ispezione (cresce con n. irregolari — vedi engine)
    probIspezioneBase: 0.02,
    probPerIrregolare: 0.015,
    // maxi-sanzione per lavoratore (forbice reale ~1.950–11.700€)
    sanzioneMin: 1_950,
    sanzioneMax: 11_700,
    // recupero contributi evasi: mesi di contributi ricalcolati
    recuperoContributi: true,
  },

  // ── Costi di costituzione e avvio (una tantum, indicativi) ──
  costituzione: {
    dittaIndividuale: 450, // CCIAA, PEC, bolli, pratiche
    srls: 900, // notaio ridotto, capitale min 1€
    srl: 3_200, // notaio, capitale, pratiche
    sciaELicenze: 600, // SCIA, HACCP, corsi obbligatori
  },

  // ── Tesoreria: scadenze e regole di cassa ──
  tesoreria: {
    // acconti imposte: 100% dell'imposta anno precedente, split giugno/novembre
    quotaPrimoAcconto: 0.5,
    quotaSecondoAcconto: 0.5,
    // acconto IVA del 27/12 (metodo storico semplificato)
    quotaAccontoIva: 0.88,
    // ritenute + contributi a carico dipendente (frazione del lordo)
    ritenuteDipendente: 0.25,
    // pagamento fornitori a 30 giorni
    dilazioneFornitoriMesi: 1,
    // fido bancario di default e tasso annuo sullo scoperto
    fidoDefault: 10_000,
    tassoScoperto: 0.09,
  },

  // ── Costi ricorrenti amministrativi (annui, indicativi) ──
  amministrazione: {
    commercialistaForfettario: 800,
    commercialistaOrdinario: 1_800,
    commercialistaSrl: 3_500,
    ccIaaAnnuale: 120,
  },
} as const;

export type FiscalConfig = typeof FISCAL_2026;
