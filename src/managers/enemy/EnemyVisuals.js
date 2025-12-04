/**
 * EnemyVisuals.js
 * Handles Visual Effects (Flash, Pop, Death).
 * Part of the Phoenix Protocol Modular Architecture.
 */
import * as THREE from 'three';

export class EnemyVisuals {
    constructor(scene) {
        this.scene = scene;
        console.log('🎨 EnemyVisuals Initialized');
    }

    flashDamage(enemy) {
        if (!enemy.mesh) return;

        const originalColor = enemy.mesh.material.color.getHex();
        enemy.mesh.material.color.setHex(0xffffff);
        enemy.mesh.material.emissive.setHex(0xff0000);
        enemy.mesh.material.emissiveIntensity = 0.5;

        // Pop
        enemy.mesh.scale.set(1.2, 1.2, 1.2);

        setTimeout(() => {
            if (enemy.mesh && enemy.mesh.material) {
                enemy.mesh.material.color.setHex(originalColor);
                enemy.mesh.material.emissive.setHex(0x000000);
                enemy.mesh.material.emissiveIntensity = 0;
                enemy.mesh.scale.set(1, 1, 1);
            }
        }, 150);
    }

    flashRed(enemy) {
        if (!enemy || !enemy.mesh) return;
        const originalColor = enemy.mesh.material.color.getHex();
        enemy.mesh.material.color.setHex(0xff0000);

        setTimeout(() => {
            if (enemy.mesh && enemy.mesh.material) {
                enemy.mesh.material.color.setHex(originalColor);
            }
        }, 200);
    }

    playDeathAnimation(enemy) {
        if (!enemy.mesh) return;

        // Rotate 90 degrees
        const fallDuration = 0.5;
        const startRotation = enemy.mesh.rotation.x;
        const endRotation = Math.PI / 2;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / fallDuration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            if (enemy.mesh) {
                enemy.mesh.rotation.x = startRotation + (endRotation - startRotation) * eased;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Fade out
                this.fadeOutAndRemove(enemy);
            }
        };
        animate();
    }

    fadeOutAndRemove(enemy) {
        setTimeout(() => {
            if (enemy.mesh) {
                enemy.mesh.material.transparent = true;
                let opacity = 1.0;
                const fadeInterval = setInterval(() => {
                    opacity -= 0.05;
                    if (opacity <= 0) {
                        clearInterval(fadeInterval);
                        if (enemy.mesh) this.scene.remove(enemy.mesh);
                    } else {
                        if (enemy.mesh) enemy.mesh.material.opacity = opacity;
                    }
                }, 50);
            }
        }, 1000);
    }
}
