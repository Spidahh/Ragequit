import { CAPSULE_HEIGHT_M, CAPSULE_RADIUS_M } from '@ragequit/shared'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// ---------------------------------------------------------------------------
// Weapon GLB loader — shared loader + cache so each model is fetched once.
// applyWeaponProp shows procedural geometry immediately, then upgrades to the
// GLB when it arrives (cel-shading applied on load for visual consistency).
// ---------------------------------------------------------------------------
const _loader = new GLTFLoader()
const _glbCache = new Map<string, THREE.Group>()
const _glbInflight = new Map<string, Promise<THREE.Group>>()

const _WEAPON_GLB: Record<string, string> = {
  sword: '/weapons/sword.glb',
  bow: '/weapons/bow.glb',
  staff: '/weapons/staff.glb',
}
const USE_WEAPON_GLB = false

function _fetchWeaponGlb(weapon: string): Promise<THREE.Group> {
  const hit = _glbCache.get(weapon)
  if (hit) return Promise.resolve(hit)
  const inflight = _glbInflight.get(weapon)
  if (inflight) return inflight
  const p = new Promise<THREE.Group>((resolve, reject) => {
    _loader.load(
      _WEAPON_GLB[weapon]!,
      (gltf) => {
        _glbCache.set(weapon, gltf.scene)
        _glbInflight.delete(weapon)
        resolve(gltf.scene)
      },
      undefined,
      reject,
    )
  })
  _glbInflight.set(weapon, p)
  return p
}

function _clearWeaponGroup(wg: THREE.Group): void {
  while (wg.children.length > 0) {
    const c = wg.children[0]!
    // Traverse into nested groups (weapon GLBs may be Group → Mesh)
    c.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      node.geometry?.dispose()
      const m = node.material
      if (Array.isArray(m)) m.forEach((x) => (x as THREE.Material).dispose())
      else (m as THREE.Material | undefined)?.dispose()
    })
    wg.remove(c)
  }
}

function _applyGlbToWeaponGroup(
  wg: THREE.Group,
  base: THREE.Group,
  toonGradient: THREE.DataTexture,
): void {
  _clearWeaponGroup(wg)
  const model = base.clone()
  // Normalise: longest bounding-box axis → 0.85 m
  const bbox = new THREE.Box3().setFromObject(model)
  const size = bbox.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0) model.scale.setScalar(0.85 / maxDim)
  // Centre model at origin so weapon group pivot controls placement
  const bbox2 = new THREE.Box3().setFromObject(model)
  model.position.sub(bbox2.getCenter(new THREE.Vector3()))
  // Cel-shading pass
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const orig = child.material as THREE.MeshStandardMaterial
      child.material = new THREE.MeshToonMaterial({
        color: orig.color ?? new THREE.Color(0xffffff),
        map: orig.map ?? null,
        gradientMap: toonGradient,
      })
      child.castShadow = true
    }
  })
  wg.add(model)
}

// ---------------------------------------------------------------------------
// Character GLB loader + AnimationMixer system.
//
// loadCharacterGlb(charGroup, teamColor, toonGradient)
//   Call once per character after makeCharacter().  Async: procedural body
//   stays visible until the GLB arrives, then procedural parts are hidden and
//   the GLB model (with toon shading) takes over.
//
// tickCharacterMixer(charGroup, deltaS)
//   Call every render frame.  Updates the AnimationMixer by deltaS seconds.
//
// setCharAnimState(charGroup, state)
//   Call whenever movement / attack / alive state changes.  Crossfades to the
//   appropriate clip: Death → Dagger_Attack → Run → Attacking_Idle.
// ---------------------------------------------------------------------------

/** Describes the character's current gameplay state for animation selection. */
export interface CharAnimState {
  moving: boolean
  attacking: boolean
  alive: boolean
}

/**
 * Starts loading the shared character GLB and wires up an AnimationMixer on
 * charGroup once it arrives.  The procedural body is hidden and replaced by
 * the GLB model.  Safe to call multiple times on different groups — the GLB
 * is loaded only once and cloned per character.
 */
export function loadCharacterGlb(
  charGroup: THREE.Group,
  teamColor: number,
  toonGradient: THREE.DataTexture,
): void {
  void charGroup
  void teamColor
  void toonGradient
  // The current character GLB deforms into huge triangles in gameplay. Keep the
  // procedural low-poly body until the rig asset is replaced or repaired.
}

/** Advance this character's AnimationMixer by deltaS seconds. */
export function tickCharacterMixer(charGroup: THREE.Group, deltaS: number): void {
  void charGroup
  void deltaS
}

