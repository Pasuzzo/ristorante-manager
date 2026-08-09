import React, { useState } from 'react';
import { PixelButton, Chip } from '@/components/game/ui';
import { RUOLI, LIVELLI, lordoMensile, ruoloLabel, livelloLabel } from '@/lib/gameData';
import { money } from '@/lib/partita';
import HireForm from '@/components/game/HireForm';

/** Step 3 (parte staff): componi la brigata iniziale. */
export default function StaffPicker({ staff, setStaff }) {
  const [draft, setDraft] = useState(false);

  const aggiungi = (ass) => {
    setStaff((p) => [...p, ass]);
    setDraft(false);
  };
  const rimuovi = (i) => setStaff((p) => p.filter((_, idx) => idx !== i));

  const costoTotale = staff.reduce((s, a) => s + lordoMensile(a.ruolo, a.superminimo), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="rm-pixel text-[9px] text-rm-cream uppercase">Brigata iniziale</span>
        <Chip color="bg-rm-blue">Stipendi {money(costoTotale)}/mese</Chip>
      </div>

      {!staff.length && !draft && (
        <div className="rm-card-dark rm-no-radius p-3 rm-text text-[16px] text-rm-cream/60">
          Nessun dipendente. Senza brigata non si serve nessuno: assumi almeno un cuoco e un cameriere.
        </div>
      )}

      <div className="space-y-2">
        {staff.map((a, i) => (
          <div key={i} className="rm-card rm-no-radius p-2 flex items-center justify-between">
            <div>
              <div className="rm-pixel text-[10px] text-rm-bg">{a.nome}</div>
              <div className="rm-text text-[15px] text-rm-wood-dark leading-none">
                {ruoloLabel(a.ruolo)} · {livelloLabel(a.livello)} · {a.inRegola ? 'regolare' : 'in nero'} · {money(lordoMensile(a.ruolo, a.superminimo))}
              </div>
            </div>
            <PixelButton className="text-[8px] py-1 px-2" onClick={() => rimuovi(i)}>Rimuovi</PixelButton>
          </div>
        ))}
      </div>

      {draft ? (
        <HireForm onConferma={aggiungi} onAnnulla={() => setDraft(false)} />
      ) : (
        <PixelButton variant="green" full className="text-[10px]" onClick={() => setDraft(true)}>+ Assumi un dipendente</PixelButton>
      )}
    </div>
  );
}