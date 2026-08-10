import React from 'react';
import { Chip, PixelButton } from '@/components/game/ui';
import { RUOLI_ESTESI, STILI, FORMAZIONI, FAMIGLIE, CONTRATTI } from '@/lib/gameData';
import { money } from '@/lib/partita';

const ATTR_LABELS = { tecnica: 'Tecnica', velocita: 'Velocità', cortesia: 'Cortesia', resistenza: 'Resistenza', esperienza: 'Esp.' };
const TRATTO_BG = { pregio: '#5a8c46', difetto: '#c8443c', neutro: '#3c5a8c' };

/** Scheda candidato riutilizzabile (wizard e mercato). Mostra forbice attributi,
 *  tratti visibili/nascosti e pretese contrattuali. */
export default function CandidatoCard({ candidato: c, offerto = false, onOffri, onRimuovi }) {
  const v = c.vetrina;
  return (
    <div className="rm-card rm-no-radius rm-shadow p-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="rm-pixel text-[11px] text-rm-bg">{c.nome}</div>
          <div className="rm-text text-[15px] text-rm-wood-dark">{RUOLI_ESTESI[c.ruolo] ?? c.ruolo} · {c.eta} anni</div>
        </div>
        {offerto && <Chip color="bg-rm-blue">Offerta fatta</Chip>}
      </div>
      <div className="grid grid-cols-5 gap-1 mt-2">
        {Object.entries(v.attributi).map(([k, [lo, hi]]) => (
          <div key={k} className="text-center">
            <div className="rm-pixel text-[7px] text-rm-wood-dark">{ATTR_LABELS[k]}</div>
            <div className="rm-pixel text-[10px] text-rm-bg">{lo}-{hi}</div>
          </div>
        ))}
      </div>
      <div className="rm-text text-[14px] text-rm-wood-dark mt-2 leading-tight">
        <div>🎓 {FORMAZIONI[c.formazione] ?? c.formazione}</div>
        <div>🍽️ {STILI[c.stile] ?? c.stile}</div>
        <div>🏠 {FAMIGLIE[c.famiglia] ?? c.famiglia}</div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {v.trattiVisibili.map((t) => (
          <span key={t.id} className="rm-chip" style={{ backgroundColor: TRATTO_BG[t.tipo] }}>{t.nome}</span>
        ))}
        {v.trattiNascosti > 0 && <span className="rm-chip bg-rm-bg2">+{v.trattiNascosti} nascosti</span>}
      </div>
      <div className="rm-card-dark rm-no-radius p-2 mt-2">
        <div className="rm-pixel text-[8px] text-rm-gold uppercase">Pretese</div>
        <div className="rm-text text-[15px] text-rm-cream mt-1 leading-tight">
          <div>📋 {CONTRATTI[c.pretese.contratto] ?? c.pretese.contratto}</div>
          <div>💰 Minimo +{Math.round((c.pretese.superminimoMinimo - 1) * 100)}% · base {money(c.lordoBaseMensile)}/mese</div>
          <div>{c.pretese.accettaNero ? '✅ accetta nero' : '🚫 solo regolare'} · {c.pretese.vuoleRiposoFisso ? 'riposo fisso' : 'flessibile'}</div>
        </div>
      </div>
      {offerto
        ? <PixelButton variant="wood" full className="text-[10px] py-2 mt-2" onClick={onRimuovi}>Rimuovi offerta</PixelButton>
        : <PixelButton variant="green" full className="text-[10px] py-2 mt-2" onClick={onOffri}>Fai un'offerta</PixelButton>}
    </div>
  );
}