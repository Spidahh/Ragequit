// Renderer construction + the WebGL availability gate.
//
// If the browser/GPU can't give us a WebGL context we show a readable
// full-screen explanation instead of a silently broken black page, then
// rethrow so boot stops cleanly.

import * as THREE from 'three'

export function createRendererOrGate(): THREE.WebGLRenderer {
  try {
    // preserveDrawingBuffer only when the screenshot harness asks (?capture) —
    // it lets gl.readPixels() grab the frame headlessly; off in prod.
    const r = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer:
        typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture'),
    })
    if (!r.getContext()) throw new Error('WebGL context unavailable')
    return r
  } catch (err) {
    const gate = document.createElement('div')
    gate.id = 'webgl-gate'
    gate.style.cssText =
      'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:12px;background:#0b0e14;color:#e8e4d8;font-family:system-ui,sans-serif;' +
      'text-align:center;padding:24px'
    const h = document.createElement('h1')
    h.textContent = 'RAGEQUIT non può partire'
    h.style.cssText = 'font-size:22px;margin:0'
    const p = document.createElement('p')
    p.style.cssText = 'max-width:420px;line-height:1.5;opacity:.85;margin:0'
    p.textContent =
      'Il tuo browser o la tua GPU non supportano WebGL (o è disabilitato). ' +
      'Prova ad aggiornare il browser, abilitare l’accelerazione hardware nelle impostazioni, ' +
      'o usare un altro dispositivo.'
    gate.append(h, p)
    document.body.appendChild(gate)
    throw err
  }
}

/** Shared renderer config for the in-game canvas (tone mapping, shadows, etc.). */
export function configureGameRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x141c28, 1)
  ;(globalThis as Record<string, unknown>)['__renderer'] = renderer // verify-harness diag
  // Head-only clip of the FullBody base (face from base, body from outfit) — characters.ts.
  renderer.localClippingEnabled = true
  // Shadow maps — since r182 PCFShadowMap IS the soft variant (PCFSoftShadowMap
  // is deprecated and aliases to it).
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  // ACES filmic tone mapping makes the scene colours pop without over-exposing.
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3
  // Anisotropic filtering, for free. Without it, trilinear mip filtering blurs
  // any surface seen at a grazing angle into grey mush — and in an arena that
  // is the entire sand floor, which is most of what you look at. This must be
  // set before textures are created; configureGameRenderer runs during boot,
  // ahead of the first texture.
  THREE.Texture.DEFAULT_ANISOTROPY = renderer.capabilities.getMaxAnisotropy()
  renderer.domElement.tabIndex = 0
  renderer.domElement.style.outline = 'none'
}
