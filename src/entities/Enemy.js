/**
 * Enemy.js
 * Enemy Data Model & Visuals
 */
import * as THREE from 'three';

export const ENEMY_STATES = {
    IDLE: 'IDLE',
    CHASE: 'CHASE',
    ATTACK: 'ATTACK',
    HURT: 'HURT'
};

export class Enemy {
    constructor(position) {
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        // Stats
        this.hp = 100;
        this.maxHP = 100;
        this.isDead = false;
        this.radius = 0.5;
        this.baseY = 1; // Standard height

        // AI State
        this.state = ENEMY_STATES.IDLE;
        this.stateTimer = 0;

        // Combat
        this.attackTimer = 0;
        this.attackCooldown = 1.5;  // ✅ COMPETITIVE: 2.0→1.5s (-25%) faster attacks
        this.attackRange = 2.0;  // ✅ COMPETITIVE: 2.5→2.0 (-20%) closer engagement
        this.attackDamage = 22;  // ✅ COMPETITIVE: 15→22 (+47%) matches player TTK

        // Physics
        this.velocity = new THREE.Vector3();
        this.knockbackVelocity = new THREE.Vector3();

        // Health Bar
        this.healthBar = this.createHealthBar();
        this.mesh.add(this.healthBar);
    }

    createHealthBar() {
        // Create a simple health bar above the enemy
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 128, 32);

        // HP bar (red)
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(2, 2, 124, 28);

        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Create plane
        const geometry = new THREE.PlaneGeometry(1, 0.25);
        const bar = new THREE.Mesh(geometry, material);
        bar.position.y = 1.3; // Above head
        bar.userData.canvas = canvas;
        bar.userData.ctx = ctx;
        bar.userData.texture = texture;

        return bar;
    }

    updateHealthBar() {
        if (!this.healthBar || !this.healthBar.userData.canvas) return;

        const canvas = this.healthBar.userData.canvas;
        const ctx = this.healthBar.userData.ctx;
        const texture = this.healthBar.userData.texture;

        // Clear
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 128, 32);

        // HP bar width based on health
        const healthPercent = (this.hp / this.maxHP) * 124;
        ctx.fillStyle = this.hp > this.maxHP * 0.5 ? '#33ff33' : (this.hp > this.maxHP * 0.25 ? '#ffff33' : '#ff3333');
        ctx.fillRect(2, 2, healthPercent, 28);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 128, 32);

        texture.needsUpdate = true;
    }

    createMesh() {
        // Enemy body (flesh-colored pillar)
        const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const fleshMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa5555, // Flesh color
            roughness: 0.8,
            metalness: 0.2,
            envMapIntensity: 0.4
        });

        const bodyMesh = new THREE.Mesh(bodyGeometry, fleshMaterial);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;

        // Add iron bands (decorative straps)
        const bandGeometry = new THREE.BoxGeometry(1.1, 0.1, 1.1);
        const ironMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Dark iron
            roughness: 0.6,
            metalness: 0.9,
            envMapIntensity: 0.5
        });

        const band1 = new THREE.Mesh(bandGeometry, ironMaterial);
        band1.position.set(0, 0.5, 0);
        band1.castShadow = true;
        band1.receiveShadow = true;
        bodyMesh.add(band1);

        const band2 = new THREE.Mesh(bandGeometry, ironMaterial);
        band2.position.set(0, -0.5, 0);
        band2.castShadow = true;
        band2.receiveShadow = true;
        bodyMesh.add(band2);

        return bodyMesh;
    }

    takeDamage(damage) {
        if (this.isDead) return;
        
        this.hp -= damage;
        console.log(`💢 Enemy took ${damage} damage. HP: ${this.hp}/${this.maxHP}`);
        
        // Update health bar
        this.updateHealthBar();
        
        // Change state to HURT
        this.state = ENEMY_STATES.HURT;
        this.stateTimer = 0.5; // Stun for 0.5 seconds
        
        // Flash effect (change color briefly)
        const originalColor = this.mesh.material.color.getHex();
        this.mesh.material.color.setHex(0xff0000); // Red flash
        setTimeout(() => {
            if (!this.isDead) {
                this.mesh.material.color.setHex(originalColor);
            }
        }, 100);
        
        // Check if dead
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            this.die();
        }
    }

    applyKnockback(direction, force = 5) {
        /**
         * Apply knockback to enemy
         * @param {THREE.Vector3} direction - Direction of knockback (normalized)
         * @param {number} force - Knockback magnitude
         */
        this.knockbackVelocity.copy(direction).multiplyScalar(force);
        console.log(`💨 Enemy knockback applied: ${force}x in direction`, direction);
    }

    die() {
        console.log('💀 Enemy defeated');
        this.state = ENEMY_STATES.IDLE;
        // Could add death animation here in future
        // For now, just mark as dead (will be removed by manager)
    }
}
