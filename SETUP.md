# Setup — da zero a `pnpm dev`

Guida solo-da-fare per portare il progetto in stato runnabile sulla tua macchina. Se qualcosa si rompe, riportami l'output esatto dello step che ha fallito.

## Prerequisiti una-tantum

Installa (se non li hai già):

- **Node 20 LTS** — https://nodejs.org/ (scegli il "LTS"). Verifica: `node -v` deve dire `v20.*`.
- **pnpm 10** — `npm install -g pnpm@10`. Verifica: `pnpm -v` deve dire `10.*`.
- **Git** — https://git-scm.com/ (probabilmente già installato).

## Passo 1 - entrare nel workspace

Apri un terminale dentro la cartella della repo clonata. Sul workspace locale attuale:

```powershell
cd E:\GIOCHI\RAGEQUIT
```

## Passo 2 — installare le dipendenze

Sempre dalla root della repo:

```bash
pnpm install
```

Prima installazione: scarica ~500 MB di node_modules distribuiti tra i package del monorepo.

## Passo 3 — build del package condiviso

Il package `@ragequit/shared` esporta tipi consumati da client e server. Va buildato una volta perché TypeScript produca i file `.d.ts`:

```bash
pnpm --filter=@ragequit/shared build
```

## Passo 4 — verifica typecheck + test

```bash
pnpm typecheck
pnpm test
```

Devono passare entrambi senza errori.

## Passo 5 — avviare dev

In **due** terminali separati:

**Terminale 1** — server Colyseus:

```bash
pnpm dev:server
```

Output atteso:

```
[ragequit-server] listening on http://localhost:2567
[ragequit-server]   ws endpoint:  ws://localhost:2567
[ragequit-server]   health:       http://localhost:2567/health
[ragequit-server]   monitor:      disabled
```

Il monitor admin Colyseus è disabilitato di default. Per usarlo in locale, metti in `.env`:

```bash
COLYSEUS_MONITOR_ENABLED=true
COLYSEUS_MONITOR_USER=admin
COLYSEUS_MONITOR_PASSWORD=una-password-locale
```

Quando è abilitato, `/colyseus` richiede Basic Auth. Non esporlo mai senza credenziali.

**Terminale 2** — client Vite:

```bash
pnpm dev:client
```

Output atteso: Vite espone il client su `http://localhost:5173/` o `http://127.0.0.1:5173/`. Apri quell'URL nel browser.

**Cosa devi vedere**:

- Il menu principale del gioco, non una pagina bootstrap.
- Play 1v1 e Training aprono prima la Loadout Station; la partita parte dalla CTA di lancio (`START 1V1` / `START TRAINING`).
- Free For All apre la Loadout Station e avvia la modalità kill-based senza bot fill.
- In partita, `Esc` apre il pause menu; non deve buttarti direttamente in lobby.
- Settings permette di modificare FOV, sensibilità, volume, qualità e keybind. I valori persistono nel browser.

Supabase resta opzionale per il vertical slice locale. Se configuri il client con
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, abilita
`VITE_SUPABASE_ANON_SIGNIN=true` solo su un progetto Supabase dove gli anonymous
sign-ins sono attivi; altrimenti il client gioca senza token e senza persistenza DB.

## Passo 6 — quando vuoi committare

```bash
git add .
git commit -m "descrizione breve del cambiamento"
git push
```

CI GitHub Actions gira su ogni push/PR: lint + typecheck + test + build. Finché non sono tutti verdi, il push è tecnicamente ok ma CI ti sgriderà via email.

## Comandi comuni

| Cosa voglio fare            | Comando                                               |
| --------------------------- | ----------------------------------------------------- |
| Avviare client + server     | `pnpm dev` (un solo terminale, entrambi in parallelo) |
| Avviare solo il server      | `pnpm dev:server`                                     |
| Avviare solo il client      | `pnpm dev:client`                                     |
| Test di tutto il monorepo   | `pnpm test`                                           |
| Formattare il codice        | `pnpm format`                                         |
| Controllare lint            | `pnpm lint`                                           |
| Build production            | `pnpm build`                                          |
| Reset totale (cache + deps) | `pnpm clean && pnpm install`                          |

## Verifica locale consigliata

Prima di considerare buono un cambio:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Una build pulita non deve mostrare il vecchio warning Vite sul chunk grande:
`vendor-three` isola Three.js. Se il warning ricompare dopo un cambiamento,
trattalo come regressione di modularizzazione o budget bundle.
