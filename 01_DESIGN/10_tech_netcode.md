---
id: tech_netcode
title: Netcode Architecture
section: tech
tags: [multiplayer, server_auth, prediction, reconciliation]
provides: [netcode_rules, anti_cheat_posture]
deps: [10_tech_stack.md]
status: final
---

# Netcode Architecture

> Redesign note: all-weapon air combat and self-impulse movement tech must stay
> server-authoritative. If the movement model changes from direct velocity caps
> toward acceleration/impulse preservation, prediction and reconciliation change
> with it.

## Core principle: server-authoritative, zero-trust client

The server is the single source of truth for all game state. The client is a **rendering and input-sending shell** that predicts its own movement for responsiveness but never commits anything. Every action the client "takes" is actually a request.

## Tick rate

- **Server tick: 60 Hz** (16.6 ms per tick)
- **Client render: uncapped** (typically vsync at 60/144/240 Hz) with interpolation between server snapshots
- **Client input rate: matches server tick (60 Hz send rate)** — inputs are buffered and sent once per tick

## Client prediction + reconciliation

The client predicts its own player's movement (and possibly M1 basic attacks) locally for responsiveness:

1. Client sends input → immediately applies predicted movement locally
2. Server receives input → simulates canonically → sends back authoritative state
3. Client compares predicted state to authoritative state
4. If discrepancy > threshold → **reconciliation**: client rewinds and re-simulates from the authoritative tick forward, smoothing the result over ~100ms to avoid visible snap

Abilities and combat resolution are **NOT predicted locally** — they are server-confirmed. This keeps cheating infeasible for core damage logic. The slight latency is masked by visual cast animations (wind-up frames give time for round-trip).

## Interpolation of other players

Other players' positions are rendered ~100ms in the past, interpolated smoothly between received server snapshots. Standard technique; keeps motion smooth under packet loss.

## Lag compensation

For melee hitboxes and any future true hitscan ability:

- Server retains a 400ms rolling history of all entity positions per tick
- When a client fires a true hitscan, server rewinds target positions to the client's tick-of-fire and checks the hit there
- Max compensable latency: **200ms** — higher pings don't get compensation beyond that (anti-abuse)

Projectiles (bow M1, staff M1, Marksman Shot, most magic) are simulated on the server with no rewind — the projectile travels from the tick it was spawned, and collisions resolve in real sim time. Direct forward/target abilities also require server line-of-sight against static map cover. This is why projectile trajectory and cover matter: skill expression is preserved.

## State synchronization

Colyseus handles state sync with **delta compression** — only changed fields are transmitted each tick. Typical per-tick bandwidth per client: ~2-8 KB/s depending on mode and action density. Well under budget.

## Anti-cheat posture

- No client-side gameplay decisions accepted (damage, hits, resource spend)
- Input rate limiting per client
- Server-side sanity checks on movement (max speed, teleport detection)
- Replay system archives every match (retained 7 days) — can be audited for suspicious play
- Auth via Supabase is planned for persistence; the current local vertical slice uses direct Colyseus room joins.

## Failure modes

- **Connection drop**: 10s grace window for reconnect (state held server-side); after 10s player is removed from match
- **Server crash**: current local/dev build drops the room. Production recovery is a later infra task.
- **High latency spike**: client shows latency warning on HUD; lag compensation maxes out at 200ms so >200ms players have real hit disadvantages — they can keep playing but should be aware

## What is NOT in scope at launch

- Rollback netcode (GGPO-style) — considered overkill for the game's TTK window and coordination model
- P2P fallback — everything is dedicated server
- Spectator mode — planned post-launch
- Cross-region matchmaking — regional queues only at launch
