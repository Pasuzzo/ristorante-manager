import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/game/icons';
import { PixelButton, StarRating, Money } from '@/components/game/ui';
import ReportOverlay from '@/components/game/ReportOverlay';
import CalendarStrip from '@/components/game/CalendarStrip';
import { gioco } from '@/lib/gioco';
import Dashboard from '@/pages/game/Dashboard';
import Titolare from '@/pages/game/Titolare';
import Staff from '@/pages/game/Staff';
import Mercato from '@/pages/game/Mercato';
import Bandi from '@/pages/game/Bandi';
import Decisioni from '@/pages/game/Decisioni';
import Bilancio from '@/pages/game/Bilancio';
import MenuPage from '@/pages/game/Menu';
import Turni from '@/pages/game/Turni';
import Formazione from '@/pages/game/Formazione';
import Reparti from '@/pages/game/Reparti';
import { getPartita, avanzaTurno, money, nomeMese } from '@/lib/partita';
import { formaLabel } from '@/lib/gameData';

function defaultDecisioni(stato) {
  return {
    spesaTradizionale: stato?.mkt?.spesaTradizionaleMese ?? 0,
    spesaSocial: stato?.mkt?.spesaSocialMese ?? 0,
    qualitaMaterie: stato?.scelte?.qualitaMaterie ?? 'standard',
    manutenzioneMese: stato?.scelte?.manutenzioneMese ?? 0,
    servizi: stato?.scelte?.servizi ?? [],
    listino: stato?.locale?.listino ?? 1.0,
    ristrutturazione: 0,
    assunzioni: [],
    licenziamenti: [],
    aumenti: [],
    menu: stato?.menu ?? [],
    compiti: stato?.compiti ?? {},
    nero: stato?.politicheNero ?? { quotaScontrino: 0, quotaAcquisti: 0, pagaNeroInAssenza: true },
    corsi: [],
    annunci: [],
    chiamateExtra: [],
    insegnaRicette: [],
    reparti: stato?.reparti ? {
      budgetCucina: stato.reparti.budgetCucina, budgetSala: stato.reparti.budgetSala,
      responsabileCucina: stato.reparti.responsabileCucina ?? null,
      responsabileSala: stato.reparti.responsabileSala ?? null,
      sogliaSegnalazione: stato.reparti.sogliaSegnalazione,
    } : {},
    offerte: [],
    domande: [],
    domandeBandi: [],
    investimentoDichiarato: 0,
  };
}

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'chart' },
  { key: 'titolare', label: 'Titolare', icon: 'chef' },
  { key: 'staff', label: 'Staff', icon: 'users' },
  { key: 'turni', label: 'Turni', icon: 'cal' },
  { key: 'mercato', label: 'Mercato', icon: 'cart' },
  { key: 'reparti', label: 'Reparti', icon: 'tag' },
  { key: 'bandi', label: 'Bandi', icon: 'envelope' },
  { key: 'decisioni', label: 'Decisioni', icon: 'mega' },
  { key: 'bilancio', label: 'Bilancio', icon: 'coin' },
  { key: 'menu', label: 'Menu', icon: 'fork' },
  { key: 'formazione', label: 'Formaz.', icon: 'spark' },
];

