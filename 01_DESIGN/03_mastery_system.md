---
id: mastery_system
title: Element Mastery System
section: systems
tags: [mastery, elements, bonus, infusion]
provides: [mastery_activation, mastery_bonuses, m1_infusion]
deps: [05_abilities_philosophy.md]
status: superseded-target
---

# Element Mastery System

> Current runtime still contains this Mastery system. The developer confirmed a
> class-based redesign on 2026-05-22; Mastery is no longer the approved target
> identity axis until the class/ability redesign decides what elemental affinity,
> if any, survives.
>
> **Replacement system**: see `01_DESIGN/00_classes.md` for the class identity
> system (Fury, Momentum, Risonanza, Flow) that supersedes Mastery as the target
> build identity axis.

## Activation rule

Mastery activates when the player has **4 or more magic abilities of the same element** in the 5 magic slots of their loadout (`06_loadout_build.md`).

- **4-of-5** same element → Mastery active (one slot is the flexible "off-element" pick)
- **5-of-5** same element → Mastery active + Perfect Mastery tier (see per-element table)
- **3-of-5 or fewer** → no Mastery; abilities fire at full individual strength (see trade-off in `05_abilities_philosophy.md`)

"4/5" always means "at least 4 out of the 5 magic slots". It does NOT mean "exactly 4 with 1 flex" — a 5-of-5 loadout also qualifies for (and exceeds) the 4-of-5 threshold.

Mastery is evaluated at loadout lock (pre-match) — it cannot change mid-match.

## Current runtime mechanics

When Mastery is active in the current runtime:

1. **Element-specific bonus** applies to magic abilities of that element (see table below).
2. The runtime exposes the mastery state/tier for loadout and UI use.

## Target expression

Weapon M1 infusion is the intended second expression of Mastery, described in
`02_weapon_sword.md`, `02_weapon_bow.md`, and `02_weapon_staff.md`. It is not a
live runtime guarantee until implemented and tested.

## Bonuses per element (4/5 stack)

| Element       | Bonus effect                                               |
| ------------- | ---------------------------------------------------------- |
| **Fire**      | +15% damage on all Fire abilities; Burn DoT duration +50%  |
| **Ice**       | +10% CC duration on all Ice abilities (slow, freeze, stun) |
| **Lightning** | -15% cooldown on all Lightning abilities                   |
| **Dark**      | +20% lifesteal on all Dark abilities                       |
| **Nature**    | +25% DoT tick damage on all Nature abilities               |

## Perfect Mastery (5/5)

The runtime detects 5-of-5 and exposes `masteryLevel = 2` / `masteryTier = 2` for UI. The current combat runtime applies the 4-of-5 bonus table above at both tiers (so 5-of-5 gets the same live bonuses as 4-of-5).

**The per-element extra perks below are DESIGN TARGETS — not live behavior. Do not implement or assume them until they are explicitly built and tested:**

| Element       | 5/5 extra                                                                         |
| ------------- | --------------------------------------------------------------------------------- |
| **Fire**      | Burn stacks consume on hit → 1 extra small AoE tick when consumed                 |
| **Ice**       | Chill stacks to Frozen reduced from 5 → 4                                         |
| **Lightning** | Chain jumps go to 2 enemies instead of 1                                          |
| **Dark**      | Lifesteal applies also to ally heal (allies near you heal for 20% of that amount) |
| **Nature**    | Poison stacks decay 2× slower                                                     |

## No pentagon counter

**Elements do not counter each other.** A Fire build is not strong against Nature, not weak against Ice, etc. This was a deliberate rejection of rock-paper-scissors design because it created unfair matchups at loadout-lock time. See `99_resolved_ambiguities.md`.

Each element is differentiated **by what it does**, not by what it beats:

- Fire = damage over time
- Ice = crowd control and slow
- Lightning = multi-target and tempo (short CDs)
- Dark = sustain and lifesteal
- Nature = persistent DoT and zone control

## Stacking order (crit × mastery)

Damage calculation order, resolved to eliminate ambiguity (was unclear in original docs — see `99_resolved_ambiguities.md`):

```
base_damage
  → apply Mastery % bonus (e.g., Fire +15%)
  → apply crit multiplier (if crit procced)
  → apply any target-side damage modifiers (none currently in design)
  → subtract damage mitigation (none currently)
  → final damage
```

Crit currently has no source in the design (no crit-chance stat, no crit-on-status effect). The order is specified for future-proofing if we add crit sources later.

## Target M1 infusion strength by weapon

M1 infusion is a design target. The current server applies Mastery bonuses to elemental ability effects; weapon M1 infusion still needs a dedicated implementation pass.

| Weapon | M1 cost            | Infusion strength                                 |
| ------ | ------------------ | ------------------------------------------------- |
| Sword  | none               | baseline                                          |
| Bow    | none (charge time) | baseline + utility trail/AoE                      |
| Staff  | 5 mana/bolt        | +50% infusion strength (see `02_weapon_staff.md`) |

This keeps Mastery interesting on all three weapons while respecting the economy of each.
