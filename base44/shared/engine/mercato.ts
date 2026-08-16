/**
 * MERCATO DEL LAVORO — i candidati come persone, non come statistiche.
 *
 * Ogni candidato generato ha:
 *  - RUOLO e livello (attributi 1–20 derivati)
 *  - STILE di cucina/servizio: se non combacia con quello del locale,
 *    rende meno finché non si adatta (o non si adatta mai)
 *  - FORMAZIONE: scuola alberghiera, corsi, gavetta, autodidatta
 *  - TRATTI: pregi e difetti che modificano attributi, morale e
 *    innescano eventi casuali durante la partita
 *  - SITUAZIONE FAMILIARE: incide su disponibilità, assenze, stabilità
 *  - PRETESE CONTRATTUALI: chi vuole full-time regolare, chi part-time,
 *    chi vuole tutto in nero, chi metà e metà. Se l'offerta non le
 *    soddisfa, rifiuta o accetta col morale già basso.
 *
 * Il giocatore vede solo parte delle informazioni: gli attributi sono
 * mostrati come forbice ("12-16") e alcuni tratti sono NASCOSTI finché
 * non emergono lavorando (alla Football Manager con gli scout).
 */

import { DipendenteEsteso, Attributi } from "./reputazione.ts";
import { anteprimaOfferta, nettoDesiderato, Orario } from "./contratti.ts";

// ─────────────────────────────────────────────── Ruoli

export type RuoloEsteso =
  | "lavapiatti" | "runner" | "commis" | "cameriere" | "chef_de_rang"
  | "barista" | "pizzaiolo" | "cuoco" | "sous_chef" | "chef"
  | "pasticcere" | "maitre" | "sommelier" | "direttore";

/** Reparto di appartenenza: decide quali attributi contano. */
export const REPARTO: Record<RuoloEsteso, "cucina" | "sala"> = {
  lavapiatti: "cucina", commis: "cucina", cuoco: "cucina", sous_chef: "cucina",
  chef: "cucina", pizzaiolo: "cucina", pasticcere: "cucina",
  runner: "sala", cameriere: "sala", chef_de_rang: "sala", barista: "sala",
  maitre: "sala", sommelier: "sala", direttore: "sala",
};

/** Peso del ruolo sul minimo CCNL (moltiplicatore della paga base). */
export const LIVELLO_CCNL: Record<RuoloEsteso, number> = {
  lavapiatti: 0.95, runner: 0.97, commis: 1.0, cameriere: 1.05, barista: 1.05,
  chef_de_rang: 1.15, pizzaiolo: 1.2, cuoco: 1.2, pasticcere: 1.25,
  sommelier: 1.3, sous_chef: 1.35, maitre: 1.35, chef: 1.5, direttore: 1.6,
};

// ─────────────────────────────────────────────── Stile

export type Stile =
  | "tradizionale_romagnolo" | "cucina_di_pesce" | "moderna_creativa"
  | "pizzeria" | "trattoria_classica" | "fine_dining" | "street_food" | "vegetariana";

/** Quanto due stili sono compatibili (0 = agli antipodi, 1 = identici). */
const AFFINITA: Partial<Record<Stile, Partial<Record<Stile, number>>>> = {
  tradizionale_romagnolo: { trattoria_classica: 0.85, cucina_di_pesce: 0.6, pizzeria: 0.5, moderna_creativa: 0.35, fine_dining: 0.3, street_food: 0.45, vegetariana: 0.4 },
  trattoria_classica: { cucina_di_pesce: 0.6, pizzeria: 0.55, moderna_creativa: 0.4, fine_dining: 0.4, street_food: 0.45, vegetariana: 0.45 },
  cucina_di_pesce: { moderna_creativa: 0.55, fine_dining: 0.6, pizzeria: 0.35, street_food: 0.35, vegetariana: 0.3 },
  moderna_creativa: { fine_dining: 0.8, vegetariana: 0.6, pizzeria: 0.3, street_food: 0.45 },
  fine_dining: { vegetariana: 0.5, pizzeria: 0.2, street_food: 0.2 },
  pizzeria: { street_food: 0.6, vegetariana: 0.4 },
  street_food: { vegetariana: 0.5 },
};

export function affinitaStile(a: Stile, b: Stile): number {
  if (a === b) return 1;
  return AFFINITA[a]?.[b] ?? AFFINITA[b]?.[a] ?? 0.4;
}

// ─────────────────────────────────────────────── Formazione

export type Formazione = "autodidatta" | "gavetta" | "corso_professionale" | "alberghiero" | "alberghiero_e_stage_stellato";

