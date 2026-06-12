// normalize-glb.mjs — bake a non-unit node scale (e.g. Mixamo's 0.01 cm→m node)
// into geometry + skeleton + inverse-bind-matrices + animation, producing a clean
// 1:1 GLB that survives the game's runtime rescaling (no 'attached'-skin collapse).
// Usage: node tools/verify/normalize-glb.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core'

const IN = process.argv[2]
const OUT = process.argv[3]
if (!IN || !OUT) {
  console.log('usage: node normalize-glb.mjs <in.glb> <out.glb>')
  process.exit(1)
}

const io = new NodeIO()
const doc = await io.read(IN)
const root = doc.getRoot()

// Find the node carrying the unit-conversion scale (uniform, != 1).
let S = null
let scaleNode = null
for (const n of root.listNodes()) {
  const s = n.getScale()
  if (Math.abs(s[0] - 1) > 1e-4 && Math.abs(s[0] - s[1]) < 1e-4 && Math.abs(s[0] - s[2]) < 1e-4) {
    S = s[0]
    scaleNode = n
    break
  }
}
if (!S) {
  console.log('No non-unit uniform scale node found — copying unchanged.')
  await io.write(OUT, doc)
  process.exit(0)
}
console.log(`Baking scale S=${S} from node "${scaleNode.getName()}"`)
scaleNode.setScale([1, 1, 1])

const seen = new Set()
const scaleArr = (acc, stride, offsets) => {
  if (!acc || seen.has(acc)) return
  seen.add(acc)
  const a = acc.getArray()
  for (let i = 0; i < a.length; i += stride) for (const o of offsets) a[i + o] *= S
  acc.setArray(a)
}

// 1) Every node's local translation (the whole subtree shrinks uniformly).
for (const n of root.listNodes()) {
  if (n === scaleNode) continue
  const t = n.getTranslation()
  n.setTranslation([t[0] * S, t[1] * S, t[2] * S])
}

// 2) Mesh POSITION attributes (directions/normals are scale-invariant).
let prims = 0
for (const mesh of root.listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    if (pos && !seen.has(pos)) {
      scaleArr(pos, 3, [0, 1, 2])
      prims++
    }
  }

// 3) Inverse-bind-matrices: only the translation column of each 4x4 scales.
for (const skin of root.listSkins()) scaleArr(skin.getInverseBindMatrices(), 16, [12, 13, 14])

// 4) Animation translation samplers.
for (const anim of root.listAnimations())
  for (const ch of anim.listChannels())
    if (ch.getTargetPath() === 'translation') scaleArr(ch.getSampler().getOutput(), 3, [0, 1, 2])

await io.write(OUT, doc)
console.log(`Wrote ${OUT}  (prims:${prims}, accessors scaled:${seen.size})`)
