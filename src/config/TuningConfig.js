// Centralized tuning configuration for gameplay and UX
export const TuningConfig = {
  hitStopFrames: { light: 1, medium: 2, heavy: 3 },
  hitMarker: { normalMs: 120, critMs: 140, maxLatencyMs: 80, opacity: 0.8 },
  vfxClamp: {
    nearOpacity: 0.3,
    nearDistance: 2.0,
    nearScale: 0.85,
    projectileEmissive: 1.2,
    haloScale: 1.4,
    trailAlpha: 0.7,
  },
  knockbackRecovery: { fullControlMs: 450, aimDampLinear: true },
  airControl: { frictionBoostPct: 0.10, accelBoostPct: 0.12 },
  mobility: {
    dashSpeedMult: 3.0,
    dashMs: 150,
    dashCooldownMs: 500,
    slide: { enabled: false, speedMult: 1.6, durationMs: 300, cooldownMs: 800 },
  },
  instrumentation: { inputLagBudgetMs: 30 },
};

export default TuningConfig;
