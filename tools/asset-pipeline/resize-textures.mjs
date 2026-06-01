#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Downscale oversized PNG textures in place.
//
// Several character/UI/prop textures ship at 4096² (13MB normal maps) — far
// more than a stylized low-poly arena needs. Capping the longest side at a
// sane max (default 2048) cuts load weight massively with no visible loss for
// this art style. Resizing in place keeps every .gltf / CSS path valid (same
// file, fewer pixels). Originals are backed up first; verify in-browser after.
//
// Usage: node resize-textures.mjs <maxDim> <file1.png> [file2.png ...]
//   or:  node resize-textures.mjs <maxDim> --glob   (scans the known asset dirs)
// ---------------------------------------------------------------------------
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import sharp from 'sharp'

const maxDim = Number(process.argv[2])
if (!maxDim || maxDim < 64) {
  console.error('usage: resize-textures.mjs <maxDim> <files...|--glob>')
  process.exit(1)
}

const SCAN_DIRS = [
  'packages/client/public/characters',
  'packages/client/public/ui',
  'packages/client/public/arena/props',
]
const BACKUP_DIR = join('tools/asset-pipeline/.tex-backup')

let files = process.argv.slice(3)
if (files[0] === '--glob') {
  files = []
  for (const d of SCAN_DIRS) {
    let entries = []
    try {
      entries = readdirSync(d)
    } catch {
      continue
    }
    for (const f of entries) if (f.endsWith('.png')) files.push(join(d, f))
  }
}

const mb = (b) => (b / 1048576).toFixed(2)
let beforeTotal = 0
let afterTotal = 0
let changed = 0

for (const file of files) {
  const before = statSync(file).size
  beforeTotal += before
  const meta = await sharp(file).metadata()
  if (Math.max(meta.width ?? 0, meta.height ?? 0) <= maxDim) {
    afterTotal += before
    continue
  }
  // Back up the original (mirrors the source path under .tex-backup).
  const backupPath = join(BACKUP_DIR, file)
  mkdirSync(dirname(backupPath), { recursive: true })
  copyFileSync(file, backupPath)

  const out = await sharp(readFileSync(file))
    .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer()
  writeFileSync(file, out)
  const after = statSync(file).size
  afterTotal += after
  changed++
  console.log(`${file}: ${meta.width}x${meta.height} ${mb(before)}MB -> ${mb(after)}MB`)
}

console.log(
  `\nresized ${changed} file(s); total ${mb(beforeTotal)}MB -> ${mb(afterTotal)}MB (backups in ${BACKUP_DIR})`,
)
