import React from 'react';
import { PixelPanel, Stat } from '@/components/game/ui';
import { lordoMensile } from '@/lib/gameData';
import { money, nomeMese } from '@/lib/partita';

function Riga({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between border-b border-rm-wood-dark/30 py-1">
      <span className="rm-text text-[17px] text-rm-cream/80">{label}</span>
      <span className={`rm-pixel text-[10px] ${accent ?? 'text-rm-cream'}`}>{value}</span>
    </div>
  );
}

/** Bilancio: tesoreria con scadenze, conto economico di competenza, costi. */
export default function Bilancio({ stato, partita }) {
  const tes = stato?.tesoreria ?? {};
  const fis = stato?.fiscale ?? { ricavi: 0, costiDeducibili: 0 };
  const rist = stato?.ristorante ?? {};
  const staff = stato?.staff ?? [];
  const mese = stato?.mese ?? 1;
  const doppia = mese === 7 || mese === 12;
  const costoStaff = staff.reduce((s, d) => s + lordoMensile(d.ruolo, d.superminimo) * (doppia ? 2 : 1), 0);
  const report = partita?.ultimo_report;
  const utile = (fis.ricavi ?? 0) - (fis.costiDeducibili ?? 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="Cassa" value={money(tes.saldo ?? 0)} icon="coin" accent={(tes.saldo ?? 0) < 0 ? 'text-rm-red' : ''} />
        <Stat label="Fido bancario" value={money(tes.fidoMax ?? 0)} icon="chart" />
        <Stat label="TFR maturato" value={money(tes.tfrMaturato ?? 0)} icon="envelope" />
      </div>

      <PixelPanel title="Tesoreria e scadenze" icon="stamp">
        <Riga label="IVA trimestre in sospeso" value={money(tes.ivaTrimestre ?? 0)} />
        <Riga label="Debiti fornitori (30gg)" value={money(tes.debitiFornitori ?? 0)} accent="text-rm-red" />
        <Riga label="F24 dipendenti (16 mese)" value={money(tes.f24MeseSuccessivo ?? 0)} accent="text-rm-red" />
        <Riga label="Saldo imposte a giugno" value={money(tes.saldoImposte ?? 0)} accent="text-rm-red" />
        <Riga label="Acconti imposte (base)" value={money(tes.baseAcconti ?? 0)} />
        <Riga label="Saldo contributi titolare" value={money(tes.saldoContributi ?? 0)} accent="text-rm-red" />
        {tes.insolvente && <div className="rm-chip bg-rm-red w-full text-center mt-2">INSOLVENZA — fido sforato</div>}
      </PixelPanel>

      <PixelPanel title="Conto economico (anno in corso)" icon="chart">
        <Riga label="Ricavi accumulati (competenza)" value={money(fis.ricavi ?? 0)} accent="text-rm-green" />
        <Riga label="Costi deducibili accumulati" value={money(fis.costiDeducibili ?? 0)} accent="text-rm-red" />
        <Riga label="Utile ante imposte (provvisorio)" value={money(utile)} accent={utile < 0 ? 'text-rm-red' : 'text-rm-gold'} />
      </PixelPanel>

      <PixelPanel title="Costi del mese" icon="coin">
        <Riga label={`Stipendi brigata${doppia ? ' (×2 tred/quattord)' : ''}`} value={money(costoStaff)} accent="text-rm-red" />
        <Riga label="Costi fissi (affitto, utenze, mkt)" value={money(rist.costiFissiMensili ?? 0)} accent="text-rm-red" />
        <Riga label="Food cost % (su ricavi)" value={`${Math.round((rist.foodCostPct ?? 0) * 100)}%`} />
      </PixelPanel>

      {report && (
        <PixelPanel title={`Ultimo turno · ${nomeMese(report.mese)}`} icon="envelope">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Stat label="Coperti serviti" value={report.copertiServiti} icon="fork" />
            <Stat label="Ricavi lordi" value={money(report.ricaviLordi)} icon="coin" accent="text-rm-green" />
          </div>
          {report.chiusuraAnno && (
            <div className="rm-card-dark rm-no-radius p-2 mt-2">
              <div className="rm-pixel text-[9px] text-rm-gold mb-1">CHIUSURA D'ANNO</div>
              {report.chiusuraAnno.map((r, i) => <div key={i} className="rm-text text-[16px] text-rm-cream leading-snug">{r}</div>)}
            </div>
          )}
        </PixelPanel>
      )}
    </div>
  );
}