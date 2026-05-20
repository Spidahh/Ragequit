import { type ServerZoneSpawnedMessage, type ServerZoneExpiredMessage } from '@ragequit/shared'
import * as THREE from 'three'

interface ZoneVisual {
  mesh: THREE.Mesh
  extra?: THREE.Mesh
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
      return 0xff6a32
    case 'ice':
      return 0x9adfff
    case 'lightning':
      return 0xfff066
    case 'dark':
      return 0x9060c0
    case 'nature':
      return 0x7adf6a
    default:
      return 0xc0c0c0
  }
}

export function initZoneVisuals({ scene }: ZoneVisualsOptions): ZoneVisualsController {
  const zoneVisuals = new Map<string, ZoneVisual>()

  function onSpawned(msg: ServerZoneSpawnedMessage): void {
    if (zoneVisuals.has(msg.id)) return
    let mesh: THREE.Mesh
    if (msg.shape === 'wall' && msg.width > 0) {
      const geo = new THREE.BoxGeometry(msg.width, 1.6, 0.4)
      const mat = new THREE.MeshBasicMaterial({ color: 0xff6a32, transparent: true, opacity: 0.7 })
      mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(msg.pos.x, msg.pos.y + 0.8, msg.pos.z)
      mesh.rotation.y = msg.yaw
    } else {
      const zColor = zoneColorForElement(msg.element)
      const cylinderGeo = new THREE.CylinderGeometry(msg.radius, msg.radius, 1.8, 28, 1, true)
      const cylinderMat = new THREE.MeshBasicMaterial({
        color: zColor,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      })
      mesh = new THREE.Mesh(cylinderGeo, cylinderMat)
      mesh.position.set(msg.pos.x, msg.pos.y + 0.9, msg.pos.z)
      scene.add(mesh)

      const floorGeo = new THREE.RingGeometry(Math.max(0.1, msg.radius - 0.18), msg.radius, 28)
      floorGeo.rotateX(-Math.PI / 2)
      const floorMat = new THREE.MeshBasicMaterial({
        color: zColor,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
      const floorMesh = new THREE.Mesh(floorGeo, floorMat)
      floorMesh.position.set(msg.pos.x, msg.pos.y + 0.018, msg.pos.z)
      scene.add(floorMesh)
      zoneVisuals.set(msg.id, { mesh, extra: floorMesh })
      return
    }
    scene.add(mesh)
    zoneVisuals.set(msg.id, { mesh })
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
    })
    zoneVisuals.clear()
  }

  function animateFrame(now: number): void {
    zoneVisuals.forEach((vis) => {
      // Use a faster pulse for dangerous/aggressive elements (fire/lightning),
      // slower for nature/ice zones — gives each element a distinct rhythm.
      const matColor = (vis.mesh.material as THREE.MeshBasicMaterial).color
      const isFireOrLightning =
        matColor.r > 0.9 || (matColor.r > 0.5 && matColor.g > 0.5 && matColor.b < 0.3)
      const freq = isFireOrLightning ? 0.007 : 0.0035
      const pulse = 0.5 + 0.5 * Math.sin(now * freq)
      const mat = vis.mesh.material as THREE.MeshBasicMaterial
      if ('opacity' in mat) mat.opacity = 0.16 + pulse * 0.2
      vis.mesh.rotation.y += isFireOrLightning ? 0.01 : 0.006
      if (vis.extra) {
        // Floor ring pulses with slightly higher opacity for clear AoE boundary.
        const eMat = vis.extra.material as THREE.MeshBasicMaterial
        if ('opacity' in eMat) eMat.opacity = 0.4 + pulse * 0.28
      }
    })
  }

  return { onSpawned, onExpired, clear, animateFrame, zoneColorForElement }
}