export const BONUS_FORMAZIONE: Record<Formazione, { tecnica: number; velocita: number; cortesia: number; pretesaPaga: number }> = {
  autodidatta:                  { tecnica: -1, velocita: 0,  cortesia: 0,  pretesaPaga: 0.95 },
  gavetta:                      { tecnica: 1,  velocita: 2,  cortesia: 0,  pretesaPaga: 1.0 },
  corso_professionale:          { tecnica: 2,  velocita: 0,  cortesia: 1,  pretesaPaga: 1.05 },
  alberghiero:                  { tecnica: 3,  velocita: 1,  cortesia: 2,  pretesaPaga: 1.1 },
  alberghiero_e_stage_stellato: { tecnica: 5,  velocita: 1,  cortesia: 2,  pretesaPaga: 1.3 },
};

// ─────────────────────────────────────────────── Tratti

export interface Tratto {
  id: string;
  nome: string;
  tipo: "pregio" | "difetto" | "neutro";
  descrizione: string;
  /** modifiche dirette agli attributi */
  mod?: Partial<Attributi>;
  /** moltiplicatore sulla pretesa di paga */
  pretesaPaga?: number;
  /** moltiplicatore sul morale-obiettivo */
  moraleMod?: number;
  /** probabilità mensile che il tratto generi un evento */
  probEvento?: number;
  /** visibile al colloquio? se false, si scopre lavorando */
  palese: boolean;
}

export const TRATTI: Tratto[] = [
  // ── Pregi
  { id: "instancabile", nome: "Instancabile", tipo: "pregio", palese: false, mod: { resistenza: 4 }, descrizione: "Regge i turni doppi d'agosto senza crollare." },
  { id: "sorriso", nome: "Sorriso naturale", tipo: "pregio", palese: true, mod: { cortesia: 4 }, descrizione: "I clienti lo citano nelle recensioni.", probEvento: 0.088 },
  { id: "veloce", nome: "Mani veloci", tipo: "pregio", palese: false, mod: { velocita: 4 }, descrizione: "Smaltisce le comande come una macchina." },
  { id: "mentore", nome: "Mentore", tipo: "pregio", palese: false, mod: { esperienza: 3 }, descrizione: "Fa crescere i giovani della brigata.", probEvento: 0.11 },
  { id: "creativo", nome: "Creativo", tipo: "pregio", palese: false, mod: { tecnica: 3 }, descrizione: "Propone piatti nuovi che a volte diventano signature.", probEvento: 0.11 },
  { id: "fedele", nome: "Attaccato al locale", tipo: "pregio", palese: false, moraleMod: 1.15, descrizione: "Difficile che se ne vada, anche nei momenti storti." },
  { id: "poliedrico", nome: "Poliedrico", tipo: "pregio", palese: true, mod: { velocita: 2, cortesia: 2 }, descrizione: "Copre più ruoli quando serve.", pretesaPaga: 1.08 },
  { id: "pulito", nome: "Maniacale sull'igiene", tipo: "pregio", palese: false, descrizione: "Riduce il rischio di guai col controllo sanitario.", probEvento: 0.044 },

  // ── Difetti
  { id: "ritardatario", nome: "Cronicamente in ritardo", tipo: "difetto", palese: false, mod: { velocita: -2 }, descrizione: "Il servizio parte sempre col piede sbagliato.", probEvento: 0.176 },
  { id: "permaloso", nome: "Permaloso", tipo: "difetto", palese: false, moraleMod: 0.85, descrizione: "Ogni critica diventa un caso.", probEvento: 0.154 },
  { id: "lunatico", nome: "Lunatico", tipo: "difetto", palese: false, descrizione: "Rende benissimo o malissimo, mai nel mezzo.", probEvento: 0.198 },
  { id: "brontolone", nome: "Brontolone", tipo: "difetto", palese: true, mod: { cortesia: -3 }, descrizione: "Con i clienti è ruvido.", pretesaPaga: 0.95 },
  { id: "distratto", nome: "Distratto", tipo: "difetto", palese: false, mod: { tecnica: -2 }, descrizione: "Comande sbagliate, piatti dimenticati.", probEvento: 0.154 },
  { id: "fragile", nome: "Si sfianca in fretta", tipo: "difetto", palese: false, mod: { resistenza: -4 }, descrizione: "Ad agosto è il primo a saltare.", probEvento: 0.11 },
  { id: "conflittuale", nome: "Attaccabrighe", tipo: "difetto", palese: false, moraleMod: 0.9, descrizione: "Litiga con la brigata: contagia il morale degli altri.", probEvento: 0.176 },
  { id: "assenteista", nome: "Assenze frequenti", tipo: "difetto", palese: false, descrizione: "Chiama malato nei weekend pieni.", probEvento: 0.22 },

  // ── Neutri / caratterizzanti
  { id: "ambizioso", nome: "Ambizioso", tipo: "neutro", palese: true, mod: { tecnica: 2 }, pretesaPaga: 1.15, descrizione: "Cresce in fretta, ma vuole avanzamenti: se non arrivano, se ne va.", probEvento: 0.132 },
  { id: "sindacalizzato", nome: "Conosce i suoi diritti", tipo: "neutro", palese: true, descrizione: "Non accetta irregolarità e pretende il contratto giusto.", probEvento: 0.11 },
  { id: "studente", nome: "Studente", tipo: "neutro", palese: true, pretesaPaga: 0.9, descrizione: "Disponibile solo part-time e nei weekend.", probEvento: 0.088 },
  { id: "straniero", nome: "Appena arrivato in città", tipo: "neutro", palese: true, descrizione: "Cerca stabilità e alloggio: molto motivato, poca rete locale.", moraleMod: 1.05 },
  { id: "secondo_lavoro", nome: "Ha un secondo lavoro", tipo: "neutro", palese: false, mod: { resistenza: -2 }, descrizione: "Arriva già stanco, ma non molla mai il posto.", probEvento: 0.11 },
];