export default function Partita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partita, setPartita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [decisioni, setDecisioni] = useState(defaultDecisioni(null));
  const [avanzando, setAvanzando] = useState(false);
  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [bandi, setBandi] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [giornoCorrente, setGiornoCorrente] = useState(null);
  const [anteprima, setAnteprima] = useState(null);

  // In pausa: anteprima live dell'effetto delle decisioni (griglia inclusa)
  // sui prossimi 7 giorni. simula() non salva e non chiama il server.
  useEffect(() => {
    if (!playback || !partita) return undefined;
    const t = setTimeout(() => {
      try {
        const r = gioco.simula(partita, decisioni);
        const sette = (r.giorni ?? []).slice(0, 7);
        setAnteprima({
          coperti: sette.reduce((s, g) => s + (g.copertiServitiGiorno ?? 0), 0),
          ricavi: sette.reduce((s, g) => s + (g.ricaviGiorno ?? 0), 0),
          respinti: sette.reduce((s, g) => s + Math.max(0, (g.copertiDomanda ?? 0) - (g.copertiServitiGiorno ?? 0)), 0),
        });
      } catch {
        setAnteprima(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [playback, partita, decisioni]);

  const carica = async () => {
    try {
      const p = await getPartita(id);
      setPartita(p);
      setDecisioni(defaultDecisioni(p.stato));
      if (p.ultimoReport?.bandi) setBandi(p.ultimoReport.bandi);
      if (p.gameOver && p.ultimoReport) {
        setReport(p.ultimoReport);
        setShowReport(true);
      }
    } catch (e) {
      setErrore(e?.message ?? 'Partita non trovata');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { carica(); }, [id]);

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center rm-text text-[18px] text-rm-cream/70">Caricamento partita…</div>;
  }
  if (errore || !partita) {
    return (
      <div className="min-h-screen px-4 py-10 max-w-md mx-auto text-center">
        <div className="rm-card-dark rm-no-radius p-4 mb-3 text-rm-red rm-text text-[18px]">{errore || 'Partita non trovata'}</div>
        <PixelButton variant="wood" onClick={() => navigate('/')}>Torna alle partite</PixelButton>
      </div>
    );
  }

  const stato = partita.stato;
  const saldo = stato?.tesoreria?.saldo ?? 0;

  const avanza = async () => {
    if (avanzando || partita.gameOver) return;
    setAvanzando(true);
    setErrore('');
    try {
      const res = await avanzaTurno({ partitaId: id, decisioni });
      const agg = res.salvataggio;
      setPartita(agg);
      setReport(res.report);
      setBandi(res.bandi ?? null);
      setPlayback({ giorni: res.report?.giorni ?? [], mese: res.report?.mese, settimana: res.report?.settimana ?? [] });
      setDecisioni(defaultDecisioni(agg.stato));
    } catch (e) {
      setErrore(e?.message || 'Errore');
    } finally {
      setAvanzando(false);
    }
  };

  return (
    <div className="min-h-dvh rm-safe-top rm-safe-px pb-20 max-w-3xl mx-auto">
      {/* Header */}
      <header className="rm-wood rm-no-radius rm-shadow p-2 mb-3 sticky top-0 z-30 rm-safe-top rm-safe-px">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => navigate('/')} aria-label="Torna alle partite" className="rm-pixel text-[10px] text-rm-cream/80">‹ Partite</button>
          <span className="rm-pixel text-[11px] text-rm-cream truncate max-w-[50%]">{partita.nome || stato?.ristorante?.nome}</span>
          <span className="rm-pixel text-[10px] text-rm-gold">{nomeMese(stato?.mese)} A{stato?.annoGioco}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="rm-card rm-no-radius p-1 text-center">
            <div className="rm-pixel text-[7px] text-rm-wood-dark uppercase">Cassa</div>
            <Money value={saldo} className="text-[11px]" />
          </div>
          <div className="rm-card rm-no-radius p-1 text-center">
            <div className="rm-pixel text-[7px] text-rm-wood-dark uppercase">Reputazione</div>
            <div className="flex justify-center mt-1"><StarRating reputazione={stato?.reputazione ?? 0} size={12} /></div>
          </div>
          <div className="rm-card rm-no-radius p-1 text-center">
            <div className="rm-pixel text-[7px] text-rm-wood-dark uppercase">Posti</div>
            <div className="rm-pixel text-[11px] text-rm-bg">{stato?.locale?.postiASedere ?? 0}</div>
          </div>
        </div>
      </header>

      {errore && <div className="rm-card-dark rm-no-radius p-2 mb-3 text-rm-red rm-text text-[16px]">{errore}</div>}

      {playback && (
        <div className="px-2 mb-3">
          <CalendarStrip
            giorni={playback.giorni}
            nomeMese={nomeMese(playback.mese)}
            settimana={playback.settimana}
            onFine={() => { setPlayback(null); setShowReport(true); }}
            onApriGriglia={(g) => { setGiornoCorrente(g); setTab('turni'); }}
            anteprima={anteprima}
          />
        </div>
      )}

      {/* Contenuto del tab */}
      <main className="px-2">
        {tab === 'dashboard' && <Dashboard stato={stato} partita={partita} />}
        {tab === 'titolare' && <Titolare stato={stato} decisioni={decisioni} setDecisioni={setDecisioni} />}
        {tab === 'staff' && <Staff stato={stato} report={report} decisioni={decisioni} setDecisioni={setDecisioni} onVaiMercato={() => setTab('mercato')} />}
        {tab === 'turni' && <Turni stato={stato} report={report} decisioni={decisioni} setDecisioni={setDecisioni} giornoCorrente={giornoCorrente} />}
        {tab === 'mercato' && <Mercato stato={stato} report={report} decisioni={decisioni} setDecisioni={setDecisioni} />}
        {tab === 'reparti' && <Reparti stato={stato} report={report} decisioni={decisioni} setDecisioni={setDecisioni} />}
        {tab === 'bandi' && <Bandi report={report} decisioni={decisioni} setDecisioni={setDecisioni} />}
        {tab === 'decisioni' && <Decisioni stato={stato} decisioni={decisioni} setDecisioni={setDecisioni} report={report} />}
        {tab === 'bilancio' && <Bilancio stato={stato} partita={partita} />}
        {tab === 'menu' && <MenuPage stato={stato} decisioni={decisioni} setDecisioni={setDecisioni} />}
        {tab === 'formazione' && <Formazione stato={stato} report={report} decisioni={decisioni} setDecisioni={setDecisioni} />}
      </main>

      {/* Avanza mese */}
      {!partita.gameOver && (
        <div className="px-2 my-4">
          <PixelButton variant="green" full className="text-[12px] py-3" onClick={avanza} disabled={avanzando}>
            {avanzando ? 'Elaborazione…' : `Conferma e avanza → ${nomeMese((stato?.mese ?? 1) + 1)}`}
          </PixelButton>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 rm-card-dark rm-no-radius border-t-[4px] border-rm-wood-dark rm-safe-bottom rm-safe-px">
        <div className="max-w-3xl mx-auto grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-11">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} aria-label={t.label} aria-current={on ? 'page' : undefined} className="rm-tap py-2 flex flex-col items-center gap-1 w-full">
                <Icon name={t.icon} size={18} color={on ? '#e8b84b' : '#f2e5bc'} />
                <span className={`rm-pixel text-[7px] ${on ? 'text-rm-gold' : 'text-rm-cream/70'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showReport && (
        <ReportOverlay
          report={report}
          stato={stato}
          nomeRistorante={partita.nome}
          onClose={() => setShowReport(false)}
          onGameOverChiudi={() => navigate('/')}
        />
      )}
    </div>
  );
}