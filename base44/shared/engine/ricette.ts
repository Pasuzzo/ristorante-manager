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
  // ── ampliamento: servono per un menu credibile oltre la trattoria base
  mozzarella: { prezzo: 6.5, unita: "kg" },
  lievito: { prezzo: 4.0, unita: "kg" },
  pomodorini: { prezzo: 3.2, unita: "kg" },
  basilico: { prezzo: 12.0, unita: "kg" },
  riso_carnaroli: { prezzo: 2.6, unita: "kg" },
  funghi: { prezzo: 7.5, unita: "kg" },
  tartufo: { prezzo: 320.0, unita: "kg" },
  zucca: { prezzo: 1.6, unita: "kg" },
  melanzane: { prezzo: 2.4, unita: "kg" },
  zucchine: { prezzo: 2.2, unita: "kg" },
  ceci: { prezzo: 2.8, unita: "kg" },
  lenticchie: { prezzo: 3.2, unita: "kg" },
  polpo: { prezzo: 12.0, unita: "kg" },
  branzino: { prezzo: 14.0, unita: "kg" },
  cozze: { prezzo: 4.5, unita: "kg" },
  seppie: { prezzo: 9.5, unita: "kg" },
  tonno_fresco: { prezzo: 22.0, unita: "kg" },
  pollo: { prezzo: 5.5, unita: "kg" },
  maiale_lonza: { prezzo: 8.5, unita: "kg" },
  agnello: { prezzo: 16.0, unita: "kg" },
  coniglio: { prezzo: 9.0, unita: "kg" },
  pancetta: { prezzo: 9.5, unita: "kg" },
  guanciale: { prezzo: 14.0, unita: "kg" },
  pecorino: { prezzo: 14.0, unita: "kg" },
  gorgonzola: { prezzo: 9.5, unita: "kg" },
  ricotta: { prezzo: 5.5, unita: "kg" },
  panna: { prezzo: 3.5, unita: "l" },
  cioccolato: { prezzo: 11.0, unita: "kg" },
  zucchero: { prezzo: 1.1, unita: "kg" },
  frutta_secca: { prezzo: 13.0, unita: "kg" },
  limoni: { prezzo: 2.0, unita: "kg" },
  vino_rosso_cucina: { prezzo: 2.8, unita: "l" },
  aceto_balsamico: { prezzo: 8.0, unita: "l" },
  pane: { prezzo: 3.0, unita: "kg" },
  insalata: { prezzo: 3.0, unita: "kg" },
  piselli: { prezzo: 2.4, unita: "kg" },
  polenta: { prezzo: 1.8, unita: "kg" },
  radicchio: { prezzo: 3.5, unita: "kg" },
  cipolle: { prezzo: 1.2, unita: "kg" },
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
  /** stili di locale in cui ha senso averla in carta. Vuoto = ovunque. */
  stili?: string[];
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
  // ── ANTIPASTI
  { id: "bruschette", nome: "Bruschette pomodoro e basilico", categoria: "antipasto", difficolta: 2, prezzoVendita: 6, popolarita: 1.1, stili: ["trattoria_classica","tradizionale_romagnolo","pizzeria","street_food"],
    ingredienti: [{ nome: "pane", quantita: 0.08 }, { nome: "pomodorini", quantita: 0.09 }, { nome: "basilico", quantita: 0.003 }, { nome: "olio_evo", quantita: 0.01 }] },
  { id: "tagliere", nome: "Tagliere di salumi e formaggi", categoria: "antipasto", difficolta: 2, prezzoVendita: 12, popolarita: 1.2,
    ingredienti: [{ nome: "prosciutto_crudo", quantita: 0.07 }, { nome: "pecorino", quantita: 0.05 }, { nome: "gorgonzola", quantita: 0.04 }, { nome: "pane", quantita: 0.06 }] },
  { id: "cozze", nome: "Cozze alla marinara", categoria: "antipasto", difficolta: 6, prezzoVendita: 11, popolarita: 1.0, stili: ["pesce_riviera","tradizionale_romagnolo","trattoria_classica"],
    ingredienti: [{ nome: "cozze", quantita: 0.4 }, { nome: "pomodorini", quantita: 0.05 }, { nome: "vino_bianco_cucina", quantita: 0.04 }, { nome: "pane", quantita: 0.04 }] },
  { id: "polpo_patate", nome: "Polpo e patate", categoria: "antipasto", difficolta: 12, prezzoVendita: 15, popolarita: 0.9, stili: ["pesce_riviera","gourmet","fine_dining"],
    ingredienti: [{ nome: "polpo", quantita: 0.14 }, { nome: "patate", quantita: 0.12 }, { nome: "olio_evo", quantita: 0.02 }, { nome: "limoni", quantita: 0.02 }] },
  { id: "flan_zucca", nome: "Flan di zucca e fonduta", categoria: "antipasto", difficolta: 14, prezzoVendita: 13, popolarita: 0.7, stili: ["gourmet","fine_dining","vegetariana"],
    ingredienti: [{ nome: "zucca", quantita: 0.15 }, { nome: "uova", quantita: 1 }, { nome: "panna", quantita: 0.04 }, { nome: "parmigiano", quantita: 0.03 }] },
  { id: "verdure_grigliate", nome: "Verdure grigliate dell'orto", categoria: "antipasto", difficolta: 3, prezzoVendita: 8, popolarita: 0.8, stili: ["vegetariana","gourmet","trattoria_classica"],
    ingredienti: [{ nome: "melanzane", quantita: 0.1 }, { nome: "zucchine", quantita: 0.1 }, { nome: "radicchio", quantita: 0.06 }, { nome: "olio_evo", quantita: 0.015 }] },
  { id: "crudo_pesce", nome: "Crudo di mare", categoria: "antipasto", difficolta: 17, prezzoVendita: 22, popolarita: 0.6, stili: ["pesce_riviera","fine_dining","gourmet"],
    ingredienti: [{ nome: "gamberi", quantita: 0.08 }, { nome: "tonno_fresco", quantita: 0.07 }, { nome: "branzino", quantita: 0.06 }, { nome: "limoni", quantita: 0.03 }, { nome: "olio_evo", quantita: 0.015 }] },

  // ── PRIMI
  { id: "carbonara", nome: "Spaghetti alla carbonara", categoria: "primo", difficolta: 8, prezzoVendita: 13, popolarita: 1.4,
    ingredienti: [{ nome: "spaghetti", quantita: 0.11 }, { nome: "guanciale", quantita: 0.05 }, { nome: "uova", quantita: 1.2 }, { nome: "pecorino", quantita: 0.03 }] },
  { id: "amatriciana", nome: "Bucatini all'amatriciana", categoria: "primo", difficolta: 6, prezzoVendita: 12, popolarita: 1.1,
    ingredienti: [{ nome: "spaghetti", quantita: 0.11 }, { nome: "guanciale", quantita: 0.04 }, { nome: "passata", quantita: 0.08 }, { nome: "pecorino", quantita: 0.02 }] },
  { id: "passatelli", nome: "Passatelli in brodo", categoria: "primo", difficolta: 11, prezzoVendita: 12, popolarita: 0.9, stili: ["tradizionale_romagnolo","trattoria_classica"],
    ingredienti: [{ nome: "pane", quantita: 0.06 }, { nome: "uova", quantita: 1 }, { nome: "parmigiano", quantita: 0.05 }, { nome: "cappone", quantita: 0.1 }] },
  { id: "strozzapreti", nome: "Strozzapreti salsiccia e radicchio", categoria: "primo", difficolta: 8, prezzoVendita: 13, popolarita: 1.1, stili: ["tradizionale_romagnolo","trattoria_classica"],
    ingredienti: [{ nome: "farina", quantita: 0.1 }, { nome: "salsiccia", quantita: 0.07 }, { nome: "radicchio", quantita: 0.06 }, { nome: "panna", quantita: 0.03 }] },
  { id: "risotto_funghi", nome: "Risotto ai funghi", categoria: "primo", difficolta: 12, prezzoVendita: 14, popolarita: 1.0,
    ingredienti: [{ nome: "riso_carnaroli", quantita: 0.09 }, { nome: "funghi", quantita: 0.08 }, { nome: "burro", quantita: 0.02 }, { nome: "parmigiano", quantita: 0.025 }, { nome: "vino_bianco_cucina", quantita: 0.03 }] },
  { id: "risotto_mare", nome: "Risotto ai frutti di mare", categoria: "primo", difficolta: 15, prezzoVendita: 18, popolarita: 0.9, stili: ["pesce_riviera","gourmet","fine_dining"],
    ingredienti: [{ nome: "riso_carnaroli", quantita: 0.09 }, { nome: "cozze", quantita: 0.15 }, { nome: "vongole", quantita: 0.12 }, { nome: "gamberi", quantita: 0.06 }, { nome: "vino_bianco_cucina", quantita: 0.04 }] },
  { id: "risotto_tartufo", nome: "Risotto al tartufo", categoria: "primo", difficolta: 17, prezzoVendita: 28, popolarita: 0.5, stili: ["fine_dining","gourmet"],
    ingredienti: [{ nome: "riso_carnaroli", quantita: 0.09 }, { nome: "tartufo", quantita: 0.006 }, { nome: "burro", quantita: 0.025 }, { nome: "parmigiano", quantita: 0.03 }] },
  { id: "lasagne", nome: "Lasagne alla bolognese", categoria: "primo", difficolta: 12, prezzoVendita: 14, popolarita: 1.2, stili: ["trattoria_classica","tradizionale_romagnolo"],
    ingredienti: [{ nome: "farina", quantita: 0.07 }, { nome: "uova", quantita: 0.7 }, { nome: "manzo_macinato", quantita: 0.08 }, { nome: "passata", quantita: 0.07 }, { nome: "parmigiano", quantita: 0.03 }, { nome: "burro", quantita: 0.02 }] },
  { id: "gnocchi_gorgonzola", nome: "Gnocchi al gorgonzola", categoria: "primo", difficolta: 9, prezzoVendita: 12, popolarita: 1.0,
    ingredienti: [{ nome: "patate", quantita: 0.2 }, { nome: "farina", quantita: 0.05 }, { nome: "gorgonzola", quantita: 0.05 }, { nome: "panna", quantita: 0.03 }] },
  { id: "zuppa_ceci", nome: "Zuppa di ceci e rosmarino", categoria: "primo", difficolta: 5, prezzoVendita: 10, popolarita: 0.7, stili: ["vegetariana","trattoria_classica"],
    ingredienti: [{ nome: "ceci", quantita: 0.09 }, { nome: "patate", quantita: 0.05 }, { nome: "olio_evo", quantita: 0.015 }, { nome: "pane", quantita: 0.04 }] },
  { id: "cappellacci_zucca", nome: "Cappellacci di zucca", categoria: "primo", difficolta: 14, prezzoVendita: 15, popolarita: 0.8, stili: ["gourmet","fine_dining","vegetariana","tradizionale_romagnolo"],
    ingredienti: [{ nome: "farina", quantita: 0.08 }, { nome: "uova", quantita: 0.8 }, { nome: "zucca", quantita: 0.1 }, { nome: "ricotta", quantita: 0.04 }, { nome: "burro", quantita: 0.02 }] },

  // ── SECONDI
  { id: "branzino_forno", nome: "Branzino al forno con patate", categoria: "secondo", difficolta: 10, prezzoVendita: 20, popolarita: 1.0, stili: ["pesce_riviera","trattoria_classica","gourmet"],
    ingredienti: [{ nome: "branzino", quantita: 0.35 }, { nome: "patate", quantita: 0.15 }, { nome: "olio_evo", quantita: 0.02 }, { nome: "limoni", quantita: 0.03 }] },
  { id: "seppie_piselli", nome: "Seppie con i piselli", categoria: "secondo", difficolta: 9, prezzoVendita: 16, popolarita: 0.8, stili: ["pesce_riviera","tradizionale_romagnolo"],
    ingredienti: [{ nome: "seppie", quantita: 0.2 }, { nome: "piselli", quantita: 0.1 }, { nome: "passata", quantita: 0.04 }, { nome: "cipolle", quantita: 0.03 }] },
  { id: "coniglio", nome: "Coniglio in porchetta", categoria: "secondo", difficolta: 13, prezzoVendita: 18, popolarita: 0.7, stili: ["tradizionale_romagnolo","trattoria_classica"],
    ingredienti: [{ nome: "coniglio", quantita: 0.3 }, { nome: "pancetta", quantita: 0.05 }, { nome: "vino_bianco_cucina", quantita: 0.05 }, { nome: "patate", quantita: 0.12 }] },
  { id: "pollo_arrosto", nome: "Pollo arrosto con patate", categoria: "secondo", difficolta: 4, prezzoVendita: 13, popolarita: 1.1,
    ingredienti: [{ nome: "pollo", quantita: 0.35 }, { nome: "patate", quantita: 0.18 }, { nome: "olio_evo", quantita: 0.015 }] },
  { id: "brasato", nome: "Brasato al vino rosso", categoria: "secondo", difficolta: 14, prezzoVendita: 21, popolarita: 0.8, stili: ["gourmet","fine_dining","trattoria_classica"],
    ingredienti: [{ nome: "costata_manzo", quantita: 0.25 }, { nome: "vino_rosso_cucina", quantita: 0.12 }, { nome: "cipolle", quantita: 0.05 }, { nome: "polenta", quantita: 0.08 }] },
  { id: "agnello", nome: "Agnello alle erbe", categoria: "secondo", difficolta: 15, prezzoVendita: 24, popolarita: 0.6, stili: ["fine_dining","gourmet"],
    ingredienti: [{ nome: "agnello", quantita: 0.28 }, { nome: "patate", quantita: 0.1 }, { nome: "olio_evo", quantita: 0.02 }, { nome: "vino_rosso_cucina", quantita: 0.04 }] },
  { id: "cotoletta", nome: "Cotoletta con insalata", categoria: "secondo", difficolta: 5, prezzoVendita: 15, popolarita: 1.0,
    ingredienti: [{ nome: "maiale_lonza", quantita: 0.22 }, { nome: "uova", quantita: 1 }, { nome: "pane", quantita: 0.05 }, { nome: "insalata", quantita: 0.08 }, { nome: "olio_semi", quantita: 0.08 }] },
  { id: "parmigiana", nome: "Parmigiana di melanzane", categoria: "secondo", difficolta: 8, prezzoVendita: 13, popolarita: 0.9, stili: ["vegetariana","trattoria_classica"],
    ingredienti: [{ nome: "melanzane", quantita: 0.25 }, { nome: "passata", quantita: 0.09 }, { nome: "mozzarella", quantita: 0.07 }, { nome: "parmigiano", quantita: 0.02 }] },
  { id: "tonno_scottato", nome: "Tonno scottato al sesamo", categoria: "secondo", difficolta: 16, prezzoVendita: 26, popolarita: 0.6, stili: ["fine_dining","gourmet","pesce_riviera"],
    ingredienti: [{ nome: "tonno_fresco", quantita: 0.2 }, { nome: "verdure_miste", quantita: 0.08 }, { nome: "aceto_balsamico", quantita: 0.01 }, { nome: "olio_evo", quantita: 0.015 }] },

  // ── PIZZE
  { id: "margherita", nome: "Pizza margherita", categoria: "secondo", difficolta: 6, prezzoVendita: 7, popolarita: 1.6, stili: ["pizzeria","street_food"],
    ingredienti: [{ nome: "farina", quantita: 0.22 }, { nome: "lievito", quantita: 0.002 }, { nome: "passata", quantita: 0.08 }, { nome: "mozzarella", quantita: 0.09 }, { nome: "olio_evo", quantita: 0.01 }] },
  { id: "pizza_diavola", nome: "Pizza diavola", categoria: "secondo", difficolta: 7, prezzoVendita: 9, popolarita: 1.3, stili: ["pizzeria","street_food"],
    ingredienti: [{ nome: "farina", quantita: 0.22 }, { nome: "lievito", quantita: 0.002 }, { nome: "passata", quantita: 0.08 }, { nome: "mozzarella", quantita: 0.09 }, { nome: "salsiccia", quantita: 0.05 }] },
  { id: "pizza_gourmet", nome: "Pizza gourmet con crudo e burrata", categoria: "secondo", difficolta: 12, prezzoVendita: 15, popolarita: 0.9, stili: ["pizzeria","gourmet"],
    ingredienti: [{ nome: "farina", quantita: 0.24 }, { nome: "lievito", quantita: 0.002 }, { nome: "mozzarella", quantita: 0.1 }, { nome: "prosciutto_crudo", quantita: 0.05 }, { nome: "rucola", quantita: 0.02 }] },

  // ── STREET FOOD
  { id: "piada_farcita", nome: "Piada farcita del giorno", categoria: "secondo", difficolta: 3, prezzoVendita: 7, popolarita: 1.4, stili: ["street_food","pizzeria","tradizionale_romagnolo"],
    ingredienti: [{ nome: "farina", quantita: 0.13 }, { nome: "strutto", quantita: 0.02 }, { nome: "salsiccia", quantita: 0.06 }, { nome: "verdure_miste", quantita: 0.05 }] },
  { id: "cassoni", nome: "Cassoni erbe e formaggio", categoria: "antipasto", difficolta: 5, prezzoVendita: 6, popolarita: 1.1, stili: ["street_food","tradizionale_romagnolo"],
    ingredienti: [{ nome: "farina", quantita: 0.12 }, { nome: "strutto", quantita: 0.02 }, { nome: "verdure_miste", quantita: 0.08 }, { nome: "squacquerone", quantita: 0.05 }] },

  // ── DOLCI
  { id: "panna_cotta", nome: "Panna cotta ai frutti", categoria: "dolce", difficolta: 5, prezzoVendita: 6, popolarita: 1.0,
    ingredienti: [{ nome: "panna", quantita: 0.12 }, { nome: "zucchero", quantita: 0.02 }, { nome: "frutta_secca", quantita: 0.01 }] },
  { id: "zuppa_inglese", nome: "Zuppa inglese", categoria: "dolce", difficolta: 9, prezzoVendita: 6, popolarita: 0.8, stili: ["tradizionale_romagnolo","trattoria_classica"],
    ingredienti: [{ nome: "savoiardi", quantita: 0.05 }, { nome: "uova", quantita: 1 }, { nome: "panna", quantita: 0.05 }, { nome: "cioccolato", quantita: 0.02 }] },
  { id: "tortino_cioccolato", nome: "Tortino al cioccolato dal cuore caldo", categoria: "dolce", difficolta: 13, prezzoVendita: 8, popolarita: 0.9, stili: ["gourmet","fine_dining"],
    ingredienti: [{ nome: "cioccolato", quantita: 0.06 }, { nome: "burro", quantita: 0.04 }, { nome: "uova", quantita: 1.5 }, { nome: "zucchero", quantita: 0.03 }] },
  { id: "crostata", nome: "Crostata della casa", categoria: "dolce", difficolta: 4, prezzoVendita: 5, popolarita: 0.9,
    ingredienti: [{ nome: "farina", quantita: 0.08 }, { nome: "burro", quantita: 0.04 }, { nome: "zucchero", quantita: 0.03 }, { nome: "uova", quantita: 1 }] },
  { id: "semifreddo", nome: "Semifreddo al torroncino", categoria: "dolce", difficolta: 15, prezzoVendita: 8, popolarita: 0.6, stili: ["fine_dining","gourmet"],
    ingredienti: [{ nome: "panna", quantita: 0.1 }, { nome: "frutta_secca", quantita: 0.04 }, { nome: "zucchero", quantita: 0.03 }, { nome: "uova", quantita: 1.2 }] },
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

