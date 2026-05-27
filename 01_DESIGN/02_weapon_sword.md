---
id: weapon_sword
title: Sword
section: weapons
tags: [weapon, melee, m1]
provides: [sword_m1, sword_range]
deps: [01_combat_fundamentals.md, 00_classes.md]
status: current
---

# Sword

Close-range weapon. The class/loadout grammar controls access. Sword M1 should
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

## Constraints

- Usable while airborne
- Swings cancel on parry (M2) or weapon swap
- Hitbox-based — the server resolves the cone sweep per frame of the swing
- Friendly fire: off in Team Battle, on in FFA
