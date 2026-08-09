import React from 'react';
import { PixelPanel, PixelButton, Chip, SegmentedBar } from '@/components/game/ui';
import { QUALITA, SERVIZI, servizioLabel, qualitaLabel } from '@/lib/gameData';
import { money } from '@/lib/partita';

function Slider({ label, value, set, min, max, step, display }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="rm-pixel text-[8px] text-rm-cream uppercase">{label}</span>
        <span className="rm-pixel text-[10px] text-rm-gold">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} className="rm-input" value={value} onChange={(e) => set(Number(e.target.value))} />
    </div>
  );
}

/** Decisioni mensili: marketing, materie prime, servizi, listino, manutenzione, ristrutturazione. */
export default function Decisioni({ stato, decisioni, setDecisioni }) {
  const set = (k, v) => setDecisioni((p) => ({ ...p, [k]: v }));

  const toggleServizio = (v) => {
    setDecisioni((p) => {
      const has = p.servizi.includes(v);
      return { ...p, servizi: has ? p.servizi.filter((s) => s !== v) : [...p.servizi, v] };
    });
  };

  return (
    <div className="space-y-3">
      <PixelPanel title="Marketing" icon="mega">
        <div className="space-y-3">
          <Slider label="Social (ads, contenuti)" value={decisioni.spesaSocial} set={(v) => set('spesaSocial', v)} min={0} max={2000} step={50} display={money(decisioni.spesaSocial)} />
          <Slider label="Tradizionale (volantini, radio)" value={decisioni.spesaTradizionale} set={(v) => set('spesaTradizionale', v)} min={0} max={2000} step={50} display={money(decisioni.spesaTradizionale)} />
          <div className="rm-text text-[15px] text-rm-cream/60">
            Social: costruisce un seguito che lavora nel tempo. Tradizionale: spinta immediata, svanisce se smetti.
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="Materie prime" icon="leaf">
        <div className="grid grid-cols-3 gap-2">
          {QUALITA.map((q) => {
            const on = decisioni.qualitaMaterie === q.value;
            return (
              <button key={q.value} onClick={() => set('qualitaMaterie', q.value)} className="rm-no-radius p-2 border-[3px]"
                style={{ backgroundColor: on ? '#5a8c46' : '#2b2233', color: on ? '#f2e5bc' : '#f2e5bc', borderColor: '#5a3825' }}>
                <div className="rm-pixel text-[9px]">{q.label}</div>
                <div className="rm-text text-[14px] mt-1">food cost {Math.round(q.food * 100)}%</div>
              </button>
            );
          })}
        </div>
      </PixelPanel>

      <PixelPanel title="Servizi e prezzo" icon="tag">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {SERVIZI.map((s) => {
            const on = decisioni.servizi.includes(s.value);
            return (
              <button key={s.value} onClick={() => toggleServizio(s.value)} className="rm-no-radius p-2 border-[2px] rm-text text-[14px]"
                style={{ backgroundColor: on ? '#3c5a8c' : '#2b2233', color: '#f2e5bc', borderColor: '#5a3825' }}>
                {s.label}
              </button>
            );
          })}
        </div>
        <Slider label="Listino (1 = mercato)" value={decisioni.listino} set={(v) => set('listino', v)} min={0.7} max={1.6} step={0.05} display={`${Math.round((decisioni.listino - 1) * 100)}%`} />
      </PixelPanel>

      <PixelPanel title="Locale" icon="wrench">
        <div className="space-y-3">
          <Slider label="Manutenzione mensile" value={decisioni.manutenzioneMese} set={(v) => set('manutenzioneMese', v)} min={0} max={2000} step={50} display={money(decisioni.manutenzioneMese)} />
          <div>
            <div className="flex items-center justify-between">
              <span className="rm-pixel text-[8px] text-rm-cream uppercase">Ristrutturazione (una tantum)</span>
              <span className="rm-pixel text-[10px] text-rm-gold">{money(decisioni.ristrutturazione)}</span>
            </div>
            <input type="range" min={0} max={20000} step={250} className="rm-input" value={decisioni.ristrutturazione} onChange={(e) => set('ristrutturazione', Number(e.target.value))} />
            <div className="rm-text text-[15px] text-rm-cream/60">Ogni 250€ = +1 punto condizione locale (max 100).</div>
          </div>
          <div className="flex items-center justify-between">
            <span className="rm-pixel text-[8px] text-rm-cream uppercase">Condizione attuale</span>
            <SegmentedBar value={stato?.scelte?.condizioneLocale ?? 70} max={100} segments={10} color="#e8b84b" size={9} />
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}