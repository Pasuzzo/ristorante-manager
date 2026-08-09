import React from 'react';
import { money } from '@/lib/partita';

/** Grafico a barre pixel dell'andamento cassa. */
export default function CashChart({ history }) {
  if (!history.length) {
    return <div className="rm-card-dark rm-no-radius p-3 rm-text text-[16px] text-rm-cream/50 text-center">Nessun mese giocato.</div>;
  }
  const vals = history.map((h) => h.value);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const span = Math.max(1, max - min);
  const rows = 8;
  const frac = (v) => 1 - (v - min) / span; // 0 in alto (max), 1 in basso (min)
  const zeroFrac = frac(0);

  return (
    <div className="rm-card-dark rm-no-radius p-2">
      <div className="flex items-end gap-[3px]" style={{ height: rows * 10 + 8 }}>
        {history.map((h, i) => {
          const valFrac = frac(h.value);
          const barTop = Math.min(valFrac, zeroFrac);
          const barH = Math.abs(zeroFrac - valFrac);
          const pos = h.value >= 0;
          return (
            <div key={i} className="flex-1 relative" style={{ height: '100%' }}>
              {/* linea zero */}
              <div className="absolute left-0 right-0 border-t border-dashed border-rm-cream/20" style={{ top: `${zeroFrac * 100}%` }} />
              {/* barra */}
              <div
                className="absolute left-0 right-0 pixelated"
                style={{
                  top: `${barTop * 100}%`,
                  height: `${Math.max(barH * 100, 3)}%`,
                  backgroundColor: pos ? '#5a8c46' : '#c8443c',
                  border: '1px solid #2b2233',
                }}
                title={money(h.value)}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-1">
        {history.map((h, i) => (
          <div key={i} className="flex-1 rm-pixel text-[6px] text-rm-cream/50 text-center">{h.label}</div>
        ))}
      </div>
    </div>
  );
}