import { PostHog } from 'posthog-node'

const KEY = process.env['POSTHOG_KEY']

let client: PostHog | null = null

export function initServerTelemetry(): void {
  if (!KEY) return
  client = new PostHog(KEY, { host: 'https://eu.i.posthog.com', flushAt: 20, flushInterval: 10000 })
}

export function shutdownServerTelemetry(): void {
  void client?.shutdown()
}

function track(event: string, properties: Record<string, unknown>): void {
  if (!client) return
  client.capture({ distinctId: 'server', event, properties })
}

export function trackMatchStarted(roomId: string, mode: string, playerCount: number): void {
  track('match_started', { room_id: roomId, mode, player_count: playerCount })
}

export function trackMatchEnded(roomId: string, mode: string, durationSec: number, playerCount: number): void {
  track('match_ended', { room_id: roomId, mode, duration_sec: Math.round(durationSec), player_count: playerCount })
}

export function trackPlayerConnected(roomId: string, mode: string): void {
  track('player_connected', { room_id: roomId, mode })
}

export function trackPlayerDisconnected(roomId: string, mode: string): void {
  track('player_disconnected', { room_id: roomId, mode })
}
