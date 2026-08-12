import type { ServerHitMessage } from '@ragequit/shared'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { hitContactPoint, spawnHitImpacts } from './hit-impacts.js'

const hit = (over: Partial<ServerHitMessage> = {}): ServerHitMessage =>
  ({
    attackerId: 'A',
    victimId: 'B',
    damage: 20,
    cause: 'ability:fireball',
    element: 'fire',
    didParry: false,
    ...over,
  }) as ServerHitMessage

describe('hitContactPoint', () => {
  // Regression: the contact point used to be the attacker↔victim MIDPOINT, so
  // a bow hit from 20 m drew its impact 10 m short of the target.
  it('sits on the victim, not halfway to the attacker', () => {
    const vic = { x: 0, y: 0, z: 0 }
    const att = { x: 20, y: 0, z: 0 }
    const p = hitContactPoint(vic, att)!
    expect(p.x).toBeLessThan(1) // nudged toward the attacker, not 10 m away
    expect(p.z).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(1.0) // chest height
  })

  it('nudges toward the attacker so melee sparks land on the guard', () => {
    const p = hitContactPoint({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -4 })!
    expect(p.z).toBeCloseTo(-0.35)
  })

  it('is stable when attacker and victim share a position', () => {
    const p = hitContactPoint({ x: 3, y: 0, z: 3 }, { x: 3, y: 0, z: 3 })!
    expect(p.x).toBeCloseTo(3)
    expect(p.z).toBeCloseTo(3)
  })

  it('returns null when the victim is not on screen', () => {
    expect(hitContactPoint(null, { x: 0, y: 0, z: 0 })).toBeNull()
  })
})

describe('spawnHitImpacts', () => {
  const collect = () => {
    const impacts: { pos: THREE.Vector3; color: number; profile?: string }[] = []
    const bursts: { pos: THREE.Vector3; element: string }[] = []
    return {
      impacts,
      bursts,
      deps: {
        spawnImpact: (pos: THREE.Vector3, color: number, profile?: string) =>
          impacts.push({ pos: pos.clone(), color, profile }),
        burstElement: (pos: THREE.Vector3, element: string) =>
          bursts.push({ pos: pos.clone(), element }),
      } as never,
    }
  }
  const ctx = {
    vicPos: { x: 0, y: 0, z: 0 },
    attPos: { x: 5, y: 0, z: 0 },
    isAirPunish: false,
  }

  it('gives an element burst to instant abilities, not just projectiles', () => {
    const c = collect()
    spawnHitImpacts(c.deps, hit({ cause: 'ability:chain_bolt', element: 'lightning' }), ctx)
    expect(c.bursts).toHaveLength(1)
    expect(c.bursts[0]!.element).toBe('lightning')
  })

  it('skips the element burst for physical hits and parries', () => {
    const physical = collect()
    spawnHitImpacts(physical.deps, hit({ cause: 'sword_m1', element: 'none' }), ctx)
    expect(physical.bursts).toHaveLength(0)

    const parried = collect()
    spawnHitImpacts(parried.deps, hit({ didParry: true }), ctx)
    expect(parried.bursts).toHaveLength(0)
    expect(parried.impacts).toHaveLength(1)
    expect(parried.impacts[0]!.profile).toBe('parry')
  })

  it('draws nothing for a zero-damage, non-parry hit', () => {
    const c = collect()
    spawnHitImpacts(c.deps, hit({ damage: 0 }), ctx)
    expect(c.impacts).toHaveLength(0)
  })

  it('uses the pierce profile for arrows and melee for swords', () => {
    const bow = collect()
    spawnHitImpacts(bow.deps, hit({ cause: 'ability:marksman_shot', element: 'none' }), ctx)
    expect(bow.impacts[0]!.profile).toBe('pierce')

    const sword = collect()
    spawnHitImpacts(sword.deps, hit({ cause: 'sword_m1', element: 'none', damage: 4 }), ctx)
    expect(sword.impacts[0]!.profile).toBe('melee')
  })
})
