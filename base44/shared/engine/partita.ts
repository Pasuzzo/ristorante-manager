/**
 * PARTITA — l'orchestratore del gioco.
 *
 * Un unico stato serializzabile (JSON-friendly: va dritto in un'entità
 * Base44) + una funzione avanzaMese(stato, decisioni) che esegue il turno:
 *
 *   decisioni → domanda (ricavi.ts) → coperti serviti (cap staff)
 *   → ispezioni lavoro nero → gradimento → usura locale → morale/dimissioni
 *   → reputazione → tesoreria (scadenze fiscali) → chiusura d'anno a dicembre
 *
 * RNG deterministico: seed + contatore salvati nello stato → ogni partita
 * è riproducibile (replay, debug, anti-cheat lato server).
 */

import { FISCAL_2026, FiscalConfig } from "./fiscal-config.ts";
import { Ristorante, chiusuraAnnuale, costituisci, FormaGiuridica, fmt } from "./engine.ts";
import { Tesoreria, nuovaTesoreria, tickCassa, registraChiusura, liquidaTfr } from "./tesoreria.ts";
import { generaRicaviMese, ProfiloLocale, StatoMarketing, ContestoMacro, GiornoSimulato } from "./ricavi.ts";
import {
  DipendenteEsteso, nuovoDipendente, performanceStaff, serviCoperti,
  aggiornaMorale, gradimentoMese, aggiornaReputazione, aggiornaLocale,
  ScelteGestione, QualitaMaterie, Servizio, FOOD_COST,
} from "./reputazione.ts";
import { Ricetta, analizzaMenu, imparaRicetta, repertorioBrigata, RICETTE_BASE } from "./ricette.ts";
import {
  StatoMacro, DatiPartenza, inizializzaMacro, avanzaMacro,
  inflazioneMensile, inflazioneAlimentareMensile, fattoreDomanda,
} from "./macro.ts";
import {
  Titolare, Sesso, GestioneCompiti, COMPITI_DEFAULT, EFFETTI_COMPITI,
  EFFETTI_BURNOUT, nuovoTitolare, titolareComeDipendente, aggiornaStress,
  moltGradimentoBurnout,
} from "./titolare.ts";
import { dinamicheCarriera, DipendenteConCarriera, QUOTA_COSTO_CONGEDO } from "./comportamenti.ts";
import {
  Orario, Lavoratore, TipoContratto, CONTRATTI, ORARIO,
  bustaPaga, capacitaSquadra, fabbisogno, oreSettimanali,
} from "./contratti.ts";
import {
  StatoNero, DecisioniNero, nuovoStatoNero, registraMese,
  prelevaContante, rischioFiscale, chiudiAnnoNero,
} from "./nero.ts";
import {
  StatoAssenze, DecisioniAssenze, nuovoStatoAssenze, aggiornaAssenze,
  costoAssenza, malusMoralePerdita,
} from "./assenze.ts";
import {
  StatoFormazione, IscrizioneCorso, nuovoStatoFormazione,
  avanzaFormazione, verificaObblighi, gravitaObblighi, autoformazione,
} from "./formazione.ts";
import { EventoMese, generaEventiMese, effettoEventi, COSTO_TV, COSTO_STAND_SAGRA } from "./eventi.ts";
import {
  Scadenza, Consiglio, previsioniScadenze, usciteProiettate, consigliCommercialista,
} from "./previsioni.ts";
import {
  Griglia, PersonaInTurno, EsitoServizio, ViolazioneTurni,
  grigliaIniziale, valutaServizio, verificaVincoli, affaticamento,
  QUOTA_PRANZO, COPERTI_SERVIZIO, copertiEffettivi, repartoDi,
} from "./turni.ts";
import {
  ConfigPrenotazioni, RigaSettimana, settimanaDaPianificare, presenzeEffettive, chiamaExtra,
} from "./prenotazioni.ts";
import { SANZIONI, accessoRoutine, registraViolazioneCorrispettivi, aggiornaDurc } from "./controlli.ts";
import {
  Bando, Domanda, ProfiloRichiedente, CATALOGO_ESEMPIO,
  bandiDisponibili, presentaDomanda, avanzaDomande,
} from "./bandi.ts";
import {
  StatoReparti, Sforamento, RispostaSforamento, nuovoStatoReparti,
  aggiornaAffidabilita, valutaSforamento, effettoBudgetStretto, EFFETTI_RISPOSTA,
} from "./reparti.ts";
import {
  StatoControlli, Ente, nuovoStatoControlli, calcolaProntezza,
  probabilitaControllo, eseguiControllo, applicaEsito, avanzaControlli,
} from "./controlli.ts";
import {
  OpzioneCommercialista, LivelloCommercialista, opzioniCommercialista,
  riepilogaCostituzione, regoleCapitale, effettiCapitale, poolIniziale, poolCompleto,
  rispondiOfferta, verificaBrigata,
} from "./costituzione.ts";
import { Annuncio, annuncioAConfigLocale } from "./immobili.ts";
import { ConfigLocale, calcolaPianoCosti } from "./costi-avvio.ts";
import { Candidato, Offerta, valutaOfferta, assumi as assumiCandidato } from "./mercato.ts";
import {
  EsitoOfferta, Stile, RuoloEsteso, Annuncio as AnnuncioLavoro,
  generaMercato, aggiornaAdattamento, eventiDipendenti, EventoDipendente,
  raccogliCandidature, scadenzaCandidature, COSTO_ANNUNCIO,
} from "./mercato.ts";

// ─────────────────────────────────────────────── Stato di partita

export interface StatoPartita {
  seed: number;
  contatoreRng: number;
  annoGioco: number;      // 1, 2, 3…
  annoCalendario: number; // per Pasqua, ponti, calendario
  mese: number;           // 1..12 — il mese CHE STA PER ESSERE giocato
  ristorante: Ristorante;
  locale: ProfiloLocale;
  staff: DipendenteEsteso[];
  /** stile del locale: i dipendenti con stile diverso rendono meno finché non si adattano */
  stileLocale: Stile;
  /** candidature ricevute: spontanee e in risposta agli annunci.
   *  Sostituisce la vecchia vetrina sempre piena. */
  mercato: Candidato[];
  /** TFR maturato per dipendente (per liquidarlo a fine rapporto) */
  tfrPerDipendente: Record<string, number>;
  mkt: StatoMarketing;
  scelte: ScelteGestione;
  /** il menu del ristorante: se presente, food cost e scontrino vengono dalle ricette */
  menu: Ricetta[];
  macro: ContestoMacro;
  /** economia viva: parte dal dato Istat reale e poi deriva dal seed */
  macroStato: StatoMacro;
  titolare: Titolare;
  compiti: GestioneCompiti;
  /** capitale sociale versato: patrimonio vincolato, non cassa spendibile */
  /** monte ore settimanale per dipendente (feriale/festivo) */
  orari: Record<string, Orario>;
  nero: StatoNero;
  /** settimana tipo: 7 giorni × pranzo/cena, con orari e arrivi */
  griglia: Griglia;
  /** il locale accetta caparre sui gruppi */
  caparraGruppi: boolean;
  /** spesa in conto capitale DOCUMENTATA (fatture in chiaro), per mese
   *  assoluto: è l'unica che un bando può finanziare */
  investimentiDocumentati: Array<{ mese: number; importo: number }>;
  /** domande di contributo presentate: in istruttoria, accolte, in erogazione */
  domandeBandi: Domanda[];
  /** assunzioni nuove nell'anno: requisito di alcuni bandi */
  nuoveAssunzioniAnno: number;
  /** spesa in investimenti documentata con fattura negli ultimi 12 mesi */
  investimentoDocumentato: number;
  reparti: StatoReparti;
  controlli: StatoControlli;
  /** eventi del mese in corso, generati proceduralmente */
  eventiLocali: EventoMese[];
  /** il locale ha un maxischermo */
  haTv: boolean;
  assenze: StatoAssenze;
  formazione: StatoFormazione;
  /** politiche persistenti sul nero */
  politicheNero: DecisioniNero;
  capitaleVersato: number;
  commercialista: OpzioneCommercialista;
  /** l'annuncio scelto in fase di costituzione */
  immobile?: { titolo: string; comune: string; zona: string; canoneMensile?: number; prezzoVendita?: number; avviamento?: number };
  /** food cost base scelto dal giocatore, prima dell'inflazione alimentare */
  foodCostBase: number;
  reputazione: number; // 0..1
  tesoreria: Tesoreria;
  /** costi fissi base (affitto, utenze) — l'inflazione li erode qui */
  costiFissiBase: number;
  /** accumulo di competenza per la chiusura fiscale */
  fiscale: { ricavi: number; costiDeducibili: number };
  gameOver: boolean;
  motivoGameOver?: string;
}

export interface NuovaAssunzione {
  nome: string;
  ruolo: DipendenteEsteso["ruolo"];
  livello: "scarso" | "medio" | "bravo";
  superminimo: number;
  inRegola: boolean;
  /** contratto stagionale: cessa automaticamente a fine di questo mese (1-12) */
  stagionaleFinoAlMese?: number;
}

export interface DecisioniMese {
  spesaTradizionale?: number;
  spesaSocial?: number;
  qualitaMaterie?: QualitaMaterie;
  manutenzioneMese?: number;
  servizi?: Servizio[];
  listino?: number; // 1 = in linea col mercato
  /** assunzioni: offerte fatte ai candidati in casella */
  offerte?: Offerta[];
  /** annunci di lavoro da pubblicare questo mese */
  annunci?: AnnuncioLavoro[];
  /** assunzioni dirette (debug/scenari): saltano il mercato */
  assunzioni?: NuovaAssunzione[];
  licenziamenti?: string[]; // id dipendenti
  aumenti?: Array<{ id: string; superminimo: number }>;
  /** spesa una tantum: +1 punto condizione locale ogni 250€ */
  ristrutturazione?: number;
  /** come il titolare organizza i compiti (delega vs fai-da-te) */
  compiti?: Partial<GestioneCompiti>;
  /** monte ore settimanale (retrocompatibile: se c'è la griglia, vince la griglia) */
  orari?: Record<string, Orario>;
  /** la griglia settimanale: è questa che comanda */
  griglia?: Griglia;
  /** caparra sui gruppi: meno no-show, qualche cliente in meno */
  caparraGruppi?: boolean;
  /** id dei bandi per cui presentare domanda questo mese */
  domandeBandi?: string[];
  /** convocazioni degli extra: possono rifiutare */
  chiamateExtra?: Array<{ idDipendente: string; giorniPreavviso: number }>;
  /** un cuoco insegna un piatto a un altro (o lo si manda a impararlo) */
  insegnaRicette?: Array<{ idDipendente: string; idRicetta: string }>;
  /** investimento dichiarato nella domanda: viene comunque limitato a
   *  quello che puoi documentare con fatture */
  investimentoDichiarato?: number;
  /** mettersi in regola coi contributi per sbloccare il DURC prima */
  regolarizzaDurc?: boolean;
  /** in caso di sovraccarico: straordinari (paghi la maggiorazione) o clienti respinti */
  politicaSovraccarico?: "straordinari" | "respingi";
  /** quote di incassi/acquisti non dichiarati e politica del fuori busta */
  nero?: DecisioniNero;
  /** ferie concesse e chiusura collettiva */
  assenze?: DecisioniAssenze;
  /** iscrizioni ai corsi */
  corsi?: IscrizioneCorso[];
  /** budget e responsabili di reparto */
  reparti?: {
    budgetCucina?: number; budgetSala?: number;
    responsabileCucina?: string | null; responsabileSala?: string | null;
    sogliaSegnalazione?: number;
  };
  /** risposta a uno sforamento segnalato il mese scorso */
  rispostaSforamento?: { reparto: "cucina" | "sala"; risposta: RispostaSforamento };
  /** acquisti una tantum */
  compraTv?: boolean;
  standAllaSagra?: boolean;
  /** nuovo menu (ricette + prezzi di vendita decisi dal giocatore) */
  menu?: Ricetta[];
}

