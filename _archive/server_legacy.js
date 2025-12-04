/**
 * RageQuit Production Server
 * Serves Vite build + handles Socket.io connections
 * Compatible with Render.com deployment
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'dist')));

// Player State
const players = {};

io.on('connection', (socket) => {
  console.log('Player connected (Lobby):', socket.id);

  // Init Player Data
  players[socket.id] = {
    id: socket.id,
    position: { x: 0, y: 1, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    name: "Unknown",
    room: null,
    hp: 100,
    isDead: false
  };

  // 1. HANDLE ROOM JOINING
  socket.on('joinGame', (roomName) => {
    // Leave previous room if any
    if (players[socket.id].room) {
      socket.leave(players[socket.id].room);
    }

    // Join new room
    socket.join(roomName);
    players[socket.id].room = roomName;
    console.log(`${socket.id} joined ${roomName}`);

    // Filter players IN THIS ROOM only
    const roomPlayers = {};
    Object.keys(players).forEach(pid => {
      if (players[pid].room === roomName) {
        roomPlayers[pid] = players[pid];
      }
    });

    // Send Room State to user
    socket.emit('roomState', roomPlayers);

    // Notify others IN THIS ROOM
    socket.to(roomName).emit('newPlayer', players[socket.id]);
  });

  // 2. MOVEMENT (Room Scoped)
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      const p = players[socket.id];
      p.position = data.position;
      p.rotation = data.rotation;
      // Broadcast ONLY to room
      if (p.room) socket.to(p.room).emit('playerMoved', p);
    }
  });

  // 3. ATTACKS (Room Scoped)
  socket.on('playerAttack', (data) => {
    const p = players[socket.id];
    if (p && p.room) socket.to(p.room).emit('otherPlayerAttack', { id: socket.id, skillId: data.skillId });
  });

  // 3.5 DAMAGE (Room Scoped)
  socket.on('playerHit', (data) => {
    // data = { targetId, damage, skillId }
    const victim = players[data.targetId];
    if (victim && !victim.isDead) {
      victim.hp -= data.damage;
      // Broadcast damage within room
      if (victim.room) {
        io.to(victim.room).emit('playerDamaged', {
          id: data.targetId,
          damage: data.damage,
          currentHp: victim.hp
        });
      }

      // Death check
      if (victim.hp <= 0) {
        victim.isDead = true;
        victim.hp = 0;
        if (victim.room) {
          io.to(victim.room).emit('playerDied', { id: data.targetId, killerId: socket.id });

          // Auto-respawn after 3 seconds
          setTimeout(() => {
            if (victim.isDead) {
              victim.hp = 100;
              victim.isDead = false;
              victim.position = { x: 0, y: 2, z: 0 }; // Spawn point
              io.to(victim.room).emit('playerRespawned', { id: data.targetId });
            }
          }, 3000);
        }
      }
    }
  });

  // 3.6 RESPAWN
  socket.on('playerRespawn', () => {
    const p = players[socket.id];
    if (p) {
      p.hp = 100;
      p.isDead = false;
      if (p.room) io.to(p.room).emit('playerRespawned', { id: socket.id });
    }
  });

  // 4. IDENTITY
  socket.on('playerIdentity', (name) => {
    if (players[socket.id]) players[socket.id].name = name;
  });

  // 5. DISCONNECT
  socket.on('disconnect', () => {
    const p = players[socket.id];
    if (p && p.room) {
      io.to(p.room).emit('playerDisconnected', socket.id);
    }
    delete players[socket.id];
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
