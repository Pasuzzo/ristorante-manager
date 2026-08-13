import React, { useState } from 'react';
import { PixelPanel, PixelButton, Chip } from '@/components/game/ui';
import { money, nomeMese } from '@/lib/partita';

const ENTE_LABEL = { stato: 'Stato', regione: 'Regione', ue: 'Unione Europea', camera_commercio: 'Camera di Commercio', comune: 'Comune' };
const TIPO_LABEL = {
  fondo_perduto: 'Fondo perduto', credito_imposta: "Credito d'imposta",
  finanziamento_agevolato: 'Finanziamento agevolato', garanzia: 'Garanzia',
  sgravio_contributivo: 'Sgravio contributivo', misto: 'Misto',
};
const STATO_LABEL = { in_istruttoria: 'In istruttoria', accolta: 'Accolta', respinta: 'Respinta', erogazione: 'In erogazione' };
const STATO_BG = { erogazione: '#5a8c46', accolta: '#5a8c46', respinta: '#c8443c', in_istruttoria: '#e8b84b' };

function DomandaCard({ d }) {
  return (
    <div className="rm-card-dark rm-no-radius p-2">
      <div className="flex items-center justify-between">
        <span className="rm-pixel text-[9px] text-rm-cream">{d.titolo}</span>
        <span className="rm-chip" style={{ backgroundColor: STATO_BG[d.stato] }}>{STATO_LABEL[d.stato]}</span>
      </div>
      <div className="rm-text text-[15px] text-rm-cream/80 mt-1">
        Contributo {money(d.contributoRichiesto)} · presentata {nomeMese(d.presentataMese)} A{d.presentataAnno}
      </div>
      {d.stato === 'erogazione' && <div className="rm-text text-[14px] text-rm-green">{d.rateResidue} rate residue · {money(d.importoRata)}/rata</div>}
      {d.motivoRifiuto && <div className="rm-text text-[14px] text-rm-red">{d.motivoRifiuto}</div>}
    </div>
  );
}

function BandoCard({ esito, onPresenta, inAttesa }) {
  const b = esito.bando;
  const ammissibile = esito.ammissibile && !inAttesa;
  const [inv, setInv] = useState(b.requisiti?.investimentoMin ?? 10000);
  return (
    <div className={`rm-card rm-no-radius rm-shadow p-2 ${!esito.ammissibile ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="rm-pixel text-[10px] text-rm-bg">{b.titolo}</div>
          <div className="rm-text text-[14px] text-rm-wood-dark">{ENTE_LABEL[b.ente]} · {TIPO_LABEL[b.tipo]} · max {money(b.importoMax)}</div>
        </div>
        {inAttesa ? <Chip color="bg-rm-blue">In attesa</Chip> : esito.ammissibile ? <Chip color="bg-rm-green">Ammissibile</Chip> : <Chip color="bg-rm-red">Escluso</Chip>}
      </div>
      <div className="rm-text text-[14px] text-rm-bg/80 mt-1">{b.descrizione}</div>
      <div className="rm-text text-[13px] text-rm-wood-dark mt-1">Copertura {Math.round(b.quotaCopertura * 100)}% · istruttoria {b.mesiIstruttoria} mesi · esito stimato {Math.round(b.probAccoglimento * 100)}%</div>
      <div className="rm-pixel text-[9px] text-rm-gold mt-1">Contributo stimato: {money(esito.contributoStimato)}</div>
      {b.requisiti?.investimentoMin !== undefined && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <span className="rm-pixel text-[7px] text-rm-bg uppercase">Investimento previsto</span>
            <span className="rm-pixel text-[9px] text-rm-gold">{money(inv)}</span>
          </div>
          <input type="range" min={b.requisiti.investimentoMin} max={b.importoMax * 2} step={1000} className="rm-input" value={inv} onChange={(e) => setInv(Number(e.target.value))} />
        </div>
      )}
      {esito.motiviEsclusione?.length > 0 && <div className="rm-text text-[13px] text-rm-red mt-1">{esito.motiviEsclusione[0]}</div>}
      <div className="flex items-center justify-between mt-2">
        <span className="rm-text text-[13px] text-rm-bg/60">Consulenza {money(b.costoConsulenza)}</span>
        <PixelButton variant={ammissibile ? 'green' : 'wood'} disabled={!ammissibile} onClick={() => onPresenta(b.id, inv)} className="text-[9px] py-1">Presenta domanda</PixelButton>
      </div>
    </div>
  );
}

/** Sezione Bandi: i bandi aperti arrivano dal server (risposta di avanzaMese). */
export default function Bandi({ stato, decisioni, setDecisioni, bandi }) {
  const mese = stato?.mese ?? 1;
  const domande = stato?.domande ?? [];
  const inAttesa = new Set((decisioni.domande ?? []).map((d) => d.bandoId));
  const disponibili = bandi ?? [];

  const presenta = (bandoId, investimentoPrevisto) => {
    setDecisioni((p) => ({ ...p, domande: [...(p.domande ?? []), { bandoId, investimentoPrevisto }] }));
  };

  return (
    <div className="space-y-3">
      <PixelPanel title="Bandi e agevolazioni" icon="envelope">
        <div className="rm-text text-[15px] text-rm-cream/70">
          {disponibili.length} bandi aperti a {nomeMese(mese)}. Presenti la domanda questo mese; l'esito arriva dopo l'istruttoria e le erogazioni si accumulano in cassa. ⚠️ Catalogo esemplificativo, non è consulenza reale.
        </div>
      </PixelPanel>

      {domande.length > 0 && (
        <PixelPanel title="Le tue domande" icon="envelope">
          <div className="space-y-2">
            {domande.map((d) => <DomandaCard key={d.id} d={d} />)}
          </div>
        </PixelPanel>
      )}

      {disponibili.length === 0 ? (
        <div className="rm-card-dark rm-no-radius p-4 rm-text text-[17px] text-rm-cream/60 text-center">Nessun bando aperto questo mese.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {disponibili.map((e) => (
            <BandoCard key={e.bando.id} esito={e} onPresenta={presenta} inAttesa={inAttesa.has(e.bando.id)} />
          ))}
        </div>
      )}
    </div>
  );
}