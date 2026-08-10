import React from 'react';
import { PixelPanel, Chip, SegmentedBar } from '@/components/game/ui';
import { STILI } from '@/lib/gameData';
import { money } from '@/lib/partita';
import { annuncioAConfigLocale } from '../../../../base44/shared/engine/immobili';
import { calcolaPianoCosti } from '../../../../base44/shared/engine/costi-avvio';

const STATO_LABEL = { da_ristrutturare: 'da ristrutturare', grezzo: 'al grezzo', buono: 'in buono stato', chiavi_in_mano: 'chiavi in mano' };
const POS_BG = { ottima: '#5a8c46', normale: '#e8b84b', scadente: '#c8443c' };

function ModalitaSelect({ a, modalita, set }) {
  const opts = [];
  if (a.tipoOfferta !== 'vendita') opts.push(['affitto', 'Affitto']);
  if (a.tipoOfferta !== 'affitto') { opts.push(['acquisto', 'Acquisto contanti']); opts.push(['acquisto_mutuo', 'Acquisto con mutuo']); }
  return (
    <select className="rm-input" value={modalita} onChange={(e) => set(e.target.value)}>
      {opts.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

function PianoPreview({ annuncio, modalita }) {
  let piano;
  try { piano = calcolaPianoCosti(annuncioAConfigLocale(annuncio, modalita)); } catch { return null; }
  return (
    <PixelPanel title={`Piano costi — ${modalita === 'affitto' ? 'affitto' : 'acquisto'}`} icon="coin">
      <div className="grid grid-cols-2 gap-2">
        <div className="rm-card-dark rm-no-radius p-2">
          <div className="rm-pixel text-[7px] text-rm-gold uppercase mb-1">Una tantum</div>
          <div className="space-y-[2px] max-h-40 overflow-y-auto rm-scroll">
            {piano.unaTantum.map((v, i) => (
              <div key={i} className="flex justify-between rm-text text-[13px] text-rm-cream leading-tight">
                <span className="pr-1">{v.voce}</span><span>{money(v.importo)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between rm-pixel text-[8px] text-rm-gold mt-1 border-t border-rm-wood-dark pt-1"><span>Totale</span><span>{money(piano.totaleUnaTantum)}</span></div>
        </div>
        <div className="rm-card-dark rm-no-radius p-2">
          <div className="rm-pixel text-[7px] text-rm-gold uppercase mb-1">Mensili</div>
          <div className="space-y-[2px] max-h-40 overflow-y-auto rm-scroll">
            {piano.mensili.map((v, i) => (
              <div key={i} className="flex justify-between rm-text text-[13px] text-rm-cream leading-tight">
                <span className="pr-1">{v.voce}</span><span>{money(v.importo)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between rm-pixel text-[8px] text-rm-gold mt-1 border-t border-rm-wood-dark pt-1"><span>Totale/mese</span><span>{money(piano.totaleMensile)}</span></div>
        </div>
      </div>
      {piano.avvisi.length > 0 && (
        <div className="mt-2 space-y-1">{piano.avvisi.map((a, i) => <div key={i} className="rm-text text-[13px] text-rm-gold">{a}</div>)}</div>
      )}
    </PixelPanel>
  );
}

/** Step 5 — La bacheca degli immobili. Scegli annuncio e modalità, vedi il piano costi. */
export default function StepLocale({ data, update, prep }) {
  const bacheca = prep?.bacheca ?? [];
  const a = data.annuncio;
  const ingresso = a ? (a.tipoOfferta === 'vendita' ? (a.prezzoVendita ?? 0) : (a.canoneMensile ?? 0) * 4.5 + (a.avviamento ?? 0)) : 0;

  const scegli = (ann) => {
    const modalita = ann.tipoOfferta === 'vendita' ? 'acquisto' : 'affitto';
    update({ annuncio: ann, modalitaImmobile: modalita });
  };

  return (
    <div className="space-y-3">
      <PixelPanel title="Stile del locale" icon="chef">
        <select className="rm-input" value={data.stileLocale} onChange={(e) => update({ stileLocale: e.target.value })}>
          {Object.entries(STILI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="rm-text text-[13px] text-rm-cream/60 mt-1">Lo stile conta: chi ha un'inclinazione diversa rende meno finché non si adatta.</div>
      </PixelPanel>

      <PixelPanel title={`Bacheca immobili (${bacheca.length})`} icon="cal">
        <div className="rm-text text-[14px] text-rm-cream/60 mb-2">Quotazioni OMI dell'Agenzia delle Entrate. Prezzi veri, annunci di fantasia. Costo d'ingresso entro il 60% del budget.</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bacheca.map((b) => {
            const on = a?.id === b.id;
            return (
              <button key={b.id} onClick={() => scegli(b)} className={`rm-card rm-no-radius p-2 text-left ${on ? 'border-rm-gold border-[4px]' : 'rm-shadow'}`}>
                <div className="flex items-center justify-between">
                  <div className="rm-pixel text-[9px] text-rm-bg leading-tight">{b.titolo}</div>
                  <span className="rm-chip" style={{ backgroundColor: POS_BG[b.posizioneCommerciale] }}>{b.posizioneCommerciale}</span>
                </div>
                <div className="rm-text text-[14px] text-rm-wood-dark mt-1">
                  {b.canoneMensile ? `${money(b.canoneMensile)}/mese` : ''}{b.prezzoVendita ? ` · vendita ${money(b.prezzoVendita)}` : ''} · {b.mq} mq · {b.postiStimati} coperti
                </div>
                <div className="rm-text text-[13px] text-rm-wood-dark/80">{STATO_LABEL[b.stato]}{b.exRistorante ? ' · ex ristorante' : ''}{b.impiantiPresenti ? ' · impianti ✓' : ' · impianti ✗'}</div>
                <div className="mt-1"><SegmentedBar value={b.passaggio} max={1.5} segments={15} color="#5a8c46" size={8} /></div>
                {b.avviamento ? <div className="rm-text text-[12px] text-rm-red mt-1">Buonuscita: {money(b.avviamento)}</div> : null}
              </button>
            );
          })}
        </div>
      </PixelPanel>

      {a && (
        <>
          <PixelPanel title={a.titolo} icon="envelope">
            <div className="rm-text text-[14px] text-rm-cream/80">{a.descrizione}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div>{a.pro.map((p, i) => <div key={i} className="rm-text text-[13px] text-rm-green">✓ {p}</div>)}</div>
              <div>{a.contro.map((c, i) => <div key={i} className="rm-text text-[13px] text-rm-red">✗ {c}</div>)}</div>
            </div>
            <div className="rm-text text-[12px] text-rm-cream/40 mt-1">{a.fonteQuotazione}</div>
            <div className="mt-2">
              <label className="rm-pixel text-[8px] text-rm-cream uppercase">Modalità di acquisto</label>
              <ModalitaSelect a={a} modalita={data.modalitaImmobile} set={(m) => update({ modalitaImmobile: m })} />
            </div>
            <div className="rm-text text-[14px] text-rm-gold mt-1">Costo d'ingresso stimato: {money(ingresso)}</div>
          </PixelPanel>
          <PianoPreview annuncio={a} modalita={data.modalitaImmobile} />
        </>
      )}
    </div>
  );
}