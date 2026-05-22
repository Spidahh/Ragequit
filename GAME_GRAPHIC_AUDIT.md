# GAME GRAPHIC AUDIT

Root entrypoint for the current code-read graphic audit.

Canonical audit document:

- [`01_DESIGN/12_game_graphic_audit.md`](01_DESIGN/12_game_graphic_audit.md)

This file exists at repository root because the graphic audit is a required input
before whole-game visual work. Do not skip it and do not replace it with generic
art assumptions.

## What The Audit Controls

Read the canonical audit before deciding or changing:

- menu, pause, settings, HUD, loadout, scoreboard, loading and game shell presentation;
- Three.js scene, camera, lighting, materials, arena, character, weapon and VFX work;
- projectile, zone, spell, status and feedback visuals;
- asset search, asset replacement or fallback decisions.

## Current Audit Findings That Must Stay Visible

- RAGEQUIT is a desktop browser PvP arena slice with active `Play 1v1`,
  `Training`, and `Free For All` menu/loadout paths.
- The client presentation is split across Three.js world rendering and DOM/CSS
  HUD/menu surfaces.
- Current runtime uses arena, weapon and character assets together with
  procedural fallbacks and code-driven VFX.
- Current presentation debt is whole-game debt, not only asset debt: menus,
  Loadout Forge, HUD hierarchy, spell language, projectiles, arena coherence and
  character/weapon runtime assets must be evaluated together.
- Unknowns must stay labeled as `non deducibile dal codice` in the canonical
  audit instead of being invented.

## Required Follow-Up Documents

After the audit, read:

1. [`VISUAL_STRATEGY.md`](VISUAL_STRATEGY.md)
2. [`01_DESIGN/15_visual_strategy.md`](01_DESIGN/15_visual_strategy.md)
3. [`01_DESIGN/13_graphic_redesign_blueprint.md`](01_DESIGN/13_graphic_redesign_blueprint.md)
4. [`01_DESIGN/14_visual_redesign_system.md`](01_DESIGN/14_visual_redesign_system.md)
5. [`01_DESIGN/11_ui_redesign_plan.md`](01_DESIGN/11_ui_redesign_plan.md)
6. [`02_TECH/06_visual_performance_contract.md`](02_TECH/06_visual_performance_contract.md)
