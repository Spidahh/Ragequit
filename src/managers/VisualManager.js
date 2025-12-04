/**
 * VisualManager.js
 * Combat 2.0: Strict Stance-Based Visuals.
 */
import * as THREE from 'three';
import { PlayerModel } from '../entities/PlayerModel.js';
import { WeaponFactory } from '../factories/WeaponFactory.js';
import { eventBus } from '../core/EventBus.js';

export class VisualManager {
    constructor(scene) {
        this.scene = scene;
        this.playerModel = null;
        this.currentStance = null;
        this.gameTime = 0;  // Track accumulated game time
        
        // Store event handlers for cleanup
        this.eventHandlers = {
            'player:move': (data) => this.updateTransform(data),
            'visual:set_stance': (stance) => this.setStance(stance),
            'visual:block': (isBlocking) => this.toggleShield(isBlocking),
            'player:attack': (data) => this.triggerAttackAnimation(data),
            'game:start': () => this.onGameStart(),
            'game:reset': () => this.onGameReset()
        };

        this.init();
    }

    init() {
        // 1. Create Player Model
        this.playerModel = new PlayerModel();
        this.scene.add(this.playerModel);

        // 2. Initial State
        this.playerModel.visible = false; // Default to hidden (FPS mode usually)

        this.setupListeners();
        console.log('👁️ VisualManager 2.0 Initialized');
    }

    setupListeners() {
        for (const [event, handler] of Object.entries(this.eventHandlers)) {
            eventBus.on(event, handler);
        }
    }
    
    // Cleanup method for proper disposal
    dispose() {
        for (const [event, handler] of Object.entries(this.eventHandlers)) {
            eventBus.off(event, handler);
        }
        if (this.playerModel) {
            this.scene.remove(this.playerModel);
        }
        console.log('👁️ VisualManager disposed');
    }
    
    onGameStart() {
        if (this.playerModel) {
            this.playerModel.visible = true;
            // ✅ Start in MAGIC stance so player can cast immediately
            this.setStance('MAGIC');
        }
        console.log('👁️ VisualManager: Player Model Visible');
    }
    
    onGameReset() {
        if (this.playerModel) {
            this.playerModel.visible = false;
        }
    }

    triggerAttackAnimation(data) {
        if (!this.playerModel) return;

        // Determine animation based on stance/skill
        // For now, simple logic: Melee = Swing, Others = Raise
        if (this.currentStance === 'MELEE') {
            this.playerModel.swingArm();
        } else {
            this.playerModel.raiseArm();
        }
    }

    updateTransform(data) {
        if (!this.playerModel) return;

        // Sync Position
        this.playerModel.position.copy(data.position).add(new THREE.Vector3(0, -1.8, 0));

        // Sync Rotation
        if (data.rotation) {
            this.playerModel.rotation.y = data.rotation.y + Math.PI;
        }

        // Sync State (Jump/Ground)
        if (data.isGrounded !== undefined) {
            this.playerModel.setGrounded(data.isGrounded);
        }

        // Animate
        this.playerModel.updateAnimation(1.0);
    }

    setStance(stance) {
        // Null checks for safety
        if (!this.playerModel) {
            console.warn('⚠️ VisualManager: PlayerModel not initialized');
            return;
        }

        if (this.currentStance === stance) return;
        this.currentStance = stance;
        console.log(`👁️ Visual Stance: ${stance}`);

        // 1. Clear All Tools - with null checks
        if (this.playerModel.rightHandTool) this.playerModel.rightHandTool.clear();
        if (this.playerModel.leftHandTool) this.playerModel.leftHandTool.clear();

        // 2. Apply Stance Visuals
        if (stance === 'MELEE') {
            // 3rd Person: Show Body, Equip Sword
            this.playerModel.visible = true;

            const sword = WeaponFactory.createGreatsword();
            if (!sword) {
                console.error('❌ Failed to create greatsword');
                return;
            }
            
            sword.position.set(0, 0.2, 0.2);
            sword.rotation.x = Math.PI / 2;
            
            if (this.playerModel.rightHandTool) {
                this.playerModel.rightHandTool.add(sword);
            } else {
                console.warn('⚠️ rightHandTool not available');
            }

        } else if (stance === 'BOW') {
            // 1st Person: Hide Body
            this.playerModel.visible = false;
        } else if (stance === 'MAGIC') {
            // 1st Person: Hide Body
            this.playerModel.visible = false;
        }
    }

    toggleShield(isBlocking) {
        if (!this.playerModel) {
            console.warn('⚠️ VisualManager: PlayerModel not initialized');
            return;
        }
        
        if (this.currentStance !== 'MELEE') return;

        if (!this.playerModel.leftHandTool) {
            console.warn('⚠️ leftHandTool not available');
            return;
        }
        
        this.playerModel.leftHandTool.clear();

        if (isBlocking) {
            const shield = WeaponFactory.createShield();
            shield.position.set(0.2, 0.4, 0);
            shield.rotation.y = Math.PI / 2;
            this.playerModel.leftHandTool.add(shield);
        }
    }

    update(dt) {
        // Accumulate game time for animations
        this.gameTime += dt;
        
        if (this.playerModel) {
            // Pass gameTime to updateAnimation for breathing/idle effects
            // Speed 0 for now (idle), but dt and gameTime are key for attacks and breathing
            this.playerModel.updateAnimation(0, dt, this.gameTime);
        }
    }
}
