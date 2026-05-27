// Anti-cheat runtime.
//
// The server is already authoritative on movement / damage / projectiles
// so the main client-side mischief left is flooding - sending
// inputs / casts / parry events faster than humanly possible. This module is
// a pluggable per-message rate limiter that the GameRoom can wire on each
// inbound channel; if a client crosses the threshold the room kicks them.
//
// Detection is simple sliding-window: keep a count of messages received
// inside the last `windowMs`; reset the counter when the window rolls.
// Threshold values are conservative defaults and can be tightened by telemetry.
// after closed playtest data lands.

export interface RateLimitConfig {
  windowMs: number
  maxInWindow: number
}

export const ANTI_CHEAT_LIMITS: Record<string, RateLimitConfig> = {
  // 60 Hz tick × ~3 inputs/tick safety = 180/s. Round up to 240.
  input: { windowMs: 1000, maxInWindow: 240 },
  // Sword swing cap = 3/s combo. Allow burst 6/s for spammers.
  swing: { windowMs: 1000, maxInWindow: 6 },
  // Cast/loadout are gated by GCD/CD server-side — anything past
  // 30/s is impossible from a real human input.
  cast: { windowMs: 1000, maxInWindow: 30 },
  weaponSwap: { windowMs: 1000, maxInWindow: 20 },
  parry: { windowMs: 1000, maxInWindow: 20 },
  charge: { windowMs: 1000, maxInWindow: 20 },
  fireStaff: { windowMs: 1000, maxInWindow: 30 },
  loadoutSet: { windowMs: 5000, maxInWindow: 5 },
}

interface Slot {
  windowStart: number
  count: number
}

export class RateLimiter {
  private readonly slots: Map<string, Map<string, Slot>> = new Map()

  // Returns true if the message is allowed; false if the client should be
  // throttled / kicked. `now` is performance.now()-equivalent in ms.
  allow(sid: string, channel: string, now: number): boolean {
    const cfg = ANTI_CHEAT_LIMITS[channel]
    if (!cfg) return true
    let perChannel = this.slots.get(channel)
    if (!perChannel) {
      perChannel = new Map()
      this.slots.set(channel, perChannel)
    }
    let slot = perChannel.get(sid)
    if (!slot || now - slot.windowStart >= cfg.windowMs) {
      slot = { windowStart: now, count: 1 }
      perChannel.set(sid, slot)
      return true
    }
    slot.count += 1
    return slot.count <= cfg.maxInWindow
  }

  // Drop client state on disconnect.
  forgetClient(sid: string): void {
    this.slots.forEach((perChannel) => perChannel.delete(sid))
  }

  // Test-friendly reset — wipe all state.
  reset(): void {
    this.slots.clear()
  }
}

// --- Sanity checks: detect impossible movement deltas (teleport / speedhack)
// Returns true if `(prev, curr, dtMs)` is plausible given MOVE_SPEED_MPS plus
// jump tolerance. Server also runs a kinematic sim so this is a backup —
// useful for catching reconciliation diverging beyond the prediction budget.
export function isMovementPlausible(
  prevX: number,
  prevZ: number,
  currX: number,
  currZ: number,
  dtMs: number,
  maxSpeedMps: number,
  toleranceMps: number = 1.0,
): boolean {
  const dx = currX - prevX
  const dz = currZ - prevZ
  const dist = Math.hypot(dx, dz)
  const maxAllowed = ((maxSpeedMps + toleranceMps) * dtMs) / 1000
  return dist <= maxAllowed
}
