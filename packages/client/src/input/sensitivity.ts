const SENS_KEY = 'ragequit.sensitivity.v1'
const SENS_DEFAULT = 0.0022
const SENS_MIN = 0.0004
const SENS_MAX = 0.008

export interface MouseSensitivityController {
  readonly value: number
  scale: (factor: number) => number
  set: (value: number, showOverlay?: boolean) => number
}

export function initMouseSensitivity(): MouseSensitivityController {
  let value = loadSens()
  const overlay = document.createElement('div')
  overlay.style.cssText = [
    'position:fixed', 'top:50%', 'left:50%',
    'transform:translate(-50%,-50%) translateY(-80px)',
    'background:rgba(0,0,0,0.78)', 'color:#ffd260',
    'padding:6px 16px', 'border-radius:6px',
    'font:bold 13px/1.4 ui-monospace,monospace',
    'pointer-events:none', 'opacity:0',
    'transition:opacity 0.2s', 'z-index:900',
  ].join(';')
  document.body.appendChild(overlay)
  let overlayTimer = 0

  function showOverlay(): void {
    overlay.textContent = `🖱 SENS  ${value.toFixed(4)}`
    overlay.style.opacity = '1'
    clearTimeout(overlayTimer)
    overlayTimer = setTimeout(() => { overlay.style.opacity = '0' }, 1600) as unknown as number
  }

  return {
    get value() {
      return value
    },
    scale: (factor: number) => {
      value = setSens(parseFloat((value * factor).toFixed(4)))
      showOverlay()
      return value
    },
    set: (next: number, show = false) => {
      value = setSens(next)
      if (show) showOverlay()
      return value
    },
  }
}

function loadSens(): number {
  try {
    const v = parseFloat(localStorage.getItem(SENS_KEY) ?? '')
    return isFinite(v) && v >= SENS_MIN && v <= SENS_MAX ? v : SENS_DEFAULT
  } catch {
    return SENS_DEFAULT
  }
}

function setSens(value: number): number {
  const clamped = Math.max(SENS_MIN, Math.min(SENS_MAX, value))
  try {
    localStorage.setItem(SENS_KEY, String(clamped))
  } catch {
    // Storage is optional.
  }
  return clamped
}
