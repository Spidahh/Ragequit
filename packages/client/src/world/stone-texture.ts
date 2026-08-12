import * as THREE from 'three'

// Procedural ashlar-stone texture for the arena cover blocks. The cover boxes were
// flat single-colour cubes with a hard outline — they read as "blockout
// placeholder" plastic. This bakes a greyscale carved-masonry pattern (mortar
// courses, per-block tonal variation, grain) so the same boxes read as cut-stone
// pillars and barriers. GREYSCALE on purpose: MeshToonMaterial samples map × color,
// so each box keeps its height-coded warm tint while gaining stone detail.
//
// The texture tiles; callers set wrapS/T = RepeatWrapping and a per-box repeat so
// the block scale stays roughly constant regardless of box size.
let cached: THREE.Texture | null = null

export function getStoneTexture(): THREE.Texture {
  if (cached) return cached
  const S = 512
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!

  // Mid-grey base so the tint multiplies to roughly the box's intended colour.
  ctx.fillStyle = '#9a9a9a'
  ctx.fillRect(0, 0, S, S)

  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return n - Math.floor(n)
  }

  // Ashlar courses — 4 rows of blocks, brick-offset every other row.
  const rows = 4
  const rh = S / rows
  for (let r = 0; r < rows; r++) {
    const cols = 4
    const cw = S / cols
    const offset = (r % 2) * (cw / 2)
    for (let cI = -1; cI < cols; cI++) {
      const x = cI * cw + offset
      const y = r * rh
      // Per-block tonal variation — a faint lighter/darker fill so blocks differ.
      const v = hash(r * 13.1 + cI * 7.7, 3.3)
      const shade = 150 + Math.floor((v - 0.5) * 40)
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`
      ctx.fillRect(x + 3, y + 3, cw - 6, rh - 6)
    }
  }

  // Mortar lines — dark recessed grout between courses and blocks.
  ctx.strokeStyle = 'rgba(40,38,36,0.85)'
  ctx.lineWidth = 6
  for (let r = 0; r <= rows; r++) {
    const y = r * rh
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(S, y)
    ctx.stroke()
  }
  const cols = 4
  const cw = S / cols
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw / 2)
    for (let cI = -1; cI <= cols; cI++) {
      const x = cI * cw + offset
      ctx.beginPath()
      ctx.moveTo(x, r * rh)
      ctx.lineTo(x, (r + 1) * rh)
      ctx.stroke()
    }
  }

  // Stone grain — deterministic speckle across the whole tile.
  for (let i = 0; i < 6000; i++) {
    const x = hash(i, 1) * S
    const y = hash(i, 2) * S
    const g = hash(i, 3)
    ctx.fillStyle = g > 0.5 ? `rgba(255,255,255,${g * 0.05})` : `rgba(0,0,0,${(1 - g) * 0.06})`
    ctx.fillRect(x, y, 1.5, 1.5)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.name = 'procedural-stone'
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cached = tex
  return tex
}
