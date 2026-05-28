// Shared kinematic capsule controller. Deterministic — same inputs produce
// the same outputs on client and server, enabling prediction + reconciliation.
//
// Movement scope: flat ground plus static AABBs. No slopes, no moving platforms,
// no character-character collision (players pass through each other). Jump is
// a fixed tap-height impulse; hold-to-jump is intentionally disabled.
//
// This function is called once per simulation tick with dt = TICK_MS / 1000.
// Do NOT call it with variable dt — determinism requires fixed-step.

import { JUMP_COST_STAMINA, JUMP_HEIGHT_TAP_M, MOVE_SPEED_MPS } from '../constants/stats.js'
import {
  CAPSULE_HALF_HEIGHT_M,
  CAPSULE_HALF_WIDTH_M,
  COYOTE_TICKS,
  GRAVITY_MPS2,
  GROUND_EPSILON_M,
  MAX_FALL_SPEED_MPS,
} from '../constants/world.js'

import type { AABB, PlayerSimState, SimInput, StaticMap, Vec3 } from './types.js'

// Status-derived movement caps. Both client (prediction) and server (authority)
// pass these to simulatePlayer so the kinematic step is identical.
//   slowFraction  : 0..1, additive %-slow from chill/slow statuses (clamped)
//   movementLocked: true if root/stun/freeze is active — no horizontal motion
//   castLocked    : true if stun/freeze incapacitates — informational only
export interface MovementCaps {
  slowFraction: number
  movementLocked: boolean
  castLocked: boolean
}

// Initial vy from vertical-motion equation: v0 = sqrt(2 * g * h).
const JUMP_TAP_VY = Math.sqrt(2 * GRAVITY_MPS2 * JUMP_HEIGHT_TAP_M)

export function makePlayerSimState(spawn: Vec3): PlayerSimState {
  return {
    pos: { x: spawn.x, y: spawn.y, z: spawn.z },
    vel: { x: 0, y: 0, z: 0 },
    onGround: true,
    jumpHoldTicksLeft: 0,
    stamina: 100, // overwritten by regen system; controller only reads it
    coyoteTicksLeft: 0,
    momentumTicks: 0,
  }
}

// Runs ONE tick of simulation. Mutates state in place. Returns the mutated ref.
export function simulatePlayer(
  state: PlayerSimState,
  input: SimInput,
  dt: number,
  map: StaticMap,
  caps?: MovementCaps,
): PlayerSimState {
  // --- 1. Horizontal velocity from normalised input in local frame -----
  // Movement-locked statuses (root, stun, freeze) zero horizontal motion.
  // Knockup is launch pressure, not a universal air stun; it keeps gravity and
  // normal input alive unless a real status applies the lock.
  const locked = !!caps?.movementLocked
  // slowFraction can be negative (haste gives −0.4 → 40% speed boost above base).
  // Cap speed multiplier at 1.5× max to prevent runaway haste stacking.
  const slowed = caps ? Math.min(1, caps.slowFraction) : 0
  const speedMul = locked ? 0 : Math.min(1.5, Math.max(0, 1 - slowed))

  let mx = locked ? 0 : input.moveX
  let mz = locked ? 0 : input.moveZ
  const mag = Math.hypot(mx, mz)
  if (mag > 1) {
    mx /= mag
    mz /= mag
  }

  // Momentum and hold-to-jump are disabled as per gameplay specification.
  state.momentumTicks = 0

  // Rotate by yaw — forward is -Z, right is +X (three.js convention).
  const cos = Math.cos(input.yaw)
  const sin = Math.sin(input.yaw)
  const worldX = mx * cos + mz * sin
  const worldZ = -mx * sin + mz * cos

  state.vel.x = worldX * MOVE_SPEED_MPS * speedMul
  state.vel.z = worldZ * MOVE_SPEED_MPS * speedMul

  // --- 2. Jump: static instant tap jump ------------------------------
  const wasOnGround = state.onGround
  const canJump = state.onGround || state.coyoteTicksLeft > 0
  let didJump = false

  if (input.jump && canJump && state.stamina >= JUMP_COST_STAMINA && !locked) {
    state.vel.y = JUMP_TAP_VY
    state.onGround = false
    state.coyoteTicksLeft = 0
    state.stamina = Math.max(0, state.stamina - JUMP_COST_STAMINA)
    didJump = true
  }
  state.jumpHoldTicksLeft = 0

  // --- 3. Gravity (constant standard gravity) ------------------------
  state.vel.y -= GRAVITY_MPS2 * dt
  if (state.vel.y < -MAX_FALL_SPEED_MPS) state.vel.y = -MAX_FALL_SPEED_MPS

  // --- 4. Integrate position -----------------------------------------
  state.pos.x += state.vel.x * dt
  state.pos.y += state.vel.y * dt
  state.pos.z += state.vel.z * dt

  // --- 5. Resolve collisions ------------------------------------------
  // Ground plane: clamp y and zero vertical velocity when landing.
  const floorY = map.groundY + CAPSULE_HALF_HEIGHT_M
  if (state.pos.y <= floorY) {
    state.pos.y = floorY
    if (state.vel.y < 0) state.vel.y = 0
    state.onGround = true
  } else {
    state.onGround = false
  }

  // Box resolution — minimum-translation on capsule's AABB approximation.
  for (const box of map.boxes) {
    resolveCapsuleVsBox(state, box)
  }

  // --- 6. Coyote time counter -----------------------------------------
  // Grant the window when naturally leaving ground (not via a jump).
  // Decrement while airborne; reset to 0 when grounded again.
  if (state.onGround) {
    state.coyoteTicksLeft = 0
  } else if (wasOnGround && !didJump) {
    state.coyoteTicksLeft = COYOTE_TICKS
  } else if (state.coyoteTicksLeft > 0) {
    state.coyoteTicksLeft -= 1
  }

  return state
}

