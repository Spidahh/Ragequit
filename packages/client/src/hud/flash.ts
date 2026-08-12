/** Screen-flash strength by how much the action weighs. */
export type FlashTier = 'light' | 'normal' | 'heavy'

export interface ShootFlashStyle {
  /** Element/family colour, e.g. '#ff6a2a'. Falls back to white. */
  color?: string
  tier?: FlashTier
}

const TIER_ALPHA: Record<FlashTier, number> = { light: 0.1, normal: 0.18, heavy: 0.3 }
const TIER_REACH: Record<FlashTier, string> = { light: '48%', normal: '60%', heavy: '74%' }

/**
 * Flash style for an ability cast: element colour, and a stronger burst for a
 * wind-up ability, which is a committed high-stakes cast rather than something
 * you can spam.
 */
export function shootFlashStyleFor(
  def: { element?: string; windupSec?: number } | undefined,
  elementColor: Record<string, string>,
): ShootFlashStyle {
  return {
    color: elementColor[def?.element ?? 'none'],
    tier: (def?.windupSec ?? 0) > 0 ? 'heavy' : 'normal',
  }
}

export function createHudFlash(shootFlashEl: HTMLElement, weaponBannerEl: HTMLElement) {
  let shootFlashTimer = 0
  let weaponBannerTimer = 0

  return {
    /**
     * The "an action happened" flash. It used to be a byte-identical white
     * burst for all 53 abilities, all 3 weapons and every element, so it told
     * the player only THAT something fired — never what. Now it carries the
     * element colour and scales with the ability's weight.
     */
    showShootFlash(style: ShootFlashStyle = {}): void {
      const tier = style.tier ?? 'normal'
      shootFlashEl.style.setProperty('--flash-color', style.color ?? '#ffffff')
      shootFlashEl.style.setProperty('--flash-alpha', String(TIER_ALPHA[tier]))
      shootFlashEl.style.setProperty('--flash-reach', TIER_REACH[tier])
      shootFlashEl.classList.remove('fire')
      void shootFlashEl.offsetWidth
      shootFlashEl.classList.add('fire')
      clearTimeout(shootFlashTimer)
      shootFlashTimer = window.setTimeout(() => shootFlashEl.classList.remove('fire'), 220)
    },

    showWeaponBanner(weapon: string): void {
      weaponBannerEl.textContent = weapon.toUpperCase()
      weaponBannerEl.classList.remove('active')
      void weaponBannerEl.offsetWidth
      weaponBannerEl.classList.add('active')
      clearTimeout(weaponBannerTimer)
      weaponBannerTimer = window.setTimeout(() => weaponBannerEl.classList.remove('active'), 1200)
    },
  }
}
