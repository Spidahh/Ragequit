// hud.mjs — HUD-layout audit. Enters a real training match, then captures the
// HUD as pure DOM (the 3D canvas is hidden for the shot) so page.screenshot()
// never fights the rAF loop and the layout is judged on its own terms.
//
// This is the harness for "the hotbar reads as one undifferentiated blob"
// class of complaints: it also dumps the measured geometry of every hotbar
// section so gaps/overlaps are numbers, not opinions.
//
// Prereqs: client :5173 + server running.  Usage: node tools/verify/hud.mjs [class]
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const klass = process.argv[2] ?? 'hybrid'
const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const outDir = path.join(root, '.verify')
mkdirSync(outDir, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})
// deviceScaleFactor 2 so the element close-ups are legible enough to grade
// small type (truncated ability names are the whole point of this probe).
// HUD_W/HUD_H let the caller re-check the layout at the 1280x720 floor.
const vw = Number(process.env['HUD_W'] ?? 1600)
const vh = Number(process.env['HUD_H'] ?? 900)
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 })
await page.addInitScript((cls) => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
    if (cls) localStorage.setItem('ragequit.loadout.classId', cls)
  } catch {
    /* storage optional */
  }
}, klass)
page.on('pageerror', (e) => errors.push('PAGE: ' + String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text())
})

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('#menu-train', { timeout: 20000 })
await wait(1200)

await page.click('#menu-train')
await page.waitForSelector('#menu-train-competent', { state: 'visible', timeout: 10000 })
await page.click('#menu-train-competent')
await page
  .waitForFunction(() => document.body.classList.contains('input-locked'), { timeout: 25000 })
  .catch(() => {})
await wait(4000)

// page.screenshot() waits on the compositor surface, which never settles while
// the game's rAF render loop runs (it times out even with the canvas hidden,
// and CDP fromSurface:false is unavailable headless). So: neutralise
// requestAnimationFrame. The render loop re-schedules itself each frame, so it
// stops after the current one, the compositor idles, and the screenshot lands
// instantly. The HUD is plain DOM — it stays exactly as it was. One-way: the
// page is frozen from here on, which is fine for a layout audit.
async function freezeRenderLoop() {
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0
  })
  await wait(400)
}

// Hide the WebGL canvas so the HUD is judged as the pure overlay it is, over a
// neutral mid-grey — low-contrast HUD chrome can't hide against pure black.
async function captureDom(name, bg) {
  await page.evaluate((color) => {
    // REMOVE the canvases, not just hide them: under SwiftShader a live WebGL
    // canvas keeps the compositor busy enough that screenshots time out.
    for (const c of document.querySelectorAll('canvas')) c.remove()
    // Headless has no pointer lock, so the pause overlay auto-opens and dims
    // the HUD behind it — that dimming is NOT how the HUD looks in play.
    // Inline display:none, because `.hidden` loses to the ID rules here.
    for (const id of ['pause-menu', 'settings-overlay', 'leaderboard-overlay', 'scoreboard'])
      document.getElementById(id)?.style.setProperty('display', 'none', 'important')
    document.body.style.background = color
  }, bg)
  await wait(400)
  await page.screenshot({
    path: path.join(outDir, `hud-${name}.png`),
    timeout: 60000,
    animations: 'disabled',
  })
  console.log(`  saved .verify/hud-${name}.png`)
}

const readoutState = () =>
  page.evaluate(() => {
    const el = document.getElementById('ability-readout')
    if (!el) return null
    const b = el.getBoundingClientRect()
    return {
      visible: el.classList.contains('visible'),
      classes: el.className,
      text: el.textContent?.replace(/\s+/g, ' ').trim(),
      rect: {
        x: Math.round(b.x),
        y: Math.round(b.y),
        w: Math.round(b.width),
        h: Math.round(b.height),
      },
    }
  })

// HUD_CAST=1 → actually fire abilities and inspect the cast feedback.
// Headless has no pointer lock, so the game pauses and gates input until the
// canvas is engaged — click it FIRST or every keypress is silently dropped.
if (process.env['HUD_CAST'] === '1') {
  await page
    .locator('canvas')
    .first()
    .click({ timeout: 5000 })
    .catch(() => {})
  await wait(500)
  for (const key of ['Digit1', 'Digit4']) {
    await page.keyboard.press(key)
    await wait(220)
    console.log(`  [cast ${key}] ${JSON.stringify(await readoutState())}`)
    await wait(1500) // let it auto-hide before the next one
  }
}

