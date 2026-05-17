# Setup — da zero a `pnpm dev`

Guida solo-da-fare per portare il progetto in stato runnabile sulla tua macchina. Se qualcosa si rompe, riportami l'output esatto dello step che ha fallito.

## Prerequisiti una-tantum

Installa (se non li hai già):

- **Node 20 LTS** — https://nodejs.org/ (scegli il "LTS"). Verifica: `node -v` deve dire `v20.*`.
- **pnpm 10** — `npm install -g pnpm@10`. Verifica: `pnpm -v` deve dire `10.*`.
- **Git** — https://git-scm.com/ (probabilmente già installato).

## Passo 1 — entrare nel workspace

Apri un terminale dentro `E:\GIOCHI\RAGEQUIT\ragequit\`.

## Passo 2 — installare le dipendenze

Sempre da `E:\GIOCHI\RAGEQUIT\ragequit\`:

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
[ragequit-server]   monitor:      http://localhost:2567/colyseus
```

**Terminale 2** — client Vite:

```bash
pnpm dev:client
```

Output atteso: Vite espone il client su `http://localhost:5173/` o `http://127.0.0.1:5173/`. Apri quell'URL nel browser.

**Cosa devi vedere**:

- Il menu principale del gioco, non una pagina bootstrap.
- Play 1v1 e Training aprono prima la Loadout Station; la partita parte dopo `SAVE BUILD`.
- FFA è visibile come modalità non pronta, ma disabilitata.
- In partita, `Esc` apre il pause menu; non deve buttarti direttamente in lobby.
- Settings permette di modificare FOV, sensibilità, volume, qualità e keybind. I valori persistono nel browser.

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

Prima di considerare buono un pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Il warning Vite sul chunk client grande è noto e non blocca la build; va affrontato nel pass di modularizzazione/code splitting.
