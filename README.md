# RAGEQUIT

Browser PvP arena — 1v1-first vertical slice with 5v5 / FFA as product
targets. Skill-based, build-crafting core. The confirmed redesign target is an
active arena FPS with four class grammars, Sword / Bow / Staff access shaped by
class, and Magic split into Base and Advanced.

**Status**: Vertical slice playable. The codebase now includes the Colyseus
authoritative server, Three.js client, 52 data-driven abilities, the old runtime
Mastery/fixed-transfer loadout path, status effects, bots, match flow, replay
scaffolding, remappable/persisted settings, pause menu, and a rebuilt Loadout
Station. Current focus: redesign coherence, visual coherence, browser-verified
combat feel, runtime asset stability, and the production layers still listed in
`ROADMAP.md`.

## Where to start

- **Running the project** → [`SETUP.md`](SETUP.md) — from zero to `pnpm dev` with the browser client connected to the server.
- **Deploy & production state** → [`02_TECH/10_deploy_status.md`](02_TECH/10_deploy_status.md) — Fly.io live, Supabase configured, existing assets. Read this before asking about deploy or infrastructure.
- **Implementation plan** → [`ROADMAP.md`](ROADMAP.md) — current-state roadmap from playable slice to production-ready arena.
- **Game system model** → [`GAME_SYSTEM_MODEL.md`](GAME_SYSTEM_MODEL.md) — current runtime, target product, and source-of-truth hierarchy before larger changes.
- **Redesign master plan** → [`REDESIGN_MASTER_PLAN.md`](REDESIGN_MASTER_PLAN.md) — dependency order for classes, combat, abilities, UI, visual work, and verification.
- **Agent rules** → [`AGENTS.md`](AGENTS.md) — mandatory rules for AI/coding agents, includes FATTI STABILITI (established facts not to re-ask).
- **Game design** → [`01_DESIGN/README.md`](01_DESIGN/README.md) — the gameplay contract (what the game does).
- **Technical architecture** → [`02_TECH/README.md`](02_TECH/README.md) — how the code is structured to deliver that gameplay.
- **Graphic audit entrypoint** → [`GAME_GRAPHIC_AUDIT.md`](GAME_GRAPHIC_AUDIT.md) — root pointer to the current repository-read visual audit.
- **Visual execution entrypoint** → [`VISUAL_STRATEGY.md`](VISUAL_STRATEGY.md) — root pointer to the current visual strategy, blueprint, and UI/VFX contracts.

Read order for a fresh walkthrough: `GAME_SYSTEM_MODEL.md` -> `REDESIGN_MASTER_PLAN.md` -> `ROADMAP.md` -> `01_DESIGN/MANIFEST.yaml` -> `02_TECH/00_architecture_overview.md`.

Read order for visual/UI/VFX work: `GAME_GRAPHIC_AUDIT.md` -> `VISUAL_STRATEGY.md` -> `01_DESIGN/13_graphic_redesign_blueprint.md` -> `02_TECH/06_visual_performance_contract.md`.

AI/coding agents must also read [`AGENTS.md`](AGENTS.md) before editing. It contains the non-negotiable gameplay, UI, input, visual, verification, and documentation rules for this repo.

## Repository layout

```
ragequit/
├── README.md              # This file
├── ROADMAP.md             # Current milestones and open work
├── SETUP.md               # Local setup instructions
├── AGENTS.md              # Mandatory rules for AI/coding agents
├── GAME_SYSTEM_MODEL.md   # Runtime vs target model and document hierarchy
├── REDESIGN_MASTER_PLAN.md # Class/combat/UI/visual redesign critical path
├── GAME_GRAPHIC_AUDIT.md  # Root graphic audit entrypoint
├── VISUAL_STRATEGY.md     # Root visual execution entrypoint
├── LICENSE                # MIT
├── 01_DESIGN/             # Gameplay design contracts
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
