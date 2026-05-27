// RAGEQUIT content validator — run with: pnpm validate:content
//
// Checks ability registry, ability icon coverage, balance config, and map data.
// Exits with code 1 and prints all issues if any validation fails.

import { readFileSync } from 'node:fs'

import {
  ABILITY_DEFS,
  DEFAULT_BALANCE,
  DUEL_ARENA,
  GLADIATORS_ARENA,
  MAPS,
  STATIC_MAP,
  validateBalance,
  type AbilityDef,
} from '@ragequit/shared'

const VALID_SLOTS = new Set(['melee', 'bow', 'magic', 'utility'])
const VALID_ELEMENTS = new Set(['fire', 'ice', 'lightning', 'dark', 'nature', 'none'])
const VALID_TARGETING = new Set(['self', 'forward', 'target', 'point'])
const VALID_EFFECT_KINDS = new Set([
  'damage',
  'applyStatus',
  'knockup',
  'heal',
  'lifesteal',
  'projectile',
  'zone',
  'move',
  'channel',
  'cleanse',
  'resourceDrain',
  'restoreStamina',
])

const issues: string[] = []

function fail(msg: string): void {
  issues.push(msg)
}

// --- Ability registry -------------------------------------------------------

const defs = Object.values(ABILITY_DEFS) as AbilityDef[]
const seenIds = new Set<string>()

for (const def of defs) {
  const ctx = `ability[${def.id}]`

  if (!def.id || def.id.trim() === '') fail(`${ctx}: id is empty`)
  if (seenIds.has(def.id)) fail(`${ctx}: duplicate id`)
  seenIds.add(def.id)

  if (!def.name || def.name.trim() === '') fail(`${ctx}: name is empty`)
  if (!VALID_SLOTS.has(def.slot)) fail(`${ctx}: invalid slot '${def.slot}'`)
  if (!VALID_ELEMENTS.has(def.element as string)) fail(`${ctx}: invalid element '${def.element}'`)
  if (!VALID_TARGETING.has(def.targeting)) fail(`${ctx}: invalid targeting '${def.targeting}'`)
  if (def.cooldownSec < 0) fail(`${ctx}: negative cooldownSec`)
  if (def.costMana < 0) fail(`${ctx}: negative costMana`)
  if (def.costStamina < 0) fail(`${ctx}: negative costStamina`)
  if (def.range < 0) fail(`${ctx}: negative range`)

  // Validate every effect primitive
  for (let i = 0; i < def.effects.length; i++) {
    const eff = def.effects[i]!
    if (!VALID_EFFECT_KINDS.has(eff.kind)) {
      fail(`${ctx}: effect[${i}] unknown kind '${eff.kind}'`)
    }
  }

  if (!def.miniMalus) fail(`${ctx}: missing miniMalus text`)
}

console.info(`ability registry: ${defs.length} abilities, ${seenIds.size} unique ids`)

// --- Ability icons ----------------------------------------------------------

const iconSprite = readFileSync('packages/client/public/icons-sprite.svg', 'utf8')
const abilityIconIds = new Set(
  Array.from(iconSprite.matchAll(/<symbol id="ability-([^"]+)"/g), (match) => match[1]!),
)

for (const def of defs) {
  if (!abilityIconIds.has(def.id)) fail(`icons: missing symbol for ability '${def.id}'`)
}
for (const iconId of abilityIconIds) {
  if (!seenIds.has(iconId)) fail(`icons: stale ability symbol '${iconId}'`)
}
console.info(`ability icons: ${abilityIconIds.size} symbols checked`)

// --- Balance config ---------------------------------------------------------

const balanceIssues = validateBalance(DEFAULT_BALANCE)
for (const issue of balanceIssues) fail(`balance: ${issue}`)
console.info(`balance config: ${balanceIssues.length === 0 ? 'OK' : 'FAIL'}`)

// --- Maps -------------------------------------------------------------------

const mapsToCheck = [
  ['blockout', STATIC_MAP],
  ['duel_arena', DUEL_ARENA],
  ['gladiators_arena', GLADIATORS_ARENA],
] as const

for (const [id, map] of mapsToCheck) {
  if (map.spawns.length < 2) fail(`map[${id}]: fewer than 2 spawn points`)
  if (map.boxes.length === 0) fail(`map[${id}]: no collision boxes`)
  for (const box of map.boxes) {
    if (box.maxX <= box.minX) fail(`map[${id}]: box with zero/negative X size`)
    if (box.maxY <= box.minY) fail(`map[${id}]: box with zero/negative Y size`)
    if (box.maxZ <= box.minZ) fail(`map[${id}]: box with zero/negative Z size`)
  }
}

// Verify MAPS registry keys match the exported objects
const registryIds = Object.keys(MAPS)
for (const [id] of mapsToCheck) {
  if (!registryIds.includes(id)) fail(`map[${id}]: not in MAPS registry`)
}
console.info(`maps: ${mapsToCheck.length} checked, registry has ${registryIds.length} entries`)

// --- Result -----------------------------------------------------------------

if (issues.length > 0) {
  console.error(`\nContent validation FAILED — ${issues.length} issue(s):`)
  for (const issue of issues) console.error(`  ✗ ${issue}`)
  process.exit(1)
} else {
  console.info(
    `\nContent validation PASSED — ${defs.length} abilities, ${mapsToCheck.length} maps OK`,
  )
}
