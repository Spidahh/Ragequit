// hudlayout.mjs — the HUD, as measured geometry rather than as an opinion.
//
// The owner's report was "things are out of place and everything is
// disproportionate", and the audit found why: every in-match element was
// anchored in absolute px with only three viewport breakpoints in 6903 lines of
// CSS — all three touching only the hotbar pip size. The vitals panel was fixed
// at left:24px with width:318px while the ability bar was centred, so between
// roughly 1381 and 1650 px wide they physically OVERLAPPED, in a band no
// breakpoint covered.
//
// So this measures. It reads the bounding box of every in-match element at
// three viewports and asserts three things a layout must satisfy and that no
// screenshot can confirm at a glance:
//   1. nothing overlaps anything else,
//   2. nothing is off-screen,
//   3. sizes actually CHANGE between a small and a large viewport — because
//      "disproportionate" means fixed px on a screen that is not the one it was
//      authored for.
//
// Prereqs: client :5173 + server running.  Usage: node tools/verify/hudlayout.mjs
import { chromium } from 'playwright'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const VIEWPORTS = [
  { w: 1366, h: 768, name: 'laptop' },
  { w: 1500, h: 900, name: 'the overlap band' },
  { w: 2560, h: 1440, name: '1440p' },
]
// Elements that legitimately sit on top of the world, or on top of each other.
const IGNORE = new Set([
  'crosshair',
  'hit-dir',
  'damage-flash',
  'parry-flash',
  'heal-flash',
  'combo-flash',
  'shoot-flash',
  'gcd-ring',
  'parry-ring',
  'bow-charge',
  'ability-readout',
  'combo-popup',
  'weapon-banner',
  'cast-bar',
])

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const results = []
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ragequit.profile.configured', 'true')
      localStorage.setItem('ragequit.tutorial.done', 'true')
      localStorage.setItem('ragequit.loadout.classId', 'mage')
    } catch {
      /* storage optional */
    }
  })
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('#menu-train', { timeout: 20000 })
  await wait(1000)
  await page.evaluate(() => document.getElementById('menu-train')?.click())
  await page.waitForSelector('#menu-train-competent', { state: 'visible', timeout: 10000 })
  await page.evaluate(() => document.getElementById('menu-train-competent')?.click())
  await wait(9000)

  const boxes = await page.evaluate(
    (ignore) => {
      const out = []
      for (const el of document.querySelectorAll(
        '#hud, #combat-console, #cd-strip, #weapons, .bar, #scoreboard-mini, #kill-feed, #match-banner, #server-toast, #hint',
      )) {
        if (el.classList.contains('hidden')) continue
        const r = el.getBoundingClientRect()
        if (r.width < 2 || r.height < 2) continue
        const id = el.id || el.className.split(' ')[0]
        if (ignore.includes(id)) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0)
          continue
        out.push({ id, x: r.x, y: r.y, w: r.width, h: r.height })
      }
      return out
    },
    [...IGNORE],
  )
  results.push({ vp, boxes })
  await page.close()
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

let problems = 0
for (const { vp, boxes } of results) {
  console.log(`\n${vp.name} ${vp.w}x${vp.h} — ${boxes.length} elements`)
  // Nesting is fine (a bar inside #hud); siblings colliding is not.
  const top = boxes.filter(
    (b) =>
      b.id === 'hud' ||
      b.id === 'combat-console' ||
      b.id === 'kill-feed' ||
      b.id === 'scoreboard-mini' ||
      b.id === 'match-banner',
  )
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const a = top[i],
        b = top[j]
      const nested = a.id === 'combat-console' || b.id === 'combat-console'
      if (!nested && overlaps(a, b)) {
        console.log(`  OVERLAP ${a.id} x ${b.id}`)
        problems++
      }
    }
  }
  for (const b of boxes) {
    if (b.x < -1 || b.y < -1 || b.x + b.w > vp.w + 1 || b.y + b.h > vp.h + 1) {
      console.log(
        `  OFF-SCREEN ${b.id} at (${b.x.toFixed(0)},${b.y.toFixed(0)}) ${b.w.toFixed(0)}x${b.h.toFixed(0)}`,
      )
      problems++
    }
  }
  const hud = boxes.find((b) => b.id === 'hud')
  if (hud)
    console.log(
      `  vitals: ${hud.w.toFixed(0)}x${hud.h.toFixed(0)} at x=${hud.x.toFixed(0)} (centre=${(hud.x + hud.w / 2).toFixed(0)}, screen centre=${vp.w / 2})`,
    )
}

// Does anything actually scale?
const small = results[0].boxes.find((b) => b.id === 'hud')
const large = results[2].boxes.find((b) => b.id === 'hud')
if (small && large) {
  const grew = large.w > small.w + 1 || large.h > small.h + 1
  console.log(
    `\nvitals scale 768p -> 1440p: ${small.w.toFixed(0)}x${small.h.toFixed(0)} -> ${large.w.toFixed(0)}x${large.h.toFixed(0)}  ${grew ? 'SCALES' : 'FIXED PX — disproportionate on big screens'}`,
  )
  if (!grew) problems++
}
console.log(problems === 0 ? '\nlayout OK' : `\n${problems} layout problems`)
await browser.close()
process.exit(problems === 0 ? 0 : 1)
