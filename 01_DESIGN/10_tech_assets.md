---
id: tech_assets
title: Asset Contract
section: tech
tags: [assets, runtime]
provides: [runtime_assets]
deps: []
status: current
---

# Asset Contract

## Sorgente Asset (fuori dal repo)

I nuovi asset grafici si prendono SEMPRE da `E:\GIOCHI\ASSET_GRAFICA`, poi si copiano
in `packages/client/public/`. Sottocartelle:
`PARTICELLE/` (VFX Kenney), `PERSONAGGI/` (modelli), `icone/` (sprite abilita),
`menu/` (logo/classi), e **`mappe/`** — arene e moduli per costruire le mappe
(`gladiators_arena.glb`, KayKit Dungeon, Fantasy Props MegaKit, modular village,
moduli prototyping). Per nuove arene comporre da `mappe/`, non procedurale.

## Runtime Assets

Tutti gli asset in `packages/client/public/` devono essere usati dal codice runtime.

### Characters (GLTF + BIN — NON .glb)

| Path | Contenuto |
|---|---|
| `public/characters/UAL1_Standard.glb` | Animazioni universali (NON rimuovere) |
| `public/characters/Superhero_Male_FullBody.gltf` | Body base maschio (Tank, Mago) |
| `public/characters/Superhero_Female_FullBody.gltf` | Body base femmina (Arciere, Ibrido) |
| `public/characters/Male_Ranger.gltf` | Outfit armatura ranger maschio (Tank) |
| `public/characters/Female_Ranger.gltf` | Outfit armatura ranger femmina (Arciere) |
| `public/characters/Male_Peasant.gltf` | Outfit tunica maschio (Mago) |
| `public/characters/Female_Peasant.gltf` | Outfit vestito femmina (Ibrido) |
| `public/characters/Male_Ranger_Head_Hood.gltf` | Cappuccio corazzato (Tank) |
| `public/characters/Female_Ranger_Head_Hood.gltf` | Cappuccio cacciatrice (Arciere) |
| `public/characters/Male_Ranger_Acc_Pauldron.gltf` | Spallacci pesanti (Tank) |
| `public/characters/Hair_Long.gltf` | Capelli lunghi (Mago) |
| `public/characters/Hair_Buns.gltf` | Capelli buns (variante) |
| `public/characters/Hair_Buzzed.gltf` | Capelli corti (variante) |
| `public/characters/Hair_SimpleParted.gltf` | Capelli ordinati (Ibrido) |

**Regola**: NON convertire i personaggi in .glb — le texture embedded producono file 15-40 MB ciascuno.

### Weapons (GLB — un file unico)

| Path | Contenuto | Loader |
|---|---|---|
| `public/weapons/kaykit/sword.glb` | Spada slim (attivo; `sword_D.glb` vecchio, non usato) | `character-weapons.ts` |
| `public/weapons/kaykit/bow.glb` | Arco (attivo) | `character-weapons.ts` |
| `public/weapons/kaykit/staff.glb` | Bastone (attivo) | `character-weapons.ts` |
| `public/weapons/kaykit/shield_A.glb` | Scudo fisico (attivo) | `character-weapons.ts` |

I file `public/weapons/sword.glb`, `bow.glb`, `staff.glb` esistono ma NON sono usati dal loader attivo.

### Arena

| Path | Contenuto |
|---|---|
| `public/arena/gladiators_arena.glb` | Mappa Gladiators Arena (168 KB) |
| `public/arena/props/Torch_Metal.gltf` + `.bin` | Torcia metallica (ai pilastri) |
| `public/arena/props/Lantern_Wall.gltf` + `.bin` | Lanterna da parete |
| `public/arena/props/barrel_large.gltf` + `.bin` | Barile grande KayKit |
| `public/arena/props/barrel_small.gltf` + `.bin` | Barile piccolo KayKit |
| `public/arena/props/box_large.gltf` + `.bin` | Cassa grande KayKit |
| `public/arena/props/banner_patternA_red.gltf` + `.bin` | Stendardo rosso KayKit |
| `public/arena/props/Banner_1.gltf` + `.bin` | Stendardo legacy (usato come fallback) |
| `public/arena/props/Barrel.gltf` + `.bin` | Barile legacy (usato come fallback) |
| `public/arena/props/Crate_Wooden.gltf` + `.bin` | Cassa legacy (usato come fallback) |
| `public/arena/props/dungeon_texture.png` | Texture KayKit dungeon |
| `public/arena/props/T_Trim_Metal_BaseColor.png` | Texture torch/lantern |
| `public/arena/props/T_Trim_Metal_Normal.png` | Normal map torch/lantern |
| `public/arena/props/T_Trim_Metal_ORM.png` | ORM map torch/lantern |

### VFX Textures

Tutte le texture VFX devono essere RGBA bianco-su-trasparente.
Sorgente: Kenney Particle Pack CC0 (transparent PNG), convertite con boost luminanza.

| Path | Kenney source | Uso |
|---|---|---|
| `public/vfx/vfx_fire.png` | flame_04.png | Proiettili fire, impact pool glow |
| `public/vfx/vfx_slash.png` | slash_01.png | Swing arc melee |
| `public/vfx/vfx_ice.png` | star_04.png | Proiettili ice |
| `public/vfx/vfx_lightning.png` | spark_04.png | Proiettili lightning, spark alias |
| `public/vfx/vfx_dark.png` | circle_04.png | Dark shockwave, ring alias |
| `public/vfx/vfx_nature.png` | magic_03.png | Proiettili nature, zone floor |
| `public/vfx/vfx_shield.png` | circle_05.png | Shield zone, barrier VFX |

### UI

| Path | Contenuto |
|---|---|
| `public/ui/ragequit-logo-full.png` | Logo principale |
| `public/ui/ragequit-logo-small.png` | Favicon / logo small |
| `public/ui/sfondo.png` | Sfondo menu |
| `public/ui/classes/archer.png` | Immagine classe Arciere |
| `public/ui/classes/mage.png` | Immagine classe Mago |
| `public/ui/classes/tank.png` | Immagine classe Tank |
| `public/ui/classes/hybrid.png` | Immagine classe Ibrido |
| `public/icons-sprite.svg` | SVG sprite icone UI |

### Ability Icons

53 PNG in `public/ability-icons/<ability_id>.png`. Un file per ability.
Dimensioni ~170x168 RGBA. Sorgente: generati custom per RAGEQUIT.

Nota: 104 sprite alternativi esistono in `E:\GIOCHI\ASSET_GRAFICA\icone\sprite_XXXX.png`
ma non hanno ancora una mappatura ability_id → sprite numero.

## Rules

- Non aggiungere asset non usati dal codice runtime.
- Non aggiungere foto scaricate o immagini generate non approvate.
- Logo/menu/loadout UI asset devono stare in `public/ui/`.
- Texture VFX devono stare in `public/vfx/` e essere RGBA bianco-su-trasparente.
- Armi devono stare in `public/weapons/kaykit/` come `.glb`.
- Personaggi devono stare in `public/characters/` come `.gltf` + `.bin`.
