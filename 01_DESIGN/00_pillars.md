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
2. **The weapon is the identity, not the build.** What a player can do is
   determined by what they are holding and where they are standing, readable
   without a menu. This replaces "class identity plus build diversity", which
   came from a vision that contradicted every reference game the owner named —
   Quake 3, Darkfall, Mordhau and Dark Messiah have no builds. See
   `00_vision.md`, rewritten 2026-08-13.
3. **Immediate feedback**. Every hit, every miss, every proc has a visual and audio tell. Damage numbers are optional but impact VFX is mandatory.
4. **Server-authoritative**. The simulation lives on the server. The client predicts for responsiveness; the server confirms. Any discrepancy resolves in the server's favor.
5. **No elemental counter**. Elements differ in _effect_, never in counter-relationships. A Fire build is never weak to an Ice build on principle.
6. **Mini-malus on every ability**. Bonuses come with trade-offs. Prevents one-dimensional "all upside" abilities and forces build tension. See `05_abilities_philosophy.md`.
7. **Arena-FPS activity is sacred**. Aim, movement, aerial counterplay and
   weapon/spell tech must keep the player active. A combo window can pressure the
   target; it must not become a long forced non-turn.

## Anti-patterns (what we never do)

- **No fake class skins**. A class must change play grammar, resources, slots and
  mechanic; do not add class labels if they only recolor the same build.
- **No auto-aim, no aim assist**. Ranged weapons and targeted abilities require skill. Aim assist undermines the meritocracy pillar.
- **No pay-to-win**. Cosmetics only. No gameplay advantages ever purchasable.
- **No season pass**. Progression is flat and earned through quests and play.
- **No default iframe roll as the whole defense model**. Dodging should emerge
  from movement, aim denial and abilities; parry/shield must be visible when it
  protects.
- **No Shift sprint**. Sprint is the default move speed. Shift is unused.
- **No level grind / XP gates**. All abilities unlock via quests (skill-tested), never via farming time.
- **No RNG in ability output**. No crit that depends on dice. Ability effects are deterministic given input conditions.
- **No paywalled content**. All content (modes, abilities, cosmetics via quests) is reachable through play.
