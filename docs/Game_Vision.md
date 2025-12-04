# RageQuit 2 — Game Vision

Purpose: Communicate the entire vision — identity, loops, systems, and philosophy — so any developer can reason and build as if they were the creator.

## Core Identity
- Arena shooter fantasy ad alta velocità con fisica leggibile (Quake 3 feel).
- Ritmo: controllo dello spazio tramite movimento e knockback; spell come punteggiatura.
- Feedback: ogni azione confermata da visual/audio/hitstop; mira la sensazione prima dei numeri.

## Player Loop
- Ingaggio → Scambio → Conferma → Capitalizzazione → Reset.
- Muoviti per creare angoli; usa spell per aprire finestre; conferma con marker/audio; capitalizza con burst o controllo; ripristina risorse e posizione.

## Combat & Physics
- Movimento: ground/air accel, dash 3x 150ms (500ms CD), friction per slide, rimbalzi su landing forte.
- Danni: base + crit su angolo/speed; hitstop 0.03–0.15s; combo 1–20 con moltiplicatore fino a 1.75x.
- Knockback: linguaggio tattico; disallinea, apre linee di tiro, decide il ritmo.
- Tempo: cooldowns corti/medi; channel interrompibile su impatti pesanti.

## Spell Taxonomy
- Tipi: LINEAR, PARABOLIC, HITSCAN, INSTANT/AoE.
- Ruoli: poke/tempo (Bolt), control (Shockwave), burst (Fireball), finisher/range (Impale), melee (Heavy/Whirlwind), macro (Begone), sustain (Heal/Totem).
- Economia: costi/risorse che rendono interessanti le scelte.

## Systems & Responsibilities
- Systems: Movement, Combat, Casting/Channeling/Stance, Projectile, Resource.
- Managers: Skill, VFX, Audio, HUD, Enemy/Bot, Map/Objective; EventBus come tessuto connettivo.

## UX/HUD/Audio Pillars
- Leggibilità: occlusione VFX vicino camera; glow per proiettili; colori coerenti.
- Immediatezza: marker critici a colori, suoni distinti; readiness in HUD.
- Coerenza: firme visive/sonore per imparare il linguaggio a ritmo alto.

## Modes & Pacing
- Training: padronanza controllata.
- Monsters Slayer: stress test di ritmo/economia/controllo spazio.
- Team Carnage: macro-gestione arena e obiettivo centrale.

## Tuning Philosophy
- Feel > numeri; leggibilità > complessità; rischio/ricompensa chiaro; punteggiatura degli eventi.

## Uniqueness
- Non solo potenza: è controllo del ritmo, micro e macro.
- Il giocatore orchestra: posizioni, tempi, sequenze, non solo mira.

---

References
- `README.md` (architettura e quick start)
- `DOCUMENTATION_INDEX_CURRENT.md` (indice canonico)
- `COMBAT_BALANCE_DOCUMENTATION.md` & `src/data/SkillData.js` (bilanciamento)
- `PHYSICS_TESTING_GUIDE.md` (verifica fisica)