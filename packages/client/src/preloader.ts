// preloader.ts — Asset preload system.
//
// Loads all GLBs required for a match before the arena render loop starts.
// Shows a loading screen with a progress bar.
// Call `preloadMatchAssets(classId)` after connecting to the server
// and `hideLoadingScreen()` once preload completes and rendering begins.

import { preloadClassModel } from './render/character-loader.js'
import { fetchWeaponGlb } from './render/character-weapons.js'

let _screen: HTMLElement | null = null
let _barFill: HTMLElement | null = null
let _label: HTMLElement | null = null
let _sub: HTMLElement | null = null

function ensureRefs(): void {
  if (_screen) return
  _screen = document.getElementById('loading-screen')
  _barFill = document.getElementById('loading-bar-fill')
  _label = document.getElementById('loading-label')
  _sub = document.getElementById('loading-sub')
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function showLoadingScreen(labelText = 'Caricamento arena...'): void {
  ensureRefs()
  if (!_screen) return
  _screen.classList.remove('hidden')
  if (_label) _label.textContent = labelText
  if (_barFill) (_barFill as HTMLElement).style.width = '0%'
  if (_sub) _sub.textContent = ''
}

export function hideLoadingScreen(): void {
  ensureRefs()
  _screen?.classList.add('hidden')
}

function setProgress(pct: number, sub: string): void {
  if (_barFill) (_barFill as HTMLElement).style.width = `${Math.round(pct)}%`
  if (_sub) _sub.textContent = sub
}

// ---------------------------------------------------------------------------
// Main preload
// ---------------------------------------------------------------------------

/**
 * Preload all assets needed to enter a match.
 * `selfClassId` is the class the local player will play.
 * Remote player classes are unknown at this point, so we preload the 4 base
 * classes in the background after the match starts — only `selfClassId` is
 * guaranteed loaded before the first frame.
 *
 * @param selfClassId — class id of the local player ('breaker', 'talon', 'warden', 'drift')
 * @param onProgress  — optional callback called with (0-100) progress value
 */
export async function preloadMatchAssets(
  selfClassId: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  showLoadingScreen('Caricamento arena...')

  // Steps and their relative weights (must sum to 100)
  const steps: Array<{ label: string; sub: string; weight: number; fn: () => Promise<void> }> = [
    {
      label: 'Caricamento personaggio...',
      sub: selfClassId.toUpperCase(),
      weight: 40,
      fn: () => preloadClassModel(selfClassId),
    },
    {
      label: 'Caricamento armi...',
      sub: 'SWORD · BOW · STAFF',
      weight: 45,
      fn: async () => {
        await Promise.all([fetchWeaponGlb('sword'), fetchWeaponGlb('bow'), fetchWeaponGlb('staff')])
      },
    },
    {
      label: 'Pronto!',
      sub: '',
      weight: 15,
      fn: async () => {
        // Small async gap so the "Pronto!" label is visible before hiding
        await new Promise((r) => setTimeout(r, 120))
      },
    },
  ]

  let accumulated = 0
  for (const step of steps) {
    if (_label) _label.textContent = step.label
    setProgress(accumulated, step.sub)
    onProgress?.(accumulated)

    await step.fn()

    accumulated += step.weight
    setProgress(accumulated, step.sub)
    onProgress?.(accumulated)
  }

  // Short delay so the bar reaching 100% is visible
  await new Promise((r) => setTimeout(r, 80))
}

/**
 * Warm-load the other 3 classes in the background after the match starts.
 * Does NOT block gameplay — just populates the GLB cache so remote players
 * don't stall when they first appear.
 */
export function preloadOtherClassesBackground(selfClassId: string): void {
  const ALL_CLASSES = ['breaker', 'talon', 'warden', 'drift']
  for (const cls of ALL_CLASSES) {
    if (cls === selfClassId) continue
    preloadClassModel(cls).catch((e: unknown) => {
      console.warn(`[preloader] background preload failed for "${cls}":`, e)
    })
  }
}
