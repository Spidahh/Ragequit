# 🎮 RageQuit Multiplayer Server - Comandi Rapidi

## ⚡ Avvio Veloce (Windows)

```powershell
cd server
.\start-server.bat
```

Oppure manualmente:

```powershell
cd server
npm install
npm start
```

## 🌐 Test nel Browser

Dopo aver avviato il server, apri:

```
http://localhost:3000
```

Vedrai:
- ✅ Status di connessione
- 👥 Lista player attivi
- 🎯 Visualizzazione 2D dei player
- 📊 Console log degli eventi

Apri più tab per simulare più player!

## 🚀 Deploy su Render.com

### 1. Inizializza Git (se non fatto)

```powershell
cd server
git init
git add .
git commit -m "Initial server setup"
```

### 2. Crea Repository GitHub

```powershell
# Sostituisci YOUR_USERNAME con il tuo username GitHub
git remote add origin https://github.com/YOUR_USERNAME/ragequit-server.git
git branch -M main
git push -u origin main
```

### 3. Deploy su Render

1. Vai su https://render.com
2. Login/Signup
3. Click "New +" → "Web Service"
4. Connetti il tuo repository GitHub
5. Settings:
   - **Name:** `ragequit-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (o superiore)

6. Environment Variables:
   - `CLIENT_URL` = `*` (per test) o il tuo dominio client

7. Click "Create Web Service"

8. Attendi il deploy (2-3 minuti)

9. Ottieni l'URL: `https://ragequit-server.onrender.com`

## 🔌 Connetti il Gioco al Server

### Opzione 1: Test Locale

Nel tuo gioco, usa:
```javascript
const serverUrl = 'http://localhost:3000';
```

### Opzione 2: Server Render (Production)

```javascript
const serverUrl = 'https://ragequit-server.onrender.com';
```

## 📊 Endpoint Disponibili

### Health Check
```bash
curl http://localhost:3000/health
```

Risposta:
```json
{
  "status": "ok",
  "players": 3,
  "uptime": 1234.56
}
```

### Test Page
```
http://localhost:3000/
```

Visualizza la pagina di test con simulazione player.

## 🧪 Test Socket.io Events

### In Browser Console (sulla pagina di test):

```javascript
// Invia movimento custom
window.RageQuitClient.sendMovement(10, 5, -3, 1.5, 0);

// Invia attacco
window.RageQuitClient.sendAttack('fireball', 
  {x: 0, y: 10, z: 0}, 
  {x: 1, y: 0, z: 0}
);

// Vedi tutti i player
console.log(window.RageQuitClient.players);
```

## 🔧 Troubleshooting

### Port già in uso?

```powershell
# Trova il processo sulla porta 3000
netstat -ano | findstr :3000

# Termina il processo (sostituisci PID)
taskkill /F /PID 1234
```

### Node.js non installato?

Scarica da: https://nodejs.org
Versione consigliata: LTS (18.x o superiore)

### Errori npm install?

```powershell
# Pulisci cache
npm cache clean --force

# Reinstalla
rm -rf node_modules
npm install
```

## 📁 Struttura File

```
server/
├── package.json           # Dipendenze
├── server.js             # Server principale
├── .gitignore            # File da ignorare
├── .env.example          # Esempio variabili ambiente
├── README.md             # Documentazione
├── INTEGRATION_GUIDE.md  # Guida integrazione
├── start-server.bat      # Script avvio Windows
└── public/
    ├── index.html        # Test page
    └── game.js           # Test client
```

## 🎯 Prossimi Passi

1. ✅ Avvia il server locale
2. ✅ Testa con la pagina di test
3. ✅ Integra NetworkManager nel gioco
4. ✅ Deploy su Render
5. ✅ Testa con più player

## 🆘 Supporto

- 📖 Leggi `README.md` per dettagli API
- 🔧 Leggi `INTEGRATION_GUIDE.md` per integrazione
- 🐛 Controlla la console browser per errori
- 📊 Usa `/health` endpoint per status server

---

**Ready to dominate the arena! 🔥**
