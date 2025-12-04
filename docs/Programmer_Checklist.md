# Programmer Checklist — Netcode, Shaders, Performance

Use before merging any gameplay/visual change.

## Netcode
- Events: confirmation/hit/crit carry minimal payload; measure RTT.
- Hit-Stop: client pause gated by server-confirmed hit.
- Interpolation: maintain smoothness during knockback/recovery windows.

## Rendering/Shaders
- Emissive/Halo: consistent intensity; avoid bloom overload.
- Occlusion: near-camera fade (opacity 0.3 within 2 units).
- Particles: alpha, lifetime, and color-coded roles readable.

## Performance
- Frame Budget: keep <16ms/frame target; watch spikes on AoE.
- Allocations: avoid per-frame allocations in hot paths.
- Culling: enable frustum/occlusion for non-essential VFX.

## HUD/UX
- Cooldowns: numbers legibili e pulse al ready.
- Hit markers: latency <100ms; crit marker distinct.
- Bars: smooth updates; no stutter.

## Testing Steps
- Input→feedback latency trace; fail >30ms.
- Rimbalzi e knockback recovery ≤500ms; verify aim dampening curve.
- Projectile readability in low light; VFX non-occlusivi.
- Multi-spell stress test (AoE + projectiles) without frame drops.
