---
id: project_governance
title: Project Governance
section: tech
tags: [governance, structure, conventions, ci, quality]
provides: [folder_structure, file_size_guard, quality_gate, anti_drift]
deps: [architecture_overview, code_conventions]
status: current
---

# Project Governance

How we keep the repo clean and stop the recurring mistakes. **Run `pnpm check`
before committing** — it is the single gate that catches the classes of error
that have bitten this project.

## The quality gate: `pnpm check`

One command runs everything, in order:

1. `pnpm typecheck` — no type errors anywhere.
2. `pnpm check:budget` — file-size guard (see below).
3. `pnpm lint` — eslint, zero warnings.
4. `pnpm validate:content` — content/ability validation.
5. `pnpm test` — all unit tests (client + server + shared).

If `pnpm check` is green, the change is safe to commit. CI should run it too.

## File-size guard (the anti-monolith ratchet)

`tools/check-file-budget.mjs` (`pnpm check:budget`) enforces the project rule:
**a source file must not exceed 800 lines** (target ~500). This is the rule whose
violation produced the god-files (`main.ts`, `GameRoom.ts`).

It uses a **ratchet**: the handful of currently-oversized files are grandfathered
with their current line count as a *ceiling* — they may only SHRINK, never grow.
Every other source file must stay ≤ 800. So:

- New monoliths are impossible (a new file over 800 fails the gate).
- Existing monoliths can only get smaller. As you shrink one, lower its ceiling
  in the `BUDGET` map (the tool prints "ratchet opportunities"). When it reaches
  ≤ 800, delete its entry.

Currently grandfathered (goal: drive each to ≤ 800, then remove from `BUDGET`):
`main.ts`, `GameRoom.ts`, `AbilityEngine.ts`, `audio/sound-engine.ts`, and
`abilities/registry.ts` (a pure DATA table — large by nature, ratcheted so it
can't balloon but exempt from the "split it" intent).

## How to shrink a god-file (the proven pattern)

Two shapes, both verified safe this project:

1. **Controller** — encapsulate a cohesive runtime system as a factory returning a
   small handle (like `createFpvBow`), move it to its own file, the caller just
   holds the handle. Examples: `render/fpv-static-viewmodel.ts`,
   `menu/account-ui.ts`, `net/schema-readers.ts`.
2. **Pure module + test** — extract stateless logic into a module that takes data
   explicitly (not `this`/room state), and add a unit test. Examples:
   `sim/combat-geometry.ts`, `sim/projectile-collision.ts`, `sim/spawn-selection.ts`,
   `sim/resource-regen.ts`, `sim/targeting-geometry.ts`, `loadout/ability-format.ts`.

Do NOT over-fragment glue/orchestration into tiny modules — that makes the code
worse. Stateful orchestration (tick loop, message handlers, damage drain) is
extracted with a host-interface class, in a focused pass, gated by tests.

## Folder structure (where code goes)

```
packages/
  shared/src/   sim/ (pure deterministic helpers, schemas), abilities/ (registry+DSL),
                constants/, config/, protocol/, status/   — the single source of truth
  server/src/   rooms/ (Colyseus GameRoom), sim/ (server-side systems + pure helpers)
  client/src/   render/ (Three.js), world/ (arena), input/, hud/, menu/, net/,
                loadout/, audio/, game/ (FSM, VFX helpers), main.ts (thin orchestrator)
tools/          governance + asset/content scripts (check-file-budget, validator, clean)
02_TECH/        technical contracts (this folder) — keep accurate, see below
```

New pure helpers go under `sim/`. New UI components under `hud/`/`menu/`. New
render systems under `render/`. New net/schema helpers under `net/`.

## Docs must match the code (anti-drift)

The foundational docs (`AGENTS.md`, `02_TECH/*`, `01_DESIGN/*`, `README`) are a
source of truth agents/devs start from. When they drift, everyone repeats the same
mistakes (this project shipped `sword_D.glb` in 4 docs while the loader used
`sword.glb`). Rules:

- When you change behaviour, fix the docs that describe it **in the same commit**.
- Trust the CODE over any doc; if a doc disagrees, fix the doc.
- Numeric "single source of truth" lives in `constants/*.ts`; mirrors elsewhere
  (e.g. `config/balance.ts`) must DERIVE from them, guarded by a test
  (`config/balance.test.ts`).

## Verifying gameplay changes

Unit tests don't exercise pointer-lock input or rendering. For anything visible,
drive the real game in-browser (Chrome MCP): enter a match, act, screenshot.
Server-only logic is covered by the server test suite.
