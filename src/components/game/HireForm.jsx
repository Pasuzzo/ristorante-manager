import React, { useState } from 'react';
import { RUOLI, LIVELLI, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

const VUOTO = { nome: '', ruolo: 'cameriere', livello: 'medio', superminimo: 1, inRegola: true, stagionaleFinoAlMese: 0 };

export default function HireForm({ onConferma, onAnnulla }) {
  const [d, setD] = useState(VUOTO);
  const ok = d.nome.trim().length > 0;
  const conferma = () => {
    if (!ok) return;
    const a = { ...d, nome: d.nome.trim(), superminimo: Math.max(1, Number(d.superminimo) || 1) };
    if (!a.stagionaleFinoAlMese) delete a.stagionaleFinoAlMese;
    onConferma(a);
  };
  return (
    <div className="rm-card rm-no-radius p-2 space-y-2">
      <div className="rm-pixel text-[10px] text-rm-wood-dark">NUOVA ASSUNZIONE</div>
      <input className="rm-input w-full" placeholder="Nome" value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <select className="rm-input" value={d.ruolo} onChange={(e) => setD({ ...d, ruolo: e.target.value })}>
          {RUOLI.map((r) => <option key={r.value} value={r.value} className="bg-rm-bg">{r.label}</option>)}
        </select>
        <select className="rm-input" value={d.livello} onChange={(e) => setD({ ...d, livello: e.target.value })}>
          {LIVELLI.map((l) => <option key={l.value} value={l.value} className="bg-rm-bg">{l.label}</option>)}
        </select>
      </div>
      <div>
        <div className="rm-text text-[14px] text-rm-bg">Superminimo +{Math.round((d.superminimo - 1) * 100)}% · {money(lordoMensile(d.ruolo, d.superminimo))}/m</div>
        <input type="range" min={1} max={1.5} step={0.05} value={d.superminimo} onChange={(e) => setD({ ...d, superminimo: Number(e.target.value) })} className="w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="rm-text text-[15px] text-rm-bg flex items-center gap-2">
          <input type="checkbox" checked={d.inRegola} onChange={(e) => setD({ ...d, inRegola: e.target.checked })} /> in regola
        </label>
        <select className="rm-input" value={d.stagionaleFinoAlMese} onChange={(e) => setD({ ...d, stagionaleFinoAlMese: Number(e.target.value) })}>
          <option value={0} className="bg-rm-bg">a tempo indet.</option>
          {[3, 6, 7, 8, 9, 12].map((m) => <option key={m} value={m} className="bg-rm-bg">stagionale fino a M{m}</option>)}
        </select>
      </div>
      <div className="flex gap-1">
        <button className="rm-btn rm-btn-green flex-1 !text-[9px]" onClick={conferma} disabled={!ok}>CONFERMA</button>
        <button className="rm-btn rm-btn-wood !text-[9px]" onClick={onAnnulla}>ANNULLA</button>
      </div>
    </div>
  );
}