/** Drive the animation state machine based on current gameplay state. */
export function setCharAnimState(charGroup: THREE.Group, state: CharAnimState): void {
  void charGroup
  void state
}

/**
 * Stop and release the AnimationMixer for charGroup.
 * Call before removing the group from the scene to prevent memory leaks.
 */
export function disposeCharacterMixer(charGroup: THREE.Group): void {
  delete charGroup.userData['mixerStore']
  delete charGroup.userData['charModel']
  delete charGroup.userData['glbMaterials']
}

// ---------------------------------------------------------------------------
// Group origin = capsule centre (transform.y = CAPSULE_HALF_HEIGHT_M above ground).
// userData['armorMat'] → primary team-colour material (used for emissive flashes).
// userData['weaponGroup'] → THREE.Group for weapon prop swapping.
export function makeCharacter(teamColor: number, toonGradient: THREE.DataTexture): THREE.Group {
  const g = new THREE.Group()

  const armorMat = new THREE.MeshToonMaterial({
    color: teamColor,
    gradientMap: toonGradient,
    emissive: teamColor,
    emissiveIntensity: 0.1,
  })
  const darkMat = new THREE.MeshToonMaterial({ color: 0x1a1e2e, gradientMap: toonGradient })
  const visorMat = new THREE.MeshBasicMaterial({
    color: 0x70e8ff,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  })
  const crestMat = new THREE.MeshToonMaterial({ color: 0xd8c060, gradientMap: toonGradient })
  const detailMat = new THREE.MeshBasicMaterial({
    color: 0x2a9de0,
    transparent: true,
    opacity: 0.8,
  })

  g.userData['armorMat'] = armorMat
  g.userData['darkMat'] = darkMat

  const addPart = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    px: number,
    py: number,
    pz: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py, pz)
    if (rx || ry || rz) m.rotation.set(rx, ry, rz)
    m.castShadow = true
    g.add(m)
    return m
  }

  // Head — slightly larger for heroic look.
  addPart(new THREE.SphereGeometry(0.2, 14, 10), armorMat, 0, 0.72, 0)
  // Visor eye slits (angled inward for a fierce look).
  addPart(new THREE.CircleGeometry(0.07, 10), visorMat, -0.075, 0.74, -0.195, 0, 0.12, 0)
  addPart(new THREE.CircleGeometry(0.07, 10), visorMat, 0.075, 0.74, -0.195, 0, -0.12, 0)
  // Helmet crest — a gold fin running front-to-back along the top.
  addPart(new THREE.BoxGeometry(0.04, 0.12, 0.28), crestMat, 0, 0.895, 0)
  addPart(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), crestMat, 0, 0.895, 0, 0, 0, 0)
  // Neck connector
  addPart(new THREE.CylinderGeometry(0.068, 0.068, 0.12, 8), darkMat, 0, 0.54, 0)
  // Torso (slightly taller).
  addPart(new THREE.BoxGeometry(0.52, 0.6, 0.27), armorMat, 0, 0.17, 0)
  // Chest accent stripe — gives detail without texture.
  addPart(new THREE.BoxGeometry(0.1, 0.4, 0.28), detailMat, 0, 0.24, 0)
  // Shoulder pauldrons (larger for heroic silhouette).
  addPart(new THREE.BoxGeometry(0.16, 0.1, 0.22), armorMat, -0.36, 0.47, 0)
  addPart(new THREE.BoxGeometry(0.16, 0.1, 0.22), armorMat, 0.36, 0.47, 0)
  // Upper arms
  addPart(new THREE.CylinderGeometry(0.075, 0.068, 0.3, 8), darkMat, -0.33, 0.22, 0, 0, 0, 0.24)
  addPart(new THREE.CylinderGeometry(0.075, 0.068, 0.3, 8), darkMat, 0.33, 0.22, 0, 0, 0, -0.24)
  // Lower arms
  addPart(
    new THREE.CylinderGeometry(0.064, 0.058, 0.26, 8),
    darkMat,
    -0.35,
    -0.07,
    0.03,
    0.22,
    0,
    0.1,
  )
  addPart(
    new THREE.CylinderGeometry(0.064, 0.058, 0.26, 8),
    darkMat,
    0.35,
    -0.07,
    0.03,
    0.22,
    0,
    -0.1,
  )
  // Belt
  addPart(new THREE.BoxGeometry(0.48, 0.09, 0.24), armorMat, 0, -0.12, 0)
  // Upper legs
  addPart(new THREE.CylinderGeometry(0.095, 0.084, 0.36, 8), darkMat, -0.13, -0.39, 0)
  addPart(new THREE.CylinderGeometry(0.095, 0.084, 0.36, 8), darkMat, 0.13, -0.39, 0)
  // Lower legs
  addPart(new THREE.CylinderGeometry(0.082, 0.07, 0.31, 8), darkMat, -0.12, -0.72, 0.02, 0.07, 0, 0)
  addPart(new THREE.CylinderGeometry(0.082, 0.07, 0.31, 8), darkMat, 0.12, -0.72, 0.02, 0.07, 0, 0)
  // Boots
  addPart(new THREE.BoxGeometry(0.18, 0.11, 0.32), darkMat, -0.12, -0.9, 0.04)
  addPart(new THREE.BoxGeometry(0.18, 0.11, 0.32), darkMat, 0.12, -0.9, 0.04)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(CAPSULE_RADIUS_M * 1.15, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -CAPSULE_HEIGHT_M / 2 + 0.015
  g.add(shadow)

  const weaponGroup = new THREE.Group()
  weaponGroup.position.set(0.38, -0.22, -0.08)
  weaponGroup.rotation.set(0.25, 0, -0.18)
  g.userData['weaponGroup'] = weaponGroup
  g.add(weaponGroup)

  return g
}

