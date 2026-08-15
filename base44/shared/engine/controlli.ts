/**
 * I CONTROLLI — NAS, Guardia di Finanza, Ispettorato del Lavoro.
 *
 * Tre enti, tre logiche diverse: guardano cose diverse, si innescano per
 * motivi diversi e fanno male in modo diverso. Non sono tre versioni
 * dello stesso dado.
 *
 * Il principio di design: non puoi evitare il controllo, puoi decidere
 * in che stato farti trovare. La PRONTEZZA (documenti, corsi, locale in
 * ordine) cambia l'esito molto più della fortuna.
 *
 * ⚠️ Modello di gioco. Gli importi sono ordini di grandezza plausibili,
 * non riferimenti normativi.
 */

export type Ente = "nas" | "finanza" | "ispettorato";

export interface StatoControlli {
  /** DURC irregolare: niente bandi, niente sgravi */
  durcIrregolare: boolean;
  /** mesi residui di irregolarità del DURC */
  durcMesiResidui: number;
  /** debiti da sanzioni, rateizzati */
  rate: Array<{ ente: Ente; importo: number; rateResidue: number; descrizione: string }>;
  /** giorni di sospensione dell'attività da scontare nel mese */
  sospensioneGiorni: number;
  /** un controllo tira l'altro: probabilità aggiuntiva per i prossimi mesi */
  attenzioneResidua: number;
  /** storico: quanti controlli hai già subito */
  controlliSubiti: number;
  /** violazioni sui corrispettivi contestate, con il mese assoluto:
   *  alla quarta nell'arco di 5 anni scatta la sospensione */
  violazioniCorrispettivi: number[];
  /** corrispettivi complessivi contestati nel quinquennio */
  corrispettiviContestati: number;
  /** accessi di routine subiti: servono solo a creare tensione */
  accessiRoutine: number;
  /** mesi in cui i contributi non sono stati versati per mancanza di cassa */
  versamentiInRitardo: number;
}

export function nuovoStatoControlli(): StatoControlli {
  return {
    durcIrregolare: false, durcMesiResidui: 0, rate: [],
    sospensioneGiorni: 0, attenzioneResidua: 0, controlliSubiti: 0,
    violazioniCorrispettivi: [], corrispettiviContestati: 0, accessiRoutine: 0,
    versamentiInRitardo: 0,
  };
}

// ─────────────────────────────────────────────── Prontezza

export interface Prontezza {
  /** 0..1 — quanto sei in ordine con i documenti */
  documenti: number;
  /** 0..1 — condizione del locale */
  locale: number;
  /** 0..1 — regolarità del personale */
  personale: number;
}

export interface ContestoControlli {
  mese: number;
  /** rischio fiscale da nero.ts (0..1) */
  rischioFiscale: number;
  /** gravità degli obblighi formativi non assolti (0..1) */
  gravitaFormazione: number;
  /** condizione del locale 0..100 */
  condizioneLocale: number;
  /** manutenzione mensile spesa */
  manutenzione: number;
  /** lavoratori irregolari e totale */
  irregolari: number;
  totaleLavoratori: number;
  /** un dipendente se n'è andato male questo mese (licenziato o dimesso incattivito) */
  uscitaConflittuale: boolean;
  /** c'è stato un infortunio */
  infortunio: boolean;
  /** morale medio: chi sta male parla */
  moraleMedio: number;
  /** qualità del commercialista: difende meglio */
  affidabilitaCommercialista: number;
  /** quante persone sanno del nero (responsabili con delega, ecc.) */
  personeCheSanno: number;
  /** ricavi non dichiarati dell'anno: è su questi che si ricostruisce */
  ricaviNonDichiaratiAnno?: number;
}

export function calcolaProntezza(ctx: ContestoControlli): Prontezza {
  return {
    documenti: Math.max(0, 1 - ctx.gravitaFormazione),
    locale: Math.max(0, Math.min(1, ctx.condizioneLocale / 100 + (ctx.manutenzione > 100 ? 0.1 : 0))),
    personale: ctx.totaleLavoratori > 0 ? 1 - ctx.irregolari / ctx.totaleLavoratori : 1,
  };
}

// ─────────────────────────────────────────────── Probabilità

const BASE = { nas: 0.004, finanza: 0.003, ispettorato: 0.004 } as const;

/**
 * SANZIONI — valori vigenti 2026 (D.Lgs. 87/2024, in vigore dal 1/9/2024).
 * Sono ordini di grandezza per il gioco, non riferimenti normativi.
 */
