// spec.mjs — proves the third axis exists end to end.
//
// A specialisation that only lives in a registry is not a feature. The claim is
// that you can SEE it in the Forge, PICK it, and that the server then fights you
// with it — so this checks all three, and the last one by reading the HP the
// server actually gave the player rather than the HP the client hoped for.
//
// The deleted Mastery system is why this harness exists at all: it was inferred
// from your ability picks, never chosen, so there was nothing to click and
// nothing to verify. If this script cannot find cards to click, the rebuild
// repeated the mistake.
//
// Prereqs: client :5173 + server running.  Usage: node tools/verify/spec.mjs
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const shared = (p) =>
  new URL('file:///' + path.join(root, 'packages/shared/dist', p).split(path.sep).join('/'))
const { SPECIALIZATION_DEFS, maxHpForBuild } = await import(shared('constants/specializations.js'))

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.addInitScript(() => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
    localStorage.setItem('ragequit.loadout.classId', 'mage')
  } catch {
    /* storage optional */
  }
})
page.on('pageerror', (e) => errors.push('PAGE: ' + String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text())
})

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('#menu-train', { timeout: 20000 })
await wait(1200)
// The Forge is a main-menu destination, which is also the honest flow: you
// build BEFORE you fight. Opening it mid-match was the first attempt and the
// station stays in the DOM while hidden, so the cards were queryable and
// unclickable — a good reminder that "the element exists" is not "the player
// can use it".
await page.click('#menu-loadout')
await page.waitForSelector('#loadout-station:not(.hidden)', { timeout: 15000 })
await wait(1200)

const cards = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.spec-select-card')).map((el) => ({
    id: el.dataset.spec ?? '',
    name: el.querySelector('.spec-name')?.textContent ?? '',
    desc: el.querySelector('.spec-desc')?.textContent ?? '',
    malus: el.querySelector('.spec-malus')?.textContent ?? '',
    active: el.classList.contains('active'),
  })),
)

console.log(`\nSPECIALISATION CARDS IN THE FORGE — ${cards.length} offered`)
for (const c of cards) {
  console.log(
    `  ${(c.id || '(none)').padEnd(16)} ${c.name.padEnd(12)} ${c.malus ? 'costs: ' + c.malus : 'no cost'}${c.active ? '   [SELECTED]' : ''}`,
  )
}

let picked = null
let serverHp = null
let expectedHp = null
if (cards.length > 1) {
  // Pick the first real specialisation and confirm the build.
  const target = cards.find((c) => c.id)
  picked = target.id
  await page.click(`.spec-select-card[data-spec="${picked}"]`)
  await wait(300)
  await page.screenshot({ path: path.join(root, '.verify', 'spec-forge.png') })
  await page.click('#ls-confirm').catch(() => {})
  // Confirming from the menu starts the match; the server commits the build on
  // the way in, so give it the join before asking what it thinks we are.
  await page.waitForSelector('#menu-train', { state: 'visible', timeout: 15000 }).catch(() => {})
  await page.click('#menu-train').catch(() => {})
  await page
    .waitForSelector('#menu-train-competent', { state: 'visible', timeout: 10000 })
    .catch(() => {})
  await page.click('#menu-train-competent').catch(() => {})
  await wait(9000)

  const state = await page.evaluate(() => window.__buildState?.() ?? null)
  serverHp = state?.hp ?? null
  const def = SPECIALIZATION_DEFS[picked]
  expectedHp = def ? maxHpForBuild(def.classId, picked) : null
  console.log(
    `\npicked ${picked} — server says class=${state?.classId} spec=${state?.specializationId} hp=${serverHp}` +
      `  (expected hp ${expectedHp})`,
  )
}

const sawCards = cards.length > 1
const serverAgrees = serverHp !== null && expectedHp !== null && serverHp === expectedHp
console.log(
  `\ncards rendered: ${sawCards ? 'yes' : 'NO'}   server applied the pick: ${serverAgrees ? 'yes' : 'NO'}`,
)
console.log(errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].slice(0, 5).join('\n  ') : 'no page errors')
await browser.close()
process.exit(sawCards && serverAgrees ? 0 : 1)
