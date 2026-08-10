/**
 * COSTITUZIONE — aprire l'attività davvero.
 *
 * Il wizard non è una schermata di configurazione: è la prima partita
 * che giochi. Scegli un immobile che esiste sulla bacheca, un
 * commercialista che costa quello che costa, una forma giuridica con i
 * suoi adempimenti, e assumi le persone che il mercato ti offre —
 * non quelle che vorresti.
 *
 * ⚠️ VALORI DI MERCATO 2026, raccolti da fonti pubbliche italiane.
 * Sono MEDIE INDICATIVE con forbici reali: variano per provincia,
 * studio, volume di fatture. Aggiornarli qui, in un punto solo.
 *
 * Fonti consultate (agosto 2026): guide fiscali su costi commercialista
 * per regime, costi di costituzione SRL/SRLS, diritto annuale CCIAA.
 * Da riverificare a ogni Legge di Bilancio.
 */

import { FormaGiuridica } from "./engine.ts";
import { Candidato, generaMercato, generaCandidato, RuoloEsteso, OpzioniMercato, Offerta, valutaOfferta, EsitoOfferta } from "./mercato.ts";

// ─────────────────────────────────────────────── Il commercialista

export type LivelloCommercialista = "online" | "studio_locale" | "studio_strutturato";

export interface OpzioneCommercialista {
  id: LivelloCommercialista;
  nome: string;
  descrizione: string;
  /** € annui, per forma giuridica */
  costoAnnuo: number;
  /** riduce la probabilità di errori fiscali e sanzioni */
  affidabilita: number; // 0..1
  /** velocità/qualità nella preparazione delle domande di bando */
  bonusBandi: number; // moltiplicatore su probAccoglimento
  /** stress mensile risparmiato al titolare */
  sollievoStress: number;
  contro?: string;
}

/**
 * Costi annui reali per regime (fonti 2026):
 * - forfettario: 400-800 €/anno tradizionale, 300-600 online
 * - ditta ordinaria/semplificata: 1.000-2.000 €/anno
 * - SRL/SRLS (contabilità ordinaria + bilancio): 1.500-3.500 €/anno
 */
export function opzioniCommercialista(forma: FormaGiuridica): OpzioneCommercialista[] {
  const societa = forma === "srl" || forma === "srls";
  const forfait = forma === "ditta_forfettaria";

  const base = forfait ? 1 : societa ? 3 : 2;
  const costi = {
    online: forfait ? 360 : societa ? 1_680 : 900,
    studio_locale: forfait ? 650 : societa ? 2_400 : 1_500,
    studio_strutturato: forfait ? 900 : societa ? 3_600 : 2_200,
  };

  return [
    {
      id: "online",
      nome: "Commercialista online",
      descrizione: societa
        ? "Piattaforma digitale con commercialista abilitato: economica, ma per una società serve seguire tutto tu."
        : "Piattaforma digitale: carichi i documenti, pensano loro. Economico e veloce.",
      costoAnnuo: costi.online,
      affidabilita: 0.82,
      bonusBandi: 0.85,
      sollievoStress: 1.5,
      contro: societa
        ? "Poca consulenza su misura: per una società con dipendenti è un rischio."
        : "Nessuno ti chiama se sbagli: te ne accorgi dopo.",
    },
    {
      id: "studio_locale",
      nome: "Studio del paese",
      descrizione: "Il commercialista che conosce te e il tuo quartiere. Risponde al telefono, ti avvisa delle scadenze.",
      costoAnnuo: costi.studio_locale,
      affidabilita: 0.93,
      bonusBandi: 1.0,
      sollievoStress: 3,
    },
    {
      id: "studio_strutturato",
      nome: "Studio strutturato",
      descrizione: "Studio con più professionisti: consulente del lavoro interno, ufficio bandi, pianificazione fiscale.",
      costoAnnuo: costi.studio_strutturato,
      affidabilita: 0.98,
      bonusBandi: 1.35,
      sollievoStress: 5,
      contro: "Costa. Ha senso quando il volume cresce, non il primo anno.",
    },
  ].filter(() => base > 0);
}

// ─────────────────────────────────────────────── Costi di costituzione

export interface VoceCosto {
  voce: string;
  importo: number;
  obbligatorio: boolean;
  nota?: string;
}

