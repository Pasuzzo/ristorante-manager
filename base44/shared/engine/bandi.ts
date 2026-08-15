/**
 * BANDI E AGEVOLAZIONI — statali, europei, regionali e camerali.
 *
 * ⚠️ ARCHITETTURA: i bandi cambiano in continuazione (finestre che aprono
 * e chiudono, dotazioni che si esauriscono). Per questo il catalogo NON è
 * scritto nel codice ma è DATO: va tenuto in un'entità Base44 `Bando`
 * aggiornabile senza rideployare il motore. Quello che sta qui è il
 * MOTORE DI ELEGGIBILITÀ, che è stabile.
 *
 * I bandi qui sotto sono ESEMPI REALISTICI ma non verificati e non
 * aggiornati: servono come seed e come test del motore. Prima di
 * pubblicare vanno sostituiti con dati reali (fonti: Invitalia,
 * incentivi.gov.it, portale bandi della propria Regione, Camera di
 * Commercio, e per l'Europa il Funding & Tenders Portal).
 * Nel gioco NON devono essere presentati come consulenza reale.
 */

// ─────────────────────────────────────────────── Requisiti

export type Ente = "stato" | "regione" | "ue" | "camera_commercio" | "comune";
export type TipoAgevolazione = "fondo_perduto" | "credito_imposta" | "finanziamento_agevolato" | "garanzia" | "sgravio_contributivo" | "misto";

export interface Requisiti {
  /** età massima del titolare (bandi giovani) */
  etaMax?: number;
  etaMin?: number;
  /** solo imprese femminili */
  soloFemminile?: boolean;
  /** anni massimi di attività (bandi startup) */
  anniAttivitaMax?: number;
  anniAttivitaMin?: number;
  /** forme giuridiche ammesse */
  formeAmmesse?: string[];
  /** ricavi annui massimi/minimi */
  ricaviMax?: number;
  ricaviMin?: number;
  /** numero minimo di dipendenti REGOLARI */
  dipendentiRegolariMin?: number;
  /** richiede assunzioni nuove nell'anno */
  nuoveAssunzioniMin?: number;
  /** zone ammesse (es. aree interne, centri storici) */
  zoneAmmesse?: string[];
  /** investimento minimo documentato */
  investimentoMin?: number;
  /** richiede che il locale sia in regola su impianti/accessibilità */
  richiedeAccessibilita?: boolean;
  /** richiede filiera corta / prodotti locali certificati */
  richiedeFilieraCorta?: boolean;
  /** esclude chi ha avuto sanzioni per lavoro irregolare */
  escludeSanzioniLavoro?: boolean;
}

export interface Bando {
  id: string;
  titolo: string;
  ente: Ente;
  /** null = nazionale/europeo; altrimenti sigla regione */
  regione?: string;
  tipo: TipoAgevolazione;
  descrizione: string;
  requisiti: Requisiti;
  /** quota dell'investimento coperta (0.4 = 40%) */
  quotaCopertura: number;
  importoMax: number;
  /** finestra di apertura: mesi dell'anno in cui si può fare domanda */
  mesiApertura: number[];
  /** mesi di istruttoria prima dell'esito */
  mesiIstruttoria: number;
  /** probabilità base di accoglimento (i bandi a sportello si esauriscono) */
  probAccoglimento: number;
  /** costo di consulenza per preparare la domanda */
  costoConsulenza: number;
  /** l'erogazione arriva in N rate mensili dopo l'esito */
  rateErogazione: number;
  fonte?: string;
}

// ─────────────────────────────────────────────── Profilo del richiedente

export interface ProfiloRichiedente {
  /** spesa effettivamente documentata con fattura negli ultimi 12 mesi.
   *  È su questa che si calcola il contributo: quello che paghi in nero
   *  non ha carte da allegare e non entra nella rendicontazione. */
  investimentoDocumentato?: number;
  etaTitolare: number;
  titolareFemminile: boolean;
  anniAttivita: number;
  formaGiuridica: string;
  ricaviUltimoAnno: number;
  dipendentiRegolari: number;
  nuoveAssunzioniAnno: number;
  zona: string;
  regione: string;
  investimentoPrevisto: number;
  haAccessibilita: boolean;
  usaFilieraCorta: boolean;
  haSanzioniLavoro: boolean;
}

