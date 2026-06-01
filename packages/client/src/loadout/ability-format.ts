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
  if (hasPointPreview && !hasInstantHit && candidate.targeting === 'forward')
    tags.push('FOLLOW-UP')
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

  const hasControl = statuses.some((status) => statusControlScore(status) >= 2) || kinds.has('knockup')
  const hasDot = statuses.some((status) => ['burn', 'bleed', 'poison', 'chill'].includes(status))

  if (
    def.comboRole === 'survival' ||
    kinds.has('heal') ||
    kinds.has('cleanse') ||
    kinds.has('restoreStamina') ||
    statuses.some((status) => status === 'shield')
  )
    return 'RECUPERO'
  if (def.comboRole === 'mobility' || kinds.has('move')) return hasControl ? 'MOBILITA + CONTROLLO' : 'MOBILITA'
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

export function slotPoolTitle(slot: TargetAbilitySlotFamily, _idx: number): string {
  if (slot === 'melee') return 'Abilita Spada'
  if (slot === 'bow') return 'Abilita Arco'
  if (slot === 'magicBase') return 'Magia Base'
  if (slot === 'magicAdvanced') return 'Magia Avanzata'
  return 'Slot Utility'
}
