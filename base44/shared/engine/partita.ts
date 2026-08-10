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
import { Ricetta, analizzaMenu } from "./ricette.ts";
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
  Candidato, Offerta, EsitoOfferta, Stile, RuoloEsteso,
  generaMercato, valutaOfferta, assumi as assumiCandidato,
  aggiornaAdattamento, eventiDipendenti, EventoDipendente,
} from "./mercato.ts";
import {
  CATALOGO_ESEMPIO, Bando, Domanda, ProfiloRichiedente,
  verificaEleggibilita, presentaDomanda, avanzaDomande,
} from "./bandi.ts";

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
  /** candidati disponibili questo mese (rigenerati a ogni turno) */
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
  /** pratiche di agevolazione in corso (bandi) */
  domande: Domanda[];
  /** assunzioni regolari effettuate nell'anno in corso (per bandi occupazione) */
  nuoveAssunzioniAnno: number;
  /** flag: sanzioni per lavoro irregolare subite (preclude alcuni bandi) */
  haAvutoSanzioniLavoro: boolean;
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
  /** assunzioni dal mercato: offerte fatte ai candidati visibili */
  offerte?: Offerta[];
  /** assunzioni dirette (debug/scenari): saltano il mercato */
  assunzioni?: NuovaAssunzione[];
  licenziamenti?: string[]; // id dipendenti
  aumenti?: Array<{ id: string; superminimo: number }>;
  /** spesa una tantum: +1 punto condizione locale ogni 250€ */
  ristrutturazione?: number;
  /** come il titolare organizza i compiti (delega vs fai-da-te) */
  compiti?: Partial<GestioneCompiti>;
  /** nuovo menu (ricette + prezzi di vendita decisi dal giocatore) */
  menu?: Ricetta[];
  /** domande di agevolazione da presentare questo mese (bandoId + investimento) */
  domande?: Array<{ bandoId: string; investimentoPrevisto: number }>;
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
  locale: ProfiloLocale;
  costiFissiMensili: number;
  macro: ContestoMacro;
  annoCalendario: number; // es. 2026
  seed: number;
  stileLocale?: Stile;
  /** fotografia Istat scattata alla creazione della partita */
  datiIstat?: DatiPartenza;
  titolare?: { nome: string; eta: number; sesso: Sesso };
  staffIniziale?: NuovaAssunzione[];
}

