import * as THREE from 'three'

const ELEMENT_POPUP_COLOR: Record<string, string> = {
  fire: '#ff8a4a',
  ice: '#9adfff',
  lightning: '#ffe566',
  dark: '#c890ff',
  nature: '#aef090',
  steam: '#ccddff',
}

export interface HitFeedbackOptions {
  /** The dedicated hitmarker element — NOT the crosshair. See showHitmarker. */
  hitmarkerEl: HTMLElement
  hitDirEls: Record<string, HTMLElement>
  popupsLayer: HTMLElement
  camera: THREE.Camera
  getSelfPos: () => { x: number; z: number } | null
  getCamYaw: () => number
}

export interface HitFeedbackController {
  showHitmarker: (kill?: boolean) => void
  /** Healing you received, as a number you can actually read. */
  showHealPopup: (amount: number) => void
  /** Damage YOU took. Screen space — see the note on the implementation. */
  showInboundDamage: (amount: number, parried: boolean) => void
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
  hitmarkerEl,
  hitDirEls,
  popupsLayer,
  camera,
  getSelfPos,
  getCamYaw,
}: HitFeedbackOptions): HitFeedbackController {
  let hitmarkerTimeout = 0

  /**
   * The hitmarker: four ticks that snap in and fade, at the crosshair.
   *
   * It used to be `crosshairEl.classList.add('hit')` against a single CSS
   * declaration — `#crosshair.hit { border-color: var(--danger) }` — and THREE
   * later rules of identical specificity set border-color on the same element
   * (`[data-charge]` for the bow, `[data-weapon='sword']`, `[data-primed]`).
   * Later wins, so the one signal that says "you connected" never fired with a
   * sword equipped or an ability armed. That is the loudest beat of the combat
   * loop, silently absent.
   *
   * A dedicated element cannot be overridden by crosshair state, because it is
   * not the crosshair. Every shipped shooter draws it this way.
   */
  function showHitmarker(kill = false): void {
    clearTimeout(hitmarkerTimeout)
    hitmarkerEl.classList.remove('show', 'kill')
    // Force a reflow so a second hit inside the window restarts the animation
    // instead of being swallowed — rapid hits are exactly when you need it.
    void hitmarkerEl.offsetWidth
    hitmarkerEl.classList.add('show')
    if (kill) hitmarkerEl.classList.add('kill')
    hitmarkerTimeout = setTimeout(
      () => hitmarkerEl.classList.remove('show', 'kill'),
      kill ? 320 : 180,
    ) as unknown as number
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
      const cos = Math.cos(-camYaw),
        sin = Math.sin(-camYaw)
      const camX = cos * dx + sin * dz
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
    // Filter points outside the frustum: NDC z > 1 (beyond far plane) OR
    // z < -1 (behind camera — projected coords would be inverted/garbage).
    if (v.z < -1 || v.z > 1) return
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

  /**
   * A heal, as a number at the crosshair.
   *
   * Healing had NO event and no number: the only signal was a full-screen green
   * wash inferred from an HP delta, so "am I being healed, and by how much"
   * was unanswerable — and the owner asked exactly that ("come ci si cura?").
   * Drawn in screen space on purpose: the world position of a heal is your own
   * body, which in first person is the camera, and a popup projected there is
   * discarded by the frustum guard. That is the same bug that made inbound
   * damage numbers invisible.
   */
  /**
   * Damage you took, at the crosshair.
   *
   * The world-space popup could never show this in first person: it projects
   * the VICTIM's position, and when the victim is you that position is your own
   * body, i.e. the camera — so the projection lands behind the near plane and
   * the frustum guard (`v.z < -1`) discards it. The number was computed,
   * classed 'inbound', and thrown away every time. You could not see how hard
   * you had been hit while holding a bow or a staff.
   */
  function showInboundDamage(amount: number, parried: boolean): void {
    if (amount <= 0) return
    const el = document.createElement('span')
    el.className = parried ? 'popup inbound parried' : 'popup inbound'
    el.textContent = parried ? `${Math.round(amount)} ⛊` : `-${Math.round(amount)}`
    el.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 70}px`
    el.style.top = `${window.innerHeight * 0.56}px`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 900)
  }

  function showHealPopup(amount: number): void {
    if (amount <= 0) return
    const el = document.createElement('span')
    el.className = 'popup heal'
    el.textContent = `+${Math.round(amount)}`
    el.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 40}px`
    el.style.top = `${window.innerHeight * 0.42}px`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 900)
  }

  return { showHitmarker, showDirectionalHit, showDamagePopup, showHealPopup, showInboundDamage }
}
