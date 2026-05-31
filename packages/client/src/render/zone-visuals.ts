import { type ServerZoneSpawnedMessage, type ServerZoneExpiredMessage } from '@ragequit/shared'
import * as THREE from 'three'

import { VfxTextures } from './vfx-textures.js'

interface ZoneVisual {
  mesh: THREE.Mesh
  extra?: THREE.Mesh
  accent?: THREE.Mesh
  element: string
  /** ms timestamp when the zone was spawned on the client */
  spawnedAtMs: number
  /** seconds before the zone becomes active; 0 = immediately armed */
  armDelaySec: number
}

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

export function initZoneVisuals({ scene }: ZoneVisualsOptions): ZoneVisualsController {
  const zoneVisuals = new Map<string, ZoneVisual>()

  function onSpawned(msg: ServerZoneSpawnedMessage): void {
    if (zoneVisuals.has(msg.id)) return
    let mesh: THREE.Mesh
    const zColor = zoneColorForElement(msg.element)

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
        side: THREE.DoubleSide
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

      mesh.layers.enable(1)  // bloom
      edge.layers.enable(1)
      scene.add(mesh)
      scene.add(edge)
      zoneVisuals.set(msg.id, {
        mesh, extra: edge, element: msg.element,
        spawnedAtMs: performance.now(), armDelaySec: msg.armDelaySec,
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
      floorMesh.layers.enable(1)  // bloom
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
      accentMesh.layers.enable(1)  // bloom
      scene.add(accentMesh)

      zoneVisuals.set(msg.id, {
        mesh, extra: floorMesh, accent: accentMesh, element: msg.element,
        spawnedAtMs: performance.now(), armDelaySec: msg.armDelaySec,
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
    })
    zoneVisuals.clear()
  }

  function animateFrame(now: number): void {
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
      if ('opacity' in mat) mat.opacity = (0.18 + pulse * 0.18) * opacityScale
      vis.mesh.rotation.y += isFireOrLightning ? 0.008 : 0.004

      if (vis.extra) {
        const eMat = vis.extra.material as THREE.MeshBasicMaterial
        if ('opacity' in eMat) eMat.opacity = (0.52 + pulse * 0.28) * opacityScale

        // Keep the floor decal moving without changing the gameplay radius.
        vis.extra.rotation.y += vis.element === 'dark' ? -0.006 : 0.004
      }
      if (vis.accent) {
        const aMat = vis.accent.material as THREE.MeshBasicMaterial
        if ('opacity' in aMat) aMat.opacity = (0.18 + pulse * 0.2) * opacityScale
        vis.accent.rotation.y += vis.element === 'dark' ? -0.012 : 0.008
        if (vis.element === 'ice') vis.accent.scale.setScalar(1.0 + pulse * 0.04)
        else if (vis.element === 'nature')
          vis.accent.scale.set(1.0 + pulse * 0.06, 1, 1.0 + pulse * 0.06)
      }
    })
  }

  return { onSpawned, onExpired, clear, animateFrame, zoneColorForElement }
}
