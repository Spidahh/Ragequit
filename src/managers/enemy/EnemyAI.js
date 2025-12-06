/**
 * EnemyAI.js
 * Handles Enemy State Machine, Movement, and Physics.
 * Part of the Phoenix Protocol Modular Architecture.
 */
import * as THREE from 'three';
import { ENEMY_STATES } from '../../entities/Enemy.js';
import { CONSTANTS } from '../../core/Utils.js';

export class EnemyAI {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.config = {
            speed: 8.0,  // ✅ COMPETITIVE: 6.0→8.0 (+33%) more aggressive
            stoppingDistance: 2.5,
            separationRadius: CONSTANTS.ENEMY_SEPARATION_RADIUS,
            separationForce: CONSTANTS.ENEMY_SEPARATION_FORCE,
            obstacleRadius: CONSTANTS.ENEMY_OBSTACLE_RADIUS,
            obstacleForce: CONSTANTS.ENEMY_OBSTACLE_FORCE
        };
    }

    update(dt, enemies, playerPosition, player, onAttack) {
        enemies.forEach(enemy => {
            if (enemy.isDead) return;
            this.updateEnemyState(dt, enemy, enemies, playerPosition, onAttack);
        });
    }

    updateEnemyState(dt, enemy, allEnemies, playerPosition, onAttack) {
        // 1. HURT (Knockback / Stun)
        if (enemy.state === ENEMY_STATES.HURT) {
            enemy.stateTimer -= dt;

            // ✅ APPLY GRAVITY while knocked up
            const gravity = -9.81;
            enemy.knockbackVelocity.y += gravity * dt;

            // Apply Knockback with collision checking
            const knockVel = enemy.knockbackVelocity.clone().multiplyScalar(dt);
            const nextPos = enemy.mesh.position.clone().add(knockVel);
            
            // Check map collision before applying knockback
            if (this.mapManager) {
                const enemyRadius = enemy.radius || 0.5;
                const enemyHeight = 2.0;
                const enemyBox = new THREE.Box3(
                    new THREE.Vector3(nextPos.x - enemyRadius, nextPos.y - enemyHeight / 2, nextPos.z - enemyRadius),
                    new THREE.Vector3(nextPos.x + enemyRadius, nextPos.y + enemyHeight / 2, nextPos.z + enemyRadius)
                );
                
                // Only apply knockback if no wall collision
                if (!this.mapManager.checkCollision(enemyBox)) {
                    enemy.mesh.position.copy(nextPos);
                } else {
                    // Hit wall, stop knockback
                    enemy.knockbackVelocity.multiplyScalar(0);
                }
            } else {
                enemy.mesh.position.copy(nextPos);
            }
            
            // ✅ Ground collision - if Y drops below 1, land
            if (enemy.mesh.position.y < 1) {
                enemy.mesh.position.y = 1;
                enemy.knockbackVelocity.multiplyScalar(0);
                if (enemy.stateTimer > 0) {
                    enemy.stateTimer = 0; // End HURT state immediately on landing
                }
            }
            
            // Dampen knockback with physics-based constant
            const dampFactor = Math.pow(CONSTANTS.KNOCKBACK_DAMPING, dt);
            enemy.knockbackVelocity.multiplyScalar(dampFactor);

            if (enemy.stateTimer <= 0) {
                this.setState(enemy, ENEMY_STATES.CHASE);
                enemy.knockbackVelocity.multiplyScalar(0); // Clear knockback on state change
            }
            return;
        }

        // 2. CHASE / ATTACK Logic
        const dist = enemy.mesh.position.distanceTo(playerPosition);

        if (dist < enemy.attackRange) {
            this.setState(enemy, ENEMY_STATES.ATTACK);
        } else {
            this.setState(enemy, ENEMY_STATES.CHASE);
        }

        // 3. ATTACK
        if (enemy.state === ENEMY_STATES.ATTACK) {
            enemy.attackTimer -= dt;
            if (enemy.attackTimer <= 0) {
                // Trigger Attack
                enemy.attackTimer = enemy.attackCooldown;
                if (onAttack) onAttack(enemy);
            }
            // Face player even while attacking
            enemy.mesh.lookAt(playerPosition.x, enemy.mesh.position.y, playerPosition.z);
        }

        // 4. CHASE (Movement)
        if (enemy.state === ENEMY_STATES.CHASE) {
            this.handleMovement(dt, enemy, allEnemies, playerPosition);
        }
    }

    handleMovement(dt, enemy, allEnemies, playerPosition) {
        // Vector toward player (flattened)
        const toPlayer = new THREE.Vector3().subVectors(playerPosition, enemy.mesh.position);
        toPlayer.y = 0;
        const distFlatSq = toPlayer.lengthSq();  // Use squared distance
        const distFlat = Math.sqrt(distFlatSq);  // Only calc when needed

        // 1. Separation (Avoid other enemies) - OPTIMIZED with radius check FIRST
        const sep = new THREE.Vector3();
        const sepRadiusSq = this.config.separationRadius * this.config.separationRadius;
        
        for (const other of allEnemies) {
            if (other === enemy || !other || other.isDead) continue;
            
            // Skip if too far away (squared distance early exit)
            const distSq = enemy.mesh.position.distanceToSquared(other.mesh.position);
            if (distSq >= sepRadiusSq) continue;
            
            const d = Math.sqrt(distSq);
            const strength = (this.config.separationRadius - d) / this.config.separationRadius;
            const delta = new THREE.Vector3().subVectors(enemy.mesh.position, other.mesh.position);
            delta.y = 0;
            delta.normalize();
            sep.addScaledVector(delta, strength);
        }

        // 2. Obstacle Avoidance (Avoid Map Colliders) - OPTIMIZED
        const avoidance = new THREE.Vector3();
        const obsRadiusSq = this.config.obstacleRadius * this.config.obstacleRadius;
        
        if (this.mapManager && this.mapManager.colliders) {
            for (const collider of this.mapManager.colliders) {
                // Simple sphere check against box
                const closestPoint = new THREE.Vector3();
                collider.clampPoint(enemy.mesh.position, closestPoint);

                // Use squared distance first for early exit
                const distSq = enemy.mesh.position.distanceToSquared(closestPoint);
                if (distSq >= obsRadiusSq) continue;  // Too far, skip
                
                const distToObstacle = Math.sqrt(distSq);
                const push = new THREE.Vector3().subVectors(enemy.mesh.position, closestPoint);
                push.y = 0;
                push.normalize();
                const strength = (this.config.obstacleRadius - distToObstacle) / this.config.obstacleRadius;
                avoidance.addScaledVector(push, strength * this.config.obstacleForce);
            }
        }

        if (distFlat > 0.0001) toPlayer.divideScalar(distFlat);

        // Combine Forces
        const moveDir = new THREE.Vector3()
            .copy(toPlayer)
            .addScaledVector(sep, this.config.separationForce * dt)
            .addScaledVector(avoidance, dt); // Avoidance is strong

        if (moveDir.lengthSq() > 0) moveDir.normalize();

        const nextPos = enemy.mesh.position.clone().addScaledVector(moveDir, this.config.speed * dt);

        // Map Collision (Hard Stop/Slide)
        this.applyMapCollision(enemy, nextPos);

        // Face Movement Direction (or Player?)
        // Usually face player is better for strafing, but for chase, face move dir looks more natural?
        // Let's face player to keep eye contact.
        enemy.mesh.lookAt(playerPosition.x, enemy.mesh.position.y, playerPosition.z);
    }

    applyMapCollision(enemy, nextPos) {
        if (!this.mapManager) {
            enemy.mesh.position.copy(nextPos);
            return;
        }

        const enemyBox = new THREE.Box3(
            new THREE.Vector3(nextPos.x - enemy.radius, nextPos.y - 1.0, nextPos.z - enemy.radius),
            new THREE.Vector3(nextPos.x + enemy.radius, nextPos.y + 1.0, nextPos.z + enemy.radius)
        );

        if (!this.mapManager.checkCollision(enemyBox)) {
            enemy.mesh.position.copy(nextPos);
        } else {
            // Slide X
            const tryX = enemy.mesh.position.clone();
            tryX.x = nextPos.x;
            const boxX = new THREE.Box3(
                new THREE.Vector3(tryX.x - enemy.radius, tryX.y - 1.0, tryX.z - enemy.radius),
                new THREE.Vector3(tryX.x + enemy.radius, tryX.y + 1.0, tryX.z + enemy.radius)
            );
            if (!this.mapManager.checkCollision(boxX)) {
                enemy.mesh.position.copy(tryX);
            } else {
                // Slide Z
                const tryZ = enemy.mesh.position.clone();
                tryZ.z = nextPos.z;
                const boxZ = new THREE.Box3(
                    new THREE.Vector3(tryZ.x - enemy.radius, tryZ.y - 1.0, tryZ.z - enemy.radius),
                    new THREE.Vector3(tryZ.x + enemy.radius, tryZ.y + 1.0, tryZ.z + enemy.radius)
                );
                if (!this.mapManager.checkCollision(boxZ)) {
                    enemy.mesh.position.copy(tryZ);
                }
            }
        }
    }

    setState(enemy, newState) {
        if (enemy.state === newState) return;
        enemy.state = newState;
    }

    applyKnockback(enemy, force) {
        enemy.knockbackVelocity.copy(force);
        this.setState(enemy, ENEMY_STATES.HURT);
        enemy.stateTimer = 0.5;
    }
}