export interface EsitoEleggibilita {
  bando: Bando;
  ammissibile: boolean;
  /** requisiti non soddisfatti, in italiano leggibile */
  motiviEsclusione: string[];
  /** requisiti soddisfatti al limite: utile per l'UI ("ti mancano 2 anni") */
  avvisi: string[];
  contributoStimato: number;
}

export function verificaEleggibilita(b: Bando, p: ProfiloRichiedente): EsitoEleggibilita {
  const r = b.requisiti;
  const no: string[] = [];
  const avvisi: string[] = [];

  if (r.etaMax !== undefined && p.etaTitolare > r.etaMax) no.push(`Il titolare deve avere al massimo ${r.etaMax} anni (ne ha ${p.etaTitolare}).`);
  if (r.etaMin !== undefined && p.etaTitolare < r.etaMin) no.push(`Il titolare deve avere almeno ${r.etaMin} anni.`);
  if (r.soloFemminile && !p.titolareFemminile) no.push("Riservato alle imprese femminili.");
  if (r.anniAttivitaMax !== undefined && p.anniAttivita > r.anniAttivitaMax) no.push(`Riservato a chi ha aperto da meno di ${r.anniAttivitaMax} anni (tu: ${p.anniAttivita}).`);
  if (r.anniAttivitaMin !== undefined && p.anniAttivita < r.anniAttivitaMin) {
    no.push(`Servono almeno ${r.anniAttivitaMin} anni di attività (tu: ${p.anniAttivita}).`);
    if (r.anniAttivitaMin - p.anniAttivita === 1) avvisi.push("Ci rientri il prossimo anno.");
  }
  if (r.formeAmmesse && !r.formeAmmesse.includes(p.formaGiuridica)) no.push(`Forme ammesse: ${r.formeAmmesse.join(", ")}.`);
  if (r.ricaviMax !== undefined && p.ricaviUltimoAnno > r.ricaviMax) no.push(`Ricavi oltre il tetto di ${eur(r.ricaviMax)}.`);
  if (r.ricaviMin !== undefined && p.ricaviUltimoAnno < r.ricaviMin) no.push(`Servono almeno ${eur(r.ricaviMin)} di ricavi.`);
  if (r.dipendentiRegolariMin !== undefined && p.dipendentiRegolari < r.dipendentiRegolariMin) no.push(`Servono almeno ${r.dipendentiRegolariMin} dipendenti regolari (tu: ${p.dipendentiRegolari}).`);
  if (r.nuoveAssunzioniMin !== undefined && p.nuoveAssunzioniAnno < r.nuoveAssunzioniMin) no.push(`Serve assumere almeno ${r.nuoveAssunzioniMin} persone nell'anno.`);
  if (r.zoneAmmesse && !r.zoneAmmesse.includes(p.zona)) no.push(`Zone ammesse: ${r.zoneAmmesse.join(", ")}.`);
  if (r.investimentoMin !== undefined && p.investimentoPrevisto < r.investimentoMin) no.push(`Investimento minimo ${eur(r.investimentoMin)}.`);
  if (r.richiedeAccessibilita && !p.haAccessibilita) no.push("Il locale deve essere accessibile alle persone con disabilità.");
  if (r.richiedeFilieraCorta && !p.usaFilieraCorta) no.push("Richiede approvvigionamento da filiera corta certificata.");
  if (r.escludeSanzioniLavoro && p.haSanzioniLavoro) no.push("Escluso: hai precedenti sanzioni per lavoro irregolare.");
  if (b.regione && b.regione !== p.regione) no.push(`Bando riservato a: ${b.regione}.`);

  // Il contributo copre solo la spesa rendicontabile: se dichiari più di
  // quanto hai fatturato, la differenza non è ammessa a contributo.
  const documentato = p.investimentoDocumentato ?? p.investimentoPrevisto;
  const ammesso = Math.min(p.investimentoPrevisto, documentato);
  const contributoStimato = Math.min(b.importoMax, ammesso * b.quotaCopertura);

  if (documentato < p.investimentoPrevisto * 0.95) {
    const perso = Math.round((p.investimentoPrevisto - ammesso) * b.quotaCopertura);
    avvisi.push(
      `Solo ${eur(documentato)} del tuo investimento è documentato con fattura: ` +
      `il resto non è rendicontabile e ti costa ${eur(perso)} di contributo.`
    );
  }
  // e se il minimo si calcola sul documentato, il nero può escluderti del tutto
  if (r.investimentoMin !== undefined && documentato < r.investimentoMin && p.investimentoPrevisto >= r.investimentoMin) {
    no.push(`Investimento documentato insufficiente: servono ${eur(r.investimentoMin)} con fattura, ne hai ${eur(documentato)}.`);
  }

  return { bando: b, ammissibile: no.length === 0, motiviEsclusione: no, avvisi, contributoStimato };
}

