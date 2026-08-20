import React, { useMemo, useState } from 'react';
import { PixelPanel, PixelButton, Chip, EmptyState } from '@/components/game/ui';
import {
  RICETTE, CATEGORIE, TIPI, ricettaById, categoriaLabel, tipoLabel,
  costoPorzione, foodCostPct, margine,
} from '@/lib/ricette';
import { ruoloLabel } from '@/lib/gameData';

/** Ruoli che il motore conta per la tecnica della brigata (analizzaMenu). */
const RUOLI_TECNICA = new Set(['commis', 'cuoco', 'chef']);
/** Chi in cucina può imparare un piatto. */
const CUCINA = new Set(['commis', 'cuoco', 'chef', 'sous_chef', 'pizzaiolo', 'pasticcere']);

const ORDINI = [
  { value: 'portata', label: 'Portata' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'nome', label: 'Nome' },
  { value: 'difficolta', label: 'Difficoltà' },
  { value: 'prezzo', label: 'Prezzo' },
  { value: 'foodcost', label: 'Food cost' },
  { value: 'popolarita', label: 'Popolarità' },
  { value: 'noti', label: 'Chi lo sa fare' },
];

const ORDINE_CAT = { antipasto: 0, primo: 1, secondo: 2, dolce: 3 };

function pct(x) { return `${Math.round(x * 100)}%`; }
function eur(x) { return `${x.toFixed(2)}€`; }

