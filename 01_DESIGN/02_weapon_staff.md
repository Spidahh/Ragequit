---
id: weapon_staff
title: Staff
section: weapons
tags: [weapon, magic, m1, projectile]
provides: [staff_m1, staff_range, staff_mastery_infusion]
deps: [01_combat_fundamentals.md, 03_mastery_system.md]
status: final
---

# Staff

Mid-range magic weapon. Fast projectile cadence, moderate damage per hit, primary delivery system for Mastery infusion procs. Always available to every player.

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

## M1 with Mastery infusion

Staff has **stronger infusion effects** than sword/bow because each bolt costs mana — the budget spent is higher:

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
