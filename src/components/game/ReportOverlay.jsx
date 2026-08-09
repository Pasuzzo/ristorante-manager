import React, { useState, useEffect } from 'react';
import { PixelButton, Stat, StarRating } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import EventFeed from '@/components/game/EventFeed';
import { money, nomeMese } from '@/lib/partita';

export default function ReportOverlay({ report, motivoGameOver, onClose }) {
  const [phase, setPhase] = useState('report');

  useEffect(() => { setPhase('report'); }, [report]);

  const continua = () => {
    if (phase === 'report') {
      if (report.chiusuraAnno) setPhase('chiusura');
      else if (report.gameOver) setPhase('gameover');
      else onClose();
    } else if (phase === 'chiusura') {
      if (report.gameOver) setPhase('gameover'); else onClose();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-rm-bg/95 flex items-start sm:items-center justify-center p-2 overflow-y-auto">
      <div className="w-full max-w-lg my-4">
        {phase === 'report' && <ReportCard report={report} onContinua={continua} />}
        {phase === 'chiusura' && <ChiusuraCard report={report} onContinua={continua} />}
        {phase === 'gameover' && <GameOverCard motivo={motivoGameOver || 'Il fido è saltato.'} onContinua={onClose} />}
      </div>
    </div>
  );
}

function ReportCard({ report, onContinua }) {
  return (
    <div className="rm-wood rm-no-radius p-3 rm-shadow rm-pop">
      <div className="rm-tovaglia-red border-b-[4px] border-rm-wood-dark px-2 py-1 flex items-center gap-2">
        <Icon name="cal" size={14} color="#2b2233" />
        <span className="rm-pixel text-[12px] text-rm-bg">REPORT · {nomeMese(report.mese)} ANNO {report.annoGioco}</span>
      </div>
      <div className="p-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-2">
          <Stat label="Coperti" value={report.copertiServiti} icon="users" accent="text-rm-green" />
          <Stat label="Respinti" value={report.clientiRespinti} icon="mega" accent={report.clientiRespinti > 0 ? 'text-rm-red' : ''} />
          <Stat label="Ricavi" value={money(report.ricaviLordi)} icon="coin" />
          <Stat label="Cassa" value={money(report.cassa)} icon="coin" accent={report.cassa < 0 ? 'text-rm-red' : 'text-rm-green'} />
          <Stat label="Social" value={report.seguitoSocial.toLocaleString('it-IT')} icon="spark" accent="text-rm-blue" />
          <Stat label="Gradimento" value={(report.gradimento * 5).toFixed(1) + '★'} icon="star" accent="text-rm-gold" />
        </div>
        <div className="flex items-center gap-2 my-2">
          <span className="rm-pixel text-[9px] text-rm-cream">REPUTAZIONE</span>
          <StarRating reputazione={report.reputazione} size={18} />
        </div>
        <div className="rm-pixel text-[9px] text-rm-cream mt-2 mb-1">BACHECA</div>
        <EventFeed eventi={report.eventi} />
        <PixelButton full className="mt-3" onClick={onContinua}>CONTINUA ▶</PixelButton>
      </div>
    </div>
  );
}

function ChiusuraCard({ report, onContinua }) {
  return (
    <div className="rm-wood rm-no-radius p-3 rm-shadow rm-pop">
      <div className="rm-tovaglia-red border-b-[4px] border-rm-wood-dark px-2 py-1 flex items-center gap-2">
        <Icon name="stamp" size={14} color="#2b2233" />
        <span className="rm-pixel text-[12px] text-rm-bg">CHIUSURA D'ANNO · ANNO {report.annoGioco}</span>
      </div>
      <div className="p-2">
        <p className="rm-text text-[16px] text-rm-cream/80 mb-2">Il commercialista ha chiuso l'esercizio. Ecco il conto della mano.</p>
        <div className="rm-card-dark rm-no-radius p-2 space-y-1">
          {report.chiusuraAnno.map((r, i) => (
            <div key={i} className="rm-text text-[16px] text-rm-cream/90 border-b border-rm-cream/10 py-[2px] leading-snug">{r}</div>
          ))}
        </div>
        <PixelButton full variant="gold" className="mt-3" onClick={onContinua}>PROSEGUI AL NUOVO ANNO ▶</PixelButton>
      </div>
    </div>
  );
}

function GameOverCard({ motivo, onContinua }) {
  return (
    <div className="rm-wood rm-no-radius p-4 rm-shadow rm-pop text-center">
      <div className="flex justify-center mb-3"><Icon name="skull" size={56} color="#c8443c" /></div>
      <div className="rm-pixel text-[18px] text-rm-red mb-3">GAME OVER</div>
      <div className="rm-card rm-no-radius p-2 mb-3 rm-text text-[17px] text-rm-bg leading-snug">{motivo}</div>
      <p className="rm-text text-[16px] text-rm-cream/70 mb-3">La partita è chiusa. Puoi ancora sfogliare la contabilità, ma non si avanza più.</p>
      <PixelButton full onClick={onContinua}>VA BENE</PixelButton>
    </div>
  );
}