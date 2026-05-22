---
id: transmutation
title: Transmutation
section: systems
tags: [resources, trade, hp, mana, stamina]
provides: [transmute_rules, transmute_ratios]
deps: [01_stats.md]
status: superseded-runtime
---

# Transmutation

> This document describes the old/current runtime transfer model. The developer
> rejected it as the target design on 2026-05-22. Do not build new loadout, HUD
> or class decisions around three fixed transfers. The target sustain decision
> in `04_resource_sustain_study.md` removes fixed transfers.

Resource conversion system accessed through the Utility Wheel (Q hold). Three of the four utility wheel sectors are fixed transmutation options.

## Utility Wheel sectors (Q)

| Sector | Action                   |
| ------ | ------------------------ |
| 1      | Transmute HP → Mana      |
| 2      | Transmute Mana → Stamina |
| 3      | Transmute Stamina → HP   |
| 4      | Flex utility             |

Three fixed transfer conversions + one flex utility sector.

## Conversion rules

| Direction      | Input      | Output     | Cooldown |
| -------------- | ---------- | ---------- | -------- |
| HP → Mana      | 20 HP      | 20 Mana    | 5 s      |
| Mana → Stamina | 20 Mana    | 20 Stamina | 5 s      |
| Stamina → HP   | 30 Stamina | 20 HP      | 5 s      |

**Stamina → HP has a 30:20 ratio penalty.** It is an emergency tool, not a primary heal. The penalty is intentional: Stamina regenerates at 10/s out of combat and 5/s while moving in combat — without the penalty, a player could farm Stamina via regen and convert it endlessly into HP. The unfavorable ratio forces a real trade-off: either spend Stamina for mobility, parry, and jumps, or burn it for emergency healing — never both freely.

**Reverse directions** (Mana → HP, Stamina → Mana, HP → Stamina) are not supported directly. Players must chain through the allowed directions, respecting each direction's independent cooldown.

## Activation rules

- Each direction has its own independent 5 s cooldown — they do not share
- Transmutation cannot spend unavailable resources. HP → Mana also cannot be cast at 20 HP or lower, so transfer can never self-kill.
- **A conversion that fails (insufficient source resource) does NOT trigger the cooldown.** Only successful conversions start the 5 s timer.
- Direct Z/X/F casts resolve immediately if valid. Q-wheel selection primes the transfer sector; the next M1 fires it with no cast windup.
- Cannot transmute during parry (M2) or mid-ability cast
- **Transmutation is not an ability cast and does NOT trigger the 0.3 s Global Cooldown.** The GCD applies only to combat ability slots (Melee, Bow, Magic). M1 basic attacks and transmutation conversions are both GCD-exempt.

## Design intent

Transmutation couples the three resource pools into one strategic surface. Every spend decision — cast an ability, parry, jump, dash — can be reconsidered through the lens of "what if I transmute instead?" The 5 s per-direction cooldown makes it a tactical lever, not a mechanical spam.

Typical usage patterns:

- **Burn HP for one more decisive ability cast** (HP → Mana)
- **Emergency heal when stamina is high and HP critical** (Stamina → HP)
- **Build stamina reserve before a parry-heavy exchange** (Mana → Stamina)