/** Filtra il catalogo: cosa posso chiedere questo mese. */
export function bandiDisponibili(catalogo: Bando[], p: ProfiloRichiedente, mese: number): EsitoEleggibilita[] {
  return catalogo
    .filter((b) => b.mesiApertura.includes(mese))
    .map((b) => verificaEleggibilita(b, p))
    .sort((a, b) => Number(b.ammissibile) - Number(a.ammissibile) || b.contributoStimato - a.contributoStimato);
}

// ─────────────────────────────────────────────── Domande in corso

export type StatoDomanda = "in_istruttoria" | "accolta" | "respinta" | "erogazione";

export interface Domanda {
  id: string;
  bandoId: string;
  titolo: string;
  presentataAnno: number;
  presentataMese: number;
  stato: StatoDomanda;
  contributoRichiesto: number;
  /** rate ancora da incassare */
  rateResidue: number;
  importoRata: number;
  esitoMese?: number;
  motivoRifiuto?: string;
}

export function presentaDomanda(e: EsitoEleggibilita, anno: number, mese: number, id: string): { domanda: Domanda; costo: number } | { errore: string } {
  if (!e.ammissibile) return { errore: `Non hai i requisiti: ${e.motiviEsclusione[0]}` };
  return {
    domanda: {
      id, bandoId: e.bando.id, titolo: e.bando.titolo,
      presentataAnno: anno, presentataMese: mese,
      stato: "in_istruttoria",
      contributoRichiesto: e.contributoStimato,
      rateResidue: e.bando.rateErogazione,
      importoRata: e.contributoStimato / e.bando.rateErogazione,
    },
    costo: e.bando.costoConsulenza,
  };
}

/** Avanza le pratiche di un mese: istruttorie che si chiudono, rate che arrivano. */
export function avanzaDomande(
  domande: Domanda[],
  catalogo: Bando[],
  mesiTrascorsiDa: (d: Domanda) => number,
  rng: () => number
): { incasso: number; eventi: string[] } {
  let incasso = 0;
  const eventi: string[] = [];
  for (const d of domande) {
    const b = catalogo.find((x) => x.id === d.bandoId);
    if (!b) continue;
    if (d.stato === "in_istruttoria" && mesiTrascorsiDa(d) >= b.mesiIstruttoria) {
      if (rng() < b.probAccoglimento) {
        d.stato = "erogazione";
        eventi.push(`✅ Domanda ACCOLTA: "${d.titolo}" — ${eur(d.contributoRichiesto)} in ${b.rateErogazione} rate.`);
      } else {
        d.stato = "respinta";
        d.motivoRifiuto = rng() < 0.5 ? "Dotazione esaurita: bando a sportello chiuso prima del tuo turno." : "Punteggio insufficiente in graduatoria.";
        eventi.push(`❌ Domanda RESPINTA: "${d.titolo}". ${d.motivoRifiuto}`);
      }
    } else if (d.stato === "erogazione" && d.rateResidue > 0) {
      incasso += d.importoRata;
      d.rateResidue--;
      eventi.push(`💶 Erogazione contributo "${d.titolo}": ${eur(d.importoRata)}${d.rateResidue ? ` (${d.rateResidue} rate residue)` : " — saldo finale"}`);
      if (d.rateResidue === 0) d.stato = "accolta";
    }
  }
  return { incasso, eventi };
}

// ─────────────────────────────────────────────── Catalogo SEED (da sostituire con dati reali)

