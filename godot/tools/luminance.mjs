// Misura un frame invece di guardarlo.
//
// A occhio si sbaglia, e si sbaglia sempre nella stessa direzione: verso il
// "va bene cosi". Questi sono i quattro numeri del §9 del progetto — nero vero,
// picco, bruciato, vuoto — piu la distribuzione per decili.
//
//   node tools/luminance.mjs ../.verify/godot-spawn.png
import sharp from 'sharp'
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const n = info.width * info.height
  let min = 255, max = 0, hot = 0, dark = 0, sum = 0
  const hist = new Array(10).fill(0)
  for (let i = 0; i < data.length; i += 3) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    min = Math.min(min, l); max = Math.max(max, l); sum += l
    if (l > 204) hot++
    if (l < 25.5) dark++
    hist[Math.min(9, Math.floor(l / 25.6))]++
  }
  console.log(f.split(/[\/]/).pop().padEnd(20),
    `min ${min.toFixed(0).padStart(3)} max ${max.toFixed(0).padStart(3)} media ${(sum/n).toFixed(0).padStart(3)}`,
    `bruciato ${(100*hot/n).toFixed(1)}%`, `vuoto ${(100*dark/n).toFixed(1)}%`,
    '|', hist.map(h => (100*h/n).toFixed(0).padStart(2)).join(' '))
}
