// shot.mjs — Headless 3D screenshots of RAGEQUIT via Playwright + SwiftShader.
//
// The game renders continuously (rAF), so page.screenshot() times out. Instead we
// launch Chromium with the SwiftShader software-GL backend and read pixels straight
// off the WebGL canvas with gl.readPixels() — which works mid-render-loop. The page
// is loaded with ?capture=1 so the renderer enables preserveDrawingBuffer.
//
// Prereqs: client (vite :5174) + server (colyseus :2567) already running.
// Usage:  node tools/verify/shot.mjs [baseUrl] [outPrefix]
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const base = (process.argv[2] ?? 'http://127.0.0.1:5174/').replace(/\/?$/, '/')
const prefix = process.argv[3] ?? 'shot'
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
// Fresh profile → no saved loadout → match-entry routes to the Loadout Forge. Seed the
// "configured" flag (and skip the tutorial) so training launches straight into the arena.
// Class/ability slots fall back to sensible defaults when unset.
await page.addInitScript(() => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
  } catch {
    /* storage optional */
  }
})
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

// Read the WebGL framebuffer directly (works during the render loop). Returns a
// data URL plus a coverage ratio (fraction of opaque, non-black pixels) so callers
// can tell a real rendered frame from an empty/cleared buffer.
async function grabGL() {
  return page.evaluate(() => {
    const wc = document.querySelector('canvas')
    if (!wc) return null
    const gl = wc.getContext('webgl2') || wc.getContext('webgl')
    if (!gl) return null
    const w = wc.width
    const h = wc.height
    const px = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)
    let covered = 0
    for (let i = 0; i < px.length; i += 4)
      if (px[i + 3] !== 0 && (px[i] || px[i + 1] || px[i + 2])) covered++
    const c2 = document.createElement('canvas')
    c2.width = w
    c2.height = h
    const x = c2.getContext('2d')
    const img = x.createImageData(w, h)
    for (let y = 0; y < h; y++)
      img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
    x.putImageData(img, 0, 0)
    return { url: c2.toDataURL('image/png'), coverage: covered / (w * h) }
  })
}

// Poll the framebuffer until the scene is actually drawn (coverage past a floor),
// then save. Avoids capturing the transparent/cleared buffer before the arena loads.
async function captureGL(name, { minCoverage = 0.5, timeout = 20000 } = {}) {
  let last = null
  for (let waited = 0; waited <= timeout; waited += 500) {
    last = await grabGL()
    if (last && last.coverage >= minCoverage) break
    await wait(500)
  }
  if (!last) {
    console.log(`  [${name}] no canvas/gl`)
    return 0
  }
  writeFileSync(path.join(outDir, `${prefix}-${name}.png`), Buffer.from(last.url.split(',')[1], 'base64'))
  console.log(`  saved .verify/${prefix}-${name}.png (coverage ${(last.coverage * 100).toFixed(0)}%)`)
  return last.coverage
}

await page.goto(`${base}?capture=1`, { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('#menu-train', { timeout: 20000 })
await wait(1500)
// Menu is DOM/light → normal screenshot is fine and reliable here.
await page.screenshot({ path: path.join(outDir, `${prefix}-menu.png`) })
console.log(`  saved .verify/${prefix}-menu.png`)

// Enter a training match (default class). Wait for each control to be visible before
// clicking — the difficulty buttons reveal after the mode is picked.
await page.click('#menu-train')
await page.waitForSelector('#menu-train-competent', { state: 'visible', timeout: 10000 })
await page.click('#menu-train-competent')
await page
  .waitForFunction(() => document.body.classList.contains('input-locked'), { timeout: 25000 })
  .catch(() => {})
// captureGL polls until the arena/characters actually render (coverage floor).
await captureGL('match')
// Strafe right for the second frame — stays inside the lit pit (walking forward
// marches into the dark gate tunnel and yields a near-black frame).
await page.keyboard.down('d')
await wait(1200)
await page.keyboard.up('d')
await wait(900)
await captureGL('match2', { minCoverage: 0.3 })

if (errors.length) {
  console.log('PAGE ERRORS (first 12):')
  for (const e of [...new Set(errors)].slice(0, 12)) console.log('  ' + e)
} else {
  console.log('no page errors')
}
await browser.close()
