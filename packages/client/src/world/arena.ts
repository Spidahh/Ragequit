import { getMap, type AABB } from '@ragequit/shared'
import * as THREE from 'three'

// The ArenaObjects interface returned by buildArena for main.ts.
export interface ArenaObjects {
  loadMapGeometry: (mapId: string) => void
  getActiveMapId: () => string
  animateArena: (now: number, dt: number, inHitStop: boolean) => void
}

const ARENA_RADIUS = 30 // Gameplay radius to keep player inside visually consistent boundaries

function makeBoxMesh(box: AABB, color: number, toonGradient: THREE.DataTexture): THREE.Mesh {
  const sx = box.maxX - box.minX
  const sy = box.maxY - box.minY
  const sz = box.maxZ - box.minZ
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshToonMaterial({ color, gradientMap: toonGradient }),
  )
  m.position.set((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, (box.minZ + box.maxZ) / 2)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export function buildArena(scene: THREE.Scene, toonGradient: THREE.DataTexture): ArenaObjects {
  // ── Arena visual group containing all custom decorative fight-league assets ──
  const arenaVisualGroup = new THREE.Group()
  scene.add(arenaVisualGroup)

  // ── Materials using curated fight-league color palette with custom Toon Shading ──
  const floorMat = new THREE.MeshToonMaterial({
    color: 0x1d2029,
    gradientMap: toonGradient,
  })

  const tileMat = new THREE.MeshToonMaterial({
    color: 0x282c3a,
    gradientMap: toonGradient,
  })

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a04a,
    roughness: 0.4,
    metalness: 0.8,
    emissive: 0xd4a04a,
    emissiveIntensity: 0.25,
  })

  const pillarMat = new THREE.MeshToonMaterial({
    color: 0x2a2e3a,
    gradientMap: toonGradient,
  })

  const wallMat = new THREE.MeshToonMaterial({
    color: 0x161922,
    gradientMap: toonGradient,
  })

  const sigilMat = new THREE.MeshBasicMaterial({
    color: 0xd4a04a,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  })

  // ── 1. Arena floor — octagonal stone ──
  const seg = 8
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA_RADIUS, seg), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  arenaVisualGroup.add(floor)

  // ── 2. Concentric octagonal floor tiles for combat scale indicators ──
  for (let r = 1; r < 5; r++) {
    for (let i = 0; i < seg; i++) {
      const a1 = (i / seg) * Math.PI * 2
      const a2 = ((i + 1) / seg) * Math.PI * 2
      const rIn = (ARENA_RADIUS / 5) * r
      const rOut = (ARENA_RADIUS / 5) * (r + 0.85)
      const tile = new THREE.Mesh(
        new THREE.RingGeometry(rIn, rOut, 1, 1, a1, a2 - a1 - 0.04),
        tileMat,
      )
      tile.rotation.x = -Math.PI / 2
      tile.position.y = 0.005
      tile.receiveShadow = true
      arenaVisualGroup.add(tile)
    }
  }

  // ── 3. Brass border ring — league identity color outer boundary ──
  const border = new THREE.Mesh(
    new THREE.RingGeometry(ARENA_RADIUS - 0.05, ARENA_RADIUS + 0.25, seg * 2),
    brassMat,
  )
  border.rotation.x = -Math.PI / 2
  border.position.y = 0.02
  arenaVisualGroup.add(border)

  // ── 4. 8 corner pillars with premium heavy brass caps ──
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2 + Math.PI / 8
    const x = Math.cos(a) * (ARENA_RADIUS + 1.2)
    const z = Math.sin(a) * (ARENA_RADIUS + 1.2)
    
    // Solid stone column shaft
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 11, 1.5), pillarMat)
    p.position.set(x, 5.5, z)
    p.castShadow = true
    p.receiveShadow = true
    arenaVisualGroup.add(p)
    
    // Polished heavy brass cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 2.0), brassMat)
    cap.position.set(x, 11.3, z)
    cap.castShadow = true
    arenaVisualGroup.add(cap)
  }

  // ── 5. Outer wall segments — heavy stone slabs framing the battlefield ──
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const x = Math.cos(a) * (ARENA_RADIUS + 0.8)
    const z = Math.sin(a) * (ARENA_RADIUS + 0.8)
    
    const wall = new THREE.Mesh(new THREE.BoxGeometry(7.5, 6.0, 0.75), wallMat)
    wall.position.set(x, 3.0, z)
    wall.lookAt(0, 3.0, 0)
    wall.castShadow = true
    wall.receiveShadow = true
    arenaVisualGroup.add(wall)
  }

  // ── 6. Center sigil — decorative brass ring on the floor ──
  const sigil = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.9, 32), sigilMat)
  sigil.rotation.x = -Math.PI / 2
  sigil.position.y = 0.025
  arenaVisualGroup.add(sigil)

  // ── 7. Atmospheric drifting dust motes particles ──
  const pCount = 200
  const pGeo = new THREE.BufferGeometry()
  const pos = new Float32Array(pCount * 3)
  for (let i = 0; i < pCount; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * ARENA_RADIUS * 1.5
    pos[i * 3] = Math.cos(a) * r
    pos[i * 3 + 1] = Math.random() * 15 + 0.2
    pos[i * 3 + 2] = Math.sin(a) * r
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const dust = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xb89878,
      size: 0.09,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
    }),
  )
  arenaVisualGroup.add(dust)

  // ── 8. Outer ground plane extended out beyond the arena boundaries ──
  const groundFar = new THREE.Mesh(
    new THREE.CircleGeometry(150, 32),
    new THREE.MeshBasicMaterial({ color: 0x06070b }),
  )
  groundFar.rotation.x = -Math.PI / 2
  groundFar.position.y = -0.1
  arenaVisualGroup.add(groundFar)

  // ── Map geometry (dynamic, swapped by server schema) ──
  let activeMapId = ''
  const mapBoxMeshes: THREE.Mesh[] = []

  function loadMapGeometry(mapId: string): void {
    if (mapId === activeMapId) return
    activeMapId = mapId
    
    // Clean up old box meshes
    for (const m of mapBoxMeshes) {
      scene.remove(m)
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
    mapBoxMeshes.length = 0
    
    const map = getMap(mapId)
    
    // Shift entire visual arena (floor, walls, pillars, sigils, dust) to ground level
    arenaVisualGroup.position.y = map.groundY
    
    // Spawn map blocks
    for (const b of map.boxes) {
      const height = b.maxY - b.minY
      const color = height > 2.5 ? 0x4a78b0 : height > 1.4 ? 0x385e8a : 0x2e4a70
      const m = makeBoxMesh(b, color, toonGradient)
      scene.add(m)
      mapBoxMeshes.push(m)
    }
  }

  // Load blockout map by default
  loadMapGeometry('blockout')

  function animateArena(now: number, dt: number, inHitStop: boolean): void {
    // Pulse the brass and sigil materials
    const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.001)
    brassMat.emissiveIntensity = 0.15 + ringPulse * 0.2
    sigilMat.opacity = 0.4 + ringPulse * 0.2

    // Drift dust motes particles
    if (!inHitStop) {
      const pa = dust.geometry.attributes.position as THREE.BufferAttribute
      const paArr = pa.array as Float32Array
      for (let i = 0; i < pCount; i++) {
        const yIndex = i * 3 + 1
        const yVal = paArr[yIndex]
        if (yVal !== undefined) {
          const nextY = yVal + dt * 0.003
          paArr[yIndex] = nextY > 15 ? 0.1 : nextY
        }
      }
      pa.needsUpdate = true
    }
  }

  return {
    loadMapGeometry,
    getActiveMapId: () => activeMapId,
    animateArena,
  }
}
