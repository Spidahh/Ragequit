---
id: player_journey
title: Player Journey
section: core
tags: [flow, ux, onboarding]
provides: [player_flow_stages]
deps: []
status: target
---

# Player Journey

## Current local entry flow

Main Menu -> Play 1v1 / Training / Free For All -> Loadout Station ->
mode-specific start CTA -> local room/training path.

The standalone Loadout editor uses `SAVE BUILD`. OAuth, quests, and
account-backed unlocks are not implemented yet.

## Target first-time flow

Login (Google OAuth or guest) -> short tutorial -> Main Menu -> Mode Select ->
first match.

## Target typical session

Main Menu → Lobby → Loadout Station (configure build) → Mode Queue → Match → End Screen → back to Lobby.

Session length is player-driven. A single 5v5 match runs 10-15 minutes; a 1v1 BO5 runs 5-10 minutes. No daily login reward pressures you to play.

## Loadout Station

The table below describes the current runtime slice. Target Loadout Station
redesign follows `00_classes.md`, Magic Base / Magic Advanced and the open
resource sustain study.

Pre-match, the player configures:

| Slot type | Count  | Notes                                                                                      |
| --------- | ------ | ------------------------------------------------------------------------------------------ |
| Melee     | 1      | One of the melee ability pool. See `05_abilities_melee.md`.                                |
| Bow       | 1      | One of the bow ability pool. See `05_abilities_bow.md`.                                    |
| Magic     | 5      | From any of the 5 elements. Current runtime: 4+ same element = Mastery active (`03_mastery_system.md`). Target: split into Magic Base / Magic Advanced per class (`00_classes.md`). |
| Utility   | 4      | Three fixed transfers + one flex utility pick. See `05_abilities_utility.md`.              |
| **Total** | **11** |                                                                                            |

Plus:

- Direct keyboard binds mirror slot layout and can be remapped from Settings. Rebinds persist locally.
- Visual cosmetics are progression targets, not current local functionality.

## Target match end

The product end screen should show:

### Core result block

- Match result (Win / Loss / Draw) + ELO delta
- Round summary for 1v1 (e.g. "3–1")
- Kill/death for FFA and 5v5

### Per-player stats block

The stats displayed must reflect what the game rewards — not generic shooter stats:

| Stat                    | Why it matters                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| Damage dealt / taken    | Basic performance signal                                         |
| Knockup attempts        | How aggressively the player used the signature mechanic          |
| Knockup conversions (%) | Skill indicator: did they follow up during the airborne window?  |
| Parry successes         | Defensive skill indicator                                        |
| Sustain actions         | Resource/healing decisions once the sustain model is approved    |
| Class mechanic procs    | Did Fury, Momentum, Risonanza or Flow shape the match?           |
| Best single hit         | Memorable moment anchor                                          |
| Most used ability       | Helps player reflect on their actual playstyle vs intended build |

### Progression block (target, requires Supabase auth)

- Quest progress ticks
- Any new unlocks (ability, cosmetic, talent point)
- Option to queue again or return to lobby

### Current live behavior

The current scoreboard shows only win/loss + a back button. No stats are tracked or displayed. This is the highest-priority UX gap in the post-match flow — a player cannot improve if they receive no signal about their performance.

**Implementation priority**: knockup conversions and damage dealt/taken are the first two stats to add, as they directly teach the two core skills (combo execution and staying alive).

Recent match replays (last 5 per player) are a product target for review.
