import React from 'react';
import { PixelPanel, SegmentedBar, Chip } from '@/components/game/ui';

/**
 * Scheda del titolare: come organizza i compiti (delega vs fai-da-te) e
 * se copre o no un ruolo operativo. Ogni scelta pesa su stress e costi.
 * Le modifiche vanno in decisioni.compiti e si applicano al prossimo turno.
 */
const OPZIONI = [
  {
    key: 'approvvigionamento', icon: 'cart', titolo: 'Approvvigionamento',
    scelta: [
      { v: 'consegna', label: 'Consegna a domicilio', costo: '+1,8% food cost', stress: 'stress basso', nota: 'Comodo, ma il listino lo fa il grossista.' },
      { v: 'ritiro_diretto', label: 'Ritiro al mercato', costo: '−2,2% food cost', stress: 'stress alto', nota: 'Alle 5 del mattino: risparmi e scegli il meglio.' },
    ],
  },
  {
    key: 'amministrazione', icon: 'envelope', titolo: 'Amministrazione',
    scelta: [
      { v: 'delegata', label: 'Delegata al commercialista', costo: '90€/mese', stress: 'stress basso', nota: 'Tu firmi, lui pensa a F24 e dichiarazioni.' },
      { v: 'fai_da_te', label: 'Fai da te', costo: '0€ · 6% errore', stress: 'stress alto', nota: 'La sera dopo il servizio. Un errore può costare caro.' },
    ],
  },
  {
    key: 'prenotazioni', icon: 'wifi', titolo: 'Prenotazioni',
    scelta: [
      { v: 'software', label: 'Software online', costo: '45€/mese', stress: 'stress basso', nota: 'Il telefono smette di squillare.' },
      { v: 'telefono', label: 'Telefono in mano', costo: '0€', stress: 'stress medio', nota: 'Squilla sempre, anche il lunedì.' },
    ],
  },
  {
    key: 'social', icon: 'mega', titolo: 'Contenuti social',
    scelta: [
      { v: 'delegato', label: 'Delegato (agenzia/dip.)', costo: '280€/mese', stress: 'stress basso', nota: 'Contenuti professionali, regolari.' },
      { v: 'titolare', label: 'Il titolare la sera tardi', costo: '0€ · efficacia −30%', stress: 'stress alto', nota: 'Foto e post a mezzanotte, dopo il servizio.' },
    ],
  },
  {
    key: 'ruoloCoperto', icon: 'chef', titolo: 'Ruolo operativo',
    scelta: [
      { v: null, label: 'Nessuno (solo gestione)', costo: '0€', stress: '−stress', nota: 'Ti dedichi a dirigere. Serve brigata sufficiente.' },
      { v: 'sala', label: 'In sala', costo: 'un cameriere in meno', stress: 'stress medio', nota: 'Servi ai tavoli: risparmi sul personale.' },
      { v: 'cucina', label: 'In cucina', costo: 'un cuoco in meno', stress: 'stress alto', nota: 'Ai fornelli ogni servizio: il risparmio più forte, lo stress più forte.' },
    ],
  },
];

export default function Titolare({ stato, decisioni, setDecisioni }) {
  const t = stato?.titolare ?? {};
  const compiti = decisioni.compiti ?? stato?.compiti ?? {};
  const stress = t.stress ?? 20;
  const stressColor = stress >= 70 ? '#c8443c' : stress >= 50 ? '#e8b84b' : '#5a8c46';

  const set = (k, v) => setDecisioni((p) => ({ ...p, compiti: { ...(p.compiti ?? {}), [k]: v } }));
  const valore = (key) => (key === 'ruoloCoperto' ? (compiti[key] ?? null) : compiti[key]);

  return (
    <div className="space-y-3">
      <PixelPanel title={`Titolare · ${t.nome ?? '—'}`} icon="chef">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="rm-pixel text-[8px] text-rm-cream uppercase">Stress</span>
            <span className="rm-pixel text-[10px]" style={{ color: stressColor }}>{Math.round(stress)}/100</span>
          </div>
          <SegmentedBar value={stress} max={100} segments={20} color={stressColor} size={10} />
          {t.burnout ? (
            <div className="rm-card-dark rm-no-radius p-2 border-2 border-rm-red">
              <div className="rm-pixel text-[10px] text-rm-red">🔥 BURNOUT</div>
              <div className="rm-text text-[15px] text-rm-cream mt-1">
                Sei al limite: le decisioni di visione (listino, servizi, ristrutturazione, qualità materie) sono bloccate. Prima delega e riposa, poi riprendi a guidare.
              </div>
            </div>
          ) : stress >= 70 ? (
            <div className="rm-text text-[15px] text-rm-gold">😮‍💨 Sei al limite: delega qualcosa prima di crollare.</div>
          ) : (
            <div className="rm-text text-[15px] text-rm-cream/60">Più deleghi, più respiri. Ma ogni delega costa: trova il tuo equilibrio.</div>
          )}
          <div className="rm-text text-[14px] text-rm-cream/50">Età {t.eta ?? '—'} · {t.sesso === 'F' ? 'donna' : 'uomo'}</div>
        </div>
      </PixelPanel>

      {OPZIONI.map((opt) => {
        const attuale = valore(opt.key);
        return (
          <PixelPanel key={opt.key} title={opt.titolo} icon={opt.icon}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {opt.scelta.map((s) => {
                const on = attuale === s.v;
                return (
                  <button key={String(s.v)} onClick={() => set(opt.key, s.v)}
                    className="rm-no-radius p-2 border-[3px] text-left"
                    style={{ backgroundColor: on ? '#5a8c46' : '#2b2233', color: '#f2e5bc', borderColor: '#5a3825' }}>
                    <div className="rm-pixel text-[9px]">{s.label}</div>
                    <div className="rm-text text-[13px] mt-1 text-rm-cream/80">{s.costo}</div>
                    <div className="rm-text text-[13px] text-rm-cream/80">{s.stress}</div>
                    <div className="rm-text text-[12px] text-rm-cream/50 mt-1">{s.nota}</div>
                  </button>
                );
              })}
            </div>
          </PixelPanel>
        );
      })}

      <div className="rm-text text-[14px] text-rm-cream/50 px-1">
        Le modifiche ai compiti si applicano al prossimo turno quando premi «Avanza mese».
      </div>
    </div>
  );
}