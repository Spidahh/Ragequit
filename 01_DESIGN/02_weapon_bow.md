---
id: weapon_bow
title: Bow
section: weapons
tags: [weapon, ranged, projectile, m1, charge]
provides: [bow_m1, bow_charge, bow_trajectory, bow_mastery_infusion]
deps: [01_combat_fundamentals.md, 03_mastery_system.md]
status: redesign
---

# Bow

> Bow remains the precision ranged weapon, but it no longer owns airborne weapon
> access alone: the confirmed target redesign allows all weapon families to act
> in air.

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

## Target M1 with Mastery infusion

Weapon M1 infusion is a design target, not current runtime behavior. The intended
bow expression is:

| Element   | Infusion effect                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Fire      | Flaming arrow with fire trail; +1 Burn stack on hit                                                                                      |
| Ice       | Frost arrow with pale trail; +1 Chill stack on hit                                                                                       |
| Lightning | +30% projectile speed; on full-charge hit (≥2.0 s draw), always arcs to 1 nearby enemy within 5 m (deterministic, charge-gated — no RNG) |
| Dark      | Dark arrow; 8% lifesteal on damage dealt                                                                                                 |
| Nature    | On hit: applies Poison to the target                                                                                                     |

## Constraints

- Usable while airborne; all weapon families need target air behavior in the
  redesign
- Cannot fire while M2 (parry) is held — swapping to parry cancels any in-progress charge
- Arrows collide with terrain and static cover (no wall-clip)
- Friendly fire: off in Team Battle, on in FFA
