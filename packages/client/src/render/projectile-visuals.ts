import {
  type ServerProjectileSpawnedMessage,
  type ServerProjectileExpiredMessage,
} from '@ragequit/shared'
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

const TRAIL_LEN = 8

interface ProjectileVisual {
  mesh: THREE.Mesh
  trail: THREE.Line
  trailBuf: Float32Array // 3 * TRAIL_LEN floats, oldest → newest
  trailCount: number // how many valid positions have been written
  lastPos: THREE.Vector3
  lastAt: number
  kind: 'arrow' | 'bolt'
}

function makeTrailLine(kind: 'arrow' | 'bolt'): THREE.Line {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3))
  const color = kind === 'arrow' ? 0xffa040 : 0x50ccff
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  })
  const line = new THREE.Line(geo, mat)
  line.frustumCulled = false
  return line
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
    const kind: 'arrow' | 'bolt' = msg.kind === 'bolt' ? 'bolt' : 'arrow'
    const mesh = makeProjectileMesh(kind)
    mesh.position.set(msg.origin.x, msg.origin.y, msg.origin.z)
    const trail = makeTrailLine(kind)
    scene.add(mesh)
    scene.add(trail)
    const buf = new Float32Array(TRAIL_LEN * 3)
    // Initialise all trail points at spawn origin.
    for (let i = 0; i < TRAIL_LEN; i++) {
      buf[i * 3] = msg.origin.x
      buf[i * 3 + 1] = msg.origin.y
      buf[i * 3 + 2] = msg.origin.z
    }
    projectileVisuals.set(msg.id, {
      mesh,
      trail,
      trailBuf: buf,
      trailCount: 0,
      lastPos: new THREE.Vector3(msg.origin.x, msg.origin.y, msg.origin.z),
      lastAt: performance.now(),
      kind,
    })
  }

  function disposeVisual(vis: ProjectileVisual): void {
    scene.remove(vis.mesh)
    scene.remove(vis.trail)
    vis.mesh.geometry.dispose()
    ;(vis.mesh.material as THREE.Material).dispose()
    vis.trail.geometry.dispose()
    ;(vis.trail.material as THREE.Material).dispose()
  }

  function onExpired(msg: ServerProjectileExpiredMessage): void {
    const vis = projectileVisuals.get(msg.id)
    if (vis) {
      disposeVisual(vis)
      projectileVisuals.delete(msg.id)
    }
    const elemColor = msg.element ? zoneColorForElement(msg.element) : null
    const color =
      elemColor ??
      (msg.reason === 'victim' ? 0xff6060 : msg.reason === 'terrain' ? 0xaabbcc : 0x80d0ff)
    spawnImpact(new THREE.Vector3(msg.pos.x, msg.pos.y, msg.pos.z), color)
  }

  function clear(): void {
    projectileVisuals.forEach((vis) => disposeVisual(vis))
    projectileVisuals.clear()
  }

  function updateTrail(vis: ProjectileVisual, x: number, y: number, z: number): void {
    // Shift existing points toward index 0 (oldest), write new at end.
    for (let i = 0; i < (TRAIL_LEN - 1) * 3; i++) vis.trailBuf[i] = vis.trailBuf[i + 3]!
    vis.trailBuf[(TRAIL_LEN - 1) * 3] = x
    vis.trailBuf[(TRAIL_LEN - 1) * 3 + 1] = y
    vis.trailBuf[(TRAIL_LEN - 1) * 3 + 2] = z
    vis.trailCount = Math.min(vis.trailCount + 1, TRAIL_LEN)
    // Write the valid slice into the BufferAttribute.
    const attr = vis.trail.geometry.attributes['position'] as THREE.BufferAttribute
    const start = TRAIL_LEN - vis.trailCount
    for (let i = 0; i < vis.trailCount; i++) {
      const s = (start + i) * 3
      attr.setXYZ(i, vis.trailBuf[s]!, vis.trailBuf[s + 1]!, vis.trailBuf[s + 2]!)
    }
    attr.needsUpdate = true
    vis.trail.geometry.setDrawRange(0, Math.max(2, vis.trailCount))
  }

  function renderFrame(
    proj: Map<string, SchemaProjectile>,
    now: number,
    dbgProj: HTMLElement,
  ): void {
    proj.forEach((p, id) => {
      let vis = projectileVisuals.get(id)
      if (!vis) {
        const kind: 'arrow' | 'bolt' = p.kind === 'bolt' ? 'bolt' : 'arrow'
        const mesh = makeProjectileMesh(kind)
        mesh.position.set(p.x, p.y, p.z)
        const trail = makeTrailLine(kind)
        scene.add(mesh)
        scene.add(trail)
        const buf = new Float32Array(TRAIL_LEN * 3)
        for (let i = 0; i < TRAIL_LEN; i++) {
          buf[i * 3] = p.x
          buf[i * 3 + 1] = p.y
          buf[i * 3 + 2] = p.z
        }
        vis = {
          mesh,
          trail,
          trailBuf: buf,
          trailCount: 0,
          lastPos: new THREE.Vector3(p.x, p.y, p.z),
          lastAt: now,
          kind,
        }
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
      updateTrail(vis, p.x, p.y, p.z)
      vis.lastPos.set(p.x, p.y, p.z)
      vis.lastAt = now
    })
    projectileVisuals.forEach((vis, id) => {
      if (!proj.has(id)) {
        disposeVisual(vis)
        projectileVisuals.delete(id)
      }
    })
    dbgProj.textContent = String(projectileVisuals.size)
  }

  return { onSpawned, onExpired, clear, renderFrame }
}
