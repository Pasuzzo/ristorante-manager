/**
 * ISTAT — dati reali per l'economia del gioco.
 *
 * L'Istat espone i dati di I.Stat via web service SDMX REST, gratuito e
 * senza chiave. Le specifiche OpenAPI ufficiali sono state pubblicate dal
 * Team per la Trasformazione Digitale.
 *
 * Endpoint:  https://esploradati.istat.it/SDMXWS/rest/data/{dataflow}/{chiave}
 * Formato:   XML SDMX (con Accept: application/vnd.sdmx.data+json si può
 *            provare JSON, ma non è garantito su tutti i dataflow)
 *
 * ⚠️ IMPORTANTE — come usarlo nel gioco:
 * 1. NON chiamare l'Istat a ogni turno: i dati sono mensili e il servizio
 *    è lento. Fai UN aggiornamento schedulato (o al primo turno del mese)
 *    e salva il risultato in un'entità Base44 `DatiIstat`.
 * 2. Il gioco deve funzionare anche se l'Istat è offline: c'è sempre un
 *    FALLBACK con valori storici, e la partita non deve mai bloccarsi.
 * 3. Una partita in corso NON deve cambiare regole a metà: congela i dati
 *    all'inizio della partita e aggiornali solo alle partite nuove
 *    (altrimenti il replay deterministico dal seed non torna più).
 *
 * ⚠️ Questo modulo NON è stato testato contro il servizio Istat reale:
 * l'ambiente in cui è stato scritto non aveva accesso alla rete verso
 * istat.it. I dataflow e le chiavi vanno verificati con l'esploratore
 * ufficiale prima di andare in produzione.
 */

// ─────────────────────────────────────────────── Dataflow utili

export const DATAFLOW = {
  /** NIC — indice dei prezzi al consumo per l'intera collettività */
  prezziConsumo: "167_744",
  /** chiave serie: FREQ.COICOP.TERRITORIO.MISURA.TIPO_INDICE
   *  M = mensile, 01 = prodotti alimentari e bevande analcoliche,
   *  IT = Italia, 4 = variazione, 39 = tipo indice */
  chiaveAlimentari: "M.01.IT.4.39",
  /** 00 = indice generale */
  chiaveGenerale: "M.00.IT.4.39",
} as const;

export const BASE_URL = "https://esploradati.istat.it/SDMXWS/rest/data";

// ─────────────────────────────────────────────── Dati usati dal gioco

export interface DatiEconomici {
  /** inflazione generale annua (es. 0.018 = 1,8%) */
  inflazioneAnnua: number;
  /** inflazione alimentare: muove il food cost, spesso ≠ da quella generale */
  inflazioneAlimentare: number;
  /** indice di fiducia dei consumatori normalizzato (1 = neutro) */
  fiduciaConsumatori: number;
  /** crescita delle retribuzioni contrattuali annua */
  crescitaSalariAnnua: number;
  /** da dove arrivano questi numeri */
  fonte: "istat" | "fallback";
  aggiornatoAl: string;
}

/** Valori di ripiego: usati se l'Istat non risponde. Aggiornali a mano. */
export const FALLBACK: DatiEconomici = {
  inflazioneAnnua: 0.018,
  inflazioneAlimentare: 0.022,
  fiduciaConsumatori: 0.98,
  crescitaSalariAnnua: 0.012,
  fonte: "fallback",
  aggiornatoAl: "2026-01",
};

// ─────────────────────────────────────────────── Parsing

/**
 * Estrae l'ultima osservazione da una risposta SDMX in XML.
 * Il formato generic ha <generic:Obs> con <generic:ObsDimension value="2026-05"/>
 * e <generic:ObsValue value="1.8"/>.
 */
export function ultimaOsservazioneXml(xml: string): { periodo: string; valore: number } | null {
  const obs = [...xml.matchAll(
    /<(?:generic:)?ObsDimension[^>]*value="([^"]+)"[^>]*\/>\s*<(?:generic:)?ObsValue[^>]*value="([^"]+)"/g
  )];
  if (!obs.length) return null;
  const ultima = obs[obs.length - 1];
  const valore = Number(ultima[2]);
  return Number.isFinite(valore) ? { periodo: ultima[1], valore } : null;
}

// ─────────────────────────────────────────────── Fetch

async function serie(dataflow: string, chiave: string, ultimeN = 1): Promise<{ periodo: string; valore: number } | null> {
  const url = `${BASE_URL}/${dataflow}/${chiave}?lastNObservations=${ultimeN}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.sdmx.genericdata+xml;version=2.1" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Istat HTTP ${res.status}`);
  return ultimaOsservazioneXml(await res.text());
}

/**
 * Scarica i dati economici correnti. Non lancia MAI: in caso di problemi
 * restituisce il fallback, così il gioco continua a girare.
 */
export async function scaricaDatiIstat(): Promise<DatiEconomici> {
  try {
    const [generale, alimentari] = await Promise.all([
      serie(DATAFLOW.prezziConsumo, DATAFLOW.chiaveGenerale).catch(() => null),
      serie(DATAFLOW.prezziConsumo, DATAFLOW.chiaveAlimentari).catch(() => null),
    ]);
    if (!generale) return FALLBACK;
    return {
      // il dataflow restituisce variazioni percentuali: /100
      inflazioneAnnua: generale.valore / 100,
      inflazioneAlimentare: alimentari ? alimentari.valore / 100 : generale.valore / 100,
      // la fiducia richiede un altro dataflow: finché non è mappato, resta il default
      fiduciaConsumatori: FALLBACK.fiduciaConsumatori,
      crescitaSalariAnnua: FALLBACK.crescitaSalariAnnua,
      fonte: "istat",
      aggiornatoAl: generale.periodo,
    };
  } catch {
    return FALLBACK;
  }
}

/**
 * Da usare nella backend function `nuovaPartita`: legge i dati salvati
 * nell'entità DatiIstat se sono freschi, altrimenti li riscarica.
 * Passa qui le funzioni di lettura/scrittura dell'entità.
 */
export async function datiConCache(
  leggi: () => Promise<(DatiEconomici & { salvatoIl: string }) | null>,
  scrivi: (d: DatiEconomici & { salvatoIl: string }) => Promise<void>,
  giorniValidita = 20
): Promise<DatiEconomici> {
  try {
    const cache = await leggi();
    if (cache) {
      const eta = (Date.now() - new Date(cache.salvatoIl).getTime()) / 86_400_000;
      if (eta < giorniValidita) return cache;
    }
  } catch { /* cache illeggibile: si riscarica */ }

  const freschi = await scaricaDatiIstat();
  if (freschi.fonte === "istat") {
    try { await scrivi({ ...freschi, salvatoIl: new Date().toISOString() }); } catch { /* non bloccante */ }
  }
  return freschi;
}