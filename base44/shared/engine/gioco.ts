/**
 * IL SERVIZIO DI GIOCO — il motore gira qui, nel client.
 *
 * Perché: una app che per fare un turno deve chiamare il server non
 * passa la review (il revisore prova in modalità aereo e vede una
 * schermata bianca), non funziona in treno, e non permette di
 * ripianificare in pausa senza una chiamata di rete a ogni stop.
 *
 * I moduli del motore sono TypeScript puro senza dipendenze: girano
 * identici nel browser. Il server resta per il backup e la sync, che
 * sono facoltativi.
 *
 * LO STORAGE È INIETTABILE: di default usa localStorage, ma in Capacitor
 * si passa Preferences, e per il backup si passa un adattatore che
 * scrive sull'entità Partita. Il motore non sa e non deve sapere dove
 * finiscono i byte.
 */

import { nuovaPartita, avanzaMese, candidatiIniziali } from "./partita";
import type { ConfigNuovaPartita, DecisioniMese, ReportMese, StatoPartita } from "./partita";

// ─────────────────────────────────────────────── Versione e migrazioni

/**
 * Alzare di UNO ogni volta che StatoPartita cambia forma, e aggiungere
 * la migrazione corrispondente. Senza questo, il primo aggiornamento
 * pubblicato rompe le partite in corso di chi ha già giocato.
 */
export const VERSIONE_STATO = 12;

/** Ogni voce porta lo stato dalla versione (chiave) alla successiva. */
const MIGRAZIONI: Record<number, (s: any) => any> = {
  // Le versioni precedenti alla 12 sono tutte pre-pubblicazione: il
  // motore inizializza già i campi mancanti a ogni turno, quindi basta
  // garantire che le strutture esistano e non siano null.
  0: (s) => {
    s.orari ??= {};
    s.griglia ??= undefined;      // ricostruita al primo turno
    s.nero ??= undefined;
    s.assenze ??= undefined;
    s.formazione ??= undefined;
    s.reparti ??= undefined;
    s.controlli ??= undefined;
    s.eventiLocali ??= [];
    s.domandeBandi ??= [];
    s.nuoveAssunzioniAnno ??= 0;
    s.caparraGruppi ??= false;
    s.haTv ??= false;
    return s;
  },
};

/** Porta uno stato vecchio alla versione corrente. Non lancia mai. */
export function migra(grezzo: any): { stato: StatoPartita; migrato: boolean; da: number } {
  const da = Number(grezzo?.__versione ?? 0);
  let s = grezzo;
  for (let v = da; v < VERSIONE_STATO; v++) {
    const m = MIGRAZIONI[v] ?? MIGRAZIONI[0];
    try { s = m(s); } catch { /* una migrazione fallita non deve perdere il salvataggio */ }
  }
  s.__versione = VERSIONE_STATO;
  return { stato: s as StatoPartita, migrato: da !== VERSIONE_STATO, da };
}

// ─────────────────────────────────────────────── Storage

