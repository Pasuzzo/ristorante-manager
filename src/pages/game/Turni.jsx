import React, { useMemo, useState } from 'react';
import { money } from '@/lib/partita';
import { PixelPanel, SectionTitle, Stat, SegmentedBar, Chip, PixelButton } from '@/components/game/ui';
import { RUOLI_ESTESI } from '@/lib/gameData';

/**
 * Turni: la settimana si pianifica, non si dichiara. Il monte ore è un
 * RISULTATO della griglia. Le modifiche vanno in decisioni.griglia.
 */

const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const FINESTRE = {
  pranzo: { inizio: 8, fine: 15, aperturaDefault: 12, aperturaMin: 8, aperturaMax: 14.5 },
  cena: { inizio: 15.5, fine: 23.5, aperturaDefault: 19, aperturaMin: 15.5, aperturaMax: 22 },
};
const SETTIMANE_MESE = 4.33;

const CUCINA = new Set(['lavapiatti', 'commis', 'cuoco', 'chef', 'sous_chef', 'pizzaiolo', 'pasticcere']);
const repartoDi = (ruolo) => (CUCINA.has(ruolo) ? 'cucina' : 'sala');

function fmtTime(dec) {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function grigliaVuota() {
  return Array.from({ length: 7 }, () => ({
    pranzo: { aperto: false, oraApertura: FINESTRE.pranzo.aperturaDefault, turni: [] },
    cena: { aperto: true, oraApertura: FINESTRE.cena.aperturaDefault, turni: [] },
  }));
}

function grigliaDefault(staff, giornoChiusura = 1) {
  const g = grigliaVuota();
  const inCucina = staff.filter((d) => repartoDi(d.ruoloEsteso ?? d.ruolo) === 'cucina').length;
  const chiusi = new Set([giornoChiusura]);
  if (inCucina < 2) chiusi.add((giornoChiusura + 1) % 7);
  const pranziWeekend = staff.length >= 5;
  for (let dow = 0; dow < 7; dow++) {
    const chiuso = chiusi.has(dow);
    for (const sv of ['pranzo', 'cena']) {
      const sp = g[dow][sv];
      sp.aperto = !chiuso && (sv === 'cena' || (pranziWeekend && (dow === 0 || dow === 6)));
      if (!sp.aperto) { sp.turni = []; continue; }
      sp.turni = staff.map((d) => ({
        idDipendente: d.id,
        oraArrivo: sp.oraApertura - (repartoDi(d.ruoloEsteso ?? d.ruolo) === 'cucina' ? 3 : 1.5),
      }));
    }
  }
  return g;
}

function clampArrivo(sv, v) {
  const F = FINESTRE[sv];
  return Math.max(F.inizio, Math.min(F.fine, v));
}

/** Rapporto preparazione (1 = giusto) per cucina e sala di un servizio. */
function prepRapporti(sp, sv, staff, copertiAttesi, complessita) {
  if (!sp.aperto) return { cucina: 1, sala: 1 };
  const fabCucina = Math.max(1.5, copertiAttesi / 12) * (0.85 + 0.35 * complessita);
  const fabSala = Math.max(0.75, copertiAttesi / 25);
  let prepCucina = 0, prepSala = 0;
  for (const t of sp.turni) {
    const d = staff.find((x) => x.id === t.idDipendente);
    if (!d) continue;
    const ore = Math.max(0, sp.oraApertura - clampArrivo(sv, t.oraArrivo));
    if (repartoDi(d.ruoloEsteso ?? d.ruolo) === 'cucina') prepCucina += ore;
    else prepSala += ore;
  }
  return {
    cucina: fabCucina > 0 ? prepCucina / fabCucina : 1,
    sala: fabSala > 0 ? prepSala / fabSala : 1,
  };
}

function coloreRapporto(r) {
  if (r < 0.7 || r > 1.3) return '#c8443c';
  if (r < 1.0) return '#e8b84b';
  return '#5a8c46';
}

function BarraPrep({ rapporto, label }) {
  return (
    <div className="flex items-center gap-1">
      <span className="rm-pixel text-[6px] uppercase text-rm-wood-dark w-[18px]">{label}</span>
      <SegmentedBar
        value={Math.min(rapporto, 1.3)}
        max={1.3}
        segments={10}
        color={coloreRapporto(rapporto)}
        size={7}
      />
    </div>
  );
}

function CellServizio({ giorno, sv, sp, staff, copertiAttesi, complessita, onChange, locked }) {
  const F = FINESTRE[sv];
  const [aggiungi, setAggiungi] = useState('');
  if (!sp) return <td className="align-top p-1" />;
  if (locked) {
    return (
      <td className="align-top p-1 w-[150px] min-w-[150px]">
        <div className="rm-card rm-no-radius p-1 opacity-40">
          <div className="rm-pixel text-[7px] text-rm-bg">{sp.aperto ? 'APERTO' : 'CHIUSO'}</div>
          <div className="rm-pixel text-[7px] text-rm-wood-dark mt-1">🔒 {sp.turni.length} in turno</div>
        </div>
      </td>
    );
  }

  const presenti = new Set(sp.turni.map((t) => t.idDipendente));
  const disponibili = staff.filter((d) => !presenti.has(d.id));
  const rap = prepRapporti(sp, sv, staff, copertiAttesi, complessita);

  const toggleAperto = () => onChange({ ...sp, aperto: !sp.aperto, turni: !sp.aperto ? [] : sp.turni });
  const setApertura = (v) => onChange({ ...sp, oraApertura: v });
  const setArrivo = (idDipendente, oraArrivo) =>
    onChange({ ...sp, turni: sp.turni.map((t) => (t.idDipendente === idDipendente ? { ...t, oraArrivo } : t)) });
  const rimuovi = (idDipendente) =>
    onChange({ ...sp, turni: sp.turni.filter((t) => t.idDipendente !== idDipendente) });
  const aggiungiPersona = () => {
    if (!aggiungi) return;
    const d = staff.find((x) => x.id === aggiungi);
    if (!d) return;
    const arrivo = sp.oraApertura - (repartoDi(d.ruoloEsteso ?? d.ruolo) === 'cucina' ? 3 : 1.5);
    onChange({ ...sp, turni: [...sp.turni, { idDipendente: aggiungi, oraArrivo: clampArrivo(sv, arrivo) }] });
    setAggiungi('');
  };

  return (
    <td className="align-top p-1 w-[150px] min-w-[150px]">
      <div className={`rm-card rm-no-radius p-1 ${sp.aperto ? '' : 'opacity-60'}`}>
        <button
          onClick={toggleAperto}
          className={`rm-btn ${sp.aperto ? 'rm-btn-green' : 'rm-btn-wood'} text-[7px] w-full py-1`}
        >
          {sp.aperto ? 'APERTO' : 'CHIUSO'}
        </button>

        {sp.aperto && (
          <>
            <div className="mt-1">
              <div className="rm-pixel text-[6px] uppercase text-rm-wood-dark">Apertura</div>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min={F.aperturaMin}
                  max={F.aperturaMax}
                  step={0.25}
                  value={sp.oraApertura}
                  onChange={(e) => setApertura(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="rm-pixel text-[8px] text-rm-bg w-[34px]">{fmtTime(sp.oraApertura)}</span>
              </div>
            </div>

            <div className="mt-1 space-y-1">
              {sp.turni.map((t) => {
                const d = staff.find((x) => x.id === t.idDipendente);
                if (!d) return null;
                return (
                  <div key={t.idDipendente} className="rm-card-dark rm-no-radius p-1">
                    <div className="flex items-center justify-between">
                      <span className="rm-pixel text-[7px] text-rm-cream truncate">{d.nome}</span>
                      <button onClick={() => rimuovi(t.idDipendente)} className="rm-pixel text-[8px] text-rm-red">✕</button>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="range"
                        min={F.inizio}
                        max={F.fine}
                        step={0.25}
                        value={clampArrivo(sv, t.oraArrivo)}
                        onChange={(e) => setArrivo(t.idDipendente, parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="rm-pixel text-[7px] text-rm-gold w-[34px]">{fmtTime(t.oraArrivo)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {disponibili.length > 0 && (
              <div className="mt-1 flex gap-1">
                <select
                  value={aggiungi}
                  onChange={(e) => setAggiungi(e.target.value)}
                  className="rm-input text-[12px] py-[2px] flex-1"
                >
                  <option value="">+ persona…</option>
                  {disponibili.map((d) => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
                <PixelButton variant="wood" className="text-[8px] px-2 py-[2px]" onClick={aggiungiPersona}>+</PixelButton>
              </div>
            )}

            <div className="mt-1 space-y-[2px]">
              <BarraPrep rapporto={rap.cucina} label="CUC" />
              <BarraPrep rapporto={rap.sala} label="SAL" />
            </div>
          </>
        )}
      </div>
    </td>
  );
}

export default function Turni({ stato, report, decisioni, setDecisioni, giornoCorrente }) {
  const staff = stato?.staff ?? [];
  const statoGriglia = stato?.griglia ?? grigliaVuota();
  const griglia = decisioni?.griglia ?? statoGriglia;
  const oreSett = report?.oreSettimanali ?? {};
  const buste = report?.buste ?? {};
  const violazioni = report?.violazioniTurni ?? [];
  const bloccanti = violazioni.filter((v) => v.bloccante);

  // Durante la pausa si editano solo i giorni successivi a quello in corso.
  const dowsModificabili = useMemo(() => {
    if (giornoCorrente == null) return null;
    const set = report?.settimana ?? [];
    return new Set(set.filter((r) => r.giorno > giornoCorrente).map((r) => r.dow));
  }, [giornoCorrente, report?.settimana]);
  const dowLocked = (dow) => dowsModificabili != null && !dowsModificabili.has(dow);

  const copertiAttesi = Math.round((stato?.locale?.postiASedere ?? 40) * (stato?.locale?.turniMax ?? 2.2));
  const complessita = Math.min(1, (stato?.menu?.length ?? 0) / 18);

  const costoMensile = useMemo(
    () => Object.values(buste).reduce((s, b) => s + (b.costoAzienda ?? 0), 0),
    [buste],
  );
  const costoSettimanale = costoMensile / SETTIMANE_MESE;

  const setGriglia = (nuova) => setDecisioni((p) => ({ ...p, griglia: nuova }));
  const setCell = (dow, sv, cell) => {
    const nuova = griglia.map((g, i) => (i === dow ? { ...g, [sv]: cell } : g));
    setGriglia(nuova);
  };

  const copiaSuSettimana = (dow) => {
    const modello = griglia[dow];
    const nuova = griglia.map((g, i) => (i === dow ? g : {
      pranzo: JSON.parse(JSON.stringify(modello.pranzo)),
      cena: JSON.parse(JSON.stringify(modello.cena)),
    }));
    setGriglia(nuova);
  };

  const copiaDaScorsa = () => setGriglia(JSON.parse(JSON.stringify(statoGriglia)));
  const ripristinaDefault = () => setGriglia(grigliaDefault(staff, stato?.locale?.giornoChiusura ?? 1));

  return (
    <div className="space-y-3">
      <PixelPanel title="Settimana" icon="cal">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Costo/sett." value={money(costoSettimanale)} icon="coin" />
          <Stat label="Bloccanti" value={bloccanti.length} icon="stamp" accent={bloccanti.length ? 'text-rm-red' : 'text-rm-green'} />
        </div>

        <div className="mt-2 space-y-1">
          <div className="rm-pixel text-[7px] uppercase text-rm-wood-dark">Ore settimanali a persona</div>
          {staff.length === 0 && (
            <div className="rm-text text-[15px] text-rm-cream/60">Nessun dipendente.</div>
          )}
          {staff.map((d) => {
            const ore = oreSett[d.id] ?? 0;
            const oltre = ore > 40;
            return (
              <div key={d.id} className="flex items-center justify-between rm-card rm-no-radius px-2 py-1">
                <span className="rm-pixel text-[8px] text-rm-bg truncate">{d.nome}</span>
                <span className={`rm-pixel text-[9px] ${oltre ? 'text-rm-red' : 'text-rm-bg'}`}>{ore.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>

        {violazioni.length > 0 && (
          <div className="mt-2 rm-card-dark rm-no-radius p-2 space-y-1">
            <div className="rm-pixel text-[7px] uppercase text-rm-cream/60">Violazioni turni</div>
            {violazioni.slice(0, 6).map((v, i) => (
              <div key={i} className="rm-text text-[15px] flex gap-1">
                <span className={v.bloccante ? 'text-rm-red' : 'text-rm-gold'}>{v.bloccante ? '⛔' : '⚠'}</span>
                <span className="text-rm-cream/80">{v.messaggio}</span>
              </div>
            ))}
            {bloccanti.length > 0 && (
              <div className="rm-pixel text-[8px] text-rm-red mt-1">Risolvi le bloccanti prima di avanzare.</div>
            )}
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Griglia settimanale" icon="cal">
        <div className="flex flex-wrap gap-1 mb-2">
          <PixelButton variant="wood" className="text-[8px] px-2 py-1" onClick={ripristinaDefault}>Default</PixelButton>
          <PixelButton variant="wood" className="text-[8px] px-2 py-1" onClick={copiaDaScorsa}>Da settimana scorsa</PixelButton>
        </div>
        <div className="rm-text text-[14px] text-rm-cream/60 mb-2">
          Modifica un giorno, poi copialo su tutta la settimana.
        </div>

        <div className="overflow-x-auto rm-scroll">
          <table className="border-separate" style={{ minWidth: 7 * 150 }}>
            <thead>
              <tr>
                {GIORNI.map((g, i) => (
                  <th key={g} className="rm-pixel text-[8px] text-rm-cream p-1 w-[150px] min-w-[150px] text-left">
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="rm-pixel text-[7px] uppercase text-rm-gold px-1 py-1">PRANZO</td>
              </tr>
              <tr>
                {GIORNI.map((_, dow) => (
                  <CellServizio
                    key={`p${dow}`}
                    giorno={dow}
                    sv="pranzo"
                    sp={griglia[dow]?.pranzo}
                    staff={staff}
                    copertiAttesi={copertiAttesi}
                    complessita={complessita}
                    locked={dowLocked(dow)}
                    onChange={(cell) => setCell(dow, 'pranzo', cell)}
                  />
                ))}
              </tr>
              <tr>
                <td colSpan={7} className="rm-pixel text-[7px] uppercase text-rm-gold px-1 py-1">CENA</td>
              </tr>
              <tr>
                {GIORNI.map((_, dow) => (
                  <CellServizio
                    key={`c${dow}`}
                    giorno={dow}
                    sv="cena"
                    sp={griglia[dow]?.cena}
                    staff={staff}
                    copertiAttesi={copertiAttesi}
                    complessita={complessita}
                    locked={dowLocked(dow)}
                    onChange={(cell) => setCell(dow, 'cena', cell)}
                  />
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {GIORNI.map((g, dow) => (
            <PixelButton
              key={g}
              variant="blue"
              className="text-[7px] px-2 py-1"
              onClick={() => copiaSuSettimana(dow)}
            >
              {g} → settimana
            </PixelButton>
          ))}
        </div>
      </PixelPanel>

      {dowsModificabili != null && (
        <div className="rm-text text-[14px] text-rm-gold">
          In pausa: modifichi solo i giorni dopo quello in corso (🔒 = bloccato).
        </div>
      )}

      <div className="rm-text text-[14px] text-rm-cream/60">
        Arrivi troppo presto = ore pagate a vuoto; troppo tardi = sala o cucina non pronte.
        Le barre: verde 1.0–1.3, giallo 0.7–1.0, rosso fuori.
      </div>
    </div>
  );
}