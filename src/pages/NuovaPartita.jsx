import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import StepIndicator from '@/components/game/wizard/StepIndicator';
import StepLocale from '@/components/game/wizard/StepLocale';
import StepForma from '@/components/game/wizard/StepForma';
import StepBudget from '@/components/game/wizard/StepBudget';
import { PixelButton, Chip } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { creaPartita, money } from '@/lib/partita';
import { localitaLabel, formaLabel } from '@/lib/gameData';

export default function NuovaPartita() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [nome, setNome] = useState('');
  const [localita, setLocalita] = useState('riviera');
  const [posti, setPosti] = useState(55);
  const [forma, setForma] = useState('ditta_ordinaria');
  const [budget, setBudget] = useState(45000);
  const [costiFissi, setCostiFissi] = useState(2600);
  const [staff, setStaff] = useState([]);

  const canNext = step === 0 ? nome.trim().length > 1 : true;

  const crea = async () => {
    setBusy(true); setErr('');
    try {
      const res = await creaPartita({
        nomeRistorante: nome.trim(),
        forma, budgetIniziale: budget,
        tipoLocalita: localita, postiASedere: posti,
        costiFissiMensili: costiFissi,
        staffIniziale: staff,
      });
      navigate(`/partita/${res.partitaId}`);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Errore di creazione');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-3 py-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <Link to="/" className="rm-text text-[16px] text-rm-blue underline">◀ le tue partite</Link>
        <Brand />
      </div>

      <div className="rm-wood rm-no-radius p-3 mb-3">
        <h1 className="rm-pixel text-[14px] text-rm-cream leading-relaxed">APRI IL LOCALE</h1>
        <p className="rm-text text-[16px] text-rm-cream/70 mt-1">Stai aprendo davvero. Ogni scelta qui pesa per anni.</p>
      </div>

      <div className="mb-4 overflow-x-auto"><StepIndicator step={step} /></div>

      <div className="rm-wood rm-no-radius p-3 mb-4">
        {step === 0 && <StepLocale nome={nome} setNome={setNome} localita={localita} setLocalita={setLocalita} posti={posti} setPosti={setPosti} />}
        {step === 1 && <StepForma forma={forma} setForma={setForma} />}
        {step === 2 && (
          <StepBudget budget={budget} setBudget={setBudget} costiFissi={costiFissi} setCostiFissi={setCostiFissi} staff={staff} setStaff={setStaff} />
        )}
      </div>

      {err && <div className="rm-card rm-no-radius p-2 mb-3 border-l-[4px] border-rm-red rm-text text-[16px]">{err}</div>}

      {step === 2 && (
        <div className="rm-card rm-no-radius p-2 mb-3">
          <div className="rm-pixel text-[10px] text-rm-wood-dark mb-1">RIEPILOGO</div>
          <div className="rm-text text-[16px] text-rm-bg leading-snug">
            <b>{nome || 'Senza nome'}</b> a {localitaLabel(localita)} · {formaLabel(forma)}<br />
            Capitale {money(budget)}, costi fissi {money(costiFissi)}/mese · {posti} posti · {staff.length} assunti.
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <PixelButton variant="wood" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>◀ INDietro</PixelButton>
        {step < 2 && <PixelButton full disabled={!canNext} onClick={() => setStep((s) => s + 1)}>AVANTI ▶</PixelButton>}
        {step === 2 && <PixelButton full variant="green" disabled={busy || nome.trim().length < 2} onClick={crea}>{busy ? 'COSTITUZIONE…' : 'APRI ▶'}</PixelButton>}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-1">
      <Icon name="chef" size={20} color="#e8b84b" />
      <span className="rm-pixel text-[10px] text-rm-gold">RISTORANTE MANAGER</span>
    </div>
  );
}