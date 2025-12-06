/**
 * Game.js
 * The central hub for the game. Initializes managers and runs the game loop.
 * Refactored for Phoenix Protocol.
 */
import * as THREE from 'three';
import { eventBus } from './EventBus.js';
import { GameState, STATES } from './GameState.js';
import { InputRouter } from './InputRouter.js';
import { InputManager } from '../managers/InputManager.js';
import { KeybindManager, ACTIONS } from '../managers/KeybindManager.js';
import { MapManager } from '../managers/MapManager.js';
import { BuildManager } from '../managers/BuildManager.js';
import { VFXManager } from '../managers/VFXManager.js';
import { SkillManager } from '../combat/SkillManager.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { ComboSystem } from '../systems/ComboSystem.js';  // ✅ Add combo tracking
import { Player } from '../entities/Player.js';
import { NetworkManager } from '../managers/NetworkManager.js';
import { EnemyManager } from '../managers/EnemyManager.js';
import { VisualManager } from '../managers/VisualManager.js';
import AudioManager from '../managers/AudioManager.js';
import { BotManager } from '../managers/BotManager.js';
import { CONSTANTS } from './Utils.js';  // ✅ Import CONSTANTS for resource max values

// UI Managers
import { MenuManager } from '../managers/ui/MenuManager.js';
import { HUDManager } from '../managers/ui/HUDManager.js';
import { BuildScreenManager } from '../managers/ui/BuildScreenManager.js';

export class Game {
  constructor() {
    this.isRunning = false;
    this.lastTime = 0;

    // Core State
    this.state = new GameState();
    
    // ✅ HITSTOP - Game pause on impact for feedback
    this.hitstopDuration = 0;  // Remaining hitstop time in seconds
    this.hitstopTimer = 0;     // Accumulated hitstop time

    console.log('🦅 PHOENIX PROTOCOL INITIATED');
  }

