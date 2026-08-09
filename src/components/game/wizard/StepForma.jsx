import React from 'react';
import { FORME } from '@/lib/gameData';

/** Step 2: scelta della forma giuridica con pro/contro. */
export default function StepForma({ data, setData }) {
  const set = (v) => setData((p) => ({ ...p, forma: v }));
  return (
    <div className="space-y-2">
      <p className="rm-text text-[17px] text-rm-cream/80 mb-1">
        La forma giuridica determina tasse, contabilità e rischi. Si cambia solo con costo, scegli bene all'inizio.
      </p>
      {FORME.map((f) => {
        const on = data.forma === f.value;
        return (
          <button
            key={f.value}
            onClick={() => set(f.value)}
            className="rm-no-radius w-full p-2 text-left border-[3px]"
            style={{
              backgroundColor: on ? '#e8b84b' : '#2b2233',
              color: on ? '#2b2233' : '#f2e5bc',
              borderColor: '#5a3825',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="rm-pixel text-[10px]">{f.label}</span>
              {on && <span className="rm-pixel text-[10px]">✓</span>}
            </div>
            <div className="rm-text text-[16px] leading-tight mt-1">{f.desc}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="rm-pixel text-[8px] text-rm-green">PRO</div>
                {f.pro.map((p, i) => <div key={i} className="rm-text text-[15px] leading-tight">+ {p}</div>)}
              </div>
              <div>
                <div className="rm-pixel text-[8px] text-rm-red">CONTRO</div>
                {f.contro.map((p, i) => <div key={i} className="rm-text text-[15px] leading-tight">− {p}</div>)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}