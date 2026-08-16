/**
 * TURNI — la settimana si pianifica, non si dichiara.
 *
 * Sostituisce il monte ore: il giocatore decide quali servizi apre,
 * a che ora, chi lavora e a che ora arriva. Il monte ore diventa un
 * RISULTATO della griglia, non un input.
 *
 * Le due penalità sono il cuore:
 *  - arrivi troppo presto → ore pagate a girarsi i pollici
 *  - arrivi troppo tardi  → sala non pronta (apertura in ritardo) o
 *                           cucina non pronta (piatti fuori menu)
 */

// ─────────────────────────────────────────────── Finestre di servizio

export type Servizio = "pranzo" | "cena";

export const FINESTRE = {
  // `inizio` è quando il PERSONALE può entrare; l'apertura al pubblico è a parte
  pranzo: { inizio: 8, aperturaDefault: 12, finePubblico: 14.5, fine: 15 },
  cena: { inizio: 15.5, aperturaDefault: 19, finePubblico: 22, fine: 23.5 },
} as const;

/** Quota di domanda giornaliera che si presenta a pranzo (il resto a cena). */
export const QUOTA_PRANZO: Record<string, number> = {
  riviera: 0.38, citta: 0.45, paese: 0.35,
};

// ─────────────────────────────────────────────── Coperti per servizio

/**
 * Quanti coperti copre un ruolo in UN servizio senza andare sotto
 * organico. È il numero che si mostra al giocatore nella scheda:
 * "copre 17 coperti a servizio".
 * I ruoli a 0 non servono direttamente ma moltiplicano gli altri.
 */
export const COPERTI_SERVIZIO: Record<string, number> = {
  // sala
  cameriere: 22, chef_de_rang: 18, maitre: 12, sommelier: 14,
  barista: 30, runner: 0, direttore: 10,
  // cucina
  chef: 40, sous_chef: 34, cuoco: 30, pizzaiolo: 45,
  commis: 16, pasticcere: 0, lavapiatti: 0,
};

export const MODIFICATORI = {
  /** ogni runner aggiunge questi coperti a OGNI cameriere in turno */
  runnerSuCameriere: 8,
  /** sopra questi coperti a servizio, senza lavapiatti la cucina perde resa */
  sogliaLavapiatti: 45,
  malusSenzaLavapiatti: 0.25,
  /** il dehors costa passi: taglia la resa della sala */
  malusDehors: 0.08,
  /** menu complesso: taglia la resa della cucina (0 = semplice, 1 = molto complesso) */
  malusComplessitaMenu: 0.22,
  /** sopra questa quota di saturazione il servizio degrada */
  sogliaDegrado: 1.0,
  /** oltre questa si respingono clienti */
  sogliaRifiuto: 1.15,
} as const;

const CUCINA = new Set(["lavapiatti", "commis", "cuoco", "chef", "sous_chef", "pizzaiolo", "pasticcere"]);
export const repartoDi = (ruolo: string): "cucina" | "sala" => (CUCINA.has(ruolo) ? "cucina" : "sala");

/** Coperti effettivi di una persona: la tabella pesata sulla sua velocità. */
export function copertiEffettivi(ruolo: string, velocita: number, morale: number): number {
  const base = COPERTI_SERVIZIO[ruolo] ?? 15;
  return base * (0.55 + 0.45 * (velocita / 20)) * (0.85 + 0.15 * (morale / 100));
}

// ─────────────────────────────────────────────── Preparazione

/**
 * Ore-persona necessarie PRIMA dell'apertura. Non è un tempo fisso:
 * scala con i coperti attesi e, in cucina, con la complessità del menu.
 */
export function fabbisognoPreparazione(
  copertiAttesi: number,
  complessitaMenu = 0.4
): { cucina: number; sala: number } {
  return {
    cucina: Math.max(1.5, copertiAttesi / 12) * (0.85 + 0.35 * complessitaMenu),
    sala: Math.max(0.75, copertiAttesi / 25),
  };
}