  /**
   * Initialize the game.
   */
  init() {
    console.log('⚙️ Initializing Game Systems...');

    // 1. Core Systems
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f); // Void Black
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);
    
    // ✅ PHASE 4: Enhanced Lighting & Shadows
    // Ambient light for base visibility
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);
    
    // Directional light with shadows for depth and contrast
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);
    
    // Hemisphere light for natural sky/ground color variation
    const hemisphereLight = new THREE.HemisphereLight(0x8080ff, 0x404040, 0.3);
    this.scene.add(hemisphereLight);

    // ✅ Very small near plane to prevent camera clipping through objects
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // ✅ PHASE 4: Quality & Performance Settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 2. Managers
    console.log(' - InputManager');
    this.inputManager = new InputManager();
    this.keybindManager = new KeybindManager(this.inputManager);
    console.log(' - MapManager');
    this.mapManager = new MapManager(this.scene);
    console.log(' - BuildManager');
    this.buildManager = new BuildManager();

    console.log(' - UI Systems');
    this.menuManager = new MenuManager(); // Should eventually take GameState
    this.hudManager = new HUDManager(this.buildManager, this.keybindManager);  // Pass keybindManager for scoreboard
    this.buildScreenManager = new BuildScreenManager(this.buildManager);

    console.log(' - VFXManager');
    this.vfxManager = new VFXManager(this.scene);
    console.log(' - VisualManager');
    this.visualManager = new VisualManager(this.scene);
    console.log(' - EnemyManager');
    this.enemyManager = new EnemyManager(this.scene, this.mapManager, this.vfxManager);  // ✅ PASS VFXManager
    console.log(' - BotManager');
    this.botManager = new BotManager(this.scene, this.mapManager);
    console.log(' - NetworkManager');
    this.networkManager = new NetworkManager();
    console.log(' - AudioManager');
    this.audioManager = new AudioManager();

    console.log('✅ Managers Initialized');

    // ✅ 2.5 Load Minimal Lobby Level (no gameplay environment)
    // This prevents arena from appearing behind login/menu
    // Real level loads when game:start is emitted
    // For now, just initialize with empty scene - MapManager handles this

    // 3. Entities
    console.log(' - PlayerController');
    this.player = new Player(this.scene, this.camera);

    // 4. Input Router
    this.inputRouter = new InputRouter(this.state);

    // 5. Systems
    console.log(' - SkillManager');
    this.skillManager = new SkillManager(this.scene, this.vfxManager, this.buildManager, this.player, this.enemyManager, this.botManager);

    console.log(' - CombatSystem');
    this.combatSystem = new CombatSystem(this.skillManager, this.keybindManager);
    
    console.log(' - ComboSystem');  // ✅ Initialize combo tracking
    this.comboSystem = new ComboSystem(this.scene, this.hudManager);
    console.log(' - MovementSystem');
    this.movementSystem = new MovementSystem(this.player, this.keybindManager, this.mapManager, this.enemyManager);

    // 6. Listeners
    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.isRunning = true;
    this.gameLoop(0);

    eventBus.emit('game:initialized', {});

    // 7. Game Flow Listeners
    eventBus.on('game:start', (data) => {
      console.log('🎮 Game Started:', data);
      this.state.setState(STATES.MATCH);

      // Load Level based on Mode
      const mode = data.mode === 'pvp' ? 'TEAM CARNAGE' : (data.mode === 'pve' ? 'MONSTERS SLAYER' : 'TEST');
      this.mapManager.loadLevel(mode);

      // Handle Mode Specifics
      if (mode === 'MONSTERS SLAYER') {
        // Start Waves
        this.enemyManager.spawnWave(3); // Initial Wave
      } else if (mode === 'TEAM CARNAGE') {
        // Start Bots
        this.botManager.startMatch(mode, data.team);
        // Move Player to Spawn
        const spawn = this.mapManager.getSpawnPoint(data.team);
        this.player.position.copy(spawn);
      } else if (mode === 'TEST') {
        // Spawn Dummies
        this.enemyManager.spawnEnemy(new THREE.Vector3(0, 1, 10)); // Passive
      }

      // Request Pointer Lock
      const canvas = document.getElementById('game-canvas');
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
      canvas.requestPointerLock();

      // Show HUD
      const uiLayer = document.getElementById('ui-layer');
      console.log('🎨 Showing UI Layer:', uiLayer);
      if (uiLayer) {
        uiLayer.style.display = 'block';
        console.log('✅ UI Layer display set to block');
      } else {
        console.error('❌ UI Layer element not found!');
      }
    });

    // 8. Juice Listeners
    eventBus.on('vfx:request', (data) => {
      if (data.type === 'blood') this.vfxManager.spawnBlood(data.position);
      if (data.type === 'explosion') this.vfxManager.spawnExplosion(data.position, data.color);
      if (data.type === 'shake') this.vfxManager.triggerScreenShake(data.intensity);
      if (data.type === 'dash') this.vfxManager.spawnDash(data.position, data.color);  // ✅ GDD Dash VFX
    });

    eventBus.on('vfx:damage_number', (data) => {
      this.vfxManager.spawnDamageNumber(data.position, data.damage, data.isCritical);
      // ✅ GDD HIT MARKER: Show hit confirmation visual (<100ms feedback)
      this.vfxManager.showHitMarker(data.isCritical);
    });

    eventBus.on('ui:announcement', (data) => {
      this.hudManager.showAnnouncement(data.text, data.style);
    });

    // Handle cooldown visual feedback
    eventBus.on('skill:cooldown', (data) => {
      this.hudManager.triggerCooldown(data.slotIndex, data.duration);
    });
    
    // ✅ HITSTOP - Freeze game on impact for juicy feedback
    eventBus.on('combat:hitstop', (data) => {
      this.applyHitstop(data.durationMs / 1000); // Convert ms to seconds
    });
    
    eventBus.on('damage:applied', (data) => {
      // Apply hitstop based on skill
      if (data.skillId && window.game?.skillManager) {
        const skill = window.game.skillManager.getSkillData(data.skillId);
        if (skill && skill.hitstop) {
          this.applyHitstop(skill.hitstop);
        }
      }
      
      // ✅ COMBO TRACKING - Register hit on damage
      if (data.skillId && this.comboSystem) {
        this.comboSystem.registerHit(data.skillId);
      }
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * The main game loop.
   * @param {number} timestamp 
   */
  gameLoop(timestamp) {
    if (!this.isRunning) return;

    const deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Update game logic.
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    // ✅ GDD INPUT LAG TRACKING - Monitor input processing latency
    const inputStartTime = performance.now();
    
    // ✅ HITSTOP - Skip gameplay updates but render animations
    if (this.hitstopDuration > 0) {
      this.hitstopDuration -= dt;
      // Still render animations and VFX, just don't update gameplay
      if (this.player) this.player.update(dt);
      if (this.vfxManager) this.vfxManager.update(dt, this.camera, this.player);
      return;  // Skip all other updates during hitstop
    }
    
    // Skip detailed updates if match not active, but still update player/camera
    const isActive = this.state.isMatchActive();

    if (this.player) this.player.update(dt);
    
    // Early exit if player is dead - no need to update gameplay systems
    if (this.player && this.player.isDead) {
      return;  // Only update visuals above, not gameplay
    }
    
    if (this.movementSystem && isActive) this.movementSystem.update(dt);
    if (this.skillManager && isActive) this.skillManager.update(dt);
    if (this.vfxManager) this.vfxManager.update(dt, this.camera, this.player);
    if (this.visualManager && isActive) this.visualManager.update(dt);
    if (this.enemyManager && isActive) this.enemyManager.update(dt, this.player.position, this.player);
    if (this.botManager && isActive) this.botManager.update(dt, [this.player]); // Pass player as target
    
    // ✅ Update Combo System
    if (this.comboSystem && isActive) this.comboSystem.update(dt);

    // ✅ Update Healing Totem (P4.1 - Arena objective)
    if (this.mapManager && isActive) {
      const totem = this.mapManager.getTotem();
      if (totem && totem.isAlive()) {
        totem.update(dt, [this.player]);
      }
    }

    // ✅ Update HUD with current player stats (emit event for resource bars)
    if (this.hudManager && this.player) {
      eventBus.emit('player:resource_update', {
        hp: this.player.hp,
        maxHp: CONSTANTS.MAX_HP,
        mana: this.player.mana,
        maxMana: CONSTANTS.MAX_MANA,
        stamina: this.player.stamina,
        maxStamina: CONSTANTS.MAX_STAMINA
      });
    }
    
    // ✅ UPDATE CAMERA KNOCKBACK TILT
    if (this.cameraKnockbackTilt) {
      this.applyKnockbackCameraTilt(dt);
    }

    // ✅ GDD INPUT LAG LOGGING - Sample every ~100 frames to avoid spam
    if (this.frameCount === undefined) this.frameCount = 0;
    this.frameCount++;
    
    if (this.frameCount % 100 === 0) {
      const inputEndTime = performance.now();
      const inputLagMs = inputEndTime - inputStartTime;
      
      // GDD target: <30ms input lag
      if (inputLagMs > 30) {
        console.warn(`⚠️ Input lag spike: ${inputLagMs.toFixed(2)}ms (target: <30ms)`);
      } else if (inputLagMs < 16) {
        // Good performance
        console.debug(`✅ Input lag optimal: ${inputLagMs.toFixed(2)}ms`);
      }
    }
  }

  /**
   * Render the game.
   */
  render() {
    // ✅ APPLY CAMERA KNOCKBACK TILT BEFORE RENDERING
    if (this.vfxManager?.currentTilt) {
      this.applyKnockbackTilt(this.vfxManager.currentTilt);
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  applyKnockbackTilt(tiltData) {
    /**
     * Apply temporary camera tilt from knockback
     * ✅ Now uses smooth easing + subtle wobble for better juice
     * tiltData: { intensity: 1-5, duration: seconds, elapsed: seconds, wobblePhase: radians, wobbleAmount: 0-1 }
     */
    if (!this.camera) return;

    // Progress through tilt duration (0 = start, 1 = end)
    const progress = Math.max(0, 1 - (tiltData.elapsed / tiltData.duration));
    
    // ✅ Easing curve: ease-out-cubic for smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    // Calculate roll (z-axis rotation)
    const maxTilt = Math.PI / 12;  // 15 degrees
    const tiltAmount = (tiltData.intensity / 5) * maxTilt * easedProgress;
    
    // ✅ Add subtle wobble using sine wave
    const wobble = Math.sin(tiltData.wobblePhase + tiltData.elapsed * 8) * 
                   (tiltData.wobbleAmount * tiltAmount * 0.3);
    
    this.camera.rotation.z = tiltAmount + wobble;
  }

  applyKnockbackCameraTilt(dt) {
    /**
     * Smoothly lerp camera tilt back to zero
     * ✅ Uses smooth quaternion lerp instead of linear decay
     */
    if (!this.vfxManager?.currentTilt || !this.camera) return;

    const tilt = this.vfxManager.currentTilt;
    tilt.elapsed += dt;

    if (tilt.elapsed >= tilt.duration) {
      // Tilt complete - reset
      this.camera.rotation.z = 0;
      this.vfxManager.currentTilt = null;
    } else {
      // Apply current tilt (handled in render loop via applyKnockbackTilt)
      // This just tracks elapsed time
    }
  }
  
  applyHitstop(duration) {
    /**
     * ✅ HITSTOP - Freeze game for juicy impact feedback
     * Pauses gameplay but allows animations/VFX to continue
     * Heavy attacks: 0.1s, normal attacks: 0.05s, light attacks: 0.03s
     */
    this.hitstopDuration = Math.max(this.hitstopDuration, duration);
    console.log(`⏸️ HITSTOP: ${(duration * 1000).toFixed(0)}ms`);
  }
}
