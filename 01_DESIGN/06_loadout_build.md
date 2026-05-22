---
id: loadout_build
title: Loadout & Build System
section: meta
tags: [build, loadout, slots, wheel_binding]
provides: [slot_layout, build_constraints, wheel_population]
deps: [05_abilities_philosophy.md, 01_controls.md, 03_mastery_system.md]
status: redesign
---

# Loadout & Build System

> Current runtime still exposes the older 11-slot classless build and fixed
> transfers. Confirmed target redesign is class-based: slot distribution follows
> `00_classes.md`, Magic splits into Base and Advanced, and target sustain drops
> fixed transfers in favor of class-legal Recovery choices.

The loadout IS the build system. This is where RAGEQUIT's class grammar and
build-crafting identity meet.

## Target class slot grammar — 11 total

The approved target keeps 11 total slots but changes which pools each class can
use:

| Class   | Melee | Bow | Magic Base | Magic Advanced | Utility |
| ------- | ----- | --- | ---------- | -------------- | ------- |
| Tank    | 3     | 2   | 0          | 0              | 6       |
| Arciere | 0     | 3   | 4          | 0              | 4       |
| Mago    | 0     | 0   | 4          | 4              | 3       |
| Ibrido  | 1     | 1   | 2          | 2              | 5       |

See `00_classes.md` for resource emphasis and class mechanics. Target Utility
slots are class-legal choices; fixed transfer sectors belong only to the current
runtime snapshot below.

## Target wheels and direct binds

The wheel interaction contract does not change, but sector counts follow the
selected class loadout:

| Class   | Ability Wheel `E` sectors | Utility Wheel `Q` sectors | Reason                                      |
| ------- | ------------------------- | ------------------------- | ------------------------------------------- |
| Tank    | 5                         | 6                         | Physical kit is utility-heavy               |
| Arciere | 7                         | 4                         | Bow plus Magic Base toolkit                 |
| Mago    | 8                         | 3                         | Spell kit is the main combat surface        |
| Ibrido  | 6                         | 5                         | Mixed weapon/magic kit with broader utility |

Direct hotkeys mirror equipped slots after the class redesign. The exact default
key map is an input implementation decision, but it must:

- keep wheel hold/release/prime/LMB behavior;
- expose every equipped combat and Utility slot without fixed transfer keys;
- keep class-specific slot families visible in Loadout and HUD;
- stay remappable without overlapping core movement/aim input.

## Current runtime slot layout — 11 total

| Slot    | Count | Pool                                                                 |
| ------- | ----- | -------------------------------------------------------------------- |
| Melee   | 1     | From 6 melee abilities (`05_abilities_melee.md`)                     |
| Bow     | 1     | From 8 bow abilities (`05_abilities_bow.md`)                         |
| Magic   | 5     | From 27 magic abilities across 5 elements (`05_abilities_magic.md`)  |
| Utility | 4     | Three fixed transfers + one flex utility (`05_abilities_utility.md`) |

**Total: 11 runtime slots.** The 7 combat slots (1 Melee + 1 Bow + 5 Magic)
appear on the Ability Wheel (E hold). The 4 utility slots appear on the Utility
Wheel (Q hold): three fixed transfers plus one flex utility.

## Current runtime Ability Wheel (E) — 7 sectors

The 7 non-utility abilities map to the 7 sectors of the E wheel in this order:

```
Sector 1: Melee ability
Sector 2: Bow ability
Sectors 3-7: Magic abilities 1-5
```

Direct binds mirror the wheel slots and bypass wheel priming. Instant abilities cast immediately; placement abilities open their preview and use LMB to confirm. The wheel itself only primes a slot; LMB fires the primed ability or opens its placement preview. See `01_controls.md`.

The same ability cannot occupy multiple slots in one build. Fixed transfers are locked to Z/X/F and cannot be selected again in the V flex utility slot.

## Current runtime Utility Wheel (Q) — 4 sectors

The current Q wheel runtime is:

```
Sector 1: Transfer HP→Mana
Sector 2: Transfer Mana→Stamina
Sector 3: Transfer Stamina→HP
Sector 4: Flex utility
```

See `04_transmutation.md`.

Direct hotkeys may mirror wheel sectors, but they do not replace the wheels. Default mirrors are Z/X/F for the fixed transfers and V for the flex utility. All rebindable; cannot overlap with wheel keys.

