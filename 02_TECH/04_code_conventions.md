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
│   │   │   ├── abilities/        # current 53 ability registry + schema
│   │   │   ├── schema/           # @colyseus/schema shared state classes
│   │   │   ├── sim/              # pure simulation functions (movement, regen, rng)
│   │   │   ├── protocol/         # message types + version
│   │   │   └── index.ts          # barrel export
│   │   └── package.json
│   ├── client/                   # browser code
│   │   ├── index.html            # Vite HTML entrypoint
│   │   ├── src/
│   │   │   ├── main.ts           # bootstrap/orchestration entrypoint
│   │   │   ├── net/              # loadout sync and room protocol helpers
│   │   │   ├── render/           # Three.js scene, characters, camera and viewmodels
│   │   │   ├── input/            # loadout slots, keybind helpers, cast and wheel logic
│   │   │   ├── vfx/              # particles, impacts and trails
│   │   │   ├── hud/              # cooldown, status and combat HUD modules
│   │   │   ├── audio/            # WebAudio/SFX helpers
│   │   │   ├── world/            # runtime arena and map rendering helpers
│   │   │   └── types/            # client-facing type helpers
│   │   └── package.json
│   └── server/                   # Node.js server code
│       ├── src/
│       │   ├── main.ts           # entrypoint — boots Colyseus + Fly health endpoint
│       │   ├── rooms/            # GameRoom
│       │   ├── sim/              # authoritative systems — input, movement, hits, etc.
│       │   └── matchmaking/      # target home for queue, ELO, team balance
│       └── package.json
├── tools/
│   ├── content-validator/        # current ability/content checks
│   └── asset-pipeline/           # audits and offline asset processing
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
└── ROADMAP.md                    # current project state
```

## TypeScript conventions

- **Strict mode on** — `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true` in `tsconfig.base.json`.
- **ESM everywhere** — `"type": "module"` in every `package.json`.
- **Explicit return types on exported functions**. Inferred is fine for locals.
- **No `any`**. Use `unknown` + narrowing and typed protocol/schema boundaries.
- **`as` casts are a code smell** — require a `// cast: why` comment if used.
- **Naming**: `camelCase` for vars/functions, `PascalCase` for types/classes, `UPPER_SNAKE` for true constants.
- **No default exports** from library modules. Named exports only. Default exports allowed in `main.ts` entrypoints.

## Import rules (enforced by ESLint `no-restricted-imports`)

| From              | Allowed to import                                                                   | Forbidden                                |
| ----------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| `packages/shared` | Node stdlib where needed, `@colyseus/schema`                                        | any workspace package                    |
| `packages/client` | `@ragequit/shared`, Three.js, `colyseus.js`, Supabase/PostHog client libs, DOM APIs | `packages/server`                        |
| `packages/server` | `@ragequit/shared`, Colyseus, Express, Supabase/PostHog server libs, Node stdlib    | `packages/client`, Three.js, any DOM API |
| `tools/*`         | workspace packages and tool dependencies                                            | DOM/runtime assumptions unless explicit  |

Circular imports within a package are also forbidden (ESLint `import/no-cycle`).

## Constants and data

- `packages/shared/src/constants/stats.ts` — HP 200, Mana 100, Stamina 100, regen rates, speeds
- `packages/shared/src/constants/combat.ts` — TTK window, GCD, parry windows
- `packages/shared/src/abilities/registry.ts` — the current 53 ability definitions

**Every magic number in code must come from a constants module or an AbilityDefinition**. A grep CI check rejects PRs that introduce literals like `200` or `0.3` in sim code without referencing a constants export.

## Testing

### Unit tests (Vitest)

- Co-located: `foo.ts` and `foo.test.ts` in the same directory.
- Focus: pure functions in `packages/shared/sim/*`. Table-driven tests.
- Run: `pnpm -r test` at root; `pnpm test` inside a package.
- Coverage threshold: 80% on `packages/shared/sim/` (gate CI), best-effort elsewhere.

### Determinism tests

Keep sim helpers pure where possible and cover movement/resource/status/ability decisions with focused Vitest cases.

### Content validator

The shared ability registry tests remain the first safety net. The root
`pnpm validate:content` command also runs the current validator entrypoint in
`tools/content-validator/validate.ts`.

### E2E / browser smoke

- Local browser QA should open the Vite client, check console errors, verify the
  main menu/loadout station, and confirm no removed UI surfaces are visible.

## Commits and PRs

- **Commit style**: imperative, ≤ 72 chars for subject, body explains why. Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) encouraged but not gated.
- **Branch names**: `codex/short-slug` for assistant work unless the user requests another prefix.
- **PRs**: keep changes reviewable; gameplay, UI, docs, and refactors should be separated when possible.
- **CI gates on merge**: typecheck, lint, unit tests, build, and `pnpm validate:content`.

## Tooling

- **Prettier**: use existing repo formatting conventions.
- **ESLint**: typescript-eslint checks run through `pnpm lint`.
- **Node**: follow the version declared by the package/tooling files.
- **Pnpm**: 10+. `packageManager` field in root `package.json`.
- **Editor**: `.editorconfig` enforces LF, 2-space, trim trailing whitespace.

## File size limits

| Status | Line count | Action |
|--------|-----------|--------|
| ✅ OK | ≤ 500 | No action needed |
| ⚠️ Monitor | 500–800 | Consider splitting on next touch |
| 🚨 Must split | > 800 | Extract a distinct responsibility before adding features |

**Pattern** (learned from `main.ts` → game/, hud/, render/, input/, world/ split):
1. Identify distinct responsibilities in the large file.
2. Create a new file in the appropriate subfolder.
3. Move the responsibility with named exports.
4. Update imports in the original file.
5. Update the "Main Code Surfaces" table in `02_TECH/00_architecture_overview.md`.

Current large files to watch:
- `packages/client/src/main.ts` (~3245 lines) — continue extracting
- `packages/server/src/rooms/GameRoom.ts` (~2882 lines) — next split candidate
- `packages/server/src/sim/AbilityEngine.ts` (~1063 lines) — borderline

## What the AI assistant (me) writes

- **Code with tests**. Every non-trivial shared function arrives with a sibling `.test.ts`.
- **Typed boundaries**. No untyped any at import/export surfaces.
- **Small PR-sized chunks** during implementation phases — I don't open 500-line commits if I can avoid it.
- **Comments**: explain _why_ the non-obvious thing, not _what_ the code does. If what needs explaining, the code is probably wrong.
- **No dead files**. If something stops being used, I delete it in the same commit that removes the last caller.
