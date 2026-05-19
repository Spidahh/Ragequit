import { ABILITY_DEFS, type ServerAbilityFailedMessage, type ServerNoteMessage } from '@ragequit/shared'

export interface CooldownStripForFailHud {
  flashFailed: (abilityId: string) => void
}

export interface AbilityFailHudOptions {
  statusStrip: HTMLElement
  gcdRingEl: HTMLElement | null
  serverToast: HTMLElement
  cooldownStrip: CooldownStripForFailHud
}

export interface AbilityFailHudController {
  onAbilityFailed: (msg: ServerAbilityFailedMessage) => void
  onServerNote: (msg: ServerNoteMessage) => void
}

export function initAbilityFailHud({
  statusStrip,
  gcdRingEl,
  serverToast,
  cooldownStrip,
}: AbilityFailHudOptions): AbilityFailHudController {
  let serverToastTimer: ReturnType<typeof setTimeout> | null = null
  let lastAbilityFailToastAt = 0
  let lastAbilityFailToastKey = ''

  function flashResourceBar(which: 'mana' | 'stam'): void {
    const el = document.getElementById(`hud-${which}`)
    if (!el) return
    el.classList.add('flash-cost')
    setTimeout(() => el.classList.remove('flash-cost'), 400)
  }

  function getAbilityFailText(msg: ServerAbilityFailedMessage): string {
    const abilityName = ABILITY_DEFS[msg.abilityId]?.name
      ?? (msg.abilityId === 'staff_m1'
        ? 'Staff Shot'
        : msg.abilityId === 'bow_m1'
          ? 'Bow Shot'
          : msg.abilityId === 'parry'
            ? 'Parry'
            : 'Ability')
    const actionVerb = msg.abilityId === 'parry'
      ? 'parry'
      : msg.abilityId === 'staff_m1' || msg.abilityId === 'bow_m1'
        ? 'fire'
        : 'cast'
    switch (msg.reason) {
      case 'cost':        return `${abilityName}: not enough resources`
      case 'cooldown':    return `${abilityName}: cooling down`
      case 'gcd':         return 'Global cooldown'
      case 'cc':          return `Cannot ${actionVerb} while controlled`
      case 'casting':     return 'Already casting'
      case 'airborne':    return `Cannot ${actionVerb} while airborne`
      case 'parrying':    return `Cannot ${actionVerb} while parrying`
      case 'wrong_weapon':    return `${abilityName}: wrong weapon`
      case 'not_in_loadout':  return `${abilityName}: not in loadout`
      case 'range':       return `${abilityName}: target out of range`
      case 'unreachable': return `${abilityName}: no clear path`
      case 'dead':        return `Cannot ${actionVerb} while dead`
      case 'unknown_ability': return 'Unknown ability'
    }
  }

  function onServerNote(msg: ServerNoteMessage): void {
    serverToast.textContent = msg.text
    serverToast.className = msg.kind
    if (serverToastTimer !== null) clearTimeout(serverToastTimer)
    const duration = msg.kind === 'warn' ? 5000 : 3000
    serverToastTimer = setTimeout(() => {
      serverToast.classList.add('hidden')
      serverToastTimer = null
    }, duration)
  }

  function showAbilityFailNote(msg: ServerAbilityFailedMessage): void {
    const now = performance.now()
    const key = `${msg.abilityId}:${msg.reason}`
    if (key === lastAbilityFailToastKey && now - lastAbilityFailToastAt < 700) return
    lastAbilityFailToastKey = key
    lastAbilityFailToastAt = now
    onServerNote({ kind: 'warn', text: getAbilityFailText(msg) })
  }

  function onAbilityFailed(msg: ServerAbilityFailedMessage): void {
    cooldownStrip.flashFailed(msg.abilityId)

    if (msg.reason === 'cost') {
      const def = ABILITY_DEFS[msg.abilityId]
      if (def) {
        if (def.costMana > 0) flashResourceBar('mana')
        if (def.costStamina > 0) flashResourceBar('stam')
      } else if (msg.abilityId === 'staff_m1') {
        flashResourceBar('mana')
      }
    }

    if (msg.reason === 'cc') {
      statusStrip.classList.add('cc-locked')
      setTimeout(() => statusStrip.classList.remove('cc-locked'), 500)
    }

    if (msg.reason === 'gcd') {
      gcdRingEl?.classList.add('pulse')
      setTimeout(() => gcdRingEl?.classList.remove('pulse'), 300)
    }

    showAbilityFailNote(msg)
  }

  return { onAbilityFailed, onServerNote }
}
