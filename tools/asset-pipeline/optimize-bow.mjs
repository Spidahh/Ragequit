#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Optimize the first-person bow viewmodel GLB.
//
// The Sketchfab export ships ~19 baked animation clips (~7MB of keyframe data),
// but the FPV rig (render/fpv-bow.ts) only drives 7 of them. The JUMP/FALL/
// DISARMED clips and every "(no arrow)" variant are dead weight. This drops the
// unused clips, then resamples (removes redundant keyframes), dedups, and prunes
// orphaned data. Geometry + the used animations are untouched, so the rig keeps
// working — verify in-browser after running.
//
// Usage: node tools/asset-pipeline/optimize-bow.mjs <in.glb> <out.glb>
// ---------------------------------------------------------------------------
import { statSync } from 'node:fs'

import { NodeIO } from '@gltf-transform/core'
import { dedup, prune, resample } from '@gltf-transform/functions'

// Clips referenced by render/fpv-bow.ts (the ClipName union). Everything else
// is unused by the viewmodel and safe to drop.
const KEEP = new Set([
  'Bow_IDLE',
  'Bow_WALK',
  'Bow_RUN',
  'Bow_AIM',
  'Bow_AIM_IDLE',
  'Bow_FIRE',
  'Bow_RELOAD',
])

const inPath = process.argv[2]
const outPath = process.argv[3]
if (!inPath || !outPath) {
  console.error('usage: optimize-bow.mjs <in.glb> <out.glb>')
  process.exit(1)
}

const beforeBytes = statSync(inPath).size
const io = new NodeIO()
const doc = await io.read(inPath)
const root = doc.getRoot()

const kept = []
const dropped = []
for (const anim of root.listAnimations()) {
  const name = anim.getName()
  if (KEEP.has(name)) {
    kept.push(name)
  } else {
    dropped.push(name)
    anim.dispose()
  }
}

await doc.transform(resample(), dedup(), prune())
await io.write(outPath, doc)

const afterBytes = statSync(outPath).size
const mb = (b) => (b / 1048576).toFixed(2)
console.log(`kept ${kept.length} clips: ${kept.join(', ')}`)
console.log(`dropped ${dropped.length} clips: ${dropped.join(', ')}`)
console.log(
  `size: ${mb(beforeBytes)}MB -> ${mb(afterBytes)}MB (${Math.round((1 - afterBytes / beforeBytes) * 100)}% smaller)`,
)
