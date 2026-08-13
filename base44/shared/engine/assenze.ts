/**
 * ASSENZE — ferie, malattia, e i buchi che lasciano.
 *
 * Ferie: maturano ogni mese e sono un DEBITO, come il TFR. Non si
 * possono solo pagare: vanno consumate. Se non le concedi mai, si
 * accumulano e il morale scende.
 *
 * Malattia: costa e non produce. La probabilità non è un dado puro —
 * sale col sovraccarico, col morale basso e in inverno. Chi spreme la
 * squadra si ritrova senza squadra: è la spirale da imparare a spezzare.
 *
 * Il nero presenta il conto proprio qui: chi ha ore fuori busta, in
 * malattia prende l'indennità calcolata sulle ore dichiarate. Se il
 * titolare non integra di tasca sua, il lavoratore scopre di colpo che
 * metà del suo stipendio non esiste.
 */

export const FERIE = {
  giorniAnnui: 26,
  maturazioneMensile: 26 / 12,
  /** sopra questi giorni accumulati il morale inizia a scendere */
  sogliaAccumulo: 30,
  malusMoraleAccumulo: 3,
} as const;

export const MALATTIA = {
  probBase: 0.020,
  /** quanto pesa il sovraccarico (carico > 1) */
  pesoCarico: 0.09,
  /** quanto pesa il morale basso */
  pesoMoraleBasso: 0.05,
  /** mesi invernali: più influenze */
  mesiFreddi: [11, 12, 1, 2, 3],
  malusInverno: 1.5,
  durataMinGiorni: 2,
  durataMaxGiorni: 12,
  /** giorni a totale carico dell'azienda prima dell'intervento INPS */
  giorniCarenza: 3,
  /** quota di retribuzione a carico azienda oltre la carenza */
  quotaAziendaOltreCarenza: 0.35,
  /** oltre questi giorni cumulati nell'anno si apre il comporto */
  sogliaComporto: 180,
} as const;

export interface StatoAssenze {
  /** giorni di ferie maturati e non goduti, per dipendente */
  ferieMaturate: Record<string, number>;
  /** giorni di malattia cumulati nell'anno, per dipendente */
  malattiaAnno: Record<string, number>;
  /** malattia in corso: giorni residui nel mese */
  inMalattia: Record<string, number>;
  /** ferie programmate questo mese, in giorni */
  ferieInCorso: Record<string, number>;
}

export function nuovoStatoAssenze(): StatoAssenze {
  return { ferieMaturate: {}, malattiaAnno: {}, inMalattia: {}, ferieInCorso: {} };
}

export interface DecisioniAssenze {
  /** ferie concesse questo mese: id -> giorni */
  ferieConcesse?: Record<string, number>;
  /** chiusura del locale per ferie: giorni nel mese (tutti in ferie insieme) */
  chiusuraFerie?: number;
  /** la quota fuori busta la paghi anche quando è assente? */
  pagaNeroInAssenza?: boolean;
}

export interface EsitoAssenze {
  /** id -> giorni di assenza totali nel mese */
  assenti: Record<string, number>;
  /** frazione di ore perse sul monte ore del mese */
  quotaOrePerse: Record<string, number>;
  /** costo delle malattie a carico azienda */
  costoMalattia: number;
  eventi: string[];
  /** chi ha superato il comporto: il rapporto può essere sciolto */
  inComporto: string[];
}

interface DipendenteAssenze {
  id: string;
  nome: string;
  inRegola: boolean;
  morale: number;
  quotaNero?: number;
  attributi: { resistenza: number };
}

const GIORNI_LAVORATIVI_MESE = 26;

