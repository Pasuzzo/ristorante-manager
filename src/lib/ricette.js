// Copia statica di RICETTE_BASE (solo dati di gioco per la UI; il motore usa la propria).
export const RICETTE = [
  { id: 'piadina', nome: 'Piadina squacquerone, crudo e rucola', categoria: 'antipasto', difficolta: 4, prezzoVendita: 9, popolarita: 1.2,
    ingredienti: [{ nome: 'farina', quantita: 0.12 }, { nome: 'strutto', quantita: 0.02 }, { nome: 'squacquerone', quantita: 0.08 }, { nome: 'prosciutto_crudo', quantita: 0.05 }, { nome: 'rucola', quantita: 0.02 }] },
  { id: 'tagliatelle', nome: 'Tagliatelle al ragù', categoria: 'primo', difficolta: 9, prezzoVendita: 13, popolarita: 1.3,
    ingredienti: [{ nome: 'farina', quantita: 0.08 }, { nome: 'uova', quantita: 0.8 }, { nome: 'manzo_macinato', quantita: 0.09 }, { nome: 'passata', quantita: 0.06 }, { nome: 'parmigiano', quantita: 0.015 }, { nome: 'burro', quantita: 0.01 }] },
  { id: 'cappelletti', nome: 'Cappelletti in brodo di cappone', categoria: 'primo', difficolta: 13, prezzoVendita: 14, popolarita: 0.8,
    ingredienti: [{ nome: 'farina', quantita: 0.08 }, { nome: 'uova', quantita: 0.9 }, { nome: 'parmigiano', quantita: 0.04 }, { nome: 'cappone', quantita: 0.12 }] },
  { id: 'vongole', nome: 'Spaghetti alle vongole', categoria: 'primo', difficolta: 10, prezzoVendita: 15, popolarita: 1.1,
    ingredienti: [{ nome: 'spaghetti', quantita: 0.11 }, { nome: 'vongole', quantita: 0.25 }, { nome: 'vino_bianco_cucina', quantita: 0.04 }, { nome: 'olio_evo', quantita: 0.02 }] },
  { id: 'fritto', nome: "Fritto dell'Adriatico", categoria: 'secondo', difficolta: 11, prezzoVendita: 18, popolarita: 1.0,
    ingredienti: [{ nome: 'calamari', quantita: 0.12 }, { nome: 'gamberi', quantita: 0.1 }, { nome: 'pesce_paranza', quantita: 0.1 }, { nome: 'farina', quantita: 0.05 }, { nome: 'olio_semi', quantita: 0.15 }] },
  { id: 'grigliata', nome: 'Grigliata di carne con patate', categoria: 'secondo', difficolta: 7, prezzoVendita: 17, popolarita: 1.0,
    ingredienti: [{ nome: 'costata_manzo', quantita: 0.2 }, { nome: 'salsiccia', quantita: 0.1 }, { nome: 'patate', quantita: 0.2 }, { nome: 'verdure_miste', quantita: 0.1 }] },
  { id: 'tiramisu', nome: 'Tiramisù della casa', categoria: 'dolce', difficolta: 6, prezzoVendita: 6, popolarita: 0.9,
    ingredienti: [{ nome: 'mascarpone', quantita: 0.09 }, { nome: 'uova', quantita: 1 }, { nome: 'savoiardi', quantita: 0.04 }, { nome: 'caffe', quantita: 0.01 }] },
];

export const CATEGORIE = ['antipasto', 'primo', 'secondo', 'dolce'];