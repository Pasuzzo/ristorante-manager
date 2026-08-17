import React, { useState } from 'react';
import { PixelPanel, PixelButton, Chip } from '@/components/game/ui';
import { RICETTE, CATEGORIE, categoriaLabel } from '@/lib/ricette';
import { ruoloLabel } from '@/lib/gameData';
import { money } from '@/lib/partita';

const CUCINA = new Set(['cuoco', 'chef', 'sous_chef', 'commis', 'pizzaiolo', 'pasticcere']);

/** Composizione del menu: scegli i piatti e il prezzo di vendita. */
export default function MenuPage({ stato, decisioni, setDecisioni }) {
  const menu = decisioni.menu ?? [];
  const selezionati = new Set(menu.map((r) => r.id));
  const [insegna, setInsegna] = useState(null);

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

  // repertorio della brigata: i piatti che qualcuno in cucina sa davvero fare
  const saFare = new Set();
  for (const d of stato?.staff ?? []) for (const id of d.repertorio ?? []) saFare.add(id);

  const cuochi = (stato?.staff ?? []).filter((d) => CUCINA.has(d.ruoloEsteso ?? d.ruolo));

  const insegnaRicetta = (idRicetta, idDipendente) => {
    setDecisioni((p) => ({ ...p, insegnaRicette: [...(p.insegnaRicette ?? []), { idDipendente, idRicetta }] }));
    setInsegna(null);
  };

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
                const noto = saFare.has(r.id);
                return (
                  <div key={r.id} className={`rm-card rm-no-radius p-2 ${noto ? '' : 'opacity-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => eseguibile && toggle(r)} className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rm-pixel text-[10px] text-rm-bg">{on ? '▣' : '▢'}</span>
                          <span className="rm-pixel text-[10px] text-rm-bg truncate">{r.nome}</span>
                        </div>
                        <div className="rm-text text-[15px] text-rm-wood-dark leading-none mt-1">
                          diff. {r.difficolta} · pop. {r.popolarita} · {r.ingredienti.length} ingr.
                        </div>
                        {!noto && (
                          <div className="rm-pixel text-[8px] text-rm-red mt-1">🔒 nessuno in cucina lo sa preparare</div>
                        )}
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

                    {!noto && (
                      <div className="mt-2 border-t-2 border-rm-wood-dark/30 pt-2">
                        {(decisioni.insegnaRicette ?? []).some((x) => x.idRicetta === r.id) ? (
                          <div className="rm-chip bg-rm-green w-full text-center">INSEGNAMENTO PIANIFICATO</div>
                        ) : insegna?.idRicetta === r.id ? (
                          <div className="space-y-2">
                            <select
                              className="rm-input py-1"
                              value={insegna.idDipendente}
                              onChange={(e) => setInsegna({ ...insegna, idDipendente: e.target.value })}
                            >
                              <option value="">Scegli cuoco…</option>
                              {cuochi.map((d) => (
                                <option key={d.id} value={d.id}>{d.nome} · {ruoloLabel(d.ruoloEsteso ?? d.ruolo)}</option>
                              ))}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <PixelButton variant="green" className="text-[9px] py-2" disabled={!insegna.idDipendente} onClick={() => insegnaRicetta(r.id, insegna.idDipendente)}>Conferma</PixelButton>
                              <PixelButton variant="wood" className="text-[9px] py-2" onClick={() => setInsegna(null)}>Annulla</PixelButton>
                            </div>
                          </div>
                        ) : (
                          <PixelButton variant="blue" className="text-[9px] py-2" onClick={() => setInsegna({ idRicetta: r.id, idDipendente: '' })}>Insegna a…</PixelButton>
                        )}
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