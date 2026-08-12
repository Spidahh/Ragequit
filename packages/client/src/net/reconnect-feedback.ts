// The 0.17 SDK auto-reconnects transparently on abnormal WS closure (its own
// retry loop, up to 15 attempts, consuming the room's reconnectionToken
// against the server's allowReconnection grace) — onLeave only fires once
// that's exhausted. Without this, the player sees a frozen game with zero
// feedback for the whole retry window. onReconnect resumes the SAME room/
// state, so there is nothing else to re-wire on success.

import type { Room } from '@colyseus/sdk'

export interface ReconnectFeedbackHooks {
  isCurrentRoom: () => boolean
  onDrop: () => void
  onReconnect: () => void
}

export function wireReconnectFeedback(room: Room, hooks: ReconnectFeedbackHooks): void {
  room.onDrop(() => {
    if (hooks.isCurrentRoom()) hooks.onDrop()
  })
  room.onReconnect(() => {
    if (hooks.isCurrentRoom()) hooks.onReconnect()
  })
}
