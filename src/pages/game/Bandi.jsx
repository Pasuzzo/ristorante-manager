import React from 'react';
import { PixelPanel, PixelButton, Chip } from '@/components/game/ui';
import { money, nomeMese } from '@/lib/partita';

const ENTE_LABEL = {
  stato: 'Stato', regione: 'Regione', ue: 'Unione Europea',
  camera_commercio: 'Camera di Commercio', comune: 'Comune',
};
const ENTE_FLAG = {
  stato: '🇮🇹', regione: '🏛️', ue: '🇪🇺', camera_commercio: '🏛️', comune: '🏙️',
};
const ENTE_ORDER = ['ue', 'stato', 'regione', 'camera_commercio', 'comune'];
const STATO_LABEL = {
  in_istruttoria: 'In istruttoria', accolta: 'Accolta',
  respinta: 'Respinta', erogazione: 'In erogazione',
};
const STATO_BG = {
  erogazione: '#5a8c46', accolta: '#5a8c46',
  respinta: '#c8443c', in_istruttoria: '#e8b84b',
};

function PraticaCard({ d }) {
  return (
    <div className="rm-card-dark rm-no-radius p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="rm-pixel text-[9px] text-rm-cream truncate">{d.titolo}</span>
        <span className="rm-chip" style={{ backgroundColor: STATO_BG[d.stato] ?? '#5a3825' }}>
          {STATO_LABEL[d.stato] ?? d.stato}
        </span>
      </div>
      <div className="rm-text text-[15px] text-rm-cream/80 mt-1">
        Contributo {money(d.contributoRichiesto)}
      </div>
      {d.stato === 'erogazione' && (
        <div className="rm-text text-[14px] text-rm-green">
          {d.rateResidue} rate residue · {money(d.importoRata)}/rata
        </div>
      )}
      {d.motivoRifiuto && (
        <div className="rm-text text-[14px] text-rm-red">{d.motivoRifiuto}</div>
      )}
    </div>
  );
}

function BandoCard({ b, inAttesa, durcBlocco, onPresenta }) {
  const ammissibile = b.ammissibile && !inAttesa && !durcBlocco;
  return (
    <div
      className={`rm-card rm-no-radius rm-shadow p-2 ${
        b.ammissibile ? '' : 'opacity-70'
      }`}
      style={!b.ammissibile ? { backgroundColor: '#a89a7a' } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="rm-pixel text-[10px] text-rm-bg">{b.titolo}</div>
          <div className="rm-text text-[14px] text-rm-wood-dark mt-[2px]">
            {ENTE_FLAG[b.ente] ?? '🏛️'} {ENTE_LABEL[b.ente] ?? b.ente}
          </div>
        </div>
        {inAttesa ? (
          <Chip color="bg-rm-blue">In attesa</Chip>
        ) : b.ammissibile ? (
          <Chip color="bg-rm-green">Ammissibile</Chip>
        ) : (
          <Chip color="bg-rm-red">Escluso</Chip>
        )}
      </div>

      {b.ammissibile ? (
        <>
          <div className="rm-pixel text-[10px] text-rm-gold mt-2">
            Contributo stimato: {money(b.contributoStimato)}
          </div>
          <div className="rm-text text-[13px] text-rm-bg/70 mt-1">
            Consulenza {money(b.costoConsulenza)} — esce dalla cassa subito,
            l'esito arriva dopo l'istruttoria.
          </div>
        </>
      ) : (
        <div className="mt-2 space-y-[2px]">
          {b.motiviEsclusione?.map((m, i) => (
            <div key={i} className="rm-text text-[13px] text-rm-red">✗ {m}</div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-2">
        <PixelButton
          variant={ammissibile ? 'green' : 'wood'}
          disabled={!ammissibile}
          onClick={() => onPresenta(b.id)}
          className="text-[9px] py-1"
        >
          Presenta domanda
        </PixelButton>
      </div>
    </div>
  );
}

export default function Bandi({ report, decisioni, setDecisioni }) {
  const bandi = report?.bandi ?? [];
  const domande = report?.domandeBandi ?? [];
  const durc = !!report?.durcIrregolare;
  const investimento = decisioni?.investimentoDichiarato ?? 0;
  const giaDomanda = new Set(decisioni?.domandeBandi ?? []);

  const setInvestimento = (v) =>
    setDecisioni((p) => ({ ...p, investimentoDichiarato: Math.max(0, v) }));

  const presenta = (id) =>
    setDecisioni((p) => ({
      ...p,
      domandeBandi: [...(p.domandeBandi ?? []), id],
    }));

  // raggruppa per ente nell'ordine ENTE_ORDER
  const gruppi = ENTE_ORDER
    .map((ente) => ({
      ente,
      items: bandi.filter((b) => b.ente === ente),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      {durc && (
        <div className="rm-card-dark rm-no-radius p-2 border-[3px] border-rm-red">
          <div className="rm-pixel text-[10px] text-rm-red">📄 DURC IRREGOLARE</div>
          <div className="rm-text text-[15px] text-rm-cream/80 mt-1">
            Con il DURC irregolare non puoi presentare domande di bando né
            accedere a sgravi. Rientra nei versamenti contributivi per sbloccarlo.
          </div>
        </div>
      )}

      <PixelPanel title="Bandi e agevolazioni" icon="envelope">
        <div className="rm-text text-[15px] text-rm-cream/70">
          {bandi.length} bandi aperti. Il contributo stimato si calcola
          sull'investimento che dichiari. ⚠️ Catalogo esemplificativo,
          non è consulenza reale.
        </div>

        <div className="mt-2 rm-card rm-no-radius p-2">
          <div className="flex items-center justify-between">
            <span className="rm-pixel text-[8px] text-rm-bg uppercase">
              Investimento previsto
            </span>
            <span className="rm-pixel text-[11px] text-rm-gold">{money(investimento)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={150000}
            step={1000}
            value={investimento}
            onChange={(e) => setInvestimento(Number(e.target.value))}
            className="w-full mt-1"
          />
          <div className="rm-text text-[13px] text-rm-bg/60 mt-[2px]">
            Più alto è l'investimento documentato, più contributo puoi
            ottenere — ma solo la spesa con fattura conta.
          </div>
        </div>
      </PixelPanel>

      {domande.length > 0 && (
        <PixelPanel title="Le tue pratiche" icon="envelope">
          <div className="space-y-2">
            {domande.map((d, i) => (
              <PraticaCard key={d.id ?? i} d={d} />
            ))}
          </div>
        </PixelPanel>
      )}

      {bandi.length === 0 ? (
        <div className="rm-card-dark rm-no-radius p-4 rm-text text-[17px] text-rm-cream/60 text-center">
          Nessun bando aperto questo mese.
        </div>
      ) : (
        <div className="space-y-3">
          {gruppi.map((g) => (
            <div key={g.ente}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 16 }}>{ENTE_FLAG[g.ente] ?? '🏛️'}</span>
                <span className="rm-pixel text-[10px] text-rm-gold">
                  {ENTE_LABEL[g.ente] ?? g.ente}
                </span>
                <div className="flex-1 border-b-[3px] border-rm-wood-dark" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {g.items.map((b) => (
                  <BandoCard
                    key={b.id}
                    b={b}
                    inAttesa={giaDomanda.has(b.id)}
                    durcBlocco={durc}
                    onPresenta={presenta}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}