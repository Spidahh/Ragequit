import { type ServerZoneSpawnedMessage, type ServerZoneExpiredMessage } from '@ragequit/shared'
import * as THREE from 'three'

import { VfxTextures } from './vfx-textures.js'

interface ZoneVisual {
  mesh: THREE.Mesh
  extra?: THREE.Mesh
  accent?: THREE.Mesh
  signature?: THREE.Group
  element: string
  profile: ZoneProfile
  /** ms timestamp when the zone was spawned on the client */
  spawnedAtMs: number
  /** seconds before the zone becomes active; 0 = immediately armed */
  armDelaySec: number
  /** wall barrier (box) vs circular AoE — drives opacity + spin animation. */
  isWall: boolean
}

export type ZoneProfile =
  | 'wall'
  | 'fire'
  | 'ice'
  | 'storm'
  | 'thorns'
  | 'volley'
  | 'trap'
  | 'smoke'
  | 'totem'

export interface ZoneVisualsOptions {
  scene: THREE.Scene
}

export interface ZoneVisualsController {
  onSpawned: (msg: ServerZoneSpawnedMessage) => void
  onExpired: (msg: ServerZoneExpiredMessage) => void
  clear: () => void
  animateFrame: (now: number) => void
  zoneColorForElement: (element: string) => number
}

export function zoneColorForElement(element: string): number {
  switch (element) {
    case 'fire':
      return 0xff5511 // warmer orange-red
    case 'ice':
      return 0x00d0ff
    case 'lightning':
      return 0xffd200 // electric yellow
    case 'dark':
      return 0x9922ff // deep magic violet
    case 'nature':
      return 0x39ff14 // emerald green
    default:
      return 0xc0c0c0
  }
}

export function zoneProfile(
  abilityId: string,
  element: string,
  shape: 'circle' | 'wall',
): ZoneProfile {
  if (shape === 'wall') return 'wall'
  if (abilityId === 'volley') return 'volley'
  if (abilityId === 'snare_trap') return 'trap'
  if (abilityId === 'storm_field') return 'storm'
  if (abilityId === 'thorn_field' || abilityId === 'entangle') return 'thorns'
  if (abilityId === 'smoke_screen') return 'smoke'
  if (abilityId === 'healing_totem') return 'totem'
  if (element === 'ice') return 'ice'
  if (element === 'lightning') return 'storm'
  if (element === 'nature') return 'thorns'
  return 'fire'
}

function makeZoneSignature(
  profile: ZoneProfile,
  radius: number,
  color: number,
): THREE.Group | undefined {
  if (profile === 'wall' || profile === 'fire') return undefined
  const group = new THREE.Group()
  const additive = profile !== 'smoke'
  const mat = new THREE.MeshBasicMaterial({
    color: profile === 'smoke' ? 0x281d36 : color,
    transparent: true,
    opacity: profile === 'smoke' ? 0.46 : 0.72,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  })
  const addRadial = (geometry: THREE.BufferGeometry, count: number, atRadius: number): void => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const mesh = new THREE.Mesh(geometry.clone(), mat.clone())
      mesh.position.set(Math.cos(angle) * atRadius, 0.25, Math.sin(angle) * atRadius)
      mesh.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.16
      mesh.layers.enable(1)
      group.add(mesh)
    }
    geometry.dispose()
    mat.dispose()
  }

  if (profile === 'ice') {
    addRadial(
      new THREE.ConeGeometry(Math.max(0.08, radius * 0.055), radius * 0.55, 5),
      8,
      radius * 0.62,
    )
  } else if (profile === 'storm') {
    addRadial(new THREE.CylinderGeometry(0.025, 0.075, radius * 0.9, 5), 6, radius * 0.52)
  } else if (profile === 'thorns' || profile === 'trap') {
    addRadial(
      new THREE.ConeGeometry(
        Math.max(0.07, radius * 0.045),
        profile === 'trap' ? 0.28 : radius * 0.38,
        5,
      ),
      profile === 'trap' ? 12 : 9,
      radius * (profile === 'trap' ? 0.76 : 0.58),
    )
  } else if (profile === 'volley') {
    addRadial(
      new THREE.CylinderGeometry(0.018, 0.018, Math.max(0.9, radius * 0.45), 5),
      10,
      radius * 0.58,
    )
  } else if (profile === 'smoke') {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.82, 16, 8), mat)
    cloud.scale.y = 0.42
    cloud.position.y = radius * 0.25
    group.add(cloud)
  } else if (profile === 'totem') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.1, 6), mat)
    stem.position.y = 0.55
    stem.layers.enable(1)
    const halo = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.4, 0.045, 6, 24), mat.clone())
    halo.rotation.x = Math.PI / 2
    halo.position.y = 1.05
    halo.layers.enable(1)
    group.add(stem, halo)
  }
  return group
}

function disposeGroup(group: THREE.Group | undefined): void {
  if (!group) return
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => material.dispose())
  })
}

