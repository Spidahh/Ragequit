import type { MovementCaps, PlayerSimState, SimInput } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { reconcilePrediction, type PredictionState } from './prediction.js'

function simState(x: number): PlayerSimState {
  return {
    pos: { x, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    onGround: true,
    jumpHoldTicksLeft: 0,
    stamina: 100,
    coyoteTicksLeft: 0,
    momentumTicks: 0,
  } as unknown as PlayerSimState
}

const caps = {} as MovementCaps
const input = (moveX: number): SimInput => ({ moveX }) as unknown as SimInput

// Test replay: each input nudges x by its moveX. Deterministic + inspectable.
const replay = (sim: PlayerSimState, i: SimInput, _dt: number, _caps: MovementCaps): void => {
  sim.pos.x += (i as unknown as { moveX: number }).moveX
}

describe('reconcilePrediction', () => {
  it('returns null when ackSeq is not newer than lastAckSeq', () => {
    const state: PredictionState = { sim: simState(5), pending: [], lastAckSeq: 10 }
    expect(reconcilePrediction(state, simState(0), 10, replay)).toBeNull()
    expect(reconcilePrediction(state, simState(0), 9, replay)).toBeNull()
  })

  it('drops acked inputs and replays only in-flight ones onto the server state', () => {
    const state: PredictionState = {
      sim: simState(100),
      pending: [
        { seq: 1, input: input(1), dt: 0.016, caps },
        { seq: 2, input: input(1), dt: 0.016, caps },
        { seq: 3, input: input(10), dt: 0.016, caps }, // in-flight (seq > ack 2)
      ],
      lastAckSeq: 0,
    }
    const result = reconcilePrediction(state, simState(50), 2, replay)
    expect(result).not.toBeNull()
    // seq 1 + 2 dropped; only seq 3 replays onto server x=50 → 60.
    expect(state.pending.map((e) => e.seq)).toEqual([3])
    expect(result!.sim.pos.x).toBe(60)
    // delta = |60 - 100| (predicted-before was 100).
    expect(result!.delta).toBe(40)
  })

  it('with no in-flight inputs snaps exactly to the server state', () => {
    const state: PredictionState = {
      sim: simState(73),
      pending: [{ seq: 1, input: input(5), dt: 0.016, caps }],
      lastAckSeq: 0,
    }
    const result = reconcilePrediction(state, simState(70), 5, replay)
    expect(state.pending).toEqual([])
    expect(result!.sim.pos.x).toBe(70)
    expect(result!.delta).toBe(3)
  })
})