/**
 * Costi di apertura per forma giuridica (valori 2026 indicativi).
 *
 * SRLS: notaio azzerato col modello standard ministeriale, ma statuto
 *   non modificabile; restano imposta di registro, diritti, bolli.
 *   Capitale da 1 a 9.999,99 €, soci solo persone fisiche.
 * SRL: notaio obbligatorio (1.500-2.500 €), totale 1.500-3.000 €;
 *   capitale minimo legale 1 € ma 10.000 € è lo standard credibile,
 *   e se ≥10.000 va versato almeno il 25% alla costituzione.
 */
export function costiCostituzione(forma: FormaGiuridica): VoceCosto[] {
  const comuni: VoceCosto[] = [
    { voce: "SCIA e pratiche comunali", importo: 350, obbligatorio: true },
    { voce: "Corso HACCP e formazione obbligatoria", importo: 480, obbligatorio: true, nota: "Titolare + addetti alimentaristi" },
    { voce: "Manuale HACCP e piano di autocontrollo", importo: 320, obbligatorio: true },
    { voce: "Notifica sanitaria ASL", importo: 180, obbligatorio: true },
    { voce: "PEC (primo anno)", importo: 12, obbligatorio: true },
    { voce: "Firma digitale", importo: 55, obbligatorio: true, nota: "Rinnovo ogni 3 anni" },
    { voce: "Iscrizione Registro Imprese e diritti di segreteria", importo: 160, obbligatorio: true },
    { voce: "Attivazione utenze e volture", importo: 280, obbligatorio: true },
    { voce: "Registratore telematico e configurazione", importo: 1_100, obbligatorio: true },
    { voce: "Insegna e autorizzazione esposizione", importo: 420, obbligatorio: false },
    { voce: "Impianto videosorveglianza e antifurto", importo: 900, obbligatorio: false },
    { voce: "Prima fornitura DPI e abbigliamento cucina", importo: 350, obbligatorio: false },
    { voce: "Analisi acqua e superfici (prima campagna)", importo: 210, obbligatorio: true },
  ];

  switch (forma) {
    case "ditta_forfettaria":
    case "ditta_ordinaria":
      return [
        { voce: "Apertura partita IVA (modello AA9)", importo: 0, obbligatorio: true, nota: "Gratuita online sul sito dell'Agenzia" },
        { voce: "Iscrizione INPS Gestione Commercianti", importo: 0, obbligatorio: true, nota: "Gratuita, ma i minimali partono subito: ~4.200 €/anno" },
        { voce: "Diritto annuale CCIAA (primo anno)", importo: 100, obbligatorio: true },
        ...comuni,
      ];
    case "srls":
      return [
        { voce: "Notaio (modello standard ministeriale)", importo: 0, obbligatorio: true, nota: "Azzerato per legge, ma lo statuto NON è modificabile" },
        { voce: "Imposta di registro", importo: 200, obbligatorio: true },
        { voce: "Diritti di segreteria Registro Imprese", importo: 90, obbligatorio: true },
        { voce: "Diritto annuale CCIAA (primo anno)", importo: 120, obbligatorio: true },
        { voce: "Vidimazione libri sociali", importo: 310, obbligatorio: true },
        { voce: "Tassa concessione governativa libri", importo: 309.87, obbligatorio: true },
        ...comuni,
      ];
    case "srl":
      return [
        { voce: "Onorario notaio", importo: 2_000, obbligatorio: true, nota: "Forbice reale 1.500-2.500 € secondo statuto e soci" },
        { voce: "Imposta di registro", importo: 200, obbligatorio: true },
        { voce: "Imposta di bollo e diritti", importo: 356, obbligatorio: true },
        { voce: "Diritti di segreteria Registro Imprese", importo: 120, obbligatorio: true },
        { voce: "Diritto annuale CCIAA (primo anno)", importo: 200, obbligatorio: true },
        { voce: "Vidimazione libri sociali", importo: 310, obbligatorio: true },
        { voce: "Tassa concessione governativa libri", importo: 309.87, obbligatorio: true },
        ...comuni,
      ];
  }
}

// ─────────────────────────────────────────────── Capitale sociale

