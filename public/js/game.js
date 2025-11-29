// Verifica che THREE.js sia caricato
if (typeof THREE === 'undefined') {
    throw new Error('[GAME] THREE.js not loaded! Check script loading order.');
}
console.log('[GAME] THREE.js ready, version r' + THREE.REVISION);

let socket = null;
        const otherPlayers = {}; 
        let myId = null;
        let myUsername = "Player";
        let myTeamColor = 0x2c3e50; // Colore dell'armatura del giocatore
        let myGameMode = 'team'; // Solo modalità team
        let myTeam = null; // 'red', 'black', 'green', 'purple'
        let isPvEMode = false; // Flag per modalità PvE
        let aiMonster = null; // Riferimento al mostro IA
        let myKills = parseInt(localStorage.getItem('ragequit_kills')) || 0; // Contatore kill persistente
        const playerKills = {}; // Kill di tutti i player {playerId: kills}
        const teamKills = {red: 0, black: 0, green: 0, purple: 0}; // Kill per squadra
        
        const WORLD_SEED = 123456;
        let seed = WORLD_SEED;
        function random() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

        let camera, scene, renderer;
        let playerMesh, swordContainer, staffContainer, shieldMesh, bowContainer;
        let playerLimbs = { legL: null, legR: null, armL: null, armR: null, head: null, torso: null, helmet: null };
        let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
        let canJump = false; let isSprinting = false;
        let isBlocking = false; 
        let prevTime = performance.now();
        const velocity = new THREE.Vector3();
        let isCtrlPressed = false; // Flag per Ctrl
        let weaponMode = 'ranged'; let currentSpell = 1; 
        let isAttacking = false; let attackTimer = 0; let isWhirlwinding = false; 
        const playerStats = { hp: 100, maxHp: 100, mana: 100, maxMana: 100, stamina: 100, maxStamina: 100, isDead: false, isFalling: false };
        const projectiles = [], obstacles = [], particles = [];
        let frameCount = 0; // Per throttling UI
        const particlePool = []; // Object pooling per particelle
        const maxParticles = 100; // Limita particelle attive
        
        // Networking avanzato - Lag compensation
        const positionBuffer = {}; // Buffer posizioni per interpolazione
        const INTERPOLATION_DELAY = 100; // ms di delay per smooth interpolation
        let serverTime = 0;
        let clientTimeOffset = 0;
        
        // LOD System
        const LOD_DISTANCES = { HIGH: 50, MEDIUM: 150, LOW: 300 };
        let lodObjects = [];
        
        // Spectator mode
        let isSpectating = false;
        let spectateTarget = null;
        let spectateIndex = 0;
        
        // Match statistics
        const matchStats = {
            kills: 0, deaths: 0, damage: 0, healing: 0,
            accuracy: { shots: 0, hits: 0 },
            startTime: Date.now(),
            matchHistory: JSON.parse(localStorage.getItem('ragequit_match_history') || '[]')
        };
        
        // FPS Counter
        let fpsFrames = 0;
        let fpsLastTime = performance.now();
        let currentFPS = 0;
        
        // Ping Counter
        let lastPingTime = 0;
        let currentPing = 0;
        let floatingTexts = [];
        const activeConversions = []; 
        let castingState = { active: false, currentSpell: 0, timer: 0, maxTime: 0, ready: false, keyHeld: null };
        let lastAttackTime = 0; let lastHealTime = -10000; let lastConversionTime = 0; let lastWhirlwindTime = 0; let lastSpikesTime = 0;
        let keyToRebind = null; // Variabile per gestire il rebinding dei tasti 
        const savedSens = localStorage.getItem('ragequit_mouse_sensitivity');
        let mouseSensitivity = (savedSens && !isNaN(parseFloat(savedSens))) ? parseFloat(savedSens) : 1.0;
        
        // Jump Vars
        let lastJumpTime = 0;
        let lastFootstepTime = 0;
        let distanceSinceStep = 0;

        let euler = new THREE.Euler(0, 0, 0, 'YXZ');

        const SETTINGS = { 
            speed: 400.0, 
            sprintMulti: 1.4, 
            sprintStaminaCostPerSec: 1.0, 
            
            // JUMP SETTINGS
            jumpForce: 200.0, 
            jumpCooldown: 300,
            jumpCost: 5, 
            gravity: 800.0, 
            
            // Missile (Dardo)
            missileSpeed: 900.0, 
            missileDmg: 10,
            missileGravity: 300, // GRAVITÀ DARDO RIDOTTA - traiettoria quasi dritta 
            missileCost: 5,
            
            // ONDA (Shockwave)
            pushSpeed: 700.0, 
            pushForce: 900.0, 
            pushUpForce: 300.0, 
            pushCost: 15, 
            pushRadius: 45, 
            pushVisualRadius: 20, 
            
            // Fireball (Palla di Fuoco)
            fireballSpeed: 600.0, 
            fireballUpForce: 600.0, 
            fireballDmg: 30, 
            fireballCost: 20, 
            fireballRadius: 35, 
            
            // Beam (Spuntoni)
            beamDmg: 25, 
            beamCost: 5, 
            beamRange: 200, 
            
            // Bow (Arco)
            bowCastTime:0.3, 
            arrowSpeed: 1000.0, 
            arrowDmg: 15, 
            arrowCost: 5, 
            arrowGravity: 5, // GRAVITÀ FRECCIA RIDOTTA
            
            fireRate: 400, meleeRate: 500, 
            meleeRange: 32, 
            meleeDmg: 15,
            meleeStaminaCost: 5, 
            meleeKnockbackForce: 100, 
            
            manaRegen: 2.0, 
            staminaCost: 0.2, 
            staminaRegen: 3.0, 
            
            healAmount: 20, healCost: 10, healCooldown: 10000, 
            conversionCost: 5, conversionGain: 5, conversionCooldown: 1000, 
            whirlwindDmg: 30, whirlwindRadius: 25, whirlwindCost: 10, whirlwindCooldown: 2000, 
            spikesCooldown: 3000,
            blockStaminaCost: 0.5, 
            blockMitigation: 0.7 
        };
        
        
        const loginModal = document.getElementById('login-modal');
        const obstacleRaycaster = new THREE.Raycaster();

        // Draggable UI Container
        const uiContainer = document.getElementById('ui-container');
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        uiContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragOffsetX = e.clientX - uiContainer.offsetLeft;
            dragOffsetY = e.clientY - uiContainer.offsetTop;
            uiContainer.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                uiContainer.style.left = (e.clientX - dragOffsetX) + 'px';
                uiContainer.style.bottom = 'auto';
                uiContainer.style.top = (e.clientY - dragOffsetY) + 'px';
            }
            if (isChatDragging) {
                chatContainer.style.right = 'auto';
                chatContainer.style.left = (e.clientX - chatDragOffsetX) + 'px';
                chatContainer.style.bottom = 'auto';
                chatContainer.style.top = (e.clientY - chatDragOffsetY) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                uiContainer.classList.remove('dragging');
            }
            if (isChatDragging) {
                isChatDragging = false;
                chatContainer.classList.remove('dragging');
            }
        });
        
        // Draggable Chat Container
        const chatContainer = document.getElementById('chat-container');
        const chatHeader = document.getElementById('chat-header');
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const chatCloseBtn = document.getElementById('chat-close-btn');
        let isChatDragging = false;
        let chatDragOffsetX = 0;
        let chatDragOffsetY = 0;
        let isChatMinimized = false;

        chatHeader.addEventListener('mousedown', (e) => {
            // Non iniziare drag se click sul bottone close
            if (e.target === chatCloseBtn) return;
            isChatDragging = true;
            const rect = chatContainer.getBoundingClientRect();
            chatDragOffsetX = e.clientX - rect.left;
            chatDragOffsetY = e.clientY - rect.top;
            chatContainer.classList.add('dragging');
        });
        
        // Bottone chiudi/minimizza chat
        chatCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isChatMinimized = !isChatMinimized;
            if (isChatMinimized) {
                chatContainer.classList.add('minimized');
                chatCloseBtn.textContent = '+';
            } else {
                chatContainer.classList.remove('minimized');
                chatCloseBtn.textContent = '×';
            }
        });
        
        // Chat input handling
        let isChatFocused = false;
        chatInput.addEventListener('focus', () => {
            isChatFocused = true;
        });
        chatInput.addEventListener('blur', () => {
            isChatFocused = false;
            // Riattiva pointer lock quando si esce dalla chat
            if (!playerStats.isDead && document.pointerLockElement !== document.body) {
                setTimeout(() => {
                    try {
                        document.body.requestPointerLock();
                    } catch(e) {
                        console.log('Pointer lock error:', e);
                    }
                }, 100);
            }
        });
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && chatInput.value.trim()) {
                sendChatMessage(chatInput.value.trim());
                chatInput.value = '';
                chatInput.blur();
            }
            e.stopPropagation();
        });
        
        function sendChatMessage(message) {
            if (socket && socket.connected) {
                socket.emit('chatMessage', { username: myUsername, text: message });
            }
        }
        
        function addChatMessage(username, text, isSystem = false) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message' + (isSystem ? ' system' : '');
            msgDiv.innerHTML = `<span class="chat-username">${username}:</span><span class="chat-text">${text}</span>`;
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Limita messaggi a 50
            while (chatMessages.children.length > 50) {
                chatMessages.removeChild(chatMessages.firstChild);
            }
        }

        document.addEventListener('contextmenu', event => event.preventDefault());

        // Il login è gestito da menu.js

        // Pulsante Torna al Menu Principale
        document.getElementById('menu-btn').addEventListener('click', () => {
            document.exitPointerLock();
            if (socket) socket.disconnect();
            
            // Ripristina le variabili di gioco
            myId = null;
            myUsername = "Player";
            myTeamColor = 0x2c3e50;
            myGameMode = 'team';
            myTeam = null;
            playerStats.hp = 100;
            playerStats.mana = 100;
            playerStats.stamina = 100;
            playerStats.isDead = false;
            
            // Ricrea il game (azzera il mondo)
            location.reload();
        });

        

        // --- SISTEMA KEYBINDS COMPLETO ---
        const KEYBINDS = { 
            SPELL_1: 'Digit1',
            SPELL_2: 'Digit2', 
            SPELL_3: 'Digit3',
            SPELL_4: 'Digit4',
            WEAPON_SWITCH: 'KeyQ',
            BOW_EQUIP: 'KeyE',
            HEAL: 'KeyR',
            MOVE_FORWARD: 'KeyW',
            MOVE_LEFT: 'KeyA',
            MOVE_BACKWARD: 'KeyS',
            MOVE_RIGHT: 'KeyD',
            JUMP: 'Space',
            SPRINT: 'ShiftLeft',
            CONVERT_1: 'KeyF',
            CONVERT_2: 'KeyX',
            CONVERT_3: 'KeyC'
        };
        
        const KEY_NAMES = {
            SPELL_1: '🔹 Dardo Magico',
            SPELL_2: '💨 Onda Gelo',
            SPELL_3: '🔥 Palla di Fuoco',
            SPELL_4: '⛰️ Spuntoni',
            WEAPON_SWITCH: '⚔️ Cambia Arma/Melee',
            BOW_EQUIP: '🏹 Arco',
            HEAL: '💚 Cura',
            MOVE_FORWARD: '⬆️ Avanti',
            MOVE_LEFT: '⬅️ Sinistra',
            MOVE_BACKWARD: '⬇️ Indietro',
            MOVE_RIGHT: '➡️ Destra',
            JUMP: '🔼 Salto',
            SPRINT: '⚡ Scatto',
            CONVERT_1: '♥ Stamina → HP',
            CONVERT_2: '💧 HP → Mana',
            CONVERT_3: '⚡ Mana → Stamina'
        };

        const STORAGE_KEY = 'ragequit_keybinds_v2';
        let currentBindingAction = null;

        // Carica keybinds salvati
        function loadKeybinds() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    Object.assign(KEYBINDS, JSON.parse(saved));
                }
            } catch(e) {
                console.error('Errore caricamento keybinds:', e);
            }
        }

        // Salva keybinds
        function saveKeybinds() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(KEYBINDS));
            } catch(e) {
                console.error('Errore salvataggio keybinds:', e);
            }
        }

        // Formatta il codice tasto per visualizzazione
        function formatKey(code) {
            return code
                .replace('Key', '')
                .replace('Digit', '')
                .replace('Space', 'SPAZIO')
                .replace('ShiftLeft', 'SHIFT')
                .replace('ShiftRight', 'SHIFT')
                .replace('ControlLeft', 'CTRL')
                .replace('ControlRight', 'CTRL')
                .toUpperCase();
        }

        // Inizializza UI keybinds
        function initKeybindsUI() {
            console.log('initKeybindsUI called');
            const content = document.getElementById('keybinds-content');
            console.log('keybinds-content element:', content);
            if (!content) {
                console.error('keybinds-content not found!');
                return;
            }
            
            content.innerHTML = '';
            
            // Aggiungi slider sensibilità mouse
            const sensRow = document.createElement('div');
            sensRow.className = 'sensitivity-row';
            sensRow.style.gridColumn = '1 / -1';
            sensRow.style.marginBottom = '20px';
            
            const sensLabel = document.createElement('div');
            sensLabel.style.display = 'flex';
            sensLabel.style.justifyContent = 'space-between';
            sensLabel.style.marginBottom = '10px';
            sensLabel.innerHTML = `<span class="keybind-label">🎯 SENSIBILITÀ MOUSE</span><span class="keybind-label" id="sens-value">${(mouseSensitivity * 100).toFixed(0)}%</span>`;
            
            const sensSlider = document.createElement('input');
            sensSlider.type = 'range';
            sensSlider.min = '0.1';
            sensSlider.max = '3.0';
            sensSlider.step = '0.1';
            sensSlider.value = mouseSensitivity;
            sensSlider.className = 'sensitivity-slider';
            sensSlider.oninput = (e) => {
                mouseSensitivity = parseFloat(e.target.value);
                document.getElementById('sens-value').textContent = `${(mouseSensitivity * 100).toFixed(0)}%`;
                localStorage.setItem('ragequit_mouse_sensitivity', mouseSensitivity);
            };
            
            sensRow.appendChild(sensLabel);
            sensRow.appendChild(sensSlider);
            content.appendChild(sensRow);
            
            for (const [action, keyCode] of Object.entries(KEYBINDS)) {
                const row = document.createElement('div');
                row.className = 'keybind-row';
                
                const label = document.createElement('span');
                label.className = 'keybind-label';
                label.textContent = KEY_NAMES[action] || action;
                
                const keyBtn = document.createElement('button');
                keyBtn.className = 'keybind-btn';
                keyBtn.textContent = formatKey(keyCode);
                keyBtn.onclick = () => startRebind(action, keyBtn);
                
                row.appendChild(label);
                row.appendChild(keyBtn);
                content.appendChild(row);
            }
            
            console.log('Created', Object.keys(KEYBINDS).length, 'keybind rows');
            updateActionBarLabels();
        }
        
        // Esponi la funzione globalmente per il menu
        window.initKeybindsUI = initKeybindsUI;

        // Inizia il rebinding di un tasto
        function startRebind(action, btnElement) {
            if (currentBindingAction) return;
            
            currentBindingAction = action;
            btnElement.classList.add('listening');
            btnElement.textContent = 'PREMI UN TASTO...';
            
            const handleKey = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Ignora ESC per cancellare
                if (e.code === 'Escape') {
                    btnElement.classList.remove('listening');
                    btnElement.textContent = formatKey(KEYBINDS[action]);
                    currentBindingAction = null;
                    return;
                }
                
                KEYBINDS[action] = e.code;
                saveKeybinds();
                
                btnElement.classList.remove('listening');
                btnElement.textContent = formatKey(e.code);
                currentBindingAction = null;
                
                updateActionBarLabels();
            };
            
            document.addEventListener('keydown', handleKey, { once: true });
        }

        // Aggiorna le label nella action bar
        function updateActionBarLabels() {
            const set = (id, action) => {
                const el = document.getElementById(id);
                if (el) el.textContent = formatKey(KEYBINDS[action]);
            };
            
            set('lbl-switch', 'WEAPON_SWITCH');
            set('lbl-bow', 'BOW_EQUIP');
            set('lbl-spell1', 'SPELL_1');
            set('lbl-spell2', 'SPELL_2');
            set('lbl-spell3', 'SPELL_3');
            set('lbl-spell4', 'SPELL_4');
            set('lbl-heal', 'HEAL');
            set('lbl-conv1', 'CONVERT_1');
            set('lbl-conv2', 'CONVERT_2');
            set('lbl-conv3', 'CONVERT_3');
        }

        // Carica i keybinds all'avvio
        loadKeybinds();
        
        // === KILL COUNTER SYSTEM ===
        function updateKillCounter() {
            const teamContainer = document.getElementById('kill-counter-team');
            
            // Mostra sempre il contatore squadre
            teamContainer.style.display = 'flex';
            
            const teamNames = {red: 'ROSIKONI', black: 'TRIMONI', green: 'FATTONI', purple: 'INFAMI'};
            teamContainer.innerHTML = ['red', 'black', 'green', 'purple'].map(team => 
                `<div class="team-kill-box ${team}">
                    <div class="team-name">${teamNames[team]}</div>
                    <div class="team-kills">${teamKills[team]} ☠️</div>
                </div>`
            ).join('');
        }
        
        function incrementKill(playerId, team) {
            if (!playerKills[playerId]) playerKills[playerId] = 0;
            playerKills[playerId]++;
            
            if (playerId === myId) {
                myKills++;
                localStorage.setItem('ragequit_kills', myKills);
            }
            
            if (team && teamKills[team] !== undefined) {
                teamKills[team]++;
            }
            
            updateKillCounter();
        }

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let audioEnabled = false;
        function toggleAudio() { 
            audioEnabled = !audioEnabled; 
            document.getElementById('audio-btn').innerText = audioEnabled ? "AUDIO: ON" : "AUDIO: OFF"; 
            if(audioEnabled && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(e => console.warn("Audio resume failed:", e));
            }
        }
        
        function playSound(type, pos = null) {
            if (!audioEnabled) return; 
            let vol = 0.1;
            if (pos) {
                const dist = playerMesh.position.distanceTo(pos);
                if (dist > 100) return;
                vol = 0.1 * (1 - (dist / 100));
            }

            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); const now = audioCtx.currentTime;
            
            if (type === 'shoot_bolt') { osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.15); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); } 
            else if (type === 'shoot_fire') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(50, now + 0.3); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); } 
            else if (type === 'hit') { osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); } 
            else if (type === 'jump') { osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(300, now + 0.2); gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); } 
            else if (type === 'heal') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now + 0.5); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.5); osc.start(now); osc.stop(now + 0.5); } 
            else if (type === 'swing') { osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.2); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
            else if (type === 'swing_heavy') {
                const osc2 = audioCtx.createOscillator(); osc2.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(50, now + 0.3);
                osc2.frequency.setValueAtTime(160, now); osc2.frequency.linearRampToValueAtTime(60, now + 0.3);
                osc2.connect(gain);
                gain.gain.setValueAtTime(vol * 1.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc2.start(now); osc.stop(now + 0.3); osc2.stop(now + 0.3);
            }
            else if (type === 'whirlwind') {
                osc.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(400, now + 0.25); osc.frequency.linearRampToValueAtTime(100, now + 0.5);
                gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(vol, now + 0.4); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
            }
            else if (type === 'step') {
                osc.type = 'triangle';
                const pitch = 80 + Math.random() * 20;
                osc.frequency.setValueAtTime(pitch, now); osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, now + 0.08);
                gain.gain.setValueAtTime(vol * 0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
            }
        }

        function init() {
            scene = new THREE.Scene(); 
            
            // Background semplice per performance
            scene.background = new THREE.Color(0x2a2a3a);
            scene.fog = new THREE.Fog(0x2a2a3a, 150, 600); // Fog più aggressiva per nascondere pop-in
            
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
            createPlayer(); createSword(); createStaff(); createShield(); createBow();
            
            // Luci ottimizzate per FPS - ridotte al minimo
            const ambientLight = new THREE.AmbientLight(0x888899, 1.2); // Solo ambient per performance
            scene.add(ambientLight);
            
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
            dirLight.position.set(150, 250, 100);
            dirLight.castShadow = false; // Ombre disabilitate per FPS
            scene.add(dirLight);
            
            seed = WORLD_SEED; setupWorld(); setupControls(); setupUIEvents();
            renderer = new THREE.WebGLRenderer({ 
                antialias: false,
                powerPreference: 'high-performance',
                precision: 'mediump',
                alpha: false,
                stencil: false
            }); 
            renderer.setPixelRatio(1);
            renderer.setSize(window.innerWidth, window.innerHeight); 
            renderer.shadowMap.enabled = false;
            renderer.sortObjects = false;
            
            // Compatibilità con versioni diverse di THREE.js
            if (THREE.REVISION >= 150) {
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.0;
            } else {
                renderer.gammaOutput = true;
                renderer.gammaFactor = 2.2;
            }
            console.log('[RENDERER] THREE.js r' + THREE.REVISION + ' inizializzato');
            renderer.domElement.style.position = 'fixed';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.left = '0';
            renderer.domElement.style.zIndex = '1';
            document.body.appendChild(renderer.domElement); 
            window.addEventListener('resize', () => { 
                camera.aspect = window.innerWidth/window.innerHeight; 
                camera.updateProjectionMatrix(); 
                renderer.setSize(window.innerWidth, window.innerHeight); 
            });
            checkLogin(); toggleWeapon(true); updateActionBarUI(); initKeybindsUI(); 
            
            // Sincronizza le variabili globali dal menu
            if (typeof window.myUsername !== 'undefined') {
                myUsername = window.myUsername;
            }
            if (typeof window.myGameMode !== 'undefined') {
                myGameMode = window.myGameMode;
            }
            if (typeof window.myTeamColor !== 'undefined') {
                myTeamColor = window.myTeamColor;
                console.log('[INIT] Synced myTeamColor:', myTeamColor.toString(16));
                updatePlayerColor(); // Aggiorna il colore del player dopo la sincronizzazione
            }
            if (typeof window.myTeam !== 'undefined') {
                myTeam = window.myTeam;
                console.log('[INIT] Synced myTeam:', myTeam);
            }
            if (typeof window.isPvEMode !== 'undefined') {
                isPvEMode = window.isPvEMode;
                console.log("init(): isPvEMode sincronizzata a", isPvEMode);
            }
            
            // Inizializza il mostro PvE se in modalità PvE
            if (isPvEMode) {
                console.log("init(): Creazione mostro PvE...");
                createAIMonster();
            }
            
            animate();
        }

        

        

        

        
        
        
        
        
        

        
        
        
        
        

        
        
        
        
        
        
        
        

        
        
        
        

        

        
        

        
        
        
        
        
        
        
        
        window.performConversion = performConversion;
        
        
        
        
        
        function updateActionBarUI() { document.querySelectorAll('.action-slot').forEach(el => el.classList.remove('active')); if (weaponMode === 'ranged') document.getElementById(`slot-${currentSpell}`).classList.add('active'); else if (weaponMode === 'melee') document.getElementById('slot-q').classList.add('active'); else if (weaponMode === 'bow') document.getElementById('slot-e').classList.add('active'); }
        function updateStaffColor(id) { if(!staffContainer || !staffContainer.userData.gem) return; const colors = [0xffffff, 0x00ffff, 0xffffff, 0xff6600, 0xaa00ff]; staffContainer.userData.gem.material.color.setHex(colors[id]); }
        function getStaffTip() { const vec = new THREE.Vector3(); if(staffContainer?.userData.gem) staffContainer.userData.gem.getWorldPosition(vec); else vec.copy(playerMesh.position).add(new THREE.Vector3(0,5,0)); return vec; }
        
        

        

        

        
        
        
        
        

        
        
        function startBlocking() {
            if (weaponMode !== 'melee' || isBlocking || playerStats.stamina < 5) return;
            isBlocking = true;
            document.getElementById('block-text').style.display = 'block';
            if (socket) socket.emit('playerBlock', true);
        }
        function stopBlocking() {
            if (!isBlocking) return;
            isBlocking = false;
            document.getElementById('block-text').style.display = 'none';
            if (socket) socket.emit('playerBlock', false);
        }

        

        
        
        function addToLog(msg, typeClass) { const log = document.getElementById('log'); const entry = document.createElement('div'); entry.className = 'log-entry ' + (typeClass || ''); entry.innerText = msg; log.prepend(entry); if(log.children.length > 8) log.lastChild.remove(); }
        
        function respawnPlayer() {
            // Track death for statistics
            matchStats.deaths++;
            isSpectating = false;
            spectateTarget = null;
            
            // Resetta le statistiche del giocatore
            playerStats.hp = playerStats.maxHp;
            playerStats.mana = playerStats.maxMana;
            playerStats.stamina = playerStats.maxStamina;
            playerStats.isDead = false;
            playerStats.isFalling = false;
            
            // Determina la posizione di respawn in base alla modalità
            let spawnPos = getSpawnPosition();
            playerMesh.position.copy(spawnPos);
            velocity.set(0, 0, 0);
            
            // Resetta tutti i flag di movimento
            moveForward = false;
            moveBackward = false;
            moveLeft = false;
            moveRight = false;
            isSprinting = false;
            canJump = true;
            
            // Resetta lo stato di combattimento
            isAttacking = false;
            attackTimer = 0;
            isBlocking = false;
            
            // Mostra il messaggio
            document.getElementById('message').style.display = 'none';
            
            // Rendi visibile il player
            playerMesh.visible = true;
            
            // Aggiorna l'UI
            updateUI();
            
            addToLog('Sei rinato!', 'heal');
            
            // Riattiva il pointer lock
            setTimeout(() => {
                try {
                    const promise = document.body.requestPointerLock();
                    if (promise && typeof promise.catch === 'function') {
                        promise.catch(e => console.log('Pointer lock non attivato'));
                    }
                } catch(e) {
                    console.log('Errore pointer lock:', e);
                }
            }, 100);
        }
        
        // Ottieni la posizione di spawn per la squadra
        function getSpawnPosition() {
            const team = window.myTeam;
            
            if (team) {
                // Spawn nelle zone colorate per le squadre
                const teamSpawns = {
                    red: { x: -300, z: -300 },
                    black: { x: 300, z: -300 },
                    green: { x: -300, z: 300 },
                    purple: { x: 300, z: 300 }
                };
                
                const spawn = teamSpawns[team];
                if (spawn) {
                    // Aggiungi variazione casuale entro 30 unità dal centro
                    const offsetX = (Math.random() - 0.5) * 60;
                    const offsetZ = (Math.random() - 0.5) * 60;
                    return new THREE.Vector3(spawn.x + offsetX, 6, spawn.z + offsetZ);
                }
            }
            
            // Fallback: spawn al centro se squadra non definita
            return new THREE.Vector3(0, 6, 0);
        }
        
        function setupUIEvents() {
            document.getElementById('reset-btn').addEventListener('click', (e) => { 
                e.stopPropagation(); 
                e.target.blur(); // Rimuovi focus dal pulsante
                respawnPlayer(); 
            });
            document.getElementById('keybinds-btn').addEventListener('click', (e) => { 
                e.stopPropagation(); 
                e.preventDefault();
                console.log('TASTI button clicked');
                // Chiudi TUTTI gli altri modali
                const gamemodal = document.getElementById('gamemode-modal');
                const loginmodal = document.getElementById('login-modal');
                const keybindsPanel = document.getElementById('keybinds-panel');
                
                if(gamemodal) gamemodal.style.display='none';
                if(loginmodal) loginmodal.style.display='none';
                
                // Apri il pannello tasti
                if(keybindsPanel) {
                    keybindsPanel.style.display='block';
                    console.log('Keybinds panel opened');
                    initKeybindsUI();
                }
                document.exitPointerLock(); 
            });
            document.getElementById('audio-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleAudio(); });
            document.getElementById('close-keybinds').addEventListener('click', (e) => { 
                e.stopPropagation(); 
                const keybindsPanel = document.getElementById('keybinds-panel');
                if (keybindsPanel) {
                    keybindsPanel.style.display = 'none';
                }
                
                // Riattiva il pointer lock solo se il menu principale è nascosto (gioco attivo)
                const mainMenu = document.getElementById('main-menu');
                const isInMenu = mainMenu && mainMenu.style.display !== 'none';
                
                if (!isInMenu) {
                    setTimeout(() => {
                        try {
                            const promise = document.body.requestPointerLock();
                            if (promise && typeof promise.catch === 'function') {
                                promise.catch(err => console.log('Pointer lock non attivato'));
                            }
                        } catch(e) {
                            console.log('Errore pointer lock:', e);
                        }
                    }, 100);
                }
            });
        }
        function setupControls() {
            document.addEventListener('pointerlockchange', () => { 
                // Non fare nulla quando perdi il pointer lock - mantieni il gioco attivo
            });
            document.addEventListener('keydown', (e) => {
                // Se la chat è attiva, ignora tutti i comandi tranne Enter per aprire la chat
                if (isChatFocused) return;
                
                // Enter per aprire la chat
                if (e.code === 'Enter') {
                    chatInput.focus();
                    return;
                }
                
                // Previeni chiusura browser con Ctrl+W
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
                    e.preventDefault();
                }
                
                // Blocca Alt sinistro e destro dal far uscire il cursore
                if (e.code === 'AltLeft' || e.code === 'AltRight') {
                    e.preventDefault();
                    return;
                }
                
                // Gestione Ctrl per free mouse (ALT rimosso)
                if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
                    if (!isCtrlPressed) { // Previeni attivazione multipla
                        isCtrlPressed = true;
                        // Esci dal pointer lock per permettere il movimento del mouse
                        if (document.pointerLockElement === document.body) {
                            document.exitPointerLock();
                        }
                    }
                    return;
                }
                
                if (keyToRebind || playerStats.isDead) return; 
                switch(e.code) {
                    case KEYBINDS.MOVE_FORWARD: moveForward=true; break; case KEYBINDS.MOVE_LEFT: moveLeft=true; break; case KEYBINDS.MOVE_BACKWARD: moveBackward=true; break; case KEYBINDS.MOVE_RIGHT: moveRight=true; break;
                    case KEYBINDS.JUMP: 
                        const now = performance.now();
                        if(canJump && (now - lastJumpTime > SETTINGS.jumpCooldown) && playerStats.stamina >= SETTINGS.jumpCost) {
                            velocity.y += SETTINGS.jumpForce; playerStats.stamina -= SETTINGS.jumpCost; lastJumpTime = now; canJump = false;
                        }
                        break;
                    case KEYBINDS.SPRINT: isSprinting=true; break; 
                    case KEYBINDS.WEAPON_SWITCH: 
                        // Se sono già in Melee, faccio il Whirlwind
                        if (weaponMode === 'melee') { 
                            performWhirlwind(); 
                        } else { 
                            // Altrimenti passo alla modalità Melee
                            weaponMode = 'melee'; 
                            toggleWeapon(true); 
                        } 
                        break;
                    case KEYBINDS.BOW_EQUIP:
                        // Select Bow directly
                        if (weaponMode !== 'bow') { weaponMode = 'bow'; toggleWeapon(true); }
                        break;
                    case KEYBINDS.HEAL: performHeal(); break;
                    case 84: // T key - Toggle spectator (when dead)
                        if (playerStats.isDead) toggleSpectator();
                        break;
                    case 188: // < key - Previous spectate target
                        if (isSpectating) cycleSpectate(-1);
                        break;
                    case 190: // > key - Next spectate target
                        if (isSpectating) cycleSpectate(1);
                        break;
                    case 72: // H key - Show match history
                        showMatchStats();
                        break;
                    case KEYBINDS.SPELL_1: selectSpell(1); startCasting(1, 'attack', 'Digit1'); break; case KEYBINDS.SPELL_2: selectSpell(2); startCasting(2, 'attack', 'Digit2'); break; 
                    case KEYBINDS.SPELL_3: selectSpell(3); startCasting(3, 'attack', 'Digit3'); break; case KEYBINDS.SPELL_4: selectSpell(4); startCasting(4, 'attack', 'Digit4'); break;
                    case KEYBINDS.CONVERT_1: performConversion(1); break; case KEYBINDS.CONVERT_2: performConversion(2); break; case KEYBINDS.CONVERT_3: performConversion(3); break;
                }
            });
            document.addEventListener('keyup', (e) => {
                // Gestione rilascio Ctrl (ALT rimosso)
                if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
                    if (isCtrlPressed) { // Solo se era effettivamente premuto
                        isCtrlPressed = false;
                        // Rientra nel pointer lock se il giocatore non è morto
                        const mainMenu = document.getElementById('main-menu');
                        const keybindsPanel = document.getElementById('keybinds-panel');
                        const isMenuVisible = mainMenu && mainMenu.style.display !== 'none';
                        const isPanelVisible = keybindsPanel && keybindsPanel.style.display === 'block';
                        
                        if (!playerStats.isDead && document.pointerLockElement !== document.body && !isMenuVisible && !isPanelVisible) {
                            setTimeout(() => {
                                if (!isCtrlPressed && !playerStats.isDead && document.pointerLockElement !== document.body) {
                                    try {
                                        document.body.requestPointerLock();
                                    } catch(err) {
                                        console.log('Pointer lock error:', err);
                                    }
                                }
                            }, 150);
                        }
                    }
                    return;
                }
                
                if(keyToRebind || playerStats.isDead) return;
                switch(e.code) { 
                    case KEYBINDS.MOVE_FORWARD: moveForward=false; break; case KEYBINDS.MOVE_LEFT: moveLeft=false; break; case KEYBINDS.MOVE_BACKWARD: moveBackward=false; break; case KEYBINDS.MOVE_RIGHT: moveRight=false; break; case KEYBINDS.SPRINT: isSprinting=false; break; 
                    case KEYBINDS.SPELL_1: stopCasting('Digit1'); break; case KEYBINDS.SPELL_2: stopCasting('Digit2'); break; case KEYBINDS.SPELL_3: stopCasting('Digit3'); break; case KEYBINDS.SPELL_4: stopCasting('Digit4'); break;
                }
            });
            document.body.addEventListener('mousemove', (e) => { if(document.pointerLockElement===document.body && !playerStats.isDead) { euler.y-=e.movementX*0.002*mouseSensitivity; euler.x-=e.movementY*0.002*mouseSensitivity; euler.x=Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x)); playerMesh.rotation.y=euler.y; } });
            
            document.addEventListener('mousedown', (e) => { 
                if(document.pointerLockElement===document.body && !playerStats.isDead) {
                    if (e.button === 0) { 
                        if (weaponMode === 'ranged') { startCasting(currentSpell, 'attack', 'Mouse'); }
                        else if (weaponMode === 'bow') { startCasting(null, 'bow_shot', 'Mouse'); }
                        else { performAttack(); } 
                    } else if (e.button === 2) { 
                        if (weaponMode === 'ranged' || weaponMode === 'bow') { 
                            weaponMode = 'melee'; toggleWeapon(true); // Auto-switch to Melee on block attempt
                        }
                        startBlocking();
                    }
                } 
            });
            document.addEventListener('mouseup', (e) => { 
                if (!playerStats.isDead) {
                    if (e.button === 0) {
                         if(weaponMode === 'ranged') stopCasting('Mouse');
                         if(weaponMode === 'bow') stopCasting('Mouse');
                    }
                    if (e.button === 2) stopBlocking();
                }
            });
        }
        function resetGame() { 
            saveMatchStats();
            location.reload(); 
        }
        
        // Lag Compensation - Client-side prediction
        function updatePositionBuffer(playerId, position, timestamp) {
            if (!positionBuffer[playerId]) positionBuffer[playerId] = [];
            positionBuffer[playerId].push({ pos: position.clone(), time: timestamp });
            // Keep only last 500ms of positions
            const cutoff = Date.now() - 500;
            positionBuffer[playerId] = positionBuffer[playerId].filter(p => p.time > cutoff);
        }
        
        function interpolatePosition(playerId) {
            const buffer = positionBuffer[playerId];
            if (!buffer || buffer.length < 2) return null;
            
            const renderTime = Date.now() - INTERPOLATION_DELAY;
            let i = 0;
            while (i < buffer.length - 1 && buffer[i + 1].time <= renderTime) i++;
            
            if (i >= buffer.length - 1) return buffer[buffer.length - 1].pos;
            
            const p1 = buffer[i], p2 = buffer[i + 1];
            const t = (renderTime - p1.time) / (p2.time - p1.time);
            return p1.pos.clone().lerp(p2.pos, t);
        }
        
        // LOD System
        function updateLOD() {
            if (!playerMesh || !camera) return;
            lodObjects.forEach(obj => {
                const dist = obj.position.distanceTo(camera.position);
                if (dist < LOD_DISTANCES.HIGH) {
                    if (obj.userData.highDetail) obj.userData.highDetail.visible = true;
                    if (obj.userData.lowDetail) obj.userData.lowDetail.visible = false;
                } else if (dist < LOD_DISTANCES.MEDIUM) {
                    if (obj.userData.highDetail) obj.userData.highDetail.visible = false;
                    if (obj.userData.lowDetail) obj.userData.lowDetail.visible = true;
                } else {
                    if (obj.userData.highDetail) obj.userData.highDetail.visible = false;
                    if (obj.userData.lowDetail) obj.userData.lowDetail.visible = false;
                }
            });
        }
        
        // Spectator Mode
        function toggleSpectator() {
            if (!playerStats.isDead) return;
            isSpectating = !isSpectating;
            if (isSpectating) {
                const players = Object.values(otherPlayers);
                if (players.length > 0) {
                    spectateIndex = 0;
                    spectateTarget = players[0];
                    showFloatingText('SPECTATING: ' + spectateTarget.mesh.userData.username, camera.position, 0xffffff, 2000);
                }
            }
        }
        
        function cycleSpectate(direction) {
            if (!isSpectating) return;
            const players = Object.values(otherPlayers).filter(p => !p.isDead);
            if (players.length === 0) return;
            spectateIndex = (spectateIndex + direction + players.length) % players.length;
            spectateTarget = players[spectateIndex];
            showFloatingText('SPECTATING: ' + spectateTarget.mesh.userData.username, camera.position, 0xffffff, 1500);
        }
        
        // Match Statistics
        function saveMatchStats() {
            const duration = Math.floor((Date.now() - matchStats.startTime) / 1000);
            const kd = matchStats.deaths > 0 ? (matchStats.kills / matchStats.deaths).toFixed(2) : matchStats.kills;
            const acc = matchStats.accuracy.shots > 0 ? ((matchStats.accuracy.hits / matchStats.accuracy.shots) * 100).toFixed(1) : 0;
            
            const match = {
                date: new Date().toISOString(),
                duration: duration,
                kills: matchStats.kills,
                deaths: matchStats.deaths,
                kd: kd,
                damage: matchStats.damage,
                healing: matchStats.healing,
                accuracy: acc + '%',
                team: myTeam
            };
            
            matchStats.matchHistory.unshift(match);
            if (matchStats.matchHistory.length > 50) matchStats.matchHistory.pop();
            localStorage.setItem('ragequit_match_history', JSON.stringify(matchStats.matchHistory));
        }
        
        function showMatchStats() {
            console.log('=== MATCH STATISTICS ===');
            console.log('K/D:', matchStats.kills + '/' + matchStats.deaths);
            console.log('Damage:', matchStats.damage);
            console.log('Healing:', matchStats.healing);
            console.log('Accuracy:', matchStats.accuracy.shots > 0 ? ((matchStats.accuracy.hits / matchStats.accuracy.shots) * 100).toFixed(1) + '%' : '0%');
            console.log('Match History (last 10):');
            matchStats.matchHistory.slice(0, 10).forEach((m, i) => {
                console.log(`${i+1}. ${m.date} | K/D: ${m.kd} | Acc: ${m.accuracy} | Duration: ${m.duration}s`);
            });
        }
        function updateUI() {
            document.getElementById('hp-bar').style.width = `${playerStats.hp}%`; 
            document.getElementById('mana-bar').style.width = `${playerStats.mana}%`; 
            document.getElementById('stamina-bar').style.width = `${playerStats.stamina}%`;
            
            document.getElementById('hp-value').textContent = `${Math.round(playerStats.hp)}/${playerStats.maxHp}`;
            document.getElementById('mana-value').textContent = `${Math.round(playerStats.mana)}/${playerStats.maxMana}`;
            document.getElementById('stamina-value').textContent = `${Math.round(playerStats.stamina)}/${playerStats.maxStamina}`;
            
            const now = performance.now();
            const gcdProgress = Math.max(0, (SETTINGS.fireRate - (now - lastAttackTime)) / SETTINGS.fireRate);
            if (weaponMode === 'ranged') { for(let i=1; i<=4; i++) { const el = document.querySelector(`#slot-${i} .cooldown-overlay`); if(el) el.style.height = (gcdProgress * 100) + '%'; } }
            const wwProgress = Math.max(0, (SETTINGS.whirlwindCooldown - (now - lastWhirlwindTime)) / SETTINGS.whirlwindCooldown);
            const wwOverlay = document.querySelector('#slot-q .cooldown-overlay'); if(wwOverlay) wwOverlay.style.height = (wwProgress * 100) + '%';
            const spikesProgress = Math.max(0, (SETTINGS.spikesCooldown - (now - lastSpikesTime)) / SETTINGS.spikesCooldown);
            const spikesOverlay = document.getElementById('spikes-cd'); if(spikesOverlay) spikesOverlay.style.height = (spikesProgress * 100) + '%';
            const healProgress = Math.max(0, (SETTINGS.healCooldown - (now - lastHealTime)) / SETTINGS.healCooldown);
            const healOverlay = document.getElementById('heal-cd'); if(healOverlay) healOverlay.style.height = (healProgress * 100) + '%';
            const convProgress = Math.max(0, (SETTINGS.conversionCooldown - (now - lastConversionTime)) / SETTINGS.conversionCooldown);
            ['conv1-cd', 'conv2-cd', 'conv3-cd'].forEach(id => { const el = document.getElementById(id); if(el) el.style.height = (convProgress * 100) + '%'; });
        }
        function animate() {
            requestAnimationFrame(animate);
            const time = performance.now(); const delta = (time - prevTime) / 1000; prevTime = time;
            
            // FPS Counter
            fpsFrames++;
            if (time - fpsLastTime >= 1000) {
                currentFPS = fpsFrames;
                fpsFrames = 0;
                fpsLastTime = time;
                document.getElementById('fps-counter').innerText = 'FPS: ' + currentFPS;
            }
            
            // Spectator camera
            if (isSpectating && spectateTarget && spectateTarget.mesh) {
                camera.position.copy(spectateTarget.mesh.position).add(new THREE.Vector3(0, 10, 15));
                camera.lookAt(spectateTarget.mesh.position);
            }
            
            if (!playerStats.isDead && !isSpectating) { 
                try {
                    updatePhysics(delta); 
                    updateCamera(); // Moved here to fix lag
                    sendPositionUpdate(); // Invia posizione ad alta frequenza
                    updateProjectiles(delta); updateCasting(delta);
                    updateParticles(delta); // Aggiorna particelle (sangue, gibs, ecc)
                    updateConversions(delta); updateFloatingTexts(delta);
                    updateSwordAnimation(delta);
                    
                    // Aggiorna il mostro IA se in modalità PvE
                    if (isPvEMode && aiMonster) {
                        updateAIMonster(delta);
                    }
                } catch(e) { console.error(e); }
                // updateCamera(); // Previously here
            }
            
            // Update LOD every 5 frames for performance
            if (frameCount % 5 === 0) updateLOD();
            
            updateAnimations(delta); 
            frameCount++;
            if (frameCount % 2 === 0) updateUI(); // Aggiorna UI ogni 2 frame per performance
            renderer.render(scene, camera);
        }
        
        // Non inizializzare subito - aspetta che menu.js chiami startGame()
        // init();