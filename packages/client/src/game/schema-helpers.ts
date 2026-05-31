// schema-helpers.ts — Colyseus schema type + read-only accessor factory.
//
// SchemaPlayer mirrors the server-side Player schema fields that the client
// reads. Import this type instead of inlining the interface in main.ts.
//
// createSchemaAccessors(getRoom) returns a set of zero-argument getter
// functions that close over the room reference — safe to call from any module.

import type { Room } from 'colyseus.js'
import type { SchemaProjectile } from '../render/projectile-visuals.js'

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

export interface SchemaPlayer {
  id: string
  name: string
  team: string
  transform: { x: number; y: number; z: number; yaw: number; pitch: number }
  vx: number
  vy: number
  vz: number
  onGround: boolean
  hp: number
  mana: number
  stamina: number
  activeWeapon: string
  alive: boolean
  airborneUntilTick: number
  respawnAtTick: number
  comboIndex: number
  swingEndsAtTick: number
  lastSwingStartTick: number
  invulnUntilTick: number
  casting: boolean
  castAbilityId: string
  castEndsAtTick: number
  lastProcessedInputSeq: number
  bowChargeStartTick: number
  parrying: boolean
  parryIsHold: boolean
  parryTapEndsAtTick: number
  statuses: ReadonlyArray<{
    kind: string
    stacks: number
    remainingSec: number
    slowFractionOverride: number
  }>
  abilityCooldowns: Map<string, number>
  loadout: ReadonlyArray<string>
  classId: string
  furyStacks: number
  furyNextMeleeIsSurge: boolean
  momentum: number
  risonanzaElement: string
  risonanzaArmedUntilTick: number
  flowStacks: number
  flowPendingBonus: boolean
  gcdReadyAtTick: number
  momentumTicks: number
  jumpHoldTicksLeft: number
  coyoteTicksLeft: number
}

// ---------------------------------------------------------------------------
// Accessor factory
// ---------------------------------------------------------------------------

export interface SchemaAccessors {
  getSchemaPlayers: () => Map<string, SchemaPlayer> | null
  getSchemaProjectiles: () => Map<string, SchemaProjectile> | null
  getSelfSchemaPlayer: () => SchemaPlayer | null
  getSchemaTick: () => number
  getSchemaMapId: () => string
  getSchemaMode: () => string
}

export function createSchemaAccessors(getRoom: () => Room | null): SchemaAccessors {
  function getSchemaPlayers(): Map<string, SchemaPlayer> | null {
    const room = getRoom()
    if (!room?.state) return null
    const s = room.state as { players?: Map<string, SchemaPlayer> }
    return s.players ?? null
  }

  function getSchemaProjectiles(): Map<string, SchemaProjectile> | null {
    const room = getRoom()
    if (!room?.state) return null
    const s = room.state as { projectiles?: Map<string, SchemaProjectile> }
    return s.projectiles ?? null
  }

  function getSelfSchemaPlayer(): SchemaPlayer | null {
    const room = getRoom()
    if (!room) return null
    return getSchemaPlayers()?.get(room.sessionId) ?? null
  }

  function getSchemaTick(): number {
    const room = getRoom()
    if (!room?.state) return 0
    return (room.state as { tick?: number }).tick ?? 0
  }

  function getSchemaMapId(): string {
    const room = getRoom()
    if (!room?.state) return 'blockout'
    return (room.state as { mapId?: string }).mapId ?? 'blockout'
  }

  function getSchemaMode(): string {
    const room = getRoom()
    if (!room?.state) return 'duel_arena'
    return (room.state as { mode?: string }).mode ?? 'duel_arena'
  }

  return {
    getSchemaPlayers,
    getSchemaProjectiles,
    getSelfSchemaPlayer,
    getSchemaTick,
    getSchemaMapId,
    getSchemaMode,
  }
}
