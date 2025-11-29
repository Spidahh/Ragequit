// menu.js - Nuovo sistema di menu completamente rifatto

let currentGameMode = 'team'; // Solo modalità squadre
let selectedTeam = null; // 'red', 'black', 'green', 'purple'
let playerUsername = '';

const TEAM_COLORS = {
    red: 0xff0000,
    black: 0x00ffff,
    green: 0xccff00,
    purple: 0x8800ff
};

function initMenu() {
    const mainMenu = document.getElementById('main-menu');
    const teamSelectionScreen = document.getElementById('team-selection-screen');
    const usernameInput = document.getElementById('username-input');
    const teamBtn = document.getElementById('team-btn');
    const teamOptions = document.querySelectorAll('.team-option');
    const menuKeybindsBtn = document.getElementById('menu-keybinds-btn');
    const menuAudioBtn = document.getElementById('menu-audio-btn');
    
    // Bottone Comandi nel menu - apre il pannello keybinds
    if (menuKeybindsBtn) {
        menuKeybindsBtn.addEventListener('click', () => {
            const keybindsPanel = document.getElementById('keybinds-panel');
            if (keybindsPanel) {
                keybindsPanel.style.display = 'block';
                // Chiama la funzione per popolare il pannello
                if (typeof window.initKeybindsUI === 'function') {
                    window.initKeybindsUI();
                }
            }
        });
    }
    
    // Bottone Chiudi nel pannello keybinds
    const closeKeybindsBtn = document.getElementById('close-keybinds');
    if (closeKeybindsBtn) {
        closeKeybindsBtn.addEventListener('click', () => {
            const keybindsPanel = document.getElementById('keybinds-panel');
            if (keybindsPanel) {
                keybindsPanel.style.display = 'none';
            }
        });
    }
    
    // Bottone Audio nel menu
    if (menuAudioBtn) {
        menuAudioBtn.addEventListener('click', () => {
            // Toggle audio (verrà implementato quando ci sarà il sistema audio)
            const isOn = menuAudioBtn.textContent.includes('OFF');
            menuAudioBtn.textContent = isOn ? '🔊 AUDIO: ON' : '🔊 AUDIO: OFF';
        });
    }

    // Carica username salvato
    const savedUsername = localStorage.getItem('ragequit_username');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        playerUsername = savedUsername;
    }

    // Aggiorna username quando cambia
    usernameInput.addEventListener('input', (e) => {
        playerUsername = e.target.value.trim();
        if (playerUsername) {
            localStorage.setItem('ragequit_username', playerUsername);
        }
    });

    // Click su SQUADRE -> Mostra selezione squadre
    teamBtn.addEventListener('click', () => {
        if (!playerUsername) {
            usernameInput.focus();
            usernameInput.style.borderColor = '#ff0000';
            usernameInput.style.boxShadow = '0 0 30px rgba(255,0,0,0.8)';
            setTimeout(() => {
                usernameInput.style.borderColor = '#666';
                usernameInput.style.boxShadow = 'none';
            }, 1000);
            return;
        }

        currentGameMode = 'team';
        
        // Salva username
        window.myUsername = playerUsername;
        localStorage.setItem('ragequit_username', playerUsername);
        
        // Nascondi menu principale e mostra selezione squadre
        mainMenu.style.display = 'none';
        teamSelectionScreen.style.display = 'flex';
        
        // Richiedi conteggio squadre se socket disponibile
        if (typeof io !== 'undefined') {
            const tempSocket = io();
            tempSocket.on('teamCounts', (counts) => {
                updateTeamCounts(counts);
            });
            tempSocket.emit('requestTeamCounts');
        }
    });

    // Click su una squadra -> Entra nel gioco con quella squadra
    teamOptions.forEach(option => {
        option.addEventListener('click', () => {
            const team = option.dataset.team;
            selectedTeam = team;
            
            // Imposta colore squadra
            window.myTeam = team;
            window.myTeamColor = TEAM_COLORS[team];
            console.log('[MENU] Team selected:', team, 'Color:', window.myTeamColor.toString(16));
            
            // Nascondi selezione squadre e avvia gioco
            teamSelectionScreen.style.display = 'none';
            startGame('team');
        });
    });
}

function startGame(mode) {
    console.log(`[MENU] Starting game - Mode: ${mode}, Team: ${selectedTeam || 'none'}`);
    
    // Imposta variabili globali (solo team mode)
    window.myGameMode = 'team';
    
    if (selectedTeam) {
        window.myTeamColor = TEAM_COLORS[selectedTeam];
        window.myTeam = selectedTeam;
    }

    // INIZIALIZZA IL GIOCO - Chiamata fondamentale!
    if (typeof init === 'function') {
        console.log('[MENU] Calling init() to start Three.js');
        init();
    } else {
        console.error('[MENU] Function init() not found!');
    }

    // Inizializza multiplayer se disponibile
    if (typeof initMultiplayer === 'function' && mode !== 'pve') {
        initMultiplayer();
    }

    // Attiva audio se disponibile
    if (typeof toggleAudio === 'function') {
        const audioBtn = document.getElementById('audio-btn');
        if (audioBtn && audioBtn.textContent.includes('OFF')) {
            toggleAudio();
        }
    }

    // Richiedi pointer lock dopo breve delay
    setTimeout(() => {
        try {
            const promise = document.body.requestPointerLock();
            if (promise && typeof promise.catch === 'function') {
                promise.catch(e => console.log('[MENU] Pointer lock non attivato:', e));
            }
        } catch(e) {
            console.log('[MENU] Errore pointer lock:', e);
        }
    }, 100);

    console.log('[MENU] Game started successfully');
}

function returnToMenu() {
    // Ricarica la pagina per tornare al menu
    location.reload();
}

function updateTeamCounts(counts) {
    Object.keys(counts).forEach(team => {
        const countEl = document.getElementById(`team-count-${team}`);
        if (countEl) {
            const count = counts[team];
            countEl.textContent = count === 1 ? '1 giocatore' : `${count} giocatori`;
        }
    });
}

// Esponi la funzione globalmente per aggiornamenti in tempo reale
window.updateTeamCounts = updateTeamCounts;

// Inizializza il menu quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
} else {
    initMenu();
}
