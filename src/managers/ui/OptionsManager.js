import { eventBus } from '../../core/EventBus.js';
import { KeybindManager, ACTIONS } from '../KeybindManager.js';
import { InputManager } from '../InputManager.js';

export class OptionsManager {
    constructor() {
        this.settings = {
            masterVolume: 0.5,
            screenShake: true
        };

        // Managers
        this.inputManager = new InputManager();
        this.keybindManager = new KeybindManager(this.inputManager);

        // UI Elements
        this.optionsScreen = document.getElementById('options-screen');
        this.tabButtons = document.querySelectorAll('.options-tab-btn');
        this.tabContents = document.querySelectorAll('.options-tab-content');

        this.loadSettings();
        this.initUI();
        console.log('⚙️ OptionsManager Initialized');
    }

    loadSettings() {
        const saved = localStorage.getItem('phoenix_options');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        this.applySettings();
    }

    saveSettings() {
        localStorage.setItem('phoenix_options', JSON.stringify(this.settings));
    }

    applySettings() {
        // Apply Audio
        eventBus.emit('audio:volume', this.settings.masterVolume);
        // Screen shake is checked dynamically by VFXManager via this.settings or event
        eventBus.emit('settings:updated', this.settings);
    }

    getSetting(key) {
        return this.settings[key];
    }

    initUI() {
        if (!this.optionsScreen) {
            console.warn('⚠️ Options screen element not found in DOM');
            return;
        }

        // FORCE HIDE OPTIONS SCREEN - MUST STAY HIDDEN UNTIL EXPLICITLY OPENED
        this.optionsScreen.style.display = 'none';
        this.optionsScreen.style.visibility = 'hidden';
        this.optionsScreen.style.pointerEvents = 'none';

        // Tabs
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Close Button
        const btnClose = document.getElementById('btn-close-options');
        if (btnClose) {
            btnClose.addEventListener('click', () => this.close());
        }

        // Gameplay: Screen Shake
        const toggleShake = document.getElementById('toggle-shake');
        if (toggleShake) {
            toggleShake.checked = this.settings.screenShake;
            toggleShake.addEventListener('change', (e) => {
                this.settings.screenShake = e.target.checked;
                this.saveSettings();
                this.applySettings();
            });
        }

        // Audio: Master Volume
        const sliderVolume = document.getElementById('slider-volume');
        const valVolume = document.getElementById('val-volume');
        if (sliderVolume && valVolume) {
            sliderVolume.value = this.settings.masterVolume * 100;
            valVolume.textContent = Math.round(this.settings.masterVolume * 100) + '%';

            sliderVolume.addEventListener('input', (e) => {
                const vol = e.target.value / 100;
                this.settings.masterVolume = vol;
                valVolume.textContent = Math.round(vol * 100) + '%';
                this.saveSettings();
                this.applySettings();
            });
        }
    }

    open() {
        // Only open from lobby, not during gameplay
        if (!this.optionsScreen) return;
        
        console.log('📋 Opening Options Menu');
        this.optionsScreen.style.display = 'flex';
        this.optionsScreen.style.visibility = 'visible';
        this.optionsScreen.style.pointerEvents = 'auto';
        this.switchTab('gameplay'); // Default tab
    }

    close() {
        if (this.optionsScreen) {
            console.log('📋 Closing Options Menu');
            this.optionsScreen.style.display = 'none';
            this.optionsScreen.style.visibility = 'hidden';
            this.optionsScreen.style.pointerEvents = 'none';
        }
    }

    switchTab(tabName) {
        // Update Buttons
        this.tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Update Content
        this.tabContents.forEach(content => {
            if (content.id === `tab-${tabName}`) content.style.display = 'block';
            else content.style.display = 'none';
        });

        // Special Case: Controls Tab
        if (tabName === 'controls') {
            this.renderKeybinds();
        }
    }

    renderKeybinds() {
        const list = document.getElementById('keybind-list');
        if (!list) return;

        list.innerHTML = '';
        const bindings = this.keybindManager.bindings;

        for (const [action, code] of Object.entries(bindings)) {
            const key = String(code).replace('Key', '').replace('Digit', '');

            const row = document.createElement('div');
            row.className = 'keybind-row';
            row.innerHTML = `
                <div class="keybind-info">
                    <span class="keybind-label">${action.replace(/_/g, ' ')}</span>
                </div>
                <button class="keybind-btn" data-action="${action}">${key}</button>
            `;

            row.querySelector('button').addEventListener('click', (e) => {
                this.startBinding(action, e.target);
            });
            list.appendChild(row);
        }
    }

    startBinding(action, btnElement) {
        btnElement.textContent = '...';
        btnElement.classList.add('binding');

        const handler = (code) => {
            if (code === 'Escape') {
                this.renderKeybinds();
            } else {
                this.keybindManager.bindings[action] = code;
                this.keybindManager.saveBindings();
                this.renderKeybinds();
                eventBus.emit('keybinds:updated', this.keybindManager.bindings);
            }
            // Remove listener
            eventBus.off('input:keydown', handler);
        };

        // We need to listen to input. 
        // Using eventBus as InputManager emits 'input:keydown'
        eventBus.on('input:keydown', handler);
    }
}
