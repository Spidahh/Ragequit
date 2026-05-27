---
id: weapon_staff
title: Staff
section: weapons
tags: [weapon, magic, m1, projectile]
provides: [staff_m1, staff_range]
deps: [01_combat_fundamentals.md, 00_classes.md]
status: current
---

# Staff

Mid-range magic weapon. Fast projectile cadence, moderate damage per hit, and
the primary M1 delivery system for staff pressure.
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

Staff is the only M1 with a resource cost. This is deliberate: it couples staff
use to mana economy.

## Out of mana

If mana is 0, M1 becomes a weak unarmed punch (0 damage, 0.5 s swing) — a visual-only fallback with no combat utility.

## Constraints

- Usable while moving, jumping, and airborne
- Cannot fire while M2 (parry) is held
- Bolts collide with terrain
- Friendly fire: off in Team Battle, on in FFA