// ─────────────────────────────────────────────── Situazione familiare

export type Famiglia = "single" | "convivente" | "famiglia_con_figli" | "genitore_solo" | "figlio_di_ristoratori";

export const EFFETTI_FAMIGLIA: Record<Famiglia, { moraleMod: number; pretesaStabilita: number; probEvento: number; nota: string }> = {
  single:                 { moraleMod: 1.0,  pretesaStabilita: 0.4, probEvento: 0.044, nota: "Flessibile su orari e stagioni." },
  convivente:             { moraleMod: 1.02, pretesaStabilita: 0.6, probEvento: 0.066, nota: "Vuole almeno una sera libera." },
  famiglia_con_figli:     { moraleMod: 1.0,  pretesaStabilita: 0.9, probEvento: 0.132, nota: "Serve contratto regolare e orari prevedibili." },
  genitore_solo:          { moraleMod: 0.98, pretesaStabilita: 1.0, probEvento: 0.176, nota: "Non può fare doppi turni: gestione figli." },
  figlio_di_ristoratori:  { moraleMod: 1.05, pretesaStabilita: 0.5, probEvento: 0.066, nota: "Cresciuto tra i tavoli: capisce il mestiere." },
};

// ─────────────────────────────────────────────── Pretese contrattuali

export type TipoContratto = "full_regolare" | "part_time_regolare" | "misto" | "tutto_nero" | "stagionale";

export interface Pretese {
  contratto: TipoContratto;
  /** superminimo minimo accettato (1 = minimo CCNL) */
  superminimoMinimo: number;
  /** accetta di lavorare in nero? */
  accettaNero: boolean;
  /** pretende un giorno di riposo fisso */
  vuoleRiposoFisso: boolean;
  /** quanto vuole portare a casa al mese, full time. È il numero che il
   *  giocatore deve accontentare: il moltiplicatore CCNL non dice niente. */
  nettoDesiderato: number;
  nota: string;
}

export interface Candidato {
  id: string;
  nome: string;
  eta: number;
  ruolo: RuoloEsteso;
  attributi: Attributi;
  stile: Stile;
  formazione: Formazione;
  tratti: Tratto[];
  famiglia: Famiglia;
  pretese: Pretese;
  /** quanto costa al mese come lordo base, prima del superminimo */
  lordoBaseMensile: number;
  /** affidabilità vera 0-100: al colloquio non si vede quasi per niente */
  affidabilita: number;
  /** attributi mostrati al giocatore come forbice (incertezza) */
  vetrina: {
    attributi: Record<keyof Attributi, [number, number]>;
    /** l'unica cosa che conta davvero è anche la più opaca */
    affidabilita: [number, number];
    trattiVisibili: Tratto[];
    trattiNascosti: number; // quanti ce ne sono che non vede
  };
  /** da dove arriva: candidatura spontanea o risposta a un annuncio */
  provenienza?: "spontanea" | "annuncio";
}

// ─────────────────────────────────────────────── Generatore

const NOMI = ["Luca", "Marco", "Sara", "Anna", "Giulia", "Pavel", "Ines", "Teo", "Rachele", "Nicola",
  "Amina", "Youssef", "Elena", "Davide", "Chiara", "Samir", "Federica", "Alin", "Matteo", "Sofia",
  "Gianni", "Rosa", "Ionut", "Valentina", "Omar", "Beatrice", "Dritan", "Lucia", "Andrea", "Nadia"];
const COGNOMI = ["Bianchi", "Rossi", "Casadei", "Montanari", "Fabbri", "Gori", "Pruccoli", "Zavatta",
  "Ricci", "Amati", "Berti", "Savini", "Dellamotta", "Tonini", "Guerra", "Sacchetti"];

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function gauss(rng: () => number): number {
  return (rng() + rng() + rng() - 1.5) / 1.5; // ≈ -1..1 con picco al centro
}

