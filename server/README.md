# RageQuit Multiplayer Server

Real-time multiplayer server for RageQuit Arena FPS built with Node.js and Socket.io.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open browser:**
   ```
   http://localhost:3000
   ```

### Development Mode (Auto-reload)
```bash
npm run dev
```

## 📦 Deploy to Render.com

### Step 1: Push to GitHub

1. Initialize git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - RageQuit server"
   ```

2. Create GitHub repository and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/ragequit-server.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `ragequit-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (or upgrade for production)

5. Add Environment Variable:
   - Key: `CLIENT_URL`
   - Value: `https://your-client-domain.com` (or `*` for testing)

6. Click "Create Web Service"

### Step 3: Get Server URL

After deployment, Render will provide a URL like:
```
https://ragequit-server.onrender.com
```

Use this URL in your game client to connect!

## 🔌 API Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `playerMovement` | `{position, rotation, velocity}` | Update player position |
| `playerAttack` | `{skillId, position, direction}` | Player attacks |
| `playerDamage` | `{amount}` | Player takes damage |
| `playerRespawn` | - | Request respawn |
| `updateNickname` | `nickname` | Change player name |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `currentPlayers` | `{players}` | All players on connect |
| `newPlayer` | `{playerInfo}` | New player joined |
| `playerMoved` | `{id, position, rotation}` | Player moved |
| `playerAttacked` | `{id, skillId, position}` | Player attacked |
| `playerDamaged` | `{id, health, damage}` | Player damaged |
| `playerDied` | `{id}` | Player died |
| `playerRespawned` | `{id, position, health}` | Player respawned |
| `playerDisconnected` | `id` | Player left |

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CLIENT_URL` | `*` | CORS allowed origin |
| `NODE_ENV` | `development` | Environment mode |

### Server Features

✅ Real-time player synchronization  
✅ Health check endpoint (`/health`)  
✅ Auto-cleanup of stale connections  
✅ Room-based multiplayer (lobby system)  
✅ Attack/damage event broadcasting  
✅ Respawn system  
✅ Nickname management  
✅ CORS configured for cross-origin requests  

## 📊 Monitoring

Health check endpoint:
```bash
curl https://your-server.onrender.com/health
```

Response:
```json
{
  "status": "ok",
  "players": 5,
  "uptime": 12345.67
}
```

## 🛠️ Tech Stack

- **Node.js** - Runtime
- **Express** - HTTP server
- **Socket.io** - WebSocket communication
- **ES6 Modules** - Modern JavaScript

## 📝 License

MIT License - See LICENSE file

## 🎮 Connect from Game Client

In your RageQuit game client, connect to the server:

```javascript
const socket = io('https://your-server.onrender.com');

socket.on('connect', () => {
  console.log('Connected to server!');
});
```

---

**Made for RageQuit Arena FPS** 🔥
