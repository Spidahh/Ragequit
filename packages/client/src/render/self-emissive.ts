import { HP_MAX, TARGET_CLASS_DEFS } from '@ragequit/shared'
import type { ClassId } from '@ragequit/shared'
import * as THREE from 'three'

export const STATUS_EMISSIVE: Record<string, number> = {
  burn: 0xff2800,
  bleed: 0x880000,
  chill: 0x0055ff,
  poison: 0x00bb33,
  slow: 0x5500cc,
  root: 0x663300,
  stun: 0xeedd00,
  freeze: 0x22aaff,
  curse: 0xaa00ff,
  blind: 0x050505,
  mark: 0xff0044,
  shield: 0x3377ff,
  haste: 0xffcc00,
}

export interface SelfEmissiveSchema {
  hp: number
  classId?: string
  statuses: ReadonlyArray<{ kind: string }>
  invulnUntilTick: number
}

export interface SelfEmissiveOptions {
  getSelfMesh: () => THREE.Group | null
  playerLight: THREE.PointLight
}

export interface SelfEmissiveController {
  update: (
    now: number,
    tickNow: number,
    selfSchema: SelfEmissiveSchema | null,
    selfDamageBlinkUntilMs: number,
  ) => void
}

export function initSelfEmissive({
  getSelfMesh,
  playerLight,
}: SelfEmissiveOptions): SelfEmissiveController {
  function update(
    now: number,
    tickNow: number,
    selfSchema: SelfEmissiveSchema | null,
    selfDamageBlinkUntilMs: number,
  ): void {
    const selfMesh = getSelfMesh()
    if (!selfMesh || !selfSchema) return
    const hpMax = TARGET_CLASS_DEFS[selfSchema.classId as ClassId]?.resourceMaxima.hp ?? HP_MAX
    const hpFrac = selfSchema.hp / hpMax
    const mat = selfMesh.userData['armorMat'] as THREE.MeshToonMaterial | undefined
    if (!mat) return

    // NEVER repaint the albedo of a textured character.
    //
    // `color` multiplies `map`, so writing team blue here every frame took the
    // paladin's 2048² dark-plate diffuse — steel, gold trim, purple cape — and
    // turned it into flat blue plastic. Worse, SkeletonUtils clones share their
    // materials, so painting the local player's material repainted every other
    // character using the same model: that is why enemies were blue too.
    //
    // This code is correct for the procedural character, whose armorMat really
    // is a flat tint and where team blue IS the identity. It became wrong the
    // day armorMat was repointed at a real PBR material (characters.ts). For a
    // textured character, identity is carried by the nameplate and outline; the
    // low-HP warning moves to emissive below, which reaches the whole model.
    const isTinted = !mat.map
    const lowHp = hpFrac < 0.25
    if (isTinted) {
      if (lowHp) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.007)
        mat.color.setHex(pulse > 0.5 ? 0x80c8ff : 0x3a8fde)
      } else {
        mat.color.setHex(0x3a8fde)
      }
    }

    const statuses = Array.from(selfSchema.statuses ?? [])
    let tR = 0,
      tG = 0,
      tB = 0
    for (const st of statuses) {
      const hex = STATUS_EMISSIVE[st.kind]
      if (hex !== undefined) {
        tR = Math.max(tR, ((hex >> 16) & 0xff) / 255)
        tG = Math.max(tG, ((hex >> 8) & 0xff) / 255)
        tB = Math.max(tB, (hex & 0xff) / 255)
      }
    }
    // Low HP on a textured character: a red ember pulse through emissive, since
    // its albedo is art and must not be overwritten.
    if (lowHp && !isTinted) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.007)
      tR = Math.max(tR, 0.25 + pulse * 0.55)
      tG = Math.max(tG, pulse * 0.06)
      tB = Math.max(tB, pulse * 0.04)
    }
    if (selfSchema.invulnUntilTick > tickNow) {
      const pulse = 0.45 + 0.45 * Math.sin(now * 0.025)
      tR = Math.max(tR, pulse * 1.0)
      tG = Math.max(tG, pulse * 0.85)
      tB = Math.max(tB, pulse * 0.2)
    }
    if (now < selfDamageBlinkUntilMs) {
      const blinkFrac = 1 - (selfDamageBlinkUntilMs - now) / 160
      const blinkStrength = blinkFrac < 0.5 ? blinkFrac * 2 : (1 - blinkFrac) * 2
      tR = Math.max(tR, blinkStrength * 0.95)
      tG = Math.max(tG, blinkStrength * 0.95)
      tB = Math.max(tB, blinkStrength * 0.95)
    }
    const LERP = 0.12
    const hasFlash = tR > 0 || tG > 0 || tB > 0
    mat.emissive.r += (tR - mat.emissive.r) * LERP
    mat.emissive.g += (tG - mat.emissive.g) * LERP
    mat.emissive.b += (tB - mat.emissive.b) * LERP
    mat.emissiveIntensity = hasFlash ? 0.7 : 0
    // Propagate to all GLB mesh materials so the whole character flashes
    const glbMats = selfMesh.userData['glbMaterials'] as THREE.MeshToonMaterial[] | undefined
    if (glbMats) {
      for (const m of glbMats) {
        if (m === mat) continue
        m.emissive.r += (tR - m.emissive.r) * LERP
        m.emissive.g += (tG - m.emissive.g) * LERP
        m.emissive.b += (tB - m.emissive.b) * LERP
        m.emissiveIntensity = hasFlash ? 0.7 : 0
      }
    }

    const hasShield = statuses.some((s) => s.kind === 'shield')
    const hasHaste = statuses.some((s) => s.kind === 'haste')
    if (hpFrac < 0.28) {
      const redPulse = 0.5 + 0.5 * Math.sin(now * 0.008)
      playerLight.color.setRGB(0.8 + redPulse * 0.2, 0.1, 0.05 + redPulse * 0.05)
      playerLight.intensity = 0.55 + redPulse * 0.25
    } else if (hasShield) {
      const shieldPulse = 0.5 + 0.5 * Math.sin(now * 0.005)
      playerLight.color.setRGB(0.2, 0.5, 0.9 + shieldPulse * 0.1)
      playerLight.intensity = 0.55 + shieldPulse * 0.2
    } else if (hasHaste) {
      const hastePulse = 0.5 + 0.5 * Math.sin(now * 0.012)
      playerLight.color.setRGB(0.95 + hastePulse * 0.05, 0.8, 0.15)
      playerLight.intensity = 0.5 + hastePulse * 0.2
    } else {
      playerLight.color.setRGB(0.67, 0.8, 1.0)
      playerLight.intensity = 0.45
    }
  }

  return { update }
}
