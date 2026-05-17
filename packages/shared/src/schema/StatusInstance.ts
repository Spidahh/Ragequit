import { Schema, type } from '@colyseus/schema'

// Replicated status instance. One per active condition on a player. Server
// integrates these via the Status runtime in `status/types.ts` and broadcasts
// the array each tick. Clients read for HUD icons + tooltip.
//
// `slowFractionOverride` covers ability-specific %-slows (e.g. Curse of
// Weakness 30%). For Chill/Burn/Bleed the runtime falls back to STATUS_META.

export class StatusInstance extends Schema {
  @type('string') kind = 'burn'
  @type('number') stacks: number = 1
  @type('number') remainingSec: number = 0
  @type('number') slowFractionOverride: number = 0
  // Source player id (for kill attribution on DoT lethal hits).
  @type('string') sourceId = ''
}
