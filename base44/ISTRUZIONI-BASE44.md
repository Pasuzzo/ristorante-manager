# Ristorante Manager × Base44 — istruzioni di montaggio

## Struttura del pacchetto

```
base44/
├── shared/engine/          ← IL MOTORE (7 moduli, non toccare la logica)
│   ├── fiscal-config.ts    ← tutti i parametri fiscali 2026 (aggiornare ogni anno)
│   ├── engine.ts           ← forme giuridiche, payroll, imposte
│   ├── tesoreria.ts        ← cassa e scadenze fiscali reali
│   ├── ricavi.ts           ← affluenza: calendario, meteo, marketing, macro
│   ├── reputazione.ts      ← staff stile FM, morale, gradimento
│   ├── ricette.ts          ← menu, food cost, difficoltà piatti
│   └── partita.ts          ← orchestratore: StatoPartita + avanzaMese
└── functions/
    ├── nuovaPartita/entry.ts
    └── avanzaMese/entry.ts
```

Il motore gira SOLO nelle backend functions: il frontend non contiene
logica di gioco, manda decisioni e riceve report. Niente cheat da browser,
e il seed RNG salvato rende ogni partita riproducibile.

## Passi

1. **Progetto**: crea l'app su Base44, poi dal CLI collega il progetto
   locale (`npx base44 init` / `base44 dev` per lo sviluppo locale).
2. **Copia questa cartella `base44/`** dentro il progetto (shared + functions).
3. **Entità `Partita`**: creala con questo schema (proprietà):
   - `nome` (string, required)
   - `stato` (object) — lo StatoPartita serializzato
   - `turni_giocati` (number)
   - `game_over` (boolean)
   - `ultimo_report` (object)
   Regole di accesso: l'utente legge/scrive SOLO i record creati da sé
   (creator-only). Le funzioni passano l'auth dell'utente, quindi le
   regole valgono anche lì.
4. **Deploy**: `npx base44 deploy` (o `base44 functions deploy`).
5. **Frontend**: chiama le funzioni via SDK:
   ```js
   const { partitaId } = await base44.functions.invoke("nuovaPartita",
     { nomeRistorante: "Trattoria del Paso", forma: "ditta_ordinaria" });
   const { report } = await base44.functions.invoke("avanzaMese",
     { partitaId, turnoAtteso: 1, decisioni: { spesaSocial: 300 } });
   ```

## Prompt suggerito per l'AI di Base44 (schermate)

> Costruisci l'interfaccia di un gestionale di ristorante a turni mensili.
> La logica di gioco esiste già in due backend functions: `nuovaPartita` e
> `avanzaMese` — USALE COSÌ COME SONO, non riscrivere né duplicare la
> logica di gioco nel frontend. Ogni turno: raccogli le decisioni
> (DecisioniMese), chiama `avanzaMese`, mostra il ReportMese.
> Schermate: 1) Dashboard con cassa, reputazione (stelle), coperti,
> grafico andamento e feed eventi del mese; 2) Staff con card dipendenti
> (ruolo, morale, paga, in regola sì/no) e azioni assumi/licenzia/aumenta;
> 3) Decisioni del mese: budget marketing (tradizionale/social), qualità
> materie prime, listino, manutenzione, ristrutturazione; 4) Bilancio:
> movimenti di cassa, scadenze fiscali in arrivo, TFR maturato, chiusura
> d'anno. Tono: italiano, asciutto, da gestionale sportivo alla Football
> Manager.

## Avvertenze

- **Deno richiede le estensioni `.ts` negli import**: i file in
  `shared/engine/` le hanno già. Se modifichi i moduli originali,
  ricordati di rigenerare le copie.
- `shared/` viene impacchettato con OGNI funzione al deploy: se cambi il
  motore, rideploya tutte le funzioni (`base44 functions deploy` senza
  argomenti), altrimenti giocheranno con versioni diverse delle regole.
- Concorrenza: `turnoAtteso` protegge dal doppio click, non da due
  dispositivi che giocano la stessa partita insieme. Per ora: ultimo
  che scrive vince.
- I nomi esatti dei metodi SDK per le entità (`get`/`update`/`create`)
  possono variare con le versioni: se il deploy segnala un metodo
  inesistente, chiedi all'AI di Base44 di adeguare SOLO quelle chiamate,
  mai la logica del motore.
- Bilanciamento: la partita di default è ancora troppo facile. Prima di
  farla provare a qualcuno, girare il Monte Carlo (prossimo passo) e
  tarare `fiscal-config.ts` / `ricavi.ts`.
