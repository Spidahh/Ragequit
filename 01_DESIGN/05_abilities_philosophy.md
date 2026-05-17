---
id: abilities_philosophy
title: Abilities Philosophy
section: abilities
tags: [design, tradeoffs, bonus, malus, depth]
provides: [depth_vs_breadth, mini_malus_rule]
deps: [00_pillars.md]
status: final
---

# Abilities Philosophy

The contract every ability in the game obeys. Read this before any ability list.

## Core trade-off: depth vs breadth

The player has 5 magic slots. The Mastery system (`03_mastery_system.md`) rewards stacking 4+ of the same element. This creates a fundamental build choice:

### Path A — Specialist (depth)

- 4 or 5 abilities of one element in the magic slots
- **Gain**: Element Mastery active → element bonus on every cast + M1 infused with the element on the current weapon
- **Cost**: individual ability numbers are tuned **lower** than the generalist path — the Mastery bonus is part of the balance, not a bonus on top

### Path B — Generalist (breadth)

- Mixed elements across the 5 magic slots (no element reaches 4/5)
- **Gain**: individual abilities hit harder in raw terms
- **Cost**: no Mastery bonus — you fight with stronger individual tools but no same-element bonus package

Neither path is objectively stronger. Balance target: a skilled specialist and a skilled generalist win ~50% of duels against each other. The _feel_ differs — specialist is combo-oriented and element-themed; generalist is flexible and situational.

## Mini-malus rule

**Every ability has a mini-malus** — a deliberate weakness that balances its strength. Examples of the pattern:

- Bigger damage, slower cast
- Longer range, slower projectile
- Wider AoE, lower per-target damage
- Shorter cooldown, lower damage
- Bigger CC, shorter range or shorter duration
- Self-heal, requires standing still
- Mobility tool, low damage

The mini-malus is always a measurable, play-visible property — never invisible lore. Each ability's mini-malus appears in its in-game tooltip.

## Balance principles

1. **Readability first** — every ability has a visual wind-up, element color flash, and audio cue so the opponent can react
2. **Counter-play always exists** — no ability is undodgeable, un-parriable, or un-counterable in principle
3. **No hard counter at loadout-lock** — no combination of abilities makes another build unwinnable before the match starts
4. **TTK alignment** — all damage values align with the 20-30 s TTK window (`01_combat_fundamentals.md`)
5. **Opportunity cost visible** — the mini-malus is on the tooltip, not hidden

## Ability count

**52 abilities total**:

| Type                        | Count | Slot                                        |
| --------------------------- | ----- | ------------------------------------------- |
| Melee                       | 6     | 1 slot per loadout                          |
| Bow                         | 8     | 1 slot per loadout                          |
| Magic                       | 27    | 5 slots per loadout                         |
| Utility                     | 11    | 3 fixed transfer slots + 1 flex utility slot |

Per-type lists: `05_abilities_melee.md`, `05_abilities_bow.md`, `05_abilities_magic.md`, `05_abilities_utility.md`.
