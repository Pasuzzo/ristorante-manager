import React, { useEffect, useRef, useState } from 'react';
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
import { mulberry32, verificaBrigata } from '@/lib/costituzione';
import { valutaOfferta, generaCandidato } from '../../base44/shared/engine/mercato';

const defaultData = {
  nomeRistorante: '',
  titolare: { nome: '', eta: 35, sesso: 'M' },
  budgetIniziale: 150000,
  meseInizio: 3,
  forma: 'ditta_ordinaria',
  capitaleSociale: 5000,
  annuncio: null,
  modalitaImmobile: 'affitto',
  commercialista: 'studio_locale',
  stileLocale: 'trattoria_classica',
  assunzioni: [],
};

const ALTA = (m) => m >= 5 && m <= 8;
const optSostituto = (mese, ruolo) => ({
  ruoliCercati: [ruolo],
  qualitaBacino: ALTA(mese) ? 0.65 : 1.15,
  pressioneStagionale: ALTA(mese) ? 1.35 : 0.9,
});

export default function NuovaPartita() {
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [data, setData] = useState(defaultData);
  const [prep, setPrep] = useState(null);
  const [loadingPrep, setLoadingPrep] = useState(true);
  const [step, setStep] = useState(0);
  const [esito, setEsito] = useState(null);
  const [errore, setErrore] = useState('');
  const [inVolo, setInVolo] = useState(false);
  const [pool, setPool] = useState(null);
  const offerRng = useRef(null);
  const subRng = useRef(null);
  const navigate = useNavigate();

  const update = (patch) => setData((p) => ({ ...p, ...patch }));

  // rng del wizard: offerRng allinea con nuovaPartita (mulberry32(seed), solo valutaOfferta)
  const resetRng = () => { offerRng.current = mulberry32(seed); subRng.current = mulberry32(seed ^ 0xabcd); };
  useEffect(() => { resetRng(); }, [seed]);

  useEffect(() => {
    let vivo = true;
    setLoadingPrep(true);
    preparaCostituzione({ seed, forma: data.forma, budgetIniziale: data.budgetIniziale, meseInizio: data.meseInizio })
      .then((r) => { if (vivo) { setPrep(r); setLoadingPrep(false); } })
      .catch((e) => { if (vivo) { setErrore(e?.message ?? 'Errore preparazione'); setLoadingPrep(false); } });
    return () => { vivo = false; };
  }, [seed, data.forma, data.budgetIniziale, data.meseInizio]);

  // inizializza il pool quando arriva (e quando si resetta per cambio mese)
  useEffect(() => {
    if (!pool && prep?.pool?.candidati) setPool([...prep.pool.candidati]);
  }, [prep?.pool, pool]);

  const cambiaMese = (n) => {
    setData((p) => ({ ...p, meseInizio: n, assunzioni: [] }));
    setPool(null);
    resetRng();
  };

  // risposta IMMEDIATA all'offerta, allineata con la nuovaPartita
  const faiOfferta = (candidato, offerta) => {
    if (!offerRng.current) resetRng();
    const esito = valutaOfferta(candidato, offerta, offerRng.current);
    let sostituto = null;
    if (esito.accettata) {
      setData((p) => ({ ...p, assunzioni: [...p.assunzioni, { candidato, offerta }] }));
      setPool((prev) => (prev ?? []).filter((c) => c.id !== candidato.id));
    } else {
      sostituto = generaCandidato(`sub-${candidato.ruolo}-${Math.floor(subRng.current() * 1e6)}`, optSostituto(data.meseInizio, candidato.ruolo), subRng.current);
      setPool((prev) => [...(prev ?? []).filter((c) => c.id !== candidato.id), sostituto]);
    }
    return { esito, sostituto };
  };

  const puòAvanti = () => {
    if (step === 0) return (data.nomeRistorante || '').trim().length > 0 && (data.titolare.nome || '').trim().length > 0;
    if (step === 4) return !!data.annuncio;
    return true;
  };

  const brigataBloccante = (() => {
    const avvisi = verificaBrigata(data.assunzioni.map((o) => o.candidato.ruolo));
    return avvisi.some((a) => a.startsWith('❌'));
  })();

  const crea = async (budgetOverride) => {
    setErrore(''); setInVolo(true);
    try {
      const res = await creaPartita({
        nomeRistorante: (data.nomeRistorante || '').trim() || 'Il mio ristorante',
        forma: data.forma,
        budgetIniziale: budgetOverride ?? data.budgetIniziale,
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

  const scarta = async () => { if (esito?.partitaId) { try { await eliminaPartita(esito.partitaId); } catch {} } setEsito(null); };
  const onAumentaBudget = async (budget) => { await scarta(); await crea(budget); };
  const onTornaA = async (target) => { await scarta(); setStep(target); };
  const onRicomincia = async () => { await scarta(); setStep(0); };
  const onEntra = () => esito?.partitaId && navigate(`/partita/${esito.partitaId}`);
  const indietro = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-dvh rm-safe-top rm-safe-px px-3 py-4 max-w-2xl mx-auto pb-24">
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
            {step === 6 && <StepBrigata data={data} pool={pool} faiOfferta={faiOfferta} />}
            {step === 7 && <StepRiepilogo esito={esito} data={data} onEntra={onEntra} onAumentaBudget={onAumentaBudget} onTornaA={onTornaA} onRicomincia={onRicomincia} />}
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
            <PixelButton variant="green" className="text-[10px] py-2 flex-1" onClick={() => crea()} disabled={inVolo || brigataBloccante}>
              {inVolo ? 'Costituzione…' : 'Apri il locale!'}
            </PixelButton>
          )}
        </div>
      )}
      {step === 6 && brigataBloccante && (
        <div className="rm-text text-[14px] text-rm-red mt-2 text-center">La brigata non è in grado di aprire: servi almeno una persona in cucina e una in sala.</div>
      )}
    </div>
  );
}