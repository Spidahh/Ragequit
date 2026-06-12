// lineup.mjs — one screenshot of several GLBs in a row via /lineup.html.
// Proves distinct class candidates side by side. SwiftShader + gl.readPixels.
// Usage: node tools/verify/lineup.mjs "Knight_Met,pbr_shadowkin_mage_rigged,..."
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const models = process.argv[2] ?? 'Knight_Met'
const yaws = process.argv[3] ?? ''
const base = 'http://127.0.0.1:5174/lineup.html'
const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const outDir = path.join(root, '.verify')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})
const page = await browser.newPage({ viewport: { width: 1800, height: 650 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

const q = `?models=${encodeURIComponent(models)}${yaws ? `&yaws=${encodeURIComponent(yaws)}` : ''}`
await page.goto(`${base}${q}`, { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('body[data-ready="1"]', { timeout: 35000 }).catch(() => {})
await new Promise((r) => setTimeout(r, 700))

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

if (dataUrl) {
  writeFileSync(path.join(outDir, 'lineup.png'), Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log('saved .verify/lineup.png')
} else {
  console.log('no canvas / no gl')
}

if (errors.length) {
  console.log('PAGE ERRORS (first 10):')
  for (const e of [...new Set(errors)].slice(0, 10)) console.log('  ' + e)
} else {
  console.log('no page errors')
}
await browser.close()
