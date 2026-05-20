# PIANO DI RIFACIMENTO GRAFICO COMPLETO: RAGEQUIT

## 1\. ANALISI CRITICA E LIMITI TECNICI ATTUALI

- **UI/DOM Thrashing:** L'HTML attuale (packages/client/index.html) abusa di animazioni CSS su proprietà non composite (box-shadow, border-color, filter). Questo causa continui ricalcoli del layout (reflow/repaint), rubando CPU vitale al thread di WebGL e affossando gli FPS.
- **De-sync Visivo e Latenza:** Gestire il crosshair e l'hitmarker tramite manipolazione del DOM (\#crosshair.hit) genera latenza rispetto al raycasting di Three.js. L'HUD deve girare sullo stesso clock del motore 3D.
- **Collo di Bottiglia dei Materiali:** L'assenza di regole rigorose per i materiali porta al rischio di calcoli fisici inutili. Usare materiali reattivi alla luce su modelli placeholder o non ottimizzati distrugge le performance browser.

## 2\. STILE GRAFICO DEFINITIVO E DIREZIONE ARTISTICA

**Stile:** "Low-Poly Stylized Action" (Geometrie nette, zero texture rumorose, altissima leggibilità delle silhouette). **Tipografia:**

- Font Primario (HUD Numerico, Titoli): Rajdhani (Pesi: 600, 700 \- Maiuscolo).
- Font Secondario (Testi, Log, Settings): Inter (Pesi: 400, 500).

**Palette Colori HEX (Regole rigide):**

- **Ambiente/Mappe (Muted):** Toni desaturati per far risaltare i giocatori. \#2A2A35 (Dark Slate), \#4B4D58 (Steel Gray), \#3D3D33 (Mud).
- **UI Base Panels:** \#0F111A (Opacità 85%) con backdrop-filter: blur(8px).
- **UI Accents (Highlight/Selezione):** \#FFD260 (Neon Gold).
- **HUD Vitali:** HP \#FF3344, Mana \#00D0FF, Stamina \#00FF88.
- **VFX Magia (Emission):**
  - Fuoco: \#FF4500
  - Ghiaccio: \#00E5FF
  - Fulmine: \#FFE600
  - Oscurità: \#6A0DAD
  - Natura: \#39FF14

## 3\. SPECIFICHE LAYOUT UI/UX (Per Developer Frontend)

Tutte le animazioni UI devono limitarsi a transform (scale, translate) e opacity con will-change: transform, opacity.  
**A. Indicatori Centrali (Crosshair / Parry / Carica)**

- Migrare il rendering dal DOM a un canvas HTML5 dedicato sovrapposto (\<canvas id="ui-layer"\>), sincronizzato con requestAnimationFrame.
- **Parry Ring:** Raggio 30px attorno al mirino. Spessore 2px. Colore base \#00D0FF (traslucido), colore attivo/hold \#00FF88 (solido).
- **Bow Charge:** Barra sottile (Width 120px, Height 6px) posizionata 40px sotto il mirino. Gradiente di riempimento dinamico verso \#FF4500 al livello full-charge.

**B. HUD Risorse (In basso a sinistra)**

- **Posizione:** bottom: 40px, left: 40px.
- **Geometria:** Container trapezoidale tramite CSS transform: skewX(-10deg).
- **Dimensioni:** Width 320px, Height 22px per ogni barra (HP, Mana, Stamina). Gap verticale: 6px.
- **Background:** rgba(15, 17, 26, 0.85) con bordo solido sinistro di 3px legato al colore della risorsa.

**C. Weapon Wheel / Bar (In basso al centro)**

- **Posizione:** bottom: 40px, left: 50%, transform: translateX(-50%).
- **Slot:** 3 quadrati da 60x60px per le armi base.
- **Stato Attivo:** L'arma equipaggiata subisce transform: scale(1.15) translateY(-6px). Bordo inferiore marcato (3px solid \#FFD260) e ombra pre-renderizzata tramite PNG o CSS Drop-Shadow ottimizzato.

## 4\. ELENCO ASSET \+ PROMPT DI GENERAZIONE AI

