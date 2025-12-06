# Integrazione Multiplayer in RageQuit

## 🎯 Come Integrare il Server nel Gioco

### Passo 1: Avvia il Server

```bash
cd server
npm install
npm start
```

Il server partirà su `http://localhost:3000`

### Passo 2: Aggiungi Socket.io al Client

Nel tuo `index.html` principale (quello del gioco), aggiungi:

```html
<script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
```

### Passo 3: Crea NetworkManager.js

Crea `src/managers/NetworkManager.js`:

```javascript
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

export default class NetworkManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.otherPlayers = new Map();
    this.serverUrl = 'http://localhost:3000'; // Cambia per production
    
    this.connect();
  }

  connect() {
    this.socket = io(this.serverUrl);
    
    this.socket.on('connect', () => {
      console.log('✅ Connected to multiplayer server:', this.socket.id);
      this.isConnected = true;
      eventBus.emit('network:connected', { id: this.socket.id });
    });
    
    this.socket.on('currentPlayers', (players) => {
      Object.entries(players).forEach(([id, player]) => {
        if (id !== this.socket.id) {
          this.addOtherPlayer(id, player);
        }
      });
    });
    
    this.socket.on('newPlayer', (player) => {
      this.addOtherPlayer(player.id, player);
    });
    
    this.socket.on('playerMoved', (data) => {
      this.updateOtherPlayer(data.id, data);
    });
    
    this.socket.on('playerDisconnected', (id) => {
      this.removeOtherPlayer(id);
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.isConnected = false;
      eventBus.emit('network:disconnected');
    });
  }

  sendMovement(position, rotation, velocity) {
    if (!this.isConnected) return;
    
    this.socket.emit('playerMovement', {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { yaw: rotation.yaw, pitch: rotation.pitch },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z }
    });
  }

  sendAttack(skillId, position, direction) {
    if (!this.isConnected) return;
    
    this.socket.emit('playerAttack', {
      skillId,
      position: { x: position.x, y: position.y, z: position.z },
      direction: { x: direction.x, y: direction.y, z: direction.z }
    });
  }

  addOtherPlayer(id, playerData) {
    // Crea un mesh per l'altro player
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ffff });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(
      playerData.position.x,
      playerData.position.y,
      playerData.position.z
    );
    
    this.otherPlayers.set(id, {
      mesh,
      data: playerData
    });
    
    eventBus.emit('network:playerJoined', { id, mesh });
  }

  updateOtherPlayer(id, data) {
    const player = this.otherPlayers.get(id);
    if (player) {
      player.mesh.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );
      player.data = data;
    }
  }

  removeOtherPlayer(id) {
    const player = this.otherPlayers.get(id);
    if (player) {
      eventBus.emit('network:playerLeft', { id, mesh: player.mesh });
      this.otherPlayers.delete(id);
    }
  }

  update() {
    // Aggiorna posizioni degli altri player (smooth interpolation)
    this.otherPlayers.forEach((player, id) => {
      // Qui puoi aggiungere interpolazione smooth se necessario
    });
  }
}
```

### Passo 4: Integra in Game.js

In `src/core/Game.js`:

```javascript
import NetworkManager from '../managers/NetworkManager.js';

// Nel constructor:
this.networkManager = null;

// In init(), dopo gli altri manager:
this.networkManager = new NetworkManager();

// Ascolta eventi di rete:
eventBus.on('network:playerJoined', ({ id, mesh }) => {
  this.scene.add(mesh);
  console.log('Player joined:', id);
});

eventBus.on('network:playerLeft', ({ id, mesh }) => {
  this.scene.remove(mesh);
  console.log('Player left:', id);
});

// Nel loop() di PLAYING state:
if (this.networkManager) {
  this.networkManager.update();
}
```

### Passo 5: Invia Movimento dal PlayerController

In `src/entities/PlayerController.js`, nel metodo `update()`:

```javascript
// Alla fine di update(), dopo aver aggiornato la posizione:
if (this.networkManager && Date.now() - this.lastNetworkUpdate > 50) {
  this.networkManager.sendMovement(
    this.position,
    this.rotation,
    this.velocity
  );
  this.lastNetworkUpdate = Date.now();
}
```

E nel constructor:

```javascript
this.lastNetworkUpdate = 0;
```

### Passo 6: Invia Attacchi

In `attemptAttack()`:

```javascript
// Dopo aver emesso l'evento locale:
if (window.game && window.game.networkManager) {
  const direction = new THREE.Vector3();
  this.camera.getWorldDirection(direction);
  
  window.game.networkManager.sendAttack(
    this.selectedSkill,
    this.camera.position,
    direction
  );
}
```

## 🚀 Deploy su Render.com

1. Crea un repository GitHub per la cartella `server/`
2. Vai su render.com
3. Crea un nuovo Web Service
4. Connetti il repository
5. Usa questi settings:
   - Build: `npm install`
   - Start: `npm start`
   - Environment: Aggiungi `CLIENT_URL` con il tuo dominio client

6. Dopo il deploy, ottieni l'URL (es. `https://ragequit-server.onrender.com`)
7. Cambia `serverUrl` in NetworkManager.js con il tuo URL di produzione

## 🧪 Test Locale

1. Avvia il server: `cd server && npm start`
2. Apri `http://localhost:3000` per vedere il test client
3. Apri più tab per simulare più player
4. Vedrai i player muoversi in cerchio (movimento di test)

## 📊 Monitoraggio

Health check:
```bash
curl http://localhost:3000/health
```

Risposta:
```json
{
  "status": "ok",
  "players": 2,
  "uptime": 123.45
}
```

## 🔧 Troubleshooting

### Errore CORS
Aggiungi il tuo dominio client a `CLIENT_URL` nell'ambiente Render.

### Connessione fallita
Verifica che il server sia in esecuzione e che la porta sia corretta.

### Player non si vedono
Controlla la console browser per errori Socket.io.

---

**Pronto per il multiplayer!** 🎮🔥
