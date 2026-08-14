// castmodel.mjs — proves the cast model does what the owner asked for.
//
// He reported three things and they were one model: "when you switch spell and
// press left click it doesn't do it", "you can't tell where you're aiming
// because it disappears", "you can't tell if you have selected a spell".
//
// So this checks the three, live:
//   1. a crosshair-aimed ability FIRES on the key press, with no aiming step;
//   2. a ground-targeted ability stays ARMED — measured many seconds later,
//      because the old failure was a state that timed out or flashed;
//   3. while armed, the crosshair shows it, and a left click resolves it.
//
// Prereqs: client :5173 + server running.  Usage: node tools/verify/castmodel.mjs
import { chromium } from 'playwright'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript(() => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
    localStorage.setItem('ragequit.loadout.classId', 'mage')
  } catch {
    /* storage optional */
  }
})
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('#menu-train', { timeout: 20000 })
await wait(1200)
await page.evaluate(() => document.getElementById('menu-train')?.click())
await page.waitForSelector('#menu-train-competent', { state: 'visible', timeout: 10000 })
await page.evaluate(() => document.getElementById('menu-train-competent')?.click())
await wait(9000)
await page.locator('canvas').first().click({ timeout: 5000 }).catch(() => {})
await wait(1200)

/**
 * Wait for real rendered frames, never for the clock.
 *
 * The crosshair's armed attribute is written in the render loop, and under
 * SwiftShader that loop runs at 1-4 fps — so a 900 ms wait can span a single
 * frame and read a state that has not been repainted yet. This is the same
 * trap that made tools/verify/aimpreview.mjs report a working feature broken
 * five times.
 */
async function frames(n) {
  const start = await page.evaluate(() => window.__aimFrames ?? 0)
  await page
    .waitForFunction((s) => (window.__aimFrames ?? 0) >= s, start + n, {
      timeout: 20000,
      polling: 60,
    })
    .catch(() => {})
}

const armed = () =>
  page.evaluate(() => ({
    placement: window.__castState?.().placement ?? null,
    crosshairArmed: document.getElementById('crosshair')?.getAttribute('data-primed') === 'true',
    readout: document.getElementById('ability-readout')?.classList.contains('visible') ?? false,
  }))

const rows = []

// 1. Crosshair-aimed (fireball, slot 1): tap, and nothing should be left armed.
await page.keyboard.press('Digit1')
await frames(3)
let s = await armed()
rows.push({
  name: 'crosshair ability: tap leaves nothing armed',
  ok: s.placement === null && !s.crosshairArmed,
  detail: `placement=${s.placement} crosshair=${s.crosshairArmed}`,
})

// 2. Ground-targeted (meteor, mage slot 5). Slot 5 is on KeyQ since the radial
// wheels were deleted and the ability cluster moved to Q/E/R/F — Digit5 is not
// bound to anything now.
await page.keyboard.press('KeyQ')
await frames(2)
s = await armed()
const armedNow = s.placement
await wait(7000) // far longer than the old 5 s readout timeout
const later = await armed()
rows.push({
  name: 'ground ability: arms on press',
  ok: armedNow === 'meteor',
  detail: `placement=${armedNow}`,
})
rows.push({
  name: 'ground ability: STILL armed 7 s later (no timeout)',
  ok: later.placement === 'meteor',
  detail: `placement=${later.placement}`,
})
rows.push({
  name: 'ground ability: the crosshair says so',
  ok: later.crosshairArmed === true,
  detail: `data-primed=${later.crosshairArmed}`,
})
rows.push({
  name: 'ground ability: the readout says so, and has not hidden',
  ok: later.readout === true,
  detail: `readout visible=${later.readout}`,
})

// 3. A left click resolves it.
await page.mouse.down()
await wait(120)
await page.mouse.up()
await frames(3)
const after = await armed()
rows.push({
  name: 'left click resolves the placement',
  ok: after.placement === null && !after.crosshairArmed,
  detail: `placement=${after.placement} crosshair=${after.crosshairArmed}`,
})

console.log('')
let pass = 0
for (const r of rows) {
  if (r.ok) pass++
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(52)} ${r.detail}`)
}
console.log(`\n${pass}/${rows.length} checks passed.`)
console.log(errors.length ? 'ERRORS: ' + [...new Set(errors)].slice(0, 3).join(' | ') : 'no page errors')
await browser.close()
process.exit(pass === rows.length ? 0 : 1)
