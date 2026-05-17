import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ReplayRecorder } from './ReplayRecorder.js'

describe('ReplayRecorder', () => {
  let outDir: string
  beforeEach(() => {
    outDir = mkdtempSync(join(tmpdir(), 'replay-test-'))
  })
  afterEach(() => {
    rmSync(outDir, { recursive: true, force: true })
  })

  it('records events and writes a JSONL file on finalize', () => {
    const r = new ReplayRecorder('room-A')
    r.record(1, 'matchPhase', { phase: 'countdown' })
    r.record(180, 'matchPhase', { phase: 'live' })
    r.record(360, 'death', { victimId: 'A', killerId: 'B' })
    expect(r.size()).toBe(3)
    const path = r.finalize(outDir)
    expect(path).not.toBeNull()
    expect(existsSync(path!)).toBe(true)
    const lines = readFileSync(path!, 'utf8').trim().split('\n')
    // Header + 3 events.
    expect(lines.length).toBe(4)
    const header = JSON.parse(lines[0]!)
    expect(header.header.roomId).toBe('room-A')
    expect(header.header.schemaVersion).toBe(1)
    const last = JSON.parse(lines[3]!)
    expect(last.t).toBe(360)
    expect(last.type).toBe('death')
  })

  it('finalize is idempotent — second call returns null', () => {
    const r = new ReplayRecorder('room-B')
    r.record(1, 'x', {})
    expect(r.finalize(outDir)).not.toBeNull()
    expect(r.finalize(outDir)).toBeNull()
  })

  it('does not write a file when nothing was recorded', () => {
    const r = new ReplayRecorder('room-C')
    const result = r.finalize(outDir)
    expect(result).toBeNull()
  })

  it('caps event count to avoid OOM', () => {
    const r = new ReplayRecorder('room-D')
    for (let i = 0; i < 200_001; i++) r.record(i, 'x', {})
    // Cap = 200_000.
    expect(r.size()).toBe(200_000)
  })
})
