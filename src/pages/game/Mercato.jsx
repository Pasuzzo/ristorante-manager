import React, { useState } from 'react';
import { PixelPanel, PixelButton, Chip } from '@/components/game/ui';
import { RUOLI_ESTESI, STILI, FORMAZIONI, FAMIGLIE, CONTRATTI, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

const ATTR_LABELS = { tecnica: 'Tecnica', velocita: 'Velocità', cortesia: 'Cortesia', resistenza: 'Resistenza', esperienza: 'Esp.' };
const TRATTO_BG = { pregio: '#5a8c46', difetto: '#c8443c', neutro: '#3c5a8c' };

function CandCard({ c, offerto, onOffri }) {
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
        <div>🍽️ Stile: {STILI[c.stile] ?? c.stile}</div>
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
          <div>💰 Minimo: +{Math.round((c.pretese.superminimoMinimo - 1) * 100)}% sul CCNL · base {money(c.lordoBaseMensile)}/mese</div>
          <div>{c.pretese.accettaNero ? '✅ accetta nero' : '🚫 solo regolare'} · {c.pretese.vuoleRiposoFisso ? 'riposo fisso' : 'flessibile'}</div>
          {c.pretese.nota && <div className="text-rm-cream/60">“{c.pretese.nota}”</div>}
        </div>
      </div>

      {!offerto && <PixelButton variant="green" full className="text-[10px] py-2 mt-2" onClick={onOffri}>Fai un'offerta</PixelButton>}
    </div>
  );
}

/** Mercato del lavoro: candidati disponibili questo mese + offerte da portare al prossimo turno. */
export default function Mercato({ stato, decisioni, setDecisioni }) {
  const candidati = stato?.mercato ?? [];
  const offerte = decisioni.offerte ?? [];
  const idOfferti = new Set(offerte.map((o) => o.candidatoId));
  const [form, setForm] = useState(null);

  const apri = (c) => setForm({
    candidatoId: c.id,
    contratto: c.pretese.contratto,
    superminimo: c.pretese.superminimoMinimo,
    inRegola: true,
    riposoFisso: c.pretese.vuoleRiposoFisso,
    stagionale: false,
    stagionaleFinoAlMese: 9,
  });

  const conferma = () => {
    if (!form) return;
    setDecisioni((p) => ({
      ...p,
      offerte: [...(p.offerte ?? []), {
        candidatoId: form.candidatoId,
        contratto: form.contratto,
        superminimo: Number(form.superminimo),
        inRegola: form.inRegola,
        riposoFisso: form.riposoFisso,
        ...(form.stagionale ? { stagionaleFinoAlMese: Number(form.stagionaleFinoAlMese) } : {}),
      }],
    }));
    setForm(null);
  };

  const rimuovi = (id) => setDecisioni((p) => ({ ...p, offerte: (p.offerte ?? []).filter((o) => o.candidatoId !== id) }));
  const candidatoForm = form ? candidati.find((c) => c.id === form.candidatoId) : null;

  return (
    <div className="space-y-3">
      <PixelPanel title="Mercato del lavoro" icon="cart">
        <div className="rm-text text-[15px] text-rm-cream/70">
          {candidati.length} candidati disponibili questo mese. Gli attributi sono una stima (forbice); alcuni tratti si scoprono solo lavorando. In alta stagione il bacino è povero e le pretese salgono.
        </div>
      </PixelPanel>

      {candidati.length === 0 ? (
        <div className="rm-card-dark rm-no-radius p-4 rm-text text-[17px] text-rm-cream/60 text-center">Nessun candidato disponibile. Riprova il prossimo mese.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {candidati.map((c) => (
            <CandCard key={c.id} c={c} offerto={idOfferti.has(c.id)} onOffri={() => apri(c)} />
          ))}
        </div>
      )}

      {offerte.length > 0 && (
        <PixelPanel title="Offerte pronte (prossimo turno)" icon="envelope">
          <div className="space-y-2">
            {offerte.map((o) => {
              const c = candidati.find((x) => x.id === o.candidatoId);
              return (
                <div key={o.candidatoId} className="rm-card-dark rm-no-radius p-2 flex items-center justify-between gap-2">
                  <div className="rm-text text-[15px] text-rm-cream">
                    {c?.nome ?? o.candidatoId} · {CONTRATTI[o.contratto]} · +{Math.round((o.superminimo - 1) * 100)}% · {o.inRegola ? 'regolare' : 'nero'}
                  </div>
                  <button onClick={() => rimuovi(o.candidatoId)} className="rm-pixel text-[9px] text-rm-red">rimuovi</button>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      )}

      {form && candidatoForm && (
        <div className="fixed inset-0 z-50 bg-rm-bg2/80 flex items-center justify-center p-2 rm-scroll overflow-y-auto">
          <div className="rm-wood rm-no-radius rm-shadow w-full max-w-md my-4">
            <div className="rm-tovaglia-red border-b-[4px] border-rm-wood-dark px-3 py-2 flex items-center justify-between">
              <span className="rm-pixel text-[11px] text-rm-bg">Offerta a {candidatoForm.nome}</span>
              <button onClick={() => setForm(null)} className="rm-pixel text-[12px] text-rm-bg">✕</button>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <div className="rm-pixel text-[8px] text-rm-cream uppercase">Contratto</div>
                <select className="rm-input" value={form.contratto} onChange={(e) => setForm({ ...form, contratto: e.target.value })}>
                  {Object.entries(CONTRATTI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="rm-pixel text-[8px] text-rm-cream uppercase">Superminimo (sul CCNL)</span>
                  <span className="rm-pixel text-[10px] text-rm-gold">+{Math.round((form.superminimo - 1) * 100)}% · {money(lordoMensile(candidatoForm.ruolo, form.superminimo))}/mese</span>
                </div>
                <input type="range" min={1} max={1.5} step={0.01} className="rm-input" value={form.superminimo} onChange={(e) => setForm({ ...form, superminimo: Number(e.target.value) })} />
                <div className="rm-text text-[13px] text-rm-cream/60">Il candidato chiede minimo +{Math.round((candidatoForm.pretese.superminimoMinimo - 1) * 100)}%. Sotto, rifiuta o parte scontento.</div>
              </div>
              <label className="flex items-center gap-2 rm-text text-[16px] text-rm-cream">
                <input type="checkbox" checked={form.inRegola} onChange={(e) => setForm({ ...form, inRegola: e.target.checked })} /> Contratto regolare (in busta)
              </label>
              <label className="flex items-center gap-2 rm-text text-[16px] text-rm-cream">
                <input type="checkbox" checked={form.riposoFisso} onChange={(e) => setForm({ ...form, riposoFisso: e.target.checked })} /> Giorno di riposo fisso
              </label>
              <label className="flex items-center gap-2 rm-text text-[16px] text-rm-cream">
                <input type="checkbox" checked={form.stagionale} onChange={(e) => setForm({ ...form, stagionale: e.target.checked })} /> Contratto stagionale
              </label>
              {form.stagionale && (
                <div>
                  <div className="rm-pixel text-[8px] text-rm-cream uppercase">Fino al mese</div>
                  <select className="rm-input" value={form.stagionaleFinoAlMese} onChange={(e) => setForm({ ...form, stagionaleFinoAlMese: Number(e.target.value) })}>
                    {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                  </select>
                </div>
              )}
              <PixelButton variant="green" full onClick={conferma}>Conferma offerta</PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}