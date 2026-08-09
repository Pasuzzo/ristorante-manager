import { MESI_BREVI } from './partita';

// Ricostruisce l'andamento della cassa dai movimenti di tesoreria
// (ogni movimento ha anno, mese, causale, importo). Restituisce un array di
// punti { label, value } con il saldo di fine mese,limitato agli ultimi N.
export function buildCashHistory(tesoreria, maxPoints = 12) {
  const movs = tesoreria?.movimenti ?? [];
  if (!movs.length) return [];

  const map = new Map();
  for (const m of movs) {
    const key = `${m.anno}-${String(m.mese).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + m.importo);
  }
  const keys = [...map.keys()].sort();

  // Il saldo attuale include tutti i movimenti: risalgo al saldo iniziale
  const totMov = movs.reduce((s, m) => s + m.importo, 0);
  let saldo = (tesoreria.saldo ?? 0) - totMov;

  const points = [];
  for (const k of keys) {
    saldo += map.get(k);
    const mm = parseInt(k.split('-')[1], 10);
    points.push({ label: MESI_BREVI[mm - 1] ?? '', value: Math.round(saldo) });
  }
  return points.slice(-maxPoints);
}