export interface RegoleCapitale {
  richiesto: boolean;
  minimo: number;
  massimo?: number;
  /** quota da versare subito (il resto resta debito dei soci) */
  quotaVersamentoImmediato: number;
  nota: string;
}

export function regoleCapitale(forma: FormaGiuridica): RegoleCapitale {
  switch (forma) {
    case "srls":
      return {
        richiesto: true, minimo: 1, massimo: 9_999.99, quotaVersamentoImmediato: 1,
        nota: "SRLS: capitale da 1 a 9.999,99 €, va versato per intero alla costituzione. Oltre questa soglia devi trasformarti in SRL ordinaria.",
      };
    case "srl":
      return {
        richiesto: true, minimo: 1, quotaVersamentoImmediato: 0.25,
        nota: "SRL: minimo legale 1 €, ma sotto i 10.000 € banche e fornitori ti guardano storto. Con capitale ≥ 10.000 € versi almeno il 25% subito.",
      };
    default:
      return {
        richiesto: false, minimo: 0, quotaVersamentoImmediato: 0,
        nota: "Ditta individuale: nessun capitale sociale, ma rispondi con il tuo patrimonio personale. Se fallisci, ci va la casa.",
      };
  }
}

/**
 * Il capitale versato NON è cassa libera: è patrimonio della società.
 * Nel gioco lo modelliamo come vincolato — non spendibile in
 * approvvigionamento — ma è quello che ti dà credibilità:
 * più capitale = più fido bancario e più credibilità nei bandi.
 */
export function effettiCapitale(capitaleVersato: number): {
  fidoAggiuntivo: number; credibilita: number; nota: string;
} {
  const fidoAggiuntivo = Math.round(capitaleVersato * 1.2);
  const credibilita = Math.min(1, capitaleVersato / 25_000);
  const nota =
    capitaleVersato < 1_000
      ? "Capitale simbolico: la banca non ti darà fido e i fornitori vorranno pagamento anticipato."
      : capitaleVersato < 10_000
        ? "Capitale modesto: fido limitato, ma sei operativo."
        : "Capitale solido: la banca apre il fido e i fornitori ti fanno credito.";
  return { fidoAggiuntivo, credibilita, nota };
}

// ─────────────────────────────────────────────── Il pool di candidati

export interface PoolCostituzione {
  /** i candidati che il mercato ti offre oggi: NON li disegni tu */
  candidati: Candidato[];
  /** quanti puoi assumerne senza sfondare il budget: solo informativo */
  suggerimento: string;
}

/**
 * Il pool iniziale: chi apre a gennaio trova gente disponibile, chi apre
 * a giugno trova gli scarti (i bravi lavorano già tutti). È il primo
 * insegnamento del gioco: il momento in cui apri conta.
 */
/** Tutti i ruoli che devono comparire nel pool, con quante scelte minime. */
export const COPERTURA_RUOLI: Array<{ ruolo: RuoloEsteso; minimo: number }> = [
  { ruolo: "chef", minimo: 1 },
  { ruolo: "sous_chef", minimo: 1 },
  { ruolo: "cuoco", minimo: 2 },
  { ruolo: "pizzaiolo", minimo: 1 },
  { ruolo: "pasticcere", minimo: 1 },
  { ruolo: "commis", minimo: 2 },
  { ruolo: "lavapiatti", minimo: 2 },
  { ruolo: "maitre", minimo: 1 },
  { ruolo: "chef_de_rang", minimo: 1 },
  { ruolo: "cameriere", minimo: 3 },
  { ruolo: "runner", minimo: 2 },
  { ruolo: "barista", minimo: 2 },
  { ruolo: "sommelier", minimo: 1 },
  { ruolo: "direttore", minimo: 1 },
];

/**
 * Pool COMPLETO: garantisce almeno N candidati per ogni mansione, così
 * il giocatore può comporre qualsiasi brigata. La stagione non cambia
 * QUANTI ce ne sono, ma quanto sono bravi e quanto pretendono.
 */
