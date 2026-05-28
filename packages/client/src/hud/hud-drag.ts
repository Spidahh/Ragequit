export interface DraggableHudElements {
  panel: HTMLElement
  dragHandle: HTMLElement
  resizeHandle: HTMLElement
}

export interface DraggableHudController {
  refreshBounds: () => void
}

const HUD_POS_KEY = 'ragequit.hud.position.v3'
const HUD_SIZE_KEY = 'ragequit.hud.size.v3'
const HUD_MIN_WIDTH = 250
const HUD_MAX_WIDTH = 520
const HUD_MIN_BAR_H = 18
const HUD_MAX_BAR_H = 26

export function initDraggableHud({
  panel,
  dragHandle,
  resizeHandle,
}: DraggableHudElements): DraggableHudController {
  function clampPosition(left: number, top: number): { left: number; top: number } {
    const rect = panel.getBoundingClientRect()
    const margin = 8
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin)
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin)
    return {
      left: Math.max(margin, Math.min(maxLeft, left)),
      top: Math.max(margin, Math.min(maxTop, top)),
    }
  }

  function clampSize(width: number, barHeight: number): { width: number; barHeight: number } {
    const margin = 12
    const maxWidth = Math.min(
      HUD_MAX_WIDTH,
      Math.max(HUD_MIN_WIDTH, window.innerWidth - margin * 2),
    )
    return {
      width: Math.max(HUD_MIN_WIDTH, Math.min(maxWidth, width)),
      barHeight: Math.max(HUD_MIN_BAR_H, Math.min(HUD_MAX_BAR_H, barHeight)),
    }
  }

  function setSize(width: number, barHeight: number, persist = true): void {
    const size = clampSize(width, barHeight)
    panel.style.width = `${size.width}px`
    panel.style.setProperty('--hud-bar-h', `${size.barHeight}px`)
    if (persist) {
      try {
        localStorage.setItem(HUD_SIZE_KEY, JSON.stringify(size))
      } catch {
        // Local storage can be disabled by privacy settings.
      }
    }
    if (panel.style.left && panel.style.top) {
      setPosition(parseFloat(panel.style.left), parseFloat(panel.style.top), false)
    }
  }

  function setPosition(left: number, top: number, persist = true): void {
    const pos = clampPosition(left, top)
    panel.style.left = `${pos.left}px`
    panel.style.top = `${pos.top}px`
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    if (persist) {
      try {
        localStorage.setItem(HUD_POS_KEY, JSON.stringify(pos))
      } catch {
        // Local storage can be disabled by privacy settings.
      }
    }
  }

  function resetPosition(): void {
    panel.style.left = ''
    panel.style.top = ''
    panel.style.right = ''
    panel.style.bottom = ''
    panel.style.width = ''
    panel.style.removeProperty('--hud-bar-h')
    try {
      localStorage.removeItem(HUD_POS_KEY)
      localStorage.removeItem(HUD_SIZE_KEY)
    } catch {
      // Storage is optional.
    }
  }

  function restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(HUD_POS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { left?: number; top?: number }
        if (Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
          setPosition(parsed.left!, parsed.top!, false)
        }
      }
      const rawSize = localStorage.getItem(HUD_SIZE_KEY)
      if (rawSize) {
        const parsed = JSON.parse(rawSize) as { width?: number; barHeight?: number }
        if (Number.isFinite(parsed.width) && Number.isFinite(parsed.barHeight)) {
          setSize(parsed.width!, parsed.barHeight!, false)
        }
      }
    } catch {
      resetPosition()
    }
  }

  let dragging = false
  let resizing = false
  let offsetX = 0
  let offsetY = 0
  let resizeStartX = 0
  let resizeStartY = 0
  let resizeStartWidth = 0
  let resizeStartBarH = 0
  let activePointer = -1
  let resizePointer = -1

  const beginDrag = (clientX: number, clientY: number): void => {
    if (resizing) return
    dragging = true
    const rect = panel.getBoundingClientRect()
    offsetX = clientX - rect.left
    offsetY = clientY - rect.top
    panel.classList.add('dragging')
  }

  const moveDrag = (clientX: number, clientY: number): void => {
    if (!dragging) return
    setPosition(clientX - offsetX, clientY - offsetY)
  }

  const endDrag = (): void => {
    if (!dragging) return
    dragging = false
    activePointer = -1
    panel.classList.remove('dragging')
  }

  const beginResize = (clientX: number, clientY: number): void => {
    resizing = true
    const rect = panel.getBoundingClientRect()
    resizeStartX = clientX
    resizeStartY = clientY
    resizeStartWidth = rect.width
    resizeStartBarH = parseFloat(getComputedStyle(panel).getPropertyValue('--hud-bar-h')) || 22
    panel.classList.add('resizing')
  }

  const moveResize = (clientX: number, clientY: number): void => {
    if (!resizing) return
    setSize(
      resizeStartWidth + (clientX - resizeStartX),
      resizeStartBarH + (clientY - resizeStartY) / 3,
    )
  }

  const endResize = (): void => {
    if (!resizing) return
    resizing = false
    resizePointer = -1
    panel.classList.remove('resizing')
  }

  restoreFromStorage()

  dragHandle.addEventListener('pointerdown', (e) => {
    activePointer = e.pointerId
    beginDrag(e.clientX, e.clientY)
    dragHandle.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  dragHandle.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== activePointer) return
    moveDrag(e.clientX, e.clientY)
  })

  const stopDrag = (e: PointerEvent): void => {
    if (!dragging || e.pointerId !== activePointer) return
    endDrag()
    dragHandle.releasePointerCapture(e.pointerId)
  }
  dragHandle.addEventListener('pointerup', stopDrag)
  dragHandle.addEventListener('pointercancel', stopDrag)
  // Note: pointerdown already covers mouse input — no mousedown listener needed.

  resizeHandle.addEventListener('pointerdown', (e) => {
    resizePointer = e.pointerId
    beginResize(e.clientX, e.clientY)
    resizeHandle.setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  })
  resizeHandle.addEventListener('pointermove', (e) => {
    if (!resizing || e.pointerId !== resizePointer) return
    moveResize(e.clientX, e.clientY)
  })
  const stopResize = (e: PointerEvent): void => {
    if (!resizing || e.pointerId !== resizePointer) return
    endResize()
    resizeHandle.releasePointerCapture(e.pointerId)
  }
  resizeHandle.addEventListener('pointerup', stopResize)
  resizeHandle.addEventListener('pointercancel', stopResize)

  document.addEventListener('mousemove', (e) => {
    if (activePointer !== -1) return
    moveDrag(e.clientX, e.clientY)
  })
  document.addEventListener('mouseup', () => {
    if (activePointer !== -1) return
    endDrag()
  })
  document.addEventListener('pointermove', (e) => {
    if (resizePointer === -1 || e.pointerId !== resizePointer) return
    moveResize(e.clientX, e.clientY)
  })
  document.addEventListener('pointerup', (e) => {
    if (resizePointer === -1 || e.pointerId !== resizePointer) return
    endResize()
  })
  document.addEventListener('pointercancel', (e) => {
    if (resizePointer === -1 || e.pointerId !== resizePointer) return
    endResize()
  })
  dragHandle.addEventListener('dblclick', (e) => {
    e.preventDefault()
    resetPosition()
  })

  return {
    refreshBounds: () => {
      const currentHudWidth = parseFloat(panel.style.width)
      if (Number.isFinite(currentHudWidth)) {
        const currentBarHeight =
          parseFloat(getComputedStyle(panel).getPropertyValue('--hud-bar-h')) || 22
        setSize(currentHudWidth, currentBarHeight, false)
      }
      if (panel.style.left && panel.style.top) {
        setPosition(parseFloat(panel.style.left), parseFloat(panel.style.top), false)
      }
    },
  }
}
