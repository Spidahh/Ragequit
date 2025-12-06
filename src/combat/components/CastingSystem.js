/**
 * CastingSystem.js
 * Handles skill execution, cooldowns, resource costs, and physics interactions.
 * Part of the Phoenix Protocol Modular Architecture.
 */
import * as THREE from 'three';
import { eventBus } from '../../core/EventBus.js';
import { SKILL_DATA } from '../../data/SkillData.js';
import TuningConfig from '../../config/TuningConfig.js';

export class CastingSystem {
    constructor(player, enemyManager, vfxManager) {
        this.player = player;
        this.enemyManager = enemyManager;
        this.vfxManager = vfxManager;

        this.cooldowns = {}; // Map<skillId, timeRemaining>

        console.log('✨ CastingSystem Initialized');
    }

    update(dt) {
        // Update Cooldowns - use consistent seconds unit
        for (const id in this.cooldowns) {
            if (this.cooldowns[id] > 0) {
                this.cooldowns[id] -= dt;  // Both dt and cooldown in seconds
            }
        }
    }

    canCast(skill) {
        // 1. Cooldown Check
        if (this.cooldowns[skill.id] > 0) {
            console.log(`⏳ Skill ${skill.name} on Cooldown`);
            return false;
        }

        // 2. Resource Check
        if (skill.mana && this.player.mana < skill.mana) {
            console.log(`💧 Not enough Mana for ${skill.name}`);
            return false;
        }
        if (skill.stamina && this.player.stamina < skill.stamina) {
            console.log(`⚡ Not enough Stamina for ${skill.name}`);
            return false;
        }

        return true;
    }

    cast(skill, origin = null, slotIndex = 0) {
        if (!this.canCast(skill)) return false;

        // Consume Resources
        if (skill.mana) this.player.mana -= skill.mana;
        if (skill.stamina) this.player.stamina -= skill.stamina;

        // Set Cooldown (convert skill.cooldown ms to seconds for consistent units)
        this.cooldowns[skill.id] = skill.cooldown / 1000;

        // Emit cooldown event for UI feedback
        eventBus.emit('skill:cooldown', {
            slotIndex: slotIndex,
            duration: skill.cooldown / 1000 // Convert ms to seconds
        });

        // Emit attack event for animation
        eventBus.emit('player:attack', {
            skillId: skill.id,
            skillName: skill.name,
            type: skill.type
        });
        
        // ✅ Trigger skill slot press animation
        this.triggerSkillSlotAnimation(slotIndex);

        // Execute Logic
        console.log(`✨ Casting: ${skill.name}`);

        // Visuals
        if (skill.vfx) {
            // ✅ For projectiles, spawn from camera position (where player is aiming)
            // For other skills, spawn from body
            let spawnPos;
            if (skill.vfx.type === 'projectile') {
                // Spawn from camera/aim direction (where player is looking)
                spawnPos = this.player.camera.position.clone().add(this.player.getForward().multiplyScalar(1.5));
            } else {
                // Other skills spawn from body
                spawnPos = origin ? origin.clone() : this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
            }

            if (skill.vfx.type === 'projectile') {
                // Handled by Projectile System (or simplified here for now)
                this.spawnProjectile(skill, spawnPos);
            } else if (skill.vfx.type === 'area_ring' || skill.vfx.type === 'area_ground' || skill.vfx.type === 'shockwave') {
                this.vfxManager.spawnAreaEffect(spawnPos, skill.vfx.color, skill.vfx.type === 'shockwave' ? 'area_ring' : skill.vfx.type);
                this.checkAreaHit(skill, spawnPos);
            } else if (skill.vfx.type === 'melee') {
                this.vfxManager.spawnAreaEffect(spawnPos.add(this.player.getForward().multiplyScalar(1)), skill.vfx.color, 'slash');
                const hitResult = this.checkMeleeHit(skill);
                
                // ✅ Apply hit-stop on melee hit confirmation
                if (hitResult && hitResult.hitCount > 0) {
                    this.applyHitStop(skill.damage);
                }
            } else if (skill.vfx.type === 'heal') {
                this.player.hp = Math.min(this.player.hp + skill.heal, 100);
                this.vfxManager.spawnImpact(this.player.position, skill.vfx.color);
            }
        }

        eventBus.emit('player:skill_used', skill.id);
        return true;
    }
    
    applyHitStop(damage) {
        /**
         * Apply brief freeze on melee hit confirmation
         * Tier based on damage: light (<20), medium (20-35), heavy (>35)
         */
        const cfg = TuningConfig?.hitStopFrames ?? { light: 1, medium: 2, heavy: 3 };
        let frames;
        
        if (damage < 20) frames = cfg.light;
        else if (damage < 35) frames = cfg.medium;
        else frames = cfg.heavy;
        
        const durationMs = (frames / 60) * 1000; // Convert frames to ms (assuming 60 FPS)
        
        // Emit hit-stop event for systems to pause briefly
        eventBus.emit('combat:hitstop', { durationMs });
    }

    spawnProjectile(skill, position) {
        const direction = this.player.getForward();
        
        // ✅ For PARABOLIC projectiles, calculate vertical velocity from player pitch
        // This makes the projectile follow where the player is aiming
        let projectileData = { skill, position, direction };
        
        if (skill.physics === 'PARABOLIC') {
            // Player pitch: negative = aiming up, positive = aiming down
            // We need to calculate how much vertical velocity to give
            // Based on pitch and horizontal speed, calculate parabolic arc
            const horizontalSpeed = skill.speed || 15;
            const pitch = this.player.pitch; // negative = up, positive = down
            
            // ✅ PARABOLIC ARC CALCULATION:
            // Calculate vertical velocity to make projectile land where aiming
            // If pitch is negative (aiming up), give positive vertical velocity
            // If pitch is positive (aiming down), give negative or low vertical velocity
            const verticalVelocity = Math.tan(-pitch) * horizontalSpeed * 0.7; // 0.7 damping for arc feel
            
            projectileData.verticalVelocity = verticalVelocity;
        }
        
        eventBus.emit('combat:spawn_projectile', projectileData);
    }

