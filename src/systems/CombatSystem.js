/**
 * CombatSystem.js
 * Handles combat-related input and orchestrates the SkillManager.
 * Part of the Phoenix Protocol Restructuring.
 */
import { eventBus } from '../core/EventBus.js';
import { ACTIONS } from '../managers/KeybindManager.js';

export class CombatSystem {
    constructor(skillManager, keybindManager) {
        this.skillManager = skillManager;
        this.keybindManager = keybindManager;
        this.isEnabled = false;
        this.lastKey = null;
        this.lastTapTime = 0;

        this.initListeners();
        console.log('⚔️ CombatSystem Initialized');
    }

    initListeners() {
        // Mouse Input
        eventBus.on('game:mousedown', (button) => {
            console.log('CombatSystem: Mouse Down Received', button, 'Enabled:', this.isEnabled);
            if (!this.isEnabled) return;

            if (button === 0) { // Left Click
                if (!document.pointerLockElement) {
                    document.body.requestPointerLock();
                } else {
                    this.skillManager.handleBasicAttack();
                }
            }
            if (button === 2) { // Right Click
                this.skillManager.handleBlock(true);
            }
        });

        eventBus.on('game:mouseup', (button) => {
            if (!this.isEnabled) return;

            if (button === 2) {
                this.skillManager.handleBlock(false);
            }
        });

        // Keyboard Input
        eventBus.on('game:keydown', (code) => {
            if (!this.isEnabled) return;

            // Map Actions to Slots
            const now = Date.now();
            const slots = [
                { action: ACTIONS.SLOT_1, index: 1 },
                { action: ACTIONS.SLOT_2, index: 2 },
                { action: ACTIONS.SLOT_3, index: 3 },
                { action: ACTIONS.SLOT_4, index: 4 },
                { action: ACTIONS.SLOT_5, index: 5 },
                { action: ACTIONS.SLOT_6, index: 6 },
                { action: ACTIONS.SLOT_7, index: 7 },
                { action: ACTIONS.SLOT_8, index: 8 },
                { action: ACTIONS.SLOT_9, index: 9 },
                { action: ACTIONS.SLOT_10, index: 10 }
            ];

            for (const slot of slots) {
                if (this.keybindManager.getAction(slot.action)) {
                    // Check for Double Tap
                    const isDoubleTap = (this.lastKey === slot.action && (now - this.lastTapTime) < 300);

                    this.skillManager.useSkill(slot.index, isDoubleTap);

                    // Add visual feedback: animate skill slot
                    const slotEl = document.getElementById(`slot-${slot.index}`);
                    if (slotEl) {
                        slotEl.classList.add('skill-pressed');
                        setTimeout(() => slotEl.classList.remove('skill-pressed'), 300);
                    }

                    this.lastKey = slot.action;
                    this.lastTapTime = now;
                    return; // Handle one input per frame
                }
            }
        });

        // State Management
        eventBus.on('game:start', () => {
            console.log('CombatSystem: Game Started, Enabling Combat');
            this.isEnabled = true;
        });
        eventBus.on('game:resume', () => this.isEnabled = true);
        eventBus.on('game:pause', () => this.isEnabled = false);
        eventBus.on('game:reset', () => this.isEnabled = false);
    }
}
