import React, { useState } from 'react';
import { RUOLI, LIVELLI, lordoMensile } from '@/lib/gameData';

const VUOTO = { nome: '', ruolo: 'cuoco', livello: 'medio', superminimo: 1, inRegola: true, stagionaleFinoAlMese: 0 };

export default function StaffPicker({ staff, setStaff }) {
  const [draft, setDraft] = useState(VUOTO);
  const [aperto, setAperto] = useState(false);

  const aggiungi = () => {
    if (!draft.nome.trim()) return;
    const a = { ...draft, nome: draft.nome.trim(), superminimo: Math.max(1, Number(draft.superminimo) || 1) };
    if (!a.stagionaleFinoAlMese) delete a.stagionaleFinoAlMese;
    setStaff([...staff, a]);
    setDraft(VUOTO);
    setAperto(false);
  };
  const rimuovi = (i) => setStaff(staff.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="rm-pixel text-[10px] text-rm-cream">LA TUA BRIGATA D'APERTURA</span>
        {!aperto && (
          <button type="button" className="rm-pixel text-[9px] bg-rm-green text-rm-cream border-[2px] border-rm-wood-dark px-2 py-1" onClick={() => setAperto(true)}>
            + ASSUMI
          </button>
        )}
      </div>

      {staff.length === 0 && !aperto && (
        <p className="rm-text text-[16px] text-rm-cream/60">Nessuno. Apri da solo? Senza brigata non si serve un coperto.</p>
      )}

      {staff.map((a, i) => (
        <div key={i} className="rm-card-dark rm-no-radius p-2 flex items-center justify-between">
          <div>
            <div className="rm-pixel text-[11px] text-rm-cream">{a.nome}</div>
            <div className="rm-text text-[15px] text-rm-cream/70">
              {RUOLI.find((r) => r.value === a.ruolo)?.label} · {a.livello} · lordo {lordoMensile(a.ruolo, a.superminimo)} €/m
              {!a.inRegola && <span className="text-rm-red rm-blink ml-2">IN NERO</span>}
              {a.stagionaleFinoAlMese ? ` · stagionale fino a M${a.stagionaleFinoAlMese}` : ''}
            </div>
          </div>
          <button type="button" className="rm-pixel text-[9px] bg-rm-red text-rm-cream border-[2px] border-rm-wood-dark px-2 py-1" onClick={() => rimuovi(i)}>
            LICENZIA
          </button>
        </div>
      ))}

      {aperto && (
        <div className="rm-card rm-no-radius p-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input className="rm-input" placeholder="Nome" value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} />
            <select className="rm-input" value={draft.ruolo} onChange={(e) => setDraft({ ...draft, ruolo: e.target.value })}>
              {RUOLI.map((r) => <option key={r.value} value={r.value} className="bg-rm-bg">{r.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="rm-input" value={draft.livello} onChange={(e) => setDraft({ ...draft, livello: e.target.value })}>
              {LIVELLI.map((l) => <option key={l.value} value={l.value} className="bg-rm-bg">{l.label} — {l.note}</option>)}
            </select>
            <label className="rm-text text-[15px] text-rm-bg flex items-center gap-2">
              <input type="checkbox" checked={draft.inRegola} onChange={(e) => setDraft({ ...draft, inRegola: e.target.checked })} />
              in regola
            </label>
          </div>
          <div>
            <label className="rm-text text-[14px] text-rm-bg">Superminimo: <span className="rm-pixel text-[11px]">+{Math.round((draft.superminimo - 1) * 100)}%</span> · lordo {lordoMensile(draft.ruolo, draft.superminimo)} €/m</label>
            <input type="range" min={1} max={1.5} step={0.05} value={draft.superminimo} onChange={(e) => setDraft({ ...draft, superminimo: Number(e.target.value) })} className="w-full" />
          </div>
          <div className="flex gap-2">
            <button type="button" className="rm-btn rm-btn-green flex-1" onClick={aggiungi}>CONFERMA ASSUNZIONE</button>
            <button type="button" className="rm-btn rm-btn-wood" onClick={() => setAperto(false)}>ANNULLA</button>
          </div>
        </div>
      )}
    </div>
  );
}