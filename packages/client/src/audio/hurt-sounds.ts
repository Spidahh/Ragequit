// Damage-taken (victim-side) sounds.
//
// Split out of SoundEngine (file-budget: AGENTS.md). These are pure synthesis
// over a supplied AudioContext, so the engine keeps ownership of the context,
// the mute flag and the pitch-variance helper and just delegates.

export function hurtMelee(
  ac: AudioContext,
  out: AudioNode,
  power: number,
  pitch: (s: AudioBufferSourceNode) => void,
): void {
  const osc = ac.createOscillator()
  const og = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.065)
  og.gain.setValueAtTime(0.45 * power, ac.currentTime)
  og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.09)
  osc.connect(og)
  og.connect(out)
  osc.start()
  osc.stop(ac.currentTime + 0.1)
  // Noise body thump.
  const len = Math.floor(ac.sampleRate * 0.04)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3))
  const src = ac.createBufferSource()
  src.buffer = buf
  const lpf = ac.createBiquadFilter()
  lpf.type = 'lowpass'
  lpf.frequency.value = 350
  const ng = ac.createGain()
  ng.gain.value = 0.3 * power
  src.connect(lpf)
  lpf.connect(ng)
  ng.connect(out)
  pitch(src)
  src.start()
}

export function hurtProjectile(
  ac: AudioContext,
  out: AudioNode,
  power: number,
  pitch: (s: AudioBufferSourceNode) => void,
): void {
  const len = Math.floor(ac.sampleRate * 0.055)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.22))
  const src = ac.createBufferSource()
  src.buffer = buf
  const filt = ac.createBiquadFilter()
  filt.type = 'bandpass'
  filt.frequency.value = 1200
  filt.Q.value = 4
  const ng = ac.createGain()
  ng.gain.setValueAtTime(0.38 * power, ac.currentTime)
  ng.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06)
  src.connect(filt)
  filt.connect(ng)
  ng.connect(out)
  pitch(src)
  src.start()
  // Soft resonance.
  const osc = ac.createOscillator()
  const og = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = 220
  og.gain.setValueAtTime(0.18 * power, ac.currentTime)
  og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.035)
  osc.connect(og)
  og.connect(out)
  osc.start()
  osc.stop(ac.currentTime + 0.04)
}

export function hurtAoe(
  ac: AudioContext,
  out: AudioNode,
  power: number,
  pitch: (s: AudioBufferSourceNode) => void,
): void {
  const len = Math.floor(ac.sampleRate * 0.2)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.55))
  const src = ac.createBufferSource()
  src.buffer = buf
  const lpf = ac.createBiquadFilter()
  lpf.type = 'lowpass'
  lpf.frequency.value = 500
  const ng = ac.createGain()
  ng.gain.value = 0.55 * power
  src.connect(lpf)
  lpf.connect(ng)
  ng.connect(out)
  pitch(src)
  src.start()
}

/** Pure oscillator sweep — no sample source, so no pitch variance to apply. */
export function hurtAbility(
  ac: AudioContext,
  out: AudioNode,
  power: number,
  _pitch: (s: AudioBufferSourceNode) => void,
): void {
  const osc = ac.createOscillator()
  const og = ac.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(880, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(220, ac.currentTime + 0.085)
  og.gain.setValueAtTime(0.28 * power, ac.currentTime)
  og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.1)
  const lpf = ac.createBiquadFilter()
  lpf.type = 'lowpass'
  lpf.frequency.value = 3000
  osc.connect(lpf)
  lpf.connect(og)
  og.connect(out)
  osc.start()
  osc.stop(ac.currentTime + 0.12)
}
