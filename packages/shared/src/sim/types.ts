// Plain-data simulation types. Used by the shared controller; client uses them
// for prediction, server uses them for authoritative sim. No class instances
// cross the boundary to keep everything clone-safe.

export interface Vec3 {
  x: number
  y: number
  z: number
}

// Axis-aligned box, expressed by min/max corners.
export interface AABB {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

// Snapshot of a player's sim state. Only fields that the controller reads
// or writes — gameplay fields (hp/mana/cooldowns) are applied separately.
export interface PlayerSimState {
  pos: Vec3
  vel: Vec3
  onGround: boolean
  // Ticks remaining in which jumpHold can still add upward impulse. Counts
  // down automatically while hold is sustained; resets on jump.
  jumpHoldTicksLeft: number
  // Stamina is read by the controller to gate jumps. Written by a separate
  // regen system, not by the controller itself.
  stamina: number
  // Coyote-time: ticks remaining after walking off a ledge in which a jump
  // is still allowed. Set by the controller, read only for the jump gate.
  coyoteTicksLeft: number
  // Consecutive ticks of sustained horizontal input. When this reaches
  // MOMENTUM_THRESHOLD_TICKS the controller grants a MOMENTUM_BONUS speed
  // multiplier (Quake-inspired feel). Resets when input drops to zero or the
  // player is CC'd. Client carries it through reconcile from serverState=0
  // (bonus re-accrues after ~0.5 s of continued movement — imperceptible).
  momentumTicks: number
}

// One tick worth of input, normalised.
export interface SimInput {
  moveX: number // -1..1
  moveZ: number // -1..1
  yaw: number // radians
  jump: boolean
  jumpHold: boolean
}

export interface StaticMap {
  boxes: AABB[]
  // Ground plane Y (flat floor, no heightfield).
  groundY: number
  // Spawn points. At least 2 for duel rooms.
  spawns: Vec3[]
}
