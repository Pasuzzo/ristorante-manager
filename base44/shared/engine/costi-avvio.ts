/**
 * COSTI DI AVVIO E SPESE FISSE — il conto vero di aprire un ristorante.
 *
 * Il giocatore configura il locale all'inizio (acquisto o affitto, metri
 * quadri, posti) e da lì derivano automaticamente utenze, tasse locali,
 * servizi obbligatori e ammortamenti. Sono i numeri che nessun gestionale
 * mostra e che nella realtà ti mangiano il margine.
 *
 * ⚠️ TUTTI I VALORI SONO PARAMETRICI E INDICATIVI (fascia Italia
 * centro-nord, 2026). Vanno tarati per zona e aggiornati ogni anno:
 * sono raccolti qui apposta per essere modificati in un punto solo.
 *
 * NOTA FISCALE: la TASI è stata ABOLITA dal 2020 e assorbita nell'IMU.
 * Per un locale commerciale si paga IMU (solo se proprietario) + TARI
 * (sempre, anche in affitto). La TARI per la categoria "ristoranti,
 * trattorie, pizzerie" è tra le più alte in assoluto.
 */

// ─────────────────────────────────────────────── Configurazione locale

export type TitoloGodimento = "affitto" | "acquisto" | "acquisto_mutuo" | "comodato";
export type ZonaCommerciale = "centro_storico" | "lungomare" | "semicentro" | "periferia" | "extraurbano";
export type StatoImmobile = "da_ristrutturare" | "grezzo" | "buono" | "chiavi_in_mano";

export interface ConfigLocale {
  titolo: TitoloGodimento;
  zona: ZonaCommerciale;
  /** superficie totale in mq (sala + cucina + servizi + magazzino) */
  mq: number;
  /** quota di superficie destinata a cucina (tipico 0.25–0.35) */
  quotaCucina: number;
  postiASedere: number;
  /** posti esterni: dehors, plateatico (paga il suolo pubblico) */
  postiEsterni: number;
  stato: StatoImmobile;
  /** solo per acquisto con mutuo */
  mutuo?: { percentualeFinanziata: number; anni: number; tassoAnnuo: number };
  /** true se il locale ha già cappa, impianti e allacci a norma */
  impiantiPresenti: boolean;
  /** rilevi un ristorante GIÀ ATTIVO: attrezzature e arredo li paghi
   *  con la buonuscita, non li ricompri da zero */
  exRistorante?: boolean;
}

// ─────────────────────────────────────────────── Prezzi di mercato (parametrici)

/** €/mq ANNUI di affitto commerciale, per zona (indicativi centro-nord). */
export const AFFITTO_MQ_ANNUO: Record<ZonaCommerciale, number> = {
  centro_storico: 280,
  lungomare: 320,
  semicentro: 170,
  periferia: 110,
  extraurbano: 70,
};

/** €/mq di ACQUISTO immobile commerciale (indicativi). */
export const ACQUISTO_MQ: Record<ZonaCommerciale, number> = {
  centro_storico: 2_800,
  lungomare: 3_400,
  semicentro: 1_900,
  periferia: 1_300,
  extraurbano: 900,
};

/** Moltiplicatore di affluenza per zona: si paga di più dove passa gente. */
export const PASSAGGIO_ZONA: Record<ZonaCommerciale, number> = {
  centro_storico: 1.25,
  lungomare: 1.35,
  semicentro: 1.0,
  periferia: 0.78,
  extraurbano: 0.6,
};

/** Costo di allestimento €/mq secondo lo stato dell'immobile. */
export const ALLESTIMENTO_MQ: Record<StatoImmobile, number> = {
  da_ristrutturare: 1_100,
  grezzo: 800,
  buono: 450,
  chiavi_in_mano: 180,
};

