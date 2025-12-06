/**
 * RageQuit Multiplayer Client - Team Mode
 * Socket.io client for real-time synchronization
 */

// Initialize Socket.io connection
const socket = io();

// DOM elements
const connectionStatus = document.getElementById('connection-status');
const socketIdEl = document.getElementById('socket-id');
const playerCountEl = document.getElementById('player-count');
const pingEl = document.getElementById('ping');
const playersListEl = document.getElementById('players');
const consoleEl = document.getElementById('console');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const teamModal = document.getElementById('teamModal');
const scoreboard = document.getElementById('scoreboard');
const scoreboardContent = document.getElementById('scoreboardContent');
const playerTeamEl = document.getElementById('player-team');
const playerKillsEl = document.getElementById('player-kills');
const playerDeathsEl = document.getElementById('player-deaths');

// Game state
let players = {};
let myId = null;
let lastPingTime = 0;
let myTeam = null;
let teamScores = { Red: 0, Blue: 0, Green: 0, Yellow: 0 };

/**
 * Log to console display
 */
function log(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  consoleEl.appendChild(entry);
  consoleEl.scrollTop = consoleEl.scrollHeight;
  
  // Keep only last 50 entries
  while (consoleEl.children.length > 50) {
    consoleEl.removeChild(consoleEl.firstChild);
  }
}

/**
 * Update scoreboard UI
 */
function updateScoreboardUI(data) {
  teamScores = data.teamScores;
  const allPlayers = data.players;
  
  // Group players by team
  const teams = {
    Red: allPlayers.filter(p => p.team === 'Red'),
    Blue: allPlayers.filter(p => p.team === 'Blue'),
    Green: allPlayers.filter(p => p.team === 'Green'),
    Yellow: allPlayers.filter(p => p.team === 'Yellow')
  };
  
  // Build scoreboard HTML
  let html = '';
  
  ['Red', 'Blue', 'Green', 'Yellow'].forEach(team => {
    const teamPlayers = teams[team];
    const teamClass = team.toLowerCase();
    
    html += `
      <div class="team-score-section ${teamClass}">
        <div class="team-header team-${teamClass}">
          <span class="team-name">${team} Team</span>
          <span class="team-total-score">${teamScores[team]}</span>
        </div>
        <div class="team-players">
    `;
    
    if (teamPlayers.length === 0) {
      html += '<div class="team-player"><span class="player-name">No players</span></div>';
    } else {
      teamPlayers.forEach(player => {
        const kd = player.deaths === 0 ? player.kills : (player.kills / player.deaths).toFixed(2);
        html += `
          <div class="team-player">
            <span class="player-name">${player.nickname}</span>
            <span class="player-stats">${player.kills}K / ${player.deaths}D (${kd})</span>
          </div>
        `;
      });
    }
    
    html += `
        </div>
      </div>
    `;
  });
  
  scoreboardContent.innerHTML = html;
}

/**
 * Update player list UI
 */
function updatePlayerList() {
  playersListEl.innerHTML = '';
  const playerArray = Object.values(players);
  
  playerArray.forEach(player => {
    const div = document.createElement('div');
    div.className = 'player-item';
    if (player.id === myId) {
      div.classList.add('you');
    }
    
    const teamClass = player.team ? `team-${player.team.toLowerCase()}` : '';
    const teamText = player.team ? `[${player.team}]` : '[No Team]';
    
    div.innerHTML = `
      <div>
        <span class="player-team ${teamClass}">${teamText}</span>
        <strong>${player.nickname || player.id.substring(0, 8)}</strong>
      </div>
      <div style="font-size: 10px; color: #888;">
        K/D: ${player.kills || 0}/${player.deaths || 0} | HP: ${player.health || 100}
      </div>
    `;
    playersListEl.appendChild(div);
  });
  
  playerCountEl.textContent = playerArray.length;
}

/**
 * Draw players on canvas (simple visualization)
 */