| Nome File Consigliato | Formato & Limiti Tecnici                                                 | PROMPT ESATTO per Generazione AI (Meshy/Tripo/Luma)                                                                                                                                                         |
| :-------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| char_base_v1.glb      | GLTF/GLB, max 4000 tris. 1 Materiale (Color Palette), Rigged.            | "Low poly stylized sci-fi arena fighter character, full body, smooth clean armor plates, flat shading, solid bold colors, heroic stance, clear silhouette, T-pose, white background, no realistic textures" |
| wpn_sword_v1.glb      | GLTF/GLB, max 800 tris. Vertex Colors o Color Palette.                   | "Low poly stylized tech broadsword, angular edges, glowing neon core, matte metal blade, flat colors, clean simple geometry, 3d model isolated"                                                             |
| wpn_bow_v1.glb        | GLTF/GLB, max 1000 tris. Mesh divisa per animazione corda.               | "Low poly stylized compound energy bow, glowing neon strings, matte black chassis, sharp clean design, esports style weapon, 3d model isolated"                                                             |
| wpn_staff_v1.glb      | GLTF/GLB, max 700 tris. Nodo cristallo separato per animazione floating. | "Low poly stylized magic staff, floating geometric crystal on top, sci-fi metallic handle, flat colors, 3d model isolated"                                                                                  |
| arena_layout.glb      | GLTF/GLB, max 30k tris. 1 UV Map per Lightmap Baked (2048x2048).         | "Low poly multiplayer arena level design, concrete and metal platforms, muted gray and brown earth tones, soft baked lighting, clean geometric shapes, e-sports map layout"                                 |
| ui_icons.png          | PNG, 1024x1024, Alpha. (Prompt per Midjourney/v0)                        | "Set of minimalist flat vector game icons: sword, bow, magic staff, solid white on black background, sharp modern e-sports design, high contrast \--v 6.0"                                                  |

## 5\. PIANO DI INTEGRAZIONE THREE.JS E OTTIMIZZAZIONI

**A. Ottimizzazioni WebGL Tassative:**

1. **Illuminazione Zero-Cost:** Eliminare completamente THREE.DirectionalLight con ombre (castShadow). L'ambiente deve utilizzare esclusivamente texture pre-illuminate in software esterni (Blender) tramite Lightmaps/Ambient Occlusion.
2. **Standardizzazione Materiali:** Divieto assoluto di utilizzo di THREE.MeshStandardMaterial o THREE.MeshPhysicalMaterial. Convertire tutto il rendering dei modelli in THREE.MeshBasicMaterial (colore piatto senza reazione alla luce) o THREE.MeshLambertMaterial base.
3. **Blob Shadows:** Sotto ogni giocatore, agganciare un THREE.Mesh con PlaneGeometry e una texture sfumata (alpha circolare) proiettata sul suolo, al posto delle ombre calcolate dalla luce.
4. **Instancing Aggressivo:** Particelle, proiettili base ed elementi scenici ripetuti (es. pilastri, ostacoli) devono essere renderizzati tramite THREE.InstancedMesh.

**B. Ordine di Caricamento (Loading Manager Strategy):**

1. **Boot Sequenziale:** Mostrare UI HTML statica in millisecondi. Inizializzare WebGL Context in background.
2. **Pre-Load Ambiente:** Caricare arena_layout.glb compresso (DRACOLoader). Utilizzarlo immediatamente come fondale del Main Menu.
3. **Background Async:** Utilizzare Web Workers per scaricare e decodificare i char_base_v1.glb, le armi e l'audio (.ogg compressi) mentre l'utente naviga la UI del menu o personalizza le opzioni, azzerando i tempi morti.

**C. Struttura Cartelle Definitiva:**  
text  
/public  
 /assets  
 /models  
 ├── arena/ (file .glb draco-compressi)  
 ├── characters/  
 └── weapons/  
 /textures  
 ├── environment/ (Lightmaps .webp per efficienza)  
 └── vfx/ (Sprite atlas unificati .png)  
 /audio  
 ├── weapons/ (.ogg 128kbps)  
 ├── ui/  
 └── ambience/
