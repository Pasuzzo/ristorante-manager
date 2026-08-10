/**
 * IL TITOLARE — la scheda del giocatore, e la lezione più dura del gioco:
 * fare tutto da soli costa meno in euro e di più in salute.
 *
 * Meccanica: ogni area del ristorante può essere gestita in tre modi —
 * la fai TU (risparmi, accumuli stress), la DELEGHI a chi ne è capace
 * (costa, ma solo se hai la persona giusta rende), la AUTOMATIZZI dove
 * si può (costo fisso, stress quasi zero). Lo stress si accumula mese
 * dopo mese; sopra la soglia scatta il BURNOUT, e in burnout gestisci
 * peggio: decisioni bloccate, squadra demoralizzata, errori che costano.
 *
 * Il gioco non punisce chi fa da sé all'inizio (è realistico: si parte
 * così), punisce chi NON COSTRUISCE mai l'organizzazione per smettere.
 */

import { DipendenteEsteso } from "./reputazione.ts";

// ─────────────────────────────────────────────── Scheda

export type Sesso = "M" | "F";

export interface Titolare {
  nome: string;
  eta: number;
  sesso: Sesso; // usato anche dai bandi (impresa femminile/giovanile)
  /** 0 = sereno … 100 = al limite */
  stress: number;
  burnout: boolean;
  mesiInBurnout: number;
  /** storico per il grafico in UI */
  storicoStress: number[];
}

export function nuovoTitolare(nome: string, eta: number, sesso: Sesso): Titolare {
  return { nome, eta, sesso, stress: 20, burnout: false, mesiInBurnout: 0, storicoStress: [20] };
}

// ─────────────────────────────────────────────── Compiti

/** Come viene gestita ciascuna area. */
export interface GestioneCompiti {
  /** chi porta le materie prime */
  approvvigionamento: "consegna" | "ritiro_diretto";
  /** contabilità, F24, email del commercialista */
  amministrazione: "delegata" | "fai_da_te";
  /** prenotazioni: telefono in mano al titolare o sistema online */
  prenotazioni: "software" | "telefono";
  /** contenuti social: agenzia/dipendente o il titolare la sera tardi */
  social: "delegato" | "titolare";
  /** il titolare copre un ruolo operativo nei servizi */
  ruoloCoperto: "cucina" | "sala" | null;
}

export const COMPITI_DEFAULT: GestioneCompiti = {
  approvvigionamento: "consegna",
  amministrazione: "delegata",
  prenotazioni: "telefono",
  social: "titolare",
  ruoloCoperto: null,
};

/** Effetti economici e di stress di ogni scelta. */
export const EFFETTI_COMPITI = {
  approvvigionamento: {
    consegna: { costoFoodCost: +0.018, stress: 0.5, nota: "Il grossista consegna: comodo, ma il listino lo fa lui." },
    ritiro_diretto: { costoFoodCost: -0.022, stress: 6, nota: "Alle 5 al mercato: risparmi e scegli il meglio, ma le ore sono le tue." },
  },
  amministrazione: {
    delegata: { costoMese: 90, stress: 1, nota: "Il commercialista gestisce tutto: tu firmi." },
    fai_da_te: { costoMese: 0, stress: 5, probErrore: 0.06, nota: "Fatture ed F24 te li vedi tu, la sera. Un errore può costare caro." },
  },
  prenotazioni: {
    software: { costoMese: 45, stress: 0.5, nota: "Prenotazioni online: il telefono smette di squillare." },
    telefono: { costoMese: 0, stress: 3, nota: "Il telefono in tasca sempre, anche il lunedì." },
  },
  social: {
    delegato: { costoMese: 280, stress: 0.5, nota: "Contenuti in mano a chi lo sa fare." },
    titolare: { costoMese: 0, stress: 4, moltEfficaciaSocial: 0.7, nota: "Foto e post a mezzanotte, dopo il servizio." },
  },
  copertura: {
    cucina: { stressBase: 9, nota: "Ai fornelli tutti i servizi: un cuoco in meno da pagare." },
    sala: { stressBase: 7, nota: "In sala tutti i servizi: un cameriere in meno da pagare." },
  },
} as const;

// ─────────────────────────────────────────────── Il titolare al lavoro

/**
 * Quando copre un ruolo, il titolare vale come un dipendente di livello
 * medio, sempre motivato (è casa sua)… finché non è in burnout: allora
 * rende la metà e lo si vede.
 */
export function titolareComeDipendente(t: Titolare, reparto: "cucina" | "sala"): DipendenteEsteso {
  const base = t.burnout ? 6 : 11;
  const esperienza = Math.min(18, 6 + Math.max(0, t.eta - 25) / 3);
  return {
    id: "__titolare__",
    nome: `${t.nome} (titolare)`,
    ruolo: reparto === "cucina" ? "cuoco" : "cameriere",
    inRegola: true,
    superminimo: 0, // non si paga uno stipendio: preleva dall'utile
    attributi: { tecnica: base, velocita: base, cortesia: base + 1, resistenza: t.burnout ? 4 : 10, esperienza },
    morale: t.burnout ? 30 : 80,
  };
}

// ─────────────────────────────────────────────── Stress mensile

