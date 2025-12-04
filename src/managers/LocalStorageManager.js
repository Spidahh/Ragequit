/**
 * LocalStorageManager - Persistence System
 * 
 * Saves and loads user preferences and progress.
 * Keys:
 * - ragequit_player_name
 * - ragequit_volume
 * - ragequit_tutorial_complete
 */

export default class LocalStorageManager {
    constructor() {
        this.prefix = 'ragequit_';
    }

    save(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            console.log(`💾 Saved ${key}:`, value);
        } catch (e) {
            console.error('❌ Save failed:', e);
        }
    }

    load(key, defaultValue) {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error('❌ Load failed:', e);
            return defaultValue;
        }
    }

    // Convenience methods
    savePlayerName(name) { this.save('player_name', name); }
    loadPlayerName() { return this.load('player_name', ''); }

    saveVolume(volume) { this.save('volume', volume); }
    loadVolume() { return this.load('volume', 0.5); }

    saveTutorialComplete() { this.save('tutorial_complete', true); }
    isTutorialComplete() { return this.load('tutorial_complete', false); }
}