// ─────────────────────────────────────────────── Il repertorio del cuoco

/**
 * QUELLO CHE SA FARE DAVVERO — non tutti i piatti sotto la sua tecnica,
 * ma quelli che ha imparato dove ha lavorato.
 *
 * Un cuoco di 45 anni cresciuto in trattoria conosce venti piatti di
 * casa e non sa impiattare un crudo; un ragazzo uscito dall'alberghiero
 * con uno stage in stellato ne sa pochi ma difficili. È la differenza
 * che rende diversi due curricula con la stessa "tecnica".
 */

export interface ProfiloCuoco {
  eta: number;
  tecnica: number;
  esperienza: number;
  /** "nessuna" | "corso_haccp" | "alberghiero" | "alberghiero_e_stage" | "scuola_alta_cucina" */
  formazione: string;
  /** stile personale, come in mercato.ts */
  stile: string;
}

/**
 * Le chiavi sono quelle di `Formazione` in mercato.ts.
 * Chi viene dalla gavetta sa TANTI piatti ma semplici; chi arriva dalla
 * scuola ne sa meno e più difficili. È la differenza tra due curricula
 * con la stessa tecnica.
 */
const PESO_FORMAZIONE: Record<string, { quanti: number; difficoltaMax: number }> = {
  autodidatta: { quanti: 0.85, difficoltaMax: -2 },
  gavetta: { quanti: 1.25, difficoltaMax: 0 },
  corso_professionale: { quanti: 1.0, difficoltaMax: +1 },
  alberghiero: { quanti: 1.1, difficoltaMax: +2 },
  alberghiero_e_stage_stellato: { quanti: 0.9, difficoltaMax: +4 },
};

