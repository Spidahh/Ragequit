import { timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

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

// Read the balance overrides file at boot. The path is configurable
// (BALANCE_FILE env), defaulting to the JSON shipped in the shared package.
// On parse / validation failure we LOG and continue with defaults — refusing
// to start would break local dev. Production deploy on Fly.io should set
// BALANCE_FILE to the deployed file path and watch the validation log.
function loadBalanceFromDisk(): void {
  const path =
    process.env['BALANCE_FILE'] ??
    fileURLToPath(new URL('../../shared/src/constants/balance.json', import.meta.url))
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

const app = express()
app.use(express.json())

// Health endpoint for Fly.io and local probes.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() })
})

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
    if (
      constantTimeEquals(requestUser, user) &&
      constantTimeEquals(requestPassword, password)
    ) {
      next()
      return
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="RAGEQUIT Colyseus Monitor"')
    res.status(401).send('Authentication required')
  }
}

// Colyseus monitor — opt-in admin surface. Never expose it without auth.
if (MONITOR_ENABLED) {
  if (!MONITOR_USER || !MONITOR_PASSWORD) {
    throw new Error(
      'COLYSEUS_MONITOR_ENABLED=true requires COLYSEUS_MONITOR_USER and COLYSEUS_MONITOR_PASSWORD',
    )
  }
  app.use('/colyseus', requireBasicAuth(MONITOR_USER, MONITOR_PASSWORD), monitor())
}

const httpServer = createServer(app)

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
})

// Keep one room kind, but never match clients across different modes.
// Without this, `joinOrCreate('game', { mode: 'training' })` could reuse an
// existing duel room and training would wait in lobby without its bot.
gameServer.define('game', GameRoom).filterBy(['mode'])

initServerTelemetry()
process.on('SIGTERM', () => { shutdownServerTelemetry(); process.exit(0) })
process.on('SIGINT',  () => { shutdownServerTelemetry(); process.exit(0) })

httpServer.listen(PORT, () => {
  console.info(`[ragequit-server] listening on http://localhost:${PORT}`)
  console.info(`[ragequit-server]   ws endpoint:  ws://localhost:${PORT}`)
  console.info(`[ragequit-server]   health:       http://localhost:${PORT}/health`)
  console.info(
    MONITOR_ENABLED
      ? `[ragequit-server]   monitor:      http://localhost:${PORT}/colyseus (basic auth)`
      : '[ragequit-server]   monitor:      disabled',
  )
})
