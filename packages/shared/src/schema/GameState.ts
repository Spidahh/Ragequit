import { MapSchema, Schema, type } from '@colyseus/schema'

import { Player } from './Player.js'
import { Projectile } from './Projectile.js'
import { Zone } from './Zone.js'

// Room state root. Everything observable by clients hangs off this.
export class GameState extends Schema {
  @type('number') tick = 0
  @type('string') phase: 'lobby' | 'countdown' | 'live' | 'roundEnd' | 'matchEnd' = 'lobby'
  @type('string') mapId = 'blockout'
  @type('string') mode = 'blockout'
  @type({ map: Player }) players = new MapSchema<Player>()
  // Arrows and bolts in flight. Keyed by projectile id.
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>()
  // Persistent ground zones (Flame Wall, Thorn Field, ...). Keyed by zone id.
  @type({ map: Zone }) zones = new MapSchema<Zone>()

  // Score — team kills (5v5), solo kills (FFA), round wins (1v1).
  @type({ map: 'number' }) teamKills = new MapSchema<number>()
  @type({ map: 'number' }) soloKills = new MapSchema<number>()
  @type({ map: 'number' }) roundWins = new MapSchema<number>()
}
