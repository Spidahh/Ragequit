---
id: weapon_sword
title: Sword
section: weapons
tags: [weapon, melee, m1]
provides: [sword_m1, sword_range, sword_affinity_infusion]
deps: [01_combat_fundamentals.md, 00_classes.md]
status: redesign
---

# Sword

> Current runtime/basic values below are being redesigned. Confirmed target:
> Sword M1 must not dominate abilities by spam, a miss must reset its hit chain,
> and sword actions cannot be rejected only because the player is airborne.

Close-range weapon. The class/loadout redesign controls access. Sword M1 should
stay a follow-through pressure tool around melee abilities, not the best answer
when spammed alone.

## M1 — Basic swing

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Swing duration | 0.4 s per swing                                           |
| Combo          | 3-hit landed chain (miss resets the chain)                |
| Range          | 1.8 m arc (cone ~60°)                                     |
| Damage         | Swing 1: 5 · Swing 2: 5 · Swing 3: 8                      |
| Combo total    | 18 damage over three landed swings                        |
| Cost           | 8 stamina per swing                                       |
| On-hit         | Light flinch on 1 & 2; 0.1 s slow + moderate stagger on 3 |

Swings chain fluidly only after server hit confirmation. A miss resets the combo
counter immediately; inactivity still returns the next landed chain to swing 1.

## Target M1 with element affinity infusion

> The old Mastery system is superseded as the target identity axis. The element
> infusion effects below survive as design intent but belong to the class/affinity
> redesign pass, not the old 4/5-slot Mastery rule. Do not implement against the
> old Mastery logic — wait for `00_classes.md` affinity pass to define the
> trigger.

Sword M1 element infusion effects (intended, pending class affinity pass):

| Element   | Infusion effect                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Fire      | +1 Burn stack per hit (Burn: 2 dmg/s for 3 s, stacks to 3)                                                                  |
| Ice       | +1 Chill stack per hit (Chill: 5% slow each, stacks to 5 → Frozen 0.3 s, consumes stacks)                                   |
| Lightning | On every 3rd combo hit (swing 3), arc a 3-damage bolt to the nearest enemy within 3 m (deterministic, combo-gated — no RNG) |
| Dark      | Heal attacker for 8% of damage dealt                                                                                        |
| Nature    | +1 Poison stack per hit (Poison: 1 dmg/s, decays 1 stack/s when not refreshed)                                              |

## Constraints

- Target redesign removes the old ground-only sword assumption; final air swing
  behavior belongs to the air-combat pass
- Swings cancel on parry (M2) or weapon swap
- Hitbox-based — the server resolves the cone sweep per frame of the swing
- Friendly fire: off in Team Battle, on in FFA
