import { getMap, type AABB } from '@ragequit/shared'
import * as THREE from 'three'

// Only the three properties that main.ts needs. Everything else (arenaRing,
// torchLights, particles, etc.) is fully encapsulated inside buildArena.
export interface ArenaObjects {
  loadMapGeometry: (mapId: string) => void
  getActiveMapId: () => string
  animateArena: (now: number, dt: number, inHitStop: boolean) => void
}

const GROUND_SIZE = 80
const ARENA_R = 30
const ARENA_N = 8
const PARTICLE_COUNT = 260
const MAGIC_COUNT = 110

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

/** Procedural stone-tile texture: 512×512 canvas with 16×16 mortar grid. */
function makeStoneGroundTexture(): THREE.CanvasTexture {
  const size = 512
  const tileCount = 16
  const ts = size / tileCount
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#1a2234'
  ctx.fillRect(0, 0, size, size)

  // Per-tile brightness variation for stone wear effect.
  for (let tx = 0; tx < tileCount; tx++) {
    for (let ty = 0; ty < tileCount; ty++) {
      // Use tx/ty with a small deterministic offset instead of Math.random()
      // so the texture is visually varied but doesn't change each reload.
      const h = (tx * 7 + ty * 13) % 17
      const r = 28 + h,
        g = 42 + h,
        b = 54 + h
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(tx * ts + 2, ty * ts + 2, ts - 4, ts - 4)

      // Very subtle inner highlight on upper-left edge of each tile.
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.fillRect(tx * ts + 2, ty * ts + 2, ts - 4, 2)
      ctx.fillRect(tx * ts + 2, ty * ts + 2, 2, ts - 4)
    }
  }

  // Mortar/grout lines (dark, slightly raised look).
  ctx.strokeStyle = '#111820'
  ctx.lineWidth = 3
  for (let i = 0; i <= tileCount; i++) {
    ctx.beginPath()
    ctx.moveTo(i * ts, 0)
    ctx.lineTo(i * ts, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i * ts)
    ctx.lineTo(size, i * ts)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(5, 5) // tiles span the full 80-unit ground
  return tex
}

export function buildArena(scene: THREE.Scene, toonGradient: THREE.DataTexture): ArenaObjects {
  // ── Ground ────────────────────────────────────────────────────────────────
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1),
    new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: makeStoneGroundTexture(),
      gradientMap: toonGradient,
    }),
  )
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.receiveShadow = true
  scene.add(groundMesh)

  const innerFloor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 40),
    new THREE.MeshBasicMaterial({ color: 0x232e40, transparent: true, opacity: 0.7 }),
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

  const arenaRingHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff2200,
    transparent: true,
    opacity: 0.18,
  })
  const arenaRingHalo = new THREE.Mesh(
    new THREE.TorusGeometry(GROUND_SIZE / 2 - 0.2, 1.2, 6, 72),
    arenaRingHaloMat,
  )
  arenaRingHalo.rotation.x = Math.PI / 2
  arenaRingHalo.position.y = 0.04
  scene.add(arenaRingHalo)

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(30, 0.15, 6, 60),
    new THREE.MeshBasicMaterial({ color: 0x3a5080, transparent: true, opacity: 0.5 }),
  )
  innerRing.rotation.x = Math.PI / 2
  innerRing.position.y = 0.004
  scene.add(innerRing)

  const midRing = new THREE.Mesh(
    new THREE.TorusGeometry(15, 0.1, 6, 48),
    new THREE.MeshBasicMaterial({ color: 0x2a4880, transparent: true, opacity: 0.42 }),
  )
  midRing.rotation.x = Math.PI / 2
  midRing.position.y = 0.004
  scene.add(midRing)

  const centreGlowMat = new THREE.MeshBasicMaterial({
    color: 0x1832c0,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  })
  const centreGlow = new THREE.Mesh(new THREE.CircleGeometry(6.0, 48), centreGlowMat)
  centreGlow.rotation.x = -Math.PI / 2
  centreGlow.position.y = 0.005
  scene.add(centreGlow)

  // 8 spawn-pad markers
  {
    const spawnMat = new THREE.MeshBasicMaterial({
      color: 0x406090,
      transparent: true,
      opacity: 0.55,
    })
    const spawnMat2 = new THREE.MeshBasicMaterial({
      color: 0x2a4870,
      transparent: true,
      opacity: 0.38,
    })
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const r2 = 22
      const cx = Math.sin(angle) * r2,
        cz = Math.cos(angle) * r2
      const outer = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.6, 4), spawnMat)
      outer.rotation.x = -Math.PI / 2
      outer.rotation.z = angle + Math.PI / 4
      outer.position.set(cx, 0.008, cz)
      scene.add(outer)
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.3, 4), spawnMat2)
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
  // All architectural meshes live inside procColosseumGroup so they can be
  // hidden with a single flag when the GLB shell loads successfully.
  const procColosseumGroup = new THREE.Group()
  scene.add(procColosseumGroup)
  const torchLights: THREE.PointLight[] = []
  {
    const pillarMat = new THREE.MeshToonMaterial({ color: 0x28384e, gradientMap: toonGradient })
    const wallMat = new THREE.MeshToonMaterial({ color: 0x1c2a3a, gradientMap: toonGradient })
    const capMat = new THREE.MeshToonMaterial({ color: 0x374d66, gradientMap: toonGradient })
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.46, 7.0, 12)
    const capGeo = new THREE.CylinderGeometry(0.6, 0.4, 0.4, 12)
    const baseGeo = new THREE.CylinderGeometry(0.62, 0.7, 0.32, 12)
    const bandMat = new THREE.MeshBasicMaterial({
      color: 0x2090b8,
      transparent: true,
      opacity: 0.75,
    })

    for (let i = 0; i < ARENA_N; i++) {
      const a1 = (i / ARENA_N) * Math.PI * 2
      const a2 = ((i + 1) / ARENA_N) * Math.PI * 2
      const px = Math.sin(a1) * ARENA_R,
        pz = Math.cos(a1) * ARENA_R
      const qx = Math.sin(a2) * ARENA_R,
        qz = Math.cos(a2) * ARENA_R
      const mx = (px + qx) / 2,
        mz = (pz + qz) / 2
      const wallLen = Math.hypot(qx - px, qz - pz) - 1.1
      const wallYaw = Math.atan2(qx - px, qz - pz)

      const shaft = new THREE.Mesh(pillarGeo, pillarMat)
      shaft.position.set(px, 3.5, pz)
      shaft.castShadow = true
      shaft.receiveShadow = true
      procColosseumGroup.add(shaft)
      const cap = new THREE.Mesh(capGeo, capMat)
      cap.position.set(px, 7.2, pz)
      procColosseumGroup.add(cap)
      const base = new THREE.Mesh(baseGeo, capMat)
      base.position.set(px, 0.16, pz)
      procColosseumGroup.add(base)
      // Two decorative bands — lower and mid-shaft.
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.048, 6, 26), bandMat)
      band.position.set(px, 3.2, pz)
      band.rotation.x = Math.PI / 2
      procColosseumGroup.add(band)
      const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 6, 26), bandMat)
      band2.position.set(px, 1.6, pz)
      band2.rotation.x = Math.PI / 2
      procColosseumGroup.add(band2)

      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallLen, 2.2, 0.52), wallMat)
      wall.position.set(mx, 1.1, mz)
      wall.rotation.y = wallYaw
      wall.castShadow = true
      wall.receiveShadow = true
      procColosseumGroup.add(wall)
      for (let c = -1; c <= 1; c++) {
        const cOff = c * wallLen * 0.28
        const crenel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.58), capMat)
        crenel.position.set(mx + Math.sin(wallYaw) * cOff, 2.42, mz + Math.cos(wallYaw) * cOff)
        crenel.rotation.y = wallYaw
        procColosseumGroup.add(crenel)
      }

      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff9930,
        transparent: true,
        opacity: 0.9,
      })
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 8), flameMat)
      flame.position.set(px, 7.65, pz)
      procColosseumGroup.add(flame)
      const innerFlameMat = new THREE.MeshBasicMaterial({
        color: 0xffee80,
        transparent: true,
        opacity: 0.8,
      })
      const innerFlame2 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 8), innerFlameMat)
      innerFlame2.position.set(px, 7.72, pz)
      procColosseumGroup.add(innerFlame2)
      const bowlMat = new THREE.MeshToonMaterial({ color: 0x5a3a1a, gradientMap: toonGradient })
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.18, 8), bowlMat)
      bowl.position.set(px, 7.47, pz)
      procColosseumGroup.add(bowl)
      const torch = new THREE.PointLight(0xffbb66, 0.28, 12, 2)
      torch.position.set(px, 7.8, pz)
      // Lights must stay in the scene (not the group) — group.visible=false would
      // hide their illumination too. Move torch to scene but keep positional sync.
      scene.add(torch)
      torchLights.push(torch)
    }
  }

  // ── Cardinal floor compass rose ───────────────────────────────────────────
  {
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x3a5070,
      transparent: true,
      opacity: 0.38,
    })
    for (let i = 0; i < 4; i++) {
      const lineMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 28), lineMat)
      lineMesh.rotation.x = -Math.PI / 2
      lineMesh.rotation.z = (i / 4) * Math.PI * 2
      lineMesh.position.y = 0.006
      scene.add(lineMesh)
    }
  }

  // ── Central combat crest ──────────────────────────────────────────────────
  const floorCrestGroup = new THREE.Group()
  floorCrestGroup.position.y = 0.007
  scene.add(floorCrestGroup)
  {
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x1830a0,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    })
    const disc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 48), discMat)
    disc.rotation.x = -Math.PI / 2
    floorCrestGroup.add(disc)
    const rings: [number, number, number, number][] = [
      [5.2, 0.12, 0x4060d8, 0.55],
      [3.8, 0.08, 0x3050c0, 0.45],
      [2.2, 0.07, 0x5070e0, 0.42],
      [0.8, 0.06, 0x6080f0, 0.5],
    ]
    for (const [r, w, col, op] of rings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - w / 2, r + w / 2, 52),
        new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: op,
          side: THREE.DoubleSide,
        }),
      )
      ring.rotation.x = -Math.PI / 2
      floorCrestGroup.add(ring)
    }
    const spokeMat = new THREE.MeshBasicMaterial({
      color: 0x4060d0,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    })
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 5.0), spokeMat)
      spoke.rotation.x = -Math.PI / 2
      spoke.rotation.z = (i / 6) * Math.PI * 2
      floorCrestGroup.add(spoke)
    }
    const markMat = new THREE.MeshBasicMaterial({
      color: 0x6090ff,
      transparent: true,
      opacity: 0.6,
    })
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), markMat)
      mark.rotation.x = -Math.PI / 2
      mark.rotation.z = angle + Math.PI / 4
      mark.position.set(Math.sin(angle) * 5.2, 0, Math.cos(angle) * 5.2)
      floorCrestGroup.add(mark)
    }
  }

  // ── Ceiling canopy + overhead spots ──────────────────────────────────────
  {
    const ceilingRing = new THREE.Mesh(
      new THREE.TorusGeometry(24, 0.22, 6, 64),
      new THREE.MeshBasicMaterial({ color: 0x2a4060, transparent: true, opacity: 0.5 }),
    )
    ceilingRing.rotation.x = Math.PI / 2
    ceilingRing.position.y = 15
    scene.add(ceilingRing)
    const ceilingRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(12, 0.12, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0x3050a0, transparent: true, opacity: 0.38 }),
    )
    ceilingRing2.rotation.x = Math.PI / 2
    ceilingRing2.position.y = 15
    scene.add(ceilingRing2)
    const spotCols = [0x2060c0, 0xb02020, 0x2060c0, 0xb02020]
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const spot = new THREE.PointLight(spotCols[i]!, 0.5, 32, 2)
      spot.position.set(Math.sin(angle) * 20, 13, Math.cos(angle) * 20)
      scene.add(spot)
    }
  }

  // ── Decorative stone plinths at 4 diagonal mid-points (r=16) ────────────
  // These break up the open ground, provide visual cover landmarks, and give
  // the arena more of a "built" feel vs. plain blockout geometry.
  {
    const plinthMat = new THREE.MeshToonMaterial({ color: 0x304060, gradientMap: toonGradient })
    const plinthTopMat = new THREE.MeshToonMaterial({ color: 0x3d5070, gradientMap: toonGradient })
    const glyphGlowMat = new THREE.MeshBasicMaterial({
      color: 0x3068d8,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    })
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4 // diagonals
      const px = Math.sin(angle) * 16,
        pz = Math.cos(angle) * 16
      // Main plinth body
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6), plinthMat)
      body.position.set(px, 0.45, pz)
      body.castShadow = true
      body.receiveShadow = true
      scene.add(body)
      // Wider base step
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 2.0), plinthMat)
      step.position.set(px, 0.11, pz)
      step.receiveShadow = true
      scene.add(step)
      // Top cap
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 1.8), plinthTopMat)
      top.position.set(px, 0.97, pz)
      scene.add(top)
      // Glowing decorative sigil on top face.
      const sigil = new THREE.Mesh(new THREE.CircleGeometry(0.48, 6), glyphGlowMat)
      sigil.rotation.x = -Math.PI / 2
      sigil.position.set(px, 1.05, pz)
      scene.add(sigil)
    }
  }

  // ── Ambient particles ─────────────────────────────────────────────────────
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
  const particleVels = new Float32Array(PARTICLE_COUNT * 3)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ring = i < 140
    const spread = ring ? 28 : 52
    particlePositions[i * 3] = (Math.random() - 0.5) * spread
    // Start at y ≥ 2 so ground-level and low-jump camera doesn't fly through them.
    particlePositions[i * 3 + 1] = 2 + Math.random() * (ring ? 8 : 20)
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * spread
    particleVels[i * 3] = (Math.random() - 0.5) * 0.003
    particleVels[i * 3 + 1] = (ring ? 0.006 : 0.003) + Math.random() * 0.007
    particleVels[i * 3 + 2] = (Math.random() - 0.5) * 0.003
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  const ambientParticles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
      color: 0x6090cc, // cool blue-grey — was warm orange 0xff8866 which caused yellow haze
      size: 0.07,
      transparent: true,
      opacity: 0.18,   // was 0.42; halved so they don't fog the arena from above
      sizeAttenuation: true,
    }),
  )
  scene.add(ambientParticles)

  // Wall accent lights
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8
    const wl = new THREE.PointLight(0x3040c0, 0.22, 20, 2)
    wl.position.set(Math.sin(angle) * 28, 0.8, Math.cos(angle) * 28)
    scene.add(wl)
  }

  // ── Magic dust particles ──────────────────────────────────────────────────
  const magicPositions = new Float32Array(MAGIC_COUNT * 3)
  const magicVels = new Float32Array(MAGIC_COUNT * 3)
  for (let i = 0; i < MAGIC_COUNT; i++) {
    const r = 8 + Math.random() * 28
    const a = Math.random() * Math.PI * 2
    magicPositions[i * 3] = Math.cos(a) * r
    magicPositions[i * 3 + 1] = Math.random() * 20
    magicPositions[i * 3 + 2] = Math.sin(a) * r
    magicVels[i * 3] = -Math.sin(a) * 0.0018 + (Math.random() - 0.5) * 0.001
    magicVels[i * 3 + 1] = 0.0015 + Math.random() * 0.003
    magicVels[i * 3 + 2] = Math.cos(a) * 0.0018 + (Math.random() - 0.5) * 0.001
  }
  const magicGeo = new THREE.BufferGeometry()
  magicGeo.setAttribute('position', new THREE.BufferAttribute(magicPositions, 3))
  const magicParticles = new THREE.Points(
    magicGeo,
    new THREE.PointsMaterial({
      color: 0x60a8ff,
      size: 0.065,
      transparent: true,
      opacity: 0.32,
      sizeAttenuation: true,
    }),
  )
  scene.add(magicParticles)

  // The old decorative GLB shell is intentionally not mounted here: in-game it
  // placed large cloth-like shapes inside the player's view cone. The procedural
  // arena keeps silhouettes clean until the shell asset is curated for gameplay.

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
      scene.add(m)
      mapBoxMeshes.push(m)
    }
  }

  loadMapGeometry('blockout')

  function animateArena(now: number, dt: number, inHitStop: boolean): void {
    const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.001)
    const arenaRingMat = arenaRing.material as THREE.MeshBasicMaterial
    arenaRingMat.opacity = 0.32 + ringPulse * 0.4
    arenaRingMat.color.setRGB(1.0, 0.12 + ringPulse * 0.18, 0.03 + ringPulse * 0.08)
    const haloPulse = 0.5 + 0.5 * Math.sin(now * 0.001 + 1.2)
    arenaRingHaloMat.opacity = 0.08 + haloPulse * 0.16

    if (!inHitStop) {
      const pAttr = ambientParticles.geometry.attributes['position'] as THREE.BufferAttribute
      const pArr = pAttr.array as Float32Array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i0 = i * 3,
          i1 = i0 + 1,
          i2 = i0 + 2
        pArr[i0] = (pArr[i0] ?? 0) + (particleVels[i0] ?? 0)
        pArr[i1] = (pArr[i1] ?? 0) + (particleVels[i1] ?? 0)
        pArr[i2] = (pArr[i2] ?? 0) + (particleVels[i2] ?? 0)
        if ((pArr[i1] ?? 0) > 18) {
          pArr[i1] = 2
          pArr[i0] = (Math.random() - 0.5) * 56
          pArr[i2] = (Math.random() - 0.5) * 56
        }
      }
      ;(ambientParticles.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate =
        true

      for (let i = 0; i < torchLights.length; i++) {
        const t = torchLights[i]!
        const f =
          0.44 +
          0.3 * Math.sin(now * 0.0024 + i * 1.57) +
          0.14 * Math.sin(now * 0.0097 + i * 0.82) +
          0.06 * Math.sin(now * 0.0213 + i * 2.1)
        t.intensity = Math.max(0.08, f)
      }

      const mAttr = magicParticles.geometry.attributes['position'] as THREE.BufferAttribute
      const mArr = mAttr.array as Float32Array
      for (let i = 0; i < MAGIC_COUNT; i++) {
        const i0 = i * 3,
          i1 = i0 + 1,
          i2 = i0 + 2
        mArr[i0] = (mArr[i0] ?? 0) + (magicVels[i0] ?? 0)
        mArr[i1] = (mArr[i1] ?? 0) + (magicVels[i1] ?? 0)
        mArr[i2] = (mArr[i2] ?? 0) + (magicVels[i2] ?? 0)
        if ((mArr[i1] ?? 0) > 22) {
          const r2 = 8 + Math.random() * 28,
            a2 = Math.random() * Math.PI * 2
          mArr[i0] = Math.cos(a2) * r2
          mArr[i1] = 0
          mArr[i2] = Math.sin(a2) * r2
        }
      }
      ;(magicParticles.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true

      floorCrestGroup.rotation.y += 0.00012 * dt
      centreGlowMat.opacity = 0.12 + 0.1 * Math.sin(now * 0.0012)
    }
  }

  return {
    loadMapGeometry,
    getActiveMapId: () => activeMapId,
    animateArena,
  }
}
