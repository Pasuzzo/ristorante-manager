/**
 * BACKEND FUNCTION — preparaCostituzione
 * Restituisce al frontend i "mattoni" per il wizard di costituzione:
 * la bacheca degli immobili, il pool di candidati iniziali, le opzioni del
 * commercialista, i costi di costituzione e le regole del capitale sociale.
 *
 * Tutto deterministico rispetto al seed: lo STESSO seed che il frontend
 * usa qui viene poi passato a nuovaPartita, così ciò che il giocatore ha
 * visto (bacheca e pool) è ciò che ottiene.
 *
 * Body:
 * { seed?, forma, budgetIniziale, meseInizio, mqMin?, mqMax?, soloAffitto? }
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import { OMI_ESEMPIO, generaBacheca } from "../../shared/engine/immobili.ts";
import { candidatiIniziali } from "../../shared/engine/partita.ts";
import { opzioniCommercialista, costiCostituzione, regoleCapitale } from "../../shared/engine/costituzione.ts";
import type { FormaGiuridica } from "../../shared/engine/engine.ts";

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const seed = Number(body.seed ?? (crypto.getRandomValues(new Uint32Array(1))[0] | 0));
    const forma = (body.forma ?? "ditta_ordinaria") as FormaGiuridica;
    const budgetIniziale = Number(body.budgetIniziale ?? 150_000);
    const meseInizio = Number(body.meseInizio ?? 1);

    const bacheca = generaBacheca(OMI_ESEMPIO, {
      quanti: 8,
      budgetMax: budgetIniziale * 0.6,
      mqMin: body.mqMin ? Number(body.mqMin) : undefined,
      mqMax: body.mqMax ? Number(body.mqMax) : undefined,
      soloAffitto: !!body.soloAffitto,
    }, mulberry32(seed));

    const pool = candidatiIniziali(seed, meseInizio);

    return Response.json({
      seed,
      bacheca,
      pool,
      commercialista: opzioniCommercialista(forma),
      costi: costiCostituzione(forma),
      regole: regoleCapitale(forma),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}