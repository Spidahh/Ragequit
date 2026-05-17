---
id: pillars
title: Design Pillars
section: core
tags: [rules, anti-patterns, philosophy]
provides: [design_rules, anti_patterns]
deps: [00_vision.md]
status: final
---

# Design Pillars

## Rules (what we always do)

1. **Skill over stats**. Outcomes are determined by input quality, positioning, and decision-making. Never by grind or cosmetics.
2. **Build diversity**. Every viable playstyle is supported through loadout combinations — never through class locks or archetype restrictions.
3. **Immediate feedback**. Every hit, every miss, every proc has a visual and audio tell. Damage numbers are optional but impact VFX is mandatory.
4. **Server-authoritative**. The simulation lives on the server. The client predicts for responsiveness; the server confirms. Any discrepancy resolves in the server's favor.
5. **No elemental counter**. Elements differ in _effect_, never in counter-relationships. A Fire build is never weak to an Ice build on principle.
6. **Mini-malus on every ability**. Bonuses come with trade-offs. Prevents one-dimensional "all upside" abilities and forces build tension. See `05_abilities_philosophy.md`.
7. **Depth vs breadth trade-off is a real choice**. Same-element stacking gets Mastery bonuses while individual abilities are tuned weaker. Mixed-element builds get stronger individual abilities but no Mastery. Both are viable. Weapon M1 infusion is a future implementation pass, not current runtime.

## Anti-patterns (what we never do)

- **No classes**. No archetype that restricts weapon access, ability type, or stats.
- **No tank/glass/balanced axis**. All players have identical base HP/Mana/Stamina. Differentiation is via loadout exclusively.
- **No auto-aim, no aim assist**. Ranged weapons and targeted abilities require skill. Aim assist undermines the meritocracy pillar.
- **No pay-to-win**. Cosmetics only. No gameplay advantages ever purchasable.
- **No season pass**. Progression is flat and earned through quests and play.
- **No dodge / roll**. No iframe mechanic exists. Parry (M2) is the only active defense.
- **No Shift sprint**. Sprint is the default move speed. Shift is unused.
- **No level grind / XP gates**. All abilities unlock via quests (skill-tested), never via farming time.
- **No RNG in ability output**. No crit that depends on dice. Ability effects are deterministic given input conditions.
- **No paywalled content**. All content (modes, abilities, cosmetics via quests) is reachable through play.
