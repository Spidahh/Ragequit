/**
 * BotPlayer.js
 * AI-controlled player for PvP modes.
 * Mimics Player.js but driven by logic instead of InputManager.
 */
import * as THREE from 'three';
import { Player } from './Player.js';
import { SKILL_DATA } from '../data/SkillData.js';

export class BotPlayer extends Player {
    constructor(scene, team, position) {
        // We can't easily extend Player if Player depends on Camera/Input.
        // But Player.js takes (scene, camera).
        // Bots don't have a camera. We can pass a dummy or null?
        // Let's check Player.js constructor.
        // It uses camera for audio listener and raycasting.
        // We might need a refactor or a separate class.
        // For speed, let's create a separate Bot class that shares visuals.
        // Actually, extending Player is risky if it has heavy input logic.
        // Let's make a standalone Bot that looks like a player.

        // Wait, NetworkManager spawns "OtherPlayers" as simple meshes.
        // Bots should be like "OtherPlayers" but with AI.
        // Let's use a simplified class.

        super(scene, null); // Pass null camera?

        this.team = team;
        this.isBot = true;
        this.mesh.position.copy(position);

        // Bot State
        this.state = 'IDLE'; // IDLE, ROAM, CHASE, ATTACK
        this.target = null;
        this.decisionTimer = 0;

        // Override mesh color based on team
        const colors = {
            'Red': 0xff3333,
            'Blue': 0x3333ff,
            'Green': 0x33ff33,
            'Yellow': 0xffff33
        };
        if (this.mesh.material) {
            this.mesh.material.color.setHex(colors[team] || 0xffffff);
        }
    }

    // Override update to use AI
    update(dt, players, mapManager) {
        this.decisionTimer -= dt;

        if (this.decisionTimer <= 0) {
            this.makeDecision(players);
            this.decisionTimer = 1.0 + Math.random(); // Randomize decision time
        }

        this.executeState(dt, mapManager);
    }

    makeDecision(players) {
        // Find nearest enemy
        let nearest = null;
        let minDist = Infinity;

        players.forEach(p => {
            if (p === this || p.team === this.team || p.isDead) return;
            const d = this.mesh.position.distanceTo(p.mesh.position);
            if (d < minDist) {
                minDist = d;
                nearest = p;
            }
        });

        if (nearest && minDist < 20) {
            this.target = nearest;
            this.state = minDist < 10 ? 'ATTACK' : 'CHASE';
        } else {
            this.target = null;
            this.state = 'ROAM';
        }
    }

    executeState(dt, mapManager) {
        const speed = 5.0;

        if (this.state === 'ROAM') {
            // Random movement? Or just stand still?
            // Let's stand still for now or move randomly.
        } else if (this.state === 'CHASE' && this.target) {
            const dir = new THREE.Vector3().subVectors(this.target.mesh.position, this.mesh.position).normalize();
            dir.y = 0;
            this.mesh.position.addScaledVector(dir, speed * dt);
            this.mesh.lookAt(this.target.mesh.position.x, this.mesh.position.y, this.target.mesh.position.z);
        } else if (this.state === 'ATTACK' && this.target) {
            // Face target
            this.mesh.lookAt(this.target.mesh.position.x, this.mesh.position.y, this.target.mesh.position.z);

            // Fire! (Simulated Cooldown)
            if (this.decisionTimer <= 0) {
                // Reset timer for next attack (e.g., 1 second cooldown)
                this.decisionTimer = 1.0;

                // Visuals
                // We need to emit an event for visuals? Or just call a method?
                // For now, let's just deal damage if in range.
                const dist = this.mesh.position.distanceTo(this.target.mesh.position);
                if (dist < 10) { // Range check
                    if (this.target.takeDamage) {
                        this.target.takeDamage(10); // Base damage
                        console.log(`🤖 Bot ${this.team} hit ${this.target.team || 'Player'} for 10 dmg`);

                        // Check for kill
                        if (this.target.hp <= 0) {
                            // Emit Kill Event for Scoreboard
                            // eventBus.emit('bot:kill', { killer: this, victim: this.target });
                            // But wait, Player.die() emits 'player:death'.
                            // We need to know WHO killed them.
                            // Let's pass the killer to takeDamage?
                            // Player.js takeDamage doesn't accept source yet.
                            // For now, let's just emit a generic kill event here if we know we killed them.
                            eventBus.emit('combat:kill', {
                                killerId: `Bot-${this.team}`,
                                victimId: this.target.isBot ? `Bot-${this.target.team}` : 'Player',
                                skillId: 'BotAttack'
                            });
                        }
                    }
                }
            }
        }

        // Gravity
        // Simple gravity
    }
}
