/**
 * KeybindManager.js
 * Maps physical keys to logical game actions.
 */
import { eventBus } from '../core/EventBus.js';

export const ACTIONS = {
    MOVE_FORWARD: 'MOVE_FORWARD',
    MOVE_BACKWARD: 'MOVE_BACKWARD',
    MOVE_LEFT: 'MOVE_LEFT',
    MOVE_RIGHT: 'MOVE_RIGHT',
    JUMP: 'JUMP',
    SPRINT: 'SPRINT',

    // Combat Actions
    SLOT_1: 'SLOT_1', // Melee (Q)
    SLOT_2: 'SLOT_2', // Bow (C)
    SLOT_3: 'SLOT_3', // Spell 1 (1)
    SLOT_4: 'SLOT_4', // Spell 2 (E)
    SLOT_5: 'SLOT_5', // Spell 3 (F)
    SLOT_6: 'SLOT_6', // Spell 4 (X)

    // Healing / Utility
    SLOT_7: 'SLOT_7', // Heal (R)
    SLOT_8: 'SLOT_8', // Stam > HP (2)
    SLOT_9: 'SLOT_9', // HP > Mana (3)
    SLOT_10: 'SLOT_10', // Mana > Stam (4)

    MENU: 'MENU',
    SCOREBOARD: 'SCOREBOARD'
};

const DEFAULT_BINDINGS = {
    [ACTIONS.MOVE_FORWARD]: 'KeyW',
    [ACTIONS.MOVE_BACKWARD]: 'KeyS',
    [ACTIONS.MOVE_LEFT]: 'KeyA',
    [ACTIONS.MOVE_RIGHT]: 'KeyD',
    [ACTIONS.JUMP]: 'Space',
    [ACTIONS.SPRINT]: 'ShiftLeft',

    [ACTIONS.SLOT_1]: 'KeyQ',
    [ACTIONS.SLOT_2]: 'KeyC',
    [ACTIONS.SLOT_3]: 'Digit1',
    [ACTIONS.SLOT_4]: 'KeyE',
    [ACTIONS.SLOT_5]: 'KeyF',
    [ACTIONS.SLOT_6]: 'KeyX',

    [ACTIONS.SLOT_7]: 'KeyR',
    [ACTIONS.SLOT_8]: 'Digit2',
    [ACTIONS.SLOT_9]: 'Digit3',
    [ACTIONS.SLOT_10]: 'Digit2', // Note: Bible said "2" for both Slot 8 and 10? Assuming typo or context dependent. 
    // User said: "Slot 10 MANA → STAMINA - - Tasto predefinito 2" AND "Slot 8: Stamina > HP - Tasto predefinito 2"
    // I will set Slot 10 to Digit4 for now to avoid conflict, or maybe they meant same key toggles? 
    // Let's stick to unique keys for now to avoid bugs, or maybe 4 as it was before.
    // Actually, let's look at the Bible text again: "Slot 8... Tasto predefinito 2", "Slot 9... Tasto predefinito 3", "Slot 10... Tasto predefinito 2".
    // This is likely a typo in the user request. I will use 2, 3, 4 for slots 8, 9, 10 to be safe.
    [ACTIONS.SLOT_10]: 'Digit4',

    [ACTIONS.MENU]: 'Escape',
    [ACTIONS.SCOREBOARD]: 'Tab'
};

export class KeybindManager {
    constructor(inputManager) {
        this.input = inputManager;
        this.bindings = this.loadBindings();
    }

    loadBindings() {
        const stored = localStorage.getItem('phoenix_keybinds');
        if (stored) {
            return { ...DEFAULT_BINDINGS, ...JSON.parse(stored) };
        }
        return { ...DEFAULT_BINDINGS };
    }

    saveBindings() {
        localStorage.setItem('phoenix_keybinds', JSON.stringify(this.bindings));
    }

    getAction(action) {
        const key = this.bindings[action];
        return this.input.isKeyDown(key);
    }

    getKeyForAction(action) {
        return this.bindings[action];
    }
}
