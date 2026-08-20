// Ricette mostrate nell'UI per comporre il menu. Allineate a RICETTE_BASE
// lato server (stessi id, stessi ingredienti del listino) così il motore
// può calcolare food cost ed esecuzione senza sorprese.
//
// ⚠️ Se cambi un id o un ingrediente qui, deve cambiare anche in
// base44/shared/engine/ricette.ts, altrimenti il food cost calcolato dal
// motore non coincide con quello mostrato al giocatore.

export const CATEGORIE = ['antipasto', 'primo', 'secondo', 'dolce'];

/** Tipo di piatto: serve solo all'UI per filtrare e ordinare la lista. */
export const TIPI = ['pesce', 'carne', 'vegetariano', 'salumi_formaggi', 'pizza', 'dolce'];

const LABEL_TIPO = {
  pesce: 'Pesce',
  carne: 'Carne',
  vegetariano: 'Vegetariano',
  salumi_formaggi: 'Salumi e formaggi',
  pizza: 'Pizza',
  dolce: 'Dolce',
};

const LABEL_CATEGORIA = {
  antipasto: 'Antipasti',
  primo: 'Primi',
  secondo: 'Secondi',
  dolce: 'Dolci',
};

/** €/unità all'ingrosso — copia di LISTINO_BASE del motore. */
export const LISTINO = {
  farina: { prezzo: 0.75, unita: 'kg' },
  uova: { prezzo: 0.28, unita: 'pz' },
  burro: { prezzo: 9.0, unita: 'kg' },
  parmigiano: { prezzo: 16.0, unita: 'kg' },
  passata: { prezzo: 1.4, unita: 'kg' },
  manzo_macinato: { prezzo: 9.5, unita: 'kg' },
  costata_manzo: { prezzo: 15.0, unita: 'kg' },
  salsiccia: { prezzo: 7.0, unita: 'kg' },
  cappone: { prezzo: 8.0, unita: 'kg' },
  prosciutto_crudo: { prezzo: 16.0, unita: 'kg' },
  squacquerone: { prezzo: 8.5, unita: 'kg' },
  rucola: { prezzo: 6.0, unita: 'kg' },
  spaghetti: { prezzo: 1.3, unita: 'kg' },
  vongole: { prezzo: 8.5, unita: 'kg' },
  calamari: { prezzo: 10.0, unita: 'kg' },
  gamberi: { prezzo: 13.0, unita: 'kg' },
  pesce_paranza: { prezzo: 9.0, unita: 'kg' },
  vino_bianco_cucina: { prezzo: 2.5, unita: 'l' },
  olio_evo: { prezzo: 9.0, unita: 'l' },
  olio_semi: { prezzo: 1.8, unita: 'l' },
  strutto: { prezzo: 3.5, unita: 'kg' },
  mascarpone: { prezzo: 7.5, unita: 'kg' },
  savoiardi: { prezzo: 6.0, unita: 'kg' },
  caffe: { prezzo: 14.0, unita: 'kg' },
  verdure_miste: { prezzo: 2.2, unita: 'kg' },
  patate: { prezzo: 0.9, unita: 'kg' },
  mozzarella: { prezzo: 6.5, unita: 'kg' },
  lievito: { prezzo: 4.0, unita: 'kg' },
  pomodorini: { prezzo: 3.2, unita: 'kg' },
  basilico: { prezzo: 12.0, unita: 'kg' },
  riso_carnaroli: { prezzo: 2.6, unita: 'kg' },
  funghi: { prezzo: 7.5, unita: 'kg' },
  tartufo: { prezzo: 320.0, unita: 'kg' },
  zucca: { prezzo: 1.6, unita: 'kg' },
  melanzane: { prezzo: 2.4, unita: 'kg' },
  zucchine: { prezzo: 2.2, unita: 'kg' },
  ceci: { prezzo: 2.8, unita: 'kg' },
  lenticchie: { prezzo: 3.2, unita: 'kg' },
  polpo: { prezzo: 12.0, unita: 'kg' },
  branzino: { prezzo: 14.0, unita: 'kg' },
  cozze: { prezzo: 4.5, unita: 'kg' },
  seppie: { prezzo: 9.5, unita: 'kg' },
  tonno_fresco: { prezzo: 22.0, unita: 'kg' },
  pollo: { prezzo: 5.5, unita: 'kg' },
  maiale_lonza: { prezzo: 8.5, unita: 'kg' },
  agnello: { prezzo: 16.0, unita: 'kg' },
  coniglio: { prezzo: 9.0, unita: 'kg' },
  pancetta: { prezzo: 9.5, unita: 'kg' },
  guanciale: { prezzo: 14.0, unita: 'kg' },
  pecorino: { prezzo: 14.0, unita: 'kg' },
  gorgonzola: { prezzo: 9.5, unita: 'kg' },
  ricotta: { prezzo: 5.5, unita: 'kg' },
  panna: { prezzo: 3.5, unita: 'l' },
  cioccolato: { prezzo: 11.0, unita: 'kg' },
  zucchero: { prezzo: 1.1, unita: 'kg' },
  frutta_secca: { prezzo: 13.0, unita: 'kg' },
  limoni: { prezzo: 2.0, unita: 'kg' },
  vino_rosso_cucina: { prezzo: 2.8, unita: 'l' },
  aceto_balsamico: { prezzo: 8.0, unita: 'l' },
  pane: { prezzo: 3.0, unita: 'kg' },
  insalata: { prezzo: 3.0, unita: 'kg' },
  piselli: { prezzo: 2.4, unita: 'kg' },
  polenta: { prezzo: 1.8, unita: 'kg' },
  radicchio: { prezzo: 3.5, unita: 'kg' },
  cipolle: { prezzo: 1.2, unita: 'kg' },
};

