import React from 'react';
import StaffPicker from './StaffPicker';
import { money } from '@/lib/partita';

const PRESET = [30000, 45000, 65000, 90000];

export default function StepBudget({ budget, setBudget, costiFissi, setCostiFissi, staff, setStaff }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="rm-pixel text-[10px] text-rm-cream block mb-1">CAPITALE DI PARTENZA</label>
        <div className="grid grid-cols-4 gap-1 mb-2">
          {PRESET.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setBudget(p)}
              className={`rm-pixel text-[9px] py-2 border-[3px] border-rm-wood-dark ${
                budget === p ? 'bg-rm-gold text-rm-bg rm-shadow' : 'bg-rm-bg2 text-rm-cream'
              }`}
            >
              {money(p)}
            </button>
          ))}
        </div>
        <input type="range" min={15000} max={120000} step={5000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full" />
        <div className="rm-pixel text-[12px] text-rm-gold mt-1">{money(budget)}</div>
        <p className="rm-text text-[15px] text-rm-cream/60">Con questi soldi paghi costituzione, SCIA e ti restano in cassa.</p>
      </div>

      <div>
        <label className="rm-pixel text-[10px] text-rm-cream block mb-1">COSTI FISSI MENSILI (affitto, utenze, assicurazioni)</label>
        <input type="range" min={1200} max={5000} step={100} value={costiFissi} onChange={(e) => setCostiFissi(Number(e.target.value))} className="w-full" />
        <div className="rm-pixel text-[12px] text-rm-gold mt-1">{money(costiFissi)}/mese</div>
      </div>

      <div className="rm-wood rm-no-radius p-2 border-l-[4px] border-rm-gold">
        <StaffPicker staff={staff} setStaff={setStaff} />
      </div>
    </div>
  );
}