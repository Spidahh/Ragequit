/**
 * MenuManager.js
 * Responsibilities:
 * - Facade for UI Controllers.
 * - Handle Options Menu (via OptionsManager).
 * - Handle Pause Menu.
 */
import { eventBus } from '../../core/EventBus.js';
import { KeybindManager, ACTIONS } from '../KeybindManager.js';
import { InputManager } from '../InputManager.js';
import { LoginController } from './LoginController.js';
import { LobbyController } from './LobbyController.js';
import { OptionsManager } from './OptionsManager.js';

export class MenuManager {
    constructor() {
        this.inputManager = new InputManager(); // TODO: Remove dependency if possible
        this.keybindManager = new KeybindManager(this.inputManager);
        this.optionsManager = new OptionsManager(this.keybindManager);

        // Controllers
        this.loginController = new LoginController();
        this.lobbyController = new LobbyController();

        // Legacy / Shared Elements
        this.pauseMenu = document.getElementById('pause-menu');
        this.uiLayer = document.getElementById('ui-layer');

        // State
        this.hasLockedOnce = false;

        console.log('📋 MenuManager Constructor: About to initListeners');
        this.initListeners();

        console.log('📋 MenuManager Constructor: About to show LoginScreen');
        // Show login screen initially
        this.loginController.show();
        console.log('📋 MenuManager Constructor: LoginScreen shown');
    }

    initListeners() {
        // Options Button (Lobby)
        const btnOptions = document.getElementById('btn-options');
        if (btnOptions) {
            btnOptions.addEventListener('click', () => this.optionsManager.open());
        }

        // Build Screen Button
        const btnOpenBuild = document.getElementById('btn-open-build');
        if (btnOpenBuild) {
            btnOpenBuild.addEventListener('click', () => {
                if (window.game && window.game.buildScreenManager) {
                    window.game.buildScreenManager.open();
                }
            });
        }

        // Pause Menu Listeners
        const btnResume = document.getElementById('btn-resume');
        if (btnResume) {
            btnResume.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resumeGame();
            });
        }

        const btnReturn = document.getElementById('btn-return-lobby');
        if (btnReturn) {
            btnReturn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.returnToLobby();
            });
        }

        // Global Click for Audio Context
        document.addEventListener('click', () => {
            if (window.game && window.game.audioManager) {
                window.game.audioManager.resumeContext();
            }
        }, { once: true });

        // Event Bus Listeners
        eventBus.on('game:pause', () => this.showPauseMenu());
        eventBus.on('game:resume', () => this.hidePauseMenu());
        eventBus.on('game:reset', () => {
            this.hidePauseMenu();
            this.uiLayer.style.display = 'none';
            this.lobbyController.showLobby();
        });

        // Pointer Lock Listener (Pause Logic)
        eventBus.on('input:pointerlock', (isLocked) => {
            if (isLocked) this.hasLockedOnce = true;

            if (!isLocked && this.uiLayer.style.display === 'block') {
                if (this.hasLockedOnce && this.pauseMenu.style.display !== 'flex') {
                    eventBus.emit('game:pause');
                }
            }
        });
    }

    showPauseMenu() {
        this.pauseMenu.style.display = 'flex';
    }

    hidePauseMenu() {
        this.pauseMenu.style.display = 'none';
    }

    resumeGame() {
        eventBus.emit('game:resume');
    }

    returnToLobby() {
        eventBus.emit('game:reset');
    }
}
