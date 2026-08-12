import {
  type ServerProjectileSpawnedMessage,
  type ServerProjectileExpiredMessage,
} from '@ragequit/shared'
import * as THREE from 'three'

import type { ImpactProfile } from '../vfx/impact-pool.js'

import { makeProjectileMesh } from './factories.js'
import type { EmberHandle, SpellParticles, SpellStyle } from './spell-particles.js'
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
export type ProjectileProfile =
  | 'arrow'
  | 'piercingArrow'
  | 'pinArrow'
  | 'marksmanArrow'
  | 'broadheadArrow'
  | 'blastArrow'
  | 'orb'
  | 'shard'
  | 'lance'
  | 'drain'
  | 'thorn'

interface ProjectileVisual {
  object: THREE.Object3D
  trail: THREE.Line
  trailBuf: Float32Array // 3 * TRAIL_LEN floats, oldest → newest
  trailCount: number // how many valid positions have been written
  lastPos: THREE.Vector3
  lastAt: number
  kind: ProjectileKind
  style: ProjectileStyle
  profile: ProjectileProfile
  light: THREE.PointLight | null
  embers: EmberHandle | null
}

// STILE §7 layer 5 — per-spell-bolt point light so the magic lights the stone.
// CRITICAL: the pool is FIXED and added to the scene ONCE — adding/removing
// lights at runtime changes the scene light count and forces three.js to
// recompile EVERY shader program (a multi-second hitch right as a fight
// starts). Idle pool lights stay in the scene at intensity 0.
const MAX_PROJECTILE_LIGHTS = 6

class _LightPool {
  private pool: THREE.PointLight[] = []
  private free: THREE.PointLight[] = []

  init(scene: THREE.Scene): void {
    if (this.pool.length > 0) return
    for (let i = 0; i < MAX_PROJECTILE_LIGHTS; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 7, 2)
      l.castShadow = false
      l.visible = true // keep in the lighting pass — intensity 0 when unused
      scene.add(l)
      this.pool.push(l)
      this.free.push(l)
    }
  }

  acquire(color: number): THREE.PointLight | null {
    const l = this.free.pop()
    if (!l) return null
    l.color.setHex(color)
    l.intensity = 7
    return l
  }

  release(l: THREE.PointLight | null): void {
    if (!l) return
    l.intensity = 0
    this.free.push(l)
  }
}

const _lightPool = new _LightPool()

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

export function projectileProfile(
  kind: ProjectileKind,
  element?: string,
  abilityId?: string,
): ProjectileProfile {
  if (kind === 'arrow') {
    if (abilityId === 'piercing_shot') return 'piercingArrow'
    if (abilityId === 'pin_shot') return 'pinArrow'
    if (abilityId === 'marksman_shot') return 'marksmanArrow'
    if (abilityId === 'broadhead') return 'broadheadArrow'
    if (abilityId === 'blast_arrow') return 'blastArrow'
    return 'arrow'
  }
  if (abilityId === 'fireball' || abilityId === 'meteor') return 'orb'
  if (abilityId === 'frost_bolt' || abilityId === 'freeze_target') return 'shard'
  if (abilityId === 'chain_bolt' || abilityId === 'arc_lift') return 'lance'
  if (abilityId === 'shadow_bolt' || abilityId === 'life_drain') return 'drain'
  if (abilityId === 'poison_dart' || abilityId === 'entangle') return 'thorn'
  if (element === 'ice') return 'shard'
  if (element === 'lightning') return 'lance'
  if (element === 'dark') return 'drain'
  if (element === 'nature') return 'thorn'
  return 'orb'
}

/**
 * Scale a projectile by how much it hurts.
 *
 * `damage` is on the wire and was thrown away, so an 8-damage poke and a
 * 38-damage finisher rendered at exactly the same size and brightness — the
 * "scale of importance" rule (a basic attack must never visually rival an
 * ultimate) was not applied at all.
 */
export function damageTier(damage: number): number {
  if (damage >= 30) return 1.45
  if (damage >= 18) return 1.15
  return 0.85
}

