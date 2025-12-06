/**
 * SkillManager.js
 * FACADE for the Combat System.
 * Delegates logic to specialized components:
 * - StanceSystem (State/Visuals)
 * - CastingSystem (Execution/Cooldowns)
 * - ChannelingSystem (Continuous Effects)
 * - ProjectileSystem (Projectiles)
 * 
 * Part of the Phoenix Protocol Modular Architecture.
 */
import * as THREE from 'three';
import { SKILL_DATA } from '../data/SkillData.js';
import { eventBus } from '../core/EventBus.js';
import TuningConfig from '../config/TuningConfig.js';

// Components
import { StanceSystem } from './components/StanceSystem.js';
import { CastingSystem } from './components/CastingSystem.js';
import { ChannelingSystem } from './components/ChannelingSystem.js';
import { ProjectileSystem } from './components/ProjectileSystem.js';

export class SkillManager {
  constructor(scene, vfxManager, buildManager, player, enemyManager, botManager) {
    this.scene = scene;
    this.vfxManager = vfxManager;
    this.buildManager = buildManager;
    this.player = player;
    this.enemyManager = enemyManager;
    this.botManager = botManager;

    // Initialize Sub-Systems
    // Fallback for visualManager if not yet attached to player (it usually is in Game.js)
    this.stanceSystem = new StanceSystem(this.player.visualManager || { setStance: () => { } });
    this.castingSystem = new CastingSystem(this.player, this.enemyManager, this.vfxManager);
    this.channelingSystem = new ChannelingSystem(this.player);
    this.projectileSystem = new ProjectileSystem(this.scene, this.enemyManager, this.vfxManager, this.botManager);

    // State
    this.lastMagicSlot = 3; // Default to first magic slot
    this.isBlocking = false;

    this.initListeners();
    console.log('⚔️ SkillManager (Facade) Initialized');
  }

  initListeners() {
    // Listen for projectile spawn requests from CastingSystem
    eventBus.on('combat:spawn_projectile', (data) => this.projectileSystem.spawnProjectile(data));
    
    // NETWORK: Remote projectile spawn
    eventBus.on('network:projectile_spawn', (projData) => {
      // ✅ ROBUST vector conversion - handles both object and Vector3 formats
      const toVector3 = (data) => {
        if (data instanceof THREE.Vector3) return data.clone();
        if (data && typeof data === 'object') return new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0);
        return new THREE.Vector3(0, 0, 0);
      };
      
      // Create remote projectile with full physics
      this.projectileSystem.spawnProjectile({
        position: toVector3(projData.position),
        velocity: toVector3(projData.velocity),
        skillId: projData.skillId,
        damage: projData.damage,
        knockback: projData.knockback,
        verticalPush: projData.verticalPush || 0,
        lifetime: projData.lifetime || 5.0,
        isRemote: true,  // Flag as remote (don't emit network events again)
        casterId: projData.casterId
      });
    });
    
    // NETWORK: Remote hitscan attack
    eventBus.on('network:hitscan_attack', (hitData) => {
      // Just spawn VFX locally - server already validated damage
      if (this.vfxManager) {
        // Draw line from caster to target direction
        const skill = SKILL_DATA[hitData.skillId];
        if (skill?.vfx?.color) {
          this.vfxManager.spawnImpact(
            new THREE.Vector3(...Object.values(hitData.position || {x:0, y:0, z:0})),
            skill.vfx.color
          );
        }
      }
    });
  }

  // --- PUBLIC API (Called by CombatSystem) ---

  useSkill(slotIndex, isDoubleTap = false) {
    const loadout = this.buildManager.getLoadout();
    const skillId = loadout[`slot${slotIndex}`];

    if (!skillId) return;

    const skill = SKILL_DATA[skillId];
    if (!skill) return;

    // Delegate to Internal Logic
    this.handleStanceLogic(slotIndex, skill, isDoubleTap);
  }

  handleBasicAttack() {
    const stance = this.stanceSystem.getStance();

    if (stance === 'MELEE') {
      this.castingSystem.cast(SKILL_DATA['sword_swing']);
    } else if (stance === 'BOW') {
      this.castingSystem.cast(SKILL_DATA['bow_basic']);
    } else if (stance === 'MAGIC') {
      // Repeat last magic spell
      const loadout = this.buildManager.getLoadout();
      const skillId = loadout[`slot${this.lastMagicSlot}`];
      if (skillId) {
        this.castingSystem.cast(SKILL_DATA[skillId]);
      }
    }
  }

  handleBlock(isBlocking) {
    if (this.stanceSystem.getStance() !== 'MELEE') return;

    this.isBlocking = isBlocking;
    eventBus.emit('visual:block', isBlocking);

    if (isBlocking) {
      console.log('🛡️ Blocking Started');
    } else {
      console.log('🛡️ Blocking Stopped');
    }
  }

  // --- INTERNAL LOGIC ---

  handleStanceLogic(slotIndex, skill, isDoubleTap) {
    const currentStance = this.stanceSystem.getStance();
    const targetStance = skill.stance;

    // MELEE / BOW Logic (Equip vs Cast)
    if (targetStance === 'MELEE' || targetStance === 'BOW') {
      if (currentStance !== targetStance) {
        // Equip
        this.stanceSystem.setStance(targetStance);
        if (isDoubleTap) {
          this.castingSystem.cast(skill, null, slotIndex);
        }
      } else {
        // Already Equipped -> Cast
        this.castingSystem.cast(skill, null, slotIndex);
      }
    }
    // MAGIC Logic (Instant Cast)
    else if (targetStance === 'MAGIC') {
      this.stanceSystem.setStance('MAGIC');
      this.lastMagicSlot = slotIndex; // Remember for repeat
      this.castingSystem.cast(skill, null, slotIndex);
    }
    // UTILITY / CHANNEL Logic
    else if (skill.type === 'CHANNEL') {
      this.channelingSystem.startChanneling(skill);
    }
    else if (skill.type === 'SELF') {
      this.castingSystem.cast(skill, null, slotIndex);
    }
  }

  // --- UPDATE LOOP ---

  update(dt) {
    // 1. Update Sub-Systems
    this.castingSystem.update(dt);
    this.channelingSystem.update(dt);
    this.projectileSystem.update(dt);

    // 2. Block Logic (Drain)
    if (this.isBlocking) {
      const blockCost = 10 * dt;
      if (this.player.stamina >= blockCost) {
        this.player.stamina -= blockCost;
      } else {
        this.handleBlock(false); // Break block
      }
    } else {
      // Regen
      if (this.player.stamina < 100) this.player.stamina = Math.min(this.player.stamina + 3.0 * dt, 100);
      if (this.player.mana < 100) this.player.mana = Math.min(this.player.mana + 2.0 * dt, 100);
    }
  }
}
