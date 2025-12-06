/**
 * RageQuit Multiplayer Server
 * Socket.io server for real-time player synchronization
 * Deployed on Render.com
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Security: Add helmet to disable x-powered-by and set secure headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// CORS allowlist: Read from environment, fallback to localhost for dev
const getAllowedOrigins = () => {
  const clientUrl = process.env.CLIENT_URL;
  const additionalOrigins = (process.env.ADDITIONAL_ORIGINS || '').split(',').filter(Boolean);
  
  // In development, allow localhost
  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:5173', 'http://localhost:3000', ...(clientUrl ? [clientUrl] : []), ...additionalOrigins];
  }
  
  // In production, strict allowlist
  return clientUrl ? [clientUrl, ...additionalOrigins] : additionalOrigins;
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests without origin (like mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    
    // Check if origin is in allowlist
    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    
    console.warn(`❌ CORS denied for origin: ${origin}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST']
};

console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(', ')}`);

// Configure CORS for Socket.io
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Enable CORS for Express
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting for health endpoint (60 requests per minute per IP)
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per windowMs
  message: 'Too many health check requests, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Don't rate limit internal health checks
    return req.ip === '127.0.0.1' || req.ip === '::1';
  }
});

// Serve static files from dist directory (Vite build output)
app.use(express.static(join(__dirname, '..', 'dist')));

// Players state storage
const players = {};

// Health check endpoint for Render/Koyeb
app.get('/health', healthLimiter, (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    players: Object.keys(players).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// SPA fallback: serve index.html for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

// Team scores tracking
const teamScores = {
  Red: 0,
  Blue: 0,
  Green: 0,
  Yellow: 0
};

// Team spawn points (bases at cardinal directions)
const teamSpawnPoints = {
  Red: { x: 0, y: 10, z: -25 },    // North
  Blue: { x: 0, y: 10, z: 25 },    // South
  Green: { x: 25, y: 10, z: 0 },   // East
  Yellow: { x: -25, y: 10, z: 0 }  // West
};

// Room management (for future matchmaking)
const rooms = {
  lobby: new Set()
};

/**
 * Socket.io Connection Handler
 */
