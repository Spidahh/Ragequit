// Pure lobby-fill / team-assignment rules for GameRoom. Extracted so the
// solo-playability behaviour (bot fill per mode, balanced teams, per-team
// spawn halves) is unit-testable without booting a Colyseus room.

/**
 * How many bots a room should pre-spawn so a solo player gets a live match.
 * duel/training: 1 sparring bot · FFA: a small brawl (env-tunable) ·
 * 5v5: every slot but one, so both teams are full from the first round.
 */
export function botFillTarget(
  mode: string,
  botFill: boolean,
  maxClients: number,
  ffaFillEnv?: string,
): number {
  if (mode !== 'training' && !botFill) return 0
  if (mode === 'ffa') return Math.min(Number(ffaFillEnv ?? 5), maxClients - 1)
  if (mode === '5v5') return maxClients - 1
  return 1
}

/** Join the smaller team; red wins ties. Keeps 5v5 balanced in any join order. */
export function pickBalancedTeam(red: number, blue: number): 'red' | 'blue' {
  return red <= blue ? 'red' : 'blue'
}

interface TeamMapLike<P> {
  forEach(cb: (p: P, id: string) => void): void
}

/** Count members per team (empty-team strings are neither red nor blue). */
export function countTeams<P extends { team: string }>(
  players: TeamMapLike<P>,
): { red: number; blue: number } {
  let red = 0
  let blue = 0
  players.forEach((p) => {
    if (p.team === 'red') red++
    else if (p.team === 'blue') blue++
  })
  return { red, blue }
}

/**
 * Seed a bot Player's identity from its index: display name, class rotation,
 * preset loadout and the class's primary weapon. Pure — schema mutation only.
 */
export function seedBotIdentity(
  player: {
    name: string
    classId: string
    activeWeapon: string
    loadout: { push: (id: string) => void }
  },
  botNum: number,
  names: readonly string[],
  classIds: readonly string[],
  presets: Readonly<Record<string, readonly string[]>>,
  classDefs: Readonly<Record<string, { weapons: readonly string[] }>>,
): string {
  player.name = names[botNum % names.length] ?? 'Bot'
  const classId = classIds[botNum % classIds.length] ?? 'hybrid'
  player.classId = classId
  for (const id of presets[classId] ?? []) player.loadout.push(id)
  player.activeWeapon = classDefs[classId]?.weapons[0] ?? 'sword'
  return classId
}

/**
 * Assign `player.team` (balanced pick, 5v5 only — other modes get '') and
 * return the spawn slot for it. Counts exclude the joining player because it
 * is not in the map yet.
 */
export function assignTeamAndSpawnIndex<P extends { team: string }>(
  players: TeamMapLike<P> & { size: number },
  mode: string,
  spawnCount: number,
  player: { team: string },
): number {
  const { red, blue } = countTeams(players)
  player.team = mode === '5v5' ? pickBalancedTeam(red, blue) : ''
  const members = player.team === 'red' ? red : player.team === 'blue' ? blue : 0
  return spawnIndexFor(player.team, members, players.size, spawnCount)
}

/**
 * Nearest living enemy of `selfId` — never a teammate (team modes), so bots
 * hunt their own closest target instead of piling on one player or wasting
 * swings on allies. Returns null when no valid enemy exists.
 */
export function nearestEnemy<
  P extends { alive: boolean; team: string; transform: { x: number; z: number } },
>(players: TeamMapLike<P> & { get(id: string): P | undefined }, selfId: string): P | null {
  const self = players.get(selfId)
  if (!self) return null
  let best: P | null = null
  let bestDistSq = Infinity
  players.forEach((p, pid) => {
    if (pid === selfId || !p.alive) return
    if (self.team && p.team === self.team) return
    const dx = p.transform.x - self.transform.x
    const dz = p.transform.z - self.transform.z
    const distSq = dx * dx + dz * dz
    if (distSq < bestDistSq) {
      bestDistSq = distSq
      best = p
    }
  })
  return best
}

/**
 * Spawn slot for a joining player. Team modes give each team its own half of
 * the spawn ring (red = first half, blue = second half) so a round never
 * starts face-mixed; non-team modes keep the join-order rotation.
 */
export function spawnIndexFor(
  team: string,
  teamMembers: number,
  joinOrder: number,
  spawnCount: number,
): number {
  if (!team) return joinOrder % spawnCount
  const half = Math.max(1, Math.floor(spawnCount / 2))
  const offset = team === 'red' ? 0 : half
  return (offset + (teamMembers % half)) % spawnCount
}
