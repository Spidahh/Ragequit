// ttk.mjs — print the calibration band and whether the roster is inside it.
//
// TTK_MIN_SEC / TTK_MAX_SEC said 20-30 s for the whole life of this project,
// under a comment claiming every damage, cooldown and cost was tuned against
// them. The registry killed in about six. Nothing imported either constant, so
// nothing could notice — which is the general shape of the problem: a target
// that cannot fail is not a target.
//
// Run: node tools/verify/ttk.mjs   (needs `pnpm build:shared` first)
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const shared = (p) =>
  new URL('file:///' + path.join(root, 'packages/shared/dist', p).split(path.sep).join('/'))

const { allClassTtk, abilityDamage } = await import(shared('config/ttk.js'))
const { ABILITY_DEFS } = await import(shared('abilities/registry.js'))
const { TTK_MIN_SEC, TTK_MAX_SEC, MAX_ABILITY_COOLDOWN_SEC, FINISHER_DAMAGE_MIN, FINISHER_DAMAGE_MAX } =
  await import(shared('constants/combat.js'))

const rows = allClassTtk()
console.log(`\nTTK BAND ${TTK_MIN_SEC}-${TTK_MAX_SEC} s — measured on the shipped registry\n`)
console.log('class     ability DPS  casting  weapon DPS   total   TTK vs toughest')
let inBand = 0
for (const t of rows) {
  const ok = t.ttkSec >= TTK_MIN_SEC && t.ttkSec <= TTK_MAX_SEC
  if (ok) inBand++
  console.log(
    `  ${t.classId.padEnd(8)} ${t.abilityDps.toFixed(1).padStart(8)} ${(t.castDuty * 100).toFixed(0).padStart(7)}% ` +
      `${t.weaponDps.toFixed(1).padStart(10)} ${t.totalDps.toFixed(1).padStart(8)} ` +
      `${t.ttkSec.toFixed(2).padStart(7)} s  ${ok ? '' : '← OUT OF BAND'}`,
  )
}

const defs = Object.values(ABILITY_DEFS)
const over = defs.filter((d) => d.cooldownSec > MAX_ABILITY_COOLDOWN_SEC)
const cds = defs.map((d) => d.cooldownSec).sort((a, b) => a - b)
console.log(
  `\ncooldowns  min ${cds[0]}  median ${cds[Math.floor(cds.length / 2)]}  max ${cds[cds.length - 1]}` +
    `  (ceiling ${MAX_ABILITY_COOLDOWN_SEC})${over.length ? `  ← ${over.length} OVER` : ''}`,
)

console.log(`\nfinishers (band ${FINISHER_DAMAGE_MIN}-${FINISHER_DAMAGE_MAX}, damage bought with commitment)`)
for (const d of defs
  .filter((d) => d.comboRole === 'finisher')
  .sort((a, b) => abilityDamage(a) - abilityDamage(b))) {
  const dmg = abilityDamage(d)
  const ok = dmg >= FINISHER_DAMAGE_MIN && dmg <= FINISHER_DAMAGE_MAX
  console.log(
    `  ${d.id.padEnd(16)} dmg ${String(dmg).padStart(3)}  windup ${String(d.windupSec).padStart(4)}  ` +
      `cd ${String(d.cooldownSec).padStart(4)}  commitment ${(d.cooldownSec + d.windupSec).toFixed(1).padStart(4)}` +
      `${ok ? '' : '  ← OUT OF BAND'}`,
  )
}
console.log(`\n${inBand}/${rows.length} classes inside the band.\n`)
process.exit(inBand === rows.length && over.length === 0 ? 0 : 1)
