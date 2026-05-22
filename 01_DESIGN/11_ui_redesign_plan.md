---
id: ui_redesign_plan
title: Systemic UI Redesign Plan
section: art
tags: [ui, ux, hud, menus, loadout, readability]
provides: [ui_redesign_sequence, hud_hierarchy, no_random_overlay_rule]
deps: [09_visual.md, 01_controls.md, 06_loadout_build.md]
status: active
---

# Systemic UI Redesign Plan

> 2026-05-22 update: this plan must now be executed as a class-aware arena-FPS
> HUD/loadout redesign. References below to fixed transfers or old mastery
> surfaces describe the live legacy UI until the Recovery utility contract and
> the class loadout rewrite replace them.

## Why This Exists

The current game has working systems, but the visual layer reads too much like stacked web panels. The fix is not to add more widgets. The fix is to define hierarchy, remove noise, reuse surfaces, and make every screen feel like one coherent action game.

This document is the required plan before the next HUD/menu/loadout redesign pass.

## Hard Rule

Do not add a new persistent combat HUD surface unless it replaces or consolidates an existing one.

Center-screen is reserved for gameplay only:

- crosshair
- parry ring
- cast or charge feedback
- placement preview
- hit confirmation
- short error flash when an action is impossible

Do not place explanatory panels, tutorials, permanent action labels, or large command hints in the play view. Those belong in the pause menu, settings, lobby, loadout station, or a first-time training layer.

## Current Problems

- Too many HUD layers compete for the same attention zone: crosshair, cast bar, bow charge, parry ring, cooldown strip, weapon strip, status panel, server messages, action labels, and tutorial text.
- The bottom of the screen is overloaded: resources, weapon strip, cooldowns, primed state, and ability state are visually separated instead of reading as one combat console.
- Menus and loadout still lean toward rectangular HTML panels instead of game surfaces with strong hierarchy, fewer words, clear icons, and deliberate spacing.
- The loadout station exposes many filters and controls at once. It works, but it asks the player to parse a tool instead of helping them build a combo.
- Ability information is not yet consistently grouped by gameplay value: opener, control, cashout, reset, protection, resource swing, and cast mode.
- Feedback hierarchy is weak. Important states such as primed ability, placement preview, locked action, cooldown, or missing resource should be visible without adding another floating box.
- The arena and character presentation still feel like blockout, so UI polish alone will not make the game feel current.

## Target HUD Hierarchy

### Layer 0: World Readability

The world, enemy silhouettes, projectiles, AoE decals, status VFX, and hit reactions must carry most combat information.

### Layer 1: Permanent Combat HUD

Always visible, compact, and stable:

- resources
- current weapon
- equipped combat slots
- utility slots, including fixed transfers
- minimal cooldown/readiness state

This should become one coherent bottom combat console, not multiple disconnected strips.

### Layer 2: Contextual Combat HUD

Appears only during an action state:

- cast bar
- bow charge
- parry charge/ring
- placement preview
- primed ability highlight
- failed-action flash

These states should reuse the hotbar, crosshair, and cast/charge surfaces. Avoid new panels.

### Layer 3: Menus And Teaching

All explanations, control reminders, tips, keybind descriptions, and long text belong here:

- main menu
- pause menu
- settings
- loadout station
- training helper screens

## Screen-by-Screen Direction

### In-Game HUD

- Remove center/bottom explanatory action panels. Replace them with subtle hotbar/crosshair states.
- Merge weapon strip, combat abilities, utility slots, and cooldowns into a single bottom combat console.
- Keep resources draggable and resizable, but make them visually belong to the combat console when left at default position.
- Show the primed wheel selection by lighting the relevant slot and adding a small crosshair accent, not by adding text in the middle of the screen.
- Show placement spells through ground previews and slot state. LMB confirmation should be obvious through the preview itself.
- Failed actions should use a short slot pulse plus a compact reason near the relevant slot, not a persistent floating label.

### Loadout Station

- Keep the contract from `06_loadout_build.md`, but change the feel from catalogue page to build station.
- Make the first read about the build, not the filters: equipped slots, combo flow, and selected ability must dominate.
- Collapse secondary filters into compact chips or a drawer. `SMART`, `CONTROL`, `INSTANT`, and `PREVIEW` remain available but should not visually block the station.
- Ability cards must communicate in this order: icon, role, cast mode, main effect, cost/cooldown, tags.
- The cast-mode control must read as a deliberate setting: `INSTANT` for immediate direct-key cast, `PREVIEW` for aim/place then LMB confirm.
- Descriptions should be short and player-facing: effect, status, range/shape, and tradeoff. No design notes and no comparisons to other spells.
- Add build guidance as a small coach surface tied to the combo flow: opener, control, cashout, reset, survival/resource.

