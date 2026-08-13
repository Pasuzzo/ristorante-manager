/**
 * CONTRATTI, ORE E BUSTA PAGA — le due primitive che sbloccano il resto.
 *
 * 1. LE ORE: ogni dipendente ha un monte ore settimanale diviso in
 *    feriale/festivo. Le ore contrattuali NON sono ore di servizio:
 *    mise en place, carico merce e pulizie si mangiano ~42% del tempo.
 * 2. LA BUSTA: da ore a lordo a netto a costo azienda, con la quota
 *    eventualmente non dichiarata tenuta separata.
 *
 * ⚠️ VALORI INDICATIVI 2026 (CCNL Pubblici Esercizi / Turismo, aliquote
 * INPS, scaglioni IRPEF). Stanno tutti in cima al file apposta: vanno
 * riverificati a ogni rinnovo contrattuale e Legge di Bilancio.
 */

import { FISCAL_2026, FiscalConfig } from "./fiscal-config.ts";

// ─────────────────────────────────────────────── Parametri

export const ORARIO = {
  oreSettimanaliFullTime: 40,
  /** ore mensili convenzionali per il calcolo della paga oraria */
  oreMensiliConvenzionali: 173,
  settimanePerMese: 4.333,
  /** quota delle ore contrattuali effettivamente passata in servizio */
  quotaOreProduttive: 0.58,
  maggiorazioneFestivo: 0.30,
  maggiorazioneStraordinario: 0.25,
  /** oltre queste ore settimanali scatta lo straordinario */
  sogliaStraordinario: 40,
} as const;

/** Lordo mensile full-time per ruolo esteso (14 mensilità). Indicativo. */
export const LORDO_FULLTIME: Record<string, number> = {
  lavapiatti: 1_550, commis: 1_620, runner: 1_600, cameriere: 1_700,
  barista: 1_700, chef_de_rang: 1_780, cuoco: 1_820, pizzaiolo: 1_880,
  pasticcere: 1_860, sommelier: 1_900, sous_chef: 1_920, maitre: 1_980,
  chef: 1_980, direttore: 2_150,
};

/** Coperti serviti per ORA DI SERVIZIO. I ruoli con 0 moltiplicano gli altri. */
export const COPERTI_ORA: Record<string, number> = {
  cameriere: 8, chef_de_rang: 6, maitre: 5, barista: 7, sommelier: 4, direttore: 4,
  runner: 0, cuoco: 13, chef: 16, sous_chef: 14, pizzaiolo: 15, pasticcere: 6,
  commis: 7, lavapiatti: 0,
};

const REPARTO_CUCINA = new Set(["lavapiatti", "commis", "cuoco", "chef", "sous_chef", "pizzaiolo", "pasticcere"]);
export const reparto = (ruolo: string): "cucina" | "sala" => (REPARTO_CUCINA.has(ruolo) ? "cucina" : "sala");

export const MOLTIPLICATORI = {
  /** ogni runner aggiunge il 30% alla capacità dei camerieri */
  runnerSuSala: 0.30,
  /** maitre e chef de rang alzano la resa della sala */
  maitreSuSala: 0.12,
  /** sopra questi coperti a servizio senza lavapiatti la cucina perde resa */
  copertiSenzaLavapiatti: 60,
  malusSenzaLavapiatti: 0.20,
} as const;

// ─────────────────────────────────────────────── Tipi di contratto

export type TipoContratto =
  | "indeterminato" | "determinato" | "apprendistato"
  | "intermittente" | "stagionale" | "somministrazione";

export interface RegoleContratto {
  etichetta: string;
  /** quota del minimo CCNL riconosciuta (apprendistato sotto-inquadrato) */
  quotaRetributiva: number;
  /** aliquota contributiva a carico azienda; sovrascrive quella standard */
  aliquotaDatore?: number;
  /** contributo addizionale NASpI sui contratti a termine */
  addizionale: number;
  /** margine dell'agenzia (solo somministrazione) */
  margineAgenzia: number;
  /** durata massima in mesi; undefined = nessun limite */
  durataMaxMesi?: number;
  /** matura TFR e ferie */
  maturaTfr: boolean;
  /** indennità di disponibilità sulle ore non lavorate (intermittente) */
  indennitaDisponibilita: number;
  /** costo di chiusura del rapporto, in mensilità di preavviso */
  mensilitaPreavviso: number;
  /** effetto sull'attaccamento: chi è precario si affeziona meno */
  moraleBase: number;
  nota: string;
}

