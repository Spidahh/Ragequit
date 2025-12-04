/**
 * ChannelingSystem.js
 * Handles continuous skill effects, resource transfer, and death checks.
 * Part of the Phoenix Protocol Modular Architecture.
 */
import { eventBus } from '../../core/EventBus.js';

export class ChannelingSystem {
    constructor(player) {
        this.player = player;
        this.isChanneling = false;
        this.channelSkill = null;
        this.channelTimer = 0;

        console.log('🔋 ChannelingSystem Initialized');
    }

    startChanneling(skill) {
        if (this.isChanneling) return;

        this.isChanneling = true;
        this.channelSkill = skill;
        this.channelTimer = 0;

        console.log(`🔋 Started Channeling: ${skill.name}`);
        eventBus.emit('player:channel_start', skill.id);
    }

    stopChanneling() {
        if (!this.isChanneling) return;

        this.isChanneling = false;
        this.channelSkill = null;

        console.log('🔋 Stopped Channeling');
        eventBus.emit('player:channel_stop');
    }

    update(dt) {
        if (!this.isChanneling || !this.channelSkill) return;

        // 1. Death Check (Phoenix Protocol Rule)
        if (this.player.hp <= 0) {
            this.stopChanneling();
            return;
        }

        const skill = this.channelSkill;
        this.channelTimer += dt;

        // 2. Execute Tick (every 1s)
        if (this.channelTimer >= 1.0) {
            this.channelTimer = 0;
            this.processChannelTick(skill);
        }
    }

    processChannelTick(skill) {
        // Resource Transfer Logic
        if (skill.type === 'CHANNEL') {
            const rate = skill.rate || 5;

            // Check Source
            if (this.player[skill.source] >= rate) {
                this.player[skill.source] -= rate;

                // Cap Target
                const maxTarget = skill.target === 'hp' ? 100 : 100; // Simplified max check
                this.player[skill.target] = Math.min(this.player[skill.target] + rate, maxTarget);

                // Visuals
                eventBus.emit('vfx:channel_tick', {
                    position: this.player.position,
                    color: skill.vfx.color
                });

                console.log(`🔄 Transferred ${rate} ${skill.source} -> ${skill.target}`);
            } else {
                // Not enough resources, stop
                this.stopChanneling();
            }
        }
    }
}
