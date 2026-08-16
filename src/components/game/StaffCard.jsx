import React, { useState } from 'react';
import { SegmentedBar, MoraleFace, Chip, PixelButton } from '@/components/game/ui';
import { ruoloLabel, livelloLabel, repartoDi, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';
import { copertiEffettivi } from '../../../base44/shared/engine/turni';
import { RICETTE_BASE } from '../../../base44/shared/engine/ricette';

const CUCINA_ESTESO = new Set(['cuoco', 'chef', 'sous_chef', 'commis', 'pizzaiolo', 'pasticcere']);
const NOME_BY_ID = Object.fromEntries(RICETTE_BASE.map((r) => [r.id, r.nome]));

function Repertorio({ repertorio }) {
  const [aperto, setAperto] = useState(false);
  const n = repertorio.length;
  return (
    <button type="button" onClick={() => setAperto((v) => !v)} className="block w-full text-left mt-1">
      <div className="rm-pixel text-[8px] text-rm-wood-dark">
        🍳 {n} piatti in repertorio <span className="text-rm-bg">{aperto ? '▲' : '▼'}</span>
      </div>
      {aperto && (
        <div className="rm-text text-[15px] text-rm-bg/80 leading-tight mt-1">
          {n === 0 ? 'nessun piatto noto' : repertorio.map((id) => NOME_BY_ID[id] ?? id).join(' · ')}
        </div>
      )}
    </button>
  );
}

function Attr({ label, value }) {
  const color = value >= 12 ? '#5a8c46' : value >= 8 ? '#e8b84b' : '#c8443c';
  return (
    <div className="flex items-center gap-2">
      <span className="rm-pixel text-[8px] text-rm-wood-dark w-[58px] uppercase">{label}</span>
      <SegmentedBar value={value} max={20} segments={10} color={color} size={8} />
      <span className="rm-pixel text-[9px] text-rm-bg w-[18px] text-right">{value}</span>
    </div>
  );
}

/** Scheda di un dipendente con attributi, morale, TFR e azioni contrattuali. */
export default function StaffCard({
  dipendente, tfr = 0, busta, assenzeGiorni = 0, ferieMaturate = 0, affidabilita,
  onLicenzia, onAumenta,
  pendingLicenzia = false, pendingAumento = null,
}) {
  const d = dipendente;
  const reparto = repartoDi(d.ruolo);
  const lordo = lordoMensile(d.ruolo, d.superminimo);
  const coperti = Math.round(copertiEffettivi(d.ruolo, d.attributi?.velocita ?? 10, d.morale ?? 50));

  return (
    <div className="rm-card rm-no-radius rm-shadow p-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="rm-pixel text-[12px] text-rm-bg">{d.nome}</div>
          <div className="rm-text text-[16px] text-rm-wood-dark leading-none">
            {ruoloLabel(d.ruolo)} · {reparto}{d.eta != null ? ` · ${d.eta} anni` : ''}
          </div>
          <div className="rm-text text-[14px] text-rm-wood-dark leading-none mt-[2px]">
            copre <span className="rm-pixel text-[9px] text-rm-bg">{coperti}</span> coperti a servizio
          </div>
          {d.ruoloEsteso && CUCINA_ESTESO.has(d.ruoloEsteso) && <Repertorio repertorio={d.repertorio ?? []} />}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Chip color={d.inRegola ? 'bg-rm-green' : 'bg-rm-red'}>
            {d.inRegola ? 'REGOLARE' : 'IN NERO'}
          </Chip>
          {d.livello && <span className="rm-text text-[14px] text-rm-wood-dark">{livelloLabel(d.livello)}</span>}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-1">
        <Attr label="Tecnica" value={d.attributi?.tecnica ?? 0} />
        <Attr label="Veloc." value={d.attributi?.velocita ?? 0} />
        <Attr label="Cortes." value={d.attributi?.cortesia ?? 0} />
        <Attr label="Resist." value={d.attributi?.resistenza ?? 0} />
        <Attr label="Esper." value={d.attributi?.esperienza ?? 0} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Morale</span>
        <MoraleFace morale={d.morale ?? 50} />
      </div>

      {affidabilita != null && (
        <div className="mt-2 flex items-center gap-2">
          <span className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Affid.</span>
          <SegmentedBar value={affidabilita} max={100} segments={10} color={affidabilita >= 70 ? '#5a8c46' : affidabilita >= 40 ? '#e8b84b' : '#c8443c'} size={8} />
          <span className="rm-pixel text-[9px] text-rm-bg w-[24px] text-right">{Math.round(affidabilita)}</span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t-2 border-rm-wood-dark/40 pt-1">
        <div className="rm-text text-[16px] text-rm-bg">
          Stipendio <span className="rm-pixel text-[10px]">{money(lordo)}/mese</span>
          {d.superminimo > 1 && <span className="text-rm-green"> (+{Math.round((d.superminimo - 1) * 100)}%)</span>}
        </div>
        <div className="rm-text text-[14px] text-rm-wood-dark">
          TFR {money(tfr)}
          {ferieMaturate > 0 && <span className="text-rm-blue"> · Ferie {Math.round(ferieMaturate)}g</span>}
        </div>
      </div>

      {assenzeGiorni > 0 && (
        <div className="mt-1"><span className="rm-chip bg-rm-red">ASSENTE {assenzeGiorni}g</span></div>
      )}

      {busta && (
        <div className="mt-1 grid grid-cols-3 gap-1">
          <div>
            <div className="rm-pixel text-[6px] uppercase text-rm-wood-dark">Azienda</div>
            <div className="rm-pixel text-[9px] text-rm-bg">{money(busta.costoAzienda)}</div>
          </div>
          <div>
            <div className="rm-pixel text-[6px] uppercase text-rm-wood-dark">Lordo</div>
            <div className="rm-pixel text-[9px] text-rm-bg">{money(busta.lordo)}</div>
          </div>
          <div>
            <div className="rm-pixel text-[6px] uppercase text-rm-wood-dark">Netto</div>
            <div className="rm-pixel text-[9px] text-rm-bg">
              {money(busta.nettoInBusta)}
              {busta.cashNero > 0 && <span className="text-rm-red"> +{money(busta.cashNero)}</span>}
            </div>
          </div>
        </div>
      )}

      {pendingLicenzia && (
        <div className="mt-2 rm-chip bg-rm-red w-full text-center">IN PARTENZA — fine mese</div>
      )}
      {pendingAumento != null && (
        <div className="mt-2 rm-chip bg-rm-green w-full text-center">
          AUMENTO PIANIFICATO: +{Math.round((pendingAumento - 1) * 100)}%
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <PixelButton variant="gold" className="text-[9px] py-2" onClick={onAumenta} disabled={pendingLicenzia}>
          Aumenta paga
        </PixelButton>
        <PixelButton className="text-[9px] py-2" onClick={onLicenzia} disabled={pendingLicenzia}>
          Licenzia
        </PixelButton>
      </div>
    </div>
  );
}