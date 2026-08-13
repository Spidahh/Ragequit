// healthcheck.mjs — walk the flows a real player walks and report anything broken.
//
// Every other probe here proves ONE claim. This one asks the question none of
// them ask: does the game throw, warn, or 404 while somebody actually plays it?
// Console errors are the cheapest signal of a half-finished feature and the one
// nobody looks at, so this makes them a number.
//
// Prereqs: client :5173 + server running.  Usage: node tools/verify/healthcheck.mjs
import { chromium } from 'playwright'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []
const warnings = []
const failedRequests = []

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.addInitScript(() => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
  } catch {
    /* storage optional */
  }
})
const stage = { name: 'boot' }
page.on('pageerror', (e) =>
  errors.push(
    `[${stage.name}] ${String(e).split('\n')[0]} | ${String(e.stack ?? '')
      .split('\n')
      .slice(1, 3)
      .join(' << ')}`,
  ),
)
page.on('console', (m) => {
  const t = m.type()
  if (t === 'error') errors.push(`[${stage.name}] console: ${m.text().slice(0, 220)}`)
  else if (t === 'warning') warnings.push(`[${stage.name}] ${m.text().slice(0, 160)}`)
})
page.on('requestfailed', (r) => {
  const u = r.url()
  if (!u.startsWith('data:')) failedRequests.push(`[${stage.name}] ${u.slice(0, 140)}`)
})
page.on('response', (r) => {
  if (r.status() >= 400)
    failedRequests.push(`[${stage.name}] ${r.status()} ${r.url().slice(0, 140)}`)
})

async function step(name, fn) {
  stage.name = name
  try {
    await fn()
  } catch (e) {
    errors.push(`[${name}] STEP FAILED: ${String(e).split('\n')[0]}`)
  }
}

await step('load', async () => {
  await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('#menu-train', { timeout: 20000 })
  await wait(1500)
})

await step('forge', async () => {
  await page.click('#menu-loadout')
  await page.waitForSelector('#loadout-station:not(.hidden)', { timeout: 15000 })
  await wait(1200)
  // Every class, so a broken preset or portrait shows up here and not in a match.
  for (const c of ['tank', 'archer', 'mage', 'hybrid']) {
    await page.click(`#ls-class-${c}`)
    await wait(700)
    const specs = await page.evaluate(() => document.querySelectorAll('.spec-select-card').length)
    if (specs < 2) errors.push(`[forge] class ${c} offers ${specs} specialisation cards`)
  }
  await page.click('#ls-class-mage')
  await wait(500)
})

await step('match', async () => {
  await page.click('#ls-confirm').catch(() => {})
  await page.waitForSelector('#menu-train', { state: 'visible', timeout: 15000 }).catch(() => {})
  await page.click('#menu-train')
  await page.waitForSelector('#menu-train-competent', { state: 'visible', timeout: 10000 })
  await page.click('#menu-train-competent')
  await wait(9000)
  await page
    .locator('canvas')
    .first()
    .click({ timeout: 5000 })
    .catch(() => {})
  await wait(1500)
})

await step('play', async () => {
  // Fire every slot, move, jump, swing, parry — the whole input surface.
  for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']) {
    await page.keyboard.down(k)
    await wait(400)
    await page.keyboard.up(k)
  }
  for (let slot = 1; slot <= 8; slot++) {
    await page.keyboard.down(`Digit${slot}`)
    await wait(260)
    await page.keyboard.up(`Digit${slot}`)
    await wait(900)
  }
  await page.mouse.down()
  await wait(600)
  await page.mouse.up()
  await page.mouse.down({ button: 'right' })
  await wait(500)
  await page.mouse.up({ button: 'right' })
  await wait(2500)
})

const uniq = (a) => [...new Set(a)]
const e = uniq(errors)
const w = uniq(warnings)
const f = uniq(failedRequests)

console.log(
  `\nHEALTHCHECK — errors ${e.length}, failed requests ${f.length}, warnings ${w.length}\n`,
)
if (e.length) {
  console.log('ERRORS:')
  for (const x of e.slice(0, 20)) console.log('  ' + x)
}
if (f.length) {
  console.log('\nFAILED REQUESTS:')
  for (const x of f.slice(0, 20)) console.log('  ' + x)
}
if (w.length) {
  console.log('\nWARNINGS:')
  for (const x of w.slice(0, 12)) console.log('  ' + x)
}
if (!e.length && !f.length) console.log('clean run')
await browser.close()
process.exit(e.length || f.length ? 1 : 0)
