import React, { useState } from 'react';
import { PixelPanel, PixelButton } from '@/components/game/ui';
import CandidatoCard from '@/components/game/CandidatoCard';
import { RUOLI_ESTESI, CONTRATTI } from '@/lib/gameData';
import { money } from '@/lib/partita';

const COSTO_ANNUNCIO = 180;
const PROV_LABEL = { spontanea: 'Spontanea', annuncio: 'Annuncio' };
const PROV_BG = { spontanea: 'bg-rm-blue', annuncio: 'bg-rm-wood' };

/** Assunzioni: casella CV del mese, offerte ai candidati e pubblicazione annunci. */
export default function Mercato({ stato, report, decisioni, setDecisioni }) {
  // La casella CV arriva dal report del mese appena giocato (spontanee + risposte
  // agli annunci). Al primo turno, prima di avanzare, si usa stato.mercato.
  const candidati = report?.mercato ?? stato?.mercato ?? [];
  const offerte = decisioni.offerte ?? [];
  const annunci = decisioni.annunci ?? [];
  const idOfferti = new Set(offerte.map((o) => o.candidatoId));
  const [annForm, setAnnForm] = useState(null);

  const rimuoviOfferta = (id) => setDecisioni((p) => ({ ...p, offerte: (p.offerte ?? []).filter((o) => o.candidatoId !== id) }));

  const apriAnnuncio = () => setAnnForm({ ruolo: 'cameriere', budget: COSTO_ANNUNCIO });
  const confermaAnnuncio = () => {
    if (!annForm) return;
    setDecisioni((p) => ({ ...p, annunci: [...(p.annunci ?? []), { ruolo: annForm.ruolo, budget: Math.max(COSTO_ANNUNCIO, Number(annForm.budget)) }] }));
    setAnnForm(null);
  };
  const rimuoviAnnuncio = (i) => setDecisioni((p) => ({ ...p, annunci: (p.annunci ?? []).filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-3">
      <PixelPanel title="Casella CV" icon="envelope">
        <div className="rm-text text-[15px] text-rm-cream/70">
          {candidati.length} candidature in casella. Gli attributi sono una stima (forbice); alcuni tratti si scoprono solo lavorando.
          <span className="block text-rm-gold mt-1">📪 I CV non richiamati spariscono il mese dopo: le candidature non aspettano.</span>
        </div>
      </PixelPanel>

      {candidati.length === 0 ? (
        <div className="rm-card-dark rm-no-radius p-4 rm-text text-[17px] text-rm-cream/60 text-center">
          Casella vuota. Pubblica un annuncio per ricevere candidature mirate.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {candidati.map((c) => (
            <div key={c.id} className="relative">
              <span className="absolute -top-1 right-2 z-10 rm-chip" style={{ backgroundColor: c.provenienza === 'annuncio' ? '#8c5a3c' : '#3c5a8c' }}>
                {c.provenienza === 'annuncio' ? '📢 ANNUNCIO' : '📩 SPONTANEA'}
              </span>
              <CandidatoCard
                candidato={c}
                offerto={idOfferti.has(c.id)}
                onOffri={() => setDecisioni((p) => ({
                  ...p,
                  offerte: [...(p.offerte ?? []), {
                    candidatoId: c.id,
                    contratto: c.pretese.contratto,
                    superminimo: c.pretese.superminimoMinimo,
                    inRegola: true,
                    riposoFisso: c.pretese.vuoleRiposoFisso,
                  }],
                }))}
                onRimuovi={() => rimuoviOfferta(c.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pubblica annuncio */}
      <PixelPanel title="Pubblica annuncio" icon="mega">
        <div className="rm-text text-[15px] text-rm-cream/70 mb-2">
          Paga per un annuncio mirato su un ruolo: più budget = più risposte e migliori. In alta stagione costa di più e rende di meno.
        </div>
        {!annForm ? (
          <PixelButton variant="green" className="text-[9px] py-2" onClick={apriAnnuncio}>+ Pubblica annuncio</PixelButton>
        ) : (
          <div className="space-y-2">
            <div>
              <div className="rm-pixel text-[8px] text-rm-cream uppercase">Ruolo</div>
              <select className="rm-input" value={annForm.ruolo} onChange={(e) => setAnnForm({ ...annForm, ruolo: e.target.value })}>
                {Object.entries(RUOLI_ESTESI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="rm-pixel text-[8px] text-rm-cream uppercase">Budget</span>
                <span className="rm-pixel text-[10px] text-rm-gold">{money(annForm.budget)}</span>
              </div>
              <input type="range" min={COSTO_ANNUNCIO} max={600} step={20} className="rm-input" value={annForm.budget} onChange={(e) => setAnnForm({ ...annForm, budget: Number(e.target.value) })} />
              <div className="rm-text text-[13px] text-rm-cream/60">Minimo {money(COSTO_ANNUNCIO)}. Più spendi, più risposte (con rendimenti decrescenti).</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PixelButton variant="green" className="text-[9px] py-2" onClick={confermaAnnuncio}>Aggiungi</PixelButton>
              <PixelButton variant="wood" className="text-[9px] py-2" onClick={() => setAnnForm(null)}>Annulla</PixelButton>
            </div>
          </div>
        )}
      </PixelPanel>

      {annunci.length > 0 && (
        <PixelPanel title="Annunci in uscita (prossimo turno)" icon="mega">
          <div className="space-y-2">
            {annunci.map((a, i) => (
              <div key={i} className="rm-card-dark rm-no-radius p-2 flex items-center justify-between gap-2">
                <div className="rm-text text-[15px] text-rm-cream">
                  {RUOLI_ESTESI[a.ruolo] ?? a.ruolo} · budget {money(a.budget)}
                </div>
                <button onClick={() => rimuoviAnnuncio(i)} className="rm-pixel text-[9px] text-rm-red">rimuovi</button>
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {offerte.length > 0 && (
        <PixelPanel title="Offerte pronte (prossimo turno)" icon="envelope">
          <div className="space-y-2">
            {offerte.map((o) => {
              const c = candidati.find((x) => x.id === o.candidatoId);
              return (
                <div key={o.candidatoId} className="rm-card-dark rm-no-radius p-2 flex items-center justify-between gap-2">
                  <div className="rm-text text-[15px] text-rm-cream">
                    {c?.nome ?? o.candidatoId} · {CONTRATTI[o.contratto]} · +{Math.round((o.superminimo - 1) * 100)}% · {o.inRegola ? 'regolare' : 'nero'}
                  </div>
                  <button onClick={() => rimuoviOfferta(o.candidatoId)} className="rm-pixel text-[9px] text-rm-red">rimuovi</button>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      )}
    </div>
  );
}