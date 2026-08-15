// Spatialised sounds for OTHER players. Split out of SoundEngine
// (file-budget: AGENTS.md); the engine owns the context, the mute flag and
// the HRTF panner and just delegates the synthesis.

export function remoteHit(
  ac: AudioContext,
  out: AudioNode,
  power: number,
  pitch: (s: AudioBufferSourceNode, variance?: number) => void,
): void {
  const len = Math.floor(ac.sampleRate * 0.055)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.7
  const src = ac.createBufferSource()
  src.buffer = buf
  const filt = ac.createBiquadFilter()
  filt.type = 'bandpass'
  filt.frequency.value = 600 + power * 400
  filt.Q.value = 0.6
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.28 + power * 0.35, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08)
  src.connect(filt)
  filt.connect(gain)
  gain.connect(out)
  pitch(src, 0.1)
  src.start()
}

/** Pure oscillator sweep — no sample source, so no pitch variance to apply. */
export function remoteCast(
  ac: AudioContext,
  out: AudioNode,
  element: string,
  _pitch: (s: AudioBufferSourceNode, variance?: number) => void,
): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const baseFreq =
    element === 'fire' ? 180 : element === 'ice' ? 320 : element === 'lightning' ? 480 : 240
  osc.type = 'sine'
  osc.frequency.setValueAtTime(baseFreq, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, ac.currentTime + 0.15)
  gain.gain.setValueAtTime(0.18, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25)
  osc.connect(gain)
  gain.connect(out)
  osc.start()
  osc.stop(ac.currentTime + 0.28)
}

/**
 * "You connected" marker for the ATTACKER.
 *
 * Landing a hit had no dedicated confirm at all — you heard the impact body,
 * which is the same thing bystanders hear, so there was nothing that said THE
 * HIT WAS YOURS. Parked in a high band (~4.2/5.1 kHz) that nothing else in the
 * mix occupies, with a sharp transient and a very short decay, so it survives a
 * teamfight without adding mud. (Overwatch's frequency-slot method.)
 */
export function hitConfirm(
  ac: AudioContext,
  out: AudioNode,
  tier: 'normal' | 'heavy' | 'kill' = 'normal',
): void {
  const gain = ac.createGain()
  const peak = tier === 'kill' ? 0.3 : tier === 'heavy' ? 0.26 : 0.2
  gain.gain.setValueAtTime(peak, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.055)
  gain.connect(out)
  // Two detuned partials read as a "tick" rather than a pure beep.
  for (const f of tier === 'kill' ? [5200, 6400] : [4200, 5100]) {
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, ac.currentTime)
    // A kill lifts in pitch; a normal hit stays flat so it never sounds like one.
    if (tier === 'kill') osc.frequency.exponentialRampToValueAtTime(f * 1.25, ac.currentTime + 0.05)
    osc.connect(gain)
    osc.start()
    osc.stop(ac.currentTime + 0.07)
  }
}

/** Metallic parry ring at a world position — it used to play at full volume
 *  regardless of distance, which destroyed the directional cue in a brawl. */
export function remoteParry(ac: AudioContext, out: AudioNode): void {
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.3, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.32)
  gain.connect(out)
  for (const f of [1400, 2100, 3000]) {
    const osc = ac.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f
    osc.connect(gain)
    osc.start()
    osc.stop(ac.currentTime + 0.34)
  }
}
