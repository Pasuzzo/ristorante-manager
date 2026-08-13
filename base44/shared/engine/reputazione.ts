/**
 * REPUTAZIONE — attributi dello staff, morale, scelte del titolare,
 * gradimento dei clienti e dinamica della reputazione.
 *
 * Catena causale:
 *   attributi × morale → performance cucina/sala
 *   performance + materie prime + condizione locale + servizi − attese
 *     → GRADIMENTO del mese (0..1)
 *   marketing → COSTRUISCE reputazione (visibilità, hype)
 *   feedback  → la CONSOLIDA: la tira verso il gradimento reale,
 *               con forza proporzionale ai coperti (recensioni).
 *   Se reputazione ≫ gradimento: "hype smascherato", crollo accelerato.
 *
 * Il morale è il pezzo alla Football Manager: paga sopra il minimo,
 * contratto regolare, carico di lavoro e riposo settimanale determinano
 * un morale-obiettivo verso cui il dipendente converge ogni mese.
 * Sotto una soglia, rischio dimissioni (e il TFR esce dalla cassa).
 */

import { Dipendente, Ristorante } from "./engine.ts";
import { StatoMarketing } from "./ricavi.ts";

// ─────────────────────────────────────────────── Attributi (scala 1–20, alla FM)

export interface Attributi {
  tecnica: number;    // qualità del lavoro (piatti, servizio)
  velocita: number;   // quanti coperti riesce a gestire
  cortesia: number;   // impatto sull'esperienza del cliente
  resistenza: number; // regge il carico nei picchi
  esperienza: number; // riduce gli errori, mentore per i giovani
}

export interface DipendenteEsteso extends Dipendente {
  attributi: Attributi;
  morale: number; // 0..100
}

const RUOLI_CUCINA = new Set(["lavapiatti", "commis", "cuoco", "chef"]);

/** Pesi degli attributi per reparto. */
const PESI = {
  cucina: { tecnica: 0.45, velocita: 0.25, cortesia: 0, resistenza: 0.15, esperienza: 0.15 },
  sala:   { tecnica: 0.15, velocita: 0.25, cortesia: 0.4, resistenza: 0.1, esperienza: 0.1 },
};

function performanceIndividuale(d: DipendenteEsteso, reparto: "cucina" | "sala"): number {
  const p = PESI[reparto];
  const base =
    (d.attributi.tecnica * p.tecnica + d.attributi.velocita * p.velocita +
     d.attributi.cortesia * p.cortesia + d.attributi.resistenza * p.resistenza +
     d.attributi.esperienza * p.esperienza) / 20; // → 0..1
  return base * (0.6 + 0.4 * (d.morale / 100)); // il morale pesa il 40%
}

export interface PerformanceStaff {
  cucina: number; // 0..1
  sala: number;   // 0..1
  /** coperti/mese gestibili senza degrado del servizio */
  capacitaCoperti: number;
}

export function performanceStaff(staff: DipendenteEsteso[]): PerformanceStaff {
  const cucina = staff.filter((d) => RUOLI_CUCINA.has(d.ruolo));
  const sala = staff.filter((d) => !RUOLI_CUCINA.has(d.ruolo));
  const media = (arr: DipendenteEsteso[], rep: "cucina" | "sala") =>
    arr.length ? arr.reduce((s, d) => s + performanceIndividuale(d, rep), 0) / arr.length : 0.15;
  // capacità: ogni addetto gestisce ~700 coperti/mese, scalati su velocità e morale
  const cap = (arr: DipendenteEsteso[]) =>
    arr.reduce((s, d) => s + 1000 * (d.attributi.velocita / 12) * (0.7 + 0.3 * d.morale / 100), 0);
  return {
    cucina: media(cucina, "cucina"),
    sala: media(sala, "sala"),
    capacitaCoperti: Math.max(1, Math.min(cap(cucina) * 1.15, cap(sala))),
  };
}

