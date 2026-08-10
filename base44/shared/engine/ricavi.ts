/**
 * GENERATORE DI RICAVI — l'affluenza, giorno per giorno.
 *
 * coperti_giorno = capienza_teorica × tasso_base
 *                × f_giorno_settimana × f_stagione × f_festività
 *                × f_meteo × f_marketing × f_prezzo × f_reputazione × f_macro
 *                × rumore casuale, con tetto alla capienza reale.
 *
 * Il mese restituisce ricavi lordi (IVA inclusa) pronti per tickCassa.
 *
 * Filosofia dei due canali marketing:
 * - TRADIZIONALE (volantini, radio, giornale locale): effetto immediato,
 *   rendimenti decrescenti, svanisce appena smetti di pagare.
 * - SOCIAL: costruisce un "seguito" (stock) che cresce con la spesa e con
 *   il passaparola dei coperti reali, decade lentamente. Compounding:
 *   all'inizio rende poco, dopo un anno lavora anche da solo.
 */

import { FiscalConfig } from "./fiscal-config.ts";

// ─────────────────────────────────────────────── Tipi

export type TipoLocalita = "riviera" | "citta" | "paese";

export interface ProfiloLocale {
  postiASedere: number;
  turniMax: number; // ricambi tavolo massimi al giorno (pranzo+cena)
  /** 0=dom, 1=lun … 6=sab; null = sempre aperto */
  giornoChiusura: number | null;
  scontrinoMedioBase: number; // €, IVA inclusa, a prezzi anno 1
  tipoLocalita: TipoLocalita;
  /** 1 = prezzi in linea col mercato; 1.1 = +10% (scelta del giocatore) */
  listino: number;
  /** elasticità della domanda al prezzo (tipico ristorazione: -1.2) */
  elasticitaPrezzo: number;
  /** riempimento medio di un locale "normale" (default 0.42) — manopola di bilanciamento */
  tassoBase?: number;
  /** indice dei prezzi del MENU: 1 all'apertura, cresce con l'inflazione
   *  generale. Se assente si usa il vecchio calcolo su cfg. */
  indicePrezziMenu?: number;
}

export interface StatoMarketing {
  spesaTradizionaleMese: number; // € decisi dal giocatore ogni mese
  spesaSocialMese: number;
  seguitoSocial: number; // stock accumulato (follower "utili")
}

/** Fattori decisi dallo "stato italiano" e dal macro-contesto. */
export interface ContestoMacro {
  /** indice fiducia consumatori normalizzato (1 = neutro, 0.9 = pessimismo) */
  fiduciaConsumatori: number;
  /** crescita salari annua: se < inflazione, il potere d'acquisto cala */
  crescitaSalariAnnua: number;
  /** eventi normativi/una-tantum: bonus, cashback, aumenti IVA, lockdown… */
  eventi: EventoMacro[];
}

export interface EventoMacro {
  nome: string;
  anno: number;
  meseDa: number;
  meseA: number;
  moltiplicatoreAffluenza: number; // es. bonus vacanze 1.08, crisi 0.85
}

/** Dettaglio di un singolo giorno: serve al playback "play/pausa" nel client. */
export interface GiornoSimulato {
  giorno: number;
  dow: number;              // 0=dom … 6=sab
  chiuso: boolean;
  festivita: string | null;
  ponte: boolean;
  maltempo: boolean;
  copertiDomanda: number;   // quanti ne volevano venire
}

export interface EsitoRicaviMese {
  /** giorno per giorno, in ordine: il client li scorre a 2-3 secondi l'uno */
  giorni: GiornoSimulato[];
  ricaviLordi: number;
  copertiTotali: number;
  scontrinoMedio: number;
  giorniApertura: number;
  eventi: string[];
}

// ─────────────────────────────────────────────── Calendario italiano

/** Pasqua (algoritmo di Gauss) — serve per Pasquetta e il ponte del 25/4-1/5. */
export function pasqua(anno: number): { mese: number; giorno: number } {
  const a = anno % 19, b = Math.floor(anno / 100), c = anno % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31);
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return { mese, giorno };
}

