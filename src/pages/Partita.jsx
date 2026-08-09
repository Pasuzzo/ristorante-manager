import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Dashboard from '@/pages/game/Dashboard';
import Staff from '@/pages/game/Staff';
import Decisioni from '@/pages/game/Decisioni';
import Bilancio from '@/pages/game/Bilancio';
import Menu from '@/pages/game/Menu';
import ReportOverlay from '@/components/game/ReportOverlay';
import { Icon } from '@/components/game/icons';
import { getPartita, avanzaTurno, money, nomeMese } from '@/lib/partita';

const TABS = [
  { id: 'dashboard', label: 'Sala', icon: 'chart' },
  { id: 'staff', label: 'Staff', icon: 'users' },
  { id: 'decisioni', label: 'Decisioni', icon: 'mega' },
  { id: 'bilancio', label: 'Bilancio', icon: 'stamp' },
  { id: 'menu', label: 'Menu', icon: 'fork' },
];

function decFromStato(stato) {
  return {
    spesaTradizionale: stato.mkt.spesaTradizionaleMese || 0,
    spesaSocial: stato.mkt.spesaSocialMese || 0,
    qualitaMaterie: stato.scelte.qualitaMaterie || 'standard',
    listino: stato.locale.listino || 1,
    manutenzioneMese: stato.scelte.manutenzioneMese || 0,
    ristrutturazione: 0,
    servizi: [...(stato.scelte.servizi || [])],
    assunzioni: [],
    licenziamenti: [],
    aumenti: [],
    menu: (stato.menu || []).map((r) => ({ ...r })),
  };
}

export default function Partita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partita, setPartita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [dec, setDec] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function load() {
    setLoading(true); setErr('');
    try {
      const p = await getPartita(id);
      setPartita(p);
      setDec(decFromStato(p.stato));
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Partita non trovata');
    } finally { setLoading(false); }
  }

  async function avanza() {
    if (!partita || advancing || partita.game_over) return;
    setAdvancing(true); setErr('');
    try {
      const turnoAtteso = partita.turni_giocati + 1;
      const res = await avanzaTurno({ partitaId: id, turnoAtteso, decisioni: dec });
      const refreshed = await getPartita(id);
      setPartita(refreshed);
      setDec(decFromStato(refreshed.stato));
      setReport(res.report);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Errore di avanzamento');
    } finally { setAdvancing(false); }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="rm-pixel text-[12px] text-rm-gold rm-blink">CARICO…</div></div>;
  }
  if (err && !partita) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <div className="rm-card rm-no-radius p-3 rm-text text-[18px]">{err}</div>
        <button className="rm-btn" onClick={() => navigate('/')}>◀ LE TUE PARTITE</button>
      </div>
    );
  }

  const stato = partita.stato;
  const ultimoReport = partita.ultimo_report;
  const gameOver = partita.game_over;
  const turno = partita.turni_giocati + 1;

  const setAssunzioni = (v) => setDec({ ...dec, assunzioni: v });
  const setLicenziamenti = (v) => setDec({ ...dec, licenziamenti: v });
  const setAumenti = (v) => setDec({ ...dec, aumenti: v });
  const setMenu = (v) => setDec({ ...dec, menu: v });

  return (
    <div className="min-h-screen max-w-2xl mx-auto pb-28">
      {/* Header */}
      <div className="rm-wood rm-no-radius sticky top-0 z-30 px-2 py-2 border-b-[4px] border-rm-wood-dark">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="chef" size={18} color="#e8b84b" />
            <div className="min-w-0">
              <div className="rm-pixel text-[10px] text-rm-cream truncate">{stato.ristorante.nome}</div>
              <div className="rm-text text-[14px] text-rm-cream/60 leading-none">{nomeMese(stato.mese)} · Anno {stato.annoGioco} · Turno {turno}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="rm-pixel text-[7px] text-rm-cream/60">CASSA</div>
            <div className={`rm-pixel text-[12px] ${stato.tesoreria.saldo < 0 ? 'text-rm-red' : 'text-rm-gold'}`}>{money(stato.tesoreria.saldo)}</div>
          </div>
        </div>
        {gameOver && (
          <div className="rm-tovaglia-red mt-1 px-2 py-1 rm-pixel text-[9px] text-rm-bg rm-blink border-[2px] border-rm-bg">
            ⚠ PARTITA CHIUSA: {stato.motivoGameOver || 'fido sforato'}
          </div>
        )}
      </div>

      {err && <div className="rm-card rm-no-radius m-2 p-2 border-l-[4px] border-rm-red rm-text text-[15px]">{err}</div>}

      {/* Content */}
      <div className="p-2">
        {tab === 'dashboard' && <Dashboard stato={stato} report={ultimoReport} />}
        {tab === 'staff' && <Staff stato={stato} assunzioni={dec.assunzioni} setAssunzioni={setAssunzioni} licenziamenti={dec.licenziamenti} setLicenziamenti={setLicenziamenti} aumenti={dec.aumenti} setAumenti={setAumenti} />}
        {tab === 'decisioni' && <Decisioni dec={dec} setDec={setDec} />}
        {tab === 'bilancio' && <Bilancio stato={stato} report={ultimoReport} />}
        {tab === 'menu' && <Menu stato={stato} report={ultimoReport} menu={dec.menu} setMenu={setMenu} />}
      </div>

      {/* Bottom bar: AVANZA MESE + tabs */}
      <div className="fixed bottom-0 left-0 right-0 z-30 max-w-2xl mx-auto">
        {!gameOver && (
          <div className="px-2 pt-2 bg-rm-bg/95">
            <button
              onClick={avanza}
              disabled={advancing}
              className="rm-btn rm-btn-green w-full !text-[14px] !py-3 rm-shadow"
            >
              {advancing ? 'ELABORO IL MESE…' : 'AVANZA MESE ▶'}
            </button>
          </div>
        )}
        <div className="rm-wood border-t-[4px] border-rm-wood-dark flex">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 flex flex-col items-center gap-1 border-r-[2px] border-rm-wood-dark last:border-r-0 ${tab === t.id ? 'bg-rm-red' : 'bg-rm-wood'}`}>
              <Icon name={t.icon} size={16} color={tab === t.id ? '#f2e5bc' : '#f2e5bc'} />
              <span className="rm-pixel text-[6px]" style={{ color: tab === t.id ? '#f2e5bc' : '#f2e5bccc' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {report && <ReportOverlay report={report} motivoGameOver={stato.motivoGameOver} onClose={() => setReport(null)} />}
    </div>
  );
}