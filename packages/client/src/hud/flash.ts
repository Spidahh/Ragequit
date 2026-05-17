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
      weaponBannerEl.textContent = weapon.toUpperCase()
      weaponBannerEl.classList.remove('active')
      void weaponBannerEl.offsetWidth
      weaponBannerEl.classList.add('active')
      clearTimeout(weaponBannerTimer)
      weaponBannerTimer = window.setTimeout(() => weaponBannerEl.classList.remove('active'), 1200)
    },
  }
}