/**
 * Costruisce il repertorio iniziale. Deterministico dal rng passato.
 * Restituisce gli id delle ricette che sa eseguire.
 */
export function repertorioIniziale(p: ProfiloCuoco, rng: () => number): string[] {
  const f = PESO_FORMAZIONE[p.formazione] ?? PESO_FORMAZIONE.corso_professionale;
  // gli anni di mestiere contano più della scuola per la QUANTITÀ
  const anniMestiere = Math.max(0, p.eta - 18);
  const base = 4 + anniMestiere * 0.55 + p.esperienza * 0.5;
  const quanti = Math.round(Math.max(3, Math.min(RICETTE_BASE.length, base * f.quanti)));
  const tetto = p.tecnica + f.difficoltaMax + 1;

  // ordina per affinità: prima quelle del suo stile, poi le altre
  const punteggio = (r: Ricetta) => {
    const suo = !r.stili || r.stili.includes(p.stile);
    const alPasso = r.difficolta <= tetto;
    return (suo ? 2 : 0) + (alPasso ? 3 : -6) + rng() * 2;
  };
  return [...RICETTE_BASE]
    .filter((r) => r.difficolta <= tetto)
    .sort((a, b) => punteggio(b) - punteggio(a))
    .slice(0, quanti)
    .map((r) => r.id);
}

