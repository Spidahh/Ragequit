import { Schema, type } from '@colyseus/schema'

// Persistent ground zone — Flame Wall, Thorn Field, Storm Field, Blizzard,
// Ice Wall, Healing Totem. Server ticks zones at the cadence specified by
// the originating ability and applies per-tick effects. Clients render the
// zone as a decal/particle for the duration.

export class Zone extends Schema {
  @type('string') id = ''
  @type('string') ownerId = ''
  @type('string') abilityId = ''
  @type('string') element = 'none'
  // 'circle' (radius) or 'wall' (line segment of length=width)
  @type('string') shape = 'circle'
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') z: number = 0
  // For walls: yaw of the line (radians); ignored for circles.
  @type('number') yaw: number = 0
  @type('number') radius: number = 0
  @type('number') width: number = 0
  // Schedule.
  @type('number') spawnedAtTick: number = 0
  @type('number') armedAtTick: number = 0
  @type('number') despawnAtTick: number = 0
  @type('number') nextTickAtTick: number = 0
  @type('number') tickEveryTicks: number = 60
  // Per-tick payload.
  @type('number') damagePerTick: number = 0
  @type('string') applyStatusKind = ''
  @type('number') applyStatusDurationSec: number = 0
  @type('number') applyStatusStacks: number = 0
  @type('number') applyStatusSlowFraction: number = 0
  @type('boolean') expiresOnTrigger = false
  // True after the engine resolves expiry; clients fade out + remove.
  @type('boolean') expired = false
}
