# RAGEQUIT

Browser PvP arena — 1v1-first vertical slice with 5v5 / FFA as product targets. Skill-based, build-crafting core. Three weapons (Sword / Bow / Staff) and five magic elements glued together by the Element Mastery system.

**Status**: Vertical slice playable. The codebase now includes the Colyseus authoritative server, Three.js client, 52 data-driven abilities, mastery, fixed transfer utilities, status effects, bots, match flow, replay scaffolding, remappable/persisted settings, pause menu, and a rebuilt Loadout Station. Current focus: combat feel, loadout readability, ability quality, and client modularization.

## Where to start

- **Running the project** → [`SETUP.md`](SETUP.md) — from zero to `pnpm dev` with the browser client connected to the server.
- **Implementation plan** → [`ROADMAP.md`](ROADMAP.md) — current-state roadmap from playable slice to production-ready arena.
- **Game design** → [`01_DESIGN/README.md`](01_DESIGN/README.md) — the gameplay contract (what the game does).
- **Technical architecture** → [`02_TECH/README.md`](02_TECH/README.md) — how the code is structured to deliver that gameplay.

Read order for a fresh walkthrough: `ROADMAP.md` -> `01_DESIGN/MANIFEST.yaml` -> `02_TECH/00_architecture_overview.md`.

## Repository layout

```
ragequit/
├── README.md              # This file
├── ROADMAP.md             # 11-phase implementation plan
├── SETUP.md               # Local setup instructions
├── LICENSE                # MIT
├── 01_DESIGN/             # Gameplay design (single source of truth)
├── 02_TECH/               # Technical architecture docs
├── packages/
│   ├── shared/            # Types, constants, @colyseus/schema, protocol
│   ├── client/            # Three.js + Vite browser app
│   └── server/            # Colyseus authoritative sim
├── apps/
│   └── web/               # Static build output (Cloudflare Pages target)
├── tools/                 # Content validators / future asset pipeline
├── .github/workflows/     # CI — lint + typecheck + test + build
├── package.json           # Monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
```
