/**
 * BACKEND FUNCTION — avanzaMese
 * Esegue un turno (un mese) della partita. La logica di gioco gira SOLO
 * qui sul server: il frontend manda le decisioni e riceve il report.
 *
 * Body atteso:
 * {
 *   "partitaId": "…",
 *   "turnoAtteso": 7,          // opzionale: protegge dal doppio click
 *   "decisioni": {             // vedi DecisioniMese in partita.ts — tutto opzionale
 *     "spesaSocial": 300,
 *     "qualitaMaterie": "premium",
 *     "assunzioni": [{ "nome": "Luca", "ruolo": "cameriere", "livello": "medio",
 *                      "superminimo": 1.05, "inRegola": true, "stagionaleFinoAlMese": 9 }]
 *   }
 * }
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import { avanzaMese, StatoPartita, DecisioniMese } from "../../shared/engine/partita.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const partitaId: string | undefined = body.partitaId;
    if (!partitaId) return Response.json({ error: "partitaId mancante" }, { status: 400 });

    // Le regole di accesso (RLS) dell'entità garantiscono che l'utente
    // possa leggere solo le proprie partite.
    const record = await base44.entities.Partita.get(partitaId);
    if (!record) return Response.json({ error: "Partita non trovata" }, { status: 404 });

    const stato = record.stato as StatoPartita;
    if (stato.gameOver) {
      return Response.json({ error: `Partita finita: ${stato.motivoGameOver}` }, { status: 409 });
    }
    // anti doppio-click: il client dichiara quale turno pensa di giocare
    if (body.turnoAtteso !== undefined && body.turnoAtteso !== record.turni_giocati + 1) {
      return Response.json({ error: "Turno già giocato: ricarica lo stato." }, { status: 409 });
    }

    const decisioni: DecisioniMese = body.decisioni ?? {};
    const report = avanzaMese(stato, decisioni);

    await base44.entities.Partita.update(partitaId, {
      stato,
      turni_giocati: (record.turni_giocati ?? 0) + 1,
      game_over: report.gameOver,
      ultimo_report: report,
    });

    return Response.json({ report });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