export interface ContestoStress {
  compiti: GestioneCompiti;
  /** coperti serviti / capacità: il pieno d'agosto pesa anche sul titolare */
  caricoLavoro: number;
  /** la cassa in rosso non fa dormire */
  cassaInRosso: boolean;
  /** eventi del mese che pesano (ispezioni, liti, guasti) */
  eventiPesanti: number;
  /** il locale osserva un giorno di chiusura */
  riposoSettimanale: boolean;
  /** c'è un direttore/maitre bravo a cui appoggiarsi */
  haDirettore: boolean;
  moraleMedioSquadra: number; // 0-100
}

export interface EsitoStress {
  stressAccumulato: number;
  stressRecuperato: number;
  eventi: string[];
  /** costo di eventuali errori amministrativi del fai-da-te */
  costoErrori: number;
}

export function aggiornaStress(t: Titolare, ctx: ContestoStress, rng: () => number): EsitoStress {
  const E = EFFETTI_COMPITI;
  const eventi: string[] = [];
  let acc = 2; // gestire un ristorante non è mai a stress zero
  let costoErrori = 0;

  acc += E.approvvigionamento[ctx.compiti.approvvigionamento].stress;
  acc += E.amministrazione[ctx.compiti.amministrazione].stress;
  acc += E.prenotazioni[ctx.compiti.prenotazioni].stress;
  acc += E.social[ctx.compiti.social].stress;

  if (ctx.compiti.ruoloCoperto) {
    const base = E.copertura[ctx.compiti.ruoloCoperto].stressBase;
    acc += base * Math.max(0.6, Math.min(1.8, ctx.caricoLavoro)); // in alta stagione pesa il doppio
  }
  if (ctx.compiti.amministrazione === "fai_da_te" && rng() < E.amministrazione.fai_da_te.probErrore) {
    costoErrori = 180 + Math.round(rng() * 650);
    eventi.push(`🧾 Errore in un F24 compilato di notte: sanzione e ravvedimento, ${costoErrori}€.`);
    acc += 4;
  }
  if (ctx.caricoLavoro > 1.05) acc += 4;
  if (ctx.cassaInRosso) acc += 6;
  acc += ctx.eventiPesanti * 2.5;
  if (t.eta > 55) acc *= 1.15; // il fisico non è più quello dei trenta

  // recupero
  let rec = 3;
  if (ctx.riposoSettimanale) rec += 4;
  if (ctx.haDirettore) rec += 4;
  if (ctx.moraleMedioSquadra > 65) rec += 2; // una squadra che gira ti toglie peso
  const nDeleghe =
    Number(ctx.compiti.approvvigionamento === "consegna") +
    Number(ctx.compiti.amministrazione === "delegata") +
    Number(ctx.compiti.prenotazioni === "software") +
    Number(ctx.compiti.social === "delegato") +
    Number(ctx.compiti.ruoloCoperto === null);
  if (nDeleghe >= 4) rec += 3; // organizzazione vera: si respira

  t.stress = Math.max(0, Math.min(100, t.stress + acc - rec));
  t.storicoStress.push(Math.round(t.stress));
  if (t.storicoStress.length > 120) t.storicoStress.shift();

  // ── Burnout: ingresso, permanenza, uscita
  if (!t.burnout && t.stress >= 85 && rng() < (t.stress - 80) / 40) {
    t.burnout = true;
    t.mesiInBurnout = 0;
    eventi.push(`🔥 BURNOUT. ${t.nome} non ce la fa più: notti insonni, zero lucidità. Finché non molli qualcosa, gestirai peggio.`);
  } else if (t.stress >= 70 && !t.burnout) {
    eventi.push(`😮‍💨 ${t.nome} è al limite (stress ${Math.round(t.stress)}): delega qualcosa prima che si spezzi.`);
  }
  if (t.burnout) {
    t.mesiInBurnout++;
    if (t.stress < 50) {
      t.burnout = false;
      eventi.push(`🌤️ ${t.nome} sta tornando in sé dopo ${t.mesiInBurnout} mesi difficili.`);
      t.mesiInBurnout = 0;
    }
  }

  return { stressAccumulato: acc, stressRecuperato: rec, eventi, costoErrori };
}

// ─────────────────────────────────────────────── Effetti del burnout

/**
 * In burnout il titolare gestisce peggio. Il motore applica:
 * - gradimento clienti ×0.9 (la sala sente che il capo non c'è con la testa)
 * - morale squadra −4/mese (il malumore scende dall'alto)
 * - decisioni "di visione" bloccate: ristrutturazioni, cambi listino,
 *   nuovi servizi. Restano possibili quelle di sopravvivenza (aumenti,
 *   licenziamenti, delega dei compiti — mollare la presa è la via d'uscita)
 * - errori operativi casuali (ordini sbagliati, doppie prenotazioni)
 */
export const EFFETTI_BURNOUT = {
  malusMoraleSquadra: 4,
  probErroreOperativo: 0.45,
  costoErroreMin: 250,
  costoErroreMax: 1_800,
  decisioniBloccate: ["ristrutturazione", "listino", "servizi", "qualitaMaterie"] as const,
  /** dopo questi mesi di burnout continuo, il fisico può cedere */
  mesiPrimaDelCrollo: 6,
  probCrolloMensile: 0.14,
  /** il crollo taglia il servizio del mese e obbliga al riposo */
  tagliaServiti: 0.72,
} as const;

/** Il danno al gradimento CRESCE col protrarsi del burnout: il primo mese
 *  i clienti non se ne accorgono, dopo un anno il locale è alla deriva. */
export function moltGradimentoBurnout(mesiInBurnout: number): number {
  return Math.max(0.68, 0.93 - mesiInBurnout * 0.022);
}