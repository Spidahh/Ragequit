import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const targets = [
  'node_modules',
  'apps/web/dist',
  'packages/client/dist',
  'packages/client/node_modules/.cache',
  'packages/server/dist',
  'packages/server/node_modules/.cache',
  'packages/shared/dist',
  'packages/shared/node_modules/.cache',
  'tools/content-validator/node_modules/.cache',
]

for (const target of targets) {
  const resolved = path.resolve(repoRoot, target)
  if (!resolved.startsWith(repoRoot + path.sep)) {
    throw new Error(`Refusing to remove outside repo: ${resolved}`)
  }
  fs.rmSync(resolved, { recursive: true, force: true })
}
