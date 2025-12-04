/**
 * EnemySpawner.js
 * Handles Enemy Spawning and Wave Logic.
 * Part of the Phoenix Protocol Modular Architecture.
 */
import * as THREE from 'three';
import { Enemy } from '../../entities/Enemy.js';

export class EnemySpawner {
    constructor(scene) {
        this.scene = scene;
        this.currentWave = 0;
        this.waveInProgress = false;
        console.log('🌊 EnemySpawner Initialized');
    }

    spawnEnemy(position, enemiesList, difficultyMultiplier = 1.0) {
        const enemy = new Enemy(position);

        // Apply Difficulty Scaling
        enemy.maxHP *= difficultyMultiplier;
        enemy.hp = enemy.maxHP;
        enemy.attackDamage *= difficultyMultiplier;

        this.scene.add(enemy.mesh);
        enemiesList.push(enemy);
        return enemy;
    }

    startNextWave(enemiesList, playerPosition) {
        this.currentWave++;
        const count = 3 + Math.floor(this.currentWave * 1.5); // 3, 4, 6, 7...
        const difficulty = 1.0 + (this.currentWave * 0.1); // +10% stats per wave

        console.log(`🌊 Starting Wave ${this.currentWave}: ${count} enemies (Diff: ${difficulty.toFixed(1)}x)`);

        this.spawnWave(count, enemiesList, playerPosition, difficulty);
        return this.currentWave;
    }

    spawnWave(count, enemiesList, playerPosition, difficulty = 1.0) {
        if (!playerPosition) return;

        for (let i = 0; i < count; i++) {
            // Random angle around player
            const angle = Math.random() * Math.PI * 2;
            // Random radius 15-25 (Further away)
            const radius = 15 + Math.random() * 10;

            const x = playerPosition.x + Math.cos(angle) * radius;
            const z = playerPosition.z + Math.sin(angle) * radius;

            this.spawnEnemy(new THREE.Vector3(x, 1, z), enemiesList, difficulty);
        }
    }

    clear(enemiesList) {
        enemiesList.forEach(enemy => {
            if (enemy.mesh) this.scene.remove(enemy.mesh);
        });
        this.currentWave = 0;
    }
}
