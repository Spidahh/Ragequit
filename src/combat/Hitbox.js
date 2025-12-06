/**
 * Hitbox.js
 * Utilities for detecting hits in 3D space.
 * Handles Cone, Sphere, and Raycast checks.
 */
import * as THREE from 'three';

export class Hitbox {
    /**
     * Check if a target is within a cone (e.g., Melee Slash).
     * @param {THREE.Vector3} origin - Source position.
     * @param {THREE.Vector3} direction - Forward direction (normalized).
     * @param {THREE.Vector3} targetPos - Target position.
     * @param {number} range - Max distance.
     * @param {number} angle - Cone angle in degrees.
     * @returns {boolean}
     */
    static checkCone(origin, direction, targetPos, range, angle) {
        const toTarget = targetPos.clone().sub(origin);
        const distSq = toTarget.lengthSq();

        if (distSq > range * range) return false;

        toTarget.normalize();
        const dot = direction.dot(toTarget);
        const threshold = Math.cos((angle / 2) * (Math.PI / 180));

        return dot >= threshold;
    }

    /**
     * Check if a target is within a sphere (e.g., AoE Explosion).
     * @param {THREE.Vector3} origin - Center of explosion.
     * @param {THREE.Vector3} targetPos - Target position.
     * @param {number} radius - Radius of effect.
     * @returns {boolean}
     */
    static checkSphere(origin, targetPos, radius) {
        const distSq = origin.distanceToSquared(targetPos);
        return distSq <= radius * radius;
    }

    /**
     * Perform a raycast against a set of objects.
     * @param {THREE.Vector3} origin 
     * @param {THREE.Vector3} direction 
     * @param {Array<THREE.Object3D>} objects 
     * @param {number} maxDistance 
     * @returns {THREE.Intersection|null}
     */
    static raycast(origin, direction, objects, maxDistance = 100) {
        const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
        const intersects = raycaster.intersectObjects(objects, true);
        return intersects.length > 0 ? intersects[0] : null;
    }
}
