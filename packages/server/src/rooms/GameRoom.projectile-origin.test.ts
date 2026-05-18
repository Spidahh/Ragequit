import {
  PLAYER_CAPSULE_HEIGHT_M,
  PROJECTILE_MUZZLE_Y_OFFSET_M,
  Player,
} from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { computeProjectileOrigin } from './GameRoom.js'

describe('GameRoom projectile origin', () => {
  it('spawns first-person projectiles from muzzle height, not above the head', () => {
    const player = new Player()
    player.transform.x = 10
    player.transform.y = 0.9
    player.transform.z = -4

    const origin = computeProjectileOrigin(player, { x: 0, y: 0, z: -1 })

    expect(PROJECTILE_MUZZLE_Y_OFFSET_M).toBeLessThan(PLAYER_CAPSULE_HEIGHT_M / 2)
    expect(origin.y).toBeCloseTo(player.transform.y + PROJECTILE_MUZZLE_Y_OFFSET_M)
  })
})
