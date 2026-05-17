---
id: progression
title: Progression System
section: meta
tags: [elo, quests, talents, unlocks, ranked]
provides: [elo_tiers, quest_system, talent_tree, unlock_rules]
deps: [07_modes.md]
status: target
---

# Progression System

This is the progression target, not the current local build. The playable vertical slice does not yet implement account persistence, ELO ladders, quest unlocks, cosmetic progression, or talent trees. None of the target tracks should be used to justify hiding current loadout options in the playable build.

Three parallel progression tracks are planned. None of them is "XP per hour" — all are skill-gated.

## 1. ELO Ranked

| Property        | Value                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| Starting ELO    | 1000                                                                   |
| K-factor        | 25 (1v1 + 5v5); 20 (FFA)                                               |
| Tiers           | 7 (Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster) |
| Tier boundaries | ~200 ELO per tier; exact values to be set during closed beta           |
| Decay           | Top-tier (Master+) has weekly decay if inactive 7+ days                |
| Placement       | 10 placement matches on first mode entry                               |

**Separate ELO per mode**: 1v1 / 5v5 / FFA each has its own rating.

**No XP, no level**. Your "level" is your ELO tier. Nothing else.

## 2. Quest / Challenge system

Permanent unlocks are earned through **quests**, not grind.

### Quest types

- **Skill quests**: perform specific actions (land a 3-chain knockup combo, parry 10 shots in one match, win a round without taking damage). Test skill, not volume.
- **Diversity quests**: try different builds (win 5 matches with each element at least once)
- **Milestone quests**: play N matches total (only a handful of these — milestones, not grind)

### Quest rewards

- **Ability unlocks** from the full ability pool once account progression exists
- **Talent points** (see below)
- **Cosmetics** (visual-only: weapon skins, color palettes, victory emotes)

### Quest pacing

- A dedicated player reaches full ability roster in ~40-60 hours of play
- No quest is time-locked (no daily rotation) — all available from account creation if prerequisites met
- Quest progress is tracked per-account and across modes (winning a quest in 1v1 counts for generic "win a match" quests)

## 3. Talent tree (small)

A small customization layer **on top** of the build. Not a replacement for builds.

### Size

- ~15 talent nodes total across 3 small branches (Combat / Survival / Utility)
- Max 5 active talents at once (pick which 5 to enable; rest are available but dormant)
- Talent points earned via quests (~1 per milestone)

### Talent examples (indicative, not final)

- Combat: "+5% M1 damage at full HP"
- Survival: "+1s stamina regen after successful parry"
- Utility: "-1s CD on Self-Heal Potion"

Talents are **small numeric tweaks** (~5-10% each) — they flavor a build, they don't redefine it. Cannot combine into stat-stacking (diminishing returns hardcoded).

### Respec

- Free, any time, outside matches
- Like builds, the friction is supposed to be the thinking not the cost

## 4. Cosmetic progression

- Earned via quests only (no shop transactions for gameplay-affecting items)
- Weapon skins (visual re-texture — no stat changes)
- Player nameplate colors per ELO tier
- Victory emotes (post-match)

**Optional cosmetic shop** (post-launch consideration): purely visual, clearly labeled as cosmetic, never gameplay-affecting. Not scoped for launch.

## What this system is NOT

- Not a battle pass
- Not a season rotation
- Not pay-to-progress
- Not grind-gated (no XP per match)
- Not daily-login-reward oriented
- Not FOMO-driven

Progression is **there if you want it** — the game is fully playable and competitive with the starter unlocks. Progression adds depth, it doesn't gate fun.
