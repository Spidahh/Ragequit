#!/usr/bin/env node
// ---------------------------------------------------------------------------
// File-size governance guard.
//
// Enforces the project rule (AGENTS.md): a source file must not exceed ~500
// lines (target) and 800 lines is the HARD limit that mandates a split. This is
// the rule whose violation produced the god-files (main.ts, GameRoom).
//
// Strategy: a "ratchet". Known-large files are grandfathered with their CURRENT
// line count as a CEILING — they may only SHRINK, never grow. Every other source
// file must stay at or under HARD_LIMIT. New monoliths are impossible; existing
// ones are forced down over time.
//
// Run: `node tools/check-file-budget.mjs` (wired as `pnpm check:budget`).
// Exits non-zero (CI fails) on any violation.
// ---------------------------------------------------------------------------
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const HARD_LIMIT = 800

// Grandfathered ceilings (relative paths). Lower these as files shrink; NEVER
// raise them. Goal: every entry reaches <= HARD_LIMIT, then gets deleted here.
// `registry.ts` is a pure DATA table (53 ability defs) — large by nature, exempt
// from the "split" intent but still ratcheted so it can't balloon.
// Baselined against the prettier-formatted tree (the canonical line count).
const BUDGET = {
  'packages/client/src/main.ts': 2910,
  'packages/server/src/rooms/GameRoom.ts': 2772,
  'packages/shared/src/abilities/registry.ts': 1508,
  'packages/server/src/sim/AbilityEngine.ts': 1039,
  'packages/client/src/audio/sound-engine.ts': 878,
}

const SCAN_DIRS = ['packages/client/src', 'packages/server/src', 'packages/shared/src']

function isCheckedFile(name) {
  return name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')
}

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue
      yield* walk(full)
    } else if (e.isFile() && isCheckedFile(e.name)) {
      yield full
    }
  }
}

async function countLines(file) {
  // Match `wc -l` semantics: number of newline characters.
  const text = await readFile(file, 'utf8')
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

const violations = []
const ratchetWins = []

for (const base of SCAN_DIRS) {
  const abs = join(ROOT, base)
  try {
    await stat(abs)
  } catch {
    continue
  }
  for await (const file of walk(abs)) {
    const rel = relative(ROOT, file).split('\\').join('/')
    const lines = await countLines(file)
    const ceiling = BUDGET[rel] ?? HARD_LIMIT
    if (lines > ceiling) {
      violations.push(
        `${rel}: ${lines} lines > ${ceiling} (${BUDGET[rel] ? 'grandfathered ceiling — must SHRINK' : `hard limit ${HARD_LIMIT} — split it`})`,
      )
    } else if (BUDGET[rel] && lines < ceiling) {
      ratchetWins.push(`${rel}: ${lines} <= ${ceiling} (ratchet down BUDGET to ${lines})`)
    }
  }
}

if (ratchetWins.length) {
  console.log('▼ Ratchet opportunities — lower these ceilings in check-file-budget.mjs:')
  for (const w of ratchetWins) console.log('  ' + w)
  console.log('')
}

if (violations.length) {
  console.error('✗ File-size budget violated:')
  for (const v of violations) console.error('  ' + v)
  console.error('\nExtract a cohesive piece into its own module (see 02_TECH/08_project_governance.md).')
  process.exit(1)
}

console.log('✓ File-size budget OK (all source files within their ceilings).')
