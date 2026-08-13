import React, { useMemo } from 'react';
import { money } from '@/lib/partita';
import { PixelPanel, SectionTitle, Stat, SegmentedBar, Chip, PixelButton } from '@/components/game/ui';
import { RUOLI_ESTESI } from '@/lib/gameData';

/**
 * Turni: si decide il monte ore settimanale di ognuno, diviso tra giorni
 * feriali e festivi. Le ore contrattuali non sono ore di servizio (prep,
 * carico, pulizie ne mangiano una fetta): il motore lo tiene già in conto.
 *
 * Le modifiche vanno in decisioni.orari e valgono dal prossimo mese.
 */

const FULL_TIME = 40;

function StepperOre({ label, value, onChange, max = 40 }) {
  const set = (v) => onChange(Math.max(0, Math.min(max, v)));
  return (
    <div className="flex items-center gap-1">
      <span className="rm-pixel text-[7px] uppercase text-rm-wood-dark w-[52px]">{label}</span>
      <PixelButton variant="wood" className="text-[9px] px-2 py-[2px]" onClick={() => set(value - 2)}>−</PixelButton>
      <span className="rm-pixel text-[11px] text-rm-bg w-[28px] text-center">{value}</span>
      <PixelButton variant="wood" className="text-[9px] px-2 py-[2px]" onClick={() => set(value + 2)}>+</PixelButton>
    </div>
  );
}

