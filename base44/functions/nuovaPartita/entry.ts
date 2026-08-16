// redeploy tick 5
/**
 * BACKEND FUNCTION — nuovaPartita
 * Crea una partita dalle scelte del wizard e la salva come entità.
 *
 * NOVITÀ: legge l'entità DatiIstat e passa la fotografia economica al
 * motore. I dati si CONGELANO nello stato: la partita non cambia regole
 * in corsa e il replay dal seed resta deterministico. Se l'entità è
 * vuota o illeggibile, il motore usa i suoi valori di ripiego e la
 * partita parte comunque.
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import { nuovaPartita } from "../../shared/engine/partita.ts";
import { calcolaPianoCosti } from "../../shared/engine/costi-avvio.ts";
import { annuncioAConfigLocale } from "../../shared/engine/immobili.ts";
import {
  opzioniCommercialista, regoleCapitale, riepilogaCostituzione,
} from "../../shared/engine/costituzione.ts";
import type { LivelloCommercialista } from "../../shared/engine/costituzione.ts";
import { FISCAL_2026 } from "../../shared/engine/fiscal-config.ts";
import type { FormaGiuridica } from "../../shared/engine/engine.ts";
import type { DatiPartenza } from "../../shared/engine/macro.ts";

/** Legge la fotografia Istat dall'entità. Non lancia mai. */
async function leggiDatiIstat(base44: any): Promise<DatiPartenza | undefined> {
  try {
    const righe = await base44.entities.DatiIstat.list("-salvatoIl", 1);
    const d = righe?.[0];
    if (!d || typeof d.inflazioneAnnua !== "number") return undefined;
    return {
      inflazioneAnnua: d.inflazioneAnnua,
      inflazioneAlimentare: d.inflazioneAlimentare ?? d.inflazioneAnnua,
      fiduciaConsumatori: d.fiduciaConsumatori ?? 0.98,
      crescitaSalariAnnua: d.crescitaSalariAnnua ?? 0.012,
      fonte: d.fonte === "istat" ? "istat" : "fallback",
      aggiornatoAl: d.aggiornatoAl ?? "n/d",
    };
  } catch {
    return undefined; // entità assente o non leggibile: fallback del motore
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nome: string = body.nomeRistorante ?? "Il mio ristorante";
    const seed = Number(body.seed ?? (crypto.getRandomValues(new Uint32Array(1))[0] | 0));
    const datiIstat = await leggiDatiIstat(base44);

    const stato = nuovaPartita({
      nomeRistorante: nome,
      forma: (body.forma ?? "ditta_ordinaria") as FormaGiuridica,
      budgetIniziale: Number(body.budgetIniziale ?? 150_000),
      annuncio: body.annuncio,
      modalitaImmobile: body.modalitaImmobile ?? "affitto",
      assunzioniIniziali: body.assunzioniIniziali ?? [],
      commercialista: (body.commercialista ?? "studio_locale") as LivelloCommercialista,
      capitaleSociale: body.capitaleSociale !== undefined ? Number(body.capitaleSociale) : undefined,
      stileLocale: body.stileLocale ?? "trattoria_classica",
      titolare: body.titolare ?? { nome: "Il Titolare", eta: 35, sesso: "M" },
      macro: body.macro ?? { fiduciaConsumatori: 0.98, crescitaSalariAnnua: 0.012, eventi: [] },
      annoCalendario: body.annoCalendario ?? new Date().getFullYear(),
      meseInizio: body.meseInizio,
      seed,
      datiIstat,
    });

    const record = await base44.entities.Partita.create({
      nome, stato, turni_giocati: 0, game_over: false,
    });

    // Riepilogo ricalcolato sui dipendenti che hanno davvero accettato,
    // per esporre mesiAutonomia e budgetConsigliato al wizard.
    const forma = (body.forma ?? "ditta_ordinaria") as FormaGiuridica;
    const budgetIniziale = Number(body.budgetIniziale ?? 150_000);
    const modalita = body.modalitaImmobile ?? "affitto";
    const annuncio = body.annuncio ?? {};
    const piano = calcolaPianoCosti(annuncioAConfigLocale(annuncio, modalita) as any);
    const canone = annuncio.canoneMensile ?? 0;
    const fissiSenzaAffitto = piano.mensili
      .filter((v: any) => !/Affitto locale/.test(v.voce))
      .reduce((s: number, v: any) => s + v.importo, 0);
    const costiFissiMensili = fissiSenzaAffitto + (modalita === "affitto" ? canone : 0);
    const costiLocale = piano.totaleUnaTantum + (annuncio.avviamento ?? 0) + (modalita === "affitto" ? canone * 3 : 0);
    const commercialista = opzioniCommercialista(forma).find((o) => o.id === (body.commercialista ?? "studio_locale"))
      ?? opzioniCommercialista(forma)[1];
    const capitaleSociale = body.capitaleSociale !== undefined ? Number(body.capitaleSociale) : regoleCapitale(forma).minimo;
    const costoStaffMensile = (stato as any).staff.reduce(
      (s: number, d: any) => s + FISCAL_2026.ccnlLordoMensile[d.ruolo] * d.superminimo * 1.38, 0);
    const riepilogo = riepilogaCostituzione({
      forma, budgetIniziale, costiLocale, capitaleSociale, commercialista,
      costoStaffMensile, costiFissiMensili, fidoBase: FISCAL_2026.tesoreria.fidoDefault,
      ruoliBrigata: (stato as any).staff.map((d: any) => d.ruoloEsteso ?? d.ruolo),
    });

    return Response.json({
      partitaId: record.id,
      cassa: (stato as any).tesoreria.saldo,
      mese: (stato as any).mese,
      annoGioco: (stato as any).annoGioco,
      logCostituzione: (stato as any).__logCostituzione ?? [],
      macroPartenza: (stato as any).macroStato?.partenza ?? null,
      ...riepilogo,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}