import { getMap, type AABB } from '@ragequit/shared'
import * as THREE from 'three'

export interface ArenaObjects {
  arenaRing: THREE.Mesh
  arenaRingHaloMat: THREE.MeshBasicMaterial
  torchLights: THREE.PointLight[]
  ambientParticles: THREE.Points
  particleVels: Float32Array
  magicParticles: THREE.Points
  magicVels: Float32Array
  floorCrestGroup: THREE.Group
  centreGlowMat: THREE.MeshBasicMaterial
  groundMesh: THREE.Mesh
  grid: THREE.GridHelper
  loadMapGeometry: (mapId: string) => void
  getActiveMapId: () => string
}

const GROUND_SIZE = 80
const ARENA_R = 30
const ARENA_N = 8
export const PARTICLE_COUNT = 260
export const MAGIC_COUNT = 110

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
  // ── Ground ────────────────────────────────────────────────────────────────
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1),
    new THREE.MeshToonMaterial({ color: 0x1e2838, gradientMap: toonGradient }),
  )
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.receiveShadow = true
  scene.add(groundMesh)

  const innerFloor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 40),
    new THREE.MeshBasicMaterial({ color: 0x232e40, transparent: true, opacity: 0.70 }),
  )
  innerFloor.rotation.x = -Math.PI / 2
  innerFloor.position.y = 0.003
  scene.add(innerFloor)

  const arenaRing = new THREE.Mesh(
    new THREE.TorusGeometry(GROUND_SIZE / 2 - 1, 0.38, 8, 72),
    new THREE.MeshBasicMaterial({ color: 0xff3310, transparent: true, opacity: 0.75 }),
  )
  arenaRing.rotation.x = Math.PI / 2
  arenaRing.position.y = 0.06
  scene.add(arenaRing)

  const arenaRingHaloMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.18 })
  const arenaRingHalo = new THREE.Mesh(
    new THREE.TorusGeometry(GROUND_SIZE / 2 - 0.2, 1.20, 6, 72),
    arenaRingHaloMat,
  )
  arenaRingHalo.rotation.x = Math.PI / 2
  arenaRingHalo.position.y = 0.04
  scene.add(arenaRingHalo)

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(30, 0.15, 6, 60),
    new THREE.MeshBasicMaterial({ color: 0x3a5080, transparent: true, opacity: 0.50 }),
  )
  innerRing.rotation.x = Math.PI / 2
  innerRing.position.y = 0.004
  scene.add(innerRing)

  const midRing = new THREE.Mesh(
    new THREE.TorusGeometry(15, 0.10, 6, 48),
    new THREE.MeshBasicMaterial({ color: 0x2a4880, transparent: true, opacity: 0.42 }),
  )
  midRing.rotation.x = Math.PI / 2
  midRing.position.y = 0.004
  scene.add(midRing)

  const centreGlowMat = new THREE.MeshBasicMaterial({ color: 0x1028a0, transparent: true, opacity: 0.20, side: THREE.DoubleSide })
  const centreGlow = new THREE.Mesh(new THREE.CircleGeometry(6.0, 48), centreGlowMat)
  centreGlow.rotation.x = -Math.PI / 2
  centreGlow.position.y = 0.005
  scene.add(centreGlow)

  // 8 spawn-pad markers
  {
    const spawnMat  = new THREE.MeshBasicMaterial({ color: 0x406090, transparent: true, opacity: 0.55 })
    const spawnMat2 = new THREE.MeshBasicMaterial({ color: 0x2a4870, transparent: true, opacity: 0.38 })
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const r2 = 22
      const cx = Math.sin(angle) * r2, cz = Math.cos(angle) * r2
      const outer = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.60, 4), spawnMat)
      outer.rotation.x = -Math.PI / 2
      outer.rotation.z = angle + Math.PI / 4
      outer.position.set(cx, 0.008, cz)
      scene.add(outer)
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.30, 4), spawnMat2)
      inner.rotation.x = -Math.PI / 2
      inner.rotation.z = angle + Math.PI / 4
      inner.position.set(cx, 0.009, cz)
      scene.add(inner)
    }
  }

  const grid = new THREE.GridHelper(GROUND_SIZE - 4, 24, 0x2a3a58, 0x1a2438)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.38
  scene.add(grid)

  // ── Colosseum — pillars + walls + torches ─────────────────────────────────
  const torchLights: THREE.PointLight[] = []
  {
    const pillarMat = new THREE.MeshToonMaterial({ color: 0x28384e, gradientMap: toonGradient })
    const wallMat   = new THREE.MeshToonMaterial({ color: 0x1c2a3a, gradientMap: toonGradient })
    const capMat    = new THREE.MeshToonMaterial({ color: 0x374d66, gradientMap: toonGradient })
    const pillarGeo = new THREE.CylinderGeometry(0.40, 0.46, 7.0, 12)
    const capGeo    = new THREE.CylinderGeometry(0.60, 0.40, 0.40, 12)
    const baseGeo   = new THREE.CylinderGeometry(0.62, 0.70, 0.32, 12)
    const bandMat   = new THREE.MeshBasicMaterial({ color: 0x2090b8, transparent: true, opacity: 0.75 })

    for (let i = 0; i < ARENA_N; i++) {
      const a1 = (i       / ARENA_N) * Math.PI * 2
      const a2 = ((i + 1) / ARENA_N) * Math.PI * 2
      const px = Math.sin(a1) * ARENA_R, pz = Math.cos(a1) * ARENA_R
      const qx = Math.sin(a2) * ARENA_R, qz = Math.cos(a2) * ARENA_R
      const mx = (px + qx) / 2,          mz = (pz + qz) / 2
      const wallLen = Math.hypot(qx - px, qz - pz) - 1.1
      const wallYaw = Math.atan2(qx - px, qz - pz)

      const shaft = new THREE.Mesh(pillarGeo, pillarMat)
      shaft.position.set(px, 3.5, pz); shaft.castShadow = true; shaft.receiveShadow = true
      scene.add(shaft)
      const cap = new THREE.Mesh(capGeo, capMat); cap.position.set(px, 7.20, pz); scene.add(cap)
      const base = new THREE.Mesh(baseGeo, capMat); base.position.set(px, 0.16, pz); scene.add(base)
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.048, 6, 26), bandMat)
      band.position.set(px, 3.2, pz); band.rotation.x = Math.PI / 2; scene.add(band)

      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallLen, 2.2, 0.52), wallMat)
      wall.position.set(mx, 1.1, mz); wall.rotation.y = wallYaw
      wall.castShadow = true; wall.receiveShadow = true; scene.add(wall)
      for (let c = -1; c <= 1; c++) {
        const cOff = c * wallLen * 0.28
        const crenel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.58), capMat)
        crenel.position.set(mx + Math.sin(wallYaw) * cOff, 2.42, mz + Math.cos(wallYaw) * cOff)
        crenel.rotation.y = wallYaw; scene.add(crenel)
      }

      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9930, transparent: true, opacity: 0.9 })
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.35, 8), flameMat)
      flame.position.set(px, 7.65, pz); scene.add(flame)
      const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffee80, transparent: true, opacity: 0.8 })
      const innerFlame2 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 8), innerFlameMat)
      innerFlame2.position.set(px, 7.72, pz); scene.add(innerFlame2)
      const bowlMat = new THREE.MeshToonMaterial({ color: 0x5a3a1a, gradientMap: toonGradient })
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.18, 8), bowlMat)
      bowl.position.set(px, 7.47, pz); scene.add(bowl)
      const torch = new THREE.PointLight(0xff8830, 0.55, 14, 2)
      torch.position.set(px, 7.80, pz); scene.add(torch); torchLights.push(torch)
    }
  }

  // ── Cardinal floor compass rose ───────────────────────────────────────────
  {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x3a5070, transparent: true, opacity: 0.38 })
    for (let i = 0; i < 4; i++) {
      const lineMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 28), lineMat)
      lineMesh.rotation.x = -Math.PI / 2; lineMesh.rotation.z = (i / 4) * Math.PI * 2
      lineMesh.position.y = 0.006; scene.add(lineMesh)
    }
  }

  // ── Central combat crest ──────────────────────────────────────────────────
  const floorCrestGroup = new THREE.Group()
  floorCrestGroup.position.y = 0.007; scene.add(floorCrestGroup)
  {
    const discMat = new THREE.MeshBasicMaterial({ color: 0x1830a0, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    const disc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 48), discMat)
    disc.rotation.x = -Math.PI / 2; floorCrestGroup.add(disc)
    const rings: [number, number, number, number][] = [
      [5.2, 0.12, 0x4060d8, 0.55], [3.8, 0.08, 0x3050c0, 0.45],
      [2.2, 0.07, 0x5070e0, 0.42], [0.8, 0.06, 0x6080f0, 0.50],
    ]
    for (const [r, w, col, op] of rings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - w / 2, r + w / 2, 52),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2; floorCrestGroup.add(ring)
    }
    const spokeMat = new THREE.MeshBasicMaterial({ color: 0x4060d0, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 5.0), spokeMat)
      spoke.rotation.x = -Math.PI / 2; spoke.rotation.z = (i / 6) * Math.PI * 2
      floorCrestGroup.add(spoke)
    }
    const markMat = new THREE.MeshBasicMaterial({ color: 0x6090ff, transparent: true, opacity: 0.60 })
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), markMat)
      mark.rotation.x = -Math.PI / 2; mark.rotation.z = angle + Math.PI / 4
      mark.position.set(Math.sin(angle) * 5.2, 0, Math.cos(angle) * 5.2)
      floorCrestGroup.add(mark)
    }
  }

  // ── Ceiling canopy + overhead spots ──────────────────────────────────────
  {
    const ceilingRing = new THREE.Mesh(
      new THREE.TorusGeometry(24, 0.22, 6, 64),
      new THREE.MeshBasicMaterial({ color: 0x2a4060, transparent: true, opacity: 0.50 }),
    )
    ceilingRing.rotation.x = Math.PI / 2; ceilingRing.position.y = 15; scene.add(ceilingRing)
    const ceilingRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(12, 0.12, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0x3050a0, transparent: true, opacity: 0.38 }),
    )
    ceilingRing2.rotation.x = Math.PI / 2; ceilingRing2.position.y = 15; scene.add(ceilingRing2)
    const spotCols = [0x2050a0, 0x901818, 0x2050a0, 0x901818]
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const spot = new THREE.PointLight(spotCols[i]!, 0.35, 28, 2)
      spot.position.set(Math.sin(angle) * 20, 13, Math.cos(angle) * 20); scene.add(spot)
    }
  }

  // ── Ambient particles ─────────────────────────────────────────────────────
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
  const particleVels = new Float32Array(PARTICLE_COUNT * 3)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ring = i < 140
    const spread = ring ? 28 : 52
    particlePositions[i * 3]     = (Math.random() - 0.5) * spread
    particlePositions[i * 3 + 1] = Math.random() * (ring ? 8 : 22)
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * spread
    particleVels[i * 3]     = (Math.random() - 0.5) * 0.003
    particleVels[i * 3 + 1] = (ring ? 0.006 : 0.003) + Math.random() * 0.007
    particleVels[i * 3 + 2] = (Math.random() - 0.5) * 0.003
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  const ambientParticles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
    color: 0xff8866, size: 0.09, transparent: true, opacity: 0.42, sizeAttenuation: true,
  }))
  scene.add(ambientParticles)

  // Wall accent lights
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8
    const wl = new THREE.PointLight(0x3040c0, 0.22, 20, 2)
    wl.position.set(Math.sin(angle) * 28, 0.8, Math.cos(angle) * 28); scene.add(wl)
  }

  // ── Magic dust particles ──────────────────────────────────────────────────
  const magicPositions = new Float32Array(MAGIC_COUNT * 3)
  const magicVels = new Float32Array(MAGIC_COUNT * 3)
  for (let i = 0; i < MAGIC_COUNT; i++) {
    const r = 8 + Math.random() * 28
    const a = Math.random() * Math.PI * 2
    magicPositions[i * 3]     = Math.cos(a) * r
    magicPositions[i * 3 + 1] = Math.random() * 20
    magicPositions[i * 3 + 2] = Math.sin(a) * r
    magicVels[i * 3]     = -Math.sin(a) * 0.0018 + (Math.random() - 0.5) * 0.001
    magicVels[i * 3 + 1] = 0.0015 + Math.random() * 0.003
    magicVels[i * 3 + 2] =  Math.cos(a) * 0.0018 + (Math.random() - 0.5) * 0.001
  }
  const magicGeo = new THREE.BufferGeometry()
  magicGeo.setAttribute('position', new THREE.BufferAttribute(magicPositions, 3))
  const magicParticles = new THREE.Points(magicGeo, new THREE.PointsMaterial({
    color: 0x60a8ff, size: 0.065, transparent: true, opacity: 0.32, sizeAttenuation: true,
  }))
  scene.add(magicParticles)

  // ── Map geometry (dynamic, swapped by server schema) ──────────────────────
  let activeMapId = ''
  const mapBoxMeshes: THREE.Mesh[] = []

  function loadMapGeometry(mapId: string): void {
    if (mapId === activeMapId) return
    activeMapId = mapId
    for (const m of mapBoxMeshes) {
      scene.remove(m)
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
    mapBoxMeshes.length = 0
    const map = getMap(mapId)
    groundMesh.position.y = map.groundY
    grid.position.y = map.groundY + 0.001
    for (const b of map.boxes) {
      const height = b.maxY - b.minY
      const color = height > 2.5 ? 0x4a78b0 : height > 1.4 ? 0x385e8a : 0x2e4a70
      const m = makeBoxMesh(b, color, toonGradient)
      scene.add(m); mapBoxMeshes.push(m)
    }
  }

  loadMapGeometry('blockout')

  return {
    arenaRing,
    arenaRingHaloMat,
    torchLights,
    ambientParticles,
    particleVels,
    magicParticles,
    magicVels,
    floorCrestGroup,
    centreGlowMat,
    groundMesh,
    grid,
    loadMapGeometry,
    getActiveMapId: () => activeMapId,
  }
}
