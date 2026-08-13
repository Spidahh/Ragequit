// Shared combat helpers. Pure functions — deterministic, no time-of-day, no
// Math.random. Used by the server to resolve hits and by tests to verify
// geometry.

import { TICK_MS } from '../constants/tick.js'
import {
  SWORD_M1_COMBO_RESET_SEC,
  SWORD_M1_CONE_HALF_ANGLE_RAD,
  SWORD_M1_DAMAGE,
  SWORD_M1_RANGE_M,
  MAX_AIRBORNE_SEC,
  UPPERCUT_APEX_M,
} from '../constants/weapons.js'
import { GRAVITY_MPS2 } from '../constants/world.js'

import type { Vec3 } from './types.js'

// ---------------------------------------------------------------------------
// Cone hit test
// ---------------------------------------------------------------------------

export interface ConeHitParams {
  attacker: Vec3
  // Yaw in radians. 0 points toward -Z (forward in Three.js world).
  attackerYaw: number
  target: Vec3
  range: number
  coneHalfAngleRad: number
}

// Returns true when `target` is inside the forward cone defined by
// `attackerYaw`, within `range`, with angular half-width `coneHalfAngleRad`.
// Ignores Y: both players are assumed on (roughly) the same horizontal slab.
// Using a 2D test avoids false-negatives when the target is airborne a few
// meters up.
export function isInMeleeCone(p: ConeHitParams): boolean {
  const dx = p.target.x - p.attacker.x
  const dz = p.target.z - p.attacker.z
  const dist2 = dx * dx + dz * dz
  if (dist2 > p.range * p.range) return false
  // Atan2 in three.js "forward = -Z" convention: yaw=0 looks at -Z, yaw=π/2
  // looks at -X. The angle between the attacker's forward vector (-sin(yaw),
  // -cos(yaw)) and the direction to the target should be <= coneHalfAngle.
  const forwardX = -Math.sin(p.attackerYaw)
  const forwardZ = -Math.cos(p.attackerYaw)
  // Skip zero-distance — target standing on attacker, always a hit.
  if (dist2 < 1e-6) return true
  const invDist = 1 / Math.sqrt(dist2)
  const dirX = dx * invDist
  const dirZ = dz * invDist
  const cosAngle = forwardX * dirX + forwardZ * dirZ
  // cos is monotonically decreasing on [0, π]; inside cone ↔ cosAngle >= cos(half).
  return cosAngle >= Math.cos(p.coneHalfAngleRad)
}

// Convenience wrapper at sword-M1 defaults.
export function isInSwordM1Cone(attacker: Vec3, attackerYaw: number, target: Vec3): boolean {
  return isInMeleeCone({
    attacker,
    attackerYaw,
    target,
    range: SWORD_M1_RANGE_M,
    coneHalfAngleRad: SWORD_M1_CONE_HALF_ANGLE_RAD,
  })
}

// ---------------------------------------------------------------------------
// Knockup trajectory
// ---------------------------------------------------------------------------

// Impulse (initial upward velocity, m/s) required so that a free-falling body
// reaches `UPPERCUT_APEX_M` and returns to start height after exactly
// `UPPERCUT_AIRBORNE_SEC`. Derived from projectile motion:
//   t_up = v0 / g        (time to apex)
//   t_total = 2 * t_up   (symmetric fall)
//   apex = v0² / (2g)
// Solving apex with fixed t_total: g = 2 * apex / (t_up²) and v0 = g * t_up.
// We prefer to express the knockup as an initial vy that respects gravity so
// the existing simulatePlayer handles the trajectory unchanged.

/**
 * Upward impulse for a launch of a given airtime.
 *
 * Symmetric ballistic flight: T = 2*v0/g, so v0 = g*T/2, and the apex follows as
 * g*T^2/8. ONE formula, so whoever tunes the table next can read an apex straight
 * off an airtime. (Asymmetric gravity — a heavier descent to front-load the punish
 * window — is a real technique and is deliberately rejected: under it v0 != g*T/2
 * and every apex in the table stops being derivable.)
 *
 * Airtime is what an ability authors; the velocity is a consequence.
 */
export function launchVyForAirtime(airtimeSec: number): number {
  const t = Math.max(0.05, Math.min(MAX_AIRBORNE_SEC, airtimeSec))
  return (GRAVITY_MPS2 * t) / 2
}

export function uppercutInitialVy(): number {
  // v0 chosen so that with gravity g the apex is UPPERCUT_APEX_M.
  // v0 = sqrt(2 * g * h). The total airtime from ground back to ground is
  // 2 * v0 / g. We then scale g up (locally) only if the derived airtime
  // doesn't match UPPERCUT_AIRBORNE_SEC — but at default constants
  // (g=25, h=2, airtime≈2*sqrt(2h/g)≈0.8) it already lands on target.
  return Math.sqrt(2 * GRAVITY_MPS2 * UPPERCUT_APEX_M)
}

// Sanity check helper used by tests — the ballistic airtime should match the
// designed knockup duration within a tick of slack.
export function uppercutBallisticAirtimeSec(): number {
  const v0 = uppercutInitialVy()
  return (2 * v0) / GRAVITY_MPS2
}

// ---------------------------------------------------------------------------
// Combo state machine
// ---------------------------------------------------------------------------

// Returns the damage that should be dealt for a swing launched NOW, given the
// attacker's last landed chain state. The caller must store the next combo
// index only after the swing contacts a victim.
// Spec:
//   - if more than SWORD_M1_COMBO_RESET_SEC has elapsed since the last swing,
//     index resets to 0 (swing 1 again).
//   - otherwise index advances 0 → 1 → 2 → 0 (wraps).
//   - damage is SWORD_M1_DAMAGE[newIndex].
// Returns { indexJustPlayed, nextStoredIndex, damage }.

export function advanceSwordCombo(
  currentStoredIndex: number,
  lastSwingStartTick: number,
  nowTick: number,
): { indexJustPlayed: number; nextStoredIndex: number; damage: number } {
  const elapsedMs = (nowTick - lastSwingStartTick) * TICK_MS
  const resetMs = SWORD_M1_COMBO_RESET_SEC * 1000
  // If there's never been a swing (lastSwingStartTick = 0) or it was too long
  // ago, start from swing 1 (index 0).
  const startFromZero = lastSwingStartTick === 0 || elapsedMs >= resetMs
  const indexJustPlayed = startFromZero ? 0 : currentStoredIndex
  const nextStoredIndex = (indexJustPlayed + 1) % SWORD_M1_DAMAGE.length
  const damage = SWORD_M1_DAMAGE[indexJustPlayed] ?? 0
  return { indexJustPlayed, nextStoredIndex, damage }
}

export function finishSwordCombo(indexJustPlayed: number, landed: boolean): number {
  if (!landed) return 0
  return (indexJustPlayed + 1) % SWORD_M1_DAMAGE.length
}
