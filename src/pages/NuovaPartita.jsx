import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import StepIndicator from '@/components/game/wizard/StepIndicator';
import StepTitolare from '@/components/game/wizard/StepTitolare';
import StepMese from '@/components/game/wizard/StepMese';
import StepForma from '@/components/game/wizard/StepForma';
import StepCapitale from '@/components/game/wizard/StepCapitale';
import StepLocale from '@/components/game/wizard/StepLocale';
import StepCommercialista from '@/components/game/wizard/StepCommercialista';
import StepBrigata from '@/components/game/wizard/StepBrigata';
import StepRiepilogo from '@/components/game/wizard/StepRiepilogo';
import { creaPartita, eliminaPartita, preparaCostituzione } from '@/lib/partita';

const defaultData = {
  nomeRistorante: '',
  titolare: { nome: '', eta: 35, sesso: 'M' },
  meseInizio: 3,
  forma: 'ditta_ordinaria',
  budgetIniziale: 150000,
  capitaleSociale: 5000,
  annuncio: null,
  modalitaImmobile: 'affitto',
  commercialista: 'studio_locale',
  stileLocale: 'trattoria_classica',
  assunzioni: [],
};

export default function NuovaPartita() {
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [data, setData] = useState(defaultData);
  const [prep, setPrep] = useState(null);
  const [loadingPrep, setLoadingPrep] = useState(true);
  const [step, setStep] = useState(0);
  const [esito, setEsito] = useState(null);
  const [errore, setErrore] = useState('');
  const [inVolo, setInVolo] = useState(false);
  const navigate = useNavigate();

  const update = (patch) => setData((p) => ({ ...p, ...patch }));
  const cambiaMese = (n) => setData((p) => ({ ...p, meseInizio: n, assunzioni: [] }));

  useEffect(() => {
    let vivo = true;
    setLoadingPrep(true);
    preparaCostituzione({ seed, forma: data.forma, budgetIniziale: data.budgetIniziale, meseInizio: data.meseInizio })
      .then((r) => { if (vivo) { setPrep(r); setLoadingPrep(false); } })
      .catch((e) => { if (vivo) { setErrore(e?.message ?? 'Errore preparazione'); setLoadingPrep(false); } });
    return () => { vivo = false; };
  }, [seed, data.forma, data.budgetIniziale, data.meseInizio]);

  const puòAvanti = () => {
    if (step === 0) return (data.nomeRistorante || '').trim().length > 0 && (data.titolare.nome || '').trim().length > 0;
    if (step === 4) return !!data.annuncio;
    return true;
  };

  const crea = async () => {
    setErrore(''); setInVolo(true);
    try {
      const res = await creaPartita({
        nomeRistorante: (data.nomeRistorante || '').trim() || 'Il mio ristorante',
        forma: data.forma,
        budgetIniziale: data.budgetIniziale,
        annuncio: data.annuncio,
        modalitaImmobile: data.modalitaImmobile,
        assunzioniIniziali: data.assunzioni,
        commercialista: data.commercialista,
        capitaleSociale: (data.forma === 'srl' || data.forma === 'srls') ? Number(data.capitaleSociale) : undefined,
        stileLocale: data.stileLocale,
        titolare: data.titolare,
        meseInizio: data.meseInizio,
        seed,
      });
      setEsito(res);
      setStep(7);
    } catch (e) {
      setErrore(e?.response?.data?.error || e?.message || 'Errore nella creazione');
    } finally {
      setInVolo(false);
    }
  };

  const scarta = async () => {
    if (esito?.partitaId) { try { await eliminaPartita(esito.partitaId); } catch { /* ignore */ } }
    setEsito(null);
  };
  const onModifica = async () => { await scarta(); setStep(5); };
  const onRicomincia = async () => { await scarta(); setStep(0); };
  const onEntra = () => esito?.partitaId && navigate(`/partita/${esito.partitaId}`);
  const indietro = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen px-3 py-4 max-w-2xl mx-auto pb-24">
      <header className="rm-wood rm-no-radius rm-shadow p-3 mb-3 flex items-center gap-2">
        <button onClick={() => navigate('/')} className="rm-pixel text-[10px] text-rm-cream/80">‹ Partite</button>
        <Icon name="chef" size={20} color="#f2e5bc" />
        <h1 className="rm-pixel text-[12px] text-rm-cream">COSTITUZIONE</h1>
      </header>

      <StepIndicator current={step} />

      <div className="rm-card-dark rm-no-radius p-3 mb-3 min-h-[260px]">
        {loadingPrep && !prep ? (
          <div className="rm-text text-[18px] text-rm-cream/70 text-center py-10">Preparo la costituzione…</div>
        ) : (
          <>
            {step === 0 && <StepTitolare data={data} update={update} />}
            {step === 1 && <StepMese data={data} update={update} cambiaMese={cambiaMese} prep={prep} />}
            {step === 2 && <StepForma data={data} update={update} prep={prep} />}
            {step === 3 && <StepCapitale data={data} update={update} prep={prep} />}
            {step === 4 && <StepLocale data={data} update={update} prep={prep} />}
            {step === 5 && <StepCommercialista data={data} update={update} prep={prep} />}
            {step === 6 && <StepBrigata data={data} update={update} prep={prep} />}
            {step === 7 && <StepRiepilogo esito={esito} data={data} onEntra={onEntra} onModifica={onModifica} onRicomincia={onRicomincia} />}
          </>
        )}
      </div>

      {errore && <div className="rm-card-dark rm-no-radius p-2 mb-3 text-rm-red rm-text text-[16px]">{errore}</div>}

      {step < 7 && (
        <div className="flex items-center gap-2">
          <PixelButton variant="wood" className="text-[10px] py-2" onClick={indietro} disabled={step === 0}>‹ Indietro</PixelButton>
          {step < 6 ? (
            <PixelButton variant="green" className="text-[10px] py-2 flex-1" onClick={() => setStep(step + 1)} disabled={!puòAvanti()}>Avanti ›</PixelButton>
          ) : (
            <PixelButton variant="green" className="text-[10px] py-2 flex-1" onClick={crea} disabled={inVolo}>
              {inVolo ? 'Costituzione…' : 'Apri il locale!'}
            </PixelButton>
          )}
        </div>
      )}
    </div>
  );
}