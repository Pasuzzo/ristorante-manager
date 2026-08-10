import React from 'react';
import { PixelPanel, Chip } from '@/components/game/ui';
import { RUOLI_ESTESI, CONTRATTI, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

/** Overlay a comparsa: mostra subito l'esito dell'offerta e, se rifiutata,
 *  il sostituto che prende il posto del candidato (stessa mansione). */
export default function RispostaOverlay({ candidato, esito, sostituto, onChiudi }) {
  const accettata = esito?.accettata;
  return (
    <div className="fixed inset-0 z-50 bg-rm-bg2/85 flex items-center justify-center p-3 rm-scroll overflow-y-auto">
      <div className="rm-wood rm-no-radius rm-shadow w-full max-w-md my-4 rm-pop">
        <div className={`border-b-[4px] border-rm-wood-dark px-3 py-2 ${accettata ? 'rm-tovaglia' : 'rm-tovaglia-red'}`}>
          <span className="rm-pixel text-[11px] text-rm-bg">{accettata ? '🤝 Offerta accettata!' : '❌ Offerta rifiutata'}</span>
        </div>
        <div className="p-3 space-y-2">
          {accettata ? (
            <div className="rm-card rm-no-radius p-2">
              <div className="rm-pixel text-[11px] text-rm-bg">{candidato.nome}</div>
              <div className="rm-text text-[15px] text-rm-wood-dark">{RUOLI_ESTESI[candidato.ruolo] ?? candidato.ruolo} · entra nella brigata</div>
              <div className="rm-text text-[14px] text-rm-green mt-1">{esito.motivo}</div>
            </div>
          ) : (
            <>
              <div className="rm-card-dark rm-no-radius p-2">
                <div className="rm-pixel text-[10px] text-rm-cream/60 line-through">{candidato.nome}</div>
                <div className="rm-text text-[15px] text-rm-red">{esito.motivo}</div>
              </div>
              <div className="rm-text text-[14px] text-rm-cream/70 text-center">Al suo posto, per la stessa mansione, arriva:</div>
              {sostituto && (
                <div className="rm-card rm-no-radius p-2 rm-pop">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="rm-pixel text-[11px] text-rm-bg">{sostituto.nome}</div>
                      <div className="rm-text text-[15px] text-rm-wood-dark">{RUOLI_ESTESI[sostituto.ruolo] ?? sostituto.ruolo} · {sostituto.eta} anni</div>
                    </div>
                    <Chip color="bg-rm-blue">nuovo</Chip>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {Object.entries(sostituto.vetrina.attributi).map(([k, [lo, hi]]) => (
                      <div key={k} className="text-center">
                        <div className="rm-pixel text-[6px] text-rm-wood-dark">{k.slice(0, 3)}</div>
                        <div className="rm-pixel text-[9px] text-rm-bg">{lo}-{hi}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rm-text text-[13px] text-rm-wood-dark mt-1">💰 min +{Math.round((sostituto.pretese.superminimoMinimo - 1) * 100)}% · {money(sostituto.lordoBaseMensile)}/mese</div>
                  <div className="rm-text text-[12px] text-rm-wood-dark/80">{CONTRATTI[sostituto.pretese.contratto]} · {sostituto.pretese.accettaNero ? 'accetta nero' : 'solo regolare'}</div>
                </div>
              )}
              <div className="rm-text text-[13px] text-rm-gold text-center">Il posto resta scoperto, non la mansione: c’è sempre qualcun altro da provare, ma quello bravo l’hai perso.</div>
            </>
          )}
          <button onClick={onChiudi} className="rm-btn rm-btn-green w-full text-[10px] py-2">OK</button>
        </div>
      </div>
    </div>
  );
}