/** Composizione del menu: scegli i piatti, il prezzo, e guarda chi sa cucinarli. */
export default function MenuPage({ stato, decisioni, setDecisioni }) {
  const menu = decisioni.menu ?? [];
  const inCarta = useMemo(() => new Map(menu.map((r) => [r.id, r])), [menu]);
  const qualita = decisioni.qualitaMaterie ?? 'standard';

  const [vista, setVista] = useState('tutti');   // 'tutti' | 'carta'
  const [filtroCat, setFiltroCat] = useState('tutte');
  const [filtroTipo, setFiltroTipo] = useState('tutti');
  const [ordine, setOrdine] = useState('portata');
  const [insegna, setInsegna] = useState(null);
  const [apri, setApri] = useState(null);        // id dipendente col repertorio aperto

  const staff = stato?.staff ?? [];

  // Tecnica della brigata: stessa regola del motore, così i numeri coincidono
  const tecnicaBrigata = staff
    .filter((d) => RUOLI_TECNICA.has(d.ruolo))
    .reduce((m, d) => Math.max(m, d.attributi?.tecnica ?? 0), 3);

  // Chi sa fare cosa: id ricetta → dipendenti
  const chiSaFare = useMemo(() => {
    const m = new Map();
    for (const d of staff) {
      for (const id of d.repertorio ?? []) {
        if (!m.has(id)) m.set(id, []);
        m.get(id).push(d);
      }
    }
    return m;
  }, [staff]);

  const cuochi = staff.filter((d) => CUCINA.has(d.ruoloEsteso ?? d.ruolo) || (d.repertorio ?? []).length > 0);

  // ── azioni sulla carta
  const aggiungi = (ric) => setDecisioni((p) => {
    const cur = p.menu ?? [];
    if (cur.some((r) => r.id === ric.id)) return p;
    const { tipo, ...pulita } = ric; // il motore vuole solo i campi Ricetta
    return { ...p, menu: [...cur, { ...pulita }] };
  });

  const togli = (id) => setDecisioni((p) => ({ ...p, menu: (p.menu ?? []).filter((r) => r.id !== id) }));

  const toggle = (ric) => (inCarta.has(ric.id) ? togli(ric.id) : aggiungi(ric));

  const setPrezzo = (id, prezzo) => setDecisioni((p) => ({
    ...p,
    menu: (p.menu ?? []).map((r) => (r.id === id ? { ...r, prezzoVendita: Math.max(1, Number(prezzo) || 0) } : r)),
  }));

  const svuota = () => setDecisioni((p) => ({ ...p, menu: [] }));

  const cartaDi = (d) => setDecisioni((p) => {
    const cur = p.menu ?? [];
    const gia = new Set(cur.map((r) => r.id));
    const nuovi = (d.repertorio ?? [])
      .filter((id) => !gia.has(id))
      .map((id) => ricettaById(id))
      .filter(Boolean)
      .map(({ tipo, ...r }) => ({ ...r }));
    return { ...p, menu: [...cur, ...nuovi] };
  });

  const insegnaRicetta = (idRicetta, idDipendente) => {
    setDecisioni((p) => ({ ...p, insegnaRicette: [...(p.insegnaRicette ?? []), { idDipendente, idRicetta }] }));
    setInsegna(null);
  };

  // ── analisi della carta, stessa formula del motore
  const analisi = useMemo(() => {
    if (!menu.length) return null;
    let peso = 0, costo = 0, ricavo = 0, esec = 0, fuori = 0, male = 0;
    for (const r of menu) {
      const base = ricettaById(r.id) ?? r;
      const gap = tecnicaBrigata - r.difficolta;
      if (gap < -2) { fuori += 1; continue; }
      const e = Math.max(0.5, Math.min(1.1, 0.9 + gap * (gap >= 0 ? 0.015 : 0.06)));
      if (e < 0.8) male += 1;
      peso += r.popolarita;
      costo += costoPorzione(base, qualita) * r.popolarita;
      ricavo += (r.prezzoVendita / 1.1) * r.popolarita;
      esec += e * r.popolarita;
    }
    const categorie = new Set(menu.map((r) => r.categoria)).size;
    if (!peso) return { vuoto: true, fuori, categorie };
    return {
      foodCost: costo / ricavo,
      scontrino: (ricavo / peso) * 1.8 * 1.1,
      esecuzione: esec / peso,
      categorie,
      fuori,
      male,
      sconosciuti: menu.filter((r) => !(chiSaFare.get(r.id) ?? []).length).length,
    };
  }, [menu, tecnicaBrigata, qualita, chiSaFare]);

  // ── lista filtrata e ordinata
  const lista = useMemo(() => {
    let out = RICETTE.filter((r) => {
      if (vista === 'carta' && !inCarta.has(r.id)) return false;
      if (filtroCat !== 'tutte' && r.categoria !== filtroCat) return false;
      if (filtroTipo !== 'tutti' && r.tipo !== filtroTipo) return false;
      return true;
    });
    const prezzoDi = (r) => inCarta.get(r.id)?.prezzoVendita ?? r.prezzoVendita;
    const cmp = {
      portata: (a, b) => ORDINE_CAT[a.categoria] - ORDINE_CAT[b.categoria] || a.difficolta - b.difficolta,
      tipo: (a, b) => a.tipo.localeCompare(b.tipo) || ORDINE_CAT[a.categoria] - ORDINE_CAT[b.categoria],
      nome: (a, b) => a.nome.localeCompare(b.nome),
      difficolta: (a, b) => a.difficolta - b.difficolta,
      prezzo: (a, b) => prezzoDi(b) - prezzoDi(a),
      foodcost: (a, b) => foodCostPct(a, prezzoDi(a), qualita) - foodCostPct(b, prezzoDi(b), qualita),
      popolarita: (a, b) => b.popolarita - a.popolarita,
      noti: (a, b) => (chiSaFare.get(b.id)?.length ?? 0) - (chiSaFare.get(a.id)?.length ?? 0) || a.nome.localeCompare(b.nome),
    }[ordine];
    return [...out].sort(cmp);
  }, [vista, filtroCat, filtroTipo, ordine, inCarta, chiSaFare, qualita]);

  return (
    <div className="space-y-3">
      {/* ── Riepilogo della carta */}
      <PixelPanel title={`La carta · ${menu.length} piatti`} icon="fork">
        {analisi && !analisi.vuoto ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="rm-card rm-no-radius p-2 text-center">
              <div className="rm-pixel text-[7px] uppercase text-rm-wood-dark">Food cost</div>
              <div className={`rm-pixel text-[12px] mt-1 ${analisi.foodCost > 0.38 ? 'text-rm-red' : 'text-rm-bg'}`}>{pct(analisi.foodCost)}</div>
            </div>
            <div className="rm-card rm-no-radius p-2 text-center">
              <div className="rm-pixel text-[7px] uppercase text-rm-wood-dark">Scontrino</div>
              <div className="rm-pixel text-[12px] mt-1 text-rm-bg">{Math.round(analisi.scontrino)}€</div>
            </div>
            <div className="rm-card rm-no-radius p-2 text-center">
              <div className="rm-pixel text-[7px] uppercase text-rm-wood-dark">Portate</div>
              <div className={`rm-pixel text-[12px] mt-1 ${analisi.categorie < 3 ? 'text-rm-red' : 'text-rm-bg'}`}>{analisi.categorie}/4</div>
            </div>
          </div>
        ) : (
          <div className="rm-text text-[15px] text-rm-cream/70">
            Carta vuota: il motore userà food cost e scontrino di default. Scegli i piatti qui sotto.
          </div>
        )}

        <div className="rm-text text-[15px] text-rm-cream/70 mt-2">
          Tecnica della brigata <span className="rm-pixel text-[10px] text-rm-gold">{tecnicaBrigata}</span>.
          Sopra questa soglia i piatti escono male; oltre +2 il motore li toglie dalla carta.
        </div>

        {analisi && !analisi.vuoto && (
          <div className="flex flex-wrap gap-1 mt-2">
            {analisi.fuori > 0 && <Chip color="bg-rm-red">{analisi.fuori} oltre la brigata</Chip>}
            {analisi.male > 0 && <Chip color="bg-rm-gold">{analisi.male} escono male</Chip>}
            {analisi.sconosciuti > 0 && <Chip color="bg-rm-gold">{analisi.sconosciuti} che nessuno sa fare</Chip>}
            {analisi.categorie < 4 && <Chip color="bg-rm-gold">manca qualche portata</Chip>}
          </div>
        )}

        {menu.length > 0 && (
          <PixelButton variant="wood" className="text-[9px] py-2 mt-2" onClick={svuota}>Svuota la carta</PixelButton>
        )}
      </PixelPanel>

      {/* ── Il repertorio della brigata */}
      <PixelPanel title="Cosa sa cucinare la brigata" icon="chef">
        {cuochi.length === 0 ? (
          <div className="rm-text text-[15px] text-rm-cream/70">Nessuno in cucina: assumi un cuoco dal Mercato.</div>
        ) : (
          <div className="space-y-2">
            {cuochi.map((d) => {
              const rep = (d.repertorio ?? []).map((id) => ricettaById(id)).filter(Boolean);
              const aperto = apri === d.id;
              return (
                <div key={d.id} className="rm-card rm-no-radius p-2">
                  <button className="w-full text-left" onClick={() => setApri(aperto ? null : d.id)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rm-pixel text-[10px] text-rm-bg truncate">{d.nome}</span>
                      <span className="rm-pixel text-[9px] text-rm-wood-dark">{aperto ? '▾' : '▸'} {rep.length} piatti</span>
                    </div>
                    <div className="rm-text text-[15px] text-rm-wood-dark leading-none mt-1">
                      {ruoloLabel(d.ruoloEsteso ?? d.ruolo)} · tecnica {d.attributi?.tecnica ?? '?'}
                      {d.eta ? ` · ${d.eta} anni` : ''}
                    </div>
                  </button>

                  {aperto && (
                    <div className="mt-2 border-t-2 border-rm-wood-dark/30 pt-2 space-y-1">
                      {rep.length === 0 && (
                        <div className="rm-text text-[15px] text-rm-wood-dark">Non sa ancora nessun piatto della carta.</div>
                      )}
                      {CATEGORIE.map((cat) => {
                        const piatti = rep.filter((r) => r.categoria === cat);
                        if (!piatti.length) return null;
                        return (
                          <div key={cat}>
                            <div className="rm-pixel text-[8px] uppercase text-rm-wood-dark mt-1">{categoriaLabel(cat)}</div>
                            {piatti.map((r) => (
                              <div key={r.id} className="flex items-center justify-between gap-2 py-[2px]">
                                <span className="rm-text text-[15px] text-rm-bg truncate">
                                  {r.nome} <span className="text-rm-wood-dark">· diff. {r.difficolta}</span>
                                </span>
                                {inCarta.has(r.id) ? (
                                  <span className="rm-pixel text-[8px] text-rm-green">IN CARTA</span>
                                ) : (
                                  <button className="rm-pixel text-[8px] text-rm-blue" onClick={() => aggiungi(r)}>+ carta</button>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {rep.length > 0 && (
                        <PixelButton variant="blue" className="text-[9px] py-2 mt-1" onClick={() => cartaDi(d)}>
                          Metti in carta tutto il suo repertorio
                        </PixelButton>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PixelPanel>

      {/* ── Filtri e ordinamento */}
      <PixelPanel title="Piatti disponibili" icon="leaf">
        <div className="flex gap-1 mb-2">
          {[['tutti', 'Tutti i piatti'], ['carta', 'Solo in carta']].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)}
              className={`rm-chip flex-1 text-center ${vista === v ? 'bg-rm-green' : 'bg-rm-bg2'}`}>{l}</button>
          ))}
        </div>

        <div className="rm-pixel text-[8px] uppercase text-rm-cream/70 mb-1">Portata</div>
        <div className="flex flex-wrap gap-1 mb-2">
          <button onClick={() => setFiltroCat('tutte')} className={`rm-chip ${filtroCat === 'tutte' ? 'bg-rm-gold' : 'bg-rm-bg2'}`}>Tutte</button>
          {CATEGORIE.map((c) => (
            <button key={c} onClick={() => setFiltroCat(c)} className={`rm-chip ${filtroCat === c ? 'bg-rm-gold' : 'bg-rm-bg2'}`}>
              {categoriaLabel(c)}
            </button>
          ))}
        </div>

        <div className="rm-pixel text-[8px] uppercase text-rm-cream/70 mb-1">Tipo</div>
        <div className="flex flex-wrap gap-1 mb-2">
          <button onClick={() => setFiltroTipo('tutti')} className={`rm-chip ${filtroTipo === 'tutti' ? 'bg-rm-gold' : 'bg-rm-bg2'}`}>Tutti</button>
          {TIPI.map((t) => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`rm-chip ${filtroTipo === t ? 'bg-rm-gold' : 'bg-rm-bg2'}`}>
              {tipoLabel(t)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="rm-pixel text-[8px] uppercase text-rm-cream/70">Ordina per</span>
          <select className="rm-input py-1 flex-1" value={ordine} onChange={(e) => setOrdine(e.target.value)}>
            {ORDINI.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </PixelPanel>

      {/* ── Lista piatti */}
      {lista.length === 0 ? (
        <EmptyState>Nessun piatto con questi filtri.</EmptyState>
      ) : (
        <div className="space-y-2">
          {lista.map((r) => {
            const voce = inCarta.get(r.id);
            const on = !!voce;
            const prezzo = voce?.prezzoVendita ?? r.prezzoVendita;
            const gap = tecnicaBrigata - r.difficolta;
            const fuoriPortata = gap < -2;
            const esceMale = !fuoriPortata && gap < 0;
            const sanno = chiSaFare.get(r.id) ?? [];
            const fc = foodCostPct(r, prezzo, qualita);
            const pianificato = (decisioni.insegnaRicette ?? []).some((x) => x.idRicetta === r.id);

            return (
              <div key={r.id} className={`rm-card rm-no-radius p-2 ${on ? 'border-l-[6px] border-rm-green' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => toggle(r)} className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rm-pixel text-[10px] text-rm-bg">{on ? '▣' : '▢'}</span>
                      <span className="rm-pixel text-[10px] text-rm-bg truncate">{r.nome}</span>
                    </div>
                    <div className="rm-text text-[15px] text-rm-wood-dark leading-none mt-1">
                      {categoriaLabel(r.categoria)} · {tipoLabel(r.tipo)} · diff. {r.difficolta} · pop. {r.popolarita}
                    </div>
                    <div className="rm-text text-[15px] text-rm-wood-dark leading-none mt-1">
                      materie {eur(costoPorzione(r, qualita))} · food cost <span className={fc > 0.4 ? 'text-rm-red' : ''}>{pct(fc)}</span> · margine {eur(margine(r, prezzo, qualita))}
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {fuoriPortata && <Chip color="bg-rm-red">OLTRE LA BRIGATA</Chip>}
                    {esceMale && <Chip color="bg-rm-gold">esce male</Chip>}
                  </div>
                </div>

                {/* chi lo sa fare */}
                <div className="rm-text text-[15px] mt-1">
                  {sanno.length ? (
                    <span className="text-rm-wood-dark">Lo sanno fare: <span className="text-rm-bg">{sanno.map((d) => d.nome).join(', ')}</span></span>
                  ) : (
                    <span className="text-rm-red">🔒 nessuno in cucina lo sa preparare</span>
                  )}
                </div>

                {on && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="rm-pixel text-[8px] text-rm-wood-dark uppercase">Prezzo</span>
                    <input type="number" min={1} max={80} className="rm-input py-1 w-24" value={prezzo}
                      onChange={(e) => setPrezzo(r.id, e.target.value)} />
                    <span className="rm-text text-[15px] text-rm-wood-dark">€ IVA inclusa</span>
                  </div>
                )}

                {!sanno.length && (
                  <div className="mt-2 border-t-2 border-rm-wood-dark/30 pt-2">
                    {pianificato ? (
                      <div className="rm-chip bg-rm-green w-full text-center">INSEGNAMENTO PIANIFICATO</div>
                    ) : insegna?.idRicetta === r.id ? (
                      <div className="space-y-2">
                        <select className="rm-input py-1" value={insegna.idDipendente}
                          onChange={(e) => setInsegna({ ...insegna, idDipendente: e.target.value })}>
                          <option value="">Chi lo impara…</option>
                          {cuochi.map((d) => (
                            <option key={d.id} value={d.id}>{d.nome} · {ruoloLabel(d.ruoloEsteso ?? d.ruolo)} · tec. {d.attributi?.tecnica ?? '?'}</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <PixelButton variant="green" className="text-[9px] py-2" disabled={!insegna.idDipendente}
                            onClick={() => insegnaRicetta(r.id, insegna.idDipendente)}>Conferma</PixelButton>
                          <PixelButton variant="wood" className="text-[9px] py-2" onClick={() => setInsegna(null)}>Annulla</PixelButton>
                        </div>
                      </div>
                    ) : (
                      <PixelButton variant="blue" className="text-[9px] py-2" disabled={!cuochi.length}
                        onClick={() => setInsegna({ idRicetta: r.id, idDipendente: '' })}>Fallo imparare a…</PixelButton>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {menu.length > 0 && (
        <div className="rm-text text-[15px] text-rm-cream/70 text-center">
          La carta entra in vigore al prossimo «Avanza mese».
        </div>
      )}
    </div>
  );
}