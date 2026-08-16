import React, { useState, useMemo } from 'react';
import { PixelButton } from '@/components/game/ui';
import { anteprimaOfferta } from '../../../base44/shared/engine/contratti';
import { money } from '@/lib/partita';

const ORARIO_FULL = { oreFeriali: 24, oreFestive: 16 };

function Colonna({ titolo, righe, totale, totaleLabel }) {
  return (
    <div className="rm-card-dark rm-no-radius p-2">
      <div className="rm-pixel text-[8px] text-rm-gold uppercase border-b-2 border-rm-wood-dark pb-1 mb-1">{titolo}</div>
      <div className="space-y-1">
        {righe.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 rm-text text-[15px] text-rm-cream/80">
            <span>{k}</span>
            <span className="rm-pixel text-[9px] text-rm-cream">{money(v)}</span>
          </div>
        ))}
      </div>
      {totale != null && (
        <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t-2 border-rm-wood-dark">
          <span className="rm-pixel text-[7px] text-rm-gold uppercase">{totaleLabel}</span>
          <span className="rm-pixel text-[10px] text-rm-cream">{money(totale)}</span>
        </div>
      )}
    </div>
  );
}

/** Modale per comporre un'offerta a un candidato. Due cursori, anteprima live. */
export default function OfferModal({ candidato, onConferma, onAnnulla }) {
  const [superminimo, setSuperminimo] = useState(candidato.pretese.superminimoMinimo);
  const [quotaNeroPct, setQuotaNeroPct] = useState(0);
  const quotaNero = quotaNeroPct / 100;

  const a = useMemo(
    () => anteprimaOfferta(candidato.ruolo, superminimo, ORARIO_FULL, quotaNero),
    [candidato.ruolo, superminimo, quotaNero],
  );

  const desiderato = candidato.pretese.nettoDesiderato || 0;
  const delta = a.nettoTotale - desiderato;
  const positive = delta >= 0;

  const avvisaRifiuto = quotaNero > 0.15 && !candidato.pretese.accettaNero;
  const avvisaMalattia = quotaNero > 0.5;

  const conferma = () => {
    onConferma({
      candidatoId: candidato.id,
      contratto: candidato.pretese.contratto,
      superminimo: Number(superminimo),
      quotaNero: Number(quotaNero),
      inRegola: quotaNero < 0.001,
      riposoFisso: candidato.pretese.vuoleRiposoFisso,
      orario: ORARIO_FULL,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-rm-bg2/80 flex items-center justify-center p-2 rm-scroll overflow-y-auto">
      <div className="rm-wood rm-no-radius rm-shadow w-full max-w-lg my-4">
        <div className="rm-tovaglia-red border-b-[4px] border-rm-wood-dark px-3 py-2 flex items-center justify-between">
          <span className="rm-pixel text-[11px] text-rm-bg">Offerta a {candidato.nome}</span>
          <button onClick={onAnnulla} className="rm-pixel text-[12px] text-rm-bg">✕</button>
        </div>
        <div className="p-3 space-y-3">
          {/* Cursore 1 — PAGA */}
          <div>
            <div className="flex items-center justify-between">
              <span className="rm-pixel text-[8px] text-rm-cream uppercase">Paga (superminimo sul CCNL)</span>
              <span className="rm-pixel text-[10px] text-rm-gold">+{Math.round((superminimo - 1) * 100)}%</span>
            </div>
            <input type="range" min={0.9} max={1.6} step={0.01} value={superminimo}
              onChange={(e) => setSuperminimo(Number(e.target.value))} className="w-full" />
            <div className="rm-text text-[13px] text-rm-cream/60">
              Il candidato chiede minimo +{Math.round((candidato.pretese.superminimoMinimo - 1) * 100)}%.
            </div>
          </div>

          {/* Cursore 2 — FUORI BUSTA */}
          <div>
            <div className="flex items-center justify-between">
              <span className="rm-pixel text-[8px] text-rm-cream uppercase">Fuori busta</span>
              <span className="rm-pixel text-[10px] text-rm-gold">{quotaNeroPct}%</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={quotaNeroPct}
              onChange={(e) => setQuotaNeroPct(Number(e.target.value))} className="w-full" />
            <div className="rm-text text-[13px] text-rm-cream/60">0% = tutto in chiaro · 100% = tutto in nero.</div>
          </div>

          {/* Avvisi */}
          {avvisaRifiuto && (
            <div className="rm-card rm-no-radius p-2 rm-pixel text-[9px] text-rm-red">
              ⛔ {candidato.nome} non accetta il fuori busta: non accetterà.
            </div>
          )}
          {avvisaMalattia && (
            <div className="rm-card rm-no-radius p-2 rm-pixel text-[9px] text-rm-wood-dark">
              ⚠ In malattia e in ferie prenderà quasi niente.
            </div>
          )}

          {/* Pannello anteprima — tre colonne */}
          <div className="grid grid-cols-3 gap-1">
            <Colonna
              titolo="Al lavoratore"
              righe={[
                ['netto in busta', a.nettoInBusta],
                ['+ fuori busta', a.cashFuoriBusta],
              ]}
              totale={a.nettoTotale}
              totaleLabel="= in mano"
            />
            <Colonna
              titolo="Trattenute"
              righe={[
                ['contributi suoi', a.contributiDipendente],
                ['IRPEF e add.', a.irpefEAddizionali],
              ]}
              totale={a.totaleTrattenute}
              totaleLabel="totale"
            />
            <Colonna
              titolo="A carico azienda"
              righe={[
                ['contributi INPS', a.contributiDatore],
                ['INAIL', a.inail],
                ['ratei 13/14+TFR', a.ratei],
              ]}
              totale={a.totaleOneriAzienda}
              totaleLabel="totale oneri"
            />
          </div>

          {/* Totale costo azienda + barra di confronto */}
          <div className="rm-card-dark rm-no-radius p-2 flex items-center justify-between gap-2">
            <div>
              <div className="rm-pixel text-[7px] text-rm-gold uppercase">Costo azienda</div>
              <div className="rm-pixel text-[16px] text-rm-red">{money(a.costoAzienda)}</div>
            </div>
            <div className="text-right">
              <div className="rm-pixel text-[7px] text-rm-cream/60 uppercase">vs desiderato {money(desiderato)}</div>
              <div className={`rm-pixel text-[13px] ${positive ? 'text-rm-green' : 'text-rm-red'}`}>
                {positive ? '+' : ''}{money(delta)}
              </div>
            </div>
          </div>

          {/* Indicatori */}
          <div className="rm-text text-[14px] text-rm-cream/70 leading-tight space-y-[2px]">
            <div>💶 {a.costoPerEuroNetto.toFixed(2)} € spesi per ogni euro che arriva a lui</div>
            {quotaNero > 0 && (
              <div className="text-rm-gold">💰 risparmi {money(a.risparmioVsRegolare)} € al mese</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <PixelButton variant="green" onClick={conferma}>Conferma offerta</PixelButton>
            <PixelButton variant="wood" onClick={onAnnulla}>Annulla</PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
}