export interface Storage {
  get(chiave: string): Promise<string | null>;
  set(chiave: string, valore: string): Promise<void>;
  remove(chiave: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** Adattatore di default: localStorage. In Capacitor si passa Preferences. */
export const storageLocale: Storage = {
  async get(k) { return globalThis.localStorage?.getItem(k) ?? null; },
  async set(k, v) { globalThis.localStorage?.setItem(k, v); },
  async remove(k) { globalThis.localStorage?.removeItem(k); },
  async keys() {
    const ls = globalThis.localStorage;
    if (!ls) return [];
    return Array.from({ length: ls.length }, (_, i) => ls.key(i)!).filter(Boolean);
  },
};

const PREFISSO = "rm:partita:";
const chiaveDi = (id: string) => `${PREFISSO}${id}`;

// ─────────────────────────────────────────────── Salvataggi

export interface Salvataggio {
  id: string;
  nome: string;
  versione: number;
  turniGiocati: number;
  annoGioco: number;
  mese: number;
  cassa: number;
  reputazione: number;
  gameOver: boolean;
  aggiornatoIl: string;
  stato: StatoPartita;
  /** ultimo report, per riaprire il gioco dove si era */
  ultimoReport?: ReportMese;
}

export interface RigaElenco {
  id: string; nome: string; turniGiocati: number; annoGioco: number;
  mese: number; cassa: number; reputazione: number; gameOver: boolean; aggiornatoIl: string;
}

function intestazione(s: StatoPartita, nome: string, id: string, turni: number, report?: ReportMese): Salvataggio {
  return {
    id, nome, versione: VERSIONE_STATO, turniGiocati: turni,
    annoGioco: (s as any).annoGioco, mese: (s as any).mese,
    cassa: (s as any).tesoreria?.saldo ?? 0,
    reputazione: (s as any).reputazione ?? 0,
    gameOver: !!(s as any).gameOver,
    aggiornatoIl: new Date().toISOString(),
    stato: s, ultimoReport: report,
  };
}

// ─────────────────────────────────────────────── Il servizio

export class Gioco {
  constructor(private storage: Storage = storageLocale) {}

  /** Crea una partita e la salva subito: se l'app muore, non si perde. */
  async crea(config: ConfigNuovaPartita, nome = config.nomeRistorante): Promise<Salvataggio> {
    const stato = nuovaPartita(config);
    (stato as any).__versione = VERSIONE_STATO;
    const sv = intestazione(stato, nome, `p${Date.now().toString(36)}`, 0);
    await this.salva(sv);
    return sv;
  }

  /** Un turno. Salva subito dopo: un crash non deve costare un mese. */
  async avanza(id: string, decisioni: DecisioniMese = {}): Promise<{ report: ReportMese; salvataggio: Salvataggio }> {
    const sv = await this.carica(id);
    if (!sv) throw new Error("Salvataggio non trovato");
    if (sv.stato.gameOver) throw new Error(`Partita finita: ${(sv.stato as any).motivoGameOver}`);
    const report = avanzaMese(sv.stato, decisioni);
    const aggiornato = intestazione(sv.stato, sv.nome, sv.id, sv.turniGiocati + 1, report);
    await this.salva(aggiornato);
    return { report, salvataggio: aggiornato };
  }

  /**
   * Rigioca il mese corrente con decisioni diverse SENZA salvare.
   * Serve alla ripianificazione in pausa: si lavora su una copia, e solo
   * quando il giocatore conferma si chiama avanza().
   */
  simula(sv: Salvataggio, decisioni: DecisioniMese): ReportMese {
    const copia: StatoPartita = JSON.parse(JSON.stringify(sv.stato));
    return avanzaMese(copia, decisioni);
  }

  async carica(id: string): Promise<Salvataggio | null> {
    const raw = await this.storage.get(chiaveDi(id));
    if (!raw) return null;
    try {
      const sv = JSON.parse(raw) as Salvataggio;
      const { stato, migrato, da } = migra(sv.stato);
      sv.stato = stato;
      if (migrato) {
        sv.versione = VERSIONE_STATO;
        await this.salva(sv);
        console.info(`Salvataggio "${sv.nome}" migrato dalla versione ${da} alla ${VERSIONE_STATO}.`);
      }
      return sv;
    } catch {
      return null; // salvataggio corrotto: meglio null che un crash all'avvio
    }
  }

  async salva(sv: Salvataggio): Promise<void> {
    await this.storage.set(chiaveDi(sv.id), JSON.stringify(sv));
  }

  async elenco(): Promise<RigaElenco[]> {
    const chiavi = (await this.storage.keys()).filter((k) => k.startsWith(PREFISSO));
    const righe: RigaElenco[] = [];
    for (const k of chiavi) {
      const raw = await this.storage.get(k);
      if (!raw) continue;
      try {
        const { stato, ...testa } = JSON.parse(raw) as Salvataggio;
        righe.push(testa as RigaElenco);
      } catch { /* salvataggio illeggibile: non blocca l'elenco */ }
    }
    return righe.sort((a, b) => b.aggiornatoIl.localeCompare(a.aggiornatoIl));
  }

  async elimina(id: string): Promise<void> {
    await this.storage.remove(chiaveDi(id));
  }

  /** Candidati del wizard: stesso seed che poi va a crea(). */
  pool(seed: number, mese: number) {
    return candidatiIniziali(seed, mese);
  }

  // ── Backup e ripristino (il server è facoltativo)

  /** Esporta tutto in una stringa: backup manuale o sync verso il server. */
  async esporta(): Promise<string> {
    const chiavi = (await this.storage.keys()).filter((k) => k.startsWith(PREFISSO));
    const partite: any[] = [];
    for (const k of chiavi) {
      const raw = await this.storage.get(k);
      if (raw) { try { partite.push(JSON.parse(raw)); } catch { /* salta */ } }
    }
    return JSON.stringify({ versione: VERSIONE_STATO, esportatoIl: new Date().toISOString(), partite });
  }

  /** Reimporta un backup. Le partite esistenti con lo stesso id vengono sovrascritte. */
  async importa(json: string): Promise<{ importate: number; errori: number }> {
    let importate = 0, errori = 0;
    try {
      const dati = JSON.parse(json);
      for (const p of dati.partite ?? []) {
        try {
          const { stato } = migra(p.stato);
          await this.salva({ ...p, stato, versione: VERSIONE_STATO });
          importate++;
        } catch { errori++; }
      }
    } catch { errori++; }
    return { importate, errori };
  }
}

// ─────────────────────────────────────────────── Self-check

export async function demo(): Promise<void> {
  const mem = new Map<string, string>();
  const storage: Storage = {
    async get(k) { return mem.get(k) ?? null; },
    async set(k, v) { mem.set(k, v); },
    async remove(k) { mem.delete(k); },
    async keys() { return [...mem.keys()]; },
  };
  const g = new Gioco(storage);

  // migrazione di uno stato vecchio senza versione
  const vecchio = migra({ annoGioco: 1, mese: 3 });
  console.assert(vecchio.migrato && (vecchio.stato as any).__versione === VERSIONE_STATO,
    "uno stato senza versione deve essere migrato");
  console.assert(Array.isArray((vecchio.stato as any).domandeBandi),
    "la migrazione deve creare le strutture mancanti");

  // salvataggio corrotto: non deve far crashare l'avvio
  await storage.set(`${PREFISSO}rotta`, "{non json");
  console.assert((await g.carica("rotta")) === null, "un salvataggio corrotto torna null");
  console.assert((await g.elenco()).length === 0, "un salvataggio corrotto non compare nell'elenco");

  console.log("gioco.ts — self-check OK");
}

if (import.meta.url === `file://${process.argv[1]}`) demo();