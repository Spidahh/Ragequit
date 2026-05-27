# RAGEQUIT — Graphic State

Questo documento non e un audit storico. Descrive il visual runtime vivo.

## Stato Vivo

- Il menu usa `packages/client/public/ui/sfondo.png`.
- Il logo usa `packages/client/public/ui/ragequit-logo-full.png`.
- La scena menu usa `#bg-canvas` con arena 3D animata.
- Il CSS UI vivo e solo `packages/client/public/game-ui.css`.
- Non esistono layer CSS separati per override UI.
- Il Loadout Forge usa pannelli separati `#ls-magic-base` e
  `#ls-magic-advanced`.

## Regole

- Niente nuovi layer CSS.
- Niente override grafici separati.
- Niente menu in stile pagina HTML.
- UI e VFX devono restare leggibili durante aim, proiettili, parry, cast e
  movement.
