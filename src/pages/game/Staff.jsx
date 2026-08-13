import React, { useState } from 'react';
import { PixelButton, Chip, PixelPanel } from '@/components/game/ui';
import StaffCard from '@/components/game/StaffCard';
import HireForm from '@/components/game/HireForm';
import { lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

/** Gestione della brigata: assunzioni, licenziamenti, aumenti (in coda al prossimo turno). */
export default function Staff({ stato, report, decisioni, setDecisioni }) {
  const [draft, setDraft] = useState(false);
  const staff = stato?.staff ?? [];
  const tfrMap = stato?.tfrPerDipendente ?? {};
  const buste = report?.buste ?? {};

  const toggleLicenzia = (id) => {
    setDecisioni((p) => {
      const has = p.licenziamenti.includes(id);
      return { ...p, licenziamenti: has ? p.licenziamenti.filter((x) => x !== id) : [...p.licenziamenti, id] };
    });
  };

  const aumenta = (id, superminimoAttuale) => {
    const nuovo = Math.min(1.8, Math.round((superminimoAttuale + 0.05) * 100) / 100);
    setDecisioni((p) => {
      const altri = p.aumenti.filter((a) => a.id !== id);
      return { ...p, aumenti: [...altri, { id, superminimo: nuovo }] };
    });
  };

  const aggiungiAssunzione = (ass) => {
    setDecisioni((p) => ({ ...p, assunzioni: [...p.assunzioni, ass] }));
    setDraft(false);
  };

  const costoStaff = staff.reduce((s, d) => s + lordoMensile(d.ruolo, d.superminimo), 0);

  const pendingAumento = (id) => decisioni.aumenti.find((a) => a.id === id)?.superminimo ?? null;

  return (
    <div className="space-y-3">
      <PixelPanel title={`Brigata (${staff.length})`} icon="users">
        <div className="flex items-center justify-between">
          <Chip color="bg-rm-blue">Stipendi {money(costoStaff)}/mese</Chip>
          {!draft && <PixelButton variant="green" className="text-[9px] py-2" onClick={() => setDraft(true)}>+ Assumi</PixelButton>}
        </div>
      </PixelPanel>

      {decisioni.assunzioni.length > 0 && (
        <PixelPanel title="In ingresso (prossimo mese)" icon="chef">
          <div className="space-y-2">
            {decisioni.assunzioni.map((a, i) => (
              <div key={i} className="rm-card rm-no-radius p-2 flex items-center justify-between">
                <span className="rm-text text-[16px] text-rm-bg">{a.nome} · {a.ruolo} · {a.inRegola ? 'regolare' : 'nero'}</span>
                <PixelButton className="text-[8px] py-1 px-2" onClick={() => setDecisioni((p) => ({ ...p, assunzioni: p.assunzioni.filter((_, idx) => idx !== i) }))}>Annulla</PixelButton>
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {draft && <HireForm onConferma={aggiungiAssunzione} onAnnulla={() => setDraft(false)} />}

      {staff.length === 0 && !draft && (
        <div className="rm-card-dark rm-no-radius p-4 rm-text text-[17px] text-rm-cream/60">
          Nessun dipendente. Senza brigata non servi nessun coperto: assumi almeno un cuoco e un cameriere.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {staff.map((d) => (
          <StaffCard
            key={d.id}
            dipendente={d}
            busta={buste[d.id]}
            tfr={tfrMap[d.id] ?? 0}
            onLicenzia={() => toggleLicenzia(d.id)}
            onAumenta={() => aumenta(d.id, d.superminimo)}
            pendingLicenzia={decisioni.licenziamenti.includes(d.id)}
            pendingAumento={pendingAumento(d.id)}
          />
        ))}
      </div>
    </div>
  );
}