import React from 'react';
import { PixelPanel } from '@/components/game/ui';
import { FORME, formaLabel } from '@/lib/gameData';
import { money } from '@/lib/partita';

/** Step 3 — Forma giuridica, con i costi REALI di costituzione a confronto. */
export default function StepForma({ data, update, prep }) {
  const costi = prep?.costi ?? [];
  const totale = costi.reduce((s, v) => s + v.importo, 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FORME.map((f) => {
          const on = data.forma === f.value;
          return (
            <button key={f.value} onClick={() => update({ forma: f.value })} className={`rm-card rm-no-radius rm-shadow p-2 text-left ${on ? 'border-rm-gold border-[4px]' : ''}`}>
              <div className="rm-pixel text-[10px] text-rm-bg">{f.label}</div>
              <div className="rm-text text-[14px] text-rm-wood-dark leading-tight">{f.desc}</div>
              <div className="rm-text text-[12px] text-rm-green mt-1">✓ {f.pro.join(' · ')}</div>
              <div className="rm-text text-[12px] text-rm-red">✗ {f.contro.join(' · ')}</div>
            </button>
          );
        })}
      </div>
      <PixelPanel title={`Costi di costituzione — ${formaLabel(data.forma)}`} icon="coin">
        <div className="rm-card-dark rm-no-radius p-2 space-y-1 max-h-56 overflow-y-auto rm-scroll">
          {costi.map((v, i) => (
            <div key={i} className="flex justify-between rm-text text-[15px] text-rm-cream">
              <span>{v.voce}{v.obbligatorio ? '' : ' (opz.)'}</span>
              <span className={v.importo === 0 ? 'text-rm-cream/50' : ''}>{v.importo === 0 ? 'gratuito' : money(v.importo)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between rm-pixel text-[10px] text-rm-gold mt-2 border-t-2 border-rm-wood-dark pt-1">
          <span>Totale una tantum</span><span>{money(totale)}</span>
        </div>
        <div className="rm-text text-[13px] text-rm-cream/60 mt-1">Ditta individuale: i minimali INPS commercianti (~4.200 €/anno) partono subito, anche a zero incassi.</div>
      </PixelPanel>
    </div>
  );
}