function makeProjectileObject(
  kind: ProjectileKind,
  element?: string,
  abilityId?: string,
  damage = 14,
): {
  object: THREE.Object3D
  style: ProjectileStyle
  profile: ProjectileProfile
} {
  const style = projectileStyle(kind, element)
  const profile = projectileProfile(kind, element, abilityId)
  const elemColor = projectileColor(style)
  const tier = damageTier(damage)
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
    if (profile === 'marksmanArrow' || profile === 'blastArrow') baseMesh.scale.multiplyScalar(1.35)
    baseMesh.scale.multiplyScalar(tier)
    group.add(baseMesh)

    const accentColor =
      profile === 'pinArrow'
        ? 0x61d7ff
        : profile === 'broadheadArrow'
          ? 0xff3344
          : profile === 'blastArrow'
            ? 0xff5a18
            : profile === 'marksmanArrow'
              ? 0xfff2a8
              : 0xffc65c
    const accentMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    let signature: THREE.Mesh | null = null
    if (profile === 'piercingArrow') {
      signature = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.85, 6), accentMat)
      signature.rotation.x = Math.PI / 2
    } else if (profile === 'pinArrow') {
      signature = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 14), accentMat)
    } else if (profile === 'marksmanArrow') {
      signature = new THREE.Mesh(new THREE.ConeGeometry(0.095, 1.15, 8), accentMat)
      signature.rotation.x = Math.PI / 2
    } else if (profile === 'broadheadArrow') {
      signature = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), accentMat)
      signature.scale.set(1.8, 0.65, 0.65)
    } else if (profile === 'blastArrow') {
      signature = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), accentMat)
    }
    if (signature) {
      signature.position.z = -0.32
      if (profile === 'blastArrow' || profile === 'marksmanArrow') signature.layers.enable(1)
      group.add(signature)
    }
  } else {
    // The texture supplies energy, while the solid silhouette communicates the
    // mechanic: orb, ice shard, lightning lance, drain halo or thorn.
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

    if (profile === 'shard' || profile === 'lance' || profile === 'thorn') {
      scaleX *= 0.68
      scaleY *= profile === 'lance' ? 1.5 : 1.15
    }
    const geo = new THREE.PlaneGeometry(scaleX * tier, scaleY * tier)

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

    const signatureMat = new THREE.MeshBasicMaterial({
      color: elemColor,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    let signature: THREE.Mesh
    if (profile === 'shard') {
      signature = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), signatureMat)
      signature.scale.set(0.7, 0.7, 1.9)
    } else if (profile === 'lance') {
      signature = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.9, 6), signatureMat)
      signature.rotation.x = Math.PI / 2
    } else if (profile === 'thorn') {
      signature = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.72, 5), signatureMat)
      signature.rotation.x = -Math.PI / 2
    } else if (profile === 'drain') {
      signature = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 6, 16), signatureMat)
    } else {
      signature = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), signatureMat)
    }
    signature.layers.enable(1)
    group.add(signature)
  }

  return { object: group, style, profile }
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

function projectileTrailColor(style: ProjectileStyle, profile: ProjectileProfile): number {
  if (profile === 'pinArrow') return 0x61d7ff
  if (profile === 'broadheadArrow') return 0xff3344
  if (profile === 'blastArrow') return 0xff5a18
  if (profile === 'marksmanArrow') return 0xfff2a8
  return projectileColor(style)
}

