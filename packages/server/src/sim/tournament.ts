// ---------------------------------------------------------------------------
// Tournament: last one standing.
//
// `00_vision.md` names tournament-until-one-remains as one of the three modes
// that STAY, and it did not exist (D22, 00_truth.md). The one design question
// the truth doc carried forward was what it inherits from FFA — and the answer
// is: not the economy.
//
// FFA is 40 kills with a respawn. Winning a fight there gains you a point and
// costs your opponent about a second and a half. That is the exact opposite of
// what "until one remains" means. Here a lost fight costs you the match, which
// is the whole reason the mode is worth having: it is the only mode where
// positioning, cooldown discipline and knowing when NOT to take a fight are
// paid for in the only currency that matters.
//
// So the rules are deliberately three lines long:
//   1. no respawn — death is elimination,
//   2. the match ends when one player is left alive,
//   3. if the clock runs out, the most alive players win on HP.
//
// Everything else about tournament balance is speculation until it is played.
// ---------------------------------------------------------------------------

export interface TournamentPlayerView {
  alive: boolean
  hp: number
}

/** Session ids still in the tournament. */
export function survivors(players: Map<string, TournamentPlayerView>): string[] {
  const out: string[] = []
  players.forEach((p, id) => {
    if (p.alive) out.push(id)
  })
  return out
}

export interface TournamentOutcome {
  /** True when the match is decided and should enter matchEnd. */
  over: boolean
  /** The last player standing, or '' when nobody has won yet or it is a tie. */
  winnerId: string
}

/**
 * Is the tournament decided?
 *
 * Deliberately requires the lobby to have STARTED with more than one player:
 * a single player alone in a room is not the winner of anything, and treating
 * them as one would end the match the instant it began — which is what a naive
 * "one survivor left" check does while the lobby is still filling.
 */
export function tournamentOutcome(
  players: Map<string, TournamentPlayerView>,
  startedWith: number,
): TournamentOutcome {
  if (startedWith < 2) return { over: false, winnerId: '' }
  const alive = survivors(players)
  if (alive.length === 1) return { over: true, winnerId: alive[0]! }
  // Everyone dying in the same tick (a shared AoE, a simultaneous trade) is a
  // real outcome and not a crash: the match ends with no winner rather than
  // hanging forever waiting for a survivor who does not exist.
  if (alive.length === 0) return { over: true, winnerId: '' }
  return { over: false, winnerId: '' }
}

/**
 * Winner on timeout: highest HP among the living.
 *
 * Ties return '' rather than picking arbitrarily. A tournament that silently
 * breaks a tie in favour of whoever the map iterator reached first is worse
 * than one that admits nobody won.
 */
export function highestHpSurvivor(players: Map<string, TournamentPlayerView>): string {
  let best = ''
  let bestHp = -1
  let tied = false
  players.forEach((p, id) => {
    if (!p.alive) return
    if (p.hp > bestHp) {
      bestHp = p.hp
      best = id
      tied = false
    } else if (p.hp === bestHp) {
      tied = true
    }
  })
  return tied ? '' : best
}

/**
 * How many `survival` / `counter` abilities a build may bring to a tournament.
 *
 * A four-defensive build is legal today (00_truth.md D22): a Mago can field
 * `arcane_rebind + phase_shift + dark_barrier + healing_totem`, a Tank
 * `brace_recovery + barrier + phase_shift + disengage_shot`. In a respawn mode
 * that is merely slow. In a mode where death is final it is the dominant
 * strategy, because refusing to lose is the same as winning.
 */
export const TOURNAMENT_MAX_DEFENSIVE_PICKS = 1
