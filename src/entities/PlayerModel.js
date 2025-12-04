/**
 * PlayerModel.js
 * Procedural 3D Character Model (Head, Body, Limbs)
 */
import * as THREE from 'three';
import { Easing } from '../core/Utils.js';
import { eventBus } from '../core/EventBus.js';

export class PlayerModel extends THREE.Group {
    constructor() {
        super();
        this.init();
    }

    init() {
        // Materials - Enhanced with better visual quality
        const armorMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.6, 
            metalness: 0.7,
            envMapIntensity: 0.5
        });
        const skinMat = new THREE.MeshStandardMaterial({ 
            color: 0xffccaa, 
            roughness: 0.8,
            metalness: 0.1
        });
        const jointMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.9,
            metalness: 0.3
        });

        // 1. Torso (Parent for Head/Arms)
        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), armorMat);
        this.torso.position.y = 1.4; // Chest height
        this.torso.castShadow = true;
        this.torso.receiveShadow = true;
        this.add(this.torso);

        // 2. Head
        this.head = new THREE.Group();
        this.head.position.y = 0.5; // Relative to Torso
        this.torso.add(this.head);

        const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), skinMat);
        this.head.add(headMesh);

        // Visor/Helmet
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), jointMat);
        visor.position.y = 0.05;
        visor.position.z = 0.02;
        this.head.add(visor);

        // 3. Arms
        this.leftArm = this.createLimb(armorMat, jointMat, -0.45, 0.3);
        this.rightArm = this.createLimb(armorMat, jointMat, 0.45, 0.3);
        this.torso.add(this.leftArm);
        this.torso.add(this.rightArm);

        // Tool Holders (For Weapons/Shields)
        this.leftHandTool = new THREE.Group();
        this.leftHandTool.position.y = -0.7; // At hand position
        this.leftArm.add(this.leftHandTool);

        this.rightHandTool = new THREE.Group();
        this.rightHandTool.position.y = -0.7; // At hand position
        this.rightArm.add(this.rightHandTool);

        // 4. Hips (Parent for Legs)
        this.hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), jointMat);
        this.hips.position.y = -0.5; // Relative to Torso
        this.torso.add(this.hips);

        // 5. Legs
        this.leftLeg = this.createLimb(armorMat, jointMat, -0.2, -0.1, true);
        this.rightLeg = this.createLimb(armorMat, jointMat, 0.2, -0.1, true);
        this.hips.add(this.leftLeg);
        this.hips.add(this.rightLeg);
    }

    createLimb(mainMat, jointMat, x, y, isLeg = false) {
        const limbGroup = new THREE.Group();
        limbGroup.position.set(x, y, 0);

        // Upper Limb
        const upperGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        const upper = new THREE.Mesh(upperGeo, mainMat);
        upper.position.y = -0.2;
        upper.castShadow = true;
        upper.receiveShadow = true;
        limbGroup.add(upper);

        // Joint (Elbow/Knee)
        const joint = new THREE.Mesh(new THREE.SphereGeometry(0.1), jointMat);
        joint.position.y = -0.45;
        joint.castShadow = true;
        joint.receiveShadow = true;
        limbGroup.add(joint);

        // Lower Limb
        const lowerGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
        const lower = new THREE.Mesh(lowerGeo, mainMat);
        lower.position.y = -0.7;
        lower.castShadow = true;
        lower.receiveShadow = true;
        limbGroup.add(lower);

        return limbGroup;
    }

    swingArm() {
        this.isAttacking = true;
        this.attackTimer = 0;
        this.attackType = 'SWING';
    }

    raiseArm() {
        this.isAttacking = true;
        this.attackTimer = 0;
        this.attackType = 'RAISE';
    }

    setGrounded(isGrounded) {
        this.isGrounded = isGrounded;
    }

    updateAnimation(speed, dt, gameTime = 0) {
        // Base Idle/Walk - use passed gameTime instead of Date.now()
        const time = gameTime * 0.005 * speed;

        // JUMP POSE
        if (!this.isGrounded) {
            // Legs bent back
            this.leftLeg.rotation.x = 0.5;
            this.rightLeg.rotation.x = 0.5;
            // Arms out for balance
            this.leftArm.rotation.z = -0.5;
            if (!this.isAttacking) this.rightArm.rotation.z = 0.5;

            // Tilt forward slightly
            this.rotation.x = 0.2;
            return; // Skip walk cycle
        }

        // Reset Arms Z (Balance)
        this.leftArm.rotation.z = 0;
        if (!this.isAttacking) this.rightArm.rotation.z = 0;

        // 1. Run Tilt (Lean forward when moving)
        const targetLean = speed > 0.1 ? 0.2 : 0;
        this.rotation.x = THREE.MathUtils.lerp(this.rotation.x, targetLean, 0.1);

        if (speed > 0.1) {
            // Legs
            this.leftLeg.rotation.x = Math.sin(time) * 0.8; // Wider stride
            this.rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.8;

            // Arms (opposite to legs)
            this.leftArm.rotation.x = Math.sin(time + Math.PI) * 0.8;
            if (!this.isAttacking) this.rightArm.rotation.x = Math.sin(time) * 0.8;

            // Footstep Sound (Trigger at peak of sin wave for each leg)
            // We use a simple latch to avoid multiple triggers per step
            const cycle = Math.sin(time);
            if (cycle > 0.95 && !this.stepRightTriggered) {
                eventBus.emit('player:step');
                this.stepRightTriggered = true;
                this.stepLeftTriggered = false;
            } else if (cycle < -0.95 && !this.stepLeftTriggered) {
                eventBus.emit('player:step');
                this.stepLeftTriggered = true;
                this.stepRightTriggered = false;
            }
        } else {
            // Idle Breathing - use gameTime instead of Date.now()
            const breath = Math.sin(gameTime * 0.002) * 0.05;
            this.scale.y = 1 + breath * 0.02;
            this.position.y = 1 + breath; // Bob

            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            if (!this.isAttacking) this.rightArm.rotation.x = 0;
        }

        // Attack Overrides
        if (this.isAttacking) {
            this.attackTimer += (dt || 0.016);

            if (this.attackType === 'SWING') {
                // Weighted Swing (Back Out)
                const duration = 0.4;
                if (this.attackTimer < duration) {
                    const progress = this.attackTimer / duration;
                    const eased = Easing.easeOutBack(progress);

                    // Start high (-PI/2), swing down fast to (PI/4), recover
                    // We want a "Strike" feeling.
                    // 0 -> Windup (Up)
                    // 0.2 -> Strike (Down)
                    // 1.0 -> Recover

                    if (progress < 0.2) {
                        // Windup - smoothed with easing
                        const windupProgress = progress * 5; // 0-1 over 0.2 duration
                        this.rightArm.rotation.x = THREE.MathUtils.lerp(0, -Math.PI, Easing.easeOutQuad(windupProgress));
                    } else {
                        // Strike - eased recovery
                        const strikeProgress = (progress - 0.2) / 0.8;
                        this.rightArm.rotation.x = THREE.MathUtils.lerp(-Math.PI, 0, Easing.easeOutElastic(strikeProgress));
                    }

                    this.rightArm.rotation.z = Math.sin(progress * Math.PI) * 0.5;
                } else {
                    this.isAttacking = false;
                    this.rightArm.rotation.z = 0;
                }
            } else if (this.attackType === 'RAISE') {
                // Smooth Raise
                const duration = 0.5;
                if (this.attackTimer < duration) {
                    const progress = this.attackTimer / duration;
                    const eased = Easing.easeOutQuad(progress);
                    this.rightArm.rotation.x = -Math.PI / 2.5 * (progress < 0.2 ? progress * 5 : 1);
                } else {
                    this.isAttacking = false;
                }
            }
        }
    }
}
