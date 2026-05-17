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
import express from 'express'

import { GameRoom } from './rooms/GameRoom.js'

const PORT = Number(process.env['PORT'] ?? 2567)

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

// Colyseus monitor — dev-only surface. Protect before production deploy.
app.use('/colyseus', monitor())

const httpServer = createServer(app)

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
})

// Current local vertical slice uses a single room kind; mode-specific rooms are roadmap work.
gameServer.define('game', GameRoom)

httpServer.listen(PORT, () => {
  console.info(`[ragequit-server] listening on http://localhost:${PORT}`)
  console.info(`[ragequit-server]   ws endpoint:  ws://localhost:${PORT}`)
  console.info(`[ragequit-server]   health:       http://localhost:${PORT}/health`)
  console.info(`[ragequit-server]   monitor:      http://localhost:${PORT}/colyseus`)
})
