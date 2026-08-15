/**
 * IL LIBRO PRENOTAZIONI — quello che sai prima, e quanto prima lo sai.
 *
 * IDEA CHIAVE: non è un secondo generatore di domanda. La domanda di un
 * giorno futuro è già decisa in modo deterministico dal seme di QUEL
 * giorno (meteo, stagione, eventi). Il libro prenotazioni ne RIVELA una
 * frazione crescente man mano che la data si avvicina, con rumore.
 *
 * Due conseguenze che valgono più di mille righe di modello:
 *  - mettere in pausa e ripianificare non cambia il futuro, cambia solo
 *    quanto ne vedi: niente save-scumming sul meteo
 *  - il servizio di prenotazione online non toglie solo stress, allunga
 *    l'orizzonte e stringe la forbice. È informazione, e l'informazione
 *    è ciò che ti permette di programmare i turni.
 */

import type { Servizio } from "./turni.ts";

// ─────────────────────────────────────────────── Parametri

export const PRENOTAZIONI = {
  /** orizzonte visibile in giorni, per canale */
  orizzonteTelefono: 4,
  orizzonteOnline: 14,
  /** quota della domanda che arriva prenotando (il resto è passaggio) */
  quotaPrenotataPerZona: { centro_storico: 0.55, lungomare: 0.45, semicentro: 0.6, periferia: 0.7, extraurbano: 0.8 } as Record<string, number>,
  /** i walk-in sono l'opposto: dove c'è passaggio si prenota meno */
  /** curva di riempimento: quota delle prenotazioni finali già arrivate a N giorni dalla data */
  curvaRiempimento: [1, 0.92, 0.78, 0.62, 0.48, 0.38, 0.3, 0.24, 0.19, 0.15, 0.12, 0.09, 0.07, 0.05, 0.03],
  /** rumore sulla stima, per canale: quanto è larga la forbice */
  rumoreTelefono: 0.22,
  rumoreOnline: 0.10,
  /** quota di prenotazioni che salta all'ultimo */
  noShowTelefono: 0.09,
  noShowOnline: 0.04,
  noShowConCaparra: 0.015,
  /** cancellazioni nei giorni precedenti (movimento del libro) */
  volatilitaCancellazioni: 0.12,
} as const;

export interface ConfigPrenotazioni {
  /** true se il titolare ha attivato il gestionale di prenotazioni */
  online: boolean;
  /** caparra richiesta ai gruppi: meno no-show, ma qualche cliente si offende */
  caparraGruppi: boolean;
  zona: string;
}

// ─────────────────────────────────────────────── Previsione

export interface PrevisioneServizio {
  giorno: number;
  servizio: Servizio;
  /** prenotazioni confermate al momento (numero secco, quello che vedi) */
  prenotati: number;
  /** stima dei clienti di passaggio, come forbice */
  walkInMin: number;
  walkInMax: number;
  /** totale atteso, forbice */
  attesiMin: number;
  attesiMax: number;
  /** true se il giorno è oltre l'orizzonte visibile: vedi solo una stima grezza */
  oltreOrizzonte: boolean;
  /** gruppi numerosi in arrivo, da segnalare */
  gruppi: number;
}

/**
 * Rivela quello che si può sapere oggi su un servizio futuro.
 * `domandaReale` è la domanda che quel giorno avrà davvero (già decisa
 * dal motore): qui si decide solo quanta se ne vede.
 */