export interface OpzioniMercato {
  /** ruoli che il giocatore sta cercando; vuoto = mix casuale */
  ruoliCercati?: RuoloEsteso[];
  /** qualità media del bacino: peggiora in alta stagione (tutti già assunti) */
  qualitaBacino?: number; // 0.5 (scarso) .. 1.5 (ottimo)
  /** in alta stagione i candidati alzano le pretese */
  pressioneStagionale?: number; // 1 = normale, 1.3 = agosto
}

export function generaCandidato(id: string, opt: OpzioniMercato, rng: () => number): Candidato {
  const ruolo = opt.ruoliCercati?.length ? pick(opt.ruoliCercati, rng) : pick(Object.keys(REPARTO) as RuoloEsteso[], rng);
  const qualita = opt.qualitaBacino ?? 1;
  const eta = Math.round(18 + Math.abs(gauss(rng)) * 28);

  // base attributi: cresce con età (esperienza) e qualità del bacino
  const base = 6 + qualita * 4 + Math.min(6, (eta - 18) * 0.25);
  const formazione = pick(Object.keys(BONUS_FORMAZIONE) as Formazione[], rng);
  const bf = BONUS_FORMAZIONE[formazione];
  const a = (extra = 0) => Math.max(1, Math.min(20, Math.round(base + gauss(rng) * 4 + extra)));
  const attributi: Attributi = {
    tecnica: a(bf.tecnica),
    velocita: a(bf.velocita),
    cortesia: a(bf.cortesia + (REPARTO[ruolo] === "sala" ? 2 : -1)),
    resistenza: a(0),
    esperienza: Math.max(1, Math.min(20, Math.round((eta - 16) * 0.55 + gauss(rng) * 3))),
  };

  // tratti: 1-3, con più difetti se il bacino è scarso
  const nTratti = 1 + Math.floor(rng() * 3);
  const tratti: Tratto[] = [];
  for (let i = 0; i < nTratti; i++) {
    const pool = rng() < (qualita > 1 ? 0.55 : 0.35)
      ? TRATTI.filter((t) => t.tipo === "pregio")
      : TRATTI.filter((t) => t.tipo !== "pregio");
    const t = pick(pool, rng);
    if (!tratti.find((x) => x.id === t.id)) tratti.push(t);
  }
  for (const t of tratti) {
    for (const [k, v] of Object.entries(t.mod ?? {})) {
      attributi[k as keyof Attributi] = Math.max(1, Math.min(20, attributi[k as keyof Attributi] + (v as number)));
    }
  }

  const famiglia = pick(Object.keys(EFFETTI_FAMIGLIA) as Famiglia[], rng);
  const stile = pick(Object.keys(AFFINITA) as Stile[], rng);
  const pretese = generaPretese(tratti, famiglia, eta, attributi, bf.pretesaPaga, opt.pressioneStagionale ?? 1, rng);
  // quello che vuole portare a casa: è il numero che il giocatore deve centrare
  pretese.nettoDesiderato = Math.round(nettoDesiderato(ruolo, pretese.superminimoMinimo));

  // vetrina: incertezza maggiore per i giovani (meno storico verificabile)
  const incertezza = eta < 25 ? 4 : eta < 35 ? 3 : 2;
  const forbice = (v: number): [number, number] => [Math.max(1, v - incertezza), Math.min(20, v + incertezza)];
  const visibili = tratti.filter((t) => t.palese);

  // Affidabilità: asse indipendente dalla competenza. È il motivo per cui
  // vale la pena investire sul ragazzo poco formato che non manca un turno.
  const trattiSu = new Set(["leale", "ordinato", "instancabile", "mentore", "risparmioso"]);
  const trattiGiu = new Set(["ritardatario", "beve", "cellulare_in_mano", "testa_calda", "sbadato", "fumatore"]);
  let affid = 50 + (attributi.esperienza - 10) * 1.2 + (rng() - 0.5) * 28;
  for (const t of tratti) {
    if (trattiSu.has(t.id)) affid += 9;
    if (trattiGiu.has(t.id)) affid -= 9;
  }
  affid = Math.max(5, Math.min(95, Math.round(affid)));
  // al colloquio si intuisce poco: forbice larghissima, stretta solo dalle referenze
  const incAffid = eta < 25 ? 30 : eta < 40 ? 24 : 18;

  return {
    id, nome: `${pick(NOMI, rng)} ${pick(COGNOMI, rng)}`, eta, ruolo, attributi, stile,
    formazione, tratti, famiglia, pretese,
    affidabilita: affid,
    lordoBaseMensile: Math.round(1_500 * LIVELLO_CCNL[ruolo]),
    vetrina: {
      affidabilita: [Math.max(0, affid - incAffid), Math.min(100, affid + incAffid)],
      attributi: {
        tecnica: forbice(attributi.tecnica), velocita: forbice(attributi.velocita),
        cortesia: forbice(attributi.cortesia), resistenza: forbice(attributi.resistenza),
        esperienza: forbice(attributi.esperienza),
      },
      trattiVisibili: visibili,
      trattiNascosti: tratti.length - visibili.length,
    },
  };
}

