// ---------------------------------------------------------------------------
// Respawn point selection (anti spawn-camping).
//
// Picks the spawn point that maximises distance to the nearest living enemy, so
// a respawning player doesn't reappear in an opponent's face. Falls back to a
// symmetric join-order assignment when there are no living enemies. Pure —
// extracted from GameRoom for testability.
// ---------------------------------------------------------------------------
interface SpawnPoint {
  x: number
  z: number
}
interface SpawnPlayer {
  transform: { x: number; z: number }
  alive: boolean
}

export function bestSpawnIndex(
  spawns: readonly SpawnPoint[],
  players: Iterable<readonly [string, SpawnPlayer]>,
  sid: string,
  joinOrderIndex: number,
): number {
  if (spawns.length <= 1) return 0
  const playerList = [...players]
  const fallback = ((joinOrderIndex % spawns.length) + spawns.length) % spawns.length

  let bestIdx = fallback
  let bestDist = -1
  let hasEnemy = false

  for (let i = 0; i < spawns.length; i++) {
    const sp = spawns[i]!
    let minDistToEnemy = Infinity
    for (const [otherId, other] of playerList) {
      if (otherId === sid || !other.alive) continue
      hasEnemy = true
      const dx = other.transform.x - sp.x
      const dz = other.transform.z - sp.z
      const d = Math.hypot(dx, dz)
      if (d < minDistToEnemy) minDistToEnemy = d
    }
    if (isFinite(minDistToEnemy) && minDistToEnemy > bestDist) {
      bestDist = minDistToEnemy
      bestIdx = i
    }
  }

  // No living enemies — keep symmetric join-order assignment.
  if (!hasEnemy) return fallback
  return bestIdx
}
