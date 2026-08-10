/**
 * DERIVA MACROECONOMICA — l'economia che si muove dopo la partenza.
 *
 * La partita parte OGGI, quindi il futuro non esiste ancora: il dato Istat
 * serve solo come fotografia iniziale, poi il motore deve inventare
 * un futuro plausibile. Questo modulo lo fa in modo calibrato e
 * DETERMINISTICO (tutto dal seed della partita: replay garantito).
 *
 * MODELLO — Ornstein-Uhlenbeck discreto (ritorno verso la media):
 *
 *   x(t+1) = x(t) + θ·(μ − x(t)) + σ·ε        con ε ~ N(0,1)
 *
 *   θ = velocità di rientro verso la media
 *   μ = livello di lungo periodo (per l'inflazione: il 2% obiettivo BCE)
 *   σ = volatilità mensile
 *
 * Più eventuali SHOCK: episodi rari e persistenti che riproducono cose
 * come il 2022 (energia, tensioni sulle materie prime). Senza shock la
 * serie è troppo docile e il gioco perde i momenti drammatici.
 *
 * CORRELAZIONE — la parte che conta davvero. Nella realtà queste
 * grandezze non si muovono in modo indipendente:
 *   - l'inflazione alimentare segue quella generale ma è più volatile
 *     e reagisce prima (morde subito il food cost)
 *   - gli affitti si adeguano con RITARDO (ISTAT 75%, adeguamento annuo)
 *   - i salari inseguono l'inflazione ma in ritardo e in modo parziale:
 *     è da questo scarto che nasce la perdita di potere d'acquisto
 *   - la fiducia dei consumatori CROLLA quando l'inflazione sorprende
 *     al rialzo, e si riprende lentamente
 * Se le fai indipendenti il gioco diventa incoerente: inflazione al 9%
 * e consumatori sereni non succede mai.
 */

// ─────────────────────────────────────────────── Parametri calibrati

/**
 * Calibrazione indicativa su serie storiche italiane (NIC, retribuzioni
 * contrattuali, canoni). Sono i valori da toccare per il bilanciamento.
 */
export const CALIBRAZIONE = {
  inflazione: {
    mu: 0.02,        // obiettivo BCE: la serie tende a tornare qui
    theta: 0.055,    // rientro lento: uno shock si smaltisce in ~2 anni
    sigma: 0.0022,   // volatilità mensile
    min: -0.01,      // deflazione possibile ma rara
    max: 0.14,
  },
  /** l'alimentare amplifica la generale e ha rumore proprio */
  alimentare: {
    beta: 1.35,      // quanto amplifica l'inflazione generale
    theta: 0.09,     // rientra più in fretta verso il proprio livello
    sigma: 0.0035,   // più volatile (meteo, raccolti, energia)
  },
  /** i canoni si adeguano al 75% dell'ISTAT, una volta l'anno */
  affitti: {
    quotaAdeguamento: 0.75,
    /** mese in cui scatta l'adeguamento contrattuale */
    meseAdeguamento: 1,
  },
  /** i salari inseguono con ritardo e recuperano solo in parte */
  salari: {
    recupero: 0.65,  // recuperano il 65% dell'inflazione…
    ritardoMesi: 10, // …e con dieci mesi di ritardo (rinnovi contrattuali)
    minimo: 0.004,
  },
  fiducia: {
    base: 1.0,
    /** quanto pesa la SORPRESA d'inflazione (scostamento dalla media) */
    sensibilita: 4.5,
    theta: 0.12,     // si riprende lentamente
    min: 0.72,
    max: 1.12,
  },
  shock: {
    /** probabilità mensile che parta uno shock inflattivo */
    probabilita: 0.011,   // ~1 volta ogni 7-8 anni
    intensitaMin: 0.02,
    intensitaMax: 0.075,
    durataMesiMin: 6,
    durataMesiMax: 20,
    /** quota di shock inflattivi; il resto sono recessivi (prezzi giù, domanda giù) */
    quotaInflattivi: 0.62,
  },
} as const;

// ─────────────────────────────────────────────── Stato

export interface StatoMacro {
  /** valori correnti */
  inflazioneAnnua: number;
  inflazioneAlimentare: number;
  fiduciaConsumatori: number;
  crescitaSalariAnnua: number;
  /** indice dei canoni: parte da 1, cresce con l'adeguamento annuo */
  indiceCanoni: number;
  /** storia dell'inflazione, serve al ritardo dei salari e ai grafici */
  storicoInflazione: number[];
  /** shock in corso, se presente */
  shockAttivo?: { intensita: number; mesiResidui: number; nome: string };
  /** da dove è partita la partita: mostrato in UI per trasparenza */
  partenza: { inflazione: number; fonte: "istat" | "fallback"; periodo: string };
}

export interface DatiPartenza {
  inflazioneAnnua: number;
  inflazioneAlimentare: number;
  fiduciaConsumatori: number;
  crescitaSalariAnnua: number;
  fonte: "istat" | "fallback";
  aggiornatoAl: string;
}

