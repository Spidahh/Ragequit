// Per-class resource caps, used to clamp heals and restores.

import {
  HP_MAX,
  MANA_MAX,
  STAMINA_MAX,
  ClassId,
  TARGET_CLASS_DEFS,
  type Player,
} from '@ragequit/shared'

export function getPlayerMaxima(player: Player): { hp: number; mana: number; stamina: number } {
  const classId = (player.classId || 'hybrid') as ClassId
  return (
    TARGET_CLASS_DEFS[classId]?.resourceMaxima ?? {
      hp: HP_MAX,
      mana: MANA_MAX,
      stamina: STAMINA_MAX,
    }
  )
}
