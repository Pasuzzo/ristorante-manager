import React from 'react';

/** Feed eventi stile casella messaggi di Football Manager: una riga per evento. */
export default function EventFeed({ eventi }) {
  if (!eventi || !eventi.length) {
    return (
      <div className="rm-card-dark rm-no-radius p-3 rm-text text-[16px] text-rm-cream/50">
        Nessuna notizia. Il locale è appena aperto: avanti il primo mese.
      </div>
    );
  }
  return (
    <div className="rm-card-dark rm-no-radius p-1 max-h-72 overflow-y-auto rm-scroll">
      {eventi.map((e, i) => {
        const durc = typeof e === 'string' && e.includes('📄');
        return (
          <div
            key={i}
            className={`rm-text text-[17px] px-2 py-1 border-b leading-snug ${
              durc
                ? 'bg-rm-red/20 border-rm-red text-rm-cream'
                : 'border-rm-cream/10 text-rm-cream'
            }`}
          >
            {e}
          </div>
        );
      })}
    </div>
  );
}