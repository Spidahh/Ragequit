import { describe, expect, it } from 'vitest'

import {
  resolveProjectileHit,
  findChainVictims,
  playersInRadius,
  projectileKnockbackVector,
  type CollidablePlayer,
} from './projectile-collision.js'

function player(
  x: number,
  y: number,
  z: number,
  over: Partial<CollidablePlayer> = {},
): CollidablePlayer {
  return { transform: { x, y, z }, alive: true, invulnUntilTick: 0, ...over }
}

// A box sitting at x≈8 across the shot line.
const FAR_BOX = { minX: 7, maxX: 9, minY: 0, maxY: 4, minZ: -1, maxZ: 1 }

describe('resolveProjectileHit', () => {
  it('hits a player capsule in the path', () => {
    const players = new Map([['victim', player(0, 0.9, 0)]])
    const hit = resolveProjectileHit(
      { x: -5, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 },
      players,
      [],
      'owner',
      0,
    )
    expect(hit?.kind).toBe('victim')
    expect(hit?.victim).toBe('victim')
  })

  it('returns null on a clean miss (no players, no boxes, above ground)', () => {
    const hit = resolveProjectileHit(
      { x: -5, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 },
      new Map(),
      [],
      'owner',
      0,
    )
    expect(hit).toBeNull()
  })

  it('skips the owner', () => {
    const players = new Map([['owner', player(0, 0.9, 0)]])
    const hit = resolveProjectileHit(
      { x: -5, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 },
      players,
      [],
      'owner',
      0,
    )
    expect(hit).toBeNull()
  })

  it('skips dead players', () => {
    const players = new Map([['v', player(0, 0.9, 0, { alive: false })]])
    const hit = resolveProjectileHit(
      { x: -5, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 },
      players,
      [],
      'owner',
      0,
    )
    expect(hit).toBeNull()
  })

  it('skips invulnerable players (now < invulnUntilTick)', () => {
    const players = new Map([['v', player(0, 0.9, 0, { invulnUntilTick: 100 })]])
    const hit = resolveProjectileHit(
      { x: -5, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 },
      players,
      [],
      'owner',
      50,
    )
    expect(hit).toBeNull()
  })

  it('hits a static box as terrain', () => {
    const hit = resolveProjectileHit(
      { x: -5, y: 1, z: 0 },
      { x: 12, y: 1, z: 0 },
      new Map(),
      [FAR_BOX],
      'owner',
      0,
    )
    expect(hit?.kind).toBe('terrain')
    expect(hit?.victim).toBeNull()
  })

  it('picks the nearest victim when two are in the path', () => {
    const players = new Map([
      ['far', player(3, 0.9, 0)],
      ['near', player(0, 0.9, 0)],
    ])
    const hit = resolveProjectileHit(
      { x: -5, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 },
      players,
      [],
      'owner',
      0,
    )
    // Shot travels -x→+x; the player at x≈0 is hit before the one at x≈3.
    expect(hit?.kind).toBe('victim')
    expect(hit?.victim).toBe('near')
  })
})

describe('findChainVictims', () => {
  const origin = { x: 0, y: 0, z: 0 }
  const players = new Map<string, CollidablePlayer>([
    ['owner', player(0, 0, 0)],
    ['a', player(1, 0, 0)], // dist 1
    ['b', player(3, 0, 0)], // dist 3
    ['c', player(20, 0, 0)], // out of radius
    ['dead', player(0.5, 0, 0, { alive: false })],
    ['invuln', player(0.5, 0, 0, { invulnUntilTick: 100 })],
  ])

  it('returns nearest-first within radius, capped at maxTargets', () => {
    expect(findChainVictims(players, 0, 'owner', [], origin, 10, 2)).toEqual(['a', 'b'])
  })

  it('excludes owner, dead, invulnerable and the excluded list', () => {
    const out = findChainVictims(players, 50, 'owner', ['a'], origin, 10, 5)
    expect(out).not.toContain('owner')
    expect(out).not.toContain('a')
    expect(out).not.toContain('dead')
    expect(out).not.toContain('invuln') // tick 50 < 100
    expect(out).toEqual(['b'])
  })

  it('returns empty for non-positive radius or maxTargets', () => {
    expect(findChainVictims(players, 0, 'owner', [], origin, 0, 5)).toEqual([])
    expect(findChainVictims(players, 0, 'owner', [], origin, 10, 0)).toEqual([])
  })
})

describe('playersInRadius', () => {
  const center = { x: 0, y: 0, z: 0 }
  const players = new Map<string, CollidablePlayer>([
    ['owner', player(0, 0, 0)],
    ['near', player(1, 0, 0)],
    ['far', player(50, 0, 0)],
    ['dead', player(1, 0, 0, { alive: false })],
    ['invuln', player(1, 0, 0, { invulnUntilTick: 100 })],
  ])

  it('returns all valid players within the radius (owner/dead/invuln excluded)', () => {
    const out = playersInRadius(players, 50, 'owner', center, 5)
    expect(out).toEqual(['near'])
  })

  it('excludes players beyond the radius', () => {
    expect(playersInRadius(players, 50, 'owner', center, 100)).toContain('far')
    expect(playersInRadius(players, 50, 'owner', center, 5)).not.toContain('far')
  })
})

describe('projectileKnockbackVector', () => {
  it('direct hit pushes along the travel direction', () => {
    const v = projectileKnockbackVector(false, 5, 0, 0, 0, 1, 0, 2)
    expect(v).toEqual({ x: 2, z: 0 })
  })

  it('splash hit pushes radially away from the impact point', () => {
    // victim at (3,0,0), impact at origin => push +x.
    const v = projectileKnockbackVector(true, 3, 0, 0, 0, 0, 1, 2)
    expect(v.x).toBeCloseTo(2)
    expect(v.z).toBeCloseTo(0)
  })

  it('splash exactly at the impact point falls back to travel direction', () => {
    const v = projectileKnockbackVector(true, 0, 0, 0, 0, 0, 1, 2)
    expect(v).toEqual({ x: 0, z: 2 })
  })
})