// ─────────────────────────────────────────────── La griglia

export interface TurnoPersona {
  idDipendente: string;
  /** ora di arrivo in formato decimale: 10.5 = 10:30 */
  oraArrivo: number;
  /** ora di uscita; se assente si assume la fine finestra */
  oraUscita?: number;
}

export interface ServizioPianificato {
  aperto: boolean;
  /** ora di apertura al pubblico */
  oraApertura: number;
  turni: TurnoPersona[];
}

export interface GiornoPianificato {
  pranzo: ServizioPianificato;
  cena: ServizioPianificato;
}

/** Settimana tipo: indice 0 = domenica, 6 = sabato. */
export type Griglia = GiornoPianificato[];

/** Arrivi di default per ruolo, in ore prima dell'apertura. */
export const ANTICIPO_DEFAULT: Record<"cucina" | "sala", number> = { cucina: 3, sala: 1.5 };

export function grigliaVuota(): Griglia {
  return Array.from({ length: 7 }, () => ({
    pranzo: { aperto: false, oraApertura: FINESTRE.pranzo.aperturaDefault, turni: [] },
    cena: { aperto: true, oraApertura: FINESTRE.cena.aperturaDefault, turni: [] },
  }));
}

/** Griglia sensata di partenza: chiuso il lunedì, cene tutti i giorni. */
export function grigliaIniziale(
  staff: Array<{ id: string; ruolo: string }>,
  giornoChiusura = 1,
): Griglia {
  const g = grigliaVuota();
  const cucina = staff.filter((d) => repartoDi(d.ruolo) === "cucina");
  const sala = staff.filter((d) => repartoDi(d.ruolo) !== "cucina");
  const pranziWeekend = staff.length >= 5;
  const giorniChiusi = new Set<number>([giornoChiusura]);
  if (cucina.length < 2) giorniChiusi.add((giornoChiusura + 1) % 7);
  let giro = 0;

  for (let dow = 0; dow < 7; dow++) {
    const chiuso = giorniChiusi.has(dow);
    for (const s of ["pranzo", "cena"] as Servizio[]) {
      const sp = g[dow][s];
      sp.aperto = !chiuso && (s === "cena" || (pranziWeekend && (dow === 0 || dow === 6)));
      if (!sp.aperto) { sp.turni = []; continue; }
      // A ogni servizio va solo chi serve, a rotazione: mettere tutti in
      // tutti i turni significa pagare straordinari e tenere gente ferma.
      const nCucina = Math.min(cucina.length, s === "cena" ? 2 : 1);
      const nSala = Math.min(sala.length, s === "cena" ? 2 : 1);
      const scelti = [
        ...Array.from({ length: nCucina }, (_, k) => cucina[(giro + k) % Math.max(1, cucina.length)]),
        ...Array.from({ length: nSala }, (_, k) => sala[(giro + k) % Math.max(1, sala.length)]),
      ].filter(Boolean);
      giro++;
      sp.turni = scelti.map((d) => ({
        idDipendente: d.id,
        oraArrivo: sp.oraApertura - ANTICIPO_DEFAULT[repartoDi(d.ruolo)],
      }));
    }
  }
  return g;
}

// ─────────────────────────────────────────────── Valutazione di un servizio

export interface PersonaInTurno {
  id: string;
  nome: string;
  ruolo: string;
  velocita: number;
  resistenza: number;
  morale: number;
}

export interface EsitoServizio {
  aperto: boolean;
  /** coperti che il servizio è in grado di reggere */
  capacita: number;
  /** ore-persona di preparazione fatte contro quelle necessarie */
  preparazioneCucina: number; // 1 = giusta, <1 in ritardo, >1 in anticipo
  preparazioneSala: number;
  /** minuti di ritardo sull'apertura */
  ritardoApertura: number;
  /** piatti tolti dal menu perché non pronti (0-3) */
  piattiFuori: number;
  /** ore pagate senza produrre niente */
  oreSprecate: number;
  /** ore lavorate totali (entrano nel monte ore e nella busta) */
  oreLavorate: Record<string, number>;
  /** moltiplicatore sul gradimento del servizio */
  moltGradimento: number;
  eventi: string[];
}

