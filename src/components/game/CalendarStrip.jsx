import React, { useEffect, useMemo, useRef, useState } from 'react';
import { money } from '@/lib/partita';
import { PixelPanel, PixelButton, Stat } from './ui';

/**
 * Playback del mese: scorre report.giorni una casella alla volta.
 * Il motore ha già calcolato tutto — qui si riproduce e basta, quindi
 * nessuna chiamata di rete durante lo scorrimento.
 *
 * onFine() viene chiamato quando l'ultimo giorno è stato mostrato
 * (o quando si preme «fine mese»).
 */

const DOW = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const VELOCITA = [
  { label: '1x', ms: 2500 },
  { label: '2x', ms: 1250 },
  { label: '4x', ms: 625 },
];

/** Colore della casella in base al riempimento rispetto al giorno più pieno. */
function coloreGiorno(g, max) {
  if (g.chiuso) return '#3a3040';
  const q = max > 0 ? g.copertiServitiGiorno / max : 0;
  if (q <= 0) return '#4a3a52';
  if (q < 0.35) return '#5a8c46';
  if (q < 0.7) return '#8fae4a';
  return '#e8b84b';
}

function Casella({ g, max, attivo, mostrato }) {
  const bg = mostrato ? coloreGiorno(g, max) : '#3a3040';
  return (
    <div
      className="relative pixelated"
      style={{
        width: 26, height: 32, backgroundColor: bg,
        border: attivo ? '3px solid #f2e5bc' : '2px solid #5a3825',
        opacity: mostrato ? 1 : 0.45,
      }}
      title={`${g.giorno}${g.festivita ? ` · ${g.festivita}` : ''}${g.chiuso ? ' · chiuso' : ''}`}
    >
      <span className="absolute top-[1px] left-[2px] rm-pixel text-[7px] text-rm-bg">{g.giorno}</span>
      {g.chiuso && (
        <span className="absolute inset-0 flex items-center justify-center rm-pixel text-[10px] text-rm-cream/70">×</span>
      )}
      {!g.chiuso && mostrato && (
        <span className="absolute bottom-[1px] right-[2px] text-[9px] leading-none">
          {g.maltempo ? '🌧' : ''}
        </span>
      )}
      {(g.festivita || g.ponte) && (
        <span
          className="absolute top-[2px] right-[2px] pixelated"
          style={{ width: 5, height: 5, backgroundColor: g.festivita ? '#c8443c' : '#3c5a8c' }}
        />
      )}
    </div>
  );
}

export default function CalendarStrip({ giorni = [], nomeMese = '', onFine, decisioniModificate = 0 }) {
  const [indice, setIndice] = useState(0);      // quanti giorni già mostrati
  const [inPlay, setInPlay] = useState(true);
  const [velocita, setVelocita] = useState(0);
  const timer = useRef(null);

  const max = useMemo(
    () => giorni.reduce((m, g) => Math.max(m, g.copertiServitiGiorno ?? 0), 0),
    [giorni],
  );

  // Riparte da capo se arriva un mese nuovo
  useEffect(() => {
    setIndice(0);
    setInPlay(true);
  }, [giorni]);

  useEffect(() => {
    if (!inPlay || indice >= giorni.length) return undefined;
    timer.current = setTimeout(() => setIndice((i) => i + 1), VELOCITA[velocita].ms);
    return () => clearTimeout(timer.current);
  }, [inPlay, indice, velocita, giorni.length]);

  const finito = indice >= giorni.length && giorni.length > 0;
  useEffect(() => {
    if (finito && onFine) onFine();
  }, [finito]); // eslint-disable-line react-hooks/exhaustive-deps

  const mostrati = giorni.slice(0, indice);
  const coperti = mostrati.reduce((s, g) => s + (g.copertiServitiGiorno ?? 0), 0);
  const incasso = mostrati.reduce((s, g) => s + (g.ricaviGiorno ?? 0), 0);
  const respinti = mostrati.reduce((s, g) => s + Math.max(0, (g.copertiDomanda ?? 0) - (g.copertiServitiGiorno ?? 0)), 0);
  const oggi = giorni[indice - 1];

  if (!giorni.length) return null;

  return (
    <PixelPanel title={`Il mese giorno per giorno — ${nomeMese}`} icon="cal">
      <div className="flex flex-wrap gap-[3px] justify-center mb-3">
        {giorni.map((g, i) => (
          <div key={g.giorno} className="flex flex-col items-center gap-[2px]">
            <span className="rm-pixel text-[6px] text-rm-cream/50">{DOW[g.dow]}</span>
            <Casella g={g} max={max} attivo={i === indice - 1} mostrato={i < indice} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Coperti" value={coperti.toLocaleString('it-IT')} icon="fork" />
        <Stat label="Incasso" value={money(incasso)} icon="coin" />
        <Stat label="Respinti" value={respinti.toLocaleString('it-IT')} icon="door" accent={respinti > 0 ? 'text-rm-red' : undefined} />
      </div>

      {oggi && (
        <div className="rm-card-dark rm-no-radius px-2 py-1 mb-3 rm-text text-[16px] text-rm-cream min-h-[28px]">
          {oggi.chiuso
            ? `${oggi.giorno} — chiuso`
            : `${oggi.giorno} — ${oggi.copertiServitiGiorno} coperti · ${money(oggi.ricaviGiorno)}`}
          {oggi.festivita ? ` · 🎉 ${oggi.festivita}` : ''}
          {oggi.ponte ? ' · ponte' : ''}
          {oggi.maltempo ? ' · 🌧 maltempo' : ''}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <PixelButton variant={inPlay ? 'wood' : 'green'} onClick={() => setInPlay((p) => !p)} disabled={finito}>
          {inPlay ? '⏸ PAUSA' : '▶ PLAY'}
        </PixelButton>
        <div className="flex gap-1">
          {VELOCITA.map((v, i) => (
            <PixelButton
              key={v.label}
              variant={i === velocita ? 'green' : 'wood'}
              className="text-[9px] px-2 py-1"
              onClick={() => setVelocita(i)}
            >
              {v.label}
            </PixelButton>
          ))}
        </div>
        <PixelButton variant="wood" onClick={() => setIndice(giorni.length)} disabled={finito}>
          ⏭ FINE MESE
        </PixelButton>
      </div>

      {!inPlay && !finito && (
        <div className="rm-text text-[15px] text-rm-cream/70 mt-2">
          In pausa puoi cambiare le decisioni: valgono dal mese prossimo.
          {decisioniModificate > 0 && (
            <span className="rm-pixel text-[9px] text-rm-gold ml-2">
              {decisioniModificate} modific{decisioniModificate === 1 ? 'a' : 'he'} in coda
            </span>
          )}
        </div>
      )}
    </PixelPanel>
  );
}