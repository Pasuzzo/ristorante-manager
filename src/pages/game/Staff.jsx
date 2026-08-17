import React from 'react';
import { PixelButton, Chip, PixelPanel } from '@/components/game/ui';
import StaffCard from '@/components/game/StaffCard';
import { lordoMensile } from '@/lib/gameData';
import { money } from '@/lib/partita';

/** Gestione della brigata: assunzioni, licenziamenti, aumenti (in coda al prossimo turno). */
export default function Staff({ stato, report, decisioni, setDecisioni, onVaiMercato }) {
  const staff = stato?.staff ?? [];
  const tfrMap = stato?.tfrPerDipendente ?? {};
  const buste = report?.buste ?? {};
  const assenze = report?.assenze ?? {};
  const ferie = stato?.assenze?.ferieMaturate ?? {};
  const affidabilita = report?.affidabilita ?? {};

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

  const chiama = (idDipendente, giorniPreavviso) => {
    setDecisioni((p) => ({ ...p, chiamateExtra: [...(p.chiamateExtra ?? []), { idDipendente, giorniPreavviso }] }));
  };

  const costoStaff = staff.reduce((s, d) => s + lordoMensile(d.ruoloEsteso ?? d.ruolo, d.superminimo), 0);

  const pendingAumento = (id) => decisioni.aumenti.find((a) => a.id === id)?.superminimo ?? null;

  return (
    <div className="space-y-3">
      <PixelPanel title={`Brigata (${staff.length})`} icon="users">
        <div className="flex items-center justify-between">
          <Chip color="bg-rm-blue">Stipendi {money(costoStaff)}/mese</Chip>
          <PixelButton variant="green" className="text-[9px] py-2" onClick={onVaiMercato}>+ Assumi</PixelButton>
        </div>
      </PixelPanel>

      {staff.length === 0 && (
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
            assenzeGiorni={assenze[d.id] ?? 0}
            ferieMaturate={ferie[d.id] ?? 0}
            affidabilita={affidabilita[d.id]}
            onLicenzia={() => toggleLicenzia(d.id)}
            onAumenta={() => aumenta(d.id, d.superminimo)}
            onChiama={chiama}
            pendingLicenzia={decisioni.licenziamenti.includes(d.id)}
            pendingAumento={pendingAumento(d.id)}
            pendingChiama={(decisioni.chiamateExtra ?? []).some((c) => c.idDipendente === d.id)}
          />
        ))}
      </div>
    </div>
  );
}