import { base44 } from '@/api/base44Client';

export const NOMI_MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
export const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function money(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function nomeMese(i) {
  const idx = ((Number(i) - 1) % 12 + 12) % 12;
  return NOMI_MESI[idx] ?? '';
}

export async function listPartite() {
  return base44.entities.Partita.list('-created_date', 50);
}

export async function getPartita(id) {
  return base44.entities.Partita.get(id);
}

export async function eliminaPartita(id) {
  return base44.entities.Partita.delete(id);
}

export async function creaPartita(payload) {
  const res = await base44.functions.invoke('nuovaPartita', payload);
  return res.data;
}

export async function avanzaTurno(payload) {
  const res = await base44.functions.invoke('avanzaMese', payload);
  return res.data;
}