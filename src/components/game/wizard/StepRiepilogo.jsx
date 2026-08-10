import React, { useState } from 'react';
import { PixelButton, PixelPanel } from '@/components/game/ui';
import { money } from '@/lib/partita';

const MESE = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

/** Step 8 — Riepilogo costituzione. Mostra i mesi di autonomia come numero
 *  grande e, se il budget non basta o dà meno di 6 mesi, tre vie: aumentare
 *  il capitale, tornare al passo da correggere, o partire così. */
export default function StepRiepilogo({ esito, data, onEntra, onAumentaBudget, onTornaA, onRicomincia }) {
  const [confirmAumento, setConfirmAumento] = useState(false);
  if (!esito) return null;

  const mesi = esito.mesiAutonomia ?? 0;
  const cassa = esito.cassaOperativa ?? 0;
  const bloccante = cassa < 0;
  const risicato = mesi < 6 && !bloccante;
  const show3vie = bloccante || risicato;
  const consigliato = esito.budgetConsigliato ?? 0;
  const delta = consigliato > data.budgetIniziale ? consigliato - data.budgetIniziale : 0;
  const esitiOfferte = (esito.logCostituzione ?? []).filter((l) => l.startsWith('✅') || l.startsWith('❌'));
  const avvisi = (esito.logCostituzione ?? []).filter((l) => !l.startsWith('✅') && !l.startsWith('❌'));

  const mesiColore = bloccante ? 'text-rm-red' : risicato ? 'text-rm-gold' : 'text-rm-green';

  return (
    <div className="space-y-3">
      <PixelPanel title="Mesi di autonomia" icon="cal">
        <div className="text-center py-2">
          <div className={`rm-pixel text-[42px] ${mesiColore}`}>{Math.round(mesi)}</div>
          <div className="rm-text text-[16px] text-rm-cream/70">mesi di cassa prima di finire i soldi</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="rm-card-dark rm-no-radius p-2 text-center">
            <div className="rm-pixel text-[7px] text-rm-gold uppercase">Cassa operativa</div>
            <div className={`rm-pixel text-[12px] ${cassa < 0 ? 'text-rm-red' : 'text-rm-cream'}`}>{money(cassa)}</div>
          </div>
          <div className="rm-card-dark rm-no-radius p-2 text-center">
            <div className="rm-pixel text-[7px] text-rm-gold uppercase">Capitale versato</div>
            <div className="rm-pixel text-[12px] text-rm-cream">{money(esito.capitaleVersato ?? 0)}</div>
          </div>
        </div>
      </PixelPanel>

      {esitiOfferte.length > 0 && (
        <PixelPanel title="Esiti delle offerte" icon="users">
          <div className="space-y-1">
            {esitiOfferte.map((l, i) => (
              <div key={i} className={`rm-text text-[14px] ${l.startsWith('✅') ? 'text-rm-green' : 'text-rm-red'}`}>{l}</div>
            ))}
          </div>
        </PixelPanel>
      )}

      {avvisi.length > 0 && (
        <PixelPanel title="Avvisi" icon="spark">
          <div className="space-y-1">
            {avvisi.map((a, i) => (
              <div key={i} className={`rm-text text-[14px] ${a.startsWith('⚠') ? 'text-rm-gold' : a.startsWith('❌') ? 'text-rm-red' : 'text-rm-cream/90'}`}>{a}</div>
            ))}
          </div>
        </PixelPanel>
      )}

      <PixelPanel title="La tua costituzione" icon="envelope">
        <div className="rm-text text-[15px] text-rm-cream/90 leading-tight space-y-[2px]">
          <div>🍽️ {data.nomeRistorante} — {MESE[(data.meseInizio ?? 1) - 1]}</div>
          <div>📍 {data.annuncio?.titolo ?? '—'} ({data.modalitaImmobile})</div>
          <div>👤 {data.titolare.nome} · 💶 {money(data.budgetIniziale)}</div>
          <div>🧾 {data.commercialista} · brigata: {data.assunzioni.length}</div>
        </div>
      </PixelPanel>

      {show3vie ? (
        <PixelPanel title="Il budget non basta (o sì appena)" icon="coin">
          <div className="rm-text text-[14px] text-rm-cream/70 mb-3">Tre strade. Scegli come rimediare.</div>

          {/* Via 1 — Aumenta il budget */}
          <div className="rm-card-dark rm-no-radius p-2 mb-2">
            <div className="rm-pixel text-[9px] text-rm-gold uppercase mb-1">1 · Aumenta il budget</div>
            {consigliato > data.budgetIniziale ? (
              confirmAumento ? (
                <div className="space-y-2">
                  <div className="rm-text text-[14px] text-rm-cream/90">Porti il capitale a {money(consigliato)} ({money(delta)} in più). Questi soldi devono uscire da qualche parte: risparmi, soci, un prestito familiare.</div>
                  <div className="grid grid-cols-2 gap-2">
                    <PixelButton variant="green" className="text-[10px] py-2" onClick={() => onAumentaBudget(consigliato)}>Conferma e ricostituisci</PixelButton>
                    <PixelButton variant="wood" className="text-[10px] py-2" onClick={() => setConfirmAumento(false)}>Annulla</PixelButton>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="rm-text text-[14px] text-rm-cream">Porta il capitale a <span className="rm-pixel text-[11px] text-rm-gold">{money(consigliato)}</span> ({money(delta)} in più)</span>
                  <PixelButton variant="green" className="text-[9px] py-2" onClick={() => setConfirmAumento(true)}>Aumenta</PixelButton>
                </div>
              )
            ) : (
              <div className="rm-text text-[13px] text-rm-cream/60">Nessun suggerimento di aumento disponibile.</div>
            )}
          </div>

          {/* Via 2 — Torna indietro */}
          <div className="rm-card-dark rm-no-radius p-2 mb-2">
            <div className="rm-pixel text-[9px] text-rm-gold uppercase mb-1">2 · Torna indietro con i consigli</div>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => onTornaA(4)} className="rm-btn rm-btn-wood text-[9px] py-2 text-left">→ Locale meno caro (passo 5)</button>
              <button onClick={() => onTornaA(3)} className="rm-btn rm-btn-wood text-[9px] py-2 text-left">→ Meno capitale sociale (passo 4)</button>
              <button onClick={() => onTornaA(6)} className="rm-btn rm-btn-wood text-[9px] py-2 text-left">→ Brigata più piccola (passo 7)</button>
            </div>
          </div>

          {/* Via 3 — Parti così */}
          {!bloccante && (
            <div className="rm-card-dark rm-no-radius p-2">
              <div className="rm-pixel text-[9px] text-rm-gold uppercase mb-1">3 · Parti così</div>
              <div className="rm-text text-[13px] text-rm-red mb-2">⚠️ Con {Math.round(mesi)} mesi di autonomia rischi di non superare il primo inverno.</div>
              <PixelButton variant="green" full className="text-[10px] py-2" onClick={onEntra}>Parti così, accetto il rischio</PixelButton>
            </div>
          )}
        </PixelPanel>
      ) : (
        <PixelPanel title="Pronto per aprire" icon="star">
          <div className="rm-text text-[15px] text-rm-green mb-2">✓ {Math.round(mesi)} mesi di autonomia: partenza solida.</div>
          <PixelButton variant="green" full className="text-[11px] py-2" onClick={onEntra}>Entra nel locale ▶</PixelButton>
          <button onClick={onRicomincia} className="rm-text text-[13px] text-rm-cream/50 mt-2 underline w-full text-center">ricomincia da capo</button>
        </PixelPanel>
      )}
    </div>
  );
}