// Pushes the capsule's AABB out of an intersecting static AABB along the axis
// of smallest penetration. Sets onGround true when a +Y push happens.
function resolveCapsuleVsBox(state: PlayerSimState, box: AABB): void {
  const p = state.pos
  const hx = CAPSULE_HALF_WIDTH_M
  const hy = CAPSULE_HALF_HEIGHT_M
  const hz = CAPSULE_HALF_WIDTH_M

  const cMinX = p.x - hx
  const cMaxX = p.x + hx
  const cMinY = p.y - hy
  const cMaxY = p.y + hy
  const cMinZ = p.z - hz
  const cMaxZ = p.z + hz

  const overlapX = Math.min(cMaxX - box.minX, box.maxX - cMinX)
  const overlapY = Math.min(cMaxY - box.minY, box.maxY - cMinY)
  const overlapZ = Math.min(cMaxZ - box.minZ, box.maxZ - cMinZ)

  if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return

  // Push along axis of smallest penetration. Prefer horizontal push when
  // vertical is not strictly smallest — keeps the capsule out of box tops
  // when moving diagonally into a wall.
  if (overlapY < overlapX && overlapY < overlapZ) {
    if (p.y > (box.minY + box.maxY) / 2) {
      p.y += overlapY
      if (state.vel.y < 0) state.vel.y = 0
      state.onGround = true
    } else {
      p.y -= overlapY
      if (state.vel.y > 0) state.vel.y = 0
    }
  } else if (overlapX <= overlapZ) {
    if (p.x > (box.minX + box.maxX) / 2) p.x += overlapX
    else p.x -= overlapX
    state.vel.x = 0
  } else {
    if (p.z > (box.minZ + box.maxZ) / 2) p.z += overlapZ
    else p.z -= overlapZ
    state.vel.z = 0
  }
}

// Utility — returns true if the capsule at `pos` is within GROUND_EPSILON_M of
// any support surface. Used by the regen system to decide if stamina regens at
// idle vs moving rate.
export function isGrounded(pos: Vec3, map: StaticMap): boolean {
  const floorY = map.groundY + CAPSULE_HALF_HEIGHT_M
  if (pos.y <= floorY + GROUND_EPSILON_M) return true
  for (const box of map.boxes) {
    if (
      pos.x + CAPSULE_HALF_WIDTH_M >= box.minX &&
      pos.x - CAPSULE_HALF_WIDTH_M <= box.maxX &&
      pos.z + CAPSULE_HALF_WIDTH_M >= box.minZ &&
      pos.z - CAPSULE_HALF_WIDTH_M <= box.maxZ &&
      Math.abs(pos.y - CAPSULE_HALF_HEIGHT_M - box.maxY) <= GROUND_EPSILON_M
    ) {
      return true
    }
  }
  return false
}
