# RAGEQUIT — regole per chi lavora sul repository

**Il design del gioco non sta qui. Sta in [`VERITA.md`](VERITA.md), che è l'unico
documento normativo.** Questo file contiene solo fatti operativi: dove stanno le cose,
come si builda, cosa non si rompe.

Se una regola di gameplay è scritta qui e non in `VERITA.md`, è un errore: va spostata
là o cancellata. Questo file non decide niente sul gioco.

> Riscritto il 2026-08-14. La versione precedente era una legge parallela di 336 righe
> che imponeva le ruote radiali E/Q (cancellate dal codice), otto slot abilità e le
> cinque famiglie del loadout. Quattro documenti davano tre significati diversi ai
> tasti `Q` ed `E`: è così che ogni sessione ricominciava riconciliando documenti
> invece di scrivere gioco.

---

## Gate — l'unica cosa da ricordare prima di committare

```bash
pnpm check
```

Typecheck → `check:budget` → `check:assets` → lint → `format:check` →
`validate:content` → test. La CI esegue **lo stesso identico comando**
(`.github/workflows/ci.yml`), quindi locale e CI non possono divergere.

Fallimenti tipici e cosa fare:

- **format** → `pnpm exec prettier --write <file>` (soprattutto i `.md`)
- **lint import-order** → `pnpm exec eslint --fix <file>`
- **budget** → estrarre in un modulo. Mai alzare il tetto.

Conviene lanciare prettier ed eslint sui file toccati **prima** del gate intero.

Il conteggio dei test non è un segnale di successo: **quello dei FILE sì.** Una virgola
doppia in un import può far fallire la compilazione dell'intera suite e far sparire
dodici test dietro un numero verde. È il motivo per cui `pnpm check` va eseguito
intero e non a pezzi.

---

## Budget file — perché ogni feature comincia con un'estrazione

Un sorgente TypeScript sta sotto **500 righe** come obiettivo; oltre **800** va
spezzato. Imposto da `tools/check-file-budget.mjs`, che è un **ratchet**: i file già
grandi possono solo rimpicciolire.

I due god-file sono **al tetto**. Qualsiasi riga aggiunta rompe il gate:

- `packages/client/src/main.ts` — ~2570 righe
- `packages/server/src/rooms/GameRoom.ts` — ~1790 righe
- `packages/server/src/sim/AbilityEngine.ts` — ~750 righe

Quando devi aggiungere a uno di questi: identifica una responsabilità, spostala in un
modulo nella sottocartella giusta (`game/`, `hud/`, `render/`, `input/`, `net/`,
`sim/`), aggiorna gli import. Il file di partenza deve **calare**.

---

## Trappole che fanno perdere tempo

- **Posizionamento player/bot = 3 posti in `GameRoom.ts`.** Un override va messo in
  tutti e tre o viene sovrascritto: `spawnBot()`, `onJoin()`, `respawn()` (chiamato da
  `resetAllPlayersForRound()` a inizio round). Era il bug "tutti nello stesso punto".
- **Convenzione yaw:** `yaw = 0` guarda **−z**; `yaw = π` guarda **+z**. Lo yaw senza
  input viene preservato dal sim, non resettato.
- **FOV in gradi ORIZZONTALI**, sempre via `render/fov.ts`. Three.js vuole il
  verticale: passarglielo crudo dava 129,5° orizzontali, un fisheye ingiocabile.
- **HMR su `main.ts`** può corrompere la scena (nera). Per l'headless naviga fresco
  con reload completo, non fidarti dell'hot-reload.
- **Determinismo del sim:** vietati clock e random dentro `shared/src/sim/`.
- **Il validatore workflow** rifiuta script che contengono i letterali `Date.now`,
  `Math.random`, `new Date` — anche dentro il testo dei prompt.

---

## Dove sta cosa

- **Mappe / spawn / collisione** — `shared/src/sim/map.ts` (`MAPS`, `getMap`, `box()`)
- **Abilità** — `shared/src/abilities/registry.ts`
- **Sim / movimento / fisica** — `shared/src/sim/controller.ts`
- **Room server** — `server/src/rooms/GameRoom.ts` + i sottosistemi estratti in
  `server/src/sim/` (`ParrySystem`, `MeleeSystem`, `ProjectileSystem`, `ZoneSystem`,
  `ClassMechanicRuntime`, `AbilityEngine`, `BotController`)
