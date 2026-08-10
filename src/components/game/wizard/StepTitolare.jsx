import React from 'react';
import { PixelPanel } from '@/components/game/ui';
import { money } from '@/lib/partita';

function etichettaBudget(b) {
  if (b < 100000) return 'molto stretto: solo subentri in zone defilate';
  if (b <= 200000) return 'realistico se rilevi un’attività avviata';
  return 'puoi permetterti di allestire da zero';
}

/** Step 1 — Il titolare, il nome del locale e il capitale sul piatto. */
export default function StepTitolare({ data, update }) {
  const t = data.titolare;
  return (
    <div className="space-y-3">
      <PixelPanel title="Il ristorante" icon="chef">
        <label className="rm-pixel text-[8px] text-rm-cream uppercase">Nome del locale</label>
        <input className="rm-input" value={data.nomeRistorante} onChange={(e) => update({ nomeRistorante: e.target.value })} placeholder="Es. Trattoria del Porto" />
      </PixelPanel>

      <PixelPanel title="Il capitale" icon="coin">
        <div className="flex items-center justify-between">
          <span className="rm-pixel text-[8px] text-rm-cream uppercase">Budget iniziale</span>
          <span className="rm-pixel text-[12px] text-rm-gold">{money(data.budgetIniziale)}</span>
        </div>
        <input type="range" min={50000} max={500000} step={5000} className="rm-input" value={data.budgetIniziale} onChange={(e) => update({ budgetIniziale: Number(e.target.value) })} />
        <div className="rm-text text-[15px] text-rm-cream/90 mt-1">🎯 {etichettaBudget(data.budgetIniziale)}</div>
        <div className="rm-text text-[13px] text-rm-cream/60 mt-1">I soldi che metti sul piatto prima di guardare i locali. Più sono, più puoi permetterti di allestire da zero invece di rilevare un’attività avviata.</div>
      </PixelPanel>

      <PixelPanel title="Il titolare" icon="users">
        <label className="rm-pixel text-[8px] text-rm-cream uppercase">Nome del titolare</label>
        <input className="rm-input mb-2" value={t.nome} onChange={(e) => update({ titolare: { ...t, nome: e.target.value } })} placeholder="Es. Mario Rossi" />
        <div className="flex items-center justify-between">
          <span className="rm-pixel text-[8px] text-rm-cream uppercase">Età</span>
          <span className="rm-pixel text-[10px] text-rm-gold">{t.eta} anni</span>
        </div>
        <input type="range" min={25} max={65} className="rm-input" value={t.eta} onChange={(e) => update({ titolare: { ...t, eta: Number(e.target.value) } })} />
        <div className="rm-text text-[13px] text-rm-cream/60">Sotto i 35 agevolazioni per giovani under 35; over 55 più esperienza ma il fisico conta.</div>
        <div className="rm-pixel text-[8px] text-rm-cream uppercase mt-2">Sesso</div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {['M', 'F'].map((sx) => (
            <button key={sx} onClick={() => update({ titolare: { ...t, sesso: sx } })} className={`rm-btn ${t.sesso === sx ? 'rm-btn-green' : 'rm-btn-wood'} text-[10px] py-2`}>{sx === 'M' ? 'Uomo' : 'Donna'}</button>
          ))}
        </div>
        <div className="rm-text text-[13px] text-rm-cream/60 mt-1">Alcuni bandi premiano la titolarità femminile.</div>
      </PixelPanel>
    </div>
  );
}