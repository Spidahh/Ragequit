---
id: transmutation
title: Transmutation
section: systems
tags: [resources, trade, hp, mana, stamina]
provides: [transmute_rules, transmute_ratios]
deps: [01_stats.md]
status: current
---

# Transmutation

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

**Stamina → HP has a 30:20 ratio penalty.** It is an emergency tool, not a primary heal.

**Reverse directions** (Mana → HP, Stamina → Mana, HP → Stamina) are not supported directly. Players must chain through the allowed directions, respecting each direction's independent cooldown.

## Activation rules

- Each direction has its own independent 5 s cooldown — they do not share
- Transmutation cannot spend unavailable resources. HP → Mana also cannot be cast at 20 HP or lower, so transfer can never self-kill.
- Direct Z/X/F casts resolve immediately if valid. Q-wheel selection primes the transfer sector; the next M1 fires it with no cast windup.
- Cannot transmute during parry (M2) or mid-ability cast

## Design intent

Transmutation couples the three resource pools into one strategic surface. Every spend decision — cast an ability, parry, jump, dash — can be reconsidered through the lens of "what if I transmute instead?" The 5 s per-direction cooldown makes it a tactical lever, not a mechanical spam.

Typical usage patterns:

- **Burn HP for one more decisive ability cast** (HP → Mana)
- **Emergency heal when stamina is high and HP critical** (Stamina → HP)
- **Build stamina reserve before a parry-heavy exchange** (Mana → Stamina)
