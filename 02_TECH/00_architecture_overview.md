---
id: architecture_overview
title: Architecture Overview
section: tech
tags: [architecture, processes, packages, data_flow]
provides: [process_model, package_map, data_flow]
deps: []
status: current
---

# Architecture Overview

## Current Runtime Snapshot

RAGEQUIT is a TypeScript monorepo with three active packages:

1. **Client** — Vite + Three.js browser app. It captures input, predicts local movement, renders HUD/wheels/loadout/VFX, and sends requests to the server.
2. **Server** — Node.js + Colyseus authoritative room. It owns movement validation, weapons, ability resolution, statuses, projectiles, zones, damage, death, match flow, bots, rate limiting, and replay scaffolding.
3. **Shared** — Colyseus schemas, protocol types, constants, pure movement/projectile/combat helpers, status math, mastery, and the 52 ability definitions.

There is no Rapier dependency in the current package graph. Collision and movement are custom deterministic TypeScript helpers in `packages/shared/src/sim/` plus server-side AABB/capsule checks in `GameRoom`.

```
packages/
  shared/     # schemas, protocol, constants, ability registry, pure sim helpers
  client/     # Three.js renderer, input, HUD, loadout station, net helpers, VFX
  server/     # Colyseus room, authoritative gameplay systems, bots, replays
apps/
  web/        # Vite production output
```

## Tick Flow

Server tick is 60 Hz. The client render loop is independent.

```
client input + local prediction
  -> input/cast/swing/projectile/parry/loadout messages
  -> Colyseus room queues messages
  -> server tick:
       1. parry/transmute/status/channel timers
       2. zone ticks
       3. movement simulation
       4. queued swings/casts
       5. sword/projectile collision
       6. damage queue drain
       7. regen/respawn/match flow
       8. Colyseus state delta + event broadcasts
  -> client reconciliation/interpolation/render/HUD/VFX
```

Rule: **damage, cooldowns, resource spend, status application, loadout validation, and hit decisions are server-owned**. The client can predict motion and show optimistic UI, but cannot decide gameplay results.

## Main Code Surfaces

| Area | Current implementation |
| --- | --- |
| Authoritative room | `packages/server/src/rooms/GameRoom.ts` |
| Ability runtime | `packages/server/src/sim/AbilityEngine.ts` |
| Ability data | `packages/shared/src/abilities/registry.ts` |
| Status runtime | `packages/server/src/sim/StatusRuntime.ts` |
| Transmutation | `packages/server/src/sim/TransmuteHandler.ts` |
| Movement/controller | `packages/shared/src/sim/controller.ts` |
| Projectile math | `packages/shared/src/sim/projectile.ts` |
| Protocol | `packages/shared/src/protocol/messages.ts` |
| Player/projectile/zone schemas | `packages/shared/src/schema/` |
| Client app/input/render/HUD | `packages/client/src/`; radial wheel controller in `packages/client/src/input/radial-wheels.ts`, mouse sensitivity in `packages/client/src/input/sensitivity.ts`, HUD drag/resize in `packages/client/src/hud/hud-drag.ts`, hotbar/cooldown strip in `packages/client/src/hud/cd-strip.ts`, combat feed in `packages/client/src/hud/combat-feed.ts` |

The Colyseus monitor is an admin surface, not public gameplay API. It is disabled unless `COLYSEUS_MONITOR_ENABLED=true`; when enabled, the server requires `COLYSEUS_MONITOR_USER` and `COLYSEUS_MONITOR_PASSWORD` and protects `/colyseus` with Basic Auth.

## Build Outputs

| Package | Build output | Consumer |
| --- | --- | --- |
| shared | `packages/shared/dist/` | client + server |
| client | `apps/web/dist/` | browser/static hosting |
| server | `packages/server/dist/` | Node runtime |

`shared` must be rebuilt when shared types or ability schema change, because client/server import its built package entrypoints.
