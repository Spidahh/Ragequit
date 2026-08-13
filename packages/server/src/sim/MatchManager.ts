// Match flow / round state machine.
//
// Drives the BO5 1v1 round loop:
//   lobby (waiting for 2 players) → countdown (3 s) → live → roundEnd (2 s)
//   → live (next round) → matchEnd at MATCH_ROUNDS_TO_WIN
// Round ends when:
//   - one player reaches HP 0 → other player wins the round
//   - the 2-min timer expires → higher-HP player wins the round; on tie, no
//     one wins (tie round, replay)
//
// The MatchManager owns the GameState.phase + roundWins map. Damage / death
// signals are pushed in by GameRoom on each player kill via `notifyDeath`.
// HP/Mana/Stamina/CDs reset between rounds is delegated back to GameRoom via
// a host hook so the existing respawn pipeline is reused.

import {
  RUNTIME_BALANCE,
  FFA_KILLS_TO_WIN,
  MATCH_MAX_ROUNDS,
  MATCH_ROUNDS_TO_WIN,
  MessageTypes,
  ROUND_COUNTDOWN_SEC,
  ROUND_END_HOLD_SEC,
  ROUND_TIMER_SEC,
  TEAM_KILLS_TO_WIN,
  MATCH_TARGET_DURATION_SEC,
  TICK_RATE_HZ,
  type GameState,
  type ServerMatchPhaseMessage,
  type ServerScoreMessage,
} from '@ragequit/shared'

import { highestHpSurvivor, tournamentOutcome, type TournamentPlayerView } from './tournament.js'

// Modes that use BO5 round logic. Training stays live so players can test input,
// weapons, and abilities without the bot ending the session.
const ROUND_MODES = new Set(['duel_arena', 'blockout', '1v1'])

const ROUND_TIMER_TICKS = Math.round(ROUND_TIMER_SEC * TICK_RATE_HZ)
// Kill-cap modes (FFA/5v5) have no round timer — without a match ceiling a
// cautious lobby can stall forever. After this, the current scores decide.
//
// Derived from the SAME constant the kill counts are, and that is the point:
// this was an independent `10 * 60` while FFA_KILLS_TO_WIN and
// TEAM_KILLS_TO_WIN were derived from 900 s, so neither target could ever be
// reached and both win conditions were dead code.
const KILLCAP_MATCH_TIMER_TICKS = Math.round(MATCH_TARGET_DURATION_SEC * TICK_RATE_HZ)
const COUNTDOWN_TICKS = Math.round(ROUND_COUNTDOWN_SEC * TICK_RATE_HZ)
const ROUND_END_HOLD_TICKS = Math.round(ROUND_END_HOLD_SEC * TICK_RATE_HZ)

export interface MatchHost {
  state: GameState
  // Reset HP/Mana/Stamina/cooldowns/airborne/parry/statuses on every player —
  // called between rounds and on match start.
  resetAllPlayers: () => void
  broadcast: (type: string, message: unknown) => void
  // Called once at matchEnd with the session IDs of winner and loser (round
  // mode only). GameRoom maps sessionIds → userIds and persists ELO to DB.
  // winnerEloDelta / loserEloDelta are the K-factor computed deltas so the DB
  // stores the same values the in-memory model computed (not a flat ±20).
  onMatchEnd?: (
    winnerSessionId: string,
    loserSessionId: string,
    winnerEloDelta: number,
    loserEloDelta: number,
  ) => void
}

type Phase = 'lobby' | 'countdown' | 'live' | 'roundEnd' | 'matchEnd'

export class MatchManager {
  private phaseEndsAtTick = 0
  // Tick at which the current round started (to compute timer end at start +
  // ROUND_TIMER_TICKS for the live phase).
  private roundStartTick = 0
  private roundIndex = 0
  // In-memory ELO, persisted to Supabase when auth is available.
  private readonly elo = new Map<string, number>()
  // The winner of the LAST round (for roundEnd → next live transition).
  private lastRoundWinnerId = ''

  constructor(private readonly host: MatchHost) {}

  private get mode(): string {
    return this.host.state.mode ?? 'duel_arena'
  }
  private get isRoundMode(): boolean {
    return ROUND_MODES.has(this.mode)
  }
  /** Last one standing — no respawn, so a lost fight costs the match (D22). */
  private get isTournament(): boolean {
    return this.mode === 'tournament'
  }
  /** How many players the tournament actually started with. */
  private tournamentStartedWith = 0

  // Get / seed in-memory ELO for a player.
  ratingFor(sid: string): number {
    return this.elo.get(sid) ?? RUNTIME_BALANCE.match.elo_starting
  }

