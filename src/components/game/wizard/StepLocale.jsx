import React from 'react';
import { PixelButton } from '@/components/game/ui';
import { LOCALITA } from '@/lib/gameData';

function Stepper({ value, setValue, min = 10, max = 120, step = 5 }) {
  const dec = () => setValue(Math.max(min, value - step));
  const inc = () => setValue(Math.min(max, value + step));
  return (
    <div className="flex items-center gap-2">
      <PixelButton variant="wood" className="text-[12px] py-2 px-3" onClick={dec}>−</PixelButton>
      <div className="rm-card rm-no-radius px-4 py-1 rm-pixel text-[16px] text-rm-bg flex-1 text-center">{value}</div>
      <PixelButton variant="wood" className="text-[12px] py-2 px-3" onClick={inc}>+</PixelButton>
    </div>
  );
}

/** Step 1: nome ristorante, località, posti a sedere. */
export default function StepLocale({ data, setData }) {
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3">
      <div>
        <label className="rm-pixel text-[9px] text-rm-cream uppercase">Nome del locale</label>
        <input className="rm-input mt-1" value={data.nomeRistorante} onChange={(e) => set('nomeRistorante', e.target.value)} placeholder="Trattoria da Luigi" />
      </div>

      <div>
        <label className="rm-pixel text-[9px] text-rm-cream uppercase">Dove apri?</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
          {LOCALITA.map((l) => {
            const on = data.tipoLocalita === l.value;
            return (
              <button
                key={l.value}
                onClick={() => set('tipoLocalita', l.value)}
                className="rm-no-radius p-2 text-left border-[3px]"
                style={{
                  backgroundColor: on ? '#e8b84b' : '#2b2233',
                  color: on ? '#2b2233' : '#f2e5bc',
                  borderColor: '#5a3825',
                }}
              >
                <div className="rm-pixel text-[10px]">{l.label}</div>
                <div className="rm-text text-[15px] leading-tight mt-1">{l.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="rm-pixel text-[9px] text-rm-cream uppercase">Posti a sedere</label>
        <div className="mt-1">
          <Stepper value={data.postiASedere} setValue={(v) => set('postiASedere', v)} />
        </div>
        <div className="rm-text text-[15px] text-rm-cream/60 mt-1">Più posti = più potenziale, ma serve più brigata.</div>
      </div>
    </div>
  );
}