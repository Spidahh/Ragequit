---
id: deploy_status
title: Production Deploy Status
section: tech
tags: [deploy, fly, supabase, cloudflare, production]
provides: [deploy_facts, credentials_location, live_services]
deps: [10_tech_stack.md in 01_DESIGN]
status: current
---

# Production Deploy Status

Questo documento raccoglie lo stato reale del deployment. Aggiornarlo ogni volta che cambia qualcosa in produzione.

**Regola**: nessuna AI deve mai chiedere all'utente di fare il deploy o di configurare questi servizi — sono già attivi.

## Server (Fly.io)

| Campo    | Valore                         |
| -------- | ------------------------------ |
| App name | `ragequit-server`              |
| Region   | `ams` (Amsterdam)              |
| Porta    | 8080                           |
| Stato    | **DEPLOYED — live**            |
| Config   | `fly.toml` nella root del repo |
| Scale    | scale-to-zero abilitato        |

Il server si connette su WebSocket. Il monitor Colyseus è disabilitato di default; quando abilitato richiede Basic Auth (env `COLYSEUS_MONITOR_ENABLED`, `COLYSEUS_MONITOR_USER`, `COLYSEUS_MONITOR_PASSWORD`).

## Supabase

| Campo                       | Valore                                                          |
| --------------------------- | --------------------------------------------------------------- |
| Stato                       | Credenziali configurate come Fly secrets                        |
| `SUPABASE_URL`              | Fly secret — non nel codice                                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Fly secret — non nel codice                                     |
| Funzionalità live           | **Nessuna** — auth/persistence non ancora attiva nel game flow  |
| Target                      | M4+ per ROADMAP — Supabase auth + loadout persistence DB-backed |

Il client può usare Supabase auth anonima se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` sono definiti nel `.env` client-side. Non richiesto per il gameplay locale.

## Client (Cloudflare Pages)

| Campo | Valore                              |
| ----- | ----------------------------------- |
| Stato | Target di deploy, non ancora attivo |
| Build | `apps/web/dist/` (output Vite)      |
| CDN   | Cloudflare Pages                    |

Attualmente il client viene servito localmente via `pnpm dev:client` (Vite dev server su `localhost:5173`).

## Asset locali esistenti

Questi asset sono già nel repo e NON vanno cercati o scaricati:

| Path                                                       | Contenuto                                  |
| ---------------------------------------------------------- | ------------------------------------------ |
| `packages/client/public/ui/ragequit-logo-full.png`         | Logo principale                            |
| `packages/client/public/ui/ragequit-logo-small.png`        | Logo small                                 |
| `packages/client/public/icons-sprite.svg`                  | SVG sprite icone (~45 KB)                  |
| `packages/client/public/graphic-redesign.css`              | CSS overrides visual redesign              |
| `packages/client/public/arena/gladiators_arena.glb`        | Arena 3D (~171 KB)                         |
| `packages/client/public/characters/player.glb`             | Character fallback                         |
| `packages/client/public/characters/legacy/player_base.fbx` | Character primary (animation-complete FBX) |
| `packages/client/public/weapons/sword.glb`                 | Weapon sword                               |
| `packages/client/public/weapons/bow.glb`                   | Weapon bow                                 |
| `packages/client/public/weapons/staff.glb`                 | Weapon staff                               |

## CI/CD (GitHub Actions)

- Lint + typecheck + test + build su ogni push/PR
- Gate non passing = warning via email, push tecnicamente ok ma CI fallisce
- Nessun deploy automatico configurato (deploy manuale via `flyctl`)

## Comandi deploy

```bash
# Deploy server (richiede flyctl installato + login)
fly deploy

# Verifica stato
fly status --app ragequit-server

# Log live
fly logs --app ragequit-server

# Secrets (già configurati — solo per riferimento)
fly secrets list --app ragequit-server
```
