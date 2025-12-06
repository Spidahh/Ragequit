# 📊 DATA & REGISTRY SPECS

## 1. SKILL DEFINITION INTERFACE
Ogni arma/magia nel file `SkillRegistry.ts` deve rispettare questo schema:

```typescript
type SkillType = 'MELEE' | 'RANGED' | 'MAGIC' | 'UTILITY';
type Delivery = 'HITSCAN' | 'PROJECTILE' | 'INSTANT' | 'AREA';

interface SkillDef {
  // Identity
  id: string;          // es. "railgun_v1"
  name: string;
  icon: string;        // Path assets

  // Logic
  type: SkillType;
  delivery: Delivery;
  
  // Balance Stats
  damage: number;
  manaCost: number;
  cooldown: number;
  
  // Visual Assets (DUAL RENDERING)
  // WorldModel: Cosa vedono gli altri e tu in 3za persona
  worldModel: string;  // es. "sword_iron_back.glb"
  
  // ViewModel: Cosa vedi tu in 1ma persona (braccia + arma)
  viewModel: string;   // es. "hands_holding_sword.glb"
  
  // The "Juice" Params (PvP Feel)
  force: number;       // Spinta fisica (Knockback)
  hitStop: number;     // Durata freeze (ms), es. 100
  screenShake: number; // Intensità tremolio, es. 0.5
  gibFactor: number;   // 0 = Ragdoll, 1 = Esplosione di sangue
  
  // Assets & Effects
  soundId?: string;
  color: string;       // Colore scia/particelle
}
```

## 2. INTERACTIVE LOADOUT (Menu B)
Il menu skill non è una lista. È una scena 3D.

**State**: `isMenuOpen` (bool).

**Interaction**: Drag & Drop da SkillLibrary a EquippedSlots.

**Preview**: Il modello 3D del player al centro aggiorna l'arma in mano in tempo reale quando cambi lo slot.

## 3. TEAM SKINS (PvP Readability)

Ogni fazione ha un override visivo definito nel registry:

```typescript
interface TeamConfig {
  id: 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
  colorHex: string;
  modelPath: string; // es. "demon_red.glb"
}
```
