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
//   __castState       why a preview is absent: dead, round over, or nothing drew it
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
  isAlive: () => boolean
  /** Class, specialisation and the HP the SERVER gave — for tools/verify/spec.mjs. */
  getBuildState: () => { classId: string; specializationId: string; hp: number } | null
}

export const isCaptureMode = (): boolean =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture')

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

  w['__buildState'] = () => deps.getBuildState()

  w['__castState'] = () => ({
    placement: deps.getPlacementAbilityId(),
    primed: deps.getPrimedSlotIdx(),
    phase: deps.getMatchPhase(),
    dead: !deps.isAlive(),
    loadout: deps.getLoadout(),
  })
}
