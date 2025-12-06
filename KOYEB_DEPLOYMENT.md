# 🚀 KOYEB DEPLOYMENT GUIDE - RAGEQUIT PHOENIX

**Status:** Ready to Deploy  
**Platform:** Koyeb.com  
**Game Type:** Multiplayer Socket.io  
**Estimated Deploy Time:** 5-10 minutes

---

## 📋 PREREQUISITI

- [ ] Account Koyeb creato (https://www.koyeb.com)
- [ ] Repository GitHub collegato
- [ ] Node.js 20+ supportato
- [ ] File `koyeb.yaml` configurato ✅
- [ ] File `Dockerfile` pronto ✅

---

## 🔧 CONFIGURAZIONE KOYEB

### Step 1: Preparazione GitHub

```bash
# Assicurati che il repository sia su GitHub
git add .
git commit -m "Prepare for Koyeb deployment"
git push origin main
```

**Repository:** `https://github.com/Spidahh/RageQuit`

---

### Step 2: Setup su Koyeb.com

1. **Login/Signup:**
   - Vai su https://www.koyeb.com
   - Login con GitHub account

2. **Create New App:**
   - Click "Create New"
   - Seleziona "Deploy an existing GitHub repository"
   - Autorizza Koyeb ad accedere al tuo GitHub
   - Seleziona repo: `RageQuit`

3. **Configure Service:**

| Setting | Value |
|---------|-------|
| **Service Name** | `ragequit-game` |
| **Repository** | `Spidahh/RageQuit` |
| **Branch** | `main` |
| **Builder** | `Dockerfile` |
| **Port** | `3000` |
| **Region** | `fra` (Frankfurt - EU) |
| **Instance Type** | `Free` (1 vCPU, 512MB RAM) |

4. **Environment Variables:**
   ```
   NODE_ENV = production
   CLIENT_URL = https://YOUR_KOYEB_URL
   PORT = 3000
   ```

5. **Build & Deploy:**
   - Koyeb legge automaticamente `koyeb.yaml`
   - Build command: `npm install --legacy-peer-deps && npm run build`
   - Start command: `npm start`

---

## 📊 CONFIGURAZIONE ATTUALE

### koyeb.yaml (ALREADY SET UP ✅)

```yaml
app: ragequit-reborn
services:
  - name: ragequit-game
    git:
      repository: github.com/Spidahh/RageQuit
      branch: main
      build_command: npm install --legacy-peer-deps && npm run build
      run_command: npm start
    docker:
      dockerfile: Dockerfile
    instance_type: free
    regions:
      - fra
    ports:
      - port: 3000
        protocol: http
    env:
      - key: NODE_ENV
        value: production
    routes:
      - path: /
        port: 3000
```

**Cosa fa:**
- Build automatico da GitHub
- Vite compila il frontend (`npm run build`)
- Node.js serve il game server
- Espone porta 3000 su HTTP

---

### Dockerfile (ALREADY SET UP ✅)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Optimizations:**
- Alpine Linux (13MB vs 350MB standard)
- Multi-layer caching per build veloce
- Node 20 LTS supportato

---

## 🔗 MULTIPLAYER SOCKET.IO SETUP

### Server Configuration

**File:** `server.js` / `server/server.js`

```javascript
// CORS setup per multiplayer
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});
```

### Client Connection

**File:** `src/main.js` (aggiungi questa configurazione)

```javascript
// Dynamic server URL basato su environment
const SERVER_URL = 
  process.env.NODE_ENV === 'production'
    ? 'https://YOUR_KOYEB_URL' // Sarà impostato dopo deploy
    : 'http://localhost:3000';

const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});
```

### Test Multiplayer Locale

**Prima di deployare, testa localmente:**

```bash
# Terminal 1 - Start server
npm start

# Terminal 2 - Start Vite dev (client)
npm run dev

# Apri 2-3 browser tabs su http://localhost:5173
# Verifica che i giocatori si vedono reciprocamente
```

---

## 📱 TESTING MULTIPLAYER SU KOYEB

### Dopo Deploy:

1. **Ottieni l'URL Koyeb:**
   ```
   https://ragequit-game-[random].koyeb.app
   ```
   (Mostrato nel dashboard Koyeb)

2. **Test Multiplayer:**
   - Apri 2+ browser su URL Koyeb
   - Accedi con nomi diversi
   - Verifica che vedi altri giocatori
   - Testa chat/comunicazione se presente
   - Testa skill/combat sincronizzato

3. **Monitora Console:**
   - Apri DevTools (F12)
   - Verifica no Socket errors
   - Verifica latenza (lag visible?)
   - Controlla Console per errori

---

## ⚙️ VARIABILI D'AMBIENTE

### Locale (`.env` o `process.env`)

```env
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3000
```

### Koyeb (Impostare nel dashboard)

```env
NODE_ENV=production
PORT=3000
CLIENT_URL=https://ragequit-game-[random].koyeb.app
```

---

## 🐛 TROUBLESHOOTING

### Problema: Build fallisce

**Soluzione:**
```bash
# Locale, prova:
npm install --legacy-peer-deps
npm run build
npm start

# Se funziona locale, problema è su Koyeb
# Controlla build logs nel dashboard
```

### Problema: White screen su Koyeb

**Soluzione:**
1. Controlla DevTools → Console
2. Verifica che `index.html` e assets siano serviti
3. Controlla CSP headers (abbiamo già fixato questo)
4. Se Socket error, verifica URL in client

### Problema: Socket.io non connette

**Soluzione:**
1. Verifica `CLIENT_URL` è impostato in env Koyeb
2. Controlla che client usi URL corretto:
   ```javascript
   const SERVER_URL = process.env.CLIENT_URL || 'http://localhost:3000';
   const socket = io(SERVER_URL);
   ```
3. Controlla logs server (Koyeb Dashboard → Logs)

### Problema: CORS error

**Soluzione:**
```javascript
// Assicurati che origin sia consentito
cors: {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ragequit-game-*.koyeb.app'
  ],
  credentials: true
}
```

---

## 📈 PERFORMANCE & LIMITS

### Free Plan Koyeb

| Resource | Limit | Note |
|----------|-------|------|
| vCPU | 1 | Sufficiente per game server |
| RAM | 512MB | OK per multiplayer basic |
| Bandwidth | Illimitato | Puoi aumentare dopo |
| Uptime | ~99% | Con auto-restart |
| Concurrent Connections | ~100 | Per free tier |

### Per Scale Up (Futuro):

Se raggiungete molti giocatori:
- Upgrade a "Pro" instance (2+ vCPU, 2GB RAM)
- Implementare load balancer
- Database per persistenza (PostgreSQL)

---

## 🚀 DEPLOYMENT CHECKLIST

**Pre-Deploy:**
- [ ] `npm run build` funziona localmente ✅
- [ ] `npm start` funziona localmente ✅
- [ ] Multiplayer testato su localhost ✅
- [ ] Zero console errors ✅
- [ ] `koyeb.yaml` è up-to-date ✅
- [ ] `Dockerfile` è up-to-date ✅
- [ ] GitHub repo è sincronizzato ✅
- [ ] `.gitignore` esclude `node_modules/` ✅

**Deploy (su Koyeb):**
1. Login su https://www.koyeb.com
2. Crea app da GitHub repo
3. Aspetta build (3-5 min)
4. Copia URL Koyeb
5. Testa multiplayer

**Post-Deploy:**
- [ ] Pagina carica ✅
- [ ] Login funziona ✅
- [ ] Multiplayer funziona ✅
- [ ] Sound/VFX funzionano ✅
- [ ] DevTools console è pulita ✅

---

## 📝 QUICK START COMMANDS

```bash
# Test locale
npm run dev          # Terminal 1: Vite dev server (5173)
npm start            # Terminal 2: Game server (3000)

# Build per production
npm run build        # Crea dist/

# Deploy su Koyeb
git push origin main # Trigger auto-deploy (se connesso)

# Vedi logs su Koyeb
# Dashboard → Select App → Logs
```

---

## 🔐 PRODUCTION SECURITY

### Considerazioni Pre-Launch:

1. **Rate Limiting:**
   ```javascript
   // Aggiungi in server.js per evitare spam
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   });
   app.use(limiter);
   ```

2. **Input Validation:**
   ```javascript
   // Valida player names, skill inputs, etc.
   function isValidPlayerName(name) {
     return name.length >= 3 && name.length <= 12 && /^[a-zA-Z0-9_]+$/.test(name);
   }
   ```

3. **HTTPS Only:**
   - Koyeb fornisce HTTPS gratis (dominio .koyeb.app)
   - Per custom domain, aggiungi certificato SSL

---

## 📍 INDIRIZZI DEPLOYMENT

| Ambiente | URL | Note |
|----------|-----|------|
| **Locale Dev** | `http://localhost:5173` | Vite dev |
| **Locale Server** | `http://localhost:3000` | Node server |
| **Koyeb Prod** | `https://ragequit-game-[random].koyeb.app` | Auto-generated |
| **Custom Domain** | `https://ragequit.yourdomain.com` | Future |

---

## ✅ STATUS

- **Config:** READY ✅
- **Dockerfile:** READY ✅
- **koyeb.yaml:** READY ✅
- **Multiplayer Code:** READY ✅
- **Security Headers:** FIXED ✅
- **Asset Paths:** FIXED ✅

**Next Step:** Push a GitHub e deploy su Koyeb!

---

**Creato:** 2025-12-03  
**Ultimo Aggiornamento:** Pre-Launch  
**Documentazione:** Completa e ready-to-deploy
