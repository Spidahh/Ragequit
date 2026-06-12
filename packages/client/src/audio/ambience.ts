// Procedural movement/world/UI SFX (zero files) — companion to SoundEngine.
// Footstep scuffs driven by grounded stride distance, a quiet looped wind bed,
// and small UI tones (weapon swap, status applied). Routed through the engine's
// master gain so volume/mute apply.
import type { SoundEngine } from './sound-engine.js'

let _strideAccum = 0
let _ambientOn = false

/** Mechanical click — weapon swap. */
export function playSwap(engine: SoundEngine): void {
  const { ac, out, muted } = engine.graph()
  if (muted) return
  const len = Math.floor(ac.sampleRate * 0.028)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.22))
  const src = ac.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.08
  const filt = ac.createBiquadFilter()
  filt.type = 'highpass'
  filt.frequency.value = 1100
  const gain = ac.createGain()
  gain.gain.value = 0.3
  src.connect(filt)
  filt.connect(gain)
  gain.connect(out)
  src.start()
}

/** Short tone — status applied notification. */
export function playStatus(engine: SoundEngine, element = 'none'): void {
  const { ac, out, muted } = engine.graph()
  if (muted) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  const freqByElement: Record<string, number> = {
    fire: 440,
    ice: 900,
    lightning: 1200,
    dark: 220,
    nature: 550,
  }
  osc.frequency.value = freqByElement[element] ?? 360
  gain.gain.setValueAtTime(0.18, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18)
  osc.connect(gain)
  gain.connect(out)
  osc.start()
  osc.stop(ac.currentTime + 0.2)
}

/** One soft surface scuff (lowpassed noise burst). */
export function playFootstep(engine: SoundEngine, power = 1): void {
  const { ac, out, muted } = engine.graph()
  if (muted) return
  const len = Math.floor(ac.sampleRate * 0.055)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3))
  const src = ac.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.2
  const filt = ac.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.value = 420
  const gain = ac.createGain()
  gain.gain.value = 0.085 * power
  src.connect(filt)
  filt.connect(gain)
  gain.connect(out)
  src.start()
}

let _lastX: number | null = null
let _lastZ = 0

/**
 * Stride-driven footsteps: call every input tick with the player's absolute
 * X/Z; tracks the delta internally and emits one scuff every ~2.1 m of
 * grounded travel. Also lazily starts the ambient wind bed (idempotent).
 */
export function tickFootsteps(
  engine: SoundEngine,
  x: number,
  z: number,
  onGround: boolean,
  dead: boolean,
  jumped = false,
): void {
  startAmbient(engine)
  if (jumped) engine.playJump() // jump edge is sampled once per tick upstream
  const moved = _lastX === null ? 0 : Math.hypot(x - _lastX, z - _lastZ)
  _lastX = x
  _lastZ = z
  // Teleports/respawns produce a huge single-tick delta — not a stride.
  if (!onGround || dead || moved > 2.5) {
    _strideAccum = 0
    return
  }
  _strideAccum += moved
  if (_strideAccum > 2.1) {
    _strideAccum = 0
    playFootstep(engine)
  }
}

/** Quiet looped wind bed with a slow swell. Idempotent. */
export function startAmbient(engine: SoundEngine): void {
  if (_ambientOn) return
  _ambientOn = true
  const { ac, out } = engine.graph()
  const len = Math.floor(ac.sampleRate * 2)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    d[i] = last * 3.5
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  const filt = ac.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.value = 240
  const gain = ac.createGain()
  gain.gain.value = 0.035
  // Slow swell so the wind breathes instead of droning.
  const lfo = ac.createOscillator()
  lfo.frequency.value = 0.07
  const lfoDepth = ac.createGain()
  lfoDepth.gain.value = 0.014
  lfo.connect(lfoDepth)
  lfoDepth.connect(gain.gain)
  src.connect(filt)
  filt.connect(gain)
  gain.connect(out)
  src.start()
  lfo.start()
}
