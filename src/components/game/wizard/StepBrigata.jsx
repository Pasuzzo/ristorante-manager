import React, { useState } from 'react';
import { PixelPanel, PixelButton, Chip } from '@/components/game/ui';
import { CONTRATTI, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';
import { verificaBrigata } from '@/lib/costituzione';
import CandidatoCard from '@/components/game/CandidatoCard';
import OfferModal from '@/components/game/OfferModal';

/** Step 7 — La brigata. Scegli dal pool, fai un'offerta, il candidato può rifiutare. */
export default function StepBrigata({ data, update, prep }) {
  const candidati = prep?.pool?.candidati ?? [];
  const [form, setForm] = useState(null);
  const offerte = data.assunzioni; // [{ candidato, offerta }]
  const idOfferti = new Set(offerte.map((o) => o.candidato.id));

  const apri = (c) => setForm({ candidato: c });
  const conferma = (offerta) => {
    const candidato = form.candidato;
    update({ assunzioni: [...offerte, { candidato, offerta }] });
    setForm(null);
  };
  const rimuovi = (id) => update({ assunzioni: offerte.filter((o) => o.candidato.id !== id) });

  const ruoli = offerte.map((o) => o.candidato.ruolo);
  const avvisi = verificaBrigata(ruoli);

  return (
    <div className="space-y-3">
      <PixelPanel title="La brigata" icon="users">
        <div className="rm-text text-[14px] text-rm-cream/60">Non configuri il personale: scegli dal pool. Per ognuno fai un'offerta, e il candidato può rifiutare (lo scoprirai nel riepilogo).</div>
      </PixelPanel>

      {avvisi.length > 0 && (
        <PixelPanel title="Controllo composizione" icon="spark">
          <div className="space-y-1">
            {avvisi.map((a, i) => (
              <div key={i} className={`rm-text text-[15px] ${a.startsWith('❌') ? 'text-rm-red' : 'text-rm-gold'}`}>{a}</div>
            ))}
            {avvisi.some((a) => a.startsWith('❌')) && (
              <div className="rm-text text-[14px] text-rm-cream/70 mt-1">Scappatoia: dopo l'apertura puoi coprire tu un ruolo dalla scheda Titolare (delegando il resto).</div>
            )}
          </div>
        </PixelPanel>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {candidati.map((c) => (
          <CandidatoCard key={c.id} candidato={c} offerto={idOfferti.has(c.id)} onOffri={() => apri(c)} onRimuovi={() => rimuovi(c.id)} />
        ))}
      </div>

      {offerte.length > 0 && (
        <PixelPanel title={`Offerte pronte (${offerte.length})`} icon="envelope">
          <div className="space-y-1">
            {offerte.map((o) => (
              <div key={o.candidato.id} className="rm-card-dark rm-no-radius p-2 flex items-center justify-between gap-2">
                <div className="rm-text text-[15px] text-rm-cream">
                  {o.candidato.nome} · {CONTRATTI[o.offerta.contratto]} · +{Math.round((o.offerta.superminimo - 1) * 100)}% · {money(lordoMensile(o.candidato.ruolo, o.offerta.superminimo))}/mese · {o.offerta.inRegola ? 'regolare' : 'nero'}
                </div>
                <button onClick={() => rimuovi(o.candidato.id)} className="rm-pixel text-[9px] text-rm-red">rimuovi</button>
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {form && <OfferModal candidato={form.candidato} onConferma={conferma} onAnnulla={() => setForm(null)} />}
    </div>
  );
}