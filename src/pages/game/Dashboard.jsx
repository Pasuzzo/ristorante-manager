import React from 'react';
import { PixelPanel, Stat, StarRating, SegmentedBar, Chip } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import CashChart from '@/components/game/CashChart';
import EventFeed from '@/components/game/EventFeed';
import { buildCashHistory } from '@/lib/cashChart';
import { money, nomeMese } from '@/lib/partita';
import { formaLabel, localitaLabel } from '@/lib/gameData';

function MacroPanel({ stato, report }) {
  const m = stato?.macroStato ?? {};
  const rm = report?.macro ?? {};
  const infl = (m.inflazioneAnnua ?? rm.inflazione ?? 0) * 100;
  const inflAlim = (m.inflazioneAlimentare ?? rm.inflazioneAlimentare ?? 0) * 100;
  const fiducia = m.fiduciaConsumatori ?? rm.fiducia ?? 1;
  const salari = m.crescitaSalariAnnua ?? rm.salari ?? 0;
  const canoni = m.indiceCanoni ?? 1;
  const shock = m.shockAttivo?.nome ?? rm.shock;
  const gap = infl / 100 - salari;

  return (
    <PixelPanel title="Economia" icon="chart">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rm-card-dark rm-no-radius p-2">
          <div className="rm-pixel text-[7px] text-rm-cream/60 uppercase">Inflazione</div>
          <div className="rm-pixel text-[12px] text-rm-cream">{infl.toFixed(1)}%</div>
        </div>
        <div className="rm-card-dark rm-no-radius p-2">
          <div className="rm-pixel text-[7px] text-rm-cream/60 uppercase">Alimentare</div>
          <div className={`rm-pixel text-[12px] ${inflAlim > infl + 1 ? 'text-rm-red' : 'text-rm-cream'}`}>{inflAlim.toFixed(1)}%</div>
        </div>
        <div className="rm-card-dark rm-no-radius p-2">
          <div className="rm-pixel text-[7px] text-rm-cream/60 uppercase">Fiducia</div>
          <div className={`rm-pixel text-[12px] ${fiducia < 0.85 ? 'text-rm-red' : 'text-rm-cream'}`}>{Math.round(fiducia * 100)}</div>
        </div>
        <div className="rm-card-dark rm-no-radius p-2">
          <div className="rm-pixel text-[7px] text-rm-cream/60 uppercase">Canoni</div>
          <div className="rm-pixel text-[12px] text-rm-cream">×{canoni.toFixed(2)}</div>
        </div>
      </div>
      <div className="rm-text text-[14px] text-rm-cream/60 mt-2">
        Salari +{(salari * 100).toFixed(1)}%/anno · potere d'acquisto: {gap > 0.02 ? <span className="text-rm-red">in calo</span> : <span className="text-rm-green">stabile</span>}
      </div>
      {shock && (
        <div className="rm-card-dark rm-no-radius p-2 mt-2 border-2 border-rm-red">
          <div className="rm-pixel text-[8px] text-rm-red uppercase">Shock in corso</div>
          <div className="rm-text text-[15px] text-rm-cream mt-1">{shock}</div>
        </div>
      )}
    </PixelPanel>
  );
}

function TitolareMini({ stato }) {
  const t = stato?.titolare ?? {};
  const stress = t.stress ?? 20;
  const color = stress >= 70 ? '#c8443c' : stress >= 50 ? '#e8b84b' : '#5a8c46';
  return (
    <PixelPanel title="Titolare" icon="chef">
      <div className="flex items-center justify-between">
        <span className="rm-text text-[16px] text-rm-cream">{t.nome ?? '—'}</span>
        {t.burnout ? <Chip color="bg-rm-red">BURNOUT</Chip> : <span className="rm-pixel text-[10px]" style={{ color }}>{Math.round(stress)}/100</span>}
      </div>
      <div className="mt-2"><SegmentedBar value={stress} max={100} segments={20} color={color} size={10} /></div>
      {t.burnout && <div className="rm-text text-[14px] text-rm-red mt-2">Decisioni di visione bloccate. Delega e riposa.</div>}
      {stato?.compiti?.ruoloCoperto && <div className="rm-text text-[14px] text-rm-cream/60 mt-2">Copre un ruolo operativo: {stato.compiti.ruoloCoperto}.</div>}
    </PixelPanel>
  );
}

function Alerts({ stato }) {
  const alerts = [];
  const saldo = stato?.tesoreria?.saldo ?? 0;
  if (saldo < 0) alerts.push({ icon: 'skull', txt: 'Cassa in rosso: rischi insolvenza.', color: 'text-rm-red' });
  const t = stato?.titolare ?? {};
  if (t.burnout) alerts.push({ icon: 'skull', txt: 'Burnout: decisioni di visione bloccate.', color: 'text-rm-red' });
  else if (t.stress >= 70) alerts.push({ icon: 'chef', txt: 'Stress alto: delega prima di crollare.', color: 'text-rm-gold' });
  const fc = stato?.ristorante?.foodCostPct ?? 0;
  if (fc > 0.45) alerts.push({ icon: 'leaf', txt: `Food cost alto (${Math.round(fc * 100)}%): rivedi menu o listino.`, color: 'text-rm-red' });
  const irreg = (stato?.staff ?? []).filter((d) => !d.inRegola).length;
  if (irreg > 0) alerts.push({ icon: 'skull', txt: `${irreg} dipendenti in nero: rischio ispezione.`, color: 'text-rm-gold' });
  if (alerts.length === 0) return null;
  return (
    <PixelPanel title="Alert" icon="spark">
      <div className="space-y-1">
        {alerts.map((a, i) => (
          <div key={i} className={`rm-text text-[15px] ${a.color} flex items-center gap-2`}>
            <Icon name={a.icon} size={14} color="#c8443c" /> {a.txt}
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

/** Vista principale: colpo d'occhio su cassa, macro, titolare, alert, eventi. */
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

      <MacroPanel stato={stato} report={report} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TitolareMini stato={stato} />
        <PixelPanel title="Andamento cassa" icon="chart">
          <CashChart history={history} />
        </PixelPanel>
      </div>

      {report?.durcIrregolare && (
        <div className="rm-chip bg-rm-red w-full text-center">DURC IRREGOLARE — niente bandi né sgravi finché non rientri</div>
      )}

      <Alerts stato={stato} />

      {(report?.eventiCalendario?.length ?? 0) > 0 && (
        <PixelPanel title={report ? `Eventi del territorio · ${nomeMese(report.mese)}` : 'Eventi del territorio'} icon="envelope">
          <div className="space-y-2">
            {report.eventiCalendario.map((e, i) => {
              const pct = Math.round((e.effettoMese - 1) * 100);
              const pos = e.effettoMese >= 1;
              return (
                <div key={i} className="rm-card-dark rm-no-radius p-2 flex items-center gap-2">
                  <span style={{ fontSize: 18 }}>{e.icona}</span>
                  <div className="flex-1">
                    <div className="rm-pixel text-[10px] text-rm-cream">{e.nome} · {e.giorni}g</div>
                    <div className="rm-text text-[14px] text-rm-cream/60">{e.nota}</div>
                  </div>
                  <span className={`rm-pixel text-[10px] ${pos ? 'text-rm-green' : 'text-rm-red'}`}>{pos ? '+' : ''}{pct}%</span>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      )}

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