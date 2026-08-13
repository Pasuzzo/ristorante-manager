import React from 'react';
import { PixelPanel, PixelButton, Chip } from '@/components/game/ui';
import { ruoloLabel, repartoDi } from '@/lib/gameData';
import { money } from '@/lib/partita';

const RISPOSTE = [
  { v: 'accetta', label: 'Accetta' },
  { v: 'alza_budget', label: 'Alza budget' },
  { v: 'parla', label: 'Parla' },
  { v: 'richiamo', label: 'Richiamo' },
  { v: 'ritira_delega', label: 'Togli delega' },
  { v: 'licenzia', label: 'Licenzia' },
];

function SliderBudget({ label, value, onChange }) {
  return (
    <PixelPanel title={label} icon="tag">
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={8000} step={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
        <span className="rm-pixel text-[11px] text-rm-cream w-[80px] text-right">{money(value)}</span>
      </div>
    </PixelPanel>
  );
}

function Responsabile({ label, staff, aff, attuale, onSelect }) {
  return (
    <PixelPanel title={label} icon="chef">
      <select className="rm-input" value={attuale ?? ''} onChange={(e) => onSelect(e.target.value)}>
        <option value="">— nessuno —</option>
        {staff.map((d) => (
          <option key={d.id} value={d.id}>{d.nome} · {ruoloLabel(d.ruolo)} (aff. {Math.round(aff[d.id] ?? 50)})</option>
        ))}
      </select>
    </PixelPanel>
  );
}

/** Reparti: budget, responsabili, sforamenti e risposte. */
export default function Reparti({ stato, report, decisioni, setDecisioni }) {
  const rep = stato?.reparti ?? {};
  const staff = stato?.staff ?? [];
  const aff = report?.affidabilita ?? {};
  const sforamenti = report?.sforamenti ?? [];
  const cucina = staff.filter((d) => repartoDi(d.ruolo) === 'cucina');
  const sala = staff.filter((d) => repartoDi(d.ruolo) === 'sala');

  const dr = decisioni.reparti ?? {};
  const setBudget = (campo, val) => setDecisioni((p) => ({ ...p, reparti: { ...(p.reparti ?? {}), [campo]: val } }));
  const setResp = (campo, id) => setDecisioni((p) => ({ ...p, reparti: { ...(p.reparti ?? {}), [campo]: id || null } }));
  const rispondi = (reparto, risposta) => setDecisioni((p) => ({ ...p, rispostaSforamento: { reparto, risposta } }));

  return (
    <div className="space-y-3">
      {report?.durcIrregolare && (
        <div className="rm-chip bg-rm-red w-full text-center">DURC IRREGOLARE — niente bandi né sgravi</div>
      )}

      <SliderBudget label="Budget Cucina" value={dr.budgetCucina ?? rep.budgetCucina ?? 0} onChange={(v) => setBudget('budgetCucina', v)} />
      <SliderBudget label="Budget Sala" value={dr.budgetSala ?? rep.budgetSala ?? 0} onChange={(v) => setBudget('budgetSala', v)} />

      <Responsabile label="Responsabile Cucina" staff={cucina} aff={aff} attuale={dr.responsabileCucina ?? rep.responsabileCucina} onSelect={(id) => setResp('responsabileCucina', id)} />
      <Responsabile label="Responsabile Sala" staff={sala} aff={aff} attuale={dr.responsabileSala ?? rep.responsabileSala} onSelect={(id) => setResp('responsabileSala', id)} />

      {sforamenti.length === 0 ? (
        <PixelPanel title="Sforamenti" icon="tag">
          <div className="rm-text text-[16px] text-rm-cream/60">Nessuno sforamento il mese scorso.</div>
        </PixelPanel>
      ) : (
        <PixelPanel title="Sforamenti del mese" icon="tag">
          <div className="space-y-2">
            {sforamenti.map((s, i) => {
              const sel = decisioni.rispostaSforamento?.reparto === s.reparto ? decisioni.rispostaSforamento.risposta : null;
              return (
                <div key={i} className="rm-card-dark rm-no-radius p-2">
                  <div className="flex items-center justify-between">
                    <span className="rm-pixel text-[10px] text-rm-cream">{s.reparto} · +{money(s.eccesso)} ({Math.round(s.quota * 100)}%)</span>
                    <Chip color={s.segnalatoPrima ? 'bg-rm-blue' : 'bg-rm-red'}>{s.segnalatoPrima ? 'AVVISATO' : 'NON AVVISATO'}</Chip>
                  </div>
                  {s.responsabileNome && <div className="rm-text text-[14px] text-rm-gold mt-1">Responsabile: {s.responsabileNome}</div>}
                  <div className="rm-text text-[15px] text-rm-cream/80 mt-1">{s.spiegazione}</div>
                  <div className="rm-text text-[13px] text-rm-cream/50 mt-1">Causa: {s.causa.replace(/_/g, ' ')}</div>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {RISPOSTE.map((r) => (
                      <PixelButton key={r.v} variant={sel === r.v ? 'green' : 'wood'} className="text-[8px] py-2" onClick={() => rispondi(s.reparto, r.v)}>
                        {r.label}
                      </PixelButton>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      )}
    </div>
  );
}