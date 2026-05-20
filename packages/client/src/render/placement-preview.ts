import { ABILITY_DEFS } from '@ragequit/shared'
import * as THREE from 'three'

export interface PlacementPreviewOptions {
  camera: THREE.Camera
  getMouseYaw: () => number
  getSelfPos: () => { x: number; y: number; z: number } | null
  getPlacementAbilityId: () => string | null
  getMapGroundY: (mapId: string) => number
  getActiveMapId: () => string
  getSchemaMapId: () => string
}

export interface PlacementPreviewController {
  group: THREE.Group
  update: (now: number) => void
  aimPoint: (abilityId: string) => { x: number; y: number; z: number } | undefined
}

function placementFootprint(abilityId: string): {
  radius: number
  width: number
  depth: number
  wall: boolean
} {
  const def = ABILITY_DEFS[abilityId]
  let radius = 0.85,
    width = 0,
    depth = 0,
    wall = false
  if (!def) return { radius, width, depth, wall }

  for (const e of def.effects) {
    if (e.kind === 'zone') {
      if (e.width && e.width > 0) {
        wall = true
        width = Math.max(width, e.width)
        depth = Math.max(depth, Math.max(0.55, e.radius || 0.8))
      } else {
        radius = Math.max(radius, e.radius)
      }
    } else if (e.kind === 'damage') {
      radius = Math.max(radius, e.radius ?? 0)
    } else if (e.kind === 'projectile') {
      radius = Math.max(radius, e.splashRadius ?? 0)
    } else if (e.kind === 'knockup') {
      radius = Math.max(radius, e.radius ?? 0)
    } else if (e.kind === 'applyStatus') {
      radius = Math.max(radius, e.radius ?? 0)
    }
  }
  return { radius: Math.max(0.65, radius), width, depth, wall }
}

export function initPlacementPreview({
  camera,
  getMouseYaw,
  getSelfPos,
  getPlacementAbilityId,
  getMapGroundY,
  getActiveMapId,
  getSchemaMapId,
}: PlacementPreviewOptions): PlacementPreviewController {
  const group = new THREE.Group()
  group.visible = false

  const discMat = new THREE.MeshBasicMaterial({
    color: 0xffd260,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd260,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), discMat)
  disc.rotation.x = -Math.PI / 2
  group.add(disc)

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), ringMat)
  ring.rotation.x = -Math.PI / 2
  group.add(ring)

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0xff8a30,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  wall.rotation.x = -Math.PI / 2
  group.add(wall)

  const lineGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ])
  group.add(
    new THREE.Line(
      lineGeom,
      new THREE.LineBasicMaterial({ color: 0xffd260, transparent: true, opacity: 0.78 }),
    ),
  )

  function groundY(): number {
    return getMapGroundY(getActiveMapId() || getSchemaMapId())
  }

  function aimPoint(abilityId: string): { x: number; y: number; z: number } | undefined {
    const def = ABILITY_DEFS[abilityId]
    if (!def || def.targeting !== 'point') return undefined
    const selfPos = getSelfPos()
    if (!selfPos) return undefined

    const gY = groundY()
    const mouseYaw = getMouseYaw()
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize()
    const point = new THREE.Vector3()

    if (Math.abs(dir.y) > 1e-5) {
      const t = (gY - camera.position.y) / dir.y
      if (t > 0) point.copy(camera.position).addScaledVector(dir, t)
    }

    if (point.lengthSq() === 0) {
      point.set(
        selfPos.x - Math.sin(mouseYaw) * def.range,
        gY,
        selfPos.z - Math.cos(mouseYaw) * def.range,
      )
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

  function previewPoint(abilityId: string): { x: number; y: number; z: number } | undefined {
    const point = aimPoint(abilityId)
    if (point) return point
    const def = ABILITY_DEFS[abilityId]
    const selfPos = getSelfPos()
    if (!def || !selfPos) return undefined
    const mouseYaw = getMouseYaw()
    const dist = Math.max(1.5, Math.min(def.range || 6, 10))
    return {
      x: selfPos.x - Math.sin(mouseYaw) * dist,
      y: groundY(),
      z: selfPos.z - Math.cos(mouseYaw) * dist,
    }
  }

  function update(now: number): void {
    const placementAbilityId = getPlacementAbilityId()
    const selfPos = getSelfPos()
    if (!placementAbilityId || !selfPos) {
      group.visible = false
      return
    }
    const def = ABILITY_DEFS[placementAbilityId]
    const point = previewPoint(placementAbilityId)
    if (!def || !point) {
      group.visible = false
      return
    }
    const footprint = placementFootprint(placementAbilityId)
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.008)
    group.visible = true
    group.position.set(point.x, point.y + 0.035, point.z)
    group.rotation.y = getMouseYaw()
    disc.visible = !footprint.wall
    ring.visible = !footprint.wall
    wall.visible = footprint.wall
    if (footprint.wall) {
      wall.scale.set(footprint.width, footprint.depth, 1)
      ;(wall.material as THREE.MeshBasicMaterial).opacity = 0.32 + pulse * 0.14
    } else {
      disc.scale.setScalar(footprint.radius)
      ring.scale.setScalar(footprint.radius)
      discMat.opacity = 0.18 + pulse * 0.1
      ringMat.opacity = 0.72 + pulse * 0.22
    }
    const attr = lineGeom.attributes['position'] as THREE.BufferAttribute
    attr.setXYZ(0, selfPos.x, point.y + 0.08, selfPos.z)
    attr.setXYZ(1, point.x, point.y + 0.08, point.z)
    attr.needsUpdate = true
  }

  return { group, update, aimPoint }
}
