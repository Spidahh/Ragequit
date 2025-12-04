/**
 * BotManager.js
 * Manages bot lifecycle for PvP modes.
 */
import * as THREE from 'three';
import { BotPlayer } from '../entities/BotPlayer.js';
import { eventBus } from '../core/EventBus.js';

export class BotManager {
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.bots = [];
        this.isActive = false;

        console.log('🤖 BotManager Initialized');
    }

    startMatch(mode, playerTeam) {
        if (mode !== 'pvp' && mode !== 'TEAM CARNAGE') return;

        this.isActive = true;
        this.clearBots();

        console.log(`🤖 Starting Bot Match. Player Team: ${playerTeam}`);

        // Teams
        const teams = ['Red', 'Blue', 'Green', 'Yellow'];

        // Spawn 3 bots per team (total 4 per team including player)
        teams.forEach(team => {
            let count = 3;
            // If this is player's team, spawn 3 bots (total 4 with player)
            // If enemy team, spawn 4 bots? 
            // Let's just spawn 3 bots per team for now to keep it balanced 4v4v4v4
            // (Assuming player fills one slot in their team)

            if (team.toLowerCase() !== playerTeam.toLowerCase()) {
                count = 4; // Enemy teams get 4 bots
            }

            for (let i = 0; i < count; i++) {
                this.spawnBot(team);
            }
        });
    }

    spawnBot(team) {
        const spawnPoint = this.mapManager.getSpawnPoint(team.toLowerCase());
        // Add random offset
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            0,
            (Math.random() - 0.5) * 10
        );
        const pos = spawnPoint.clone().add(offset);

        const bot = new BotPlayer(this.scene, team, pos);
        this.bots.push(bot);
        this.scene.add(bot.mesh);
    }

    update(dt, players) {
        if (!this.isActive) return;

        // Combine real players and bots for AI targeting
        const allEntities = [...players, ...this.bots];

        this.bots.forEach(bot => {
            bot.update(dt, allEntities, this.mapManager);
        });
    }

    clearBots() {
        this.bots.forEach(bot => {
            if (bot.mesh) this.scene.remove(bot.mesh);
        });
        this.bots = [];
    }
}
