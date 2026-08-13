import { getMap, type AABB } from '@ragequit/shared'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'

import { VfxTextures } from '../render/vfx-textures.js'

import { makeArenaFloorTexture } from './arena-floor-texture.js'
import { getStoneTexture } from './stone-texture.js'

// ─────────────────────────────────────────────────────────────────────────────
// VERTICAL COORDINATE SYSTEM (read before touching any *.position.y here)
// ─────────────────────────────────────────────────────────────────────────────
// • GROUND_Y = 0 is the world floor. The server physics capsule rests with its
//   FEET at y=0 and its CENTRE at y=CAPSULE_HALF_HEIGHT (0.9). Characters are
//   rendered with feet anchored to y≈0 (see characters.ts _installCharacterModel).
// • The sand fighting floor sits at y≈0 (a hair below, so feet never clip it).
// • The gladiators_arena.glb is authored with its TERRACE/ARENA FLOOR surface at
//   local y=+1 (a wide horizontal band at radius 16.7–26.8). It must therefore be
//   dropped by 1 m (model.position.y = -1) so that floor lands on world y=0 —
//   i.e. LEVEL with the players' feet. Any other offset makes players look sunk
//   into a pit (the surrounding coliseum floor rises to their knees/waist) or
//   makes the floor float above them. Do NOT change the offset without
//   re-measuring the GLB floor band.
// ─────────────────────────────────────────────────────────────────────────────

// The ArenaObjects interface returned by buildArena for main.ts.
export interface ArenaObjects {
  loadMapGeometry: (mapId: string) => boolean
  getActiveMapId: () => string
  animateArena: (now: number, dt: number, inHitStop: boolean) => void
}

// Sand floor radius — fills the gladiator PIT, bounded by the coliseum's inner
// barrier wall at radius ~16.7 m. Must NOT exceed it, or the flat sand plane
// pokes through the sloped spectator seating and appears "halfway up the arena".
// Whole-shell scale — widens the native pit (inner wall r≈16.7) to r≈25 so the
// enlarged maps fit. Sand radius tracks it (must stay inside the barrier wall).
const ARENA_SHELL_SCALE = 1.5
const SAND_RADIUS = 16.5 * ARENA_SHELL_SCALE

function makeBoxMesh(box: AABB, color: number): THREE.Mesh {
  const sx = box.maxX - box.minX
  const sy = box.maxY - box.minY
  const sz = box.maxZ - box.minZ
  // Carved-stone map: a greyscale ashlar texture (map × color keeps the height tint)
  // so cover blocks read as cut masonry, not flat plastic cubes. Per-box texture
  // clone with a size-scaled repeat keeps the block course ~2 m regardless of box
  // dimensions (clones share the canvas image, so no extra GPU upload cost).
  const stone = getStoneTexture().clone()
  stone.repeat.set(Math.max(1, Math.round(sx * 0.5)), Math.max(1, Math.round(sy * 0.5)))
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    // PBR carved stone (STILE.md §2): the greyscale ashlar map tints the warm
    // colour; high roughness, non-metal. No toon ramp, no black outline.
    new THREE.MeshStandardMaterial({ color, map: stone, roughness: 0.9, metalness: 0.0 }),
  )
  m.position.set((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, (box.minZ + box.maxZ) / 2)
  m.castShadow = true
  m.receiveShadow = true

  return m
}

/**
 * A 32x32 radial-gradient dot, used as the dust sprite.
 *
 * Without a map, THREE.PointsMaterial renders each point as a hard square —
 * which is exactly what it looks like when one passes close to the camera.
 */
function makeSoftDotTexture(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const ctx = c.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
  }
  return c
}

