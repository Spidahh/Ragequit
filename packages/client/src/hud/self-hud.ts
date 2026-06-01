import { ABILITY_DEFS, TARGET_CLASS_DEFS, TICK_RATE_HZ, type ClassId } from '@ragequit/shared'
import * as THREE from 'three'

import { renderDeathcam, type DeathcamData } from '../endgame.js'
import { statusIcon } from '../icons.js'

import { ELEMENT_COLOR, type CooldownStripController } from './cd-strip.js'

const RESPAWN_TIPS: readonly string[] = [
  'Tasto destro: tap = finestra di parry, tieni premuto = blocco ripetuto.',
  'Coyote time: il salto è valido per 83 ms dopo aver lasciato un bordo.',
  'Meccanica di classe: ogni classe ha una risorsa unica — Fury, Momentum, Risonanza o Flow.',
  'Burn + Chill: esplosione di vapore (Steam combo).',
  'Veleno + Bleed: Festering raddoppia il danno nel tempo.',
  'Spazio: salto a impulso fisso — tenerlo premuto non aggiunge altezza.',
  'Staff M1: proiettile rapido e poco costoso per pressione costante.',
  'Air launch: colpisci in aria per massimizzare il danno finisher.',
  'Le dash si fermano sulle pareti — usa le coperture come scudo.',
  'Parry tap: consuma stamina e CD; parry hold: drena stamina continua.',
]

// Minimal schema shape consumed by this module.
export interface SelfHudSchema {
  hp: number
  mana: number
  stamina: number
  comboIndex: number
  lastSwingStartTick: number
  alive: boolean
  respawnAtTick: number
  classId: string
  statuses: ReadonlyArray<{ kind: string; stacks: number; remainingSec: number }>
  casting: boolean
  castAbilityId: string
  castEndsAtTick: number
  abilityCooldowns: Map<string, number>
  gcdReadyAtTick: number
}

export interface SelfHudOptions {
  hudHpFill: HTMLElement
  hudManaFill: HTMLElement
  hudStamFill: HTMLElement
  hudHpNum: HTMLElement
  hudManaNum: HTMLElement
  hudStamNum: HTMLElement
  comboDots: readonly (HTMLElement | null)[]
  hudComboEl: HTMLElement
  respawnOverlay: HTMLElement
  respawnSec: HTMLElement
  respawnKillerEl: HTMLElement
  respawnTipEl: HTMLElement | null
  statusStrip: HTMLElement
  castBar: HTMLElement
  castBarFill: HTMLElement
  castBarLabel: HTMLElement
  gcdRingEl: HTMLElement | null
  cooldownStrip: CooldownStripController
}

export interface SelfHudUpdateParams {
  selfSchema: SelfHudSchema | null
  now: number
  tickNow: number
  castStartedAtMs: number
  placementAbilityId: string | null
  primedSlotIdx: number | null
  lastKillerName: string
  selfMesh: THREE.Group | null
  getCurrentLoadout: () => string[]
  getCurrentClassId?: () => ClassId
  setCastStartedAt: (ms: number) => void
  clearPrimedSlot: () => void
  cancelPlacementPreview: () => void
  deathcamData?: DeathcamData | null
}

export interface SelfHudController {
  update: (params: SelfHudUpdateParams) => void
}

