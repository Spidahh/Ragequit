// WebAudio-based procedural sound engine — zero external files.
// AudioContext is created lazily on the first call so we satisfy the
// "must be triggered by a user gesture" browser requirement.

export class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private _muted = false

  private canResumeAudio(): boolean {
    return navigator.userActivation?.isActive ?? true
  }

  /** Create/resume the audio graph from a real keyboard or pointer gesture. */
  unlock(): void {
    if (!this.ctx && !this.canResumeAudio()) return
    void this.ac
  }

  private get ac(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this._volume
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended' && this.canResumeAudio()) void this.ctx.resume()
    return this.ctx
  }
  private get out(): AudioNode {
    void this.ac
    return this.masterGain!
  }

  /** Randomise playbackRate +/- variance to avoid machine-gun effect. */
  private _pitch(bufSrc: AudioBufferSourceNode, variance = 0.08): void {
    bufSrc.playbackRate.value = 1 + (Math.random() * 2 - 1) * variance
  }

  get muted(): boolean {
    return this._muted
  }
  set muted(v: boolean) {
    this._muted = v
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : this._volume
  }

  private _volume = 0.55
  get volume(): number {
    return this._volume
  }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this.masterGain && !this._muted) this.masterGain.gain.value = this._volume
  }

  /** Short noise burst — sword/arrow/melee impact. power 0‒1. */
  playHit(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const len = Math.floor(ac.sampleRate * 0.06)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.value = 700 + power * 500
    filt.Q.value = 0.5
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.3 + power * 0.45, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.09)
    src.connect(filt)
    filt.connect(gain)
    gain.connect(out)
    this._pitch(src)
    src.start()
  }

  // ─── Impact sounds ───────────────────────────────────────────────────────

  /** Attacker: physical melee thud — low sine body + high metallic click. */
  playMeleeThud(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    // Body: low-frequency sine punch.
    const osc = ac.createOscillator()
    const oscGain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(90 + power * 30, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.08)
    oscGain.gain.setValueAtTime(0.5 * power, ac.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.1)
    osc.connect(oscGain)
    oscGain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.12)
    // Metallic click: short hi-freq noise burst.
    const len = Math.floor(ac.sampleRate * 0.022)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18))
    const src = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.value = 2200
    filt.Q.value = 1.5
    const ng = ac.createGain()
    ng.gain.value = 0.18 * power
    src.connect(filt)
    filt.connect(ng)
    ng.connect(out)
    this._pitch(src)
    src.start()
  }

  /** Attacker: heavy melee thud — amplified for combo hit 2. */
  playHeavyHit(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const osc = ac.createOscillator()
    const oscGain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(100 + power * 40, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(38, ac.currentTime + 0.11)
    oscGain.gain.setValueAtTime(0.75 * power, ac.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.14)
    osc.connect(oscGain)
    oscGain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.16)
    // Sub bass reinforcement.
    const osc2 = ac.createOscillator()
    const g2 = ac.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = 180
    g2.gain.setValueAtTime(0.28 * power, ac.currentTime)
    g2.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08)
    osc2.connect(g2)
    g2.connect(out)
    osc2.start()
    osc2.stop(ac.currentTime + 0.1)
    // Metallic click.
    const len = Math.floor(ac.sampleRate * 0.028)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.16))
    const src = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.value = 2400
    filt.Q.value = 1.2
    const ng = ac.createGain()
    ng.gain.value = 0.28 * power
    src.connect(filt)
    filt.connect(ng)
    ng.connect(out)
    this._pitch(src)
    src.start()
  }

  /** Attacker: CRACK — combo hit 3 — hard transient + distorted punch. */
  playCrack(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    // Distorted oscillator punch.
    const osc = ac.createOscillator()
    const oscGain = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(110, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.045)
    // WaveShaper for hard distortion.
    const ws = ac.createWaveShaper()
    const curve = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1
      curve[i] = Math.max(-1, Math.min(1, x * 3.5))
    }
    ws.curve = curve
    oscGain.gain.setValueAtTime(0.9 * power, ac.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.07)
    osc.connect(ws)
    ws.connect(oscGain)
    oscGain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.08)
    // Noise transient.
    const len = Math.floor(ac.sampleRate * 0.04)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25))
    const src = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type = 'allpass'
    filt.frequency.value = 600
    const ng = ac.createGain()
    ng.gain.value = 0.65 * power
    src.connect(filt)
    filt.connect(ng)
    ng.connect(out)
    this._pitch(src)
    src.start()
  }

  /** Attacker: projectile (arrow/bolt) impact — thwack noise + body resonance. */
  playProjectileImpact(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    // Noise burst BPF — sharp "thwack".
    const len = Math.floor(ac.sampleRate * 0.065)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.value = 800 + power * 400
    filt.Q.value = 2
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.4 * power, ac.currentTime)
    ng.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.07)
    src.connect(filt)
    filt.connect(ng)
    ng.connect(out)
    this._pitch(src)
    src.start()
    // Body resonance.
    const osc = ac.createOscillator()
    const og = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = 140
    og.gain.setValueAtTime(0.22 * power, ac.currentTime)
    og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06)
    osc.connect(og)
    og.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.07)
  }

  /** Attacker: AoE zone impact — low boom + rumble. */
  playAoeImpact(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const osc = ac.createOscillator()
    const og = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(55, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.22)
    og.gain.setValueAtTime(0.45 * power, ac.currentTime)
    og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.32)
    const lpf = ac.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 400
    osc.connect(lpf)
    lpf.connect(og)
    og.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.35)
  }

  /** Renamed original — used as fallback for unknown ability hits. */
  playAbilityHit(power = 1): void {
    this.playHit(power)
  }

  // ─── Dispatcher: attacker side ───────────────────────────────────────────

  /**
   * Play the attacker-side impact sound for a given PendingDamage cause string.
   * Call this INSTEAD of playHit() for combo hit 1 (hits 2 and 3 are handled
   * by the combo escalation path which calls playHeavyHit / playCrack directly).
   */
  playHitByType(cause: string, power = 1): void {
    if (cause === 'sword_m1' || cause === 'uppercut') return this.playMeleeThud(power)
    // bow/staff cause may be suffixed (e.g. ':chain').
    if (cause === 'bow' || cause.startsWith('bow:')) return this.playProjectileImpact(power)
    if (cause === 'staff' || cause.startsWith('staff:')) return this.playProjectileImpact(power)
    if (cause.startsWith('zone:') || cause.startsWith('combo:')) return this.playAoeImpact(power)
    return this.playAbilityHit(power)
  }

  // ─── Victim-side impact sounds ───────────────────────────────────────────

  /** Victim: received melee — dull grunt + low thud. */
  playHurtMelee(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
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
    this._pitch(src)
    src.start()
  }

  /** Victim: received arrow/bolt — sharp "thwack" at point of impact. */
  playHurtProjectile(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
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
    this._pitch(src)
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

  /** Victim: received zone/AoE — muffled explosion boom. */
  playHurtAoe(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
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
    this._pitch(src)
    src.start()
  }

  /** Victim: received ability hit — magic "zap" sweep. */
  playHurtAbility(power = 1): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
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

  // ─── Dispatcher: victim side ─────────────────────────────────────────────

  /** Play the victim-side "received damage" sound based on damage source. */
  playHurtByType(cause: string, power = 1): void {
    if (cause === 'sword_m1' || cause === 'uppercut') return this.playHurtMelee(power)
    if (cause === 'bow' || cause.startsWith('bow:')) return this.playHurtProjectile(power)
    if (cause === 'staff' || cause.startsWith('staff:')) return this.playHurtProjectile(power)
    if (cause.startsWith('zone:') || cause.startsWith('combo:')) return this.playHurtAoe(power)
    return this.playHurtAbility(power)
  }

  /** Element-themed tone sweep on ability cast. */
  playCast(element = 'none'): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const freqMap: Record<string, [number, number]> = {
      fire: [310, 700],
      ice: [600, 1100],
      lightning: [900, 2400],
      dark: [200, 80],
      nature: [440, 660],
      none: [280, 480],
    }
    const [f0, f1] = freqMap[element] ?? freqMap['none']!
    osc.type = element === 'lightning' ? 'sawtooth' : element === 'dark' ? 'sine' : 'triangle'
    osc.frequency.setValueAtTime(f0, ac.currentTime)
    osc.frequency.linearRampToValueAtTime(f1, ac.currentTime + 0.18)
    gain.gain.setValueAtTime(0.16, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.25)
  }

  /** Ascending arpeggio — kill confirm. */
  playKill(): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    for (const [i, freq] of ([523, 659, 784] as const).entries()) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const t = ac.currentTime + i * 0.065
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      osc.connect(gain)
      gain.connect(out)
      osc.start(t)
      osc.stop(t + 0.22)
    }
  }

  /** Descending whomp — self death. */
  playDeath(): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(38, ac.currentTime + 0.7)
    gain.gain.setValueAtTime(0.42, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.75)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.8)
  }

  /** Short upward frequency sweep — jump. */
  playJump(): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(170, ac.currentTime)
    osc.frequency.linearRampToValueAtTime(360, ac.currentTime + 0.11)
    gain.gain.setValueAtTime(0.11, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.13)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.14)
  }

  /** Mechanical click — weapon swap. */
  playSwap(): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const len = Math.floor(ac.sampleRate * 0.028)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.22))
    const src = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type = 'highpass'
    filt.frequency.value = 1100
    const gain = ac.createGain()
    gain.gain.value = 0.3
    src.connect(filt)
    filt.connect(gain)
    gain.connect(out)
    this._pitch(src)
    src.start()
  }

  /** Metallic ring — parry / block. */
  playParry(): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 1380
    gain.gain.setValueAtTime(0.32, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.38)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.42)
  }

  /** Short tone — status applied notification. */
  playStatus(element = 'none'): void {
    if (this._muted) return
    const ac = this.ac,
      out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value =
      element === 'fire'
        ? 440
        : element === 'ice'
          ? 900
          : element === 'lightning'
            ? 1200
            : element === 'dark'
              ? 220
              : element === 'nature'
                ? 550
                : 360
  }

  // ─── Spatial audio ───────────────────────────────────────────────────────

  /**
   * Update the AudioContext listener position (call every frame with camera pos).
   * yaw: camera rotation Y in radians.
   */
  updateListener(x: number, y: number, z: number, yaw: number): void {
    const ac = this.ctx
    if (!ac) return
    const l = ac.listener
    if (l.positionX) {
      l.positionX.value = x
      l.positionY.value = y
      l.positionZ.value = z
      l.forwardX.value = -Math.sin(yaw)
      l.forwardY.value = 0
      l.forwardZ.value = -Math.cos(yaw)
      l.upX.value = 0
      l.upY.value = 1
      l.upZ.value = 0
    } else {
      // Legacy API
      l.setPosition(x, y, z)
      l.setOrientation(-Math.sin(yaw), 0, -Math.cos(yaw), 0, 1, 0)
    }
  }

  /**
   * Create a PannerNode at the given world position, connected to masterGain.
   * Returns an AudioNode to connect sound sources to.
   * Max distance 40m; beyond that the sound is inaudible.
   */
  private _spatialOut(wx: number, wy: number, wz: number): AudioNode {
    const ac = this.ac
    const panner = ac.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 3
    panner.maxDistance = 40
    panner.rolloffFactor = 1.2
    if (panner.positionX) {
      panner.positionX.value = wx
      panner.positionY.value = wy
      panner.positionZ.value = wz
    } else {
      panner.setPosition(wx, wy, wz)
    }
    panner.connect(this.out)
    return panner
  }

  /**
   * Play a spatial hit sound at world position (wx, wy, wz).
   * Used for remote player impacts — volume and pan based on distance/angle.
   */
  playRemoteHit(wx: number, wy: number, wz: number, power = 0.7): void {
    if (this._muted) return
    const ac = this.ac
    const out = this._spatialOut(wx, wy, wz)
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
    this._pitch(src, 0.1)
    src.start()
  }

  /**
   * Play a spatial cast whoosh at world position.
   */
  playRemoteCast(wx: number, wy: number, wz: number, element = 'none'): void {
    if (this._muted) return
    const ac = this.ac
    const out = this._spatialOut(wx, wy, wz)
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const baseFreq = element === 'fire' ? 180 : element === 'ice' ? 320 : element === 'lightning' ? 480 : 240
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

  // ─── Low-HP heartbeat ────────────────────────────────────────────────────

  /**
   * Procedural heartbeat — two short low-frequency pulses (lub-dub).
   * Call at ~0.5-0.8 Hz when player HP is critically low.
   */
  playHeartbeat(intensity = 1.0): void {
    if (this._muted) return
    const ac = this.ac
    const out = this.out

    const playPulse = (delayMs: number, freq: number, gainPeak: number): void => {
      const t = ac.currentTime + delayMs / 1000
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(gainPeak * intensity, t + 0.028)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      osc.connect(gain)
      gain.connect(out)
      osc.start(t)
      osc.stop(t + 0.14)
    }

    // lub: lower frequency, louder
    playPulse(0, 55, 0.32)
    // dub: slightly higher frequency, softer — like a real heartbeat
    playPulse(200, 48, 0.22)
  }

  // ─── Arena ambient ───────────────────────────────────────────────────────

  private _ambientSource: AudioBufferSourceNode | null = null
  private _ambientGain: GainNode | null = null

  /**
   * Start a subtle arena ambient loop: low hum + gentle crowd murmur.
   * Call once when entering a match. Fades in over 2 seconds.
   */
  startArenaAmbient(): void {
    if (this._muted || this._ambientSource) return
    const ac = this.ac
    const out = this.out

    // Create ~4 second looping buffer of procedural noise
    const sampleRate = ac.sampleRate
    const len = sampleRate * 4
    const buf = ac.createBuffer(2, len, sampleRate)

    // Left and right channels with slightly different noise for width
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      let prev = 0
      for (let i = 0; i < len; i++) {
        // Brown noise via integration of white noise — low rumble
        const white = Math.random() * 2 - 1
        prev = (prev + 0.02 * white) / 1.02
        // Mix: 70% brown + 5% white for presence
        d[i] = prev * 0.7 + white * 0.05
      }
    }

    const src = ac.createBufferSource()
    src.buffer = buf
    src.loop = true

    // Bandpass to keep only 80-400 Hz range (arena rumble)
    const bandpass = ac.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 160
    bandpass.Q.value = 0.4

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, ac.currentTime)
    gain.gain.linearRampToValueAtTime(0.08, ac.currentTime + 2.0) // fade in 2s

    src.connect(bandpass)
    bandpass.connect(gain)
    gain.connect(out)
    src.start()

    this._ambientSource = src
    this._ambientGain = gain
  }

  /**
   * Stop the arena ambient loop. Fades out over 1 second.
   */
  stopArenaAmbient(): void {
    const src = this._ambientSource
    const gain = this._ambientGain
    if (!src || !gain) return
    const ac = this.ctx
    if (!ac) return
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + 1.0)
    src.stop(ac.currentTime + 1.1)
    this._ambientSource = null
    this._ambientGain = null
  }

  // ─── Element-specific impact sounds ────────────────────────────────────────

  /**
   * Play an element-flavored impact sound for ability hits.
   * Called when a projectile or ability resolves on a target.
   */
  playElementImpact(element: string, power = 0.7): void {
    if (this._muted) return
    const ac = this.ac
    const out = this.out

    switch (element) {
      case 'fire': {
        // Crackling whoosh — sine sweep + noise
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(180 * power, ac.currentTime)
        osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.15)
        g.gain.setValueAtTime(0.22 * power, ac.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22)
        osc.connect(g); g.connect(out)
        osc.start(); osc.stop(ac.currentTime + 0.25)
        break
      }
      case 'ice': {
        // Crystalline tinkle — high-freq triangle ring
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(1400 + Math.random() * 200, ac.currentTime)
        osc.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.18)
        g.gain.setValueAtTime(0.18 * power, ac.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.28)
        osc.connect(g); g.connect(out)
        osc.start(); osc.stop(ac.currentTime + 0.3)
        break
      }
      case 'lightning': {
        // Sharp electric zap — short noise burst high-passed
        const len = Math.floor(ac.sampleRate * 0.04)
        const buf = ac.createBuffer(1, len, ac.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3))
        const srcN = ac.createBufferSource()
        srcN.buffer = buf
        const hp = ac.createBiquadFilter()
        hp.type = 'highpass'; hp.frequency.value = 2800
        const g = ac.createGain()
        g.gain.setValueAtTime(0.35 * power, ac.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06)
        srcN.connect(hp); hp.connect(g); g.connect(out)
        this._pitch(srcN, 0.12)
        srcN.start()
        break
      }
      case 'dark': {
        // Deep void thud — low sine with sub-bass
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(55 * power, ac.currentTime)
        osc.frequency.exponentialRampToValueAtTime(28, ac.currentTime + 0.2)
        g.gain.setValueAtTime(0.3 * power, ac.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3)
        osc.connect(g); g.connect(out)
        osc.start(); osc.stop(ac.currentTime + 0.35)
        break
      }
      case 'nature': {
        // Organic rustle — mid-freq noise with slight pitch
        const len = Math.floor(ac.sampleRate * 0.08)
        const buf = ac.createBuffer(1, len, ac.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.6
        const srcN = ac.createBufferSource()
        srcN.buffer = buf
        const bp = ac.createBiquadFilter()
        bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.2
        const g = ac.createGain()
        g.gain.setValueAtTime(0.25 * power, ac.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12)
        srcN.connect(bp); bp.connect(g); g.connect(out)
        this._pitch(srcN, 0.1)
        srcN.start()
        break
      }
      default:
        // Physical/neutral — reuse playHit
        this.playHit(power)
    }
  }

}