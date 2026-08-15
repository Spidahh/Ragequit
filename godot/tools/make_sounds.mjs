// Genera i suoni del gioco, sintetizzandoli.
//
// PERCHE' SINTETIZZATI E NON SCARICATI: il gioco deve restare gratis e
// ridistribuibile senza rincorrere licenze, e mezzo megabyte di WAV pesa meno
// della somma delle attribuzioni. Questi non sono suoni "da sostituire dopo":
// sono la forma d'onda giusta per ogni evento, e se un giorno arriva un campione
// migliore prende lo stesso nome e lo stesso posto.
//
// LA REGOLA CHE LI GOVERNA (§10 del progetto): ogni suono dice UNA cosa sola, e
// le tre famiglie non si confondono mai.
//   - quello che fai tu     → secco, corto, attacco immediato
//   - quello che ti fanno   → sordo, filtrato, con una coda
//   - il mondo              → continuo, basso, mai in competizione
//
//   node tools/make_sounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'audio')
// 22 kHz: sopra i urli di questa roba non c'e' niente da sentire, e dimezza il
// peso di una cartella che finisce dentro un download da 7 MB.
const SR = 22050

mkdirSync(OUT, { recursive: true })

// --- primitive ------------------------------------------------------------

const buf = (sec) => new Float32Array(Math.round(sec * SR))
const t = (i) => i / SR

/** Inviluppo percussivo: sale in `atk`, scende esponenzialmente. */
function env(n, i, atk, decay) {
  const x = i / SR
  if (x < atk) return x / atk
  return Math.exp(-(x - atk) / decay)
}

/** Rumore bianco filtrato passa-basso a un polo. Il mattone di meta' dei suoni. */
function noise(out, cutoff, gain = 1) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR)
  let z = 0
  for (let i = 0; i < out.length; i++) {
    z = (1 - a) * (Math.random() * 2 - 1) + a * z
    out[i] += z * gain
  }
}

/** Sinusoide con frequenza che scivola da `f0` a `f1`. */
function sweep(out, f0, f1, gain, shape = (x) => x) {
  let ph = 0
  for (let i = 0; i < out.length; i++) {
    const x = shape(i / out.length)
    ph += ((f0 + (f1 - f0) * x) * 2 * Math.PI) / SR
    out[i] += Math.sin(ph) * gain
  }
}

/** Onda quadra: piu' aggressiva della sinusoide, per i suoni "elettrici". */
function square(out, f0, f1, gain) {
  let ph = 0
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length
    ph += ((f0 + (f1 - f0) * x) * 2 * Math.PI) / SR
    out[i] += (Math.sin(ph) > 0 ? 1 : -1) * gain
  }
}

function shape(out, atk, decay) {
  for (let i = 0; i < out.length; i++) out[i] *= env(out.length, i, atk, decay)
}

/** Rende continuo il giro di un loop: gli ultimi campioni sfumano sui primi. */
function seamless(out, fadeSec = 0.25) {
  const f = Math.round(fadeSec * SR)
  for (let i = 0; i < f; i++) {
    const k = i / f
    out[out.length - f + i] = out[out.length - f + i] * (1 - k) + out[i] * k
  }
  return out.subarray(0, out.length - 1)
}

function write(name, data, peak = 0.9) {
  let max = 0
  for (const v of data) max = Math.max(max, Math.abs(v))
  const g = max > 0 ? peak / max : 1
  const n = data.length
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + n * 2, 4)
  b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(SR, 24)
  b.writeUInt32LE(SR * 2, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36)
  b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(data[i] * g * 32767))), 44 + i * 2)
  }
  writeFileSync(join(OUT, `${name}.wav`), b)
  return b.length
}

// --- quello che fai tu ----------------------------------------------------

function beam() {
  // Scarica secca: quadra che precipita, piu' un lampo di rumore acuto.
  const a = buf(0.18)
  square(a, 900, 190, 0.5)
  noise(a, 7000, 0.5)
  shape(a, 0.001, 0.045)
  return a
}

function bolt() {
  // Lancio grave con la coda del sibilo: si sente PARTIRE, e poi andare.
  const a = buf(0.45)
  sweep(a, 320, 90, 0.6)
  noise(a, 2600, 0.35)
  shape(a, 0.004, 0.13)
  return a
}

function burst() {
  // Impatto al suolo. Corpo bassissimo, coda lunga: l'area e' larga cinque
  // metri e deve suonare come cinque metri.
  const a = buf(0.75)
  sweep(a, 150, 38, 0.9)
  noise(a, 900, 0.6)
  shape(a, 0.002, 0.19)
  return a
}

