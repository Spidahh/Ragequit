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

This document describes playable modes and locked mode rules.

## Current local slice

| Path            | Current local behavior                                                               |
| --------------- | ------------------------------------------------------------------------------------ |
| 1v1             | Main menu -> Loadout Station -> local duel flow; solo tests bot-fill the second slot |
| Training        | Main menu -> Loadout Station -> training/bot flow                                    |
| Free For All    | Main menu -> Loadout Station -> kill-based FFA runtime without bot fill              |
| Team Battle 5v5 | Team mode rule set                                                                   |

## Mode Summary

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
- Scoreboard: dedicated HUD/menu surface shows kills, deaths, damage dealt,
  parries and pings

## 1v1 Ranked

- Best-of-5 rounds, first to 3 round wins takes the match
- Rounds are timed: 2 minutes max; if timer expires, higher-HP player wins the round
- Between rounds: 8 s break + full reset (HP to 200, Mana to 100, Stamina to 100, **all ability cooldowns cleared**) — each round starts on an even footing regardless of how the previous round ended
- No respawn (round-based)
- ELO: separate 1v1 ladder, K-factor 25
- Map: smaller symmetric arena (`duel_arena`) using the current compact duel layout
- Current local build: the main-menu 1v1 button bot-fills the second slot so solo testing enters a live duel immediately. Real matchmaking must replace this with a human opponent queue before ranked launch.

## FFA 10

- 10 players, every player for themselves
- First to **40 kills** wins
- Respawn: **3 s**, 2 s spawn invulnerability with 3-location random spawn to avoid spawn-camping
- Map: `gladiators_arena` (larger spawn distribution)
- ELO: separate FFA ladder, K-factor 20 (slower convergence because games are more chaotic)
- Scoreboard: live leaderboard visible on HUD (top 3 + self position)

## Training

- 1v1 vs a bot
- 3 difficulty levels: Novice / Competent / Master (current local build has one fixed bot difficulty)
- No ELO
- Full reset on death (0 s respawn)
- Useful for testing builds, practicing combos, learning ability timing
- Bots use a deterministic behavior tree (NOT scripted perfection — they miss, they react with delay, they follow readable patterns)

### Bot difficulty behavior spec

| Level     | Behavior description                                                                                                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novice    | Moves and uses M1. Does not parry. Does not use knockup → follow-up. Cast timing is slow and predictable. Reaction delay: ~600ms.                                                                                                         |
| Competent | Uses all ability slots. Parries obvious M1 patterns. Occasionally staggers after being hit. Does not chain knockup into follow-up. Reaction delay: ~350ms.                                                                                |
| Master    | **Uses knockup → follow-up combos**: when it lands a KNOCKUP ability, it immediately queues an instant follow-up (Marksman Shot, Fireball, or Chain Bolt) to hit during the airborne window. Parries predictably. Reaction delay: ~150ms. |

The Master bot existing in Training before Supabase auth is implemented is intentional: the player needs to learn by receiving knockup combos, not just by reading a tutorial.

### End-screen stats (Training)

After each Training session (manual exit or death), show a compact summary:

- Time alive
- Damage dealt / damage taken
- Knockup attempts → conversions (e.g. "3/5 knockup conversions")
- Parry successes
- Abilities used (count per slot)

This is the feedback loop that teaches the game. Without it, the player has no signal on whether they are improving.

## Matchmaking rules (cross-mode)

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

## Torneo — ne resta uno solo

Added 2026-08-13 (D22, `00_truth.md`). `00_vision.md` names
tournament-until-one-remains as one of three modes that stay, and it did not
exist.

- **No respawn.** Death is elimination. This is the entire mode.
- Up to 8 players (`MAX_CLIENTS_TOURNAMENT`), bot-filled so a solo player gets a
  real lobby.
- The match ends when one player is left alive. If the clock runs out first, the
  healthiest survivor wins; an exact tie has no winner rather than an arbitrary one.
- **At most one `survival`/`counter` ability in the build.** Every build must
  already carry a Recovery, and every Recovery is `survival`, so in tournament
  **your Recovery is your one defensive pick** and everything else has to fight.

**Why the cap.** A four-defensive build is legal everywhere else and merely
slow: a Mago can field `arcane_rebind + phase_shift + dark_barrier +
healing_totem`, a Tank `brace_recovery + barrier + phase_shift +
disengage_shot`. In a mode where death is final, refusing to lose is the same as
winning. The cap counts ROLES rather than slots, because that stall build is
spread across families precisely to slip past a slot rule.

**What it deliberately does not inherit from FFA.** FFA is 40 kills with a
respawn: winning a fight gains you a point and costs your opponent about a
second and a half. That is the opposite of "until one remains", and it is why
tournament is the only mode where knowing when NOT to take a fight is paid for.

## Win condition design notes

Kill counts are sized so a match runs about **15 minutes**, which is the actual
intent; the counts themselves are a consequence, not a design goal. Every player
should get many fight opportunities rather than one decisive teamfight.

> **Re-derived 2026-08-13 (D3, `00_truth.md`).** This line used to read "kill
> counts are high (75 / 40) on purpose — with TTK 20-30s, this creates
> 15-minute matches". TTK was never 20-30 s, so both counts were solving the
> wrong equation — and at the old cycle, 40 FFA kills was a 27-minute match, so
> the 15-minute claim was already wrong before the TTK correction.
>
> Model, per kill: `TTK + approach + respawn`. Old `25 + 10 + 5.0 = 40 s`;
> new `7.5 + 10 + 1.5 = 19 s`. FFA is first-to-N per player, so `900 / 19 ≈ 47`
> → **45**. Team is N per five-player team with roughly two thirds engaged at
> any moment, so `(2/3 × 5 / 19) × 900 ≈ 158` → **150**, about 14 minutes.
>
> The team number is the soft one: its engagement fraction is a guess only
> playtest data can settle. The FFA number needs no such assumption.
