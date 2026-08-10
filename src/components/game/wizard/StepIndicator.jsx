import React from 'react';

const STEPS = ['Titolare', 'Quando', 'Forma', 'Capitale', 'Locale', 'Commercialista', 'Brigata', 'Riepilogo'];

/** Indicatore di avanzamento del wizard di costituzione (8 step). */
export default function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-between gap-1 mb-3">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className="rm-no-radius w-7 h-7 flex items-center justify-center rm-pixel text-[10px] border-[3px]"
                style={{
                  backgroundColor: active ? '#e8b84b' : done ? '#5a8c46' : '#2b2233',
                  color: active ? '#2b2233' : '#f2e5bc',
                  borderColor: '#5a3825',
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className={`rm-pixel text-[6px] leading-none text-center ${active ? 'text-rm-gold' : 'text-rm-cream/60'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-[3px] mt-[10px]" style={{ backgroundColor: i < current ? '#5a8c46' : '#5a3825' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}