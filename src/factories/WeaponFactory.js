/**
 * WeaponFactory.js
 * Generates 3D weapon models.
 */
import * as THREE from 'three';

export class WeaponFactory {
    static createStaff(color = 0x00ffff) {
        const group = new THREE.Group();

        // Handle (Dark Wood)
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8),
            new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8, metalness: 0.1 })
        );
        handle.castShadow = true;
        group.add(handle);

        // Orb Holder (Gold)
        const holder = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.02, 0.2, 6),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1, envMapIntensity: 0.6 })
        );
        holder.position.y = 0.8;
        holder.castShadow = true;
        group.add(holder);

        // Orb (Glowing)
        const orb = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 2.0,
                metalness: 0.2,
                transparent: true,
                opacity: 0.9
            })
        );
        orb.position.y = 1.0;

        // Add a point light to the orb for dynamic lighting
        const light = new THREE.PointLight(color, 1, 3);
        light.position.y = 1.0;
        group.add(light);

        group.add(orb);

        return group;
    }

    static createGreatsword() {
        const group = new THREE.Group();

        // Handle
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.2 })
        );
        handle.position.y = -0.7;
        handle.castShadow = true;
        group.add(handle);

        // Guard (Crossguard)
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.05, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.2, envMapIntensity: 0.5 })
        );
        guard.position.y = -0.4;
        guard.castShadow = true;
        group.add(guard);

        // Blade (Massive)
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1.6, 0.05),
            new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.05, envMapIntensity: 0.6 })
        );
        blade.position.y = 0.4;
        blade.castShadow = true;
        group.add(blade);

        // Blood Groove (Detail)
        const groove = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 1.2, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.8 })
        );
        groove.position.y = 0.4;
        group.add(groove);

        return group;
    }

    static createSword() {
        const group = new THREE.Group();

        // Handle
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8),
            new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8, metalness: 0.1 })
        );
        handle.position.y = -0.4;
        handle.castShadow = true;
        group.add(handle);

        // Guard
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.04, 0.08),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1, envMapIntensity: 0.6 })
        );
        guard.position.y = -0.2;
        guard.castShadow = true;
        group.add(guard);

        // Blade
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 1.0, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.05, envMapIntensity: 0.6 })
        );
        blade.position.y = 0.3;
        blade.castShadow = true;
        group.add(blade);

        return group;
    }

    static createShield() {
        const group = new THREE.Group();

        // Main Body (Kite Shield shape approximation)
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.8, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1a237e, metalness: 0.4, roughness: 0.5, envMapIntensity: 0.4 }) // Dark Blue
        );
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Rim (Gold)
        const rim = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.85, 0.04),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2, envMapIntensity: 0.6 })
        );
        rim.castShadow = true;
        group.add(rim);

        // Boss (Center bump)
        const boss = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.1, envMapIntensity: 0.6 })
        );
        boss.position.z = 0.05;
        boss.scale.z = 0.5;
        boss.castShadow = true;
        group.add(boss);

        // Handle (Back)
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.2 })
        );
        handle.rotation.z = Math.PI / 2;
        handle.position.z = -0.1;
        handle.castShadow = true;
        group.add(handle);

        return group;
    }

    static createBow() {
        const group = new THREE.Group();

        // Wood Material
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8, metalness: 0.1 });

        // Upper Limb
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), woodMat);
        upper.position.y = 0.3;
        upper.rotation.z = 0.3;
        upper.castShadow = true;
        group.add(upper);

        // Lower Limb
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), woodMat);
        lower.position.y = -0.3;
        lower.rotation.z = -0.3;
        lower.castShadow = true;
        group.add(lower);

        // String
        const string = new THREE.Mesh(
            new THREE.CylinderGeometry(0.005, 0.005, 1.1, 4),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        string.position.x = 0.15;
        group.add(string);

        return group;
    }
}
