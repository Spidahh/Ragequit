import {
  type ServerProjectileSpawnedMessage,
  type ServerProjectileExpiredMessage,
} from '@ragequit/shared'
import * as THREE from 'three'

import type { ImpactProfile } from '../vfx/impact-pool.js'

import { makeProjectileMesh } from './factories.js'
import { VfxTextures } from './vfx-textures.js'

export interface SchemaProjectile {
  id: string
  ownerId: string
  kind: string
  element?: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  expired: boolean
}

const TRAIL_LEN = 10

type ProjectileKind = 'arrow' | 'bolt'
type ProjectileStyle = 'arrow' | 'fire' | 'ice' | 'lightning' | 'dark' | 'nature' | 'neutral'

interface ProjectileVisual {
  object: THREE.Object3D
  trail: THREE.Line
  trailBuf: Float32Array // 3 * TRAIL_LEN floats, oldest → newest
  trailCount: number // how many valid positions have been written
  lastPos: THREE.Vector3
  lastAt: number
  kind: ProjectileKind
  style: ProjectileStyle
  hasLight: boolean
}

// STILE §7 layer 5 — dynamic point-light per spell bolt so the magic actually
// lights the stone. Pooled: at most this many concurrent lights (perf budget);
// extra simultaneous bolts simply skip the light.
const MAX_PROJECTILE_LIGHTS = 6
let _activeProjectileLights = 0

function _attachProjectileLight(group: THREE.Object3D, color: number): boolean {
  if (_activeProjectileLights >= MAX_PROJECTILE_LIGHTS) return false
  const light = new THREE.PointLight(color, 7, 7, 2)
  light.castShadow = false
  group.add(light)
  _activeProjectileLights++
  return true
}

function projectileStyle(kind: ProjectileKind, element?: string): ProjectileStyle {
  if (kind === 'arrow') return 'arrow'
  switch (element) {
    case 'fire':
    case 'ice':
    case 'lightning':
    case 'dark':
    case 'nature':
      return element
    default:
      return 'neutral'
  }
}

function projectileColor(style: ProjectileStyle): number {
  switch (style) {
    case 'arrow':
      return 0xffa040
    case 'fire':
      return 0xff5511 // more vibrant fire
    case 'ice':
      return 0x00e5ff
    case 'lightning':
      return 0xffe600
    case 'dark':
      return 0x9922ff // brighter violet
    case 'nature':
      return 0x39ff14
    default:
      return 0x00d0ff
  }
}