    checkAreaHit(skill, center) {
        // Area Logic (Shockwave, Fireball Explosion)
        let hitCount = 0;
        
        this.enemyManager.enemies.forEach(enemy => {
            const dist = center.distanceTo(enemy.mesh.position);
            if (dist <= (skill.range || 5)) {
                hitCount++;
                enemy.takeDamage(skill.damage);
                
                // ✅ EMIT DAMAGE EVENT for network sync
                eventBus.emit('damage:applied', {
                  targetId: enemy.id,
                  targetType: 'enemy',
                  damage: skill.damage,
                  casterId: this.player.id,
                  skillId: skill.id
                });
                
                this.vfxManager.spawnImpact(enemy.mesh.position, 0xff0000);

                // ✅ Combined knockback (horizontal + vertical in one call)
                const totalKnockback = new THREE.Vector3();
                
                if (skill.knockbackForce) {
                    const knockDir = new THREE.Vector3().subVectors(enemy.mesh.position, center).normalize();
                    totalKnockback.add(knockDir.multiplyScalar(skill.knockbackForce));
                }
                
                if (skill.verticalPush) {
                    totalKnockback.y += skill.verticalPush; // Add vertical component
                }
                
                if (totalKnockback.lengthSq() > 0) {
                    this.enemyManager.applyKnockback(enemy, totalKnockback);
                }
            }
        });
        
        // ✅ Screen shake for shockwave (Quake-style feedback!)
        if (hitCount > 0) {
            const shakeForce = Math.min(0.8, hitCount * 0.25);
            this.vfxManager.triggerScreenShake(shakeForce, 0.3);
        }

        // Apply knockback to PLAYER too (Shockwave rocket jump!)
        if (skill.id === 'shockwave') {
            // ✅ SHOCKWAVE SELF-KNOCKUP (Rocket Jump!)
            // Massive upward push
            const upwardForce = skill.verticalPush || 35; // Use full knockup value
            this.player.velocity.y += upwardForce;
            
            // Optional: Small horizontal recoil to make it more dynamic
            const recoilDir = new THREE.Vector3().subVectors(this.player.position, this.player.position).normalize();
            if (recoilDir.lengthSq() > 0.1) {
                this.player.velocity.add(recoilDir.multiplyScalar(skill.knockbackForce || 0));
            }
            
            console.log(`🚀 SHOCKWAVE ROCKET JUMP! Velocity Y: ${this.player.velocity.y}`);
        }

        // Apply knockback to PLAYER on Fireball explosion
        if (skill.knockbackForce && skill.id === 'magic_fireball') {
            const playerDir = new THREE.Vector3().subVectors(this.player.position, center).normalize();
            const knockForce = skill.knockbackForce * 0.3; // Less force for player on fireball
            this.player.velocity.add(playerDir.multiplyScalar(knockForce));
            
            // Add vertical push
            if (skill.verticalPush) {
                this.player.velocity.y += skill.verticalPush * 0.3;
            }
        }

        // Self Hit (Shockwave)
        if (skill.id === 'shockwave') {
            this.player.hp = Math.max(0, this.player.hp - (skill.damage * 0.5));
            console.log('💥 Shockwave hit self!');
        }
    }

    checkMeleeHit(skill) {
        // Cone Check
        const forward = this.player.getForward();
        let hitCount = 0;
        
        this.enemyManager.enemies.forEach(enemy => {
            const dirToEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, this.player.position).normalize();
            const angle = forward.angleTo(dirToEnemy);
            const dist = this.player.position.distanceTo(enemy.mesh.position);

            if (dist <= skill.range && angle < Math.PI / 4) { // 45 degree cone
                enemy.takeDamage(skill.damage);
                hitCount++;
                
                // ✅ EMIT DAMAGE EVENT for network sync
                eventBus.emit('damage:applied', {
                  targetId: enemy.id,
                  targetType: 'enemy',
                  damage: skill.damage,
                  casterId: this.player.id,
                  skillId: skill.id
                });
                
                this.vfxManager.spawnImpact(enemy.mesh.position, 0xffffff);
            }
        });
        
        return { hitCount };
    }
    
    triggerSkillSlotAnimation(slotIndex) {
        /**
         * ✅ Trigger skill slot press animation
         * Map slotIndex to HTML element and apply animation
         */
        const slotElementMap = {
            1: 'slot-1',    // Q
            2: 'slot-2',    // C
            3: 'slot-3',    // 1
            4: 'slot-4',    // E
            5: 'slot-5',    // F
            6: 'slot-6',    // X
            7: 'slot-7',    // R (Heal)
            8: 'slot-8',    // 2
            9: 'slot-9',    // 3
            10: 'slot-10'   // 4
        };
        
        const elementId = slotElementMap[slotIndex];
        const slotElement = document.getElementById(elementId);
        if (!slotElement) return;
        
        // Apply animation class (CSS will handle the animation)
        slotElement.classList.add('skill-pressed');
        
        // Remove animation class after it finishes (300ms = 0.3s)
        setTimeout(() => {
            slotElement.classList.remove('skill-pressed');
        }, 300);
    }
}
