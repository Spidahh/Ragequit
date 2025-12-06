# 🚀 RageQuit Arena - Render.com Deployment Guide

## ✅ Production Server Ready!

The game now has a unified server (`server.js`) that:
- ✅ Serves the built game from `dist/` folder
- ✅ Handles Socket.io multiplayer connections
- ✅ Works locally AND on Render.com
- ✅ Single server = No CORS issues!

## 📦 What Was Implemented

### 1. **server.js** (Root Directory)
Production-ready Express + Socket.io server:
- Serves static files from `dist/`
- Manages player state (position, rotation, identity)
- Handles connections, movement, attacks, disconnects
- Catch-all route for SPA support
- Uses `process.env.PORT` for Render compatibility

### 2. **NetworkManager.js** (Updated)
- Uses `io()` - automatically connects to hosting server
- Creates **red box meshes (1x2x1)** for other players
- Sends player identity on game start
- Simplified for production deployment

### 3. **package.json** (Updated)
```json
{
  "scripts": {
    "start": "node server.js"  // ← Render uses this!
  },
  "type": "module"  // ← ES6 support
}
```

## 🧪 Local Testing

### Step 1: Build Production Files
```bash
npm run build
```
Creates optimized `dist/` folder.

### Step 2: Start Server
```bash
npm start
```
Server runs on **http://localhost:3000**

### Step 3: Test Multiplayer
1. Open http://localhost:3000 in browser
2. Enter identity (name)
3. Click DEPLOY to start
4. Open **another tab** at http://localhost:3000
5. You should see **red boxes** representing other players!

### Expected Behavior:
- ✅ Other players appear as **red boxes**
- ✅ Movement syncs in real-time
- ✅ Console shows "Player connected" messages
- ✅ Server logs show player identities

## 🌐 Deploy to Render.com

### Prerequisites
- GitHub account
- Repository pushed to GitHub
- Render.com account (free tier works!)

### Deployment Steps

#### 1. Push to GitHub
```bash
git add .
git commit -m "Production ready - Render deployment"
git push origin master
```

#### 2. Create Web Service on Render

1. Go to https://render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure service:

**Basic Settings:**
- **Name:** `ragequit-arena` (or your choice)
- **Region:** Choose closest to you
- **Branch:** `master`
- **Root Directory:** (leave empty)
- **Runtime:** `Node`

**Build & Deploy:**
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Instance:**
- **Instance Type:** Free (or upgrade for better performance)

**Environment Variables:**
- `NODE_ENV` = `production`
- `PORT` = (auto-set by Render, usually 10000)

5. Click **"Create Web Service"**

#### 3. Wait for Deployment
Render will:
- Install dependencies
- Build the game (`npm run build`)
- Start the server (`npm start`)

**Build time:** 3-5 minutes

#### 4. Test Your Deployment
Once deployed, Render gives you a URL:
```
https://ragequit-arena.onrender.com
```

Open multiple tabs to test multiplayer!

## 🔍 Troubleshooting

### Build Fails
**Check:**
- `package.json` has `"type": "module"`
- All dependencies in `dependencies` not `devDependencies`
- `"start": "node server.js"` script exists

### Server Crashes
**Check Render logs:**
- Look for "Error: Cannot find module"
- Ensure `dist/` was created during build
- Verify `npm run build` works locally

### Socket.io Not Connecting
**Check:**
- Browser console for errors
- Network tab shows Socket.io upgrade
- Server logs show "Player connected"

### Red Boxes Don't Appear
**Check:**
- Multiple tabs/devices connected
- Console shows "Created remote player"
- Server logs show multiple connections

### Game Loads But Blank Screen
**Likely:** `dist/` folder empty or missing
**Fix:** Run `npm run build` locally first, then commit and push

## 📊 Performance Notes

### Render Free Tier
- **Cold Start:** ~30 seconds (server sleeps after 15 min inactivity)
- **RAM:** 512 MB (sufficient for 10-20 players)
- **Max Players:** ~20 concurrent
- **Bandwidth:** Limited (good for small groups)

**Upgrade to Paid ($7/month) for:**
- Always-on server (no cold starts)
- More RAM (better for 50+ players)
- Better performance

## 🎮 How It Works

### Automatic Server Connection
```javascript
// NetworkManager.js
this.socket = io(); // Empty = connects to hosting server!
```

This works because:
- **Local Dev:** Game at http://localhost:3000 → connects to same server
- **Render:** Game at https://your-app.onrender.com → connects to same server

### Player Representation
- **Your Player:** First-person camera view
- **Other Players:** Red boxes (1x2x1 mesh)
- **Future:** Replace with animated character models

## 🔐 Security (For Production)

Current setup is development-friendly. For production:

### Add Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
// server.js
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);
```

### Restrict CORS
```javascript
// server.js
const io = new Server(httpServer, {
  cors: { 
    origin: ["https://your-domain.com"] // Specific domain only
  }
});
```

## 🚧 Next Steps

### Phase 21 - Enhanced Multiplayer
- [ ] Replace red boxes with animated characters
- [ ] Health bars above players
- [ ] Show player names
- [ ] Damage synchronization
- [ ] Team colors

### Phase 22 - Game Modes
- [ ] Team deathmatch
- [ ] Free-for-all
- [ ] Capture the flag
- [ ] Lobby system

## 📝 Environment Variables

Optional Render.com environment variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Production mode |
| `MAX_PLAYERS` | `50` | Player limit |
| `TICK_RATE` | `30` | Server update rate |

## 🆘 Support Resources

- **Render Docs:** https://render.com/docs
- **Socket.io Docs:** https://socket.io/docs/v4/
- **Express Docs:** https://expressjs.com/

## ✅ Testing Checklist

Before deploying:
- [ ] `npm run build` succeeds
- [ ] `npm start` runs without errors
- [ ] http://localhost:3000 loads game
- [ ] Multiple tabs show red boxes
- [ ] Movement syncs in real-time
- [ ] Server logs show connections
- [ ] No console errors

After deploying:
- [ ] Render build succeeds
- [ ] App URL loads game
- [ ] Multiple devices connect
- [ ] Socket.io connects (check Network tab)
- [ ] Red boxes appear for other players

---

**🎉 Your game is ready for worldwide multiplayer! 🌍🎮**
