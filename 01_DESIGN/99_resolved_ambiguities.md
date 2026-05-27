---
id: resolved_ambiguities
title: Current Locked Decisions
section: meta
tags: [decisions]
provides: [current_locked_decisions]
deps: []
status: current
---

# Current Locked Decisions

This file contains only current locked decisions.

## Gameplay

- Arena FPS active combat is the game feel.
- Fall damage is always zero.
- Self-damage from own abilities is always zero.
- All weapons can act in air.
- Airborne is not hard CC.
- Parry/protection must be visibly readable on the character.
- No passive abilities, extra slots or RNG procs.
- Physical hit blood is always `#FF3344`.
- Real-fight TTK target is 20-30 seconds with active defense.

## Classes

- Valid classes: Tank, Arciere, Mago, Ibrido.
- Class grammar is owned by `packages/shared/src/constants/classes.ts`.
- Tank uses Sword/Bow with 3 Melee, 2 Bow, 3 Utility (8 total).
- Arciere uses Bow/Staff with 3 Bow, 3 Magic Base, 2 Utility (8 total).
- Mago uses Staff with 3 Magic Base, 3 Magic Advanced, 2 Utility (8 total).
- Ibrido uses Sword/Bow/Staff with 1 Melee, 1 Bow, 2 Magic Base,
  2 Magic Advanced, 2 Utility (8 total).
- Source of truth for slot counts: packages/shared/src/constants/classes.ts.
- Recovery utilities are class-specific: `Brace Recovery`, `Hunter's Flow`,
  `Arcane Rebind`, `Adaptive Mend`.

## Loadout

- Loadout is class-aware and uses `melee[]`, `bow[]`, `magicBase[]`,
  `magicAdvanced[]`, `utility[]`.
- Loadout Forge must derive behavior from `loadout-station.ts` and
  `classes.ts`.
- The Forge must not introduce extra classes, duplicated class/weapon rows, or
  speculative layout notes.

## Ability Runtime

- Exact ability numbers and behavior are owned by
  `packages/shared/src/abilities/registry.ts`.
- Bow M1 is projectile-based.
- Marksman Shot is a fast precision projectile.
- Healing Totem stops at target max HP.
- Mark Target display name is correct; internal id is `ping_mark`.
- Drain effects reduce the target resource unless the ability explicitly says
  otherwise.

## UI / Visual

- The only live UI CSS is `packages/client/public/game-ui.css`.
- Menu and Loadout use static UI background `packages/client/public/ui/sfondo.png`
  and must not show the live arena canvas behind them.
- Only approved runtime assets belong in the repository.
