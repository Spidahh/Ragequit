// aimpreview.mjs — proves D12: every ability shows its shape before it commits.
//
// The claim under test is not "a preview exists" but "holding ANY hotbar key
// puts geometry on screen, and the shapes differ by ability". So this does two
// things a screenshot cannot:
//
//   1. it holds the key DOWN (press+release would cast and clear the preview),
//   2. it measures. For each slot it reads the solver's own output through
//      window.__aimShapes and diffs the framebuffer against a keys-up baseline,
//      so "nothing was drawn" fails loudly instead of producing a plausible
//      picture of an arena.
//
// It also records the match state per slot, because a preview that is missing
// because the round ended is a different fact from one that is missing because
// nothing draws it — and the first version of this script could not tell them
// apart, which cost an afternoon.
//
// Prereqs: client :5173 + server running.
// Usage: node tools/verify/aimpreview.mjs [classId]   (default: mage)
//
// Run it for a class with movement abilities too (`hybrid`, `ranger`): the dash
// ghost is the shape that had no preview of any kind before D12, so a mage-only
// pass proves the easy half.
//
// CAVEAT on the pixel column: training bots crowd the spawn, and a bot standing
// in the camera turns the whole frame over — the hybrid pass reads 70-90 % for
// that reason alone, and its screenshots are a close-up of someone's leg. The
// shape list and the crosshair alignment come from the solver and stay valid;
// treat the percentage as a presence check, not a measurement.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const outDir = path.join(root, '.verify')
mkdirSync(outDir, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []
const CLASS_ID = process.argv[2] || 'mage'

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
await page.addInitScript((classId) => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
    localStorage.setItem('ragequit.loadout.classId', classId)
  } catch {
    /* storage optional */
  }
}, CLASS_ID)
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
await wait(4500)
await page
  .locator('canvas')
  .first()
  .click({ timeout: 5000 })
  .catch(() => {})
await wait(600)

/**
 * Snapshot the framebuffer and diff it against the stored baseline IN THE PAGE.
 *
 * The first version shipped the raw pixel array across the CDP bridge and then
 * diffed it in node: 4 M numbers per capture, ~50 s each, nine minutes for the
 * run — long enough for the training round to end halfway through, after which
 * five slots reported "nothing drawn" for reasons that had nothing to do with
 * the preview. Measuring where the pixels already are costs milliseconds.
 */
async function grab(storeBaseline = false) {
  return page.evaluate((store) => {
    const wc = document.querySelector('canvas')
    const gl = wc?.getContext('webgl2') || wc?.getContext('webgl')
    if (!wc || !gl) return null
    const w = wc.width
    const h = wc.height
    const px = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)

    let delta = 0
    const base = window.__aimBaseline
    if (store) {
      window.__aimBaseline = { w, h, px }
    } else if (base && base.w === w && base.h === h) {
      let n = 0
      for (let i = 0; i < px.length; i += 4) {
        if (
          Math.abs(px[i] - base.px[i]) > 10 ||
          Math.abs(px[i + 1] - base.px[i + 1]) > 10 ||
          Math.abs(px[i + 2] - base.px[i + 2]) > 10
        )
          n++
      }
      delta = n / (px.length / 4)
    }

    const c2 = document.createElement('canvas')
    c2.width = w
    c2.height = h
    const x = c2.getContext('2d')
    const img = x.createImageData(w, h)
    for (let y = 0; y < h; y++)
      img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
    x.putImageData(img, 0, 0)
    return { w, h, delta, url: c2.toDataURL('image/png') }
  }, storeBaseline)
}

function save(name, shot) {
  writeFileSync(path.join(outDir, name), Buffer.from(shot.url.split(',')[1], 'base64'))
}

// Stand still and look level so the only thing that moves between frames is
// the preview itself. Motion in the arena would masquerade as a preview.
await page.mouse.move(640, 400)
await wait(400)

const baseline = await grab(true)
if (!baseline) {
  console.log('FAIL: no WebGL framebuffer')
  await browser.close()
  process.exit(1)
}
save('aimpreview-baseline.png', baseline)

const rows = []
/**
 * Wait for the render loop to actually produce frames.
 *
 * Under SwiftShader this game runs at 1-4 fps, so waiting 220 ms waits for
 * roughly zero frames: the preview has been requested but never computed, and
 * currentShapes() still holds the PREVIOUS ability's shapes or nothing at all.
 * Five runs of this harness reported a working preview as broken before the
 * frame counter went in. Never sample this on a clock.
 */
async function frames(n) {
  const start = await page.evaluate(() => window.__aimFrames ?? 0)
  await page
    .waitForFunction((s) => (window.__aimFrames ?? 0) >= s, start + n, {
      timeout: 20000,
      polling: 60,
    })
    .catch(() => {})
}

for (let slot = 1; slot <= 8; slot++) {
  await page.keyboard.down(`Digit${slot}`)
  await frames(2)
  const shapes = await page.evaluate(() => window.__aimShapes?.() ?? null)
  const state = (await page.evaluate(() => window.__castState?.() ?? null)) ?? {}
  // A lane drawn from the wrong origin, or with a flipped pitch convention,
  // still renders a confident beam — pointing somewhere the shot will not go.
  // Its endpoint must project to the crosshair.
  const ndc = await page.evaluate(() => window.__laneOnCrosshair?.() ?? null)
  const shot = await grab()
  await page.keyboard.up(`Digit${slot}`)
  // Let the cast resolve and the world settle before the next slot, or the
  // previous spell's VFX counts as this one's preview.
  await frames(3)

  rows.push({
    slot,
    ability: shapes?.[0]?.abilityId ?? '',
    kinds: shapes?.length ? shapes.map((s) => s.kind).join('+') : '—',
    delta: shot?.delta ?? 0,
    phase: state.phase ?? '?',
    dead: state.dead ? 'dead' : '',
    bound: state.loadout?.[slot - 1] ?? '(unbound)',
    aim: ndc ? Math.max(Math.abs(ndc.ndcX), Math.abs(ndc.ndcY)) : null,
  })
  if (shot) save(`aimpreview-slot${slot}.png`, shot)
}

console.log('\nslot  ability             shapes            pixels    result')
let drawn = 0
for (const r of rows) {
  const aimed = r.aim === null || r.aim < 0.02
  const ok = r.delta > 0.004 && r.kinds !== '—' && aimed
  if (ok) drawn++
  console.log(
    `  ${r.slot}   ${String(r.bound).padEnd(18)} ${r.kinds.padEnd(17)} ` +
      `${(r.delta * 100).toFixed(2).padStart(6)}%  ` +
      `${(r.aim === null ? 'n/a' : r.aim.toFixed(4)).padStart(9)}      ` +
      `${ok ? 'DRAWN' : !aimed ? 'OFF-AIM' : r.dead || 'NOTHING'}`,
  )
}
console.log(`\n${drawn}/${rows.length} slots draw a preview while their key is held.`)
console.log(
  errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].slice(0, 8).join('\n  ') : 'no page errors',
)
await browser.close()
process.exit(drawn === rows.length ? 0 : 1)