function makeTrailLine(style: ProjectileStyle, profile: ProjectileProfile = 'arrow'): THREE.Line {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3))
  const color = projectileTrailColor(style, profile)

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
  spellParticles: SpellParticles
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
  spellParticles,
}: ProjectileVisualsOptions): ProjectileVisualsController {
  const projectileVisuals = new Map<string, ProjectileVisual>()
  _lightPool.init(scene)

  // Shader warm-up: one hidden-below-ground projectile per style + one impact,
  // permanently in the scene. Their materials therefore compile during match
  // load instead of on the FIRST cast mid-fight (which froze the game for the
  // full program-link time, seconds on weak GPUs).
  {
    const warm = new THREE.Group()
    warm.position.set(0, -120, 0)
    const styles: ('arrow' | 'fire' | 'ice' | 'lightning' | 'dark' | 'nature')[] = [
      'arrow',
      'fire',
      'ice',
      'lightning',
      'dark',
      'nature',
    ]
    for (let i = 0; i < styles.length; i++) {
      const kind: ProjectileKind = styles[i] === 'arrow' ? 'arrow' : 'bolt'
      const { object } = makeProjectileObject(kind, styles[i])
      object.position.set(i * 2, 0, 0)
      warm.add(object)
      const trail = makeTrailLine(styles[i] as ProjectileStyle)
      trail.position.set(i * 2, 0, 0)
      warm.add(trail)
    }
    scene.add(warm)
    spawnImpact(new THREE.Vector3(0, -120, 5), 0xff6a2a, 'magic')
  }

  function onSpawned(msg: ServerProjectileSpawnedMessage): void {
    if (projectileVisuals.has(msg.id)) return
    const kind: ProjectileKind = msg.kind === 'bolt' ? 'bolt' : 'arrow'
    const { object, style, profile } = makeProjectileObject(
      kind,
      msg.element,
      msg.abilityId,
      msg.damage,
    )
    object.position.set(msg.origin.x, msg.origin.y, msg.origin.z)
    const light = style !== 'arrow' ? _lightPool.acquire(projectileColor(style)) : null
    if (light) {
      light.position.copy(object.position)
      light.intensity = 7 * damageTier(msg.damage)
    }
    const trail = makeTrailLine(style, profile)
    scene.add(object)
    scene.add(trail)
    // Cast juice: a short element-tinted puff right where the bolt is born.
    if (style !== 'arrow') {
      spellParticles.muzzleFlash(object.position.clone(), style as SpellStyle)
    }
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
      profile,
      light,
      embers: style !== 'arrow' ? spellParticles.attachEmbers(style as SpellStyle, object) : null,
    })
  }

  function disposeVisual(vis: ProjectileVisual): void {
    _lightPool.release(vis.light)
    vis.light = null
    vis.embers?.release()
    vis.embers = null
    scene.remove(vis.object)
    scene.remove(vis.trail)
    disposeObject(vis.object)
    vis.trail.geometry.dispose()
    ;(vis.trail.material as THREE.Material).dispose()
  }

  function onExpired(msg: ServerProjectileExpiredMessage): void {
    const vis = projectileVisuals.get(msg.id)
    const profile = vis?.profile
    const impactProfile: ImpactProfile =
      vis?.kind === 'arrow' && profile !== 'blastArrow' ? 'pierce' : 'magic'
    const style = vis?.style
    if (vis) {
      disposeVisual(vis)
      projectileVisuals.delete(msg.id)
    }
    const pos = new THREE.Vector3(msg.pos.x, msg.pos.y, msg.pos.z)
    const elemColor = msg.element ? zoneColorForElement(msg.element) : null
    const arrowColor = profile ? projectileTrailColor('arrow', profile) : null
    const color =
      elemColor ??
      arrowColor ??
      (msg.reason === 'victim' ? 0xff6060 : msg.reason === 'terrain' ? 0xaabbcc : 0x80d0ff)
    spawnImpact(pos, color, impactProfile)
    // Element spark burst on top of the pooled 3-layer impact (bolts only).
    if (style && style !== 'arrow') spellParticles.burstImpact(pos, style as SpellStyle)
    if (profile === 'blastArrow') spellParticles.burstImpact(pos, 'fire')
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
        const { object, style, profile } = makeProjectileObject(kind, p.element)
        object.position.set(p.x, p.y, p.z)
        const light = style !== 'arrow' ? _lightPool.acquire(projectileColor(style)) : null
        if (light) light.position.copy(object.position)
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
          profile,
          light,
          embers:
            style !== 'arrow' ? spellParticles.attachEmbers(style as SpellStyle, object) : null,
        }
        projectileVisuals.set(id, vis)
      }
      vis.object.position.set(p.x, p.y, p.z)
      if (vis.light) vis.light.position.set(p.x, p.y, p.z)
      const sp = Math.hypot(p.vx, p.vy, p.vz)
      if (sp > 0.01) {
        vis.object.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz)
      }
      if (vis.kind === 'bolt') {
        const pulse = 1.0 + 0.08 * Math.sin(now * 0.022)
        vis.object.scale.setScalar(pulse)

        const child1 = vis.object.children[1] as THREE.Mesh | undefined

        // Each mechanic has a stable motion language in addition to its color.
        if (vis.profile === 'orb') {
          vis.object.rotation.z += 0.09 * dt60
          if (child1) {
            const f = now * 0.035
            child1.scale.setScalar(1.0 + 0.08 * Math.sin(f))
          }
        } else if (vis.profile === 'shard') {
          vis.object.rotation.z += 0.04 * dt60
          if (child1) {
            child1.scale.setScalar(1.0 + 0.05 * Math.sin(now * 0.02))
          }
        } else if (vis.profile === 'lance') {
          vis.object.rotation.z += 0.22 * dt60
          if (child1) {
            const jit = 0.9 + 0.16 * Math.sin(now * 0.08)
            child1.scale.set(jit, 1.0, jit)
          }
        } else if (vis.profile === 'drain') {
          vis.object.rotation.z -= 0.05 * dt60
          if (child1) {
            const ds = 0.95 + 0.12 * Math.sin(now * 0.025)
            child1.scale.setScalar(ds)
          }
        } else if (vis.profile === 'thorn') {
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
