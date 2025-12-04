/**
 * HealingTotem.js
 * Arena objective - Central structure that emits healing aura.
 * Destroying it grants rewards. Standing near it provides passive regen.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

export class HealingTotem {
  constructor(position = new THREE.Vector3(0, 0, 0)) {
    this.position = position.clone();
    this.hp = 100;
    this.maxHp = 100;
    this.radius = 15;  // Healing aura radius
    this.healRate = 2; // HP/sec to nearby players
    
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    
    this.alive = true;
    this.lastHealTime = Date.now();
    
    this.createGeometry();
  }

  createGeometry() {
    // Core (Glowing sphere)
    const coreGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      emissive: 0x00aa00,
      wireframe: false
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.coreMesh.position.y = 2;
    this.group.add(this.coreMesh);

    // Pedestal
    const pedGeo = new THREE.CylinderGeometry(1, 1.5, 2, 8);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a2d,
      roughness: 0.6,
      metalness: 0.2
    });
    const pedestal = new THREE.Mesh(pedGeo, pedMat);
    pedestal.position.y = 1;
    this.group.add(pedestal);

    // Base Platform
    const basGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.3, 16);
    const basMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a1a,
      roughness: 0.7,
      metalness: 0.1
    });
    const base = new THREE.Mesh(basGeo, basMat);
    base.position.y = 0.15;
    this.group.add(base);

    // Healing Ring (rotating indicator)
    const ringGeo = new THREE.TorusGeometry(1.5, 0.2, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2.5;
    this.ring.position.y = 2;
    this.group.add(this.ring);

    // Light (Ambient healing glow)
    this.light = new THREE.PointLight(0x00ff00, 3, 25);
    this.light.position.copy(this.position).add(new THREE.Vector3(0, 2.5, 0));
    this.group.add(this.light);
  }

  update(dt, players) {
    if (!this.alive) return;

    // Rotate ring
    this.ring.rotation.z += (dt * 0.5);

    // Animate core
    this.coreMesh.scale.set(
      0.9 + Math.sin(Date.now() * 0.003) * 0.15,
      0.9 + Math.sin(Date.now() * 0.003) * 0.15,
      0.9 + Math.sin(Date.now() * 0.003) * 0.15
    );

    // Apply healing to nearby players
    if (Array.isArray(players)) {
      players.forEach(player => {
        const dist = this.position.distanceTo(player.position);
        if (dist < this.radius && player.hp < player.maxHp) {
          player.hp = Math.min(player.hp + (this.healRate * dt), player.maxHp);
          
          // Broadcast healing
          if (Date.now() - this.lastHealTime > 100) {
            eventBus.emit('totem:healed', { playerId: player.id, amount: this.healRate * dt });
            this.lastHealTime = Date.now();
          }
        }
      });
    }
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    
    // VFX feedback
    eventBus.emit('totem:damaged', { hp: this.hp, maxHp: this.maxHp });

    if (this.hp <= 0) {
      this.destroy();
    }
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    
    // Burst of light
    const burstLight = new THREE.PointLight(0x00ff00, 10, 30);
    burstLight.position.copy(this.position).add(new THREE.Vector3(0, 2, 0));
    this.group.add(burstLight);

    // Fade out
    this.group.traverse(child => {
      if (child.material) {
        child.material.opacity = child.material.opacity || 1;
      }
    });

    // Broadcast destruction
    eventBus.emit('totem:destroyed', { position: this.position });

    // Remove from scene after fade
    setTimeout(() => {
      eventBus.emit('totem:removed');
    }, 2000);
  }

  getGroup() {
    return this.group;
  }

  getPosition() {
    return this.position;
  }

  getHealingRadius() {
    return this.radius;
  }

  isAlive() {
    return this.alive;
  }
}
