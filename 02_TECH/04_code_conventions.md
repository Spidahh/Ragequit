---
id: code_conventions
title: Code Conventions
section: tech
tags: [conventions, layout, naming, tests, imports]
provides: [folder_layout, naming_rules, import_rules, test_rules]
deps: [00_architecture_overview.md]
status: current
---

# Code Conventions

## Monorepo layout

```
ragequit/                         # repo root (== github.com/Spidahh/Ragequit)
├── 01_DESIGN/                    # gameplay design docs
├── 02_TECH/                      # technical architecture docs (this folder)
├── packages/
│   ├── shared/                   # shared types, constants, sim primitives
│   │   ├── src/
│   │   │   ├── constants/        # stats, TTK, GCD — one file per concern
│   │   │   ├── abilities/        # current 52 ability registry + schema
│   │   │   ├── schema/           # @colyseus/schema shared state classes
│   │   │   ├── sim/              # pure simulation functions (movement, regen, rng)
│   │   │   ├── protocol/         # message types + version
│   │   │   └── index.ts          # barrel export
│   │   └── package.json
│   ├── client/                   # browser code
│   │   ├── src/
│   │   │   ├── main.ts           # current entrypoint; still being split into modules
│   │   │   ├── net/              # loadout sync and future room protocol helpers
│   │   │   ├── render/           # target home for Three.js scene/camera modules
│   │   │   ├── input/            # loadout slots, keybind helpers, wheel logic target
│   │   │   ├── vfx/              # target home for particles, impacts, trails
│   │   │   ├── hud/              # target home for cooldown/status/mastery HUD
│   │   │   ├── audio/            # target home for WebAudio/SFX
│   │   │   ├── ui/               # loadout station, menus, overlays
│   │   │   └── index.html
│   │   └── package.json
│   └── server/                   # Node.js server code
│       ├── src/
│       │   ├── main.ts           # entrypoint — boots Colyseus + Fly health endpoint
│       │   ├── rooms/            # GameRoom; per-mode rooms are future work
│       │   ├── sim/              # authoritative systems — input, movement, hits, etc.
│       │   └── matchmaking/      # target home for queue, ELO, team balance
│       └── package.json
├── tools/
│   └── content-validator/        # target home for ability/content checks
├── package.json                  # monorepo root, pnpm workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json            # extended by every package
├── .eslintrc.cjs
├── .prettierrc
├── .editorconfig
├── .gitignore
├── .nvmrc                        # node lts
├── LICENSE                       # MIT
├── README.md                     # top-level project intro
└── ROADMAP.md                    # phased plan
```

## TypeScript conventions

- **Strict mode on** — `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true` in `tsconfig.base.json`.
- **ESM everywhere** — `"type": "module"` in every `package.json`.
- **Explicit return types on exported functions**. Inferred is fine for locals.
- **No `any`**. Use `unknown` + narrowing, or zod validation at boundaries.
- **`as` casts are a code smell** — require a `// cast: why` comment if used.
- **Naming**: `camelCase` for vars/functions, `PascalCase` for types/classes, `UPPER_SNAKE` for true constants.
- **No default exports** from library modules. Named exports only. Default exports allowed in `main.ts` entrypoints.

## Import rules (enforced by ESLint `no-restricted-imports`)

| From              | Allowed to import                                                         | Forbidden                               |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| `packages/shared` | Node stdlib, zod, @colyseus/schema                                        | any workspace package                   |
| `packages/client` | `packages/shared`, three, colyseus.js, howler, zod, @colyseus/schema, dom | `packages/server`                       |
| `packages/server` | `packages/shared`, colyseus, express, node stdlib, zod                    | `packages/client`, `three`, any DOM API |
| `tools/*`         | anything                                                                  | —                                       |

Circular imports within a package are also forbidden (ESLint `import/no-cycle`).

## Constants and data

- `packages/shared/constants/stats.ts` — HP 200, Mana 100, Stamina 100, regen rates, speeds
- `packages/shared/constants/combat.ts` — TTK window, GCD, parry windows
- `packages/shared/constants/transmute.ts` — transfer ratios and cooldowns
- `packages/shared/abilities/registry.ts` — the current 52 ability definitions

**Every magic number in code must come from a constants module or an AbilityDefinition**. A grep CI check rejects PRs that introduce literals like `200` or `0.3` in sim code without referencing a constants export.

## Testing

### Unit tests (Vitest)

- Co-located: `foo.ts` and `foo.test.ts` in the same directory.
- Focus: pure functions in `packages/shared/sim/*`. Table-driven tests.
- Run: `pnpm -r test` at root; `pnpm test` inside a package.
- Coverage threshold: 80% on `packages/shared/sim/` (gate CI), best-effort elsewhere.

### Determinism tests

A dedicated determinism replay test is still future work. Until then, keep sim helpers pure where possible and cover movement/resource/status/ability decisions with focused Vitest cases.

### Content validator

The current safety net is the shared ability registry test suite. A standalone `tools/content-validator` command is planned, not live.

### E2E / browser smoke

- Local browser QA should open the Vite client, check console errors, verify the main menu/loadout station, and confirm fixed transfer utilities plus no rune/passive UI.
- Combat E2E with two browser clients is planned.

## Commits and PRs

- **Commit style**: imperative, ≤ 72 chars for subject, body explains why. Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) encouraged but not gated.
- **Branch names**: `codex/short-slug` for assistant work unless the user requests another prefix.
- **PRs**: keep changes reviewable; gameplay, UI, docs, and refactors should be separated when possible.
- **CI gates on merge**: typecheck, lint, unit tests, build, and later standalone content validation.

## Tooling

- **Prettier**: use existing repo formatting conventions.
- **ESLint**: typescript-eslint checks run through `pnpm lint`.
- **Node**: follow the version declared by the package/tooling files.
- **Pnpm**: 10+. `packageManager` field in root `package.json`.
- **Editor**: `.editorconfig` enforces LF, 2-space, trim trailing whitespace.

## What the AI assistant (me) writes

- **Code with tests**. Every non-trivial shared function arrives with a sibling `.test.ts`.
- **Typed boundaries**. No untyped any at import/export surfaces.
- **Small PR-sized chunks** during implementation phases — I don't open 500-line commits if I can avoid it.
- **Comments**: explain _why_ the non-obvious thing, not _what_ the code does. If what needs explaining, the code is probably wrong.
- **No dead files**. If something stops being used, I delete it in the same commit that removes the last caller.
