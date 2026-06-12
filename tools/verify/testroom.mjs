// testroom.mjs — capture the Test Room: the player spawns FACING the 4 class
// dummies (tank/archer/mage/hybrid), so a straight frame grab shows every
// remote-player weapon/grip/pose. The honest "all four at once" check.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const outDir = path.join(root, '.verify')
mkdirSync(outDir, { recursive: true })
const errors = []

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.addInitScript(() => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
  } catch {}
})
page.on('pageerror', (e) => errors.push('PAGE: ' + String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text())
})

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(2500)
await page.locator('#mm-training, [data-mode="training"], button:has-text("ALLENAMENTO")').first()
  .click({ timeout: 8000 }).catch(() => {})
await page.waitForTimeout(700)
await page.locator('button:has-text("Stanza Test"), button:has-text("🧪")').first()
  .click({ timeout: 6000 }).catch(() => {})
await page.waitForTimeout(12000) // wait for all dummy GLBs to load + settle

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
  if (dataUrl) {
    writeFileSync(path.join(outDir, `testroom-${name}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'))
    console.log('saved .verify/testroom-' + name + '.png')
  }
}

await grab('spawnview')
// Step a little closer for a tighter look (dummies are ~8 m ahead of spawn).
const canvas = page.locator('canvas').first()
await canvas.click({ timeout: 5000 }).catch(() => {})
await page.waitForTimeout(400)
await page.keyboard.down('w')
await page.waitForTimeout(900)
await page.keyboard.up('w')
await page.waitForTimeout(600)
await grab('close')

// Diagnostic: for every dummy, where do the weapon and shield ACTUALLY hang?
const diag = await page.evaluate(() => {
  const remotes = globalThis.__remotes
  if (!remotes) return 'no __remotes'
  const out = []
  for (const [id, r] of remotes) {
    const g = r.mesh
    const wg = g?.userData?.['weaponGroup']
    const sg = g?.userData?.['shieldGroup']
    const model = g?.userData?.['charModel']
    const V = g.position.constructor
    const wp = wg ? wg.getWorldPosition(new V()) : null
    const sp = sg ? sg.getWorldPosition(new V()) : null
    const gp = g.getWorldPosition(new V())
    const rel = (p) => (p ? [p.x - gp.x, p.y - gp.y, p.z - gp.z].map((n) => +n.toFixed(2)) : null)
    out.push({
      id: id.slice(0, 6),
      weapon: r.activeWeapon,
      hasModel: !!model,
      weaponParent: wg?.parent?.name || wg?.parent?.type,
      shieldParent: sg?.parent?.name || sg?.parent?.type,
      shieldVisible: sg?.visible,
      weaponRel: rel(wp),
      shieldRel: rel(sp),
    })
  }
  return out
})
console.log('DIAG:', JSON.stringify(diag, null, 1))
console.log(errors.length ? 'ERRORS: ' + [...new Set(errors)].slice(0, 6).join(' | ').slice(0, 400) : 'no errors')
await browser.close()