// ─────────────────────────────────────────────── Morale e dimissioni

export interface CondizioniLavoro {
  /** coperti del mese / capacità dello staff */
  caricoLavoro: number;
  /** il locale osserva un giorno di chiusura settimanale */
  riposoSettimanale: boolean;
}

/** Aggiorna il morale di tutto lo staff; ritorna gli eventi e chi si dimette. */
export function aggiornaMorale(
  staff: DipendenteEsteso[],
  cond: CondizioniLavoro,
  rng: () => number = Math.random
): { eventi: string[]; dimissionari: DipendenteEsteso[] } {
  const eventi: string[] = [];
  const dimissionari: DipendenteEsteso[] = [];
  for (const d of staff) {
    let target = 55;
    target += (d.superminimo - 1) * 150;              // paga sopra il minimo CCNL
    if (!d.inRegola) target -= 20;                     // in nero: niente tutele, malumore
    target -= Math.max(0, cond.caricoLavoro - 0.85) * 55 * (1 - d.attributi.resistenza / 40);
    if (!cond.riposoSettimanale) target -= 8;
    target = Math.max(5, Math.min(95, target));
    d.morale += (target - d.morale) * 0.25;            // convergenza graduale

    if (d.morale < 35 && rng() < (35 - d.morale) / 160) {
      dimissionari.push(d);
      eventi.push(`👋 ${d.nome} (${d.ruolo}) si dimette: morale a ${Math.round(d.morale)}. ` +
        (d.inRegola ? "Il TFR maturato va liquidato." : "Se ne va da un giorno all'altro."));
    } else if (d.morale < 40) {
      eventi.push(`😒 ${d.nome} è demotivato (morale ${Math.round(d.morale)}): rende meno e potrebbe andarsene.`);
    }
  }
  for (const d of dimissionari) staff.splice(staff.indexOf(d), 1);
  return { eventi, dimissionari };
}

// ─────────────────────────────────────────────── Scelte del titolare

export type QualitaMaterie = "economica" | "standard" | "premium";

/** Il food cost segue la qualità scelta: si paga in margine o in recensioni. */
export const FOOD_COST: Record<QualitaMaterie, number> = {
  economica: 0.26,
  standard: 0.32,
  premium: 0.39,
};

const GRADIMENTO_MATERIE: Record<QualitaMaterie, number> = {
  economica: 0.35,
  standard: 0.6,
  premium: 0.88,
};

export type Servizio =
  | "wifi" | "dehors" | "prenotazione_online" | "seggioloni"
  | "accessibilita" | "parcheggio" | "menu_allergeni" | "pet_friendly";

export interface ScelteGestione {
  qualitaMaterie: QualitaMaterie;
  /** stato del locale 0..100: arredi, bagni, pulizia percepita */
  condizioneLocale: number;
  /** € spesi al mese in manutenzione ordinaria */
  manutenzioneMese: number;
  servizi: Servizio[];
}

/** Il locale si consuma con l'uso; la manutenzione lo tiene su. */
export function aggiornaLocale(s: ScelteGestione, copertiMese: number): string[] {
  const usura = 1.2 + copertiMese / 1800;
  s.condizioneLocale = Math.max(0, Math.min(100, s.condizioneLocale - usura + s.manutenzioneMese / 120));
  if (s.condizioneLocale < 40) return [`🔧 Il locale mostra i segni del tempo (condizione ${Math.round(s.condizioneLocale)}): i clienti se ne accorgono.`];
  return [];
}

// ─────────────────────────────────────────────── Gradimento del mese

export interface EsitoGradimento {
  voto: number;   // 0..1
  stelle: number; // 1..5 per il flavor delle recensioni
  eventi: string[];
}

