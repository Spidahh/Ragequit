// Misura il peso VERO di un export web: quello che il browser scarica, non
// quello che c'è sul disco.
//
// itch.io serve i file con compressione, quindi il numero che conta è il
// brotli. Guardare i byte su disco vuol dire pesare il gioco quattro volte
// più di quanto pesa davvero — e tagliare contenuto che non serviva tagliare.
//
//   node tools/web_size.mjs ../godot-build
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { brotliCompressSync, constants } from 'node:zlib'

const dir = process.argv[2] ?? '../godot-build'
const BUDGET_MB = 20

let raw = 0
let packed = 0
const rows = []
for (const f of readdirSync(dir)) {
  const p = join(dir, f)
  if (!statSync(p).isFile()) continue
  const buf = readFileSync(p)
  const br = brotliCompressSync(buf, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
  })
  raw += buf.length
  packed += br.length
  rows.push([f, buf.length, br.length])
}
rows.sort((a, b) => b[2] - a[2])
for (const [f, r, b] of rows) {
  console.log(
    `  ${f.padEnd(34)} ${(r / 1048576).toFixed(2).padStart(7)} MB → ${(b / 1048576).toFixed(2).padStart(7)} MB`,
  )
}
const mb = packed / 1048576
console.log(
  `\n  totale ${(raw / 1048576).toFixed(1)} MB su disco → ` +
    `${mb.toFixed(2)} MB scaricati   ${mb <= BUDGET_MB ? 'DENTRO' : 'FUORI'} il tetto di ${BUDGET_MB} MB`,
)
process.exit(mb <= BUDGET_MB ? 0 : 1)