export const SANZIONI = {
  /** corrispettivo non memorizzato o trasmesso: 70% dell'imposta, min 300€ */
  quotaCorrispettivi: 0.70,
  minimoCorrispettivi: 300,
  /** dichiarazione infedele: 70% dell'imposta evasa, min 150€ */
  quotaInfedele: 0.70,
  minimoInfedele: 150,
  /** sospensione: 4 violazioni distinte nell'arco di 5 anni */
  violazioniPerSospensione: 4,
  mesiFinestra: 60,
  sospensioneMinGiorni: 3,
  sospensioneMaxGiorni: 30,
  /** oltre questa soglia di corrispettivi contestati: 1-6 mesi */
  sogliaSospensioneLunga: 50_000,
  sospensioneLungaMinGiorni: 30,
  sospensioneLungaMaxGiorni: 180,
  /** ravvedimento operoso: un settimo del minimo */
  fattoreRavvedimento: 1 / 7,
  /** soglia penale sull'imposta evasa */
  sogliaPenale: 100_000,
} as const;

/**
 * ACCESSO DI ROUTINE — capita a tutti, anche a chi è perfettamente in
 * ordine. Non è un accertamento: è mezza giornata persa. Serve a far
 * sentire che il rischio esiste sempre, senza punire chi gioca pulito.
 */
export function accessoRoutine(
  st: StatoControlli, p: Prontezza, rng: () => number
): { avvenuto: boolean; eventi: string[]; sanzioneFormale: number } {
  const prob = 0.055; // ~1-2 volte l'anno
  if (rng() >= prob) return { avvenuto: false, eventi: [], sanzioneFormale: 0 };
  st.accessiRoutine++;
  const inOrdine = p.documenti > 0.7 && p.locale > 0.5 && p.personale > 0.95;
  if (inOrdine) {
    return {
      avvenuto: true, sanzioneFormale: 0,
      eventi: ["🚓 Accesso di routine: hanno guardato registri e cartelli, tutto in ordine. Mezza giornata persa e via."],
    };
  }
  const sanzioneFormale = 200 + Math.round(rng() * 600);
  return {
    avvenuto: true, sanzioneFormale,
    eventi: [`🚓 Accesso di routine: qualche irregolarità formale, ${sanzioneFormale}€. ` +
      `Poteva andare peggio — ma ora sanno di te.`],
  };
}

/** Registra una violazione sui corrispettivi e verifica la sospensione. */
export function registraViolazioneCorrispettivi(
  st: StatoControlli, meseAssoluto: number, importoContestato: number
): { sospensioneGiorni: number; eventi: string[] } {
  const eventi: string[] = [];
  st.violazioniCorrispettivi = st.violazioniCorrispettivi
    .filter((m) => meseAssoluto - m < SANZIONI.mesiFinestra)
    .concat(meseAssoluto);
  st.corrispettiviContestati += importoContestato;
  const n = st.violazioniCorrispettivi.length;

  if (n < SANZIONI.violazioniPerSospensione) {
    eventi.push(`📌 Violazione sui corrispettivi contestata: è la ${n}ª in cinque anni. ` +
      `Alla quarta scatta la chiusura, e il contatore non si azzera.`);
    return { sospensioneGiorni: 0, eventi };
  }

  const lunga = st.corrispettiviContestati > SANZIONI.sogliaSospensioneLunga;
  const giorni = lunga
    ? SANZIONI.sospensioneLungaMinGiorni
    : SANZIONI.sospensioneMinGiorni + Math.round(Math.random() * (SANZIONI.sospensioneMaxGiorni - SANZIONI.sospensioneMinGiorni));
  st.violazioniCorrispettivi = [];
  st.corrispettiviContestati = 0;
  eventi.push(`🔒 QUARTA VIOLAZIONE IN CINQUE ANNI: sospensione dell'attività per ${giorni} giorni.` +
    (lunga ? " Sopra i 50.000€ contestati la chiusura va da uno a sei mesi." : ""));
  return { sospensioneGiorni: giorni, eventi };
}

export function probabilitaControllo(
  ente: Ente, ctx: ContestoControlli, p: Prontezza, attenzioneResidua = 0
): number {
  let q = BASE[ente];
  switch (ente) {
    case "nas":
      q += (1 - p.locale) * 0.018 + ctx.gravitaFormazione * 0.012;
      if (ctx.mese >= 6 && ctx.mese <= 8) q *= 1.5; // d'estate si controlla di più
      break;
    case "finanza":
      q += ctx.rischioFiscale * 0.030;
      break;
    case "ispettorato":
      q += (1 - p.personale) * 0.035;
      if (ctx.infortunio) q += 0.45;                 // l'infortunio chiama il controllo
      if (ctx.uscitaConflittuale) q += ctx.irregolari > 0 ? 0.14 : 0.02;
      if (ctx.moraleMedio < 35) q += 0.015;
      q += Math.min(0.04, ctx.personeCheSanno * 0.01);
      break;
  }
  return Math.max(0, Math.min(0.85, q + attenzioneResidua));
}

