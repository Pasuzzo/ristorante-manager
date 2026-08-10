import React from 'react';
import { PixelPanel, PixelButton } from '@/components/game/ui';
import { money } from '@/lib/partita';

function colore(linea) {
  if (linea.startsWith('❌')) return 'text-rm-red';
  if (linea.startsWith('⚠️')) return 'text-rm-gold';
  if (linea.startsWith('ℹ️')) return 'text-rm-blue';
  if (linea.startsWith('✅')) return 'text-rm-green';
  return 'text-rm-cream';
}

/** Step 8 — Riepilogo della costituzione (da __logCostituzione). */
export default function StepRiepilogo({ esito, data, onEntra, onModifica, onRicomincia }) {
  if (!esito) return null;
  const log = esito.logCostituzione ?? [];
  const esiti = log.filter((l) => /ha accettato|ha rifiutato/.test(l));
  const avvisi = log.filter((l) => !/ha accettato|ha rifiutato/.test(l));
  const bloccante = avvisi.some((l) => l.includes('budget non basta'));

  return (
    <div className="space-y-3">
      <PixelPanel title="Esiti delle offerte" icon="envelope">
        <div className="rm-card-dark rm-no-radius p-2 space-y-1">
          {esiti.length === 0 && <div className="rm-text text-[15px] text-rm-cream/60">Nessuna offerta fatta.</div>}
          {esiti.map((l, i) => <div key={i} className={`rm-text text-[16px] ${colore(l)}`}>{l}</div>)}
        </div>
      </PixelPanel>

      <PixelPanel title="Conto della costituzione" icon="coin">
        <div className="rm-card-dark rm-no-radius p-2 space-y-1">
          <div className="flex justify-between rm-text text-[16px] text-rm-cream"><span>Cassa operativa che resta</span><span className={esito.cassaOperativa < 0 ? 'text-rm-red' : 'text-rm-gold'}>{money(esito.cassaOperativa)}</span></div>
          {esito.capitaleVersato > 0 && <div className="flex justify-between rm-text text-[16px] text-rm-cream"><span>Capitale vincolato</span><span>{money(esito.capitaleVersato)}</span></div>}
        </div>
      </PixelPanel>

      <PixelPanel title="Avvisi" icon="spark">
        <div className="rm-card-dark rm-no-radius p-2 space-y-1">
          {avvisi.length === 0 && <div className="rm-text text-[15px] text-rm-cream/60">Tutto a posto. Si parte.</div>}
          {avvisi.map((l, i) => <div key={i} className={`rm-text text-[16px] ${colore(l)}`}>{l}</div>)}
        </div>
      </PixelPanel>

      <div className="space-y-2">
        {bloccante ? (
          <>
            <div className="rm-card-dark rm-no-radius p-2 rm-text text-[16px] text-rm-red text-center">Il budget non basta per aprire così. Modifica le scelte e riprova.</div>
            <PixelButton variant="wood" full onClick={onModifica}>Modifica e riprova</PixelButton>
          </>
        ) : (
          <>
            <PixelButton variant="green" full onClick={onEntra}>Entra nel locale ▶</PixelButton>
            <button onClick={onRicomincia} className="rm-pixel text-[9px] text-rm-cream/50 w-full text-center mt-1">ricomincia da capo</button>
          </>
        )}
      </div>
    </div>
  );
}