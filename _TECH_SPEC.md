# 🛡️ TECHNICAL SPECIFICATIONS (STABLE LOCK)

## [cite_start]1. CORE STACK (VERSION LOCKED) [cite: 77]
- **Engine**: React **18.3.1** (CRITICO: No React 19).
- **Build**: Vite + SWC.
- **Language**: TypeScript 5.
- **3D**: `@react-three/fiber` (v8.x), `@react-three/drei`.
- **Physics**: `@react-three/rapier` (v1.x).
- **State**: `zustand` (Global Store).

## 2. PROJECT STRUCTURE (Feature-First)
```
/src
  /assets          # GLB Models (divisi in /viewmodels e /characters)
  /components
    /Core          # Canvas, Lights
    /Player
       /CameraRig.tsx  # Gestisce FPS/TPS Lerp
       /PlayerMesh.tsx # Il corpo completo (TPS Only)
       /ViewModel.tsx  # Le mani/arma (FPS Only)
    /Combat        # WeaponEmitter
    /UI            # HUD, SkillManager
  /data            # SkillRegistry.ts
  /store           # useGameStore.ts
```

## 3. DATA-DRIVEN ARCHITECTURE
- **Registry**: Il file `src/data/SkillRegistry.ts` è la fonte di verità.
- **WeaponEmitter**: Un componente generico che riceve un `skillId` e istanzia l'effetto (Hitscan/Projectile) leggendo i parametri dal registry.

## 4. IMPLEMENTATION PHASES
1.  **Fase 1 (Foundation)**: Setup React 18, Gravità -30, Player Movement "Quake".
2.  **Fase 2 (Data)**: Creazione Registry JSON e Store Zustand.
3.  **Fase 3 (Combat)**: WeaponEmitter collegato al Mouse.
4.  **Fase 4 (Juice)**: Screen Shake, Hitstop, UI.
