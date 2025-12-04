import { eventBus } from '../core/EventBus.js';

export default class AudioManager {
  constructor() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);

    this.setupListeners();
    console.log('🔊 AudioManager initialized');
  }

  resumeContext() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        console.log('🔊 AudioContext resumed successfully');
      });
    }
  }

  setupListeners() {
    eventBus.on('player:attack', (data) => this.playCast(data?.skillId));
    eventBus.on('player:jump', () => this.playJump());
    eventBus.on('player:damage', () => this.playPain());
    eventBus.on('enemy:damage', (data) => this.playHit(data?.isCritical));  // ✅ GDD: Pass critical flag
    eventBus.on('enemy:death', () => this.playFatality());
    eventBus.on('player:step', () => this.playStep());
    // Mute toggle from UI
    eventBus.on('audio:mute', (isMuted) => this.setMute(!!isMuted));
    eventBus.on('audio:toggle', () => this.toggleMute());

    // UI Events
    eventBus.on('ui:hover', () => this.playUiHover());
    eventBus.on('ui:click', () => this.playUiClick());
    eventBus.on('ui:error', () => this.playError());

    // Volume Control
    eventBus.on('audio:volume', (settings) => this.setVolume(settings));
  }

  setVolume(settings) {
    if (settings.masterVolume !== undefined) {
      // Map 0-100 to 0.0-1.0
      const vol = settings.masterVolume / 100;
      this.masterGain.gain.value = vol;
      console.log(`🔊 Master Volume set to ${vol}`);
    }
  }

  // Helpers
  playTone({ startFreq = 440, endFreq = null, type = 'sine', duration = 0.2, attack = 0.005, release = 0.05, startTime = this.ctx.currentTime, volume = 0.5 }) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq != null && endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), startTime + duration);
    }

    // Envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attack);
    gain.gain.setValueAtTime(volume, startTime + Math.max(attack, duration - release));
    gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  playNoise({ duration = 0.1, type = 'white', cutoff = null, filterType = 'lowpass', volume = 0.5, startTime = this.ctx.currentTime }) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6; // white noise
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    let node = source;
    let filter = null;
    if (cutoff) {
      filter = this.ctx.createBiquadFilter();
      filter.type = filterType === 'highpass' ? 'highpass' : 'lowpass';
      filter.frequency.value = cutoff;
      node.connect(filter);
      node = filter;
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

    node.connect(gain);
    gain.connect(this.masterGain);

    source.start(startTime);
  }

  // Specific SFX
  playCast(skillId) {
    const id = String(skillId || '').toLowerCase();

    if (id === 'fireball') {
      // PUNCHIER FIREBALL: Low sine drop + Noise burst
      this.playTone({ startFreq: 300, endFreq: 50, type: 'sine', duration: 0.3, volume: 0.4 });
      this.playNoise({ duration: 0.2, cutoff: 1500, volume: 0.6, startTime: this.ctx.currentTime });
    }
    else if (id === 'shockwave') {
      // BASS BOOM: Low square wave + Lowpass noise
      this.playTone({ startFreq: 100, endFreq: 10, type: 'square', duration: 0.4, volume: 0.3 });
      this.playNoise({ duration: 0.3, cutoff: 500, volume: 0.7 });
    }
    else if (id === 'magic_bolt' || id === 'stone_spikes') {
      // High "pew"
      this.playTone({ startFreq: 600, endFreq: 300, type: 'triangle', duration: 0.15, volume: 0.25 });
    }
    else if (id === 'greatsword' || id === 'sword_swing') {
      // Whoosh: filtered noise
      this.playNoise({ duration: 0.12, cutoff: 1200, volume: 0.45 });
    }
    else if (id === 'arrow' || id === 'multishot') {
      // Bow string snap: high-pass noise click
      this.playNoise({ duration: 0.06, cutoff: 1800, filterType: 'highpass', volume: 0.35 });
    }
    else if (id === 'whirlwind') {
      // ✅ ENHANCED: Spinning vortex + massive air thrust
      this.playTone({ startFreq: 200, endFreq: 400, type: 'sine', duration: 0.4, volume: 0.3 });  // Spin tone
      this.playNoise({ duration: 0.25, cutoff: 1200, volume: 0.5 });  // Air whoosh
    }
    else if (id === 'heavy_strike') {
      // ✅ ENHANCED: Deep melee slash with impact
      this.playNoise({ duration: 0.15, cutoff: 1200, volume: 0.5 });  // Whoosh
      this.playNoise({ duration: 0.1, cutoff: 3000, volume: 0.3, startTime: this.ctx.currentTime + 0.08 });  // Hit impact
    }
    else if (id === 'impale') {
      // ✅ NEW: Instant hitscan - sharp piercing strike
      this.playTone({ startFreq: 800, endFreq: 300, type: 'sine', duration: 0.08, volume: 0.4 });  // Sharp pierce
      this.playNoise({ duration: 0.05, cutoff: 4000, filterType: 'highpass', volume: 0.3 });  // Metallic sting
    }
    else if (id === 'begone') {
      // ✅ NEW: Massive ring-out knockback - booming shockwave
      this.playTone({ startFreq: 80, endFreq: 20, type: 'square', duration: 0.6, volume: 0.4 });  // MASSIVE bass boom
      this.playNoise({ duration: 0.4, cutoff: 600, volume: 0.8, startTime: this.ctx.currentTime });  // Explosion noise
    }
    else if (id === 'heal') {
      // Angelic Chime
      this.playTone({ startFreq: 400, endFreq: 800, type: 'sine', duration: 0.5, volume: 0.2 });
      this.playTone({ startFreq: 600, endFreq: 1200, type: 'sine', duration: 0.5, volume: 0.1, startTime: this.ctx.currentTime + 0.1 });
    }
    else if (id.startsWith('transfer')) {
      // Transfer Hum
      this.playTone({ startFreq: 200, endFreq: 200, type: 'sawtooth', duration: 0.1, volume: 0.1 });
    }
  }

  playHit(isCritical = false) {
    /**
     * ✅ GDD HIT SOUND: Audio feedback for confirmed hits
     * Regular hit: quick impact with 3000Hz cutoff
     * Critical hit: louder, higher pitch, double impact
     */
    if (isCritical) {
      // CRITICAL HIT: Louder, higher pitch double-strike
      // First strike: sharp transient
      this.playNoise({ duration: 0.12, cutoff: 4000, volume: 0.6 });
      // Second strike: slightly delayed for punch effect
      this.playNoise({ duration: 0.08, cutoff: 3000, volume: 0.4, startTime: this.ctx.currentTime + 0.06 });
      // High tone for distinction
      this.playTone({ startFreq: 800, endFreq: 600, type: 'sine', duration: 0.1, volume: 0.2 });
    } else {
      // NORMAL HIT: Quick impact sound
      this.playNoise({ duration: 0.08, cutoff: 3000, volume: 0.4 });
    }
  }

  playFatality() {
    this.playTone({ startFreq: 100, endFreq: 20, type: 'sawtooth', duration: 2.0, volume: 0.25 });
  }

  playStep() {
    this.playNoise({ duration: 0.05, cutoff: 500, volume: 0.25 });
  }

  playJump() {
    this.playTone({ startFreq: 100, endFreq: 300, type: 'square', duration: 0.12, volume: 0.2 });
  }

  playPain() {
    // Descending "uh" tone
    this.playTone({ startFreq: 300, endFreq: 150, type: 'triangle', duration: 0.2, volume: 0.22 });
  }

  // UI Sounds
  playUiHover() {
    // Subtle high blip
    this.playTone({ startFreq: 800, endFreq: 1200, type: 'sine', duration: 0.05, volume: 0.05 });
  }

  playUiClick() {
    // Mechanical click
    this.playTone({ startFreq: 400, endFreq: 200, type: 'square', duration: 0.1, volume: 0.1 });
    this.playNoise({ duration: 0.05, cutoff: 2000, volume: 0.1 });
  }

  playError() {
    // Discordant buzz
    this.playTone({ startFreq: 150, endFreq: 100, type: 'sawtooth', duration: 0.3, volume: 0.2 });
    this.playTone({ startFreq: 140, endFreq: 90, type: 'sawtooth', duration: 0.3, volume: 0.2 });
  }

  // Global mute control
  setMute(isMuted) {
    this.masterGain.gain.value = isMuted ? 0.0 : 0.3;
    console.log(`🔇 Audio ${isMuted ? 'muted' : 'unmuted'}`);
    eventBus.emit('audio:state', isMuted);
  }

  toggleMute() {
    const isMuted = this.masterGain.gain.value === 0;
    this.setMute(!isMuted);
  }
}
