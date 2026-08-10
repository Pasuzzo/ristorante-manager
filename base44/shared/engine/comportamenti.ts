/**
 * COMPORTAMENTI — i dipendenti hanno una vita che va avanti.
 *
 * Non basta assumerli: le persone cambiano nel tempo, e cambiano in modo
 * diverso a seconda di chi sono. Le dinamiche implementate:
 *
 * IL GIOVANE (under 28): accetta paghe più basse e compromessi, ma tiene
 *   il conto. Dopo troppi mesi senza un aumento o un avanzamento, avanza
 *   una PROPOSTA con scadenza: o cresci, o se ne va — e i giovani se ne
 *   vanno davvero, senza troppi drammi.
 *
 * CHI HA FAMIGLIA: attaccamento al posto (dimissioni molto più rare),
 *   possibile MATERNITÀ/PATERNITÀ (congedo di mesi: capacità a zero, ma
 *   il costo azienda crolla perché paga l'INPS — e al rientro il legame
 *   è più forte). Avanza pretese SOLO se la paga non tiene il passo del
 *   costo della vita: non chiede per ambizione, chiede per necessità.
 *
 * IL VETERANO (over 50): non chiede quasi mai, regge la baracca, ma
 *   l'orologio biologico corre: la resistenza cala piano ogni anno.
 *
 * Tutte le richieste sono legate alla MACROECONOMIA vera del gioco:
 * l'inflazione cumulata dall'ultimo aumento è il contatore che fa
 * scattare la richiesta di adeguamento. Se l'inflazione corre e tu non
 * adegui, non è il dipendente a essere ingrato: sei tu che lo stai
 * pagando meno, in termini reali, di quando l'hai assunto.
 */

import { DipendenteEsteso } from "./reputazione.ts";

// ─────────────────────────────────────────────── Stato di carriera

export interface StatoCarriera {
  mesiInServizio: number;
  mesiDallUltimoAumento: number;
  /** inflazione cumulata da quando ha ricevuto l'ultimo aumento */
  inflazioneCumulataDaAumento: number;
  /** richiesta pendente, se il dipendente ne ha avanzata una */
  richiesta?: {
    tipo: "crescita" | "adeguamento";
    superminimoRichiesto: number;
    mesiResidui: number; // scaduta la pazienza, agisce
  };
  /** congedo in corso (maternità/paternità, infortunio…) */
  congedo?: { tipo: "maternita" | "paternita"; mesiResidui: number };
  /** la maternità può capitare una volta per partita, per persona */
  maternitaAvvenuta?: boolean;
}

export type DipendenteConCarriera = DipendenteEsteso & {
  eta?: number;
  famiglia?: string;
  tratti?: Array<{ id: string }>;
  carriera?: StatoCarriera;
};

function carriera(d: DipendenteConCarriera): StatoCarriera {
  if (!d.carriera) {
    d.carriera = { mesiInServizio: 0, mesiDallUltimoAumento: 0, inflazioneCumulataDaAumento: 0 };
  }
  return d.carriera;
}

const ha = (d: DipendenteConCarriera, id: string) => (d.tratti ?? []).some((t) => t.id === id);
const conFamiglia = (d: DipendenteConCarriera) =>
  d.famiglia === "famiglia_con_figli" || d.famiglia === "genitore_solo";

// ─────────────────────────────────────────────── Parametri

export const SOGLIE = {
  giovane: { etaMax: 27, mesiPazienza: 14, mesiPazienzaAmbizioso: 9, scadenzaRichiesta: 3, aumentoChiesto: 0.08 },
  adeguamento: { inflazioneScatto: 0.05, scadenzaRichiesta: 6 },
  maternita: { probMensile: 0.006, etaMin: 22, etaMax: 42, mesiCongedo: 5, quotaCostoAzienda: 0.25 },
  veterano: { etaMin: 50, calaResistenzaOgniMesi: 18 },
} as const;

// ─────────────────────────────────────────────── Il passo mensile

export interface EsitoCarriere {
  eventi: string[];
  /** chi se n'è andato per richieste ignorate */
  dimissionari: DipendenteConCarriera[];
  /** id in congedo: capacità zero questo mese, costo ridotto */
  inCongedo: string[];
}

