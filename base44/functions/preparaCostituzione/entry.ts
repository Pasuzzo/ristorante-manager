// redeploy tick 2
/**
 * BACKEND FUNCTION — preparaCostituzione
 * Restituisce al frontend i mattoni del wizard: bacheca immobili,
 * catalogo didattico, pool candidati, opzioni commercialista, costi e
 * regole del capitale.
 *
 * NOVITÀ: le quotazioni arrivano dall'entità ZonaOmi (aggiornabile senza
 * rideploy). Se l'entità è vuota si usa il seed del motore.
 *
 * Tutto deterministico rispetto al seed: lo STESSO seed passato qui va
 * poi a nuovaPartita, così ciò che il giocatore ha visto è ciò che ottiene.
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import { OMI_ESEMPIO, generaBacheca, generaCatalogoDidattico } from "../../shared/engine/immobili.ts";
import type { QuotazioneOmi } from "../../shared/engine/immobili.ts";
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

/** Quotazioni dall'entità ZonaOmi; fallback sul seed del motore. */
async function leggiZone(base44: any, comune?: string): Promise<QuotazioneOmi[]> {
  try {
    const righe = await base44.entities.ZonaOmi.list("zona", 200);
    const filtrate = comune ? righe.filter((z: any) => z.comune === comune) : righe;
    const zone = (filtrate.length ? filtrate : righe)
      .filter((z: any) => typeof z.affittoMin === "number")
      .map((z: any) => ({
        comune: z.comune, provincia: z.provincia, zona: z.zona,
        descrizioneZona: z.descrizioneZona, tipologia: z.tipologia,
        posizioneCommerciale: z.posizioneCommerciale,
        venditaMin: z.venditaMin, venditaMax: z.venditaMax,
        affittoMin: z.affittoMin, affittoMax: z.affittoMax,
        semestre: z.semestre,
      })) as QuotazioneOmi[];
    return zone.length ? zone : OMI_ESEMPIO;
  } catch {
    return OMI_ESEMPIO;
  }
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

    const zone = await leggiZone(base44, body.comune);

    const bacheca = generaBacheca(zone, {
      quanti: 8,
      budgetMax: budgetIniziale * 0.6,
      mqMin: body.mqMin ? Number(body.mqMin) : undefined,
      mqMax: body.mqMax ? Number(body.mqMax) : undefined,
      soloAffitto: !!body.soloAffitto,
    }, mulberry32(seed));

    const pool = candidatiIniziali(seed, meseInizio);

    const catalogo = generaCatalogoDidattico(zone, {
      budget: budgetIniziale,
      mostraFuoriBudget: true,
      soloAffitto: false,
    }, mulberry32(seed ^ 0xcaca));

    return Response.json({
      seed, bacheca, catalogo, pool,
      commercialista: opzioniCommercialista(forma),
      costi: costiCostituzione(forma),
      regole: regoleCapitale(forma),
      comuni: [...new Set(zone.map((z) => z.comune))],
      fonteQuotazioni: zone === OMI_ESEMPIO ? "seed" : "entita",
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}