// ---------------------------------------------------------------------------
// Ability card formatting helpers (pure).
//
// Display/formatting logic for the Loadout Forge ability cards: cost strings,
// effect/targeting tags, nature labels, CSS tag classes, description markup,
// build recommendations. Extracted from loadout-station.ts — pure functions of
// the ability definitions, no DOM or station state.
// ---------------------------------------------------------------------------
import { ABILITY_DEFS, type AbilityDef, type TargetAbilitySlotFamily } from '@ragequit/shared'

export function formatCost(def: AbilityDef): string {
  if (def.costMana > 0 && def.costStamina > 0) return `${def.costMana}MP + ${def.costStamina}SP`
  if (def.costMana > 0) return `${def.costMana} MP`
  if (def.costStamina > 0) return `${def.costStamina} SP`
  return 'GRATIS'
}

export function statusControlScore(status: string): number {
  if (['stun', 'freeze', 'airborne', 'root', 'blind'].includes(status)) return 3
  if (['slow', 'chill', 'curse', 'mark'].includes(status)) return 2
  if (['burn', 'bleed', 'poison'].includes(status)) return 1
  return 1
}

export function abilityHasControl(def: AbilityDef): boolean {
  if (['starter', 'counter'].includes(def.comboRole)) return true
  return def.effects.some((effect) => {
    if (effect.kind === 'knockup') return true
    if (effect.kind === 'applyStatus') return statusControlScore(effect.status) >= 2
    if (effect.kind === 'projectile' && effect.onHitStatus)
      return statusControlScore(effect.onHitStatus.status) >= 2
    if (effect.kind === 'zone' && effect.applyStatus)
      return statusControlScore(effect.applyStatus.status) >= 2
    if (effect.kind === 'channel' && effect.perTick.kind === 'applyStatus')
      return statusControlScore(effect.perTick.status) >= 2
    return false
  })
}

export function recommendationTags(
  candidate: AbilityDef,
  activeIdx: number,
  slotIds: readonly string[],
): string[] {
  const otherDefs = slotIds
    .map((id, idx) => (idx === activeIdx ? undefined : ABILITY_DEFS[id]))
    .filter((def): def is AbilityDef => Boolean(def))
  const tags: string[] = []
  const hasStarter = otherDefs.some((def) => def.comboRole === 'starter' || abilityHasControl(def))
  const hasFinisher = otherDefs.some((def) => def.comboRole === 'finisher')
  const hasReset = otherDefs.some((def) =>
    ['survival', 'counter', 'mobility'].includes(def.comboRole),
  )
  const hasPointPreview = otherDefs.some((def) => def.targeting === 'point')
  const hasInstantHit = otherDefs.some((def) => def.targeting === 'forward')

  if (!hasStarter && (candidate.comboRole === 'starter' || abilityHasControl(candidate)))
    tags.push('APERTURA')
  if (!hasFinisher && candidate.comboRole === 'finisher') tags.push('CHIUSURA')
  if (!hasReset && ['survival', 'counter', 'mobility'].includes(candidate.comboRole))
    tags.push('RESET')
  if (hasPointPreview && !hasInstantHit && candidate.targeting === 'forward') tags.push('FOLLOW-UP')
  return Array.from(new Set(tags)).slice(0, 2)
}

export function abilityNatureLabel(def: AbilityDef): string {
  const kinds = new Set(def.effects.map((effect) => effect.kind))
  const statuses: string[] = []

  for (const effect of def.effects) {
    if (effect.kind === 'applyStatus') statuses.push(effect.status)
    if (effect.kind === 'projectile' && effect.onHitStatus) statuses.push(effect.onHitStatus.status)
    if (effect.kind === 'zone' && effect.applyStatus) statuses.push(effect.applyStatus.status)
    if (effect.kind === 'channel' && effect.perTick.kind === 'applyStatus')
      statuses.push(effect.perTick.status)
  }

  const hasControl =
    statuses.some((status) => statusControlScore(status) >= 2) || kinds.has('knockup')
  const hasDot = statuses.some((status) => ['burn', 'bleed', 'poison', 'chill'].includes(status))

  if (
    def.comboRole === 'survival' ||
    kinds.has('heal') ||
    kinds.has('cleanse') ||
    kinds.has('restoreStamina') ||
    statuses.some((status) => status === 'shield')
  )
    return 'RECUPERO'
  if (def.comboRole === 'mobility' || kinds.has('move'))
    return hasControl ? 'MOBILITA + CONTROLLO' : 'MOBILITA'
  if (kinds.has('resourceDrain') || kinds.has('lifesteal')) return 'DRENAGGIO'
  if (hasControl) return kinds.has('zone') ? 'CONTROLLO AREA' : 'CONTROLLO'
  if (kinds.has('zone')) return 'ZONA'
  if (kinds.has('projectile')) return hasDot ? 'PROIETTILE + STATO' : 'PROIETTILE'
  if (hasDot) return 'STATO / DOT'
  if (kinds.has('damage')) return 'DANNO'
  return 'UTILITY'
}

