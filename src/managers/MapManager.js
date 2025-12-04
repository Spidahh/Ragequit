/**
 * MapManager.js
 * Handles arena generation and collision geometry.
 */
import * as THREE from 'three';
import { HealingTotem } from '../entities/HealingTotem.js';

export class MapManager {
  constructor(scene) {
    this.scene = scene;
    this.floors = [];
    this.walls = [];
    this.lights = [];
    this.helpers = [];
    this.totem = null;

    // Spawn Points (Corners)
    this.spawnPoints = {
      red: new THREE.Vector3(-40, 2, -40),
      blue: new THREE.Vector3(40, 2, 40),
      green: new THREE.Vector3(-40, 2, 40),
      yellow: new THREE.Vector3(40, 2, -40),
      default: new THREE.Vector3(0, 2, 0)
    };
  }

  clearLevel() {
    // Remove Floors
    this.floors.forEach(mesh => this.scene.remove(mesh));
    this.floors = [];

    // Remove Walls
    this.walls.forEach(mesh => this.scene.remove(mesh));
    this.walls = [];

    // Remove Lights
    this.lights.forEach(light => this.scene.remove(light));
    this.lights = [];

    // Remove Helpers
    this.helpers.forEach(helper => this.scene.remove(helper));
    this.helpers = [];

    // Reset Colliders
    this.colliders = [];
  }

  loadLevel(mode) {
    console.log(`🗺️ Loading Level: ${mode}`);
    this.clearLevel();

    // Base Arena (Floor + Lights)
    this.createBaseArena();

    // ✅ MODE ROUTING with proper logic
    if (mode === 'MONSTERS SLAYER') {
      // PvE: Survival arena with pillars for tactical cover
      console.log('🧟 SURVIVAL MODE - Defeat waves of enemies!');
      this.createObstacles();
    } else if (mode === 'TEST') {
      // Training: Parkour platforms for skill practice
      console.log('🏆 TRAINING MODE - Master your movement and skills!');
      this.createParkour();
    } else if (mode === 'TEAM CARNAGE') {
      // PvP: Symmetrical arena with central objective
      console.log('⚔️ TEAM CARNAGE - Competitive team battle!');
      this.createPvPArena();
    }
  }

  createPvPArena() {
    // Central Cover
    this.createObstacles();

    // ✅ HEALING TOTEM - Central objective!
    this.createHealingTotem();

    // Team Bases
    this.createTeamBase('red', this.spawnPoints.red, 0xff3333);
    this.createTeamBase('blue', this.spawnPoints.blue, 0x3333ff);
    this.createTeamBase('green', this.spawnPoints.green, 0x33ff33);
    this.createTeamBase('yellow', this.spawnPoints.yellow, 0xffff33);
  }

  createHealingTotem() {
    // ✅ P4.1: Healing Totem - Central arena objective
    const totemPos = new THREE.Vector3(0, 0, 0);  // Center of map
    this.totem = new HealingTotem(totemPos);
    this.scene.add(this.totem.getGroup());
    console.log('✅ Healing Totem spawned at center!');
  }

