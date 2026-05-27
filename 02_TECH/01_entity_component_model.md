---
id: entity_component_model
title: Entity And State Model
section: tech
tags: [entities, schema, state]
provides: [entity_types, state_ownership]
deps: [00_architecture_overview.md]
status: current
---

# Entity And State Model

## Approach

The current game does **not** use an ECS library. Runtime state is a small set of Colyseus schema classes plus server-only side maps for queues, histories, projectile metadata, zones, bots, and anti-cheat.

This is intentional for the current scope: the entity count is low, Colyseus wants explicit schema fields, and the server systems are easier to test as direct TypeScript modules.

## Replicated Schema Entities

| Entity     | Schema           | Owner  | Notes                                                                         |
| ---------- | ---------------- | ------ | ----------------------------------------------------------------------------- |
| Game state | `GameState`      | server | Tick, phase, mode, map, score, players, projectiles, zones                    |
| Player     | `Player`         | server | Transform, resources, weapon, cast/parry/charge, cooldowns, statuses, loadout |
| Projectile | `Projectile`     | server | Arrow/bolt position, velocity, gravity, damage, owner, element                |
| Zone       | `Zone`           | server | Circle/wall zones, armed tick, expiration, damage/status payload              |
| Status     | `StatusInstance` | server | Kind, stacks, remaining seconds, source, slow override                        |
| Transform  | `Transform`      | server | Position + yaw/pitch                                                          |

There are no replicated Totem, IceWall, Trap, or CorpseMarker schemas right now. Snare Trap, Ice Wall, Flame Wall, Thorn Field, Storm Field, Smoke Screen, and similar objects are represented by `Zone`.

## Server-Only State

| State                   | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| input/swing/cast queues | Rate-limited message buffering                                |
| pending swing list      | Sword M1 hit timing                                           |
| damage queue            | Single path for HP, shield, parry, lifesteal, death           |
| projectile metadata     | Splash/status/lifesteal payloads not all replicated in schema |
| position history        | Lag compensation for melee/swing checks                       |
| bot controllers         | Training and calibration bots                                 |
| match manager           | Countdown/live/roundEnd/matchEnd                              |
| replay recorder         | Broadcast event capture                                       |
| rate limiter            | Anti-spam guard                                               |

## State Ownership

Every gameplay field has one writer: the server. The client reads replicated state and sends intent messages.

| Field               | Writer                  | Client use                            |
| ------------------- | ----------------------- | ------------------------------------- |
| Transform/resources | server                  | prediction reconciliation, HUD        |
| active weapon       | server                  | weapon HUD, model/VFX                 |
| cooldown maps       | server                  | hotbar rings                          |
| statuses            | server                  | icons, movement caps display, VFX     |
| loadout             | server after validation | hotbar, wheels, loadout station       |
| projectiles/zones   | server                  | visual meshes and impact/zone effects |

Client-side local prediction maintains a parallel local transform for responsiveness. It does not mutate authoritative state.

## Server Tick Order

Current high-level order in `GameRoom`:

1. Update parry timers and queued combat messages.
2. Tick ability windups/channels.
3. Tick statuses and zones.
4. Simulate player movement.
5. Start queued swings/casts.
6. Resolve sword swings and projectile collisions.
7. Drain damage queue.
8. Regenerate resources and push history.
9. Advance match phase.

Damage from weapons, abilities, zones, status combos, and DoTs flows through the same damage queue so shield/parry/lifesteal/death behavior stays centralized.
