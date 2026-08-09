import React from 'react';
import { PixelPanel, SectionTitle, Stat, StarRating, Money, SegmentedBar } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import CashChart from '@/components/game/CashChart';
import EventFeed from '@/components/game/EventFeed';
import { cashHistory } from '@/lib/cashChart';
import { money, nomeMese } from '@/lib/partita';
import { formaLabel, localitaLabel } from '@/lib/gameData';

export default function Dashboard({ stato, report }) {
  const cassa = stato.tesoreria.saldo;
  const rep = stato.reputazione;
  const coperti = report?.copertiServiti ?? 0;
  const respinti = report?.clientiRespinti ?? 0;
  const social = Math.round(stato.mkt.seguitoSocial);
  const history = cashHistory(stato.tesoreria, 12);

  return (
    <div className="space-y-3">
      {/* Cassa grande */}
      <div className="rm-wood rm-no-radius p-3 rm-shadow">
        <div className="flex items-center gap-1 mb-1">
          <Icon name="coin" size={16} color="#e8b84b" />
          <span className="rm-pixel text-[10px] text-rm-cream">CASSA</span>
        </div>
        <div className={`rm-pixel text-[22px] ${cassa < 0 ? 'text-rm-red' : 'text-rm-gold'}`}>{money(cassa)}</div>
        <div className="rm-text text-[15px] text-rm-cream/60 mt-1">
          Fido {money(stato.tesoreria.fidoMax)} · {stato.tesoreria.saldo < 0 ? 'in rosso 🔴' : 'in attivo'}
        </div>
      </div>

      {/* Reputazione + social */}
      <div className="grid grid-cols-2 gap-3">
        <PixelPanel title="REPUTAZIONE">
          <StarRating reputazione={rep} size={20} />
          <div className="rm-text text-[15px] text-rm-cream/70 mt-2">Gradimento mese: {report ? (report.gradimento * 5).toFixed(1) + '★' : '—'}</div>
        </PixelPanel>
        <PixelPanel title="SOCIAL" icon="spark">
          <div className="rm-pixel text-[16px] text-rm-gold">{social.toLocaleString('it-IT')}</div>
          <div className="rm-text text-[15px] text-rm-cream/70 mt-2">follower "utili"</div>
        </PixelPanel>
      </div>

      {/* Coperti */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Coperti" value={coperti} icon="users" accent="text-rm-green" />
        <Stat label="Respinti" value={respinti} icon="mega" accent={respinti > 0 ? 'text-rm-red' : ''} />
        <Stat label="Ricavi mese" value={money(report?.ricaviLordi ?? 0)} icon="coin" />
      </div>

      {/* Grafico cassa */}
      <div>
        <SectionTitle icon="chart">Andamento cassa (12 mesi)</SectionTitle>
        <CashChart history={history} />
      </div>

      {/* Feed eventi */}
      <div>
        <SectionTitle icon="cal">Bacheca del mese</SectionTitle>
        <EventFeed eventi={report?.eventi} />
      </div>

      {/* Sintesi locale */}
      <PixelPanel title="IL TUO LOCALE" icon="chef">
        <div className="rm-text text-[16px] text-rm-cream leading-snug">
          <b>{stato.ristorante.nome}</b><br />
          {formaLabel(stato.ristorante.forma)} a {localitaLabel(stato.locale.tipoLocalita)}<br />
          Anno {stato.annoGioco} · {nomeMese(stato.mese)} · {stato.locale.postiASedere} posti<br />
          Condizione locale: <span className="text-rm-gold">{Math.round(stato.scelte.condizioneLocale)}/100</span>
          <SegmentedBar className="mt-1" value={stato.scelte.condizioneLocale} max={100} segments={20} color="#e8b84b" size={8} />
        </div>
      </PixelPanel>
    </div>
  );
}