export const CONTRATTI: Record<TipoContratto, RegoleContratto> = {
  indeterminato: {
    etichetta: "Tempo indeterminato", quotaRetributiva: 1, addizionale: 0,
    margineAgenzia: 0, maturaTfr: true, indennitaDisponibilita: 0,
    mensilitaPreavviso: 1, moraleBase: 8,
    nota: "Costa di più ed è difficile da sciogliere, ma è l'unico che tiene le persone.",
  },
  determinato: {
    etichetta: "Tempo determinato", quotaRetributiva: 1, addizionale: 0.014,
    margineAgenzia: 0, durataMaxMesi: 12, maturaTfr: true, indennitaDisponibilita: 0,
    mensilitaPreavviso: 0, moraleBase: 0,
    nota: "Scade da solo. Oltre i 12 mesi servono causali, e c'è un tetto sulla quota di organico.",
  },
  apprendistato: {
    etichetta: "Apprendistato", quotaRetributiva: 0.80, aliquotaDatore: 0.115,
    addizionale: 0, margineAgenzia: 0, durataMaxMesi: 36, maturaTfr: true,
    indennitaDisponibilita: 0, mensilitaPreavviso: 0.5, moraleBase: 4,
    nota: "Paghi molto meno, ma DEVI formarlo davvero: senza corsi non cresce e se ne va.",
  },
  intermittente: {
    etichetta: "A chiamata", quotaRetributiva: 1, addizionale: 0,
    margineAgenzia: 0, maturaTfr: true, indennitaDisponibilita: 0.20,
    mensilitaPreavviso: 0, moraleBase: -6,
    nota: "Lo chiami quando serve. Se pretendi che risponda sempre, paghi l'indennità anche quando sta a casa.",
  },
  stagionale: {
    etichetta: "Stagionale", quotaRetributiva: 1, addizionale: 0,
    margineAgenzia: 0, durataMaxMesi: 8, maturaTfr: true, indennitaDisponibilita: 0,
    mensilitaPreavviso: 0, moraleBase: 2,
    nota: "Finisce con la stagione, ma l'anno dopo ha diritto di precedenza: se l'hai trattato bene, torna.",
  },
  somministrazione: {
    etichetta: "Somministrazione", quotaRetributiva: 1, addizionale: 0,
    margineAgenzia: 0.22, maturaTfr: false, indennitaDisponibilita: 0,
    mensilitaPreavviso: 0, moraleBase: -10,
    nota: "Domani mattina è qui. Costa il margine dell'agenzia e non sai chi ti mandano.",
  },
};

// ─────────────────────────────────────────────── Orario

export interface Orario {
  oreFeriali: number;   // ore settimanali nei giorni feriali
  oreFestive: number;   // ore settimanali sabato/domenica/festivi
}

export const oreSettimanali = (o: Orario) => o.oreFeriali + o.oreFestive;

/** Ore effettivamente passate in servizio (il resto è prep, carico, pulizie). */
export const oreProduttive = (o: Orario) => oreSettimanali(o) * ORARIO.quotaOreProduttive;

export interface Lavoratore {
  id: string;
  nome: string;
  ruolo: string;
  contratto: TipoContratto;
  orario: Orario;
  /** 1 = minimo CCNL, 1.15 = +15% */
  superminimo: number;
  /** frazione delle ore reali NON messa in busta (0 = tutto dichiarato) */
  quotaNero: number;
  /** attributo velocità 1-20: scala la resa oraria */
  velocita: number;
  morale: number;
}

// ─────────────────────────────────────────────── Capacità e fabbisogno

export interface Capacita {
  copertiSettimana: number;
  cucina: number;
  sala: number;
  /** il reparto che fa da collo di bottiglia */
  collo: "cucina" | "sala";
  avvisi: string[];
}

/** Quanti coperti regge questa squadra, con queste ore, in una settimana. */
export function capacitaSquadra(staff: Lavoratore[], copertiPrevisti = 0): Capacita {
  const avvisi: string[] = [];
  let cucina = 0, sala = 0, runner = 0, maitre = 0, lavapiatti = 0;

  for (const d of staff) {
    const ore = oreProduttive(d.orario);
    const resa = (COPERTI_ORA[d.ruolo] ?? 5) * (0.6 + 0.4 * (d.velocita / 15)) * (0.75 + 0.25 * (d.morale / 100));
    if (d.ruolo === "runner") runner += ore;
    else if (d.ruolo === "lavapiatti") lavapiatti += ore;
    else if (d.ruolo === "maitre" || d.ruolo === "chef_de_rang") { maitre += ore; sala += ore * resa; }
    else if (reparto(d.ruolo) === "cucina") cucina += ore * resa;
    else sala += ore * resa;
  }

  sala *= 1 + Math.min(0.6, (runner / Math.max(1, sala / 8)) * MOLTIPLICATORI.runnerSuSala);
  if (maitre > 0) sala *= 1 + MOLTIPLICATORI.maitreSuSala;

  const copertiPerServizio = copertiPrevisti / 12; // ~12 servizi a settimana
  if (lavapiatti === 0 && copertiPerServizio > MOLTIPLICATORI.copertiSenzaLavapiatti) {
    cucina *= 1 - MOLTIPLICATORI.malusSenzaLavapiatti;
    avvisi.push("Nessun lavapiatti sopra i 60 coperti a servizio: la cucina perde il 20% di resa.");
  }
  if (cucina === 0) avvisi.push("Nessuno in cucina: non si serve un piatto.");
  if (sala === 0) avvisi.push("Nessuno in sala: i clienti entrano e non trovano nessuno.");

  const copertiSettimana = Math.floor(Math.min(cucina, sala));
  return {
    copertiSettimana, cucina: Math.floor(cucina), sala: Math.floor(sala),
    collo: cucina <= sala ? "cucina" : "sala", avvisi,
  };
}

