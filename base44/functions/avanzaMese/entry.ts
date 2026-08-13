/**
 * BACKEND FUNCTION — avanzaMese
 * Esegue un turno (un mese). La logica di gioco gira SOLO qui: il
 * frontend manda le decisioni e riceve il report.
 *
 * NOVITÀ: restituisce anche i bandi aperti questo mese, calcolati sul
 * server leggendo l'entità Bando. Il frontend non importa più il motore.
 *
 * Body: { partitaId, turnoAtteso?, decisioni? }
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import { avanzaMese } from "../../shared/engine/partita.ts";
import type { StatoPartita, DecisioniMese } from "../../shared/engine/partita.ts";
import { CATALOGO_ESEMPIO, bandiDisponibili } from "../../shared/engine/bandi.ts";
import type { Bando, ProfiloRichiedente } from "../../shared/engine/bandi.ts";

/** Catalogo bandi dall'entità; fallback sul seed del motore. */
async function leggiBandi(base44: any): Promise<Bando[]> {
  try {
    const righe = await base44.entities.Bando.list("titolo", 200);
    return righe?.length ? (righe as Bando[]) : CATALOGO_ESEMPIO;
  } catch {
    return CATALOGO_ESEMPIO;
  }
}

/** Profilo del richiedente ricavato dallo stato della partita. */
function profilo(s: any, investimentoPrevisto: number): ProfiloRichiedente {
  const t = s.titolare ?? {};
  return {
    etaTitolare: t.eta ?? 35,
    titolareFemminile: t.sesso === "F",
    anniAttivita: (s.ristorante?.annoAttivita ?? 1) - 1,
    formaGiuridica: s.ristorante?.forma ?? "ditta_ordinaria",
    ricaviUltimoAnno: s.fiscale?.ricavi ?? 0,
    dipendentiRegolari: (s.staff ?? []).filter((d: any) => d.inRegola).length,
    nuoveAssunzioniAnno: s.nuoveAssunzioniAnno ?? 0,
    zona: s.immobile?.zona ?? "",
    regione: s.regione ?? "Emilia-Romagna",
    investimentoPrevisto,
    haAccessibilita: (s.scelte?.servizi ?? []).includes("accessibilita"),
    usaFilieraCorta: !!s.usaFilieraCorta,
    haSanzioniLavoro: !!s.haSanzioniLavoro,
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const partitaId: string | undefined = body.partitaId;
    if (!partitaId) return Response.json({ error: "partitaId mancante" }, { status: 400 });

    // Le RLS dell'entità garantiscono che l'utente veda solo le sue partite.
    const record = await base44.entities.Partita.get(partitaId);
    if (!record) return Response.json({ error: "Partita non trovata" }, { status: 404 });

    const stato = record.stato as StatoPartita;
    if ((stato as any).gameOver) {
      return Response.json({ error: `Partita finita: ${(stato as any).motivoGameOver}` }, { status: 409 });
    }
    // anti doppio-click
    if (body.turnoAtteso !== undefined && body.turnoAtteso !== record.turni_giocati + 1) {
      return Response.json({ error: "Turno già giocato: ricarica lo stato." }, { status: 409 });
    }

    const decisioni: DecisioniMese = body.decisioni ?? {};
    const report = avanzaMese(stato, decisioni);

    // Bandi aperti nel mese che sta per essere giocato, valutati sul server
    const catalogo = await leggiBandi(base44);
    const investimento = Number(body.investimentoPrevisto ?? 10_000);
    const bandi = bandiDisponibili(catalogo, profilo(stato, investimento), (stato as any).mese);

    await base44.entities.Partita.update(partitaId, {
      stato,
      turni_giocati: (record.turni_giocati ?? 0) + 1,
      game_over: report.gameOver,
      ultimo_report: report,
    });

    return Response.json({ report, bandi });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}