import React from 'react';
import { PixelPanel, Stat, StarRating, SegmentedBar } from '@/components/game/ui';
import CashChart from '@/components/game/CashChart';
import EventFeed from '@/components/game/EventFeed';
import { buildCashHistory } from '@/lib/cashChart';
import { money, nomeMese } from '@/lib/partita';
import { formaLabel, localitaLabel } from '@/lib/gameData';

/** Vista principale: colpo d'occhio su cassa, reputazione, ultimi eventi. */
export default function Dashboard({ stato, partita }) {
  const report = partita?.ultimo_report;
  const tes = stato?.tesoreria ?? {};
  const history = buildCashHistory(tes, 12);
  const locale = stato?.locale ?? {};
  const cond = stato?.scelte?.condizioneLocale ?? 70;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Cassa" value={money(tes.saldo ?? 0)} icon="coin" accent={(tes.saldo ?? 0) < 0 ? 'text-rm-red' : ''} />
        <Stat label="Coperti serviti" value={report?.copertiServiti ?? '—'} icon="fork" />
        <Stat label="Ricavi mese" value={money(report?.ricaviLordi ?? 0)} icon="chart" accent="text-rm-green" />
        <Stat label="Gradimento" value={report ? `${(report.gradimento * 5).toFixed(1)}★` : '—'} icon="heart" />
      </div>

      <PixelPanel title="Andamento cassa" icon="chart">
        <CashChart history={history} />
      </PixelPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PixelPanel title="Situazione" icon="chef">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="rm-pixel text-[8px] text-rm-cream uppercase">Reputazione</span>
              <StarRating reputazione={stato?.reputazione ?? 0} size={16} />
            </div>
            <div className="flex items-center justify-between">
              <span className="rm-pixel text-[8px] text-rm-cream uppercase">Condizione locale</span>
              <SegmentedBar value={cond} max={100} segments={10} color="#e8b84b" size={9} />
            </div>
            <div className="rm-text text-[16px] text-rm-cream/80">
              <div>📍 {localitaLabel(locale.tipoLocalita)} · {locale.postiASedere} posti</div>
              <div>⚖️ {formaLabel(stato?.ristorante?.forma)} · anno {stato?.ristorante?.annoAttivita}</div>
              <div>👥 Brigata: {stato?.staff?.length ?? 0} · 📱 Social: {report?.seguitoSocial ?? stato?.mkt?.seguitoSocial ?? 0}</div>
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title={report ? `Eventi · ${nomeMese(report.mese)}` : 'Eventi'} icon="envelope">
          <EventFeed eventi={report?.eventi ?? []} />
        </PixelPanel>
      </div>
    </div>
  );
}