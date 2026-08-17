// Dati di gioco lato UI: etichette, enum, helper di costo. I valori reali
// (fiscali, CCNL, food cost) vivono nel motore lato server; qui solo lo stretto
// necessario a mostrare etichette e stime indicative al giocatore.

export const FORME = [
  {
    value: 'ditta_forfettaria', label: 'Ditta individuale forfettaria',
    desc: 'Tasse piatte, contabilità minima, niente IVA. Limite 85.000€/anno.',
    pro: ['Contabilità economica', 'Imposta 5% nei primi 5 anni'],
    contro: ['Limite ricavi 85.000€', 'Non detrai l\'IVA'],
  },
  {
    value: 'ditta_ordinaria', label: 'Ditta individuale ordinaria',
    desc: 'IRPEF progressiva, IVA detraibile. Flessibile, più contabilità.',
    pro: ['Nessun limite di ricavi', 'IVA detraibile'],
    contro: ['Contabilità più costosa', 'IRPEF fino al 43%'],
  },
  {
    value: 'srls', label: 'SRL semplificata',
    desc: 'Società a responsabilità limitata, capitale 1€. Patrimonio separato.',
    pro: ['Patrimonio separato', 'Costituzione economica'],
    contro: ['Contabilità societaria', 'Utile bloccato in società'],
  },
  {
    value: 'srl', label: 'SRL',
    desc: 'Società classica, notaio, capitale maggiore. Per chi vuole crescere.',
    pro: ['Massima credibilità', 'Capitalizzabile'],
    contro: ['Costo costituzione alto', 'Più burocrazia'],
  },
];

export const LOCALITA = [
  { value: 'riviera', label: 'Riviera', desc: 'Stagionalità estrema: boom estivo, inverno quieto.' },
  { value: 'citta', label: 'Città', desc: 'Affluenza stabile, calo estivo per le ferie.' },
  { value: 'paese', label: 'Paese', desc: 'Costante, poco turismo, conta il passaparola.' },
];

import { LORDO_FULLTIME } from '../../base44/shared/engine/contratti';

// Allineato a fiscal-config.ts (ccnlLordoMensile)
export const RUOLI = [
  { value: 'lavapiatti', label: 'Lavapiatti', reparto: 'cucina' },
  { value: 'commis', label: 'Commis', reparto: 'cucina' },
  { value: 'cuoco', label: 'Cuoco', reparto: 'cucina' },
  { value: 'chef', label: 'Chef', reparto: 'cucina' },
  { value: 'cameriere', label: 'Cameriere', reparto: 'sala' },
  { value: 'barista', label: 'Barista', reparto: 'sala' },
  { value: 'direttore', label: 'Direttore di sala', reparto: 'sala' },
];

export const LIVELLI = [
  { value: 'scarso', label: 'Scarso', base: 6, hint: 'economico, attributi bassi' },
  { value: 'medio', label: 'Medio', base: 10, hint: ' equilibrio prezzo/qualità' },
  { value: 'bravo', label: 'Bravo', base: 14, hint: 'costoso, attributi alti' },
];

export const QUALITA = [
  { value: 'economica', label: 'Economica', food: 0.26, grad: 0.35 },
  { value: 'standard', label: 'Standard', food: 0.32, grad: 0.6 },
  { value: 'premium', label: 'Premium', food: 0.39, grad: 0.88 },
];

export const SERVIZI = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'dehors', label: 'Dehors' },
  { value: 'prenotazione_online', label: 'Prenotazione online' },
  { value: 'seggioloni', label: 'Seggioloni' },
  { value: 'accessibilita', label: 'Accessibilità' },
  { value: 'parcheggio', label: 'Parcheggio' },
  { value: 'menu_allergeni', label: 'Menu allergeni' },
  { value: 'pet_friendly', label: 'Pet friendly' },
];

export const CCNL = {
  lavapiatti: 1550, commis: 1620, cameriere: 1700,
  barista: 1700, cuoco: 1820, chef: 1980, direttore: 2150,
};

export function lordoMensile(ruolo, superminimo = 1) {
  return Math.round((LORDO_FULLTIME[ruolo] ?? 1700) * superminimo);
}

export function ruoloLabel(v) { return RUOLI_ESTESI[v] ?? RUOLI.find((r) => r.value === v)?.label ?? v; }
export function formaLabel(v) { return FORME.find((f) => f.value === v)?.label ?? v; }
export function localitaLabel(v) { return LOCALITA.find((l) => l.value === v)?.label ?? v; }
export function livelloLabel(v) { return LIVELLI.find((l) => l.value === v)?.label ?? v; }
export function qualitaLabel(v) { return QUALITA.find((q) => q.value === v)?.label ?? v; }
export function servizioLabel(v) { return SERVIZI.find((s) => s.value === v)?.label ?? v; }
const CUCINA_ESTESA = new Set(['lavapiatti', 'commis', 'cuoco', 'chef', 'sous_chef', 'pizzaiolo', 'pasticcere']);
export function repartoDi(ruolo) { return CUCINA_ESTESA.has(ruolo) ? 'cucina' : 'sala'; }

// ── Etichette per il nuovo engine (titolare, mercato, macro)
export const RUOLI_ESTESI = {
  lavapiatti: 'Lavapiatti', runner: 'Runner', commis: 'Commis', cameriere: 'Cameriere',
  chef_de_rang: 'Chef de rang', barista: 'Barista', pizzaiolo: 'Pizzaiolo', cuoco: 'Cuoco',
  sous_chef: 'Sous chef', chef: 'Chef', pasticcere: 'Pasticcere', maitre: 'Maître',
  sommelier: 'Sommelier', direttore: 'Direttore',
};
export const STILI = {
  tradizionale_romagnolo: 'Tradizionale romagnolo', cucina_di_pesce: 'Cucina di pesce',
  moderna_creativa: 'Moderna creativa', pizzeria: 'Pizzeria', trattoria_classica: 'Trattoria classica',
  fine_dining: 'Fine dining', street_food: 'Street food', vegetariana: 'Vegetariana',
};
export const FORMAZIONI = {
  autodidatta: 'Autodidatta', gavetta: 'Gavetta', corso_professionale: 'Corso professionale',
  alberghiero: 'Alberghiero', alberghiero_e_stage_stellato: 'Alberghiero + stage stellato',
};
export const FAMIGLIE = {
  single: 'Single', convivente: 'Convivente', famiglia_con_figli: 'Famiglia con figli',
  genitore_solo: 'Genitore solo', figlio_di_ristoratori: 'Figlio di ristoratori',
};
export const CONTRATTI = {
  full_regolare: 'Full-time regolare', part_time_regolare: 'Part-time regolare',
  misto: 'Misto (busta + nero)', tutto_nero: 'Tutto in nero', stagionale: 'Stagionale',
};