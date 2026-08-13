// ---------------------------------------------------------------------------
// Static first-person weapon viewmodel (staff).
//
// Owns the non-animated first-person weapon model: loads the weapon GLB, applies
// overlay-safe materials, places it per-weapon, and swaps it on
// weapon change. The bow uses the dedicated animated rig (fpv-bow.ts); this
// covers the staff (and could cover any future static FPV weapon).
//
// Extracted from main.ts to shrink the render monolith — encapsulates the
// previously module-level `firstPersonViewWeapon` state and the build/clear
// functions behind a small controller.
// ---------------------------------------------------------------------------
import type { Weapon } from '@ragequit/shared'
import * as THREE from 'three'

import { fetchWeaponGlb } from './characters.js'

export interface FpvStaticViewmodel {
  /** Parent this under the viewmodel camera. */
  root: THREE.Group
  /** Swap to a weapon's model (async load; safe against rapid re-swaps). */
  rebuild(weapon: Weapon): void
  /** The weapon currently shown/loading, or null. */
  getCurrentWeapon(): Weapon | null
  /** Punch-and-settle. `mag` scales it: an M1 poke should not kick like a cast. */
  triggerCast(mag?: number): void
  update(now: number): void
}

export function createFpvStaticViewmodel(): FpvStaticViewmodel {
  const root = new THREE.Group()
  let currentWeapon: Weapon | null = null
  let castStartedAt = 0
  let castMag = 1

  function clear(): void {
    while (root.children.length > 0) {
      const child = root.children[0]!
      child.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return
        // The viewmodel is a clone that SHARES geometry with the weapon cache;
        // materials are the only per-instance resources.
        if (node.name.endsWith('_outline')) node.geometry.dispose()
        const material = node.material
        if (Array.isArray(material)) material.forEach((mat) => mat.dispose())
        else material.dispose()
      })
      root.remove(child)
    }
  }

  function rebuild(weapon: Weapon): void {
    // Keep the old model visible while the new GLB loads to avoid a 1-frame
    // flash of empty first-person view.
    currentWeapon = weapon

    fetchWeaponGlb(weapon)
      .then((scene) => {
        // Guard against rapid re-swaps while loading.
        if (currentWeapon !== weapon) return

        clear()
        const model = scene.clone()
        root.position.set(0, 0, 0)
        root.rotation.set(0, 0, 0)

        // Rendered in the dedicated viewmodel pass (separate scene + fresh depth
        // buffer): no depthTest/renderOrder hacks needed — just keep the meshes
        // always drawn (the 58° viewmodel camera is tighter than the world's).
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.frustumCulled = false
            const src = child.material as
              | THREE.MeshStandardMaterial
              | THREE.MeshToonMaterial
              | undefined
            const hasMap = !!(src && 'map' in src && src.map && !(src.map instanceof Function))
            const color = src?.color?.clone() ?? new THREE.Color(0xffffff)

            const nameLower = child.name.toLowerCase()
            const isGlowing =
              nameLower.includes('glow') ||
              nameLower.includes('glyph') ||
              nameLower.includes('orb') ||
              nameLower.includes('element')

            // MeshStandardMaterial responds to the fpvKeyLight for depth/shape.
            if (isGlowing) {
              child.material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0x00d0ff),
                transparent: true,
                opacity: src?.opacity ?? 1.0,
              })
            } else {
              child.material = new THREE.MeshStandardMaterial({
                color,
                map: hasMap ? src.map : null,
                roughness: 0.55,
                metalness: 0.3,
                transparent: src?.transparent ?? false,
                opacity: src?.opacity ?? 1.0,
              })
            }
          }
        })

        // Per-weapon first-person placement (tuned for the 58° viewmodel camera).
        if (weapon === 'sword') {
          model.position.set(0.18, -0.25, -0.5)
          model.rotation.set(-0.25, -0.4, 0.1)
          model.scale.setScalar(0.55)
        } else if (weapon === 'bow') {
          // bow.glb fallback placement (the live bow uses the animated rig).
          model.position.set(-0.26, -0.16, -0.6)
          model.rotation.set(Math.PI / 2, Math.PI / 2, 0)
          model.scale.setScalar(0.33)
        } else if (weapon === 'staff') {
          // Keep the grip in the lower-right and the head inside the frame. The
          // previous close-up placement showed only a giant vertical shaft.
          model.position.set(0.25, -0.24, -0.74)
          model.rotation.set(0.24, -0.34, Math.PI - 0.28)
          model.scale.setScalar(0.22)
        }

        root.add(model)
      })
      .catch((err) => {
        console.error(`[fpv-static] failed to load weapon model ${weapon}:`, err)
      })
  }

  /**
   * Punch the viewmodel back and let it settle.
   *
   * `mag` scales the displacement so a basic attack and a heavy cast do not
   * kick identically — a poke should read lighter than a committed spell.
   */
  function triggerCast(mag = 1): void {
    castStartedAt = performance.now()
    castMag = Math.max(0, mag)
  }

  function update(now: number): void {
    const elapsed = now - castStartedAt
    if (castStartedAt === 0 || elapsed >= 360) {
      root.position.set(0, 0, 0)
      root.rotation.set(0, 0, 0)
      castStartedAt = 0
      return
    }
    const kick = elapsed < 90 ? elapsed / 90 : 1 - (elapsed - 90) / 270
    const eased = Math.max(0, Math.sin(kick * Math.PI * 0.5)) * castMag
    root.position.set(0.035 * eased, -0.045 * eased, 0.09 * eased)
    root.rotation.set(-0.07 * eased, 0.04 * eased, -0.1 * eased)
  }

  return { root, rebuild, getCurrentWeapon: () => currentWeapon, triggerCast, update }
}
