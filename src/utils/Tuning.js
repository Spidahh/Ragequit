// Utility helpers for tuning operations
export function msToFrames(fps, ms) {
  return Math.max(1, Math.round((ms / 1000) * fps));
}

export function clampNearCamera(vfx, camera, cfg) {
  if (!vfx || !camera || !cfg) return;
  const dist = vfx.position && camera.position ? vfx.position.distanceTo(camera.position) : Infinity;
  if (dist <= cfg.nearDistance) {
    if (vfx.material && 'opacity' in vfx.material) vfx.material.opacity = cfg.nearOpacity;
    if (vfx.scale && vfx.scale.set) vfx.scale.set(cfg.nearScale, cfg.nearScale, cfg.nearScale);
  }
}

export function applyAimDamp(player, elapsedMs, cfg) {
  if (!player || !cfg) return;
  const t = Math.min(1, elapsedMs / cfg.fullControlMs);
  const factor = cfg.aimDampLinear ? t : t * t;
  if (player.controls) {
    player.controls.aimDamp = 1 - (1 - factor);
  }
}

export default { msToFrames, clampNearCamera, applyAimDamp };