/** Il repertorio della brigata: l'unione di quello che sanno fare tutti. */
export function repertorioBrigata(cuochi: Array<{ repertorio?: string[] }>): Set<string> {
  const out = new Set<string>();
  for (const c of cuochi) for (const id of c.repertorio ?? []) out.add(id);
  return out;
}

/**
 * Imparare un piatto nuovo richiede tempo e qualcuno che te lo insegni.
 * Chi ha un mentore in brigata impara più in fretta.
 */
export function imparaRicetta(
  p: ProfiloCuoco & { repertorio: string[] },
  idRicetta: string,
  conMentore: boolean,
  rng: () => number
): { imparata: boolean; motivo: string } {
  const r = RICETTE_BASE.find((x) => x.id === idRicetta);
  if (!r) return { imparata: false, motivo: "Ricetta sconosciuta." };
  if (p.repertorio.includes(idRicetta)) return { imparata: false, motivo: "La sa già." };
  if (r.difficolta > p.tecnica + 3) {
    return { imparata: false, motivo: `${r.nome} è troppo oltre le sue mani: serve più tecnica o un corso.` };
  }
  const prob = 0.25 + (p.tecnica - r.difficolta) * 0.06 + (conMentore ? 0.2 : 0);
  if (rng() > Math.max(0.05, Math.min(0.9, prob))) {
    return { imparata: false, motivo: `Ci sta provando con ${r.nome}, ma non è ancora pronta per la carta.` };
  }
  p.repertorio.push(idRicetta);
  return { imparata: true, motivo: `Ha imparato ${r.nome}${conMentore ? ", guidato in brigata" : ""}.` };
}