import { NOMI_MESI } from './partita';

const ABBR = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

/** Ricostruisce l'andamento della cassa mese per mese dai movimenti (display only). */
export function cashHistory(tesoreria, maxPoints = 12) {
  const movs = tesoreria?.movimenti || [];
  const total = movs.reduce((s, m) => s + m.importo, 0);
  let running = (tesoreria?.saldo ?? 0) - total;
  const byKey = new Map();
  for (const m of movs) {
    const key = `${m.anno}-${String(m.mese).padStart(2, '0')}`;
    let e = byKey.get(key);
    if (!e) { e = { anno: m.anno, mese: m.mese, delta: 0 }; byKey.set(key, e); }
    e.delta += m.importo;
  }
  const arr = [...byKey.values()].sort((a, b) =>
    (a.anno - b.anno) || (a.mese - b.mese));
  const out = [];
  for (const e of arr) { running += e.delta; out.push({ label: `${ABBR[e.mese - 1]}`, value: running }); }
  return out.slice(-maxPoints);
}

export const MESES = NOMI_MESI;