export function applyWeaponProp(
  charGroup: THREE.Group,
  weapon: string,
  toonGradient: THREE.DataTexture,
): void {
  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  if (!wg) return

  // Tag so the async GLB callback can detect stale replacements
  wg.userData['weapon'] = weapon

  _clearWeaponGroup(wg)

  const addProp = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    px = 0,
    py = 0,
    pz = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py, pz)
    m.rotation.set(rx, ry, rz)
    m.castShadow = true
    wg.add(m)
  }
  if (weapon === 'sword') {
    const bladeMat = new THREE.MeshToonMaterial({ color: 0xc8daf0, gradientMap: toonGradient })
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xe8f4ff,
      transparent: true,
      opacity: 0.85,
    })
    const guardMat = new THREE.MeshToonMaterial({ color: 0x9a8c38, gradientMap: toonGradient })
    const handleMat = new THREE.MeshToonMaterial({ color: 0x4a2c10, gradientMap: toonGradient })
    addProp(new THREE.BoxGeometry(0.042, 0.74, 0.06), bladeMat, 0, 0.48, 0)
    addProp(new THREE.BoxGeometry(0.01, 0.74, 0.014), edgeMat, 0, 0.48, 0.034)
    addProp(new THREE.BoxGeometry(0.24, 0.046, 0.06), guardMat, 0, 0.1, 0)
    addProp(new THREE.CylinderGeometry(0.028, 0.024, 0.22, 8), handleMat, 0, -0.06, 0)
    addProp(new THREE.SphereGeometry(0.038, 8, 6), guardMat, 0, -0.18, 0)
  } else if (weapon === 'bow') {
    const woodMat = new THREE.MeshToonMaterial({ color: 0x7a5428, gradientMap: toonGradient })
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xc8c090 })
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.024, 8, 22, Math.PI * 1.48), woodMat)
    arc.rotation.set(-Math.PI * 0.25, 0, 0)
    arc.castShadow = true
    wg.add(arc)
    addProp(new THREE.CylinderGeometry(0.005, 0.005, 0.68, 4), stringMat, 0, 0, 0)
  } else if (weapon === 'staff') {
    const woodMat = new THREE.MeshToonMaterial({ color: 0x2e2048, gradientMap: toonGradient })
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x90d8ff,
      emissive: 0x4090ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1,
    })
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x70b8ff,
      transparent: true,
      opacity: 0.85,
    })
    addProp(new THREE.CylinderGeometry(0.028, 0.022, 1.2, 8), woodMat, 0, 0.6, 0)
    addProp(new THREE.SphereGeometry(0.078, 12, 8), orbMat, 0, 1.28, 0)
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 20), ringMat)
    orbRing.position.set(0, 1.28, 0)
    orbRing.rotation.x = Math.PI / 3
    orbRing.castShadow = false
    wg.add(orbRing)
  }

  // Async GLB upgrade — replaces procedural once the model arrives.
  // Guard against stale callbacks when weapon changes before load completes.
  if (USE_WEAPON_GLB && _WEAPON_GLB[weapon]) {
    _fetchWeaponGlb(weapon)
      .then((base) => {
        if ((wg.userData['weapon'] as string) !== weapon) return
        _applyGlbToWeaponGroup(wg, base, toonGradient)
      })
      .catch((err) => {
        console.warn(`[weapon] GLB load failed for "${weapon}", keeping procedural`, err)
      })
  }
}

export function makeCastRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.28, 0.38, 24)
  geo.rotateX(-Math.PI / 2)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd060,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  })
  const m = new THREE.Mesh(geo, mat)
  m.visible = false
  return m
}
