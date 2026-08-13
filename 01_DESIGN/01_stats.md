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
| Jump hold                   | Disabled             |
| Jump cost                   | 10 stamina           |
| Fall damage                 | 0 HP at every height |

Sprint is the default and only move speed. There is no Shift sprint, no walk toggle.
Jump is a fixed tap-height impulse; holding Space does not add extra height.

## Combat timings

| Timing                                  | Value |
| --------------------------------------- | ----- |
| Global cooldown (between ability casts) | 0.3 s |
| Spawn invulnerability                   | 2.0 s |

Respawn times vary by mode — see `07_modes.md`.

## Damage budget

All damage values across weapons and abilities are tuned against the TTK band in
`TTK_MIN_SEC` / `TTK_MAX_SEC` (`packages/shared/src/constants/combat.ts`),
currently **6-9 seconds**, measured off the shipped registry by
`packages/shared/src/config/ttk.ts` and enforced by a test. See
`01_combat_fundamentals.md`.

> **Corrected 2026-08-13 (D2).** This line said "20-30 second TTK window" and
> cited `01_combat_fundamentals.md` as its authority — the same document that
> now retracts that number, while `01_combat_fundamentals.md` declares
> `deps: [01_stats.md]`. The two cited each other in a loop holding opposite
> numbers. It points at the constants now, so the next retune cannot re-open
> this.

## Sustain and transfers

There are no fixed resource-transfer slots. In-combat self-sustain comes from
Recovery utility choices and explicit magic sustain abilities that pay their own
slot, cost and counterplay budget. See `04_resource_sustain_study.md`.
