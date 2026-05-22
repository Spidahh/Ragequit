---
id: resolved_ambiguities
title: Resolved Ambiguities
section: meta
tags: [decisions, history, changelog]
provides: [ambiguity_resolutions]
deps: []
status: current
---

# Resolved Ambiguities

Original design docs in `01_Master_Bible/` contained several ambiguous or contradictory points. Each is resolved here against the new system (`2026-04-22` rebuild).

## 1. Healing Totem overheal behavior

**Original**: Not specified whether Healing Totem's ticks could exceed target max HP.
**Resolved**: Totem healing **stops at target max HP**. No overheal shield, no banked healing. Wasted healing beyond full HP is simply lost.
**Why**: Keeps healing math readable. An overheal shield would have been a hidden second HP bar and a debuggability nightmare.
**Reference**: `05_abilities_magic.md` — Nature section, N4.

## 2. Ordine applicazione crit × Element Mastery

**Original**: Unclear whether Mastery bonus applies before or after crit multiplier.
**Resolved**: Order is `base → Mastery % → crit × → mitigation → final`. Mastery is applied first (as a base-damage modifier), crit multiplies the already-Mastery-boosted value.
**Why**: Keeps both bonuses meaningful. Crit after Mastery makes crits more rewarding for specialists (good thing).
**Reference**: `03_mastery_system.md` — "Stacking order".

## 3. Bow charge: projectile trajectory or hitscan?

**Original**: Contradictory signals in design doc.
**Resolved**: **Bow M1 is a projectile with mild gravity arc**, not hitscan. `Marksman Shot` is a 500 m/s precision projectile with 1.0s windup and no gravity (gravityMps2: 0), distinct from the M1 arc trajectory. At 30 m distance, travel time ≈ 0.06 s.
**Why**: Projectile preserves skill expression (leading targets) and matches the "meritocracy, no auto-aim" pillar. Keeping Marksman in the projectile pipeline also keeps cover, collision, parry, and server validation consistent.
**Reference**: `02_weapon_bow.md`, `05_abilities_bow.md` — B5.

## 4. Status effect icon layout

**Original**: No specification of where status icons appear on the player or HUD.
**Resolved**: Status effects (buffs/debuffs) appear as **small icon row above the target's health bar** (other players) and as a **right-of-crosshair strip** (your own). Max 4 visible; if more, a "+N" overflow icon. Icon shows remaining duration with a pie-chart overlay.
**Why**: Keeps HUD clean while surfacing critical info. Position-above-healthbar is the established convention (RL2, Overwatch, Dota pattern).
**Reference**: `09_visual.md` — HUD section.

## 5. Guest mode — "Mandatory Phase 3" vs "Not Implemented"

**Original**: Two docs disagreed.
**Resolved**: **Guest/local entry is the target low-friction path**, but account/guest persistence is not implemented in the current local build. Launch target: guests can play Training and FFA 10; Ranked and 5v5 Team require account identity for ELO persistence.
**Why**: Low-friction entry, but rank-competitive modes need identity to prevent smurf exploits.
**Reference**: `00_player_journey.md` — login flow.

## 6. Party system — "design complete but not implemented"

**Original**: Design spec existed but marked as "Not Implemented".
**Resolved**: **Party system is a launch target**, not current local functionality: 5v5 supports parties up to 5, FFA supports duo, 1v1 Ranked stays solo-only. Party queue should be separate from solo queue to prevent party stomp.
**Why**: Team game needs party. Solo-only at launch would cripple the 5v5 experience.
**Reference**: `07_modes.md` — Matchmaking rules section.

## 7. Dodge mechanic — listed in original

**Original**: 0.3s iframe dodge with 1s CD, 20 stamina cost.
**Resolved**: **Default iframe roll removed**. The 2026-05-22 arena-FPS
redesign keeps evasive play active through movement, aim denial and abilities;
parry is not allowed to become the only meaningful answer by assumption.
**Why**: Francesco rejected passive airborne lockouts and wants an active arena
combat feel where movement/spells can create dodge tech.
**Reference**: `00_pillars.md` — anti-patterns; `01_controls.md` — removed mechanics.

## 8. Shift sprint — listed in original

