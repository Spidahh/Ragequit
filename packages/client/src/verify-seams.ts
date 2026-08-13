// ---------------------------------------------------------------------------
// What the verification harnesses are allowed to read.
//
// Installed only under `?capture`, so none of it exists in a real session.
//
// WHY THESE EXIST AT ALL. A screenshot is a weak proof: it can show a perfectly
// plausible arena while the thing under test draws nothing, points somewhere
// else, or has not been computed yet this frame. Each seam here answers a
// question a picture cannot:
//
//   __aimShapes       what the solver actually produced, vs what got painted
//   __laneOnCrosshair whether the drawn lane points where the shot will go
//   __selfPos         predicted position AND replicated position, together,
//                     because a boundary the client does not predict is not a
//                     wall — it is a rubber-band, and they photograph the same
//   __castState       why a preview is absent: dead, round over, or nothing drew
//                     it — plus the alive/total population, which is how the
//                     tournament probe watches finality across the whole lobby
//                     instead of depending on a bot choosing to kill it
//   __buildState      class + specialisation + the HP the SERVER gave, so a
//                     specialisation can be proven to have crossed the wire
//                     rather than merely to have been clicked
//   __aimFrames       how many frames have actually rendered. Under SwiftShader
//                     this game runs at 1-4 fps, so a harness that waits in
//                     milliseconds samples between frames. Never sample on a clock.
// ---------------------------------------------------------------------------
import type { AimShape } from '@ragequit/shared'
import * as THREE from 'three'

export interface VerifySeamDeps {
  camera: THREE.Camera
  getPlacementAbilityId: () => string | null
  getPrimedSlotIdx: () => number | null
  getCurrentShapes: () => readonly AimShape[]
  getMatchPhase: () => string
  getLoadout: () => string[]
  /** Client-predicted position, or null before the local player exists. */
  getPredictedPos: () => { x: number; z: number } | null
  /** Server-replicated position, or null before the schema arrives. */
  getReplicatedPos: () => { x: number; z: number } | null
  /** How many players are alive right now, and how many are in the room. */
  getPopulation: () => { alive: number; total: number }
  /** The replicated local player — the source for both build state and aliveness. */
  getSelfPlayer: () =>
    | {
        classId: string
        specializationId: string
        hp: number
        alive: boolean
      }
    | null
    | undefined
}

export const isCaptureMode = (): boolean =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture')

/**
 * Alive vs total, over whatever player collection the room exposes.
 *
 * Lives here rather than in main because it is only ever a verification
 * concern: the tournament probe watches this across the whole lobby, so
 * "death is final" is checked on seven bots instead of on whether one of them
 * happened to kill the probe.
 */
export function countAlive(
  players: { forEach: (fn: (p: { alive: boolean }) => void) => void } | undefined | null,
): {
  alive: number
  total: number
} {
  let alive = 0
  let total = 0
  players?.forEach((p) => {
    total += 1
    if (p.alive) alive += 1
  })
  return { alive, total }
}

/** Bump once per rendered frame. Cheap enough to call unconditionally. */
export function countVerifyFrame(): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as Record<string, number>
  w['__aimFrames'] = (w['__aimFrames'] ?? 0) + 1
}

export function installVerifySeams(deps: VerifySeamDeps): void {
  const w = window as unknown as Record<string, unknown>

  w['__aimShapes'] = () => {
    const id = deps.getPlacementAbilityId()
    return deps.getCurrentShapes().map((s) => ({ ...s, abilityId: id }))
  }

  w['__laneOnCrosshair'] = () => {
    const lane = deps.getCurrentShapes().find((s) => s.kind === 'lane')
    if (!lane) return null
    const ndc = new THREE.Vector3(lane.to.x, lane.to.y, lane.to.z).project(deps.camera)
    return { ndcX: ndc.x, ndcY: ndc.y }
  }

  w['__selfPos'] = () => {
    const predicted = deps.getPredictedPos()
    const replicated = deps.getReplicatedPos()
    if (!predicted || !replicated) return null
    return { px: predicted.x, pz: predicted.z, sx: replicated.x, sz: replicated.z }
  }

  w['__buildState'] = () => {
    const p = deps.getSelfPlayer()
    return p ? { classId: p.classId, specializationId: p.specializationId, hp: p.hp } : null
  }

  w['__castState'] = () => ({
    placement: deps.getPlacementAbilityId(),
    primed: deps.getPrimedSlotIdx(),
    phase: deps.getMatchPhase(),
    dead: deps.getSelfPlayer()?.alive !== true,
    loadout: deps.getLoadout(),
    ...deps.getPopulation(),
  })
}
