/**
 * MovementSystem.js
 * Handles player movement, physics, and camera look.
 * Part of the Phoenix Protocol Restructuring.
 */
import * as THREE from 'three';
import TuningConfig from '../config/TuningConfig.js';
import { ACTIONS } from '../managers/KeybindManager.js';
import { CONSTANTS, Utils } from '../core/Utils.js';
import { eventBus } from '../core/EventBus.js';

export class MovementSystem {
    constructor(player, keybindManager, mapManager, enemyManager) {
        this.player = player;
        this.keybinds = keybindManager;
        this.mapManager = mapManager;
        this.enemyManager = enemyManager;  // ✅ NEW: For player-enemy collision
        this.isEnabled = false;
        
        // ✅ Knockback Recovery Tracking
        this.knockbackRecoveryTimer = 0;
        this.isRecoveringFromKnockback = false;
        
        // ✅ GDD DASH MECHANIC: Optional sprint-based dash
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDuration = 0.15;  // 150ms dash window
        this.dashCooldown = 0.5;   // 500ms before next dash
        this.dashCooldownTimer = 0;
        this.dashDirection = new THREE.Vector3();

        this.initListeners();
        console.log('🏃 MovementSystem Initialized');
    }

    initListeners() {
        eventBus.on('input:mousemove', (delta) => {
            if (this.isEnabled) this.handleLook(delta);
        });
        
        // ✅ Listen for knockback events to trigger recovery
        eventBus.on('combat:knockback_applied', (data) => {
            if (data.targetId === this.player.id || data.isLocalPlayer) {
                this.startKnockbackRecovery();
            }
        });

        // State Management
        eventBus.on('game:start', () => this.isEnabled = true);
        eventBus.on('game:resume', () => this.isEnabled = true);
        eventBus.on('game:pause', () => this.isEnabled = false);
        eventBus.on('game:reset', () => this.isEnabled = false);
    }
    
    startKnockbackRecovery() {
        this.isRecoveringFromKnockback = true;
        this.knockbackRecoveryTimer = 0;
    }

    update(dt) {
        if (!this.isEnabled) return;
        
        // ✅ GDD DASH: Update cooldown
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= dt;
        }
        
