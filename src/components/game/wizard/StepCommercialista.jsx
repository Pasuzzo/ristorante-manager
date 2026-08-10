import React from 'react';
import { PixelPanel, SegmentedBar } from '@/components/game/ui';
import { money } from '@/lib/partita';

/** Step 6 — Il commercialista. Tre opzioni, prezzi che cambiano per forma. */
export default function StepCommercialista({ data, update, prep }) {
  const opzioni = prep?.commercialista ?? [];
  return (
    <div className="space-y-3">
      <PixelPanel title="Il commercialista" icon="envelope">
        <div className="rm-text text-[14px] text-rm-cream/60 mb-2">Non è una scelta cosmetica: lo studio strutturato costa il triplo ma prepara domande di bando con +35% di probabilità.</div>
        <div className="grid grid-cols-1 gap-2">
          {opzioni.map((o) => {
            const on = data.commercialista === o.id;
            return (
              <button key={o.id} onClick={() => update({ commercialista: o.id })} className={`rm-card rm-no-radius p-2 text-left ${on ? 'border-rm-gold border-[4px]' : 'rm-shadow'}`}>
                <div className="flex items-center justify-between">
                  <div className="rm-pixel text-[10px] text-rm-bg">{o.nome}</div>
                  <div className="rm-pixel text-[10px] text-rm-bg">{money(o.costoAnnuo)}/anno</div>
                </div>
                <div className="rm-text text-[14px] text-rm-wood-dark mt-1">{o.descrizione}</div>
                <div className="mt-1 space-y-[2px]">
                  <div className="flex items-center gap-2">
                    <span className="rm-pixel text-[7px] text-rm-wood-dark w-[70px] uppercase">Affidabilità</span>
                    <SegmentedBar value={o.affidabilita} max={1} segments={10} color="#5a8c46" size={8} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rm-pixel text-[7px] text-rm-wood-dark w-[70px] uppercase">Bonus bandi</span>
                    <SegmentedBar value={o.bonusBandi} max={1.5} segments={10} color="#e8b84b" size={8} />
                    <span className="rm-pixel text-[8px] text-rm-wood-dark">×{o.bonusBandi}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rm-pixel text-[7px] text-rm-wood-dark w-[70px] uppercase">Sollievo</span>
                    <SegmentedBar value={o.sollievoStress} max={5} segments={10} color="#3c5a8c" size={8} />
                  </div>
                </div>
                {o.contro && <div className="rm-text text-[13px] text-rm-red mt-1">✗ {o.contro}</div>}
              </button>
            );
          })}
        </div>
      </PixelPanel>
    </div>
  );
}