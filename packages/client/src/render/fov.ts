// Field of view, in the unit players actually think in.
//
// three.js `PerspectiveCamera.fov` is VERTICAL. Every first-person game on
// earth presents FOV as HORIZONTAL — Quake's `cg_fov 90`, CS's 90, Apex's 104
// are all horizontal. This client passed its setting straight in, so a slider
// reading "100" produced **129.5 degrees horizontal** at 16:9, and the speed
// bonus pushed it past 140 in the air.
//
// That is a fisheye. At 129 degrees an enemy at 15 m is a handful of pixels,
// the periphery smears into nothing, and pixels-per-degree at the crosshair
// collapses — which makes free aim, a pillar of this game, physically
// impossible. It is the single largest reason the first-person view reads as
// unusable.
//
// Everything outside this module now speaks HORIZONTAL degrees. This is the
// only place that knows about the conversion, and it is aspect-dependent, so
// it must be recomputed on resize or an ultrawide monitor silently gets a
// different game.

/** Convert a horizontal FOV (degrees) to the vertical FOV three.js wants. */
export function hFovToVFov(hFovDeg: number, aspect: number): number {
  const h = (Math.max(30, Math.min(160, hFovDeg)) * Math.PI) / 180
  return (2 * Math.atan(Math.tan(h / 2) / Math.max(0.1, aspect)) * 180) / Math.PI
}

/** Convert a vertical FOV (degrees) back to horizontal — for readouts. */
export function vFovToHFov(vFovDeg: number, aspect: number): number {
  const v = (vFovDeg * Math.PI) / 180
  return (2 * Math.atan(Math.tan(v / 2) * Math.max(0.1, aspect)) * 180) / Math.PI
}