function generaPretese(
  tratti: Tratto[], famiglia: Famiglia, eta: number, attr: Attributi,
  moltFormazione: number, pressione: number, rng: () => number
): Pretese {
  const fam = EFFETTI_FAMIGLIA[famiglia];
  const sindacalizzato = tratti.some((t) => t.id === "sindacalizzato");
  const studente = tratti.some((t) => t.id === "studente");
  const secondoLavoro = tratti.some((t) => t.id === "secondo_lavoro");

  let contratto: TipoContratto;
  let accettaNero: boolean;
  if (sindacalizzato || famiglia === "famiglia_con_figli" || famiglia === "genitore_solo") {
    contratto = "full_regolare"; accettaNero = false;
  } else if (studente) {
    contratto = rng() < 0.4 ? "tutto_nero" : "part_time_regolare"; accettaNero = true;
  } else if (secondoLavoro) {
    contratto = rng() < 0.6 ? "tutto_nero" : "part_time_regolare"; accettaNero = true;
  } else {
    const r = rng();
    contratto = r < 0.45 ? "full_regolare" : r < 0.65 ? "part_time_regolare" : r < 0.85 ? "misto" : "stagionale";
    accettaNero = contratto !== "full_regolare" && rng() < 0.6;
  }

  // pretesa di paga: qualità + formazione + tratti + pressione del mercato.
  // Il minimo CCNL è un pavimento di legge: nessuno può chiedere meno di 1.0.
  const qualitaMedia = (attr.tecnica + attr.velocita + attr.cortesia + attr.esperienza) / 4;
  let sup = 1.0 + Math.max(-0.02, (qualitaMedia - 10) * 0.016);
  sup *= 1 + (moltFormazione - 1) * 0.5; // la formazione pesa, ma non raddoppia
  for (const t of tratti) sup *= 1 + ((t.pretesaPaga ?? 1) - 1) * 0.6;
  sup *= 1 + (pressione - 1) * 0.6;
  if (eta > 45) sup *= 1.03;
  sup = Math.max(1.0, Math.min(1.45, sup)); // pavimento CCNL, tetto di mercato

  const note: string[] = [];
  if (contratto === "tutto_nero") note.push("preferisce il cash, niente contratto");
  if (contratto === "misto") note.push("una parte in busta, una fuori");
  if (!accettaNero) note.push("solo contratto regolare");
  if (fam.pretesaStabilita > 0.8) note.push(fam.nota);
  if (studente) note.push("disponibile solo weekend e sere");

  const superminimoMinimo = Math.round(sup * 100) / 100;
  return {
    contratto, accettaNero, superminimoMinimo,
    vuoleRiposoFisso: fam.pretesaStabilita > 0.7 || sindacalizzato,
    // riempito da generaCandidato, che conosce il ruolo
    nettoDesiderato: 0,
    nota: note.join("; ") || "flessibile",
  };
}

/** Genera il bacino di candidati disponibili questo mese. */
export function generaMercato(mese: number, opt: OpzioniMercato, rng: () => number, quanti = 6): Candidato[] {
  // in alta stagione (giugno-agosto) il bacino è povero e le pretese alte
  const altaStagione = mese >= 6 && mese <= 8;
  const opzioni: OpzioniMercato = {
    ...opt,
    qualitaBacino: (opt.qualitaBacino ?? 1) * (altaStagione ? 0.75 : 1.1),
    pressioneStagionale: (opt.pressioneStagionale ?? 1) * (altaStagione ? 1.25 : 1),
  };
  return Array.from({ length: quanti }, (_, i) => generaCandidato(`c${mese}-${i}-${Math.floor(rng() * 1e6)}`, opzioni, rng));
}

// ─────────────────────────────────────────────── Offerta e assunzione

export interface Offerta {
  candidatoId: string;
  contratto: TipoContratto;
  superminimo: number;
  inRegola: boolean;
  riposoFisso: boolean;
  stagionaleFinoAlMese?: number;
  /** forma contrattuale per la busta paga (vedi contratti.ts):
   *  indeterminato | determinato | apprendistato | intermittente |
   *  stagionale | somministrazione. Default: indeterminato. */
  tipoContrattuale?: string;
  /** quota delle ore reali NON messa in busta (0 = tutto in chiaro,
   *  1 = tutto in nero). Sostituisce il solo booleano inRegola. */
  quotaNero?: number;
  /** orario su cui è stata costruita l'offerta (per l'anteprima) */
  orario?: Orario;
}