export function nuovaPartita(c: ConfigNuovaPartita, cfg: FiscalConfig = FISCAL_2026): StatoPartita {
  const { ristorante } = costituisci(c.nomeRistorante, c.forma, c.budgetIniziale, cfg);
  const rng = mulberry32(c.seed);
  const staff = (c.staffIniziale ?? []).map((a, i) =>
    nuovoDipendente(`d${i + 1}`, a.nome, a.ruolo, a.livello, a.superminimo, a.inRegola, rng)
  );
  return {
    seed: c.seed,
    contatoreRng: 1,
    annoGioco: 1,
    annoCalendario: c.annoCalendario,
    mese: 1,
    ristorante,
    locale: c.locale,
    staff,
    stileLocale: c.stileLocale ?? "trattoria_classica",
    mercato: generaMercato(1, { pressioneStagionale: 1 }, rng, 5),
    macroStato: inizializzaMacro(c.datiIstat ?? {
      inflazioneAnnua: 0.018, inflazioneAlimentare: 0.022,
      fiduciaConsumatori: 0.98, crescitaSalariAnnua: 0.012,
      fonte: "fallback", aggiornatoAl: "n/d",
    }),
    foodCostBase: 0.32,
    titolare: nuovoTitolare(c.titolare?.nome ?? "Il Titolare", c.titolare?.eta ?? 35, c.titolare?.sesso ?? "M"),
    compiti: { ...COMPITI_DEFAULT },
    domande: [],
    nuoveAssunzioniAnno: 0,
    haAvutoSanzioniLavoro: false,
    tfrPerDipendente: {},
    mkt: { spesaTradizionaleMese: 0, spesaSocialMese: 0, seguitoSocial: 0 },
    scelte: { qualitaMaterie: "standard", condizioneLocale: 70, manutenzioneMese: 0, servizi: [] },
    menu: [],
    macro: c.macro,
    reputazione: 0.35, // si parte sconosciuti
    tesoreria: nuovaTesoreria(ristorante.cassa, cfg),
    costiFissiBase: c.costiFissiMensili,
    fiscale: { ricavi: 0, costiDeducibili: 0 },
    gameOver: false,
  };
}

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
    if (a.inRegola) s.nuoveAssunzioniAnno++;
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
    s.scelte.condizioneLocale = Math.min(100, s.scelte.condizioneLocale + dec.ristrutturazione / 250);
    eventi.push(`🔨 Ristrutturazione: ${fmt(dec.ristrutturazione)} → locale a ${Math.round(s.scelte.condizioneLocale)}/100`);
  }

  // ── Bandi: presentazione domande di agevolazione
  for (const dom of dec.domande ?? []) {
    const b = CATALOGO_ESEMPIO.find((x) => x.id === dom.bandoId);
    if (!b) { eventi.push(`⚠️ Bando non trovato.`); continue; }
    if (s.domande.some((d) => d.bandoId === b.id && d.stato !== "respinta")) { eventi.push(`⚠️ Hai già una domanda per "${b.titolo}".`); continue; }
    const profilo = profiloRichiedente(s, dom.investimentoPrevisto);
    const e = verificaEleggibilita(b, profilo);
    if (!e.ammissibile) { eventi.push(`❌ Bando "${b.titolo}" non ammissibile: ${e.motiviEsclusione[0] ?? "requisiti non soddisfatti"}.`); continue; }
    const r = presentaDomanda(e, s.annoGioco, s.mese, `dom-${s.contatoreRng}-${b.id}`);
    if ("errore" in r) { eventi.push(`❌ ${r.errore}`); continue; }
    s.domande.push(r.domanda);
    s.tesoreria.saldo -= r.costo;
    eventi.push(`📨 Domanda presentata: "${b.titolo}" — consulenza ${fmt(r.costo)}, esito in ${b.mesiIstruttoria} mesi.`);
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
  const r = generaRicaviMese(s.locale, s.mkt, s.macro, cfg, s.annoCalendario, s.annoGioco, s.mese, s.reputazione, rng);
  // il titolare che copre un ruolo conta come un membro della squadra
  const squadraOperativa = s.compiti.ruoloCoperto
    ? [...s.staff, titolareComeDipendente(s.titolare, s.compiti.ruoloCoperto)]
    : s.staff;
  // chi è in congedo non è operativo
  const idCongedo = new Set(((s as any).__inCongedo as string[]) ?? []);
  const perf = performanceStaff(squadraOperativa.filter((d) => !idCongedo.has(d.id)));
  perf.cucina = Math.min(1, perf.cucina * fattoreEsecuzione); // il menu giusto (o sbagliato) per la brigata
  let { serviti, respinti } = serviCoperti(r.copertiTotali, perf);
  // burnout prolungato: il fisico può cedere — giorni a letto, locale a mezzo servizio
  if (s.titolare.burnout && s.titolare.mesiInBurnout >= EFFETTI_BURNOUT.mesiPrimaDelCrollo
      && rng() < EFFETTI_BURNOUT.probCrolloMensile) {
    const persi = Math.round(serviti * (1 - EFFETTI_BURNOUT.tagliaServiti));
    serviti = Math.round(serviti * EFFETTI_BURNOUT.tagliaServiti);
    s.compiti.ruoloCoperto = null; // il medico è categorico
    s.titolare.stress = Math.max(40, s.titolare.stress - 20); // riposo forzato
    eventi.push(`🏥 Il fisico ha ceduto: ${s.titolare.nome} a letto una settimana, locale a mezzo servizio (${persi} coperti persi). Il medico impone di mollare i turni operativi.`);
  }
  const ricaviLordi = serviti * r.scontrinoMedio;
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
      s.haAvutoSanzioniLavoro = true;
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
    caricoLavoro: serviti / perf.capacitaCoperti,
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
  s.reputazione = repUpd.rep;
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
  const foodCostSalvato = s.ristorante.foodCostPct;
  s.ristorante.foodCostPct = Math.max(0.15, Math.min(0.75, s.ristorante.foodCostPct + deltaFoodCompiti));
  tickCassa(s.ristorante, s.tesoreria, { anno: s.annoGioco, mese: s.mese, ricaviLordi, sanzioni: sanzioni + costoErroriTitolare + costiCompiti }, cfg);
  s.ristorante.foodCostPct = foodCostSalvato;

  // ── Bandi: istruttorie chiuse e rate erogate
  const mesiDaDomanda = (d: Domanda) => (s.annoGioco - d.presentataAnno) * 12 + (s.mese - d.presentataMese);
  const esitoBandi = avanzaDomande(s.domande, CATALOGO_ESEMPIO, mesiDaDomanda, rng);
  s.tesoreria.saldo += esitoBandi.incasso;
  eventi.push(...esitoBandi.eventi);

  // quota ridotta per chi è in congedo: l'azienda paga ~25%
  for (const d of s.staff.filter((x) => idCongedo.has(x.id) && x.inRegola)) {
    const lordo = cfg.ccnlLordoMensile[d.ruolo] * d.superminimo;
    s.tesoreria.saldo -= lordo * QUOTA_COSTO_CONGEDO;
  }

  // ── 7. Accumulo fiscale di competenza
  const forfait = s.ristorante.forma === "ditta_forfettaria";
  const ricaviFiscali = forfait ? ricaviLordi : ricaviLordi / (1 + cfg.iva.somministrazione);
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
    const amm = ammCommercialista(s.ristorante.forma, cfg) + cfg.amministrazione.ccIaaAnnuale;
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
    s.ristorante.annoAttivita++;
    s.annoGioco++;
    s.annoCalendario++;
    s.nuoveAssunzioniAnno = 0;
  }

  // ── 10. Game over?
  if (s.tesoreria.insolvente) {
    s.gameOver = true;
    s.motivoGameOver = "Insolvenza: fido bancario sforato";
    eventi.push("💀 GAME OVER — la banca chiude i rubinetti.");
  }

  // ── Nuovo bacino di candidati per il mese prossimo
  const altaStagione = s.mese >= 5 && s.mese <= 8;
  s.mercato = generaMercato(s.mese, {
    qualitaBacino: altaStagione ? 0.7 : 1.1,
    pressioneStagionale: altaStagione ? 1.3 : 1,
  }, rng, altaStagione ? 3 : 6);

  const quotaServita = r.copertiTotali > 0 ? serviti / r.copertiTotali : 0;
  const giorniReport = r.giorni.map((g) => {
    const servitiG = Math.round(g.copertiDomanda * quotaServita);
    return { ...g, copertiServitiGiorno: servitiG, ricaviGiorno: servitiG * r.scontrinoMedio };
  });

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

