/**
 * LoginController.js
 * Handles the Login UI flow.
 */
import { eventBus } from '../../core/EventBus.js';
import LocalStorageManager from '../LocalStorageManager.js';

export class LoginController {
    constructor() {
        this.storage = new LocalStorageManager();
        this.screen = document.getElementById('login-screen');
        this.input = document.getElementById('player-name-input');
        this.btn = document.getElementById('btn-login');
        this.displayName = document.getElementById('display-name');

        this.init();
    }

    init() {
        console.log('LoginController: Init called');
        // Retry getting elements if they were null (safety check)
        if (!this.btn) this.btn = document.getElementById('btn-login');
        if (!this.input) this.input = document.getElementById('player-name-input');
        if (!this.screen) this.screen = document.getElementById('login-screen');
        if (!this.displayName) this.displayName = document.getElementById('display-name');

        console.log('LoginController: Elements found?', {
            btn: !!this.btn,
            input: !!this.input,
            screen: !!this.screen
        });

        if (this.btn) {
            console.log('LoginController: Attaching click listener to PLAY button');
            this.btn.addEventListener('click', () => this.handleLogin());
        } else {
            console.error('LoginController: PLAY button not found!');
        }

        // Load Saved Name
        const savedName = this.storage.loadPlayerName();
        if (savedName && this.input) {
            this.input.value = savedName;
        }

        // Listen for Enter key on input
        if (this.input) {
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
    }

    handleLogin() {
        console.log('LoginController: Play Button Clicked');
        let name = this.input.value.trim();

        if (!name) {
            console.warn('LoginController: Name is empty, using default.');
            name = 'Player_' + Math.floor(Math.random() * 1000);
            this.input.value = name;
        }

        this.storage.savePlayerName(name);
        if (this.displayName) this.displayName.textContent = name;

        console.log('LoginController: Emitting login:success for', name);
        this.hide();
        eventBus.emit('login:success', name);
    }

    showError() {
        eventBus.emit('ui:error');
        this.input.classList.add('input-error');
        setTimeout(() => this.input.classList.remove('input-error'), 500);
    }

    show() {
        console.log('LoginController: Showing Screen');
        this.screen.style.display = 'flex';
    }

    hide() {
        console.log('LoginController: Hiding Screen');
        this.screen.style.display = 'none';
    }
}