export interface EsitoOfferta {
  accettata: boolean;
  motivo: string;
  /** morale di partenza: se ha accettato controvoglia, parte basso */
  moraleIniziale: number;
}

export function valutaOfferta(c: Candidato, o: Offerta, rng: () => number): EsitoOfferta {
  const p = c.pretese;
  const quotaNero = o.quotaNero ?? (o.inRegola ? 0 : 1);
  const orario = o.orario ?? { oreFeriali: 24, oreFestive: 16 };

  // Una quota piccola fuori busta la accettano quasi tutti; il rifiuto
  // scatta quando il contratto sparisce o quasi.
  if (quotaNero > 0.15 && !p.accettaNero) {
    return {
      accettata: false,
      motivo: quotaNero >= 0.85
        ? `${c.nome} non lavora senza contratto.`
        : `${c.nome} non ci sta: ${Math.round(quotaNero * 100)}% fuori busta significa contributi e malattia a metà.`,
      moraleIniziale: 0,
    };
  }
  if (p.vuoleRiposoFisso && !o.riposoFisso && rng() < 0.7)
    return { accettata: false, motivo: `${c.nome} ha bisogno di un giorno di riposo fisso.`, moraleIniziale: 0 };
  if (p.contratto === "full_regolare" && o.contratto === "stagionale" && rng() < 0.75)
    return { accettata: false, motivo: `${c.nome} cerca continuità, non un contratto estivo.`, moraleIniziale: 0 };

  // Il candidato guarda quello che porta a casa, non il moltiplicatore CCNL.
  const nettoOfferto = anteprimaOfferta(c.ruolo, o.superminimo, orario, quotaNero).nettoTotale;
  const voluto = p.nettoDesiderato > 0 ? p.nettoDesiderato : nettoDesiderato(c.ruolo, p.superminimoMinimo);
  const gapNetto = voluto > 0 ? (nettoOfferto - voluto) / voluto : 0;

  if (gapNetto < -0.10)
    return {
      accettata: false,
      motivo: `Offerta troppo bassa: ${c.nome} vuole almeno ${Math.round(voluto)}€ netti al mese, ` +
        `qui ne porta a casa ${Math.round(nettoOfferto)}.`,
      moraleIniziale: 0,
    };
  if (gapNetto < 0 && rng() < 0.5)
    return { accettata: false, motivo: `${c.nome} ci ha pensato ma ha rifiutato: sotto le aspettative di ${Math.round(voluto - nettoOfferto)}€ netti.`, moraleIniziale: 0 };

  const gap = gapNetto;
  const morale = Math.max(35, Math.min(90, 60 + gap * 150 + (quotaNero > 0.5 ? -12 : quotaNero > 0 ? -4 : 5)));
  return {
    accettata: true,
    motivo: gap >= 0.1 ? `${c.nome} accetta con entusiasmo!` : gap >= 0 ? `${c.nome} accetta.` : `${c.nome} accetta, ma non è convinto della paga.`,
    moraleIniziale: Math.round(morale),
  };
}

/** Converte un candidato assunto in un dipendente giocabile. */
export function assumi(c: Candidato, o: Offerta, esito: EsitoOfferta): DipendenteEsteso & {
  stile: Stile; tratti: Tratto[]; famiglia: Famiglia; formazione: Formazione;
  ruoloEsteso: RuoloEsteso; adattamentoStile: number; stagionaleFinoAlMese?: number;
  tipoContrattuale: string; quotaNero: number;
} {
  // ruolo mappato su quelli che il motore paga (CCNL semplificato)
  const mappa: Record<RuoloEsteso, DipendenteEsteso["ruolo"]> = {
    lavapiatti: "lavapiatti", runner: "commis", commis: "commis", cameriere: "cameriere",
    chef_de_rang: "cameriere", barista: "barista", pizzaiolo: "cuoco", cuoco: "cuoco",
    sous_chef: "cuoco", chef: "chef", pasticcere: "cuoco", maitre: "direttore",
    sommelier: "cameriere", direttore: "direttore",
  };
  return {
    id: c.id, nome: c.nome, ruolo: mappa[c.ruolo], inRegola: o.inRegola,
    superminimo: o.superminimo, attributi: { ...c.attributi }, morale: esito.moraleIniziale,
    stile: c.stile, tratti: c.tratti, famiglia: c.famiglia, formazione: c.formazione,
    ruoloEsteso: c.ruolo, adattamentoStile: 0, // cresce mese dopo mese
    stagionaleFinoAlMese: o.stagionaleFinoAlMese,
    tipoContrattuale: o.tipoContrattuale ?? "indeterminato",
    quotaNero: o.quotaNero ?? (o.inRegola ? 0 : 1),
  };
}

// ─────────────────────────────────────────────── Adattamento allo stile del locale

