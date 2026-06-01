# RAGEQUIT

Browser PvP arena FPS with an authoritative Colyseus server, Three.js client,
class-aware loadouts, deterministic abilities, Supabase-backed auth/persistence,
and a single live CSS visual system.

## Current Runtime

- Server: Fly.io app `ragequit-server`, region `ams`, port `8080` in prod
  (`PORT` env); local dev default `2567`.
- Client: Vite browser app in `packages/client`, static build output in
  `packages/client/dist/` for Cloudflare Pages.
- Shared gameplay source: `packages/shared/src/abilities/registry.ts`.
- Active classes: Tank, Arciere, Mago, Ibrido.
- Active loadout grammar: class-aware `melee[]`, `bow[]`, `magicBase[]`,
  `magicAdvanced[]`, `utility[]`.
- Active visual stylesheet: `packages/client/public/game-ui.css`.

## Start Here

- Mandatory agent facts: [`AGENTS.md`](AGENTS.md)
- Runtime system model: [`GAME_SYSTEM_MODEL.md`](GAME_SYSTEM_MODEL.md)
- Current state: [`ROADMAP.md`](ROADMAP.md)
- Design contracts: [`01_DESIGN/README.md`](01_DESIGN/README.md)
- Technical contracts: [`02_TECH/README.md`](02_TECH/README.md)
- Deploy state: [`02_TECH/10_deploy_status.md`](02_TECH/10_deploy_status.md)

## Repository Layout

```text
ragequit/
├── AGENTS.md              # agent/contributor playbook (source of truth)
├── GAME_SYSTEM_MODEL.md
├── ROADMAP.md
├── SETUP.md
├── 01_DESIGN/             # design docs
├── 02_TECH/              # technical docs (incl. 08_project_governance.md)
├── tools/                # check-file-budget.mjs, asset pipeline
├── packages/
│   ├── shared/            # constants, abilities registry, sim helpers, balance
│   ├── client/            # Three.js client (build → packages/client/dist)
│   └── server/            # Colyseus authoritative server (Docker → :8080)
└── supabase/              # auth / stats backend
```