// ─────────────────────────────────────────────── Esito

export interface EsitoControllo {
  ente: Ente;
  titolo: string;
  trovato: string[];
  sanzione: number;
  rateizzata: boolean;
  sospensioneGiorni: number;
  durcIrregolareMesi: number;
  /** danno alla reputazione (0..1 da sottrarre) */
  dannoReputazione: number;
  eventi: string[];
}

const NOMI: Record<Ente, string> = {
  nas: "🚔 Controllo NAS",
  finanza: "💼 Verifica della Guardia di Finanza",
  ispettorato: "📋 Ispezione dell'Ispettorato del Lavoro",
};

export function eseguiControllo(
  ente: Ente,
  ctx: ContestoControlli,
  p: Prontezza,
  st: StatoControlli,
  rng: () => number
): EsitoControllo {
  const trovato: string[] = [];
  const eventi: string[] = [];
  let sanzione = 0, sospensioneGiorni = 0, durcIrregolareMesi = 0, dannoReputazione = 0;

  st.controlliSubiti++;

  if (ente === "nas") {
    if (p.locale < 0.5) { trovato.push("Locale in condizioni non adeguate"); sanzione += 1_500 + rng() * 3_000; }
    if (p.documenti < 0.6) { trovato.push("Formazione alimentaristi mancante o scaduta"); sanzione += 800 + rng() * 1_500; }
    if (p.locale < 0.35) {
      trovato.push("Prescrizioni gravi su conservazione e pulizia");
      sospensioneGiorni = 3 + Math.round(rng() * 7);
      dannoReputazione = 0.12;
    }
    if (!trovato.length) eventi.push("✅ NAS: tutto in ordine. Mezza giornata persa e via.");
  }

  if (ente === "finanza") {
    const gravita = ctx.rischioFiscale;
    if (gravita > 0.2) {
      trovato.push("Ricostruzione dei ricavi: incongruenze tra acquisti e incassi dichiarati");
      // la sanzione scala col nero fatto, attenuata da un buon commercialista
      // imposte evase + sanzione + interessi sui ricavi ricostruiti,
      // più una componente fissa. Un buon commercialista limita i danni.
      const ricostruito = (ctx.ricaviNonDichiaratiAnno ?? 0) * 0.62;
      sanzione += (6_000 + gravita * 20_000 + ricostruito) * (1.2 - ctx.affidabilitaCommercialista * 0.4);
      durcIrregolareMesi = gravita > 0.5 ? 12 : 6;
    }
    if (gravita > 0.55) { trovato.push("Profili di rilevanza penale segnalati"); dannoReputazione = 0.08; }
    if (!trovato.length) eventi.push("✅ Verifica chiusa senza rilievi.");
  }

  if (ente === "ispettorato") {
    if (ctx.irregolari > 0) {
      trovato.push(`${ctx.irregolari} lavoratori senza contratto`);
      sanzione += ctx.irregolari * (2_000 + rng() * 8_000);
      durcIrregolareMesi = 12;
      const quota = ctx.irregolari / Math.max(1, ctx.totaleLavoratori);
      if (quota >= 0.1) {
        trovato.push("Quota di irregolari oltre la soglia: sospensione dell'attività");
        sospensioneGiorni = 5 + Math.round(rng() * 10);
        dannoReputazione = 0.1;
      }
    }
    if (p.documenti < 0.6) { trovato.push("Formazione sicurezza incompleta"); sanzione += 1_200 + rng() * 2_500; }
    if (ctx.infortunio) { trovato.push("Accertamenti sull'infortunio"); sanzione += 2_000 + rng() * 6_000; }
    if (!trovato.length) eventi.push("✅ Ispezione superata: carte in ordine.");
  }

  sanzione = Math.round(sanzione);
  const rateizzata = sanzione > 5_000;

  if (trovato.length) {
    eventi.push(
      `${NOMI[ente]}: ${trovato.join(" · ")}. Sanzione ${sanzione.toLocaleString("it-IT")}€` +
      (rateizzata ? " (rateizzabile in 12 mesi)." : ".") +
      (sospensioneGiorni ? ` Attività sospesa per ${sospensioneGiorni} giorni.` : "")
    );
    if (durcIrregolareMesi) {
      eventi.push(`📄 DURC irregolare per ${durcIrregolareMesi} mesi: niente bandi né sgravi finché non rientri.`);
    }
    // la cascata: un controllo tira l'altro
    st.attenzioneResidua = Math.min(0.015, st.attenzioneResidua + 0.005 + trovato.length * 0.002);
  }

  return { ente, titolo: NOMI[ente], trovato, sanzione, rateizzata, sospensioneGiorni, durcIrregolareMesi, dannoReputazione, eventi };
}

