---
id: network_protocol
title: Network Protocol
section: tech
tags: [multiplayer, protocol, messages, state_sync, reconciliation]
provides: [message_list, state_schema, reconciliation_algo]
deps: [00_architecture_overview.md, 01_entity_component_model.md]
status: current
---

# Network Protocol

> Current runtime protocol. Class loadouts, final recovery/sustain, all-weapon
> air combat and server-owned self-impulse are redesign work. Keep this document
> honest when those protocol shapes change.

## Summary

- Transport: Colyseus WebSocket.
- Tick: 60 Hz server.
- State: `@colyseus/schema` delta sync.
- Events: explicit `room.send`/`broadcast` messages defined in `packages/shared/src/protocol/messages.ts`.
- Authority: server owns gameplay. Client sends intent.

## Client To Server Events

| Type            | Payload                                                           | Notes                                                                                           |
| --------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `input`         | `{ tick, seq, moveX, moveZ, yaw, pitch, jump, jumpHold, m1, m2 }` | Movement intent; server echoes processed seq through player schema                              |
| `swing`         | `{ atTick, yaw }`                                                 | Sword M1 rising edge                                                                            |
| `cast`          | `{ abilityId, atTick, targetYaw?, targetPitch?, targetPoint? }`   | Instant direct casts, LMB-fired primed wheel abilities, and LMB-confirmed placement previews    |
| `weaponSwap`    | `{ weapon, atTick }`                                              | `sword`, `bow`, or `staff`                                                                      |
| `chargeStart`   | `{ atTick }`                                                      | Bow M1 press                                                                                    |
| `chargeRelease` | `{ atTick, yaw, pitch }`                                          | Bow M1 release                                                                                  |
| `fireStaff`     | `{ atTick, yaw, pitch }`                                          | Staff M1                                                                                        |
| `parryPress`    | `{ atTick }`                                                      | RMB press                                                                                       |
| `parryRelease`  | `{ atTick }`                                                      | RMB release                                                                                     |
| `transmute`     | `{ direction, atTick }`                                           | Legacy/direct transfer path                                                                     |
| `loadoutSet`    | `{ melee, bow, magic[5], utility[4] }`                            | Server normalizes fixed transfer slots, rejects duplicates, and rejects transfer utilities in V |
| `heartbeat`     | `{ clientTime }`                                                  | Ping/keepalive                                                                                  |

The wheel interaction itself is client-side UI. Releasing Q/E primes a slot; the subsequent LMB either sends `cast` immediately or opens the placement preview for non-instant abilities. Placement previews send `cast` only when LMB confirms the target point.

Server validation currently clamps `targetPoint` to the ability range and
rejects/ignores impossible casts after checking loadout membership, locks, cost,
cooldown, weapon requirement, Phase Shift, parry state, and airborne state.
Target redesign replaces blanket airborne rejection with explicit air-combat
rules. Direct forward/target abilities must also pass server line-of-sight
against static map cover before selecting a victim.

## Server To Client Events

| Type                                      | Payload                                                              | Purpose                             |
| ----------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| `hit`                                     | `{ attackerId, victimId, damage, element, didParry, atTick, cause }` | Damage/VFX/audio                    |
| `death`                                   | `{ victimId, killerId, assistIds, cause, atTick }`                   | Death UI, respawn                   |
| `abilityCasted`                           | `{ casterId, abilityId, atTick }`                                    | Cast bar, HUD pending clear, VFX    |
| `abilityFailed`                           | `{ abilityId, reason }`                                              | Rejected cast feedback              |
| `statusApplied` / `statusExpired`         | status payload                                                       | HUD icons and VFX                   |
| `transmuteResult`                         | `{ playerId, direction, ok, reason?, atTick }`                       | Transfer feedback                   |
| `zoneSpawned` / `zoneExpired`             | zone payload                                                         | Zone VFX                            |
| `projectileSpawned` / `projectileExpired` | projectile payload                                                   | Projectile and impact VFX           |
| `weaponSwapped`                           | `{ playerId, weapon, atTick }`                                       | Weapon HUD/model feedback           |
| `parryEvent`                              | `{ playerId, kind, atTick }`                                         | Parry HUD/VFX                       |
| `channelInterrupted`                      | `{ casterId, abilityId, reason, atTick }`                            | Collapse cast bar, show interrupted |
| `killStreak`                              | `{ playerId, streak, damageBonus, atTick }`                          | Streak UI                           |
| `matchPhase`                              | phase payload                                                        | Menu/round overlays                 |
| `score`                                   | score payload                                                        | Scoreboard                          |
| `pongAck`                                 | ping payload                                                         | Latency HUD                         |
| `serverNote`                              | `{ kind, text }`                                                     | Warnings/info                       |
| `reconcile`                               | `{ tick, pos, vel }`                                                 | Owner movement reconciliation       |

## Replicated State

Current schemas live in `packages/shared/src/schema/`:

- `GameState`: tick, phase, mode, map, players, projectiles, zones, scores.
- `Player`: transform, velocity, resources, alive/respawn, weapon, cast state, parry state, bow/staff timers, cooldown maps, statuses, loadout, mastery.
- `Projectile`: arrow/bolt transform, velocity, gravity, damage, owner, element, TTL.
- `Zone`: circle/wall shape, owner, ability id, element, position, radius/width, armed tick, expire tick, tick cadence, damage/status payload.
- `StatusInstance`: kind, stacks, remaining seconds, source id, slow override.

There are no replicated `Totem`, `IceWall`, or `Trap` maps; those are represented as `Zone` when needed.

## Reconciliation And Lag Compensation

- Client predicts only local movement.
- Server writes `Player.lastProcessedInputSeq` so the client can drop acknowledged inputs.
- Server stores position history for swing lag compensation.
- Projectiles simulate forward server-side without rewind.
- Ability results are not client-authoritative.

## Rejection Reasons

`abilityFailed.reason` currently includes:

`cooldown`, `cost`, `range`, `cc`, `unreachable`, `wrong_weapon`, `gcd`, `dead`, `casting`, `airborne`, `parrying`, `unknown_ability`, `not_in_loadout`.

Projectile hit payload statuses are applied during damage drain, after parry, shield, and invulnerability checks. A parried or fully shielded projectile does not leak root, bleed, chill, burn, or similar on-hit effects.

## Rate Limiting

Rate limiting is implemented server-side by `RateLimiter` and applied to high-frequency message families (`input`, `swing`, `cast`, `weaponSwap`, `charge`, `fireStaff`, `parry`, `transmute`, `loadoutSet`, `heartbeat`).