  // Server-side death notification — call from GameRoom drainDamage when a
  // player's HP reaches 0. Records the round winner (1v1) or increments kill
  // counters (FFA / 5v5).
  notifyDeath(victimId: string, killerId: string): void {
    if (this.host.state.phase !== 'live') return
    if (victimId === killerId) return

    if (this.isRoundMode) {
      this.endRound(killerId)
      return
    }

    if (this.isTournament) {
      // The kill still counts for the scoreboard — you want to know who did the
      // work — but nothing about the SCORE decides a tournament. Being alive does.
      const cur = this.host.state.soloKills.get(killerId) ?? 0
      this.host.state.soloKills.set(killerId, cur + 1)
      this.broadcastScore()
      const outcome = tournamentOutcome(this.playerViews(), this.tournamentStartedWith)
      if (outcome.over) {
        this.tournamentWinnerId = outcome.winnerId
        this.enterMatchEnd(this.host.state.tick)
      }
      return
    }

    if (this.mode === 'ffa') {
      const cur = this.host.state.soloKills.get(killerId) ?? 0
      const next = cur + 1
      this.host.state.soloKills.set(killerId, next)
      this.broadcastScore()
      if (next >= FFA_KILLS_TO_WIN) this.enterMatchEnd(this.host.state.tick)
      return
    }

    if (this.mode === '5v5') {
      const killer = this.host.state.players.get(killerId)
      const team = killer?.team ?? ''
      if (!team) return
      const cur = this.host.state.teamKills.get(team) ?? 0
      const next = cur + 1
      this.host.state.teamKills.set(team, next)
      this.broadcastScore()
      if (next >= TEAM_KILLS_TO_WIN) this.enterMatchEnd(this.host.state.tick)
    }
  }

  // Driven each server tick from GameRoom.startTickLoop(). Manages phase
  // timers + transitions.
  tick(): void {
    const tickNow = this.host.state.tick
    const phase = this.host.state.phase as Phase

    switch (phase) {
      case 'lobby': {
        // FFA/5v5 start with 2+ players; round modes also start with 2.
        const minToStart = 2
        if (this.host.state.players.size >= minToStart) {
          this.enterCountdown(tickNow)
        }
        break
      }
      case 'countdown': {
        if (tickNow >= this.phaseEndsAtTick) this.enterLive(tickNow)
        break
      }
      case 'live': {
        // Round timeout only applies to 1v1 round modes.
        if (this.isRoundMode) {
          const liveEnd = this.roundStartTick + ROUND_TIMER_TICKS
          if (tickNow >= liveEnd) {
            const winner = this.higherHpWinner()
            this.endRound(winner)
          }
        } else if (tickNow >= this.roundStartTick + KILLCAP_MATCH_TIMER_TICKS) {
          // Time is up. FFA/5v5: whoever leads on kills. Tournament: whoever is
          // alive with the most HP, because kills never decided it.
          if (this.isTournament) this.tournamentWinnerId = highestHpSurvivor(this.playerViews())
          this.enterMatchEnd(tickNow)
        }
        break
      }
      case 'roundEnd': {
        if (tickNow >= this.phaseEndsAtTick) {
          if (this.matchOver()) {
            this.enterMatchEnd(tickNow)
          } else {
            this.enterCountdown(tickNow)
          }
        }
        break
      }
      case 'matchEnd':
        // Terminal — room dispose handled by Colyseus when clients leave.
        break
    }
  }

  private enterCountdown(tickNow: number): void {
    this.host.state.phase = 'countdown'
    this.phaseEndsAtTick = tickNow + COUNTDOWN_TICKS
    this.host.resetAllPlayers()
    this.broadcastPhase('countdown', ROUND_COUNTDOWN_SEC * 1000)
  }

  private enterLive(tickNow: number): void {
    this.host.state.phase = 'live'
    this.roundStartTick = tickNow
    // Recorded at the bell, not read live: a naive "one survivor left" check
    // fires the instant the first player joins an empty lobby and declares them
    // champion of a tournament that never happened.
    if (this.isTournament) this.tournamentStartedWith = this.host.state.players.size
    this.broadcastPhase('live')
  }

  /** Minimal alive/HP view of the lobby, for sim/tournament.ts. */
  private playerViews(): Map<string, TournamentPlayerView> {
    const out = new Map<string, TournamentPlayerView>()
    this.host.state.players.forEach((p, id) => out.set(id, { alive: p.alive, hp: p.hp }))
    return out
  }

  private enterRoundEnd(tickNow: number): void {
    this.host.state.phase = 'roundEnd'
    this.phaseEndsAtTick = tickNow + ROUND_END_HOLD_TICKS
    this.broadcastPhase('roundEnd', ROUND_END_HOLD_SEC * 1000)
    this.broadcastScore()
  }

  /** Set when a tournament resolves, so the end screen names the survivor. */
  private tournamentWinnerId = ''

  private enterMatchEnd(_tickNow: number): void {
    this.host.state.phase = 'matchEnd'
    this.broadcastPhase('matchEnd')
    const { winnerId, loserId, winnerEloDelta, loserEloDelta } = this.applyEloUpdates()
    // Build per-session ELO delta map for the score broadcast so clients can
    // display accurate post-match ELO changes instead of hardcoded estimates.
    const eloDeltas: Record<string, number> = {}
    if (winnerId) eloDeltas[winnerId] = winnerEloDelta
    if (loserId) eloDeltas[loserId] = loserEloDelta
    this.broadcastScore(Object.keys(eloDeltas).length > 0 ? eloDeltas : undefined)
    if (winnerId && loserId && this.host.onMatchEnd) {
      this.host.onMatchEnd(winnerId, loserId, winnerEloDelta, loserEloDelta)
    }
  }

