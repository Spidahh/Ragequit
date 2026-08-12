---
id: deploy_status
title: Production Deploy Status
section: tech
tags: [deploy, fly, supabase, cloudflare, production]
provides: [deploy_facts, credentials_location, live_services]
deps: []
status: current
---

# Production Deploy Status

Questo documento raccoglie lo stato reale del deployment. Aggiornarlo ogni volta che cambia qualcosa in produzione.

**Regola**: nessuna AI deve mai chiedere all'utente di fare il deploy o di configurare questi servizi — sono già attivi.

## Server (Fly.io)

| Campo    | Valore                                              |
| -------- | --------------------------------------------------- |
| App name | `ragequit-server`                                   |
| Region   | `ams` (Amsterdam)                                   |
| Porta    | 8080                                                |
| Runtime  | Node.js 22 (WebSocket nativo richiesto da Supabase) |
| Stato    | **DEPLOYING — fix avvio Node 22 (2026-08-12)**      |
| Config   | `fly.toml` nella root del repo                      |
| Scale    | scale-to-zero abilitato                             |

Il server si connette su WebSocket. Il monitor Colyseus è disabilitato di default; quando abilitato richiede Basic Auth (env `COLYSEUS_MONITOR_ENABLED`, `COLYSEUS_MONITOR_USER`, `COLYSEUS_MONITOR_PASSWORD`).

## Supabase

| Campo                       | Valore                                           |
| --------------------------- | ------------------------------------------------ |
| Stato                       | Credenziali configurate come Fly secrets         |
| `SUPABASE_URL`              | Fly secret — non nel codice                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Fly secret — non nel codice                      |
| Funzionalità live           | Auth/persistence disponibili con fallback locale |

Il client può usare Supabase auth anonima se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` sono definiti nel `.env` client-side. Non richiesto per il gameplay locale.

## Client (Cloudflare Pages)

| Campo | Valore                                |
| ----- | ------------------------------------- |
| Stato | **LIVE**                              |
| Build | `packages/client/dist/` (output Vite) |
| CDN   | Cloudflare Pages                      |
| URL   | `https://ragequit-5i6.pages.dev/`     |

In locale il client viene servito via `pnpm dev:client` (Vite su `localhost:5173`).

## Asset locali esistenti

Questi asset sono nel repo e NON vanno cercati o scaricati.
Per la lista completa vedi `01_DESIGN/10_tech_assets.md`.

| Path                                                                  | Contenuto                                                            |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/client/public/ui/ragequit-logo-full.webp`                   | Logo principale                                                      |
| `packages/client/public/ui/ragequit-logo-small.webp`                  | Logo small                                                           |
| `packages/client/public/icons-sprite.svg`                             | SVG sprite icone (~45 KB)                                            |
| `packages/client/public/arena/gladiators_arena.glb`                   | Arena 3D (~171 KB)                                                   |
| `packages/client/public/characters/UAL1_Standard.glb`                 | Animazioni (NON rimuovere)                                           |
| `packages/client/public/characters/{paladin,erika,vampire,ninja}.glb` | Modelli runtime delle quattro classi                                 |
| `packages/client/public/characters/*.gltf`                            | Asset modulari fallback/sorgente                                     |
| `packages/client/public/weapons/kaykit/sword.glb`                     | Spada (loader attivo; `sword_D.glb` è il vecchio modello, non usato) |
| `packages/client/public/weapons/kaykit/bow.glb`                       | Arco (loader attivo)                                                 |
| `packages/client/public/weapons/kaykit/staff.glb`                     | Bastone (loader attivo)                                              |
| `packages/client/public/weapons/kaykit/shield_A.glb`                  | Scudo fisico                                                         |
| `packages/client/public/arena/props/Torch_Metal.gltf`                 | Torcia arena                                                         |
| `packages/client/public/arena/props/barrel_large.gltf`                | Barile KayKit                                                        |
| `packages/client/public/vfx/vfx_*.png`                                | Texture VFX (RGBA bianco-su-trasparente)                             |
| `packages/client/public/ability-icons/*.png`                          | Icone 53 abilita                                                     |

**Loader attivo armi**: `packages/client/src/render/character-weapons.ts` carica
da `public/weapons/kaykit/*.glb`. I file `public/weapons/sword.glb`, `bow.glb`,
`staff.glb` legacy NON sono usati dal loader attivo.

## CI/CD (GitHub Actions)

- `pnpm check` + build su ogni push/PR.
- Push su `main` pubblica automaticamente server su Fly.io e client su
  Cloudflare Pages.
- Il client mostra lo stato reale del server interrogando `/health`.
- Il deploy server fallisce automaticamente se l'endpoint pubblico `/health`
  non risponde; in quel caso stampa stato e log Fly nel job GitHub.

## Comandi deploy

```bash
# Deploy server (richiede flyctl installato + login)
flyctl deploy

# Verifica stato
flyctl status --app ragequit-server

# Log live
flyctl logs --app ragequit-server

# Secrets (già configurati — solo per riferimento)
flyctl secrets list --app ragequit-server
```
