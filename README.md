# RageQuit

Experimental 3D multiplayer arena with magic combat and team mechanics.

## Hotkeys
- Q: Switch to Melee / Whirlwind if already in Melee
- E: Equip Bow
- 1: Bolt
- 2: Begone
- 3: Fireball
- 4: Impale
- R: Heal (self)
- 5: Heal Other (aim center on a player)
- F: Stamina → HP (conversion channel)
- X: HP → Mana (conversion channel)
- C: Mana → Stamina (conversion channel)
- Ctrl: Free Look (release pointer lock while held)

## Heal Other
- Costs 10 mana, heals target for 20 HP.
- Visuals: green rings around the target, short green light aura, heal sound.
- Server clamps HP to target max; authoritative update via Socket.IO.

## Fixes & Improvements
- Stamina→HP transfer applies in safe ticks with clamping (no sudden full heal).
- Melee third-person crosshair kept horizon-aligned.
- UI strings translated to English (index, menus, labels, messages).

## Run
```powershell
npm install
node server.js
```
Open `http://localhost:3000` in the browser.