/** Applica l'esito allo stato: rate, DURC, sospensione. */
export function applicaEsito(st: StatoControlli, e: EsitoControllo): { esceSubito: number } {
  let esceSubito = 0;
  if (e.sanzione > 0) {
    if (e.rateizzata) {
      st.rate.push({ ente: e.ente, importo: e.sanzione / 12, rateResidue: 12, descrizione: e.titolo });
    } else {
      esceSubito = e.sanzione;
    }
  }
  if (e.durcIrregolareMesi > 0) {
    st.durcIrregolare = true;
    st.durcMesiResidui = Math.max(st.durcMesiResidui, e.durcIrregolareMesi);
  }
  st.sospensioneGiorni += e.sospensioneGiorni;
  return { esceSubito };
}

/** Da chiamare ogni mese: paga le rate, scala DURC e attenzione. */
export function avanzaControlli(st: StatoControlli): { rataMese: number; eventi: string[] } {
  const eventi: string[] = [];
  let rataMese = 0;
  for (const r of st.rate) {
    if (r.rateResidue > 0) { rataMese += r.importo; r.rateResidue--; }
  }
  st.rate = st.rate.filter((r) => r.rateResidue > 0);
  if (rataMese > 0) eventi.push(`💸 Rata sanzioni: ${Math.round(rataMese).toLocaleString("it-IT")}€.`);

  if (st.durcMesiResidui > 0) {
    st.durcMesiResidui--;
    if (st.durcMesiResidui === 0) {
      st.durcIrregolare = false;
      eventi.push("📄 DURC tornato regolare: puoi di nuovo accedere a bandi e sgravi.");
    }
  }
  st.attenzioneResidua = Math.max(0, st.attenzioneResidua * 0.7);
  const giorniPersi = st.sospensioneGiorni;
  st.sospensioneGiorni = 0;
  return { rataMese, eventi: giorniPersi ? [...eventi, `🚫 Locale chiuso ${giorniPersi} giorni per provvedimento.`] : eventi };
}


// ─────────────────────────────────────────────── DURC

export const DURC = {
  /** ritardi nei versamenti oltre i quali il certificato non è più regolare */
  ritardiPerIrregolarita: 2,
  /** mesi di irregolarità dopo l'ultimo ritardo */
  mesiIrregolarita: 4,
  /** soglia di scoperto sotto cui si considera saltato il versamento */
  sogliaSaltoVersamento: 0,
} as const;

/**
 * Il DURC si aggiorna ogni mese: se non riesci a versare i contributi
 * perché la cassa non c'è, il certificato si sporca. È il canale
 * "silenzioso" — non serve un'ispezione per perderlo, basta non pagare.
 */
export function aggiornaDurc(
  st: StatoControlli,
  cassaDopoVersamenti: number,
  f24DelMese: number
): { eventi: string[]; aRischio: boolean } {
  const eventi: string[] = [];
  const saltato = f24DelMese > 0 && cassaDopoVersamenti < DURC.sogliaSaltoVersamento;

  if (saltato) {
    st.versamentiInRitardo++;
    if (st.versamentiInRitardo === DURC.ritardiPerIrregolarita - 1) {
      eventi.push("📄 Un versamento contributivo è andato in ritardo. Ancora uno e il DURC non sarà più regolare: " +
        "niente bandi, niente sgravi.");
    }
    if (st.versamentiInRitardo >= DURC.ritardiPerIrregolarita && !st.durcIrregolare) {
      st.durcIrregolare = true;
      st.durcMesiResidui = Math.max(st.durcMesiResidui, DURC.mesiIrregolarita);
      eventi.push("📄 DURC IRREGOLARE per contributi non versati. Non è servita un'ispezione: " +
        "è bastato non pagare. Finché non rientri sei fuori da bandi e sgravi.");
    }
  } else if (st.versamentiInRitardo > 0 && f24DelMese > 0) {
    // hai ripreso a versare: il conto si riduce
    st.versamentiInRitardo = Math.max(0, st.versamentiInRitardo - 1);
    if (st.versamentiInRitardo === 0 && st.durcIrregolare && st.durcMesiResidui <= 1) {
      eventi.push("📄 Contributi rientrati: alla prossima verifica il DURC tornerà regolare.");
    }
  }

  return { eventi, aRischio: st.versamentiInRitardo >= DURC.ritardiPerIrregolarita - 1 };
}