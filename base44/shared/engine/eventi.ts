/**
 * EVENTI DEL TERRITORIO — quello che succede fuori dal locale.
 *
 * Generati proceduralmente sul tipo di località: nessun dato esterno da
 * aggiornare, nessun calendario che invecchia.
 *
 * Il campo che conta è `noto`: gli eventi annunciati compaiono in
 * anticipo e si possono programmare (personale, scorte), quelli
 * improvvisi ti trovano come sei.
 *
 * Fiere e concerti portano gente. Sagre e partite la portano ALTROVE:
 * si mangia lì o si sta davanti alla TV. Contromossa: mettere un
 * maxischermo (le partite si ribaltano, ma non per tutti gli stili) o
 * prendere uno stand alla sagra.
 */

export type TipoEvento =
  | "fiera" | "sagra" | "partita" | "concerto" | "mercatino"
  | "gara_podistica" | "cantiere" | "sciopero_trasporti";

export interface DefEvento {
  tipo: TipoEvento;
  nome: string[];
  icona: string;
  /** moltiplicatore sull'affluenza */
  effetto: number;
  /** moltiplicatore sullo scontrino medio */
  effettoScontrino: number;
  /** quanti giorni dura */
  durataMin: number;
  durataMax: number;
  /** è annunciato in anticipo? */
  noto: boolean;
  /** frequenza relativa per tipo di località */
  freq: { riviera: number; citta: number; paese: number };
  nota: string;
}

export const EVENTI: DefEvento[] = [
  {
    tipo: "fiera", nome: ["Fiera internazionale", "Salone di settore", "Expo del turismo"],
    icona: "🏛️", effetto: 1.55, effettoScontrino: 1.18, durataMin: 3, durataMax: 5, noto: true,
    freq: { riviera: 10, citta: 8, paese: 1 },
    nota: "Alberghi pieni e clientela business: scontrino alto, prenota tutto chi lavora.",
  },
  {
    tipo: "sagra", nome: ["Sagra di paese", "Festa patronale", "Sagra del pesce"],
    icona: "🎪", effetto: 0.62, effettoScontrino: 0.92, durataMin: 2, durataMax: 4, noto: true,
    freq: { riviera: 7, citta: 4, paese: 12 },
    nota: "La gente mangia lì. Puoi prenderci uno stand invece di subirla.",
  },
  {
    tipo: "partita", nome: ["Partita di cartello in TV", "Derby", "Notte di coppa"],
    icona: "⚽", effetto: 0.74, effettoScontrino: 0.9, durataMin: 1, durataMax: 1, noto: true,
    freq: { riviera: 8, citta: 10, paese: 9 },
    nota: "Tutti a casa o al bar col maxischermo. Con una TV il segno si ribalta — dipende dal locale.",
  },
  {
    tipo: "concerto", nome: ["Concerto in piazza", "Festival musicale", "Notte bianca"],
    icona: "🎤", effetto: 1.32, effettoScontrino: 0.95, durataMin: 1, durataMax: 3, noto: true,
    freq: { riviera: 9, citta: 8, paese: 3 },
    nota: "Tanta gente in giro, ma mangia veloce e spende poco a testa.",
  },
  {
    tipo: "mercatino", nome: ["Mercatino dell'antiquariato", "Mercatino di Natale", "Fiera artigiana"],
    icona: "🧺", effetto: 1.18, effettoScontrino: 1.0, durataMin: 1, durataMax: 2, noto: true,
    freq: { riviera: 5, citta: 7, paese: 6 },
    nota: "Passaggio in più nelle ore di pranzo.",
  },
  {
    tipo: "gara_podistica", nome: ["Maratona cittadina", "Gara ciclistica", "Granfondo"],
    icona: "🏃", effetto: 0.8, effettoScontrino: 0.95, durataMin: 1, durataMax: 1, noto: true,
    freq: { riviera: 4, citta: 5, paese: 3 },
    nota: "Strade chiuse: chi non è già lì non arriva.",
  },
  {
    tipo: "cantiere", nome: ["Cantiere stradale davanti al locale", "Rifacimento del lungomare", "Lavori alla condotta"],
    icona: "🚧", effetto: 0.68, effettoScontrino: 1.0, durataMin: 12, durataMax: 30, noto: false,
    freq: { riviera: 4, citta: 5, paese: 3 },
    nota: "Rumore, polvere e parcheggi spariti. Dura settimane e non l'hai scelto tu.",
  },
  {
    tipo: "sciopero_trasporti", nome: ["Sciopero dei trasporti", "Blocco dei treni"],
    icona: "🚆", effetto: 0.82, effettoScontrino: 1.0, durataMin: 1, durataMax: 2, noto: false,
    freq: { riviera: 3, citta: 6, paese: 2 },
    nota: "Chi viene da fuori resta a casa.",
  },
];

