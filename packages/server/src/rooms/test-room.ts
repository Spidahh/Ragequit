// Test Room (training difficulty 'test') placement helpers. One stationary dummy per
// class, lined up near the arena centre so the player — spawned a few metres back and
// facing the row — can inspect every class and test weapons/spells on them. Kept out of
// GameRoom to keep that file under its size budget.

/** Test Room needs one slot per class dummy plus the human slot. */
export function testRoomMaxClients(current: number, classCount: number): number {
  return Math.max(current, classCount + 1)
}

/** Position for dummy `botNum` (0..classCount-1): a row centred on x=0, near centre. */
export function testDummySpawn<T extends { x: number; z: number }>(
  base: T,
  botNum: number,
  classCount: number,
): T {
  const slot = botNum - (classCount - 1) / 2
  return { ...base, x: slot * 3, z: 2 }
}

/** The human stands a few metres back from the dummy row, facing it (yaw set by caller). */
export function testPlayerSpawn<T extends { x: number; z: number }>(base: T): T {
  return { ...base, x: 0, z: 10 }
}
