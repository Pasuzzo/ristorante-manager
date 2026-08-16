import React, { useState } from 'react';
import { Chip, PixelButton } from '@/components/game/ui';
import { RUOLI_ESTESI, STILI, FORMAZIONI, FAMIGLIE, CONTRATTI } from '@/lib/gameData';
import { money } from '@/lib/partita';
import { RICETTE_BASE } from '../../../base44/shared/engine/ricette';

const ATTR_LABELS = { tecnica: 'Tecnica', velocita: 'Velocità', cortesia: 'Cortesia', resistenza: 'Resistenza', esperienza: 'Esp.' };
const TRATTO_BG = { pregio: '#5a8c46', difetto: '#c8443c', neutro: '#3c5a8c' };

const CUCINA = new Set(['cuoco', 'chef', 'sous_chef', 'commis', 'pizzaiolo', 'pasticcere']);
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

/** Barra AFFIDABILITÀ: forbice larga tratteggiata. È il dato più importante
 *  e il più incerto: al colloquio si intuisce poco. */
function AffidabilitaBar({ range }) {
  if (!range) return null;
  const [lo, hi] = range;
  const left = Math.max(0, lo);
  const width = Math.max(2, Math.min(100, hi) - left);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <span className="rm-pixel text-[7px] text-rm-wood-dark uppercase">Affidabilità</span>
        <span className="rm-pixel text-[9px] text-rm-bg">{lo}-{hi}</span>
      </div>
      <div className="relative h-3 mt-1 bg-rm-bg2 border-2 border-rm-wood-dark">
        <div
          className="absolute top-0 bottom-0"
          style={{ left: `${left}%`, width: `${width}%`, backgroundImage: 'repeating-linear-gradient(90deg,#e8b84b 0 4px,transparent 4px 8px)' }}
        />
      </div>
      <div className="rm-text text-[12px] text-rm-wood-dark/70 leading-none mt-[2px]">dato chiave · molto incerto</div>
    </div>
  );
}

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

      <AffidabilitaBar range={v.affidabilita} />
      <div className="rm-text text-[14px] text-rm-wood-dark mt-2 leading-tight">
        <div>🎓 {FORMAZIONI[c.formazione] ?? c.formazione}</div>
        <div>🍽️ {STILI[c.stile] ?? c.stile}</div>
        <div>🏠 {FAMIGLIE[c.famiglia] ?? c.famiglia}</div>
      </div>
      {c.ruolo && CUCINA.has(c.ruolo) && <Repertorio repertorio={c.repertorio ?? []} />}
      <div className="flex flex-wrap gap-1 mt-2">
        {v.trattiVisibili.map((t) => (
          <span key={t.id} className="rm-chip" style={{ backgroundColor: TRATTO_BG[t.tipo] }}>{t.nome}</span>
        ))}
        {v.trattiNascosti > 0 && <span className="rm-chip bg-rm-bg2">+{v.trattiNascosti} nascosti</span>}
      </div>
      <div className="rm-card-dark rm-no-radius p-2 mt-2">
        <div className="rm-pixel text-[8px] text-rm-gold uppercase">Pretese</div>
        <div className="rm-pixel text-[13px] text-rm-cream mt-1">Vuole circa {c.pretese.nettoDesiderato} € netti al mese</div>
        <div className="rm-text text-[13px] text-rm-cream/70 mt-1 leading-tight">
          <div>📋 {CONTRATTI[c.pretese.contratto] ?? c.pretese.contratto}</div>
          <div>{c.pretese.accettaNero ? '✅ accetta fuori busta' : '🚫 solo busta'} · {c.pretese.vuoleRiposoFisso ? 'riposo fisso' : 'flessibile'}</div>
          <div className="text-rm-cream/45">superminimo min. +{Math.round((c.pretese.superminimoMinimo - 1) * 100)}% · base {money(c.lordoBaseMensile)}/mese</div>
        </div>
      </div>
      {offerto
        ? <PixelButton variant="wood" full className="text-[10px] py-2 mt-2" onClick={onRimuovi}>Rimuovi offerta</PixelButton>
        : <PixelButton variant="green" full className="text-[10px] py-2 mt-2" onClick={onOffri}>Fai un'offerta</PixelButton>}
    </div>
  );
}