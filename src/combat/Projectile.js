/**
 * Projectile.js
 * Represents a moving projectile in the world.
 * Handles Linear and Parabolic physics.
 */
import * as THREE from 'three';
import TuningConfig from '../config/TuningConfig.js';

export class Projectile {
    constructor(scene, position, velocity, data) {
        this.scene = scene;
        this.velocity = velocity; // Vector3
        this.data = data;
        this.lifeTime = 5.0; // Seconds (increased from 3.0 for longer arc)
        this.isDead = false;

        // Visuals
        let geometry;
        if (data.vfx && data.vfx.shape === 'cylinder') {
            geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
            geometry.rotateX(Math.PI / 2); // Point forward
        } else if (data.vfx && data.vfx.shape === 'sphere_large') {
            geometry = new THREE.SphereGeometry(0.5, 16, 16);
        } else {
            geometry = new THREE.SphereGeometry(0.2, 8, 8);
        }

        const color = (data.vfx && data.vfx.color) ? data.vfx.color : 0xffffff;
        const material = new THREE.MeshBasicMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        // ✅ PROJECTILE CONTRAST: Add glow for visibility (tuned)
        const cfg = TuningConfig?.vfxClamp ?? {};
        const emissiveIntensity = cfg.projectileEmissive ?? 1.2;
        const haloScale = cfg.haloScale ?? 1.4;
        const trailAlpha = cfg.trailAlpha ?? 0.7;
        
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: emissiveIntensity,
          transparent: true,
          opacity: 1.0
        });
        
        this.mesh.material = glowMaterial;
        
        // ✅ PROJECTILE HALO: Semi-transparent halo for contrast
        const haloGeometry = geometry.clone();
        const haloMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.2,
          wireframe: false
        });
        
        const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
        haloMesh.scale.multiplyScalar(haloScale);
        this.mesh.add(haloMesh);

        // Orient to velocity
        if (this.velocity.lengthSq() > 0) {
            this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));
        }

        this.scene.add(this.mesh);
        
        // ✅ PROJECTILE TRAIL - Visual trajectory feedback
        this.trail = null;
        this.trailPoints = [position.clone()];
        this.trailUpdateInterval = 0.05; // Sample trail every 50ms
        this.trailTimer = 0;
        
        if (data.vfx && data.vfx.hasTrail !== false) {  // Enable by default
            this.createTrail(color);
        }
    }
    
    createTrail(color) {
        /**
         * Create a line trail following the projectile
         */
        const trailGeometry = new THREE.BufferGeometry();
        const positions = [this.mesh.position.clone()];
        
        const cfg = TuningConfig?.vfxClamp ?? {};
        const trailAlpha = cfg.trailAlpha ?? 0.7;
        
        const trailMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: trailAlpha,
            linewidth: 1
        });
        
        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(this.trail);
    }

    update(dt) {
        if (this.isDead) return;

        // 1. Physics
        if (this.data.physics === 'PARABOLIC') {
            this.velocity.y -= 9.81 * dt; // Gravity
        }

        // Move
        const moveStep = this.velocity.clone().multiplyScalar(dt);
        this.mesh.position.add(moveStep);

        // Re-orient if parabolic
        if (this.data.physics === 'PARABOLIC') {
            this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));
        }
        
        // ✅ Update trail
        if (this.trail) {
            this.trailTimer += dt;
            if (this.trailTimer >= this.trailUpdateInterval) {
                this.trailPoints.push(this.mesh.position.clone());
                this.trailTimer = 0;
                
                // Update trail geometry
                const positions = new Float32Array(this.trailPoints.length * 3);
                for (let i = 0; i < this.trailPoints.length; i++) {
                    positions[i * 3] = this.trailPoints[i].x;
                    positions[i * 3 + 1] = this.trailPoints[i].y;
                    positions[i * 3 + 2] = this.trailPoints[i].z;
                }
                
                this.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                
                // Fade trail opacity as it ages
                const fadePercentage = 1.0 - (this.lifeTime / 5.0);
                this.trail.material.opacity = 0.6 * (1.0 - Math.min(fadePercentage, 1.0));
            }
        }

        // 2. Life timer
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.isDead = true; // System will cleanup
        }
    }

    destroy() {
        this.isDead = true;
        
        // ✅ Clean up halo mesh
        if (this.mesh.children.length > 0) {
            this.mesh.children.forEach(child => {
                child.geometry.dispose();
                child.material.dispose();
            });
        }
        
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        
        // ✅ Clean up trail
        if (this.trail) {
            this.scene.remove(this.trail);
            this.trail.geometry.dispose();
            this.trail.material.dispose();
        }
    }
}