export const COSTI_UNA_TANTUM = {
  /** attrezzatura cucina professionale, €/mq di cucina */
  attrezzaturaCucinaMq: 1_400,
  /** arredo sala, € a coperto */
  arredoPosto: 320,
  /** cappa, canna fumaria, abbattimento fumi (se non presenti) */
  cappaEImpianti: 18_000,
  /** allacci utenze potenziati (trifase, gas, acqua) */
  allacci: 3_500,
  /** registratore telematico + gestionale cassa */
  cassaTelematica: 1_800,
  /** insegna, vetrofanie, prima immagine coordinata */
  insegnaEBrand: 2_600,
  /** deposito cauzionale affitto: mensilità anticipate */
  mensilitaCauzione: 3,
  /** progettazione, pratiche, agibilità, tecnico */
  praticheTecniche: 3_200,
  /** corsi HACCP e formazione obbligatoria (titolare + staff) */
  formazioneObbligatoria: 900,
  /** scorta iniziale di magazzino (cantina, secchi, non deperibili) */
  scortaIniziale: 6_000,
} as const;

// ─────────────────────────────────────────────── Spese fisse ricorrenti

export const UTENZE = {
  /** kWh/anno per mq: un ristorante consuma molto (celle, forni, cappa) */
  kwhAnnuiPerMq: 260,
  prezzoKwh: 0.29,          // €/kWh, mercato libero business
  /** Smc gas annui per mq */
  smcAnnuiPerMq: 14,
  prezzoSmc: 1.05,          // €/Smc
  /** mc acqua annui a coperto servito (lavaggio, cucina, servizi) */
  mcAcquaPerCoperto: 0.035,
  prezzoMcAcqua: 2.6,
  /** quota fissa mensile: contatori, canoni, connettività */
  quotaFissaMese: 180,
} as const;

export const TASSE_LOCALI = {
  /** TARI: €/mq annui per la categoria ristoranti (tra le più care) */
  tariMqAnnuo: 14.5,
  /** IMU: aliquota su rendita catastale rivalutata — solo se proprietario */
  imuAliquota: 0.0106,
  /** stima rendita catastale come frazione del valore d'acquisto */
  rendiraSuValore: 0.035,
  /** occupazione suolo pubblico per il dehors: €/mq annui */
  suoloPubblicoMqAnnuo: 55,
  /** mq occupati per ogni posto esterno */
  mqPerPostoEsterno: 1.6,
} as const;

export const SERVIZI_RICORRENTI = {
  /** € annui — obbligatori o quasi */
  assicurazioneRC: 1_400,        // RC verso terzi + incendio
  haccpConsulenza: 700,          // manuale HACCP, autocontrollo, analisi
  siaeMusica: 850,               // SIAE + SCF se metti musica
  manutenzioneImpianti: 1_200,   // cappa, estintori, caldaia, celle
  disinfestazione: 480,
  smaltimentoOli: 240,
  softwareGestionale: 600,
  commercialistaBase: 1_800,     // sovrascritto da fiscal-config per forma giuridica
  consulenteLavoro: 240,         // € annui PER DIPENDENTE in busta
  lavanderiaTovaglie: 1_800,     // se non usi tovagliette usa e getta
  pos: 420,                      // canoni + commissioni fisse
} as const;

// ─────────────────────────────────────────────── Calcolo

export interface PianoCosti {
  unaTantum: Array<{ voce: string; importo: number }>;
  totaleUnaTantum: number;
  mensili: Array<{ voce: string; importo: number }>;
  totaleMensile: number;
  /** rata mensile del mutuo, se presente */
  rataMutuo: number;
  /** ammortamento mensile figurativo di attrezzature e allestimento (10 anni) */
  ammortamentoMensile: number;
  avvisi: string[];
}

