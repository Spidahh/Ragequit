// Test Room (training difficulty 'test') placement helpers. One stationary dummy per
// class, lined up near the arena centre so the player — spawned a few metres back and
// facing the row — can inspect every class and test weapons/spells on them. Kept out of
// GameRoom to keep that file under its size budget.

/** Test Room needs one slot per class dummy plus the human slot. */
export function testRoomMaxClients(current: number, classCount: number): number {
  return Math.max(current, classCount + 1)
}

/** Position for dummy `botNum` (0..classCount-1): a tight side-by-side row centred on
 * x=0, in the open foreground so every skin is fully visible and unoccluded. */
export function testDummySpawn<T extends { x: number; z: number }>(
  base: T,
  botNum: number,
  classCount: number,
): T {
  const slot = botNum - (classCount - 1) / 2
  // A well-spaced ground row at z=0, in front of the player (z=8) on the empty
  // test_room map — 4 m between dummies so none overlap.
  return { ...base, x: slot * 4, z: 0 }
}

/** The human stands a few metres back (z=8) from the dummy row, facing it (yaw set by caller). */
export function testPlayerSpawn<T extends { x: number; z: number }>(base: T): T {
  return { ...base, x: 0, z: 8 }
}

/** Map id for a room: the empty `test_room` for the Test Room, else mode/option default. */
export function resolveMapId(
  mode: string,
  optionMapId: string | undefined,
  difficulty: string,
): string {
  if (mode === 'training' && difficulty === 'test') return 'test_room'
  if (optionMapId) return optionMapId
  if (mode === '5v5' || mode === 'ffa') return 'gladiators_arena'
  if (mode === 'blockout') return 'blockout'
  return 'duel_arena'
}