/** Inizializza la macro dalla fotografia Istat scattata alla creazione. */
export function inizializzaMacro(d: DatiPartenza): StatoMacro {
  return {
    inflazioneAnnua: d.inflazioneAnnua,
    inflazioneAlimentare: d.inflazioneAlimentare,
    fiduciaConsumatori: d.fiduciaConsumatori,
    crescitaSalariAnnua: d.crescitaSalariAnnua,
    indiceCanoni: 1,
    storicoInflazione: [d.inflazioneAnnua],
    partenza: { inflazione: d.inflazioneAnnua, fonte: d.fonte, periodo: d.aggiornatoAl },
  };
}

// ─────────────────────────────────────────────── Normale dal RNG uniforme

/** Box-Muller: trasforma due uniformi in una normale standard. */
function normale(rng: () => number): number {
  const u = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────── Il passo mensile

export interface EsitoMacroMese {
  eventi: string[];
  /** moltiplicatore da applicare al canone d'affitto questo mese */
  adeguamentoCanone: number;
}

/**
 * Avanza l'economia di un mese. Da chiamare a ogni turno PRIMA di
 * calcolare ricavi e costi, così il mese gira sui valori aggiornati.
 */
export function avanzaMacro(
  m: StatoMacro,
  mese: number,
  annoGioco: number,
  rng: () => number
): EsitoMacroMese {
  const C = CALIBRAZIONE;
  const eventi: string[] = [];
  const inflPrec = m.inflazioneAnnua;

  // ── 1. Shock: partenza, permanenza, esaurimento
  if (!m.shockAttivo && rng() < C.shock.probabilita) {
    const alRialzo = rng() < C.shock.quotaInflattivi;
    const nomi = alRialzo ? [
      "🛢️ Crisi energetica: bollette e trasporti alle stelle",
      "🌍 Tensioni internazionali sulle materie prime",
      "🌾 Annata agricola disastrosa in Europa",
      "🚢 Blocco delle catene di fornitura",
    ] : [
      "📉 Recessione: consumi in frenata e prezzi fermi",
      "🏦 Stretta monetaria: credito caro e domanda debole",
      "🛒 Crollo della domanda interna",
    ];
    const intensita = C.shock.intensitaMin + rng() * (C.shock.intensitaMax - C.shock.intensitaMin);
    m.shockAttivo = {
      intensita: alRialzo ? intensita : -intensita * 0.6,
      mesiResidui: Math.round(C.shock.durataMesiMin + rng() * (C.shock.durataMesiMax - C.shock.durataMesiMin)),
      nome: nomi[Math.floor(rng() * nomi.length)],
    };
    eventi.push(`${m.shockAttivo.nome}. ${alRialzo ? "L'inflazione è destinata a salire nei prossimi mesi." : "Prezzi fermi, ma anche i clienti stringono la cinghia."}`);
  }
  let spintaShock = 0;
  if (m.shockAttivo) {
    // la spinta entra gradualmente e si esaurisce con la coda
    spintaShock = m.shockAttivo.intensita * 0.16;
    m.shockAttivo.mesiResidui--;
    if (m.shockAttivo.mesiResidui <= 0) {
      eventi.push("📉 Lo shock sui prezzi si sta riassorbendo.");
      m.shockAttivo = undefined;
    }
  }

  // ── 2. Inflazione generale: Ornstein-Uhlenbeck + shock
  const I = C.inflazione;
  m.inflazioneAnnua = clamp(
    m.inflazioneAnnua + I.theta * (I.mu - m.inflazioneAnnua) + I.sigma * normale(rng) + spintaShock,
    I.min, I.max
  );
  m.storicoInflazione.push(m.inflazioneAnnua);
  if (m.storicoInflazione.length > 240) m.storicoInflazione.shift();

  // ── 3. Alimentare: amplifica la generale, con rumore proprio
  const A = C.alimentare;
  // amplifica lo SCOSTAMENTO dalla media, non il livello:
  // nel lungo periodo alimentare ≈ generale, ma reagisce di più agli shock
  const targetAlim = I.mu + (m.inflazioneAnnua - I.mu) * A.beta;
  m.inflazioneAlimentare = clamp(
    m.inflazioneAlimentare + A.theta * (targetAlim - m.inflazioneAlimentare) + A.sigma * normale(rng) + spintaShock * 1.4,
    I.min, I.max * 1.5
  );

  // ── 4. Salari: inseguono l'inflazione di ~10 mesi fa, e solo in parte
  const idx = m.storicoInflazione.length - 1 - C.salari.ritardoMesi;
  const inflRitardata = idx >= 0 ? m.storicoInflazione[idx] : m.storicoInflazione[0];
  m.crescitaSalariAnnua = Math.max(
    C.salari.minimo,
    m.crescitaSalariAnnua + 0.2 * (inflRitardata * C.salari.recupero - m.crescitaSalariAnnua)
  );

  // ── 5. Fiducia: crolla sulla SORPRESA d'inflazione, si riprende piano
  const F = C.fiducia;
  const sorpresa = m.inflazioneAnnua - I.mu;
  const malusRecessione = m.shockAttivo && m.shockAttivo.intensita < 0 ? 0.12 : 0;
  const targetFiducia = F.base - sorpresa * F.sensibilita - malusRecessione;
  m.fiduciaConsumatori = clamp(
    m.fiduciaConsumatori + F.theta * (targetFiducia - m.fiduciaConsumatori),
    F.min, F.max
  );

  // ── 6. Canoni: adeguamento ISTAT una volta l'anno (75%)
  let adeguamentoCanone = 1;
  if (mese === C.affitti.meseAdeguamento && annoGioco > 1) {
    // si adegua sull'inflazione media dei 12 mesi precedenti
    const ultimi12 = m.storicoInflazione.slice(-12);
    const media = ultimi12.reduce((s, x) => s + x, 0) / Math.max(1, ultimi12.length);
    adeguamentoCanone = 1 + Math.max(0, media) * C.affitti.quotaAdeguamento;
    m.indiceCanoni *= adeguamentoCanone;
    if (adeguamentoCanone > 1.001) {
      eventi.push(`🏠 Adeguamento ISTAT del canone: +${((adeguamentoCanone - 1) * 100).toFixed(1)}% (75% dell'inflazione).`);
    }
  }

  // ── 7. Notizie: solo quando succede qualcosa di percepibile
  const delta = m.inflazioneAnnua - inflPrec;
  if (Math.abs(delta) > 0.006) {
    eventi.push(delta > 0
      ? `📈 Inflazione in salita al ${(m.inflazioneAnnua * 100).toFixed(1)}%: i fornitori ritoccano i listini.`
      : `📉 Inflazione in calo al ${(m.inflazioneAnnua * 100).toFixed(1)}%.`);
  }
  if (m.inflazioneAlimentare - m.inflazioneAnnua > 0.025) {
    eventi.push(`🥬 I prezzi alimentari corrono più dell'inflazione generale (${(m.inflazioneAlimentare * 100).toFixed(1)}%): il food cost sale.`);
  }
  if (m.fiduciaConsumatori < 0.85) {
    eventi.push(`😟 Fiducia dei consumatori bassa: si mangia fuori di meno.`);
  }
  const gapPotereAcquisto = m.inflazioneAnnua - m.crescitaSalariAnnua;
  if (gapPotereAcquisto > 0.03) {
    eventi.push(`💸 Le buste paga non tengono il passo dei prezzi: scontrino medio sotto pressione.`);
  }

  return { eventi, adeguamentoCanone };
}

// ─────────────────────────────────────────────── Derivate per il motore

/** Inflazione mensile composta, per erodere i costi fissi. */
export function inflazioneMensile(m: StatoMacro): number {
  return Math.pow(1 + m.inflazioneAnnua, 1 / 12) - 1;
}

/** Inflazione alimentare mensile: erode il food cost. */
export function inflazioneAlimentareMensile(m: StatoMacro): number {
  return Math.pow(1 + Math.max(-0.05, m.inflazioneAlimentare), 1 / 12) - 1;
}

/**
 * Fattore di domanda: mette insieme fiducia e potere d'acquisto.
 * È il numero che il generatore ricavi usa al posto della vecchia
 * costante `fiduciaConsumatori`.
 */
export function fattoreDomanda(m: StatoMacro): number {
  const gap = m.inflazioneAnnua - m.crescitaSalariAnnua;
  const erosione = gap > 0 ? 1 - Math.min(0.2, gap * 2.5) : 1;
  return m.fiduciaConsumatori * erosione;
}

// ─────────────────────────────────────────────── Utility di collaudo

/** Proietta N mesi e restituisce le serie: serve per tarare e per i grafici. */
export function proietta(
  partenza: DatiPartenza,
  mesi: number,
  seed: number
): { inflazione: number[]; alimentare: number[]; fiducia: number[]; salari: number[]; canoni: number[]; eventi: string[] } {
  let s = seed | 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const m = inizializzaMacro(partenza);
  const out = { inflazione: [] as number[], alimentare: [] as number[], fiducia: [] as number[], salari: [] as number[], canoni: [] as number[], eventi: [] as string[] };
  for (let i = 0; i < mesi; i++) {
    const mese = (i % 12) + 1;
    const anno = Math.floor(i / 12) + 1;
    const e = avanzaMacro(m, mese, anno, rng);
    out.inflazione.push(m.inflazioneAnnua);
    out.alimentare.push(m.inflazioneAlimentare);
    out.fiducia.push(m.fiduciaConsumatori);
    out.salari.push(m.crescitaSalariAnnua);
    out.canoni.push(m.indiceCanoni);
    e.eventi.forEach((x) => out.eventi.push(`M${i + 1}: ${x}`));
  }
  return out;
}