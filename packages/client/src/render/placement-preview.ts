// ---------------------------------------------------------------------------
// The aim preview: every ability shows what it is about to do.
//
// This used to be a placement reticle for the 7 `point` abilities and nothing
// at all for the other 46 — `aimPoint` returned undefined unless targeting was
// 'point', and the input layer routed everything else straight to a blind cast.
// So 87 % of the roster was fired on faith.
//
// It now draws whatever the shared solver says the ability occupies: a lane for
// forward casts, a disc for areas, a slab for walls, a ghost body for dashes.
// The geometry comes from @ragequit/shared so the preview and the hitbox are
// the same numbers, and the drawing lives in ./aim-shapes.ts.
// ---------------------------------------------------------------------------
import {
  ABILITY_DEFS,
  CAPSULE_HEIGHT_M,
  EYE_Y_OFFSET_M,
  getMap,
  resolveAimPlan,
  type AimShape,
} from '@ragequit/shared'
import * as THREE from 'three'

import { createDashView, createDiscView, createLaneView, createWallView } from './aim-shapes.js'

export interface PlacementPreviewOptions {
  camera: THREE.Camera
  getMouseYaw: () => number
  getMousePitch: () => number
  getSelfPos: () => { x: number; y: number; z: number } | null
  getSelfVelocity: () => { x: number; z: number } | null
  getPlacementAbilityId: () => string | null
  getMapGroundY: (mapId: string) => number
  getActiveMapId: () => string
  getSchemaMapId: () => string
}

export interface PlacementPreviewController {
  group: THREE.Group
  update: (now: number) => void
  aimPoint: (abilityId: string) => { x: number; y: number; z: number } | undefined
  /** The shapes drawn on the last update — the seam tests read through. */
  currentShapes: () => readonly AimShape[]
}

function elementColor(element: string): number {
  if (element === 'fire') return 0xff5511
  if (element === 'ice') return 0x00d0ff
  if (element === 'lightning') return 0xffe600
  if (element === 'dark') return 0x9922ff
  if (element === 'nature') return 0x39ff14
  return 0xffd260
}

export function initPlacementPreview({
  camera,
  getMouseYaw,
  getMousePitch,
  getSelfPos,
  getSelfVelocity,
  getPlacementAbilityId,
  getMapGroundY,
  getActiveMapId,
  getSchemaMapId,
}: PlacementPreviewOptions): PlacementPreviewController {
  const group = new THREE.Group()
  group.visible = false

  const disc = createDiscView()
  const wall = createWallView()
  const lane = createLaneView()
  const dash = createDashView()
  group.add(disc.group, wall.group, lane.group, dash.group)

  let shapes: readonly AimShape[] = []

  function mapId(): string {
    return getActiveMapId() || getSchemaMapId() || 'blockout'
  }

  function groundY(): number {
    return getMapGroundY(mapId())
  }

  /**
   * Where the camera ray meets the ground, clamped to the ability's range.
   *
   * `point` abilities send this to the server as the cast target, so it stays
   * a ray cast against the real camera rather than yaw trigonometry: the two
   * disagree the moment the player is pitched, and the server clamps whatever
   * it is given without arguing.
   */
  function aimPoint(abilityId: string): { x: number; y: number; z: number } | undefined {
    const def = ABILITY_DEFS[abilityId]
    if (!def || def.targeting !== 'point') return undefined
    const selfPos = getSelfPos()
    if (!selfPos) return undefined

    const gY = groundY()
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize()
    const point = new THREE.Vector3()

    if (Math.abs(dir.y) > 1e-5) {
      const t = (gY - camera.position.y) / dir.y
      if (t > 0) point.copy(camera.position).addScaledVector(dir, t)
    }

    if (point.lengthSq() === 0) {
      const yaw = getMouseYaw()
      point.set(selfPos.x - Math.sin(yaw) * def.range, gY, selfPos.z - Math.cos(yaw) * def.range)
    }

    const dx = point.x - selfPos.x
    const dz = point.z - selfPos.z
    const dist = Math.hypot(dx, dz)
    if (dist > def.range && dist > 1e-5) {
      const scale = def.range / dist
      point.x = selfPos.x + dx * scale
      point.z = selfPos.z + dz * scale
    }
    point.y = gY
    return { x: point.x, y: point.y, z: point.z }
  }

  function update(now: number): void {
    const abilityId = getPlacementAbilityId()
    const selfPos = getSelfPos()
    const def = abilityId ? ABILITY_DEFS[abilityId] : undefined
    if (!def || !selfPos) {
      shapes = []
      group.visible = false
      return
    }

    const gY = groundY()
    // sim.pos is the capsule CENTRE (controller floors it at groundY +
    // CAPSULE_HALF_HEIGHT_M), so the feet are half a body below it. Getting
    // this wrong puts every ground disc 0.9 m in the air.
    const feet = { x: selfPos.x, y: selfPos.y - CAPSULE_HEIGHT_M / 2, z: selfPos.z }
    shapes = resolveAimPlan(def, {
      feet,
      // Solve from the eye so the lane is drawn on the crosshair the player is
      // actually using. The server anchors forward casts at capsule centre +
      // half height and applies the same offset to victims, so the comparison
      // is self-consistent there; this offset only decides where the tube is
      // painted, never who it can hit.
      eyeOffset: CAPSULE_HEIGHT_M / 2 + EYE_Y_OFFSET_M,
      yaw: getMouseYaw(),
      pitch: getMousePitch(),
      groundY: gY,
      boxes: getMap(mapId()).boxes,
      point: aimPoint(abilityId ?? '') ?? null,
      velocity: getSelfVelocity(),
    })

    const color = elementColor(def.element)
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.008)
    disc.group.visible = false
    wall.group.visible = false
    lane.group.visible = false
    dash.group.visible = false

    for (const shape of shapes) {
      if (shape.kind === 'disc') {
        disc.apply(shape, color, pulse)
        disc.group.visible = true
      } else if (shape.kind === 'wall') {
        wall.apply(shape, color, pulse)
        wall.group.visible = true
      } else if (shape.kind === 'lane') {
        // apply() owns this one's visibility: a degenerate zero-length lane
        // must stay hidden rather than render as a dot at the muzzle.
        lane.apply(shape, color, pulse)
      } else {
        dash.apply(shape, color, pulse, CAPSULE_HEIGHT_M)
        dash.group.visible = true
      }
    }
    group.visible = true
  }

  return { group, update, aimPoint, currentShapes: () => shapes }
}
