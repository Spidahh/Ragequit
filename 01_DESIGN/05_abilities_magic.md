---
id: abilities_magic
title: Magic Abilities
section: abilities
tags: [magic, elements, list]
provides: [magic_ability_list_per_element]
deps: [05_abilities_philosophy.md, 06_loadout_build.md]
status: current
---

# Magic Abilities

Magic slots are split into Magic Base and Magic Advanced per class grammar
(`00_classes.md`, `06_loadout_build.md`).

Live tuning is currently in the Combo Combat 2.0 pass. `packages/shared/src/abilities/registry.ts` is the authoritative source for exact numbers, tooltips, cast data, ray/projectile behavior, drain values, and cooldowns. Numeric bullets below are design snapshots for role/readability review, not a second runtime registry.

**27 magic abilities total** — every element has at least 5 magic abilities, with Fire and Nature currently carrying one extra mobility/control option.

Casting a magic ability via a custom bind auto-swaps the weapon to **staff** before the cast (`01_controls.md`).

Each element covers the same core roles so every element-specialist build has the same structural options:

- 1 direct damage (ranged bolt / dart)
- 1 zone / AoE control
- 1 crowd control or debuff
- 1 knockup (signature combo setup)
- 1 element-signature utility

## Fire — damage over time + AoE

### F1 · Fireball

- **Effect**: Projectile, 2 m splash on impact
- **Damage**: 22 in a 2 m splash
- **Cost**: 20 mana · **CD**: 5 s · **Range**: 20 m
- **Mini-malus**: Slow projectile (25 m/s) — dodgeable at long range

### F2 · Flame Wall

- **Effect**: 6 m wide wall of fire for 3 s; enemies in contact take 8 dmg/s
- **Cost**: 30 mana · **CD**: 12 s · **Range**: placed 10 m away
- **Mini-malus**: Fixed direction; can be walked around

### F3 · Ignite

- **Effect**: Instant-apply 3 Burn stacks on target (Burn: 2 dmg/s for 3 s per stack → 18 total)
- **Cost**: 20 mana · **CD**: 8 s · **Range**: 12 m
- **Mini-malus**: Short range vs. other Fire damage

### F4 · Meteor

- **Effect**: 3 m AoE lands after 1.0 s delay; 40 damage
- **Cast**: 1.0 s · **Cost**: 40 mana · **CD**: 18 s · **Range**: 25 m
- **Mini-malus**: Signature big-swing cast (one of only two casts above 0.5 s); telegraph circle visible on ground during the 1.0 s impact delay

### F5 · Eruption [KNOCKUP]

- **Effect**: Geyser under target for 10 damage + 0.5 s airborne with a small outward shove
- **Cost**: 30 mana · **CD**: 14 s · **Range**: 10 m · **AoE**: 2 m radius
- **Mini-malus**: Low damage — it's a CC setup, not burst

### F6 · Fire Blink

- **Effect**: Teleport 7 m forward and leave a 1.5 m burning zone at the origin
- **Cost**: 30 mana · **CD**: 10 s · **Range**: 7 m
- **Mini-malus**: Destination must be clear; walls stop the blink

## Ice — crowd control + slow

### I1 · Frost Bolt

- **Effect**: Projectile, +1 Chill stack on hit
- **Damage**: 18
- **Cost**: 20 mana · **CD**: 4 s · **Range**: 20 m
- **Mini-malus**: Low direct damage

### I2 · Ice Wall

- **Effect**: 5 m ice barrier strip for 4 s; enemies touching it are repeatedly rooted for 0.35 s
- **Cost**: 30 mana · **CD**: 15 s · **Range**: placed 8 m away
- **Mini-malus**: No damage and no true line-of-sight block; it is movement denial only

### I3 · Blizzard

- **Effect**: 7 m radius zone, 5 dmg/s for 5 s + 30% slow inside
- **Cost**: 30 mana · **CD**: 15 s · **Range**: 20 m
- **Mini-malus**: Low damage per tick — primarily a zone control tool

### I4 · Freeze Target

- **Effect**: Full freeze for 1.2 s + 8 damage
- **Cast**: 0.4 s · **Cost**: 35 mana · **CD**: 16 s · **Range**: 12 m
- **Mini-malus**: Parriable on the cast hit — a ready opponent blocks it

### I5 · Frost Pillar [KNOCKUP]

- **Effect**: Ice spike under target for 12 damage + 0.5 s airborne, tuned for clean follow-up aim
- **Cast**: 0.3 s windup · **Cost**: 30 mana · **CD**: 14 s · **Range**: 10 m
- **Mini-malus**: Pillar erupts at a fixed point — sidestep before it lands and it misses

## Lightning — multi-target + short CDs

### L1 · Chain Bolt

- **Effect**: Hits primary + jumps to 2 more within 6 m
- **Damage**: 20 primary + 12 to each nearby secondary target within 6 m
- **Cost**: 25 mana · **CD**: 6 s · **Range**: 15 m
- **Mini-malus**: Secondary arcs require additional targets inside 6 m