function hitConfirm() {
  // IL SUONO PIU' IMPORTANTE DEL GIOCO. Corto, acuto, senza corpo: deve
  // passare sopra qualunque cosa stia suonando. Senza, non sai se hai colpito.
  const a = buf(0.09)
  sweep(a, 2100, 1500, 0.8)
  shape(a, 0.0005, 0.018)
  return a
}

function parry() {
  const a = buf(0.3)
  sweep(a, 2400, 1900, 0.35)
  sweep(a, 3550, 2900, 0.25)
  noise(a, 9000, 0.3)
  shape(a, 0.0008, 0.06)
  return a
}

function kill() {
  // Due note che salgono: la conferma. E' l'unica ricompensa sonora del gioco.
  const a = buf(0.36)
  const half = Math.round(a.length / 2)
  const n1 = a.subarray(0, half)
  const n2 = a.subarray(half)
  sweep(n1, 660, 660, 0.5)
  shape(n1, 0.003, 0.05)
  sweep(n2, 990, 990, 0.5)
  shape(n2, 0.003, 0.07)
  return a
}

function ready() {
  const a = buf(0.06)
  sweep(a, 1500, 1500, 0.35)
  shape(a, 0.001, 0.012)
  return a
}

function unavailable() {
  // Tonfo sordo, e nient'altro: dice "no" senza chiedere attenzione.
  const a = buf(0.12)
  sweep(a, 190, 120, 0.5)
  noise(a, 500, 0.2)
  shape(a, 0.002, 0.028)
  return a
}

// --- quello che ti fanno --------------------------------------------------

function hurt() {
  // Sordo e col corpo basso: e' filtrato perche' deve sembrare che arrivi da
  // fuori di te, al contrario dei suoni che produci tu.
  const a = buf(0.35)
  sweep(a, 220, 60, 0.8)
  noise(a, 700, 0.55)
  shape(a, 0.002, 0.075)
  return a
}

function launched() {
  // Soffio che sale: e' l'unico suono che descrive uno STATO, non un colpo.
  const a = buf(0.6)
  noise(a, 1800, 0.7)
  sweep(a, 180, 720, 0.35, (x) => x * x)
  shape(a, 0.02, 0.22)
  return a
}

function death() {
  const a = buf(1.0)
  sweep(a, 130, 32, 0.9)
  noise(a, 400, 0.4)
  shape(a, 0.003, 0.3)
  return a
}

// --- il corpo che si muove ------------------------------------------------

function step(seed) {
  // Quattro varianti alternate: un passo identico ripetuto diventa un metronomo
  // e sparisce dall'attenzione.
  const a = buf(0.13)
  noise(a, 1100 + seed * 260, 0.7)
  sweep(a, 120 + seed * 14, 70, 0.3)
  shape(a, 0.002, 0.028)
  return a
}

function land() {
  const a = buf(0.28)
  sweep(a, 170, 45, 0.85)
  noise(a, 900, 0.5)
  shape(a, 0.002, 0.06)
  return a
}

function jump() {
  const a = buf(0.16)
  noise(a, 1500, 0.5)
  shape(a, 0.01, 0.04)
  return a
}

// --- il mondo -------------------------------------------------------------

function torch() {
  // Crepitio: rumore filtrato con micro-scoppi sparsi. E' l'unica luce calda
  // della mappa, e deve avere un suono suo per farsi trovare.
  const a = buf(3.0)
  noise(a, 2200, 0.25)
  for (let k = 0; k < 90; k++) {
    const at = Math.floor(Math.random() * (a.length - 900))
    const len = 120 + Math.floor(Math.random() * 500)
    for (let i = 0; i < len; i++) {
      a[at + i] += (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / (len * 0.25))
    }
  }
  return seamless(a, 0.4)
}

function wind() {
  const a = buf(4.0)
  noise(a, 420, 0.8)
  // Un respiro lento sopra il rumore: senza, il loop si sente girare.
  for (let i = 0; i < a.length; i++) a[i] *= 0.65 + 0.35 * Math.sin((t(i) * 2 * Math.PI) / 4.0)
  return seamless(a, 0.6)
}

// --- musica ---------------------------------------------------------------

