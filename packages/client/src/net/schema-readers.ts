// ---------------------------------------------------------------------------
// Colyseus schema read helpers.
//
// Thin, null-safe accessors over the room's replicated state. Built as a
// factory taking a room getter (the room reference is reassigned on connect),
// so they can be destructured in main.ts and used exactly as before.
// ---------------------------------------------------------------------------
import type { Room } from 'colyseus.js'
import type { SchemaPlayer } from '../game/schema-helpers.js'
import type { SchemaProjectile } from '../render/projectile-visuals.js'

export interface SchemaReaders {
  getSchemaPlayers(): Map<string, SchemaPlayer> | null
  getSchemaProjectiles(): Map<string, SchemaProjectile> | null
  getSelfSchemaPlayer(): SchemaPlayer | null
  getSchemaTick(): number
  getSchemaMapId(): string
  getSchemaMode(): string
}

export function createSchemaReaders(getRoom: () => Room | null): SchemaReaders {
  function getSchemaPlayers(): Map<string, SchemaPlayer> | null {
    const room = getRoom()
    if (!room?.state) return null
    return (room.state as { players?: Map<string, SchemaPlayer> }).players ?? null
  }

  function getSchemaProjectiles(): Map<string, SchemaProjectile> | null {
    const room = getRoom()
    if (!room?.state) return null
    return (room.state as { projectiles?: Map<string, SchemaProjectile> }).projectiles ?? null
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