export function previsioneServizio(
  domandaReale: number,
  giorniAllaData: number,
  servizio: Servizio,
  cfg: ConfigPrenotazioni,
  rng: () => number
): PrevisioneServizio {
  const orizzonte = cfg.online ? PRENOTAZIONI.orizzonteOnline : PRENOTAZIONI.orizzonteTelefono;
  const oltreOrizzonte = giorniAllaData > orizzonte;
  const quotaPrenotata = PRENOTAZIONI.quotaPrenotataPerZona[cfg.zona] ?? 0.6;
  // a cena si prenota di più che a pranzo
  const quota = quotaPrenotata * (servizio === "cena" ? 1.15 : 0.8);

  const prenotazioniFinali = domandaReale * Math.min(0.95, quota);
  const idx = Math.min(PRENOTAZIONI.curvaRiempimento.length - 1, Math.max(0, giorniAllaData));
  const arrivate = prenotazioniFinali * PRENOTAZIONI.curvaRiempimento[idx];

  const rumore = cfg.online ? PRENOTAZIONI.rumoreOnline : PRENOTAZIONI.rumoreTelefono;
  const walkInAtteso = domandaReale - prenotazioniFinali;

  return {
    giorno: 0, servizio,
    prenotati: oltreOrizzonte ? 0 : Math.round(arrivate),
    walkInMin: Math.round(walkInAtteso * (1 - rumore * 2)),
    walkInMax: Math.round(walkInAtteso * (1 + rumore * 2)),
    attesiMin: Math.round((arrivate + walkInAtteso) * (1 - rumore)),
    attesiMax: Math.round((arrivate + walkInAtteso) * (1 + rumore)),
    oltreOrizzonte,
    gruppi: arrivate > 25 && rng() < 0.3 ? Math.max(1, Math.round(arrivate / 30)) : 0,
  };
}

/**
 * Quanti si presentano davvero: prenotati meno no-show, più passaggio.
 * Da chiamare il giorno stesso, quando ormai non si programma più.
 */
export function presenzeEffettive(
  domandaReale: number,
  servizio: Servizio,
  cfg: ConfigPrenotazioni,
  rng: () => number
): { prenotatiPresenti: number; noShow: number; walkIn: number; totale: number } {
  const quotaPrenotata = (PRENOTAZIONI.quotaPrenotataPerZona[cfg.zona] ?? 0.6) * (servizio === "cena" ? 1.15 : 0.8);
  const prenotati = Math.round(domandaReale * Math.min(0.95, quotaPrenotata));
  const tasso = cfg.caparraGruppi
    ? PRENOTAZIONI.noShowConCaparra
    : cfg.online ? PRENOTAZIONI.noShowOnline : PRENOTAZIONI.noShowTelefono;
  const noShow = Math.round(prenotati * tasso * (0.6 + rng() * 0.8));
  const walkIn = Math.max(0, Math.round((domandaReale - prenotati) * (0.85 + rng() * 0.3)));
  return { prenotatiPresenti: prenotati - noShow, noShow, walkIn, totale: prenotati - noShow + walkIn };
}

// ─────────────────────────────────────────────── Settimana da pianificare

export interface RigaSettimana {
  giorno: number;      // giorno del mese
  dow: number;         // 0 = domenica
  pranzo: PrevisioneServizio;
  cena: PrevisioneServizio;
  /** eventi noti in calendario quel giorno */
  note: string[];
}

/**
 * I sette giorni che il giocatore vede quando mette in pausa.
 * `domandaGiorni` è la domanda giornaliera già calcolata dal motore.
 */
export function settimanaDaPianificare(
  domandaGiorni: Array<{ giorno: number; dow: number; copertiDomanda: number; chiuso: boolean; festivita: string | null; maltempo: boolean }>,
  giornoCorrente: number,
  quotaPranzo: number,
  cfg: ConfigPrenotazioni,
  rng: () => number
): RigaSettimana[] {
  const out: RigaSettimana[] = [];
  for (const g of domandaGiorni) {
    if (g.giorno <= giornoCorrente) continue;
    if (out.length >= 7) break;
    const distanza = g.giorno - giornoCorrente;
    const dPranzo = g.copertiDomanda * quotaPranzo;
    const dCena = g.copertiDomanda * (1 - quotaPranzo);
    const note: string[] = [];
    if (g.festivita) note.push(`🎉 ${g.festivita}`);
    if (g.chiuso) note.push("giorno di chiusura");
    // il meteo lontano non si sa: si vede solo a 2-3 giorni
    if (g.maltempo && distanza <= 3) note.push("🌧 previsto maltempo");

    const p = previsioneServizio(dPranzo, distanza, "pranzo", cfg, rng);
    const c = previsioneServizio(dCena, distanza, "cena", cfg, rng);
    p.giorno = g.giorno; c.giorno = g.giorno;
    if (c.gruppi > 0) note.push(`👥 ${c.gruppi} gruppo${c.gruppi > 1 ? "i" : ""} numeroso${c.gruppi > 1 ? "i" : ""} a cena`);
    out.push({ giorno: g.giorno, dow: g.dow, pranzo: p, cena: c, note });
  }
  return out;
}