function profiloRichiedente(s: StatoPartita, investimentoPrevisto: number): ProfiloRichiedente {
  const ricavi = s.fiscale.ricavi > 0 ? s.fiscale.ricavi * (12 / Math.max(1, s.mese)) : 0;
  return {
    etaTitolare: s.titolare.eta,
    titolareFemminile: s.titolare.sesso === "F",
    anniAttivita: s.ristorante.annoAttivita,
    formaGiuridica: s.ristorante.forma,
    ricaviUltimoAnno: ricavi,
    dipendentiRegolari: s.staff.filter((d) => d.inRegola).length,
    nuoveAssunzioniAnno: s.nuoveAssunzioniAnno,
    zona: (s.locale as any).tipoLocalita ?? "",
    regione: "Emilia-Romagna",
    investimentoPrevisto,
    haAccessibilita: false,
    usaFilieraCorta: false,
    haSanzioniLavoro: s.haAvutoSanzioniLavoro,
  };
}

function ammCommercialista(forma: FormaGiuridica, cfg: FiscalConfig): number {
  return forma === "ditta_forfettaria"
    ? cfg.amministrazione.commercialistaForfettario
    : forma === "ditta_ordinaria"
      ? cfg.amministrazione.commercialistaOrdinario
      : cfg.amministrazione.commercialistaSrl;
}