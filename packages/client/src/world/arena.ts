import { getMap, type AABB } from '@ragequit/shared'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { createOutlineMesh } from '../render/outlines.js'

// The ArenaObjects interface returned by buildArena for main.ts.
export interface ArenaObjects {
  loadMapGeometry: (mapId: string) => boolean
  getActiveMapId: () => string
  animateArena: (now: number, dt: number, inHitStop: boolean) => void
}

// Sand floor radius — fits inside the coliseum inner ring (~22 m)
const SAND_RADIUS = 20

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

  // Outline border
  const outline = createOutlineMesh(m, 0.024, 0x050508)
  m.add(outline)

  return m
}

export function buildArena(scene: THREE.Scene, toonGradient: THREE.DataTexture): ArenaObjects {
  // ── Arena visual group containing all custom decorative fight-league assets ──
  const arenaVisualGroup = new THREE.Group()
  scene.add(arenaVisualGroup)
  const gltfLoader = new GLTFLoader()

  // ── Permanent coliseum shell (gladiators_arena.glb) ──────────────────────
  // The real tournament arena: an oval colosseum (~50×57 m, walls to ~20 m)
  // that wraps every gameplay map. It is purely decorative — collision is
  // still driven by the per-map AABB boxes — but it replaces the old flat
  // procedural void with a believable fighting pit. Loaded once, always shown.
  gltfLoader.load(
    '/arena/gladiators_arena.glb',
    (gltf) => {
      const model = gltf.scene
      // The GLB cylinder's inner floor is at local Y = -1.0.
      // Lift by +1 so the arena floor aligns with GROUND_Y = 0, letting
      // characters stand visually ON the coliseum surface.
      model.position.y = 1.0
      // Collect outlines during traversal, attach AFTER — adding a child mesh
      // mid-traverse causes infinite recursion (outline-of-outline).
      const outlines: Array<{ mesh: THREE.Mesh; outline: THREE.Mesh }> = []
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.castShadow = true
        child.receiveShadow = true
        const nodeName = child.name.toLowerCase()
        const isFlag = nodeName.includes('flag')
        // Apply explicit warm sandstone tones rather than the GLB material colour —
        // the original material is olive-grey which reads green under the scene's
        // cool hemisphere light. Warm sand/stone colours fight the blue tint.
        const stoneColor = nodeName.includes('door') ? new THREE.Color(0x8a6a40)
          : isFlag ? new THREE.Color(0x993322)
          : new THREE.Color(0xc0a060) // main arena sandstone
        child.material = new THREE.MeshToonMaterial({
          color: stoneColor,
          gradientMap: toonGradient,
          side: THREE.DoubleSide,
          emissive: isFlag ? new THREE.Color(0x330800) : new THREE.Color(0x000000),
          emissiveIntensity: isFlag ? 0.3 : 0.0,
        })
        outlines.push({ mesh: child, outline: createOutlineMesh(child, 0.02, 0x050508) })
      })
      for (const { mesh, outline } of outlines) mesh.add(outline)
      arenaVisualGroup.add(model)
    },
    undefined,
    (err) => console.warn('[arena] gladiators_arena shell load failed:', err),
  )

  // ── Torch lights + 3D torch models ringing the coliseum wall ──
  // Placed just inside the arena wall so they wash warm light across the pit.
  const TORCH_RING_R = 20
  const torchLights: THREE.PointLight[] = []
  for (let i = 0; i < 8; i += 2) { // 4 torch lights around the wall
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const x = Math.cos(a) * TORCH_RING_R
    const z = Math.sin(a) * TORCH_RING_R

    // PointLight: orange flicker
    const torch = new THREE.PointLight(0xff8832, 0.9, 22, 2)
    torch.position.set(x, 6.5, z)
    torch.layers.enable(1) // bloom-eligible
    arenaVisualGroup.add(torch)
    torchLights.push(torch)

    // 3D torch model (Torch_Metal.gltf)
    gltfLoader.load(
      '/arena/props/Torch_Metal.gltf',
      (gltf) => {
        const model = gltf.scene.clone()
        model.position.set(x, 5.6, z)
        model.rotation.y = -a // face inward toward arena
        model.scale.setScalar(0.8)

        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return
          child.castShadow = true
          // Convert to MeshToonMaterial — extract base color from source material
          const srcMat = child.material as THREE.MeshStandardMaterial | undefined
          const baseColor = srcMat?.color?.clone() ?? new THREE.Color(0xb87030)
          // Add warm emissive glow for the torch metal (hot metal look)
          const isFireBowl = child.name.toLowerCase().includes('bowl') ||
                             child.name.toLowerCase().includes('fire') ||
                             child.name.toLowerCase().includes('flame') ||
                             child.name.toLowerCase().includes('top')
          child.material = new THREE.MeshToonMaterial({
            color: baseColor,
            gradientMap: toonGradient,
            emissive: isFireBowl ? new THREE.Color(0xff6020) : new THREE.Color(0x000000),
            emissiveIntensity: isFireBowl ? 0.6 : 0.0,
          })
          child.layers.enable(1) // bloom-eligible (glows)
          // Dispose ORM/normal textures — MeshToonMaterial doesn't use them
          if (srcMat?.roughnessMap) srcMat.roughnessMap.dispose()
          if (srcMat?.normalMap) srcMat.normalMap.dispose()
          if (srcMat?.metalnessMap) srcMat.metalnessMap.dispose()
        })
        arenaVisualGroup.add(model)
      },
      undefined,
      (err) => console.warn('[arena] Torch_Metal load failed:', err),
    )
  }

  // ── Atmospheric drifting dust motes particles ──
  const pCount = 200
  const pGeo = new THREE.BufferGeometry()
  const pos = new Float32Array(pCount * 3)
  for (let i = 0; i < pCount; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * SAND_RADIUS * 1.8
    pos[i * 3] = Math.cos(a) * r
    pos[i * 3 + 1] = Math.random() * 15 + 0.2
    pos[i * 3 + 2] = Math.sin(a) * r
  }
  const dustPosAttr = new THREE.BufferAttribute(pos, 3)
  dustPosAttr.usage = THREE.DynamicDrawUsage
  pGeo.setAttribute('position', dustPosAttr)
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

  // ── 8. Outer ground plane and atmospheric sky dome ──
  const groundFar = new THREE.Mesh(
    new THREE.CircleGeometry(150, 32),
    new THREE.MeshBasicMaterial({ color: 0x05060a }),
  )
  groundFar.rotation.x = -Math.PI / 2
  groundFar.position.y = -0.12
  arenaVisualGroup.add(groundFar)

  // Sand fighting floor — exactly at GROUND_Y=0 so characters stand on it.
  // Radius 20 m fits inside the coliseum inner ring (~22 m).
  const sandFloor = new THREE.Mesh(
    new THREE.CircleGeometry(SAND_RADIUS, 48),
    new THREE.MeshToonMaterial({ color: 0x8a7040, gradientMap: toonGradient }),
  )
  sandFloor.rotation.x = -Math.PI / 2
  sandFloor.position.y = 0.0
  sandFloor.receiveShadow = true
  arenaVisualGroup.add(sandFloor)

  // ── 9. Sky dome — gradient from dark zenith to slightly lighter horizon ──
  const skyGeo = new THREE.SphereGeometry(180, 16, 8)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x05080f) },
      bottomColor: { value: new THREE.Color(0x0d1520) },
      offset:      { value: 40 },
      exponent:    { value: 0.55 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    depthWrite: false,
  })
  const skyDome = new THREE.Mesh(skyGeo, skyMat)
  arenaVisualGroup.add(skyDome)

  // ── Map geometry (dynamic, swapped by server schema) ──
  let activeMapId = ''
  const mapBoxMeshes: THREE.Mesh[] = []
  // gltfLoader declared above
  const arenaPropsGroup = new THREE.Group()
  arenaVisualGroup.add(arenaPropsGroup)

  interface PropSpawn {
    type: 'crate' | 'barrel' | 'banner' | 'barrel_large' | 'barrel_small' | 'box_large'
    pos: [number, number, number]
    rot: [number, number, number]
    scale: number
  }

  function spawnDecorativeProps(mapId: string): void {
    // Clear old props
    while (arenaPropsGroup.children.length > 0) {
      const child = arenaPropsGroup.children[0]!
      child.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry?.dispose()
          if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose())
          else (node.material as THREE.Material | undefined)?.dispose()
        }
      })
      arenaPropsGroup.remove(child)
    }

    const spawns: PropSpawn[] = []

    // 1. Mount banners on the inside face of the coliseum wall (~21 m ring).
    //    Y=4.5 sits mid-wall after the +1 m GLB offset, clearly visible from the pit.
    const BANNER_RING_R = 21
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      const x = Math.cos(a) * BANNER_RING_R
      const z = Math.sin(a) * BANNER_RING_R
      spawns.push({
        type: 'banner',
        pos: [x, 4.5, z],
        rot: [0, -a - Math.PI / 2, 0], // face toward arena center
        scale: 1.0,
      })
    }

    // 2. Stacked crates and barrels near corners / center — tactical cover.
    {
      // Corner stack 1 (North-East) — KayKit barrels + box
      spawns.push({ type: 'barrel_large', pos: [6, 0.5, 6], rot: [0, 0.2, 0], scale: 0.8 })
      spawns.push({ type: 'barrel_small', pos: [6.9, 0.3, 5.4], rot: [0, -0.4, 0], scale: 0.8 })
      spawns.push({ type: 'box_large', pos: [6.3, 0.45, 5.9], rot: [0, 0.5, 0], scale: 0.65 })

      // Corner stack 2 (North-West) — KayKit
      spawns.push({ type: 'barrel_large', pos: [-6.2, 0.5, 6], rot: [0, 0, 0], scale: 0.8 })
      spawns.push({ type: 'box_large', pos: [-6.9, 0.45, 5.2], rot: [0, 0.6, 0], scale: 0.65 })

      // Corner stack 3 (South-East) — KayKit
      spawns.push({ type: 'barrel_large', pos: [7, 0.5, -5.5], rot: [0, 0.1, 0], scale: 0.8 })
      spawns.push({ type: 'barrel_small', pos: [6.1, 0.3, -6.3], rot: [0, -0.3, 0], scale: 0.8 })

      // Corner stack 4 (South-West) — KayKit
      spawns.push({ type: 'box_large', pos: [-6, 0.45, -6], rot: [0, -0.15, 0], scale: 0.75 })
      spawns.push({ type: 'barrel_small', pos: [-5.7, 0.3, -6], rot: [0, 0.3, 0], scale: 0.8 })

      // Center cover
      if (mapId === 'blockout') {
        spawns.push({ type: 'box_large', pos: [2.0, 0.45, 0], rot: [0, 0, 0], scale: 0.7 })
        spawns.push({ type: 'barrel_large', pos: [-2.0, 0.5, 0], rot: [0, 0.5, 0], scale: 0.8 })
      } else if (mapId === 'duel_arena') {
        spawns.push({ type: 'box_large', pos: [5.2, 0.45, 3.2], rot: [0, 0.4, 0], scale: 0.7 })
        spawns.push({ type: 'barrel_large', pos: [-5.2, 0.5, -3.2], rot: [0, -0.4, 0], scale: 0.8 })
      }
    }

    // Load and instantiate GLTFs.
    // spawnMapId is captured once per spawnDecorativeProps call; if the map
    // changes while a GLTF is still loading we discard the stale model.
    const spawnMapId = mapId
    const filenameMap: Record<string, string> = {
      crate: 'Crate_Wooden',
      barrel: 'Barrel',
      banner: 'banner_patternA_red',
      barrel_large: 'barrel_large',
      barrel_small: 'barrel_small',
      box_large: 'box_large',
    }
    spawns.forEach((s) => {
      const filename = filenameMap[s.type] ?? 'Crate_Wooden'
      gltfLoader.load(
        `/arena/props/${filename}.gltf`,
        (gltf) => {
          if (activeMapId !== spawnMapId) return // Discard if map switched in flight
          const model = gltf.scene.clone()
          model.position.set(...s.pos)
          model.rotation.set(...s.rot)
          model.scale.setScalar(s.scale)

          // Collect outlines during traversal, attach AFTER — adding a child
          // mesh mid-traverse causes infinite recursion (outline-of-outline).
          const propOutlines: Array<{ mesh: THREE.Mesh; outline: THREE.Mesh }> = []
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true

              const src = child.material as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
              const color = src?.color?.clone() ?? new THREE.Color(0xffffff)

              child.material = new THREE.MeshToonMaterial({
                color,
                gradientMap: toonGradient,
                side: THREE.DoubleSide,
              })

              propOutlines.push({ mesh: child, outline: createOutlineMesh(child, 0.016, 0x050508) })
            }
          })
          for (const { mesh, outline } of propOutlines) mesh.add(outline)
          arenaPropsGroup.add(model)
        },
        undefined,
        (err) => {
          console.error(`[arena] Failed to load prop ${s.type}:`, err)
        }
      )
    })
  }

  function loadMapGeometry(mapId: string): boolean {
    if (mapId === activeMapId) return false
    activeMapId = mapId
    
    // Clean up inactive box meshes
    for (const m of mapBoxMeshes) {
      scene.remove(m)
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
    mapBoxMeshes.length = 0

    const map = getMap(mapId)

    // Shift entire visual arena (floor, walls, pillars, sigils, dust) to ground level
    arenaVisualGroup.position.y = map.groundY

    // Spawn map cover blocks as carved stone columns/walls.
    // Using fully saturated warm ochre/amber tones so they read as stone
    // rather than grey-green under the scene's cool hemisphere light.
    for (const b of map.boxes) {
      const height = b.maxY - b.minY
      // Tall pillars: bright warm gold. Mid walls: amber. Low covers: dark sand.
      const color = height > 2.5 ? 0xd4a040 : height > 1.4 ? 0xb07830 : 0x8a5c28
      const m = makeBoxMesh(b, color, toonGradient)
      scene.add(m)
      mapBoxMeshes.push(m)
    }

    // Spawn decorative props for tournament look
    spawnDecorativeProps(mapId)
    return true
  }

  // Load blockout map by default
  loadMapGeometry('blockout')

  function animateArena(now: number, dt: number, inHitStop: boolean): void {
    // Torch flicker — each light has a slightly different phase offset
    if (!inHitStop) {
      for (let i = 0; i < torchLights.length; i++) {
        const torch = torchLights[i]!
        const flicker = 0.7 + 0.3 * Math.sin(now * 0.0047 + i * 1.618) +
                        0.08 * Math.sin(now * 0.019 + i * 2.4)
        torch.intensity = 0.85 * flicker
      }
    }

    // Drift dust motes particles — uses DynamicDrawUsage for efficient GPU upload
    if (!inHitStop) {
      const paArr = dustPosAttr.array as Float32Array
      for (let i = 0; i < pCount; i++) {
        const yIndex = i * 3 + 1
        const yVal = paArr[yIndex]
        if (yVal !== undefined) {
          const nextY = yVal + dt * 0.003
          paArr[yIndex] = nextY > 15 ? 0.1 : nextY
        }
      }
      dustPosAttr.needsUpdate = true
    }
  }

  return {
    loadMapGeometry,
    getActiveMapId: () => activeMapId,
    animateArena,
  }
}
