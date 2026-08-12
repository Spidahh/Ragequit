import {
  ABILITY_DEFS,
  type ServerAbilityFailedMessage,
  type ServerNoteMessage,
} from '@ragequit/shared'

export interface CooldownStripForFailHud {
  flashFailed: (abilityId: string) => void
}

export interface AbilityFailHudOptions {
  statusStrip: HTMLElement
  gcdRingEl: HTMLElement | null
  serverToast: HTMLElement
  cooldownStrip: CooldownStripForFailHud
  showAbilityFailed?: (abilityId: string, detail: string) => void
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
  showAbilityFailed,
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
    const abilityName =
      ABILITY_DEFS[msg.abilityId]?.name ??
      (msg.abilityId === 'staff_m1'
        ? 'Colpo di Staff'
        : msg.abilityId === 'bow_m1'
          ? 'Tiro con Arco'
          : msg.abilityId === 'parry'
            ? 'Parata'
            : 'Abilità')
    // The rest of the game is Italian (AGENTS.md: one language) — these strings
    // are the ones the player reads at the exact moment something refuses to
    // fire, so they were the most visible English left in the HUD.
    const actionVerb =
      msg.abilityId === 'parry'
        ? 'parare'
        : msg.abilityId === 'staff_m1' || msg.abilityId === 'bow_m1'
          ? 'sparare'
          : 'lanciare'
    switch (msg.reason) {
      case 'cost':
        return `${abilityName}: risorse insufficienti`
      case 'cooldown':
        return `${abilityName}: in ricarica`
      case 'gcd':
        return 'Recupero globale'
      case 'cc':
        return `Non puoi ${actionVerb} sotto controllo`
      case 'casting':
        return 'Stai già lanciando'
      case 'grounded_required':
        return `${abilityName}: serve stare a terra`
      case 'parrying':
        return `Non puoi ${actionVerb} mentre pari`
      case 'wrong_weapon':
        return `${abilityName}: arma sbagliata`
      case 'not_in_loadout':
        return `${abilityName}: non è nel loadout`
      case 'range':
        return `${abilityName}: bersaglio troppo lontano`
      case 'unreachable':
        return `${abilityName}: nessuna traiettoria libera`
      case 'dead':
        return `Non puoi ${actionVerb} da morto`
      case 'unknown_ability':
        return 'Abilità sconosciuta'
      case 'swapping':
        return 'cambio arma in corso'
      case 'no_target':
        return `${abilityName}: a vuoto`
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

  // Reasons that are already fully communicated by the slot flash / resource
  // bar / GCD ring — no toast needed. Everything else gets a 1.5 s compact
  // note rather than a long persistent label.
  // 'swapping' is silent — the weapon-swap VFX (0.12 s lock) already communicates it.
  const SILENT_REASONS = new Set(['cooldown', 'gcd', 'parrying', 'swapping'])

  function showAbilityFailNote(msg: ServerAbilityFailedMessage): void {
    if (SILENT_REASONS.has(msg.reason)) return
    const now = performance.now()
    const key = `${msg.abilityId}:${msg.reason}`
    if (key === lastAbilityFailToastKey && now - lastAbilityFailToastAt < 700) return
    lastAbilityFailToastKey = key
    lastAbilityFailToastAt = now
    // Short 1.5 s flash — informational, not blocking centre-screen for 5 s.
    const text = getAbilityFailText(msg)
    serverToast.textContent = text
    serverToast.className = 'warn'
    if (serverToastTimer !== null) clearTimeout(serverToastTimer)
    serverToastTimer = setTimeout(() => {
      serverToast.classList.add('hidden')
      serverToastTimer = null
    }, 1500)
  }

  function onAbilityFailed(msg: ServerAbilityFailedMessage): void {
    cooldownStrip.flashFailed(msg.abilityId)
    showAbilityFailed?.(msg.abilityId, getAbilityFailText(msg))

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
