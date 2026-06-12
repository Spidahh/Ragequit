# SVILUPPO — playbook operativo RAGEQUIT

> Manuale per sviluppare/modificare/**verificare** il gioco SENZA perdere tempo. Leggilo
> all'inizio di ogni sessione (insieme a `PROGETTO.md`). Aggiornalo quando scopri una trappola
> nuova. Regola d'oro: **verifica con LOGICA + LOG del server, non con gli screenshot.**

## 0. Avvio rapido

```
pnpm dev          # client (vite :5173) + server (colyseus :2567), in parallelo
```

- Il server gira con **`tsx watch`**: si **auto-ricarica** a ogni modifica dei file server
  (NON serve riavviarlo a mano), ma il reload **cancella le room** in corso.
- `@ragequit/shared` va **buildato** prima di typecheck/test: `pnpm --filter @ragequit/shared build`.
- Riavvio pulito del dev server (quando muore o serve pulito): libera le porte e rilancia in background:
  - PowerShell: `Get-NetTCPConnection -LocalPort 5173,2567 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`
  - poi `pnpm dev` con `run_in_background: true` (sopravvive tra i turni).
- ⚠️ "READY in 1-2s" è **sospetto** (avvio fresco = qualche secondo): verifica che il server sia
  davvero ripartito (process StartTime, oppure curl del codice servito).

## 1. COME VERIFICARE (il punto dolente — leggi QUESTO)

**Gli screenshot del gioco 3D NON sono affidabili. Non perderci tempo.** Perché falliscono:

- Il gioco va in **PAUSA** quando non c'è il **pointer-lock** (mouse non agganciato) → la cattura
  prende il **menu di pausa**, non il gioco. L'headless non aggancia il pointer-lock.
- `Page.captureScreenshot` (CDP) **va in timeout** sul render-loop rAF, A MENO che la pagina sia
  aperta con **`?capture=1`** (abilita `preserveDrawingBuffer`).
- I **nameplate** dei player fuori schermo / dietro la camera vengono **clampati a un angolo** →
  letture false (tutti nello stesso punto) anche se le posizioni reali sono giuste.
- L'estensione Chrome (Claude in Chrome) può **pilotare** il gioco (click/JS) ma soffre gli stessi
  problemi; inoltre l'**auto-reconnect** di Colyseus dopo un restart crea **room fantasma** (es. una
  'competent') → doppie connessioni e stato confuso.

**METODO AFFIDABILE = LOGICA + LOG SERVER:**

1. **Leggi il codice** e ragiona sul flusso (è quasi sempre più veloce e certo di una cattura).
2. Per lo stato runtime: aggiungi un **`console.info('[DBG] ...')` temporaneo** nel punto server
   interessato, fai entrare un client (o aspetta l'utente), e **leggi il dev log**:
   `grep '\[DBG\]' .verify/devN.log`. È **ground truth** (es. posizioni reali dei bot).
   Poi **togli il log** prima di committare (occhio al budget, vedi §2).
3. Gate verde (`pnpm check`) + i **test** sono la verifica di non-regressione. Scrivi un test che
   blocca il comportamento (vedi `rooms/test-room.test.ts`).
4. Per il visual vero: **fallo guardare all'UTENTE dal vivo** (ha GPU + mouse), non tirare a
   indovinare con catture headless in pausa.

(Esistono `tools/verify/shot.mjs` e `inspect.mjs` con Playwright+SwiftShader, ma soffrono i
problemi sopra. Usali solo per il personaggio ravvicinato in `inspect.html`, non per il match.)

## 2. TRAPPOLE che fanno perdere tempo (memorizzale)

- **Budget god-file.** `client/src/main.ts` e `server/src/rooms/GameRoom.ts` sono al **tetto**
  `check:budget` (grandfathered). **QUALSIASI riga aggiunta rompe il gate.** Soluzione: **estrai**
  in un modulo (es. `render/environment.ts`, `rooms/test-room.ts`). Non alzare il tetto (anti-pattern).
- **Posizionamento player/bot = 3 PUNTI in `GameRoom.ts`.** Un override di posizione va messo in
  TUTTI e tre o viene sovrascritto:
  1. `spawnBot()` — spawn iniziale dei bot.
  2. `onJoin()` — spawn del player umano.
  3. `respawn()` — chiamato da **`resetAllPlayersForRound()`** a inizio round (usa lo spawn della
     mappa → se la mappa ha un solo spawn, **impila tutti**). Era il bug "tutti nello stesso punto".
- **Convenzione YAW**: `yaw = 0` → guarda **-z** (camera dietro a +z); `yaw = π` → guarda **+z**.
  Lo yaw senza input viene **preservato** dal sim (non resettato), quindi puoi fissarlo allo spawn.
- **Gate** (`pnpm check`) = typecheck → budget → assets → lint → format → validate:content → test.
  Fallimenti tipici e fix:
  - **format**: lancia `pnpm exec prettier --write <file>` sui file toccati (specie i `.md`).
  - **lint import-order**: `pnpm exec eslint --fix <file>`.
  - **budget**: estrai (vedi sopra).
    Conviene fare prettier --write + eslint --fix **prima** di lanciare il gate intero.
- **Workflow tool determinismo**: il validatore rifiuta script che contengono i **letterali**
  `Date.now` / `Math.random` / `new Date` — **anche dentro il testo dei prompt**. Riformula.
- **HMR su `main.ts`**: l'hot-reload può corrompere la scena (nera). Per l'headless naviga **fresco**
  (full reload con `?capture=1`), non affidarti all'HMR.

## 3. DOVE STA COSA (mappa rapida del codice)

- **Mappe / spawn / collisione**: `shared/src/sim/map.ts` (registry `MAPS`, `getMap`, `box()`).
  Mappa vuota = `boxes: []`. Il client disegna sempre lo shell colosseo + le `boxes` della mappa.
- **Abilità (53)**: `shared/src/abilities/registry.ts`. Effetti: damage/knockup/knockback/status/
  channel/zone/resourceDrain. `knockbackDistance` = spinta orizzontale; `airborneSec` = knockup.
- **Sim/movimento/fisica**: `shared/src/sim/controller.ts` (`simulatePlayer`, `makePlayerSimState`,
  `resolveCapsuleVsBox`). Determinismo: VIETATI clock/random nel sim.
- **Server room**: `server/src/rooms/GameRoom.ts` (god-file). Sottosistemi estratti: `sim/ParrySystem`,
  `MeleeSystem`, `ProjectileSystem`, `ZoneSystem`, `ClassMechanicRuntime`, `AbilityEngine`, `BotController`.
- **Bot**: `server/src/sim/BotController.ts`. Difficoltà `'test'` = **nessun input** (dummy immobile).
- **Stanza Test**: difficoltà `'test'` (pulsante #menu-train-master) → mappa `test_room` vuota + 4
  dummy fermi una per classe in fila (helper in `rooms/test-room.ts`, bloccato da `test-room.test.ts`).
- **Client render**: `main.ts` (renderer/scene/luci/post/loop/camera), `render/*` (characters,
  weapons, grade-pass, environment, projectile-visuals, remote-players), `world/arena.ts`.
- **Stile bloccato**: `STILE.md` (palette/materiali/luci/post/VFX — valori reali del motore).

## 4. COME MODIFICARE (ricette rapide)

- **Aggiungere una mappa**: definiscila in `map.ts` (`boxes`, `groundY`, `spawns`) + registrala in
  `MAPS`. Client e server la risolvono via `getMap(id)`. (Il content-validator accetta nuove mappe.)
- **Cambiare posizioni Stanza Test**: `rooms/test-room.ts` (`testDummySpawn`/`testPlayerSpawn`).
  Aggiorna anche `test-room.test.ts`.
- **Tunare valori numerici** (danno/costi/durate/luci): è **compito dell'assistente**, non dell'utente.
  Luci/post = `main.ts` + `render/grade-pass.ts` (allinea sempre `STILE.md`).
- **Aggiungere un'abilità**: `registry.ts` + verifica con `pnpm validate:content`.

## 5. Deploy

`git push origin HEAD:main` = **deploy in produzione** (Fly.io server + Cloudflare Pages client).
Tutto su `main`, niente branch. Flusso: commit → `git fetch origin main` → `git rebase origin/main`
→ `git push origin HEAD:main` → `git branch -f main HEAD`. **Gate verde + `vite build` ok** prima di pushare.
