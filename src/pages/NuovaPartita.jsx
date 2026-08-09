import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import StepIndicator from '@/components/game/wizard/StepIndicator';
import StepLocale from '@/components/game/wizard/StepLocale';
import StepForma from '@/components/game/wizard/StepForma';
import StepBudget from '@/components/game/wizard/StepBudget';
import { creaPartita, money } from '@/lib/partita';
import { formaLabel, localitaLabel } from '@/lib/gameData';

const defaultData = {
  nomeRistorante: '',
  tipoLocalita: 'riviera',
  postiASedere: 55,
  forma: 'ditta_ordinaria',
  budgetIniziale: 45000,
  costiFissiMensili: 2600,
  staffIniziale: [],
};

function Riepilogo({ data }) {
  return (
    <div className="rm-card rm-no-radius p-3 space-y-2">
      <div className="rm-pixel text-[12px] text-rm-bg">{data.nomeRistorante || 'Senza nome'}</div>
      <div className="rm-text text-[17px] text-rm-wood-dark">
        <div>📍 {localitaLabel(data.tipoLocalita)} · {data.postiASedere} posti</div>
        <div>⚖️ {formaLabel(data.forma)}</div>
        <div>💰 Budget {money(data.budgetIniziale)} · Costi fissi {money(data.costiFissiMensili)}/mese</div>
        <div>👥 Brigata: {data.staffIniziale.length} dipendenti</div>
      </div>
      <div className="rm-text text-[15px] text-rm-wood-dark/80 mt-2">
        Dai inizio al primo mese di attività. Le decisioni mensiali le prendi dentro la partita.
      </div>
    </div>
  );
}

export default function NuovaPartita() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(defaultData);
  const [errore, setErrore] = useState('');
  const [inVolo, setInVolo] = useState(false);
  const navigate = useNavigate();

  const avanti = () => setStep((s) => Math.min(3, s + 1));
  const indietro = () => setStep((s) => Math.max(0, s - 1));

  const puòAvanti = () => {
    if (step === 0) return (data.nomeRistorante || '').trim().length > 0;
    return true;
  };

  const crea = async () => {
    setErrore('');
    setInVolo(true);
    try {
      const res = await creaPartita({
        nomeRistorante: data.nomeRistorante.trim(),
        forma: data.forma,
        budgetIniziale: data.budgetIniziale,
        tipoLocalita: data.tipoLocalita,
        postiASedere: data.postiASedere,
        costiFissiMensili: data.costiFissiMensili,
        staffIniziale: data.staffIniziale,
      });
      navigate(`/partita/${res.partitaId}`);
    } catch (e) {
      setErrore(e?.response?.data?.error || e?.message || 'Errore nella creazione');
      setInVolo(false);
    }
  };

  return (
    <div className="min-h-screen px-3 py-4 max-w-2xl mx-auto">
      <header className="rm-wood rm-no-radius rm-shadow p-3 mb-3 flex items-center gap-2">
        <Icon name="chef" size={22} color="#f2e5bc" />
        <h1 className="rm-pixel text-[13px] text-rm-cream">NUOVA PARTITA</h1>
      </header>

      <StepIndicator current={step} />

      <div className="rm-card-dark rm-no-radius p-3 mb-3 min-h-[260px]">
        {step === 0 && <StepLocale data={data} setData={setData} />}
        {step === 1 && <StepForma data={data} setData={setData} />}
        {step === 2 && <StepBudget data={data} setData={setData} />}
        {step === 3 && <Riepilogo data={data} />}
      </div>

      {errore && <div className="rm-card-dark rm-no-radius p-2 mb-3 text-rm-red rm-text text-[16px]">{errore}</div>}

      <div className="flex items-center gap-2">
        <PixelButton variant="wood" className="text-[10px] py-2" onClick={indietro} disabled={step === 0}>‹ Indietro</PixelButton>
        {step < 3 ? (
          <PixelButton variant="green" className="text-[10px] py-2 flex-1" onClick={avanti} disabled={!puòAvanti()}>Avanti ›</PixelButton>
        ) : (
          <PixelButton variant="green" className="text-[10px] py-2 flex-1" onClick={crea} disabled={inVolo}>
            {inVolo ? 'Creazione…' : 'Apri il locale!'}
          </PixelButton>
        )}
      </div>
    </div>
  );
}