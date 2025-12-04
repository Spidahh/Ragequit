/**
 * StanceSystem.js
 * Handles stance state, camera switching, and visual updates.
 * Part of the Phoenix Protocol Modular Architecture.
 */
import { eventBus } from '../../core/EventBus.js';

export class StanceSystem {
    constructor(visualManager) {
        this.visualManager = visualManager;
        // ✅ Start in MAGIC stance so player can cast immediately on game start
        this.currentStance = 'MAGIC';

        console.log('🛡️ StanceSystem Initialized (MAGIC stance ready)');
    }

    setStance(stance) {
        if (this.currentStance === stance) return;

        console.log(`⚔️ Switching Stance: ${this.currentStance} -> ${stance}`);
        this.currentStance = stance;

        // 1. Update Visuals (Model, Weapons)
        this.visualManager.setStance(stance);

        // 2. Update Camera (FPS vs TPS)
        if (stance === 'MELEE') {
            eventBus.emit('camera:set_mode', 'TPS');
        } else {
            // BOW and MAGIC are FPS
            eventBus.emit('camera:set_mode', 'FPS');
        }

        // 3. Emit Event for UI/Other systems
        eventBus.emit('player:stance_changed', stance);
    }

    getStance() {
        return this.currentStance;
    }
}
