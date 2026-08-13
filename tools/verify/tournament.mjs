// tournament.mjs — proves death is final, in a real match.
//
// The rule is one line of code (`respawnTickFor`), which makes it exactly the
// kind of change that unit-tests green and ships broken: the mode string has to
// reach the room, the room has to reach the damage path, and the client has to
// stop offering a respawn. A test of the pure function proves none of that.
//
// So this joins a tournament, dies, and watches. If a respawn timer appears, or
// the player comes back alive, the mode is FFA wearing a crown.
//
// Prereqs: client :5173 + server running.  Usage: node tools/verify/tournament.mjs
import { chromium } from 'playwright'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript(() => {
  try {
    localStorage.setItem('ragequit.profile.configured', 'true')
    localStorage.setItem('ragequit.tutorial.done', 'true')
    localStorage.setItem('ragequit.loadout.classId', 'mage')
  } catch {
    /* storage optional */
  }
})
page.on('pageerror', (e) => errors.push('PAGE: ' + String(e) + ' | ' + String(e.stack ?? '').split('\n').slice(0, 4).join(' << ')))

await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'load', timeout: 30000 })
await page.waitForSelector('#menu-tournament', { timeout: 20000 })
await wait(1000)
await page.click('#menu-tournament')
await wait(9000)
await page
  .locator('canvas')
  .first()
  .click({ timeout: 5000 })
  .catch(() => {})

// Walk INTO the fight rather than waiting to be found. Standing still made the
// probe depend on whether seven bots happened to wander past a stationary mage,
// and a harness whose verdict is "inconclusive" half the time proves nothing.
await page.keyboard.down('KeyW')
const samples = []
let died = false
let cameBack = false
let peakAlive = 0
let aliveWentUp = false
for (let i = 0; i < 40; i++) {
  await wait(3000)
  const s = await page.evaluate(() => {
    const st = window.__castState?.() ?? {}
    const b = window.__buildState?.() ?? null
    return {
      dead: st.dead === true,
      phase: st.phase,
      alive: st.alive ?? 0,
      total: st.total ?? 0,
      hp: b?.hp ?? null,
    }
  })
  samples.push(s)
  if (s.dead) died = true
  if (died && !s.dead && s.phase === 'live') cameBack = true
  // The claim, watched across the WHOLE lobby: in a tournament nobody comes
  // back, so the alive count can only fall. This does not depend on a bot
  // choosing to kill the probe, which made the first version of this harness
  // report "inconclusive" half the time.
  if (s.phase === 'live') {
    if (s.alive > peakAlive && peakAlive > 0) aliveWentUp = true
    peakAlive = Math.max(peakAlive, s.alive)
  }
  if (s.phase === 'matchEnd') break
}
await page.keyboard.up('KeyW')

const last = samples[samples.length - 1] ?? {}
const live = samples.filter((s) => s.phase === 'live')
const firstAlive = live[0]?.alive ?? 0
const lastAlive = live[live.length - 1]?.alive ?? 0
console.log('')
console.log(`samples: ${samples.length}   final phase: ${last.phase}   players: ${last.total}`)
console.log(`alive across the match: ${firstAlive} -> ${lastAlive}   (peak ${peakAlive})`)
console.log(`probe died: ${died}   probe respawned after dying: ${cameBack}`)
console.log(`alive count ever increased: ${aliveWentUp}`)

const eliminationsSeen = firstAlive > lastAlive
const pass = !aliveWentUp && !cameBack && (eliminationsSeen || died)
if (!eliminationsSeen && !died) {
  console.log('')
  console.log('INCONCLUSIVE: nobody died all match, so finality was never tested.')
} else {
  console.log('')
  console.log(
    pass
      ? 'PASS: players were eliminated and none came back.'
      : 'FAIL: someone came back — tournament is respawning like FFA.',
  )
}
console.log(errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].slice(0, 5).join('\n  ') : 'no page errors')
await browser.close()
process.exit(pass ? 0 : 1)
