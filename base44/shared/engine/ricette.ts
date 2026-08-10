/**
 * RICETTE — il menu come sistema di gioco.
 *
 * - LISTINO ingredienti a prezzi all'ingrosso (JSON aggiornabile a mano
 *   dai listini Metro/grossisti o dai dati aperti ISMEA — il motore legge
 *   solo questa struttura, la fonte è intercambiabile).
 * - Ogni RICETTA ha ingredienti con grammature → food cost calcolato,
 *   una DIFFICOLTÀ (1-20, sulla scala della tecnica dei cuochi) e un
 *   prezzo di vendita deciso dal giocatore.
 * - Il MENU scelto determina: food cost medio, scontrino medio, e la
 *   QUALITÀ DI ESECUZIONE — un piatto sopra le capacità della brigata
 *   esce male e affossa il gradimento; uno troppo facile non valorizza
 *   un grande chef (che oltretutto si annoia).
 * - La qualità materie (economica/standard/premium) diventa un
 *   moltiplicatore sui prezzi del listino, non più un forfait.
 */

import { DipendenteEsteso } from "./reputazione.ts";
import { QualitaMaterie } from "./reputazione.ts";

// ─────────────────────────────────────────────── Listino ingredienti

/** €/unità all'ingrosso — INDICATIVI, da aggiornare col proprio fornitore. */
export interface VoceListino { prezzo: number; unita: "kg" | "l" | "pz" }

export const LISTINO_BASE: Record<string, VoceListino> = {
  farina: { prezzo: 0.75, unita: "kg" },
  uova: { prezzo: 0.28, unita: "pz" },
  burro: { prezzo: 9.0, unita: "kg" },
  parmigiano: { prezzo: 16.0, unita: "kg" },
  passata: { prezzo: 1.4, unita: "kg" },
  manzo_macinato: { prezzo: 9.5, unita: "kg" },
  costata_manzo: { prezzo: 15.0, unita: "kg" },
  salsiccia: { prezzo: 7.0, unita: "kg" },
  cappone: { prezzo: 8.0, unita: "kg" },
  prosciutto_crudo: { prezzo: 16.0, unita: "kg" },
  squacquerone: { prezzo: 8.5, unita: "kg" },
  rucola: { prezzo: 6.0, unita: "kg" },
  spaghetti: { prezzo: 1.3, unita: "kg" },
  vongole: { prezzo: 8.5, unita: "kg" },
  calamari: { prezzo: 10.0, unita: "kg" },
  gamberi: { prezzo: 13.0, unita: "kg" },
  pesce_paranza: { prezzo: 9.0, unita: "kg" },
  vino_bianco_cucina: { prezzo: 2.5, unita: "l" },
  olio_evo: { prezzo: 9.0, unita: "l" },
  olio_semi: { prezzo: 1.8, unita: "l" },
  strutto: { prezzo: 3.5, unita: "kg" },
  mascarpone: { prezzo: 7.5, unita: "kg" },
  savoiardi: { prezzo: 6.0, unita: "kg" },
  caffe: { prezzo: 14.0, unita: "kg" },
  verdure_miste: { prezzo: 2.2, unita: "kg" },
  patate: { prezzo: 0.9, unita: "kg" },
};

/** La qualità scelta muove i prezzi (e il gradimento, in reputazione.ts). */
export const MOLTIPLICATORE_QUALITA: Record<QualitaMaterie, number> = {
  economica: 0.82,
  standard: 1.0,
  premium: 1.3,
};

// ─────────────────────────────────────────────── Ricette

export interface IngredienteRicetta { nome: string; quantita: number } // in unità del listino

export interface Ricetta {
  id: string;
  nome: string;
  categoria: "antipasto" | "primo" | "secondo" | "dolce";
  ingredienti: IngredienteRicetta[];
  /** tecnica di cucina richiesta (1-20, scala attributi FM) */
  difficolta: number;
  /** prezzo di vendita al pubblico, IVA inclusa — lo decide il giocatore */
  prezzoVendita: number;
  /** peso nel mix di vendita (quanto viene ordinato, 1 = normale) */
  popolarita: number;
}

