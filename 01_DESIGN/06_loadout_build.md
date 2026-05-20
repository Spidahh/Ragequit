---
id: loadout_build
title: Loadout & Build System
section: meta
tags: [build, loadout, slots, wheel_binding]
provides: [slot_layout, build_constraints, wheel_population]
deps: [05_abilities_philosophy.md, 01_controls.md, 03_mastery_system.md]
status: final
---

# Loadout & Build System

The loadout IS the build system. This is where RAGEQUIT's build-crafting identity lives.

## Slot layout — 11 total

| Slot    | Count | Pool                                                                 |
| ------- | ----- | -------------------------------------------------------------------- |
| Melee   | 1     | From 6 melee abilities (`05_abilities_melee.md`)                     |
| Bow     | 1     | From 8 bow abilities (`05_abilities_bow.md`)                         |
| Magic   | 5     | From 27 magic abilities across 5 elements (`05_abilities_magic.md`)  |
| Utility | 4     | Three fixed transfers + one flex utility (`05_abilities_utility.md`) |

**Total: 11 slots.** The 7 combat slots (1 Melee + 1 Bow + 5 Magic) appear on the Ability Wheel (E hold). The 4 utility slots appear on the Utility Wheel (Q hold): three fixed transfers plus one flex utility.

## Ability Wheel (E) — 7 sectors

The 7 non-utility abilities map to the 7 sectors of the E wheel in this order:

```
Sector 1: Melee ability
Sector 2: Bow ability
Sectors 3-7: Magic abilities 1-5
```

Direct binds mirror the wheel slots and bypass wheel priming. Instant abilities cast immediately; placement abilities open their preview and use LMB to confirm. The wheel itself only primes a slot; LMB fires the primed ability or opens its placement preview. See `01_controls.md`.

The same ability cannot occupy multiple slots in one build. Fixed transfers are locked to Z/X/F and cannot be selected again in the V flex utility slot.

## Utility Wheel (Q) — 4 sectors

The Q wheel is part of the loadout contract and is always:

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

## Loadout Station UI contract

The Loadout Station is the actual build editor, not a generic HTML form. It must keep these readable surfaces visible:

- **Slot column**: every slot shows key, icon, ability name, role, cost/cooldown, and cast mode (`INSTANT` or `PREVIEW`). Fixed transfers are visibly locked.
- **Selected ability panel**: shows role, cast mode behavior, effect tags, quick-stat bars, player-facing description, build coach, and mini-malus.
- **Build flow strip**: `Opener / Control / Cashout / Reset` states summarize whether the build has the basic combo skeleton.
- **Mastery pills**: Fire/Ice/Lightning/Dark/Nature counts show whether the 5 magic slots are building toward elemental mastery.
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

## Respecc

Respec is **free** — switch builds at the Loadout Station any time outside a match. The friction is supposed to be the thinking, not the cost.
