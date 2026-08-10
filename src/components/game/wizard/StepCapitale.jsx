import React from 'react';
import { PixelPanel } from '@/components/game/ui';
import { money } from '@/lib/partita';
import { effettiCapitale } from '@/lib/costituzione';

/** Step 4 — Capitale sociale (solo srl/srls). Patrimonio vincolato, non cassa. */
export default function StepCapitale({ data, update, prep }) {
  const regole = prep?.regole;
  if (!regole?.richiesto) {
    return (
      <PixelPanel title="Capitale sociale" icon="coin">
        <div className="rm-card-dark rm-no-radius p-3 rm-text text-[16px] text-rm-cream/80">{regole?.nota ?? 'Nessun capitale sociale per questa forma.'}</div>
      </PixelPanel>
    );
  }
  const min = regole.minimo;
  const max = regole.massimo ?? 50000;
  const cap = Math.max(min, Math.min(max, Number(data.capitaleSociale) || min));
  const eff = effettiCapitale(cap);
  const versato = cap >= 10000 && data.forma === 'srl' ? cap * regole.quotaVersamentoImmediato : cap;
  return (
    <div className="space-y-3">
      <PixelPanel title="Capitale sociale" icon="coin">
        <div className="rm-card-dark rm-no-radius p-2 rm-text text-[15px] text-rm-cream/80">{regole.nota}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="rm-pixel text-[8px] text-rm-cream uppercase">Capitale sociale</span>
          <span className="rm-pixel text-[10px] text-rm-gold">{money(cap)}</span>
        </div>
        <input type="range" min={min} max={max} step={min < 10 ? 1 : 100} className="rm-input" value={cap} onChange={(e) => update({ capitaleSociale: Number(e.target.value) })} />
        <div className="rm-text text-[13px] text-rm-cream/60">Versato subito alla costituzione: {money(versato)}{versato < cap ? ` (il resto, ${money(cap - versato)}, resta debito dei soci)` : ''}.</div>
      </PixelPanel>
      <PixelPanel title="Effetto del capitale" icon="chart">
        <div className="rm-card-dark rm-no-radius p-2 rm-text text-[15px] text-rm-cream">{eff.nota}</div>
        <div className="rm-text text-[15px] text-rm-cream/80 mt-1">Fido bancario aggiuntivo: {money(eff.fidoAggiuntivo)} · credibilità {Math.round(eff.credibilita * 100)}%</div>
        <div className="rm-text text-[13px] text-rm-gold mt-1">⚠️ Il capitale NON è cassa spendibile: è patrimonio vincolato della società.</div>
      </PixelPanel>
    </div>
  );
}