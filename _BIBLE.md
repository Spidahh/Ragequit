# 🩸 RAGEQUIT 2: THE PVP BIBLE
> **Identity**: Competitive Arena Shooter.
> **Formula**: 50% Quake Movement + 50% RPG Builds.
> **Motto**: "Kill Fast, Die Faster."

## [cite_start]1. PREDATORY MOVEMENT (The Engine) [cite: 3, 5, 78]
Il movimento è l'arma principale.
- **Physics**: Gravità estrema (-30). Si cade veloci per schivare e sparare.
- **Trazione**: A terra l'attrito è infinito (cambio direzione istantaneo).
- **Air Control**: In aria l'attrito è zero. Permette "Air Strafing" e correzioni di rotta.
- **Tech**: Rocket Jump e Bunny Hopping sono feature, non bug.

## [cite_start]2. THE KILLING TOOLS (10-Slot Inventory) [cite: 8, 9]
L'inventario è la "War Room". Si configura prima del respawn o premendo `B`.
- **SLOT 1: MELEE (TPS Mode)**: L'arma "Panic Button". Tasto Destro = Parry.
- **SLOT 2: RANGED (TPS Mode)**: Precisione hitscan (Arco/Rail). No Mana.
- **SLOT 3-6: MAGIC CORE (FPS Mode)**: Il burst damage. Consuma Mana.
- **SLOT 7-10: UTILITY (LOCKED)**: Heal, Transmute, Dash. Fissi per tutti.

## [cite_start]3. HYBRID PERSPECTIVE (Dynamic Camera & Rendering) [cite: 21]
Il rendering cambia drasticamente in base alla modalità:
- **FPS MODE (Aggression)**: Attivata da tasti **1-6**.
  - **Camera**: Nella testa.
  - **Visual**: **VIEWMODEL ONLY**. Il giocatore vede solo le proprie braccia e l'arma fluttuante (dettagliata). Il corpo è invisibile per non ostruire la visuale.
  - **Gameplay**: Instant Cast (Twitch reaction).
- **TPS MODE (Awareness)**: Attivata da **Q** (Melee) o **C** (Ranged).
  - **Camera**: Dietro le spalle (SpringArm).
  - **Visual**: **WORLDMODEL FULL**. Il giocatore vede il proprio avatar completo, la skin scelta, l'armatura e l'arma impugnata/infoderata.
  - **Gameplay**: Animazioni visibili (Swing, Block).

## [cite_start]4. COMBAT FEEDBACK (The Juice) [cite: 6, 109]
Il combattimento deve essere fisico.
- **Hitstop**: Freeze di 0.1s quando colpisci melee. "Crunchy feel".
- **Gore System**:
  - Danno Esplosivo -> **GIBS** (Il nemico esplode in pezzi fisici).
  - Danno Taglio -> **RAGDOLL** (Fisica del cadavere).
- **Screen Shake**: Ogni esplosione scuote la camera.

## [cite_start]5. RESOURCES & ECONOMY [cite: 41]
- **HP (Red)**: La tua vita.
- **MANA (Blue)**: Le tue munizioni.
- **TRANSMUTATION (Key 9)**: Buff attivo. Sacrifichi HP per ricaricare Mana mentre corri. Rischio/Ricompensa.
