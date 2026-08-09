import React from 'react';

const LABELS = ['Locale', 'Forma', 'Apertura'];

export default function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-1">
      {LABELS.map((l, i) => (
        <React.Fragment key={l}>
          <div
            className={`rm-pixel text-[8px] px-2 py-2 border-[3px] ${
              i === step
                ? 'bg-rm-gold text-rm-bg border-rm-wood-dark rm-shadow'
                : i < step
                  ? 'bg-rm-green text-rm-cream border-rm-wood-dark'
                  : 'bg-rm-bg2 text-rm-cream/50 border-rm-wood-dark'
            }`}
          >
            {i + 1}. {l}
          </div>
          {i < LABELS.length - 1 && <div className={`w-3 h-[3px] ${i < step ? 'bg-rm-green' : 'bg-rm-wood-dark'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}