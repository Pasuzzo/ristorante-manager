// Helper UI per la costituzione. I valori veri vivono nel motore
// (base44/shared/engine/costituzione.ts); qui replichiamo solo la piccola
// funzione effettiCapitale per il calcolo live dello slider del capitale,
// senza trascinare tutto l'engine nel bundle del frontend.

/** Fido aggiuntivo, credibilità e nota per il capitale versato. */
export function effettiCapitale(capitaleVersato) {
  const fidoAggiuntivo = Math.round(capitaleVersato * 1.2);
  const credibilita = Math.min(1, capitaleVersato / 25000);
  const nota =
    capitaleVersato < 1000
      ? 'Capitale simbolico: la banca non ti darà fido e i fornitori vorranno pagamento anticipato.'
      : capitaleVersato < 10000
        ? 'Capitale modesto: fido limitato, ma sei operativo.'
        : 'Capitale solido: la banca apre il fido e i fornitori ti fanno credito.';
  return { fidoAggiuntivo, credibilita, nota };
}

const CUCINA = ['lavapiatti', 'commis', 'cuoco', 'chef', 'sous_chef', 'pizzaiolo', 'pasticcere'];

/** Controllo di composizione della brigata (mirror di verificaBrigata del motore). */
export function verificaBrigata(ruoli) {
  const cucina = ruoli.filter((r) => CUCINA.includes(r)).length;
  const sala = ruoli.length - cucina;
  const out = [];
  if (!ruoli.length) out.push('❌ Non hai assunto nessuno: senza personale il locale non apre.');
  else {
    if (cucina === 0) out.push('❌ NESSUNO IN CUCINA: senza cuoco non si serve un piatto.');
    if (sala === 0) out.push('❌ NESSUNO IN SALA: i clienti entrano e non trovano chi prenda l\'ordine.');
    if (cucina > 0 && sala > 0 && ruoli.length < 3) out.push('⚠️ Brigata minima: reggerete i giorni tranquilli, non i weekend pieni.');
  }
  return out;
}