## Build constraints

- **No ability can be slotted twice** (no doubled Fireballs)
- **Current vertical slice**: all abilities are available in the Loadout Station for testing.
- **Future progression**: unlock filtering can be added later via quest/account state (`08_progression.md`).

## Target Loadout Station UI contract

The Loadout Station is the actual build editor, not a generic HTML form. It must keep these readable surfaces visible:

- **Slot column**: every slot shows key, icon, ability name, role,
  cost/cooldown, and cast mode (`INSTANT` or `PREVIEW`). It must explain slot
  legality for the selected class instead of showing forbidden pools as random
  dead cards. Recovery coverage must be visible because target fixed transfers
  are removed. Runtime fixed transfers stay visibly locked only while the old
  sustain model is still live. Cast mode defaults: abilities with
  `targeting: point` (ground-placement AoE) default to `PREVIEW`; all others
  default to `INSTANT`. Players can override the default per-slot in the
  Loadout Station; the preference persists in browser storage.
- **Selected ability panel**: shows role, cast mode behavior, effect tags, quick-stat bars, player-facing description, build coach, and mini-malus.
- **Build flow strip**: `Opener / Control / Cashout / Reset` states summarize whether the build has the basic combo skeleton.
- **Class mechanic surface**: the selected class, its allowed slot grammar and
  its mechanic summary are visible during build decisions. Runtime Mastery pills
  may remain until the old build model is removed, but are not the target
  identity surface.
- **Ability pool**: cards show icon, role, cast mode toggle, description, effect tags, and quick stat bars. Search and filters must remain visible.

Required pool filters:

- `SMART`: abilities recommended for the currently selected slot/build gap.
- `STARTER`: launch, root, freeze, stun, blind, or other opener role.
- `CONTROL`: abilities with hard control or meaningful zone control.
- `INSTANT`: abilities whose direct key casts immediately.
- `PREVIEW`: placement abilities that arm a preview and confirm with LMB.
- `ALL`, element filters, and `PHYSICAL`.

The station must be responsive. On narrow widths, the ability pool should move below the slot/details panels instead of being squeezed off-screen.

## Build saving

Account-backed build presets are not implemented yet. The Loadout Station currently saves the local active build in browser storage; when a room is active it also sends the validated loadout to the server. Play/Training must pass through the launch CTA (`START 1V1` / `START TRAINING`) before connecting; the standalone editor keeps the `SAVE BUILD` label.

## Target starter builds

Starter builds are first-session teaching builds. They are not balance claims or
recommended ranked meta. Each one must enter Training with:

- one Recovery utility;
- one movement answer;
- one readable setup and one cashout path;
- enough class mechanic exposure that the selected class does not feel like a
  skin over the old classless loadout.

### Tank starter

| Slot family | Pick           | Teaching job                                             |
| ----------- | -------------- | -------------------------------------------------------- |
| Melee       | Uppercut       | Launch setup and sword commitment                        |
| Melee       | Gap Closer     | Close ranged spacing                                     |
| Melee       | Guard Break    | Short-range hard setup                                   |
| Bow         | Piercing Shot  | Physical ranged cashout                                  |
| Bow         | Disengage Shot | Physical counter-spacing                                 |
| Utility     | Brace Recovery | Spend Stamina/Fury to survive under pressure             |
| Utility     | Barrier        | Visible protection                                       |
| Utility     | Cleanse Surge  | Debuff/bleed answer                                      |
| Utility     | Quick Dash     | Movement utility without iframe                          |
| Utility     | Energize       | Stamina economy lesson for sword/parry/movement          |
| Utility     | Smoke Screen   | Aim denial lane while closing or resetting line of sight |

### Arciere starter

| Slot family | Pick           | Teaching job                                       |
| ----------- | -------------- | -------------------------------------------------- |
| Bow         | Pin Shot       | Ranged setup                                       |
| Bow         | Marksman Shot  | Precision cashout                                  |
| Bow         | Disengage Shot | Bow spacing response                               |
| Magic Base  | Frost Bolt     | Simple control projectile                          |
| Magic Base  | Fireball       | Visible splash projectile                          |
| Magic Base  | Lightning Dash | Magic movement choice                              |
| Magic Base  | Dark Barrier   | Protection without stopping ranged play            |
| Utility     | Hunter's Flow  | Moving Recovery and Momentum spend                 |
| Utility     | Quick Dash     | Non-iframe reposition                              |
| Utility     | Cleanse Surge  | Debuff/bleed answer                                |
| Utility     | Smoke Screen   | Create a line-of-sight break for ranged reposition |

