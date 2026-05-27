const SPRITE_PATH = '/icons-sprite.svg'
const SPRITE_DOM_ID = 'rq-icon-sprite'
const ABILITY_ICON_BASE = '/ability-icons'

type IconKind = 'ability' | 'element' | 'weapon' | 'status'

const STATUS_ALIASES: Readonly<Record<string, string>> = {
  invulnerable: 'phase',
}

function spriteId(kind: IconKind, id: string): string {
  const normalized = kind === 'status' ? (STATUS_ALIASES[id] ?? id) : id
  return `${kind}-${normalized}`
}

export function iconMarkup(kind: IconKind, id: string, className = 'sprite-icon'): string {
  if (kind === 'ability') return abilityIconMarkup(id, className)
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#${spriteId(kind, id)}"></use></svg>`
}

export function makeIcon(kind: IconKind, id: string, size = 32): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'sprite-icon')
  svg.setAttribute('viewBox', '0 0 64 64')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
  use.setAttribute('href', `#${spriteId(kind, id)}`)
  svg.appendChild(use)
  return svg
}

export function abilityIconPath(id: string): string {
  return `${ABILITY_ICON_BASE}/${encodeURIComponent(id)}.png`
}

export function abilityIcon(id: string, size = 32): HTMLImageElement {
  const img = document.createElement('img')
  img.className = 'ability-png-icon'
  img.src = abilityIconPath(id)
  img.width = size
  img.height = size
  img.alt = ''
  img.setAttribute('aria-hidden', 'true')
  img.decoding = 'async'
  img.loading = 'eager'
  return img
}

export function abilityIconMarkup(id: string, className = 'ability-png-icon'): string {
  return `<img class="${className}" src="${abilityIconPath(id)}" alt="" aria-hidden="true" loading="eager" decoding="async">`
}

export async function ensureIconSprite(): Promise<void> {
  if (document.getElementById(SPRITE_DOM_ID)) return
  const res = await fetch(SPRITE_PATH)
  if (!res.ok) throw new Error(`Failed to load ${SPRITE_PATH}: ${res.status}`)
  const tpl = document.createElement('template')
  tpl.innerHTML = (await res.text()).trim()
  const svg = tpl.content.querySelector('svg')
  if (!svg) throw new Error(`${SPRITE_PATH} does not contain an SVG root`)
  svg.id = SPRITE_DOM_ID
  svg.setAttribute('aria-hidden', 'true')
  svg.style.display = 'none'
  document.body.prepend(svg)
}

export const statusIcon = (id: string, size?: number): SVGElement => makeIcon('status', id, size)
export const weaponIcon = (id: string, size?: number): SVGElement => makeIcon('weapon', id, size)
