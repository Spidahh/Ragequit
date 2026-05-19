import { CAPSULE_HEIGHT_M, CAPSULE_RADIUS_M } from '@ragequit/shared'
import * as THREE from 'three'

// Group origin = capsule centre (transform.y = CAPSULE_HALF_HEIGHT_M above ground).
// userData['armorMat'] → primary team-colour material (used for emissive flashes).
// userData['weaponGroup'] → THREE.Group for weapon prop swapping.
export function makeCharacter(teamColor: number, toonGradient: THREE.DataTexture): THREE.Group {
  const g = new THREE.Group()

  const armorMat = new THREE.MeshToonMaterial({ color: teamColor, gradientMap: toonGradient })
  const darkMat  = new THREE.MeshToonMaterial({ color: 0x1a1e2e, gradientMap: toonGradient })
  const visorMat = new THREE.MeshBasicMaterial({ color: 0x50d8ff, transparent: true, opacity: 0.92, side: THREE.DoubleSide })

  g.userData['armorMat'] = armorMat
  g.userData['darkMat']  = darkMat

  const addPart = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    px: number, py: number, pz: number,
    rx = 0, ry = 0, rz = 0,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py, pz)
    if (rx || ry || rz) m.rotation.set(rx, ry, rz)
    m.castShadow = true
    g.add(m)
    return m
  }

  addPart(new THREE.SphereGeometry(0.195, 14, 10),    armorMat, 0, 0.71, 0)
  addPart(new THREE.CircleGeometry(0.068, 10),  visorMat, -0.072, 0.73, -0.19)
  addPart(new THREE.CircleGeometry(0.068, 10),  visorMat,  0.072, 0.73, -0.19)
  addPart(new THREE.CylinderGeometry(0.068, 0.068, 0.12, 8), darkMat, 0, 0.53, 0)
  addPart(new THREE.BoxGeometry(0.50, 0.58, 0.26), armorMat, 0, 0.16, 0)
  addPart(new THREE.BoxGeometry(0.14, 0.08, 0.20), armorMat, -0.34, 0.46, 0)
  addPart(new THREE.BoxGeometry(0.14, 0.08, 0.20), armorMat,  0.34, 0.46, 0)
  addPart(new THREE.CylinderGeometry(0.072, 0.065, 0.30, 8), darkMat, -0.32, 0.22, 0, 0, 0,  0.24)
  addPart(new THREE.CylinderGeometry(0.072, 0.065, 0.30, 8), darkMat,  0.32, 0.22, 0, 0, 0, -0.24)
  addPart(new THREE.CylinderGeometry(0.062, 0.056, 0.26, 8), darkMat, -0.34, -0.07, 0.03, 0.22, 0,  0.10)
  addPart(new THREE.CylinderGeometry(0.062, 0.056, 0.26, 8), darkMat,  0.34, -0.07, 0.03, 0.22, 0, -0.10)
  addPart(new THREE.BoxGeometry(0.46, 0.09, 0.23), armorMat, 0, -0.12, 0)
  addPart(new THREE.CylinderGeometry(0.093, 0.082, 0.35, 8), darkMat, -0.13, -0.38, 0)
  addPart(new THREE.CylinderGeometry(0.093, 0.082, 0.35, 8), darkMat,  0.13, -0.38, 0)
  addPart(new THREE.CylinderGeometry(0.080, 0.068, 0.30, 8), darkMat, -0.12, -0.70, 0.02, 0.07, 0, 0)
  addPart(new THREE.CylinderGeometry(0.080, 0.068, 0.30, 8), darkMat,  0.12, -0.70, 0.02, 0.07, 0, 0)
  addPart(new THREE.BoxGeometry(0.17, 0.10, 0.30), darkMat, -0.12, -0.88, 0.04)
  addPart(new THREE.BoxGeometry(0.17, 0.10, 0.30), darkMat,  0.12, -0.88, 0.04)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(CAPSULE_RADIUS_M * 1.10, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }),
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

export function applyWeaponProp(charGroup: THREE.Group, weapon: string, toonGradient: THREE.DataTexture): void {
  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  if (!wg) return
  while (wg.children.length > 0) {
    const child = wg.children[0] as THREE.Mesh
    child.geometry?.dispose()
    const mat = child.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose()
    wg.remove(child)
  }
  const addProp = (geo: THREE.BufferGeometry, mat: THREE.Material, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py, pz); m.rotation.set(rx, ry, rz)
    m.castShadow = true; wg.add(m)
  }
  if (weapon === 'sword') {
    const bladeMat  = new THREE.MeshToonMaterial({ color: 0xc8daf0, gradientMap: toonGradient })
    const edgeMat   = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.85 })
    const guardMat  = new THREE.MeshToonMaterial({ color: 0x9a8c38, gradientMap: toonGradient })
    const handleMat = new THREE.MeshToonMaterial({ color: 0x4a2c10, gradientMap: toonGradient })
    addProp(new THREE.BoxGeometry(0.042, 0.74, 0.060), bladeMat,  0, 0.48, 0)
    addProp(new THREE.BoxGeometry(0.010, 0.74, 0.014), edgeMat,   0, 0.48, 0.034)
    addProp(new THREE.BoxGeometry(0.24,  0.046, 0.060), guardMat, 0, 0.10, 0)
    addProp(new THREE.CylinderGeometry(0.028, 0.024, 0.22, 8), handleMat, 0, -0.06, 0)
    addProp(new THREE.SphereGeometry(0.038, 8, 6), guardMat, 0, -0.18, 0)
  } else if (weapon === 'bow') {
    const woodMat   = new THREE.MeshToonMaterial({ color: 0x7a5428, gradientMap: toonGradient })
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xc8c090 })
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.024, 8, 22, Math.PI * 1.48), woodMat)
    arc.rotation.set(-Math.PI * 0.25, 0, 0)
    arc.castShadow = true; wg.add(arc)
    addProp(new THREE.CylinderGeometry(0.005, 0.005, 0.68, 4), stringMat, 0, 0, 0)
  } else if (weapon === 'staff') {
    const woodMat = new THREE.MeshToonMaterial({ color: 0x2e2048, gradientMap: toonGradient })
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x80c8ff })
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x60a8ff, transparent: true, opacity: 0.75 })
    addProp(new THREE.CylinderGeometry(0.028, 0.022, 1.20, 8), woodMat, 0, 0.60, 0)
    addProp(new THREE.SphereGeometry(0.078, 12, 8), orbMat, 0, 1.28, 0)
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 20), ringMat)
    orbRing.position.set(0, 1.28, 0)
    orbRing.rotation.x = Math.PI / 3
    orbRing.castShadow = false; wg.add(orbRing)
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
