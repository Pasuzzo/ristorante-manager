/**
 * IL REGISTRO — quello che dichiari e quello che incassi davvero.
 *
 * Un solo posto dove convivono le due colonne. Le tasse guardano la
 * colonna dichiarata, la cassa vera guarda l'altra.
 *
 * Il vincolo che rende la meccanica un dilemma e non un bottone gratis:
 * il contante non dichiarato è un PORTAFOGLIO SEPARATO. Le ore fuori
 * busta e gli acquisti in nero si pagano solo da lì. E se nascondi
 * ricavi senza nascondere anche gli acquisti, il rapporto tra materie
 * prime e incassi dichiarati diventa anomalo.
 *
 * Nel gioco l'anomalia alza il rischio di controllo. Non c'è nessuna
 * soglia "sicura": è un rischio che cresce, non una regola da aggirare.
 */

export interface StatoNero {
  /** contante non dichiarato disponibile */
  cassaNera: number;
  /** progressivi dell'anno, per la chiusura e per il rischio */
  ricaviDichiarati: number;
  ricaviNonDichiarati: number;
  acquistiDichiarati: number;
  acquistiNonDichiarati: number;
  /** retribuzioni fuori busta pagate nell'anno */
  retribuzioniNere: number;
  /** memoria storica: quanto nero hai fatto in totale (i controlli guardano indietro) */
  neroStoricoTotale: number;
}

export function nuovoStatoNero(): StatoNero {
  return {
    cassaNera: 0, ricaviDichiarati: 0, ricaviNonDichiarati: 0,
    acquistiDichiarati: 0, acquistiNonDichiarati: 0,
    retribuzioniNere: 0, neroStoricoTotale: 0,
  };
}

export interface DecisioniNero {
  /** frazione degli incassi non battuta allo scontrino (0..0.6) */
  quotaScontrino?: number;
  /** frazione degli acquisti presi senza fattura (0..0.6) */
  quotaAcquisti?: number;
  /** durante ferie e malattia, la quota fuori busta la paghi comunque? */
  pagaNeroInAssenza?: boolean;
}

export const LIMITI = {
  maxQuotaScontrino: 0.6,
  maxQuotaAcquisti: 0.6,
  /** food cost dichiarato "normale": scostamenti da qui insospettiscono */
  rapportoAtteso: 0.33,
} as const;

export interface EsitoMeseNero {
  incassoDichiarato: number;
  incassoNero: number;
  acquistoDichiarato: number;
  acquistoNero: number;
  /** 0 = conti coerenti, 1 = palesemente incoerenti */
  incoerenza: number;
  eventi: string[];
}

/**
 * Registra il mese. `ricaviLordi` e `costoMateriePrime` sono i valori
 * REALI: qui si decide quanto ne finisce nei registri.
 */
export function registraMese(
  n: StatoNero,
  ricaviLordi: number,
  costoMateriePrime: number,
  dec: DecisioniNero
): EsitoMeseNero {
  const eventi: string[] = [];
  const qS = Math.max(0, Math.min(LIMITI.maxQuotaScontrino, dec.quotaScontrino ?? 0));
  const qA = Math.max(0, Math.min(LIMITI.maxQuotaAcquisti, dec.quotaAcquisti ?? 0));

  const incassoNero = ricaviLordi * qS;
  const incassoDichiarato = ricaviLordi - incassoNero;
  const acquistoNero = costoMateriePrime * qA;
  const acquistoDichiarato = costoMateriePrime - acquistoNero;

  n.cassaNera += incassoNero - acquistoNero;
  n.ricaviDichiarati += incassoDichiarato;
  n.ricaviNonDichiarati += incassoNero;
  n.acquistiDichiarati += acquistoDichiarato;
  n.acquistiNonDichiarati += acquistoNero;
  n.neroStoricoTotale += incassoNero;

  // Incoerenza: quanto il food cost DICHIARATO si discosta dal normale.
  // Nascondere incassi senza nascondere acquisti lo gonfia; il contrario lo sgonfia.
  const rapporto = n.ricaviDichiarati > 0 ? n.acquistiDichiarati / n.ricaviDichiarati : LIMITI.rapportoAtteso;
  const incoerenza = Math.max(0, Math.min(1, Math.abs(rapporto - LIMITI.rapportoAtteso) / 0.22));

  if (incoerenza > 0.55) {
    eventi.push(
      `📊 I conti non tornano tra loro: con questi acquisti, gli incassi dichiarati sono fuori scala. ` +
      `È il primo segnale che guarda chiunque controlli.`
    );
  }
  if (qS > 0 && n.cassaNera < 0) {
    eventi.push("💸 Il contante fuori cassa è finito: stai pagando in nero più di quanto incassi in nero.");
  }
  return { incassoDichiarato, incassoNero, acquistoDichiarato, acquistoNero, incoerenza, eventi };
}

/**
 * Preleva contante per pagare fuori busta. Se non basta, paga quello che
 * può: il resto va messo in busta (o non pagato, e il morale ne risente).
 */
export function prelevaContante(n: StatoNero, richiesto: number): { pagato: number; mancante: number } {
  const pagato = Math.max(0, Math.min(n.cassaNera, richiesto));
  n.cassaNera -= pagato;
  n.retribuzioniNere += pagato;
  return { pagato, mancante: richiesto - pagato };
}

/** Quanto rischio di controllo aggiunge la gestione del nero, 0..1. */
export function rischioFiscale(n: StatoNero, incoerenza: number, lavoratoriIrregolari: number): number {
  const quotaNera = n.ricaviDichiarati + n.ricaviNonDichiarati > 0
    ? n.ricaviNonDichiarati / (n.ricaviDichiarati + n.ricaviNonDichiarati)
    : 0;
  return Math.min(1, quotaNera * 0.6 + incoerenza * 0.3 + Math.min(0.3, lavoratoriIrregolari * 0.08));
}

/** A fine anno: azzera i progressivi, tiene cassa e memoria storica. */
export function chiudiAnnoNero(n: StatoNero): void {
  n.ricaviDichiarati = 0;
  n.ricaviNonDichiarati = 0;
  n.acquistiDichiarati = 0;
  n.acquistiNonDichiarati = 0;
  n.retribuzioniNere = 0;
}