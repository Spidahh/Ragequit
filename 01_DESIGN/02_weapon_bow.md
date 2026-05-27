---
id: weapon_bow
title: Bow
section: weapons
tags: [weapon, ranged, projectile, m1, charge]
provides: [bow_m1, bow_charge, bow_trajectory]
deps: [01_combat_fundamentals.md, 00_classes.md]
status: current
---

# Bow

Mid-to-long range weapon. Rewards precision aim. Primary source of poke damage and follow-up during knockup combos. **Class access**: Tank, Arciere, Ibrido. Mago does not have bow access (Mago weapon grammar is Staff only).

## M1 — Charged shot

| Property         | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| Min charge       | 0.3 s → 4 damage                                       |
| Full charge      | 2.0 s → 22 damage (linear scaling between min and max) |
| Trajectory       | Projectile with mild gravity arc (NOT hitscan)         |
| Projectile speed | 60 m/s at full charge · 35 m/s at min charge           |
| Effective range  | 40 m at full charge · 18 m at min charge               |
| Cost             | 0 (no stamina, no mana)                                |
| Charge interrupt | Any damage taken cancels the draw (no shot, no cost)   |

Releasing M1 below minimum charge cancels the draw without firing.

## Constraints

- Usable while airborne
- Cannot fire while M2 (parry) is held — swapping to parry cancels any in-progress charge
- Arrows collide with terrain and static cover (no wall-clip)
- Friendly fire: off in Team Battle, on in FFA
