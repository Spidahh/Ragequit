// Prepara i personaggi Mixamo per Godot.
//
// PERCHE' SERVE UN PASSAGGIO. I GLB arrivano dalla pipeline del progetto
// precedente, che li aveva ottimizzati per il web con due estensioni che Godot
// non sa leggere:
//
//   - **EXT_texture_webp** — le texture sono WebP dentro il GLB. L'importatore
//     di Godot legge PNG e JPEG. Il file si importa "senza errori" e resta
//     `valid=false` nel .import: nessun messaggio, nessuna scena, e chi guarda
//     vede solo che il personaggio non c'e'.
//   - **KHR_mesh_quantization** — posizioni e normali a interi corti.
//
// Qui si decodificano le texture in PNG e si torna a coordinate piene. Il file
// pesa di piu' sul disco, ma Godot ricomprime tutto lui in fase di export: il
// peso che conta e' quello del pacchetto finale, non quello del sorgente.
//
//   node tools/import_characters.mjs
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, textureCompress } from '@gltf-transform/functions'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIR = join(HERE, '..', 'assets', 'characters')

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.glb'))) {
  const path = join(DIR, file)
  const before = statSync(path).size
  const doc = await io.read(path)
  // DUE PASSAGGI, e servono entrambi. Il ridimensionamento chiede a
  // gltf-transform le dimensioni della texture, e su un WebP non le sa leggere
  // (`size is not iterable`): prima si decodifica in PNG, e solo dopo si
  // ridimensiona.
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'png' }))
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'png', resize: [1024, 1024] }),
    dequantize(),
  )
  await io.write(path, doc)
  const after = statSync(path).size
  const clips = doc.getRoot().listAnimations().length
  console.log(
    `  ${file.padEnd(14)} ${(before / 1048576).toFixed(2)} → ${(after / 1048576).toFixed(2)} MB` +
      `   ${clips} clip`,
  )
}
