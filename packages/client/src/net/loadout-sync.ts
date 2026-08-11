import type { Room } from '@colyseus/sdk'
import { MessageTypes } from '@ragequit/shared'

import { buildLoadoutMessage } from '../input/loadout-slots.js'

export function sendLoadout(
  room: Room | null,
  slots: ReadonlyArray<string>,
  classId?: string,
): void {
  if (!room) return
  room.send(MessageTypes.Loadout, buildLoadoutMessage(slots, classId))
}
