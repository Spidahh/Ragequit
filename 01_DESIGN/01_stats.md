---
id: stats
title: Player Stats
section: combat
tags: [numbers, resources, movement]
provides: [hp, mana, stamina, move_speed, regen]
deps: []
status: current
---

# Player Stats

## Resources

| Resource | Max | Regen (Out of Combat)                     | Regen (In-Combat, moving) | Regen (In-Combat, stationary) |
| -------- | --- | ----------------------------------------- | ------------------------- | ----------------------------- |
| HP       | 200 | 0.5 / s                                   | 0                         | 0                             |
| Mana     | 100 | 1.5 / s (after 3 s pause from last spend) | 1.5 / s (same rule)       | 1.5 / s (same rule)           |
| Stamina  | 100 | 10 / s                                    | 5 / s                     | 0 / s                         |

**Out of Combat (OOC)** = no damage dealt or taken for 5 seconds.

**In-Combat stamina regen** depends on movement: pressing any WASD key = "moving" (5/s); standing still = 0/s. This makes stamina a rhythm resource — aggressive movement sustains it; camping does not.

## Movement

| Action                      | Value                |
| --------------------------- | -------------------- |
| Base move speed (always on) | 9.0 m/s              |
| Jump height (tap Space)     | 1.5 m                |
| Jump height (hold Space)    | 2.2 m                |
| Jump cost                   | 10 stamina           |
| Fall damage                 | 0 HP at every height |

Sprint is the default and only move speed. There is no Shift sprint, no walk toggle.

## Combat timings

| Timing                                  | Value |
| --------------------------------------- | ----- |
| Global cooldown (between ability casts) | 0.3 s |
| Spawn invulnerability                   | 2.0 s |

Respawn times vary by mode — see `07_modes.md`.

## Damage budget

All damage values across weapons and abilities are tuned against the **20-30 second TTK window** between two skill-matched players at full HP. See `01_combat_fundamentals.md`.

## Sustain and transfers

There are no fixed resource-transfer slots. In-combat self-sustain comes from
Recovery utility choices and explicit magic sustain abilities that pay their own
slot, cost and counterplay budget. See `04_resource_sustain_study.md`.
