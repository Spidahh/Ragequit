// Replay recorder.
//
// Records every match as a JSONL stream of (tick, event) tuples so:
//   1. closed-playtest debugging — replay a contested moment.
//   2. anti-cheat audit — re-run the input log server-side to verify no
//      packet was tampered with.
//   3. balance analysis — compute TTK / pickrate / winrate offline.
//
// The recorder is plugged in by GameRoom: every broadcast goes through
// `record(type, message)`. On match dispose the JSONL file lands in
// REPLAY_OUT_DIR (default /tmp/ragequit-replays - overridable via env).
// 10 wires this to Cloudflare R2 retention 7 days.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface ReplayEvent {
  t: number // server tick
  type: string
  msg: unknown
}

export interface ReplayHeader {
  roomId: string
  startedAtMs: number
  matchId: string
  schemaVersion: 1
}

export class ReplayRecorder {
  private readonly events: ReplayEvent[] = []
  private readonly header: ReplayHeader
  private finalized = false

  constructor(roomId: string) {
    this.header = {
      roomId,
      startedAtMs: Date.now(),
      matchId: `${roomId}-${Date.now()}`,
      schemaVersion: 1,
    }
  }

  record(tick: number, type: string, msg: unknown): void {
    if (this.finalized) return
    if (this.events.length >= 200_000) return // cap to avoid OOM
    this.events.push({ t: tick, type, msg })
  }

  // Flush to disk. Idempotent — safe to call from onDispose.
  finalize(
    outDir: string = process.env['REPLAY_OUT_DIR'] ?? '/tmp/ragequit-replays',
  ): string | null {
    if (this.finalized) return null
    this.finalized = true
    if (this.events.length === 0) return null
    try {
      mkdirSync(outDir, { recursive: true })
      const filename = `replay-${this.header.matchId}.jsonl`
      const fullPath = join(outDir, filename)
      const lines: string[] = []
      lines.push(JSON.stringify({ header: this.header }))
      for (const ev of this.events) lines.push(JSON.stringify(ev))
      writeFileSync(fullPath, lines.join('\n') + '\n', 'utf8')
      return fullPath
    } catch (err) {
      console.warn(`[ReplayRecorder] failed to write replay:`, err)
      return null
    }
  }

  // Read-only — for unit tests.
  size(): number {
    return this.events.length
  }
}
