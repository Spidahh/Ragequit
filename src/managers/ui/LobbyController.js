/**
 * LobbyController.js
 * Handles Lobby UI, Mode Selection, and Team Selection.
 */
import { eventBus } from '../../core/EventBus.js';

export class LobbyController {
    constructor() {
        this.screen = document.getElementById('lobby-screen');
        this.teamScreen = document.getElementById('team-selection-screen');

        this.init();
    }

    init() {
        // Mode Selection
        document.querySelectorAll('.mode-tile').forEach(tile => {
            tile.addEventListener('click', (e) => {
                const mode = e.currentTarget.id.replace('mode-', '');
                this.handleModeSelect(mode);
            });
        });

        // Team Selection
        document.querySelectorAll('.team-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const team = e.currentTarget.dataset.team;
                this.startGame('pvp', team);
            });
        });

        // Back Button
        const btnBack = document.getElementById('btn-back-lobby');
        if (btnBack) {
            btnBack.addEventListener('click', () => this.showLobby());
        }

        // Listen for Login Success
        eventBus.on('login:success', () => this.showLobby());
    }

    handleModeSelect(mode) {
        eventBus.emit('ui:click');
        if (mode === 'pvp') {
            this.showTeamSelection();
        } else {
            this.startGame(mode, null);
        }
    }

    startGame(mode, team) {
        eventBus.emit('ui:click');
        this.hideAll();
        eventBus.emit('game:start', { mode, team });
    }

    showLobby() {
        console.log('LobbyController: Showing Lobby');
        // this.hideAll(); // Removed to prevent hiding the lobby we just showed
        this.screen.style.display = 'flex';
    }

    showTeamSelection() {
        console.log('LobbyController: Showing Team Selection');
        this.screen.style.display = 'none';
        this.teamScreen.style.display = 'flex';
    }

    hideAll() {
        console.log('LobbyController: Hiding All Lobby Screens');
        this.screen.style.display = 'none';
        this.teamScreen.style.display = 'none';
    }
}