function RigaDipendente({ d, orario, busta, onChange }) {
  const tot = (orario.oreFeriali ?? 0) + (orario.oreFestive ?? 0);
  const oltre = tot > FULL_TIME;
  return (
    <div className="rm-card rm-no-radius p-2 rm-shadow mb-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className="rm-pixel text-[11px] text-rm-bg">{d.nome}</span>
          <span className="rm-text text-[15px] text-rm-wood-dark ml-2">
            {RUOLI_ESTESI[d.ruoloEsteso ?? d.ruolo] ?? d.ruolo}
          </span>
          {!d.inRegola && <Chip color="bg-rm-red" className="ml-2">IN NERO</Chip>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rm-pixel text-[11px] ${oltre ? 'text-rm-red' : 'text-rm-bg'}`}>{tot}h</span>
          {oltre && <Chip color="bg-rm-red">STRAORDINARIO</Chip>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-2">
        <StepperOre label="Feriali" value={orario.oreFeriali ?? 0} onChange={(v) => onChange({ ...orario, oreFeriali: v })} />
        <StepperOre label="Festivi" value={orario.oreFestive ?? 0} onChange={(v) => onChange({ ...orario, oreFestive: v })} />
      </div>

      {busta && (
        <div className="grid grid-cols-3 gap-1 mt-2">
          <div>
            <div className="rm-pixel text-[6px] uppercase text-rm-wood-dark">Costo azienda</div>
            <div className="rm-pixel text-[10px] text-rm-bg">{money(busta.costoAzienda)}</div>
          </div>
          <div>
            <div className="rm-pixel text-[6px] uppercase text-rm-wood-dark">Lordo</div>
            <div className="rm-pixel text-[10px] text-rm-bg">{money(busta.lordo)}</div>
          </div>
          <div>
            <div className="rm-pixel text-[6px] uppercase text-rm-wood-dark">Netto</div>
            <div className="rm-pixel text-[10px] text-rm-bg">
              {money(busta.nettoInBusta)}
              {busta.cashNero > 0 && <span className="text-rm-red"> +{money(busta.cashNero)}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Turni({ stato, report, decisioni, setDecisioni }) {
  const staff = stato?.staff ?? [];
  const orari = { ...(stato?.orari ?? {}), ...(decisioni.orari ?? {}) };
  const buste = report?.buste ?? {};
  const fab = report?.fabbisogno;

  const oreTotali = useMemo(
    () => staff.reduce((s, d) => s + ((orari[d.id]?.oreFeriali ?? 0) + (orari[d.id]?.oreFestive ?? 0)), 0),
    [staff, orari],
  );
  const costoTotale = useMemo(
    () => Object.values(buste).reduce((s, b) => s + (b.costoAzienda ?? 0), 0),
    [buste],
  );

  const setOrario = (id, o) =>
    setDecisioni((p) => ({ ...p, orari: { ...(p.orari ?? {}), [id]: o } }));

  const sotto = fab?.stato === 'sotto_organico';
  const sopra = fab?.stato === 'sovradimensionato';

  return (
    <div className="space-y-3">
      <PixelPanel title="Organico della settimana" icon="cal">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Ore a settimana" value={`${oreTotali}h`} icon="clock" />
          <Stat label="Costo personale" value={money(costoTotale)} icon="coin" />
          <Stat
            label="Copertura"
            value={sotto ? 'SOTTO' : sopra ? 'TROPPO' : 'OK'}
            icon="fork"
            accent={sotto ? 'text-rm-red' : sopra ? 'text-rm-gold' : 'text-rm-green'}
          />
        </div>

        {fab && (
          <div className="rm-card-dark rm-no-radius p-2 mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="rm-pixel text-[8px] uppercase text-rm-cream/60">Coperti/settimana</span>
              <span className="rm-pixel text-[10px] text-rm-cream">
                {fab.capacita} regge · {fab.copertiPrevisti} previsti
              </span>
            </div>
            <SegmentedBar
              value={Math.min(fab.capacita, fab.copertiPrevisti)}
              max={Math.max(fab.capacita, fab.copertiPrevisti, 1)}
              segments={20}
              color={sotto ? '#c8443c' : '#5a8c46'}
              size={10}
            />
            {sotto && (
              <div className="rm-text text-[16px] text-rm-red mt-2">
                Sotto organico: mancano circa {fab.oreMancantiCucina}h in cucina e {fab.oreMancantiSala}h in sala.
                Aggiungi ore, assumi, o accetta di respingere clienti.
              </div>
            )}
            {sopra && (
              <div className="rm-text text-[16px] text-rm-gold mt-2">
                Organico sovradimensionato per la domanda prevista: stai pagando ore che non servono.
              </div>
            )}
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="In caso di sovraccarico" icon="stamp">
        <div className="flex gap-2">
          {[
            { v: 'straordinari', l: 'STRAORDINARI', d: 'Copri i clienti pagando la maggiorazione. La squadra si stanca.' },
            { v: 'respingi', l: 'RESPINGI', d: 'Nessun costo extra, ma clienti a casa e recensioni.' },
          ].map((o) => {
            const attivo = (decisioni.politicaSovraccarico ?? 'straordinari') === o.v;
            return (
              <button
                key={o.v}
                onClick={() => setDecisioni((p) => ({ ...p, politicaSovraccarico: o.v }))}
                className={`flex-1 rm-btn ${attivo ? 'rm-btn-green' : 'rm-btn-wood'} text-[9px] py-2`}
              >
                {o.l}
              </button>
            );
          })}
        </div>
        <div className="rm-text text-[15px] text-rm-cream/70 mt-2">
          {(decisioni.politicaSovraccarico ?? 'straordinari') === 'straordinari'
            ? 'Copri i clienti pagando la maggiorazione. La squadra si stanca.'
            : 'Nessun costo extra, ma clienti a casa e recensioni.'}
        </div>
      </PixelPanel>

      <div>
        <SectionTitle icon="user">Monte ore per persona</SectionTitle>
        {staff.length === 0 && (
          <div className="rm-card-dark rm-no-radius p-4 rm-text text-[17px] text-rm-cream/60 text-center">
            Nessun dipendente. Vai su Assunzioni.
          </div>
        )}
        {staff.map((d) => (
          <RigaDipendente
            key={d.id}
            d={d}
            orario={orari[d.id] ?? { oreFeriali: 24, oreFestive: 16 }}
            busta={buste[d.id]}
            onChange={(o) => setOrario(d.id, o)}
          />
        ))}
      </div>

      <div className="rm-text text-[15px] text-rm-cream/60">
        Le ore contrattuali non sono tutte ore di servizio: prep, carico merce e
        pulizie ne assorbono una parte. Le modifiche valgono dal prossimo mese.
      </div>
    </div>
  );
}