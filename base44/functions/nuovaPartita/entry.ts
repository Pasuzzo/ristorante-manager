/**
 * BACKEND FUNCTION — nuovaPartita
 * Crea una nuova partita per l'utente autenticato e la salva come entità.
 *
 * Body atteso (tutto opzionale tranne nomeRistorante):
 * {
 *   "nomeRistorante": "Trattoria del Paso",
 *   "forma": "ditta_ordinaria",          // ditta_forfettaria | ditta_ordinaria | srls | srl
 *   "budgetIniziale": 45000,
 *   "tipoLocalita": "riviera",           // riviera | citta | paese
 *   "postiASedere": 55
 * }
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import { nuovaPartita } from "../../shared/engine/partita.ts";
import type { FormaGiuridica } from "../../shared/engine/engine.ts";
import type { TipoLocalita } from "../../shared/engine/ricavi.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nome: string = body.nomeRistorante ?? "Il mio ristorante";

    const stato = nuovaPartita({
      nomeRistorante: nome,
      forma: (body.forma ?? "ditta_ordinaria") as FormaGiuridica,
      budgetIniziale: Number(body.budgetIniziale ?? 45_000),
      locale: {
        postiASedere: Number(body.postiASedere ?? 55),
        turniMax: 2.2,
        giornoChiusura: 1, // lunedì
        scontrinoMedioBase: 26,
        tipoLocalita: (body.tipoLocalita ?? "riviera") as TipoLocalita,
        listino: 1.0,
        elasticitaPrezzo: -1.2,
      },
      costiFissiMensili: Number(body.costiFissiMensili ?? 2_600),
      macro: { fiduciaConsumatori: 0.98, crescitaSalariAnnua: 0.012, eventi: [] },
      annoCalendario: new Date().getFullYear(),
      seed: (crypto.getRandomValues(new Uint32Array(1))[0] | 0),
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
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
