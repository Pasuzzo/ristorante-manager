import React, { useState } from 'react';
import { SegmentedBar, MoraleFace } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { RUOLI, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

const ATTRS = [
  { key: 'tecnica', label: 'TEC' }, { key: 'velocita', label: 'VEL' },
  { key: 'cortesia', label: 'COR' }, { key: 'resistenza', label: 'RES' },
  { key: 'esperienza', label: 'ESP' },
];

export default function StaffCard({ d, tfr, licenziato, aumento, onLicenzia, onAnnullaLicenziamento, onAumenta, onAnnullaAumento }) {
  const [conferma, setConferma] = useState(false);
  const [slider, setSlider] = useState(d.superminimo);
  const [modAum, setModAum] = useState(false);

  return (
    <div className={`rm-card rm-no-radius p-2 ${licenziato ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1">
            <span className="rm-pixel text-[11px] text-rm-bg">{d.nome}</span>
            {!d.inRegola && <span className="rm-pixel text-[8px] bg-rm-red text-rm-cream px-1 py-[2px] rm-blink">IN NERO</span>}
            {d.stagionaleFinoAlMese && <span className="rm-chip text-rm-gold">stag. M{d.stagionaleFinoAlMese}</span>}
          </div>
          <div className="rm-text text-[15px] text-rm-wood-dark">
            {RUOLI.find((r) => r.value === d.ruolo)?.label} · +{Math.round((d.superminimo - 1) * 100)}% · {money(lordoMensile(d.ruolo, d.superminimo))}/m
          </div>
        </div>
        {licenziato ? (
          <button className="rm-pixel text-[8px] bg-rm-wood text-rm-cream border-[2px] border-rm-wood-dark px-1 py-1" onClick={onAnnullaLicenziamento}>ANNULLA</button>
        ) : (
          <button className="rm-pixel text-[8px] bg-rm-red text-rm-cream border-[2px] border-rm-wood-dark px-1 py-1" onClick={() => setConferma(true)}>LICENZIA</button>
        )}
      </div>

      <div className="mt-2 space-y-1">
        {ATTRS.map((a) => (
          <div key={a.key} className="flex items-center gap-2">
            <span className="rm-pixel text-[7px] text-rm-wood-dark w-7">{a.label}</span>
            <SegmentedBar value={d.attributi[a.key]} max={20} segments={10} size={8} color={d.attributi[a.key] >= 12 ? '#5a8c46' : d.attributi[a.key] >= 7 ? '#e8b84b' : '#c8443c'} />
            <span className="rm-pixel text-[8px] text-rm-wood-dark w-5 text-right">{d.attributi[a.key]}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div>
          <div className="rm-pixel text-[7px] text-rm-wood-dark">MORALE</div>
          <MoraleFace morale={d.morale} />
        </div>
        <div className="text-right">
          <div className="rm-pixel text-[7px] text-rm-wood-dark">TFR MATURATO</div>
          <div className="rm-pixel text-[11px] text-rm-red">{money(tfr)}</div>
        </div>
      </div>

      {aumento !== undefined && (
        <div className="mt-2 rm-card-dark rm-no-radius p-1 flex items-center justify-between">
          <span className="rm-text text-[15px] text-rm-green">Aumento a +{Math.round((aumento - 1) * 100)}% in coda</span>
          <button className="rm-pixel text-[7px] bg-rm-wood text-rm-cream px-1 py-1 border-[2px] border-rm-wood-dark" onClick={onAnnullaAumento}>×</button>
        </div>
      )}
      {aumento === undefined && !licenziato && (
        <button className="rm-btn rm-btn-green w-full mt-2 !py-1 !text-[9px]" onClick={() => setModAum(true)}>+ AUMENTA PAGA</button>
      )}

      {modAum && (
        <div className="mt-2 rm-card-dark rm-no-radius p-2">
          <div className="rm-text text-[15px] text-rm-cream">Nuovo superminimo: <span className="rm-pixel text-rm-gold">+{Math.round((slider - 1) * 100)}%</span> ({money(lordoMensile(d.ruolo, slider))}/m)</div>
          <input type="range" min={d.superminimo} max={1.6} step={0.05} value={slider} onChange={(e) => setSlider(Number(e.target.value))} className="w-full" />
          <div className="flex gap-1 mt-1">
            <button className="rm-btn rm-btn-green flex-1 !text-[8px] !py-1" onClick={() => { onAumenta(slider); setModAum(false); }}>CONFERMA</button>
            <button className="rm-btn rm-btn-wood !text-[8px] !py-1" onClick={() => setModAum(false)}>ANNULLA</button>
          </div>
        </div>
      )}

      {conferma && (
        <div className="mt-2 rm-card-dark rm-no-radius p-2 border-l-[4px] border-rm-red">
          <div className="rm-text text-[16px] text-rm-cream">Licenzi {d.nome}? Dovrai liquidare il TFR: <b className="text-rm-red">{money(tfr)}</b> escono subito dalla cassa.</div>
          <div className="flex gap-1 mt-2">
            <button className="rm-btn rm-btn-red flex-1 !text-[8px] !py-1" onClick={() => { onLicenzia(); setConferma(false); }}>SÌ, LICENZIA</button>
            <button className="rm-btn rm-btn-wood !text-[8px] !py-1" onClick={() => setConferma(false)}>NO</button>
          </div>
        </div>
      )}
    </div>
  );
}