// Costanti di gioco per la UI (solo display, nessuna logica di simulazione).
// I valori CCNL sono indicativi e rispecchiano fiscal-config.ts (solo per mostra il lordo).

export const FORME = [
  { value: 'ditta_forfettaria', label: 'Ditta forfettaria',
    pro: 'Tasse piatte (5% i primi 5 anni), niente IVA, contabilità minima.',
    contro: 'Oltre 85.000€ esci. I costi reali non si deducono: paghi le tasse sui ricavi.' },
  { value: 'ditta_ordinaria', label: 'Ditta ordinaria',
    pro: 'Ti deduci tutto: materie, stipendi, affitto. IRPEF progressiva.',
    contro: 'Contabilità vera, IVA trimestrale, commercialista che costa di più.' },
  { value: 'srls', label: 'SRLS',
    pro: 'Patrimonio separato dal tuo. Costituzione economica, capitale 1€.',
    contro: 'IRES+IRAP. L\'utile resta in società: per prelevarlo servono dividendi.' },
  { value: 'srl', label: 'SRL',
    pro: 'La forma solida. Patrimonio separato, capitale e notaio veri.',
    contro: 'Costi di costituzione alti, contabilità e commercialista più cari.' },
];

export const LOCALITA = [
  { value: 'riviera', label: 'Riviera', desc: 'Stagionale: estate d\'oro, inverno magro.' },
  { value: 'citta', label: 'Città', desc: 'Flusso stabile, cala ad agosto.' },
  { value: 'paese', label: 'Paese', desc: 'Passaparola, feste e pranzi della domenica.' },
];

export const RUOLI = [
  { value: 'lavapiatti', label: 'Lavapiatti' },
  { value: 'commis', label: 'Commis' },
  { value: 'cameriere', label: 'Cameriere' },
  { value: 'barista', label: 'Barista' },
  { value: 'cuoco', label: 'Cuoco' },
  { value: 'chef', label: 'Chef' },
  { value: 'direttore', label: 'Direttore di sala' },
];

export const LIVELLI = [
  { value: 'scarso', label: 'Scarso', note: 'attributi bassi, paga minima' },
  { value: 'medio', label: 'Medio', note: 'il profilo standard' },
  { value: 'bravo', label: 'Bravo', note: 'attributi alti, costa di più' },
];

export const SERVIZI = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'dehors', label: 'Dehors' },
  { value: 'prenotazione_online', label: 'Prenotazione online' },
  { value: 'seggioloni', label: 'Seggioloni' },
  { value: 'accessibilita', label: 'Accessibilità' },
  { value: 'parcheggio', label: 'Parcheggio' },
  { value: 'menu_allergeni', label: 'Menù allergeni' },
  { value: 'pet_friendly', label: 'Pet friendly' },
];

export const QUALITA = [
  { value: 'economica', label: 'Economica', note: 'food cost basso, recensioni peggiori' },
  { value: 'standard', label: 'Standard', note: 'il compromesso' },
  { value: 'premium', label: 'Premium', note: 'food cost alto, clienti felici' },
];

export const CCNL_MINIMO = {
  lavapiatti: 1550, commis: 1620, cameriere: 1700, barista: 1700,
  cuoco: 1820, chef: 1980, direttore: 2150,
};

export function ruoloLabel(v) { return RUOLI.find((r) => r.value === v)?.label ?? v; }
export function formaLabel(v) { return FORME.find((r) => r.value === v)?.label ?? v; }
export function localitaLabel(v) { return LOCALITA.find((r) => r.value === v)?.label ?? v; }
export function qualitaLabel(v) { return QUALITA.find((r) => r.value === v)?.label ?? v; }
export function servizioLabel(v) { return SERVIZI.find((r) => r.value === v)?.label ?? v; }

/** Lordo mensile indicativo di un'assunzione (display only). */
export function lordoMensile(ruolo, superminimo) {
  return Math.round((CCNL_MINIMO[ruolo] ?? 0) * superminimo);
}