/**
 * NetworkManager.js
 * Handles WebSocket communication and state synchronization.
 * Compatible with existing server.js events.
 */
import { io } from 'socket.io-client';
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { SKILL_DATA } from '../data/SkillData.js';


export class NetworkManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.otherPlayers = {};
    this.scene = null;

    this.initListeners();
  }

  initListeners() {
    eventBus.on('game:initialized', () => {
      if (window.game) {
        this.scene = window.game.scene;
        this.connect('Unknown');
      }
    });

    eventBus.on('player:move', (data) => {
      if (this.isConnected) {
        this.socket.emit('playerMovement', {
          position: data.position,
          rotation: data.rotation
        });
      }
    });

    // Broadcast Attack with full details for multiplayer sync
    eventBus.on('player:attack', (data) => {
      if (!this.isConnected || !window.game?.player) return;
      
      const p = window.game.player;
      const skill = SKILL_DATA[data.skillId];
      if (!skill) return;
      
      const direction = p.camera.getWorldDirection(new THREE.Vector3());
      
      // HITSCAN attacks (instant damage)
      if (skill.vfx.type === 'instant' || skill.vfx.type === 'hitscan') {
        this.socket.emit('playerHitscan', {
          skillId: data.skillId,
          position: p.position,
          direction: direction,
          damage: skill.damage,
          range: skill.range
        });
      }
      // PROJECTILE attacks (visible projectiles)
      else {
        const startPos = p.position.clone().add(
          p.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2)
        );
        const projVelocity = p.camera.getWorldDirection(new THREE.Vector3())
          .multiplyScalar(skill.speed || 50);
        
        this.socket.emit('playerProjectile', {
          skillId: data.skillId,
          position: startPos,
          velocity: projVelocity,
          damage: skill.damage,
          knockback: skill.knockbackForce,
          verticalPush: skill.verticalPush || 0,
          lifetime: skill.projectileLifetime || 5.0,
          casterId: this.socket?.id
        });
      }
      
      // ANIMATION sync
      this.socket.emit('playerAnimation', {
        skillId: data.skillId,
        animation: skill.vfx.type === 'melee' ? 'swing' : 'cast'
      });
    });

    eventBus.on('game:start', (data) => {
      if (this.isConnected && data.team) {
        // Capitalize team name (red -> Red)
        const team = data.team.charAt(0).toUpperCase() + data.team.slice(1);
        console.log(`Joining team: ${team}`);
        this.socket.emit('joinTeam', team);
      }
    });
  }

  connect(playerName) {
    // Determine server URL: env var > window.location.origin > fallback to localhost
    const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
    
    console.log(`📡 Connecting to server at ${serverUrl}...`);
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server!');
      this.isConnected = true;
      this.socket.emit('playerIdentity', playerName);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server.');
      this.isConnected = false;
    });

    // === SERVER EVENTS ===

    this.socket.on('currentPlayers', (players) => {
      Object.values(players).forEach(p => this.spawnOtherPlayer(p));
    });

    this.socket.on('newPlayer', (p) => {
      this.spawnOtherPlayer(p);
    });

    this.socket.on('playerMoved', (p) => {
      this.updateOtherPlayer(p);
    });

    this.socket.on('playerDisconnected', (id) => {
      this.removeOtherPlayer(id);
    });

    // Remote PROJECTILE spawn
    this.socket.on('remoteProjectile', (proj) => {
      if (proj.casterId === this.socket.id) return;  // Ignore own
      eventBus.emit('network:projectile_spawn', proj);
    });
    
    // Remote HITSCAN attack
    this.socket.on('remoteHitscan', (data) => {
      if (data.casterId === this.socket.id) return;
      eventBus.emit('network:hitscan_attack', data);
    });
    
    // Remote ANIMATION
    this.socket.on('remoteAnimation', (data) => {
      if (data.casterId === this.socket.id) return;
      const remoteMesh = this.otherPlayers[data.casterId];
      if (!remoteMesh?.model) return;
      
      if (data.animation === 'swing' && remoteMesh.model.swingArm) {
        remoteMesh.model.swingArm();
      } else if (data.animation === 'cast' && remoteMesh.model.raiseArm) {
        remoteMesh.model.raiseArm();
      }
    });
    
    // DAMAGE sync from server
    this.socket.on('enemyDamage', (data) => {
      // Update enemy HP in local EnemyManager
      if (window.game?.enemyManager) {
        const enemy = window.game.enemyManager.enemies.find(e => e.id === data.enemyId);
        if (enemy) {
          enemy.hp = data.newHp;
          // Optional: show damage number
          if (window.game.vfxManager) {
            window.game.vfxManager.spawnDamageNumber(enemy.mesh.position, data.damage, data.isCritical);
            // ✅ GDD HIT MARKER: Show hit confirmation visual (<100ms feedback)
            window.game.vfxManager.showHitMarker(data.isCritical);
          }
        }
      }
      
      // ✅ GDD HITSTOP SYNC: Trigger local hitstop when hit lands on network
      if (data.hitstopDuration && window.game) {
        window.game.hitstopDuration = data.hitstopDuration;  // Apply hitstop freeze
      }
    });
    
    // KILL event
    this.socket.on('killEvent', (data) => {
      eventBus.emit('ui:killfeed', {
        killer: data.killerName,
        killed: 'Enemy',
        icon: '💀'
      });
    });

    // Scoreboard & Game Events
    this.socket.on('updateScoreboard', (data) => {
      eventBus.emit('ui:scoreboard', data);
    });

    this.socket.on('playerKilledEvent', (data) => {
      console.log('💀 Kill Event:', data);
      eventBus.emit('ui:killfeed', data);
      
      // ✅ GDD COMBO SYNC: Reset combo on kill (optional - for kill-based gameplay)
      if (data.killerId === this.socket.id && window.game?.comboSystem) {
        // Player got a kill - could trigger combo bonus
        if (window.game.comboSystem.incrementCombo) {
          window.game.comboSystem.incrementCombo();
        }
      }
    });

    this.socket.on('playerRespawned', (data) => {
      if (data.id === this.socket.id) {
        console.log('🔄 You Respawned');
        if (window.game && window.game.player) {
          window.game.player.position.copy(data.position);
          window.game.player.hp = 100;
        }
      } else {
        this.updateOtherPlayer(data);
      }
    });
  }

  spawnOtherPlayer(data) {
    if (data.id === this.socket.id) return;
    if (this.otherPlayers[data.id]) return;

    console.log(`Spawning player: ${data.id} (Team: ${data.team})`);
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const teamColor = this.getTeamColor(data.team || 'neutral');
    const material = new THREE.MeshStandardMaterial({ color: teamColor });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(data.position || { x: 0, y: 2, z: 0 });
    mesh.userData = {
      playerId: data.id,
      team: data.team,
      hp: data.hp || 100
    };

    if (this.scene) {
      this.scene.add(mesh);
      this.otherPlayers[data.id] = mesh;
    }
  }

  getTeamColor(team) {
    const teamColors = {
      'red': 0xff3333,
      'blue': 0x3333ff,
      'green': 0x33ff33,
      'yellow': 0xffff33,
      'neutral': 0xaaaaaa
    };
    return teamColors[team] || 0xff0000;
  }

  updateOtherPlayer(data) {
    const mesh = this.otherPlayers[data.id];
    if (mesh) {
      mesh.position.copy(data.position);
      // Update rotation if sent
      if (data.rotation) {
        mesh.rotation.set(data.rotation._x, data.rotation._y, data.rotation._z);
        mesh.quaternion.set(data.rotation._x, data.rotation._y, data.rotation._z, data.rotation._w);
      }
    }
  }

  removeOtherPlayer(id) {
    const mesh = this.otherPlayers[id];
    if (mesh) {
      if (this.scene) this.scene.remove(mesh);
      delete this.otherPlayers[id];
    }
  }
}