export function gradimentoMese(
  perf: PerformanceStaff,
  scelte: ScelteGestione,
  copertiMese: number
): EsitoGradimento {
  const eventi: string[] = [];
  const carico = copertiMese / Math.max(1, perf.capacitaCoperti);
  // attese: fino al 90% della capacità nessun problema, poi degrado rapido
  const fAttese = carico <= 0.9 ? 1 : Math.max(0.4, 1 - (carico - 0.9) * 1.6);
  if (fAttese < 0.85) eventi.push(`⏱️ Staff sotto organico: attese lunghe (carico ${Math.round(carico * 100)}%)`);

  const fServizi = Math.min(0.1, scelte.servizi.length * 0.02);
  const voto = Math.max(0.05, Math.min(1,
    perf.cucina * 0.35 +
    perf.sala * 0.25 +
    GRADIMENTO_MATERIE[scelte.qualitaMaterie] * 0.15 +
    (scelte.condizioneLocale / 100) * 0.15 +
    fServizi +
    (fAttese - 1) * 0.5 // penalità attese
  ));
  return { voto, stelle: Math.round((1 + voto * 4) * 10) / 10, eventi };
}

// ─────────────────────────────────────────────── Dinamica della reputazione

/**
 * rep ← rep + costruzione(marketing) + consolidamento(feedback)
 * - il marketing spinge verso l'alto, con rendimenti decrescenti (1-rep)
 * - i feedback tirano la reputazione verso il voto reale, con forza
 *   proporzionale al volume di coperti (più clienti = più recensioni)
 * - se rep − voto > 0.15: hype smascherato, la caduta accelera
 */
export function aggiornaReputazione(
  rep: number,
  voto: number,
  copertiMese: number,
  mkt: StatoMarketing
): { rep: number; eventi: string[] } {
  const eventi: string[] = [];
  const spintaMkt = Math.min(1,
    0.5 * (mkt.seguitoSocial / (mkt.seguitoSocial + 2500)) +
    0.4 * Math.log1p(mkt.spesaTradizionaleMese / 400) / Math.log1p(5)
  );
  rep += 0.08 * spintaMkt * (1 - rep);

  const forzaFeedback = Math.min(0.5, copertiMese / 3000);
  rep += forzaFeedback * (voto - rep);

  if (rep - voto > 0.15) {
    rep += 0.3 * (voto - rep);
    eventi.push(`📉 Recensioni sotto le aspettative: l'hype si sgonfia (voto reale ${(voto * 5).toFixed(1)}★).`);
  }
  return { rep: Math.max(0.02, Math.min(0.98, rep)), eventi };
}

// ─────────────────────────────────────────────── Coperti servibili

/** Oltre questo moltiplicatore della capacità, i clienti vengono respinti. */
export const MAX_OVERBOOKING = 1.25;

/**
 * La domanda arriva dal generatore ricavi, ma servi solo chi riesci a servire:
 * i respinti sono ricavi persi (e passaparola negativo lo gestisce il carico
 * dentro gradimentoMese). Senza cucina, capacità ≈ 0: non si apre.
 */
export function serviCoperti(domanda: number, perf: PerformanceStaff): {
  serviti: number; respinti: number;
} {
  const serviti = Math.min(domanda, Math.round(perf.capacitaCoperti * MAX_OVERBOOKING));
  return { serviti, respinti: domanda - serviti };
}

// ─────────────────────────────────────────────── Generatore staff (per il mercato)

export function nuovoDipendente(
  id: string, nome: string, ruolo: Dipendente["ruolo"],
  livello: "scarso" | "medio" | "bravo",
  superminimo: number, inRegola: boolean,
  rng: () => number = Math.random
): DipendenteEsteso {
  const base = livello === "scarso" ? 6 : livello === "medio" ? 10 : 14;
  const a = () => Math.max(1, Math.min(20, Math.round(base + (rng() - 0.5) * 6)));
  return {
    id, nome, ruolo, inRegola, superminimo,
    attributi: { tecnica: a(), velocita: a(), cortesia: a(), resistenza: a(), esperienza: a() },
    morale: 60,
  };
}