export function valutaServizio(
  sp: ServizioPianificato,
  servizio: Servizio,
  personale: PersonaInTurno[],
  copertiAttesi: number,
  opt: { complessitaMenu?: number; haDehors?: boolean } = {}
): EsitoServizio {
  const eventi: string[] = [];
  const oreLavorate: Record<string, number> = {};
  if (!sp.aperto) {
    return { aperto: false, capacita: 0, preparazioneCucina: 1, preparazioneSala: 1,
      ritardoApertura: 0, piattiFuori: 0, oreSprecate: 0, oreLavorate, moltGradimento: 1, eventi };
  }

  const F = FINESTRE[servizio];
  const inTurno = personale.filter((p) => sp.turni.some((t) => t.idDipendente === p.id));
  const fab = fabbisognoPreparazione(copertiAttesi, opt.complessitaMenu ?? 0.4);

  // ── Ore di preparazione effettivamente disponibili prima dell'apertura
  let prepCucina = 0, prepSala = 0, oreSprecate = 0;
  for (const t of sp.turni) {
    const p = inTurno.find((x) => x.id === t.idDipendente);
    if (!p) continue;
    const arrivo = Math.max(F.inizio, t.oraArrivo);
    const uscita = Math.min(F.fine, t.oraUscita ?? F.fine);
    oreLavorate[p.id] = (oreLavorate[p.id] ?? 0) + Math.max(0, uscita - arrivo);
    const orePrep = Math.max(0, sp.oraApertura - arrivo);
    if (repartoDi(p.ruolo) === "cucina") prepCucina += orePrep;
    else prepSala += orePrep;
  }

  const rapportoCucina = fab.cucina > 0 ? prepCucina / fab.cucina : 1;
  const rapportoSala = fab.sala > 0 ? prepSala / fab.sala : 1;

  // ── Troppo presto: ore pagate a vuoto
  for (const [reparto, rapporto, fabbisogno] of [
    ["cucina", rapportoCucina, fab.cucina], ["sala", rapportoSala, fab.sala],
  ] as Array<["cucina" | "sala", number, number]>) {
    if (rapporto > 1.3) {
      const sprecate = (rapporto - 1.3) * fabbisogno;
      oreSprecate += sprecate;
      if (sprecate > 1) {
        eventi.push(`⏳ ${reparto === "cucina" ? "La cucina" : "La sala"} è arrivata troppo presto: ` +
          `${sprecate.toFixed(1)} ore pagate a girarsi i pollici.`);
      }
    }
  }

  // ── Troppo tardi: conseguenze diverse per reparto
  let ritardoApertura = 0, piattiFuori = 0, moltGradimento = 1;
  if (rapportoSala < 1) {
    moltGradimento *= 0.85 + 0.15 * rapportoSala;
    if (rapportoSala < 0.7) {
      ritardoApertura = Math.round((1 - rapportoSala) * 60);
      eventi.push(`🚪 Sala non pronta: apertura in ritardo di ${ritardoApertura} minuti. ` +
        `I primi clienti trovano la porta chiusa.`);
    } else {
      eventi.push("🧹 Sala sistemata all'ultimo: si vede, e i clienti se ne accorgono.");
    }
  }
  if (rapportoCucina < 1) {
    moltGradimento *= 0.88 + 0.12 * rapportoCucina;
    if (rapportoCucina < 0.7) {
      piattiFuori = Math.min(3, Math.ceil((1 - rapportoCucina) * 5));
      eventi.push(`🍳 Preparazioni indietro: ${piattiFuori} piatti fuori dal menu ${servizio === "cena" ? "stasera" : "oggi"}.`);
      moltGradimento *= 1 - piattiFuori * 0.04;
    }
  }

  // ── Capacità del servizio
  let cucina = 0, sala = 0, runner = 0, camerieri = 0, lavapiatti = 0;
  for (const p of inTurno) {
    const c = copertiEffettivi(p.ruolo, p.velocita, p.morale);
    if (p.ruolo === "runner") runner++;
    else if (p.ruolo === "lavapiatti") lavapiatti++;
    else if (repartoDi(p.ruolo) === "cucina") cucina += c;
    else { sala += c; if (p.ruolo === "cameriere" || p.ruolo === "chef_de_rang") camerieri++; }
  }
  sala += runner * MODIFICATORI.runnerSuCameriere * camerieri;
  if (opt.haDehors) sala *= 1 - MODIFICATORI.malusDehors;
  cucina *= 1 - MODIFICATORI.malusComplessitaMenu * (opt.complessitaMenu ?? 0.4);
  if (lavapiatti === 0 && copertiAttesi > MODIFICATORI.sogliaLavapiatti) {
    cucina *= 1 - MODIFICATORI.malusSenzaLavapiatti;
    eventi.push("🧽 Nessun lavapiatti sopra i 45 coperti: la cucina rallenta.");
  }

  // il ritardo d'apertura toglie coperti alla fascia migliore
  let capacita = Math.floor(Math.min(cucina, sala));
  if (ritardoApertura > 0) capacita = Math.floor(capacita * (1 - ritardoApertura / 120));
  if (piattiFuori > 0) capacita = Math.floor(capacita * (1 - piattiFuori * 0.03));

  return { aperto: true, capacita, preparazioneCucina: rapportoCucina, preparazioneSala: rapportoSala,
    ritardoApertura, piattiFuori, oreSprecate, oreLavorate, moltGradimento, eventi };
}