function drawPlayers() {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // Draw players
  Object.values(players).forEach(player => {
    // Map 3D position to 2D canvas (simple top-down view)
    const x = canvas.width / 2 + player.position.x * 10;
    const y = canvas.height / 2 + player.position.z * 10;
    
    // Draw player circle with team color
    const isMe = player.id === myId;
    let color = '#888888'; // Default gray for no team
    
    if (player.team === 'Red') color = '#ff4444';
    else if (player.team === 'Blue') color = '#4444ff';
    else if (player.team === 'Green') color = '#44ff44';
    else if (player.team === 'Yellow') color = '#ffff44';
    
    if (isMe) {
      // Draw glow for own player
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, isMe ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw direction indicator
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const dirX = x + Math.sin(player.rotation.yaw || 0) * 15;
    const dirY = y - Math.cos(player.rotation.yaw || 0) * 15;
    ctx.lineTo(dirX, dirY);
    ctx.stroke();
    
    // Draw nickname
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.nickname || player.id.substring(0, 6), x, y - 15);
  });
}

/**
 * Socket.io Event Handlers
 */

// Connection established
socket.on('connect', () => {
  myId = socket.id;
  connectionStatus.textContent = 'CONNECTED';
  connectionStatus.className = 'connected';
  socketIdEl.textContent = socket.id.substring(0, 8) + '...';
  log(`✅ Connected to server! ID: ${socket.id}`, 'info');
  
  // Show team selection modal
  teamModal.classList.remove('hidden');
  
  // Start ping measurement
  setInterval(() => {
    lastPingTime = Date.now();
    socket.emit('ping');
  }, 2000);
});

// Pong response
socket.on('pong', () => {
  const ping = Date.now() - lastPingTime;
  pingEl.textContent = `${ping}ms`;
});

// Receive all current players
socket.on('currentPlayers', (currentPlayers) => {
  players = currentPlayers;
  log(`📋 Received ${Object.keys(players).length} players`, 'info');
  updatePlayerList();
  drawPlayers();
});

// New player joined
socket.on('newPlayer', (playerInfo) => {
  players[playerInfo.id] = playerInfo;
  log(`➕ New player joined: ${playerInfo.id.substring(0, 8)}`, 'info');
  updatePlayerList();
  drawPlayers();
});

// Player moved
socket.on('playerMoved', (movementData) => {
  if (players[movementData.id]) {
    players[movementData.id].position = movementData.position;
    players[movementData.id].rotation = movementData.rotation;
    players[movementData.id].velocity = movementData.velocity;
    drawPlayers();
  }
});

// Player disconnected
socket.on('playerDisconnected', (playerId) => {
  if (players[playerId]) {
    log(`➖ Player left: ${playerId.substring(0, 8)}`, 'warn');
    delete players[playerId];
    updatePlayerList();
    drawPlayers();
  }
});

// Player attacked
socket.on('playerAttacked', (attackData) => {
  log(`⚔️ Player ${attackData.id.substring(0, 8)} used ${attackData.skillId}`, 'info');
});

// Player damaged
socket.on('playerDamaged', (damageData) => {
  if (players[damageData.id]) {
    players[damageData.id].health = damageData.health;
    log(`💔 Player ${damageData.id.substring(0, 8)} took ${damageData.damage} damage`, 'warn');
    updatePlayerList();
  }
});

// Player died
socket.on('playerDied', (data) => {
  log(`💀 Player ${data.id.substring(0, 8)} died`, 'error');
});

// Player respawned
socket.on('playerRespawned', (data) => {
  if (players[data.id]) {
    players[data.id].health = data.health;
    players[data.id].position = data.position;
    log(`🔄 Player ${data.id.substring(0, 8)} respawned`, 'info');
    updatePlayerList();
    drawPlayers();
  }
});

