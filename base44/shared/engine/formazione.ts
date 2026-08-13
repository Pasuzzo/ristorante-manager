/**
 * FORMAZIONE — obbligatoria, professionalizzante, di aggiornamento.
 *
 * Il costo vero non sono i soldi: sono le ORE. Chi è in aula non è in
 * cucina. Formare tre persone a maggio significa aprire la stagione
 * sotto organico.
 *
 * ⚠️ DURATE E SOGLIE INDICATIVE. La materia cambia spesso (l'antincendio
 * è stato riformato di recente) e l'HACCP è disciplinato a livello
 * regionale. Valori raccolti qui, in un punto solo, per essere corretti
 * senza toccare la logica.
 */

export type TipoCorso = "obbligatorio" | "professionalizzante" | "aggiornamento";

export interface Corso {
  id: string;
  nome: string;
  tipo: TipoCorso;
  /** ore d'aula, sottratte al monte ore del dipendente */
  ore: number;
  /** costo a persona */
  costo: number;
  /** ogni quanti mesi va rinnovato (0 = mai) */
  validitaMesi: number;
  /** serve a tutti, o solo a una figura? */
  destinatari: "tutti" | "alimentaristi" | "titolare" | "una_persona";
  /** scatta solo sopra questo numero di dipendenti regolari */
  sogliaDipendenti?: number;
  /** attributi migliorati (solo professionalizzanti) */
  migliora?: Partial<Record<"tecnica" | "velocita" | "cortesia" | "resistenza" | "esperienza", number>>;
  nota?: string;
}

export const CORSI: Corso[] = [
  // ── Obbligatori
  { id: "sicurezza_generale", nome: "Sicurezza sul lavoro — generale", tipo: "obbligatorio", ore: 4, costo: 60, validitaMesi: 0, destinatari: "tutti" },
  { id: "sicurezza_specifica", nome: "Sicurezza — rischio medio (ristorazione)", tipo: "obbligatorio", ore: 8, costo: 110, validitaMesi: 60, destinatari: "tutti" },
  { id: "haccp", nome: "HACCP alimentaristi", tipo: "obbligatorio", ore: 8, costo: 90, validitaMesi: 36, destinatari: "alimentaristi", nota: "Durata e validità variano per regione." },
  { id: "antincendio", nome: "Antincendio (livello 2)", tipo: "obbligatorio", ore: 8, costo: 150, validitaMesi: 60, destinatari: "una_persona" },
  { id: "primo_soccorso", nome: "Primo soccorso (gruppo B)", tipo: "obbligatorio", ore: 12, costo: 180, validitaMesi: 36, destinatari: "una_persona" },
  { id: "rspp_datore", nome: "RSPP datore di lavoro", tipo: "obbligatorio", ore: 32, costo: 550, validitaMesi: 60, destinatari: "titolare" },
  { id: "preposto", nome: "Preposto", tipo: "obbligatorio", ore: 8, costo: 160, validitaMesi: 24, destinatari: "una_persona", sogliaDipendenti: 3 },
  { id: "rls", nome: "RLS — rappresentante dei lavoratori", tipo: "obbligatorio", ore: 32, costo: 480, validitaMesi: 12, destinatari: "una_persona", sogliaDipendenti: 15 },

  // ── Professionalizzanti
  { id: "cucina_base", nome: "Tecniche di cucina", tipo: "professionalizzante", ore: 24, costo: 700, validitaMesi: 0, destinatari: "una_persona", migliora: { tecnica: 3 } },
  { id: "pasticceria", nome: "Pasticceria da ristorazione", tipo: "professionalizzante", ore: 20, costo: 850, validitaMesi: 0, destinatari: "una_persona", migliora: { tecnica: 2, esperienza: 1 } },
  { id: "sala_servizio", nome: "Servizio di sala e accoglienza", tipo: "professionalizzante", ore: 16, costo: 450, validitaMesi: 0, destinatari: "una_persona", migliora: { cortesia: 3 } },
  { id: "sommellerie", nome: "Sommellerie primo livello", tipo: "professionalizzante", ore: 30, costo: 900, validitaMesi: 0, destinatari: "una_persona", migliora: { cortesia: 2, esperienza: 2 } },
  { id: "organizzazione", nome: "Organizzazione della brigata", tipo: "professionalizzante", ore: 16, costo: 600, validitaMesi: 0, destinatari: "una_persona", migliora: { velocita: 2, esperienza: 2 } },
  { id: "lingue", nome: "Inglese per la ristorazione", tipo: "professionalizzante", ore: 20, costo: 380, validitaMesi: 0, destinatari: "una_persona", migliora: { cortesia: 2 } },
];

