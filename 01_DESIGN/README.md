# RAGEQUIT — Design Documentation

Single source of truth for the game's design. Files are living contracts and should track the current implementation.

Before using design text as runtime truth, read `../GAME_SYSTEM_MODEL.md`. It
separates the current playable slice from product targets and states which code
files win when design tables drift from live values.

## How to read

- **Full mental model**: follow `MANIFEST.yaml → read_order`
- **Quick lookup**: use `MANIFEST.yaml → query_hints` for minimal context per question
- **By section**: see `MANIFEST.yaml → sections`
- **Locked decisions at a glance**: `MANIFEST.yaml → locked_decisions`

## Visual document hierarchy

Visual work must not load only `09_visual.md` and improvise the rest.

Read visual/UI/VFX documents in this order:

1. Root entrypoint `../GAME_GRAPHIC_AUDIT.md`.
2. Root entrypoint `../VISUAL_STRATEGY.md`.
3. `12_game_graphic_audit.md` for the code-read audit.
4. `15_visual_strategy.md` for direction, design system, performance and asset strategy.
5. `13_graphic_redesign_blueprint.md` for the executable whole-game redesign plan: logo, menu shell, HUD, Loadout Forge and spell/VFX language.
6. `14_visual_redesign_system.md`, `11_ui_redesign_plan.md`, `09_visual.md`, and `../02_TECH/06_visual_performance_contract.md` as supporting constraints.

`13_graphic_redesign_blueprint.md` is the execution plan when changing presentation. `12_game_graphic_audit.md` is evidence, not a substitute for the blueprint.

## Naming convention

Files are prefixed with a section number:

| Prefix | Section                                                   |
| ------ | --------------------------------------------------------- |
| `00_`  | Core (vision, pillars, player journey)                    |
| `01_`  | Combat (stats, controls, arena contract, fundamentals)    |
| `02_`  | Weapons (sword, bow, staff)                               |
| `03_`  | Mastery system                                            |
| `04_`  | Sustain / Recovery decision and old transmutation runtime |
| `05_`  | Abilities (philosophy + per-type lists)                   |
| `06_`  | Build & loadout                                           |
| `07_`  | Game modes                                                |
| `08_`  | Progression                                               |
| `09_`  | Visual / art direction                                    |
| `10_`  | Tech (stack, netcode, assets)                             |
| `11_`  | UI redesign plan                                          |
| `12_`  | Graphic audit                                             |
| `13_`  | Graphic redesign blueprint                                |
| `14_`  | Visual redesign system                                    |
| `15_`  | Visual strategy                                           |
| `99_`  | Meta (resolved ambiguities)                               |

## File format

Every `.md` file starts with YAML frontmatter:

```yaml
---
id: <stable-id>
title: <human-readable-title>
section: <section-key>
tags: [tag1, tag2]
provides: [concept_a, concept_b]
deps: [other_file.md]
status: final
---
```

Most files carry `status: final` from the original design freeze, but current implementation notes may supersede early-phase wording. Active visual work is tracked by the audit/strategy/blueprint/system documents and must stay aligned with code and browser smoke results. Numbers are committed against the TTK 20-30 s design window and must stay internally self-consistent.

Exact live ability damage, cost, cooldown, targeting, cast and tooltip values are
owned by `packages/shared/src/abilities/registry.ts`. Ability list documents
define role, intent and build language; when their snapshot numbers differ from
the registry, update the docs or treat the registry as authoritative.

Current redesign note: `00_classes.md`, `01_arena_fps_reference_study.md` and
`04_resource_sustain_study.md` now supersede the old classless,
airborne-lockout and fixed-transfer target assumptions while the runtime still
contains them.

Ability changes should start from `05_ability_redesign_plan.md` and
`05_ability_target_roster_pass1.md` before editing the old per-type lists or
registry.

## Scope

Core design contracts should stay compact and self-contained. Audit, strategy and blueprint documents may be longer when they need to preserve repository evidence or whole-game execution detail. Cross-references use relative filenames.
