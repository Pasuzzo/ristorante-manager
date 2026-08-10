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
import { generaRicaviMese, ProfiloLocale, StatoMarketing, ContestoMacro } from "./ricavi.ts";
import {
  DipendenteEsteso, nuovoDipendente, performanceStaff, serviCoperti,
  aggiornaMorale, gradimentoMese, aggiornaReputazione, aggiornaLocale,
  ScelteGestione, QualitaMaterie, Servizio, FOOD_COST,
} from "./reputazione.ts";
import { Ricetta, analizzaMenu } from "./ricette.ts";

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
  /** TFR maturato per dipendente (per liquidarlo a fine rapporto) */
  tfrPerDipendente: Record<string, number>;
  mkt: StatoMarketing;
  scelte: ScelteGestione;
  /** il menu del ristorante: se presente, food cost e scontrino vengono dalle ricette */
  menu: Ricetta[];
  macro: ContestoMacro;
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
  assunzioni?: NuovaAssunzione[];
  licenziamenti?: string[]; // id dipendenti
  aumenti?: Array<{ id: string; superminimo: number }>;
  /** spesa una tantum: +1 punto condizione locale ogni 250€ */
  ristrutturazione?: number;
  /** nuovo menu (ricette + prezzi di vendita decisi dal giocatore) */
  menu?: Ricetta[];
}

export interface ReportMese {
  annoGioco: number;
  mese: number;
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
  chiusuraAnno?: string[];
  gameOver: boolean;
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
    s.ristorante.foodCostPct = FOOD_COST[s.scelte.qualitaMaterie];
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
    s.scelte.condizioneLocale = Math.min(100, s.scelte.condizioneLocale + dec.ristrutturazione / 250);
    eventi.push(`🔨 Ristrutturazione: ${fmt(dec.ristrutturazione)} → locale a ${Math.round(s.scelte.condizioneLocale)}/100`);
  }

  // ── 2. Domanda e coperti serviti
  const r = generaRicaviMese(s.locale, s.mkt, s.macro, cfg, s.annoCalendario, s.annoGioco, s.mese, s.reputazione, rng);
  const perf = performanceStaff(s.staff);
  perf.cucina = Math.min(1, perf.cucina * fattoreEsecuzione); // il menu giusto (o sbagliato) per la brigata
  const { serviti, respinti } = serviCoperti(r.copertiTotali, perf);
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
      eventi.push(`🚨 Ispezione! ${irregolari.length} in nero scoperti: ${fmt(sanzioni)} tra sanzioni e recupero contributi. Regolarizzati d'ufficio.`);
    }
  }

  // ── 4. Gradimento, locale, morale, reputazione
  const grad = gradimentoMese(perf, s.scelte, serviti);
  eventi.push(...grad.eventi);
  eventi.push(...aggiornaLocale(s.scelte, serviti));
  const morale = aggiornaMorale(s.staff, {
    caricoLavoro: serviti / perf.capacitaCoperti,
    riposoSettimanale: s.locale.giornoChiusura !== null,
  }, rng);
  eventi.push(...morale.eventi);
  for (const d of morale.dimissionari) liquidaTfrDi(s, d.id, d.inRegola, eventi);
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
  s.ristorante.dipendenti = s.staff; // la tesoreria paga gli stipendi da qui
  const inflMensile = Math.pow(1 + cfg.inflazioneAnnua, 1 / 12) - 1;
  s.costiFissiBase *= 1 + inflMensile;
  s.ristorante.costiFissiMensili =
    s.costiFissiBase + s.mkt.spesaTradizionaleMese + s.mkt.spesaSocialMese +
    s.scelte.manutenzioneMese + (dec.ristrutturazione ?? 0);
  tickCassa(s.ristorante, s.tesoreria, { anno: s.annoGioco, mese: s.mese, ricaviLordi, sanzioni }, cfg);

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
  }

  // ── 10. Game over?
  if (s.tesoreria.insolvente) {
    s.gameOver = true;
    s.motivoGameOver = "Insolvenza: fido bancario sforato";
    eventi.push("💀 GAME OVER — la banca chiude i rubinetti.");
  }

  const report: ReportMese = {
    annoGioco: s.mese === 12 ? s.annoGioco - 1 : s.annoGioco,
    mese: s.mese,
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
    chiusuraAnno,
    gameOver: s.gameOver,
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