function makeProjectileObject(
  kind: ProjectileKind,
  element?: string,
): {
  object: THREE.Object3D
  style: ProjectileStyle
} {
  const style = projectileStyle(kind, element)
  const elemColor = projectileColor(style)
  const group = new THREE.Group()

  if (style === 'arrow') {
    const baseMesh = makeProjectileMesh('arrow' as const)
    baseMesh.userData['pulse'] = false

    // Draw outline directly around the physical arrow body (thickness: 0.02)
    const projOutline = new THREE.Mesh(
      baseMesh.geometry.clone(),
      new THREE.ShaderMaterial({
        uniforms: {
          thickness: { value: 0.02 },
          outlineColor: { value: new THREE.Color(0x050508) },
        },
        vertexShader: `
          uniform float thickness;
          void main() {
            vec3 pos = position + normal * thickness;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 outlineColor;
          void main() {
            gl_FragColor = vec4(outlineColor, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: true,
      }),
    )
    projOutline.scale.copy(baseMesh.scale)
    projOutline.rotation.copy(baseMesh.rotation)
    baseMesh.add(projOutline)
    group.add(baseMesh)
  } else {
    // Spells are rendered as volumetric Crossed Planes (Overwatch style) using additive blending
    let texture: THREE.Texture
    let scaleX = 0.38
    let scaleY = 0.38

    switch (style) {
      case 'fire':
        texture = VfxTextures.fire
        scaleX = 0.46
        scaleY = 0.46
        break
      case 'ice':
        texture = VfxTextures.ice
        scaleX = 0.42
        scaleY = 0.42
        break
      case 'lightning':
        texture = VfxTextures.lightning
        scaleX = 0.45
        scaleY = 0.45
        break
      case 'dark':
        texture = VfxTextures.dark
        scaleX = 0.48
        scaleY = 0.48
        break
      case 'nature':
        texture = VfxTextures.nature
        scaleX = 0.4
        scaleY = 0.4
        break
      default:
        texture = VfxTextures.fire
    }

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      alphaMap: texture,
      color: elemColor,
      transparent: true,
      opacity: 0.98,
      alphaTest: 0.03,
      premultipliedAlpha: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    const geo = new THREE.PlaneGeometry(scaleX, scaleY)

    // Plane 1 (Horizontal slice along movement)
    const p1 = new THREE.Mesh(geo, mat)
    p1.rotation.y = 0
    group.add(p1)

    // Plane 2 (Vertical slice along movement)
    const p2 = new THREE.Mesh(geo, mat)
    p2.rotation.y = Math.PI / 2
    group.add(p2)

    // Spell bolts join the bloom layer so the selective UnrealBloom pass wraps
    // them in an energy halo — the single biggest "this is magic" juice for the
    // cost of a layer flag. (Physical arrows stay off the bloom layer.)
    p1.layers.enable(1)
    p2.layers.enable(1)
  }

  return { object: group, style }
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.dispose()
    const material = child.material
    if (Array.isArray(material)) {
      material.forEach((mat) => mat.dispose())
    } else {
      material.dispose()
    }
  })
}

function makeTrailLine(style: ProjectileStyle): THREE.Line {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3))
  const color = projectileColor(style)

  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: style === 'lightning' ? 0.85 : style === 'dark' ? 0.65 : 0.58,
    blending: THREE.AdditiveBlending, // additive glow trails
    depthWrite: false,
  })
  const line = new THREE.Line(geo, mat)
  line.frustumCulled = false
  // Spell trails bloom too (arrow trails stay crisp/unbloomed).
  if (style !== 'arrow') line.layers.enable(1)
  return line
}

export interface ProjectileVisualsOptions {
  scene: THREE.Scene
  spawnImpact: (pos: THREE.Vector3, color: number, profile?: ImpactProfile) => void
  zoneColorForElement: (element: string) => number
}

export interface ProjectileVisualsController {
  onSpawned: (msg: ServerProjectileSpawnedMessage) => void
  onExpired: (msg: ServerProjectileExpiredMessage) => void
  clear: () => void
  renderFrame: (
    proj: Map<string, SchemaProjectile>,
    now: number,
    dbgProj: HTMLElement | null,
  ) => void
}

export function initProjectileVisuals({
  scene,
  spawnImpact,
  zoneColorForElement,
}: ProjectileVisualsOptions): ProjectileVisualsController {
  const projectileVisuals = new Map<string, ProjectileVisual>()

  function onSpawned(msg: ServerProjectileSpawnedMessage): void {
    if (projectileVisuals.has(msg.id)) return
    const kind: ProjectileKind = msg.kind === 'bolt' ? 'bolt' : 'arrow'
    const { object, style } = makeProjectileObject(kind, msg.element)
    object.position.set(msg.origin.x, msg.origin.y, msg.origin.z)
    const hasLight = style !== 'arrow' && _attachProjectileLight(object, projectileColor(style))
    const trail = makeTrailLine(style)
    scene.add(object)
    scene.add(trail)
    const buf = new Float32Array(TRAIL_LEN * 3)
    for (let i = 0; i < TRAIL_LEN; i++) {
      buf[i * 3] = msg.origin.x
      buf[i * 3 + 1] = msg.origin.y
      buf[i * 3 + 2] = msg.origin.z
    }
    projectileVisuals.set(msg.id, {
      object,
      trail,
      trailBuf: buf,
      trailCount: 0,
      lastPos: new THREE.Vector3(msg.origin.x, msg.origin.y, msg.origin.z),
      lastAt: performance.now(),
      kind,
      style,
      hasLight,
    })
  }

  function disposeVisual(vis: ProjectileVisual): void {
    if (vis.hasLight) _activeProjectileLights = Math.max(0, _activeProjectileLights - 1)
    scene.remove(vis.object)
    scene.remove(vis.trail)
    disposeObject(vis.object)
    vis.trail.geometry.dispose()
    ;(vis.trail.material as THREE.Material).dispose()
  }

  function onExpired(msg: ServerProjectileExpiredMessage): void {
    const vis = projectileVisuals.get(msg.id)
    const impactProfile: ImpactProfile = vis?.kind === 'arrow' ? 'pierce' : 'magic'
    if (vis) {
      disposeVisual(vis)
      projectileVisuals.delete(msg.id)
    }
    const elemColor = msg.element ? zoneColorForElement(msg.element) : null
    const color =
      elemColor ??
      (msg.reason === 'victim' ? 0xff6060 : msg.reason === 'terrain' ? 0xaabbcc : 0x80d0ff)
    spawnImpact(new THREE.Vector3(msg.pos.x, msg.pos.y, msg.pos.z), color, impactProfile)
  }

  // Shift existing points toward index 0 (oldest), write new at end.
  function updateTrail(vis: ProjectileVisual, x: number, y: number, z: number): void {
    for (let i = 0; i < (TRAIL_LEN - 1) * 3; i++) vis.trailBuf[i] = vis.trailBuf[i + 3]!
    vis.trailBuf[(TRAIL_LEN - 1) * 3] = x
    vis.trailBuf[(TRAIL_LEN - 1) * 3 + 1] = y
    vis.trailBuf[(TRAIL_LEN - 1) * 3 + 2] = z
    vis.trailCount = Math.min(vis.trailCount + 1, TRAIL_LEN)
    const attr = vis.trail.geometry.attributes['position'] as THREE.BufferAttribute
    const start = TRAIL_LEN - vis.trailCount
    for (let i = 0; i < vis.trailCount; i++) {
      const s = (start + i) * 3
      attr.setXYZ(i, vis.trailBuf[s]!, vis.trailBuf[s + 1]!, vis.trailBuf[s + 2]!)
    }
    attr.needsUpdate = true
    vis.trail.geometry.setDrawRange(0, Math.max(2, vis.trailCount))
  }

  function clear(): void {
    projectileVisuals.forEach((vis) => disposeVisual(vis))
    projectileVisuals.clear()
  }

  let _lastFrameMs = 0
  function renderFrame(
    proj: Map<string, SchemaProjectile>,
    now: number,
    dbgProj: HTMLElement | null,
  ): void {
    // Frame-time multiplier (1.0 at 60 fps) so spin speeds are refresh-rate
    // independent — incremental rotations would otherwise run 2.4× faster at 144 Hz.
    const dt60 = _lastFrameMs > 0 ? Math.min(3, (now - _lastFrameMs) / 16.667) : 1
    _lastFrameMs = now
    proj.forEach((p, id) => {
      let vis = projectileVisuals.get(id)
      if (!vis) {
        const kind: ProjectileKind = p.kind === 'bolt' ? 'bolt' : 'arrow'
        const { object, style } = makeProjectileObject(kind, p.element)
        object.position.set(p.x, p.y, p.z)
        const hasLight = style !== 'arrow' && _attachProjectileLight(object, projectileColor(style))
        const trail = makeTrailLine(style)
        scene.add(object)
        scene.add(trail)
        const buf = new Float32Array(TRAIL_LEN * 3)
        for (let i = 0; i < TRAIL_LEN; i++) {
          buf[i * 3] = p.x
          buf[i * 3 + 1] = p.y
          buf[i * 3 + 2] = p.z
        }
        vis = {
          object,
          trail,
          trailBuf: buf,
          trailCount: 0,
          lastPos: new THREE.Vector3(p.x, p.y, p.z),
          lastAt: now,
          kind,
          style,
          hasLight,
        }
        projectileVisuals.set(id, vis)
      }
      vis.object.position.set(p.x, p.y, p.z)
      const sp = Math.hypot(p.vx, p.vy, p.vz)
      if (sp > 0.01) {
        vis.object.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz)
      }
      if (vis.kind === 'bolt') {
        const pulse = 1.0 + 0.08 * Math.sin(now * 0.022)
        vis.object.scale.setScalar(pulse)

        const child1 = vis.object.children[1] as THREE.Mesh | undefined

        // Organic swirling rotation and scale modulation on crossed planes
        if (vis.style === 'fire') {
          vis.object.rotation.z += 0.09 * dt60
          if (child1) {
            const f = now * 0.035
            child1.scale.setScalar(1.0 + 0.08 * Math.sin(f))
          }
        } else if (vis.style === 'ice') {
          vis.object.rotation.z += 0.04 * dt60
          if (child1) {
            child1.scale.setScalar(1.0 + 0.05 * Math.sin(now * 0.02))
          }
        } else if (vis.style === 'lightning') {
          vis.object.rotation.z += 0.22 * dt60
          if (child1) {
            const jit = 0.85 + 0.3 * Math.random()
            child1.scale.set(jit, 1.0, jit)
          }
        } else if (vis.style === 'dark') {
          vis.object.rotation.z -= 0.05 * dt60
          if (child1) {
            const ds = 0.95 + 0.12 * Math.sin(now * 0.025)
            child1.scale.setScalar(ds)
          }
        } else if (vis.style === 'nature') {
          vis.object.rotation.z += 0.035 * dt60
          if (child1) {
            child1.scale.setScalar(1.0 + 0.06 * Math.sin(now * 0.018))
          }
        } else {
          vis.object.rotation.z += 0.045 * dt60
          if (child1) {
            child1.scale.setScalar(1.0 + 0.06 * Math.sin(now * 0.015))
          }
        }
      }
      updateTrail(vis, p.x, p.y, p.z)
      vis.lastPos.set(p.x, p.y, p.z)
      vis.lastAt = now
    })
    projectileVisuals.forEach((vis, id) => {
      if (!proj.has(id)) {
        // Projectile left the schema without a matching onExpired event — spawn
        // a fallback impact at its last known position so VFX/audio aren't silent.
        const impactProfile: ImpactProfile = vis.kind === 'arrow' ? 'pierce' : 'magic'
        spawnImpact(vis.lastPos.clone(), 0x80d0ff, impactProfile)
        disposeVisual(vis)
        projectileVisuals.delete(id)
      }
    })
    if (dbgProj) dbgProj.textContent = String(projectileVisuals.size)
  }

  return { onSpawned, onExpired, clear, renderFrame }
}
