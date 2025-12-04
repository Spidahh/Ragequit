/**
 * ProjectileSystem.js
 * Handles spawning, updating, and collision for projectiles.
 * Part of the Phoenix Protocol Modular Architecture.
 * ✅ Optimized with spatial grid for O(1) collision detection
 */
import * as THREE from 'three';
import { Projectile } from '../Projectile.js';
import { SpatialGrid } from '../../managers/SpatialGrid.js';
import { eventBus } from '../../core/EventBus.js';

export class ProjectileSystem {
    constructor(scene, enemyManager, vfxManager, botManager) {
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.vfxManager = vfxManager;
        this.botManager = botManager;
        this.projectiles = [];
        
        // ✅ SPATIAL GRID - Fast collision detection
        // Cell size 10m = ~3 projectiles per cell in typical scenario
        this.spatialGrid = new SpatialGrid(10, { min: -100, max: 100 });

        console.log('🚀 ProjectileSystem Initialized');
    }

    spawnProjectile(data) {
        const { skill, position, direction, verticalVelocity, isRemote } = data;

        // ✅ HITSCAN (Instant hit, no projectile)
        if (skill.physics === 'HITSCAN') {
            this.handleHitscan(skill, position, direction);
            return;
        }

        // Calculate Velocity
        const speed = skill.speed || 20;
        const velocity = direction.clone().multiplyScalar(speed);

        // Add vertical velocity for parabolic physics
        if (skill.physics === 'PARABOLIC') {
            // ✅ Use dynamic vertical velocity if calculated from pitch, otherwise use skill default
            if (verticalVelocity !== undefined) {
                velocity.y = verticalVelocity;
            } else if (skill.verticalVelocity) {
                velocity.y = skill.verticalVelocity;
            }
        }

        // Create Projectile Entity
        const projectile = new Projectile(this.scene, position, velocity, skill);
        projectile.isRemote = isRemote || false;  // ✅ Flag remote projectiles
        projectile.id = `proj_${Math.random().toString(36).substr(2, 9)}`;  // Unique ID for spatial grid
        this.projectiles.push(projectile);
        
        // ✅ Add to spatial grid for fast collision queries
        this.spatialGrid.insert(projectile);

        // Muzzle Flash
        if (skill.vfx && skill.vfx.color) {
            this.vfxManager.spawnImpact(position, skill.vfx.color);
        }
    }

    handleHitscan(skill, origin, direction) {
        // ✅ Raycast in forward direction instantly
        const raycaster = new THREE.Raycaster(origin, direction);
        const range = skill.range || 100;

        // Muzzle flash
        this.vfxManager.spawnImpact(origin, skill.vfx.color);

        // Check enemy hits
        if (this.enemyManager) {
            const enemies = this.enemyManager.getActiveEnemies();
            const enemyMeshes = enemies.map(e => e.mesh);
            
            const hits = raycaster.intersectObjects(enemyMeshes, false);
            if (hits.length > 0 && hits[0].distance <= range) {
                const hitPoint = hits[0].point;
                const hitEnemy = enemies.find(e => e.mesh === hits[0].object);
                
                if (hitEnemy) {
                    // Impact at hit point
                    this.vfxManager.spawnImpact(hitPoint, skill.vfx.color);
                    
                    // Damage
                    hitEnemy.takeDamage(skill.damage);
                    
                    // ✅ Directional knockback (push in shoot direction)
                    if (skill.knockbackForce) {
                        this.enemyManager.applyKnockback(hitEnemy, direction.clone().multiplyScalar(skill.knockbackForce));
                    }
                    
                    // Screen shake for feedback
                    this.vfxManager.triggerScreenShake(0.3, 0.15);
                    
                    console.log(`⚡ HITSCAN HIT: ${skill.name} deals ${skill.damage} damage`);
                }
            }
        }
    }

    update(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt);
            
            // ✅ Update spatial grid position
            this.spatialGrid.update(p);

