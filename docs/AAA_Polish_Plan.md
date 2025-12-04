# AAA Polish Plan (4 Phases)

Purpose: Operationalize high-priority improvements for hit-feedback, clarity, movement flow, and base art quality. Values are concrete and testable.

## Phase 1 — Hit-Feedback & Zero-Lag
- Hit Marker: <100ms display; crit color=yellow, normal=red; opacity 0.8; duration 120ms.
- Melee Hit-Stop: 1–3 frames (at 60 FPS ⇒ 16–50ms) based on damage tier; server-side confirmation gates client pause.
- Enemy Flinch/Stagger: threshold=damage>=15; flinch lock=120ms; stagger (heavy)=250ms with reduced control.
- Input Lag Budget: instrument end-to-end; alert if >30ms.

## Phase 2 — Spell Balance & VFX Clarity
- Near-Camera VFX: opacity clamp 0.3 within 2 units of camera; scale 0.85.
- Projectile Identification: emissive intensity 1.2; halo size 1.4x; trailing particles alpha=0.7; color-coded by spell role.
- Status Effects: outline pass with subtle shadow; avoid full-screen overlays.

## Phase 3 — Cinematic Physics & Movement Flow
- Knockback Recovery: reduced-control window ≤500ms; aim dampening recovers to 100% by 450ms.
- Air Control: friction +10%; air acceleration +12% for micro-corrections.
- Mobility: dash (3x speed, 150ms, 500ms CD); optional slide (1.6x speed, 300ms, CD 800ms) if needed.

## Phase 4 — Base Asset & Visual Quality
- Characters: audit poly count, textures, shaders; target improved readability.
- Animations: run/jump/attack with stronger anticipation, follow-through; remove stiffness.
- Generic VFX: up-res, correct lighting normals, believable impact.
- Lighting: add dynamic shadows and contrast; improve atmosphere + readability.

---

## Immediate Top-5 Tuning Changes
1. Melee hit-stop: clamp to 2 frames (≈33ms) on mid-tier hits; 3 frames on heavy.
2. Hit marker latency: enforce <80ms total with render priority; crit marker duration 140ms.
3. Near-camera VFX clamp: opacity 0.3 within 2 units; halo emissive 1.2.
4. Knockback recovery cap: full control by 450ms; partial dampening lifted linearly.
5. Air control boost: friction +10%, air accel +12%; verify slide optional.

## Programmer Verification Checklist (Quick)
- Instrument input→feedback latency; fail if >30ms.
- Validate hit-stop timings tied to server confirmation.
- VFX occlusion respects camera bounds; projectiles readable.
- Physics recovery curves hit ≤500ms; dash/slide within spec.
- Assets/anims audited; lighting adds contrast without blinding.