export interface ReportMese {
  annoGioco: number;
  mese: number;
  /** giorno per giorno — il client li riproduce a 2-3s l'uno con play/pausa.
   *  copertiServitiGiorno tiene conto del cap di capacità dello staff. */
  giorni: Array<GiornoSimulato & { copertiServitiGiorno: number; ricaviGiorno: number }>;
  copertiDomanda: number;
  copertiServiti: number;
  clientiRespinti: number;
  ricaviLordi: number;
  gradimento: number;   // 0..1
  reputazione: number;  // 0..1
  cassa: number;
  tfrTotale: number;
  seguitoSocial: number;
  staff: Array<{ id: string; nome: string; ruolo: string; morale: number; inRegola: boolean }>;
  eventi: string[];
  /** eventi generati dalle persone (tratti, famiglia, vizi) */
  eventiPersonali: EventoDipendente[];
  /** candidati disponibili il mese prossimo */
  mercato: Candidato[];
  /** esito delle offerte fatte questo mese */
  esitiOfferte: Array<{ candidatoId: string; nome: string } & EsitoOfferta>;
  chiusuraAnno?: string[];
  gameOver: boolean;
  /** stato dell'economia questo mese, per la dashboard */
  macro: { inflazione: number; inflazioneAlimentare: number; fiducia: number; salari: number; shock?: string };
  /** bandi aperti questo mese, con eleggibilità già valutata */
  bandi: Array<{ id: string; titolo: string; ente: string; ammissibile: boolean; motiviEsclusione: string[]; contributoStimato: number; costoConsulenza: number }>;
  /** pratiche in corso */
  domandeBandi: Domanda[];
  /** i sette giorni da pianificare quando metti in pausa */
  settimana: RigaSettimana[];
  /** violazioni della griglia: 11 ore, riposo settimanale, straordinari */
  violazioniTurni: ViolazioneTurni[];
  /** ore settimanali risultanti dalla griglia, per dipendente */
  oreSettimanali: Record<string, number>;
  /** esiti dei servizi: ritardi, piatti fuori, ore sprecate */
  serviziProblematici: Array<{ giorno: number; servizio: Servizio; problema: string }>;
  /** scadenze dei prossimi mesi e consigli del commercialista */
  scadenze: Scadenza[];
  usciteProiettate: Array<{ mesiAvanti: number; mese: number; totale: number }>;
  consigli: Consiglio[];
  /** no-show del mese: prenotazioni non presentate */
  noShow: { coperti: number; ricaviPersi: number };
  /** esiti delle convocazioni degli extra */
  chiamate: Array<{ nome: string; accettata: boolean; motivo: string }>;
  /** piatti imparati questo mese */
  ricetteImparate: Array<{ nome: string; piatto: string }>;
  /** eventi locali del mese */
  eventiCalendario: EventoMese[];
  /** sforamenti di budget da gestire */
  sforamenti: Sforamento[];
  /** ispezione subita questo mese, se c'è stata */
  ispezione?: { ente: Ente; titolo: string; trovato: string[]; sanzione: number; sospensioneGiorni: number; durcIrregolareMesi: number };
  /** affidabilità per dipendente */
  affidabilita: Record<string, number>;
  /** DURC irregolare: niente bandi. `durcMesiResidui` dice quanto manca,
   *  `costoRegolarizzazione` quanto costa uscirne subito. */
  durcIrregolare: boolean;
  durcMesiResidui: number;
  costoRegolarizzazione: number;
  /** spesa documentata negli ultimi 12 mesi: il tetto dei contributi */
  investimentoDocumentabile: number;
  /** registro dichiarato/reale e cassa nera */
  nero: { cassaNera: number; quotaNeraAnno: number; incoerenza: number; rischio: number };
  /** assenze del mese: id -> giorni */
  assenze: Record<string, number>;
  /** corsi obbligatori mancanti */
  obblighiFormativi: Array<{ nome: string; mancanti: number; scaduto: boolean; costoTotale: number; oreTotali: number }>;
  /** buste paga del mese: id -> costo azienda / lordo / netto */
  buste: Record<string, { lordo: number; nettoInBusta: number; cashNero: number; costoAzienda: number; oreDichiarate: number; oreNonDichiarate: number }>;
  /** ore disponibili contro ore necessarie */
  fabbisogno: { copertiPrevisti: number; capacita: number; gapCoperti: number; oreMancantiCucina: number; oreMancantiSala: number; stato: string };
  /** scheda del titolare, per la dashboard */
  titolare: { nome: string; eta: number; sesso: string; stress: number; burnout: boolean; compiti: GestioneCompiti };
}

// ─────────────────────────────────────────────── RNG deterministico

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────── Nuova partita

export interface ConfigNuovaPartita {
  nomeRistorante: string;
  forma: FormaGiuridica;
  budgetIniziale: number;
  /** ANNUNCIO SCELTO dalla bacheca — non più parametri astratti */
  annuncio: Annuncio;
  modalitaImmobile: "affitto" | "acquisto" | "acquisto_mutuo";
  /** CANDIDATI SCELTI dal pool, con l'offerta fatta a ciascuno */
  assunzioniIniziali: Array<{ candidato: Candidato; offerta: Offerta }>;
  commercialista: LivelloCommercialista;
  /** solo per società di capitali */
  capitaleSociale?: number;
  stileLocale: Stile;
  titolare: { nome: string; eta: number; sesso: Sesso };
  macro: ContestoMacro;
  annoCalendario: number;
  meseInizio?: number; // aprire a gennaio o a giugno cambia tutto
  seed: number;
  datiIstat?: DatiPartenza;
}

export function nuovaPartita(c: ConfigNuovaPartita, cfg: FiscalConfig = FISCAL_2026): StatoPartita {
  const rng = mulberry32(c.seed);
  const mese = c.meseInizio ?? 1;

  // ── 1. Il locale scelto → configurazione e costi reali
  const confLocale = annuncioAConfigLocale(c.annuncio, c.modalitaImmobile) as unknown as ConfigLocale & {
    canoneRealeMensile?: number; avviamento?: number; passaggio?: number;
  };
  const piano = calcolaPianoCosti(confLocale);
  // il canone dell'annuncio scelto SOVRASCRIVE la stima per zona
  const canone = c.annuncio.canoneMensile ?? 0;
  const fissiSenzaAffitto = piano.mensili
    .filter((v) => !/Affitto locale/.test(v.voce))
    .reduce((s, v) => s + v.importo, 0);
  const costiFissiMensili = fissiSenzaAffitto + (c.modalitaImmobile === "affitto" ? canone : 0);
  // costi una tantum del locale: allestimento, cauzione, avviamento…
  const costiLocale =
    piano.totaleUnaTantum +
    (c.annuncio.avviamento ?? 0) +
    (c.modalitaImmobile === "affitto" ? canone * 3 : 0);

  // ── 2. Il commercialista scelto
  const commercialista =
    opzioniCommercialista(c.forma).find((o) => o.id === c.commercialista) ??
    opzioniCommercialista(c.forma)[1];

  // ── 3. La brigata: solo chi ha accettato l'offerta
  const staff: DipendenteEsteso[] = [];
  const esitiAssunzioni: string[] = [];
  for (const a of c.assunzioniIniziali) {
    const esito = valutaOfferta(a.candidato, a.offerta, rng);
    if (esito.accettata) {
      staff.push(assumiCandidato(a.candidato, a.offerta, esito) as unknown as DipendenteEsteso);
      esitiAssunzioni.push(`✅ ${a.candidato.nome} ha accettato.`);
    } else {
      esitiAssunzioni.push(`❌ ${a.candidato.nome} ha rifiutato: ${esito.motivo}`);
    }
  }
  const costoStaffMensile = staff.reduce(
    (s, d) => s + cfg.ccnlLordoMensile[d.ruolo] * d.superminimo * 1.38, 0);

  // ── 4. Capitale sociale e riepilogo economico
  const regole = regoleCapitale(c.forma);
  const riepilogo = riepilogaCostituzione({
    forma: c.forma,
    budgetIniziale: c.budgetIniziale,
    costiLocale,
    capitaleSociale: c.capitaleSociale ?? regole.minimo,
    commercialista,
    costoStaffMensile,
    costiFissiMensili,
    fidoBase: cfg.tesoreria.fidoDefault,
    ruoliBrigata: staff.map((d) => (d as any).ruoloEsteso ?? d.ruolo),
  });

  const ristorante: Ristorante = {
    nome: c.nomeRistorante,
    forma: c.forma,
    annoAttivita: 1,
    cassa: riepilogo.cassaOperativa,
    dipendenti: staff,
    costiFissiMensili,
    foodCostPct: 0.32,
  };

  const tesoreria = nuovaTesoreria(riepilogo.cassaOperativa, cfg);
  tesoreria.fidoMax = riepilogo.fidoTotale;

  const stato: StatoPartita = {
    seed: c.seed,
    contatoreRng: 1,
    annoGioco: 1,
    annoCalendario: c.annoCalendario,
    mese,
    ristorante,
    locale: {
      postiASedere: c.annuncio.postiStimati,
      turniMax: 2.2,
      giornoChiusura: 1,
      scontrinoMedioBase: 34,
      tipoLocalita: c.annuncio.posizioneCommerciale === "ottima" ? "riviera"
                  : c.annuncio.posizioneCommerciale === "normale" ? "citta" : "paese",
      listino: 1,
      elasticitaPrezzo: -1.2,
      tassoBase: 0.46 * (c.annuncio.passaggio ?? 1),
      indicePrezziMenu: 1,
    },
    staff,
    stileLocale: c.stileLocale,
    mercato: generaMercato(mese, { pressioneStagionale: 1 }, rng, 5),
    tfrPerDipendente: {},
    mkt: { spesaTradizionaleMese: 0, spesaSocialMese: 0, seguitoSocial: 0 },
    scelte: {
      qualitaMaterie: "standard",
      condizioneLocale: c.annuncio.stato === "chiavi_in_mano" ? 88
                      : c.annuncio.stato === "buono" ? 72
                      : c.annuncio.stato === "grezzo" ? 55 : 40,
      manutenzioneMese: 0,
      servizi: [],
    },
    macro: c.macro,
    macroStato: inizializzaMacro(c.datiIstat ?? {
      inflazioneAnnua: 0.018, inflazioneAlimentare: 0.022,
      fiduciaConsumatori: 0.98, crescitaSalariAnnua: 0.012,
      fonte: "fallback", aggiornatoAl: "n/d",
    }),
    foodCostBase: 0.32,
    menu: [],
    titolare: nuovoTitolare(c.titolare.nome, c.titolare.eta, c.titolare.sesso),
    compiti: { ...COMPITI_DEFAULT },
    orari: Object.fromEntries(staff.map((d) => [d.id, { oreFeriali: 24, oreFestive: 16 }])),
    nero: nuovoStatoNero(),
    griglia: grigliaIniziale(
      staff.map((d) => ({ id: d.id, ruolo: (d as any).ruoloEsteso ?? d.ruolo })),
      1,
    ),
    caparraGruppi: false,
    investimentiDocumentati: [],
    domandeBandi: [],
    nuoveAssunzioniAnno: 0,
    investimentoDocumentato: 0,
    reparti: nuovoStatoReparti(),
    controlli: nuovoStatoControlli(),
    eventiLocali: [],
    haTv: false,
    assenze: nuovoStatoAssenze(),
    formazione: nuovoStatoFormazione(),
    politicheNero: { quotaScontrino: 0, quotaAcquisti: 0, pagaNeroInAssenza: true },
    capitaleVersato: riepilogo.capitaleVersato,
    commercialista,
    immobile: {
      titolo: c.annuncio.titolo, comune: c.annuncio.comune, zona: c.annuncio.descrizioneZona,
      canoneMensile: c.annuncio.canoneMensile, prezzoVendita: c.annuncio.prezzoVendita,
      avviamento: c.annuncio.avviamento,
    },
    reputazione: 0.35,
    tesoreria,
    costiFissiBase: costiFissiMensili,
    fiscale: { ricavi: 0, costiDeducibili: 0 },
    gameOver: false,
  };

  (stato as any).__logCostituzione = [...esitiAssunzioni, ...riepilogo.avvisi];
  return stato;
}

