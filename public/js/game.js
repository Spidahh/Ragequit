let socket = null;
        const otherPlayers = {}; 
        let myId = null;
        let myUsername = "Player";
        let myTeamColor = 0x2c3e50; // Colore dell'armatura del giocatore
        let myGameMode = 'ffa'; // 'ffa' o 'team' o 'pve'
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
            jumpForce: 250.0, 
            jumpCooldown: 300,
            jumpCost: 15, 
            gravity: 800.0, 
            
            // Missile (Dardo)
            missileSpeed: 900.0, 
            missileDmg: 10, 
            missileCost: 5,
            
            // ONDA (Shockwave)
            pushSpeed: 700.0, 
            pushForce: 900.0, 
            pushUpForce: 500.0, 
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
            arrowDmg: 25, 
            arrowCost: 0, 
            arrowGravity: 5, // GRAVITÀ FRECCIA RIDOTTA
            
            fireRate: 400, meleeRate: 500, 
            meleeRange: 32, 
            meleeDmg: 15, 
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
        const changeNameBtn = document.getElementById('change-name-btn');
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
        // changeNameBtn permette di cambiare nome durante il gioco
        changeNameBtn.addEventListener('click', () => {
             document.exitPointerLock(); document.getElementById('login-modal').style.display = 'flex';
             document.getElementById('login-input').value = myUsername;
             document.getElementById('btn-login').onclick = () => {
                const inputName = document.getElementById('login-input').value.trim();
                if(inputName.length > 0) { myUsername = inputName; localStorage.setItem('ragequit_username', myUsername); if(socket) socket.emit('updateUsername', myUsername); document.getElementById('connection-status').innerText = "CONNESSO: " + myUsername; }
                document.getElementById('login-modal').style.display = 'none';
             };
        });

        // Pulsante Torna al Menu Principale
        document.getElementById('menu-btn').addEventListener('click', () => {
            document.exitPointerLock();
            if (socket) socket.disconnect();
            
            // Ripristina le variabili di gioco
            myId = null;
            myUsername = "Player";
            myTeamColor = 0x2c3e50;
            myGameMode = 'ffa';
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
            const ffaContainer = document.getElementById('kill-counter-ffa');
            const teamContainer = document.getElementById('kill-counter-team');
            
            if (myGameMode === 'ffa') {
                ffaContainer.style.display = 'block';
                teamContainer.style.display = 'none';
                
                // Crea lista ordinata per kill
                const sortedPlayers = Object.entries(playerKills).sort((a, b) => b[1] - a[1]);
                ffaContainer.innerHTML = sortedPlayers.map(([id, kills]) => {
                    const playerName = id === myId ? myUsername : (otherPlayers[id]?.username || 'Unknown');
                    return `<div class="player-kill-row">
                        <span class="player-kill-name">${playerName}</span>
                        <span class="player-kill-count">${kills} ☠️</span>
                    </div>`;
                }).join('');
            } else if (myGameMode === 'team') {
                ffaContainer.style.display = 'none';
                teamContainer.style.display = 'flex';
                
                const teamNames = {red: 'ROSIKONI', black: 'NIGHTCRAWLERS', green: 'TRIMONI', purple: 'VOID LORDS'};
                teamContainer.innerHTML = ['red', 'black', 'green', 'purple'].map(team => 
                    `<div class="team-kill-box ${team}">
                        <div class="team-name">${teamNames[team]}</div>
                        <div class="team-kills">${teamKills[team]} ☠️</div>
                    </div>`
                ).join('');
            }
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
            
            // Colore di sfondo più chiaro per migliore visibilità
            const gameMode = window.myGameMode || 'ffa';
            if (gameMode === 'team') {
                scene.background = new THREE.Color(0x2a2a3a);
                scene.fog = new THREE.Fog(0x2a2a3a, 200, 900);
            } else {
                scene.background = new THREE.Color(0x3a1a1a);
                scene.fog = new THREE.Fog(0x3a1a1a, 180, 850);
            }
            
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
            createPlayer(); createSword(); createStaff(); createShield(); createBow();
            
            // Luci più chiare per migliore visibilità
            const ambientLight = new THREE.AmbientLight(0x666688, 0.8);
            scene.add(ambientLight);
            
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
            dirLight.position.set(150, 250, 100);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            dirLight.shadow.camera.near = 0.5;
            dirLight.shadow.camera.far = 800;
            dirLight.shadow.camera.left = -300;
            dirLight.shadow.camera.right = 300;
            dirLight.shadow.camera.top = 300;
            dirLight.shadow.camera.bottom = -300;
            scene.add(dirLight);
            
            // Luce puntiforme per illuminare meglio
            const pointLight = new THREE.PointLight(0xffffff, 0.4, 500);
            pointLight.position.set(0, 100, 0);
            scene.add(pointLight);
            
            seed = WORLD_SEED; setupWorld(); setupControls(); setupUIEvents();
            renderer = new THREE.WebGLRenderer({ antialias: true }); 
            renderer.setPixelRatio(window.devicePixelRatio); 
            renderer.setSize(window.innerWidth, window.innerHeight); 
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
            }
            if (typeof window.myTeam !== 'undefined') {
                myTeam = window.myTeam;
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
            // Resetta le statistiche del giocatore
            playerStats.hp = playerStats.maxHp;
            playerStats.mana = playerStats.maxMana;
            playerStats.stamina = playerStats.maxStamina;
            playerStats.isDead = false;
            
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
            
            // Resetta lo stato di combattimento
            isAttacking = false;
            attackTimer = 0;
            isBlocking = false;
            
            // Mostra il messaggio
            document.getElementById('message').style.display = 'none';
            
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
        
        // Ottieni la posizione di spawn in base alla modalità di gioco
        function getSpawnPosition() {
            const gameMode = window.myGameMode || 'ffa';
            const team = window.myTeam;
            
            if (gameMode === 'team' && team) {
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
            
            // Spawn FFA - posizione completamente casuale in tutta la mappa
            const mapSize = 750; // Leggermente più piccolo dei muri (800)
            const x = (Math.random() - 0.5) * mapSize;
            const z = (Math.random() - 0.5) * mapSize;
            return new THREE.Vector3(x, 6, z);
        }
        
        function setupUIEvents() {
            document.getElementById('reset-btn').addEventListener('click', (e) => { e.stopPropagation(); respawnPlayer(); });
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
        function resetGame() { location.reload(); }
        function updateUI() {
            document.getElementById('hp-bar').style.width = `${playerStats.hp}%`; document.getElementById('mana-bar').style.width = `${playerStats.mana}%`; document.getElementById('stamina-bar').style.width = `${playerStats.stamina}%`;
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
            if (!playerStats.isDead) { 
                try {
                    updatePhysics(delta); 
                    updateCamera(); // Moved here to fix lag
                    updateProjectiles(delta); updateCasting(delta);
                    updateConversions(delta); updateFloatingTexts(delta);
                    updateSwordAnimation(delta);
                    
                    // Aggiorna il mostro IA se in modalità PvE
                    if (isPvEMode && aiMonster) {
                        updateAIMonster(delta);
                    }
                } catch(e) { console.error(e); }
                // updateCamera(); // Previously here
            }
            updateAnimations(delta); 
            updateUI(); renderer.render(scene, camera);
        }
        
        // Non inizializzare subito - aspetta che menu.js chiami startGame()
        // init();