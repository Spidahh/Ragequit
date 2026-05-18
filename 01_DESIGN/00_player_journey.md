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

## First-time flow

Target flow: Login (Google OAuth or guest) → short tutorial → Main Menu → Mode Select → first match.

Current local flow: Main Menu -> Play 1v1 / Training -> Loadout Station -> `START 1V1` / `START TRAINING` -> local room/training path. The standalone Loadout editor uses `SAVE BUILD`. OAuth, quests, and account-backed unlocks are not implemented yet.

## Typical session

Main Menu → Lobby → Loadout Station (configure build) → Mode Queue → Match → End Screen → back to Lobby.

Session length is player-driven. A single 5v5 match runs 10-15 minutes; a 1v1 BO5 runs 5-10 minutes. No daily login reward pressures you to play.

## Loadout Station

Pre-match, the player configures:

| Slot type | Count  | Notes                                                                                      |
| --------- | ------ | ------------------------------------------------------------------------------------------ |
| Melee     | 1      | One of the melee ability pool. See `05_abilities_melee.md`.                                |
| Bow       | 1      | One of the bow ability pool. See `05_abilities_bow.md`.                                    |
| Magic     | 5      | From any of the 5 elements. 4+ same element = Mastery active (see `03_mastery_system.md`). |
| Utility   | 4      | Three fixed transfers + one flex utility pick. See `05_abilities_utility.md`.              |
| **Total** | **11** |                                                                                            |

Plus:

- Direct keyboard binds mirror slot layout and can be remapped from Settings. Rebinds persist locally.
- Visual cosmetics are progression targets, not current local functionality.

## Match end

End screen shows:

- Match result + ELO delta
- Individual stats (damage dealt/taken, kills, parries, mastery proc count)
- Quest progress ticks
- Any new unlocks (ability, cosmetic, talent point)
- Option to queue again or return to lobby

Recent match replays (last 5 per player) are retained for review.
