// Validates the REAL shipped class GLBs, not synthetic clip names.
//
// Why this exists: every weapon-specific idle used to fall back to `?? idle`,
// so a pack that doesn't ship a literally-named clip collapsed Sword/Bow/Staff/
// Attacking idle onto ONE pose — the character never changed posture when the
// player swapped weapons, and it read as "this game has almost no animations".
// Synthetic-name tests cannot catch that; only the actual packs can.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { ANIM_NAMES, type AnimName } from './character-animation.js'
import { mapCharacterClips } from './character-loader.js'

const charDir = path.resolve(fileURLToPath(import.meta.url), '../../../public/characters')

/** Read the glTF JSON chunk straight out of the .glb container. */
function sourceClipNames(file: string): string[] {
  const buf = readFileSync(path.join(charDir, `${file}.glb`))
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as {
    animations?: { name: string }[]
  }
  return (json.animations ?? []).map((a) => a.name)
}

/**
 * mapCharacterClips renames each clip to its gameplay state, so the source is
 * no longer recoverable by name. `duration` survives AnimationClip.clone(), so
 * give each source a unique duration and use it as a fingerprint.
 */
function resolveStates(file: string): {
  bySource: Map<string, AnimName[]>
  stateSource: Partial<Record<AnimName, string>>
} {
  const names = sourceClipNames(file)
  const src = names.map((name, i) => new THREE.AnimationClip(name, i + 1, []))
  const fingerprint = new Map(src.map((c) => [c.duration, c.name]))
  const mapped = mapCharacterClips(src)

  const bySource = new Map<string, AnimName[]>()
  const stateSource: Partial<Record<AnimName, string>> = {}
  for (const state of ANIM_NAMES) {
    const clip = mapped[state]
    if (!clip) continue
    const source = fingerprint.get(clip.duration) ?? '???'
    stateSource[state] = source
    bySource.set(source, [...(bySource.get(source) ?? []), state])
  }
  return { bySource, stateSource }
}

const CLASSES = ['paladin', 'erika', 'vampire', 'ninja'] as const

describe('shipped character clip mapping', () => {
  it.each(CLASSES)('%s resolves a neutral idle and a death pose', (cls) => {
    const { stateSource } = resolveStates(cls)
    expect(stateSource.Idle, `${cls} Idle`).toBeDefined()
    expect(stateSource.Death, `${cls} Death`).toBeDefined()
  })

  it.each(CLASSES)('%s always has a parry pose', (cls) => {
    const { stateSource } = resolveStates(cls)
    expect(stateSource.Parry_Block, `${cls} Parry_Block`).toBeDefined()
  })

  // The melee packs (paladin/ninja) ship a casting clip; a staff must never
  // reuse the sword guard for them.
  it.each(['paladin', 'ninja'] as const)('%s stands differently with a staff', (cls) => {
    const { stateSource } = resolveStates(cls)
    expect(stateSource.Staff_Idle, `${cls} Staff_Idle`).toBeDefined()
    expect(stateSource.Staff_Idle, `${cls} staff pose must differ from its sword guard`).not.toBe(
      stateSource.Sword_Idle,
    )
  })

  it('picks the bow DRAW clip, not the fully-drawn aim pose', () => {
    // Regression: candidate lists were resolved against the GLB's clip order
    // instead of the argument order, so Erika's draw state played her
    // already-at-full-draw pose and the draw itself was never visible.
    const { stateSource } = resolveStates('erika')
    expect(stateSource.Bow_Draw).toBe('standing_draw_arrow')
    expect(stateSource.Bow_Idle).toBe('standing_aim_overdraw')
    expect(stateSource.Bow_Release).toBe('standing_aim_recoil')
  })

  // Ratchet on the REMAINING asset gaps: a pack physically cannot supply a pose
  // it never shipped (Erika has no neutral idle; Paladin has no bow clips), so
  // some states legitimately share a source. This pins how bad it currently is
  // — if someone imports a richer pack, tighten the number; it must never grow.
  const WORST_CASE_SHARED_STATES: Record<(typeof CLASSES)[number], number> = {
    paladin: 5,
    erika: 6, // no neutral idle in the Pro Longbow pack — everything non-bow reuses the aim pose
    vampire: 5,
    ninja: 5,
  }

  it.each(CLASSES)('%s stays within its known clip-sharing budget', (cls) => {
    const { bySource } = resolveStates(cls)
    const worst = [...bySource.entries()].sort((a, b) => b[1].length - a[1].length)[0]
    expect(
      worst?.[1].length ?? 0,
      `${cls}: "${worst?.[0]}" now serves ${worst?.[1].join(', ')}`,
    ).toBeLessThanOrEqual(WORST_CASE_SHARED_STATES[cls])
  })
})

// The Mixamo packs ship 4-6 attack clips each, but only two were ever mapped,
// so a 3-hit combo replayed the same two swings.
describe('melee combo variety', () => {
  it.each(['paladin', 'ninja'] as const)('%s swings three distinct clips', (cls) => {
    const { stateSource } = resolveStates(cls)
    const swings = [
      stateSource.Dagger_Attack,
      stateSource.Dagger_Attack2,
      stateSource.Dagger_Attack3,
    ]
    expect(swings.every(Boolean), `${cls} swings: ${swings.join(', ')}`).toBe(true)
    expect(new Set(swings).size, `${cls} swings: ${swings.join(', ')}`).toBe(3)
  })
})
