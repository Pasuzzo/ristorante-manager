import React, { useState } from 'react';
import { Icon } from '@/components/game/icons';

const PRIMARI = [
  { key: 'dashboard', label: 'Dashboard', icon: 'chart' },
  { key: 'titolare', label: 'Titolare', icon: 'chef' },
  { key: 'staff', label: 'Staff', icon: 'users' },
];

export default function BottomNav({ tabs, tab, setTab }) {
  const [aperto, setAperto] = useState(false);
  const secondari = tabs.filter((t) => !PRIMARI.some((p) => p.key === t.key));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 rm-card-dark rm-no-radius border-t-[4px] border-rm-wood-dark rm-safe-bottom rm-safe-px">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {PRIMARI.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} aria-label={t.label} aria-current={on ? 'page' : undefined} className="rm-tap py-2 flex flex-col items-center gap-1">
                <Icon name={t.icon} size={20} color={on ? '#e8b84b' : '#f2e5bc'} />
                <span className={`rm-pixel text-[8px] ${on ? 'text-rm-gold' : 'text-rm-cream/70'}`}>{t.label}</span>
              </button>
            );
          })}
          <button onClick={() => setAperto(true)} aria-label="Apri menu" aria-current={aperto ? 'page' : undefined} className="rm-tap py-2 flex flex-col items-center gap-1">
            <Icon name="fork" size={20} color={aperto ? '#e8b84b' : '#f2e5bc'} />
            <span className={`rm-pixel text-[8px] ${aperto ? 'text-rm-gold' : 'text-rm-cream/70'}`}>Menu</span>
          </button>
        </div>
      </nav>

      {aperto && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/60" aria-label="Chiudi menu" onClick={() => setAperto(false)} />
          <div className="relative rm-wood rm-no-radius rm-shadow p-3 max-h-[70dvh] overflow-y-auto rm-scroll rm-safe-bottom">
            <div className="flex items-center justify-between mb-3 rm-safe-px">
              <span className="rm-pixel text-[11px] text-rm-cream">Tutte le sezioni</span>
              <button onClick={() => setAperto(false)} aria-label="Chiudi" className="rm-pixel text-[14px] text-rm-cream rm-tap px-2">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2 rm-safe-px">
              {secondari.map((t) => {
                const on = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => { setTab(t.key); setAperto(false); }}
                    aria-label={t.label}
                    aria-current={on ? 'page' : undefined}
                    className={`rm-card rm-no-radius p-2 flex flex-col items-center gap-1 rm-tap ${on ? 'rm-shadow' : 'opacity-90'}`}
                  >
                    <Icon name={t.icon} size={20} color={on ? '#e8b84b' : '#5a3825'} />
                    <span className={`rm-pixel text-[9px] text-center ${on ? 'text-rm-bg' : 'text-rm-wood-dark'}`}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}