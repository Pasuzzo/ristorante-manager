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
      {eventi.map((e, i) => (
        <div
          key={i}
          className="rm-text text-[17px] text-rm-cream px-2 py-1 border-b border-rm-cream/10 leading-snug"
          style={{ animation: `rm-pop 0.2s steps(3,end)` }}
        >
          {e}
        </div>
      ))}
    </div>
  );
}