// forge.mjs — Loadout Forge screenshot + legibility audit.
//
// The Forge is pure DOM over a hidden canvas, so it photographs cleanly.
// Besides the picture it reports the computed font sizes and the resolved
// element accent per card, which is how "every ability card looks identical"
// gets measured instead of argued about.
//
// Prereqs: client :5173.  Usage: node tools/verify/forge.mjs [class]
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const klass = process.argv[2] ?? 'mage'
const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const outDir = path.join(root, '.verify')
mkdirSync(outDir, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

const vw = Number(process.env['HUD_W'] ?? 1600)
const vh = Number(process.env['HUD_H'] ?? 900)

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 })
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

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('#menu-loadout', { timeout: 20000 })
await wait(1000)
await page.click('#menu-loadout')
await page.waitForSelector('#loadout-station', { state: 'visible', timeout: 15000 })
await wait(1500)

await page.evaluate(() => {
  for (const c of document.querySelectorAll('canvas')) c.remove()
})
await wait(300)
await page.screenshot({ path: path.join(outDir, `forge-${klass}.png`), timeout: 60000 })
console.log(`  saved .verify/forge-${klass}.png`)

const report = await page.evaluate(() => {
  const accent = (el) => getComputedStyle(el).getPropertyValue('--elem-color').trim() || '(unset)'
  const cards = Array.from(document.querySelectorAll('.pool-card'))
    .slice(0, 10)
    .map((c) => ({
      classes: c.className.split(/\s+/).find((x) => x.startsWith('el-')) ?? '(no el- class)',
      accent: accent(c),
      name: c.querySelector('.pc-name')?.textContent?.trim(),
    }))
  const slots = Array.from(document.querySelectorAll('.ls-slot')).map((s) => ({
    classes: s.className.split(/\s+/).find((x) => x.startsWith('el-')) ?? '(no el- class)',
    accent: accent(s),
  }))
  // Smallest type in the Forge: sub-11px body copy is the legibility red flag.
  const tiny = []
  for (const el of document.querySelectorAll('#loadout-station *')) {
    const text = el.textContent?.trim() ?? ''
    if (!text || el.children.length > 0) continue
    const size = parseFloat(getComputedStyle(el).fontSize)
    if (size < 11) tiny.push({ size, cls: el.className || el.tagName, sample: text.slice(0, 28) })
  }
  return { cards, slots, tinyCount: tiny.length, tinySample: tiny.slice(0, 12) }
})

writeFileSync(path.join(outDir, `forge-${klass}-report.json`), JSON.stringify(report, null, 2))
console.log(`  distinct card accents: ${new Set(report.cards.map((c) => c.accent)).size}`)
for (const c of report.cards) console.log(`   ${c.classes.padEnd(14)} ${c.accent}  ${c.name ?? ''}`)
console.log(`  build-lane accents: ${JSON.stringify(report.slots.map((s) => s.accent))}`)
console.log(`  sub-11px text nodes: ${report.tinyCount}`)
for (const t of report.tinySample) console.log(`   ${t.size}px  ${t.cls}  "${t.sample}"`)

console.log(
  errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].slice(0, 8).join('\n  ') : 'no page errors',
)
await browser.close()
