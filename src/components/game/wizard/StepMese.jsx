import React from 'react';
import { PixelPanel } from '@/components/game/ui';
import { nomeMese } from '@/lib/partita';

/** Step 2 — Quando apri. Il mese di inizio cambia il pool di candidati. */
export default function StepMese({ data, update, cambiaMese, prep }) {
  const alta = data.meseInizio >= 5 && data.meseInizio <= 8;
  return (
    <div className="space-y-3">
      <PixelPanel title="Quando apri" icon="cal">
        <div className="flex items-center justify-between">
          <span className="rm-pixel text-[8px] text-rm-cream uppercase">Mese di apertura</span>
          <span className="rm-pixel text-[10px] text-rm-gold">{nomeMese(data.meseInizio)}</span>
        </div>
        <input type="range" min={1} max={12} className="rm-input" value={data.meseInizio} onChange={(e) => cambiaMese(Number(e.target.value))} />
        <div className="rm-text text-[14px] text-rm-cream/60 mt-1">Aprendo in {alta ? <span className="text-rm-red">alta stagione</span> : <span className="text-rm-green">bassa stagione</span>} il pool di candidati è {alta ? 'povero e le pretese alte' : 'ricco e trattabile'}.</div>
      </PixelPanel>
      <PixelPanel title="Il mercato del lavoro oggi" icon="cart">
        <div className="rm-text text-[16px] text-rm-cream">{prep?.pool?.suggerimento ?? 'Caricamento…'}</div>
        <div className="rm-text text-[14px] text-rm-cream/60 mt-1">{prep?.pool?.candidati?.length ?? 0} candidati disponibili per {nomeMese(data.meseInizio)}. Le offerte le fai nello step "Brigata": il candidato può rifiutare.</div>
      </PixelPanel>
    </div>
  );
}