const FESTIVITA_FISSE: Array<[number, number, string]> = [
  [1, 1, "Capodanno"], [1, 6, "Epifania"], [4, 25, "Liberazione"],
  [5, 1, "Festa del Lavoro"], [6, 2, "Repubblica"], [8, 15, "Ferragosto"],
  [11, 1, "Ognissanti"], [12, 8, "Immacolata"], [12, 25, "Natale"],
  [12, 26, "Santo Stefano"], [12, 31, "San Silvestro"],
];

function festivitaDelGiorno(anno: number, mese: number, giorno: number): string | null {
  for (const [m, g, nome] of FESTIVITA_FISSE) if (m === mese && g === giorno) return nome;
  const p = pasqua(anno);
  if (mese === p.mese && giorno === p.giorno) return "Pasqua";
  const pasquetta = new Date(anno, p.mese - 1, p.giorno + 1);
  if (mese === pasquetta.getMonth() + 1 && giorno === pasquetta.getDate()) return "Pasquetta";
  return null;
}

/** Un feriale adiacente a un festivo che cade mar/gio diventa "ponte". */
function ePonte(anno: number, mese: number, giorno: number): boolean {
  const data = new Date(anno, mese - 1, giorno);
  const dow = data.getDay();
  const vicino = (delta: number) => {
    const d = new Date(anno, mese - 1, giorno + delta);
    return festivitaDelGiorno(d.getFullYear(), d.getMonth() + 1, d.getDate()) !== null;
  };
  return (dow === 1 && vicino(1)) || (dow === 5 && vicino(-1)); // lun pre-martedì festivo, ven post-giovedì festivo
}

// ─────────────────────────────────────────────── Fattori

const F_GIORNO = [1.25, 0.5, 0.6, 0.7, 0.85, 1.25, 1.55]; // dom..sab

const STAGIONALITA: Record<TipoLocalita, number[]> = {
  // gen..dic
  riviera: [0.55, 0.6, 0.7, 0.85, 1.0, 1.35, 1.7, 1.85, 1.15, 0.75, 0.6, 0.9],
  citta:   [0.9, 0.95, 1.0, 1.05, 1.1, 1.0, 0.85, 0.6, 1.05, 1.1, 1.05, 1.2],
  paese:   [0.8, 0.85, 0.9, 1.0, 1.05, 1.1, 1.15, 1.25, 1.0, 0.95, 0.85, 1.1],
};

/** p(giornata brutta) per mese; il brutto tempo taglia l'affluenza. */
const P_MALTEMPO = [0.38, 0.35, 0.3, 0.28, 0.22, 0.15, 0.1, 0.12, 0.2, 0.3, 0.38, 0.38];

function fattoreMarketing(mkt: StatoMarketing): number {
  // tradizionale: log con rendimenti decrescenti, solo mese corrente
  const trad = 0.18 * Math.log1p(mkt.spesaTradizionaleMese / 400);
  // social: funzione di saturazione sullo stock di seguito
  const social = 0.3 * (mkt.seguitoSocial / (mkt.seguitoSocial + 2500));
  return 1 + Math.min(0.55, trad + social);
}

function fattoreMacro(ctx: ContestoMacro, cfg: FiscalConfig, anno: number, mese: number): { f: number; note: string[] } {
  const note: string[] = [];
  let f = ctx.fiduciaConsumatori;
  // erosione del potere d'acquisto: mangiare fuori è la prima rinuncia
  const gap = cfg.inflazioneAnnua - ctx.crescitaSalariAnnua;
  if (gap > 0) f *= 1 - Math.min(0.2, gap * 2.5);
  for (const e of ctx.eventi) {
    if (e.anno === anno && mese >= e.meseDa && mese <= e.meseA) {
      f *= e.moltiplicatoreAffluenza;
      note.push(`${e.nome} (${e.moltiplicatoreAffluenza > 1 ? "+" : ""}${Math.round((e.moltiplicatoreAffluenza - 1) * 100)}%)`);
    }
  }
  return { f, note };
}

