import React from 'react';
import { FORME } from '@/lib/gameData';

export default function StepForma({ forma, setForma }) {
  return (
    <div className="space-y-3">
      <p className="rm-text text-[17px] text-rm-cream/70">
        La forma giuridica decide come paghi le tasse. Non si cambia alla leggera.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FORME.map((f) => {
          const on = forma === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setForma(f.value)}
              className={`rm-no-radius p-3 text-left border-[3px] ${
                on ? 'bg-rm-red text-rm-cream border-rm-wood-dark rm-shadow' : 'bg-rm-bg2 text-rm-cream border-rm-wood-dark'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rm-pixel text-[11px]">{f.label}</span>
                {on && <span className="rm-pixel text-[8px] bg-rm-gold text-rm-bg px-1 py-1">✓</span>}
              </div>
              <div className="rm-text text-[15px] mt-2 leading-tight">
                <span className="text-rm-green">+ </span>{f.pro}
              </div>
              <div className="rm-text text-[15px] mt-1 leading-tight">
                <span className="text-rm-red">- </span>{f.contro}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}