export function aggiornaAssenze(
  staff: DipendenteAssenze[],
  st: StatoAssenze,
  ctx: { mese: number; caricoLavoro: number },
  dec: DecisioniAssenze,
  rng: () => number
): EsitoAssenze {
  const eventi: string[] = [];
  const assenti: Record<string, number> = {};
  const quotaOrePerse: Record<string, number> = {};
  const inComporto: string[] = [];
  let costoMalattia = 0;

  const invernale = MALATTIA.mesiFreddi.includes(ctx.mese);

  for (const d of staff) {
    st.ferieMaturate[d.id] = (st.ferieMaturate[d.id] ?? 0) + (d.inRegola ? FERIE.maturazioneMensile : 0);
    let giorniAssenza = 0;

    // ── Ferie concesse (o chiusura collettiva)
    const chieste = (dec.ferieConcesse?.[d.id] ?? 0) + (dec.chiusuraFerie ?? 0);
    const godute = Math.min(chieste, st.ferieMaturate[d.id] ?? 0);
    if (godute > 0) {
      st.ferieMaturate[d.id] -= godute;
      giorniAssenza += godute;
      st.ferieInCorso[d.id] = godute;
    } else {
      delete st.ferieInCorso[d.id];
    }

    // ── Ferie accumulate troppo: il morale scende
    if ((st.ferieMaturate[d.id] ?? 0) > FERIE.sogliaAccumulo) {
      d.morale = Math.max(5, d.morale - FERIE.malusMoraleAccumulo);
      eventi.push(`🏖️ ${d.nome} ha ${Math.round(st.ferieMaturate[d.id])} giorni di ferie non godute: comincia a pesare.`);
    }

    // ── Malattia
    let p = MALATTIA.probBase;
    p += Math.max(0, ctx.caricoLavoro - 1) * MALATTIA.pesoCarico;
    if (d.morale < 45) p += MALATTIA.pesoMoraleBasso;
    p *= invernale ? MALATTIA.malusInverno : 1;
    p *= 1 - Math.min(0.4, d.attributi.resistenza / 50);

    if (rng() < p) {
      const giorni = Math.round(
        MALATTIA.durataMinGiorni + rng() * (MALATTIA.durataMaxGiorni - MALATTIA.durataMinGiorni)
      );
      giorniAssenza += giorni;
      st.inMalattia[d.id] = giorni;
      st.malattiaAnno[d.id] = (st.malattiaAnno[d.id] ?? 0) + giorni;
      eventi.push(
        `🤒 ${d.nome} in malattia per ${giorni} giorni.` +
        (ctx.caricoLavoro > 1.1 ? " Non è un caso: la squadra è allo stremo." : "")
      );
      if ((st.malattiaAnno[d.id] ?? 0) > MALATTIA.sogliaComporto) {
        inComporto.push(d.id);
        eventi.push(`⚖️ ${d.nome} ha superato il periodo di comporto: puoi sciogliere il rapporto.`);
      }
    } else {
      delete st.inMalattia[d.id];
    }

    if (giorniAssenza > 0) {
      assenti[d.id] = giorniAssenza;
      quotaOrePerse[d.id] = Math.min(1, giorniAssenza / GIORNI_LAVORATIVI_MESE);
    }
  }

  return { assenti, quotaOrePerse, costoMalattia, eventi, inComporto };
}

/**
 * Costo di un'assenza per l'azienda e conseguenze sul lavoratore.
 * `lordoMese` è la retribuzione piena del mese.
 */
export function costoAssenza(
  d: { id: string; nome: string; quotaNero?: number },
  giorniAssenza: number,
  lordoMese: number,
  cashNeroMese: number,
  dec: DecisioniAssenze
): { costoAzienda: number; perditaLavoratore: number; eventi: string[] } {
  const eventi: string[] = [];
  const quota = Math.min(1, giorniAssenza / GIORNI_LAVORATIVI_MESE);

  const giorniCarenza = Math.min(giorniAssenza, MALATTIA.giorniCarenza);
  const giorniOltre = Math.max(0, giorniAssenza - MALATTIA.giorniCarenza);
  const costoAziendaBusta =
    (lordoMese / GIORNI_LAVORATIVI_MESE) * giorniCarenza +
    (lordoMese / GIORNI_LAVORATIVI_MESE) * giorniOltre * MALATTIA.quotaAziendaOltreCarenza;

  // Il fuori busta durante l'assenza: scelta del titolare
  const neroDovuto = cashNeroMese * quota;
  const neroPagato = dec.pagaNeroInAssenza ? neroDovuto : 0;
  const perditaLavoratore = neroDovuto - neroPagato;

  if (perditaLavoratore > 0) {
    eventi.push(
      `💔 ${d.nome} durante l'assenza non riceve la parte fuori busta: ` +
      `${Math.round(perditaLavoratore)}€ in meno. Se ne accorge, eccome.`
    );
  }

  return { costoAzienda: costoAziendaBusta + neroPagato, perditaLavoratore, eventi };
}

/** Malus di morale per chi si vede tagliare il fuori busta in assenza. */
export function malusMoralePerdita(perdita: number, lordoMese: number): number {
  if (perdita <= 0) return 0;
  return Math.min(35, (perdita / Math.max(1, lordoMese)) * 90);
}