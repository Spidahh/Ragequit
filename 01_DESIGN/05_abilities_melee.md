---
id: abilities_melee
title: Melee Abilities
section: abilities
tags: [melee, sword, list]
provides: [melee_ability_list]
deps: [05_abilities_philosophy.md, 02_weapon_sword.md]
status: final
---

# Melee Abilities

Player picks **1** melee ability per loadout. This ability lives in the melee slot and is cast via the E wheel or a custom bind (which auto-swaps to sword — see `01_controls.md`).

## Pool — 6 abilities

### M1 · Whirlwind Slash

- **Effect**: 360° spin hits all enemies in a 4 m radius for 3 ticks of 6 damage each (18 total)
- **Duration**: 1.0 s spin
- **Cost**: 30 stamina
- **Cooldown**: 8 s
- **Range**: 4 m AoE (self-centered)
- **Mini-malus**: 30% self-slow during the spin

### M2 · Gap Closer

- **Effect**: Dash 6 m forward; strike enemies in a 1.3 m landing arc for 20 damage
- **Duration**: 0.35 s travel + 0.2 s recovery
- **Cost**: 25 stamina
- **Cooldown**: 6 s
- **Range**: 6 m committed path
- **Mini-malus**: Locked forward path during the dash; walls stop the movement and parry remains valid on contact

### M3 · Uppercut [KNOCKUP]

- **Effect**: Vertical strike launches target up and slightly away for 0.8 s (disables their abilities + parry during airtime)
- **Damage**: 15
- **Windup**: 0.4 s clear telegraph (overhead raise)
- **Cost**: 40 stamina
- **Cooldown**: 10 s
- **Range**: 2.5 m (sword reach)
- **Mini-malus**: 0.4 s windup is visually obvious and parriable

### M4 · Bleed Strike

- **Effect**: Thrust for 10 damage instant + Bleed DoT (6 damage/s for 3 s = 18 DoT)
- **Total damage**: 28 over 3 s
- **Cost**: 20 stamina
- **Cooldown**: 7 s
- **Range**: 2.5 m
- **Mini-malus**: Bleed DoT is **cleansed by any transmutation cast** (visible counter-play)

### M5 · Guard Break

- **Effect**: Pommel strike for 12 damage, 0.45 s stun, and a short shove that opens a punish window
- **Cost**: 30 stamina
- **Cooldown**: 9 s
- **Range**: 2.2 m
- **Mini-malus**: Shorter reach than standard sword pressure

### M6 · Rending Dash

- **Effect**: Dash 5 m and slash through enemies for 16 damage plus Bleed in a 1.4 m landing arc
- **Cost**: 35 stamina
- **Cooldown**: 11 s
- **Range**: 5 m committed path
- **Mini-malus**: High stamina cost and cleanseable bleed payload

## Pool design rationale

- **Whirlwind** = AoE answer for multi-enemy encounters
- **Gap Closer** = engage tool for melee players chasing ranged opponents
- **Uppercut** = the pure-melee launch setup, enabling follow-up from teammates or own bow/staff swap
- **Bleed Strike** = pressure tool with a clear counter-play lane (transfer cleanse)
- **Guard Break** = close-range interrupt/shove tool
- **Rending Dash** = melee mobility with bleed pressure

One knockup guarantees every melee-slot pick keeps the signature knockup combo available. No ability is "use on CD" — each demands reading the fight.