            // Collision Check
            if (this.checkCollisions(p)) {
                p.destroy();
                this.spatialGrid.remove(p);  // Remove from grid
                this.projectiles.splice(i, 1);
            } else if (p.isDead) {
                this.spatialGrid.remove(p);  // Remove from grid
                this.projectiles.splice(i, 1);
            }
        }
    }

    checkCollisions(projectile) {
        if (projectile.isDead) return true;

        // 1. Floor Collision
        if (projectile.mesh.position.y <= 0.2) {
            // ✅ BOUNCE SUPPORT: If skill has bounce property, bounce instead of explode
            if (projectile.data.bounce && projectile.velocity.y < 0) {
                // Reverse Y velocity with damping
                projectile.velocity.y *= -0.6; // Bounce with energy loss
                projectile.mesh.position.y = 0.2; // Prevent clipping
                
                // If bounce is too weak, stop
                if (Math.abs(projectile.velocity.y) < 1.0) {
                    this.handleImpact(projectile, projectile.mesh.position);
                    return true;
                }
                return false; // Continue flying after bounce
            }
            
            this.handleImpact(projectile, projectile.mesh.position);
            return true;
        }

        // 2. Enemy Collision - ✅ OPTIMIZED with spatial grid
        if (this.enemyManager) {
            // Get nearby enemies from spatial grid (search 2-cell radius)
            const nearbyObjects = this.spatialGrid.getNearby(projectile.mesh.position, 2);
            
            // Check only nearby enemies (not all enemies O(N))
            const enemies = this.enemyManager.getActiveEnemies();
            const enemySet = new Set(enemies);
            
            for (const nearby of nearbyObjects) {
                if (enemySet.has(nearby)) {
                    // Found nearby enemy - check collision distance
                    const dist = projectile.mesh.position.distanceTo(nearby.mesh.position);
                    if (dist < 0.5) {
                        this.handleEnemyHit(projectile, nearby);
                        return true;
                    }
                }
            }
        }

        // 3. Bot Collision - ✅ OPTIMIZED with spatial grid
        if (this.botManager && this.botManager.isActive) {
            const nearbyObjects = this.spatialGrid.getNearby(projectile.mesh.position, 1);
            const bots = this.botManager.bots;
            const botSet = new Set(bots);
            const radiusSq = 1.0 * 1.0; // Bot radius^2 to avoid sqrt
            
            for (const nearby of nearbyObjects) {
                if (botSet.has(nearby)) {
                    // Use squared distance to avoid expensive sqrt() call
                    if (projectile.mesh.position.distanceToSquared(nearby.mesh.position) < radiusSq) {
                        this.handleBotHit(projectile, nearby);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    handleImpact(projectile, position) {
        const skill = projectile.data;
        this.vfxManager.spawnImpact(position, skill.vfx.color);

        // Area Damage (Explosion)
        if (skill.vfx.explosion) {
            this.vfxManager.spawnAreaEffect(position, skill.vfx.color, 'area_ring');
            // We need to trigger area damage. 
            // Ideally ProjectileSystem shouldn't know about Area Logic, but for now let's emit or handle it.
            // Let's emit an event for AreaDamage? Or just call EnemyManager directly?
            // SkillManager used to handle this.
            // Let's keep it simple: ProjectileSystem handles the immediate impact logic.
            this.applyAreaDamage(position, skill);
        }
    }

    handleEnemyHit(projectile, enemy) {
        const skill = projectile.data;

        // Damage
        enemy.takeDamage(skill.damage);

        // Visuals
        this.vfxManager.spawnImpact(projectile.mesh.position, skill.vfx.color);
        
        // ✅ Screen shake for impact feedback (Quake-style!)
        const shakeIntensity = skill.knockbackForce ? Math.min(1.0, skill.knockbackForce / 10) : 0.3;
        this.vfxManager.triggerScreenShake(shakeIntensity, 0.2);

        // Directional knockback (hit direction)
        if (skill.knockbackForce) {
            const knockDir = projectile.velocity.clone().normalize();
            this.enemyManager.applyKnockback(enemy, knockDir.multiplyScalar(skill.knockbackForce));
        }

        // Vertical Push (if applicable, like Fireball)
        if (skill.verticalPush) {
            const pushDir = new THREE.Vector3(0, 1, 0);
            this.enemyManager.applyKnockback(enemy, pushDir.multiplyScalar(skill.verticalPush));
        }

        // Area Damage (Explosion on hit)
        if (skill.vfx.explosion) {
            this.vfxManager.spawnAreaEffect(projectile.mesh.position, skill.vfx.color, 'area_ring');
            // ✅ Bigger screen shake on explosion
            this.vfxManager.triggerScreenShake(0.8, 0.3);
            this.applyAreaDamage(projectile.mesh.position, skill);
        }
        
        // ✅ NETWORK ISOLATION: Only emit damage event for OWN projectiles, not remote
        if (!projectile.isRemote) {
          eventBus.emit('damage:applied', {
            targetId: enemy.id,
            targetType: 'enemy',
            damage: skill.damage,
            casterId: window.game?.player?.id,
            skillId: skill.id
          });
        }
    }

    applyAreaDamage(center, skill) {
        // Radius check
        const range = skill.range || skill.explosionRadius || 5;
        const enemies = this.enemyManager.getActiveEnemies();
        
        let hitCount = 0;

        enemies.forEach(enemy => {
            const dist = center.distanceTo(enemy.mesh.position);
            if (dist <= range) {
                hitCount++;
                // Use splash damage if available, otherwise full damage
                const dmg = skill.splashDamage || skill.damage;
                enemy.takeDamage(dmg);

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
        
        // ✅ Screen shake scaled by hits (more impact = more shake)
        if (hitCount > 0) {
            const shakeForce = Math.min(0.8, hitCount * 0.3);
            this.vfxManager.triggerScreenShake(shakeForce, 0.3);
        }
    }
}
