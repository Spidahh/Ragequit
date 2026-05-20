import { type ServerTransmuteResultMessage } from '@ragequit/shared'

const TRANSMUTE_CD_MS = 5000

type TransmuteDir = 'hp_mana' | 'mana_stam' | 'stam_hp'

export interface CooldownStripForTransmute {
  setTransferCooldown: (abilityId: string, remaining: number) => void
}

export interface TransmuteHudOptions {
  hudHpFill: HTMLElement
  hudManaFill: HTMLElement
  hudStamFill: HTMLElement
  transmuteSlotEls: Record<string, HTMLElement>
  cooldownStrip: CooldownStripForTransmute
  onWarn: (text: string) => void
  getSelfId: () => string | undefined
}

export interface TransmuteHudController {
  onTransmuteResult: (msg: ServerTransmuteResultMessage) => void
  updateBar: () => void
  reset: () => void
}

function getTransmuteLabel(direction: TransmuteDir): string {
  if (direction === 'hp_mana') return 'HP to Mana'
  if (direction === 'mana_stam') return 'Mana to Stamina'
  return 'Stamina to HP'
}

function getTransmuteFailText(msg: ServerTransmuteResultMessage): string {
  const label = getTransmuteLabel(msg.direction as TransmuteDir)
  switch (msg.reason) {
    case 'cooldown':
      return `${label}: cooling down`
    case 'cost':
      return `${label}: not enough resources`
    case 'parrying':
      return `${label}: cannot transfer while parrying`
    case 'casting':
      return `${label}: cannot transfer while casting`
    case 'airborne':
      return `${label}: cannot transfer while airborne`
    case 'dead':
      return `${label}: cannot transfer while dead`
    default:
      return `${label}: transfer failed`
  }
}

export function initTransmuteHud({
  hudHpFill,
  hudManaFill,
  hudStamFill,
  transmuteSlotEls,
  cooldownStrip,
  onWarn,
  getSelfId,
}: TransmuteHudOptions): TransmuteHudController {
  const transmuteCdExpiry: Record<string, number> = { hp_mana: 0, mana_stam: 0, stam_hp: 0 }

  function updateBar(): void {
    const now = performance.now()
    for (const dir of ['hp_mana', 'mana_stam', 'stam_hp'] as const) {
      const el = transmuteSlotEls[dir]
      const abilityId =
        dir === 'hp_mana'
          ? 'transfer_hp_mana'
          : dir === 'mana_stam'
            ? 'transfer_mana_stam'
            : 'transfer_stam_hp'
      const expiry = transmuteCdExpiry[dir] ?? 0
      const remaining = expiry - now
      if (remaining > 0) {
        el?.classList.remove('ready')
        el?.classList.add('cooling')
        const cdTextEl = el?.querySelector<HTMLElement>('.t-cd-text')
        if (cdTextEl) cdTextEl.textContent = `${(remaining / 1000).toFixed(1)}s`
        cooldownStrip.setTransferCooldown(abilityId, remaining)
      } else {
        el?.classList.remove('cooling')
        el?.classList.add('ready')
        const cdTextEl = el?.querySelector<HTMLElement>('.t-cd-text')
        if (cdTextEl) cdTextEl.textContent = ''
        cooldownStrip.setTransferCooldown(abilityId, 0)
      }
    }
  }

  function onTransmuteResult(msg: ServerTransmuteResultMessage): void {
    if (msg.playerId !== getSelfId()) return
    const target =
      msg.direction === 'hp_mana'
        ? hudHpFill
        : msg.direction === 'mana_stam'
          ? hudManaFill
          : hudStamFill
    if (msg.ok) {
      target.classList.add('pulse')
      setTimeout(() => target.classList.remove('pulse'), 350)
      transmuteCdExpiry[msg.direction] = performance.now() + TRANSMUTE_CD_MS
      updateBar()
    } else {
      const el = transmuteSlotEls[msg.direction]
      if (el) {
        el.style.animation = 'none'
        void el.offsetWidth
        el.style.animation = 'shake 0.25s ease'
      }
      onWarn(getTransmuteFailText(msg))
    }
  }

  function reset(): void {
    for (const dir of ['hp_mana', 'mana_stam', 'stam_hp'] as const) transmuteCdExpiry[dir] = 0
  }

  return { onTransmuteResult, updateBar, reset }
}
