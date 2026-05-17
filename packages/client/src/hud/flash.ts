const WEAPON_BANNER_ICONS: Record<string, string> = { sword: 'SWD', bow: 'BOW', staff: 'STF' }

export function createHudFlash(shootFlashEl: HTMLElement, weaponBannerEl: HTMLElement) {
  let shootFlashTimer = 0
  let weaponBannerTimer = 0

  return {
    showShootFlash(): void {
      shootFlashEl.classList.remove('fire')
      void shootFlashEl.offsetWidth
      shootFlashEl.classList.add('fire')
      clearTimeout(shootFlashTimer)
      shootFlashTimer = window.setTimeout(() => shootFlashEl.classList.remove('fire'), 220)
    },

    showWeaponBanner(weapon: string): void {
      const icon = WEAPON_BANNER_ICONS[weapon] ?? 'WPN'
      weaponBannerEl.textContent = `${icon}  ${weapon.toUpperCase()}`
      weaponBannerEl.classList.remove('active')
      void weaponBannerEl.offsetWidth
      weaponBannerEl.classList.add('active')
      clearTimeout(weaponBannerTimer)
      weaponBannerTimer = window.setTimeout(() => weaponBannerEl.classList.remove('active'), 1200)
    },
  }
}
