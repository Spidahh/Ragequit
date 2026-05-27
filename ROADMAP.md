# RAGEQUIT — Stato Corrente

Ultimo riallineamento documentale: 2026-05-26.

Questo file descrive solo lo stato vivo del progetto.

## Implementato

- Monorepo pnpm con `packages/shared`, `packages/client`, `packages/server`.
- Server Colyseus autoritativo a 60 Hz.
- Client Vite + Three.js.
- 52 abilita data-driven nel registry condiviso.
- Classi attive: Tank, Arciere, Mago, Ibrido.
- Loadout class-aware con Magic Base e Magic Advanced separati.
- Recovery utility per classe nei build starter.
- HUD con meccanica classe, hotbar, wheel, castbar, status e scoreboard.
- Supabase auth e persistenza DB con fallback locale.
- Training con difficolta Novice, Competent e Master.
- CSS unificato in `packages/client/public/game-ui.css`.

## Verifica Minima

```text
pnpm --filter @ragequit/client typecheck
pnpm --filter @ragequit/client test
pnpm --filter @ragequit/client build
pnpm lint
```
