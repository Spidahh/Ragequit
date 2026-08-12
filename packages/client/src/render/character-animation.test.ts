import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  fitOneShotToWindow,
  selectCharacterAnimation,
  type AnimName,
} from './character-animation.js'
import { mapCharacterClips } from './character-loader.js'

const clips = (...names: string[]) => names.map((name) => new THREE.AnimationClip(name, 1, []))

describe('semantic character animation mapping', () => {
  it('maps the archer landing, locomotion and bow phases to their actual roles', () => {
    const mapped = mapCharacterClips(
      clips(
        'fall_a_land_to_run_forward',
        'standing_aim_overdraw',
        'standing_aim_recoil',
        'standing_draw_arrow',
        'standing_run_forward',
        'standing_walk_forward',
        'standing_death_forward_01',
      ),
    )

    expect(mapped.Idle?.name).toBe('Idle')
    expect(mapped.Run?.tracks).toEqual([])
    expect(mapped.Run?.name).toBe('Run')
    expect(mapped.Land?.name).toBe('Land')
    expect(mapped.Bow_Draw?.name).toBe('Bow_Draw')
    expect(mapped.Bow_Release?.name).toBe('Bow_Release')
  })

  it('does not spread anonymous clips across unrelated states', () => {
    const mapped = mapCharacterClips(clips('NlaTrack', 'NlaTrack.001', 'NlaTrack.002'))
    expect(mapped.Idle?.name).toBe('Idle')
    expect(mapped.Run).toBeUndefined()
    expect(mapped.Dagger_Attack).toBeUndefined()
    expect(mapped.Death).toBeUndefined()
  })

  // Regression guard: every weapon-specific idle used to `?? idle`, so a pack
  // without a literally-named clip collapsed Sword/Bow/Staff/Attacking idle onto
  // ONE pose — the character never changed posture when swapping weapons.
  // `duration` is the source fingerprint that survives AnimationClip.clone().
  it('gives the melee packs a staff pose distinct from their sword guard', () => {
    const src = (names: string[]) =>
      names.map((name, i) => new THREE.AnimationClip(name, i + 1, []))

    const paladin = mapCharacterClips(
      src(['sword_and_shield_idle', 'sword_and_shield_idle_2', 'sword_and_shield_casting']),
    )
    expect(paladin.Staff_Idle?.duration).not.toBe(paladin.Sword_Idle?.duration)
    expect(paladin.Attacking_Idle?.duration).not.toBe(paladin.Idle?.duration)

    const ninja = mapCharacterClips(
      src(['great_sword_idle', 'great_sword_idle_2', 'great_sword_casting']),
    )
    expect(ninja.Staff_Idle?.duration).not.toBe(ninja.Sword_Idle?.duration)
  })

  it('always resolves a parry pose, even for packs with no block clip', () => {
    const ninja = mapCharacterClips(
      ['great_sword_idle', 'great_sword_idle_2', 'great_sword_casting'].map(
        (name, i) => new THREE.AnimationClip(name, i + 1, []),
      ),
    )
    expect(ninja.Parry_Block).toBeDefined()
  })
})

describe('character animation decisions', () => {
  const available = new Set<AnimName>([
    'Idle',
    'Attacking_Idle',
    'Sword_Idle',
    'Bow_Idle',
    'Staff_Idle',
    'Staff_Cast',
    'Channel',
  ])

  it('uses the idle matching the equipped weapon', () => {
    expect(
      selectCharacterAnimation(available, { alive: true, moving: false, activeWeapon: 'bow' }),
    ).toBe('Bow_Idle')
    expect(
      selectCharacterAnimation(available, { alive: true, moving: false, activeWeapon: 'staff' }),
    ).toBe('Staff_Idle')
  })

  it('shows casting even when the active weapon is not the staff', () => {
    expect(
      selectCharacterAnimation(available, {
        alive: true,
        moving: false,
        activeWeapon: 'sword',
        casting: true,
      }),
    ).toBe('Staff_Cast')
  })
})

// Regression: attack/cast clips run 1.5–2.5 s but the gameplay state driving
// them is held for only ~220–420 ms, so the crossfade left the clip after
// 10–25% of its length — the wind-up played and the strike never rendered.
describe('one-shot clips fit their gameplay window', () => {
  const action = (durationSec: number) => {
    const clip = new THREE.AnimationClip('x', durationSec, [])
    return { timeScale: 1, getClip: () => clip } as unknown as THREE.AnimationAction
  }

  it('speeds a long swing up so the whole strike lands inside the window', () => {
    const a = action(2.0) // 2 s clip, 400 ms window
    fitOneShotToWindow(a, 'Dagger_Attack')
    expect(a.timeScale).toBeCloseTo(5)
  })

  it('never slows a clip that is already shorter than its window', () => {
    const a = action(0.2)
    fitOneShotToWindow(a, 'Dagger_Attack')
    expect(a.timeScale).toBe(1)
  })

  it('caps the speed-up so the motion never becomes a blur', () => {
    const a = action(10)
    fitOneShotToWindow(a, 'Bow_Release')
    expect(a.timeScale).toBe(6)
  })

  it('leaves states with no declared window at normal speed', () => {
    const a = action(2.0)
    fitOneShotToWindow(a, 'Death')
    expect(a.timeScale).toBe(1)
  })
})