  createTeamBase(team, pos, color) {
    // Platform (Safe Zone Visual)
    const geo = new THREE.BoxGeometry(15, 0.5, 15);
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.5 });
    const platform = new THREE.Mesh(geo, mat);
    platform.position.set(pos.x, 0.25, pos.z);
    platform.receiveShadow = true;
    this.scene.add(platform);
    this.floors.push(platform);

    // Spawn Marker (Beacon)
    const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 100, 8);
    const pillarMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.3 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pos.x, 50, pos.z);
    this.scene.add(pillar);
    this.floors.push(pillar); // Track for cleanup

    // Base Cover Walls (L-Shape facing inward)
    // Calculate direction to center (0,0,0)
    const toCenter = new THREE.Vector3(0, 0, 0).sub(pos).normalize();

    // Wall 1
    const wall1Geo = new THREE.BoxGeometry(8, 4, 1);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const wall1 = new THREE.Mesh(wall1Geo, wallMat);
    wall1.castShadow = true;
    wall1.receiveShadow = true;

    // Position wall slightly offset
    const offset1 = new THREE.Vector3(toCenter.z, 0, -toCenter.x).multiplyScalar(6); // Perpendicular
    wall1.position.copy(pos).add(offset1).add(new THREE.Vector3(0, 2, 0));
    wall1.lookAt(pos);

    this.scene.add(wall1);
    this.floors.push(wall1);
    const col1 = new THREE.Box3().setFromObject(wall1);
    this.colliders.push(col1);

    // Wall 2
    const wall2 = wall1.clone();
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    const offset2 = new THREE.Vector3(-toCenter.z, 0, toCenter.x).multiplyScalar(6);
    wall2.position.copy(pos).add(offset2).add(new THREE.Vector3(0, 2, 0));
    wall2.lookAt(pos);

    this.scene.add(wall2);
    this.floors.push(wall2);
    const col2 = new THREE.Box3().setFromObject(wall2);
    this.colliders.push(col2);
  }

  createBaseArena() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floors.push(floor);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(100, 100, 0xff0033, 0x333333);
    this.scene.add(gridHelper);
    this.helpers.push(gridHelper);

    // Walls (Invisible Colliders)
    this.createWalls();

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Directional Light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
    this.lights.push(dirLight);
  }

  // ✅ MODE 1: SURVIVAL ARENA - Monster Slayer
  // Grid-based arena with central spawn and ring-out edges
  createObstacles() {
    // Create symmetrical combat arena with pillar cover
    // 4 pillars at cardinal positions for tactical cover
    const pillarConfigs = [
      { pos: [20, 0.5, 0], size: [3, 5, 3], color: 0x8B4513 },     // East
      { pos: [-20, 0.5, 0], size: [3, 5, 3], color: 0x8B4513 },    // West
      { pos: [0, 0.5, 20], size: [3, 5, 3], color: 0x8B4513 },     // North
      { pos: [0, 0.5, -20], size: [3, 5, 3], color: 0x8B4513 }     // South
    ];

    pillarConfigs.forEach(cfg => {
      const geo = new THREE.BoxGeometry(...cfg.size);
      const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.7, metalness: 0.1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.floors.push(mesh);

      const collider = new THREE.Box3().setFromObject(mesh);
      this.colliders.push(collider);
    });

    // Diagonal walls for movement dynamics
    const diagonalWalls = [
      { pos: [15, 0.5, 15], size: [6, 3, 2], color: 0x696969 },
      { pos: [-15, 0.5, -15], size: [6, 3, 2], color: 0x696969 },
      { pos: [15, 0.5, -15], size: [6, 3, 2], color: 0x696969 },
      { pos: [-15, 0.5, 15], size: [6, 3, 2], color: 0x696969 }
    ];

    diagonalWalls.forEach(cfg => {
      const geo = new THREE.BoxGeometry(...cfg.size);
      const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.floors.push(mesh);

      const collider = new THREE.Box3().setFromObject(mesh);
      this.colliders.push(collider);
    });
  }

  // ✅ MODE 2: COMBAT TRAINING - Parkour & Skill Testing
  // Multiple platforms for learning movement and positioning
  createParkour() {
    // Central platform (Safe zone)
    const centralPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x1E90FF, roughness: 0.6 })
    );
    centralPlatform.position.set(0, 0.25, 0);
    centralPlatform.castShadow = true;
    centralPlatform.receiveShadow = true;
    this.scene.add(centralPlatform);
    this.floors.push(centralPlatform);
    this.colliders.push(new THREE.Box3().setFromObject(centralPlatform));

    // Ascending platforms (Left side - skill progression)
    const leftPlatforms = [
      { pos: [-15, 3, 0], size: [6, 0.5, 6], color: 0x32CD32 },
      { pos: [-25, 6, 0], size: [5, 0.5, 5], color: 0x32CD32 },
      { pos: [-32, 10, 0], size: [4, 0.5, 4], color: 0x32CD32 }
    ];

    leftPlatforms.forEach(cfg => {
      const geo = new THREE.BoxGeometry(...cfg.size);
      const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.6, emissive: 0x0a4d0a });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.floors.push(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });

    // Descending platforms (Right side - challenge progression)
    const rightPlatforms = [
      { pos: [15, 3, 0], size: [6, 0.5, 6], color: 0xFF6347 },
      { pos: [25, 6, 0], size: [5, 0.5, 5], color: 0xFF6347 },
      { pos: [32, 10, 0], size: [4, 0.5, 4], color: 0xFF6347 }
    ];

    rightPlatforms.forEach(cfg => {
      const geo = new THREE.BoxGeometry(...cfg.size);
      const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.6, emissive: 0x4d0a0a });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.floors.push(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });

    // Moving challenge platforms (Center-front)
    const challengePlatforms = [
      { pos: [0, 4, 20], size: [4, 0.5, 4], color: 0xFFD700 },
      { pos: [8, 7, 15], size: [3, 0.5, 3], color: 0xFFD700 },
      { pos: [-8, 10, 15], size: [3, 0.5, 3], color: 0xFFD700 }
    ];

    challengePlatforms.forEach(cfg => {
      const geo = new THREE.BoxGeometry(...cfg.size);
      const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.5, metalness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.floors.push(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });
  }

  createWalls() {
    this.colliders = this.colliders || []; // Ensure init
    const wallConfigs = [
      { pos: [0, 10, -52.5], size: [105, 20, 5] }, // North
      { pos: [0, 10, 52.5], size: [105, 20, 5] },  // South
      { pos: [-52.5, 10, 0], size: [5, 20, 105] }, // West
      { pos: [52.5, 10, 0], size: [5, 20, 105] }   // East
    ];

    wallConfigs.forEach(cfg => {
      const geo = new THREE.BoxGeometry(...cfg.size);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, visible: false });
      const wall = new THREE.Mesh(geo, mat);
      wall.position.set(...cfg.pos);
      this.scene.add(wall);
      this.walls.push(wall);

      const collider = new THREE.Box3().setFromObject(wall);
      this.colliders.push(collider);
    });
  }

  checkCollision(box) {
    if (!this.colliders) return false;
    for (const collider of this.colliders) {
      if (collider.intersectsBox(box)) {
        return true;
      }
    }
    return false;
  }

  getSpawnPoint(team) {
    return this.spawnPoints[team] || this.spawnPoints.default;
  }

  getFloors() {
    return this.floors;
  }

  getTotem() {
    return this.totem;
  }
}
