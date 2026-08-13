// Ground telegraph for wind-up AoE abilities.
//
// Nothing warned you before an area attack landed: Meteor has a 1 s wind-up
// but its target point was never replicated, so the first thing a victim saw
// was the damage. This draws the ability's REAL radius on the ground the
// moment the cast starts, filling to full exactly when it lands — so it can be
// read and dodged, and so the caster can see where their own shot is going.
//
// Style follows the readability rules the project already uses: a bright,
// opaque outer rim (readable from any angle, over any floor colour) with a
// faint interior fill, element-tinted, drawn just above the floor.

import * as THREE from 'three'

import { ELEMENT_COLOR } from '../hud/cd-strip.js'

interface Telegraph {
  group: THREE.Group
  rim: THREE.Mesh
  fill: THREE.Mesh
  radius: number
  startedAt: number
  durationMs: number
}

export interface CastTelegraphController {
  spawn: (msg: {
    casterId: string
    abilityId: string
    element: string
    pos: { x: number; y: number; z: number }
    radius: number
    durationMs: number
  }) => void
  /** Advance fills and reap expired markers. */
  update: (now: number) => void
  clear: () => void
}

const RIM_THICKNESS_M = 0.18
/** Linger briefly past impact so the eye can connect marker → explosion. */
const LINGER_MS = 120

export function initCastTelegraph(scene: THREE.Scene): CastTelegraphController {
  const live: Telegraph[] = []

  function spawn(msg: Parameters<CastTelegraphController['spawn']>[0]): void {
    const color = new THREE.Color(ELEMENT_COLOR[msg.element] ?? ELEMENT_COLOR['none']!)
    const group = new THREE.Group()
    // Draw at the height the hitbox actually resolves at, not on the floor.
    // msg.pos.y used to be discarded, which was harmless while the only
    // telegraphed ability was ground-targeted — but insideAoe measures from
    // center.y, which for forward targeting is the victim's mid-capsule height.
    // On the maps' 2-3 m boxes that draws the ring on the floor while the damage
    // resolves at chest height: precisely the "I was clearly outside that"
    // failure a single honest shape exists to prevent.
    group.position.set(msg.pos.x, msg.pos.y + 0.03, msg.pos.z)

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.05, msg.radius - RIM_THICKNESS_M), msg.radius, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    rim.rotation.x = -Math.PI / 2
    rim.renderOrder = 3
    rim.layers.enable(1) // bloom — the rim is the readable part
    group.add(rim)

    // Grows from the centre to the rim over the wind-up: the fill IS the timer.
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    fill.rotation.x = -Math.PI / 2
    fill.renderOrder = 2
    fill.scale.setScalar(0.001)
    group.add(fill)

    scene.add(group)
    live.push({
      group,
      rim,
      fill,
      radius: msg.radius,
      startedAt: performance.now(),
      durationMs: Math.max(1, msg.durationMs),
    })
  }

  function dispose(t: Telegraph): void {
    scene.remove(t.group)
    t.rim.geometry.dispose()
    ;(t.rim.material as THREE.Material).dispose()
    t.fill.geometry.dispose()
    ;(t.fill.material as THREE.Material).dispose()
  }

  function update(now: number): void {
    for (let i = live.length - 1; i >= 0; i--) {
      const t = live[i]!
      const elapsed = now - t.startedAt
      const ratio = Math.min(1, elapsed / t.durationMs)
      t.fill.scale.setScalar(Math.max(0.001, ratio * t.radius))
      // Pulse the rim harder as impact approaches — the last beat is a warning.
      const urgency = 0.55 + 0.45 * Math.sin(now * 0.02 * (1 + ratio * 2))
      ;(t.rim.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.45 * urgency
      if (elapsed > t.durationMs + LINGER_MS) {
        dispose(t)
        live.splice(i, 1)
      }
    }
  }

  function clear(): void {
    for (const t of live) dispose(t)
    live.length = 0
  }

  return { spawn, update, clear }
}