export function targetingTags(def: AbilityDef): string[] {
  if (def.targeting === 'self') return ['SELF']
  if (def.targeting === 'point') return ['POINT AREA']
  if (def.effects.some((effect) => effect.kind === 'projectile')) return ['SKILL SHOT']
  if (def.targeting === 'forward') return ['AIM LOCK']
  if (def.targeting === 'target') return ['TARGET']
  return []
}

export function statusTag(status: string, durationSec: number, stacks?: number): string {
  const stackText = stacks && stacks > 1 ? ` x${stacks}` : ''
  return `${status.toUpperCase()}${stackText} ${durationSec}s`
}

export function formatEffectTags(def: AbilityDef): string[] {
  const tags = new Set<string>()

  for (const tag of targetingTags(def)) tags.add(tag)

  for (const e of def.effects) {
    if (e.kind === 'damage') {
      tags.add(e.radius && e.radius > 0 ? `${e.amount} AOE DMG` : `${e.amount} DMG`)
    } else if (e.kind === 'projectile') {
      tags.add(`${e.damage} DMG`)
      if (e.onHitStatus)
        tags.add(statusTag(e.onHitStatus.status, e.onHitStatus.durationSec, e.onHitStatus.stacks))
    } else if (e.kind === 'applyStatus') {
      tags.add(statusTag(e.status, e.durationSec, e.stacks))
    } else if (e.kind === 'knockup') {
      tags.add('AIRBORNE')
    } else if (e.kind === 'heal') {
      tags.add(e.overSec && e.overSec > 0 ? `${e.amount} HEAL` : `${e.amount} HEAL`)
    } else if (e.kind === 'zone') {
      if ((e.damagePerTick ?? 0) > 0) tags.add(`${e.damagePerTick}/TICK`)
      else if (e.durationSec > 0) tags.add(`${e.durationSec}s ZONA`)
      if (e.applyStatus)
        tags.add(statusTag(e.applyStatus.status, e.applyStatus.durationSec, e.applyStatus.stacks))
    } else if (e.kind === 'move') {
      tags.add(e.mode.toUpperCase())
    } else if (e.kind === 'channel') {
      tags.add('CHANNEL')
      if (e.perTick.kind === 'damage') tags.add(`${e.perTick.amount}/TICK`)
      if (e.perTick.kind === 'heal') tags.add(`${e.perTick.amount}/TICK HEAL`)
      if (e.perTick.kind === 'applyStatus')
        tags.add(statusTag(e.perTick.status, e.perTick.durationSec, e.perTick.stacks))
    } else if (e.kind === 'cleanse') {
      tags.add(e.status ? `CLEANSE ${e.status.toUpperCase()}` : 'FULL CLEANSE')
    } else if (e.kind === 'restoreStamina') {
      tags.add(`+${e.amount} STAMINA`)
    } else if (e.kind === 'lifesteal') {
      tags.add(`${Math.round(e.fraction * 100)}% LIFESTEAL`)
    }
  }

  return Array.from(tags).slice(0, 5)
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Formats an ability description with highlighted status names and bold numbers. */
export function formatDesc(text: string): string {
  let s = escapeHtml(text)
  s = s.replace(/\b(\d+(?:\.\d+)?[ms]?)\b/g, '<b>$1</b>')
  const STATUS_MAP: [RegExp, string][] = [
    [/\b(Burn(?:ing)?)\b/gi, 'ds-fire'],
    [/\b(Chill(?:ed)?|Freeze|Frozen)\b/gi, 'ds-ice'],
    [/\b(Bleed(?:ing)?)\b/gi, 'ds-bleed'],
    [/\b(Stun(?:ned)?)\b/gi, 'ds-stun'],
    [/\b(Root(?:ed)?)\b/gi, 'ds-root'],
    [/\b(Slow(?:ed)?)\b/gi, 'ds-slow'],
    [/\b(Poison(?:ed)?)\b/gi, 'ds-nature'],
    [/\b(Blind(?:ed)?)\b/gi, 'ds-dark'],
    [/\b(Shield)\b/gi, 'ds-shield'],
    [/\b(Heal(?:ing)?|Lifesteal)\b/gi, 'ds-heal'],
    [/\b(Airborne|Knockback|Knockup)\b/gi, 'ds-cc'],
    [/\b(Curse)\b/gi, 'ds-dark'],
    [/\b(Teleport|Blink)\b/gi, 'ds-move'],
    [/\b(Dash)\b/gi, 'ds-move'],
  ]
  for (const [re, cls] of STATUS_MAP) {
    s = s.replace(re, `<span class="${cls}">$1</span>`)
  }
  return s
}

export function tagClass(tag: string): string {
  if (
    /\b(OPENER|EXTENDER|CASHOUT|RAY|PRESSURE|SURVIVAL|COUNTER|MOBILITY|DRAIN|RESOURCE)\b/.test(tag)
  )
    return 'tag-role'
  if (/\b(SELF|POINT AREA|SKILL SHOT|AIM LOCK|TARGET)\b/.test(tag)) return 'tag-targeting'
  if (/\b(DMG|DAMAGE|PROJECTILE|SPLASH|TICK|ZONE)\b/.test(tag)) return 'tag-damage'
  if (/\b(AIRBORNE|KNOCKBACK|ROOT|STUN|FREEZE|SLOW|BLIND|MARK|CURSE)\b/.test(tag))
    return 'tag-control'
  if (/\b(BURN|BLEED|POISON|CHILL|SHIELD|HASTE|CLEANSE|INVULNERABLE)\b/.test(tag))
    return 'tag-status'
  if (/\b(DASH|TELEPORT|MOVE)\b/.test(tag)) return 'tag-move'
  if (/\b(HEAL|STAMINA|MANA|HP|LIFESTEAL|->)\b/.test(tag)) return 'tag-resource'
  if (/\b(WINDUP|CHANNEL|TICK)\b/.test(tag)) return 'tag-timing'
  return ''
}

/** Maps ability nature label to CSS modifier class for the type badge. */
export function typeBadgeClass(nature: string): string {
  if (nature.includes('RECUPERO')) return 'recupero'
  if (nature.includes('MOBILITA') && nature.includes('CONTROLLO')) return 'mob-cc'
  if (nature.includes('MOBILITA')) return 'mobilita'
  if (nature.includes('CONTROLLO AREA')) return 'cc-area'
  if (nature.includes('CONTROLLO')) return 'controllo'
  if (nature.includes('DRENAGGIO')) return 'drenaggio'
  if (nature.includes('ZONA')) return 'zona'
  if (nature.includes('PROIETTILE')) return 'proiettile'
  if (nature.includes('STATO')) return 'stato'
  if (nature.includes('DANNO')) return 'danno'
  return 'utility'
}

/** Short targeting label with symbol. */
export function targetingLabel(def: AbilityDef): string {
  if (def.targeting === 'self') return '◉ SELF'
  if (def.targeting === 'point') return '⊕ PUNTO'
  if (def.effects.some((e) => e.kind === 'projectile')) return '▷ PROJECTILE'
  if (def.targeting === 'forward') return '▶ DIRETTO'
  return '◎ TARGET'
}

export type AbilityShapeKind = 'self' | 'line' | 'area' | 'wall' | 'dash' | 'melee'

export interface AbilityReadability {
  shape: AbilityShapeKind
  shapeLabel: string
  instruction: string
  outcome: string
}

const STATUS_IT: Record<string, string> = {
  airborne: 'lancio in aria',
  blind: 'cecità',
  bleed: 'sanguinamento',
  burn: 'bruciatura',
  chill: 'gelo',
  curse: 'maledizione',
  freeze: 'congelamento',
  mark: 'marchio',
  poison: 'veleno',
  root: 'radice',
  shield: 'scudo',
  slow: 'rallentamento',
  stun: 'stordimento',
}

function effectOutcome(def: AbilityDef): string[] {
  const parts: string[] = []
  for (const effect of def.effects) {
    if (effect.kind === 'projectile') {
      const splash = (effect.splashRadius ?? 0) > 0 ? ` · esplosione ${effect.splashRadius} m` : ''
      parts.push(`${effect.damage} danni${splash}`)
    } else if (effect.kind === 'damage') {
      const area = (effect.radius ?? 0) > 0 ? ` in ${effect.radius} m` : ''
      parts.push(`${effect.amount} danni${area}`)
    } else if (effect.kind === 'zone') {
      const size = (effect.width ?? 0) > 0 ? `${effect.width} m` : `raggio ${effect.radius} m`
      const tick = (effect.damagePerTick ?? 0) > 0 ? ` · ${effect.damagePerTick} danni/impulso` : ''
      parts.push(`zona ${size} per ${effect.durationSec}s${tick}`)
      if (effect.applyStatus)
        parts.push(
          `${STATUS_IT[effect.applyStatus.status] ?? effect.applyStatus.status} ${effect.applyStatus.durationSec}s`,
        )
    } else if (effect.kind === 'channel') {
      const tick = effect.perTick
      if (tick.kind === 'damage')
        parts.push(`${tick.amount} danni/impulso per ${effect.durationSec}s`)
      else if (tick.kind === 'heal')
        parts.push(`${tick.amount} cura/impulso per ${effect.durationSec}s`)
    } else if (effect.kind === 'applyStatus') {
      parts.push(`${STATUS_IT[effect.status] ?? effect.status} ${effect.durationSec}s`)
    } else if (effect.kind === 'knockup') {
      parts.push(`lancia in aria ${effect.airborneSec}s`)
    } else if (effect.kind === 'move') {
      parts.push(`${effect.mode === 'dash' ? 'scatto' : 'teletrasporto'} ${effect.distance} m`)
    } else if (effect.kind === 'heal') {
      parts.push(`${effect.amount} cura${effect.overSec ? ` in ${effect.overSec}s` : ''}`)
    } else if (effect.kind === 'restoreStamina') {
      parts.push(`+${effect.amount} stamina`)
    } else if (effect.kind === 'resourceDrain') {
      parts.push(`ruba ${effect.amount} ${effect.resource}`)
    } else if (effect.kind === 'cleanse') {
      parts.push(
        effect.status
          ? `rimuove ${STATUS_IT[effect.status] ?? effect.status}`
          : 'rimuove tutti i malus',
      )
    } else if (effect.kind === 'lifesteal') {
      parts.push(`${Math.round(effect.fraction * 100)}% cura dal danno`)
    }
  }
  return Array.from(new Set(parts)).slice(0, 3)
}

export function abilityReadability(def: AbilityDef): AbilityReadability {
  const zone = def.effects.find((effect) => effect.kind === 'zone')
  const hasProjectile = def.effects.some((effect) => effect.kind === 'projectile')
  const hasMove = def.effects.some((effect) => effect.kind === 'move')
  const hasRadius = def.effects.some(
    (effect) =>
      (effect.kind === 'damage' || effect.kind === 'heal' || effect.kind === 'knockup') &&
      (effect.radius ?? 0) > 0,
  )

  let shape: AbilityShapeKind
  let shapeLabel: string
  let instruction: string
  if (zone?.width && zone.width > 0) {
    shape = 'wall'
    shapeLabel = `MURO ${zone.width} M`
    instruction =
      def.targeting === 'point' ? 'SCEGLI IL PUNTO · LMB CONFERMA' : 'CREA UN MURO DAVANTI A TE'
  } else if (def.targeting === 'point') {
    shape = 'area'
    shapeLabel = `AREA ${zone?.radius ?? def.range} M`
    instruction = 'SCEGLI IL PUNTO · LMB CONFERMA'
  } else if (hasMove) {
    shape = 'dash'
    shapeLabel = 'MOVIMENTO'
    instruction = 'PARTE NELLA DIREZIONE DI MIRA'
  } else if (hasProjectile) {
    shape = 'line'
    shapeLabel = 'TRAIETTORIA'
    instruction = 'MIRA E SPARA · COLPO IN LINEA'
  } else if (def.targeting === 'self' && hasRadius) {
    shape = 'area'
    shapeLabel = 'AREA ATTORNO A TE'
    instruction = 'ISTANTANEA · COLPISCE ATTORNO A TE'
  } else if (def.targeting === 'self') {
    shape = 'self'
    shapeLabel = 'SU DI TE'
    instruction = 'ISTANTANEA SU DI TE'
  } else if (def.slot === 'melee') {
    shape = 'melee'
    shapeLabel = 'ARCO RAVVICINATO'
    instruction = 'MIRA DAVANTI · CORTA DISTANZA'
  } else {
    shape = 'line'
    shapeLabel = 'LINEA DI MIRA'
    instruction =
      def.targeting === 'target' ? 'AGGANCIA IL NEMICO PIÙ VICINO' : 'MIRA DAVANTI · COLPO DIRETTO'
  }

  return { shape, shapeLabel, instruction, outcome: effectOutcome(def).join(' · ') }
}

export function slotPoolTitle(slot: TargetAbilitySlotFamily, _idx: number): string {
  if (slot === 'melee') return 'Abilita Spada'
  if (slot === 'bow') return 'Abilita Arco'
  if (slot === 'magicBase') return 'Magia Base'
  if (slot === 'magicAdvanced') return 'Magia Avanzata'
  return 'Slot Utility'
}