### L2 · Thunder Clap

- **Effect**: 3 m self-centered AoE, 20 damage + 0.5 s stun
- **Cost**: 30 mana · **CD**: 12 s · **Range**: self-centered
- **Mini-malus**: Close range — requires engagement

### L3 · Storm Field

- **Effect**: 4 m zone for 3 s; 3 lightning strikes/s at 3 damage each (27 total over 3 s)
- **Cost**: 35 mana · **CD**: 18 s · **Range**: 20 m
- **Mini-malus**: Visible zone — enemies see and leave

### L4 · Lightning Dash

- **Effect**: Teleport 5 m forward, 15 damage shock on exit (1 m exit radius)
- **Cost**: 25 mana · **CD**: 8 s · **Range**: 5 m (teleport distance)
- **Mini-malus**: No damage on entry point; walls stop the dash

### L5 · Arc Lift [KNOCKUP]

- **Effect**: Lightning bolt launches target for 10 damage + 0.5 s airborne with a backward jolt
- **Cost**: 30 mana · **CD**: 12 s · **Range**: 15 m (line-of-sight required)
- **Mini-malus**: Line-of-sight required — no arcing around cover

## Dark — lifesteal + debuff

### D1 · Shadow Bolt

- **Effect**: Projectile with lifesteal (caster heals 10% of damage)
- **Damage**: 20
- **Cost**: 25 mana · **CD**: 5 s · **Range**: 20 m
- **Mini-malus**: 28 m/s projectile speed creates a longer dodge window

### D2 · Curse of Weakness

- **Effect**: Debuff target: -20% outgoing damage for 5 s + Blind for 2.4 s
- **Windup**: 0.35 s · **Cost**: 30 mana · **CD**: 15 s · **Range**: 15 m
- **Mini-malus**: Parriable windup; primary value is opening a combo via Blind, not damage. `comboRole: 'starter'` (NOT `'drain'` — see `99_resolved_ambiguities.md` #31/#33)

### D3 · Life Drain

- **Effect**: Channeled beam, 8 damage per tick for 3 ticks (24 total); caster heals 65% of damage dealt
- **Cost**: 35 mana · **CD**: 14 s · **Range**: 12 m
- **Mini-malus**: Movement or incoming damage interrupts the channel

### D4 · Dark Barrier

- **Effect**: Self shield that absorbs up to 30 damage for 5 s
- **Cost**: 30 mana · **CD**: 16 s · **Range**: self-centered
- **Mini-malus**: Shield breaks instantly when depleted

### D5 · Void Spike [KNOCKUP]

- **Effect**: Dark tendril spike under target for 18 damage + 0.5 s airborne with a shove away
- **Cost**: 30 mana · **CD**: 13 s · **Range**: 10 m
- **Mini-malus**: 10 m max range limits threat projection

## Nature — persistent DoT + zone

### N1 · Poison Dart

- **Effect**: Projectile; 4 direct damage + Poison DoT (3 dmg/s for 4 s = 12 DoT)
- **Total damage**: 16 over 4 s
- **Cost**: 20 mana · **CD**: 5 s · **Range**: 18 m
- **Mini-malus**: Very low direct damage — value lives in the DoT tail

### N2 · Thorn Field

- **Effect**: 3 m radius ground zone for 5 s; enemies inside take 5 dmg/s
- **Cost**: 35 mana · **CD**: 16 s · **Range**: placed 12 m away
- **Mini-malus**: Visible zone — enemies avoid

### N3 · Entangle

- **Effect**: 1.5 s root + 5 damage
- **Cast**: 0.3 s · **Cost**: 25 mana · **CD**: 13 s · **Range**: 10 m
- **Mini-malus**: Short range + cast telegraph

### N4 · Healing Totem

- **Effect**: Channel nature recovery for 5 s, healing yourself for 8 HP/s (40 HP total)
- **Cost**: 30 mana · **CD**: 20 s · **Range**: self
- **Overheal rule**: healing stops at target max HP; no overheal shield (see `99_resolved_ambiguities.md`)
- **Channel break rule**: incoming damage does **NOT** cancel the channel. Unlike Life Drain (D3), Healing Totem completes its full 5 s regardless of hits taken. An aggressive opponent simply outdamages the recovery rate (8 HP/s heal vs any incoming DPS).
- **Mini-malus**: No burst heal; a focused attacker dealing more than 8 damage/s negates the channel entirely while it is active

### N5 · Root Upthrow [KNOCKUP]

- **Effect**: Vines launch grounded target for 8 damage + 0.5 s airborne
- **Cost**: 30 mana · **CD**: 14 s · **Range**: 10 m
- **Mini-malus**: Only works on targets currently on the ground — a jumping target is immune

### N6 · Vine Dash

- **Effect**: Dash 5 m forward and leave a 2 m root zone at the landing point for 2.5 s
- **Cost**: 25 mana · **CD**: 12 s · **Range**: 5 m
- **Mini-malus**: Enemies must walk into the landing zone; it does not pull them
