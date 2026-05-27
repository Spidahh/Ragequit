---
id: abilities_philosophy
title: Abilities Philosophy
section: abilities
tags: [design, tradeoffs, bonus, malus, depth]
provides: [depth_vs_breadth, mini_malus_rule]
deps: [00_pillars.md]
status: current
---

# Abilities Philosophy

The contract every ability in the game obeys. Read this before any ability list.

## Build Trade-off

Abilities are balanced inside the class grammar:

- **Tank** trades melee/bow pressure and defensive utility decisions without
  Magic slots.
- **Arciere** combines Bow pressure, Magic Base control and movement-led
  survival.
- **Mago** sequences Magic Base and Magic Advanced spells.
- **Ibrido** trades specialization ceiling for weapon/magic flexibility.

Affinity or sustain bonuses must stay inside explicit class, ability and Recovery rules.

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

## Combo Combat 2.0

Current ability tuning follows a combo-first taxonomy. The exact live numbers are authoritative in `packages/shared/src/abilities/registry.ts`; design docs describe the intended roles.

Every ability must declare its `comboRole` in the registry. The loadout UI reads that role directly, and tests enforce the role contract so abilities cannot silently collapse back into generic damage buttons.

Each ability has **exactly one** `comboRole` in the registry. The roles below and their live assignments are canonical.

The registry type `AbilityComboRole` defines **10 roles** (see `packages/shared/src/abilities/types.ts`). The first six are the core combat-taxonomy roles; the last four are implementation categories used by the UI and tests.

| Role     | Code value   | Purpose                                                                                | Live assignments                                                                                                         |
| -------- | ------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Starter  | `'starter'`  | Opens a punish window through launch, root, freeze, stun, blind or slow                | Uppercut, Guard Break, Pin Shot, Eruption, Frost Pillar, Arc Lift, Entangle, Root Upthrow, Void Spike, Curse of Weakness |
| Extender | `'extender'` | Keeps the enemy inside danger after the starter                                        | Flame Wall, Blizzard, Thorn Field, Storm Field, Smoke Screen                                                             |
| Finisher | `'finisher'` | Rewards accurate follow-up aim after setup; gains +25% damage vs airborne targets      | Marksman Shot, Piercing Shot, Meteor, Fireball, Blast Arrow                                                              |
| Ray      | `'ray'`      | Instant (windupSec = 0) line-of-sight hit if the target is under the crosshair         | Ignite, Chain Bolt, Freeze Target                                                                                        |
| Survival | `'survival'` | Absorbs or prevents incoming damage                                                    | Barrier, Dark Barrier, Healing Totem                                                                                     |
| Counter  | `'counter'`  | Active response to an enemy combo: punishes approach, breaks CC, invulnerability frame | Cleanse Surge, Phase Shift, Thunder Clap, Parry Shot                                                                     |
| Drain    | `'drain'`    | Attacks enemy resources (HP, Mana, Stamina) instead of only dealing damage             | Life Drain, Mark Target                                                                                                  |
| Pressure | `'pressure'` | General-purpose damage or debuff that does not open combos or fit another role         | Shadow Bolt, Poison Dart, Thunder Clap (secondary)                                                                       |
| Mobility | `'mobility'` | Primary function is repositioning the caster                                           | Lightning Dash, Vine Dash, Quick Dash                                                                                    |
| Resource | `'resource'` | Restores resources; does not deal damage                                               | Energize, Recovery utilities                                                                                             |

**Assignment rationale for contested abilities:**

- **Curse of Weakness**: moved from Ray to Starter — windupSec 0.35 s (not instant, so fails the Ray ≡ windupSec:0 definition); primary strategic value is opening a combo window via Blind 2.4s. The Mana drain is a secondary effect, not the dominant role.
- **Void Spike [KNOCKUP]**: Starter — launches the target airborne (knockup = opener by definition). Also has a secondary Mana drain effect but the dominant function is the launch.
- **Mark Target**: Drain — instant line-of-sight AND Stamina-deny on the target. Its defining strategic role is resource pressure.

Combat chains to preserve when balancing:

- Launch → precision punish: `Uppercut` / `Frost Pillar` / `Arc Lift` → `Marksman Shot` or `Piercing Shot`
- Root/freeze → placed punish: `Pin Shot` / `Entangle` / `Freeze Target` → `Meteor`, `Volley`, `Flame Wall`
- Blind → melee engage: `Smoke Screen` / `Curse of Weakness` → `Gap Closer` → `Guard Break`
- Resource pressure → sustain swing: `Mark Target` drains 12 Stamina from the target (making them parry-poor); `Life Drain` deals 24 damage while healing the caster for 15-20 HP (lifesteal)

Finisher rule: abilities with `comboRole: 'finisher'` gain **+25% damage** against targets that are still airborne. This makes launch → aimed punish a real combat loop instead of only visual flair.

**Finisher damage is pre-tuned 15-20% below a non-Finisher equivalent** to account for the +25% airborne bonus. A Finisher that would normally deal 20 damage is tuned to ~16 base; against an airborne target it deals ~20 (16 × 1.25). Against a grounded target it deals 16. This keeps Finishers rewarding without making them mandatory even outside combo context.

## Ability Count

The current registry contains **53 abilities total**:

| Type           | Abilities in pool |
| -------------- | ----------------- |
| Melee          | 6                 |
| Bow            | 8                 |
| Magic Base     | Registry-defined  |
| Magic Advanced | Registry-defined  |
| Utility        | Class-legal pool  |

Slot legality follows `06_loadout_build.md` and runtime constants.

Per-type lists: `05_abilities_melee.md`, `05_abilities_bow.md`, `05_abilities_magic.md`, `05_abilities_utility.md`.