**Original**: Shift-hold sprint at 13.5 m/s, costs 5 stam/s.
**Resolved**: **SPRINT IS DEFAULT** (always-on). Shift is unbound. Base move speed = the former sprint speed (9.0 m/s).
**Why**: Francesco's decision. Sprint-as-resource created tedious gameplay; always-on sprint keeps pace high without a pointless toggle.
**Reference**: `01_stats.md` — Movement.

## 9. Element Pentagon counter (considered, rejected)

**Original**: Earlier design iterations considered a rock-paper-scissors counter between the 5 elements.
**Resolved**: **NO PENTAGON COUNTER**. Elements are differentiated by _effect_ (burn / slow / chain / lifesteal / DoT), not by counter-relationships. No element is stronger or weaker against any other on principle.
**Why**: Counter systems create unfair matchups decided at loadout-lock. A Fire build should never lose to an Ice build just because of matchup math.
**Reference**: `03_mastery_system.md` — "No pentagon counter"; `00_pillars.md` — rules.

## 10. Class system (considered, rejected)

**Original**: Earlier iterations considered classes (Knight, Mage, Archer) with different weapon access.
**Resolved 2026-04-22**: the first vertical slice was **CLASSLESS**.
**Superseded 2026-05-22**: target design now uses Tank, Arciere, Mago and
Ibrido with real slot/resource/mechanic differences. Current runtime still
contains the classless slice until the redesign is implemented.
**Why superseded**: the developer wants stronger identity and more interesting
combat grammars than the old same-loadout skeleton.
**Reference**: `00_classes.md`; `00_pillars.md`; `06_loadout_build.md`.

## 11. Tank/Glass-cannon/Balanced axis

**Original**: Not in original docs — considered during redesign conversation.
**Resolved 2026-04-22**: the classless slice used identical HP/Mana/Stamina.
**Superseded 2026-05-22**: target classes now have different HP/Mana/Stamina
starting pools and different mechanics while preserving 11 total slots per
class. Do not read the old classless stat rule as the target balance contract.
**Why superseded**: the approved class redesign needs resource emphasis to make
Tank, Arciere, Mago and Ibrido play differently before ability picks.
**Reference**: `00_classes.md`; `01_stats.md`.

## 12. TTK numeric value

**Original**: Not specified numerically.
**Resolved**: **TTK 20-30 seconds** full-HP duel. All damage/CD/cost values tuned against this window.
**Why**: Francesco's target. Long TTK makes positioning, parry, movement, sustain
decisions and combos all meaningful. Short TTK would make them optional or
skippable.
**Reference**: `01_combat_fundamentals.md` — TTK.

## 13. Season pass

**Original**: Some docs referenced a season pass progression.
**Resolved**: **NO SEASON PASS**. Progression is through quests + ELO only.
**Why**: Season pass creates FOMO and is incompatible with the "earn through play, not calendar" philosophy.
**Reference**: `00_pillars.md`; `08_progression.md`.

## 14. Art direction

**Original**: Not pinned — generic "stylized 3D".
**Resolved**: **Low-poly stylized, Risk of Rain 2 direction**. Current strategy starts from the local asset library and runtime inventory first; external free sources such as Kenney.nl and Quaternius are candidate lanes only when they preserve the chosen visual system and license bar.
**Why**: The game needs one coherent browser-light system, not random pack mixing. Local assets already in hand must be audited before external replacement lanes.
**Reference**: `09_visual.md`; `10_tech_assets.md`.

---

_Resolved in coherence pass 2026-05-22:_

## 15. Stamina regen quando fermo in combat

**Original**: `01_stats.md` diceva "5/s (moving)" in combat senza specificare il regen da fermo.
**Resolved**: In combat, Stamina regen è **5/s se WASD premuto, 0/s se fermo**. Fuori combat è 10/s senza condizioni di movimento.
**Why**: La stamina è una risorsa di ritmo. La regen a 0 da fermo in combat scoraggia il camping e premia la pressione aggressiva.
**Reference**: `01_stats.md` — Resources table.

## 16. Transmutation: penalità 30:20 e GCD

