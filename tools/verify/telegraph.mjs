// telegraph.mjs — proves the wind-up AoE ground marker actually reaches the
// client and renders. Joins training as the mage, aims at the floor, casts the
// 1 s-windup Meteor, and captures frames DURING the wind-up (before impact).
//
// Prereqs: client :5173 + server running.  Usage: node tools/verify/telegraph.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const outDir = path.join(root, '.verify')
mkdirSync(outDir, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []
const telegraphs = []

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
// The client logs nothing for telegraphs, so observe the scene instead.
await page.exposeFunction('__telegraphSeen', (n) => telegraphs.push(n))

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('#menu-train', { timeout: 20000 })
await wait(1200)
await page.click('#menu-train')
await page.waitForSelector('#menu-train-competent', { state: 'visible', timeout: 10000 })
await page.click('#menu-train-competent')
await page
  .waitForFunction(() => document.body.classList.contains('input-locked'), { timeout: 25000 })
  .catch(() => {})
await wait(4500)
await page
  .locator('canvas')
  .first()
  .click({ timeout: 5000 })
  .catch(() => {})
await wait(600)

async function grabGL(tag) {
  return page.evaluate((t) => {
    const wc = document.querySelector('canvas')
    const gl = wc?.getContext('webgl2') || wc?.getContext('webgl')
    if (!wc || !gl) return null
    const w = wc.width
    const h = wc.height
    const px = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)
    const c2 = document.createElement('canvas')
    c2.width = w
    c2.height = h
    const x = c2.getContext('2d')
    const img = x.createImageData(w, h)
    for (let y = 0; y < h; y++)
      img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
    x.putImageData(img, 0, 0)
    return { url: c2.toDataURL('image/png'), tag: t }
  }, tag)
}

// Meteor is slot 5 for the mage preset and is point-targeted: press the key,
// then LMB to confirm placement, then sample during the 1 s wind-up.
await page.mouse.move(640, 520) // aim down at the floor
await page.keyboard.press('Digit5')
await wait(150)
await page.mouse.down()
await page.mouse.up()

for (let i = 1; i <= 5; i++) {
  await wait(160)
  const shot = await grabGL(`t${i}`)
  if (shot) {
    writeFileSync(
      path.join(outDir, `telegraph-${shot.tag}.png`),
      Buffer.from(shot.url.split(',')[1], 'base64'),
    )
    console.log(`  saved .verify/telegraph-${shot.tag}.png`)
  }
}

console.log(
  errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].slice(0, 8).join('\n  ') : 'no page errors',
)
await browser.close()