export const RICETTE_BASE: Ricetta[] = [
  { id: "piadina", nome: "Piadina squacquerone, crudo e rucola", categoria: "antipasto", difficolta: 4, prezzoVendita: 9, popolarita: 1.2,
    ingredienti: [{ nome: "farina", quantita: 0.12 }, { nome: "strutto", quantita: 0.02 }, { nome: "squacquerone", quantita: 0.08 }, { nome: "prosciutto_crudo", quantita: 0.05 }, { nome: "rucola", quantita: 0.02 }] },
  { id: "tagliatelle", nome: "Tagliatelle al ragù", categoria: "primo", difficolta: 9, prezzoVendita: 13, popolarita: 1.3,
    ingredienti: [{ nome: "farina", quantita: 0.08 }, { nome: "uova", quantita: 0.8 }, { nome: "manzo_macinato", quantita: 0.09 }, { nome: "passata", quantita: 0.06 }, { nome: "parmigiano", quantita: 0.015 }, { nome: "burro", quantita: 0.01 }] },
  { id: "cappelletti", nome: "Cappelletti in brodo di cappone", categoria: "primo", difficolta: 13, prezzoVendita: 14, popolarita: 0.8,
    ingredienti: [{ nome: "farina", quantita: 0.08 }, { nome: "uova", quantita: 0.9 }, { nome: "parmigiano", quantita: 0.04 }, { nome: "cappone", quantita: 0.12 }] },
  { id: "vongole", nome: "Spaghetti alle vongole", categoria: "primo", difficolta: 10, prezzoVendita: 15, popolarita: 1.1,
    ingredienti: [{ nome: "spaghetti", quantita: 0.11 }, { nome: "vongole", quantita: 0.25 }, { nome: "vino_bianco_cucina", quantita: 0.04 }, { nome: "olio_evo", quantita: 0.02 }] },
  { id: "fritto", nome: "Fritto dell'Adriatico", categoria: "secondo", difficolta: 11, prezzoVendita: 18, popolarita: 1.0,
    ingredienti: [{ nome: "calamari", quantita: 0.12 }, { nome: "gamberi", quantita: 0.1 }, { nome: "pesce_paranza", quantita: 0.1 }, { nome: "farina", quantita: 0.05 }, { nome: "olio_semi", quantita: 0.15 }] },
  { id: "grigliata", nome: "Grigliata di carne con patate", categoria: "secondo", difficolta: 7, prezzoVendita: 17, popolarita: 1.0,
    ingredienti: [{ nome: "costata_manzo", quantita: 0.2 }, { nome: "salsiccia", quantita: 0.1 }, { nome: "patate", quantita: 0.2 }, { nome: "verdure_miste", quantita: 0.1 }] },
  { id: "tiramisu", nome: "Tiramisù della casa", categoria: "dolce", difficolta: 6, prezzoVendita: 6, popolarita: 0.9,
    ingredienti: [{ nome: "mascarpone", quantita: 0.09 }, { nome: "uova", quantita: 1 }, { nome: "savoiardi", quantita: 0.04 }, { nome: "caffe", quantita: 0.01 }] },
];

// ─────────────────────────────────────────────── Food cost per ricetta

export interface AnalisiRicetta {
  ricetta: Ricetta;
  costoPorzione: number;   // € materie prime, alla qualità scelta
  foodCostPct: number;     // costo / prezzo netto IVA
  eseguibile: boolean;     // la brigata ha la tecnica per farla?
  esecuzione: number;      // 0.5..1.1 — quanto bene esce il piatto
}