export function buildArena(scene: THREE.Scene, _toonGradient: THREE.DataTexture): ArenaObjects {
  // ── Arena visual group containing all custom decorative fight-league assets ──
  const arenaVisualGroup = new THREE.Group()
  scene.add(arenaVisualGroup)
  // Cache fetched GLTF/bin responses by URL so the shared prop files (torches,
  // barrels, banners) are fetched + parsed once instead of per spawn entry.
  THREE.Cache.enabled = true
  const gltfLoader = new GLTFLoader()
  const gltfCache = new Map<string, Promise<GLTF>>()
  const propTextureLoader = new THREE.TextureLoader()
  const propAssetBaseUrl = new URL('/arena/props/', window.location.href)
  const sharedPropTextureNames = [
    'T_Trim_Metal_BaseColor.png',
    'T_Trim_Metal_Normal.png',
    'T_Trim_Metal_ORM.png',
    'dungeon_texture.png',
  ]
  const sharedPropTextures = new Map<string, THREE.Texture>()
  const sharedPropTexturesReady = Promise.all(
    sharedPropTextureNames.map((filename) =>
      propTextureLoader.loadAsync(new URL(filename, propAssetBaseUrl).href),
    ),
  ).then((textures) => {
    textures.forEach((texture, index) => {
      const filename = sharedPropTextureNames[index]!
      const sourceName = filename.replace(/\.png$/, '')
      texture.name = sourceName
      // Colour-space rule: base colour and emissive are sRGB, normal and ORM
      // are raw linear data. GLTFLoader tags this correctly, but cloneGltfScene
      // below swaps each material's map for the hand-loaded texture here, and
      // TextureLoader leaves colorSpace unset — so every prop's albedo was being
      // decoded as if it were linear. That is what made the torches, barrels and
      // crates read milky and washed-out next to the coliseum shell, which is
      // loaded by GLTFLoader and was therefore always right.
      const isColour = /BaseColor|dungeon_texture/i.test(sourceName)
      texture.colorSpace = isColour ? THREE.SRGBColorSpace : THREE.NoColorSpace
      sharedPropTextures.set(sourceName, texture)
    })
  })

  function loadGltf(url: string): Promise<GLTF> {
    const cached = gltfCache.get(url)
    if (cached) return cached
    const pending = gltfLoader.loadAsync(url)
    gltfCache.set(url, pending)
    return pending
  }

  function loadPropGltf(url: string): Promise<GLTF> {
    return sharedPropTexturesReady.then(() => loadGltf(url))
  }

  // Cached scenes share GPU resources. Each placed instance gets its own
  // geometry/material objects so map cleanup can dispose it safely without
  // invalidating the cached source or another live instance.
  function cloneGltfScene(source: THREE.Group): THREE.Group {
    const model = source.clone(true)
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.geometry = child.geometry.clone()
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial
        for (const slot of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const) {
          const authored = standard[slot]
          const shared = authored ? sharedPropTextures.get(authored.name) : undefined
          if (shared) standard[slot] = shared
        }
      }
    })
    return model
  }

  // ── Permanent coliseum shell (gladiators_arena.glb) ──────────────────────
  // The real tournament arena: an oval colosseum (~50×57 m, walls to ~20 m)
  // that wraps every gameplay map. It is purely decorative — collision is
  // still driven by the per-map AABB boxes — but it replaces the old flat
  // procedural void with a believable fighting pit. Loaded once, always shown.
  void loadGltf('/arena/gladiators_arena.glb')
    .then((gltf) => {
      const model = gltf.scene
      // Arena ×1.5: the native pit (inner wall at r≈16.7) was cramped for ranged
      // play. Uniform scale widens the fighting pit to r≈25 to match the enlarged
      // gameplay maps; the floor-band drop (local +1, see below) scales with it.
      model.scale.setScalar(ARENA_SHELL_SCALE)
      // The coliseum's arena/terrace FLOOR surface is at local Y = +1 (a wide
      // horizontal band, radius 16.7–26.8). To make players stand level with
      // that floor (instead of in a 1 m-deep pit where the floor reaches their
      // knees) we drop the whole model by 1 m (scaled) so its terrace floor
      // lands on GROUND_Y = 0 — where the sand disc and characters' feet are.
      model.position.y = -1.0 * ARENA_SHELL_SCALE
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.castShadow = true
        child.receiveShadow = true
        const nodeName = child.name.toLowerCase()
        const isFlag = nodeName.includes('flag')
        // PBR sandstone (STILE.md §2): keep the GLB's normal/roughness detail but
        // override the olive-grey albedo with warm stone tones so it doesn't read
        // green under the cool hemisphere light. High roughness, non-metal.
        const src = child.material as THREE.MeshStandardMaterial | undefined
        const stoneColor = nodeName.includes('door')
          ? new THREE.Color(0x8a6a40)
          : isFlag
            ? new THREE.Color(0x993322)
            : new THREE.Color(0xc0a060) // main arena sandstone
        child.material = new THREE.MeshStandardMaterial({
          color: stoneColor,
          map: src?.map ?? null,
          normalMap: src?.normalMap ?? null,
          roughnessMap: src?.roughnessMap ?? null,
          aoMap: src?.aoMap ?? null,
          roughness: 0.9,
          metalness: 0.0,
          side: THREE.DoubleSide,
          emissive: isFlag ? new THREE.Color(0x330800) : new THREE.Color(0x000000),
          emissiveIntensity: isFlag ? 0.3 : 0.0,
        })
      })
      arenaVisualGroup.add(model)
    })
    .catch((err: unknown) => console.warn('[arena] gladiators_arena shell load failed:', err))

  // ── Torch lights + 3D torch models ringing the coliseum wall ──
  // Placed just inside the arena wall so they wash warm light across the pit.
  // Just inside the pit's barrier wall (~16.7 m) so the braziers sit ON the visible
  // inner wall face and read from the floor — at the old r=20 they were buried in
  // the wall and never seen.
  const TORCH_RING_R = 16 * ARENA_SHELL_SCALE
  const GOD_RAY_HEIGHT = 4.6 // flame (y≈4.7) down to just above the floor
  const torchLights: THREE.PointLight[] = []
  const torchFlames: THREE.Sprite[] = []
  const godRayMats: THREE.ShaderMaterial[] = []
  for (let i = 0; i < 8; i += 2) {
    // 4 torch lights around the wall
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const x = Math.cos(a) * TORCH_RING_R
    const z = Math.sin(a) * TORCH_RING_R

    // PointLight: orange flicker — boosted to be the DOMINANT light in the now-dark
    // arena, throwing long warm pools across the stone (dark-fantasy torchlight).
    const torch = new THREE.PointLight(0xff7521, 18, 30, 2)
    torch.position.set(x, 5.0, z)
    torch.layers.enable(1) // bloom-eligible
    arenaVisualGroup.add(torch)
    torchLights.push(torch)

    // Visible flame — an additive, camera-facing sprite at the bowl so the torch
    // reads as a lit brazier (the light alone had no source). Bloom-eligible, and
    // flickered in lock-step with its PointLight in animateArena.
    const flame = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: VfxTextures.fire,
        color: 0xff7a20,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
      }),
    )
    flame.position.set(x, 4.7, z)
    flame.scale.set(0.85, 1.35, 1)
    flame.layers.enable(1)
    arenaVisualGroup.add(flame)
    torchFlames.push(flame)

    // God-ray light shaft (STILE §5, "economici, non volumetrici"): a cheap
    // additive cone narrowing to a point at the flame, fading to nothing at
    // the floor. Same top/bottom vertex-gradient trick as the sky dome below
    // (no new texture, no per-fragment branching) so torches read as actual
    // light sources instead of floating flame sprites.
    const godRayHalfHeight = GOD_RAY_HEIGHT / 2
    const godRayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(0xffa050) },
        uOpacity: { value: 0.09 },
        uHalfHeight: { value: godRayHalfHeight },
      },
      vertexShader: `
        varying float vT;
        uniform float uHalfHeight;
        void main() {
          // 1 at the apex (torch flame), 0 at the base (floor).
          vT = clamp((position.y + uHalfHeight) / (uHalfHeight * 2.0), 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vT;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          gl_FragColor = vec4(uColor, uOpacity * vT);
        }
      `,
    })
    const godRay = new THREE.Mesh(
      new THREE.ConeGeometry(1.3, GOD_RAY_HEIGHT, 10, 1, true),
      godRayMat,
    )
    // Apex at the flame (y≈4.7), base fading out at the floor.
    godRay.position.set(x, 4.7 - godRayHalfHeight, z)
    godRay.layers.enable(1) // bloom-eligible, matches the flame sprite
    arenaVisualGroup.add(godRay)
    godRayMats.push(godRayMat)

    // 3D torch model (Torch_Metal.gltf)
    void loadPropGltf('/arena/props/Torch_Metal.gltf')
      .then((gltf) => {
        const model = cloneGltfScene(gltf.scene)
        model.position.set(x, 3.7, z)
        model.rotation.y = -a // face inward toward arena
        model.scale.setScalar(0.6)

        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return
          child.castShadow = true
          // Keep the GLB's authored PBR material (BaseColor+Normal+ORM) — STILE.md
          // §2: dark iron reads from its roughness/metal maps under the torch light.
          // Only add the hot-metal emissive on the fire bowl, and gate bloom to it.
          const mat = child.material as THREE.MeshStandardMaterial | undefined
          const isFireBowl =
            child.name.toLowerCase().includes('bowl') ||
            child.name.toLowerCase().includes('fire') ||
            child.name.toLowerCase().includes('flame') ||
            child.name.toLowerCase().includes('top')
          if (mat) {
            mat.envMapIntensity = 1.1
            if (isFireBowl) {
              mat.emissive = new THREE.Color(0xff6020)
              mat.emissiveIntensity = 0.6
              child.layers.enable(1) // bloom-eligible (glows)
            }
          }
        })
        arenaVisualGroup.add(model)
      })
      .catch((err: unknown) => console.warn('[arena] Torch_Metal load failed:', err))
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
  // Per-particle colour (STILE §5: "luminosità guidata dalla vicinanza torce")
  // — recomputed each frame from distance-to-nearest-torch in animateArena.
  // vertexColors multiplies the flat white base colour, so plain opacity/size
  // stay the single source of truth for the OVERALL dust look; only the warm
  // pop near a torch is new.
  const dustColorAttr = new THREE.BufferAttribute(new Float32Array(pCount * 3), 3)
  dustColorAttr.usage = THREE.DynamicDrawUsage
  pGeo.setAttribute('color', dustColorAttr)
  // A soft round sprite, not the default square.
  //
  // PointsMaterial with no map draws a SOLID FILLED SQUARE, and with
  // sizeAttenuation on, three.js computes gl_PointSize = size * pixelRatio *
  // (height/2) / distance. At size 0.09 on a 1080p screen that is ~109 px at
  // 1 m and ~219 px at 0.5 m — and these motes are distributed through the
  // volume the player walks in. Flying through one put an opaque pale square
  // over a fifth of the screen: half of "there are half-transparent textures
  // that appear out of nowhere".
  //
  // The radial-alpha sprite makes a mote read as a mote, and the size cap
  // stops any single one from ever owning the frame.
  const dustSprite = new THREE.CanvasTexture(makeSoftDotTexture())
  const dust = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      vertexColors: true,
      size: 0.055,
      map: dustSprite,
      alphaMap: dustSprite,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  )
  arenaVisualGroup.add(dust)
  const DUST_BASE = new THREE.Color(0xb89878).multiplyScalar(0.55)
  const DUST_HOT = new THREE.Color(0xffb066).multiplyScalar(1.6)
  const DUST_GLOW_RANGE = 10 // metres — tighter than the torch light's own range (30)
  const _dustGlowScratch = new THREE.Color()

  // ── 8. Outer ground plane and atmospheric sky dome ──
  // Warm dark dust tone (not near-black) so any sliver past the sand reads as
  // distant ground rather than a void.
  const groundFar = new THREE.Mesh(
    new THREE.CircleGeometry(150, 32),
    new THREE.MeshBasicMaterial({ color: 0x2a2018 }),
  )
  groundFar.rotation.x = -Math.PI / 2
  groundFar.position.y = -0.08
  arenaVisualGroup.add(groundFar)

  // Sand fighting floor — sits a hair below GROUND_Y so character feet (≈y=0)
  // always render cleanly ON TOP of it instead of clipping through. Radius 27 m
  // reaches the coliseum wall base so there is no dark moat around the pit.
  // Tournament-floor map (sand grain + boundary rings + central crest) replaces the
  // flat single-colour disc. White base colour lets the baked texture colours show
  // through (MeshStandardMaterial samples map × color).
  const sandFloor = new THREE.Mesh(
    new THREE.CircleGeometry(SAND_RADIUS, 64),
    // PBR sand floor (STILE.md §2): white base lets the baked floor texture show
    // through; very high roughness, non-metal. No toon ramp.
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: makeArenaFloorTexture(),
      roughness: 0.95,
      metalness: 0.0,
    }),
  )
  sandFloor.rotation.x = -Math.PI / 2
  sandFloor.position.y = -0.04
  sandFloor.receiveShadow = true
  arenaVisualGroup.add(sandFloor)

  // ── 9. Sky dome — dramatic dusk gradient: deep night-blue zenith fading to a
  //       warm amber horizon glow (as if torch-lit dusk sits behind the arena).
  const skyGeo = new THREE.SphereGeometry(180, 24, 12)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x10142e) }, // deep dusk blue (not black)
      bottomColor: { value: new THREE.Color(0x5a3a2e) }, // warm amber dusk haze
      offset: { value: 30 },
      exponent: { value: 0.7 },
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

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        vec3 col = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));

        // Starfield — only in the upper sky, fading toward the horizon haze.
        float up = smoothstep(0.04, 0.5, dir.y);
        vec2 cell = floor(dir.xz * 170.0 + dir.y * 50.0);
        float star = smoothstep(0.987, 1.0, hash(cell)) * up;
        star += smoothstep(0.9975, 1.0, hash(cell + 19.0)) * up * 1.6; // rare bright ones
        col += vec3(0.88, 0.91, 1.0) * star;

        // Moon — a soft disc high in the sky with a faint cool halo.
        vec3 moonDir = normalize(vec3(0.34, 0.5, -0.8));
        float d = distance(dir, moonDir);
        col += vec3(1.0, 0.96, 0.85) * smoothstep(0.082, 0.066, d);
        col += vec3(0.55, 0.66, 1.0) * smoothstep(0.34, 0.0, d) * 0.1;

        gl_FragColor = vec4(col, 1.0);
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
    const BANNER_RING_R = 21 * ARENA_SHELL_SCALE // hug the (scaled) coliseum wall
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      const x = Math.cos(a) * BANNER_RING_R
      const z = Math.sin(a) * BANNER_RING_R
      spawns.push({
        type: 'banner',
        pos: [x, 4.5 * ARENA_SHELL_SCALE, z], // wall-band height scales with the shell
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
      void loadPropGltf(`/arena/props/${filename}.gltf`)
        .then((gltf) => {
          if (activeMapId !== spawnMapId) return // Discard if map switched in flight
          const model = cloneGltfScene(gltf.scene)
          model.position.set(...s.pos)
          model.rotation.set(...s.rot)
          model.scale.setScalar(s.scale)

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
              // Keep the GLB prop's authored PBR maps (Normal+ORM) but pull the
              // KayKit paint-bucket tints (fire-red barrels, sky-blue rings)
              // toward weathered wood/iron — dark-gritty, not carnival.
              const mat = child.material as THREE.MeshStandardMaterial | undefined
              if (mat) {
                mat.side = THREE.DoubleSide
                mat.envMapIntensity = 1.1
                if (s.type.startsWith('barrel') || s.type === 'box_large' || s.type === 'crate') {
                  mat.color.lerp(new THREE.Color(0x6b5233), 0.65)
                  mat.roughness = Math.max(mat.roughness ?? 0.8, 0.85)
                } else if (s.type === 'banner') {
                  // The prop is named "_red" but its UVs land on the purple and
                  // teal strips of KayKit's palette atlas, so it renders as a
                  // magenta/cyan checker — it reads as a missing texture hanging
                  // in a blood-red arena. mat.color multiplies the map, so a hard
                  // pull toward crimson folds both strips back into maroon/brick
                  // while the pattern survives as luminance variation.
                  mat.color.lerp(new THREE.Color(0x8c2b22), 0.85)
                  mat.roughness = Math.max(mat.roughness ?? 0.8, 0.9)
                }
              }
            }
          })
          arenaPropsGroup.add(model)
        })
        .catch((err: unknown) => {
          console.error(`[arena] Failed to load prop ${s.type}:`, err)
        })
    })
  }

  function loadMapGeometry(mapId: string): boolean {
    if (mapId === activeMapId) return false
    activeMapId = mapId

    // Clean up inactive box meshes — traverse and dispose each mesh's geometry
    // and material so nothing leaks when the map switches.
    for (const m of mapBoxMeshes) {
      scene.remove(m)
      m.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return
        node.geometry.dispose()
        const mat = node.material
        if (Array.isArray(mat)) mat.forEach((x) => (x as THREE.Material).dispose())
        else (mat as THREE.Material).dispose()
      })
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
      // Tall pillars: bright warm gold. Mid walls: amber. Low covers: warm sand.
      // Tints are brightened to compensate for the greyscale stone map (≈0.6×) so
      // the masonry reads without the low cover going near-black (gameplay
      // readability — cover must stay visible).
      const color = height > 2.5 ? 0xe6bf68 : height > 1.4 ? 0xcf9a52 : 0xb5854a
      const m = makeBoxMesh(b, color)
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
        const flicker =
          0.7 + 0.3 * Math.sin(now * 0.0047 + i * 1.618) + 0.08 * Math.sin(now * 0.019 + i * 2.4)
        torch.intensity = 18 * flicker
        // Flame sprite breathes with its light: vertical scale + opacity track the
        // flicker so the brazier visibly licks up and down.
        const flame = torchFlames[i]
        if (flame) {
          flame.scale.set(0.8 + flicker * 0.1, 1.2 + flicker * 0.35, 1)
          ;(flame.material as THREE.SpriteMaterial).opacity = 0.7 + flicker * 0.25
        }
        // God-ray shaft pulses with the same flicker so it reads as coming
        // FROM that flame rather than a separate static decal.
        const godRayMat = godRayMats[i]
        if (godRayMat) godRayMat.uniforms['uOpacity']!.value = 0.09 * flicker
      }
    }

    // Drift dust motes particles — uses DynamicDrawUsage for efficient GPU upload
    if (!inHitStop) {
      const paArr = dustPosAttr.array as Float32Array
      const colArr = dustColorAttr.array as Float32Array
      for (let i = 0; i < pCount; i++) {
        const xIndex = i * 3
        const yIndex = xIndex + 1
        const zIndex = xIndex + 2
        const yVal = paArr[yIndex]
        if (yVal !== undefined) {
          // Gentle ambient updraft (~0.1 m/s); wraps back to the floor at 15 m.
          const nextY = yVal + dt * 0.1
          paArr[yIndex] = nextY > 15 ? 0.1 : nextY
        }

        // Torch-proximity glow: brighten/warm whichever motes are currently
        // drifting near a brazier (STILE §5), everything else stays dim.
        const px = paArr[xIndex]!
        const py = paArr[yIndex]!
        const pz = paArr[zIndex]!
        let nearestDistSq = Infinity
        for (let t = 0; t < torchLights.length; t++) {
          const tp = torchLights[t]!.position
          const dx = px - tp.x
          const dy = py - tp.y
          const dz = pz - tp.z
          const distSq = dx * dx + dy * dy + dz * dz
          if (distSq < nearestDistSq) nearestDistSq = distSq
        }
        const glow = Math.max(0, 1 - Math.sqrt(nearestDistSq) / DUST_GLOW_RANGE)
        _dustGlowScratch.copy(DUST_BASE).lerp(DUST_HOT, glow * glow)
        colArr[xIndex] = _dustGlowScratch.r
        colArr[yIndex] = _dustGlowScratch.g
        colArr[zIndex] = _dustGlowScratch.b
      }
      dustPosAttr.needsUpdate = true
      dustColorAttr.needsUpdate = true
    }
  }

  return {
    loadMapGeometry,
    getActiveMapId: () => activeMapId,
    animateArena,
  }
}
