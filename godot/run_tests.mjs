// Lanciatore delle verifiche Godot.
//
// Sei test girano in un processo solo. Due (test_net, test_net_world) ne
// richiedono DUE: una connessione non si testa dentro un albero di scena solo,
// servono due peer veri. Questo script li avvia entrambi e considera verde solo
// se entrambi i processi escono con 0.
//
//   node run_tests.mjs            tutti
//   node run_tests.mjs net        solo quelli che contengono "net"
//
// Il binario si prende da GODOT, altrimenti dalla posizione di winget.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WINGET =
  'C:/Users/magis/AppData/Local/Microsoft/WinGet/Packages/' +
  'GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe/' +
  'Godot_v4.7.1-stable_win64_console.exe'
const GODOT = process.env.GODOT ?? WINGET

if (!existsSync(GODOT)) {
  console.error(`Godot non trovato in ${GODOT}. Passalo con GODOT=...`)
  process.exit(2)
}

const SINGLE = [
  'test_movement',
  'test_combat',
  'test_ability_runtime',
  'test_arena_play',
  'test_fight',
  'test_lag_comp',
  'test_match',
  'test_match_world',
  'test_arena_match',
]
const PAIRED = ['test_net', 'test_net_world']

function run(script, userArgs = []) {
  const args = ['--headless', '--path', HERE, '--script', resolve(HERE, 'tests', `${script}.gd`)]
  if (userArgs.length > 0) args.push('--', ...userArgs)
  return new Promise((done) => {
    const p = spawn(GODOT, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    p.stdout.on('data', (b) => (out += b))
    p.stderr.on('data', (b) => (out += b))
    p.on('close', (code) => done({ code: code ?? 1, out }))
  })
}

// Il client parte con un ritardo: se attacca prima che il server sia in ascolto
// la join fallisce e il test rosseggia per un motivo che non è il suo.
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function runPaired(script) {
  const server = run(script, ['server'])
  await wait(900)
  const client = run(script, ['client'])
  const [s, c] = await Promise.all([server, client])
  return { code: s.code === 0 && c.code === 0 ? 0 : 1, out: s.out + c.out }
}

const filter = process.argv[2] ?? ''
const wanted = (n) => n.includes(filter)
let failed = 0

for (const t of SINGLE.filter(wanted)) {
  const { code, out } = await run(t)
  console.log(`${code === 0 ? 'OK  ' : 'ROSSO'} ${t}`)
  if (code !== 0) {
    failed++
    console.log(out)
  }
}
for (const t of PAIRED.filter(wanted)) {
  const { code, out } = await runPaired(t)
  console.log(`${code === 0 ? 'OK  ' : 'ROSSO'} ${t}  (2 processi)`)
  if (code !== 0) {
    failed++
    console.log(out)
  }
}

// Il numero dei test non è un segnale: il numero dei FILE sì. Un test che
// sparisce da questa lista non fa scendere nessun contatore visibile.
const total = SINGLE.filter(wanted).length + PAIRED.filter(wanted).length
console.log(`\n${total - failed}/${total} verdi`)
process.exit(failed === 0 ? 0 : 1)
