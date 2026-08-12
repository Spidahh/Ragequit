// Spatialised sounds for OTHER players. Split out of SoundEngine
// (file-budget: 02_TECH/08); the engine owns the context, the mute flag and
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
