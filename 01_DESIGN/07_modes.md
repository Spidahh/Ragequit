---
id: modes
title: Game Modes
section: meta
tags: [modes, matchmaking, win_conditions, respawn]
provides: [mode_list, win_rules, respawn_per_mode]
deps: []
status: current
---

# Game Modes

Four modes are the product target. The current local vertical slice supports the shared GameRoom flow plus Training/bot-facing work; full matchmaking, separate ladders, and per-mode rooms are still roadmap items. **1v1 and team modes remain both shipping goals**.

## Mode summary

| Mode            | Team size  | Win condition           | Respawn     | ELO      | Est. duration |
| --------------- | ---------- | ----------------------- | ----------- | -------- | ------------- |
| Team Battle 5v5 | 5v5        | 75 kills                | 5 s         | Team ELO | 10-15 min     |
| 1v1 Ranked      | 1v1        | BO5 rounds (first to 3) | Round-based | Duel ELO | 5-10 min      |
| FFA 10          | 10 solo    | 40 kills (solo)         | 3 s         | FFA ELO  | 8-12 min      |
| Training        | 1v1 vs bot | N/A (practice)          | 0 s         | None     | Free          |

## Team Battle 5v5

- 5 players per side
- First team to **75 total kills** wins
- Respawn: **5 s**, 2 s spawn invulnerability
- Map: `gladiators_arena` (the single existing arena, re-textured in new art style)
- ELO: team-based ELO, K-factor 25, ±100 team balance at matchmaking
- Scoreboard: dedicated HUD/menu surface shows kills, deaths, damage dealt, parries, mastery procs, pings

## 1v1 Ranked

- Best-of-5 rounds, first to 3 round wins takes the match
- Rounds are timed: 2 minutes max; if timer expires, higher-HP player wins the round
- Between rounds: 8 s break + full reset (HP, Mana, Stamina, cooldowns)
- No respawn (round-based)
- ELO: separate 1v1 ladder, K-factor 25
- Map: smaller symmetric arena (`duel_arena`) using the current compact duel layout

## FFA 10

- 10 players, every player for themselves
- First to **40 kills** wins
- Respawn: **3 s**, 2 s spawn invulnerability with 3-location random spawn to avoid spawn-camping
- Map: `gladiators_arena` (larger spawn distribution)
- ELO: separate FFA ladder, K-factor 20 (slower convergence because games are more chaotic)
- Scoreboard: live leaderboard visible on HUD (top 3 + self position)

## Training

- 1v1 vs a bot
- 3 difficulty levels: Novice / Competent / Master
- No ELO
- Full reset on death
- Useful for testing builds, practicing combos, learning ability timing
- Bots use a deterministic behavior tree (NOT scripted perfection — they miss, they react with delay, they follow readable patterns)

## Matchmaking rules (cross-mode)

Status: design target, not implemented in the current local build.

- Matchmaking is **per-mode ELO**. 1v1 rating does not affect 5v5 rating and vice versa.
- **Team balance**: ±100 ELO average difference between the two teams; waits up to 60s then loosens to ±200
- **Solo queue vs. party queue**: separate queues at launch (no party-vs-solo mixing) — prevents party stomp
- **Party size**: up to 5 for 5v5, duo for FFA, solo for 1v1

## Why 1v1 + team both at launch

Both at launch is a pillar decision (see `00_pillars.md`). Reason:

- 1v1 is the **skill expression showcase** — builds shine when it's pure duel
- 5v5 is the **team identity showcase** — coordination, roles emerge, pings matter
- Players rotate between modes based on mood and time available
- Balance data from both informs the calibration passes

## Win condition design notes

Kill counts are high (75 / 40) on purpose — with TTK 20-30s, this creates 15-minute matches and gives every player many fight opportunities, not just decisive one-teamfight outcomes.