// ─────────────────────────────────────────────── Vincoli di legge

export interface ViolazioneTurni {
  idDipendente: string;
  tipo: "riposo_giornaliero" | "riposo_settimanale" | "straordinario" | "turno_spezzato";
  messaggio: string;
  bloccante: boolean;
}

/** Controlla la griglia: 11 ore tra turni, 24 ore settimanali, straordinari. */
export function verificaVincoli(
  g: Griglia,
  personale: Array<{ id: string; nome: string; resistenza: number }>
): { violazioni: ViolazioneTurni[]; oreSettimanali: Record<string, number>; spezzati: Record<string, number> } {
  const violazioni: ViolazioneTurni[] = [];
  const oreSettimanali: Record<string, number> = {};
  const spezzati: Record<string, number> = {};

  for (const p of personale) {
    let giorniLavorati = 0;
    let ultimaUscita: number | null = null; // ora assoluta

    for (let dow = 0; dow < 7; dow++) {
      let lavoraOggi = false;
      let spezzatoOggi = 0;
      let primoArrivoOggi: number | null = null;
      let ultimaUscitaOggi: number | null = null;

      for (const s of ["pranzo", "cena"] as Servizio[]) {
        const sp = g[dow][s];
        if (!sp.aperto) continue;
        const t = sp.turni.find((x) => x.idDipendente === p.id);
        if (!t) continue;
        lavoraOggi = true;
        spezzatoOggi++;
        const F = FINESTRE[s];
        const arrivo = dow * 24 + Math.max(F.inizio, t.oraArrivo);
        const uscita = dow * 24 + Math.min(F.fine, t.oraUscita ?? F.fine);
        oreSettimanali[p.id] = (oreSettimanali[p.id] ?? 0) + Math.max(0, uscita - arrivo);
        if (primoArrivoOggi === null) primoArrivoOggi = arrivo;
        ultimaUscitaOggi = uscita;
      }

      // le 11 ore si contano tra la fine di UNA GIORNATA e l'inizio della successiva
      if (primoArrivoOggi !== null && ultimaUscita !== null && primoArrivoOggi - ultimaUscita < 11) {
        violazioni.push({
          idDipendente: p.id, tipo: "riposo_giornaliero", bloccante: true,
          messaggio: `${p.nome}: meno di 11 ore tra la chiusura della sera e il rientro del mattino dopo.`,
        });
      }
      if (ultimaUscitaOggi !== null) ultimaUscita = ultimaUscitaOggi;
      if (lavoraOggi) giorniLavorati++;
      if (spezzatoOggi === 2) spezzati[p.id] = (spezzati[p.id] ?? 0) + 1;
    }

    if (giorniLavorati >= 7) {
      violazioni.push({
        idDipendente: p.id, tipo: "riposo_settimanale", bloccante: true,
        messaggio: `${p.nome}: nessun giorno di riposo nella settimana.`,
      });
    }
    const ore = oreSettimanali[p.id] ?? 0;
    if (ore > 40) {
      violazioni.push({
        idDipendente: p.id, tipo: "straordinario", bloccante: false,
        messaggio: `${p.nome}: ${(ore - 40).toFixed(1)} ore di straordinario, con maggiorazione.`,
      });
    }
    if ((spezzati[p.id] ?? 0) >= 3) {
      violazioni.push({
        idDipendente: p.id, tipo: "turno_spezzato", bloccante: false,
        messaggio: `${p.nome}: ${spezzati[p.id]} turni spezzati in settimana. Dieci ore in piedi ` +
          `${(personale.find((x) => x.id === p.id)?.resistenza ?? 10) < 12 ? "sono troppe per lui" : "le regge, ma si accumulano"}.`,
      });
    }
  }
  return { violazioni, oreSettimanali, spezzati };
}