// Player joined team
socket.on('playerJoinedTeam', (data) => {
  if (players[data.id]) {
    players[data.id].team = data.team;
    players[data.id].position = data.position;
  } else {
    players[data.id] = {
      id: data.id,
      nickname: data.nickname,
      team: data.team,
      position: data.position,
      rotation: { yaw: 0, pitch: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      kills: 0,
      deaths: 0
    };
  }
  
  if (data.id === myId) {
    myTeam = data.team;
    playerTeamEl.textContent = data.team;
    playerTeamEl.className = `team-${data.team.toLowerCase()}`;
    log(`✅ You joined ${data.team} Team!`, 'info');
  } else {
    log(`👥 ${data.nickname} joined ${data.team} Team`, 'info');
  }
  
  updatePlayerList();
  drawPlayers();
});

// Player killed event
socket.on('playerKilledEvent', (data) => {
  log(`💀 ${data.killerName} (${data.killerTeam}) killed ${data.victimName} (${data.victimTeam})`, 'error');
  
  // Update local player stats if applicable
  if (data.killerId === myId) {
    playerKillsEl.textContent = (parseInt(playerKillsEl.textContent) + 1).toString();
  }
  if (data.victimId === myId) {
    playerDeathsEl.textContent = (parseInt(playerDeathsEl.textContent) + 1).toString();
  }
});

// Scoreboard update
socket.on('updateScoreboard', (data) => {
  updateScoreboardUI(data);
  
  // Update own stats
  const myPlayer = data.players.find(p => p.id === myId);
  if (myPlayer) {
    playerKillsEl.textContent = myPlayer.kills;
    playerDeathsEl.textContent = myPlayer.deaths;
    
    // Update local players object with latest stats
    if (players[myId]) {
      players[myId].kills = myPlayer.kills;
      players[myId].deaths = myPlayer.deaths;
    }
  }
  
  // Update all players' stats
  data.players.forEach(p => {
    if (players[p.id]) {
      players[p.id].kills = p.kills;
      players[p.id].deaths = p.deaths;
      players[p.id].team = p.team;
    }
  });
  
  updatePlayerList();
});

// Nickname updated
socket.on('nicknameUpdated', (data) => {
  if (players[data.id]) {
    players[data.id].nickname = data.nickname;
    updatePlayerList();
    drawPlayers();
  }
});

// Disconnected
socket.on('disconnect', () => {
  connectionStatus.textContent = 'DISCONNECTED';
  connectionStatus.className = 'disconnected';
  socketIdEl.textContent = 'N/A';
  log('❌ Disconnected from server', 'error');
});

/**
 * Send movement data to server
 */
export function sendMovement(x, y, z, yaw = 0, pitch = 0) {
  if (!socket.connected) return;
  
  socket.emit('playerMovement', {
    position: { x, y, z },
    rotation: { yaw, pitch },
    velocity: { x: 0, y: 0, z: 0 }
  });
}

/**
 * Send attack data to server
 */
export function sendAttack(skillId, position, direction) {
  if (!socket.connected) return;
  
  socket.emit('playerAttack', {
    skillId,
    position,
    direction
  });
}

/**
 * Test movement (simulate player moving in a circle)
 */
let testAngle = 0;
function testMovement() {
  if (!socket.connected || !myId || !myTeam) return; // Only move if on a team
  
  testAngle += 0.02;
  const x = Math.cos(testAngle) * 5;
  const z = Math.sin(testAngle) * 5;
  const y = 10;
  
  sendMovement(x, y, z, testAngle, 0);
}

// Team selection button handlers
document.querySelectorAll('.team-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const team = btn.getAttribute('data-team');
    
    // Send team selection to server
    socket.emit('joinTeam', team);
    
    // Hide modal
    teamModal.classList.add('hidden');
    
    // Show scoreboard
    scoreboard.classList.remove('hidden');
    
    log(`🎯 Joining ${team} Team...`, 'info');
  });
});

// Start test movement
setInterval(testMovement, 100);

// Animation loop
function animate() {
  drawPlayers();
  requestAnimationFrame(animate);
}
animate();

log('✅ Client initialized', 'info');
log('🎮 Select a team to begin!', 'info');

// Export for external use
window.RageQuitClient = {
  socket,
  sendMovement,
  sendAttack,
  players
};
