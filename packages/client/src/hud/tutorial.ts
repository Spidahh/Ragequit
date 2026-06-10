// Tutorial HUD — a sequence of control tips shown once per player, on first
// match entry (gated by a localStorage flag). Pure DOM, no game state.

export function showTutorialIfFirstTime(): void {
  if (localStorage.getItem('ragequit.tutorial.done') === 'true') return
  localStorage.setItem('ragequit.tutorial.done', 'true')

  const TIPS = [
    { delay: 500, dur: 4500, text: 'WASD per muoverti — SPAZIO per saltare' },
    { delay: 5500, dur: 4000, text: 'LMB = attacco base — RMB = parata / ricarica' },
    { delay: 10000, dur: 4500, text: 'E / Q aprono le ruote abilità — 1-8 cast diretto' },
    { delay: 15000, dur: 4000, text: 'TAB cambia arma — ESC pausa' },
  ]

  const overlay = document.createElement('div')
  overlay.id = 'tutorial-overlay'
  overlay.style.cssText = [
    'position:fixed',
    'bottom:120px',
    'left:50%',
    'transform:translateX(-50%)',
    'pointer-events:none',
    'z-index:500',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:8px',
  ].join(';')
  document.body.appendChild(overlay)

  for (const tip of TIPS) {
    setTimeout(() => {
      const el = document.createElement('div')
      el.style.cssText = [
        'background:rgba(5,8,18,0.88)',
        'border:1px solid rgba(212,160,74,0.35)',
        'border-radius:4px',
        'padding:7px 18px',
        'font:600 12px/1.3 Rajdhani,ui-monospace,monospace',
        'color:#d4c0a0',
        'letter-spacing:.06em',
        'text-transform:uppercase',
        'opacity:0',
        'transition:opacity .35s',
      ].join(';')
      el.textContent = tip.text
      overlay.appendChild(el)
      requestAnimationFrame(() => {
        el.style.opacity = '1'
      })
      setTimeout(() => {
        el.style.opacity = '0'
        setTimeout(() => el.remove(), 400)
      }, tip.dur - 400)
    }, tip.delay)
  }

  // Remove overlay after all tips
  setTimeout(() => overlay.remove(), 20500)
}
