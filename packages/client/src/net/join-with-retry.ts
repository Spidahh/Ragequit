// joinOrCreate with cold-start retries. Free-tier hosting sleeps when idle,
// so the FIRST join after a quiet period often fails or hangs — retry with
// backoff while the player is still waiting, abort silently when they went
// back to the menu or a newer connect attempt superseded this one.

import type { Client, Room } from '@colyseus/sdk'

const RETRY_DELAYS_MS = [2000, 4000, 8000]

export interface JoinRetryHooks {
  /** false → this attempt was superseded (a newer connect started). */
  isCurrent: () => boolean
  /** true → the player pressed Back; stop retrying, fail silently. */
  isMenuVisible: () => boolean
  showRetryToast: (attempt: number, total: number) => void
  hideToast: () => void
}

/**
 * Resolves with the joined room, `null` when the attempt was aborted
 * (superseded/back-to-menu during a wait), or rethrows the final error
 * once every retry is exhausted.
 */
export async function joinWithRetry(
  client: Client,
  roomName: string,
  roomOptions: Record<string, unknown>,
  hooks: JoinRetryHooks,
): Promise<Room | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      const room = await client.joinOrCreate(roomName, roomOptions)
      hooks.hideToast()
      return room
    } catch (err) {
      const out = !hooks.isCurrent() || hooks.isMenuVisible()
      if (out || attempt >= RETRY_DELAYS_MS.length) throw err
      hooks.showRetryToast(attempt + 2, RETRY_DELAYS_MS.length + 1)
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
      if (!hooks.isCurrent()) {
        hooks.hideToast()
        return null
      }
    }
  }
}
