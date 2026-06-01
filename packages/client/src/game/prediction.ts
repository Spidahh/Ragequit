// ---------------------------------------------------------------------------
// Client-side prediction reconciliation.
//
// When an authoritative server snapshot arrives, the local predicted state must
// be corrected without snapping: drop the inputs the server has already
// processed, reset to the server state, then replay only the still-in-flight
// (unacknowledged) inputs on top. Replaying ALL inputs — including acked ones —
// was the cause of the historical teleport/desync bug, so dropping by ackSeq is
// load-bearing. Extracted from main.ts as pure logic (the replay step is a
// caller-supplied closure over simulatePlayer + the active map) so this subtle
// netcode is unit-tested.
// ---------------------------------------------------------------------------
import type { MovementCaps, PlayerSimState, SimInput } from '@ragequit/shared'

export interface PendingInput {
  seq: number
  input: SimInput
  dt: number
  caps: MovementCaps
}

export interface PredictionState {
  sim: PlayerSimState
  pending: PendingInput[]
  lastAckSeq: number
}

export type ReplayFn = (
  sim: PlayerSimState,
  input: SimInput,
  dt: number,
  caps: MovementCaps,
) => void

/**
 * Reconcile predicted state against a server snapshot. Drops acked inputs from
 * `state.pending` (in place), snaps to `serverState`, replays the remaining
 * in-flight inputs via `replay`, and returns the corrected sim plus the
 * correction delta (distance the reconcile moved the predicted position).
 * Returns null when there is nothing newer than `state.lastAckSeq` to apply.
 */
export function reconcilePrediction(
  state: PredictionState,
  serverState: PlayerSimState,
  ackSeq: number,
  replay: ReplayFn,
): { sim: PlayerSimState; delta: number } | null {
  if (ackSeq <= state.lastAckSeq) return null

  // Drop every input the server has already processed — only replay the ones
  // still in flight (seq > ackSeq).
  while (state.pending.length > 0 && state.pending[0]!.seq <= ackSeq) {
    state.pending.shift()
  }

  const before = { x: state.sim.pos.x, y: state.sim.pos.y, z: state.sim.pos.z }
  const sim = serverState
  for (const e of state.pending) replay(sim, e.input, e.dt, e.caps)

  const dx = sim.pos.x - before.x
  const dy = sim.pos.y - before.y
  const dz = sim.pos.z - before.z
  return { sim, delta: Math.hypot(dx, dy, dz) }
}
