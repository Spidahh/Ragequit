/**
 * BuildManager.js
 * Manages the player's skill loadout.
 * Persists data to localStorage.
 * 
 * 🔒 PROTECTED FILE 🔒
 * The Default Loadout is fixed per the Design Bible.
 */
export class BuildManager {
    constructor() {
        this.loadout = this.loadLoadout();
        console.log('🛠️ BuildManager Initialized', this.loadout);
    }

    loadLoadout() {
        const saved = localStorage.getItem('player_loadout');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse loadout', e);
            }
        }
        return this.getDefaultLoadout();
    }

    saveLoadout() {
        localStorage.setItem('player_loadout', JSON.stringify(this.loadout));
        console.log('💾 Loadout Saved');
    }

    getDefaultLoadout() {
        return {
            slot1: 'heavy_strike',  // Q - Melee
            slot2: 'power_shot',    // C - Bow
            slot3: 'magic_bolt',    // 1 - Magic Bolt
            slot4: 'shockwave',     // E - Shockwave
            slot5: 'magic_fireball',// F - Fireball
            slot6: 'stone_spikes',  // X - Stone Spikes
            slot7: 'heal_self',     // R - Heal
            slot8: 'trans_stm_hp',  // 2 - Stam > HP
            slot9: 'trans_hp_mana', // 3 - HP > Mana
            slot10: 'trans_mana_stm'// 4 - Mana > Stam
        };
    }

    getLoadout() {
        return this.loadout;
    }

    setSlot(slotKey, skillId) {
        // Validation could go here
        this.loadout[slotKey] = skillId;
        this.saveLoadout();
    }
}
