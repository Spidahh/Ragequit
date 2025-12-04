/**
 * EnemyManager.js
 * FACADE for the Enemy System.
 * Delegates logic to specialized components:
 * - EnemyAI (State/Movement)
 * - EnemySpawner (Waves/Creation)
 * - EnemyVisuals (Effects/Animation)
 * 
 * Part of the Phoenix Protocol Modular Architecture.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { ENEMY_STATES } from '../entities/Enemy.js';

// Components
import { EnemyAI } from './enemy/EnemyAI.js';
import { EnemySpawner } from './enemy/EnemySpawner.js';
import { EnemyVisuals } from './enemy/EnemyVisuals.js';

export class EnemyManager {
  constructor(scene, mapManager = null, vfxManager = null) {
    this.scene = scene;
    this.mapManager = mapManager;
    this.vfxManager = vfxManager;  // ✅ ADD VFXManager for blood/tilt effects

    // Active enemies list (Shared State)
    this.enemies = [];
    
    // Store last known player position for wave spawning
    this.lastPlayerPosition = { x: 0, z: 0 };
    
    // Wave tracking
    this.currentWaveCount = 0;
    this.waveInProgress = false;

    // Initialize Sub-Systems
    this.ai = new EnemyAI(this.mapManager);
    this.spawner = new EnemySpawner(this.scene);
    this.visuals = new EnemyVisuals(this.scene);

    // ✅ Listen for enemy deaths to auto-spawn next wave
    this.initListeners();

    console.log('👹 EnemyManager (Facade) Initialized');
  }

  initListeners() {
    // ✅ When an enemy dies, check if wave is complete
    eventBus.on('enemy:death', (enemy) => {
      this.checkWaveCompletion();
    });
  }

  // ✅ Check if all enemies in current wave are dead
  checkWaveCompletion() {
    const activeEnemies = this.getActiveEnemies();
    
    if (activeEnemies.length === 0 && this.waveInProgress) {
      console.log(`🎉 WAVE COMPLETE! Spawning next wave...`);
      this.waveInProgress = false;
      
      // Auto-spawn next wave after short delay
      setTimeout(() => {
        this.spawnWave(3 + Math.floor(this.currentWaveCount * 1.5));
      }, 1000);
    }
  }

  // ✅ Clean up dead enemies from list
  cleanupDeadEnemies() {
    this.enemies = this.enemies.filter(e => !e.isDead);
  }

  // --- PUBLIC API ---

  spawnEnemy(position) {
    return this.spawner.spawnEnemy(position, this.enemies);
  }

  spawnWave(count) {
    // ✅ Mark wave as in progress
    this.currentWaveCount++;
    this.waveInProgress = true;
    
    console.log(`🌊 Spawning Wave ${this.currentWaveCount} with ${count} enemies`);
    
    // Spawn near last known player position, not at origin
    this.spawner.spawnWave(count, this.enemies, this.lastPlayerPosition, 1.0 + (this.currentWaveCount * 0.1));
  }

  // Spawn wave at specific position if needed
  spawnWaveAt(count, position) {
    this.spawner.spawnWave(count, this.enemies, position);
  }

  takeDamage(enemyIndex, amount) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.isDead) return;

    // Reduce HP
    enemy.hp -= amount;
    console.log(`💥 Dummy hit! HP: ${enemy.hp}/${enemy.maxHP} (-${amount})`);

    // Determine if critical (could be based on damage amount or other factors)
    const isCritical = amount > enemy.maxHP * 0.25;  // Damage > 25% of max = critical sound

    // Events
    eventBus.emit('enemy:damage', { isCritical });  // ✅ GDD: Pass critical flag for audio
    eventBus.emit('vfx:damage_number', {
      position: enemy.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
      damage: Math.floor(amount),
      isCritical: isCritical
    });

    // Visuals
    this.visuals.flashDamage(enemy);

    // AI Reaction (Stun)
    this.ai.setState(enemy, ENEMY_STATES.HURT);
    enemy.stateTimer = 0.5;

    // Death Check
    if (enemy.hp <= 0) {
      this.die(enemyIndex);
    }
  }

  applyKnockback(enemy, force, attacker = null) {
    // ✅ ATTACK ANIMATION: Trigger melee attack animation on enemy before knockback
    if (attacker && enemy.mesh?.model?.swingArm) {
      enemy.mesh.model.swingArm();
    }
    
    // ✅ BLOOD SPLATTER: Show damage feedback
    if (attacker && this.vfxManager) {
      this.vfxManager.spawnBloodSplatter(enemy.mesh.position, 2);
      this.vfxManager.spawnKnockbackTilt(force.length() / 20);  // Scale tilt to knockback force
    }
    
    this.ai.applyKnockback(enemy, force);
    console.log(`💨 Knockback applied: ${force.length().toFixed(2)}`);
  }

  die(enemyIndex) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.isDead) return;

    enemy.isDead = true;
    console.log('💀 FATALITY - Dummy destroyed!');

    eventBus.emit('enemy:death', enemy);

    // Visuals
    this.visuals.playDeathAnimation(enemy);

    // JUICE: Blood
    // We need access to VFXManager. 
    // EnemyManager doesn't have VFXManager directly injected in constructor?
    // Let's check constructor. It has `scene` and `mapManager`.
    // We need to inject VFXManager or emit event.
    // Event is cleaner: 'vfx:blood'
    eventBus.emit('vfx:request', { type: 'blood', position: enemy.mesh.position });

    // JUICE: Announcement
    // Random chance for "POWNED"
    if (Math.random() < 0.3) {
      eventBus.emit('ui:announcement', { text: 'POWNED!', style: 'kill' });
    }
  }

  checkCollision(position, radius) {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.isDead) continue;

      const dist = position.distanceTo(enemy.mesh.position);
      if (dist < (enemy.radius + radius)) {
        // Ensure takeDamage binding
        if (!enemy.takeDamage) {
          enemy.takeDamage = (amount) => this.takeDamage(i, amount);
        }
        return enemy;
      }
    }
    return null;
  }

  getActiveEnemies() {
    return this.enemies.filter(e => !e.isDead);
  }

  clear() {
    this.spawner.clear(this.enemies);
    this.enemies = [];
    console.log('🧹 EnemyManager cleared');
  }

  update(dt, playerPosition, player) {
    // ✅ Clean up dead enemies from list
    this.cleanupDeadEnemies();
    
    // Store last known player position for wave spawning
    if (playerPosition) {
      this.lastPlayerPosition = { x: playerPosition.x, z: playerPosition.z };
    }
    
    this.ai.update(dt, this.enemies, playerPosition, player, (enemy) => {
      // Attack Logic
      console.log(`👹 Enemy attacks player!`);
      this.visuals.flashRed(enemy);

      setTimeout(() => {
        if (player && !player.isDead) {
          player.takeDamage(enemy.attackDamage);
        }
      }, 200);
    });
  }
}