export const MOLTIPLICATORE_QUALITA = { economica: 0.82, standard: 1.0, premium: 1.3 };

export const RICETTE = [
  // ── I sette storici
  { id: 'piadina', nome: 'Piadina squacquerone, crudo e rucola', categoria: 'antipasto', tipo: 'salumi_formaggi', difficolta: 4, prezzoVendita: 9, popolarita: 1.2,
    ingredienti: [{ nome: 'farina', quantita: 0.12 }, { nome: 'strutto', quantita: 0.02 }, { nome: 'squacquerone', quantita: 0.08 }, { nome: 'prosciutto_crudo', quantita: 0.05 }, { nome: 'rucola', quantita: 0.02 }] },
  { id: 'tagliatelle', nome: 'Tagliatelle al ragù', categoria: 'primo', tipo: 'carne', difficolta: 9, prezzoVendita: 13, popolarita: 1.3,
    ingredienti: [{ nome: 'farina', quantita: 0.08 }, { nome: 'uova', quantita: 0.8 }, { nome: 'manzo_macinato', quantita: 0.09 }, { nome: 'passata', quantita: 0.06 }, { nome: 'parmigiano', quantita: 0.015 }, { nome: 'burro', quantita: 0.01 }] },
  { id: 'cappelletti', nome: 'Cappelletti in brodo di cappone', categoria: 'primo', tipo: 'carne', difficolta: 13, prezzoVendita: 14, popolarita: 0.8,
    ingredienti: [{ nome: 'farina', quantita: 0.08 }, { nome: 'uova', quantita: 0.9 }, { nome: 'parmigiano', quantita: 0.04 }, { nome: 'cappone', quantita: 0.12 }] },
  { id: 'vongole', nome: 'Spaghetti alle vongole', categoria: 'primo', tipo: 'pesce', difficolta: 10, prezzoVendita: 15, popolarita: 1.1,
    ingredienti: [{ nome: 'spaghetti', quantita: 0.11 }, { nome: 'vongole', quantita: 0.25 }, { nome: 'vino_bianco_cucina', quantita: 0.04 }, { nome: 'olio_evo', quantita: 0.02 }] },
  { id: 'fritto', nome: "Fritto dell'Adriatico", categoria: 'secondo', tipo: 'pesce', difficolta: 11, prezzoVendita: 18, popolarita: 1.0,
    ingredienti: [{ nome: 'calamari', quantita: 0.12 }, { nome: 'gamberi', quantita: 0.1 }, { nome: 'pesce_paranza', quantita: 0.1 }, { nome: 'farina', quantita: 0.05 }, { nome: 'olio_semi', quantita: 0.15 }] },
  { id: 'grigliata', nome: 'Grigliata di carne con patate', categoria: 'secondo', tipo: 'carne', difficolta: 7, prezzoVendita: 17, popolarita: 1.0,
    ingredienti: [{ nome: 'costata_manzo', quantita: 0.2 }, { nome: 'salsiccia', quantita: 0.1 }, { nome: 'patate', quantita: 0.2 }, { nome: 'verdure_miste', quantita: 0.1 }] },
  { id: 'tiramisu', nome: 'Tiramisù della casa', categoria: 'dolce', tipo: 'dolce', difficolta: 6, prezzoVendita: 6, popolarita: 0.9,
    ingredienti: [{ nome: 'mascarpone', quantita: 0.09 }, { nome: 'uova', quantita: 1 }, { nome: 'savoiardi', quantita: 0.04 }, { nome: 'caffe', quantita: 0.01 }] },

  // ── ANTIPASTI
  { id: 'bruschette', nome: 'Bruschette pomodoro e basilico', categoria: 'antipasto', tipo: 'vegetariano', difficolta: 2, prezzoVendita: 6, popolarita: 1.1, stili: ['trattoria_classica', 'tradizionale_romagnolo', 'pizzeria', 'street_food'],
    ingredienti: [{ nome: 'pane', quantita: 0.08 }, { nome: 'pomodorini', quantita: 0.09 }, { nome: 'basilico', quantita: 0.003 }, { nome: 'olio_evo', quantita: 0.01 }] },
  { id: 'tagliere', nome: 'Tagliere di salumi e formaggi', categoria: 'antipasto', tipo: 'salumi_formaggi', difficolta: 2, prezzoVendita: 12, popolarita: 1.2,
    ingredienti: [{ nome: 'prosciutto_crudo', quantita: 0.07 }, { nome: 'pecorino', quantita: 0.05 }, { nome: 'gorgonzola', quantita: 0.04 }, { nome: 'pane', quantita: 0.06 }] },
  { id: 'cozze', nome: 'Cozze alla marinara', categoria: 'antipasto', tipo: 'pesce', difficolta: 6, prezzoVendita: 11, popolarita: 1.0, stili: ['pesce_riviera', 'tradizionale_romagnolo', 'trattoria_classica'],
    ingredienti: [{ nome: 'cozze', quantita: 0.4 }, { nome: 'pomodorini', quantita: 0.05 }, { nome: 'vino_bianco_cucina', quantita: 0.04 }, { nome: 'pane', quantita: 0.04 }] },
  { id: 'polpo_patate', nome: 'Polpo e patate', categoria: 'antipasto', tipo: 'pesce', difficolta: 12, prezzoVendita: 15, popolarita: 0.9, stili: ['pesce_riviera', 'gourmet', 'fine_dining'],
    ingredienti: [{ nome: 'polpo', quantita: 0.14 }, { nome: 'patate', quantita: 0.12 }, { nome: 'olio_evo', quantita: 0.02 }, { nome: 'limoni', quantita: 0.02 }] },
  { id: 'flan_zucca', nome: 'Flan di zucca e fonduta', categoria: 'antipasto', tipo: 'vegetariano', difficolta: 14, prezzoVendita: 13, popolarita: 0.7, stili: ['gourmet', 'fine_dining', 'vegetariana'],
    ingredienti: [{ nome: 'zucca', quantita: 0.15 }, { nome: 'uova', quantita: 1 }, { nome: 'panna', quantita: 0.04 }, { nome: 'parmigiano', quantita: 0.03 }] },
  { id: 'verdure_grigliate', nome: "Verdure grigliate dell'orto", categoria: 'antipasto', tipo: 'vegetariano', difficolta: 3, prezzoVendita: 8, popolarita: 0.8, stili: ['vegetariana', 'gourmet', 'trattoria_classica'],
    ingredienti: [{ nome: 'melanzane', quantita: 0.1 }, { nome: 'zucchine', quantita: 0.1 }, { nome: 'radicchio', quantita: 0.06 }, { nome: 'olio_evo', quantita: 0.015 }] },
  { id: 'crudo_pesce', nome: 'Crudo di mare', categoria: 'antipasto', tipo: 'pesce', difficolta: 17, prezzoVendita: 22, popolarita: 0.6, stili: ['pesce_riviera', 'fine_dining', 'gourmet'],
    ingredienti: [{ nome: 'gamberi', quantita: 0.08 }, { nome: 'tonno_fresco', quantita: 0.07 }, { nome: 'branzino', quantita: 0.06 }, { nome: 'limoni', quantita: 0.03 }, { nome: 'olio_evo', quantita: 0.015 }] },
  { id: 'cassoni', nome: 'Cassoni erbe e formaggio', categoria: 'antipasto', tipo: 'vegetariano', difficolta: 5, prezzoVendita: 6, popolarita: 1.1, stili: ['street_food', 'tradizionale_romagnolo'],
    ingredienti: [{ nome: 'farina', quantita: 0.12 }, { nome: 'strutto', quantita: 0.02 }, { nome: 'verdure_miste', quantita: 0.08 }, { nome: 'squacquerone', quantita: 0.05 }] },

  // ── PRIMI
  { id: 'carbonara', nome: 'Spaghetti alla carbonara', categoria: 'primo', tipo: 'carne', difficolta: 8, prezzoVendita: 13, popolarita: 1.4,
    ingredienti: [{ nome: 'spaghetti', quantita: 0.11 }, { nome: 'guanciale', quantita: 0.05 }, { nome: 'uova', quantita: 1.2 }, { nome: 'pecorino', quantita: 0.03 }] },
  { id: 'amatriciana', nome: "Bucatini all'amatriciana", categoria: 'primo', tipo: 'carne', difficolta: 6, prezzoVendita: 12, popolarita: 1.1,
    ingredienti: [{ nome: 'spaghetti', quantita: 0.11 }, { nome: 'guanciale', quantita: 0.04 }, { nome: 'passata', quantita: 0.08 }, { nome: 'pecorino', quantita: 0.02 }] },
  { id: 'passatelli', nome: 'Passatelli in brodo', categoria: 'primo', tipo: 'carne', difficolta: 11, prezzoVendita: 12, popolarita: 0.9, stili: ['tradizionale_romagnolo', 'trattoria_classica'],
    ingredienti: [{ nome: 'pane', quantita: 0.06 }, { nome: 'uova', quantita: 1 }, { nome: 'parmigiano', quantita: 0.05 }, { nome: 'cappone', quantita: 0.1 }] },
  { id: 'strozzapreti', nome: 'Strozzapreti salsiccia e radicchio', categoria: 'primo', tipo: 'carne', difficolta: 8, prezzoVendita: 13, popolarita: 1.1, stili: ['tradizionale_romagnolo', 'trattoria_classica'],
    ingredienti: [{ nome: 'farina', quantita: 0.1 }, { nome: 'salsiccia', quantita: 0.07 }, { nome: 'radicchio', quantita: 0.06 }, { nome: 'panna', quantita: 0.03 }] },
  { id: 'risotto_funghi', nome: 'Risotto ai funghi', categoria: 'primo', tipo: 'vegetariano', difficolta: 12, prezzoVendita: 14, popolarita: 1.0,
    ingredienti: [{ nome: 'riso_carnaroli', quantita: 0.09 }, { nome: 'funghi', quantita: 0.08 }, { nome: 'burro', quantita: 0.02 }, { nome: 'parmigiano', quantita: 0.025 }, { nome: 'vino_bianco_cucina', quantita: 0.03 }] },
  { id: 'risotto_mare', nome: 'Risotto ai frutti di mare', categoria: 'primo', tipo: 'pesce', difficolta: 15, prezzoVendita: 18, popolarita: 0.9, stili: ['pesce_riviera', 'gourmet', 'fine_dining'],
    ingredienti: [{ nome: 'riso_carnaroli', quantita: 0.09 }, { nome: 'cozze', quantita: 0.15 }, { nome: 'vongole', quantita: 0.12 }, { nome: 'gamberi', quantita: 0.06 }, { nome: 'vino_bianco_cucina', quantita: 0.04 }] },
  { id: 'risotto_tartufo', nome: 'Risotto al tartufo', categoria: 'primo', tipo: 'vegetariano', difficolta: 17, prezzoVendita: 28, popolarita: 0.5, stili: ['fine_dining', 'gourmet'],
    ingredienti: [{ nome: 'riso_carnaroli', quantita: 0.09 }, { nome: 'tartufo', quantita: 0.006 }, { nome: 'burro', quantita: 0.025 }, { nome: 'parmigiano', quantita: 0.03 }] },
  { id: 'lasagne', nome: 'Lasagne alla bolognese', categoria: 'primo', tipo: 'carne', difficolta: 12, prezzoVendita: 14, popolarita: 1.2, stili: ['trattoria_classica', 'tradizionale_romagnolo'],
    ingredienti: [{ nome: 'farina', quantita: 0.07 }, { nome: 'uova', quantita: 0.7 }, { nome: 'manzo_macinato', quantita: 0.08 }, { nome: 'passata', quantita: 0.07 }, { nome: 'parmigiano', quantita: 0.03 }, { nome: 'burro', quantita: 0.02 }] },
  { id: 'gnocchi_gorgonzola', nome: 'Gnocchi al gorgonzola', categoria: 'primo', tipo: 'vegetariano', difficolta: 9, prezzoVendita: 12, popolarita: 1.0,
    ingredienti: [{ nome: 'patate', quantita: 0.2 }, { nome: 'farina', quantita: 0.05 }, { nome: 'gorgonzola', quantita: 0.05 }, { nome: 'panna', quantita: 0.03 }] },
  { id: 'zuppa_ceci', nome: 'Zuppa di ceci e rosmarino', categoria: 'primo', tipo: 'vegetariano', difficolta: 5, prezzoVendita: 10, popolarita: 0.7, stili: ['vegetariana', 'trattoria_classica'],
    ingredienti: [{ nome: 'ceci', quantita: 0.09 }, { nome: 'patate', quantita: 0.05 }, { nome: 'olio_evo', quantita: 0.015 }, { nome: 'pane', quantita: 0.04 }] },
  { id: 'cappellacci_zucca', nome: 'Cappellacci di zucca', categoria: 'primo', tipo: 'vegetariano', difficolta: 14, prezzoVendita: 15, popolarita: 0.8, stili: ['gourmet', 'fine_dining', 'vegetariana', 'tradizionale_romagnolo'],
    ingredienti: [{ nome: 'farina', quantita: 0.08 }, { nome: 'uova', quantita: 0.8 }, { nome: 'zucca', quantita: 0.1 }, { nome: 'ricotta', quantita: 0.04 }, { nome: 'burro', quantita: 0.02 }] },

  // ── SECONDI
  { id: 'branzino_forno', nome: 'Branzino al forno con patate', categoria: 'secondo', tipo: 'pesce', difficolta: 10, prezzoVendita: 20, popolarita: 1.0, stili: ['pesce_riviera', 'trattoria_classica', 'gourmet'],
    ingredienti: [{ nome: 'branzino', quantita: 0.35 }, { nome: 'patate', quantita: 0.15 }, { nome: 'olio_evo', quantita: 0.02 }, { nome: 'limoni', quantita: 0.03 }] },
  { id: 'seppie_piselli', nome: 'Seppie con i piselli', categoria: 'secondo', tipo: 'pesce', difficolta: 9, prezzoVendita: 16, popolarita: 0.8, stili: ['pesce_riviera', 'tradizionale_romagnolo'],
    ingredienti: [{ nome: 'seppie', quantita: 0.2 }, { nome: 'piselli', quantita: 0.1 }, { nome: 'passata', quantita: 0.04 }, { nome: 'cipolle', quantita: 0.03 }] },
  { id: 'coniglio', nome: 'Coniglio in porchetta', categoria: 'secondo', tipo: 'carne', difficolta: 13, prezzoVendita: 18, popolarita: 0.7, stili: ['tradizionale_romagnolo', 'trattoria_classica'],
    ingredienti: [{ nome: 'coniglio', quantita: 0.3 }, { nome: 'pancetta', quantita: 0.05 }, { nome: 'vino_bianco_cucina', quantita: 0.05 }, { nome: 'patate', quantita: 0.12 }] },
  { id: 'pollo_arrosto', nome: 'Pollo arrosto con patate', categoria: 'secondo', tipo: 'carne', difficolta: 4, prezzoVendita: 13, popolarita: 1.1,
    ingredienti: [{ nome: 'pollo', quantita: 0.35 }, { nome: 'patate', quantita: 0.18 }, { nome: 'olio_evo', quantita: 0.015 }] },
  { id: 'brasato', nome: 'Brasato al vino rosso', categoria: 'secondo', tipo: 'carne', difficolta: 14, prezzoVendita: 21, popolarita: 0.8, stili: ['gourmet', 'fine_dining', 'trattoria_classica'],
    ingredienti: [{ nome: 'costata_manzo', quantita: 0.25 }, { nome: 'vino_rosso_cucina', quantita: 0.12 }, { nome: 'cipolle', quantita: 0.05 }, { nome: 'polenta', quantita: 0.08 }] },
  { id: 'agnello', nome: 'Agnello alle erbe', categoria: 'secondo', tipo: 'carne', difficolta: 15, prezzoVendita: 24, popolarita: 0.6, stili: ['fine_dining', 'gourmet'],
    ingredienti: [{ nome: 'agnello', quantita: 0.28 }, { nome: 'patate', quantita: 0.1 }, { nome: 'olio_evo', quantita: 0.02 }, { nome: 'vino_rosso_cucina', quantita: 0.04 }] },
  { id: 'cotoletta', nome: 'Cotoletta con insalata', categoria: 'secondo', tipo: 'carne', difficolta: 5, prezzoVendita: 15, popolarita: 1.0,
    ingredienti: [{ nome: 'maiale_lonza', quantita: 0.22 }, { nome: 'uova', quantita: 1 }, { nome: 'pane', quantita: 0.05 }, { nome: 'insalata', quantita: 0.08 }, { nome: 'olio_semi', quantita: 0.08 }] },
  { id: 'parmigiana', nome: 'Parmigiana di melanzane', categoria: 'secondo', tipo: 'vegetariano', difficolta: 8, prezzoVendita: 13, popolarita: 0.9, stili: ['vegetariana', 'trattoria_classica'],
    ingredienti: [{ nome: 'melanzane', quantita: 0.25 }, { nome: 'passata', quantita: 0.09 }, { nome: 'mozzarella', quantita: 0.07 }, { nome: 'parmigiano', quantita: 0.02 }] },
  { id: 'tonno_scottato', nome: 'Tonno scottato al sesamo', categoria: 'secondo', tipo: 'pesce', difficolta: 16, prezzoVendita: 26, popolarita: 0.6, stili: ['fine_dining', 'gourmet', 'pesce_riviera'],
    ingredienti: [{ nome: 'tonno_fresco', quantita: 0.2 }, { nome: 'verdure_miste', quantita: 0.08 }, { nome: 'aceto_balsamico', quantita: 0.01 }, { nome: 'olio_evo', quantita: 0.015 }] },
  { id: 'margherita', nome: 'Pizza margherita', categoria: 'secondo', tipo: 'pizza', difficolta: 6, prezzoVendita: 7, popolarita: 1.6, stili: ['pizzeria', 'street_food'],
    ingredienti: [{ nome: 'farina', quantita: 0.22 }, { nome: 'lievito', quantita: 0.002 }, { nome: 'passata', quantita: 0.08 }, { nome: 'mozzarella', quantita: 0.09 }, { nome: 'olio_evo', quantita: 0.01 }] },
  { id: 'pizza_diavola', nome: 'Pizza diavola', categoria: 'secondo', tipo: 'pizza', difficolta: 7, prezzoVendita: 9, popolarita: 1.3, stili: ['pizzeria', 'street_food'],
    ingredienti: [{ nome: 'farina', quantita: 0.22 }, { nome: 'lievito', quantita: 0.002 }, { nome: 'passata', quantita: 0.08 }, { nome: 'mozzarella', quantita: 0.09 }, { nome: 'salsiccia', quantita: 0.05 }] },
  { id: 'pizza_gourmet', nome: 'Pizza gourmet con crudo e burrata', categoria: 'secondo', tipo: 'pizza', difficolta: 12, prezzoVendita: 15, popolarita: 0.9, stili: ['pizzeria', 'gourmet'],
    ingredienti: [{ nome: 'farina', quantita: 0.24 }, { nome: 'lievito', quantita: 0.002 }, { nome: 'mozzarella', quantita: 0.1 }, { nome: 'prosciutto_crudo', quantita: 0.05 }, { nome: 'rucola', quantita: 0.02 }] },
  { id: 'piada_farcita', nome: 'Piada farcita del giorno', categoria: 'secondo', tipo: 'carne', difficolta: 3, prezzoVendita: 7, popolarita: 1.4, stili: ['street_food', 'pizzeria', 'tradizionale_romagnolo'],
    ingredienti: [{ nome: 'farina', quantita: 0.13 }, { nome: 'strutto', quantita: 0.02 }, { nome: 'salsiccia', quantita: 0.06 }, { nome: 'verdure_miste', quantita: 0.05 }] },

  // ── DOLCI
  { id: 'panna_cotta', nome: 'Panna cotta ai frutti', categoria: 'dolce', tipo: 'dolce', difficolta: 5, prezzoVendita: 6, popolarita: 1.0,
    ingredienti: [{ nome: 'panna', quantita: 0.12 }, { nome: 'zucchero', quantita: 0.02 }, { nome: 'frutta_secca', quantita: 0.01 }] },
  { id: 'zuppa_inglese', nome: 'Zuppa inglese', categoria: 'dolce', tipo: 'dolce', difficolta: 9, prezzoVendita: 6, popolarita: 0.8, stili: ['tradizionale_romagnolo', 'trattoria_classica'],
    ingredienti: [{ nome: 'savoiardi', quantita: 0.05 }, { nome: 'uova', quantita: 1 }, { nome: 'panna', quantita: 0.05 }, { nome: 'cioccolato', quantita: 0.02 }] },
  { id: 'tortino_cioccolato', nome: 'Tortino al cioccolato dal cuore caldo', categoria: 'dolce', tipo: 'dolce', difficolta: 13, prezzoVendita: 8, popolarita: 0.9, stili: ['gourmet', 'fine_dining'],
    ingredienti: [{ nome: 'cioccolato', quantita: 0.06 }, { nome: 'burro', quantita: 0.04 }, { nome: 'uova', quantita: 1.5 }, { nome: 'zucchero', quantita: 0.03 }] },
  { id: 'crostata', nome: 'Crostata della casa', categoria: 'dolce', tipo: 'dolce', difficolta: 4, prezzoVendita: 5, popolarita: 0.9,
    ingredienti: [{ nome: 'farina', quantita: 0.08 }, { nome: 'burro', quantita: 0.04 }, { nome: 'zucchero', quantita: 0.03 }, { nome: 'uova', quantita: 1 }] },
  { id: 'semifreddo', nome: 'Semifreddo al torroncino', categoria: 'dolce', tipo: 'dolce', difficolta: 15, prezzoVendita: 8, popolarita: 0.6, stili: ['fine_dining', 'gourmet'],
    ingredienti: [{ nome: 'panna', quantita: 0.1 }, { nome: 'frutta_secca', quantita: 0.04 }, { nome: 'zucchero', quantita: 0.03 }, { nome: 'uova', quantita: 1.2 }] },
];

export function ricettaById(id) { return RICETTE.find((r) => r.id === id); }
export function categoriaLabel(c) { return LABEL_CATEGORIA[c] ?? (c.charAt(0).toUpperCase() + c.slice(1)); }
export function tipoLabel(t) { return LABEL_TIPO[t] ?? t; }

/** Costo materie prime a porzione, stessa formula del motore. */
export function custoPorzione(r, qualita = 'standard') {
  const molt = MOLTIPLICATORE_QUALITA[qualita] ?? 1;
  return (r.ingredienti ?? []).reduce((s, i) => s + (LISTINO[i.nome]?.prezzo ?? 0) * molt * i.quantita, 0);
}

/** Food cost in % del prezzo netto IVA (somministrazione 10%). */
export function foodCostPct(r, prezzo, qualita = 'standard') {
  const netto = (prezzo ?? r.prezzoVendita) / 1.1;
  return netto > 0 ? custoPorzione(r, qualita) / netto : 0;
}

/** Margine lordo a porzione, € IVA esclusa. */
export function margine(r, prezzo, qualita = 'standard') {
  return (prezzo ?? r.prezzoVendita) / 1.1 - custoPorzione(r, qualita);
}