export interface Fabbisogno {
  copertiPrevisti: number;
  capacita: number;
  gapCoperti: number;
  /** ore contrattuali da aggiungere per chiudere il buco, per reparto */
  oreMancantiCucina: number;
  oreMancantiSala: number;
  stato: "sotto_organico" | "giusto" | "sovradimensionato";
}

/** Confronta la domanda prevista con quello che la squadra regge. */
export function fabbisogno(staff: Lavoratore[], copertiPrevisti: number): Fabbisogno {
  const cap = capacitaSquadra(staff, copertiPrevisti);
  const gap = copertiPrevisti - cap.copertiSettimana;
  // resa media di riferimento per convertire coperti mancanti in ore contrattuali
  const resaCucina = 13 * ORARIO.quotaOreProduttive;
  const resaSala = 8 * ORARIO.quotaOreProduttive;
  return {
    copertiPrevisti, capacita: cap.copertiSettimana, gapCoperti: gap,
    oreMancantiCucina: gap > 0 ? Math.ceil(Math.max(0, copertiPrevisti - cap.cucina) / resaCucina) : 0,
    oreMancantiSala: gap > 0 ? Math.ceil(Math.max(0, copertiPrevisti - cap.sala) / resaSala) : 0,
    stato: gap > copertiPrevisti * 0.05 ? "sotto_organico"
         : cap.copertiSettimana > copertiPrevisti * 1.35 ? "sovradimensionato" : "giusto",
  };
}

// ─────────────────────────────────────────────── Busta paga

export interface BustaPaga {
  oreDichiarate: number;
  oreNonDichiarate: number;
  lordo: number;
  contributiDipendente: number;
  imponibileFiscale: number;
  irpef: number;
  addizionali: number;
  detrazioni: number;
  nettoInBusta: number;
  /** contante fuori busta: esce dal portafoglio nero, non è deducibile */
  cashNero: number;
  /** quello che il lavoratore porta a casa in tutto */
  nettoTotale: number;
  /** quello che l'azienda spende in tutto */
  costoAzienda: number;
  ratei: number; // 13ª/14ª + TFR accantonati nel mese
}

/** Detrazione da lavoro dipendente, annua. Approssimazione indicativa. */
function detrazioneAnnua(redditoAnnuo: number): number {
  if (redditoAnnuo <= 15_000) return Math.max(690, 1_955);
  if (redditoAnnuo <= 28_000) return 1_910 + 1_190 * ((28_000 - redditoAnnuo) / 13_000);
  if (redditoAnnuo <= 50_000) return 1_910 * ((50_000 - redditoAnnuo) / 22_000);
  return 0;
}

function irpefLorda(imponibile: number, cfg: FiscalConfig): number {
  let residuo = Math.max(0, imponibile), prec = 0, imposta = 0;
  for (const s of cfg.irpef.scaglioni) {
    const quota = Math.min(residuo, s.fino - prec);
    if (quota <= 0) break;
    imposta += quota * s.aliquota;
    residuo -= quota;
    prec = s.fino;
  }
  return imposta;
}

/**
 * Busta paga del mese. `oreRealiSettimana` sono le ore davvero lavorate:
 * la quota non dichiarata è la differenza tra queste e quelle in busta.
 */