export function poolCompleto(mese: number, rng: () => number): PoolCostituzione {
  const altaStagione = mese >= 5 && mese <= 8;
  const opt: OpzioniMercato = {
    qualitaBacino: altaStagione ? 0.65 : 1.15,
    pressioneStagionale: altaStagione ? 1.35 : 0.9,
  };
  const candidati: Candidato[] = [];
  let n = 0;
  for (const { ruolo, minimo } of COPERTURA_RUOLI) {
    for (let i = 0; i < minimo; i++) {
      candidati.push(generaCandidato(`ini-${ruolo}-${i}-${n++}`, { ...opt, ruoliCercati: [ruolo] }, rng));
    }
  }
  return {
    candidati,
    suggerimento: altaStagione
      ? "Stai aprendo in alta stagione: c'è gente per ogni ruolo, ma i più bravi lavorano già altrove e chi resta ha pretese alte."
      : "Bassa stagione: bacino ampio e gente disposta a trattare. È il momento giusto per costruire la brigata.",
  };
}

/**
 * Risposta IMMEDIATA all'offerta, in fase di costituzione.
 * Se rifiuta, il candidato sparisce dal pool e viene rimpiazzato da uno
 * nuovo dello stesso ruolo: il posto resta scoperto, non la mansione.
 */
export function rispondiOfferta(
  candidato: Candidato,
  offerta: Offerta,
  pool: Candidato[],
  mese: number,
  rng: () => number
): { esito: EsitoOfferta; poolAggiornato: Candidato[]; sostituto?: Candidato } {
  const esito = valutaOfferta(candidato, offerta, rng);
  let poolAggiornato = pool.filter((c) => c.id !== candidato.id);
  let sostituto: Candidato | undefined;
  if (!esito.accettata) {
    const altaStagione = mese >= 5 && mese <= 8;
    sostituto = generaCandidato(
      `sub-${candidato.ruolo}-${Math.floor(rng() * 1e6)}`,
      {
        ruoliCercati: [candidato.ruolo as RuoloEsteso],
        qualitaBacino: altaStagione ? 0.65 : 1.15,
        pressioneStagionale: altaStagione ? 1.35 : 0.9,
      },
      rng
    );
    poolAggiornato = [...poolAggiornato, sostituto];
  }
  return { esito, poolAggiornato, sostituto };
}

export function poolIniziale(mese: number, rng: () => number): PoolCostituzione {
  const altaStagione = mese >= 5 && mese <= 8;
  const opt: OpzioniMercato = {
    qualitaBacino: altaStagione ? 0.65 : 1.15,
    pressioneStagionale: altaStagione ? 1.35 : 0.9,
  };
  const candidati = generaMercato(mese, opt, rng, altaStagione ? 6 : 10);
  return {
    candidati,
    suggerimento: altaStagione
      ? "Stai aprendo in alta stagione: i professionisti bravi sono già impegnati e chi resta ha pretese alte. Considera di aprire fuori stagione."
      : "Bassa stagione: c'è scelta e la gente tratta. È il momento giusto per costruire la brigata.",
  };
}

// ─────────────────────────────────────────────── Riepilogo

export interface RiepilogoCostituzione {
  vociUnaTantum: VoceCosto[];
  totaleCostituzione: number;
  capitaleVersato: number;
  costoCommercialistaAnnuo: number;
  /** quanto resta davvero in cassa per far girare il locale */
  cassaOperativa: number;
  fidoTotale: number;
  avvisi: string[];
  /** se il budget non basta o è risicato: quanto servirebbe davvero */
  budgetConsigliato?: number;
  /** mesi di autonomia con la cassa che resta */
  mesiAutonomia: number;
}

/** Verifica che la brigata sia in grado di aprire davvero. */
export function verificaBrigata(ruoli: string[]): string[] {
  const CUCINA = ["lavapiatti", "commis", "cuoco", "chef", "sous_chef", "pizzaiolo", "pasticcere"];
  const cucina = ruoli.filter((r) => CUCINA.includes(r)).length;
  const sala = ruoli.length - cucina;
  const out: string[] = [];
  if (!ruoli.length) out.push("❌ Non hai assunto nessuno: senza personale il locale non apre.");
  else {
    if (cucina === 0) out.push("❌ NESSUNO IN CUCINA: senza cuoco non si serve un piatto. Assumi almeno un cuoco o uno chef.");
    if (sala === 0) out.push("❌ NESSUNO IN SALA: i clienti entrano e non trova nessuno che prenda l'ordine. Assumi almeno un cameriere (oppure vai tu in sala dalla scheda Titolare).");
    if (cucina > 0 && sala > 0 && ruoli.length < 3) out.push("⚠️ Brigata minima: reggerete i giorni tranquilli, non i weekend pieni.");
  }
  return out;
}

