import { timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Load .env before anything else so SUPABASE_* vars are available.
const { config } = await import('dotenv')
config()

import { Server } from '@colyseus/core'
import { monitor } from '@colyseus/monitor'
import { WebSocketTransport } from '@colyseus/ws-transport'
import {
  applyBalanceOverride,
  RUNTIME_BALANCE,
  validateBalance,
  type BalanceConfig,
} from '@ragequit/shared'
import express, { type RequestHandler } from 'express'

import { GameRoom } from './rooms/GameRoom.js'
import { initServerTelemetry, shutdownServerTelemetry } from './telemetry.js'

const PORT = Number(process.env['PORT'] ?? 2567)
const MONITOR_ENABLED = process.env['COLYSEUS_MONITOR_ENABLED'] === 'true'
const MONITOR_USER = process.env['COLYSEUS_MONITOR_USER']
const MONITOR_PASSWORD = process.env['COLYSEUS_MONITOR_PASSWORD']

// Optional runtime balance override. Set BALANCE_FILE to a JSON path to tune
// ttk/match (ELO K-factor, round counts) without a redeploy; otherwise the
// compiled defaults are used. There is intentionally NO default path: the
// source balance.json is not shipped into the production image (only dist is),
// so a default would silently fail there — and it only mirrors the compiled
// defaults anyway. On parse/validation failure we LOG and continue with
// defaults rather than refuse to start.
function loadBalanceFromDisk(): void {
  const path = process.env['BALANCE_FILE']
  if (!path) return
  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as Partial<BalanceConfig>
    const merged = applyBalanceOverride(parsed)
    const issues = validateBalance(merged)
    if (issues.length > 0) {
      console.warn(`[ragequit-server] balance validation issues:\n  - ${issues.join('\n  - ')}`)
    } else {
      console.info(
        `[ragequit-server] balance loaded — ttk=${RUNTIME_BALANCE.ttk.min_sec}-${RUNTIME_BALANCE.ttk.max_sec}s, match=${RUNTIME_BALANCE.match.rounds_to_win}/${RUNTIME_BALANCE.match.max_rounds} K=${RUNTIME_BALANCE.match.elo_k_ranked}`,
      )
    }
  } catch (err) {
    console.warn(
      `[ragequit-server] balance file not loaded (${(err as Error).message}); using defaults`,
    )
  }
}
loadBalanceFromDisk()

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function requireBasicAuth(user: string, password: string): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization ?? ''
    const [scheme, encoded] = header.split(' ')
    if (scheme !== 'Basic' || !encoded) {
      res.setHeader('WWW-Authenticate', 'Basic realm="RAGEQUIT Colyseus Monitor"')
      res.status(401).send('Authentication required')
      return
    }

    let decoded = ''
    try {
      decoded = Buffer.from(encoded, 'base64').toString('utf8')
    } catch {
      res.setHeader('WWW-Authenticate', 'Basic realm="RAGEQUIT Colyseus Monitor"')
      res.status(401).send('Invalid authentication')
      return
    }

    const separatorIdx = decoded.indexOf(':')
    const requestUser = separatorIdx >= 0 ? decoded.slice(0, separatorIdx) : ''
    const requestPassword = separatorIdx >= 0 ? decoded.slice(separatorIdx + 1) : ''
    if (constantTimeEquals(requestUser, user) && constantTimeEquals(requestPassword, password)) {
      next()
      return
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="RAGEQUIT Colyseus Monitor"')
    res.status(401).send('Authentication required')
  }
}

// 0.17: the transport owns the express app (matchmaking routes live there).
// Custom routes (health, monitor) are mounted through the `express` callback —
// attaching them to a self-made app would leave /matchmake/* returning 404.
const gameServer = new Server({
  transport: new WebSocketTransport(),
  // We own the signal handlers below so we can dispose rooms, flush telemetry
  // and close the HTTP server in order before exiting. Disable Colyseus's own
  // auto-registered handler to avoid a double-handler race that exits early.
  gracefullyShutdown: false,
  express: (app) => {
    app.use(express.json())
    // Health endpoint for the hosting platform and local probes.
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', ts: Date.now() })
    })
    // Colyseus monitor — opt-in admin surface. Never expose it without auth.
    if (MONITOR_ENABLED) {
      if (!MONITOR_USER || !MONITOR_PASSWORD) {
        throw new Error(
          'COLYSEUS_MONITOR_ENABLED=true requires COLYSEUS_MONITOR_USER and COLYSEUS_MONITOR_PASSWORD',
        )
      }
      app.use('/colyseus', requireBasicAuth(MONITOR_USER, MONITOR_PASSWORD), monitor())
    }
  },
})

// Keep one room kind, but never match clients across different modes OR
// training difficulties. Without 'mode', `joinOrCreate('game', { mode: 'training' })`
// could reuse a duel room. Without 'difficulty', two players who pick DIFFERENT
// training difficulties both request mode='training' and get bucketed together —
// the second silently inherits the first creator's difficulty (and, for 'test',
// the wrong map/maxClients). Non-training modes leave difficulty undefined, which
// all bucket together, so this only splits the training tiers.
gameServer.define('game', GameRoom).filterBy(['mode', 'difficulty'])

initServerTelemetry()

// Graceful shutdown: Fly.io sends SIGTERM on every deploy and scale-to-zero.
// Dispose rooms first (runs GameRoom.onDispose → finalize replay + match_ended
// telemetry), THEN flush buffered PostHog events, THEN close the HTTP server,
// only then exit. A bounded timeout guarantees we never outlive the platform's
// kill timeout.
let shuttingDown = false
async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.info(`[ragequit-server] ${signal} received — shutting down gracefully`)
  const forceExit = setTimeout(() => {
    console.warn('[ragequit-server] graceful shutdown timed out — forcing exit')
    process.exit(0)
  }, 5000)
  forceExit.unref()
  try {
    // 0.17: gracefullyShutdown disposes rooms AND shuts the transport (with the
    // http server the transport owns), so no separate httpServer.close here.
    await gameServer.gracefullyShutdown(false)
    await shutdownServerTelemetry()
  } catch (err) {
    console.warn(`[ragequit-server] shutdown error: ${(err as Error).message}`)
  } finally {
    clearTimeout(forceExit)
    process.exit(0)
  }
}
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => void gracefulShutdown('SIGINT'))

await gameServer.listen(PORT)
console.info(`[ragequit-server] listening on http://localhost:${PORT}`)
console.info(`[ragequit-server]   ws endpoint:  ws://localhost:${PORT}`)
console.info(`[ragequit-server]   health:       http://localhost:${PORT}/health`)
console.info(
  MONITOR_ENABLED
    ? `[ragequit-server]   monitor:      http://localhost:${PORT}/colyseus (basic auth)`
    : '[ragequit-server]   monitor:      disabled',
)
