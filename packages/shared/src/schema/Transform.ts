import { Schema, type } from '@colyseus/schema'

// Position + orientation. Shared across entity types that move.
// Authority: 02_TECH/03_network_protocol.md § State schema skeleton.
export class Transform extends Schema {
  @type('number') x = 0
  @type('number') y = 0
  @type('number') z = 0
  @type('number') yaw = 0
  @type('number') pitch = 0
}
