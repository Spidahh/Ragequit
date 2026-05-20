---
id: tech_stack
title: Tech Stack
section: tech
tags: [frameworks, versions, tooling]
provides: [stack_list, version_targets]
deps: []
status: final
---

# Tech Stack

All choices prioritize: browser-first, free tier friendly, modern (2026), and compatible with my (Claude's) ability to read/write code confidently.

## Rendering

| Component     | Choice                             | Reason                                                                       |
| ------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| 3D engine     | **Three.js r180+**                 | Stable, huge ecosystem, free, browser-native                                 |
| Rendering API | **WebGL via Three.js**             | Current implementation uses the stable default Three.js renderer             |
| Physics       | **Custom TS controller/collision** | Current package graph has no Rapier; movement/projectiles use shared helpers |

## Language & build

| Component       | Choice              | Reason                                                       |
| --------------- | ------------------- | ------------------------------------------------------------ |
| Language        | **TypeScript 5.9+** | Type safety across shared client/server code                 |
| Bundler         | **Vite 7**          | Fast dev, tree-shaken build, first-class TS                  |
| Package manager | **pnpm** (monorepo) | Efficient, strict dep graph, handles shared packages cleanly |

### Monorepo layout

```
ragequit/
  packages/
    shared/     # Types, constants, ability data, shared math
    client/     # Three.js + UI
    server/     # Colyseus room + sim
  apps/
    web/        # Static site hosting the client
  tools/        # Build scripts, asset pipeline
```

## Multiplayer

| Component                | Choice             | Reason                                                                             |
| ------------------------ | ------------------ | ---------------------------------------------------------------------------------- |
| Server framework         | **Colyseus 0.16+** | TS-native authoritative multiplayer, state-sync, room management, free open source |
| Transport (launch)       | **WebSocket**      | Universal browser support, mature                                                  |
| Transport (upgrade lane) | **WebTransport**   | Optional future migration                                                          |
| Tick rate                | 60 Hz server tick  | High-fidelity combat, feasible within single-core sim budget                       |

See `10_tech_netcode.md` for prediction/reconciliation details.

## Backend services

| Component    | Choice                                     | Reason                                                                   |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------ |
| Auth & DB    | **Supabase**                               | Planned persistence/auth lane; not required for the local vertical slice |
| CDN (assets) | **Cloudflare R2**                          | Zero egress fees; fits browser asset delivery                            |
| Hosting      | **Fly.io**                                 | Free tier viable for early player base; region selection for latency     |
| Monitoring   | **Sentry** (free tier)                     | Errors, perf traces                                                      |
| Analytics    | **PostHog** (self-host or free cloud tier) | Event tracking, funnels                                                  |

## Asset pipeline

See `10_tech_assets.md` for details. Headline: **gltf-transform + Meshopt compression + KTX2 textures + IndexedDB client cache**.

## Dev & CI

| Component       | Choice                                               |
| --------------- | ---------------------------------------------------- |
| Version control | Git (GitHub)                                         |
| CI              | GitHub Actions (free tier sufficient)                |
| Linting         | ESLint + Prettier                                    |
| Testing         | Vitest (unit/smoke); browser QA during frontend work |
| Type checking   | `tsc --noEmit` on every PR                           |

## Free-tier reality check

The planned launch infrastructure should fit within free tiers of: Supabase + Cloudflare R2 + Fly.io + GitHub Actions + Sentry + PostHog. The current local vertical slice only requires Node, pnpm, the Vite client, and the Colyseus server.

## Version targets at launch

| Package    | Min version |
| ---------- | ----------- |
| three      | 0.180.0     |
| typescript | 5.9         |
| vite       | 7.0         |
| colyseus   | 0.16        |
| pnpm       | 10+         |

Versions locked via `package.json` + `pnpm-lock.yaml`. Dependabot for security updates.