/**
 * Il tema del menu.
 *
 * PERCHE' SOLO NEL MENU E NEI RISULTATI. In partita l'informazione direzionale
 * e' gameplay — da dove arriva un colpo, dove sta crepitando una torcia — e una
 * musica la copre. Qui invece il silenzio e' peggio: un menu muto sembra
 * un'applicazione, non un gioco.
 *
 * E' un drone in re minore con una quinta e una nona sopra, e un battito lento
 * sotto. Nessuna melodia: una melodia in un menu che si riapre venti volte
 * diventa insopportabile alla quinta, un drone no.
 */
function musicMenu() {
  const a = buf(16)
  // Re, la, mi: la fondamentale, la quinta e la nona. Le tre note che stanno
  // insieme senza dire ne' allegro ne' triste.
  const notes = [73.42, 110.0, 146.83, 220.0, 329.63]
  const gains = [0.9, 0.5, 0.35, 0.18, 0.09]
  for (let n = 0; n < notes.length; n++) {
    let ph = 0
    for (let i = 0; i < a.length; i++) {
      // Un respiro lentissimo su ogni voce, sfasato: e' quello che tiene vivo
      // un accordo fermo per sedici secondi.
      const breathe = 0.6 + 0.4 * Math.sin((t(i) * 2 * Math.PI) / (7 + n * 1.7) + n)
      ph += (notes[n] * 2 * Math.PI) / SR
      a[i] += Math.sin(ph) * gains[n] * breathe * 0.22
    }
  }
  // Il battito: un colpo sordo ogni due secondi. Da' un tempo al menu senza
  // chiedere attenzione.
  for (let k = 0; k < 8; k++) {
    const at = Math.round(k * 2.0 * SR)
    const len = Math.round(0.5 * SR)
    for (let i = 0; i < len && at + i < a.length; i++) {
      const x = i / SR
      a[at + i] += Math.sin(2 * Math.PI * 48 * x) * 0.5 * Math.exp(-x / 0.09)
    }
  }
  // Un velo di rumore molto scuro: toglie all'accordo l'aria di sintetizzatore.
  noise(a, 180, 0.12)
  return seamless(a, 1.2)
}

/** La coda dei risultati: lo stesso accordo, piu' rado e piu' alto. */
function musicResults() {
  const a = buf(12)
  const notes = [98.0, 146.83, 220.0, 293.66]
  const gains = [0.8, 0.45, 0.25, 0.12]
  for (let n = 0; n < notes.length; n++) {
    let ph = 0
    for (let i = 0; i < a.length; i++) {
      const breathe = 0.55 + 0.45 * Math.sin((t(i) * 2 * Math.PI) / (5 + n * 2.1) + n * 1.3)
      ph += (notes[n] * 2 * Math.PI) / SR
      a[i] += Math.sin(ph) * gains[n] * breathe * 0.24
    }
  }
  noise(a, 220, 0.09)
  return seamless(a, 1.0)
}

// --- interfaccia ----------------------------------------------------------

function uiHover() {
  const a = buf(0.05)
  sweep(a, 1150, 1150, 0.3)
  shape(a, 0.001, 0.009)
  return a
}

function uiClick() {
  const a = buf(0.08)
  sweep(a, 780, 560, 0.45)
  noise(a, 5000, 0.2)
  shape(a, 0.0008, 0.016)
  return a
}

function uiConfirm() {
  const a = buf(0.3)
  const half = Math.round(a.length / 2)
  sweep(a.subarray(0, half), 520, 520, 0.45)
  shape(a.subarray(0, half), 0.002, 0.04)
  sweep(a.subarray(half), 780, 780, 0.5)
  shape(a.subarray(half), 0.002, 0.06)
  return a
}

// --- produzione -----------------------------------------------------------

const SOUNDS = {
  cast_beam: beam,
  cast_bolt: bolt,
  cast_burst: burst,
  hit_confirm: hitConfirm,
  parry: parry,
  kill: kill,
  ready: ready,
  unavailable: unavailable,
  hurt: hurt,
  launched: launched,
  death: death,
  step_1: () => step(0),
  step_2: () => step(1),
  step_3: () => step(2),
  step_4: () => step(3),
  land: land,
  jump: jump,
  torch_loop: torch,
  wind_loop: wind,
  ui_hover: uiHover,
  ui_click: uiClick,
  ui_confirm: uiConfirm,
  music_menu: musicMenu,
  music_results: musicResults,
}

let total = 0
for (const [name, make] of Object.entries(SOUNDS)) {
  const bytes = write(name, make())
  total += bytes
  console.log(`  ${name.padEnd(14)} ${(bytes / 1024).toFixed(1).padStart(7)} KB`)
}
console.log(`\n${Object.keys(SOUNDS).length} suoni · ${(total / 1024 / 1024).toFixed(2)} MB`)