**Original**: La ratio 30:20 di Stamina→HP non era motivata. Non era specificato se la trasmutazione attivava il GCD.
**Resolved**: (a) La penalità 30:20 **è intenzionale** per impedire il ciclo infinito Stamina→HP sfruttando il regen rapido di Stamina. (b) La trasmutazione **NON attiva il GCD** da 0.3 s — solo i combat ability slot lo fanno. (c) Una conversione fallita per risorse insufficienti **non attiva il cooldown** della direzione.
**Reference**: `04_transmutation.md` — Activation rules; `01_combat_fundamentals.md` — GCD.

## 17. Utility: 11 abilità nel pool, 4 slot per loadout

**Original**: La tabella in `05_abilities_philosophy.md` diceva "Utility: 11 / 3 fixed transfer slots + 1 flex utility slot" in modo ambiguo, sembrando 11 slot.
**Resolved**: Ci sono **11 abilità utility in totale** (3 fixed transfers + 8 flex pool), ma ogni loadout ha **4 slot utility** (3 fissi + 1 flex pick). Il conteggio 52 abilità è corretto: conta il pool completo, non gli slot.
**Reference**: `05_abilities_philosophy.md` — Ability count table; `MANIFEST.yaml` — ability_slots_per_loadout.

## 18. Broadhead Bleed: cleansabile come Bleed Strike

**Original**: `05_abilities_bow.md` non specificava se il Bleed di Broadhead fosse cleansabile dalla trasmutazione.
**Resolved**: **Tutti i Bleed sources** (Bleed Strike melee, Broadhead bow, Rending Dash melee) sono cleansati da qualsiasi cast di trasmutazione. La regola è universale per tutti gli status di tipo Bleed.
**Reference**: `05_abilities_bow.md` — B7; `05_abilities_melee.md` — M4, M6.

## 19. Mark Target: il drain è sul TARGET

**Original**: `05_abilities_utility.md` diceva "12 stamina drain" senza specificare chi perdeva la Stamina.
**Resolved**: Il drain di Mark Target riduce la **Stamina del TARGET nemico** (resource-deny), non del caster. Stessa regola per tutte le abilità drain (Life Drain, Void Spike, Curse of Weakness).
**Reference**: `05_abilities_utility.md` — F3, Key design choices.

## 20. Marksman Shot: è projectile, non hitscan

**Original**: La descrizione "near-instant" suggeriva hitscan.
**Resolved**: Marksman Shot è un **projectile a 500 m/s, senza gravity arc** (gravityMps2: 0) — a 30 m di distanza impiega ~0.06 s di viaggio. Non è hitscan. Passa per il pipeline projectile server-side per garantire coerenza su copertura, collisione e validazione.
**Reference**: `05_abilities_bow.md` — B5; `99_resolved_ambiguities.md` #3.

## 21. Auto-swap weapon: sequenza per instant vs preview

**Original**: `01_controls.md` usava "atomic in the same input frame" E "before opening placement preview" nella stessa frase, risultando contraddittorio.
**Resolved**: Il weapon swap avviene **sempre prima** del cast o del preview. Per instant abilities il swap è nello stesso tick server (imperceptible). Per preview abilities il swap completa, poi appare il preview; M1 conferma.
**Reference**: `01_controls.md` — Auto-swap on direct ability use.

## 22. Placement preview timing sul wheel

**Original**: Non specificato se il preview appare al rilascio del tasto wheel o alla prima pressione di M1.
**Resolved**: Rilasciare Q/E **primes** l'abilità ma **non mostra il preview**. Il preview appare alla **prima pressione di M1** dopo il prime. Una seconda M1 conferma il cast. Per direct hotkeys il preview appare immediatamente al keypress (nessun prime step).
**Reference**: `01_controls.md` — Wheels interaction model.

## 23. 09_visual.md vs 15_visual_strategy.md: palette conflict

**Original**: `09_visual.md` aveva token colore di ambiente diversi da `15_visual_strategy.md` (es. `#2A2A35` vs `#080B12` per background).
**Resolved**: `15_visual_strategy.md` è la fonte autoritativa per il design system e i token colore specifici. `09_visual.md` è la direzione artistica fondazionale; dove i due conflittano, `15_visual_strategy.md` vince.
**Reference**: `09_visual.md` header note; `15_visual_strategy.md` §4.

---

_Resolved in coherence pass 2026-05-22 (round 2):_

## 24. ComboRole duplicati: Curse of Weakness, Void Spike, Mark Target