- **Bot** — `server/src/sim/BotController.ts`. Difficoltà `'test'` = nessun input.
- **Client render** — `main.ts` (renderer, scene, luci, post, loop, camera),
  `render/*`, `world/arena.ts`
- **Stile visivo** — [`STILE.md`](STILE.md): palette, materiali, luci, post, VFX, con i
  valori reali del motore
- **Come si lavora sul codice** — [`SVILUPPO.md`](SVILUPPO.md)
- **Come si installa** — [`SETUP.md`](SETUP.md)

---

## Fatti stabiliti

**Deploy.** Server su Fly.io (app `ragequit-server`, regione `ams`, `PORT=8080` in
produzione, `2567` in locale). Client statico su Cloudflare Pages da
`packages/client/dist/`. Supabase configurato come Fly secrets (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`).

**Asset sorgente** in `E:\GIOCHI\ASSET_GRAFICA` — fuori dal repo. I nuovi asset
grafici si prendono sempre da lì e si copiano in `packages/client/public/`.
Sottocartelle: `PARTICELLE/kenney_particle-pack/`, `PERSONAGGI/`, `icone/`, `menu/`,
`mappe/`.

**Nel repository stanno solo asset runtime approvati.**

**Arena.** Shell visiva permanente `public/arena/gladiators_arena.glb` (colosseo ovale
~50×57 m), caricata in `world/arena.ts` per ogni mappa. Le AABB di collisione per-mappa
stanno in `shared/sim/map.ts` e si renderizzano come blocchi di pietra.

**Personaggi.** Quattro GLB Mixamo ottimizzati in `public/characters/`
(`paladin.glb`, `erika.glb`, `vampire.glb`, `ninja.glb`), più `UAL1_Standard.glb` come
sorgente delle animazioni di fallback — non rimuoverlo. Il retargeting avviene offline
in `tools/asset-pipeline/mixamo-to-glb.mjs`, **mai a runtime**.

**Armi.** `.glb` auto-contenuti in `public/weapons/kaykit/` (`sword.glb`, `bow.glb`,
`staff.glb`, `shield_A.glb`).

**Texture VFX** (`public/vfx/*.png`): RGBA **bianco su trasparente**, `colorSpace =
NoColorSpace`, `premultiplyAlpha = false`. Mai sfondo scuro o colorato — il sistema
tinge in additivo via `instanceColor`. Sono Kenney Particle Pack, CC0.

**Bloom.** Three.js layer 1 = eleggibile al bloom, layer 0 = default. Non aggiungere
mesh al layer 1 se non sono emissive.

**LOD giocatori remoti.** Oltre 40 m modello nascosto (resta il nameplate), oltre 20 m
ombre spente.

**CSS.** L'unico foglio di stile vivo è `packages/client/public/game-ui.css`. Quando
riscrivi una regola, cancella la vecchia nello stesso commit.

**Icone abilità.** PNG in `public/ability-icons/`, nome file uguale all'ability id.

---

## Regole di lavoro

- **Combat server-authoritative.** Il client predice, il server decide. Mai fidarsi del
  client.
- **Non toccare a caso** pointer lock, cattura tastiera/mouse, weapon swap, LMB/RMB o
  la mira. Se li tocchi, verifica in browser.
- **Quando cambi un comportamento, aggiorna nello stesso commit il documento che lo
  descrive.** I documenti che mentono sono stati la causa numero uno degli errori
  ricorrenti di questo progetto.
- **Se un documento è in disaccordo col codice, ha ragione il codice** — e il documento
  va corretto subito, non "poi".
- **Quando l'utente ordina di eliminare una cosa, eliminarla dal gioco e dai documenti
  nella stessa passata.**
- **Il feedback dell'utente su layout e stile è vincolante**, non una preferenza da
  bilanciare.
- **Non registrare decisioni che l'utente non ha confermato esplicitamente.** Una
  proposta non è una decisione.
