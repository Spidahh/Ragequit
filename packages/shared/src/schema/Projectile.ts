import { Schema, type } from '@colyseus/schema'

// Projectile entity — one per in-flight bow arrow or staff bolt.
// Spawned by the server when a charged shot is released or when a bolt fires.
// Replicated so clients can render it without waiting for server-side hit
// resolution. Position is integrated server-side each tick; clients interpolate
// between snapshots.
//
// Schema lives here in `shared` so the dedicated server and the client agree
// on the wire shape. The integration math is shared too, in
// `sim/projectile.ts`, so client and server share the same motion contract.
export class Projectile extends Schema {
  @type('string') id = ''
  // Player id of the shooter — used for friendly-fire filtering and for
  // awarding the kill on fatal hits.
  @type('string') ownerId = ''
  // 'arrow' | 'bolt' (string so additional projectile kinds do not require a schema bump).
  @type('string') kind = 'arrow'
  @type('string') element = 'none'

  // World-space origin + velocity at spawn. Kept replicated for debug + late
  // joiners; live position is `x/y/z` below.
  @type('number') originX: number = 0
  @type('number') originY: number = 0
  @type('number') originZ: number = 0

  // Current position (integrated every tick).
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') z: number = 0

  // Velocity (m/s). Integrated with gravity each tick. Arrows have
  // BOW_GRAVITY_MPS2, bolts have STAFF_M1_GRAVITY_MPS2.
  @type('number') vx: number = 0
  @type('number') vy: number = 0
  @type('number') vz: number = 0

  // Gravity applied to this projectile (m/s²). Varies by kind.
  @type('number') gravity: number = 0

  // Raw damage the projectile will deal on hit. For bow it's computed at
  // release time from charge ratio; for staff it's the flat STAFF_M1_DAMAGE.
  @type('number') damage: number = 0

  // Tick at which the projectile spawned (for TTL + client arrival animation).
  @type('number') spawnedAtTick: number = 0

  // Tick at which the projectile expires if it hasn't hit anything.
  @type('number') despawnAtTick: number = 0

  // True once the server has resolved a collision — the entity will be
  // removed from the map at end-of-tick. Clients can play a small impact VFX
  // when they observe the transition to true.
  @type('boolean') expired = false
}
