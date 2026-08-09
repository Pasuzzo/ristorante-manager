import React from 'react';
import { PixelPanel, PixelButton, Chip } from '@/components/game/ui';
import { RICETTE, CATEGORIE, categoriaLabel } from '@/lib/ricette';
import { money } from '@/lib/partita';

/** Composizione del menu: scegli i piatti e il prezzo di vendita. */
export default function MenuPage({ stato, decisioni, setDecisioni }) {
  const menu = decisioni.menu ?? [];
  const selezionati = new Set(menu.map((r) => r.id));

  const toggle = (ric) => {
    setDecisioni((p) => {
      const cur = p.menu ?? [];
      if (selezionati.has(ric.id)) return { ...p, menu: cur.filter((r) => r.id !== ric.id) };
      return { ...p, menu: [...cur, { ...ric }] };
    });
  };

  const setPrezzo = (id, prezzo) => {
    setDecisioni((p) => ({
      ...p,
      menu: (p.menu ?? []).map((r) => (r.id === id ? { ...r, prezzoVendita: Number(prezzo) } : r)),
    }));
  };

  const tecnicaBrigata = (stato?.staff ?? []).filter((d) => ['commis', 'cuoco', 'chef'].includes(d.ruolo))
    .reduce((m, d) => Math.max(m, d.attributi?.tecnica ?? 0), 3);

  return (
    <div className="space-y-3">
      <PixelPanel title={`Menu (${menu.length} piatti)`} icon="fork">
        <div className="rm-text text-[15px] text-rm-cream/70">
          La brigata ha tecnica max <span className="rm-pixel text-[10px] text-rm-gold">{tecnicaBrigata}</span>.
          Piatti con difficoltà sopra la tecnica escono male o vengono esclusi. Varia le categorie per non perdere clienti.
        </div>
      </PixelPanel>

      {CATEGORIE.map((cat) => {
        const piatti = RICETTE.filter((r) => r.categoria === cat);
        if (!piatti.length) return null;
        return (
          <PixelPanel key={cat} title={categoriaLabel(cat)} icon="leaf">
            <div className="space-y-2">
              {piatti.map((r) => {
                const on = selezionati.has(r.id);
                const gap = tecnicaBrigata - r.difficolta;
                const eseguibile = gap >= -2;
                const avviso = !eseguibile ? 'OLTRE LA BRIGATA' : gap < 0 ? 'esce male' : '';
                const prezzo = menu.find((m) => m.id === r.id)?.prezzoVendita ?? r.prezzoVendita;
                return (
                  <div key={r.id} className="rm-card rm-no-radius p-2">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => eseguibile && toggle(r)} className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rm-pixel text-[10px] text-rm-bg">{on ? '▣' : '▢'}</span>
                          <span className="rm-pixel text-[10px] text-rm-bg truncate">{r.nome}</span>
                        </div>
                        <div className="rm-text text-[15px] text-rm-wood-dark leading-none mt-1">
                          diff. {r.difficolta} · pop. {r.popolarita} · {r.ingredienti.length} ingr.
                        </div>
                      </button>
                      {avviso && <Chip color={eseguibile ? 'bg-rm-gold' : 'bg-rm-red'}>{avviso}</Chip>}
                    </div>
                    {on && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Prezzo</span>
                        <input type="number" min={1} max={60} className="rm-input py-1 w-24" value={prezzo} onChange={(e) => setPrezzo(r.id, e.target.value)} />
                        <span className="rm-text text-[15px] text-rm-wood-dark">€ IVA inclusa</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </PixelPanel>
        );
      })}

      {menu.length > 0 && (
        <div className="rm-text text-[15px] text-rm-cream/70 text-center">
          Il menu entra in vigore al prossimo «Avanza mese».
        </div>
      )}
    </div>
  );
}