### Mago starter

| Slot family    | Pick          | Teaching job                                 |
| -------------- | ------------- | -------------------------------------------- |
| Magic Base     | Fireball      | Fire projectile pressure                     |
| Magic Base     | Ignite        | Fast Fire follow-up for Risonanza sequencing |
| Magic Base     | Frost Bolt    | Simple Ice pressure                          |
| Magic Base     | Dark Barrier  | Magic protection                             |
| Magic Advanced | Eruption      | Launch setup                                 |
| Magic Advanced | Meteor        | High-commit Fire cashout                     |
| Magic Advanced | Frost Pillar  | Windup launch path                           |
| Magic Advanced | Blizzard      | Large control field                          |
| Utility        | Arcane Rebind | Spend Mana/Risonanza for survival            |
| Utility        | Phase Shift   | Timed survival counter                       |
| Utility        | Cleanse Surge | Debuff/bleed answer                          |

### Ibrido starter

| Slot family    | Pick           | Teaching job                               |
| -------------- | -------------- | ------------------------------------------ |
| Melee          | Uppercut       | Sword setup                                |
| Bow            | Marksman Shot  | Bow cashout                                |
| Magic Base     | Fireball       | Staff projectile pressure                  |
| Magic Base     | Lightning Dash | Staff movement and weapon-swap reward path |
| Magic Advanced | Arc Lift       | Spell launch path                          |
| Magic Advanced | Meteor         | Advanced cashout                           |
| Utility        | Adaptive Mend  | Flow-spend Recovery                        |
| Utility        | Quick Dash     | General reposition                         |
| Utility        | Cleanse Surge  | Debuff/bleed answer                        |
| Utility        | Barrier        | Protection choice                          |
| Utility        | Smoke Screen   | Aim denial/reset choice                    |

## Runtime starter build snapshot (first-session onboarding) — CLASSLESS / DEPRECATED

> **Current classless runtime snapshot only.** This build uses the old 11-slot
> classless grammar (3 fixed transfers + 1 flex utility). It is superseded by the
> per-class starter builds above once the class redesign ships. The fixed transfer
> slots (Util Z/X/F) do NOT appear in the target design.
>
> Not yet enforced by current code. When implemented pre-redesign, this build
> pre-fills empty Loadout Station slots on first load (no saved build in
> localStorage).

Goal: give a new player one complete working build so they enter training with a real combo path rather than random slots.

The starter build must cover every BUILD FLOW role:

| Slot    | Suggested ability    | Role     | Reason                                                      |
| ------- | -------------------- | -------- | ----------------------------------------------------------- |
| Melee   | Uppercut             | Starter  | Core knockup, teaches the signature mechanic immediately    |
| Bow     | Marksman Shot        | Finisher | High-damage follow-up during knockup window, teaches timing |
| Magic 1 | Fireball             | Finisher | Easy aim, visible projectile, teaches cashout               |
| Magic 2 | Frost Bolt           | Starter  | Slows on hit, creates setup window, teaches control         |
| Magic 3 | Arc Lift             | Starter  | Second knockup route via lightning, reinforces the pattern  |
| Magic 4 | Barrier              | Survival | Defensive answer, teaches when to protect                   |
| Magic 5 | Chain Bolt           | Ray      | Instant damage for punishment, teaches instant vs preview   |
| Util Z  | HP→Mana (fixed)      | Resource | Always present                                              |
| Util X  | Mana→Stamina (fixed) | Resource | Always present                                              |
| Util F  | Stamina→HP (fixed)   | Resource | Always present                                              |
| Util V  | Quick Dash           | Mobility | Teaches repositioning                                       |

This old classless starter build intentionally contains two knockup starters
(Uppercut + Arc Lift) so the player discovers the combo pattern in training
before understanding the build theory. The class-aware target builds above
replace it during the redesign.

The `SMART` filter in the pool must highlight contextually relevant alternatives when the player selects any of these slots to swap.

Exact ability stats → `packages/shared/src/abilities/registry.ts` (authoritative source).

## Respecc

Respec is **free** — switch builds at the Loadout Station any time outside a match. The friction is supposed to be the thinking, not the cost.
