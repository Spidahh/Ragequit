import { describe, expect, it } from 'vitest'

import { resolveProjectileHit, type CollidablePlayer } from './projectile-collision.js'

function player(x: number, y: number, z: number, over: Partial<CollidablePlayer> = {}): CollidablePlayer {
  return { transform: { x, y, z }, alive: true, invulnUntilTick: 0, ...over }
}

// A box sitting at x≈8 across the shot line.
const FAR_BOX = { minX: 7, maxX: 9, minY: 0, maxY: 4, minZ: -1, maxZ: 1 }

describe('resolveProjectileHit', () => {
  it('hits a player capsule in the path', () => {
    const players = new Map([['victim', player(0, 0.9, 0)]])
    const hit = resolveProjectileHit({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, players, [], 'owner', 0)
    expect(hit?.kind).toBe('victim')
    expect(hit?.victim).toBe('victim')
  })

  it('returns null on a clean miss (no players, no boxes, above ground)', () => {
    const hit = resolveProjectileHit({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, new Map(), [], 'owner', 0)
    expect(hit).toBeNull()
  })

  it('skips the owner', () => {
    const players = new Map([['owner', player(0, 0.9, 0)]])
    const hit = resolveProjectileHit({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, players, [], 'owner', 0)
    expect(hit).toBeNull()
  })

  it('skips dead players', () => {
    const players = new Map([['v', player(0, 0.9, 0, { alive: false })]])
    const hit = resolveProjectileHit({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, players, [], 'owner', 0)
    expect(hit).toBeNull()
  })

  it('skips invulnerable players (now < invulnUntilTick)', () => {
    const players = new Map([['v', player(0, 0.9, 0, { invulnUntilTick: 100 })]])
    const hit = resolveProjectileHit({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, players, [], 'owner', 50)
    expect(hit).toBeNull()
  })

  it('hits a static box as terrain', () => {
    const hit = resolveProjectileHit({ x: -5, y: 1, z: 0 }, { x: 12, y: 1, z: 0 }, new Map(), [FAR_BOX], 'owner', 0)
    expect(hit?.kind).toBe('terrain')
    expect(hit?.victim).toBeNull()
  })

  it('picks the nearest victim when two are in the path', () => {
    const players = new Map([
      ['far', player(3, 0.9, 0)],
      ['near', player(0, 0.9, 0)],
    ])
    const hit = resolveProjectileHit({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, players, [], 'owner', 0)
    // Shot travels -x→+x; the player at x≈0 is hit before the one at x≈3.
    expect(hit?.kind).toBe('victim')
    expect(hit?.victim).toBe('near')
  })
})
