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

## Deploy

- Server live su Fly.io: `ragequit-server`, regione `ams`, porta `8080`.
- Supabase configurato come Fly secrets.
- Client statico per Cloudflare Pages.
