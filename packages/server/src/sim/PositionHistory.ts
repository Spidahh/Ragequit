// ---------------------------------------------------------------------------
// Lag-compensation position history.
//
// A per-player ring buffer of recent position snapshots, used to rewind a
// victim to where they were on the attacker's view tick when resolving melee
// hits (MeleeSystem.resolveSwings calls lookup()). Pure data structure — no
// game-state coupling, so no host interface.
//
// Extracted from GameRoom alongside the combat subsystems.
// ---------------------------------------------------------------------------
import { LAG_COMP_BUFFER_MS, TICK_MS } from '@ragequit/shared'

const LAG_COMP_BUFFER_TICKS = Math.round(LAG_COMP_BUFFER_MS / TICK_MS)

interface PositionSnapshot {
  tick: number
  x: number
  y: number
  z: number
}

export class PositionHistory {
  private readonly buffers = new Map<string, PositionSnapshot[]>()

  /** Start tracking a player (join / bot spawn). */
  register(playerId: string): void {
    this.buffers.set(playerId, [])
  }

  /** Stop tracking a player (leave). */
  forget(playerId: string): void {
    this.buffers.delete(playerId)
  }

  /** Record a snapshot for this tick and prune entries older than the buffer. */
  push(playerId: string, tick: number, pos: { x: number; y: number; z: number }): void {
    const buf = this.buffers.get(playerId)
    if (!buf) return
    buf.push({ tick, x: pos.x, y: pos.y, z: pos.z })
    const cutoff = tick - LAG_COMP_BUFFER_TICKS
    while (buf.length > 0 && buf[0]!.tick < cutoff) buf.shift()
  }

  /** Newest snapshot at or before `targetTick`, or null if none is buffered. */
  lookup(playerId: string, targetTick: number): { x: number; y: number; z: number } | null {
    const buf = this.buffers.get(playerId)
    if (!buf || buf.length === 0) return null
    let best: PositionSnapshot | null = null
    for (const snap of buf) {
      if (snap.tick <= targetTick) {
        if (!best || snap.tick > best.tick) best = snap
      }
    }
    return best
  }
}
