import { base44 } from '@/api/base44Client';

/** Formatta un importo in stile italiano: 12.345 € */
export function money(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '— €';
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

/** Mese in italiano (1..12) */
export const NOMI_MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
export function nomeMese(m) { return NOMI_MESI[(m - 1) % 12] ?? `M${m}`; }

export async function listPartite() {
  return base44.entities.Partita.list('-updated_date', 50);
}

export async function getPartita(id) {
  return base44.entities.Partita.get(id);
}

export async function creaPartita(payload) {
  const res = await base44.functions.invoke('nuovaPartita', payload);
  return res.data; // { partitaId, cassa, mese, annoGioco }
}

export async function avanzaTurno({ partitaId, turnoAtteso, decisioni }) {
  const res = await base44.functions.invoke('avanzaMese', { partitaId, turnoAtteso, decisioni });
  return res.data; // { report }
}

export async function eliminaPartita(id) {
  return base44.entities.Partita.delete(id);
}