/**
 * Un dipendente col suo stile rende meno finché non si adatta a quello del
 * locale. L'adattamento cresce ogni mese: veloce se l'affinità è alta,
 * lentissimo (e mai completo) se gli stili sono agli antipodi.
 * Ritorna il moltiplicatore di performance da applicare (0.7..1.05).
 */
export function aggiornaAdattamento(
  d: { stile: Stile; adattamentoStile: number; attributi: Attributi },
  stileLocale: Stile
): { moltiplicatore: number; evento?: string } {
  const aff = affinitaStile(d.stile, stileLocale);
  const tetto = 0.55 + aff * 0.45; // stili opposti non arrivano mai al massimo
  const velocita = 0.08 + aff * 0.12 + (d.attributi.esperienza / 20) * 0.06;
  const prima = d.adattamentoStile;
  d.adattamentoStile = Math.min(tetto, d.adattamentoStile + velocita * (tetto - d.adattamentoStile));
  const molt = 0.7 + d.adattamentoStile * 0.35;
  let evento: string | undefined;
  if (prima < 0.5 && d.adattamentoStile >= 0.5) evento = "si è ambientato: ora rende al meglio";
  else if (prima === 0 && aff < 0.45) evento = "fatica ad adattarsi allo stile del locale";
  return { moltiplicatore: Math.min(1.05, molt), evento };
}

// ─────────────────────────────────────────────── Eventi generati dai tratti

export interface EventoDipendente {
  dipendenteId: string;
  testo: string;
  effetti: { moraleDelta?: number; moraleBrigata?: number; reputazioneDelta?: number; costo?: number; attributoUp?: keyof Attributi };
}

const EVENTI_TRATTO: Record<string, (nome: string, rng: () => number) => EventoDipendente["effetti"] & { testo: string }> = {
  sorriso: (n) => ({ testo: `⭐ Una recensione cita ${n} per la gentilezza.`, reputazioneDelta: 0.02, moraleDelta: 5 }),
  mentore: (n) => ({ testo: `🎓 ${n} sta formando i più giovani della brigata.`, moraleBrigata: 4 }),
  creativo: (n) => ({ testo: `👨‍🍳 ${n} propone un piatto nuovo: i clienti lo adorano.`, reputazioneDelta: 0.03, moraleDelta: 6 }),
  pulito: (n) => ({ testo: `🧼 ${n} ha rimesso a norma la cella: controllo sanitario passato senza rilievi.` }),
  ritardatario: (n) => ({ testo: `⏰ ${n} è arrivato tardi nel pieno del servizio: caos in sala.`, reputazioneDelta: -0.015 }),
  permaloso: (n) => ({ testo: `😤 ${n} l'ha presa male per un rimprovero: muso lungo tutta la settimana.`, moraleDelta: -10 }),
  lunatico: (n, rng) => rng() < 0.5
    ? { testo: `✨ Serata di grazia per ${n}: servizio impeccabile.`, reputazioneDelta: 0.02 }
    : { testo: `🌧️ Giornata no per ${n}: piatti in ritardo e clienti scontenti.`, reputazioneDelta: -0.02 },
  distratto: (n) => ({ testo: `🍝 ${n} ha sbagliato tre comande: piatti rifatti e un tavolo non paga.`, costo: 120, reputazioneDelta: -0.02 }),
  fragile: (n) => ({ testo: `😮‍💨 ${n} ha chiesto di staccare prima: non regge il ritmo.`, moraleDelta: -6 }),
  conflittuale: (n) => ({ testo: `⚔️ Lite in cucina: ${n} ha alzato la voce con la brigata.`, moraleBrigata: -8 }),
  assenteista: (n) => ({ testo: `🤒 ${n} dà buca nel weekend pieno: si va sotto organico.`, moraleBrigata: -4 }),
  ambizioso: (n) => ({ testo: `📈 ${n} chiede più responsabilità: se non arrivano, guarderà altrove.`, moraleDelta: -8 }),
  sindacalizzato: (n) => ({ testo: `📋 ${n} fa notare un'irregolarità nei turni: meglio metterla a posto.`, moraleBrigata: 2 }),
  studente: (n) => ({ testo: `📚 Sessione d'esami: ${n} chiede due settimane di disponibilità ridotta.` }),
  secondo_lavoro: (n) => ({ testo: `😴 ${n} arriva stanco dall'altro lavoro.`, moraleDelta: -4 }),
};

