import React, { useState } from 'react';
import { PixelPanel } from '@/components/game/ui';
import CandidatoCard from '@/components/game/CandidatoCard';
import OfferModal from '@/components/game/OfferModal';
import RispostaOverlay from '@/components/game/wizard/RispostaOverlay';
import { RUOLI_ESTESI, CONTRATTI, lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';
import { verificaBrigata } from '@/lib/costituzione';

const REPARTO = {
  lavapiatti: 'cucina', commis: 'cucina', cuoco: 'cucina', sous_chef: 'cucina',
  chef: 'cucina', pizzaiolo: 'cucina', pasticcere: 'cucina',
  runner: 'sala', cameriere: 'sala', chef_de_rang: 'sala', barista: 'sala',
  maitre: 'sala', sommelier: 'sala', direttore: 'sala',
};
const CUCINA_ORDER = ['chef', 'sous_chef', 'cuoco', 'pizzaiolo', 'pasticcere', 'commis', 'lavapiatti'];
const SALA_ORDER = ['direttore', 'maitre', 'sommelier', 'chef_de_rang', 'cameriere', 'runner', 'barista'];

/** Step 7 — La brigata: pool di candidati per mansione, offerte con risposta
 *  IMMEDIATA. Rifiutato? Il candidato sparisce e al suo posto entra un
 *  sostituto della stessa mansione. */
export default function StepBrigata({ data, pool, faiOfferta }) {
  const [filtro, setFiltro] = useState(null);
  const [modale, setModale] = useState(null);   // candidato in fase di offerta
  const [risposta, setRisposta] = useState(null); // { candidato, esito, sostituto }

  const candidati = pool ?? [];
  const brigata = data.assunzioni;

  const visibili = filtro ? candidati.filter((c) => c.ruolo === filtro) : candidati;
  const ruoliPresenti = [...new Set(candidati.map((c) => c.ruolo))];

  const apri = (c) => setModale(c);
  const conferma = (offerta) => {
    const c = modale;
    setModale(null);
    const res = faiOfferta(c, offerta);
    setRisposta({ candidato: c, esito: res.esito, sostituto: res.sostituto });
  };

  const avvisi = verificaBrigata(brigata.map((o) => o.candidato.ruolo));

  const renderSezione = (nome, order) => {
    const grouped = order
      .map((ruolo) => ({ ruolo, cards: visibili.filter((c) => c.ruolo === ruolo) }))
      .filter((g) => g.cards.length > 0);
    if (grouped.length === 0) return null;
    return (
      <PixelPanel title={nome} icon={nome === 'Cucina' ? 'chef' : 'fork'}>
        <div className="space-y-3">
          {grouped.map(({ ruolo, cards }) => (
            <div key={ruolo}>
              <div className="rm-pixel text-[9px] text-rm-gold uppercase mb-1">{RUOLI_ESTESI[ruolo] ?? ruolo} · {cards.length}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cards.map((c) => (
                  <CandidatoCard key={c.id} candidato={c} offerto={false} onOffri={() => apri(c)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PixelPanel>
    );
  };

  return (
    <div className="space-y-3">
      <PixelPanel title="La tua brigata" icon="users">
        {brigata.length === 0 ? (
          <div className="rm-text text-[15px] text-rm-cream/60 py-1">Nessuno ancora. Fai un'offerta ai candidati qui sotto: la risposta è immediata.</div>
        ) : (
          <div className="space-y-2">
            {brigata.map(({ candidato: c, offerta: o }) => (
              <div key={c.id} className="rm-card rm-no-radius p-2 flex items-center justify-between gap-2">
                <div>
                  <div className="rm-pixel text-[10px] text-rm-bg">{c.nome}</div>
                  <div className="rm-text text-[14px] text-rm-wood-dark">{RUOLI_ESTESI[c.ruolo] ?? c.ruolo}</div>
                </div>
                <div className="text-right">
                  <div className="rm-text text-[14px] text-rm-bg">{money(lordoMensile(c.ruolo, o.superminimo))}/mese</div>
                  <div className="rm-text text-[12px] text-rm-wood-dark/80">{CONTRATTI[o.contratto]}{o.inRegola ? '' : ' · nero'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 space-y-1">
          {avvisi.map((a, i) => (
            <div key={i} className={`rm-text text-[14px] ${a.startsWith('❌') ? 'text-rm-red' : a.startsWith('⚠') ? 'text-rm-gold' : 'text-rm-green'}`}>{a}</div>
          ))}
        </div>
      </PixelPanel>

      <PixelPanel title="Candidati disponibili" icon="chef">
        <div className="rm-text text-[14px] text-rm-cream/70 mb-2">
          Il mercato ha una persona per ogni mansione. Rifiutata un'offerta, il candidato sparisce e ne arriva subito un altro per lo stesso posto: resta scoperto chi, non cosa serve.
        </div>
        <div className="mb-2">
          <label className="rm-pixel text-[8px] text-rm-cream uppercase">Filtra per mansione</label>
          <select className="rm-input" value={filtro ?? ''} onChange={(e) => setFiltro(e.target.value || null)}>
            <option value="">Tutte le mansioni ({candidati.length})</option>
            {[...CUCINA_ORDER, ...SALA_ORDER].filter((r) => ruoliPresenti.includes(r)).map((r) => (
              <option key={r} value={r}>{RUOLI_ESTESI[r] ?? r} — {REPARTO[r]}</option>
            ))}
          </select>
        </div>
      </PixelPanel>

      {renderSezione('Cucina', CUCINA_ORDER)}
      {renderSezione('Sala', SALA_ORDER)}

      {modale && <OfferModal candidato={modale} onConferma={conferma} onAnnulla={() => setModale(null)} />}
      {risposta && (
        <RispostaOverlay
          candidato={risposta.candidato}
          esito={risposta.esito}
          sostituto={risposta.sostituto}
          onChiudi={() => setRisposta(null)}
        />
      )}
    </div>
  );
}