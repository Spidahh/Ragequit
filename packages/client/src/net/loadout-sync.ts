import type { Room } from '@colyseus/sdk'
import { MessageTypes } from '@ragequit/shared'

import { buildLoadoutMessage } from '../input/loadout-slots.js'

export function sendLoadout(
  room: Room | null,
  slots: ReadonlyArray<string>,
  classId?: string,
  specializationId?: string,
): void {
  if (!room) return
  // The specialisation travels with the build on EVERY path, not just the
  // Forge's confirm button. This one runs on reconnect and on match start, and
  // omitting it here would silently reset a player's third axis to none at the
  // exact moment it starts mattering.
  room.send(MessageTypes.Loadout, buildLoadoutMessage(slots, classId, specializationId))
}