**Original**: La tabella comboRole in `05_abilities_philosophy.md` assegnava Curse of Weakness e Mark Target a DUE ruoli ciascuno (Ray + Drain), e Void Spike [KNOCKUP] era sotto Drain invece di Starter. Il registry richiede un solo ruolo per ability.
**Resolved**:

- **Curse of Weakness** → `Starter` (windup 0.35s — non è istantaneo come richiesto da Ray; il suo valore dominante è aprire una finestra combo tramite Blind 2.4s. Il drain di mana è un effetto secondario, non il ruolo)
- **Void Spike** [KNOCKUP] → `Starter` (knockup launcher; ha anche un resourceDrain: mana secondario ma il ruolo dominante è aprire combo)
- **Mark Target** → `Drain` (il suo valore strategico dominante è la Stamina-deny sul target)
  **Reference**: `05_abilities_philosophy.md` — Combo Combat 2.0 table.

## 25. RNG nelle M1 infusion di Lightning (Sword, Bow)

**Original**: `02_weapon_sword.md` e `02_weapon_bow.md` avevano "20% chance" per la chain Lightning nel M1 infusion design target — violando il pilastro "No RNG in ability output".
**Resolved**: Le chance percentuali sono state sostituite con condizioni deterministiche:

- Sword Lightning: arc every 3rd combo hit (swing 3) — combo-gated
- Bow Lightning: arc on full-charge hit (≥2.0 s draw) — charge-gated
- Staff Lightning: always chains (unchanged) — mana cost già lo bilancia
  **Reference**: `00_pillars.md` — anti-patterns; `02_weapon_sword.md`, `02_weapon_bow.md`.

## 26. Healing Totem: channel break mai specificato

**Original**: Life Drain specifica che il canale si rompe con incoming damage. N4 Healing Totem non specificava questo comportamento.
**Resolved**: Healing Totem **NON si rompe** con incoming damage. La recovery di 8 HP/s continua per 5s completi. Il vantaggio dell'avversario è che può outdamageare il regen (>8 DPS), ma non interrompere il canale.
**Reference**: `05_abilities_magic.md` — N4.

## 27. Talent tree vs "Differentiation via loadout exclusively"

**Original**: `00_pillars.md` diceva "Differentiation is via loadout exclusively" ma `08_progression.md` ha un talent tree con modifiche numeriche.
**Resolved**: Il pilastro è stato aggiornato a "primarily via loadout". I talent (~5-10% tweaks) sono un layer opzionale minore nel progression target — non ridefiniscono build né creano un asse di potere.
**Reference**: `00_pillars.md`; `08_progression.md`.

## 28. TTK: 20-30s è TTK reale, non minimo teorico

**Original**: Il TTK 20-30s era descritto senza distinguere tra danno teorico massimo e danno reale in combattimento difeso.
**Resolved**: Il TTK 20-30s è la finestra **in gioco reale** (difesa attiva: parry, movimento, trasmutazione). Il minimo teorico M1-only è ~11s per Sword (17.5 DPS vs 200 HP), ma in pratica nessun giocatore riceve tutti i colpi senza parry/evasione.
**Reference**: `01_combat_fundamentals.md` — TTK.

## 29. Healing Potion (F1): comportamento durante movimento

**Original**: "Restore 40 HP over 2 s while moving" — non specificato cosa succede se il giocatore si ferma.
**Resolved (design intent)**: Il tick di healing si **pausa** se il giocatore è fermo e **riprende** al movimento successivo. Il remaining heal non viene perso. Nota: l'ability si chiama "Healing Potion" nel registry (non "Self-Heal Potion").
**Current server behavior**: Il canale heala incondizionatamente — la pausa-su-fermo è un **design target non ancora implementato** nel server (manca la logica stationary-check in `AbilityEngine.ts`).
**Reference**: `05_abilities_utility.md` — F1; `packages/shared/src/abilities/registry.ts` — U1.

## 30. Specifiche mancanti in 4 abilità

**Original**: Lightning Dash, Mark Target, Smoke Screen senza range; Self-Heal Potion senza comportamento su fermo.
**Resolved**:

