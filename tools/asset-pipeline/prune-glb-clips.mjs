#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Drop unused animation clips from a GLB, then resample/dedup/prune.
//
// Generic version of the bow optimizer: keeps only the named clips and removes
// the rest (Sketchfab / UAL exports ship dozens of clips a game never plays).
// Geometry, skin, and skeleton are untouched — only unreferenced animation
// keyframe data is pruned, so the rig keeps working. Verify in-browser after.
//
// Usage: node prune-glb-clips.mjs <in.glb> <out.glb> <keepClip1,keepClip2,...>
// Errors if any keep-name is absent from the GLB (catches typos / drift).
// ---------------------------------------------------------------------------
import { statSync } from 'node:fs'

import { NodeIO } from '@gltf-transform/core'
import { dedup, prune, resample } from '@gltf-transform/functions'

const [, , inPath, outPath, keepCsv] = process.argv
if (!inPath || !outPath || !keepCsv) {
  console.error('usage: prune-glb-clips.mjs <in.glb> <out.glb> <keep,clip,names>')
  process.exit(1)
}
const keep = new Set(keepCsv.split(',').map((s) => s.trim()).filter(Boolean))

const beforeBytes = statSync(inPath).size
const io = new NodeIO()
const doc = await io.read(inPath)
const root = doc.getRoot()

const present = new Set(root.listAnimations().map((a) => a.getName()))
const missing = [...keep].filter((k) => !present.has(k))
if (missing.length) {
  console.error(`ABORT: keep-clips not found in GLB: ${missing.join(', ')}`)
  console.error(`available: ${[...present].sort().join(', ')}`)
  process.exit(2)
}

const kept = []
const dropped = []
for (const anim of root.listAnimations()) {
  const name = anim.getName()
  if (keep.has(name)) {
    kept.push(name)
  } else {
    dropped.push(name)
    anim.dispose()
  }
}

await doc.transform(resample(), dedup(), prune())
await io.write(outPath, doc)

const mb = (b) => (b / 1048576).toFixed(2)
const afterBytes = statSync(outPath).size
console.log(`kept ${kept.length}: ${kept.join(', ')}`)
console.log(`dropped ${dropped.length}: ${dropped.join(', ')}`)
console.log(
  `size: ${mb(beforeBytes)}MB -> ${mb(afterBytes)}MB (${Math.round((1 - afterBytes / beforeBytes) * 100)}% smaller)`,
)
