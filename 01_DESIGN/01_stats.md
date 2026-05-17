---
id: stats
title: Player Stats
section: combat
tags: [numbers, resources, movement]
provides: [hp, mana, stamina, move_speed, regen]
deps: []
status: final
---

# Player Stats

All players share identical base stats. Differentiation comes from the 11-slot loadout and skill — there is no tank/glass/balanced axis.

## Resources

| Resource | Max | Regen (Out of Combat)                     | Regen (In-Combat)   |
| -------- | --- | ----------------------------------------- | ------------------- |
| HP       | 200 | 0.5 / s                                   | 0                   |
| Mana     | 100 | 1.5 / s (after 3 s pause from last spend) | 1.5 / s (same rule) |
| Stamina  | 100 | 10 / s (standing)                         | 5 / s (moving)      |

**Out of Combat (OOC)** = no damage dealt or taken for 5 seconds.

## Movement

| Action                      | Value                                 |
| --------------------------- | ------------------------------------- |
| Base move speed (always on) | 9.0 m/s                               |
| Jump height (tap Space)     | 1.5 m                                 |
| Jump height (hold Space)    | 2.2 m                                 |
| Jump cost                   | 10 stamina                            |
| Fall damage                 | none below 15 m; 5 HP per meter above |

Sprint is the default and only move speed. There is no Shift sprint, no walk toggle.

## Combat timings

| Timing                                  | Value |
| --------------------------------------- | ----- |
| Global cooldown (between ability casts) | 0.3 s |
| Spawn invulnerability                   | 2.0 s |

Respawn times vary by mode — see `07_modes.md`.

## Damage budget

All damage values across weapons and abilities are tuned against the **20-30 second TTK window** between two skill-matched players at full HP. See `01_combat_fundamentals.md`.

## Transmutation

Resources can be converted between each other via the Utility Wheel (Q). See `04_transmutation.md` for ratios and cooldowns.