export function initSelfHud({
  hudHpFill,
  hudManaFill,
  hudStamFill,
  hudHpNum,
  hudManaNum,
  hudStamNum,
  comboDots,
  hudComboEl,
  respawnOverlay,
  respawnSec,
  respawnKillerEl,
  respawnTipEl,
  statusStrip,
  castBar,
  castBarFill,
  castBarLabel,
  gcdRingEl,
  cooldownStrip,
}: SelfHudOptions): SelfHudController {
  const hudHpBar = document.getElementById('hud-hp')
  const hudManaBar = document.getElementById('hud-mana')
  const hudStamBar = document.getElementById('hud-stam')

  function update({
    selfSchema,
    now,
    tickNow,
    castStartedAtMs,
    placementAbilityId,
    primedSlotIdx,
    lastKillerName,
    selfMesh,
    getCurrentLoadout,
    getCurrentClassId,
    setCastStartedAt,
    clearPrimedSlot,
    cancelPlacementPreview,
    deathcamData,
  }: SelfHudUpdateParams): void {
    if (!selfSchema) return

    const classId = (selfSchema.classId ?? 'hybrid') as ClassId
    const isValidClass =
      classId === 'tank' || classId === 'archer' || classId === 'mage' || classId === 'hybrid'
    const maxima = isValidClass
      ? TARGET_CLASS_DEFS[classId].resourceMaxima
      : TARGET_CLASS_DEFS.hybrid.resourceMaxima
    const hpPct = Math.max(0, Math.min(1, selfSchema.hp / maxima.hp))
    const mpPct = Math.max(0, Math.min(1, selfSchema.mana / maxima.mana))
    const spPct = Math.max(0, Math.min(1, selfSchema.stamina / maxima.stamina))
    hudHpFill.style.width = `${(hpPct * 100).toFixed(1)}%`
    hudManaFill.style.width = `${(mpPct * 100).toFixed(1)}%`
    hudStamFill.style.width = `${(spPct * 100).toFixed(1)}%`
    hudHpNum.textContent = `${Math.round(selfSchema.hp)} / ${maxima.hp}`
    hudManaNum.textContent = `${Math.round(selfSchema.mana)} / ${maxima.mana}`
    hudStamNum.textContent = `${Math.round(selfSchema.stamina)} / ${maxima.stamina}`
    hudHpBar?.classList.toggle('warn', hpPct < 0.25)
    hudManaBar?.classList.toggle('warn', mpPct < 0.2)
    hudStamBar?.classList.toggle('warn', spPct < 0.15)

    const nextIdx = selfSchema.comboIndex
    const elapsedSec = (tickNow - selfSchema.lastSwingStartTick) / TICK_RATE_HZ
    const live = elapsedSec < 1.0 && selfSchema.lastSwingStartTick > 0
    // comboIndex wraps 0→1→2→0. When live and nextIdx===0 the 3rd swing just
    // completed (index wrapped back to start), so all 3 dots should light up.
    const delivered = live && nextIdx === 0 ? 3 : nextIdx
    for (let i = 0; i < 3; i++) {
      comboDots[i]?.classList.toggle('active', live && i < delivered)
    }
    hudComboEl.classList.toggle('full', live && delivered === 3)

    if (!selfSchema.alive && selfSchema.respawnAtTick > 0) {
      const secLeft = Math.max(0, (selfSchema.respawnAtTick - tickNow) / TICK_RATE_HZ)
      const secLeftMs = secLeft * 1000
      if (!respawnOverlay.classList.contains('active')) {
        if (deathcamData) {
          renderDeathcam(respawnOverlay, {
            ...deathcamData,
            timeToNextMs: secLeftMs,
          })
        } else {
          if (respawnTipEl)
            respawnTipEl.textContent =
              RESPAWN_TIPS[Math.floor(Math.random() * RESPAWN_TIPS.length)] ?? ''
          respawnSec.textContent = secLeft.toFixed(1)
          respawnKillerEl.textContent = lastKillerName ? `⚔ killed by ${lastKillerName}` : ''
        }
      } else {
        // Dynamically update the countdown within the deathcam interface to avoid reflicker
        const countdownEl = respawnOverlay.querySelector('.dc-card:nth-child(2) .meta')
        if (countdownEl) {
          countdownEl.textContent = `Next round in ${Math.ceil(secLeft)}s`
        } else {
          respawnSec.textContent = secLeft.toFixed(1)
        }
      }
      respawnOverlay.classList.add('active')
    } else {
      respawnOverlay.classList.remove('active')
    }

    const liveStatuses = Array.from(selfSchema.statuses ?? [])
    while (statusStrip.firstChild) statusStrip.removeChild(statusStrip.firstChild)
    for (const st of liveStatuses) {
      const icon = document.createElement('div')
      icon.className = 'status-icon'
      icon.dataset['kind'] = st.kind
      icon.appendChild(statusIcon(st.kind, 22))
      icon.title = `${st.kind} x${st.stacks} (${st.remainingSec.toFixed(1)}s)`
      const stack = document.createElement('span')
      stack.className = 'stack'
      stack.textContent = st.stacks > 1 ? String(st.stacks) : ''
      if (st.stacks > 1) icon.appendChild(stack)
      const tm = document.createElement('div')
      tm.className = 'timer'
      const fill = document.createElement('div')
      fill.className = 'fill'
      const total = Math.max(0.1, st.remainingSec)
      // Cap at 5 s → 100% for visual display; scales linearly above.
      const ratio = Math.min(1, total / 5)
      fill.style.width = `${ratio * 100}%`
      tm.appendChild(fill)
      icon.appendChild(tm)
      statusStrip.appendChild(icon)
    }

    // Rebuild CD strip if loadout changed. Colyseus ArraySchema can update in
    // place so reference comparison misses edits — compare slot contents instead.
    const currentLoadout = getCurrentLoadout()
    const currentLoadoutSig = cooldownStrip.signature(currentLoadout)
    if (currentLoadoutSig !== cooldownStrip.currentSignature()) {
      cooldownStrip.rebuild(currentLoadout, getCurrentClassId?.() ?? 'hybrid')
      clearPrimedSlot()
      cancelPlacementPreview()
    }

    if (selfSchema.casting && selfSchema.castEndsAtTick > tickNow) {
      if (castStartedAtMs === 0) setCastStartedAt(now)
      const secLeft = (selfSchema.castEndsAtTick - tickNow) / TICK_RATE_HZ
      const elapsed = (now - castStartedAtMs) / 1000
      const total = elapsed + secLeft
      const ratio = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0
      castBar.classList.add('active')
      castBarFill.style.width = `${(ratio * 100).toFixed(1)}%`
      const castDef = ABILITY_DEFS[selfSchema.castAbilityId]
      const castName = castDef?.name ?? selfSchema.castAbilityId.toUpperCase()
      castBarLabel.textContent = `${castName}  ${secLeft.toFixed(1)}s`
      const castElemColor = ELEMENT_COLOR[castDef?.element ?? 'none'] ?? '#4a90d8'
      const castElemDim = castElemColor + '44' // ~27% alpha
      castBarFill.style.background = `linear-gradient(90deg, ${castElemDim} 0%, ${castElemColor} 80%, #fff 100%)`
      castBarFill.style.boxShadow = `2px 0 14px ${castElemColor}88`
      if (selfMesh) {
        const mat = selfMesh.userData['armorMat'] as THREE.MeshToonMaterial | undefined
        if (mat) {
          const elemHex = parseInt(
            (ELEMENT_COLOR[castDef?.element ?? 'none'] ?? '#9ba0b4').replace('#', ''),
            16,
          )
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.012)
          mat.emissiveIntensity = 0.7 + pulse * 1.1
          mat.emissive.setHex(elemHex)
          // Propagate to all GLB mesh materials
          const glbMats = selfMesh.userData['glbMaterials'] as THREE.MeshToonMaterial[] | undefined
          if (glbMats) {
            for (const m of glbMats) {
              if (m === mat) continue
              m.emissiveIntensity = 0.7 + pulse * 1.1
              m.emissive.setHex(elemHex)
            }
          }
        }
      }
    } else {
      setCastStartedAt(0)
      castBar.classList.remove('active', 'interrupted')
      castBarFill.style.width = '0%'
      castBarFill.style.background = ''
      castBarFill.style.boxShadow = ''
      castBarLabel.textContent = 'CAST'
    }

    cooldownStrip.updateAbilityCooldowns({
      abilityCooldowns: selfSchema.abilityCooldowns,
      placementAbilityId,
      primedSlotIdx,
      tickNow,
    })

    if (gcdRingEl) {
      const gcdReady = selfSchema.gcdReadyAtTick ?? 0
      gcdRingEl.classList.toggle('active', gcdReady > tickNow)
    }
  }

  return { update }
}
