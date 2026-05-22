import { MessageTypes } from '@ragequit/shared'
import type { Room } from 'colyseus.js'

import { buildLoadoutMessage } from '../input/loadout-slots.js'

export function sendLoadout(
  room: Room | null,
  slots: ReadonlyArray<string>,
  classId?: string,
): void {
  if (!room) return
  room.send(MessageTypes.Loadout, buildLoadoutMessage(slots, undefined, classId))
}