/** Stanchezza accumulata dai turni spezzati: più errori, più malattie. */
export function affaticamento(spezzatiSettimana: number, resistenza: number): number {
  if (spezzatiSettimana <= 1) return 0;
  return Math.max(0, (spezzatiSettimana - 1) * (1.4 - resistenza / 20) * 4);
}

// ─────────────────────────────────────────────── Self-check

export function demo(): void {
  const staff: PersonaInTurno[] = [
    { id: "c1", nome: "Cuoco", ruolo: "cuoco", velocita: 14, resistenza: 12, morale: 70 },
    { id: "s1", nome: "Cam1", ruolo: "cameriere", velocita: 14, resistenza: 12, morale: 70 },
    { id: "s2", nome: "Cam2", ruolo: "cameriere", velocita: 14, resistenza: 12, morale: 70 },
  ];
  const sp: ServizioPianificato = {
    aperto: true, oraApertura: 19,
    turni: [
      { idDipendente: "c1", oraArrivo: 17 },
      { idDipendente: "s1", oraArrivo: 18 },
      { idDipendente: "s2", oraArrivo: 18 },
    ],
  };
  const ok = valutaServizio(sp, "cena", staff, 40);
  console.assert(ok.capacita > 0, "un servizio con brigata deve avere capacità");
  console.assert(ok.ritardoApertura === 0, "con arrivi giusti non c'è ritardo");

  const tardi = valutaServizio({ ...sp, turni: sp.turni.map((t) => ({ ...t, oraArrivo: 18.9 })) }, "cena", staff, 60);
  console.assert(tardi.preparazioneCucina < 1, "arrivando tardi la cucina non è pronta");
  console.assert(tardi.piattiFuori > 0 || tardi.moltGradimento < 1, "arrivare tardi deve costare");

  const presto = valutaServizio({ ...sp, turni: sp.turni.map((t) => ({ ...t, oraArrivo: 14 })) }, "cena", staff, 20);
  console.assert(presto.oreSprecate > 0, "arrivare troppo presto deve sprecare ore");

  const g = grigliaIniziale([{ id: "c1", ruolo: "cuoco" }, { id: "s1", ruolo: "cameriere" }], 1);
  const v = verificaVincoli(g, [{ id: "c1", nome: "Cuoco", resistenza: 12 }, { id: "s1", nome: "Cam1", resistenza: 12 }]);
  console.assert(v.oreSettimanali["c1"] > 0, "la griglia deve produrre ore");
  console.log("turni.ts — self-check OK");
}

if (import.meta.url === `file://${process.argv[1]}`) demo();