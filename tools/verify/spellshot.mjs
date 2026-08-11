// spellshot.mjs — capture spell bolts IN FLIGHT (three.quarks layer check).
//
// Joins training as the given class (SHOT_CLASS, default mage), grabs pointer
// lock like probe.mjs, then repeatedly fires M1 while sampling frames every
// ~90 ms. Frames are only kept when the page reports live projectiles, so the
// output actually shows the bolt + embers instead of empty arena.
//
// Prereqs: client (vite :5174) + server (:2567) running.
// Usage: SHOT_CLASS=mage node tools/verify/spellshot.mjs

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const klass = process.env['SHOT_CLASS'] ?? 'mage'
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
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

await page.goto('http://127.0.0.1:5174/?capture=1', { waitUntil: 'load', timeout: 30000 })
await wait(2500)
await page
  .locator('button:has-text("ALLENAMENTO")')
  .first()
  .click({ timeout: 8000 })
  .catch(() => {})
await wait(700)
await page
  .locator('button:has-text("Novizio")')
  .first()
  .click({ timeout: 5000 })
  .catch(() => {})
await wait(5000)
await page
  .locator('canvas')
  .first()
  .click({ timeout: 5000 })
  .catch(() => {})
await wait(700)
// Show the debug HUD so #dbg-proj carries the live projectile count.
await page.keyboard.press('Backquote')
await wait(200)

const projCount = () =>
  page.evaluate(() => Number(document.getElementById('dbg-proj')?.textContent || '0'))

async function grabFrame(tag) {
  return page.evaluate((t) => {
    const wc = document.querySelector('canvas')
    const gl = wc?.getContext('webgl2') || wc?.getContext('webgl')
    if (!wc || !gl) return null
    const w = wc.width
    const h = wc.height
    const px = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)
    let lit = 0
    for (let i = 0; i < px.length; i += 40) {
      if (px[i] + px[i + 1] + px[i + 2] > 30) lit++
    }
    const c2 = document.createElement('canvas')
    c2.width = w
    c2.height = h
    const x = c2.getContext('2d')
    const img = x.createImageData(w, h)
    for (let y = 0; y < h; y++)
      img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
    x.putImageData(img, 0, 0)
    return { url: c2.toDataURL('image/png'), coverage: lit / (px.length / 40), tag: t }
  }, tag)
}

// Fire volleys: press-hold-release M1, grab a frame only while the schema
// actually carries a live projectile (cheap count check first).
let saved = 0
let maxSeen = 0
for (let volley = 0; volley < 6 && saved < 4; volley++) {
  await page.mouse.move(640, 400)
  await page.mouse.down()
  await wait(160)
  await page.mouse.up()
  for (let s = 0; s < 12 && saved < 4; s++) {
    await wait(80)
    const count = await projCount()
    maxSeen = Math.max(maxSeen, count)
    if (count > 0) {
      const shot = await grabFrame(`v${volley}s${s}`)
      if (shot) {
        writeFileSync(
          path.join(outDir, `spell-${klass}-${shot.tag}.png`),
          Buffer.from(shot.url.split(',')[1], 'base64'),
        )
        console.log(
          `  saved spell-${klass}-${shot.tag}.png (proj=${count}, coverage ${(shot.coverage * 100).toFixed(0)}%)`,
        )
        saved++
      }
    }
  }
  await wait(250)
}
console.log(`  max live projectiles seen: ${maxSeen}`)

if (saved === 0) console.log('  NO frames with live projectiles captured — check input path')
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exit(errors.length > 0 || saved === 0 ? 1 : 0)