        // ✅ GDD DASH: Update active dash
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.dashCooldownTimer = this.dashCooldown;
            }
        }
        
        // ✅ Knockback Recovery: Update recovery timer
        if (this.isRecoveringFromKnockback) {
            this.knockbackRecoveryTimer += dt;
            const recoveryMs = TuningConfig?.knockbackRecovery?.fullControlMs ?? 450;
            if (this.knockbackRecoveryTimer >= recoveryMs / 1000) {
                this.isRecoveringFromKnockback = false;
                this.knockbackRecoveryTimer = 0;
            }
        }
        
        this.handleMovement(dt);
        this.applyPhysics(dt);
        this.updateCamera(dt);
    }

    handleLook(delta) {
        const SENSITIVITY = 0.002;
        const ACCELERATION = 1.0;  // ✅ GDD: Direct response (no acceleration curve)
        
        // ✅ Apply aim dampening during knockback recovery
        let aimDamp = 1.0;
        if (this.isRecoveringFromKnockback) {
            const recoveryMs = TuningConfig?.knockbackRecovery?.fullControlMs ?? 450;
            const progress = Math.min(1.0, this.knockbackRecoveryTimer / (recoveryMs / 1000));
            // Linear easing: recovers from 0.3 to 1.0 over recovery window
            aimDamp = 0.3 + (progress * 0.7);
        }
        
        // Apply look input with dampening
        this.player.yaw -= delta.x * SENSITIVITY * ACCELERATION * aimDamp;
        this.player.pitch -= delta.y * SENSITIVITY * ACCELERATION * aimDamp;

        // Clamp pitch
        this.player.pitch = Utils.clamp(this.player.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);

        // Apply rotation
        this.player.camera.rotation.order = 'YXZ';
        this.player.camera.rotation.x = this.player.pitch;
        this.player.camera.rotation.y = this.player.yaw;
    }

    handleMovement(dt) {
        const baseSpeed = CONSTANTS.PLAYER_SPEED;
        const sprintMultiplier = this.keybinds.getAction(ACTIONS.SPRINT) ? 1.5 : 1.0;
        const speed = baseSpeed * sprintMultiplier;
        const direction = new THREE.Vector3();

        if (this.keybinds.getAction(ACTIONS.MOVE_FORWARD)) direction.z -= 1;
        if (this.keybinds.getAction(ACTIONS.MOVE_BACKWARD)) direction.z += 1;
        if (this.keybinds.getAction(ACTIONS.MOVE_LEFT)) direction.x -= 1;
        if (this.keybinds.getAction(ACTIONS.MOVE_RIGHT)) direction.x += 1;

        const EPSILON = 0.0001;
        if (direction.lengthSq() > EPSILON) {  // Use epsilon instead of exact 0
            direction.normalize();

            // Rotate direction by camera yaw
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw);

            // ✅ AIR CONTROL: Apply movement at 100% on ground, boosted in air per tuning
            const baseAir = 0.5;
            const airBoost = (TuningConfig?.airControl?.accelBoostPct ?? 0);
            const moveMultiplier = this.player.isGrounded ? 1.0 : (baseAir + airBoost);
            this.player.velocity.x = direction.x * speed * moveMultiplier;
            this.player.velocity.z = direction.z * speed * moveMultiplier;
        } else {
            // No input = stop horizontal movement only (preserve air velocity slightly)
            if (this.player.isGrounded) {
                this.player.velocity.x = 0;
                this.player.velocity.z = 0;
            } else {
                // In air: apply drag to smooth out wild movements, tuned for better micro-control
                const baseDrag = 0.95;
                const frictionBoost = (TuningConfig?.airControl?.frictionBoostPct ?? 0);
                const drag = Math.min(0.99, baseDrag + frictionBoost);
                this.player.velocity.x *= drag;
                this.player.velocity.z *= drag;
            }
        }

        // Jump
        if (this.player.isGrounded && this.keybinds.getAction(ACTIONS.JUMP)) {
            this.player.velocity.y = CONSTANTS.PLAYER_JUMP_FORCE;
            this.player.isGrounded = false;
        }
        
        // ✅ GDD DASH MECHANIC: Double-tap sprint to dash in movement direction
        // Only allow dash on ground, with cooldown
        if (this.player.isGrounded && 
            this.keybinds.getAction(ACTIONS.SPRINT) && 
            !this.isDashing && 
            this.dashCooldownTimer <= 0 &&
            direction.lengthSq() > EPSILON) {  // Must have movement input
            
            this.startDash(direction.clone().normalize());
        }
    }
    
    startDash(direction) {
        /**
         * Initiate dash in given direction
         * GDD: Quake 3-style strafe jump enhancement
         * Gives quick burst of speed for 150ms with 500ms cooldown
         */
        const dashSpeed = CONSTANTS.PLAYER_SPEED * 3.0;  // 3x movement speed
        
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashDirection = direction;
        
        // Apply dash velocity (can stack with normal movement)
        this.player.velocity.x += direction.x * dashSpeed;
        this.player.velocity.z += direction.z * dashSpeed;
        
        // ✅ Dash VFX feedback
        eventBus.emit('vfx:request', {
            type: 'dash',
            position: this.player.position.clone(),
            color: 0x00ffff
        });
    }

    applyPhysics(dt) {
        // Gravity
        this.player.velocity.y += CONSTANTS.GRAVITY * dt;

        // Proposed Movement
        const moveStep = this.player.velocity.clone().multiplyScalar(dt);
        const nextPos = this.player.position.clone().add(moveStep);

        // 1. Map Collision (Walls)
        if (this.mapManager) {
            const playerRadius = CONSTANTS.PLAYER_RADIUS;
            const playerHeight = CONSTANTS.PLAYER_HEIGHT;
            const playerHalfHeight = playerHeight / 2;

            // Create Bounding Box for Next Position
            // Player position is CENTER of capsule, so we need to offset by half height
            const playerBox = new THREE.Box3(
                new THREE.Vector3(nextPos.x - playerRadius, nextPos.y - playerHalfHeight, nextPos.z - playerRadius),
                new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + playerHalfHeight, nextPos.z + playerRadius)
            );

            if (this.mapManager.checkCollision(playerBox)) {
                // Collision Detected! Try Sliding.

                // Try X only
                const tryX = this.player.position.clone().add(new THREE.Vector3(moveStep.x, 0, 0));
                const boxX = new THREE.Box3(
                    new THREE.Vector3(tryX.x - playerRadius, tryX.y - playerHalfHeight, tryX.z - playerRadius),
                    new THREE.Vector3(tryX.x + playerRadius, tryX.y + playerHalfHeight, tryX.z + playerRadius)
                );

                if (!this.mapManager.checkCollision(boxX)) {
                    moveStep.z = 0; // Block Z
                } else {
                    // Try Z only
                    const tryZ = this.player.position.clone().add(new THREE.Vector3(0, 0, moveStep.z));
                    const boxZ = new THREE.Box3(
                        new THREE.Vector3(tryZ.x - playerRadius, tryZ.y - playerHalfHeight, tryZ.z - playerRadius),
                        new THREE.Vector3(tryZ.x + playerRadius, tryZ.y + playerHalfHeight, tryZ.z + playerRadius)
                    );

                    if (!this.mapManager.checkCollision(boxZ)) {
                        moveStep.x = 0; // Block X
                    } else {
                        // Block Both
                        moveStep.x = 0;
                        moveStep.z = 0;
                    }
                }
            }
        }

        // Apply Validated Movement
        this.player.position.add(moveStep);

        // 2. Floor Collision (Dynamic based on player height)
        const GROUND_LEVEL = CONSTANTS.GROUND_LEVEL;
        const playerHalfHeight = CONSTANTS.PLAYER_HEIGHT / 2;
        
        // Bottom of player capsule
        const playerBottomY = this.player.position.y - playerHalfHeight;
        
        if (playerBottomY < GROUND_LEVEL) {
            // Player collided with ground
            this.player.position.y = GROUND_LEVEL + playerHalfHeight;
            
            // ✅ GDD RIMBALZI VERTICALI (Quake 3 Style bouncing!)
            // Only bounce if falling with significant velocity
            if (this.player.velocity.y < -50) {  // Threshold: need real fall to bounce
                this.player.velocity.y *= -0.5;  // Coefficient: retain 50% upward energy
                
                if (Math.abs(this.player.velocity.y) < 10) {
                    this.player.velocity.y = 0;
                    this.player.isGrounded = true;
                } else {
                    // Keep airborne if bounce is still significant
                    this.player.isGrounded = false;
                }
            } else {
                // Gentle landing or walking - no bounce
                this.player.velocity.y = 0;
                this.player.isGrounded = true;
            }
        } else {
            this.player.isGrounded = false;
        }

        // ✅ 3. ENEMY COLLISION (NEW!) - Block player when touching enemies
        if (this.enemyManager) {
            const playerRadius = CONSTANTS.PLAYER_RADIUS;
            const playerHeight = CONSTANTS.PLAYER_HEIGHT;
            const playerHalfHeight = playerHeight / 2;
            const enemies = this.enemyManager.getActiveEnemies();
            
            for (const enemy of enemies) {
                if (enemy.isDead) continue;
                
                const enemyPos = enemy.mesh.position;
                const enemyRadius = enemy.radius || 0.5;
                
                // Check distance to enemy center (2D, flattened)
                const dx = this.player.position.x - enemyPos.x;
                const dz = this.player.position.z - enemyPos.z;
                const distXZ = Math.sqrt(dx * dx + dz * dz);
                const minDist = playerRadius + enemyRadius;
                
                // If too close to enemy, push player away
                if (distXZ < minDist && distXZ > 0.001) {
                    const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
                    const pushAmount = minDist - distXZ + 0.01;
                    this.player.position.addScaledVector(pushDir, pushAmount);
                    
                    // Stop movement in that direction
                    const dotProduct = moveStep.dot(pushDir);
                    if (dotProduct > 0) {
                        moveStep.sub(pushDir.multiplyScalar(dotProduct));
                    }
                }
            }
        }
    }

    updateCamera(dt) {
        // Rigid attachment for now to prevent "detachment" feeling
        this.player.currentOffset.copy(this.player.cameraOffset);

        // Calculate camera position based on player position + rotated offset
        const offset = this.player.currentOffset.clone();
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw);

        const targetPos = this.player.position.clone().add(offset);
        this.player.camera.position.copy(targetPos);

        // Emit movement for NetworkManager & Visuals
        eventBus.emit('player:move', {
            position: this.player.position,
            rotation: { x: this.player.pitch, y: this.player.yaw, z: 0 },
            isGrounded: this.player.isGrounded
        });
    }
}
