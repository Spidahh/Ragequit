---
id: abilities_utility
title: Utility Abilities
section: abilities
tags: [utility, fixed, support]
provides: [utility_ability_list]
deps: [05_abilities_philosophy.md]
status: final
---

# Utility Abilities

Utility slots are **wheel-first**. The player always has 4 utility sectors on the Q Utility Wheel: three fixed resource swaps and one flex utility pick.

Live tuning is currently in the Combo Combat 2.0 pass. `packages/shared/src/abilities/registry.ts` is the authoritative source for exact shield, blind, drain, heal, cooldown, and tooltip values.

Utility abilities are NOT counted for Element Mastery (they have no element). They cast without auto-swapping weapon — they're self-contained tools.

## Utility wheel sectors

| Sector | Default key | Name                         | Effect                                |
| ------ | ----------- | ---------------------------- | ------------------------------------- |
| U1     | Z           | **HP → Mana**                | Spend 20 HP to gain 20 Mana           |
| U2     | X           | **Mana → Stamina**           | Spend 20 Mana to gain 20 Stamina      |
| U3     | F           | **Stamina → HP**             | Spend 30 Stamina to gain 20 HP        |
| U4     | V           | **Flex Utility**             | Player pick from the utility pool     |

The Q wheel must exist even if direct hotkeys are available. Hotkeys mirror the wheel; they do not replace it.

## Flex utility pool

| #   | Name                  | Effect                                               | Mini-malus / constraint                                |
| --- | --------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| F1  | **Self-Heal Potion**  | Restore 40 HP over 2 s while moving                  | 20 s CD and delayed healing window                     |
| F2  | **Quick Dash**        | Dash 4 m in current movement direction               | 6 s CD; no iframes, walls stop the dash                |
| F3  | **Mark Target**       | Aim-tag one target for 6 damage, 5 s mark, and 12 stamina drain | Low damage; line of sight required                     |
| F4  | **Cleanse Surge**     | Remove debuffs from yourself and gain 2 s haste      | Costs stamina and does not heal by itself              |
| F5  | **Barrier**           | Gain a temporary shield                              | Defensive only; no damage or crowd control             |
| F6  | **Energize**          | Restore stamina immediately                          | Does not restore HP or mana                            |
| F7  | **Phase Shift**       | Brief invulnerability while unable to attack or cast | Short duration; cannot be used offensively while phased |
| F8  | **Smoke Screen**      | Create a forward smoke zone that repeatedly blinds enemies | No damage; zone is visible                             |

## Key design choices

- **Quick Dash is NOT a dodge**. It has no iframes. It's a positional tool only. The "no dodge" pillar (`00_pillars.md`) is preserved.
- **Transfers are fixed**. Z, X and F are always resource conversion slots and are never replaced by the flex utility pool.
- **Phase Shift is defensive**. The server blocks attacks and ability casts while invulnerable.
- **Mark Target is the team utility hook**. Current runtime applies damage plus a visible mark status; through-wall/team reveal is reserved for team-mode UI work.

## Post-launch expansion candidates

Reserved design space for future utility additions (NOT in scope for launch):

- Secondary heal style (small-but-repeatable vs the current big-but-slow)
- Smoke grenade (block line of sight)
- Movement tool variants (vertical jump pack, hover)
- Defensive tools (brief damage reduction)

These are NOT promised for launch. They exist as an expansion lane.
