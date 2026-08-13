/**
 * REPARTI — budget di sala e cucina, responsabili, fiducia.
 *
 * L'AFFIDABILITÀ è un asse diverso dalla competenza, e vale per TUTTI,
 * non solo per i responsabili: serve a riconoscere il ragazzo poco
 * formato che però non manca mai un turno — quello su cui conviene
 * investire. Si costruisce in mesi e si brucia in un episodio.
 *
 * Il budget è SFORABILE: il responsabile compra quello che serve e tu lo
 * scopri dopo. Ma la segnalazione dice sempre PERCHÉ, perché la causa
 * cambia completamente la risposta giusta.
 */

export interface StatoReparti {
  /** id dipendente -> affidabilità 0..100 */
  affidabilita: Record<string, number>;
  responsabileCucina?: string;
  responsabileSala?: string;
  /** budget mensile assegnato per reparto */
  budgetCucina: number;
  budgetSala: number;
  /** soglia di segnalazione: sotto questa percentuale non ti disturbano */
  sogliaSegnalazione: number;
}

export function nuovoStatoReparti(): StatoReparti {
  return { affidabilita: {}, budgetCucina: 0, budgetSala: 0, sogliaSegnalazione: 0.05 };
}

// ─────────────────────────────────────────────── Affidabilità

/** Tratti che spostano l'affidabilità di partenza. */
const TRATTI_SU = new Set(["leale", "ordinato", "instancabile", "mentore", "risparmioso"]);
const TRATTI_GIU = new Set(["ritardatario", "beve", "cellulare_in_mano", "testa_calda", "sbadato", "fumatore"]);

interface DipRep {
  id: string;
  nome: string;
  morale: number;
  inRegola: boolean;
  tratti?: Array<{ id: string }>;
  attributi: { esperienza: number };
  carriera?: { mesiInServizio?: number };
}

/** Valore iniziale, alla firma: nessuno lo conosce ancora davvero. */
export function affidabilitaIniziale(d: DipRep, rng: () => number): number {
  let v = 50 + (d.attributi.esperienza - 10) * 1.5;
  for (const t of d.tratti ?? []) {
    if (TRATTI_SU.has(t.id)) v += 9;
    if (TRATTI_GIU.has(t.id)) v -= 9;
  }
  return Math.max(5, Math.min(95, Math.round(v + (rng() - 0.5) * 14)));
}

export interface ContestoAffidabilita {
  /** carico di lavoro del mese */
  carico: number;
  /** giorni di assenza nel mese, per dipendente */
  assenze: Record<string, number>;
  /** chi ha sforato il budget senza avvisare */
  sforamentiNonSegnalati: Set<string>;
  /** il titolare è in burnout: la squadra si sfalda */
  burnoutTitolare: boolean;
}

/**
 * L'affidabilità si muove lentamente: mesi, non settimane. Un ambiente
 * sano la costruisce, uno pessimo la corrode.
 */
export function aggiornaAffidabilita(
  staff: DipRep[],
  st: StatoReparti,
  ctx: ContestoAffidabilita,
  rng: () => number
): string[] {
  const eventi: string[] = [];
  for (const d of staff) {
    if (st.affidabilita[d.id] === undefined) st.affidabilita[d.id] = affidabilitaIniziale(d, rng);
    const prima = st.affidabilita[d.id];
    let delta = 0;

    // presenza e continuità
    const giorniAssenza = ctx.assenze[d.id] ?? 0;
    if (giorniAssenza === 0) delta += 1.2;
    else if (giorniAssenza > 8) delta -= 2;

    // ambiente
    if (d.morale > 65) delta += 1;
    if (d.morale < 35) delta -= 1.5;
    if (ctx.carico > 1.15) delta -= 1;
    if (ctx.burnoutTitolare) delta -= 1.2;
    if (!d.inRegola) delta -= 0.5; // chi non ha tutele si sente meno legato
    if (ctx.sforamentiNonSegnalati.has(d.id)) delta -= 6;

    // i tratti tirano verso il proprio livello naturale
    for (const t of d.tratti ?? []) {
      if (TRATTI_SU.has(t.id)) delta += 0.4;
      if (TRATTI_GIU.has(t.id)) delta -= 0.5;
    }

    st.affidabilita[d.id] = Math.max(3, Math.min(98, prima + delta));

    // soglie: si notano solo quando le attraversi
    if (prima < 75 && st.affidabilita[d.id] >= 75) {
      eventi.push(`🤝 ${d.nome} è diventato uno su cui puoi contare: pensa a dargli una responsabilità.`);
    }
    if (prima >= 40 && st.affidabilita[d.id] < 40) {
      eventi.push(`⚠️ ${d.nome} sta diventando inaffidabile: presenze e impegno calano.`);
    }
  }
  return eventi;
}

/** Chi può reggere un reparto. */
export function candidatiResponsabile(staff: DipRep[], st: StatoReparti, reparto: "cucina" | "sala"): Array<{ id: string; nome: string; affidabilita: number; esperienza: number }> {
  return staff
    .map((d) => ({ id: d.id, nome: d.nome, affidabilita: st.affidabilita[d.id] ?? 50, esperienza: d.attributi.esperienza }))
    .sort((a, b) => b.affidabilita - a.affidabilita);
}