  // Awarding + transition — `winnerId === ''` means tie (no win recorded).
  private endRound(winnerId: string): void {
    if (this.host.state.phase !== 'live') return
    this.lastRoundWinnerId = winnerId
    if (winnerId !== '') {
      const cur = this.host.state.roundWins.get(winnerId) ?? 0
      this.host.state.roundWins.set(winnerId, cur + 1)
    }
    this.roundIndex += 1
    this.enterRoundEnd(this.host.state.tick)
  }

  // True when a player reached the rounds-to-win OR we exhausted MAX_ROUNDS.
  // FFA/5v5 win conditions are handled directly in notifyDeath, so this only
  // applies to round modes.
  private matchOver(): boolean {
    if (!this.isRoundMode) return false
    if (this.roundIndex >= MATCH_MAX_ROUNDS) return true
    let max = 0
    this.host.state.roundWins.forEach((n) => {
      if (n > max) max = n
    })
    return max >= MATCH_ROUNDS_TO_WIN
  }

  private higherHpWinner(): string {
    let best = ''
    let bestHp = -1
    let tie = false
    this.host.state.players.forEach((p, sid) => {
      if (!p.alive) return
      if (p.hp > bestHp) {
        best = sid
        bestHp = p.hp
        tie = false
      } else if (p.hp === bestHp) {
        tie = true
      }
    })
    return tie ? '' : best
  }

  // Update in-memory ELO at match end. 1v1 round modes: winner by round count.
  // FFA/5v5: ELO belongs to ranked multiplayer; round modes update now.
  // Returns { winnerId, loserId, winnerEloDelta, loserEloDelta } so the caller
  // can persist the actual computed deltas to DB (not a flat constant).
  private applyEloUpdates(): {
    winnerId: string
    loserId: string
    winnerEloDelta: number
    loserEloDelta: number
  } {
    const none = { winnerId: '', loserId: '', winnerEloDelta: 0, loserEloDelta: 0 }
    if (!this.isRoundMode) return none
    let winnerId = ''
    let loserId = ''
    let bestWins = -1
    this.host.state.players.forEach((_p, sid) => {
      const w = this.host.state.roundWins.get(sid) ?? 0
      if (w > bestWins) {
        bestWins = w
        winnerId = sid
      }
    })
    this.host.state.players.forEach((_p, sid) => {
      if (sid !== winnerId) loserId = sid
    })
    if (!winnerId || !loserId) return none
    // No ELO on a draw. With bestWins seeded at -1 the first-iterated player
    // "wins" at 0 > -1 even when NO round was won (all ties), and any equal-wins
    // endpoint reached at the round cap (1-1, 2-2) is also a draw — award ELO
    // only when one player STRICTLY leads on round wins.
    const winnerWins = this.host.state.roundWins.get(winnerId) ?? 0
    const loserWins = this.host.state.roundWins.get(loserId) ?? 0
    if (winnerWins <= loserWins) return none
    const rW = this.ratingFor(winnerId)
    const rL = this.ratingFor(loserId)
    const exW = 1 / (1 + Math.pow(10, (rL - rW) / 400))
    const exL = 1 / (1 + Math.pow(10, (rW - rL) / 400))
    const K = RUNTIME_BALANCE.match.elo_k_ranked
    const winnerEloDelta = Math.round(K * (1 - exW))
    const loserEloDelta = Math.round(K * (0 - exL))
    this.elo.set(winnerId, rW + winnerEloDelta)
    this.elo.set(loserId, rL + loserEloDelta)
    return { winnerId, loserId, winnerEloDelta, loserEloDelta }
  }

  private broadcastPhase(phase: Phase, countdownMs?: number): void {
    const msg: ServerMatchPhaseMessage = {
      phase,
      ...(countdownMs !== undefined ? { countdownMs } : {}),
    }
    this.host.broadcast(MessageTypes.MatchPhase, msg)
  }

  private broadcastScore(eloDeltas?: Record<string, number>): void {
    const msg: ServerScoreMessage = {}
    if (eloDeltas) msg.eloDeltas = eloDeltas
    if (this.isRoundMode) {
      const wins: Record<string, number> = {}
      this.host.state.roundWins.forEach((n, sid) => {
        wins[sid] = n
      })
      msg.roundWins = wins
    } else if (this.mode === 'ffa') {
      const solo: Record<string, number> = {}
      this.host.state.soloKills.forEach((n, sid) => {
        solo[sid] = n
      })
      msg.solo = solo
    } else if (this.mode === '5v5') {
      const team: Record<string, number> = {}
      this.host.state.teamKills.forEach((n, t) => {
        team[t] = n
      })
      msg.team = team
    }
    this.host.broadcast(MessageTypes.Score, msg)
  }

  // Read-only — last round winner, used by HUD + scoreboard.
  getLastRoundWinnerId(): string {
    return this.lastRoundWinnerId
  }
  getRoundIndex(): number {
    return this.roundIndex
  }
}