/** Il pool COMPLETO di candidati per il wizard: almeno una scelta per
 *  ogni mansione, così la brigata si può comporre come si vuole. */
export function candidatiIniziali(seed: number, mese: number) {
  return poolCompleto(mese, mulberry32(seed ^ 0x5eed));
}

/** Risposta immediata a un'offerta fatta in fase di costituzione. */
export { rispondiOfferta };

// ─────────────────────────────────────────────── Il turno

export function avanzaMese(
  s: StatoPartita,
  dec: DecisioniMese = {},
  cfg: FiscalConfig = FISCAL_2026
): ReportMese {
  if (s.gameOver) throw new Error(`Partita finita: ${s.motivoGameOver}`);
  const eventi: string[] = [];
  const rng = mulberry32((s.seed ^ Math.imul(s.contatoreRng, 2654435761)) | 0);
  s.contatoreRng++;

  // ── 1. Applica le decisioni del giocatore
  if (dec.compiti) s.compiti = { ...s.compiti, ...dec.compiti };
  if (dec.orari) s.orari = { ...s.orari, ...dec.orari };
  if (!s.orari) s.orari = {};
  for (const d of s.staff) if (!s.orari[d.id]) s.orari[d.id] = { oreFeriali: 24, oreFestive: 16 };
  if (!s.nero) s.nero = nuovoStatoNero();
  if (!s.griglia) s.griglia = grigliaIniziale(s.staff.map((d: any) => ({ id: d.id, ruolo: d.ruoloEsteso ?? d.ruolo })), s.locale.giornoChiusura ?? 1);
  if (dec.griglia) s.griglia = dec.griglia;
  if (dec.caparraGruppi !== undefined) s.caparraGruppi = dec.caparraGruppi;
  // Solo i NUOVI assunti entrano in griglia, con gli arrivi di default e
  // un giorno di riposo: chi è già in griglia mantiene i turni decisi.
  for (const d of s.staff as any[]) {
    const giaInGriglia = s.griglia.some((g) =>
      g.pranzo.turni.some((t) => t.idDipendente === d.id) ||
      g.cena.turni.some((t) => t.idDipendente === d.id));
    if (giaInGriglia) continue;
    const reparto = repartoDi(d.ruoloEsteso ?? d.ruolo);
    // entra nei servizi meno coperti del suo reparto, non in tutti
    const conteggio: Array<{ dow: number; sv: Servizio; n: number }> = [];
    for (let dow = 0; dow < 7; dow++) {
      for (const sv of ["pranzo", "cena"] as Servizio[]) {
        const sp = s.griglia[dow][sv];
        if (!sp.aperto) continue;
        conteggio.push({ dow, sv, n: sp.turni.length });
      }
    }
    conteggio.sort((a, b) => a.n - b.n);
    for (const c of conteggio.slice(0, Math.ceil(conteggio.length * 0.6))) {
      s.griglia[c.dow][c.sv].turni.push({
        idDipendente: d.id,
        oraArrivo: s.griglia[c.dow][c.sv].oraApertura - (reparto === "cucina" ? 3 : 1.5),
      });
    }
  }
  if (!s.assenze) s.assenze = nuovoStatoAssenze();
  if (!s.formazione) s.formazione = nuovoStatoFormazione();
  if (!s.politicheNero) s.politicheNero = { quotaScontrino: 0, quotaAcquisti: 0, pagaNeroInAssenza: true };
  if (dec.nero) s.politicheNero = { ...s.politicheNero, ...dec.nero };
  if (!s.reparti) s.reparti = nuovoStatoReparti();
  if (!s.controlli) s.controlli = nuovoStatoControlli();
  if (!s.eventiLocali) s.eventiLocali = [];
  if (!s.domandeBandi) s.domandeBandi = [];
  if (s.nuoveAssunzioniAnno === undefined) s.nuoveAssunzioniAnno = 0;
  if (s.investimentoDocumentato === undefined) s.investimentoDocumentato = 0;
  if (dec.reparti) {
    const r = dec.reparti;
    if (r.budgetCucina !== undefined) s.reparti.budgetCucina = Math.max(0, r.budgetCucina);
    if (r.budgetSala !== undefined) s.reparti.budgetSala = Math.max(0, r.budgetSala);
    if (r.sogliaSegnalazione !== undefined) s.reparti.sogliaSegnalazione = r.sogliaSegnalazione;
    if (r.responsabileCucina !== undefined) s.reparti.responsabileCucina = r.responsabileCucina ?? undefined;
    if (r.responsabileSala !== undefined) s.reparti.responsabileSala = r.responsabileSala ?? undefined;
  }
  if (dec.compraTv && !s.haTv) {
    s.haTv = true;
    s.tesoreria.saldo -= COSTO_TV;
    eventi.push(`📺 Maxischermo installato (${COSTO_TV}€): con le partite cambia tutto, ma dipende dal tipo di locale.`);
  }
  // risposta a uno sforamento del mese scorso
  if (dec.rispostaSforamento) {
    const { reparto, risposta } = dec.rispostaSforamento;
    const idResp = reparto === "cucina" ? s.reparti.responsabileCucina : s.reparti.responsabileSala;
    const d = s.staff.find((x) => x.id === idResp);
    const eff = EFFETTI_RISPOSTA[risposta];
    if (d && eff) {
      s.reparti.affidabilita[d.id] = Math.max(3, Math.min(98, (s.reparti.affidabilita[d.id] ?? 50) + eff.affidabilita));
      d.morale = Math.max(5, Math.min(95, d.morale + eff.morale));
      eventi.push(`🗣️ ${d.nome}: ${eff.nota}`);
      if (risposta === "ritira_delega") {
        if (reparto === "cucina") s.reparti.responsabileCucina = undefined;
        else s.reparti.responsabileSala = undefined;
      }
    }
  }
  // in burnout le decisioni "di visione" vengono ignorate: non ce la fa
  if (s.titolare.burnout) {
    const bloccate: string[] = [];
    if (dec.ristrutturazione) { delete dec.ristrutturazione; bloccate.push("ristrutturazione"); }
    if (dec.listino !== undefined) { delete dec.listino; bloccate.push("listino"); }
    if (dec.servizi) { delete dec.servizi; bloccate.push("servizi"); }
    if (dec.qualitaMaterie) { delete dec.qualitaMaterie; bloccate.push("qualità materie"); }
    if (bloccate.length) eventi.push(`🔥 In burnout non riesci a occuparti di: ${bloccate.join(", ")}. Prima rimettiti in piedi (delega, riposa).`);
  }
  if (dec.spesaTradizionale !== undefined) s.mkt.spesaTradizionaleMese = Math.max(0, dec.spesaTradizionale);
  if (dec.spesaSocial !== undefined) s.mkt.spesaSocialMese = Math.max(0, dec.spesaSocial);
  if (dec.qualitaMaterie) s.scelte.qualitaMaterie = dec.qualitaMaterie;
  if (dec.manutenzioneMese !== undefined) s.scelte.manutenzioneMese = Math.max(0, dec.manutenzioneMese);
  if (dec.servizi) s.scelte.servizi = dec.servizi;
  if (dec.listino !== undefined) s.locale.listino = Math.max(0.7, Math.min(1.6, dec.listino));
  if (dec.menu) s.menu = dec.menu;

  // Food cost e scontrino: dalle ricette se c'è un menu, altrimenti forfait
  let fattoreEsecuzione = 1;
  if (s.menu.length > 0) {
    const m = analizzaMenu(s.menu, s.staff, s.scelte.qualitaMaterie);
    s.ristorante.foodCostPct = m.foodCostPct;
    s.locale.scontrinoMedioBase = m.scontrinoMedio;
    fattoreEsecuzione = m.fattoreEsecuzione;
    eventi.push(...m.avvisi);
  } else {
    if (dec.qualitaMaterie) {
    // cambiando qualità si riparte dal food cost nominale, già adeguato
    // all'inflazione alimentare accumulata finora
    const drift = s.foodCostBase > 0 ? s.ristorante.foodCostPct / s.foodCostBase : 1;
    s.foodCostBase = FOOD_COST[s.scelte.qualitaMaterie];
    s.ristorante.foodCostPct = s.foodCostBase * drift;
  }
  }

  // ── Offerte ai candidati del mercato
  const esitiOfferte: Array<{ candidatoId: string; nome: string } & EsitoOfferta> = [];
  for (const off of dec.offerte ?? []) {
    const c = s.mercato.find((x) => x.id === off.candidatoId);
    if (!c) { eventi.push(`⚠️ Candidato non più disponibile.`); continue; }
    const esito = valutaOfferta(c, off, rng);
    esitiOfferte.push({ candidatoId: c.id, nome: c.nome, ...esito });
    eventi.push(esito.accettata ? `🤝 ${esito.motivo}` : `❌ ${esito.motivo}`);
    if (esito.accettata) {
      s.staff.push(assumiCandidato(c, off, esito) as unknown as DipendenteEsteso);
      s.nuoveAssunzioniAnno++;
      s.mercato = s.mercato.filter((x) => x.id !== c.id);
    }
  }

  for (const a of dec.assunzioni ?? []) {
    const id = `d${Object.keys(s.tfrPerDipendente).length + s.staff.length + 1}-${s.contatoreRng}`;
    const d = nuovoDipendente(id, a.nome, a.ruolo, a.livello, a.superminimo, a.inRegola, rng) as
      DipendenteEsteso & { stagionaleFinoAlMese?: number };
    d.stagionaleFinoAlMese = a.stagionaleFinoAlMese;
    s.staff.push(d);
    eventi.push(`📝 Assunzione: ${a.nome} (${a.ruolo}${a.inRegola ? "" : ", IN NERO"}${a.stagionaleFinoAlMese ? `, stagionale fino a M${a.stagionaleFinoAlMese}` : ""})`);
  }
  for (const id of dec.licenziamenti ?? []) cessaRapporto(s, id, "licenziato", eventi);
  for (const au of dec.aumenti ?? []) {
    const d = s.staff.find((x) => x.id === au.id);
    if (d && au.superminimo > d.superminimo) {
      d.superminimo = au.superminimo;
      d.morale = Math.min(95, d.morale + 12);
      eventi.push(`💶 Aumento a ${d.nome}: ora ${Math.round((au.superminimo - 1) * 100)}% sopra il minimo CCNL`);
    } else if (d) d.superminimo = au.superminimo;
  }
  if (dec.ristrutturazione && dec.ristrutturazione > 0) {
    // la quota pagata in nero non produce fattura e non è rendicontabile
    s.investimentoDocumentato += dec.ristrutturazione * (1 - (s.politicheNero?.quotaAcquisti ?? 0));
    s.scelte.condizioneLocale = Math.min(100, s.scelte.condizioneLocale + dec.ristrutturazione / 250);
    eventi.push(`🔨 Ristrutturazione: ${fmt(dec.ristrutturazione)} → locale a ${Math.round(s.scelte.condizioneLocale)}/100`);
  }

  // ── 1bis. L'economia si muove: inflazione, salari, fiducia, canoni
  const esitoMacro = avanzaMacro(s.macroStato, s.mese, s.annoGioco, rng);
  eventi.push(...esitoMacro.eventi);
  s.macro.fiduciaConsumatori = fattoreDomanda(s.macroStato);
  s.macro.crescitaSalariAnnua = s.macroStato.crescitaSalariAnnua;
  // il food cost segue l'inflazione ALIMENTARE, non quella generale
  s.ristorante.foodCostPct = Math.min(0.75,
    s.ristorante.foodCostPct * (1 + inflazioneAlimentareMensile(s.macroStato)));
  // adeguamento ISTAT del canone (una volta l'anno, 75%)
  if (esitoMacro.adeguamentoCanone > 1) s.costiFissiBase *= esitoMacro.adeguamentoCanone;
  // il menu si adegua all'inflazione GENERALE, il food cost a quella ALIMENTARE:
  // quando l'alimentare corre di più, il margine si stringe. È la morsa vera.
  s.locale.indicePrezziMenu = (s.locale.indicePrezziMenu ?? 1) * (1 + inflazioneMensile(s.macroStato));

  // ── 2. Domanda e coperti serviti
  // ── Eventi locali del mese (fiere, sagre, partite…)
  s.eventiLocali = generaEventiMese({
    tipoLocalita: s.locale.tipoLocalita,
    mese: s.mese,
    haTv: s.haTv,
    stileLocale: s.stileLocale,
    standAllaSagra: !!dec.standAllaSagra,
  }, rng);
  const effEventi = effettoEventi(s.eventiLocali);
  for (const e of s.eventiLocali) {
    eventi.push(`${e.icona} ${e.nome} (${e.giorni}g): ${e.effettoMese >= 1 ? "+" : ""}${Math.round((e.effettoMese - 1) * 100)}% affluenza. ${e.nota}`);
  }
  if (dec.standAllaSagra && s.eventiLocali.some((e) => e.tipo === "sagra")) {
    s.tesoreria.saldo -= COSTO_STAND_SAGRA;
  }

  const r = generaRicaviMese(s.locale, s.mkt, s.macro, cfg, s.annoCalendario, s.annoGioco, s.mese, s.reputazione, rng);
  r.copertiTotali = Math.round(r.copertiTotali * effEventi.affluenza);
  r.scontrinoMedio *= effEventi.scontrino;
  // il titolare che copre un ruolo conta come un membro della squadra
  const squadraOperativa = s.compiti.ruoloCoperto
    ? [...s.staff, titolareComeDipendente(s.titolare, s.compiti.ruoloCoperto)]
    : s.staff;
  // chi è in congedo non è operativo
  const idCongedo = new Set(((s as any).__inCongedo as string[]) ?? []);
  const operativi = squadraOperativa.filter((d) => !idCongedo.has(d.id));
  const perf = performanceStaff(operativi);

  // Capacità dalle ORE contrattuali: è il monte ore a dire quanti coperti reggi.
  const lavoratori: Lavoratore[] = operativi.map((d) => ({
    id: d.id, nome: d.nome,
    ruolo: (d as any).ruoloEsteso ?? d.ruolo,
    contratto: ((d as any).tipoContrattuale ?? "indeterminato") as TipoContratto,
    orario: s.orari[d.id] ?? { oreFeriali: 24, oreFestive: 16 },
    superminimo: d.superminimo,
    quotaNero: d.inRegola ? ((d as any).quotaNero ?? 0) : 1,
    velocita: d.attributi.velocita,
    morale: d.morale,
  }));
  // ── Convocazione degli extra: possono dire di no, e te ne accorgi tardi
  const chiamate: ReportMese["chiamate"] = [];
  const extraRifiutati = new Set<string>();
  for (const ch of dec.chiamateExtra ?? []) {
    const d = s.staff.find((x) => x.id === ch.idDipendente) as any;
    if (!d) continue;
    const esito = chiamaExtra(
      { nome: d.nome, famiglia: d.famiglia, morale: d.morale },
      s.reparti.affidabilita[d.id] ?? 50,
      Math.max(0, ch.giorniPreavviso ?? 3),
      s.mese >= 6 && s.mese <= 8 ? "cena" : "cena",
      6,
      rng,
    );
    chiamate.push({ nome: d.nome, accettata: esito.accettata, motivo: esito.motivo });
    eventi.push(`${esito.accettata ? "📞" : "📵"} ${esito.motivo}`);
    if (!esito.accettata) extraRifiutati.add(d.id);
    else d.morale = Math.min(95, d.morale + (ch.giorniPreavviso <= 1 ? 3 : 1));
  }

  // ── I servizi della settimana tipo, applicati ai giorni del mese
  const inTurno: PersonaInTurno[] = operativi.filter((d: any) => !extraRifiutati.has(d.id)).map((d: any) => ({
    id: d.id, nome: d.nome, ruolo: d.ruoloEsteso ?? d.ruolo,
    velocita: d.attributi.velocita, resistenza: d.attributi.resistenza, morale: d.morale,
  }));
  const quotaPranzo = QUOTA_PRANZO[s.locale.tipoLocalita] ?? 0.4;
  const complessita = Math.min(1, (s.menu?.length ?? 0) / 18);
  const serviziProblematici: ReportMese["serviziProblematici"] = [];
  let capacitaMensile = 0, oreSprecateMese = 0, moltGradServizi = 0, nServizi = 0;
  const oreMeseDaGriglia: Record<string, number> = {};

  // Domanda dei servizi chiusi: una parte si sposta su quelli aperti,
  // il resto è persa. Chiudere a pranzo non azzera i clienti del giorno.
  const QUOTA_RECUPERO = 0.38;
  let domandaChiusa = 0, serviziAperti = 0;
  for (const g of r.giorni) {
    const pian = s.griglia[g.dow];
    for (const sv of ["pranzo", "cena"] as Servizio[]) {
      const quota = sv === "pranzo" ? quotaPranzo : 1 - quotaPranzo;
      if (g.chiuso || !pian[sv].aperto) domandaChiusa += g.copertiDomanda * quota;
      else serviziAperti++;
    }
  }
  const recuperoPerServizio = serviziAperti > 0
    ? (domandaChiusa * QUOTA_RECUPERO) / serviziAperti : 0;

  for (const g of r.giorni) {
    if (g.chiuso) continue;
    const pian = s.griglia[g.dow];
    for (const sv of ["pranzo", "cena"] as Servizio[]) {
      const sp = pian[sv];
      if (!sp.aperto) continue;
      const attesi = g.copertiDomanda * (sv === "pranzo" ? quotaPranzo : 1 - quotaPranzo) + recuperoPerServizio;
      const es = valutaServizio(sp, sv, inTurno, attesi, {
        complessitaMenu: complessita,
        haDehors: (s.scelte.servizi ?? []).includes("dehors" as any),
      });
      capacitaMensile += es.capacita;
      oreSprecateMese += es.oreSprecate;
      moltGradServizi += es.moltGradimento; nServizi++;
      for (const [id, ore] of Object.entries(es.oreLavorate)) {
        oreMeseDaGriglia[id] = (oreMeseDaGriglia[id] ?? 0) + ore;
      }
      if (es.ritardoApertura > 0 || es.piattiFuori > 0) {
        serviziProblematici.push({
          giorno: g.giorno, servizio: sv,
          problema: es.ritardoApertura > 0
            ? `apertura in ritardo di ${es.ritardoApertura} min`
            : `${es.piattiFuori} piatti fuori menu`,
        });
        if (serviziProblematici.length <= 3) eventi.push(`${sv === "pranzo" ? "🍽️" : "🌙"} Giorno ${g.giorno}: ${es.eventi[0] ?? ""}`);
      }
    }
  }
  const grigliaAttiva = capacitaMensile > 0;

  const capOre = capacitaSquadra(lavoratori, Math.round(r.copertiTotali / ORARIO.settimanePerMese));
  // ~4,33 settimane al mese; il titolare che copre un ruolo è già dentro `operativi`
  if (grigliaAttiva) {
    perf.capacitaCoperti = capacitaMensile;
    // la domanda che il locale può davvero intercettare, dati i servizi aperti
    r.copertiTotali = Math.round(r.copertiTotali - domandaChiusa * (1 - QUOTA_RECUPERO));
  }
  else if (lavoratori.length) perf.capacitaCoperti = capOre.copertiSettimana * ORARIO.settimanePerMese;
  eventi.push(...capOre.avvisi);
  perf.cucina = Math.min(1, perf.cucina * fattoreEsecuzione); // il menu giusto (o sbagliato) per la brigata
  let { serviti, respinti } = serviCoperti(r.copertiTotali, perf);
  // Senza una brigata capace di coprire cucina E sala non si apre proprio.
  if (perf.capacitaCoperti < 20) {
    respinti += serviti;
    serviti = 0;
    eventi.push("🚪 LOCALE CHIUSO: senza brigata non si apre. Zero incassi, ma affitto e contributi corrono lo stesso. Assumi subito.");
  }
  // burnout prolungato: il fisico può cedere — giorni a letto, locale a mezzo servizio
  if (s.titolare.burnout && s.titolare.mesiInBurnout >= EFFETTI_BURNOUT.mesiPrimaDelCrollo
      && rng() < EFFETTI_BURNOUT.probCrolloMensile) {
    const persi = Math.round(serviti * (1 - EFFETTI_BURNOUT.tagliaServiti));
    serviti = Math.round(serviti * EFFETTI_BURNOUT.tagliaServiti);
    s.compiti.ruoloCoperto = null; // il medico è categorico
    s.titolare.stress = Math.max(40, s.titolare.stress - 20); // riposo forzato
    eventi.push(`🏥 Il fisico ha ceduto: ${s.titolare.nome} a letto una settimana, locale a mezzo servizio (${persi} coperti persi). Il medico impone di mollare i turni operativi.`);
  }
  let oreStraordinarie = 0;
  if ((dec.politicaSovraccarico ?? "straordinari") === "straordinari" && respinti > 0 && lavoratori.length) {
    // si copre fino al 15% in più, pagando la maggiorazione
    const recuperabili = Math.min(respinti, Math.round(serviti * 0.15));
    if (recuperabili > 0) {
      serviti += recuperabili;
      respinti -= recuperabili;
      oreStraordinarie = recuperabili / 10; // ~10 coperti per ora di straordinario
      eventi.push(`⏱️ Straordinari per coprire ${recuperabili} coperti: la squadra regge, ma si stanca.`);
    }
  }
  // ── No-show: tavolo tenuto, personale convocato, nessuno che arriva.
  //    La caparra sui gruppi e le prenotazioni online li riducono.
  const cfgPren: ConfigPrenotazioni = {
    online: s.compiti.prenotazioni === "software",
    caparraGruppi: !!s.caparraGruppi,
    zona: (s.immobile as any)?.zona ?? "semicentro",
  };
  const presenze = presenzeEffettive(serviti, "cena", cfgPren, rng);
  const noShowCoperti = presenze.noShow;
  if (noShowCoperti > 0) serviti = Math.max(0, serviti - noShowCoperti);

  const ricaviLordi = serviti * r.scontrinoMedio;
  const ricaviPersiNoShow = noShowCoperti * r.scontrinoMedio;
  if (noShowCoperti > serviti * 0.03) {
    eventi.push(
      `🪑 ${noShowCoperti} coperti prenotati e mai presentati: ${Math.round(ricaviPersiNoShow)}€ persi ` +
      `con i tavoli tenuti e il personale in turno.` +
      (!cfgPren.online ? " Con le prenotazioni online se ne perderebbero meno." : "") +
      (!cfgPren.caparraGruppi ? " Una caparra sui gruppi taglierebbe il problema." : "")
    );
  }
  eventi.push(...r.eventi);
  if (respinti > serviti * 0.1) eventi.push(`🚪 ${respinti} clienti respinti: capienza o staff insufficienti`);
  if (perf.capacitaCoperti < 50) eventi.push(`⛔ Senza una brigata non si apre: assumi personale!`);

  // ── 3. Ispezione lavoro nero
  let sanzioni = 0;
  const irregolari = s.staff.filter((d) => !d.inRegola);
  if (irregolari.length > 0) {
    const p = cfg.lavoroNero.probIspezioneBase + cfg.lavoroNero.probPerIrregolare * irregolari.length;
    if (rng() < p) {
      for (const d of irregolari) {
        sanzioni += cfg.lavoroNero.sanzioneMin + rng() * (cfg.lavoroNero.sanzioneMax - cfg.lavoroNero.sanzioneMin);
        const lordoAnnuo = cfg.ccnlLordoMensile[d.ruolo] * d.superminimo * cfg.inps.dipendenti.mensilita;
        sanzioni += lordoAnnuo * (cfg.inps.dipendenti.aliquotaDatore + cfg.inps.dipendenti.inail);
        d.inRegola = true;
      }
      eventi.push(`🚨 Ispezione! ${irregolari.length} in nero scoperti: ${fmt(sanzioni)} tra sanzioni e recupero contributi. Regolarizzati d'ufficio.`);
    }
  }

  // ── 4. Gradimento, locale, morale, reputazione
  let moltStile = 1, nStile = 0;
  for (const d of s.staff as Array<DipendenteEsteso & { stile?: Stile; adattamentoStile?: number }>) {
    if (!d.stile) continue;
    if (d.adattamentoStile === undefined) d.adattamentoStile = 0;
    const ad = aggiornaAdattamento(d as Required<typeof d>, s.stileLocale);
    moltStile += ad.moltiplicatore; nStile++;
    if (ad.evento) eventi.push(`🎯 ${d.nome} ${ad.evento}.`);
  }
  // media dei moltiplicatori di adattamento: chi stona con lo stile del locale pesa
  const fattoreStile = nStile ? (moltStile - 1) / nStile : 1;

  const grad = gradimentoMese(perf, s.scelte, serviti);
  if (nServizi > 0) grad.voto *= moltGradServizi / nServizi;
  grad.voto = Math.max(0.05, Math.min(1, grad.voto * fattoreStile * (s.titolare.burnout ? moltGradimentoBurnout(s.titolare.mesiInBurnout) : 1)));
  eventi.push(...grad.eventi);
  eventi.push(...aggiornaLocale(s.scelte, serviti));
  // ── Adattamento allo stile del locale

  // ── Eventi personali: tratti, vizi, famiglia
  const eventiPersonali = eventiDipendenti(s.staff as any, rng);
  for (const ev of eventiPersonali) {
    eventi.push(ev.testo);
    const d = s.staff.find((x) => x.id === ev.dipendenteId);
    if (d && ev.effetti.moraleDelta) d.morale = Math.max(5, Math.min(95, d.morale + ev.effetti.moraleDelta));
    if (ev.effetti.moraleBrigata) for (const x of s.staff) x.morale = Math.max(5, Math.min(95, x.morale + ev.effetti.moraleBrigata));
    if (ev.effetti.reputazioneDelta) s.reputazione = Math.max(0.02, Math.min(0.98, s.reputazione + ev.effetti.reputazioneDelta));
    if (ev.effetti.costo) s.tesoreria.saldo -= ev.effetti.costo;
    if (ev.effetti.attributoUp && d) d.attributi[ev.effetti.attributoUp] = Math.min(20, d.attributi[ev.effetti.attributoUp] + 1);
  }

  const morale = aggiornaMorale(s.staff, {
    caricoLavoro: serviti / Math.max(1, perf.capacitaCoperti),
    riposoSettimanale: s.locale.giornoChiusura !== null,
  }, rng);
  eventi.push(...morale.eventi);
  for (const d of morale.dimissionari) liquidaTfrDi(s, d.id, d.inRegola, eventi);
  // ── Le vite dei dipendenti: crescita, maternità, costo della vita
  const idAumentati = new Set((dec.aumenti ?? []).map((a) => a.id));
  const carriere = dinamicheCarriera(s.staff as DipendenteConCarriera[], s.macroStato.inflazioneAnnua, idAumentati, rng);
  eventi.push(...carriere.eventi);
  for (const d of carriere.dimissionari) cessaRapporto(s, d.id, "dimissioni (richiesta ignorata)", eventi);
  (s as any).__inCongedo = carriere.inCongedo;

  const repUpd = aggiornaReputazione(s.reputazione, grad.voto, serviti, s.mkt);
  s.reputazione = Number.isFinite(repUpd.rep) ? repUpd.rep : 0.05;
  eventi.push(...repUpd.eventi);

  // ── 5. TFR di competenza del mese (per i regolari)
  for (const d of s.staff) {
    if (!d.inRegola) continue;
    const lordo = cfg.ccnlLordoMensile[d.ruolo] * d.superminimo * (s.mese === 7 || s.mese === 12 ? 2 : 1);
    s.tfrPerDipendente[d.id] = (s.tfrPerDipendente[d.id] ?? 0) + lordo * cfg.inps.dipendenti.tfr;
  }

  // ── 6. Tesoreria: cassa con scadenze reali
  // ── Effetti dei compiti del titolare
  const EC = EFFETTI_COMPITI;
  const deltaFoodCompiti = EC.approvvigionamento[s.compiti.approvvigionamento].costoFoodCost;
  const costiCompiti =
    (s.compiti.amministrazione === "delegata" ? EC.amministrazione.delegata.costoMese : 0) +
    (s.compiti.prenotazioni === "software" ? EC.prenotazioni.software.costoMese : 0) +
    (s.compiti.social === "delegato" ? EC.social.delegato.costoMese : 0);
  // il social fatto dal titolare a mezzanotte rende meno
  if (s.compiti.social === "titolare") {
    s.mkt.seguitoSocial *= 1; // lo stock resta; è l'efficacia della spesa a calare
  }

  // ── Stress e burnout del titolare
  const moraleMedio = s.staff.length ? s.staff.reduce((a, d) => a + d.morale, 0) / s.staff.length : 50;
  const esitoStress = aggiornaStress(s.titolare, {
    compiti: s.compiti,
    caricoLavoro: serviti / Math.max(1, perf.capacitaCoperti),
    cassaInRosso: s.tesoreria.saldo < 0,
    eventiPesanti: (sanzioni > 0 ? 1 : 0) + carriere.dimissionari.length,
    riposoSettimanale: s.locale.giornoChiusura !== null,
    haDirettore: s.staff.some((d) => d.ruolo === "direttore" && d.morale > 45),
    moraleMedioSquadra: moraleMedio,
  }, rng);
  eventi.push(...esitoStress.eventi);
  let costoErroriTitolare = esitoStress.costoErrori;
  if (s.titolare.burnout) {
    for (const d of s.staff) d.morale = Math.max(5, d.morale - EFFETTI_BURNOUT.malusMoraleSquadra);
    if (rng() < EFFETTI_BURNOUT.probErroreOperativo) {
      const c = EFFETTI_BURNOUT.costoErroreMin + Math.round(rng() * (EFFETTI_BURNOUT.costoErroreMax - EFFETTI_BURNOUT.costoErroreMin));
      costoErroriTitolare += c;
      eventi.push(`🥴 Ordine sbagliato al fornitore: merce da buttare, ${c}€.`);
    }
  }

  s.ristorante.dipendenti = s.staff.filter((d) => !idCongedo.has(d.id)); // in congedo paga (quasi tutto) l'INPS
  s.costiFissiBase *= 1 + inflazioneMensile(s.macroStato);
  s.ristorante.costiFissiMensili =
    s.costiFissiBase + s.mkt.spesaTradizionaleMese + s.mkt.spesaSocialMese +
    s.scelte.manutenzioneMese + (dec.ristrutturazione ?? 0);
  // ── Assenze: ferie che maturano, malattie che arrivano
  const esitoAssenze = aggiornaAssenze(
    s.staff as any, s.assenze,
    { mese: s.mese, caricoLavoro: serviti / Math.max(1, perf.capacitaCoperti) },
    { ...(dec.assenze ?? {}), pagaNeroInAssenza: s.politicheNero.pagaNeroInAssenza },
    rng,
  );
  eventi.push(...esitoAssenze.eventi);

  // ── Formazione: corsi in aula (ore sottratte) e autoformazione
  const esitoFormazione = avanzaFormazione(s.formazione, dec.corsi ?? [], s.staff, rng);
  eventi.push(...esitoFormazione.eventi);
  for (const [id, mig] of Object.entries(esitoFormazione.miglioramenti)) {
    const d = s.staff.find((x) => x.id === id);
    if (d) for (const [k, v] of Object.entries(mig)) {
      (d.attributi as any)[k] = Math.min(20, ((d.attributi as any)[k] ?? 10) + (v as number));
    }
  }
  const auto = autoformazione(s.staff as any, s.formazione, rng);
  eventi.push(...auto.eventi);
  for (const id of auto.siSonoFormati) {
    const d = s.staff.find((x) => x.id === id) as DipendenteConCarriera | undefined;
    if (d?.carriera) d.carriera.richiesta = {
      tipo: "crescita",
      superminimoRichiesto: Math.round((d.superminimo + 0.08) * 100) / 100,
      mesiResidui: 3,
    };
  }
  const obblighi = verificaObblighi(s.staff as any, s.formazione);

  // ── I cuochi imparano: dal mentore, dalla brigata, o perché glielo chiedi
  const ricetteImparate: ReportMese["ricetteImparate"] = [];
  const RUOLI_CUCINA_ID = new Set(["cuoco", "chef", "sous_chef", "commis", "pizzaiolo", "pasticcere"]);
  const cuochi = s.staff.filter((d: any) => RUOLI_CUCINA_ID.has(d.ruoloEsteso ?? d.ruolo)) as any[];
  const haMentore = s.staff.some((d: any) => (d.tratti ?? []).some((t: any) => t.id === "mentore"));
  const repBrigata = [...repertorioBrigata(cuochi)];

  // insegnamento richiesto dal giocatore
  for (const ins of dec.insegnaRicette ?? []) {
    const d = cuochi.find((x) => x.id === ins.idDipendente);
    if (!d) continue;
    d.repertorio ??= [];
    const esito = imparaRicetta(
      { eta: d.eta ?? 30, tecnica: d.attributi.tecnica, esperienza: d.attributi.esperienza,
        formazione: d.formazione ?? "gavetta", stile: d.stile ?? "trattoria_classica", repertorio: d.repertorio },
      ins.idRicetta, haMentore, rng,
    );
    eventi.push(`${esito.imparata ? "👨‍🍳" : "🥄"} ${d.nome}: ${esito.motivo}`);
    if (esito.imparata) {
      const nome = RICETTE_BASE.find((x) => x.id === ins.idRicetta)?.nome ?? ins.idRicetta;
      ricetteImparate.push({ nome: d.nome, piatto: nome });
    }
  }

  // apprendimento passivo: si impara guardando chi ti sta accanto
  for (const d of cuochi) {
    d.repertorio ??= [];
    if (rng() > (haMentore ? 0.22 : 0.09)) continue;
    // prima si impara dai colleghi; se sei solo in cucina, si prova da sé
    let candidate = repBrigata.filter((id) => !d.repertorio.includes(id));
    let daSolo = false;
    if (!candidate.length) {
      if (rng() > 0.45) continue; // provarci da soli riesce molto più di rado
      daSolo = true;
      candidate = RICETTE_BASE
        .filter((x) => !d.repertorio.includes(x.id) && x.difficolta <= d.attributi.tecnica)
        .map((x) => x.id);
    }
    if (!candidate.length) continue;
    const scelta = candidate[Math.floor(rng() * candidate.length)];
    const esito = imparaRicetta(
      { eta: d.eta ?? 30, tecnica: d.attributi.tecnica, esperienza: d.attributi.esperienza,
        formazione: d.formazione ?? "gavetta", stile: d.stile ?? "trattoria_classica", repertorio: d.repertorio },
      scelta, haMentore, rng,
    );
    if (esito.imparata) {
      const nome = RICETTE_BASE.find((x) => x.id === scelta)?.nome ?? scelta;
      ricetteImparate.push({ nome: d.nome, piatto: nome });
      eventi.push(`👨‍🍳 ${d.nome} ha imparato ${nome}${daSolo ? ", provandoci nei momenti morti" : " guardando la brigata"}.`);
    }
  }

  // ── Buste paga del mese (contratti.ts) e passaggio alla tesoreria
  const buste: ReportMese["buste"] = {};
  const busteTesoreria: Record<string, any> = {};
  for (const l of lavoratori) {
    if (l.id === "__titolare__") continue; // il titolare non ha busta
    const oreGriglia = oreMeseDaGriglia[l.id];
    const persoAssenze = esitoAssenze.quotaOrePerse[l.id] ?? 0;
    const oreAula = (esitoFormazione.oreSottratte[l.id] ?? 0) / ORARIO.settimanePerMese;
    // se la griglia è attiva, le ore le decide lei: il monte ore è un risultato
    const oreBase = oreGriglia !== undefined
      ? oreGriglia / ORARIO.settimanePerMese
      : oreSettimanali(l.orario);
    const oreReali = Math.max(0,
      oreBase * (1 - persoAssenze)
      - oreAula
      + oreStraordinarie / Math.max(1, lavoratori.length) / ORARIO.settimanePerMese);
    const b = bustaPaga(l, oreReali, cfg);
    buste[l.id] = {
      lordo: b.lordo, nettoInBusta: b.nettoInBusta, cashNero: b.cashNero,
      costoAzienda: b.costoAzienda, oreDichiarate: b.oreDichiarate, oreNonDichiarate: b.oreNonDichiarate,
    };
    busteTesoreria[l.id] = {
      lordo: b.lordo, nettoInBusta: b.nettoInBusta, contributiDipendente: b.contributiDipendente,
      cashNero: b.cashNero, ratei: b.ratei, costoAzienda: b.costoAzienda,
    };
  }

  // ── Conseguenze economiche delle assenze (e del fuori busta sospeso)
  let costoAssenzeMese = 0;
  for (const [id, giorni] of Object.entries(esitoAssenze.assenti)) {
    const d = s.staff.find((x) => x.id === id);
    const b = buste[id];
    if (!d || !b) continue;
    const ca = costoAssenza(
      d as any, giorni, b.lordo, b.cashNero,
      { pagaNeroInAssenza: s.politicheNero.pagaNeroInAssenza },
    );
    costoAssenzeMese += ca.costoAzienda;
    eventi.push(...ca.eventi);
    if (ca.perditaLavoratore > 0) {
      d.morale = Math.max(5, d.morale - malusMoralePerdita(ca.perditaLavoratore, b.lordo));
    }
  }

  // ── Registro dichiarato/reale: quanto di questo mese finisce nei libri
  const costoMaterie = (ricaviLordi / (1 + cfg.iva.somministrazione)) * s.ristorante.foodCostPct;
  const esitoNero = registraMese(s.nero, ricaviLordi, costoMaterie, s.politicheNero);
  eventi.push(...esitoNero.eventi);
  // il fuori busta si paga dal contante non dichiarato
  const totCashNero = Object.values(buste).reduce((a, b) => a + b.cashNero, 0);
  if (totCashNero > 0) {
    const { mancante } = prelevaContante(s.nero, totCashNero);
    if (mancante > 1) {
      eventi.push(`⚠️ Mancano ${Math.round(mancante)}€ di contante per pagare il fuori busta: la squadra se ne accorge.`);
      for (const d of s.staff) if (buste[d.id]?.cashNero > 0) d.morale = Math.max(5, d.morale - 8);
    }
  }

  // ── Affidabilità di tutta la squadra
  const sforamenti: Sforamento[] = [];
  const materieReali = (ricaviLordi / (1 + cfg.iva.somministrazione)) * s.ristorante.foodCostPct;
  const budgetTot = s.reparti.budgetCucina + s.reparti.budgetSala;

  // budget troppo stretto: la qualità cala
  if (budgetTot > 0) {
    const stretta = effettoBudgetStretto(budgetTot, materieReali);
    if (stretta.avviso) eventi.push(`💰 ${stretta.avviso}`);
    grad.voto = Math.max(0.05, grad.voto * stretta.moltGradimento);
    if (stretta.malusMorale > 0) {
      for (const id of [s.reparti.responsabileCucina, s.reparti.responsabileSala]) {
        const d = s.staff.find((x) => x.id === id);
        if (d) d.morale = Math.max(5, d.morale - stretta.malusMorale);
      }
    }
  }

  // sforamenti per reparto
  for (const rep of ["cucina", "sala"] as const) {
    const budget = rep === "cucina" ? s.reparti.budgetCucina : s.reparti.budgetSala;
    if (budget <= 0) continue;
    const quotaRep = rep === "cucina" ? 0.75 : 0.25; // la cucina assorbe il grosso
    const idResp = rep === "cucina" ? s.reparti.responsabileCucina : s.reparti.responsabileSala;
    const resp = s.staff.find((x) => x.id === idResp);
    const sf = valutaSforamento({
      reparto: rep, budget, spesoReale: materieReali * quotaRep,
      rapportoCoperti: r.copertiTotali > 0 ? serviti / r.copertiTotali : 1,
      inflazioneAlimentare: s.macroStato.inflazioneAlimentare,
      responsabile: resp as any,
      affidabilitaResponsabile: resp ? (s.reparti.affidabilita[resp.id] ?? 50) : 50,
    }, rng);
    if (sf && sf.quota > s.reparti.sogliaSegnalazione) {
      sforamenti.push(sf);
      eventi.push(
        `📦 Budget ${rep} sforato di ${Math.round(sf.eccesso)}€ (${Math.round(sf.quota * 100)}%)` +
        (sf.responsabileNome ? ` — ${sf.responsabileNome}` : "") +
        `. ${sf.spiegazione}` + (sf.segnalatoPrima ? " Ti aveva avvisato." : " Non ti aveva detto niente.")
      );
      if (sf.effettoGradimento) grad.voto = Math.min(1, grad.voto + sf.effettoGradimento);
    }
  }

  const nonSegnalati = new Set(sforamenti.filter((x) => !x.segnalatoPrima && x.responsabileId).map((x) => x.responsabileId!));
  eventi.push(...aggiornaAffidabilita(s.staff as any, s.reparti, {
    carico: serviti / Math.max(1, perf.capacitaCoperti),
    assenze: esitoAssenze.assenti,
    sforamentiNonSegnalati: nonSegnalati,
    burnoutTitolare: s.titolare.burnout,
  }, rng));

  // ── Vincoli della griglia: 11 ore, riposo settimanale, straordinari
  const vincoli = verificaVincoli(s.griglia, s.staff.map((d: any) => ({ id: d.id, nome: d.nome, resistenza: d.attributi.resistenza })));
  for (const v of vincoli.violazioni.filter((x) => x.bloccante).slice(0, 2)) {
    eventi.push(`⚖️ ${v.messaggio}`);
  }
  for (const d of s.staff as any[]) {
    const aff = affaticamento(vincoli.spezzati[d.id] ?? 0, d.attributi.resistenza);
    if (aff > 0) d.morale = Math.max(5, d.morale - aff * 0.5);
  }

  // ── CONTROLLI: NAS, Finanza, Ispettorato
  const infortunio = (serviti / Math.max(1, perf.capacitaCoperti)) > 1.25 && rng() < 0.05;
  if (infortunio) eventi.push("🚑 Infortunio sul lavoro: qualcuno si è fatto male nella confusione del servizio.");
  const ctxControlli = {
    mese: s.mese,
    rischioFiscale: rischioFiscale(s.nero, esitoNero.incoerenza, s.staff.filter((d) => !d.inRegola).length),
    gravitaFormazione: gravitaObblighi(obblighi),
    condizioneLocale: s.scelte.condizioneLocale,
    manutenzione: s.scelte.manutenzioneMese,
    irregolari: s.staff.filter((d) => !d.inRegola).length,
    totaleLavoratori: s.staff.length,
    uscitaConflittuale: morale.dimissionari.length > 0 || (dec.licenziamenti ?? []).length > 0,
    infortunio,
    moraleMedio: moraleMedio,
    affidabilitaCommercialista: s.commercialista.affidabilita,
    personeCheSanno: (s.reparti.responsabileCucina ? 1 : 0) + (s.reparti.responsabileSala ? 1 : 0),
    ricaviNonDichiaratiAnno: s.nero.ricaviNonDichiarati,
  };
  const prontezza = calcolaProntezza(ctxControlli);
  let ispezione: ReportMese["ispezione"];
  let sanzioniControlli = 0;
  for (const ente of ["nas", "finanza", "ispettorato"] as Ente[]) {
    if (rng() >= probabilitaControllo(ente, ctxControlli, prontezza, s.controlli.attenzioneResidua)) continue;
    const esito = eseguiControllo(ente, ctxControlli, prontezza, s.controlli, rng);
    eventi.push(...esito.eventi);
    const { esceSubito } = applicaEsito(s.controlli, esito);
    sanzioniControlli += esceSubito;
    s.reputazione = Math.max(0.02, s.reputazione - esito.dannoReputazione);
    if (esito.trovato.length) {
      ispezione = {
        ente: esito.ente, titolo: esito.titolo, trovato: esito.trovato,
        sanzione: esito.sanzione, sospensioneGiorni: esito.sospensioneGiorni,
        durcIrregolareMesi: esito.durcIrregolareMesi,
      };
      // regolarizzazione forzata dopo l'ispezione sul lavoro
      if (ente === "ispettorato") for (const d of s.staff) d.inRegola = true;
    }
    break; // un controllo per mese: il secondo arriva col meccanismo della cascata
  }
  // accesso di routine: capita a tutti, anche a chi è in ordine
  const routine = accessoRoutine(s.controlli, prontezza, rng);
  eventi.push(...routine.eventi);
  sanzioniControlli += routine.sanzioneFormale;

  // se la Finanza trova scontrini non emessi, scatta il contatore quinquennale
  if (ispezione && ispezione.ente === "finanza" && s.nero.ricaviNonDichiarati > 0) {
    const ivaEvasa = (s.nero.ricaviNonDichiarati / (1 + cfg.iva.somministrazione)) * cfg.iva.somministrazione;
    const sanzioneCorr = Math.max(SANZIONI.minimoCorrispettivi, ivaEvasa * SANZIONI.quotaCorrispettivi);
    sanzioniControlli += sanzioneCorr;
    eventi.push(`🧾 Corrispettivi non memorizzati: ${Math.round(sanzioneCorr).toLocaleString("it-IT")}€ ` +
      `(70% dell'IVA, minimo 300€ a violazione).`);
    const viol = registraViolazioneCorrispettivi(s.controlli, (s.annoGioco - 1) * 12 + s.mese, s.nero.ricaviNonDichiarati);
    eventi.push(...viol.eventi);
    s.controlli.sospensioneGiorni += viol.sospensioneGiorni;
  }

  const esitoDurc = aggiornaDurc(s.controlli, s.tesoreria.saldo, s.tesoreria.f24MeseSuccessivo);
  eventi.push(...esitoDurc.eventi);

  const avanz = avanzaControlli(s.controlli);
  eventi.push(...avanz.eventi);

  if (oreSprecateMese > 6) {
    eventi.push(`⏳ ${Math.round(oreSprecateMese)} ore pagate senza servizio questo mese: la brigata arriva troppo presto.`);
  }

  const foodCostSalvato = s.ristorante.foodCostPct;
  s.ristorante.foodCostPct = Math.max(0.15, Math.min(0.75, s.ristorante.foodCostPct + deltaFoodCompiti));
  tickCassa(s.ristorante, s.tesoreria, { anno: s.annoGioco, mese: s.mese, ricaviLordi: esitoNero.incassoDichiarato, costoMaterieDichiarato: esitoNero.acquistoDichiarato, sanzioni: sanzioni + costoErroriTitolare + costiCompiti + costoAssenzeMese + esitoFormazione.costo + sanzioniControlli + avanz.rataMese, buste: busteTesoreria }, cfg);
  s.ristorante.foodCostPct = foodCostSalvato;
  // quota ridotta per chi è in congedo: l'azienda paga ~25%
  for (const d of s.staff.filter((x) => idCongedo.has(x.id) && x.inRegola)) {
    const lordo = cfg.ccnlLordoMensile[d.ruolo] * d.superminimo;
    s.tesoreria.saldo -= lordo * QUOTA_COSTO_CONGEDO;
  }

  // ── 7. Accumulo fiscale di competenza
  const forfait = s.ristorante.forma === "ditta_forfettaria";
  const ricaviFiscali = forfait
    ? esitoNero.incassoDichiarato
    : esitoNero.incassoDichiarato / (1 + cfg.iva.somministrazione);
  s.fiscale.ricavi += ricaviFiscali;
  s.fiscale.costiDeducibili +=
    ricaviFiscali * s.ristorante.foodCostPct + s.ristorante.costiFissiMensili +
    s.staff.reduce((sum, d) => {
      const lordo = cfg.ccnlLordoMensile[d.ruolo] * d.superminimo * (s.mese === 7 || s.mese === 12 ? 2 : 1);
      return sum + (d.inRegola
        ? lordo * (1 + cfg.inps.dipendenti.aliquotaDatore + cfg.inps.dipendenti.inail + cfg.inps.dipendenti.tfr)
        : 0); // il nero non è deducibile: costa cassa ma non abbatte le tasse
    }, 0);

  // ── 8. Fine contratti stagionali
  for (const d of [...s.staff] as Array<DipendenteEsteso & { stagionaleFinoAlMese?: number }>) {
    if (d.stagionaleFinoAlMese === s.mese) cessaRapporto(s, d.id, "fine contratto stagionale", eventi);
  }

  // ── 9. Dicembre: chiusura d'anno
  let chiusuraAnno: string[] | undefined;
  if (s.mese === 12) {
    const amm = s.commercialista.costoAnnuo + cfg.amministrazione.ccIaaAnnuale;
    s.tesoreria.saldo -= amm;
    s.fiscale.costiDeducibili += amm;
    const ch = chiusuraAnnuale(s.ristorante, s.fiscale.ricavi, s.fiscale.costiDeducibili, cfg);
    registraChiusura(s.tesoreria, ch, cfg);
    chiusuraAnno = [
      `Ricavi ${fmt(ch.ricaviNettiAnnui)}, utile ante imposte ${fmt(ch.utileAnteImposte)}`,
      ...ch.dettaglio,
      `Imposte ${fmt(ch.imposte)}${ch.contributiTitolare ? `, contributi titolare ${fmt(ch.contributiTitolare)}` : ""} → in scadenza a giugno/novembre`,
      `Utile netto ${fmt(ch.utileNetto)}`,
    ];
    s.fiscale = { ricavi: 0, costiDeducibili: 0 };
    chiudiAnnoNero(s.nero);
    s.nuoveAssunzioniAnno = 0;
    s.ristorante.annoAttivita++;
    s.annoGioco++;
    s.annoCalendario++;
  }

  // ── 10. Game over?
  if (s.tesoreria.insolvente) {
    s.gameOver = true;
    s.motivoGameOver = "Insolvenza: fido bancario sforato";
    eventi.push("💀 GAME OVER — la banca chiude i rubinetti.");
  }

  // ── Casella CV: i candidati non richiamati trovano altro, poi arrivano
  //    le candidature nuove (spontanee + risposte agli annunci pubblicati)
  const scaduti = scadenzaCandidature(s.mercato ?? [], rng);
  if (scaduti.persi > 0) {
    eventi.push(`📪 ${scaduti.persi} candidat${scaduti.persi === 1 ? "o ha" : "i hanno"} trovato altrove: le candidature non aspettano.`);
  }
  const raccolta = raccogliCandidature(s.reputazione, s.mese, dec.annunci ?? [], rng);
  eventi.push(...raccolta.eventi);
  s.mercato = [...scaduti.restano, ...raccolta.cv];
  if (raccolta.costo > 0) s.tesoreria.saldo -= raccolta.costo;

  const quotaServita = r.copertiTotali > 0 ? serviti / r.copertiTotali : 0;
  const giorniReport = r.giorni.map((g) => {
    const servitiG = Math.round(g.copertiDomanda * quotaServita);
    return { ...g, copertiServitiGiorno: servitiG, ricaviGiorno: servitiG * r.scontrinoMedio };
  });

  // ── BANDI: eleggibilità, domande presentate, istruttoria, erogazione
  const investimento = Math.max(0, dec.investimentoDichiarato ?? (dec.ristrutturazione ?? 0));
  const profiloBandi: ProfiloRichiedente = {
    etaTitolare: s.titolare.eta,
    titolareFemminile: s.titolare.sesso === "F",
    anniAttivita: s.ristorante.annoAttivita - 1,
    formaGiuridica: s.ristorante.forma,
    ricaviUltimoAnno: s.fiscale.ricavi,
    dipendentiRegolari: s.staff.filter((d) => d.inRegola).length,
    nuoveAssunzioniAnno: s.nuoveAssunzioniAnno,
    zona: (s.immobile as any)?.zona ?? "",
    regione: "Emilia-Romagna",
    investimentoPrevisto: investimento,
    investimentoDocumentato: s.investimentoDocumentato,
    haAccessibilita: (s.scelte.servizi ?? []).includes("accessibilita" as any),
    usaFilieraCorta: s.scelte.qualitaMaterie === "premium",
    haSanzioniLavoro: s.controlli.durcIrregolare,
  };
  const catalogoBandi: Bando[] = (s as any).__catalogoBandi ?? CATALOGO_ESEMPIO;
  const eleggibili = bandiDisponibili(catalogoBandi, profiloBandi, s.mese);

  // il DURC irregolare chiude la porta a tutto
  let costoDomande = 0;
  for (const idBando of dec.domandeBandi ?? []) {
    if (s.controlli.durcIrregolare) {
      eventi.push("🚫 Domanda non presentabile: con il DURC irregolare sei escluso da bandi e sgravi.");
      break;
    }
    const e = eleggibili.find((x) => x.bando.id === idBando);
    if (!e) { eventi.push("⚠️ Bando non aperto questo mese."); continue; }
    if (s.domandeBandi.some((d) => d.bandoId === idBando && d.stato === "in_istruttoria")) {
      eventi.push(`⚠️ Hai già una domanda in istruttoria per "${e.bando.titolo}".`);
      continue;
    }
    const res = presentaDomanda(e, s.annoGioco, s.mese, `dom-${s.annoGioco}-${s.mese}-${idBando}`);
    if ("errore" in res) { eventi.push(`❌ ${res.errore}`); continue; }
    // lo studio strutturato prepara domande migliori
    res.domanda.contributoRichiesto = Math.round(res.domanda.contributoRichiesto);
    res.domanda.importoRata = res.domanda.contributoRichiesto / Math.max(1, res.domanda.rateResidue);
    s.domandeBandi.push(res.domanda);
    costoDomande += res.costo;
    eventi.push(`📨 Domanda presentata per "${e.bando.titolo}": consulenza ${Math.round(res.costo)}€, ` +
      `contributo richiesto ${Math.round(res.domanda.contributoRichiesto).toLocaleString("it-IT")}€. ` +
      `Istruttoria ${e.bando.mesiIstruttoria} mesi.`);
  }

  const meseAssoluto = (s.annoGioco - 1) * 12 + s.mese;
  const esitoBandi = avanzaDomande(
    s.domandeBandi, catalogoBandi,
    (d) => meseAssoluto - ((d.presentataAnno - 1) * 12 + d.presentataMese),
    // il commercialista bravo alza le probabilità: sposto la soglia del dado
    () => Math.max(0, rng() / Math.max(0.5, s.commercialista.bonusBandi)),
  );
  eventi.push(...esitoBandi.eventi);
  if (costoDomande > 0) s.tesoreria.saldo -= costoDomande;
  if (esitoBandi.incasso > 0) s.tesoreria.saldo += esitoBandi.incasso;
  s.domandeBandi = s.domandeBandi.filter((d) => d.stato !== "respinta" || meseAssoluto - ((d.presentataAnno - 1) * 12 + d.presentataMese) < 3);

  // ── Cruscotto del commercialista: proietta le scadenze e avvisa
  const costoPersonaleMese = Object.values(buste).reduce((a, b) => a + b.costoAzienda, 0);
  const cruscotto = {
    mese: s.mese,
    forma: s.ristorante.forma,
    f24MeseSuccessivo: s.tesoreria.f24MeseSuccessivo,
    ivaTrimestre: s.tesoreria.ivaTrimestre,
    saldoImposte: s.tesoreria.saldoImposte,
    baseAcconti: s.tesoreria.baseAcconti,
    saldoContributi: s.tesoreria.saldoContributi,
    baseAccontiContributi: s.tesoreria.baseAccontiContributi,
    tfrMaturato: s.tesoreria.tfrMaturato,
    cassa: s.tesoreria.saldo,
    fidoMax: s.tesoreria.fidoMax,
    costoPersonaleMese,
    rateSanzioniMese: avanz.rataMese,
    affidabilitaCommercialista: s.commercialista.affidabilita,
    bonusBandi: s.commercialista.bonusBandi,
    durcIrregolare: s.controlli.durcIrregolare,
    obblighiFormativiMancanti: obblighi.length,
    foodCostAttuale: s.ristorante.foodCostPct,
    quotaNeraAnno: s.nero.ricaviDichiarati + s.nero.ricaviNonDichiarati > 0
      ? s.nero.ricaviNonDichiarati / (s.nero.ricaviDichiarati + s.nero.ricaviNonDichiarati) : 0,
    rischioFiscale: rischioFiscale(s.nero, esitoNero.incoerenza, s.staff.filter((d) => !d.inRegola).length),
    ferieMaturateGiorni: Object.values(s.assenze.ferieMaturate ?? {}).reduce((a, v) => a + v, 0),
  };
  const scadenze = previsioniScadenze(cruscotto, cfg, 4);
  const consigli = consigliCommercialista(cruscotto, scadenze);
  for (const c of consigli) {
    if (c.gravita === "allarme") eventi.push(`🧮 Il commercialista: ${c.testo}`);
  }

  const report: ReportMese = {
    annoGioco: s.mese === 12 ? s.annoGioco - 1 : s.annoGioco,
    mese: s.mese,
    giorni: giorniReport,
    copertiDomanda: r.copertiTotali,
    copertiServiti: serviti,
    clientiRespinti: respinti,
    ricaviLordi,
    gradimento: grad.voto,
    reputazione: s.reputazione,
    cassa: s.tesoreria.saldo,
    tfrTotale: s.tesoreria.tfrMaturato,
    seguitoSocial: Math.round(s.mkt.seguitoSocial),
    staff: s.staff.map((d) => ({ id: d.id, nome: d.nome, ruolo: d.ruolo, morale: Math.round(d.morale), inRegola: d.inRegola })),
    eventi,
    eventiPersonali,
    mercato: s.mercato,
    esitiOfferte,
    chiusuraAnno,
    gameOver: s.gameOver,
    bandi: eleggibili.map((e) => ({
      id: e.bando.id, titolo: e.bando.titolo, ente: e.bando.ente,
      ammissibile: e.ammissibile, motiviEsclusione: e.motiviEsclusione,
      contributoStimato: e.contributoStimato, costoConsulenza: e.bando.costoConsulenza,
    })),
    domandeBandi: s.domandeBandi,
    settimana: settimanaDaPianificare(
      r.giorni.map((g) => ({ giorno: g.giorno, dow: g.dow, copertiDomanda: g.copertiDomanda, chiuso: g.chiuso, festivita: g.festivita, maltempo: g.maltempo })),
      0, // dal client si ripassa il giorno in cui si è messo in pausa
      QUOTA_PRANZO[s.locale.tipoLocalita] ?? 0.4,
      {
        online: s.compiti.prenotazioni === "software",
        caparraGruppi: !!s.caparraGruppi,
        zona: (s.immobile as any)?.zona ?? "semicentro",
      },
      rng,
    ),
    violazioniTurni: vincoli.violazioni,
    oreSettimanali: vincoli.oreSettimanali,
    serviziProblematici,
    scadenze,
    usciteProiettate: usciteProiettate(scadenze, 4),
    consigli,
    noShow: { coperti: noShowCoperti, ricaviPersi: ricaviPersiNoShow },
    chiamate,
    ricetteImparate,
    eventiCalendario: s.eventiLocali,
    sforamenti,
    ispezione,
    affidabilita: { ...s.reparti.affidabilita },
    durcIrregolare: s.controlli.durcIrregolare,
    nero: {
      cassaNera: s.nero.cassaNera,
      quotaNeraAnno: s.nero.ricaviDichiarati + s.nero.ricaviNonDichiarati > 0
        ? s.nero.ricaviNonDichiarati / (s.nero.ricaviDichiarati + s.nero.ricaviNonDichiarati) : 0,
      incoerenza: esitoNero.incoerenza,
      rischio: rischioFiscale(s.nero, esitoNero.incoerenza, s.staff.filter((d) => !d.inRegola).length)
        + gravitaObblighi(obblighi) * 0.2,
    },
    assenze: esitoAssenze.assenti,
    obblighiFormativi: obblighi.map((o) => ({
      nome: o.corso.nome, mancanti: o.mancanti, scaduto: o.scaduto,
      costoTotale: o.costoTotale, oreTotali: o.oreTotali,
    })),
    buste,
    // capacitaSquadra ragiona a settimana: converto la domanda mensile
    fabbisogno: fabbisogno(lavoratori, Math.round(r.copertiTotali / ORARIO.settimanePerMese)),
    titolare: {
      nome: s.titolare.nome, eta: s.titolare.eta, sesso: s.titolare.sesso,
      stress: Math.round(s.titolare.stress), burnout: s.titolare.burnout,
      compiti: s.compiti,
    },
    macro: {
      inflazione: s.macroStato.inflazioneAnnua,
      inflazioneAlimentare: s.macroStato.inflazioneAlimentare,
      fiducia: s.macroStato.fiduciaConsumatori,
      salari: s.macroStato.crescitaSalariAnnua,
      shock: s.macroStato.shockAttivo?.nome,
    },
  };

  s.mese = s.mese === 12 ? 1 : s.mese + 1;
  return report;
}

// ─────────────────────────────────────────────── Helpers

function cessaRapporto(s: StatoPartita, id: string, motivo: string, eventi: string[]) {
  const i = s.staff.findIndex((d) => d.id === id);
  if (i < 0) return;
  const d = s.staff[i];
  s.staff.splice(i, 1);
  eventi.push(`👋 ${d.nome} (${d.ruolo}): ${motivo}`);
  liquidaTfrDi(s, id, d.inRegola, eventi);
}

function liquidaTfrDi(s: StatoPartita, id: string, eraInRegola: boolean, eventi: string[]) {
  const quota = s.tfrPerDipendente[id] ?? 0;
  delete s.tfrPerDipendente[id];
  if (eraInRegola && quota > 0) {
    liquidaTfr(s.tesoreria, s.annoGioco, s.mese, quota);
    eventi.push(`💰 Liquidato TFR: ${fmt(quota)}`);
  }
}

function ammCommercialista(forma: FormaGiuridica, cfg: FiscalConfig): number {
  return forma === "ditta_forfettaria"
    ? cfg.amministrazione.commercialistaForfettario
    : forma === "ditta_ordinaria"
      ? cfg.amministrazione.commercialistaOrdinario
      : cfg.amministrazione.commercialistaSrl;
}