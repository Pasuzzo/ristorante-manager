import React from 'react';
import { PixelButton, Stat, StarRating, Money, Chip } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import EventFeed from '@/components/game/EventFeed';
import { money, nomeMese } from '@/lib/partita';

function ReportGrid({ report }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <Stat label="Coperti dom." value={report.copertiDomanda} icon="users" />
      <Stat label="Coperti serviti" value={report.copertiServiti} icon="fork" accent="text-rm-green" />
      <Stat label="Respinti" value={report.clientiRespinti} icon="skull" accent={report.clientiRespinti > 0 ? 'text-rm-red' : ''} />
      <Stat label="Ricavi lordi" value={money(report.ricaviLordi)} icon="coin" accent="text-rm-green" />
      <Stat label="Cassa" value={money(report.cassa)} icon="chart" accent={report.cassa < 0 ? 'text-rm-red' : ''} />
      <Stat label="TFR maturato" value={money(report.tfrTotale)} icon="envelope" />
      <Stat label="Gradimento" value={`${(report.gradimento * 5).toFixed(1)}★`} icon="heart" />
      <Stat label="Reputazione" value={`${Math.round(report.reputazione * 100)}/100`} icon="star" />
      <Stat label="Social" value={report.seguitoSocial} icon="wifi" />
    </div>
  );
}

function GameOverView({ report, onChiudi }) {
  return (
    <div className="rm-card rm-no-radius rm-shadow p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="skull" size={20} color="#c8443c" />
        <h2 className="rm-pixel text-[14px] text-rm-red">GAME OVER</h2>
      </div>
      <p className="rm-text text-[18px] text-rm-bg mb-2">
        La banca ha chiuso i rubinetti: il fido è sforato. La gestione del
        «{report?.nomeRistorante ?? 'ristorante'}» finisce qui.
      </p>
      <ReportGrid report={report} />
      <div className="mt-3">
        <PixelButton variant="wood" full onClick={onChiudi}>Torna alle partite</PixelButton>
      </div>
    </div>
  );
}

/** Overlay di fine turno: report del mese, eventuale chiusura d'anno, game over. */
export default function ReportOverlay({ report, onClose, onGameOverChiudi, nomeRistorante, stato }) {
  if (!report) return null;
  const r = { ...report, nomeRistrante: nomeRistorante };
  // Gli accessi di routine (🚓) non sono ispezioni: restano nel feed normale, non qui.
  const eventiOverlay = (report.eventi ?? []).filter((e) => !e.startsWith('🚓'));
  const violCorr = stato?.controlli?.violazioniCorrispettivi?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-rm-bg2/80 flex items-start sm:items-center justify-center p-2 overflow-y-auto rm-scroll">
      <div className="rm-wood rm-no-radius rm-shadow w-full max-w-2xl my-4">
        <div className="rm-tovaglia-red border-b-[4px] border-rm-wood-dark px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="chart" size={16} color="#2b2233" />
            <span className="rm-pixel text-[12px] text-rm-bg">
              {nomeMese(report.mese)} · Anno {report.annoGioco}
            </span>
          </div>
          <button onClick={report.gameOver ? onGameOverChiudi : onClose} className="rm-pixel text-[12px] text-rm-bg">✕</button>
        </div>

        <div className="p-3 space-y-3">
          {report.gameOver ? (
            <GameOverView report={r} onChiudi={onGameOverChiudi} />
          ) : (
            <>
              <ReportGrid report={report} />

              {report.ispezione && (
                <div className="rm-card-dark rm-no-radius p-2 border-2 border-rm-red">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="skull" size={16} color="#c8443c" />
                    <span className="rm-pixel text-[11px] text-rm-red">{report.ispezione.titolo}</span>
                  </div>
                  <ul className="rm-text text-[16px] text-rm-cream list-disc pl-4 space-y-1">
                    {report.ispezione.trovato.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip color="bg-rm-red">Sanzione {money(report.ispezione.sanzione)}</Chip>
                    {report.ispezione.sospensioneGiorni > 0 && <Chip color="bg-rm-red">Sospensione {report.ispezione.sospensioneGiorni}g</Chip>}
                    {report.ispezione.durcIrregolareMesi > 0 && <Chip color="bg-rm-red">DURC irreg. {report.ispezione.durcIrregolareMesi} mesi</Chip>}
                  </div>
                  {report.ispezione.ente === 'finanza' && (
                    <div className="mt-2 rm-card rm-no-radius p-1">
                      <div className="rm-pixel text-[8px] text-rm-bg">Corrispettivi: violazione {violCorr}/4</div>
                      <div className="rm-text text-[14px] text-rm-wood-dark">Alla quarta in cinque anni scatta la chiusura.</div>
                    </div>
                  )}
                </div>
              )}

              {report.chiusuraAnno && (
                <div className="rm-card-dark rm-no-radius p-2">
                  <div className="rm-pixel text-[10px] text-rm-gold mb-1">CHIUSURA D'ANNO</div>
                  {report.chiusuraAnno.map((riga, i) => (
                    <div key={i} className="rm-text text-[17px] text-rm-cream leading-snug">{riga}</div>
                  ))}
                </div>
              )}

              <div>
                <div className="rm-pixel text-[10px] text-rm-cream mb-1">EVENTI DEL MESE</div>
                <EventFeed eventi={eventiOverlay} />
              </div>

              <PixelButton variant="green" full onClick={onClose}>Continua</PixelButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}