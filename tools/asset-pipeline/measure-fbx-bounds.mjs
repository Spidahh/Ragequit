import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
const requireFromClient = createRequire(path.resolve('packages/client/package.json'))
const THREE = await import(pathToFileURL(requireFromClient.resolve('three')))
const { FBXLoader } = await import(pathToFileURL(requireFromClient.resolve('three/addons/loaders/FBXLoader.js')))

const loader = new FBXLoader()
const BASE = path.resolve('packages/client/public/characters/legacy/player_base.fbx')
const buffer = fs.readFileSync(BASE)
const root = loader.parse(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  path.dirname(BASE) + path.sep,
)

root.updateMatrixWorld(true)

const box = new THREE.Box3()
let meshCount = 0
let skinnedCount = 0
let invisibleCount = 0

root.traverse((child) => {
  console.log(`node: "${child.name}" type=${child.type} constructor=${child.constructor.name} isMesh=${child.isMesh} isSkinnedMesh=${child.isSkinnedMesh}`)
  if (!child.isMesh) return
  meshCount++
  if (child.isSkinnedMesh) skinnedCount++
  if (!child.visible) {
    console.log(`  INVISIBLE Mesh: ${child.name}`)
    invisibleCount++
    return
  }
  const childBox = new THREE.Box3().setFromObject(child)
  console.log(`  Mesh: "${child.name}" | box.min.y=${childBox.min.y.toFixed(4)} max.y=${childBox.max.y.toFixed(4)} | geo verts=${child.geometry?.attributes?.position?.count ?? 0}`)
  if (!childBox.isEmpty()) box.union(childBox)
})

const size = box.getSize(new THREE.Vector3())
console.log(`\nRoot: name="${root.name}" scale=[${root.scale.toArray().map(v => v.toFixed(3)).join(',')}] pos=[${root.position.toArray().map(v => v.toFixed(3)).join(',')}]`)
console.log(`Total box: min.y=${box.min.y.toFixed(4)} max.y=${box.max.y.toFixed(4)}`)
console.log(`Height: ${size.y.toFixed(4)}m  Width: ${size.x.toFixed(4)}m  Depth: ${size.z.toFixed(4)}m`)
console.log(`Meshes: total=${meshCount}, skinned=${skinnedCount}, invisible=${invisibleCount}`)

const CAPSULE_HEIGHT_M = 1.8
const CAPSULE_HALF_HEIGHT_M = 0.9
const height = (Number.isFinite(size.y) && size.y > 0.1) ? size.y : 2.856
const scale = CAPSULE_HEIGHT_M / height
console.log(`\nScaling: scale=${scale.toFixed(6)} (target height = ${CAPSULE_HEIGHT_M}m)`)
// After scaling, recompute
const scaledMinY = box.min.y * scale
console.log(`After scaling: scaledBox.min.y ≈ ${scaledMinY.toFixed(4)}`)
console.log(`model.position.y = -${CAPSULE_HALF_HEIGHT_M} - (${scaledMinY.toFixed(4)}) = ${(-CAPSULE_HALF_HEIGHT_M - scaledMinY).toFixed(4)}`)
