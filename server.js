const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" },
  pingTimeout: 5000,
  pingInterval: 10000
});
const path = require('path');

// Variabili globali
let players = {};
let lastSeen = {};

// Serviamo i file statici dalla cartella "public"
app.use(express.static(path.join(__dirname, 'public')));

// Gestisci favicon e altri asset mancanti
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // No Content
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- LOGICA MULTIPLAYER ORIGINALE ---

io.on('connection', (socket) => {
    console.log('Nuova connessione: ' + socket.id);
    lastSeen[socket.id] = Date.now();

    socket.on('joinGame', (userData) => {
        if (players[socket.id]) delete players[socket.id];
        
        if (Object.keys(players).length >= 10) {
            socket.emit('serverMsg', 'Server pieno!');
            return;
        }

        console.log(`Giocatore ${userData.username} (ID: ${socket.id}) entrato.`);

        players[socket.id] = {
            id: socket.id,
            username: userData.username || "Guerriero",
            hp: 100,
            maxHp: 100,
            position: { x: 0, y: 6, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            animState: 'idle',
            weaponMode: 'ranged',
            isBlocking: false,
            isDead: false,
            teamColor: userData.teamColor || 0x2c3e50,
            gameMode: userData.gameMode || 'ffa',
            team: userData.team || null
        };

        // Debug trace: emit currentPlayers to the joining socket and broadcast newPlayer
        console.log(`TRACE: emitting currentPlayers to ${socket.id} (playersCount=${Object.keys(players).length})`);
        socket.emit('currentPlayers', players);
        console.log(`TRACE: broadcasting newPlayer from ${socket.id} -> id=${players[socket.id].id}`);
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });
    
    socket.on('requestPosition', () => {
        socket.broadcast.emit('forcePositionUpdate');
    });

    socket.on('updateUsername', (username) => {
        if(players[socket.id]) {
            players[socket.id].username = username;
            io.emit('updateUsername', { id: socket.id, username: username });
        }
    });

    socket.on('updateTeamColor', (data) => {
        if(players[socket.id]) {
            players[socket.id].teamColor = data.teamColor;
            io.emit('playerTeamColorChanged', { id: socket.id, teamColor: data.teamColor });
        }
    });

    socket.on('playerMovement', (data) => {
        lastSeen[socket.id] = Date.now();
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            players[socket.id].rotation = data.rotation;
            players[socket.id].animState = data.animState;
            players[socket.id].weaponMode = data.weaponMode;
            
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                ...data
            });
        }
    });

    socket.on('playerBlock', (isBlocking) => {
        if (players[socket.id]) {
            players[socket.id].isBlocking = isBlocking;
            socket.broadcast.emit('updateEnemyBlock', { id: socket.id, isBlocking: isBlocking });
        }
    });

    socket.on('remoteEffect', (data) => {
        socket.broadcast.emit('remoteEffect', { id: socket.id, ...data });
    });

    socket.on('playerAttack', (attackData) => {
        socket.broadcast.emit('enemyAttacked', {
            id: socket.id,
            ...attackData
        });
    });

    socket.on('playerPushed', (pushData) => {
        const targetId = pushData.targetId;
        if (players[targetId]) {
            let actualDamage = 0;
            if (pushData.damage) {
                actualDamage = pushData.damage;
                players[targetId].hp -= actualDamage;
            }
            // Emit to the target player so they can execute the push effect
            io.to(targetId).emit('playerPushed', {
                forceY: pushData.forceY, 
                forceVec: pushData.forceVec, 
                pushOrigin: pushData.pushOrigin
            });
            
            // Emit health update and damage effect to all players
            io.emit('updateHealth', { id: targetId, hp: players[targetId].hp });
            if (actualDamage > 0) {
                io.emit('remoteDamageTaken', { id: targetId }); // Notify all for blood/damage effect
            }

            if (players[targetId].hp <= 0 && !players[targetId].isDead) {
                players[targetId].isDead = true;
                io.emit('playerDied', { id: targetId, killerId: socket.id }); // Sent to ALL players
            }
        }
    });

    socket.on('playerHit', (dmgData) => {
        const targetId = dmgData.targetId;
        if (players[targetId]) {
            const actualDamage = dmgData.damage;
            players[targetId].hp -= actualDamage;
            
            // Send health update to all
            io.emit('updateHealth', { id: targetId, hp: players[targetId].hp });
            
            // Send specific damage response to the target for local effects (like screen flash)
            io.to(targetId).emit('playerHitResponse', { damage: actualDamage });

            // Notify all for blood/damage effect
            if (actualDamage > 0) {
                io.emit('remoteDamageTaken', { id: targetId });
            }
            
            if (players[targetId].hp <= 0 && !players[targetId].isDead) {
                players[targetId].isDead = true;
                io.emit('playerDied', { id: targetId, killerId: socket.id }); // Sent to ALL players
            }
        }
    });
    
    socket.on('playerHealed', (healData) => {
        if (players[socket.id]) {
            players[socket.id].hp = Math.min(players[socket.id].maxHp, players[socket.id].hp + healData.amount);
            io.emit('updateHealth', { id: socket.id, hp: players[socket.id].hp });
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnesso: ' + socket.id);
        if (players[socket.id]) {
            delete players[socket.id];
            io.emit('playerDisconnected', socket.id);
        }
        delete lastSeen[socket.id];
    });
});

setInterval(() => {
    const now = Date.now();
    Object.keys(players).forEach(id => {
        if (lastSeen[id] && (now - lastSeen[id] > 10000)) {
            delete players[id];
            delete lastSeen[id];
            io.emit('playerDisconnected', id);
        }
    });
}, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server RageQuit attivo su porta ${PORT}`);
});