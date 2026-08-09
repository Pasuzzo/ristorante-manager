import React from 'react';
import { money } from '@/lib/partita';
import StaffPicker from './StaffPicker';

const PRESETS = [20000, 35000, 50000, 75000];

/** Step 3: budget iniziale, costi fissi e composizione della brigata. */
export default function StepBudget({ data, setData }) {
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <label className="rm-pixel text-[9px] text-rm-cream uppercase">
          Budget iniziale: {money(data.budgetIniziale)}
        </label>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => set('budgetIniziale', p)}
              className="rm-no-radius py-2 rm-pixel text-[9px] border-[3px]"
              style={{
                backgroundColor: data.budgetIniziale === p ? '#e8b84b' : '#2b2233',
                color: data.budgetIniziale === p ? '#2b2233' : '#f2e5bc',
                borderColor: '#5a3825',
              }}
            >
              {p / 1000}k
            </button>
          ))}
        </div>
        <input
          type="range" min={15000} max={100000} step={5000}
          className="rm-input mt-2" value={data.budgetIniziale}
          onChange={(e) => set('budgetIniziale', Number(e.target.value))}
        />
        <div className="rm-text text-[15px] text-rm-cream/60">
          Da questo vanno detratti i costi di costituzione e SCIA/licenze.
        </div>
      </div>

      <div>
        <label className="rm-pixel text-[9px] text-rm-cream uppercase">
          Costi fissi mensili (affitto, utenze): {money(data.costiFissiMensili)}
        </label>
        <input
          type="range" min={1000} max={6000} step={100}
          className="rm-input mt-1" value={data.costiFissiMensili}
          onChange={(e) => set('costiFissiMensili', Number(e.target.value))}
        />
      </div>

      <StaffPicker staff={data.staffIniziale} setStaff={(arr) => set('staffIniziale', arr)} />
    </div>
  );
}