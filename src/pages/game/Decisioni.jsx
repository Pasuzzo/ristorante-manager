import React from 'react';
import { PixelPanel, SectionTitle, Chip } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { QUALITA, SERVIZI } from '@/lib/gameData';
import { money } from '@/lib/partita';

function Slider({ label, value, setValue, min, max, step, fmt, icon, hint }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <span className="rm-pixel text-[9px] text-rm-cream flex items-center gap-1">{icon && <Icon name={icon} size={12} color="#e8b84b" />}{label}</span>
        <span className="rm-pixel text-[10px] text-rm-gold">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full" />
      {hint && <div className="rm-text text-[14px] text-rm-cream/55 leading-tight">{hint}</div>}
    </div>
  );
}

export default function Decisioni({ dec, setDec }) {
  const set = (k, v) => setDec({ ...dec, [k]: v });

  return (
    <div className="space-y-3">
      <PixelPanel title="MARKETING" icon="mega">
        <Slider label="Tradizionale (volantini, radio)" icon="mega" value={dec.spesaTradizionale} setValue={(v) => set('spesaTradizionale', v)} min={0} max={3000} step={50} fmt={(v) => money(v) + '/m'} hint="Effetto immediato, ma svanisce appena smetti." />
        <Slider label="Social (instagram, ads)" icon="spark" value={dec.spesaSocial} setValue={(v) => set('spesaSocial', v)} min={0} max={2000} step={50} fmt={(v) => money(v) + '/m'} hint="Costruisce un seguito che lavora da solo, col tempo." />
      </PixelPanel>

      <PixelPanel title="MATERIE PRIME" icon="cart">
        <div className="grid grid-cols-3 gap-1">
          {QUALITA.map((q) => (
            <button key={q.value} type="button" onClick={() => set('qualitaMaterie', q.value)}
              className={`rm-pixel text-[8px] py-2 px-1 border-[3px] border-rm-wood-dark text-center ${dec.qualitaMaterie === q.value ? 'bg-rm-green text-rm-cream rm-shadow' : 'bg-rm-bg2 text-rm-cream'}`}>
              {q.label}
              <div className="rm-text text-[12px] normal-case mt-1 leading-tight">{q.note}</div>
            </button>
          ))}
        </div>
      </PixelPanel>

      <PixelPanel title="LISTINO PREZZI" icon="tag">
        <Slider label="Prezzi vs mercato" icon="tag" value={dec.listino} setValue={(v) => set('listino', v)} min={0.7} max={1.6} step={0.05} fmt={(v) => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%'} hint="Più caro = più margine, meno coperti. La domanda risponde al prezzo." />
        <Slider label="Manutenzione mensile" icon="wrench" value={dec.manutenzioneMese} setValue={(v) => set('manutenzioneMese', v)} min={0} max={1500} step={50} fmt={(v) => money(v)} hint="Tiene su il locale: arredi, bagni, pulizia percepita." />
        <div className="mt-2">
          <label className="rm-pixel text-[9px] text-rm-cream flex items-center gap-1"><Icon name="wrench" size={12} color="#e8b84b" />RISTRUTTURAZIONE (una tantum)</label>
          <input type="number" min={0} step={250} value={dec.ristrutturazione || ''} onChange={(e) => set('ristrutturazione', Math.max(0, Number(e.target.value) || 0))} className="rm-input w-full mt-1" placeholder="0" />
          <div className="rm-text text-[14px] text-rm-cream/55 leading-tight">+1 punto condizione ogni 250€. Lavori pesanti: una tantum.</div>
        </div>
      </PixelPanel>

      <PixelPanel title="SERVIZI ATTIVABILI" icon="wifi">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {SERVIZI.map((s) => {
            const on = dec.servizi.includes(s.value);
            return (
              <button key={s.value} type="button" onClick={() => set('servizi', on ? dec.servizi.filter((x) => x !== s.value) : [...dec.servizi, s.value])}
                className={`rm-pixel text-[8px] py-2 px-1 border-[3px] border-rm-wood-dark ${on ? 'bg-rm-blue text-rm-cream rm-shadow' : 'bg-rm-bg2 text-rm-cream/70'}`}>
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="rm-text text-[14px] text-rm-cream/55 mt-2">Ogni servizio alza un po' il gradimento. Vanno mantenuti (gratis).</div>
      </PixelPanel>
    </div>
  );
}