// ─────────────────────────────────────────────── Generatore mensile

export function generaRicaviMese(
  locale: ProfiloLocale,
  mkt: StatoMarketing,
  ctx: ContestoMacro,
  cfg: FiscalConfig,
  anno: number, // anno di calendario (per Pasqua e ponti)
  annoDiGioco: number, // 1, 2, 3… (per l'inflazione cumulata sui prezzi)
  mese: number,
  reputazione: number, // 0..1 — arriverà dal match engine; per ora input
  rng: () => number = Math.random
): EsitoRicaviMese {
  const eventi: string[] = [];
  const giorniNelMese = new Date(anno, mese, 0).getDate();
  const capienzaGiorno = locale.postiASedere * locale.turniMax;
  const tassoBase = locale.tassoBase ?? 0.42; // riempimento medio di un locale "normale"

  const macro = fattoreMacro(ctx, cfg, anno, mese);
  eventi.push(...macro.note);
  const fPrezzo = Math.pow(locale.listino, locale.elasticitaPrezzo);
  const fMkt = fattoreMarketing(mkt);
  const fRep = 0.7 + 0.6 * reputazione;
  const fStagione = STAGIONALITA[locale.tipoLocalita][mese - 1];

  // inflazione cumulata: scontrino cresce col listino e coi prezzi generali
  const indice = locale.indicePrezziMenu ?? Math.pow(1 + cfg.inflazioneAnnua, annoDiGioco - 1);
  const scontrino = locale.scontrinoMedioBase * locale.listino * indice;

  let copertiTotali = 0;
  let giorniApertura = 0;
  let giorniMaltempo = 0;
  const giorni: GiornoSimulato[] = [];

  for (let g = 1; g <= giorniNelMese; g++) {
    const dow = new Date(anno, mese - 1, g).getDay();
    const festa = festivitaDelGiorno(anno, mese, g);
    if (dow === locale.giornoChiusura && !festa) {
      giorni.push({ giorno: g, dow, chiuso: true, festivita: festa, ponte: false, maltempo: false, copertiDomanda: 0 });
      continue; // chiuso (ma se è festa apro)
    }
    giorniApertura++;
    const ponte = !festa && ePonte(anno, mese, g);

    let f = F_GIORNO[dow] * fStagione * fMkt * fPrezzo * fRep * macro.f;
    if (festa) f *= locale.tipoLocalita === "riviera" && festa === "Ferragosto" ? 2.2 : 1.6;
    if (ponte) f *= 1.3;

    const brutto = rng() < P_MALTEMPO[mese - 1];
    if (brutto) { f *= 0.72; giorniMaltempo++; }
    else f *= 1.04;

    const rumore = 0.85 + rng() * 0.3;
    const coperti = Math.min(capienzaGiorno, Math.round(capienzaGiorno * tassoBase * f * rumore));
    copertiTotali += coperti;
    giorni.push({ giorno: g, dow, chiuso: false, festivita: festa, ponte, maltempo: brutto, copertiDomanda: coperti });
  }

  // il seguito social evolve: spesa + passaparola dei coperti reali − decay
  mkt.seguitoSocial = mkt.seguitoSocial * 0.95 + mkt.spesaSocialMese * 0.12 + copertiTotali * 0.03;

  if (giorniMaltempo > giorniNelMese * 0.45) eventi.push(`🌧️ Mese piovoso (${giorniMaltempo}gg di maltempo)`);
  const pFesta = FESTIVITA_FISSE.filter(([m]) => m === mese).map(([, , n]) => n);
  if (pFesta.length && fStagione > 1.3) eventi.push(`🎉 Alta stagione + ${pFesta.join(", ")}`);

  const ricaviLordi = copertiTotali * scontrino;
  return { giorni, ricaviLordi, copertiTotali, scontrinoMedio: scontrino, giorniApertura, eventi };
}