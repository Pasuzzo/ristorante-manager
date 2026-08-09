import React from 'react';
import { PixelPanel, SectionTitle, Money } from '@/components/game/ui';
import { Icon } from '@/components/game/icons';
import { money, nomeMese } from '@/lib/partita';
import { RUOLI } from '@/lib/gameData';

const IVA_TRIM = [3, 5, 8, 11];

function prossimoIva(mese) {
  for (const m of IVA_TRIM) if (m >= mese) return m;
  return 3; // marzo anno dopo
}

export default function Bilancio({ stato, report }) {
  const t = stato.tesoreria;
  const movs = t.movimenti || [];

  // Ultimo mese giocato
  let latest = null;
  for (const m of movs) if (!latest || m.anno > latest.anno || (m.anno === latest.anno && m.mese > latest.mese)) latest = { anno: m.anno, mese: m.mese };
  const ultimi = latest ? movs.filter((m) => m.anno === latest.anno && m.mese === latest.mese) : [];

  const scad = [];
  if (t.f24MeseSuccessivo > 0) scad.push({ mese: stato.mese, label: 'F24 ritenute+contributi', amount: t.f24MeseSuccessivo, when: '16 del mese' });
  const ivaDue = prossimoIva(stato.mese);
  if (!stato.ristorante.forma.includes('forfettaria') && t.ivaTrimestre > 0) scad.push({ mese: ivaDue, label: 'IVA trimestrale (in accumulo)', amount: t.ivaTrimestre, when: '16/' + ivaDue });
  const stangata = t.saldoImposte + t.baseAcconti * 0.5 + t.saldoContributi + t.baseAccontiContributi * 0.5;
  if (stato.mese <= 6 && stangata > 0) scad.push({ mese: 6, label: 'LA STANGATA DI GIUGNO', amount: stangata, when: '30/6', big: true });
  const secondoAcc = (t.baseAcconti + t.baseAccontiContributi) * 0.5;
  if (stato.mese <= 11 && secondoAcc > 0) scad.push({ mese: 11, label: '2° acconto imposte+contributi', amount: secondoAcc, when: '30/11' });

  return (
    <div className="space-y-3">
      <PixelPanel title={`MOVIMENTI · ${latest ? nomeMese(latest.mese) : '—'}`} icon="coin">
        {ultimi.length === 0 ? (
          <div className="rm-text text-[16px] text-rm-cream/60">Nessun movimento. Avanza il primo mese.</div>
        ) : (
          <div className="divide-y divide-rm-cream/10">
            {ultimi.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-[3px]">
                <span className="rm-text text-[16px] text-rm-cream/90">{m.causale}</span>
                <span className={`rm-pixel text-[10px] ${m.importo >= 0 ? 'text-rm-green' : 'text-rm-red'}`}>{money(m.importo)}</span>
              </div>
            ))}
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="PROSSIME SCADENZE FISCALI" icon="stamp">
        {scad.length === 0 ? (
          <div className="rm-text text-[16px] text-rm-cream/60">Nessuna scadenza in arrivo. Goditela finché dura.</div>
        ) : (
          <div className="space-y-1">
            {scad.map((s, i) => (
              <div key={i} className={`flex items-center justify-between p-1 border-[2px] border-rm-wood-dark ${s.big ? 'bg-rm-red' : 'bg-rm-bg2'}`}>
                <div>
                  <div className={`rm-pixel text-[9px] ${s.big ? 'text-rm-cream rm-blink' : 'text-rm-cream'}`}>{s.label}</div>
                  <div className="rm-text text-[14px] text-rm-cream/60">{nomeMese(s.mese)} · {s.when}</div>
                </div>
                <span className={`rm-pixel text-[10px] ${s.big ? 'text-rm-cream' : 'text-rm-gold'}`}>{money(s.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="TFR — IL DEBITO SILENZIOSO" icon="envelope">
        <div className="rm-pixel text-[16px] text-rm-red mb-2">{money(t.tfrMaturato)}</div>
        <div className="rm-text text-[15px] text-rm-cream/70 mb-2">Maturato verso i dipendenti in regola. Esce dalla cassa solo quando qualcuno se ne va.</div>
        <div className="space-y-1">
          {Object.entries(stato.tfrPerDipendente || {}).filter(([, v]) => v > 0).map(([id, v]) => {
            const d = stato.staff.find((x) => x.id === id);
            return (
              <div key={id} className="flex items-center justify-between rm-text text-[15px] text-rm-cream/90 border-b border-rm-cream/10 py-[2px]">
                <span>{d ? d.nome : id}</span>
                <span className="rm-pixel text-[9px] text-rm-red">{money(v)}</span>
              </div>
            );
          })}
          {Object.keys(stato.tfrPerDipendente || {}).length === 0 && <div className="rm-text text-[14px] text-rm-cream/50">Nessun dipendente in regola ancora.</div>}
        </div>
      </PixelPanel>

      {report?.chiusuraAnno && (
        <PixelPanel title="ULTIMA CHIUSURA D'ANNO" icon="cal">
          <div className="space-y-1">
            {report.chiusuraAnno.map((r, i) => (
              <div key={i} className="rm-text text-[16px] text-rm-cream/90 border-b border-rm-cream/10 py-[2px] leading-snug">{r}</div>
            ))}
          </div>
        </PixelPanel>
      )}
    </div>
  );
}