export const getCorso = (id: string) => CORSI.find((c) => c.id === id);

// ─────────────────────────────────────────────── Stato

export interface StatoFormazione {
  /** id dipendente -> { idCorso: mese assoluto in cui scade (0 = non scade) } */
  certificazioni: Record<string, Record<string, number>>;
  /** corsi in svolgimento: id dipendente -> { idCorso, mesiResidui } */
  inCorso: Record<string, { idCorso: string; mesiResidui: number }>;
  /** mese assoluto corrente, per gestire le scadenze */
  meseAssoluto: number;
}

export function nuovoStatoFormazione(): StatoFormazione {
  return { certificazioni: {}, inCorso: {}, meseAssoluto: 0 };
}

// ─────────────────────────────────────────────── Obblighi

export interface Obbligo {
  corso: Corso;
  /** quante persone dovrebbero averlo e non ce l'hanno */
  mancanti: number;
  /** true se qualcuno l'ha ma è scaduto */
  scaduto: boolean;
  costoTotale: number;
  oreTotali: number;
}

const RUOLI_ALIMENTARISTI = new Set(["lavapiatti", "commis", "cuoco", "chef", "sous_chef", "pizzaiolo", "pasticcere"]);

/** Cosa manca per essere in regola, oggi. */
export function verificaObblighi(
  staff: Array<{ id: string; ruolo: string; inRegola: boolean }>,
  st: StatoFormazione
): Obbligo[] {
  const regolari = staff.filter((d) => d.inRegola);
  const out: Obbligo[] = [];

  for (const c of CORSI.filter((x) => x.tipo === "obbligatorio")) {
    if (c.sogliaDipendenti && regolari.length < c.sogliaDipendenti) continue;

    let destinatari: string[] = [];
    if (c.destinatari === "tutti") destinatari = regolari.map((d) => d.id);
    else if (c.destinatari === "alimentaristi") destinatari = regolari.filter((d) => RUOLI_ALIMENTARISTI.has(d.ruolo)).map((d) => d.id);
    else if (c.destinatari === "titolare") destinatari = ["__titolare__"];
    else destinatari = regolari.length ? [regolari[0].id] : [];

    let mancanti = 0;
    let scaduto = false;
    for (const id of destinatari) {
      const scadenza = st.certificazioni[id]?.[c.id];
      if (scadenza === undefined) mancanti++;
      else if (c.validitaMesi > 0 && scadenza <= st.meseAssoluto) { mancanti++; scaduto = true; }
    }
    if (mancanti > 0) {
      out.push({ corso: c, mancanti, scaduto, costoTotale: c.costo * mancanti, oreTotali: c.ore * mancanti });
    }
  }
  return out;
}

/** Quanto pesa in un'ispezione non essere in regola con la formazione. */
export function gravitaObblighi(obblighi: Obbligo[]): number {
  if (!obblighi.length) return 0;
  const persone = obblighi.reduce((s, o) => s + o.mancanti, 0);
  return Math.min(1, persone * 0.12 + obblighi.filter((o) => o.scaduto).length * 0.1);
}

// ─────────────────────────────────────────────── Iscrizioni e avanzamento

export interface IscrizioneCorso {
  idDipendente: string;
  idCorso: string;
}