export function riepilogaCostituzione(params: {
  forma: FormaGiuridica;
  budgetIniziale: number;
  /** costi del locale calcolati da costi-avvio.ts (allestimento, cauzione…) */
  costiLocale: number;
  capitaleSociale: number;
  commercialista: OpzioneCommercialista;
  /** stipendi mensili stimati della brigata scelta */
  costoStaffMensile: number;
  costiFissiMensili: number;
  fidoBase: number;
  /** ruoli della brigata assunta, per il controllo di composizione */
  ruoliBrigata?: string[];
}): RiepilogoCostituzione {
  const avvisi: string[] = [...verificaBrigata(params.ruoliBrigata ?? [])];
  const voci = costiCostituzione(params.forma);
  const totaleVoci = voci.reduce((s, v) => s + v.importo, 0);
  const regole = regoleCapitale(params.forma);

  let capitaleVersato = 0;
  if (regole.richiesto) {
    const cap = Math.max(regole.minimo, Math.min(regole.massimo ?? Infinity, params.capitaleSociale));
    capitaleVersato = cap >= 10_000 && params.forma === "srl" ? cap * regole.quotaVersamentoImmediato : cap;
  }

  const totaleCostituzione = totaleVoci + params.costiLocale;
  const cassaOperativa = params.budgetIniziale - totaleCostituzione - capitaleVersato;
  const eff = effettiCapitale(capitaleVersato);
  const fidoTotale = params.fidoBase + eff.fidoAggiuntivo;

  // ── Avvisi: il gioco deve dirti se stai partendo male
  const usciteMensili = params.costoStaffMensile + params.costiFissiMensili;
  const mesiDiAutonomia = usciteMensili > 0 ? cassaOperativa / usciteMensili : 99;
  if (cassaOperativa < 0) {
    avvisi.push(`❌ Il budget non basta: mancano ${eur(-cassaOperativa)}. Scegli un locale più economico, riduci il capitale o taglia la brigata.`);
  } else if (mesiDiAutonomia < 3) {
    avvisi.push(`⚠️ Con ${eur(cassaOperativa)} in cassa e ${eur(usciteMensili)} di uscite al mese hai meno di 3 mesi di autonomia. Il primo inverno ti spazza via.`);
  } else if (mesiDiAutonomia < 6) {
    avvisi.push(`⚠️ Hai circa ${Math.floor(mesiDiAutonomia)} mesi di autonomia: stretto. La stangata di giugno arriva prima di quanto pensi.`);
  }
  if (regole.richiesto) avvisi.push(`ℹ️ ${eff.nota} Fido bancario: ${eur(fidoTotale)}.`);
  if (params.forma === "ditta_forfettaria" || params.forma === "ditta_ordinaria") {
    avvisi.push("ℹ️ Ditta individuale: i contributi INPS commercianti partono subito (~4.200 €/anno di minimali) anche a zero incassi.");
  }
  if (params.forma === "srls" && params.capitaleSociale > 9_999.99) {
    avvisi.push("⚠️ La SRLS non può superare 9.999,99 € di capitale: il resto è stato ignorato.");
  }

  // quanto servirebbe per avere 6 mesi di autonomia, che è il minimo sano
  const cassaSana = usciteMensili * 6;
  const budgetConsigliato = cassaOperativa < cassaSana
    ? Math.ceil((totaleCostituzione + capitaleVersato + cassaSana) / 1000) * 1000
    : undefined;
  if (budgetConsigliato) {
    avvisi.push(`💡 Per partire con 6 mesi di autonomia servirebbero circa ${eur(budgetConsigliato)} (${eur(budgetConsigliato - params.budgetIniziale)} in più di quanto hai messo).`);
  }

  return {
    vociUnaTantum: voci,
    mesiAutonomia: Math.max(0, mesiDiAutonomia),
    budgetConsigliato,
    totaleCostituzione,
    capitaleVersato,
    costoCommercialistaAnnuo: params.commercialista.costoAnnuo,
    cassaOperativa,
    fidoTotale,
    avvisi,
  };
}

function eur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}