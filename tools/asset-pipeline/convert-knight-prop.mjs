#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Convert a high-poly OBJ knight prop (shield/sword) into a game-ready GLB.
//
// Pipeline: OBJ -> GLB (obj2gltf) -> weld + meshopt simplify (decimate to a
// real-time triangle budget) -> attach the baseColor PNG as a resized texture
// -> dedup/prune. Output drops straight into packages/client/public/weapons/.
//
// Usage: node convert-knight-prop.mjs <in.obj> <baseColor.png> <out.glb> [ratio] [texSize]
// ---------------------------------------------------------------------------
import { readFileSync, statSync } from 'node:fs'

import { NodeIO } from '@gltf-transform/core'
import { dedup, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import obj2gltf from 'obj2gltf'
import sharp from 'sharp'

const [objPath, pngPath, outPath, ratioArg, texArg] = process.argv.slice(2)
if (!objPath || !pngPath || !outPath) {
  console.error('usage: convert-knight-prop.mjs <in.obj> <baseColor.png> <out.glb> [ratio] [texSize]')
  process.exit(1)
}
const ratio = Number(ratioArg ?? 0.04)
const texSize = Number(texArg ?? 1024)

const glb = await obj2gltf(objPath, { binary: true })
const io = new NodeIO()
const doc = await io.readBinary(new Uint8Array(glb))

const prim0 = doc.getRoot().listMeshes()[0].listPrimitives()[0]
const facesBefore = (prim0.getIndices()?.getCount() ?? 0) / 3

await MeshoptSimplifier.ready
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.006 }),
  dedup(),
  prune(),
)

// Attach the baseColor PNG (resized) as the material's texture.
const texBuf = await sharp(readFileSync(pngPath))
  .resize(texSize, texSize, { fit: 'inside', withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toBuffer()
const tex = doc.createTexture('baseColor').setImage(new Uint8Array(texBuf)).setMimeType('image/png')
const mat = doc.getRoot().listMaterials()[0]
mat.setBaseColorTexture(tex)
mat.setMetallicFactor(0.1)
mat.setRoughnessFactor(0.6)
mat.setBaseColorFactor([1, 1, 1, 1])

await io.write(outPath, doc)

const primOut = doc.getRoot().listMeshes()[0].listPrimitives()[0]
const facesAfter = (primOut.getIndices()?.getCount() ?? 0) / 3
const mb = (b) => (b / 1048576).toFixed(2)
console.log(`faces: ${facesBefore} -> ${facesAfter}`)
console.log(`out: ${outPath} (${mb(statSync(outPath).size)}MB)`)
