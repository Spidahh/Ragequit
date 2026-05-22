---
id: abilities_utility
title: Utility Abilities
section: abilities
tags: [utility, fixed, support]
provides: [utility_ability_list]
deps: [05_abilities_philosophy.md]
status: redesign
---

# Utility Abilities

> Current runtime pool. Target utility work removes fixed transfer slots and
> rebuilds Recovery utilities around class legality; fixed transfer slots below
> describe legacy runtime only.

## Target utility direction

- Utility slots are chosen from legal class utility pools; they are not consumed
  by fixed resource conversions.
- `Recovery` is a first-class utility family alongside movement, protection,
  cleanse/counter and pressure utility.
- Every class needs at least one legal Recovery option and its starter build
  includes one.
- Strong Recovery must pay a visible condition, resource cost, tell, slot cost or
  loss of secondary utility.
- Dark lifesteal and Nature healing are magic sustain, not permission to inflate
  Recovery budgets for the same class.

Target Recovery rows:

| Class   | Utility        | Player-facing role                                                     |
| ------- | -------------- | ---------------------------------------------------------------------- |
| Tank    | Brace Recovery | Spend Stamina to brace and recover; Fury can improve the heal          |
| Arciere | Hunter's Flow  | Recover while moving; Momentum can improve the moving heal             |
| Mago    | Arcane Rebind  | Spend Mana and cast a visible heal; Risonanza can be spent on survival |
| Ibrido  | Adaptive Mend  | Fast lower-peak heal; Flow can improve it                              |

Current runtime utility slots are **wheel-first**. The old Q Utility Wheel has
4 sectors: three fixed resource swaps and one flex utility pick. Target Utility
wheel sector counts follow the selected class in `06_loadout_build.md`.

Live tuning is currently in the Combo Combat 2.0 pass. `packages/shared/src/abilities/registry.ts` is the authoritative source for exact shield, blind, drain, heal, cooldown, cast data, and tooltip values. Numeric bullets below are design snapshots for role/readability review, not a second runtime registry.

Utility abilities have no element. In the current runtime they do not count toward the Mastery 4/5 rule. They cast without auto-swapping weapon — they're self-contained tools.

## Utility wheel sectors

| Sector | Default key | Name               | Effect                            |
| ------ | ----------- | ------------------ | --------------------------------- |
| U1     | Z           | **HP → Mana**      | Spend 20 HP to gain 20 Mana       |
| U2     | X           | **Mana → Stamina** | Spend 20 Mana to gain 20 Stamina  |
| U3     | F           | **Stamina → HP**   | Spend 30 Stamina to gain 20 HP    |
| U4     | V           | **Flex Utility**   | Player pick from the utility pool |

The Q wheel must exist even if direct hotkeys are available. Hotkeys mirror the wheel; they do not replace it.

## Flex utility pool

| #   | Name               | Effect                                                                                                                                                                                                                                      | Mini-malus / constraint                                    |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| F1  | **Healing Potion** | Restore 40 HP over 2 s (20 HP/tick × 2 ticks). **Current server:** heals unconditionally regardless of movement. **Design target:** ticking pauses while stationary and resumes on movement (remaining heal not lost) — not yet implemented | 20 s CD; slow heal gives opponent time to sustain pressure |
| F2  | **Quick Dash**     | Dash 4 m in current movement direction                                                                                                                                                                                                      | 6 s CD; no iframes, walls stop the dash                    |
| F3  | **Mark Target**    | Aim-tag one target for 6 damage, 5 s mark, and drain 12 Stamina from the **target**                                                                                                                                                         | Range: 30 m (line of sight required); low damage           |
| F4  | **Cleanse Surge**  | Remove debuffs from yourself and gain 2 s haste                                                                                                                                                                                             | Costs stamina and does not heal by itself                  |
| F5  | **Barrier**        | Gain a temporary shield                                                                                                                                                                                                                     | Defensive only; no damage or crowd control                 |
| F6  | **Energize**       | Restore stamina immediately                                                                                                                                                                                                                 | Does not restore HP or mana                                |
| F7  | **Phase Shift**    | Brief invulnerability while unable to attack or cast                                                                                                                                                                                        | Short duration; cannot be used offensively while phased    |
| F8  | **Smoke Screen**   | Place a 3.5 m radius smoke zone 8 m ahead; enemies inside have Blind 1.1 s applied every 0.5 s (overlapping blind); zone lasts 3.5 s                                                                                                        | No damage; zone is visible to both sides; 16 s CD          |

## Key design choices

- **Quick Dash is NOT a dodge**. It has no iframes. It's a positional tool only. The "no dodge" pillar (`00_pillars.md`) is preserved.
- **Transfers are fixed in the current runtime only**. The target utility pass
  removes that three-slot tax and replaces it with class-legal utility choices.
- **Phase Shift is defensive**. The server blocks attacks and ability casts while invulnerable.
- **Mark Target is the team utility hook**. Current runtime applies damage plus a visible mark status; through-wall/team reveal is reserved for team-mode UI work. The 12 Stamina drain applies to the **enemy target's** resource pool — it is resource-deny, not self-cost.
- **Drain abilities** (Mark Target, Life Drain, Void Spike, Curse of Weakness) reduce the TARGET's resource, not the caster's, unless the description explicitly says "costs X from self."

## Post-launch expansion candidates

Reserved design space for future utility additions (NOT in scope for launch):

- Secondary heal style (small-but-repeatable vs the current big-but-slow)
- Smoke grenade (block line of sight)
- Movement tool variants (vertical jump pack, hover)
- Defensive tools (brief damage reduction)

These are NOT promised for launch. They exist as an expansion lane.
