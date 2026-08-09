import React, { useState } from 'react';
import StaffCard from '@/components/game/StaffCard';
import HireForm from '@/components/game/HireForm';
import { SectionTitle, PixelButton, Chip } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { RUOLI } from '@/lib/gameData';

export default function Staff({ stato, assunzioni, setAssunzioni, licenziamenti, setLicenziamenti, aumenti, setAumenti }) {
  const [formAperto, setFormAperto] = useState(false);
  const tfr = (id) => stato.tfrPerDipendente?.[id] ?? 0;
  const inLicenz = (id) => licenziamenti.includes(id);
  const inAum = (id) => aumenti.find((a) => a.id === id)?.superminimo;

  const licenzia = (id) => !inLicenz(id) && setLicenziamenti([...licenziamenti, id]);
  const annullaL = (id) => setLicenziamenti(licenziamenti.filter((x) => x !== id));
  const aumenta = (id, sup) => {
    const others = aumenti.filter((a) => a.id !== id);
    setAumenti([...others, { id, superminimo: sup }]);
  };
  const annullaA = (id) => setAumenti(aumenti.filter((a) => a.id !== id));

  const tot = assunzioni.length + licenziamenti.length + aumenti.length;

  return (
    <div className="space-y-3">
      <div className="rm-wood rm-no-radius p-2 flex items-center justify-between">
        <div className="rm-pixel text-[10px] text-rm-cream">BRIGATA · {stato.staff.length}</div>
        <div className="flex gap-1">
          {tot > 0 && <Chip color="bg-rm-gold !text-rm-bg">{tot} IN CODA</Chip>}
        </div>
      </div>

      {assunzioni.length > 0 && (
        <div className="rm-card-dark rm-no-radius p-2">
          <div className="rm-pixel text-[8px] text-rm-green mb-1">DA ASSUMERE QUESTO MESE</div>
          {assunzioni.map((a, i) => (
            <div key={i} className="flex items-center justify-between rm-text text-[15px] text-rm-cream py-[2px] border-b border-rm-cream/10">
              <span>{a.nome} · {RUOLI.find((r) => r.value === a.ruolo)?.label} {!a.inRegola && <span className="text-rm-red">nero</span>}</span>
              <button className="rm-pixel text-[7px] bg-rm-red text-rm-cream px-1 border-[2px] border-rm-wood-dark" onClick={() => setAssunzioni(assunzioni.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
      )}

      {formAperto ? (
        <HireForm onConferma={(a) => { setAssunzioni([...assunzioni, a]); setFormAperto(false); }} onAnnulla={() => setFormAperto(false)} />
      ) : (
        <PixelButton full variant="green" onClick={() => setFormAperto(true)}><span className="mr-1">+</span> ASSUMI PERSONALE</PixelButton>
      )}

      {stato.staff.length === 0 && !formAperto && (
        <div className="rm-card-dark rm-no-radius p-4 text-center rm-text text-[16px] text-rm-cream/60">
          Senza brigata non si serve un coperto. Il mese non parte davvero.<br />Assumi qualcuno prima di avanzare.
        </div>
      )}

      <div className="space-y-2">
        {stato.staff.map((d) => (
          <StaffCard
            key={d.id}
            d={d}
            tfr={tfr(d.id)}
            licenziato={inLicenz(d.id)}
            aumento={inAum(d.id)}
            onLicenzia={() => licenzia(d.id)}
            onAnnullaLicenziamento={() => annullaL(d.id)}
            onAumenta={(sup) => aumenta(d.id, sup)}
            onAnnullaAumento={() => annullaA(d.id)}
          />
        ))}
      </div>
    </div>
  );
}