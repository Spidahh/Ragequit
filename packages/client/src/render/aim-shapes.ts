// ---------------------------------------------------------------------------
// Drawing an AimShape.
//
// The shapes themselves are solved in @ragequit/shared (abilities/aim.ts) so
// they cannot drift from the hitbox. This file only decides how each one reads
// on screen; it holds no geometry maths of its own beyond orientation.
//
// Every shape is built once and toggled, never rebuilt per frame: an aim
// preview updates at frame rate and allocating geometry there is how a preview
// becomes a stutter.
// ---------------------------------------------------------------------------
import type { AimDash, AimDisc, AimLane, AimWall } from '@ragequit/shared'
import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)

function flatMat(opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffd260,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

export interface DiscView {
  group: THREE.Group
  apply: (disc: AimDisc, color: number, pulse: number) => void
  setColor: (color: number) => void
}

/** Ground circle: filled area plus a hard rim, because the rim is the promise. */
export function createDiscView(): DiscView {
  const group = new THREE.Group()
  const fillMat = flatMat(0.2)
  const rimMat = flatMat(0.9)
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), fillMat)
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.955, 1, 64), rimMat)
  fill.rotation.x = -Math.PI / 2
  rim.rotation.x = -Math.PI / 2
  group.add(fill, rim)
  return {
    group,
    apply(disc, color, pulse) {
      group.position.set(disc.center.x, disc.center.y + 0.035, disc.center.z)
      fill.scale.setScalar(disc.radius)
      rim.scale.setScalar(disc.radius)
      fillMat.color.setHex(color)
      rimMat.color.setHex(color)
      fillMat.opacity = 0.14 + pulse * 0.1
      rimMat.opacity = 0.7 + pulse * 0.24
    },
    setColor(color) {
      fillMat.color.setHex(color)
      rimMat.color.setHex(color)
    },
  }
}

export interface WallView {
  group: THREE.Group
  apply: (wall: AimWall, color: number, pulse: number) => void
}

/** Oriented slab for wall zones. */
export function createWallView(): WallView {
  const group = new THREE.Group()
  const mat = flatMat(0.36)
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  slab.rotation.x = -Math.PI / 2
  group.add(slab)
  return {
    group,
    apply(wall, color, pulse) {
      group.position.set(wall.center.x, wall.center.y + 0.035, wall.center.z)
      group.rotation.y = wall.yaw
      slab.scale.set(wall.width, wall.depth, 1)
      mat.color.setHex(color)
      mat.opacity = 0.3 + pulse * 0.14
    },
  }
}

export interface LaneView {
  group: THREE.Group
  apply: (lane: AimLane, color: number, pulse: number) => void
}

/**
 * The forward lane, as a thin beam with a ring where it ends.
 *
 * The first version of this drew the lane's actual volume — a tapered tube from
 * the muzzle to the impact point. It was geometrically correct and unusable:
 * the lane STARTS at the camera, so you are looking down a 30 m cone from its
 * apex, and the near opening subtends about 60° of the screen. The verifier
 * caught it, a screenshot of a fireball preview that was two thirds red disc.
 *
 * The width is real information, but it belongs at the far end where it is
 * small and where you are looking anyway. So the axis is a hairline beam and
 * the spread is the ring at the impact point: direction from one, size from the
 * other, and nothing painted across the middle of the view.
 */
export function createLaneView(): LaneView {
  const NEAR_SKIP = 1.1
  const BEAM_RADIUS_M = 0.035
  const group = new THREE.Group()
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffd260,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  // Unit cylinder along +Y, open-ended so the end caps never flash as discs.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(BEAM_RADIUS_M, BEAM_RADIUS_M, 1, 8, 1, true),
    beamMat,
  )
  const capMat = new THREE.MeshBasicMaterial({
    color: 0xffd260,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const cap = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 32), capMat)
  group.add(beam, cap)

  const axis = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const mid = new THREE.Vector3()
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()

  return {
    group,
    apply(lane, color, pulse) {
      from.set(lane.from.x, lane.from.y, lane.from.z)
      to.set(lane.to.x, lane.to.y, lane.to.z)
      axis.copy(to).sub(from)
      const full = axis.length()
      if (full < 1e-4) {
        group.visible = false
        return
      }
      axis.multiplyScalar(1 / full)
      quat.setFromUnitVectors(UP, axis)

      const skip = Math.min(NEAR_SKIP, full * 0.5)
      const len = full - skip

      mid.copy(from).addScaledVector(axis, skip + len / 2)
      beam.position.copy(mid)
      beam.quaternion.copy(quat)
      beam.scale.set(1, len, 1)
      beamMat.color.setHex(color)
      beamMat.opacity = 0.4 + pulse * 0.2

      cap.position.copy(to)
      cap.quaternion.copy(quat)
      cap.rotateX(Math.PI / 2)
      cap.scale.setScalar(lane.endRadius)
      capMat.color.setHex(color)
      // A lane cut short by a wall is a different fact from a lane at max
      // range. Say it with intensity rather than a second colour, so the
      // element still owns the hue.
      capMat.opacity = lane.blocked ? 0.95 : 0.55 + pulse * 0.2
      group.visible = true
    },
  }
}

export interface DashView {
  group: THREE.Group
  apply: (dash: AimDash, color: number, pulse: number, bodyHeight: number) => void
}

/**
 * Where your own body ends up: a footprint ring at the landing, a standing
 * ghost above it, and the path between. The eight movement abilities had no
 * preview of any kind before this, which made a 6 m blink into a dice roll
 * about whether you would end up behind the pillar or inside it.
 */
export function createDashView(): DashView {
  const group = new THREE.Group()
  const ringMat = flatMat(0.85)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 32), ringMat)
  ring.rotation.x = -Math.PI / 2

  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0xffd260,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 16, 1, true), ghostMat)

  const pathGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ])
  const pathMat = new THREE.LineBasicMaterial({ color: 0xffd260, transparent: true, opacity: 0.75 })
  const path = new THREE.Line(pathGeom, pathMat)

  group.add(ring, ghost, path)
  return {
    group,
    apply(dash, color, pulse, bodyHeight) {
      ring.position.set(dash.to.x, dash.to.y + 0.04, dash.to.z)
      ghost.position.set(dash.to.x, dash.to.y + bodyHeight / 2, dash.to.z)
      ghost.scale.set(1, bodyHeight, 1)
      const attr = pathGeom.attributes['position'] as THREE.BufferAttribute
      attr.setXYZ(0, dash.from.x, dash.from.y + 0.1, dash.from.z)
      attr.setXYZ(1, dash.to.x, dash.to.y + 0.1, dash.to.z)
      attr.needsUpdate = true
      ringMat.color.setHex(color)
      ghostMat.color.setHex(color)
      pathMat.color.setHex(color)
      // Stopped short by geometry: hold the ring solid instead of pulsing, so
      // "this is as far as you get" reads as a fact and not as an animation.
      ringMat.opacity = dash.blocked ? 0.95 : 0.6 + pulse * 0.3
      ghostMat.opacity = dash.blocked ? 0.22 : 0.12 + pulse * 0.08
    },
  }
}
