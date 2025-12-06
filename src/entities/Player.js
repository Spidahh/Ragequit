/**
 * PlayerController.js
 * Handles local player state and data.
 * Logic is now handled by MovementSystem.js.
 */
import * as THREE from 'three';
import { CONSTANTS } from '../core/Utils.js';
import { eventBus } from '../core/EventBus.js';

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // State
    // Position = center of player capsule (at player height/2 from ground)
    this.position = new THREE.Vector3(0, CONSTANTS.PLAYER_HEIGHT / 2, 0);
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;

    // Stats
    this.hp = CONSTANTS.MAX_HP;
    this.mana = CONSTANTS.MAX_MANA;
    this.stamina = CONSTANTS.MAX_STAMINA;

    // Camera Setup
    this.camera.position.copy(this.position);
    this.pitch = 0;
    this.yaw = 0;

    // Camera State
    this.isFirstPerson = true;
    // Eye height = from center of capsule to eyes
    this.cameraOffset = new THREE.Vector3(0, CONSTANTS.PLAYER_EYE_HEIGHT, 0);
    this.currentOffset = new THREE.Vector3(0, CONSTANTS.PLAYER_EYE_HEIGHT, 0);
    
    // ✅ SCREEN SHAKE OFFSET - Prevents VFX from overwriting camera position
    this.shakeOffset = new THREE.Vector3();

    this.initListeners();
  }

  initListeners() {
    // Listen for mode changes from SkillManager
    eventBus.on('camera:set_mode', (mode) => this.setCameraMode(mode));
  }

  setCameraMode(mode) {
    if (mode === 'FPS') {
      this.isFirstPerson = true;
      this.cameraOffset.set(0, CONSTANTS.PLAYER_EYE_HEIGHT, 0);
    } else {
      this.isFirstPerson = false;
      this.cameraOffset.set(0, CONSTANTS.PLAYER_HEIGHT / 2 + 1.5, 3.5); // 3rd Person (behind and above)
    }
    // Emit event for VisualManager
    eventBus.emit('camera:toggle', { mode: this.isFirstPerson ? 'FPS' : 'TPS' });
  }

  // Get forward direction based on camera orientation
  getForward() {
    const forward = new THREE.Vector3(0, 0, -1);
    // Apply pitch FIRST (vertical rotation around X axis)
    forward.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    // Then apply yaw (horizontal rotation around Y axis)
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    return forward.normalize();
  }

  // Get right direction
  getRight() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    return right.normalize();
  }

  // Update is now handled by MovementSystem
  update(dt) {
    // ✅ SCREEN SHAKE - Apply accumulated offset from VFXManager
    // Camera position = player position + eye offset + shake offset
    this.camera.position.copy(this.position)
      .add(this.currentOffset)
      .add(this.shakeOffset);
    
    // Decay shake offset back to zero
    this.shakeOffset.multiplyScalar(0.85);
    if (this.shakeOffset.length() < 0.001) {
      this.shakeOffset.set(0, 0, 0);
    }
  }

  takeDamage(amount) {
    if (this.hp <= 0) return;

    this.hp -= amount;
    eventBus.emit('player:damage', this.hp);

    // Screen Shake on damage
    eventBus.emit('vfx:request', { type: 'shake', intensity: 0.3 }); // We need to handle 'shake' in Game.js listener

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    console.log('💀 PLAYER DIED');
    eventBus.emit('player:death');

    // JUICE
    eventBus.emit('vfx:request', { type: 'blood', position: this.position });
    eventBus.emit('ui:announcement', { text: 'WASTED', style: 'win' }); // 'win' style is gold/big, maybe rename to 'critical'? Using 'win' for now as it's big.

    // Disable controls? handled by GameState usually.
  }
}
