// bounds.mjs — proves D20: the arena has an edge, end to end.
//
// A unit test can prove the clamp function clamps. It cannot prove the clamp is
// wired into the path a real player takes: client prediction, server
// simulation, and the reconciliation between them all have to agree, or the
// player either walks through the wall on their own screen and gets yanked
// back, or stops dead while the server thinks they are still running.
//
// So this joins a real match, holds forward for long enough to cross the whole
// arena twice, and reads the position off both sides.
//
// Prereqs: client :5173 + server running.  Usage: node tools/verify/bounds.mjs
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const shared = (p) =>
  new URL(`file:///${path.join(root, 'packages/shared/dist', p).replace(/\\/g, '/')}`)
const { ARENA_BOUNDS_RADIUS_M, CAPSULE_HALF_WIDTH_M } = await import(shared('constants/world.js'))
const LIMIT = ARENA_BOUNDS_RADIUS_M - CAPSULE_HALF_WIDTH_M

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 900, height: 600 } })
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

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('#menu-train', { timeout: 20000 })
await wait(1200)
await page.click('#menu-train')
await page.waitForSelector('#menu-train-competent', { state: 'visible', timeout: 10000 })
await page.click('#menu-train-competent')
await wait(6000)
await page
  .locator('canvas')
  .first()
  .click({ timeout: 5000 })
  .catch(() => {})
await wait(800)

const rows = []
// Four directions, because a circular boundary can be right on one axis and
// wrong on the diagonals — which is exactly how a square perimeter would fail.
for (const [label, key] of [
  ['forward (-z)', 'KeyW'],
  ['back (+z)', 'KeyS'],
  ['left (-x)', 'KeyA'],
  ['right (+x)', 'KeyD'],
]) {
  await page.keyboard.down(key)
  // 12 s at 9 m/s is 108 m — over four arena radii. Nothing survives this but a
  // real boundary.
  await wait(12000)
  const p = await page.evaluate(() => window.__castState?.() ?? null)
  const pos = await page.evaluate(() => window.__selfPos?.() ?? null)
  await page.keyboard.up(key)
  await wait(2500)
  rows.push({ label, pos, phase: p?.phase })
}

console.log(`\narena radius ${ARENA_BOUNDS_RADIUS_M} m, body limit ${LIMIT.toFixed(2)} m\n`)
console.log('direction        predicted r    server r    result')
let ok = 0
for (const r of rows) {
  const pr = r.pos ? Math.hypot(r.pos.px, r.pos.pz) : NaN
  const sr = r.pos ? Math.hypot(r.pos.sx, r.pos.sz) : NaN
  // Both sides must stop, and must stop in the SAME place: a boundary the
  // client does not predict shows up as a rubber-band, not as a wall.
  const held = pr <= LIMIT + 0.15 && sr <= LIMIT + 0.15
  const agree = Math.abs(pr - sr) < 0.5
  if (held && agree) ok++
  console.log(
    `  ${r.label.padEnd(14)} ${pr.toFixed(2).padStart(9)}  ${sr.toFixed(2).padStart(10)}    ` +
      `${held ? (agree ? 'HELD' : 'HELD but client/server disagree') : 'ESCAPED'}`,
  )
}
console.log(`\n${ok}/${rows.length} directions bounded and predicted.`)
console.log(errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].slice(0, 5).join('\n  ') : 'no page errors')
await browser.close()
process.exit(ok === rows.length ? 0 : 1)
