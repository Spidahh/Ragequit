// probe.mjs — interactive gameplay smoke probe. Actually PLAYS for ~25 s
// (move, look, attack, ability, weapon swap, parry) while recording:
//   • console/page errors
//   • frame hitches (rAF gaps > 150 ms — the "si blocca tutto" detector)
//   • a couple of mid-action frames
// Prereqs: client :5173 + server :2567 running.  Usage: node tools/verify/probe.mjs [class]
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const klass = process.argv[2] ?? 'mage'
const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const outDir = path.join(root, '.verify')
mkdirSync(outDir, { recursive: true })
const errors = []

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((cls) => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
    if (cls) localStorage.setItem('ragequit.loadout.classId', cls)
  } catch {}
  // Frame hitch monitor: record rAF gaps > 150 ms.
  window.__hitches = []
  let last = performance.now()
  const tick = (t) => {
    const gap = t - last
    if (gap > 150) window.__hitches.push(Math.round(gap))
    last = t
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}, klass)
page.on('pageerror', (e) => errors.push('PAGE: ' + String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text())
})

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(2500)
// Enter training (same flow the shot harness uses): click the training tile.
const trainBtn = page.locator('#mm-training, [data-mode="training"], button:has-text("ALLENAMENTO")').first()
await trainBtn.click({ timeout: 8000 }).catch(() => {})
await page.waitForTimeout(800)
const noviceBtn = page.locator('button:has-text("Novizio"), #training-novice').first()
await noviceBtn.click({ timeout: 5000 }).catch(() => {})
await page.waitForTimeout(4000)

// Click canvas to grab pointer lock, then play.
const canvas = page.locator('canvas').first()
await canvas.click({ timeout: 5000 }).catch(() => {})
await page.waitForTimeout(600)

async function grab(name) {
  const dataUrl = await page.evaluate(() => {
    const wc = document.querySelector('canvas')
    const gl = wc?.getContext('webgl2') || wc?.getContext('webgl')
    if (!wc || !gl) return null
    const w = wc.width, h = wc.height
    const px = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)
    const c2 = document.createElement('canvas')
    c2.width = w; c2.height = h
    const x = c2.getContext('2d')
    const img = x.createImageData(w, h)
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
    x.putImageData(img, 0, 0)
    return c2.toDataURL('image/png')
  })
  if (dataUrl) writeFileSync(path.join(outDir, `probe-${klass}-${name}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'))
}

const progStart = await page.evaluate(() => globalThis.__renderer?.info?.programs?.length ?? -1)
console.log('SHADER PROGRAMS at match start:', progStart)

// ~25 s of real play: run + look around + attacks + ability + swap + parry.
const acts = [
  async () => { await page.keyboard.down('w'); await page.mouse.move(640, 400); },
  async () => { await page.mouse.move(900, 380, { steps: 10 }) },
  async () => { await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up() }, // attack/cast
  async () => { await page.waitForTimeout(300); await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up() }, // repeat (re-trigger test)
  async () => { await grab('cast') },
  async () => { await page.keyboard.press('1') }, // ability
  async () => { await page.mouse.move(400, 420, { steps: 12 }) },
  async () => { await page.keyboard.press('Tab') }, // weapon swap
  async () => { await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up() },
  async () => { await grab('swap') },
  async () => { await page.mouse.down({ button: 'right' }); await page.waitForTimeout(500); await page.mouse.up({ button: 'right' }) }, // parry
  async () => { await page.keyboard.press('Space') }, // jump
  async () => { await page.waitForTimeout(1200) },
]
for (const a of acts) { await a().catch(() => {}); await page.waitForTimeout(900) }
await page.keyboard.up('w').catch(() => {})

const programs = await page.evaluate(() => globalThis.__renderer?.info?.programs?.length ?? -1)
console.log('SHADER PROGRAMS at end of play:', programs)
const hitches = await page.evaluate(() => window.__hitches ?? [])
console.log('HITCHES (>150ms rAF gaps):', hitches.length ? hitches.join(',') + ' ms' : 'NONE')
const uniq = [...new Set(errors)]
console.log(uniq.length ? 'ERRORS (' + uniq.length + '):' : 'no errors')
for (const e of uniq.slice(0, 12)) console.log('  ' + e.slice(0, 160))
await browser.close()