export function analizzaRicetta(
  r: Ricetta,
  listino: Record<string, VoceListino>,
  qualita: QualitaMaterie,
  tecnicaBrigata: number, // tecnica del miglior cuoco disponibile
  ivaSomministrazione = 0.10
): AnalisiRicetta {
  const molt = MOLTIPLICATORE_QUALITA[qualita];
  const costoPorzione = r.ingredienti.reduce((s, i) => {
    const voce = listino[i.nome];
    if (!voce) throw new Error(`Ingrediente non a listino: ${i.nome}`);
    return s + voce.prezzo * molt * i.quantita;
  }, 0);
  const prezzoNetto = r.prezzoVendita / (1 + ivaSomministrazione);
  // esecuzione: sopra la difficoltà si guadagna poco, sotto si crolla in fretta
  const gap = tecnicaBrigata - r.difficolta;
  const esecuzione = Math.max(0.5, Math.min(1.1, 0.9 + gap * (gap >= 0 ? 0.015 : 0.06)));
  return {
    ricetta: r,
    costoPorzione,
    foodCostPct: costoPorzione / prezzoNetto,
    eseguibile: gap >= -2, // fino a 2 punti sopra la tecnica si tenta (male)
    esecuzione,
  };
}

// ─────────────────────────────────────────────── Analisi del menu

export interface AnalisiMenu {
  foodCostPct: number;      // medio ponderato sul mix di vendita
  scontrinoMedio: number;   // € IVA inclusa (≈ 1,8 portate a coperto)
  fattoreEsecuzione: number;// moltiplicatore per la performance cucina
  varieta: number;          // 0..1 — copertura delle categorie
  avvisi: string[];
}

const RUOLI_CUCINA = new Set(["commis", "cuoco", "chef"]);
const PORTATE_PER_COPERTO = 1.8;

export function analizzaMenu(
  menu: Ricetta[],
  staff: DipendenteEsteso[],
  qualita: QualitaMaterie,
  listino: Record<string, VoceListino> = LISTINO_BASE
): AnalisiMenu {
  const avvisi: string[] = [];
  if (!menu.length) return { foodCostPct: 0.32, scontrinoMedio: 26, fattoreEsecuzione: 1, varieta: 0.5, avvisi: ["Menu vuoto: valori di default"] };

  const cuochi = staff.filter((d) => RUOLI_CUCINA.has(d.ruolo));
  const tecnicaBrigata = cuochi.length ? Math.max(...cuochi.map((d) => d.attributi.tecnica)) : 3;

  let pesoTot = 0, costoPond = 0, ricavoPond = 0, esecPond = 0;
  for (const r of menu) {
    const a = analizzaRicetta(r, listino, qualita, tecnicaBrigata);
    if (!a.eseguibile) {
      avvisi.push(`❌ "${r.nome}" (diff. ${r.difficolta}) è oltre la brigata (tecnica ${tecnicaBrigata}): esce dal menu`);
      continue;
    }
    if (a.esecuzione < 0.8) avvisi.push(`⚠️ "${r.nome}" esce male: serve un cuoco più tecnico`);
    if (a.foodCostPct > 0.45) avvisi.push(`💸 "${r.nome}": food cost ${(a.foodCostPct * 100).toFixed(0)}% — prezzo da rivedere?`);
    pesoTot += r.popolarita;
    costoPond += a.costoPorzione * r.popolarita;
    ricavoPond += (r.prezzoVendita / 1.1) * r.popolarita;
    esecPond += a.esecuzione * r.popolarita;
  }
  if (pesoTot === 0) return { foodCostPct: 0.32, scontrinoMedio: 26, fattoreEsecuzione: 0.6, varieta: 0, avvisi: [...avvisi, "⛔ Nessun piatto eseguibile!"] };

  const categorie = new Set(menu.map((m) => m.categoria)).size;
  const varieta = categorie / 4;
  if (varieta < 0.75) avvisi.push(`📋 Menu poco vario (${categorie}/4 categorie): qualche cliente non trova cosa ordinare`);

  return {
    foodCostPct: costoPond / ricavoPond,
    scontrinoMedio: (ricavoPond / pesoTot) * PORTATE_PER_COPERTO * 1.1, // torna a IVA inclusa
    fattoreEsecuzione: (esecPond / pesoTot) * (0.9 + 0.1 * varieta),
    varieta,
    avvisi,
  };
}