export function initZoneVisuals({ scene }: ZoneVisualsOptions): ZoneVisualsController {
  const zoneVisuals = new Map<string, ZoneVisual>()

  function onSpawned(msg: ServerZoneSpawnedMessage): void {
    if (zoneVisuals.has(msg.id)) return
    let mesh: THREE.Mesh
    const zColor = zoneColorForElement(msg.element)
    const profile = zoneProfile(msg.abilityId, msg.element, msg.shape)

    if (msg.shape === 'wall' && msg.width > 0) {
      const geo = new THREE.BoxGeometry(msg.width, 1.6, 0.4)

      // Select the best texture map for the wall barrier
      let wallMap: THREE.Texture
      if (msg.element === 'fire') wallMap = VfxTextures.fire
      else if (msg.element === 'ice') wallMap = VfxTextures.ice
      else if (msg.element === 'nature') wallMap = VfxTextures.nature
      else wallMap = VfxTextures.shield

      const mat = new THREE.MeshBasicMaterial({
        map: wallMap,
        color: zColor,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending, // glowing barriers
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(msg.pos.x, msg.pos.y + 0.8, msg.pos.z)
      mesh.rotation.y = msg.yaw

      const edgeGeo = new THREE.BoxGeometry(msg.width + 0.08, 1.72, 0.06)
      const edgeMat = new THREE.MeshBasicMaterial({
        map: VfxTextures.shield,
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const edge = new THREE.Mesh(edgeGeo, edgeMat)
      edge.position.set(msg.pos.x, msg.pos.y + 0.8, msg.pos.z)
      edge.rotation.y = msg.yaw
      edge.position.x += Math.sin(msg.yaw) * 0.23
      edge.position.z += Math.cos(msg.yaw) * 0.23

      mesh.layers.enable(1) // bloom
      edge.layers.enable(1)
      scene.add(mesh)
      scene.add(edge)
      zoneVisuals.set(msg.id, {
        mesh,
        extra: edge,
        element: msg.element,
        profile,
        spawnedAtMs: performance.now(),
        armDelaySec: msg.armDelaySec,
        isWall: true,
      })
      return
    } else {
      // Cylinder AoE zones (Blizzard, Storm Field, Thorn Field, etc.)
      const cylinderGeo = new THREE.CylinderGeometry(msg.radius, msg.radius, 1.8, 28, 1, true)

      // Mapped with our glowing shield grid or elemental patterns
      let domeMap: THREE.Texture
      if (msg.element === 'fire') domeMap = VfxTextures.fire
      else if (msg.element === 'ice') domeMap = VfxTextures.ice
      else if (msg.element === 'nature') domeMap = VfxTextures.nature
      else if (msg.element === 'dark') domeMap = VfxTextures.dark
      else domeMap = VfxTextures.shield

      const cylinderMat = new THREE.MeshBasicMaterial({
        map: domeMap,
        color: zColor,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      mesh = new THREE.Mesh(cylinderGeo, cylinderMat)
      mesh.position.set(msg.pos.x, msg.pos.y + 0.9, msg.pos.z)
      scene.add(mesh)

      // Floor decal ring for readable zone ownership and radius.
      const floorGeo = new THREE.RingGeometry(Math.max(0.1, msg.radius - 0.24), msg.radius, 28)
      floorGeo.rotateX(-Math.PI / 2)

      let floorMap = VfxTextures.ring
      if (msg.element === 'nature') floorMap = VfxTextures.nature

      const floorMat = new THREE.MeshBasicMaterial({
        map: floorMap,
        color: zColor,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const floorMesh = new THREE.Mesh(floorGeo, floorMat)
      floorMesh.position.set(msg.pos.x, msg.pos.y + 0.018, msg.pos.z)
      floorMesh.layers.enable(1) // bloom
      scene.add(floorMesh)

      // Accent inner ring
      const accentGeo = new THREE.TorusGeometry(msg.radius * 0.72, 0.035, 6, 24)
      accentGeo.rotateX(-Math.PI / 2)
      const accentMat = new THREE.MeshBasicMaterial({
        map: VfxTextures.shield,
        color: msg.element === 'dark' ? 0x9922ff : 0xffffff,
        transparent: true,
        opacity: msg.element === 'dark' ? 0.45 : 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const accentMesh = new THREE.Mesh(accentGeo, accentMat)
      accentMesh.position.set(msg.pos.x, msg.pos.y + 0.055, msg.pos.z)
      accentMesh.layers.enable(1) // bloom
      scene.add(accentMesh)

      const signature = makeZoneSignature(profile, msg.radius, zColor)
      if (signature) {
        signature.position.set(msg.pos.x, msg.pos.y, msg.pos.z)
        scene.add(signature)
      }

      zoneVisuals.set(msg.id, {
        mesh,
        extra: floorMesh,
        accent: accentMesh,
        signature,
        element: msg.element,
        profile,
        spawnedAtMs: performance.now(),
        armDelaySec: msg.armDelaySec,
        isWall: false,
      })
      return
    }
  }

  function onExpired(msg: ServerZoneExpiredMessage): void {
    const vis = zoneVisuals.get(msg.id)
    if (!vis) return
    scene.remove(vis.mesh)
    vis.mesh.geometry.dispose()
    ;(vis.mesh.material as THREE.Material).dispose()
    if (vis.extra) {
      scene.remove(vis.extra)
      vis.extra.geometry.dispose()
      ;(vis.extra.material as THREE.Material).dispose()
    }
    if (vis.accent) {
      scene.remove(vis.accent)
      vis.accent.geometry.dispose()
      ;(vis.accent.material as THREE.Material).dispose()
    }
    if (vis.signature) {
      scene.remove(vis.signature)
      disposeGroup(vis.signature)
    }
    zoneVisuals.delete(msg.id)
  }

  function clear(): void {
    zoneVisuals.forEach((vis) => {
      scene.remove(vis.mesh)
      vis.mesh.geometry.dispose()
      ;(vis.mesh.material as THREE.Material).dispose()
      if (vis.extra) {
        scene.remove(vis.extra)
        vis.extra.geometry.dispose()
        ;(vis.extra.material as THREE.Material).dispose()
      }
      if (vis.accent) {
        scene.remove(vis.accent)
        vis.accent.geometry.dispose()
        ;(vis.accent.material as THREE.Material).dispose()
      }
      if (vis.signature) {
        scene.remove(vis.signature)
        disposeGroup(vis.signature)
      }
    })
    zoneVisuals.clear()
  }

  let _lastFrameMs = 0
  function animateFrame(now: number): void {
    // Frame-time multiplier (1.0 at 60 fps) so spin speeds are refresh-rate
    // independent (incremental rotation runs 2.4× faster at 144 Hz otherwise).
    const dt60 = _lastFrameMs > 0 ? Math.min(3, (now - _lastFrameMs) / 16.667) : 1
    _lastFrameMs = now
    zoneVisuals.forEach((vis) => {
      const isFireOrLightning = vis.element === 'fire' || vis.element === 'lightning'
      const freq = isFireOrLightning ? 0.007 : 0.0035
      const pulse = 0.5 + 0.5 * Math.sin(now * freq)

      // Dim the zone while it is still arming — visually signals "not yet active".
      // A slow dim-flash provides feedback without being confusing.
      const armedAtMs = vis.spawnedAtMs + vis.armDelaySec * 1000
      const isArmed = vis.armDelaySec === 0 || now >= armedAtMs
      // Unarmed: slow strobe at half opacity; Armed: full animated opacity.
      const opacityScale = isArmed ? 1.0 : 0.3 + 0.25 * Math.sin(now * 0.003)

      const mat = vis.mesh.material as THREE.MeshBasicMaterial
      if (vis.isWall) {
        // Solid glowing barrier — keep near its authored opacity and don't spin
        // (a wall has a fixed yaw). Circles get the animated low opacity below.
        if ('opacity' in mat) mat.opacity = (0.7 + pulse * 0.15) * opacityScale
      } else {
        if ('opacity' in mat) mat.opacity = (0.18 + pulse * 0.18) * opacityScale
        vis.mesh.rotation.y += (isFireOrLightning ? 0.008 : 0.004) * dt60
      }

      if (vis.extra) {
        const eMat = vis.extra.material as THREE.MeshBasicMaterial
        if ('opacity' in eMat) eMat.opacity = (0.52 + pulse * 0.28) * opacityScale

        // Keep the floor decal moving without changing the gameplay radius.
        if (!vis.isWall) vis.extra.rotation.y += (vis.element === 'dark' ? -0.006 : 0.004) * dt60
      }
      if (vis.accent) {
        const aMat = vis.accent.material as THREE.MeshBasicMaterial
        if ('opacity' in aMat) aMat.opacity = (0.18 + pulse * 0.2) * opacityScale
        vis.accent.rotation.y += (vis.element === 'dark' ? -0.012 : 0.008) * dt60
        if (vis.element === 'ice') vis.accent.scale.setScalar(1.0 + pulse * 0.04)
        else if (vis.element === 'nature')
          vis.accent.scale.set(1.0 + pulse * 0.06, 1, 1.0 + pulse * 0.06)
      }
      if (vis.signature) {
        const direction = vis.profile === 'storm' || vis.profile === 'volley' ? -1 : 1
        vis.signature.rotation.y += direction * 0.006 * dt60
        const bob = 1 + Math.sin(now * 0.006) * 0.04
        if (vis.profile === 'totem' || vis.profile === 'smoke') vis.signature.scale.setScalar(bob)
      }
    })
  }

  return { onSpawned, onExpired, clear, animateFrame, zoneColorForElement }
}
