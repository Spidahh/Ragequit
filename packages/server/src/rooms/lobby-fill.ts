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
  // A tournament with one opponent is a duel. Fill it so "until one remains"
  // means something the first time somebody presses the button.
  if (mode === 'tournament') return maxClients - 1
  if (mode === '5v5') return maxClients - 1
  return 1
}

/**
 * How many clients a mode's room holds.
 *
 * Lives here with the rest of the lobby shape rather than as a chain of `if`s
 * in the room: how many people a mode seats is the same kind of fact as how
 * many bots fill it.
 */
export function maxClientsForMode(mode: string, fallback: number, env: NodeJS.ProcessEnv): number {
  if (mode === 'ffa') return Number(env['MAX_CLIENTS_FFA'] ?? 10)
  if (mode === '5v5') return Number(env['MAX_CLIENTS_5V5'] ?? 10)
  if (mode === 'tournament') return Number(env['MAX_CLIENTS_TOURNAMENT'] ?? 8)
  return fallback
}

/**
 * When the victim gets back up, in ticks — or 0 for never.
 *
 * Tournament is the one mode where a lost fight costs the MATCH: no respawn is
 * scheduled, so `alive` stays false for good. Every other mode inherits FFA's
 * economy, where winning a fight costs the loser about a second and a half,
 * which is the opposite of what "until one remains" means (00_truth.md D22).
 */
export function respawnTickFor(mode: string, now: number, respawnTicks: number): number {
  return mode === 'tournament' ? 0 : now + respawnTicks
}

/**
 * Modes where bots pre-fill the MULTIPLAYER lobby and must leave a human slot
 * open. Narrower than the shared BOT_FILLED_MODES, which also covers duel: a
 * duel room seats two, so reserving a slot there would leave room for nobody.
 */
export const CROWD_FILLED_MODES = new Set(['ffa', '5v5', 'tournament'])

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
