// feel.mjs — measure how movement FEELS, as numbers.
//
// Every other probe in here photographs the game. This one runs the real shared
// controller — the same code the server runs — and prints the speed curve, the
// stop distance and the jump arc. Feel is not a matter of opinion once you can
// read it off a table:
//
//   * time to reach full speed  — 0 ms means the character has no weight
//   * stopping distance         — 0 m means it stops like a cursor, not a body
//   * apex time / air time      — how long a jump actually hangs
//   * strafe-jump ceiling       — what a good turn earns over a bad one, and
//                                 whether the air cap is a number anyone meets
//
// Run: node tools/verify/feel.mjs   (needs `pnpm build:shared` first)
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const shared = (p) => new URL(`file:///${path.join(root, 'packages/shared/dist', p).replace(/\\/g, '/')}`)

const { simulatePlayer } = await import(shared('sim/controller.js'))
const { getMap } = await import(shared('sim/map.js'))
const { MOVE_SPEED_MPS } = await import(shared('constants/stats.js'))
const { AIR_SPEED_CAP_MPS, ARENA_BOUNDS_RADIUS_M } = await import(shared('constants/world.js'))

const DT = 1 / 60
const map = getMap('duel_arena')

// Spawn clear of cover: at the arena origin the capsule starts inside a cover
// block and the collision resolver correctly steps it up a metre, which would
// be read as a jump 50% higher than designed.
const CLEAR_SPOT = { x: 8, z: 8 }

const fresh = () => ({
  pos: { x: CLEAR_SPOT.x, y: 0.9, z: CLEAR_SPOT.z },
  vel: { x: 0, y: 0, z: 0 },
  onGround: true,
  coyoteTicksLeft: 0,
  stamina: 100,
  momentumTicks: 0,
  jumpHoldTicksLeft: 0,
})
const hspeed = (s) => Math.hypot(s.vel.x, s.vel.z)
const input = (moveZ, jump = false) => ({ moveX: 0, moveZ, yaw: 0, jump, seq: 0 })
const ms = (ticks) => Math.round(ticks * DT * 1000)

// ── Ramp up: how long until the character is at full speed? ────────────────
const st = fresh()
let ticksTo90 = -1
let ticksToFull = -1
for (let i = 0; i < 120; i++) {
  simulatePlayer(st, input(-1), DT, map, undefined)
  const v = hspeed(st)
  if (ticksTo90 < 0 && v >= MOVE_SPEED_MPS * 0.9) ticksTo90 = i + 1
  if (ticksToFull < 0 && v >= MOVE_SPEED_MPS * 0.99) ticksToFull = i + 1
}

// ── Stop: how far do you travel after letting go? ──────────────────────────
const startZ = st.pos.z
let stopTicks = 0
for (let i = 0; i < 120; i++) {
  simulatePlayer(st, input(0), DT, map, undefined)
  stopTicks = i + 1
  if (hspeed(st) < 0.05) break
}
const stopDist = Math.abs(st.pos.z - startZ)

// ── Turn: how long to fully reverse at speed? ──────────────────────────────
const turn = fresh()
for (let i = 0; i < 60; i++) simulatePlayer(turn, input(-1), DT, map, undefined)
let reverseTicks = -1
for (let i = 0; i < 120; i++) {
  simulatePlayer(turn, input(1), DT, map, undefined)
  if (reverseTicks < 0 && turn.vel.z >= MOVE_SPEED_MPS * 0.9) reverseTicks = i + 1
}

// ── Jump arc ───────────────────────────────────────────────────────────────
const j = fresh()
simulatePlayer(j, input(0, true), DT, map, undefined)
let apexTicks = 0
let peak = j.pos.y
let airTicks = 0
for (let i = 0; i < 300; i++) {
  simulatePlayer(j, input(0), DT, map, undefined)
  if (j.pos.y > peak) {
    peak = j.pos.y
    apexTicks = i + 2
  }
  if (j.onGround) {
    airTicks = i + 2
    break
  }
}

// --- Strafe-jump ceiling (D18) ---------------------------------------------
// A cap only means something if a player can reach it AND has to work for it.
// Simulated on the real controller over an empty, unbounded field so the number
// is about the movement model, not about this arena's furniture.
const OPEN = { boxes: [], groundY: 0, spawns: [] }
function strafeChain(hops, turnPerTick) {
  const s = fresh()
  s.pos = { x: 0, y: 0.9, z: 0 }
  let yaw = 0
  const step = (moveX, jump) =>
    simulatePlayer(s, { moveX, moveZ: -1, yaw, jump, jumpHold: false }, DT, OPEN)
  for (let i = 0; i < 90; i++) step(0, false)
  let best = 0
  for (let h = 0; h < hops; h++) {
    step(1, true)
    let guard = 0
    while (!s.onGround && guard++ < 200) {
      yaw += turnPerTick
      step(1, false)
    }
    best = Math.max(best, Math.hypot(s.vel.x, s.vel.z))
  }
  return best
}
const sloppy = strafeChain(8, 0.004)
const skilled = strafeChain(8, 0.014)

const row = (label, value, verdict) =>
  console.log(`  ${label.padEnd(30)} ${String(value).padStart(10)}   ${verdict}`)

console.log('\nMOVEMENT FEEL — measured on the real shared controller\n')
row('top speed (m/s)', MOVE_SPEED_MPS.toFixed(2), '')
row(
  'time to 90% speed',
  `${ms(ticksTo90 < 0 ? 0 : ticksTo90)} ms`,
  ticksTo90 <= 1 ? '← INSTANT: no acceleration' : '',
)
row('time to full speed', `${ms(ticksToFull < 0 ? 0 : ticksToFull)} ms`, '')
row(
  'stop distance',
  `${stopDist.toFixed(3)} m`,
  stopDist < 0.05 ? '← INSTANT: no friction, stops like a cursor' : '',
)
row('time to stop', `${ms(stopTicks)} ms`, '')
row(
  'full reversal at speed',
  `${ms(reverseTicks < 0 ? 0 : reverseTicks)} ms`,
  reverseTicks <= 1 ? '← INSTANT: no momentum to fight' : '',
)
row('jump peak height', `${(peak - 0.9).toFixed(2)} m`, '')
row('time to apex', `${ms(apexTicks)} ms`, '')
row('total air time', `${ms(airTicks)} ms`, '')
console.log('')
row('air speed cap (m/s)', AIR_SPEED_CAP_MPS.toFixed(2), `${(AIR_SPEED_CAP_MPS / MOVE_SPEED_MPS).toFixed(2)}x base`)
row(
  'strafe chain, sloppy turn',
  `${sloppy.toFixed(2)} m/s`,
  '',
)
row(
  'strafe chain, tight turn',
  `${skilled.toFixed(2)} m/s`,
  skilled >= AIR_SPEED_CAP_MPS - 0.01
    ? '← reaches the cap'
    : '← CAP UNREACHABLE: raising it changes nothing',
)
row(
  'what technique is worth',
  `+${(skilled - sloppy).toFixed(2)} m/s`,
  skilled - sloppy < 1 ? '← FLAT: no skill gradient' : '',
)
row('arena radius (m)', ARENA_BOUNDS_RADIUS_M.toFixed(2), ARENA_BOUNDS_RADIUS_M > 0 ? '' : '← UNBOUNDED: you can run to infinity')
console.log('')