// ─────────────────────────────────────────────── Budget e sforamenti

export type CausaSforamento =
  | "piu_coperti" | "prezzi_saliti" | "spreco" | "qualita_alzata" | "ammanco";

export interface Sforamento {
  reparto: "cucina" | "sala";
  responsabileId?: string;
  responsabileNome?: string;
  budget: number;
  speso: number;
  eccesso: number;
  quota: number; // eccesso / budget
  causa: CausaSforamento;
  spiegazione: string;
  /** il responsabile ha avvisato prima? dipende dalla sua affidabilità */
  segnalatoPrima: boolean;
  /** effetti collaterali già applicati */
  effettoGradimento: number;
}

const SPIEGAZIONI: Record<CausaSforamento, string> = {
  piu_coperti: "Hai servito più coperti del previsto: il costo per coperto è in linea. Punirlo significa punire il successo.",
  prezzi_saliti: "I listini dei fornitori sono saliti: non è colpa sua.",
  spreco: "Porzioni fuori controllo e merce buttata: qui la responsabilità è sua.",
  qualita_alzata: "Ha comprato meglio di quanto gli avevi chiesto. Food cost su, ma anche i clienti se ne sono accorti.",
  ammanco: "I conti non tornano e la merce non c'è. Difficile da provare, impossibile da ignorare.",
};

interface ContestoBudget {
  reparto: "cucina" | "sala";
  budget: number;
  spesoReale: number;
  /** coperti serviti / coperti previsti */
  rapportoCoperti: number;
  /** inflazione alimentare del mese */
  inflazioneAlimentare: number;
  responsabile?: DipRep;
  affidabilitaResponsabile: number;
}

export function valutaSforamento(c: ContestoBudget, rng: () => number): Sforamento | null {
  if (c.budget <= 0 || c.spesoReale <= c.budget) return null;
  const eccesso = c.spesoReale - c.budget;
  const quota = eccesso / c.budget;

  // la causa dipende dal contesto, non dal caso puro
  let causa: CausaSforamento = "spreco";
  const ha = (id: string) => (c.responsabile?.tratti ?? []).some((t) => t.id === id);
  if (c.rapportoCoperti > 1.12) causa = "piu_coperti";
  else if (c.inflazioneAlimentare > 0.04) causa = "prezzi_saliti";
  else if (ha("spreca_materie")) causa = "spreco";
  else if (ha("creativo") || ha("ambizioso")) causa = "qualita_alzata";
  else if (c.affidabilitaResponsabile < 30 && rng() < 0.12) causa = "ammanco";
  else causa = rng() < 0.5 ? "spreco" : "piu_coperti";

  // chi è affidabile ti avvisa prima
  const segnalatoPrima = rng() < c.affidabilitaResponsabile / 120;

  return {
    reparto: c.reparto,
    responsabileId: c.responsabile?.id,
    responsabileNome: c.responsabile?.nome,
    budget: c.budget, speso: c.spesoReale, eccesso, quota,
    causa, spiegazione: SPIEGAZIONI[causa], segnalatoPrima,
    effettoGradimento: causa === "qualita_alzata" ? 0.03 : 0,
  };
}

/** Budget troppo stretto: la qualità cala e il responsabile si demoralizza. */
export function effettoBudgetStretto(budget: number, necessario: number): { moltGradimento: number; malusMorale: number; avviso?: string } {
  if (budget <= 0 || budget >= necessario) return { moltGradimento: 1, malusMorale: 0 };
  const stretta = 1 - budget / necessario;
  return {
    moltGradimento: 1 - Math.min(0.25, stretta * 0.5),
    malusMorale: Math.min(12, stretta * 25),
    avviso: stretta > 0.15
      ? `Il budget del reparto è sotto il necessario del ${Math.round(stretta * 100)}%: si compra al ribasso e si vede nel piatto.`
      : undefined,
  };
}

// ─────────────────────────────────────────────── Risposte del titolare

export type RispostaSforamento = "accetta" | "alza_budget" | "parla" | "richiamo" | "ritira_delega" | "licenzia";

export const EFFETTI_RISPOSTA: Record<RispostaSforamento, { affidabilita: number; morale: number; nota: string }> = {
  accetta: { affidabilita: 2, morale: 4, nota: "Fiducia. Ma se lo fai sempre, impara che il tetto non esiste." },
  alza_budget: { affidabilita: 3, morale: 8, nota: "Hai ammesso che era stretto: lavora meglio, tu marginizzi meno." },
  parla: { affidabilita: 1, morale: -2, nota: "Corregge il tiro senza rompere niente." },
  richiamo: { affidabilita: -2, morale: -14, nota: "Disciplina sì, ma il rapporto si raffredda." },
  ritira_delega: { affidabilita: -5, morale: -18, nota: "Torna tutto sul titolare: più stress per te, sfiducia per lui." },
  licenzia: { affidabilita: 0, morale: 0, nota: "TFR, buco in organico, e gli altri guardano." },
};