export function calcolaPianoCosti(c: ConfigLocale): PianoCosti {
  const avvisi: string[] = [];
  const mqCucina = c.mq * c.quotaCucina;
  const unaTantum: PianoCosti["unaTantum"] = [];
  const mensili: PianoCosti["mensili"] = [];

  // ── Immobile
  const affittoMese = (AFFITTO_MQ_ANNUO[c.zona] * c.mq) / 12;
  let rataMutuo = 0;
  if (c.titolo === "affitto") {
    mensili.push({ voce: "Affitto locale", importo: affittoMese });
    unaTantum.push({ voce: `Cauzione (${COSTI_UNA_TANTUM.mensilitaCauzione} mensilità)`, importo: affittoMese * COSTI_UNA_TANTUM.mensilitaCauzione });
    unaTantum.push({ voce: "Registrazione contratto e agenzia", importo: affittoMese * 1.5 });
  } else if (c.titolo === "acquisto" || c.titolo === "acquisto_mutuo") {
    const prezzo = ACQUISTO_MQ[c.zona] * c.mq;
    if (c.titolo === "acquisto") {
      unaTantum.push({ voce: "Acquisto immobile", importo: prezzo });
    } else {
      const m = c.mutuo ?? { percentualeFinanziata: 0.7, anni: 15, tassoAnnuo: 0.055 };
      const finanziato = prezzo * m.percentualeFinanziata;
      unaTantum.push({ voce: "Anticipo acquisto immobile", importo: prezzo - finanziato });
      const i = m.tassoAnnuo / 12, n = m.anni * 12;
      rataMutuo = finanziato * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
      mensili.push({ voce: `Rata mutuo (${m.anni} anni)`, importo: rataMutuo });
      avvisi.push(`Mutuo su ${fmtEur(finanziato)}: rata ${fmtEur(rataMutuo)}/mese per ${m.anni} anni.`);
    }
    unaTantum.push({ voce: "Notaio, imposte e volture", importo: prezzo * 0.09 });
    // IMU: solo per il proprietario
    const rendita = prezzo * TASSE_LOCALI.rendiraSuValore;
    mensili.push({ voce: "IMU (rateizzata)", importo: (rendita * TASSE_LOCALI.imuAliquota) / 12 });
  } else {
    avvisi.push("Comodato: nessun canone, ma verifica la durata del contratto.");
  }

  // ── Allestimento e attrezzature
  // rilevando un avviato, gran parte del kit è già dentro: lo paghi con la buonuscita
  const sconto = c.exRistorante ? 0.22 : 1;
  unaTantum.push({ voce: `Allestimento locale (${c.stato.replace(/_/g, " ")})${c.exRistorante ? " — subentro" : ""}`, importo: ALLESTIMENTO_MQ[c.stato] * c.mq * sconto });
  unaTantum.push({ voce: `Attrezzatura cucina${c.exRistorante ? " (integrazione al kit esistente)" : " professionale"}`, importo: COSTI_UNA_TANTUM.attrezzaturaCucinaMq * mqCucina * sconto });
  unaTantum.push({ voce: `Arredo sala (${c.postiASedere} coperti)${c.exRistorante ? " — subentro" : ""}`, importo: COSTI_UNA_TANTUM.arredoPosto * c.postiASedere * sconto });
  if (!c.impiantiPresenti) {
    unaTantum.push({ voce: "Cappa, canna fumaria, abbattimento fumi", importo: COSTI_UNA_TANTUM.cappaEImpianti });
    unaTantum.push({ voce: "Allacci utenze potenziati", importo: COSTI_UNA_TANTUM.allacci });
    avvisi.push("⚠️ Locale senza impianti: cappa e allacci pesano molto sul budget iniziale.");
  }
  unaTantum.push({ voce: "Registratore telematico e cassa", importo: COSTI_UNA_TANTUM.cassaTelematica });
  unaTantum.push({ voce: "Insegna e immagine coordinata", importo: COSTI_UNA_TANTUM.insegnaEBrand });
  unaTantum.push({ voce: "Pratiche tecniche, SCIA, agibilità", importo: COSTI_UNA_TANTUM.praticheTecniche });
  unaTantum.push({ voce: "Formazione obbligatoria e HACCP", importo: COSTI_UNA_TANTUM.formazioneObbligatoria });
  unaTantum.push({ voce: "Scorta iniziale di magazzino", importo: COSTI_UNA_TANTUM.scortaIniziale });

  // ── Utenze (stimate sui mq e sui coperti potenziali)
  const elettricoMese = (UTENZE.kwhAnnuiPerMq * c.mq * UTENZE.prezzoKwh) / 12;
  const gasMese = (UTENZE.smcAnnuiPerMq * c.mq * UTENZE.prezzoSmc) / 12;
  mensili.push({ voce: "Energia elettrica", importo: elettricoMese });
  mensili.push({ voce: "Gas", importo: gasMese });
  mensili.push({ voce: "Quote fisse e connettività", importo: UTENZE.quotaFissaMese });
  // l'acqua dipende dai coperti effettivi: la calcola il motore mese per mese

  // ── Tasse locali
  mensili.push({ voce: "TARI (rifiuti, categoria ristoranti)", importo: (TASSE_LOCALI.tariMqAnnuo * c.mq) / 12 });
  if (c.postiEsterni > 0) {
    const mqDehors = c.postiEsterni * TASSE_LOCALI.mqPerPostoEsterno;
    mensili.push({ voce: `Suolo pubblico dehors (${Math.round(mqDehors)} mq)`, importo: (TASSE_LOCALI.suoloPubblicoMqAnnuo * mqDehors) / 12 });
  }

  // ── Servizi ricorrenti
  for (const [voce, annuo] of [
    ["Assicurazione RC e incendio", SERVIZI_RICORRENTI.assicurazioneRC],
    ["Consulenza HACCP e analisi", SERVIZI_RICORRENTI.haccpConsulenza],
    ["SIAE e SCF (musica)", SERVIZI_RICORRENTI.siaeMusica],
    ["Manutenzione impianti obbligatoria", SERVIZI_RICORRENTI.manutenzioneImpianti],
    ["Disinfestazione", SERVIZI_RICORRENTI.disinfestazione],
    ["Smaltimento oli esausti", SERVIZI_RICORRENTI.smaltimentoOli],
    ["Software gestionale", SERVIZI_RICORRENTI.softwareGestionale],
    ["Lavanderia", SERVIZI_RICORRENTI.lavanderiaTovaglie],
    ["POS e commissioni fisse", SERVIZI_RICORRENTI.pos],
  ] as Array<[string, number]>) {
    mensili.push({ voce, importo: annuo / 12 });
  }

  const totaleUnaTantum = unaTantum.reduce((s, x) => s + x.importo, 0);
  const totaleMensile = mensili.reduce((s, x) => s + x.importo, 0);
  // ammortamento su 10 anni di tutto ciò che non è immobile né cauzione
  const ammortizzabile = unaTantum
    .filter((x) => !/Acquisto immobile|Anticipo|Cauzione|Notaio/.test(x.voce))
    .reduce((s, x) => s + x.importo, 0);
  const ammortamentoMensile = ammortizzabile / 120;

  if (totaleMensile > 0 && c.postiASedere > 0) {
    const perCoperto = totaleMensile / (c.postiASedere * 26 * 2); // ~26 giorni, 2 turni
    if (perCoperto > 4) avvisi.push(`⚠️ Solo di costi fissi paghi ${fmtEur(perCoperto)} per ogni coperto potenziale: servono margini alti o tanti clienti.`);
  }
  if (c.mq / Math.max(1, c.postiASedere) < 1.2) {
    avvisi.push("⚠️ Meno di 1,2 mq per coperto: rischi problemi di agibilità e comfort.");
  }

  return { unaTantum, totaleUnaTantum, mensili, totaleMensile, rataMutuo, ammortamentoMensile, avvisi };
}

/** Consumo d'acqua variabile, da aggiungere mese per mese sui coperti reali. */
export function costoAcquaMese(copertiServiti: number): number {
  return copertiServiti * UTENZE.mcAcquaPerCoperto * UTENZE.prezzoMcAcqua;
}

/** Costo del consulente del lavoro: cresce col numero di buste paga. */
export function costoConsulenteLavoroMese(dipendentiRegolari: number): number {
  return (dipendentiRegolari * SERVIZI_RICORRENTI.consulenteLavoro) / 12;
}

function fmtEur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}