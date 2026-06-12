// montage.mjs — stitch the 4 class renders (real game loader) into one image.
import path from 'node:path'
import sharp from 'sharp'

const dir = '.verify'
const files = ['insp-tank-q34.png', 'insp-archer-q34.png', 'insp-mage-q34.png', 'insp-hybrid-q34.png']
const W = 470
const H = 540
const pad = 8
const imgs = await Promise.all(
  files.map((f) => sharp(path.join(dir, f)).resize(W, H, { fit: 'cover' }).toBuffer()),
)
const canvasW = W * 4 + pad * 5
const canvasH = H + pad * 2
const composite = imgs.map((b, i) => ({ input: b, top: pad, left: pad + i * (W + pad) }))
await sharp({
  create: { width: canvasW, height: canvasH, channels: 3, background: { r: 26, g: 30, b: 42 } },
})
  .composite(composite)
  .png()
  .toFile(path.join(dir, 'classes-4.png'))
console.log('wrote .verify/classes-4.png')
