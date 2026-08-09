import React, { useState } from 'react';
import { PixelPanel, SectionTitle, SegmentedBar, PixelButton } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { RICETTE, CATEGORIE } from '@/lib/ricette';
import { money, nomeMese } from '@/lib/partita';

const CUCINA = new Set(['commis', 'cuoco', 'chef']);

function tecnicaBrigata(staff) {
  const cuochi = staff.filter((d) => CUCINA.has(d.ruolo));
  if (!cuochi.length) return 3;
  return Math.max(...cuochi.map((d) => d.attributi.tecnica));
}

export default function Menu({ stato, report, menu, setMenu }) {
  const [picker, setPicker] = useState(false);
  const tecnica = tecnicaBrigata(stato.staff);
  const ids = new Set(menu.map((r) => r.id));

  const setPrezzo = (id, prezzo) => setMenu(menu.map((r) => (r.id === id ? { ...r, prezzoVendita: prezzo } : r)));
  const aggiungi = (r) => { if (!ids.has(r.id)) setMenu([...menu, { ...r }]); };
  const rimuovi = (id) => setMenu(menu.filter((r) => r.id !== id));

  const avvisi = (report?.eventi || []).filter((e) => /^[❌⚠️💸📋⛔]/.test(e));

  return (
    <div className="space-y-3">
      <PixelPanel title="BRIGATA DI CUCINA" icon="chef">
        <div className="flex items-center gap-3">
          <div>
            <div className="rm-pixel text-[8px] text-rm-cream">TECNICA MASSIMA</div>
            <div className="rm-pixel text-[18px] text-rm-gold">{tecnica}/20</div>
          </div>
          <SegmentedBar value={tecnica} max={20} segments={10} size={10} color="#e8b84b" />
          <div className="rm-text text-[15px] text-rm-cream/60">Scala difficoltà piatti: 1–20</div>
        </div>
      </PixelPanel>

      <div>
        <SectionTitle icon="fork">Il tuo menu ({menu.length})</SectionTitle>
        {menu.length === 0 ? (
          <div className="rm-card-dark rm-no-radius p-3 rm-text text-[16px] text-rm-cream/60">
            Menu vuoto. La cassa usa i valori di default. Componi un menu per giocarlo davvero.
          </div>
        ) : (
          <div className="space-y-2">
            {menu.map((r) => {
              const gap = tecnica - r.difficolta;
              const stato_ = gap >= 0 ? { c: '#5a8c46', t: 'alla portata' } : gap >= -2 ? { c: '#e8b84b', t: 'al limite' } : { c: '#c8443c', t: 'fuori portata' };
              return (
                <div key={r.id} className="rm-card rm-no-radius p-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="rm-pixel text-[10px] text-rm-bg">{r.nome}</div>
                      <div className="rm-text text-[14px] text-rm-wood-dark">{r.categoria} · pop. {r.popolarita}</div>
                    </div>
                    <button className="rm-pixel text-[7px] bg-rm-red text-rm-cream px-1 border-[2px] border-rm-wood-dark" onClick={() => rimuovi(r.id)}>×</button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rm-pixel text-[7px] text-rm-wood-dark w-7">DIFF</span>
                    <SegmentedBar value={r.difficolta} max={20} segments={10} size={7} color={stato_.c} />
                    <span className="rm-pixel text-[7px] w-4 text-right" style={{ color: stato_.c }}>{r.difficolta}</span>
                  </div>
                  <div className="rm-text text-[14px] mt-1" style={{ color: stato_.c }}>● {stato_.t}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="rm-pixel text-[7px] text-rm-wood-dark">PREZZO</span>
                    <input type="range" min={4} max={30} step={1} value={r.prezzoVendita} onChange={(e) => setPrezzo(r.id, Number(e.target.value))} className="flex-1" />
                    <span className="rm-pixel text-[10px] text-rm-green">{money(r.prezzoVendita)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {picker ? (
        <div className="rm-card rm-no-radius p-2">
          <div className="rm-pixel text-[9px] text-rm-wood-dark mb-2">AGGIUNGI AL MENU</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {RICETTE.map((r) => (
              <button key={r.id} disabled={ids.has(r.id)} onClick={() => aggiungi(r)}
                className={`rm-no-radius p-1 text-left border-[2px] border-rm-wood-dark ${ids.has(r.id) ? 'bg-rm-bg2 text-rm-cream/40' : 'bg-rm-wood text-rm-cream'}`}>
                <div className="rm-pixel text-[8px]">{r.nome}</div>
                <div className="rm-text text-[13px]">{r.categoria} · diff. {r.difficolta}</div>
              </button>
            ))}
          </div>
          <PixelButton variant="wood" className="mt-2 !text-[8px]" onClick={() => setPicker(false)}>CHIUDI</PixelButton>
        </div>
      ) : (
        <PixelButton full variant="blue" onClick={() => setPicker(true)}>+ AGGIUNGI PIATTO</PixelButton>
      )}

      {avvisi.length > 0 && (
        <PixelPanel title="AVVISI DEL MENU (ultimo mese)" icon="cal">
          <div className="space-y-1">
            {avvisi.map((a, i) => (
              <div key={i} className="rm-text text-[15px] text-rm-cream/90 border-b border-rm-cream/10 py-[2px] leading-snug">{a}</div>
            ))}
          </div>
        </PixelPanel>
      )}
    </div>
  );
}