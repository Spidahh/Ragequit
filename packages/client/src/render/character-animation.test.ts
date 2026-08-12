import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { selectCharacterAnimation, type AnimName } from './character-animation.js'
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
