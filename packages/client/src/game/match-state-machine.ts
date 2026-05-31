// match-state-machine.ts
// Explicit state machine for match flow phases.
// Replaces ad-hoc string checks on currentMatchPhase in main.ts.

export type MatchState =
  | 'disconnected'
  | 'connecting'
  | 'lobby'
  | 'countdown'
  | 'live'
  | 'roundEnd'
  | 'matchEnd'

export type MatchStateCallback = (from: MatchState, to: MatchState) => void

export class MatchStateMachine {
  private _state: MatchState = 'disconnected'
  private _listeners: Map<string, MatchStateCallback[]> = new Map()
  private _anyListeners: MatchStateCallback[] = []
  private _history: Array<{ from: MatchState; to: MatchState; at: number }> = []

  get state(): MatchState { return this._state }
  get history() { return this._history }
  get isLive(): boolean { return this._state === 'live' }
  get isInMatch(): boolean {
    return this._state === 'live' || this._state === 'countdown' || this._state === 'roundEnd'
  }

  on(toState: MatchState, cb: MatchStateCallback): void {
    const list = this._listeners.get(toState) ?? []
    list.push(cb)
    this._listeners.set(toState, list)
  }

  onAny(cb: MatchStateCallback): void {
    this._anyListeners.push(cb)
  }

  transition(next: MatchState): boolean {
    if (this._state === next) return true
    const from = this._state
    this._state = next
    this._history.push({ from, to: next, at: Date.now() })
    if (this._history.length > 50) this._history.shift()
    const listeners = this._listeners.get(next) ?? []
    for (const cb of [...listeners, ...this._anyListeners]) {
      try { cb(from, next) } catch (e) { console.error('[MatchSM] listener error:', e) }
    }
    return true
  }

  is(...states: MatchState[]): boolean {
    return states.includes(this._state)
  }

  reset(): void { this._state = 'disconnected' }
}

/** Singleton — import this in main.ts and any module that needs match state. */
export const matchSM = new MatchStateMachine()