/** Tira gli eventi del mese per tutta la brigata. */
export function eventiDipendenti(
  staff: Array<{ id: string; nome: string; tratti?: Tratto[]; famiglia?: Famiglia }>,
  rng: () => number
): EventoDipendente[] {
  const out: EventoDipendente[] = [];
  for (const d of staff) {
    for (const t of d.tratti ?? []) {
      if (!t.probEvento || rng() > t.probEvento) continue;
      const gen = EVENTI_TRATTO[t.id];
      if (!gen) continue;
      const { testo, ...effetti } = gen(d.nome, rng);
      out.push({ dipendenteId: d.id, testo, effetti });
    }
    // eventi familiari
    const fam = d.famiglia ? EFFETTI_FAMIGLIA[d.famiglia] : null;
    if (fam && rng() < fam.probEvento) {
      out.push({
        dipendenteId: d.id,
        testo: d.famiglia === "genitore_solo" || d.famiglia === "famiglia_con_figli"
          ? `👨‍👩‍👧 ${d.nome} ha un'emergenza familiare: salta il turno.`
          : `🏠 ${d.nome} chiede un cambio turno per motivi personali.`,
        effetti: { moraleDelta: -3 },
      });
    }
  }
  return out;
}


// ─────────────────────────────────────────────── CV e annunci

/**
 * ASSUNZIONI — non c'è più una vetrina di candidati sempre disponibile.
 * Ci sono due flussi, come nella realtà:
 *
 * SPONTANEO: ogni mese arrivano poche candidature, a caso, e la qualità
 *   dipende da quanto sei conosciuto. Se nessuno ti conosce, ti arriva
 *   quello che avanza.
 *
 * ANNUNCIO: pubblichi per uno o più ruoli, paghi, e ricevi più candidati
 *   mirati. In alta stagione costa di più e rende di meno: i bravi
 *   lavorano già.
 */

export const COSTO_ANNUNCIO = 180;

export interface Annuncio {
  ruolo: RuoloEsteso;
  /** quanto spendi: più spendi, più candidature e migliori */
  budget?: number;
}

export interface EsitoAssunzioni {
  cv: Candidato[];
  costo: number;
  eventi: string[];
}

/** Quante candidature spontanee arrivano, in base a quanto sei noto. */
function quantiSpontanei(reputazione: number, mese: number, rng: () => number): number {
  const altaStagione = mese >= 6 && mese <= 8;
  const base = 0.5 + reputazione * 2.2;
  const n = base * (altaStagione ? 0.5 : 1.15);
  return Math.max(0, Math.round(n - 0.5 + rng()));
}

export function raccogliCandidature(
  reputazione: number,
  mese: number,
  annunci: Annuncio[],
  rng: () => number
): EsitoAssunzioni {
  const eventi: string[] = [];
  const cv: Candidato[] = [];
  let costo = 0;
  const altaStagione = mese >= 6 && mese <= 8;

  // ── Candidature spontanee
  const n = quantiSpontanei(reputazione, mese, rng);
  for (let i = 0; i < n; i++) {
    const c = generaCandidato(`cv-${mese}-${i}-${Math.floor(rng() * 1e6)}`, {
      qualitaBacino: 0.85 + reputazione * 0.4,
      pressioneStagionale: altaStagione ? 1.3 : 0.95,
    }, rng);
    c.provenienza = "spontanea";
    cv.push(c);
  }
  if (n > 0) eventi.push(`📨 ${n} candidatur${n === 1 ? "a spontanea" : "e spontanee"} in casella.`);
  else if (annunci.length === 0) eventi.push("📭 Nessuna candidatura questo mese. Se ti serve gente, pubblica un annuncio.");

  // ── Annunci pubblicati
  for (const a of annunci) {
    const budget = Math.max(COSTO_ANNUNCIO, a.budget ?? COSTO_ANNUNCIO);
    costo += budget * (altaStagione ? 1.4 : 1);
    // più budget = più risposte, con rendimenti decrescenti
    const risposte = Math.max(1, Math.round((1.2 + Math.log1p(budget / COSTO_ANNUNCIO) * 1.6) * (altaStagione ? 0.6 : 1)));
    for (let i = 0; i < risposte; i++) {
      const c = generaCandidato(`ann-${a.ruolo}-${i}-${Math.floor(rng() * 1e6)}`, {
        ruoliCercati: [a.ruolo],
        qualitaBacino: (0.9 + reputazione * 0.5) * (altaStagione ? 0.7 : 1.1),
        pressioneStagionale: altaStagione ? 1.35 : 1,
      }, rng);
      c.provenienza = "annuncio";
      cv.push(c);
    }
    eventi.push(
      `📢 Annuncio per ${a.ruolo}: ${risposte} rispost${risposte === 1 ? "a" : "e"}, ${Math.round(budget * (altaStagione ? 1.4 : 1))}€.` +
      (altaStagione ? " In stagione costa di più e risponde di meno: i bravi lavorano già." : "")
    );
  }

  return { cv, costo: Math.round(costo), eventi };
}

/** I CV non restano in casella per sempre: chi non richiami trova altro. */
export function scadenzaCandidature(cv: Candidato[], rng: () => number): { restano: Candidato[]; persi: number } {
  const restano = cv.filter(() => rng() > 0.45);
  return { restano, persi: cv.length - restano.length };
}