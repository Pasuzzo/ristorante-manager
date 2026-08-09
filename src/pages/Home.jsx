import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarRating, PixelButton, Chip } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { listPartite, eliminaPartita, money, nomeMese } from '@/lib/partita';
import { formaLabel, localitaLabel } from '@/lib/gameData';

export default function Home() {
  const navigate = useNavigate();
  const [partite, setPartite] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setPartite(await listPartite()); } catch { setPartite([]); }
    setLoading(false);
  }
  const elimina = async (id) => {
    if (!confirm('Eliminare definitivamente questa partita?')) return;
    await eliminaPartita(id); load();
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-3 py-4">
      <header className="rm-wood rm-no-radius p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="chef" size={28} color="#e8b84b" />
          <div>
            <div className="rm-pixel text-[14px] text-rm-cream leading-tight">RISTORANTE</div>
            <div className="rm-pixel text-[14px] text-rm-gold leading-tight">MANAGER</div>
          </div>
        </div>
        <div className="rm-tovaglia-red border-[3px] border-rm-bg px-2 py-1">
          <span className="rm-pixel text-[8px] text-rm-bg">GESTISCI LA TUA TRATTORIA</span>
        </div>
      </header>

      <PixelButton full className="mb-4 !text-[12px]" onClick={() => navigate('/nuova')}>+ NUOVA PARTITA</PixelButton>

      <h2 className="rm-pixel text-[11px] text-rm-cream/70 mb-2">LE TUE PARTITE</h2>

      {loading ? (
        <div className="rm-pixel text-[11px] text-rm-gold rm-blink">CARICO…</div>
      ) : partite.length === 0 ? (
        <div className="rm-card-dark rm-no-radius p-6 text-center">
          <div className="flex justify-center mb-2"><Icon name="fork" size={40} color="#8c5a3c" /></div>
          <div className="rm-text text-[18px] text-rm-cream/70">Nessuna partita. Costituisci la tua attività e apri.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {partite.map((p) => {
            const s = p.stato || {};
            const rep = s.reputazione ?? 0;
            const cassa = s.tesoreria?.saldo ?? 0;
            return (
              <div key={p.id} className="rm-card rm-no-radius p-2 rm-shadow relative">
                <button className="block w-full text-left" onClick={() => navigate(`/partita/${p.id}`)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="rm-pixel text-[11px] text-rm-bg truncate">{p.nome}</div>
                      <div className="rm-text text-[14px] text-rm-wood-dark leading-tight">
                        {formaLabel(s.ristorante?.forma)} · {localitaLabel(s.locale?.tipoLocalita)} · Anno {s.annoGioco} {nomeMese(s.mese)}
                      </div>
                    </div>
                    {p.game_over && <Chip color="bg-rm-red !text-rm-cream">CHIUSA</Chip>}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <StarRating reputazione={rep} size={16} />
                    <div className={`rm-pixel text-[12px] ${cassa < 0 ? 'text-rm-red' : 'text-rm-green'}`}>{money(cassa)}</div>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); elimina(p.id); }}
                  className="absolute top-1 right-1 rm-pixel text-[7px] bg-rm-bg2 text-rm-cream/70 border-[2px] border-rm-wood-dark px-1 py-[2px]"
                >×</button>
              </div>
            );
          })}
        </div>
      )}

      <p className="rm-text text-[14px] text-rm-cream/40 mt-6 text-center">Un gestionale a turni mensili. Tasse, scadenze e TFR veri. Buona fortuna.</p>
    </div>
  );
}