**First-session onboarding (new player / empty build):** When a player opens the Loadout Station for the first time (no saved build in localStorage), the station must pre-fill a **Recommended Starter Build** instead of showing 11 empty slots. The build:

- Shows a complete, functional loadout with Opener → Control → Cashout → Reset → Survival roles all represented
- The BUILD FLOW strip highlights the combo path so the player immediately sees the intent
- A small callout ("Starter build — change any slot to customize") makes clear this is a starting point, not a locked choice
- The `SMART` filter in the pool highlights alternatives for the selected slot
- Exact starter build composition → see `06_loadout_build.md` recommended starter section

### Main, Pause, Settings

- Main and pause menus should share one visual language: fewer large bordered rectangles, stronger command rows, tabs, icons, and readable spacing.
- ESC opens a pause/settings layer, never an immediate quit to lobby.
- Instructions and click-to-play hints belong in lobby/pause/training surfaces, not inside live play.
- Settings must remain editable and persistent, especially keybinds.

**Main menu atmosphere requirement:** `#bg-canvas` must render a live Three.js arena scene (slow orbit or static camera, desaturated, low ambient VFX). A dark or empty canvas is NOT acceptable in the final product. When the arena asset is not yet available or fails to load, use a fallback procedural environment (dark ground plane + ambient point lights + arena ring geometry) rather than a blank canvas. The menu must communicate "you are about to enter an arena", not "you are loading a web app".

**Tagline:** The main menu tagline must communicate the core game proposition in ≤5 words. "PvP ARENA COMBAT" is functional but generic. Preferred direction: something that communicates the build-crafting + knockup identity, e.g. "BUILD YOUR WEAPON. OWN THE ARENA." — exact copy TBD, but must not be a description of the genre.

### Wheels

- Wheels remain selection palettes, not launchers.
- Holding Q/E allows continuous sector switching until release.
- Release primes the selected slot. LMB fires or confirms the primed action.
- Direct keys keep their immediate behavior according to cast mode.
- The wheel UI should show fewer words: icon, key, cooldown, selected sector, and cast mode marker.

### Combat Feedback And VFX

- Prefer world feedback over UI labels: launch, root, freeze, blind, shield, lifesteal, stat drain, and knockback need clear VFX.
- Knockup/airborne combos must be readable on two levels: (1) world — lift height, arc, blood/impact trail on follow-up hit; (2) HUD — a small AIR tag near the target health bar during the window, and an exaggerated impact flash on conversion. Full spec in `01_combat_fundamentals.md` Knockup combo feedback section.
- Blind or reduced vision should visibly affect the target client while staying fair in multiplayer.
- AoE and slow projectiles need ground decals or trails with clear edges.

## Implementation Order

1. HUD subtraction pass:
   - remove or fold center/bottom explanatory panels into hotbar/crosshair/cast states
   - define one bottom combat console layout
   - verify no overlap at desktop and narrow browser sizes
2. Loadout Station v2:
   - redesign hierarchy around equipped build + selected ability + combo flow
   - reduce always-visible filter noise
   - make cast mode and utility transfers unmistakable
3. Menu shell pass:
   - unify main, pause, settings, lobby, and training instructions
   - move in-game tutorial text out of live play
4. Combat feedback pass:
   - improve status/VFX language for launch, airborne follow-up, blind, root, freeze, shield, drain, splash, ray, and slow projectile archetypes
5. Art/blockout pass:
   - improve arena silhouettes, lighting, player readability, projectile trails, and hit feedback without raising browser cost too much

## Acceptance Criteria

- Browser screenshots at 1366x768, 1920x1080, and a narrow/tall viewport show no incoherent overlap.
- Live combat has no persistent explanatory center-screen panels.
- Crosshair remains visually dominant and unobstructed.
- Primed ability, placement preview, cooldown, and locked action are understandable through existing HUD surfaces.
- Loadout Station is understandable in 10 seconds: selected slot, what the ability does, cast mode, and why it fits the build are obvious.
- Menus no longer look like a generic webpage: consistent game frame, command hierarchy, and restrained copy.
- Input contract is preserved: pointer lock, LMB/RMB, Tab, wheel keys, direct keys, and keybind persistence still work.
