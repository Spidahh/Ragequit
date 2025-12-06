# RageQuit 2: Phoenix Protocol

Fast-paced first-person arena shooter with physics-based combat and spell casting. Inspired by Quake 3 Arena movement with fantasy spell mechanics.

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:5173

# Start multiplayer server (optional, separate terminal)
cd server
npm install
npm start
# Runs on http://localhost:3000
```

**First Run:**
1. Open http://localhost:5173
2. Enter any username → Click "PLAY"
3. Select "TRAINING" arena
4. Use WASD to move, mouse to look, number keys 1-6 to cast spells

## Documentation

**New Developer? Start here:**
- [`DOCUMENTATION_INDEX_CURRENT.md`](./DOCUMENTATION_INDEX_CURRENT.md) — Master documentation index
- [`GETTING_STARTED.md`](./GETTING_STARTED.md) — Detailed setup and first steps
- [`docs/Phoenix_Protocol/Technical_Architecture.md`](./docs/Phoenix_Protocol/Technical_Architecture.md) — System architecture

**Key References:**
- [`QUICK_START_CURRENT_STATE.md`](./QUICK_START_CURRENT_STATE.md) — Current game state overview
- [`src/data/SkillData.js`](./src/data/SkillData.js) — All spell definitions (damage, costs, effects)
- [`MASTER_PRELAUNCH_INDEX.md`](./MASTER_PRELAUNCH_INDEX.md) — Feature matrix and recent updates

## Project Structure

```
RageQuit-2/
├── src/
│   ├── core/          # Game loop, EventBus, Utils
│   ├── systems/       # MovementSystem, ComboSystem, CombatSystem
│   ├── combat/        # SkillManager, Projectile, CastingSystem
│   ├── managers/      # VFXManager, AudioManager, NetworkManager, etc.
│   ├── entities/      # Player, Enemy, BotPlayer
│   └── data/          # SkillData.js (spell definitions)
├── server/            # Multiplayer server (Socket.io)
├── css/               # UI styles
├── docs/              # Phoenix Protocol architecture docs
└── _archive/          # Legacy/historical code (not runtime)
```

## Architecture

**Component-Manager Pattern:**
- `Game.js` is the central hub, manages update loop
- Managers handle specific domains (VFX, Audio, Network, Skills)
- Systems handle gameplay logic (Movement, Combat, Combos)
- Communication via global `EventBus` for decoupling

**Key Systems Implemented (Dec 4, 2025):**
- ✅ Quake 3-style movement (rimbalzi/bounce physics, air control)
- ✅ 13 spells with projectile/hitscan/AoE mechanics
- ✅ Knockback physics with directional force
- ✅ Combo system (hit tracking, damage multipliers)
- ✅ VFX occlusion (reduce opacity near camera)
- ✅ Hit marker visual feedback (<100ms)
- ✅ Dash mechanic (3x speed burst)
- ✅ Network multiplayer with hitstop sync
- ✅ Audio feedback (critical hit sounds)

## Development

**Run Tests:**
```bash
npm run dev
# Open browser dev tools, check console for errors
# Use F12 → Console to see debug logs
```

**Build for Production:**
```bash
npm run build
# Output in dist/
```

**Deploy Server:**
See [`KOYEB_DEPLOYMENT.md`](./KOYEB_DEPLOYMENT.md) or [`DEPLOY_GUIDE.md`](./DEPLOY_GUIDE.md)

## Controls

**Movement:**
- WASD: Move
- Space: Jump
- Shift: Sprint
- Double-tap Sprint + WASD: Dash (3x speed burst)

**Combat:**
- 1-6: Cast spells (slot 1-6)
- R: Heal self
- Mouse: Look/aim

**UI:**
- Tab: Scoreboard
- Esc: Menu

## Game Modes

1. **Training** — Solo, static dummies, learn mechanics
2. **Monsters Slayer** — Survival waves, difficulty scaling
3. **Team Carnage** — Multiplayer PvP (requires server)

## Spell System

All spells defined in `src/data/SkillData.js`. Key properties:
- `damage`: Base damage value
- `mana`/`stamina`: Resource cost
- `cooldown`: Milliseconds between casts
- `knockbackForce`: Physics impulse magnitude
- `physics`: `LINEAR`, `PARABOLIC`, `HITSCAN`, or `INSTANT`
- `hitstop`: Freeze-frame duration on hit (0.03-0.15s)

**Example (Magic Bolt):**
```javascript
'magic_bolt': {
  damage: 8,
  mana: 6,
  cooldown: 350,
  speed: 80,
  knockbackForce: 10,
  physics: 'LINEAR',
  hitstop: 0.03
}
```

## Recent Updates (December 4, 2025)

**GDD Tuning Phase (7 systems):**
## Recent Updates (Dec 4, 2025)

- Movement: Quake 3-style air control (50%), landing bounce (rimbalzi) when downward velocity < -50, dash burst (3x speed, 150ms, 500ms cooldown)
- Combat: Hit marker feedback (<100ms), combo multiplier up to 1.75x at 20 hits, critical hit audio differentiation
- Spells: Mana/cooldown rebalanced (Magic Bolt 6 mana, Shockwave 18 mana, Fireball 22 mana, Impale 18 mana)
- Projectiles/VFX: Emissive glow + halo, near-camera occlusion fade to prevent blocking view
- UI/HUD: Cooldown countdown with pulse animation, clearer resource bars
- Net/Code cleanup: Removed legacy `handleRemoteAttack`, fixed stray code fence in `VFXManager.js`

## Gameplay Systems (Detailed)

- Movement System: Ground vs air acceleration split, sprint and dash stacking rules, friction tuned for slide feel, jump apex smoothing.
- Combat System: Damage, knockback, hitstop (0.03–0.15s) applied based on impact, combo tracking 1–20 with scaling multiplier, crit detection path uses hit angle + speed.
- Casting/Channeling: Input-buffered casting with stance checks, channel breaks on heavy knockback, cooldown registry drives HUD timers.
- Projectile System: Types include linear, parabolic, hitscan; lifetime, gravity, and collision via spatial grid; emissive materials + billboard halo for visibility.
- AoE & Explosions: Shockwave/Begone apply radial falloff, impulse added to physics controller; VFX spawned with occlusion-aware fade near camera.
- Resource System: Health/Mana/Stamina tick each frame; regen rules per stance; overcast prevention when insufficient mana.
- Enemies/Bots: Waves increment difficulty, knockback interacts with navigation; Healing Totem provides area regen objective.

## Quality of Life Improvements

- Instant hit markers with color-coded crits (red/yellow).
- HUD cooldown countdown and pulse when ready.
- Clear audio cues per spell and distinct crit sound.
- VFX occlusion prevents near-camera blinding flashes.
- Projectile glow improves visibility across arenas.
- Input buffering reduces feel of input lag during intense combat.
- Documentation: Canonical index (`DOCUMENTATION_INDEX_CURRENT.md`), archival docs moved to `_archive/`.

## Game Vision

Leggi `docs/Game_Vision.md` per la visione completa del gioco: identità, loop del giocatore, modello di combattimento/fisica, tassonomia delle spell, mappa dei sistemi, pilastri UX/HUD/Audio, modalità e filosofia di tuning.

### Vision TL;DR (per onboarding rapido)
- Identità: arena shooter fantasy veloce, fisica leggibile, knockback centrale.
- Loop: muovi → ingaggia → conferma → capitalizza → resetta.
- Combattimento: danno+knockback con hitstop breve, combo fino a 1.75x, crit coerenti.
- Spell: ruoli chiari (poke/control/burst/finisher/aoe/sustain) e costi significativi.
- Sistemi: Movement/Combat/Casting/Projectile/Resource con managers VFX/Audio/HUD/Enemy/Map.
- UX: leggibilità prima di tutto (occlusione VFX, glow proiettili, marker/sonoro immediato).
3. Changes to spell balance: edit `src/data/SkillData.js` only
4. New features: follow Component-Manager pattern, use EventBus for communication

## License

Private project. All rights reserved.

## Credits

Built with:
- Three.js (3D rendering)
- Socket.io (multiplayer networking)
- Vite (build tool)
