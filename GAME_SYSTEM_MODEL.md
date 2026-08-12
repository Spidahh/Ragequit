# RAGEQUIT — Runtime System Model

Questo documento descrive lo stato vivo.

## Source Of Truth

1. `AGENTS.md` per fatti stabiliti e regole non negoziabili.
2. Codice runtime quando un documento e in conflitto col codice.
3. `packages/shared/src/abilities/registry.ts` per numeri e comportamento delle
   abilita.
4. `packages/shared/src/constants/classes.ts`,
   `packages/client/src/input/loadout-slots.ts` e
   `packages/client/src/loadout-station.ts` per grammatica loadout e UI Forge.
5. `packages/client/public/game-ui.css` per lo stile UI.

## Runtime

- Il gioco e un arena FPS browser PvP.
- Il server e autoritativo.
- Il client renderizza arena, HUD, menu, Forge e feedback combat.
- Le classi vive sono Tank, Arciere, Mago e Ibrido.
- Il loadout vivo usa famiglie `melee`, `bow`, `magicBase`,
  `magicAdvanced`, `utility`.
- La wheel e una palette di selezione: hold, selezione, rilascio per primare,
  LMB per cast/conferma quando richiesto.
- Fall damage e self-damage dalle proprie abilita sono zero.
- Nessun sistema passivo o slot extra fuori loadout.

## UI

- Unico stylesheet vivo: `packages/client/public/game-ui.css`.
- Menu e Loadout Forge sono schermate di gioco, non pagine web.
- Non esistono layer CSS separati per override UI.
- Il Loadout Forge non usa piu `#ls-magic`; usa `#ls-magic-base` e
  `#ls-magic-advanced`.
- Nameplate posizionate con `transform: translate3d()` (compositor thread).
- Loading screen con barra di progresso: `#loading-screen` in index.html.
- Dynamic crosshair: `data-moving="true"` quando WASD attivo, `.kill-confirm` al kill.
- Hotbar in quattro pannelli arma (`SPADA`, `ARCO`, `STAFF`, `UTILITY`) con
  arma corrente evidenziata e stato `ATTIVA`/`TAB`.
- Readout cast autoritativo: selezione, placement, richiesta, windup, rilascio e
  fallimento sono stati visivi distinti; targeting `forward`, `point` e `self`
  modifica anche il mirino.

## Sistemi Client Aggiuntivi

- `src/preloader.ts` — preload asset prima dell'arena (personaggio + armi).
- `src/game/match-state-machine.ts` — FSM per le fasi partita (singleton `matchSM`).
- Post-processing: `EffectComposer` + `UnrealBloomPass` (layer 1 = bloom).
- LOD remote players: >40m nascosto, >20m shadow off.
- Audio spaziale: `PannerNode` HRTF per suoni remoti.
- Battito cardiaco procedurale sotto HP 25%.
- Reconnect automatico: 1 retry dopo 2s su drop inaspettato.
- Tutorial HUD: 4 tooltip sequenziali alla prima partita (localStorage).

## Deploy

- Server live su Fly.io: `ragequit-server`, regione `ams`, porta `8080`.
- Supabase configurato come Fly secrets.
- Client statico per Cloudflare Pages.
