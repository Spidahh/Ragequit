import * as THREE from 'three'

const ELEMENT_POPUP_COLOR: Record<string, string> = {
  fire:      '#ff8a4a',
  ice:       '#9adfff',
  lightning: '#ffe566',
  dark:      '#c890ff',
  nature:    '#aef090',
  steam:     '#ccddff',
}

export interface HitFeedbackOptions {
  crosshairEl: HTMLElement
  hitDirEls: Record<string, HTMLElement>
  popupsLayer: HTMLElement
  camera: THREE.Camera
  getSelfPos: () => { x: number; z: number } | null
  getCamYaw: () => number
}

export interface HitFeedbackController {
  showHitmarker: () => void
  showDirectionalHit: (attackerWorldPos: THREE.Vector3 | null) => void
  showDamagePopup: (
    worldPos: THREE.Vector3,
    damage: number,
    inbound: boolean,
    parried: boolean,
    element?: string,
    opts?: { airPunish?: boolean },
  ) => void
}

export function initHitFeedback({
  crosshairEl,
  hitDirEls,
  popupsLayer,
  camera,
  getSelfPos,
  getCamYaw,
}: HitFeedbackOptions): HitFeedbackController {
  let hitmarkerTimeout = 0

  function showHitmarker(): void {
    clearTimeout(hitmarkerTimeout)
    crosshairEl.classList.add('hit')
    hitmarkerTimeout = setTimeout(() => crosshairEl.classList.remove('hit'), 130) as unknown as number
  }

  function showDirectionalHit(attackerWorldPos: THREE.Vector3 | null): void {
    let dir: string
    const selfPos = getSelfPos()
    if (!attackerWorldPos || !selfPos) {
      dir = (['top', 'bottom', 'left', 'right'] as const)[Math.floor(Math.random() * 4)]!
    } else {
      const dx = attackerWorldPos.x - selfPos.x
      const dz = attackerWorldPos.z - selfPos.z
      const camYaw = getCamYaw()
      const cos = Math.cos(-camYaw), sin = Math.sin(-camYaw)
      const camX =  cos * dx + sin * dz
      const camZ = -sin * dx + cos * dz
      if (Math.abs(camX) > Math.abs(camZ)) {
        dir = camX > 0 ? 'right' : 'left'
      } else {
        dir = camZ < 0 ? 'top' : 'bottom'
      }
    }
    const el = hitDirEls[dir]
    if (!el) return
    el.classList.remove('flash')
    void el.offsetWidth
    el.classList.add('flash')
  }

  function showDamagePopup(
    worldPos: THREE.Vector3,
    damage: number,
    inbound: boolean,
    parried: boolean,
    element?: string,
    opts: { airPunish?: boolean } = {},
  ): void {
    const v = worldPos.clone().project(camera)
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth
    const sy = (-v.y * 0.5 + 0.5) * window.innerHeight
    if (v.z > 1) return
    const el = document.createElement('span')
    const cls = ['popup']
    if (inbound) cls.push('inbound')
    if (parried) cls.push('parried')
    if (opts.airPunish) cls.push('air-punish')
    if (!inbound && !parried && (damage >= 40 || opts.airPunish)) cls.push('big')
    el.className = cls.join(' ')
    const jitter = (Math.random() - 0.5) * 30
    el.style.left = `${sx + jitter}px`
    el.style.top = `${sy}px`
    if (!inbound && !parried && element && ELEMENT_POPUP_COLOR[element]) {
      el.style.color = ELEMENT_POPUP_COLOR[element]!
    }
    if (parried && damage === 0) {
      el.textContent = 'PARRY'
    } else if (parried) {
      el.textContent = `PARRY -${Math.round(damage)}`
    } else if (opts.airPunish) {
      el.textContent = `AIR ${Math.round(damage)}`
    } else {
      el.textContent = String(Math.round(damage))
    }
    popupsLayer.appendChild(el)
    setTimeout(() => el.remove(), 900)
  }

  return { showHitmarker, showDirectionalHit, showDamagePopup }
}