await freezeRenderLoop()
// Re-fire once with the loop frozen so the readout is still on screen for the
// picture. Its auto-hide timer would fire long before the screenshot lands, so
// neutralise setTimeout first — the page is frozen for capture anyway.
if (process.env['HUD_CAST'] === '1') {
  await page.evaluate(() => {
    window.setTimeout = () => 0
  })
  await page.keyboard.press('Digit1')
  await wait(200)
}
await captureDom(`${klass}-overlay`, '#3a3a3a')
if (process.env['HUD_CAST'] === '1')
  console.log(`  [cast shot] ${JSON.stringify(await readoutState())}`)

// Close-up of the ability bar alone — the layout detail (truncated names,
// section separation, contrast) is invisible at full-frame scale.
for (const [name, sel] of [
  ['hotbar', '#cd-strip'],
  ['vitals', '#hud-panel'],
]) {
  const el = await page.$(sel)
  if (!el) {
    console.log(`  [${name}] selector ${sel} not found`)
    continue
  }
  await el
    .screenshot({ path: path.join(outDir, `hud-${klass}-${name}-zoom.png`), timeout: 30000 })
    .then(() => console.log(`  saved .verify/hud-${klass}-${name}-zoom.png`))
    .catch((e) => console.log(`  [${name}] ${e.message.split('\n')[0]}`))
}

// Measure the hotbar: are the four weapon sections actually separated on screen?
const geom = await page.evaluate(() => {
  const r = (el) => {
    const b = el.getBoundingClientRect()
    return {
      x: Math.round(b.x),
      y: Math.round(b.y),
      w: Math.round(b.width),
      h: Math.round(b.height),
    }
  }
  const sections = Array.from(document.querySelectorAll('.hotbar-section')).map((s) => ({
    family: s.dataset.family,
    classes: s.className,
    rect: r(s),
    headText: s.querySelector('.hotbar-section-head')?.textContent?.trim(),
    headStyle: (() => {
      const h = s.querySelector('.hotbar-section-head')
      if (!h) return null
      const cs = getComputedStyle(h)
      return { display: cs.display, fontSize: cs.fontSize, color: cs.color, opacity: cs.opacity }
    })(),
    sectionStyle: (() => {
      const cs = getComputedStyle(s)
      return {
        border: cs.border,
        background: cs.background.slice(0, 80),
        margin: cs.margin,
        padding: cs.padding,
        opacity: cs.opacity,
        filter: cs.filter,
      }
    })(),
    pips: Array.from(s.querySelectorAll('.cd-pip')).map((p) => ({
      ability: p.dataset.abilityId,
      rect: r(p),
      short: p.querySelector('.ability-short-name')?.textContent,
      key: p.querySelector('.label')?.textContent,
    })),
  }))
  const host = document.querySelector('#cd-strip') || document.querySelector('.cd-strip')
  return {
    hostId: host?.id,
    hostRect: host ? r(host) : null,
    hostStyle: host
      ? (() => {
          const cs = getComputedStyle(host)
          return { display: cs.display, gap: cs.gap, flexDirection: cs.flexDirection }
        })()
      : null,
    sections,
  }
})
writeFileSync(path.join(outDir, `hud-${klass}-geometry.json`), JSON.stringify(geom, null, 2))
console.log(`  saved .verify/hud-${klass}-geometry.json`)
console.log(`  hotbar host: ${JSON.stringify(geom.hostRect)} gap=${geom.hostStyle?.gap}`)
for (const s of geom.sections) {
  console.log(
    `   [${s.family}] rect=${s.rect.x},${s.rect.y} ${s.rect.w}x${s.rect.h} head="${s.headText}" pips=${s.pips.length}`,
  )
}

// Hard gate: the ability bar must fit on screen. A pip-size change once pushed
// the UTILITY section past the right edge at 1280x720 and nothing caught it.
const overflow = []
if (geom.hostRect) {
  const right = geom.hostRect.x + geom.hostRect.w
  if (geom.hostRect.x < 0) overflow.push(`hotbar starts off-screen left (x=${geom.hostRect.x})`)
  if (right > vw) overflow.push(`hotbar overflows right edge (${right} > ${vw})`)
  const bottom = geom.hostRect.y + geom.hostRect.h
  if (bottom > vh) overflow.push(`hotbar overflows bottom edge (${bottom} > ${vh})`)
}
for (const s of geom.sections) {
  const r = s.rect.x + s.rect.w
  if (r > vw) overflow.push(`section ${s.family} overflows right edge (${r} > ${vw})`)
}

console.log(
  errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].slice(0, 10).join('\n  ') : 'no page errors',
)
await browser.close()

if (overflow.length) {
  console.error(`✗ HUD LAYOUT at ${vw}x${vh}:`)
  for (const o of overflow) console.error('  ' + o)
  process.exit(1)
}
console.log(`✓ HUD fits at ${vw}x${vh}`)
