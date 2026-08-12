// Reaction to a Death broadcast: kill feed, stats, death burst, and the
// self-died / self-killed feedback. Extracted from main.ts (file-budget:
// 02_TECH/08). The mutable pieces main.ts owns (stats, cast bar, combo) are
// reached through callbacks so this stays a pure dispatcher.

import type { ServerDeathMessage } from '@ragequit/shared'

import { killStreakSplash } from './hit-stats.js'

export interface DeathFeedbackDeps<TPos> {
  selfSessionId: () => string
  /** Display name for a session id, already falling back to a short id. */
  playerName: (sessionId: string) => string
  worldPos: (sessionId: string) => TPos | null | undefined
  addKillFeedEntry: (killer: string, victim: string, selfKill: boolean, selfDied: boolean) => void
  showKillSplash: (text: string, kind: 'kill' | 'died') => void
  spawnDeathBurst: (pos: TPos, byUs: boolean) => void
  countSelfKill: () => void
  countOpponentKill: () => void
  trackKill: (cause: string) => void
  trackDeath: (cause: string) => void
  onSelfKilledSomeone: (now: number) => void
  onSelfDied: (killerName: string) => void
  /** Rolling buffer of our recent kill timestamps, mutated in place. */
  recentKillTimes: number[]
  playKillSound: () => void
}

export function onDeathBroadcast<TPos>(
  deps: DeathFeedbackDeps<TPos>,
  msg: ServerDeathMessage,
): void {
  const selfId = deps.selfSessionId()
  const isSelfDied = msg.victimId === selfId
  const isSelfKill = msg.killerId === selfId
  const killerName = deps.playerName(msg.killerId)

  deps.addKillFeedEntry(killerName, deps.playerName(msg.victimId), isSelfKill, isSelfDied)

  if (isSelfKill) deps.countSelfKill()
  else if (msg.killerId !== '' && msg.killerId !== selfId) deps.countOpponentKill()

  const deathPos = deps.worldPos(msg.victimId)
  if (deathPos) deps.spawnDeathBurst(deathPos, isSelfKill && !isSelfDied)

  const now = performance.now()
  if (isSelfKill && !isSelfDied) {
    deps.trackKill(msg.cause ?? 'unknown')
    deps.onSelfKilledSomeone(now)
  }
  if (isSelfDied) {
    deps.trackDeath(msg.cause ?? 'unknown')
    deps.onSelfDied(killerName)
    deps.showKillSplash('ELIMINATO', 'died')
    return
  }
  if (isSelfKill) {
    deps.playKillSound()
    deps.recentKillTimes.push(now)
    deps.showKillSplash(killStreakSplash(deps.recentKillTimes, now), 'kill')
  }
}
