import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton, StarRating, Chip } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { gioco } from '@/lib/gioco';
import { base44 } from '@/api/base44Client';
import { eliminaPartita, money, nomeMese } from '@/lib/partita';

function dataUltimo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const [righe, setRighe] = useState(null);
  const [errore, setErrore] = useState('');
  const [cloudMsg, setCloudMsg] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const navigate = useNavigate();

  const carica = async () => {
    try {
      const r = await gioco.elenco();
      setRighe(r);
      return r;
    } catch (e) {
      setErrore(e?.message ?? 'Errore di caricamento');
      setRighe([]);
      return [];
    }
  };

  // Apertura app: riprendi l'ultima partita non finita. Solo al primo
  // mount della sessione; se l'utente torna qui da una partita, mostro l'elenco.
  useEffect(() => {
    const visto = sessionStorage.getItem('rm:homeVisto');
    sessionStorage.setItem('rm:homeVisto', '1');
    (async () => {
      const r = await carica();
      if (!visto) {
        const ultima = r.find((x) => !x.gameOver);
        if (ultima) navigate(`/partita/${ultima.id}`, { replace: true });
      }
    })();
  }, []);

  // Backup cloud facoltativo: scrive l'export nell'entità Partita (campo stato).
  const salvaCloud = async () => {
    setCloudMsg(''); setCloudBusy(true);
    try {
      const payload = JSON.parse(await gioco.esporta());
      const rec = await base44.entities.Partita.filter({ nome: '__cloud_backup__' });
      if (rec.length) await base44.entities.Partita.update(rec[0].id, { stato: payload });
      else await base44.entities.Partita.create({ nome: '__cloud_backup__', stato: payload });
      setCloudMsg('Backup sul cloud OK');
    } catch (e) {
      setCloudMsg('Errore backup: ' + (e?.message ?? ''));
    } finally {
      setCloudBusy(false);
    }
  };

  const ripristinaCloud = async () => {
    setCloudMsg(''); setCloudBusy(true);
    try {
      const rec = await base44.entities.Partita.filter({ nome: '__cloud_backup__' });
      if (!rec.length) { setCloudMsg('Nessun backup trovato'); return; }
      const res = await gioco.importa(JSON.stringify(rec[0].stato));
      await carica();
      setCloudMsg(`Ripristinate ${res.importate} partite${res.errori ? ` (${res.errori} errori)` : ''}`);
    } catch (e) {
      setCloudMsg('Errore ripristino: ' + (e?.message ?? ''));
    } finally {
      setCloudBusy(false);
    }
  };

  const elimina = async (id) => {
    try {
      await eliminaPartita(id);
      setRighe((p) => (p ?? []).filter((x) => x.id !== id));
    } catch (e) {
      setErrore(e?.message ?? 'Errore eliminazione');
    }
  };

  return (
    <div className="min-h-screen px-3 py-4 max-w-3xl mx-auto">
      <header className="rm-wood rm-no-radius rm-shadow p-3 mb-4">
        <div className="flex items-center gap-3">
          <Icon name="chef" size={28} color="#f2e5bc" />
          <div>
            <h1 className="rm-pixel text-[16px] text-rm-cream leading-none text-balance">RISTORANTE MANAGER</h1>
            <p className="rm-text text-[16px] text-rm-cream/70 leading-none mt-1 text-pretty">Simulatore gestionale di una trattoria italiana</p>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between mb-2">
        <h2 className="rm-pixel text-[12px] text-rm-cream text-balance">LE TUE PARTITE</h2>
        <PixelButton variant="green" className="text-[10px] py-2 rm-tap" onClick={() => navigate('/nuova')}>+ Nuova partita</PixelButton>
      </div>

      {errore && <div className="rm-card-dark rm-no-radius p-2 mb-3 text-rm-red rm-text text-[16px]">{errore}</div>}

      {righe === null ? (
        <div className="rm-card-dark rm-no-radius p-4 rm-text text-[18px] text-rm-cream/60">Caricamento…</div>
      ) : righe.length === 0 ? (
        <div className="rm-card-dark rm-no-radius p-6 text-center rm-text text-[18px] text-rm-cream/70">
          Nessuna partita. Crea la tua prima trattoria!
        </div>
      ) : (
        <div className="space-y-3">
          {righe.map((p) => (
            <div key={p.id} className="rm-card rm-no-radius rm-shadow p-3">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => navigate(`/partita/${p.id}`)} aria-label={`Riprendi ${p.nome}`} className="text-left flex-1 min-w-0">
                  <div className="rm-pixel text-[13px] text-rm-bg truncate">{p.nome || 'Ristorante'}</div>
                  <div className="rm-text text-[15px] text-rm-wood-dark mt-1">{nomeMese(p.mese)} A{p.annoGioco}</div>
                </button>
                {p.gameOver && <Chip color="bg-rm-red">FINITA</Chip>}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <div className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Cassa</div>
                  <div className={`rm-pixel text-[12px] ${p.cassa < 0 ? 'text-rm-red' : 'text-rm-bg'}`}>{money(p.cassa)}</div>
                </div>
                <div>
                  <div className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Reputazione</div>
                  <StarRating reputazione={p.reputazione ?? 0} size={14} />
                </div>
              </div>

              <div className="rm-text text-[14px] text-rm-wood-dark mt-2">Ultimo gioco: {dataUltimo(p.aggiornatoIl)}</div>

              <div className="flex gap-2 mt-2 border-t-2 border-rm-wood-dark/40 pt-2">
                <PixelButton variant="blue" className="text-[9px] py-2 rm-tap flex-1" onClick={() => navigate(`/partita/${p.id}`)}>Riprendi</PixelButton>
                <PixelButton variant="wood" className="text-[9px] py-2 rm-tap" aria-label={`Elimina ${p.nome}`} onClick={() => { if (confirm('Eliminare questa partita?')) elimina(p.id); }}>Elimina</PixelButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rm-card-dark rm-no-radius p-3 mt-4">
        <div className="rm-pixel text-[10px] text-rm-cream mb-2">BACKUP CLOUD (opzionale)</div>
        <div className="flex gap-2 flex-wrap">
          <PixelButton variant="blue" className="text-[9px] py-2 rm-tap" disabled={cloudBusy} onClick={salvaCloud}>Salva sul cloud</PixelButton>
          <PixelButton variant="wood" className="text-[9px] py-2 rm-tap" disabled={cloudBusy} onClick={() => { if (confirm('Sovrascrivi le partite locali con il backup cloud?')) ripristinaCloud(); }}>Ripristina</PixelButton>
        </div>
        {cloudMsg && <div className="rm-text text-[15px] text-rm-gold mt-2">{cloudMsg}</div>}
      </div>
    </div>
  );
}