// ─────────────────────────────────────────────── Chiamata dell'extra

export interface EsitoChiamata {
  accettata: boolean;
  motivo: string;
  /** se convocato e poi il servizio salta, lo paghi comunque */
  vaPagatoComunque: boolean;
}

/**
 * Chiamare un extra all'ultimo. Può dire di no, e la probabilità dipende
 * dal preavviso, dall'affidabilità, dalla famiglia e da come l'hai
 * trattato finora.
 */
export function chiamaExtra(
  d: { nome: string; famiglia?: string; morale: number },
  affidabilita: number,
  giorniPreavviso: number,
  servizio: Servizio,
  dow: number,
  rng: () => number
): EsitoChiamata {
  let p = 0.35 + affidabilita / 200;                    // base
  p += Math.min(0.35, giorniPreavviso * 0.09);          // preavviso
  p += (d.morale - 50) / 300;                            // come sta
  const weekendSera = servizio === "cena" && (dow === 5 || dow === 6);
  if (weekendSera && (d.famiglia === "famiglia_con_figli" || d.famiglia === "genitore_solo")) p -= 0.22;
  if (giorniPreavviso <= 1) p -= 0.12;

  const accettata = rng() < Math.max(0.05, Math.min(0.95, p));
  const motivo = accettata
    ? giorniPreavviso <= 1 ? `${d.nome} molla tutto e viene. Ricordatelo.` : `${d.nome} c'è.`
    : giorniPreavviso <= 1 ? `${d.nome} non può: avvisato troppo tardi.`
      : weekendSera ? `${d.nome} il sabato sera ha famiglia.`
        : `${d.nome} ha già altri impegni.`;
  return { accettata, motivo, vaPagatoComunque: accettata };
}

// ─────────────────────────────────────────────── Self-check

export function demo(): void {
  const rng = () => 0.5;
  const cfgTel: ConfigPrenotazioni = { online: false, caparraGruppi: false, zona: "semicentro" };
  const cfgOn: ConfigPrenotazioni = { online: true, caparraGruppi: false, zona: "semicentro" };

  const lontanoTel = previsioneServizio(60, 8, "cena", cfgTel, rng);
  const lontanoOn = previsioneServizio(60, 8, "cena", cfgOn, rng);
  console.assert(lontanoTel.oltreOrizzonte && !lontanoOn.oltreOrizzonte,
    "a 8 giorni col telefono non vedi niente, online sì");

  const vicino = previsioneServizio(60, 1, "cena", cfgOn, rng);
  console.assert(vicino.prenotati > lontanoOn.prenotati, "avvicinandosi le prenotazioni crescono");
  const forbiceOn = vicino.attesiMax - vicino.attesiMin;
  const forbiceTel = previsioneServizio(60, 1, "cena", cfgTel, rng);
  console.assert(forbiceOn < forbiceTel.attesiMax - forbiceTel.attesiMin,
    "online la forbice deve essere più stretta");

  const pres = presenzeEffettive(60, "cena", cfgTel, rng);
  console.assert(pres.totale > 0 && pres.noShow >= 0, "le presenze devono avere senso");

  const si = chiamaExtra({ nome: "X", morale: 70 }, 80, 5, "cena", 3, () => 0.1);
  const no = chiamaExtra({ nome: "X", morale: 40 }, 20, 0, "cena", 6, () => 0.9);
  console.assert(si.accettata && !no.accettata, "preavviso e affidabilità devono contare");
  console.log("prenotazioni.ts — self-check OK");
}

if (import.meta.url === `file://${process.argv[1]}`) demo();