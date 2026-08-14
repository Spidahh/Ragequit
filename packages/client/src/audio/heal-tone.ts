// The sound a heal makes.
//
// Casting a Recovery used to produce the generic element-'none' cast tone —
// the same one Quick Dash, Barrier, Phase Shift, Energize and Mark Target make.
// So the one action that keeps you alive sounded exactly like five that do not,
// and the owner's question "come ci si cura?" had no audible answer.
//
// Its own module because sound-engine.ts sits on its line ceiling and is over
// the 800-line hard limit's shadow; the engine delegates, as it already does
// for the `hurt*` family.

/**
 * Two rising notes, C5 then G5, consonant and short.
 *
 * Rising on purpose: nothing else in this mix rises, so the shape alone says
 * "something good happened" before you read the number.
 */
export function healChime(ac: AudioContext, out: AudioNode): void {
  const now = ac.currentTime
  const notes = [523.25, 783.99]
  for (let i = 0; i < notes.length; i++) {
    const at = now + i * 0.07
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(notes[i]!, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.linearRampToValueAtTime(0.16, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3)
    osc.connect(gain).connect(out)
    osc.start(at)
    osc.stop(at + 0.32)
  }
}
