import * as THREE from 'three'

// Procedural arena-floor texture. The fighting pit was a single flat sand colour —
// the cheapest-looking surface on screen because it fills the lower third of the
// view with no detail. This paints a tournament-floor map to a canvas (sand grain,
// concentric boundary rings, radial spokes and a central crest) so the arena reads
// as a deliberate, purpose-built space rather than a blank disc. Drawn once at boot
// and reused; NearestFilter-free (we want the smooth grain to anti-alias).
//
// Colours stay in the warm-sandstone family so it sits under the toon ramp without
// fighting the coliseum walls. Returns a CanvasTexture ready to drop on the sand
// floor's MeshToonMaterial `.map` (MeshToonMaterial samples `.map` × `.color`).
export function makeArenaFloorTexture(): THREE.CanvasTexture {
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!
  const c = S / 2
  const R = S / 2

  // Base radial gradient — warm sand, a touch brighter toward the centre so the
  // fight focus reads as lit ground and the rim falls into the wall shadow.
  const base = ctx.createRadialGradient(c, c, 0, c, c, R)
  base.addColorStop(0, '#b59a64')
  base.addColorStop(0.7, '#a07f48')
  base.addColorStop(1, '#7c5f34')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, S, S)

  // Sand grain — deterministic speckle (no Math.random so the texture is stable
  // across reloads). A simple hash over a grid scatters light/dark grains.
  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return n - Math.floor(n)
  }
  for (let i = 0; i < 9000; i++) {
    const a = hash(i, 1) * Math.PI * 2
    const r = Math.sqrt(hash(i, 2)) * R
    const x = c + Math.cos(a) * r
    const y = c + Math.sin(a) * r
    const g = hash(i, 3)
    ctx.fillStyle =
      g > 0.5 ? `rgba(255,240,200,${0.05 + g * 0.06})` : `rgba(40,28,12,${0.05 + g * 0.05})`
    const s = 1 + hash(i, 4) * 2
    ctx.fillRect(x, y, s, s)
  }

  // Helper for crisp stroked circles centred on the pit.
  const ring = (radius: number, width: number, style: string) => {
    ctx.beginPath()
    ctx.arc(c, c, radius, 0, Math.PI * 2)
    ctx.lineWidth = width
    ctx.strokeStyle = style
    ctx.stroke()
  }

  // Outer boundary band — a wide dark ring with a bright inner lip, like painted
  // tournament boundary lines worn into the stone.
  ring(R * 0.93, 26, 'rgba(60,44,22,0.85)')
  ring(R * 0.88, 6, 'rgba(232,210,150,0.55)')
  // Mid combat ring.
  ring(R * 0.6, 8, 'rgba(70,52,26,0.6)')
  ring(R * 0.6, 2, 'rgba(232,210,150,0.4)')

  // Radial spokes — 12 faint lines dividing the floor, fading before the centre.
  ctx.save()
  ctx.translate(c, c)
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12)
    ctx.beginPath()
    ctx.moveTo(0, R * 0.26)
    ctx.lineTo(0, R * 0.88)
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(60,44,22,0.35)'
    ctx.stroke()
  }
  ctx.restore()

  // Central crest — a medallion with a ringed star, the arena's emblem.
  const crestR = R * 0.2
  const medal = ctx.createRadialGradient(c, c, 0, c, c, crestR)
  medal.addColorStop(0, 'rgba(150,120,66,0.9)')
  medal.addColorStop(1, 'rgba(96,72,36,0.9)')
  ctx.fillStyle = medal
  ctx.beginPath()
  ctx.arc(c, c, crestR, 0, Math.PI * 2)
  ctx.fill()
  ring(crestR, 7, 'rgba(40,28,12,0.9)')
  ring(crestR * 0.82, 3, 'rgba(232,210,150,0.6)')

  // Eight-point star inside the crest — drawn as two overlaid squares of rays.
  ctx.save()
  ctx.translate(c, c)
  ctx.fillStyle = 'rgba(232,210,150,0.7)'
  for (let i = 0; i < 8; i++) {
    ctx.rotate((Math.PI * 2) / 8)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-crestR * 0.12, -crestR * 0.4)
    ctx.lineTo(0, -crestR * 0.74)
    ctx.lineTo(crestR * 0.12, -crestR * 0.4)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.name = 'procedural-arena-floor'
  tex.colorSpace = THREE.SRGBColorSpace
  // The renderer raises the global default to the hardware maximum; a literal 4
  // here would opt the arena floor — the surface you spend the match looking
  // along — back down to blur.
  tex.anisotropy = THREE.Texture.DEFAULT_ANISOTROPY
  return tex
}
