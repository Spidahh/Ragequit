// inspect.mjs — close-up character screenshots via the /inspect.html page.
// Renders one class through the real loader and grabs the WebGL framebuffer from
// several yaw angles (front / 3-4 / side / back) plus a head zoom, so the rig,
// faces, weapon grip and shield can be verified. SwiftShader + gl.readPixels, same
// as shot.mjs.
//
// Usage: node tools/verify/inspect.mjs <class> [weapon] [parry0|1]
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const klass = process.argv[2] ?? 'tank'
const weapon = process.argv[3] ?? 'sword'
const parry = process.argv[4] === '1' ? '1' : '0'
const base = 'http://127.0.0.1:5174/inspect.html'
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
const page = await browser.newPage({ viewport: { width: 900, height: 900 } })
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

async function grab(name) {
  const dataUrl = await page.evaluate(() => {
    const wc = document.querySelector('canvas')
    if (!wc) return null
    const gl = wc.getContext('webgl2') || wc.getContext('webgl')
    if (!gl) return null
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
    return c2.toDataURL('image/png')
  })
  if (!dataUrl) {
    console.log(`  [${name}] no canvas`)
    return
  }
  writeFileSync(path.join(outDir, `insp-${klass}-${name}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log(`  saved .verify/insp-${klass}-${name}.png`)
}

async function shot(name, q) {
  await page.goto(`${base}?class=${klass}&weapon=${weapon}&parry=${parry}&${q}`, {
    waitUntil: 'load',
    timeout: 30000,
  })
  await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 }).catch(() => {})
  await wait(400)
  await grab(name)
}

// Full body at four yaws (front PI, 3/4 ~2.3, side PI/2, back 0) + a head zoom.
await shot('front', 'view=full&yaw=3.14159')
await shot('q34', 'view=full&yaw=2.3')
await shot('side', 'view=full&yaw=1.5708')
await shot('back', 'view=full&yaw=0')
await shot('head', 'view=head&yaw=3.14159')

if (errors.length) {
  console.log('PAGE ERRORS (first 10):')
  for (const e of [...new Set(errors)].slice(0, 10)) console.log('  ' + e)
} else {
  console.log('no page errors')
}
await browser.close()
