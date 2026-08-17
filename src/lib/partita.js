// Helper UI + servizi di gioco. Il motore gira nel client (base44/shared/engine);
// il server resta solo per il backup facoltativo. Nessuna schermata aspetta la rete.

import { base44 } from '@/api/base44Client';
import { gioco } from './gioco';
import { VERSIONE_STATO } from '../../base44/shared/engine/gioco';
import {
  OMI_ESEMPIO, generaBacheca, generaCatalogoDidattico, annuncioAConfigLocale,
} from '../../base44/shared/engine/immobili';
import {
  opzioniCommercialista, costiCostituzione, regoleCapitale, riepilogaCostituzione,
} from '../../base44/shared/engine/costituzione';
import { calcolaPianoCosti } from '../../base44/shared/engine/costi-avvio';
import { FISCAL_2026 } from '../../base44/shared/engine/fiscal-config';
import { mulberry32 } from './costituzione';

export const NOMI_MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
export const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function money(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function nomeMese(i) {
  const idx = ((Number(i) - 1) % 12 + 12) % 12;
  return NOMI_MESI[idx] ?? '';
}

// ─────────────────────────────────────────────── Entità (best-effort, offline-safe)

// Senza rete le chiamate resterebbero appese: 2s di pazienza, poi si prosegue
// coi fallback (OMI_ESEMPIO / undefined) senza errori a schermo.
function conTimeout(promise, ms = 2000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/** Quotazioni OMI dall'entità ZonaOmi se raggiungibile, fallback OMI_ESEMPIO. */
async function leggiZone(comune) {
  try {
    const righe = await conTimeout(base44.entities.ZonaOmi.list('zona', 200));
    const filtrate = comune ? righe.filter((z) => z.comune === comune) : righe;
    const zone = (filtrate.length ? filtrate : righe)
      .filter((z) => typeof z.affittoMin === 'number')
      .map((z) => ({
        comune: z.comune, provincia: z.provincia, zona: z.zona,
        descrizioneZona: z.descrizioneZona, tipologia: z.tipologia,
        posizioneCommerciale: z.posizioneCommerciale,
        venditaMin: z.venditaMin, venditaMax: z.venditaMax,
        affittoMin: z.affittoMin, affittoMax: z.affittoMax,
        semestre: z.semestre,
      }));
    return zone.length ? zone : OMI_ESEMPIO;
  } catch {
    return OMI_ESEMPIO;
  }
}

/** Fotografia Istat dall'entità DatiIstat; undefined se non raggiungibile (fallback del motore). */
async function leggiDatiIstat() {
  try {
    const righe = await conTimeout(base44.entities.DatiIstat.list('-salvatoIl', 1));
    const d = righe?.[0];
    if (!d || typeof d.inflazioneAnnua !== 'number') return undefined;
    return {
      inflazioneAnnua: d.inflazioneAnnua,
      inflazioneAlimentare: d.inflazioneAlimentare ?? d.inflazioneAnnua,
      fiduciaConsumatori: d.fiduciaConsumatori ?? 0.98,
      crescitaSalariAnnua: d.crescitaSalariAnnua ?? 0.012,
      fonte: d.fonte === 'istat' ? 'istat' : 'fallback',
      aggiornatoAl: d.aggiornatoAl ?? 'n/d',
    };
  } catch {
    return undefined;
  }
}

// ─────────────────────────────────────────────── Partita (storage locale)

/** Elenco con stato completo (per la dashboard di Home). Tutto locale. */
export async function listPartite() {
  const righe = await gioco.elenco();
  const full = await Promise.all(righe.map((r) => gioco.carica(r.id)));
  return full.filter(Boolean);
}

export async function getPartita(id) {
  return gioco.carica(id);
}

/**
 * Importa nell'elenco locale tutte le partite salvate sul server (entità Partita),
 * escludendo il record di backup globale. Ogni record diventa un salvataggio
 * giocabile: serve per recuperare una partita creata/giocata via backend.
 */
export async function importaPartiteCloud() {
  const righe = await base44.entities.Partita.list('-updated_date', 50);
  const reali = (righe ?? []).filter((r) => r.nome && r.nome !== '__cloud_backup__' && r.stato);
  let importate = 0;
  for (const r of reali) {
    const stato = { ...(r.stato || {}), __versione: VERSIONE_STATO };
    const sv = {
      id: r.id,
      nome: r.nome,
      versione: VERSIONE_STATO,
      turniGiocati: r.turni_giocati ?? 0,
      annoGioco: stato.annoGioco ?? 1,
      mese: stato.mese ?? 1,
      cassa: stato.tesoreria?.saldo ?? 0,
      reputazione: stato.reputazione ?? 0,
      gameOver: !!r.game_over,
      aggiornatoIl: r.updated_date ?? new Date().toISOString(),
      stato,
      ultimoReport: r.ultimo_report,
    };
    await gioco.salva(sv);
    importate++;
  }
  return importate;
}

export async function eliminaPartita(id) {
  return gioco.elimina(id);
}

// ─────────────────────────────────────────────── Costituzione (client-side)

/** I mattoni del wizard: stessa shape che restituiva la function, generata nel client. */
export async function preparaCostituzione(payload) {
  const seed = Number(payload.seed ?? Math.floor(Math.random() * 1e9));
  const forma = payload.forma ?? 'ditta_ordinaria';
  const budgetIniziale = Number(payload.budgetIniziale ?? 150_000);
  const meseInizio = Number(payload.meseInizio ?? 1);

  const zone = await leggiZone(payload.comune);

  const bacheca = generaBacheca(zone, {
    quanti: 8,
    budgetMax: budgetIniziale * 0.6,
    mqMin: payload.mqMin ? Number(payload.mqMin) : undefined,
    mqMax: payload.mqMax ? Number(payload.mqMax) : undefined,
    soloAffitto: !!payload.soloAffitto,
  }, mulberry32(seed));

  const pool = gioco.pool(seed, meseInizio);

  const catalogo = generaCatalogoDidattico(zone, {
    budget: budgetIniziale,
    mostraFuoriBudget: true,
    soloAffitto: false,
  }, mulberry32(seed ^ 0xcaca));

  return {
    seed, bacheca, catalogo, pool,
    commercialista: opzioniCommercialista(forma),
    costi: costiCostituzione(forma),
    regole: regoleCapitale(forma),
    comuni: [...new Set(zone.map((z) => z.comune))],
    fonteQuotazioni: zone === OMI_ESEMPIO ? 'seed' : 'entita',
  };
}

/** Crea la partita via servizio locale e ricostruisce l'esito per il riepilogo. */
export async function creaPartita(payload) {
  const seed = Number(payload.seed ?? Math.floor(Math.random() * 1e9));
  const datiIstat = await leggiDatiIstat();

  const config = {
    nomeRistorante: payload.nomeRistorante,
    forma: payload.forma ?? 'ditta_ordinaria',
    budgetIniziale: Number(payload.budgetIniziale ?? 150_000),
    annuncio: payload.annuncio,
    modalitaImmobile: payload.modalitaImmobile ?? 'affitto',
    assunzioniIniziali: payload.assunzioniIniziali ?? [],
    commercialista: payload.commercialista ?? 'studio_locale',
    capitaleSociale: payload.capitaleSociale !== undefined ? Number(payload.capitaleSociale) : undefined,
    stileLocale: payload.stileLocale ?? 'trattoria_classica',
    titolare: payload.titolare ?? { nome: 'Il Titolare', eta: 35, sesso: 'M' },
    macro: payload.macro ?? { fiduciaConsumatori: 0.98, crescitaSalariAnnua: 0.012, eventi: [] },
    annoCalendario: payload.annoCalendario ?? new Date().getFullYear(),
    meseInizio: payload.meseInizio,
    seed,
    datiIstat,
  };

  const sv = await gioco.crea(config, payload.nomeRistorante);
  const stato = sv.stato;

  // Riepilogo ricalcolato sui dipendenti che hanno davvero accettato (come la function).
  const forma = config.forma;
  const annuncio = config.annuncio ?? {};
  const modalita = config.modalitaImmobile;
  const piano = calcolaPianoCosti(annuncioAConfigLocale(annuncio, modalita));
  const canone = annuncio.canoneMensile ?? 0;
  const fissiSenzaAffitto = piano.mensili
    .filter((v) => !/Affitto locale/.test(v.voce))
    .reduce((s, v) => s + v.importo, 0);
  const costiFissiMensili = fissiSenzaAffitto + (modalita === 'affitto' ? canone : 0);
  const costiLocale = piano.totaleUnaTantum + (annuncio.avviamento ?? 0) + (modalita === 'affitto' ? canone * 3 : 0);
  const commercialista = opzioniCommercialista(forma).find((o) => o.id === config.commercialista)
    ?? opzioniCommercialista(forma)[1];
  const capitaleSociale = config.capitaleSociale !== undefined ? config.capitaleSociale : regoleCapitale(forma).minimo;
  const costoStaffMensile = (stato.staff ?? []).reduce(
    (s, d) => s + FISCAL_2026.ccnlLordoMensile[d.ruolo] * d.superminimo * 1.38, 0);
  const riepilogo = riepilogaCostituzione({
    forma, budgetIniziale: config.budgetIniziale, costiLocale, capitaleSociale, commercialista,
    costoStaffMensile, costiFissiMensili, fidoBase: FISCAL_2026.tesoreria.fidoDefault,
    ruoliBrigata: (stato.staff ?? []).map((d) => d.ruoloEsteso ?? d.ruolo),
  });

  return {
    partitaId: sv.id,
    cassa: stato.tesoreria?.saldo ?? 0,
    mese: stato.mese,
    annoGioco: stato.annoGioco,
    logCostituzione: stato.__logCostituzione ?? [],
    macroPartenza: stato.macroStato?.partenza ?? null,
    ...riepilogo,
  };
}

// ─────────────────────────────────────────────── Avanza turno (locale)

export async function avanzaTurno({ partitaId, decisioni }) {
  const { report, salvataggio } = await gioco.avanza(partitaId, decisioni ?? {});
  return { report, salvataggio, bandi: report?.bandi ?? null };
}