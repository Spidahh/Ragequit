// hitstop.ts — Pure hit-stop duration helpers.
// No side effects, no imports. Safe to tree-shake.

export const HITSTOP_ATTACKER: Readonly<Record<string, number>> = {
  sword_m1: 80, uppercut: 80, whirlwind: 70, gap_closer: 65,
  bleed_strike: 65, guard_break: 65, rending_dash: 60,
  bow: 45, staff: 45,
}

export const HITSTOP_VICTIM: Readonly<Record<string, number>> = {
  sword_m1: 55, uppercut: 55, whirlwind: 50, gap_closer: 50,
  bleed_strike: 50, guard_break: 50, rending_dash: 45,
  bow: 35, staff: 35,
}

/** Strip the 'ability:' prefix so both raw ids and prefixed ids resolve. */
export function rawCauseId(cause: string): string {
  return cause.startsWith('ability:') ? cause.slice(8) : cause
}

export function isAirPunishCause(cause: string): boolean {
  return cause.includes(':air_punish')
}

/** Hit-stop duration (ms) for the attacker side. */
export function hitstopAttacker(cause: string): number {
  if (isAirPunishCause(cause)) return 100
  const raw = rawCauseId(cause)
  return HITSTOP_ATTACKER[raw] ?? (cause.startsWith('zone:') || cause.startsWith('combo:') ? 20 : 50)
}

/** Hit-stop duration (ms) for the victim side. */
export function hitstopVictim(cause: string): number {
  if (isAirPunishCause(cause)) return 75
  const raw = rawCauseId(cause)
  return HITSTOP_VICTIM[raw] ?? (cause.startsWith('zone:') || cause.startsWith('combo:') ? 25 : 40)
}

/** Map element + cause to an impact tint color (hex). */
export function elementToImpactColor(element: string | undefined, cause: string): number {
  if (cause === 'combo:steam')       return 0x88eeff
  if (cause === 'combo:combustion')  return 0xff8822
  if (cause === 'combo:festering')   return 0xaaff44
  if (cause === 'combo:entrapment')  return 0x60bb40
  switch (element) {
    case 'fire':      return 0xff6622
    case 'ice':       return 0x88ddff
    case 'lightning': return 0xffee44
    case 'dark':      return 0xaa55ff
    case 'nature':    return 0x77ee55
    default:          return 0xd0d8ff
  }
}
