import * as THREE from 'three'
import { afterEach, describe, expect, it } from 'vitest'

import { applyDirectionalShake, getShakeScale, setShakeScale } from './visual-helpers.js'

const self = { x: 0, y: 0, z: 0 }
const attacker = new THREE.Vector3(3, 0, 0)

afterEach(() => setShakeScale(1))

describe('camera-shake scale', () => {
  it('shakes normally at full scale', () => {
    setShakeScale(1)
    const off = new THREE.Vector3()
    expect(applyDirectionalShake(off, self, attacker, 1)).toBeGreaterThan(0)
  })

  // The point of the accessibility setting: at zero the camera must not move at
  // all, not merely move less.
  it('does not move the camera at all at zero', () => {
    setShakeScale(0)
    const off = new THREE.Vector3(9, 9, 9)
    expect(applyDirectionalShake(off, self, attacker, 2)).toBe(0)
    expect(off.length()).toBe(0)
  })

  it('scales proportionally in between', () => {
    setShakeScale(1)
    const full = applyDirectionalShake(new THREE.Vector3(), self, attacker, 1)
    setShakeScale(0.5)
    const half = applyDirectionalShake(new THREE.Vector3(), self, attacker, 1)
    expect(half).toBeCloseTo(full / 2, 5)
  })

  it('clamps values from outside instead of trusting them', () => {
    setShakeScale(4)
    expect(getShakeScale()).toBe(1)
    setShakeScale(-1)
    expect(getShakeScale()).toBe(0)
    setShakeScale(Number.NaN)
    expect(getShakeScale()).toBe(1)
  })

  // Without an attacker the direction is random, but "off" must still be off.
  it('stays still at zero even for a shake with no direction', () => {
    setShakeScale(0)
    const off = new THREE.Vector3()
    expect(applyDirectionalShake(off, self, null, 3)).toBe(0)
  })
})
