// Prepara lo zip da caricare su itch.io.
//
// LE SETTE COSE CHE DEVONO ESSERE VERE, e ognuna è una settimana persa se la si
// scopre dopo:
//
//   1. `index.html` in RADICE dello zip — itch cerca quello, e una cartella in
//      mezzo produce una pagina bianca senza nessun errore;
//   2. percorsi relativi — itch serve da una sottocartella;
//   3. template `nothreads` — quello con i thread vuole header cross-origin che
//      su itch non controlli;
//   4. renderer Compatibility — Forward+ resta appeso sulla schermata di
//      caricamento;
//   5. connessione solo `wss://` — itch serve in https, e il contenuto misto
//      viene bloccato;
//   6. pointer lock dentro l'iframe cross-origin — verificato, funziona;
//   7. peso sotto i 20 MB scaricati.
//
//   node tools/package_itch.mjs
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants } from 'node:zlib'

const HERE = dirname(fileURLToPath(import.meta.url))
const BUILD = join(HERE, '..', '..', 'godot-build')
const ZIP = join(HERE, '..', '..', 'godot-build', 'ragequit-itch.zip')
const BUDGET_MB = 20

const problems = []

if (!existsSync(join(BUILD, 'index.html'))) {
  problems.push('manca index.html: itch cerca quello in radice')
}

const html = existsSync(join(BUILD, 'index.html'))
  ? readFileSync(join(BUILD, 'index.html'), 'utf8')
  : ''
if (/(src|href)="\//.test(html)) {
  problems.push('percorsi assoluti in index.html: itch serve da una sottocartella')
}
if (/SharedArrayBuffer/.test(html) && !/nothreads/.test(html)) {
  problems.push('build con i thread: su itch non puoi mandare gli header cross-origin')
}

const project = readFileSync(join(HERE, '..', 'project.godot'), 'utf8')
if (!/rendering_method="gl_compatibility"/.test(project)) {
  problems.push('renderer non Compatibility: un export Forward+ non parte sul web')
}

// SOLO I FILE IN RADICE. `server/` è l'eseguibile del server dedicato: 70 MB
// che nessun browser scaricherà mai, e che su itch sarebbero solo peso — e
// nel conteggio del peso sarebbero una bugia.
const files = readdirSync(BUILD).filter(
  (f) => statSync(join(BUILD, f)).isFile() && !f.endsWith('.zip'),
)

let packed = 0
for (const f of files) {
  packed += brotliCompressSync(readFileSync(join(BUILD, f)), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
  }).length
}
const mb = packed / 1048576
if (mb > BUDGET_MB) problems.push(`pesa ${mb.toFixed(1)} MB scaricati, il tetto è ${BUDGET_MB}`)

if (problems.length > 0) {
  console.error('\nNON pubblicabile:')
  for (const p of problems) console.error(`  ✗ ${p}`)
  process.exit(1)
}

// Lo zip ha i file IN RADICE, non una cartella dentro: itch cerca `index.html`
// al primo livello, e una cartella in mezzo produce una pagina bianca senza
// nessun errore.
//
// E si costruisce con quello che c'è sulla macchina, non con PowerShell: la
// pipeline gira su Linux, e un pacchetto che si crea solo sul portatile di chi
// lo ha scritto è un pacchetto che non esce mai da lì. È stata la CI a dirmelo.
function makeZip() {
  try {
    execFileSync('zip', ['-q', '-X', '-j', ZIP, ...files.map((f) => join(BUILD, f))], {
      stdio: 'inherit',
    })
    return 'zip'
  } catch {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Force -Path ${files.map((f) => `'${join(BUILD, f)}'`).join(',')} -DestinationPath '${ZIP}'`,
      ],
      { stdio: 'inherit' },
    )
    return 'Compress-Archive'
  }
}

const how = makeZip()

console.log(`\n  ✓ index.html in radice`)
console.log(`  ✓ percorsi relativi`)
console.log(`  ✓ template senza thread`)
console.log(`  ✓ renderer Compatibility`)
console.log(`  ✓ ${mb.toFixed(2)} MB scaricati (tetto ${BUDGET_MB})`)
console.log(`\n  ${ZIP}`)
console.log(`  Su itch.io: Kind of project = HTML, "This file will be played in the browser".`)
