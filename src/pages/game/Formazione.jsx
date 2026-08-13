import React, { useState } from 'react';
import { PixelPanel, PixelButton, Chip } from '@/components/game/ui';
import { money } from '@/lib/partita';
import { ruoloLabel } from '@/lib/gameData';
import { CORSI } from '../../../base44/shared/engine/formazione';

const TIPO_LABEL = { obbligatorio: 'OBBL.', professionalizzante: 'PRO.', aggiornamento: 'AGG.' };
const TIPO_COLOR = { obbligatorio: 'bg-rm-red', professionalizzante: 'bg-rm-blue', aggiornamento: 'bg-rm-wood' };

/** Formazione: obblighi del mese + iscrizione ai corsi. */
export default function Formazione({ stato, report, decisioni, setDecisioni }) {
  const [selDip, setSelDip] = useState('');
  const [selCorso, setSelCorso] = useState('');
  const staff = stato?.staff ?? [];
  const obblighi = report?.obblighiFormativi ?? [];
  const iscrizioni = decisioni?.corsi ?? [];

  const aggiungi = () => {
    if (!selDip || !selCorso) return;
    setDecisioni((p) => ({ ...p, corsi: [...(p.corsi ?? []), { idDipendente: selDip, idCorso: selCorso }] }));
    setSelCorso('');
  };
  const rimuovi = (i) => setDecisioni((p) => ({ ...p, corsi: (p.corsi ?? []).filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-3">
      <PixelPanel title="Obblighi formativi" icon="spark">
        {obblighi.length === 0 ? (
          <div className="rm-text text-[16px] text-rm-cream/60">Tutto in regola: nessun obbligo mancante.</div>
        ) : (
          <div className="space-y-2">
            {obblighi.map((o, i) => (
              <div key={i} className="rm-card rm-no-radius p-2" style={{ borderColor: o.scaduto ? '#c8443c' : '#5a3825' }}>
                <div className="flex items-center justify-between">
                  <span className="rm-pixel text-[10px] text-rm-bg">{o.nome}</span>
                  {o.scaduto && <span className="rm-chip bg-rm-red">SCADUTO</span>}
                </div>
                <div className="mt-1 flex items-center justify-between rm-text text-[15px] text-rm-wood-dark">
                  <span>{o.mancanti} {o.mancanti === 1 ? 'persona' : 'persone'} · {o.oreTotali}h</span>
                  <span className="rm-pixel text-[9px] text-rm-red">{money(o.costoTotale)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Iscrivi a un corso" icon="chef">
        <div className="space-y-2">
          <select className="rm-input" value={selDip} onChange={(e) => setSelDip(e.target.value)}>
            <option value="">Dipendente…</option>
            {staff.map((d) => <option key={d.id} value={d.id}>{d.nome} · {ruoloLabel(d.ruolo)}</option>)}
          </select>
          <select className="rm-input" value={selCorso} onChange={(e) => setSelCorso(e.target.value)}>
            <option value="">Corso…</option>
            {CORSI.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} ({TIPO_LABEL[c.tipo]}) · {c.ore}h · {money(c.costo)}</option>
            ))}
          </select>
          <PixelButton variant="green" full className="text-[9px] py-2" onClick={aggiungi} disabled={!selDip || !selCorso}>
            + Iscrivi
          </PixelButton>
        </div>
      </PixelPanel>

      {iscrizioni.length > 0 && (
        <PixelPanel title="In corso di iscrizione (prossimo mese)" icon="cal">
          <div className="space-y-2">
            {iscrizioni.map((i, idx) => {
              const d = staff.find((x) => x.id === i.idDipendente);
              const c = CORSI.find((x) => x.id === i.idCorso);
              if (!c) return null;
              return (
                <div key={idx} className="rm-card rm-no-radius p-2 flex items-center justify-between">
                  <div>
                    <div className="rm-pixel text-[10px] text-rm-bg">{d?.nome ?? 'Titolare'}</div>
                    <div className="rm-text text-[15px] text-rm-wood-dark">
                      {c.nome} · <Chip color={TIPO_COLOR[c.tipo]}>{TIPO_LABEL[c.tipo]}</Chip> {c.ore}h {money(c.costo)}
                    </div>
                  </div>
                  <PixelButton className="text-[8px] py-1 px-2" onClick={() => rimuovi(idx)}>Annulla</PixelButton>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      )}

      <PixelPanel title="Catalogo corsi" icon="fork">
        <div className="space-y-2">
          {CORSI.map((c) => (
            <div key={c.id} className="rm-card-dark rm-no-radius p-2">
              <div className="flex items-center justify-between">
                <span className="rm-pixel text-[9px] text-rm-cream">{c.nome}</span>
                <Chip color={TIPO_COLOR[c.tipo]}>{TIPO_LABEL[c.tipo]}</Chip>
              </div>
              <div className="rm-text text-[14px] text-rm-cream/70">{c.ore}h d'aula · {money(c.costo)} a persona</div>
            </div>
          ))}
        </div>
      </PixelPanel>
    </div>
  );
}