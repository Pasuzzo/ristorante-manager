import React from 'react';
import { SegmentedBar, MoraleFace, Chip, PixelButton } from '@/components/game/ui';
import { ruoloLabel, livelloLabel, repartoDi, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

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
  dipendente, tfr = 0,
  onLicenzia, onAumenta,
  pendingLicenzia = false, pendingAumento = null,
}) {
  const d = dipendente;
  const reparto = repartoDi(d.ruolo);
  const lordo = lordoMensile(d.ruolo, d.superminimo);

  return (
    <div className="rm-card rm-no-radius rm-shadow p-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="rm-pixel text-[12px] text-rm-bg">{d.nome}</div>
          <div className="rm-text text-[16px] text-rm-wood-dark leading-none">
            {ruoloLabel(d.ruolo)} · {reparto}
          </div>
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

      <div className="mt-2 flex items-center justify-between border-t-2 border-rm-wood-dark/40 pt-1">
        <div className="rm-text text-[16px] text-rm-bg">
          Stipendio <span className="rm-pixel text-[10px]">{money(lordo)}/mese</span>
          {d.superminimo > 1 && <span className="text-rm-green"> (+{Math.round((d.superminimo - 1) * 100)}%)</span>}
        </div>
        <div className="rm-text text-[14px] text-rm-wood-dark">TFR {money(tfr)}</div>
      </div>

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