export function bustaPaga(
  d: Lavoratore,
  oreRealiSettimana = oreSettimanali(d.orario),
  cfg: FiscalConfig = FISCAL_2026
): BustaPaga {
  const R = CONTRATTI[d.contratto];
  const lordoFT = (LORDO_FULLTIME[d.ruolo] ?? 1_700) * d.superminimo * R.quotaRetributiva;
  const pagaOraria = lordoFT / ORARIO.oreMensiliConvenzionali;

  const oreRealiMese = oreRealiSettimana * ORARIO.settimanePerMese;
  const oreDichiarate = oreRealiMese * (1 - d.quotaNero);
  const oreNonDichiarate = oreRealiMese - oreDichiarate;

  // straordinario e maggiorazione festiva sulla parte dichiarata
  const quotaFestiva = oreSettimanali(d.orario) > 0 ? d.orario.oreFestive / oreSettimanali(d.orario) : 0;
  const oreExtra = Math.max(0, oreRealiSettimana - ORARIO.sogliaStraordinario) * ORARIO.settimanePerMese * (1 - d.quotaNero);
  const lordo =
    pagaOraria * oreDichiarate * (1 + quotaFestiva * ORARIO.maggiorazioneFestivo) +
    pagaOraria * oreExtra * ORARIO.maggiorazioneStraordinario +
    (d.contratto === "intermittente" ? pagaOraria * oreDichiarate * R.indennitaDisponibilita : 0);

  const contributiDipendente = lordo * 0.0919;
  const imponibileFiscale = lordo - contributiDipendente;
  const annuo = imponibileFiscale * cfg.inps.dipendenti.mensilita;
  const detrazioni = detrazioneAnnua(annuo) / cfg.inps.dipendenti.mensilita;
  const irpef = Math.max(0, irpefLorda(annuo, cfg) / cfg.inps.dipendenti.mensilita - detrazioni);
  const addizionali = imponibileFiscale * cfg.irpef.addizionaliFlat;
  const nettoInBusta = imponibileFiscale - irpef - addizionali;

  // fuori busta: il lavoratore riceve contante pari al netto orario equivalente
  const nettoOrario = oreDichiarate > 0 ? nettoInBusta / oreDichiarate : pagaOraria * 0.72;
  const cashNero = nettoOrario * oreNonDichiarate;

  const aliquotaDatore = R.aliquotaDatore ?? cfg.inps.dipendenti.aliquotaDatore;
  const ratei = R.maturaTfr
    ? lordo * (cfg.inps.dipendenti.tfr + (cfg.inps.dipendenti.mensilita - 12) / 12)
    : 0;
  const costoAzienda =
    lordo * (1 + aliquotaDatore + cfg.inps.dipendenti.inail + R.addizionale) * (1 + R.margineAgenzia) +
    ratei + cashNero;

  return {
    oreDichiarate, oreNonDichiarate, lordo, contributiDipendente, imponibileFiscale,
    irpef, addizionali, detrazioni, nettoInBusta, cashNero,
    nettoTotale: nettoInBusta + cashNero, costoAzienda, ratei,
  };
}

// ─────────────────────────────────────────────── Self-check

export function demo(): void {
  const base = (p: Partial<Lavoratore>): Lavoratore => ({
    id: "x", nome: "Test", ruolo: "cameriere", contratto: "indeterminato",
    orario: { oreFeriali: 24, oreFestive: 16 }, superminimo: 1, quotaNero: 0,
    velocita: 12, morale: 70, ...p,
  });

  const full = bustaPaga(base({}));
  console.assert(full.nettoInBusta < full.lordo, "netto deve essere < lordo");
  console.assert(full.costoAzienda > full.lordo, "costo azienda deve essere > lordo");

  const appr = bustaPaga(base({ contratto: "apprendistato" }));
  console.assert(appr.costoAzienda < full.costoAzienda, "apprendista deve costare meno");

  const somm = bustaPaga(base({ contratto: "somministrazione" }));
  console.assert(somm.costoAzienda > full.costoAzienda, "somministrazione deve costare di più");

  const meta = bustaPaga(base({ quotaNero: 0.5 }));
  console.assert(meta.costoAzienda < full.costoAzienda, "metà in nero deve costare meno all'azienda");
  console.assert(meta.nettoTotale > full.nettoTotale * 0.95, "il lavoratore in nero prende di più netto");
  console.assert(meta.cashNero > 0 && meta.oreNonDichiarate > 0, "deve risultare la quota non dichiarata");

  const squadra = [
    base({ id: "1", ruolo: "cuoco", velocita: 13 }),
    base({ id: "2", ruolo: "cameriere" }),
    base({ id: "3", ruolo: "cameriere" }),
  ];
  const cap = capacitaSquadra(squadra, 400);
  console.assert(cap.copertiSettimana > 0, "una squadra completa deve servire");
  console.assert(capacitaSquadra([squadra[1]]).copertiSettimana === 0, "senza cucina la capacità è zero");

  const f = fabbisogno(squadra, cap.copertiSettimana * 2);
  console.assert(f.stato === "sotto_organico" && f.gapCoperti > 0, "il doppio della capacità = sotto organico");
  console.log("contratti.ts — self-check OK");
}

if (import.meta.url === `file://${process.argv[1]}`) demo();