import { type ServerProjectileSpawnedMessage, type ServerProjectileExpiredMessage } from '@ragequit/shared'
import * as THREE from 'three'

import { makeProjectileMesh } from './factories.js'

export interface SchemaProjectile {
  id: string
  ownerId: string
  kind: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  expired: boolean
}

interface ProjectileVisual {
  mesh: THREE.Mesh
  lastPos: THREE.Vector3
  lastAt: number
  kind: 'arrow' | 'bolt'
}

export interface ProjectileVisualsOptions {
  scene: THREE.Scene
  spawnImpact: (pos: THREE.Vector3, color: number) => void
  zoneColorForElement: (element: string) => number
}

export interface ProjectileVisualsController {
  onSpawned: (msg: ServerProjectileSpawnedMessage) => void
  onExpired: (msg: ServerProjectileExpiredMessage) => void
  clear: () => void
  renderFrame: (proj: Map<string, SchemaProjectile>, now: number, dbgProj: HTMLElement) => void
}

export function initProjectileVisuals({
  scene,
  spawnImpact,
  zoneColorForElement,
}: ProjectileVisualsOptions): ProjectileVisualsController {
  const projectileVisuals = new Map<string, ProjectileVisual>()

  function onSpawned(msg: ServerProjectileSpawnedMessage): void {
    if (projectileVisuals.has(msg.id)) return
    const mesh = makeProjectileMesh(msg.kind)
    mesh.position.set(msg.origin.x, msg.origin.y, msg.origin.z)
    scene.add(mesh)
    projectileVisuals.set(msg.id, {
      mesh,
      lastPos: new THREE.Vector3(msg.origin.x, msg.origin.y, msg.origin.z),
      lastAt: performance.now(),
      kind: msg.kind === 'bolt' ? 'bolt' : 'arrow',
    })
  }

  function onExpired(msg: ServerProjectileExpiredMessage): void {
    const vis = projectileVisuals.get(msg.id)
    if (vis) {
      scene.remove(vis.mesh)
      vis.mesh.geometry.dispose()
      ;(vis.mesh.material as THREE.Material).dispose()
      projectileVisuals.delete(msg.id)
    }
    const elemColor = msg.element ? zoneColorForElement(msg.element) : null
    const color =
      elemColor ??
      (msg.reason === 'victim' ? 0xff6060 : msg.reason === 'terrain' ? 0xaabbcc : 0x80d0ff)
    spawnImpact(new THREE.Vector3(msg.pos.x, msg.pos.y, msg.pos.z), color)
  }

  function clear(): void {
    projectileVisuals.forEach((vis) => {
      scene.remove(vis.mesh)
      vis.mesh.geometry.dispose()
      ;(vis.mesh.material as THREE.Material).dispose()
    })
    projectileVisuals.clear()
  }

  function renderFrame(proj: Map<string, SchemaProjectile>, now: number, dbgProj: HTMLElement): void {
    proj.forEach((p, id) => {
      let vis = projectileVisuals.get(id)
      if (!vis) {
        const kind: 'arrow' | 'bolt' = p.kind === 'bolt' ? 'bolt' : 'arrow'
        const mesh = makeProjectileMesh(kind)
        mesh.position.set(p.x, p.y, p.z)
        scene.add(mesh)
        vis = { mesh, lastPos: new THREE.Vector3(p.x, p.y, p.z), lastAt: now, kind }
        projectileVisuals.set(id, vis)
      }
      vis.mesh.position.set(p.x, p.y, p.z)
      const sp = Math.hypot(p.vx, p.vy, p.vz)
      if (vis.kind === 'arrow' && sp > 0.01) {
        vis.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz)
      } else if (vis.kind === 'bolt') {
        vis.mesh.rotation.y += 0.06
        vis.mesh.scale.setScalar(1.0 + 0.08 * Math.sin(now * 0.022))
      }
      vis.lastPos.set(p.x, p.y, p.z)
      vis.lastAt = now
    })
    projectileVisuals.forEach((vis, id) => {
      if (!proj.has(id)) {
        scene.remove(vis.mesh)
        vis.mesh.geometry.dispose()
        ;(vis.mesh.material as THREE.Material).dispose()
        projectileVisuals.delete(id)
      }
    })
    dbgProj.textContent = String(projectileVisuals.size)
  }

  return { onSpawned, onExpired, clear, renderFrame }
}
