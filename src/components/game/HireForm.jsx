import React, { useState } from 'react';
import { PixelButton } from '@/components/game/ui';
import { RUOLI, LIVELLI, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

const empty = {
  nome: '', ruolo: 'cameriere', livello: 'medio', superminimo: 1, inRegola: true, stagionale: false, stagionaleFinoAlMese: 9,
};

/** Form per comporre una nuova assunzione (NuovaAssunzione lato motore). */
export default function HireForm({ onConferma, onAnnulla }) {
  const [s, setS] = useState(empty);
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const conferma = () => {
    if (!s.nome.trim()) return;
    const ass = {
      nome: s.nome.trim(),
      ruolo: s.ruolo,
      livello: s.livello,
      superminimo: Number(s.superminimo),
      inRegola: !!s.inRegola,
    };
    if (s.stagionale) ass.stagionaleFinoAlMese = Number(s.stagionaleFinoAlMese);
    onConferma(ass);
  };

  const lordo = lordoMensile(s.ruolo, Number(s.superminimo));

  return (
    <div className="rm-card rm-no-radius rm-shadow p-3">
      <div className="rm-pixel text-[11px] text-rm-bg mb-2">Nuova assunzione</div>

      <label className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Nome</label>
      <input className="rm-input mb-2" value={s.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Es. Mario" />

      <label className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Ruolo</label>
      <select className="rm-input mb-2" value={s.ruolo} onChange={(e) => set('ruolo', e.target.value)}>
        {RUOLI.map((r) => <option key={r.value} value={r.value} className="bg-rm-bg">{r.label} ({r.reparto})</option>)}
      </select>

      <label className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Livello</label>
      <select className="rm-input mb-2" value={s.livello} onChange={(e) => set('livello', e.target.value)}>
        {LIVELLI.map((l) => <option key={l.value} value={l.value} className="bg-rm-bg">{l.label} — {l.hint}</option>)}
      </select>

      <label className="rm-pixel text-[8px] text-rm-wood-dark uppercase">
        Superminimo: +{Math.round((Number(s.superminimo) - 1) * 100)}% · {money(lordo)}/mese
      </label>
      <input type="range" min={1} max={1.6} step={0.05} className="rm-input mb-2" value={s.superminimo} onChange={(e) => set('superminimo', e.target.value)} />

      <label className="flex items-center gap-2 mb-2 rm-text text-[17px] text-rm-bg">
        <input type="checkbox" checked={s.inRegola} onChange={(e) => set('inRegola', e.target.checked)} />
        Contratto regolare (in bianco)
      </label>

      <label className="flex items-center gap-2 mb-1 rm-text text-[17px] text-rm-bg">
        <input type="checkbox" checked={s.stagionale} onChange={(e) => set('stagionale', e.target.checked)} />
        Stagionale (cessa a fine mese scelto)
      </label>
      {s.stagionale && (
        <select className="rm-input mb-2" value={s.stagionaleFinoAlMese} onChange={(e) => set('stagionaleFinoAlMese', Number(e.target.value))}>
          {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1} className="bg-rm-bg">Fino a mese {i + 1}</option>)}
        </select>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2">
        <PixelButton variant="green" className="text-[9px] py-2" onClick={conferma} disabled={!s.nome.trim()}>Conferma</PixelButton>
        <PixelButton variant="wood" className="text-[9px] py-2" onClick={onAnnulla}>Annulla</PixelButton>
      </div>
    </div>
  );
}