- Lightning Dash: Range 5 m (esplicitato nel bullet Range)
- Mark Target: Range 30 m (il registry aveva già 30; il doc l'ha documentato erroneamente come 25 — corretto al valore reale del registry)
- Smoke Screen: 3 m radius, 6 m forward, 4 s duration, blind 0.3 s ogni 0.5 s (aggiunto)
- Self-Heal Potion: pausa su fermo, riprende su movimento (aggiunto)
  **Reference**: `05_abilities_magic.md` — L4; `05_abilities_utility.md` — F1, F3, F8.

---

_Resolved in code-vs-doc verification pass 2026-05-22 (round 3):_

## 31. Curse of Weakness: comboRole 'drain' → 'starter' nel registry

**Original**: Il registry aveva `comboRole: 'drain'` per Curse of Weakness. La risoluzione #24 aveva corretto la tabella nel doc ma non l'entry nel codice.
**Resolved**: `ABILITY_D2_CURSE_OF_WEAKNESS.comboRole` aggiornato da `'drain'` a `'starter'` nel registry. Void Spike era già corretto a `'starter'`, Mark Target già a `'drain'`.
**Reference**: `packages/shared/src/abilities/registry.ts` — D2.

## 32. AbilityComboRole: 10 valori nel codice, 6 nella design table

**Original**: La tabella dei ruoli in `05_abilities_philosophy.md` documentava 6 ruoli (Starter, Extender, Finisher, Ray, Survival/Counter, Drain). Il type `AbilityComboRole` in `types.ts` aveva 10 valori: anche `pressure`, `survival`, `counter`, `mobility`, `resource` (con Survival/Counter separati in due).
**Resolved**: La tabella è stata espansa a 10 righe con code value, purpose ed esempi per tutti i valori. "Survival / Counter" è ora documentata come due ruoli distinti: `survival` (difesa passiva) e `counter` (risposta attiva).
**Reference**: `05_abilities_philosophy.md` — Combo Combat 2.0 table; `packages/shared/src/abilities/types.ts` — AbilityComboRole.

## 33. Curse of Weakness: windupSec 0.35 s, non 1.2 s

**Original**: La nota in #24 citava "1.2 s cast" come giustificazione per escludere CoW dal ruolo Ray. Il valore reale nel registry è `windupSec: 0.35`.
**Resolved**: Il doc aggiornato ora cita correttamente "windupSec 0.35 s (not instant, so fails the Ray ≡ windupSec:0 definition)". L'assegnazione a `starter` rimane corretta indipendentemente dal valore preciso del windup.
**Reference**: `05_abilities_philosophy.md` — assignment rationale; `packages/shared/src/abilities/registry.ts` — D2.

## 34. Marksman Shot: 500 m/s (non 300), danno 38 (non 32), no gravity arc

**Original**: Il doc diceva "300 m/s fast-travel projectile" e "Damage: 32". Il registry riporta `speedMps: 500`, `damage: 38`, `gravityMps2: 0`.
**Resolved**: Aggiornati `05_abilities_bow.md` (B5) e le note in #3/#20. Marksman Shot è 500 m/s senza arc di gravità. Il M1 bow (non un ability) ha la mild gravity arc.
**Reference**: `05_abilities_bow.md` — B5; `packages/shared/src/abilities/registry.ts` — B5.

## 35. Healing Potion: nome "Healing Potion" nel registry (non "Self-Heal Potion")

**Original**: Il doc utility usava "Self-Heal Potion" come nome per F1. Il registry ha `name: 'Healing Potion'` e `id: 'self_heal'`.
**Resolved**: Aggiornato a "Healing Potion" nel doc. Ambiguità #29 aggiornata di conseguenza.
**Reference**: `05_abilities_utility.md` — F1; `packages/shared/src/abilities/registry.ts` — U1.

## 36. Mark Target: id nel registry è 'ping_mark' (costante ABILITY_U3_PING_MARK)

**Original**: Il design doc chiama l'abilità "Mark Target". Il registry la definisce come `ABILITY_U3_PING_MARK` con `id: 'ping_mark'` ma `name: 'Mark Target'` (il nome display è corretto). Nessun impatto sul gameplay — solo naming interno.
**Resolved**: Non è richiesto nessun fix funzionale. Il display name "Mark Target" è corretto. Il dev ID `ping_mark` è un dettaglio implementativo; non va sincronizzato.
**Reference**: `packages/shared/src/abilities/registry.ts` — line 1178.
