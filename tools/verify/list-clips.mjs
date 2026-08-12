// list-clips.mjs — print every animation clip embedded in each class GLB.
// Reads the glTF JSON chunk directly (no three.js/DOM needed) so it runs in
// plain node. Use it when wiring a new character/pack: mapCharacterClips must
// be extended against the REAL clip names, never against guesses.
//
// Usage: node tools/verify/list-clips.mjs [name ...]   (default: all 4 classes)
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const dir = path.join(root, 'packages/client/public/characters')
const files = process.argv.slice(2)
const names = files.length > 0 ? files : ['paladin', 'erika', 'vampire', 'ninja']

for (const name of names) {
  const buf = readFileSync(path.join(dir, `${name}.glb`))
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const clips = (json.animations ?? []).map((a) => a.name)
  console.log(`\n=== ${name}.glb — ${clips.length} clips ===`)
  for (const c of clips.sort()) console.log('  ' + c)
}
