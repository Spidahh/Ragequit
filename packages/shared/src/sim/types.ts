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
  // Compatibility field replicated as zero. Runtime jump-hold is disabled.
  jumpHoldTicksLeft: number
  // Stamina is read by the controller to gate jumps. Written by a separate
  // regen system, not by the controller itself.
  stamina: number
  // Coyote-time: ticks remaining after walking off a ledge in which a jump
  // is still allowed. Set by the controller, read only for the jump gate.
  coyoteTicksLeft: number
  // Compatibility field replicated as zero. Runtime base movement has no
  // generic momentum ramp; class-specific Momentum is separate.
  momentumTicks: number
}

// One tick worth of input, normalised.
export interface SimInput {
  moveX: number // -1..1
  moveZ: number // -1..1
  yaw: number // radians
  jump: boolean
  jumpHold: boolean // accepted for protocol compatibility; currently ignored
}

export interface StaticMap {
  boxes: AABB[]
  // Ground plane Y (flat floor, no heightfield).
  groundY: number
  // Spawn points. At least 2 for duel rooms.
  spawns: Vec3[]
}