export const CATALOGO_ESEMPIO: Bando[] = [
  {
    id: "resto-al-sud-like", titolo: "Nuove imprese giovanili — fondo perduto + finanziamento",
    ente: "stato", tipo: "misto",
    descrizione: "Sostegno alla nascita di nuove attività condotte da under 36.",
    requisiti: { etaMax: 35, anniAttivitaMax: 1, investimentoMin: 20_000, escludeSanzioniLavoro: true },
    quotaCopertura: 0.5, importoMax: 60_000, mesiApertura: [1,2,3,4,5,6,7,8,9,10,11,12],
    mesiIstruttoria: 4, probAccoglimento: 0.55, costoConsulenza: 1_500, rateErogazione: 3,
    fonte: "verificare su invitalia.it",
  },
  {
    id: "impresa-femminile", titolo: "Fondo impresa femminile",
    ente: "stato", tipo: "fondo_perduto",
    descrizione: "Contributi per imprese a prevalenza femminile.",
    requisiti: { soloFemminile: true, anniAttivitaMax: 3, investimentoMin: 15_000 },
    quotaCopertura: 0.5, importoMax: 50_000, mesiApertura: [3, 4, 9, 10],
    mesiIstruttoria: 5, probAccoglimento: 0.4, costoConsulenza: 1_200, rateErogazione: 2,
    fonte: "verificare su incentivi.gov.it",
  },
  {
    id: "ristorazione-tipica-regione", titolo: "Valorizzazione ristorazione tipica e filiera corta",
    ente: "regione", regione: "Emilia-Romagna", tipo: "fondo_perduto",
    descrizione: "Contributi a esercizi che acquistano da produttori locali certificati.",
    requisiti: { anniAttivitaMin: 2, richiedeFilieraCorta: true, ricaviMin: 60_000, escludeSanzioniLavoro: true },
    quotaCopertura: 0.35, importoMax: 25_000, mesiApertura: [2, 3, 9],
    mesiIstruttoria: 3, probAccoglimento: 0.45, costoConsulenza: 800, rateErogazione: 2,
    fonte: "verificare sul portale bandi regionale",
  },
  {
    id: "transizione-energetica", titolo: "Credito d'imposta efficienza energetica",
    ente: "stato", tipo: "credito_imposta",
    descrizione: "Sostituzione di attrezzature ad alto consumo con modelli in classe A.",
    requisiti: { investimentoMin: 10_000 },
    quotaCopertura: 0.4, importoMax: 30_000, mesiApertura: [1,2,3,4,5,6,7,8,9,10,11,12],
    mesiIstruttoria: 2, probAccoglimento: 0.75, costoConsulenza: 600, rateErogazione: 4,
    fonte: "verificare su incentivi.gov.it",
  },
  {
    id: "accessibilita-locali", titolo: "Abbattimento barriere architettoniche",
    ente: "comune", tipo: "fondo_perduto",
    descrizione: "Contributi per rendere accessibili gli esercizi pubblici.",
    requisiti: { investimentoMin: 5_000 },
    quotaCopertura: 0.6, importoMax: 12_000, mesiApertura: [4, 5, 10, 11],
    mesiIstruttoria: 3, probAccoglimento: 0.6, costoConsulenza: 400, rateErogazione: 1,
    fonte: "verificare presso il proprio Comune",
  },
  {
    id: "occupazione-giovani", titolo: "Sgravio contributivo per assunzioni stabili",
    ente: "stato", tipo: "sgravio_contributivo",
    descrizione: "Decontribuzione per assunzioni a tempo indeterminato di under 35.",
    requisiti: { nuoveAssunzioniMin: 1, dipendentiRegolariMin: 1, escludeSanzioniLavoro: true },
    quotaCopertura: 0.5, importoMax: 8_000, mesiApertura: [1,2,3,4,5,6,7,8,9,10,11,12],
    mesiIstruttoria: 1, probAccoglimento: 0.85, costoConsulenza: 300, rateErogazione: 12,
    fonte: "verificare su inps.it",
  },
  {
    id: "ue-turismo-sostenibile", titolo: "Fondi europei — turismo sostenibile e ospitalità",
    ente: "ue", tipo: "fondo_perduto",
    descrizione: "Progetti di innovazione sostenibile nel turismo e nella ristorazione.",
    requisiti: { anniAttivitaMin: 2, investimentoMin: 40_000, richiedeAccessibilita: true, escludeSanzioniLavoro: true },
    quotaCopertura: 0.45, importoMax: 80_000, mesiApertura: [5, 6],
    mesiIstruttoria: 8, probAccoglimento: 0.22, costoConsulenza: 3_500, rateErogazione: 4,
    fonte: "verificare sul Funding & Tenders Portal UE",
  },
];

function eur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}