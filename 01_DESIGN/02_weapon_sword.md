---
id: weapon_sword
title: Sword
section: weapons
tags: [weapon, melee, m1]
provides: [sword_m1, sword_range, sword_mastery_infusion]
deps: [01_combat_fundamentals.md, 03_mastery_system.md]
status: final
---

# Sword

Close-range weapon. High sustain damage via chained swings. Primary source of melee pressure. Always available to every player.

## M1 — Basic swing

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Swing duration | 0.4 s per swing                                           |
| Combo          | 3-hit chain (swing 1 → 2 → 3), 0.4 s each                 |
| Range          | 2.5 m arc (cone ~90°)                                     |
| Damage         | Swing 1: 6 · Swing 2: 6 · Swing 3: 9 (stagger bonus)      |
| Combo total    | 21 damage over 1.2 s (17.5 DPS at perfect sustain)        |
| Cost           | 0 (no stamina, no mana)                                   |
| On-hit         | Light flinch on 1 & 2; 0.1 s slow + moderate stagger on 3 |

Swings chain fluidly when M1 is tapped within 0.3 s of the previous swing. The combo counter resets after 1.0 s of inactivity.

## M1 with Mastery infusion

When Element Mastery is active (4+ magic abilities of one element — see `03_mastery_system.md`), sword M1 is infused:

| Element   | Infusion effect                                                                           |
| --------- | ----------------------------------------------------------------------------------------- |
| Fire      | +1 Burn stack per hit (Burn: 2 dmg/s for 3 s, stacks to 3)                                |
| Ice       | +1 Chill stack per hit (Chill: 5% slow each, stacks to 5 → Frozen 0.3 s, consumes stacks) |
| Lightning | 20% chance per hit to arc a 3-damage bolt to 1 nearby enemy within 3 m                    |
| Dark      | Heal attacker for 8% of damage dealt                                                      |
| Nature    | +1 Poison stack per hit (Poison: 1 dmg/s, decays 1 stack/s when not refreshed)            |

## Constraints

- Ground-only — sword cannot swing while airborne
- Swings cancel on parry (M2) or weapon swap
- Hitbox-based — the server resolves the cone sweep per frame of the swing
- Friendly fire: off in Team Battle, on in FFA