export interface EventoMese {
  tipo: TipoEvento;
  nome: string;
  icona: string;
  giorni: number;
  /** effetto già applicato sul mese intero (1 = neutro) */
  effettoMese: number;
  effettoScontrino: number;
  noto: boolean;
  nota: string;
}

export interface ContestoEventi {
  tipoLocalita: "riviera" | "citta" | "paese";
  mese: number;
  /** il locale ha un maxischermo */
  haTv?: boolean;
  /** stile del locale: con la TV le partite rendono solo in certi locali */
  stileLocale?: string;
  /** stand alla sagra: costa, ma ribalta l'effetto */
  standAllaSagra?: boolean;
}

const STAGIONE_EVENTI: Record<string, number[]> = {
  // moltiplicatore di frequenza per mese (gen..dic)
  riviera: [0.4, 0.5, 0.8, 1.1, 1.4, 1.6, 1.7, 1.7, 1.2, 0.8, 0.6, 0.9],
  citta: [0.9, 0.9, 1.1, 1.2, 1.3, 1.1, 0.7, 0.5, 1.2, 1.2, 1.1, 1.3],
  paese: [0.6, 0.6, 0.8, 1.0, 1.3, 1.5, 1.6, 1.7, 1.3, 0.9, 0.7, 1.0],
};

/** Stili a cui la TV in sala fa bene davvero. */
const STILI_DA_TV = new Set(["pizzeria", "street_food", "trattoria_classica"]);

const GIORNI_MESE = 30;

/** Genera gli eventi del mese. Deterministico rispetto al rng passato. */
export function generaEventiMese(ctx: ContestoEventi, rng: () => number): EventoMese[] {
  const out: EventoMese[] = [];
  const stagione = STAGIONE_EVENTI[ctx.tipoLocalita][ctx.mese - 1];

  for (const d of EVENTI) {
    const freq = d.freq[ctx.tipoLocalita] * stagione;
    // freq ~ eventi attesi ogni 100 mesi
    if (rng() > freq / 100 * 1.1) continue;

    const giorni = Math.round(d.durataMin + rng() * (d.durataMax - d.durataMin));
    let effetto = d.effetto;
    let nota = d.nota;

    if (d.tipo === "partita" && ctx.haTv) {
      const bene = STILI_DA_TV.has(ctx.stileLocale ?? "");
      effetto = bene ? 1.35 : 1.02;
      nota = bene
        ? "Col maxischermo la partita ti riempie il locale."
        : "Hai la TV, ma la tua clientela non viene per quello: tiene botta e basta.";
    }
    if (d.tipo === "sagra" && ctx.standAllaSagra) {
      effetto = 1.05;
      nota = "Con lo stand alla sagra recuperi quello che perdi in sala, e ti fai vedere.";
    }

    // l'effetto vale solo nei giorni interessati: lo diluisco sul mese
    // un evento di 3 giorni non pesa 3/30 sul mese: quelli sono i giorni
    // che valgono di più (weekend, sere piene). Radice per non annacquarlo.
    const quota = Math.min(1, Math.sqrt(giorni / GIORNI_MESE));
    out.push({
      tipo: d.tipo,
      nome: d.nome[Math.floor(rng() * d.nome.length)],
      icona: d.icona,
      giorni,
      effettoMese: 1 + (effetto - 1) * quota,
      effettoScontrino: 1 + (d.effettoScontrino - 1) * quota,
      noto: d.noto,
      nota,
    });
  }
  return out;
}

/** Effetto complessivo del mese sull'affluenza e sullo scontrino. */
export function effettoEventi(eventi: EventoMese[]): { affluenza: number; scontrino: number } {
  return eventi.reduce(
    (a, e) => ({ affluenza: a.affluenza * e.effettoMese, scontrino: a.scontrino * e.effettoScontrino }),
    { affluenza: 1, scontrino: 1 },
  );
}

export const COSTO_TV = 1_800;
export const COSTO_STAND_SAGRA = 600;