import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton, StarRating, Chip } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { listPartite, eliminaPartita, money, nomeMese } from '@/lib/partita';
import { formaLabel, localitaLabel } from '@/lib/gameData';

export default function Home() {
  const [partite, setPartite] = useState(null);
  const [errore, setErrore] = useState('');
  const navigate = useNavigate();

  const carica = async () => {
    try {
      setPartite(await listPartite());
    } catch (e) {
      setErrore(e?.message ?? 'Errore di caricamento');
    }
  };
  useEffect(() => { carica(); }, []);

  const elimina = async (id) => {
    try {
      await eliminaPartita(id);
      setPartite((p) => (p ?? []).filter((x) => x.id !== id));
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

      {partite === null ? (
        <div className="rm-card-dark rm-no-radius p-4 rm-text text-[18px] text-rm-cream/60">Caricamento…</div>
      ) : partite.length === 0 ? (
        <div className="rm-card-dark rm-no-radius p-6 text-center rm-text text-[18px] text-rm-cream/70">
          Nessuna partita. Crea la tua prima trattoria!
        </div>
      ) : (
        <div className="space-y-3">
          {partite.map((p) => {
            const st = p.stato ?? {};
            const saldo = st?.tesoreria?.saldo ?? 0;
            return (
              <div key={p.id} className="rm-card rm-no-radius rm-shadow p-3">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => navigate(`/partita/${p.id}`)} aria-label={`Gioca ${p.nome || st?.ristorante?.nome || 'Ristorante'}`} className="text-left flex-1 min-w-0">
                    <div className="rm-pixel text-[13px] text-rm-bg truncate">{p.nome || st?.ristorante?.nome || 'Ristorante'}</div>
                    <div className="rm-text text-[16px] text-rm-wood-dark leading-tight mt-1">
                      {formaLabel(st?.ristorante?.forma)} · {localitaLabel(st?.locale?.tipoLocalita)}
                    </div>
                  </button>
                  {p.game_over && <Chip color="bg-rm-red">GAME OVER</Chip>}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div>
                    <div className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Cassa</div>
                    <div className={`rm-pixel text-[12px] ${saldo < 0 ? 'text-rm-red' : 'text-rm-bg'}`}>{money(saldo)}</div>
                  </div>
                  <div>
                    <div className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Mese</div>
                    <div className="rm-pixel text-[12px] text-rm-bg">{nomeMese(st?.mese)} A{st?.annoGioco}</div>
                  </div>
                  <div>
                    <div className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Reputazione</div>
                    <StarRating reputazione={st?.reputazione ?? 0} size={14} />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 border-t-2 border-rm-wood-dark/40 pt-2">
                  <span className="rm-text text-[15px] text-rm-wood-dark">{p.turni_giocati} turni giocati</span>
                  <div className="flex gap-2">
                    <PixelButton variant="blue" className="text-[9px] py-2 rm-tap" onClick={() => navigate(`/partita/${p.id}`)}>Gioca</PixelButton>
                    <PixelButton variant="wood" className="text-[9px] py-2 rm-tap" aria-label={`Elimina partita ${p.nome}`} onClick={() => { if (confirm('Eliminare questa partita?')) elimina(p.id); }}>Elimina</PixelButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}