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
3. **Shared** — Colyseus schemas, protocol types, constants, pure movement/projectile/combat helpers, status math, classes, and the ability definitions.

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
       1. parry/status/channel timers
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

| Area                           | Current implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authoritative room             | `packages/server/src/rooms/GameRoom.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Ability runtime                | `packages/server/src/sim/AbilityEngine.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Ability data                   | `packages/shared/src/abilities/registry.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Status runtime                 | `packages/server/src/sim/StatusRuntime.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Movement/controller            | `packages/shared/src/sim/controller.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Projectile math                | `packages/shared/src/sim/projectile.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Protocol                       | `packages/shared/src/protocol/messages.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Player/projectile/zone schemas | `packages/shared/src/schema/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Client app/input/render/HUD    | `packages/client/src/`; game input controller in `input/game-input.ts`, radial wheel controller in `input/radial-wheels.ts`, mouse sensitivity in `input/sensitivity.ts`, cast/fire/weapon dispatcher in `input/cast-dispatcher.ts`, HUD drag/resize in `hud/hud-drag.ts`, hotbar/cooldown strip in `hud/cd-strip.ts`, combat feed in `hud/combat-feed.ts`, self-player HUD in `hud/self-hud.ts`, ability fail / server toast in `hud/ability-fail-hud.ts`, hit feedback (hitmarker/dir hit/damage popup) in `hud/hit-feedback.ts`, bow charge / parry ring / round timer / vignettes in `hud/combat-overlay-hud.ts`, status applied/expired vignette flash in `hud/status-overlay.ts`, self-character emissive / player-light in `render/self-emissive.ts`, projectile visuals in `render/projectile-visuals.ts`, zone visuals in `render/zone-visuals.ts`, placement preview in `render/placement-preview.ts`, remote player visuals in `render/remote-players.ts`, arena animation in `world/arena.ts` (animateArena) |

The Colyseus monitor is an admin surface, not public gameplay API. It is disabled unless `COLYSEUS_MONITOR_ENABLED=true`; when enabled, the server requires `COLYSEUS_MONITOR_USER` and `COLYSEUS_MONITOR_PASSWORD` and protects `/colyseus` with Basic Auth.

## Additional Client Systems (added 2026-06-01)

| System | File | Notes |
|---|---|---|
| Asset preloader | `src/preloader.ts` | Preloads character + weapons before match starts; shows loading bar |
| Match state machine | `src/game/match-state-machine.ts` | Explicit FSM for disconnected/lobby/countdown/live/roundEnd/matchEnd |
| Post-processing bloom | `main.ts` (EffectComposer) | Three.js layer 1 = bloom-eligible; UnrealBloomPass strength 0.45 |
| LOD remote players | `render/remote-players.ts` | >40m: hide mesh; 20-40m: disable shadows |
| Audio spatial 3D | `audio/sound-engine.ts` | PannerNode HRTF for remote player hits/casts; listener updated every frame |
| Arena torches | `world/arena.ts` | Torch_Metal.gltf at 4 pillars + PointLight flickering (per-torch phase offset) |
| Sky dome | `world/arena.ts` | ShaderMaterial gradient (dark zenith -> lighter horizon) |
| FPV weapon depth | `main.ts` | fpvKeyLight (PointLight camera-attached) + MeshStandardMaterial |
| Dynamic crosshair | `main.ts` + CSS | Expands on WASD movement; green flash on kill |
| Low-HP heartbeat | `audio/sound-engine.ts` | Procedural lub-dub below 25% HP, rate proportional to danger |
| Camera shake | `main.ts` | Exponential decay + micro-oscillation for organic feel |

## Runtime Invariants

- Airborne is not hard CC.
- Fall damage and own ability self-damage remain zero.
- Loadout validation is class-aware.
- No runtime surface may reintroduce passive systems, extra loadout slots or
  fixed transfer slots.
- Movement, impulse, prediction and reconciliation stay server-owned.
- VFX textures must be RGBA white-on-transparent (not colored or dark-background).
- Bloom layer 1 is reserved for emissive/glowing mesh only. Do not set layer 1
  on regular geometry or it will glow incorrectly.
- Character models load as .gltf + .bin (not .glb) — .glb embeds textures and
  produces 15-40 MB files per class.
- Weapon models load as .glb from public/weapons/kaykit/ (sword_D, bow, staff, shield_A).

## Build Outputs

| Package | Build output            | Consumer               |
| ------- | ----------------------- | ---------------------- |
| shared  | `packages/shared/dist/` | client + server        |
| client  | `packages/client/dist/` | browser/static hosting |
| server  | `packages/server/dist/` | Node runtime           |

`shared` must be rebuilt when shared types or ability schema change, because client/server import its built package entrypoints.
