---
id: weapon_staff
title: Staff
section: weapons
tags: [weapon, magic, m1, projectile]
provides: [staff_m1, staff_range, staff_affinity_infusion]
deps: [01_combat_fundamentals.md, 00_classes.md]
status: redesign
---

# Staff

> Staff remains the spell-facing M1 lane. Its target air behavior must be tuned
> alongside Sword and Bow because the redesign keeps all weapon families active
> in air.

Mid-range magic weapon. Fast projectile cadence, moderate damage per hit, and
the intended primary M1 delivery system for future element affinity procs.
**Class access**: Arciere, Mago, Ibrido. Tank does not have staff access (Tank
weapon grammar is Sword + Bow only).

## M1 — Magic bolt

| Property         | Value                                    |
| ---------------- | ---------------------------------------- |
| Cast cadence     | 1 bolt per 0.5 s (2 bolts/s)             |
| Damage           | 8 per bolt (16 DPS ceiling — mana-gated) |
| Trajectory       | Fast projectile with near-flat path      |
| Projectile speed | 50 m/s                                   |
| Effective range  | 25 m (bolt despawns past 30 m)           |
| Mana cost        | 5 per bolt                               |

Staff is the only M1 with a resource cost. This is deliberate — it couples staff use to mana economy and transmutation decisions.

## Out of mana

If mana is 0, M1 becomes a weak unarmed punch (0 damage, 0.5 s swing) — a visual-only fallback with no combat utility.

## Target M1 with element affinity infusion

> The old Mastery system is superseded as the target identity axis. These infusion
> effects belong to the class/affinity redesign pass. See `00_classes.md`.

Weapon M1 infusion is a design target, not current runtime behavior. The staff
version is intended to be stronger than sword/bow because each bolt costs mana:

| Element   | Infusion effect                                                                  |
| --------- | -------------------------------------------------------------------------------- |
| Fire      | Fireball bolt; +2 Burn stacks per hit (vs 1 for sword/bow) + 1.5 m splash ignite |
| Ice       | +1 Chill stack + 1.5 m slow AoE on impact (0.3 s, 30% slow in zone)              |
| Lightning | Bolt speed increases strongly; always chains to 1 nearby enemy                   |
| Dark      | 15% lifesteal on damage dealt (vs 8% for sword/bow)                              |
| Nature    | On impact: applies Poison and splashes in a 2 m radius                           |

## Constraints

- Usable while moving, jumping, and airborne
- Cannot fire while M2 (parry) is held
- Bolts collide with terrain
- Friendly fire: off in Team Battle, on in FFA
