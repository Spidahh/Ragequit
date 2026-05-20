export interface StatusOverlayOptions {
  getSelfId: () => string | undefined
  playStatus: (element: string) => void
}

export interface StatusOverlayController {
  onStatusApplied: (msg: { playerId: string; status: string }) => void
  onStatusExpired: (msg: { playerId: string; status: string }) => void
}

const STATUS_FLASH_COLOR: Record<string, string> = {
  burn: 'rgba(255,100,30,0.3)',
  bleed: 'rgba(180,30,30,0.3)',
  chill: 'rgba(80,180,255,0.25)',
  poison: 'rgba(80,220,60,0.25)',
  slow: 'rgba(120,60,220,0.2)',
  root: 'rgba(120,80,0,0.3)',
  stun: 'rgba(255,230,60,0.3)',
  freeze: 'rgba(120,220,255,0.35)',
  curse: 'rgba(160,60,255,0.25)',
  blind: 'rgba(0,0,0,0.45)',
  mark: 'rgba(255,60,60,0.2)',
}

const STATUS_ELEMENT_MAP: Record<string, string> = {
  burn: 'fire',
  bleed: 'none',
  chill: 'ice',
  poison: 'nature',
  slow: 'dark',
  root: 'nature',
  stun: 'lightning',
  freeze: 'ice',
  curse: 'dark',
  blind: 'dark',
  mark: 'none',
  shield: 'none',
  haste: 'lightning',
}

export function initStatusOverlay({
  getSelfId,
  playStatus,
}: StatusOverlayOptions): StatusOverlayController {
  function onStatusApplied(msg: { playerId: string; status: string }): void {
    if (msg.playerId !== getSelfId()) return
    playStatus(STATUS_ELEMENT_MAP[msg.status] ?? 'none')
    const color = STATUS_FLASH_COLOR[msg.status]
    if (!color) return
    const flash = document.createElement('div')
    flash.style.cssText = `position:fixed;inset:0;background:radial-gradient(circle at center,transparent 40%,${color} 100%);pointer-events:none;z-index:800;animation:kill-fade 0.7s forwards`
    document.body.appendChild(flash)
    setTimeout(() => flash.remove(), 700)
  }

  function onStatusExpired(_msg: { playerId: string; status: string }): void {
    // render() reads schema each frame — no imperative action needed.
  }

  return { onStatusApplied, onStatusExpired }
}
