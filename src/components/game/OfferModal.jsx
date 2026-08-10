import React, { useState } from 'react';
import { PixelButton } from '@/components/game/ui';
import { CONTRATTI, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

const empty = (candidatoId, c) => ({
  candidatoId,
  contratto: c.pretese.contratto,
  superminimo: c.pretese.superminimoMinimo,
  inRegola: true,
  riposoFisso: c.pretese.vuoleRiposoFisso,
  stagionale: false,
  stagionaleFinoAlMese: 9,
});

/** Modale per comporre un'offerta a un candidato del pool. */
export default function OfferModal({ candidato, onConferma, onAnnulla }) {
  const [s, setS] = useState(() => empty(candidato.id, candidato));
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const conferma = () => {
    const offerta = {
      candidatoId: s.candidatoId,
      contratto: s.contratto,
      superminimo: Number(s.superminimo),
      inRegola: !!s.inRegola,
      riposoFisso: !!s.riposoFisso,
    };
    if (s.stagionale) offerta.stagionaleFinoAlMese = Number(s.stagionaleFinoAlMese);
    onConferma(offerta);
  };

  return (
    <div className="fixed inset-0 z-50 bg-rm-bg2/80 flex items-center justify-center p-2 rm-scroll overflow-y-auto">
      <div className="rm-wood rm-no-radius rm-shadow w-full max-w-md my-4">
        <div className="rm-tovaglia-red border-b-[4px] border-rm-wood-dark px-3 py-2 flex items-center justify-between">
          <span className="rm-pixel text-[11px] text-rm-bg">Offerta a {candidato.nome}</span>
          <button onClick={onAnnulla} className="rm-pixel text-[12px] text-rm-bg">✕</button>
        </div>
        <div className="p-3 space-y-3">
          <div>
            <div className="rm-pixel text-[8px] text-rm-cream uppercase">Contratto</div>
            <select className="rm-input" value={s.contratto} onChange={(e) => set('contratto', e.target.value)}>
              {Object.entries(CONTRATTI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="rm-pixel text-[8px] text-rm-cream uppercase">Superminimo (sul CCNL)</span>
              <span className="rm-pixel text-[10px] text-rm-gold">+{Math.round((s.superminimo - 1) * 100)}% · {money(lordoMensile(candidato.ruolo, s.superminimo))}/mese</span>
            </div>
            <input type="range" min={1} max={1.5} step={0.01} className="rm-input" value={s.superminimo} onChange={(e) => set('superminimo', Number(e.target.value))} />
            <div className="rm-text text-[13px] text-rm-cream/60">Il candidato chiede minimo +{Math.round((candidato.pretese.superminimoMinimo - 1) * 100)}%. Sotto, rifiuta o parte scontento.</div>
          </div>
          <label className="flex items-center gap-2 rm-text text-[16px] text-rm-cream">
            <input type="checkbox" checked={s.inRegola} onChange={(e) => set('inRegola', e.target.checked)} /> Contratto regolare (in busta)
          </label>
          <label className="flex items-center gap-2 rm-text text-[16px] text-rm-cream">
            <input type="checkbox" checked={s.riposoFisso} onChange={(e) => set('riposoFisso', e.target.checked)} /> Giorno di riposo fisso
          </label>
          <label className="flex items-center gap-2 rm-text text-[16px] text-rm-cream">
            <input type="checkbox" checked={s.stagionale} onChange={(e) => set('stagionale', e.target.checked)} /> Contratto stagionale
          </label>
          {s.stagionale && (
            <div>
              <div className="rm-pixel text-[8px] text-rm-cream uppercase">Fino al mese</div>
              <select className="rm-input" value={s.stagionaleFinoAlMese} onChange={(e) => set('stagionaleFinoAlMese', Number(e.target.value))}>
                {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <PixelButton variant="green" onClick={conferma}>Conferma offerta</PixelButton>
            <PixelButton variant="wood" onClick={onAnnulla}>Annulla</PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
}