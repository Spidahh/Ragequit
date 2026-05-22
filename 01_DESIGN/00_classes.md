---
id: classes
title: Class System
section: core
tags: [classes, identity, resources, mechanics]
provides: [class_list, class_resources, class_mechanics, slot_distribution]
deps: [01_stats.md, 06_loadout_build.md]
status: current
---

# Class System

Four classes. Same total slot count (11). Different slot distribution, different resources, different identity mechanic. No class is objectively stronger — each dominates its optimal range and situation.

## Class overview

| Class   | Identity                  | Optimal range | Resource emphasis       | Unique mechanic |
| ------- | ------------------------- | ------------- | ----------------------- | --------------- |
| Tank    | Wall that fights back     | <2m melee     | HP + Stamina            | Fury            |
| Arciere | Death you can't reach     | 8-40m         | Mobility + ranged flow  | Momentum        |
| Mago    | Elemental chaos conductor | 5-25m         | Mana + spell sequencing | Risonanza       |
| Ibrido  | Unpredictable adapter     | Any           | Balanced adaptation     | Flow            |

## Slot distribution — 11 total per class

| Classe  | Melee | Bow | Magic Base | Magic Adv | Utility | Weapon M1 access       |
| ------- | ----- | --- | ---------- | --------- | ------- | ---------------------- |
| Tank    | 3     | 2   | 0          | 0         | 6       | Sword + Bow (no Staff) |
| Arciere | 0     | 3   | 4          | 0         | 4       | Bow + Staff            |
| Mago    | 0     | 0   | 4          | 4         | 3       | Staff only             |
| Ibrido  | 1     | 1   | 2          | 2         | 5       | Sword + Bow + Staff    |

## Resource pools per class

| Classe  | HP  | Mana | Stamina |
| ------- | --- | ---- | ------- |
| Tank    | 250 | 50   | 150     |
| Arciere | 175 | 80   | 110     |
| Mago    | 150 | 160  | 80      |
| Ibrido  | 200 | 100  | 100     |

Resource pools are the confirmed starting design. The target sustain model has
no fixed resource transfers: Recovery lives in legal utility choices and magic
abilities that pay their own slot/cost/counterplay budget. See
`04_resource_sustain_study.md`.

## Class mechanics

### Tank — FURY

Fury builds when the Tank takes damage or lands hits. Max 5 stacks. Each stack = +8% melee damage. At 5 stacks, consume all stacks for one guaranteed **SURGE**: next melee hit does +40% damage and applies a 0.3s hard stagger.

- Stack gain: +1 per hit taken (uncapped), +1 per 3rd landed sword hit
- Stack decay: 0.5 stacks/s after 4s of no combat action
- Visual: 5 diamond icons in the class indicator slot (bottom right HUD)
- Design intent: Tank WANTS to be in combat and absorb some hits. Camping resets progress.

### Arciere — MOMENTUM

Momentum builds while moving without taking damage. Decays instantly on any hit received.

- Gain: +12/s while moving without being hit
- Max: 100
- Loss: -100 immediately on any hit taken
- Bonus at 60+: bow full-charge time reduced from 2.0s to 1.2s; Hunter's
  Flow can spend Momentum for its stronger Recovery version
- Bonus at 100: base magic -15% cooldown

Design intent: Arciere rewards constant movement and hit-avoidance. One hit resets everything — high risk, high reward. Losing Momentum should sting.

### Mago — RISONANZA

Casting two abilities of the same element within 2.5s triggers a bonus proc at the second impact location.

- Fire + Fire: extra Burn burst (2 AoE ticks at impact)
- Ice + Ice: instant Freeze snap on target (consumes all Chill stacks)
- Lightning + Lightning: immediate chain to nearest enemy within 4m
- Dark + Dark: +8 HP lifesteal bonus on the second hit
- Nature + Nature: instant Root (1.5s) at impact location

Risonanza requires zero additional input — cast an elemental spell to arm an
element-colored window, then cast the same element inside that window for the
proc. It does not require both hits to land on the same target. The armed window
is visible as a subtle element-colored timer in the class indicator. Arcane
Rebind may consume that armed window for Recovery instead of spending it on an
offensive second spell.

Any elemental affinity extension of the Risonanza window is not locked yet. The
class mechanic stands without reviving the old Mastery system by default.

### Ibrido — FLOW

Each weapon swap (Sword→Bow, Bow→Staff, Staff→Sword, etc.) adds 1 Flow stack. Max 3.

- At 3 stacks: next ability (any type) gains +20% effect AND costs 0 GCD. Stack consumed on use.
- Stack decay: -1 stack after 8s without a swap
- Visual: 3 bar segments in the class indicator slot
- Design intent: Hybrid who actually cycles weapons is rewarded. Camping one weapon generates no Flow.

## Self-healing per class

There is no baseline transfer strip and no passive free heal. Every class needs
legal Recovery options in its utility pool, and first-session builds include one
Recovery pick.

| Class   | Starter Recovery | Recovery identity                                                                   |
| ------- | ---------------- | ----------------------------------------------------------------------------------- |
| Tank    | Brace Recovery   | Stamina recovery action; Fury can be spent for a stronger heal                      |
| Arciere | Hunter's Flow    | Moving recovery with lateral push; Momentum can be spent for a stronger heal        |
| Mago    | Arcane Rebind    | Mana-cast recovery; armed Risonanza can be spent for a stronger heal                |
| Ibrido  | Adaptive Mend    | Fast lower-peak heal; Flow can be spent for a stronger heal without specialist peak |

Dark lifesteal and Nature healing remain magic sustain lanes only when a legal
class spends those magic slots. They count against the same TTK sustain budget
as Recovery utilities.

## Balance zones

Each class is strong in their zone. Getting OUT of your optimal zone is a skill test:

- **Tank vs Mage**: Tank must close distance through roots/knockup. Mage must maintain range. If Mage lets Tank in to <2m, windup spells gain +0.4s cast time — only Ray/Instant work reliably at that range.
- **Tank vs Arciere**: Arciere kites with Momentum bonus mobility. Tank must read Arciere movement to cut off angles.
- **Mago vs Arciere**: Both ranged. Mago has higher burst via combos and Risonanza. Arciere has more consistent damage and better sustained mobility.
- **Ibrido vs any**: No class advantage, adapts via Flow. Wins by reading and adapting the matchup mid-fight.

## Open class-balance question: proximity casting

The proximity rule below is a candidate, not a locked decision. It must be tested
against the arena-FPS movement/air-combat pass before it becomes class law.

When an enemy is within **2m** of the caster:

- Abilities with `windupSec > 0` receive **+0.4s additional cast time**
- Ray abilities (`windupSec = 0`), Instant abilities, and Mobility abilities are **NOT affected**
- This applies to all classes including Tank (if they try to cast bow abilities point-blank)

Design intent: close range is Tank's domain. Casters who lose positioning are punished. The answer is not to make Tank weaker at close range — it is to ensure casters have at least one instant-cast option ready for when they're caught.

Every magic build should contain at least one Ray or Instant ability as a close-range answer. This is a build requirement, not a passive safety net.
