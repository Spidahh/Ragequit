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
4. **TTK alignment** — all damage values align with the 6-9 s TTK band (`01_combat_fundamentals.md`), and `packages/shared/src/config/ttk.ts` measures every class preset against the shipped registry so the claim can fail
5. **Opportunity cost visible** — the mini-malus is on the tooltip, not hidden

## Combo Combat 2.0

Current ability tuning follows a combo-first taxonomy. The exact live numbers are authoritative in `packages/shared/src/abilities/registry.ts`; design docs describe the intended roles.

Every ability must declare its `comboRole` in the registry. The loadout UI reads that role directly, and tests enforce the role contract so abilities cannot silently collapse back into generic damage buttons.

Each ability has **exactly one** `comboRole`. The standard taxonomy is **6 strategic roles** — that is the full, intended set. Each role answers "what does this ability DO in a fight", never "how is it delivered".

| Role     | Code value   | Purpose                                                                               | Live assignments                                                                                                                                  |
| -------- | ------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starter  | `'starter'`  | Opens a punish window through launch, root, freeze, stun, blind or slow               | Uppercut, Guard Break, Pin Shot, Eruption, Frost Pillar, Arc Lift, Entangle, Root Upthrow, Void Spike, Curse of Weakness, Freeze Target           |
| Finisher | `'finisher'` | Rewards accurate follow-up aim after a starter; no special airborne bonus             | Marksman Shot, Piercing Shot, Meteor, Fireball, Blast Arrow                                                                                       |
| Pressure | `'pressure'` | Damage/debuff that is not an opener: pokes, DoTs, zones, space denial, resource drain | Shadow Bolt, Poison Dart, Thunder Clap, Ignite, Chain Bolt, Flame Wall, Blizzard, Thorn Field, Storm Field, Smoke Screen, Life Drain, Mark Target |
| Survival | `'survival'` | Heal, shield, sustain or resource restore on the caster                               | Barrier, Dark Barrier, Healing Totem, Energize, Recovery utilities                                                                                |
| Counter  | `'counter'`  | Active response to an enemy combo: cleanse, phase, disengage, anti-melee, interrupt   | Cleanse Surge, Phase Shift, Parry Shot                                                                                                            |
| Mobility | `'mobility'` | Primary function is repositioning the caster                                          | Lightning Dash, Vine Dash, Quick Dash                                                                                                             |

**Removed/merged roles (were redundant or badly defined):**

- `extender` → **merged into `pressure`**. "Keeping the enemy in danger" is just pressure applied to a zone. It never needed its own role.
- `drain` → **merged into `pressure`**. Attacking enemy resources is a form of pressure; it does not change how the ability is built.
- `resource` → **merged into `survival`**. Restoring your own resources is sustain.
- `ray` → **deleted as a combo role**. "Ray" described _delivery_ (instant `windupSec: 0` line-of-sight hit), not combat function. The instant-LOS property stays as a delivery flag, but the ability keeps a real strategic role: Freeze Target is a `starter`, Chain Bolt and Ignite are `pressure`.

This leaves exactly the 6 roles above. The migration is **done in code**: `AbilityComboRole` in `packages/shared/src/abilities/types.ts` now defines exactly these 6 roles, and every entry in `registry.ts` has been remapped (`extender`/`drain` → `pressure`, `resource` → `survival`, `ray` → its real role with instant-LOS kept as `windupSec: 0` + `targeting: 'forward'`).

**Assignment rationale for contested abilities:**

- **Curse of Weakness**: `starter` — its primary strategic value is opening a combo window via Blind 2.4s. The Mana drain is secondary.
- **Void Spike [KNOCKUP]**: `starter` — launches the target airborne (knockup = opener). The secondary Mana drain does not change the role.
- **Mark Target**: `pressure` — instant line-of-sight Stamina-deny. Resource pressure is pressure.

Combat chains to preserve when balancing:

- Launch → precision punish: `Uppercut` / `Frost Pillar` / `Arc Lift` → `Marksman Shot` or `Piercing Shot`
- Root/freeze → placed punish: `Pin Shot` / `Entangle` / `Freeze Target` → `Meteor`, `Volley`, `Flame Wall`
- Blind → melee engage: `Smoke Screen` / `Curse of Weakness` → `Gap Closer` → `Guard Break`
- Resource pressure → sustain swing: `Mark Target` drains 12 Stamina from the target (making them parry-poor); `Life Drain` deals 24 damage while healing the caster for 15-20 HP (lifesteal)

Finisher rule: abilities with `comboRole: 'finisher'` deal their base damage regardless of whether the target is airborne or grounded. Landing a Finisher after a knockup is rewarded by better aim opportunity and lower evasion options — no engine-side damage multiplier. Finisher base damage is tuned as normal offensive damage without any pre-deflation.

## Cast Speed Rule

RAGEQUIT is a fast frantic game. Slow casts kill the feel.

- **Default windup: 0.0–0.2 s** for most offensive abilities, knockups and starters. The player should always feel in control.
- **Windup up to 0.4 s** only when the telegraph IS the mini-malus (the opponent must be able to react to it visually, e.g. a parriable launch).
- **Windup above 0.5 s** reserved for at most **two** signature high-commitment payoff abilities (Meteor, Marksman Shot). These are the deliberate "big swing" exceptions, capped at 1.0 s, never more.
- **Never add a slow windup to make an ability feel "powerful"** — use damage, range, or AoE for that, not delay.
- Any ability flagged slow during play review must be revised downward unless the delay is its explicit stated mini-malus.
- `packages/shared/src/abilities/registry.ts` is authoritative and has been retuned to honor this rule: only Meteor and Marksman Shot keep a 1.0 s windup; everything else is ≤0.4 s.

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
