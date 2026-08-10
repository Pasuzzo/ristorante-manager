/**
 * BACKEND FUNCTION — nuovaPartita
 * Costituisce una nuova partita a partire dalle scelte del wizard:
 * annuncio scelto dalla bacheca, candidati scelti dal pool con relative
 * offerte, commercialista, forma giuridica e capitale.
 *
 * Body (ConfigNuovaPartita del motore):
 * {
 *   nomeRistorante, forma, budgetIniziale,
 *   annuncio,                      // OGGETTO Annuncio dalla bacheca
 *   modalitaImmobile,              // "affitto" | "acquisto" | "acquisto_mutuo"
 *   assunzioniIniziali: [{ candidato, offerta }],  // dal POOL
 *   commercialista,                // "online" | "studio_locale" | "studio_strutturato"
 *   capitaleSociale?,              // solo srl/srls
 *   stileLocale, titolare: {nome, eta, sesso},
 *   annoCalendario?, meseInizio?, seed?
 * }
 *
 * Risponde con partitaId + logCostituzione (esiti offerte + avvisi).
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import { nuovaPartita } from "../../shared/engine/partita.ts";
import type { FormaGiuridica } from "../../shared/engine/engine.ts";
import type { LivelloCommercialista } from "../../shared/engine/costituzione.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nome: string = body.nomeRistorante ?? "Il mio ristorante";
    const seed = Number(body.seed ?? (crypto.getRandomValues(new Uint32Array(1))[0] | 0));

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
    });

    const record = await base44.entities.Partita.create({
      nome,
      stato,
      turni_giocati: 0,
      game_over: false,
    });

    return Response.json({
      partitaId: record.id,
      cassa: stato.tesoreria.saldo,
      mese: stato.mese,
      annoGioco: stato.annoGioco,
      logCostituzione: (stato as any).__logCostituzione ?? [],
      cassaOperativa: stato.tesoreria.saldo,
      capitaleVersato: stato.capitaleVersato,
      gameOver: stato.gameOver,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}