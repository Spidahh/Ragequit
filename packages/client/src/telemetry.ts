import posthog from 'posthog-js'

const KEY = import.meta.env['VITE_POSTHOG_KEY'] as string | undefined

export function initTelemetry(): void {
  if (!KEY) return
  posthog.init(KEY, {
    api_host: 'https://eu.i.posthog.com',
    persistence: 'localStorage',
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
  })
  posthog.capture('page_view')
}

export function trackMatchJoined(mode: string): void {
  if (!KEY) return
  posthog.capture('match_joined', { mode })
}

export function trackMatchLeft(mode: string, durationSec: number): void {
  if (!KEY) return
  posthog.capture('match_left', { mode, duration_sec: Math.round(durationSec) })
}

export function trackKill(cause: string): void {
  if (!KEY) return
  posthog.capture('kill', { cause })
}

export function trackDeath(cause: string): void {
  if (!KEY) return
  posthog.capture('death', { cause })
}

export function trackAbilityCast(abilityId: string, element: string): void {
  if (!KEY) return
  posthog.capture('ability_cast', { ability_id: abilityId, element })
}

export function trackLoadoutSaved(slotCount: number): void {
  if (!KEY) return
  posthog.capture('loadout_saved', { slot_count: slotCount })
}
