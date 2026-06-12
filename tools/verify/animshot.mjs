// animshot.mjs — one inspector screenshot with a FORCED animation state, so
// non-idle clips (run/death/attack) can be visually verified per class.
// Usage: node tools/verify/animshot.mjs <class> <weapon> <run|death|attack>
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const klass = process.argv[2] ?? 'mage'
const weapon = process.argv[3] ?? 'staff'
const anim = process.argv[4] ?? 'run'
const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const outDir = path.join(root, '.verify')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 700, height: 700 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
await page.goto(
  `http://127.0.0.1:5174/inspect.html?class=${klass}&weapon=${weapon}&view=full&yaw=2.3&anim=${anim}`,
  { waitUntil: 'load', timeout: 30000 },
)
await page.waitForSelector('body[data-ready="1"]', { timeout: 25000 }).catch(() => {})
// Let the forced clip play into a representative mid-pose.
await new Promise((r) => setTimeout(r, 900))
const dataUrl = await page.evaluate(() => {
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
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
  x.putImageData(img, 0, 0)
  return c2.toDataURL('image/png')
})
if (dataUrl) {
  const f = `anim-${klass}-${anim}.png`
  writeFileSync(path.join(outDir, f), Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log('saved .verify/' + f)
}
console.log(errors.length ? 'ERRORS: ' + [...new Set(errors)].slice(0, 5).join(' | ') : 'no page errors')
await browser.close()
