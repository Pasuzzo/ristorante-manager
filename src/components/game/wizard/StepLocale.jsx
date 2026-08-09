import React from 'react';
import { LOCALITA } from '@/lib/gameData';

export default function StepLocale({ nome, setNome, localita, setLocalita, posti, setPosti }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="rm-pixel text-[10px] text-rm-cream block mb-1">NOME DEL LOCALE</label>
        <input
          className="rm-input w-full"
          value={nome}
          onChange={(e) => setNome(e.target.value.slice(0, 40))}
          placeholder="Trattoria del Paso"
          maxLength={40}
        />
        <p className="rm-text text-[16px] text-rm-cream/60 mt-1">Scegli il nome che campeggerà sull'insegna.</p>
      </div>

      <div>
        <label className="rm-pixel text-[10px] text-rm-cream block mb-1">DOVE APRI</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LOCALITA.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLocalita(l.value)}
              className={`rm-no-radius p-2 text-left border-[3px] ${
                localita === l.value ? 'bg-rm-red text-rm-cream border-rm-wood-dark rm-shadow' : 'bg-rm-bg2 text-rm-cream border-rm-wood-dark'
              }`}
            >
              <div className="rm-pixel text-[10px]">{l.label}</div>
              <div className="rm-text text-[15px] mt-1 leading-tight">{l.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="rm-pixel text-[10px] text-rm-cream block mb-1">POSTI A SEDERE</label>
        <div className="flex items-center gap-2">
          <Stepper value={posti} setValue={setPosti} min={20} max={120} step={5} />
          <span className="rm-text text-[18px] text-rm-cream/70">coperti per turno</span>
        </div>
        <p className="rm-text text-[15px] text-rm-cream/60 mt-1">Più posto = più potenziale, più affitto e più personale da gestire.</p>
      </div>
    </div>
  );
}

function Stepper({ value, setValue, min, max, step }) {
  const set = (v) => setValue(Math.max(min, Math.min(max, v)));
  return (
    <div className="flex items-stretch border-[3px] border-rm-wood-dark rm-shadow">
      <button type="button" className="rm-pixel text-[14px] px-3 bg-rm-wood text-rm-cream" onClick={() => set(value - step)}>-</button>
      <div className="rm-pixel text-[16px] px-4 py-1 bg-rm-bg text-rm-gold min-w-[64px] text-center">{value}</div>
      <button type="button" className="rm-pixel text-[14px] px-3 bg-rm-wood text-rm-cream" onClick={() => set(value + step)}>+</button>
    </div>
  );
}