export function dinamicheCarriera(
  staff: DipendenteConCarriera[],
  inflazioneAnnua: number,
  registroAumenti: Set<string>, // id di chi ha ricevuto un aumento questo mese
  rng: () => number
): EsitoCarriere {
  const eventi: string[] = [];
  const dimissionari: DipendenteConCarriera[] = [];
  const inCongedo: string[] = [];
  const inflMensile = Math.pow(1 + Math.max(0, inflazioneAnnua), 1 / 12) - 1;

  for (const d of staff) {
    const c = carriera(d);
    c.mesiInServizio++;

    // ── Aumento ricevuto: azzera contatori e chiude le richieste
    if (registroAumenti.has(d.id)) {
      c.mesiDallUltimoAumento = 0;
      c.inflazioneCumulataDaAumento = 0;
      if (c.richiesta) {
        eventi.push(`🤝 ${d.nome} ha ottenuto quello che chiedeva: richiesta rientrata, morale su.`);
        d.morale = Math.min(95, d.morale + 10);
        c.richiesta = undefined;
      }
    } else {
      c.mesiDallUltimoAumento++;
      c.inflazioneCumulataDaAumento = (1 + c.inflazioneCumulataDaAumento) * (1 + inflMensile) - 1;
    }

    // ── Congedo in corso
    if (c.congedo) {
      c.congedo.mesiResidui--;
      inCongedo.push(d.id);
      if (c.congedo.mesiResidui <= 0) {
        eventi.push(`👶 ${d.nome} rientra dal congedo: il legame col locale è più forte di prima.`);
        d.morale = Math.min(95, d.morale + 15);
        c.congedo = undefined;
      }
      continue; // in congedo non matura richieste
    }

    // ── Maternità / paternità (chi ha famiglia o convive)
    if (
      !c.maternitaAvvenuta &&
      (conFamiglia(d) || d.famiglia === "convivente") &&
      (d.eta ?? 30) >= SOGLIE.maternita.etaMin && (d.eta ?? 30) <= SOGLIE.maternita.etaMax &&
      c.mesiInServizio > 6 &&
      rng() < SOGLIE.maternita.probMensile
    ) {
      c.maternitaAvvenuta = true;
      c.congedo = { tipo: rng() < 0.6 ? "maternita" : "paternita", mesiResidui: SOGLIE.maternita.mesiCongedo };
      inCongedo.push(d.id);
      eventi.push(
        `👶 ${d.nome} aspetta un bambino: congedo di ${SOGLIE.maternita.mesiCongedo} mesi. ` +
        `L'INPS copre gran parte del costo, ma in ${d.ruolo === "cuoco" || d.ruolo === "chef" ? "cucina" : "sala"} manca una persona: pensa a un sostituto.`
      );
      continue;
    }

    // ── Il giovane che vuole crescere
    const eGiovane = (d.eta ?? 30) <= SOGLIE.giovane.etaMax;
    const pazienza = ha(d, "ambizioso") ? SOGLIE.giovane.mesiPazienzaAmbizioso : SOGLIE.giovane.mesiPazienza;
    if (eGiovane && !c.richiesta && c.mesiDallUltimoAumento >= pazienza && d.morale < 75) {
      c.richiesta = {
        tipo: "crescita",
        superminimoRichiesto: Math.round((d.superminimo + SOGLIE.giovane.aumentoChiesto) * 100) / 100,
        mesiResidui: SOGLIE.giovane.scadenzaRichiesta,
      };
      eventi.push(
        `📈 ${d.nome} (${d.eta} anni) chiede di crescere: +${Math.round(SOGLIE.giovane.aumentoChiesto * 100)}% o più responsabilità. ` +
        `Ha dato tanto accettando poco: se non arriva niente entro ${SOGLIE.giovane.scadenzaRichiesta} mesi, va altrove.`
      );
    }

    // ── Chi ha famiglia chiede solo quando il costo della vita morde
    if (conFamiglia(d) && !c.richiesta && c.inflazioneCumulataDaAumento >= SOGLIE.adeguamento.inflazioneScatto) {
      c.richiesta = {
        tipo: "adeguamento",
        superminimoRichiesto: Math.round(d.superminimo * (1 + c.inflazioneCumulataDaAumento) * 100) / 100,
        mesiResidui: SOGLIE.adeguamento.scadenzaRichiesta,
      };
      eventi.push(
        `💶 ${d.nome} chiede un adeguamento: dall'ultimo aumento i prezzi sono saliti del ` +
        `${(c.inflazioneCumulataDaAumento * 100).toFixed(1)}% e a casa non si arriva più a fine mese. ` +
        `Non è ambizione: è la spesa.`
      );
    }

    // ── Richieste pendenti: la pazienza si consuma
    if (c.richiesta) {
      c.richiesta.mesiResidui--;
      if (c.richiesta.mesiResidui <= 0) {
        if (c.richiesta.tipo === "crescita") {
          dimissionari.push(d);
          eventi.push(`👋 ${d.nome} se ne va: ha trovato un posto dove crescere. I giovani non aspettano.`);
        } else {
          // chi ha famiglia non molla: resta, ma il rapporto si incrina
          d.morale = Math.max(10, d.morale - 25);
          eventi.push(`😔 ${d.nome} non se ne va — con la famiglia non può permetterselo — ma qualcosa si è rotto. Morale a picco.`);
          c.richiesta = undefined;
          c.inflazioneCumulataDaAumento = 0; // il conto riparte, la ferita resta
        }
      }
    }

    // ── Il veterano: l'età si fa sentire, piano
    if ((d.eta ?? 30) >= SOGLIE.veterano.etaMin && c.mesiInServizio % SOGLIE.veterano.calaResistenzaOgniMesi === 0) {
      d.attributi.resistenza = Math.max(3, d.attributi.resistenza - 1);
    }
  }

  return { eventi, dimissionari, inCongedo };
}

/** Costo azienda ridotto per chi è in congedo (l'INPS copre il resto). */
export const QUOTA_COSTO_CONGEDO = SOGLIE.maternita.quotaCostoAzienda;