export interface EsitoFormazione {
  costo: number;
  /** ore d'aula sottratte questo mese, per dipendente */
  oreSottratte: Record<string, number>;
  eventi: string[];
  /** attributi da migliorare a corso finito: id -> { attributo: delta } */
  miglioramenti: Record<string, Record<string, number>>;
}

/** Un corso occupa il dipendente per il mese in cui si svolge. */
export function avanzaFormazione(
  st: StatoFormazione,
  iscrizioni: IscrizioneCorso[],
  staff: Array<{ id: string; nome: string }>,
  rng: () => number
): EsitoFormazione {
  const eventi: string[] = [];
  const oreSottratte: Record<string, number> = {};
  const miglioramenti: Record<string, Record<string, number>> = {};
  let costo = 0;
  st.meseAssoluto++;

  // ── Nuove iscrizioni
  for (const i of iscrizioni) {
    const c = getCorso(i.idCorso);
    if (!c || st.inCorso[i.idDipendente]) continue;
    st.inCorso[i.idDipendente] = { idCorso: c.id, mesiResidui: c.ore > 20 ? 2 : 1 };
    costo += c.costo;
    const nome = staff.find((d) => d.id === i.idDipendente)?.nome ?? "il titolare";
    eventi.push(`🎓 ${nome} iscritto a "${c.nome}": ${c.ore}h d'aula, ${c.costo}€.`);
  }

  // ── Corsi in svolgimento
  for (const [id, ic] of Object.entries(st.inCorso)) {
    const c = getCorso(ic.idCorso);
    if (!c) { delete st.inCorso[id]; continue; }
    oreSottratte[id] = c.ore / Math.max(1, ic.mesiResidui);
    ic.mesiResidui--;
    if (ic.mesiResidui <= 0) {
      if (!st.certificazioni[id]) st.certificazioni[id] = {};
      st.certificazioni[id][c.id] = c.validitaMesi > 0 ? st.meseAssoluto + c.validitaMesi : 0;
      if (c.migliora) miglioramenti[id] = { ...c.migliora };
      const nome = staff.find((d) => d.id === id)?.nome ?? "Il titolare";
      eventi.push(`✅ ${nome} ha completato "${c.nome}".`);
      delete st.inCorso[id];
    }
  }

  return { costo, oreSottratte, eventi, miglioramenti };
}

/**
 * Autoformazione: gli ambiziosi si pagano un corso da soli. Migliorano,
 * e poi si aspettano un riconoscimento. Se non arriva, se ne vanno —
 * proprio quando valgono di più.
 */
export function autoformazione(
  staff: Array<{ id: string; nome: string; morale: number; tratti?: Array<{ id: string }>; attributi: any; carriera?: any }>,
  st: StatoFormazione,
  rng: () => number
): { eventi: string[]; siSonoFormati: string[] } {
  const eventi: string[] = [];
  const siSonoFormati: string[] = [];
  for (const d of staff) {
    const ambizioso = (d.tratti ?? []).some((t) => t.id === "ambizioso");
    if (!ambizioso || d.morale < 55 || st.inCorso[d.id]) continue;
    if (rng() > 0.04) continue;
    const c = CORSI.filter((x) => x.tipo === "professionalizzante")[Math.floor(rng() * 6)];
    if (!c) continue;
    if (!st.certificazioni[d.id]) st.certificazioni[d.id] = {};
    st.certificazioni[d.id][c.id] = 0;
    for (const [k, v] of Object.entries(c.migliora ?? {})) {
      d.attributi[k] = Math.min(20, (d.attributi[k] ?? 10) + (v as number));
    }
    siSonoFormati.push(d.id);
    eventi.push(
      `📚 ${d.nome} ha fatto "${c.nome}" per conto suo, pagandoselo. ` +
      `Ora vale di più e lo sa: se non arriva un riconoscimento, se ne va.`
    );
  }
  return { eventi, siSonoFormati };
}