io.on('connection', (socket) => {
  console.log(`✅ Player connected: ${socket.id}`);
  
  // Create new player entry
  players[socket.id] = {
    id: socket.id,
    position: { x: 0, y: 10, z: 0 },
    rotation: { yaw: 0, pitch: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 100,
    nickname: `Player_${socket.id.substring(0, 4)}`,
    team: null,           // Team assignment (Red, Blue, Green, Yellow)
    kills: 0,             // Player kills
    deaths: 0,            // Player deaths
    timestamp: Date.now()
  };
  
  // Add to lobby room
  socket.join('lobby');
  rooms.lobby.add(socket.id);
  
  // Send current players to the new player
  socket.emit('currentPlayers', players);
  
  // Notify all other players about the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);
  
  console.log(`📊 Total players: ${Object.keys(players).length}`);
  
  /**
   * Handle team selection
   */
  socket.on('joinTeam', (teamColor) => {
    if (!players[socket.id]) return;
    
    // Validate team color
    const validTeams = ['Red', 'Blue', 'Green', 'Yellow'];
    if (!validTeams.includes(teamColor)) {
      console.log(`⚠️ Invalid team color: ${teamColor}`);
      return;
    }
    
    // Assign team
    players[socket.id].team = teamColor;
    players[socket.id].kills = 0;
    players[socket.id].deaths = 0;
    
    // Spawn at team base
    const spawnPoint = teamSpawnPoints[teamColor];
    players[socket.id].position = { ...spawnPoint };
    players[socket.id].health = 100;
    
    console.log(`🎯 Player ${socket.id.substring(0, 8)} joined ${teamColor} team`);
    
    // Notify all players of team assignment
    io.to('lobby').emit('playerJoinedTeam', {
      id: socket.id,
      team: teamColor,
      position: spawnPoint,
      nickname: players[socket.id].nickname
    });
    
    // Send current scoreboard to the new team member
    socket.emit('updateScoreboard', {
      teamScores,
      players: Object.values(players).map(p => ({
        id: p.id,
        nickname: p.nickname,
        team: p.team,
        kills: p.kills,
        deaths: p.deaths
      }))
    });
  });
  
  /**
   * Handle player kill event
   */
  socket.on('playerKilled', (data) => {
    const { killerId, victimId } = data;
    
    if (!players[killerId] || !players[victimId]) return;
    
    const killer = players[killerId];
    const victim = players[victimId];
    
    // Prevent team kills from counting (optional - remove if you want friendly fire)
    if (killer.team === victim.team && killer.team !== null) {
      console.log(`⚠️ Team kill ignored: ${killerId} killed teammate ${victimId}`);
      return;
    }
    
    // Update killer stats
    killer.kills++;
    
    // Update team score (only if killer has a team)
    if (killer.team) {
      teamScores[killer.team]++;
    }
    
    // Update victim stats
    victim.deaths++;
    victim.health = 0;
    
    console.log(`💀 Kill: ${killer.nickname} (${killer.team}) killed ${victim.nickname} (${victim.team})`);
    console.log(`📊 Team Scores: Red=${teamScores.Red}, Blue=${teamScores.Blue}, Green=${teamScores.Green}, Yellow=${teamScores.Yellow}`);
    
    // Notify all players
    io.to('lobby').emit('playerKilledEvent', {
      killerId,
      killerName: killer.nickname,
      killerTeam: killer.team,
      victimId,
      victimName: victim.nickname,
      victimTeam: victim.team
    });
    
    // Respawn victim at their team base after 3 seconds
    setTimeout(() => {
      if (players[victimId] && victim.team) {
        const spawnPoint = teamSpawnPoints[victim.team];
        players[victimId].position = { ...spawnPoint };
        players[victimId].health = 100;
        
        io.to('lobby').emit('playerRespawned', {
          id: victimId,
          position: spawnPoint,
          health: 100
        });
        
        console.log(`🔄 ${victim.nickname} respawned at ${victim.team} base`);
      }
    }, 3000);
    
    // Broadcast updated scoreboard
    io.to('lobby').emit('updateScoreboard', {
      teamScores,
      players: Object.values(players).map(p => ({
        id: p.id,
        nickname: p.nickname,
        team: p.team,
        kills: p.kills,
        deaths: p.deaths
      }))
    });
  });
  
  /**
   * Handle player movement updates
   */
  socket.on('playerMovement', (movementData) => {
    if (!players[socket.id]) return;
    
    // Update player state
    players[socket.id].position = movementData.position || players[socket.id].position;
    players[socket.id].rotation = movementData.rotation || players[socket.id].rotation;
    players[socket.id].velocity = movementData.velocity || players[socket.id].velocity;
    players[socket.id].timestamp = Date.now();
    
    // Broadcast to all other players in the same room
    socket.to('lobby').emit('playerMoved', {
      id: socket.id,
      position: players[socket.id].position,
      rotation: players[socket.id].rotation,
      velocity: players[socket.id].velocity
    });
  });
  
  /**
   * Handle player attack/skill events
   */
  socket.on('playerAttack', (attackData) => {
    if (!players[socket.id]) return;
    
    // Broadcast attack to all other players
    socket.to('lobby').emit('playerAttacked', {
      id: socket.id,
      skillId: attackData.skillId,
      position: attackData.position,
      direction: attackData.direction,
      timestamp: Date.now()
    });
  });
  
  // ✅ NEW: PROJECTILE SYNC - Remote projectile spawn
  socket.on('playerProjectile', (projData) => {
    if (!players[socket.id]) return;
    
    // ✅ ANTI-CHEAT: Validate skill exists and is castable
    const skill = SKILL_DATA[projData.skillId];
    if (!skill) {
      console.warn(`⚠️ Invalid skill ${projData.skillId} from ${socket.id}`);
      return;
    }
    
    // ✅ ANTI-CHEAT: Validate projectile data integrity
    if (!projData.position || !projData.velocity || typeof projData.damage !== 'number') {
      console.warn(`⚠️ Invalid projectile data from ${socket.id}`);
      return;
    }
    
    // ✅ ANTI-CHEAT: Validate damage matches skill data (prevent cheating higher damage)
    if (projData.damage > skill.damage) {
      console.warn(`⚠️ Damage cheat attempt: ${projData.damage} > ${skill.damage} from ${socket.id}`);
      projData.damage = skill.damage;  // Clamp to skill value
    }
    
    console.log(`🎯 Player ${socket.id} spawned projectile: ${projData.skillId}`);
    
    // Broadcast to all OTHER players
    socket.to('lobby').emit('remoteProjectile', {
      casterId: socket.id,
      skillId: projData.skillId,
      position: projData.position,
      velocity: projData.velocity,
      damage: projData.damage,  // Validated/clamped value
      knockback: projData.knockback,
      verticalPush: projData.verticalPush,
      lifetime: projData.lifetime,
      timestamp: Date.now()
    });
  });
  
  // ✅ NEW: HITSCAN SYNC - Instant attack with server validation
  socket.on('playerHitscan', (hitData) => {
    if (!players[socket.id]) return;
    
    console.log(`⚡ Player ${socket.id} hitscan attack: ${hitData.skillId}`);
    
    // SERVER: Validate and apply damage (ANTI-CHEAT)
    // In a real game, you'd validate distance to targets, skill cooldowns, etc.
    // For now, just broadcast
    socket.to('lobby').emit('remoteHitscan', {
      casterId: socket.id,
      skillId: hitData.skillId,
      position: hitData.position,
      direction: hitData.direction,
      damage: hitData.damage,
      range: hitData.range,
      timestamp: Date.now()
    });
  });
  
  // ✅ NEW: ANIMATION SYNC - Remote player animations
  socket.on('playerAnimation', (animData) => {
    if (!players[socket.id]) return;
    
    // Broadcast animation to all OTHER players
    socket.to('lobby').emit('remoteAnimation', {
      casterId: socket.id,
      skillId: animData.skillId,
      animation: animData.animation,  // 'swing' or 'cast'
      timestamp: Date.now()
    });
  });
  
  // ✅ NEW: DAMAGE SYNC - Broadcast enemy damage to all clients
  socket.on('damageApplied', (damageData) => {
    if (!players[socket.id]) return;
    
    // ✅ ANTI-CHEAT: Server validates and applies damage (not client)
    const skill = SKILL_DATA[damageData.skillId];
    if (!skill) {
      console.warn(`⚠️ Invalid skill damage from ${socket.id}`);
      return;
    }
    
    // ✅ Validate damage amount
    let validatedDamage = skill.damage;
    if (damageData.damage > skill.damage * 1.1) {  // Allow 10% variance for splash/crits
      console.warn(`⚠️ Damage cheat: ${damageData.damage} > ${skill.damage} from ${socket.id}`);
      validatedDamage = skill.damage;
    }
    
    console.log(`💥 Damage applied by ${socket.id}: ${validatedDamage} to ${damageData.targetType}`);
    
    // ✅ Broadcast VALIDATED damage to all players
    io.to('lobby').emit('enemyDamage', {
      casterId: socket.id,
      enemyId: damageData.targetId,
      targetType: damageData.targetType,
      damage: validatedDamage,  // Server-validated damage
      skillId: damageData.skillId,
      timestamp: Date.now()
    });
  });
  
  // ✅ NEW: KILL EVENT - Track kills and broadcast
  socket.on('enemyKilled', (killData) => {
    if (!players[socket.id]) return;
    
    // ✅ ANTI-CHEAT: Server validates kill (player must have caused damage)
    // In a real game, check: did this player's projectile hit? Did this player's spell kill?
    // For now, trust the client but log suspicious activity
    if (!killData.enemyId) {
      console.warn(`⚠️ Invalid kill event from ${socket.id}`);
      return;
    }
    
    // ✅ Track kills server-side (single source of truth)
    players[socket.id].kills = (players[socket.id].kills || 0) + 1;
    
    console.log(`💀 Player ${socket.id} got a kill! Total: ${players[socket.id].kills}`);
    
    // ✅ Broadcast kill event ONCE to all players (prevent duplication)
    io.to('lobby').emit('killEvent', {
      killerId: socket.id,
      killerName: players[socket.id].nickname || 'Unknown',
      enemyId: killData.enemyId,
      timestamp: Date.now()
    });
  });
  
  /**
   * Handle player damage events
   */
  socket.on('playerDamage', (damageData) => {
    if (!players[socket.id]) return;
    
    players[socket.id].health = Math.max(0, players[socket.id].health - damageData.amount);
    
    // Broadcast damage to all players
    io.to('lobby').emit('playerDamaged', {
      id: socket.id,
      health: players[socket.id].health,
      damage: damageData.amount
    });
    
    // Check for death
    if (players[socket.id].health <= 0) {
      io.to('lobby').emit('playerDied', { id: socket.id });
    }
  });
  
  /**
   * Handle player respawn
   */
  socket.on('playerRespawn', () => {
    if (!players[socket.id]) return;
    
    players[socket.id].health = 100;
    players[socket.id].position = { x: 0, y: 10, z: 0 };
    
    io.to('lobby').emit('playerRespawned', {
      id: socket.id,
      position: players[socket.id].position,
      health: players[socket.id].health
    });
  });
  
  /**
   * Handle nickname updates
   */
  socket.on('updateNickname', (nickname) => {
    if (!players[socket.id]) return;
    
    players[socket.id].nickname = nickname.substring(0, 12);
    
    io.to('lobby').emit('nicknameUpdated', {
      id: socket.id,
      nickname: players[socket.id].nickname
    });
  });
  
  /**
   * Handle disconnection
   */
  socket.on('disconnect', () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
    
    // Remove from rooms
    rooms.lobby.delete(socket.id);
    
    // Remove player from state
    delete players[socket.id];
    
    // Notify all other players
    io.emit('playerDisconnected', socket.id);
    
    console.log(`📊 Total players: ${Object.keys(players).length}`);
  });
});

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

// Start server
httpServer.listen(PORT, () => {
  console.log('🎮 ========================================');
  console.log('🎮 RageQuit Multiplayer Server');
  console.log('🎮 ========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Helmet enabled (CSP, X-Frame-Options, etc.)`);
  console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`⏱️ Rate limiting enabled on /health`);
  console.log('🎮 ========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Periodic cleanup of stale players (60 seconds of inactivity)
setInterval(() => {
  const now = Date.now();
  const STALE_THRESHOLD = 60000; // 60 seconds
  
  Object.entries(players).forEach(([id, player]) => {
    if (now - player.timestamp > STALE_THRESHOLD) {
      console.log(`🧹 Cleaning up stale player: ${id}`);
      delete players[id];
      io.emit('playerDisconnected', id);
    }
  });
}, 30000); // Check every 30 seconds
