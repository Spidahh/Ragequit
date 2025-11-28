// world.js - Sistema di mappe per FFA e SQUADRE

function setupWorld() {
    // Determina quale mappa creare in base alla modalità
    const gameMode = window.myGameMode || 'ffa';
    
    if (gameMode === 'team') {
        createTeamMap();
    } else {
        createFFAMap();
    }
}

// MAPPA FFA - Arena circolare con ostacoli sparsi
function createFFAMap() {
    console.log('[WORLD] Creating FFA Map');
    
    // Griglia
    const gridHelper = new THREE.GridHelper(2000, 100, 0x440000, 0x220000);
    scene.add(gridHelper);
    
    // Pavimento con texture gore rossa
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Crea pattern gore rosso sangue
    for (let i = 0; i < 512; i += 16) {
        for (let j = 0; j < 512; j += 16) {
            const rand = Math.random();
            if (rand < 0.3) {
                // Sangue rosso vivo
                const gradient = ctx.createRadialGradient(i + 8, j + 8, 2, i + 8, j + 8, 10);
                gradient.addColorStop(0, '#ff0000');
                gradient.addColorStop(0.5, '#cc0000');
                gradient.addColorStop(1, '#880000');
                ctx.fillStyle = gradient;
            } else if (rand < 0.6) {
                // Sangue coagulato scuro
                ctx.fillStyle = `rgb(${80 + Math.random() * 40}, ${10 + Math.random() * 20}, ${10 + Math.random() * 20})`;
            } else if (rand < 0.8) {
                // Carne putrefatta
                ctx.fillStyle = `rgb(${100 + Math.random() * 50}, ${20 + Math.random() * 30}, ${20 + Math.random() * 30})`;
            } else {
                // Roccia insanguinata
                const red = 60 + Math.random() * 40;
                ctx.fillStyle = `rgb(${red}, ${red * 0.2}, ${red * 0.2})`;
            }
            ctx.fillRect(i, j, 16, 16);
            
            // Aggiungi schizzi di sangue
            if (Math.random() < 0.4) {
                ctx.strokeStyle = 'rgba(139,0,0,0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(i + Math.random() * 16, j + Math.random() * 16);
                ctx.lineTo(i + Math.random() * 16, j + Math.random() * 16);
                ctx.stroke();
            }
            // Gocce di sangue
            if (Math.random() < 0.2) {
                ctx.fillStyle = '#990000';
                ctx.beginPath();
                ctx.arc(i + Math.random() * 16, j + Math.random() * 16, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    const floorTexture = new THREE.CanvasTexture(canvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);
    
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({ 
            map: floorTexture,
            roughness: 0.9,
            metalness: 0.1,
            emissive: 0x220000,
            emissiveIntensity: 0.1
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Muri perimetrali per delimitare la mappa
    const mapSize = 800;
    const wallHeight = 30;
    const wallThickness = 10;
    
    // Muro Nord
    const wallN = new THREE.Mesh(
        new THREE.BoxGeometry(mapSize, wallHeight, wallThickness),
        new THREE.MeshStandardMaterial({ color: 0x440000, roughness: 0.8 })
    );
    wallN.position.set(0, wallHeight/2, -mapSize/2);
    wallN.castShadow = true;
    wallN.receiveShadow = true;
    scene.add(wallN);
    obstacles.push(wallN);
    
    // Muro Sud
    const wallS = wallN.clone();
    wallS.position.set(0, wallHeight/2, mapSize/2);
    scene.add(wallS);
    obstacles.push(wallS);
    
    // Muro Est
    const wallE = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, mapSize),
        new THREE.MeshStandardMaterial({ color: 0x440000, roughness: 0.8 })
    );
    wallE.position.set(mapSize/2, wallHeight/2, 0);
    wallE.castShadow = true;
    wallE.receiveShadow = true;
    scene.add(wallE);
    obstacles.push(wallE);
    
    // Muro Ovest
    const wallW = wallE.clone();
    wallW.position.set(-mapSize/2, wallHeight/2, 0);
    scene.add(wallW);
    obstacles.push(wallW);
    
    // Muri interni sparsi per creare labirinto parziale
    for(let i = 0; i < 20; i++) {
        const wallLength = 40 + Math.random() * 80;
        const isVertical = Math.random() > 0.5;
        const wall = new THREE.Mesh(
            isVertical ? new THREE.BoxGeometry(8, 20, wallLength) : new THREE.BoxGeometry(wallLength, 20, 8),
            new THREE.MeshStandardMaterial({ color: 0x660000, roughness: 0.7 })
        );
        wall.position.set(
            (Math.random() - 0.5) * (mapSize - 100),
            10,
            (Math.random() - 0.5) * (mapSize - 100)
        );
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        obstacles.push(wall);
    }
    
    // Pilastri sparsi ovunque
    for(let i = 0; i < 30; i++) {
        const x = (Math.random() - 0.5) * (mapSize - 100);
        const z = (Math.random() - 0.5) * (mapSize - 100);
        createPillar(x, z, 15 + Math.random() * 20);
    }
    
    // Rocce sparse come copertura
    for(let i = 0; i < 40; i++) {
        const x = (Math.random() - 0.5) * (mapSize - 100);
        const z = (Math.random() - 0.5) * (mapSize - 100);
        createRock(x, z, random());
    }
    
    // Alberi decorativi (passthrough)
    for(let i = 0; i < 25; i++) { 
        const x = (Math.random() - 0.5) * (mapSize - 100);
        const z = (Math.random() - 0.5) * (mapSize - 100);
        createPineTree(x, z, random()); 
    }
    
    // Case sparse (passthrough)
    for(let i = 0; i < 10; i++) { 
        const x = (Math.random() - 0.5) * (mapSize - 150);
        const z = (Math.random() - 0.5) * (mapSize - 150);
        createFantasyHouse(x, z, random()); 
    }
}

// MAPPA SQUADRE - 4 zone colorate per ogni team
function createTeamMap() {
    console.log('[WORLD] Creating TEAM Map');
    
    // Griglia
    const gridHelper = new THREE.GridHelper(2000, 100, 0x004444, 0x002222);
    scene.add(gridHelper);
    
    // Pavimento con texture gore rossa
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Crea pattern gore rosso sangue
    for (let i = 0; i < 512; i += 16) {
        for (let j = 0; j < 512; j += 16) {
            const rand = Math.random();
            if (rand < 0.3) {
                // Sangue rosso vivo
                const gradient = ctx.createRadialGradient(i + 8, j + 8, 2, i + 8, j + 8, 10);
                gradient.addColorStop(0, '#ff0000');
                gradient.addColorStop(0.5, '#cc0000');
                gradient.addColorStop(1, '#880000');
                ctx.fillStyle = gradient;
            } else if (rand < 0.6) {
                // Sangue coagulato scuro
                ctx.fillStyle = `rgb(${80 + Math.random() * 40}, ${10 + Math.random() * 20}, ${10 + Math.random() * 20})`;
            } else if (rand < 0.8) {
                // Carne putrefatta
                ctx.fillStyle = `rgb(${100 + Math.random() * 50}, ${20 + Math.random() * 30}, ${20 + Math.random() * 30})`;
            } else {
                // Roccia insanguinata
                const red = 60 + Math.random() * 40;
                ctx.fillStyle = `rgb(${red}, ${red * 0.2}, ${red * 0.2})`;
            }
            ctx.fillRect(i, j, 16, 16);
            
            // Aggiungi schizzi di sangue
            if (Math.random() < 0.4) {
                ctx.strokeStyle = 'rgba(139,0,0,0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(i + Math.random() * 16, j + Math.random() * 16);
                ctx.lineTo(i + Math.random() * 16, j + Math.random() * 16);
                ctx.stroke();
            }
            // Gocce di sangue
            if (Math.random() < 0.2) {
                ctx.fillStyle = '#990000';
                ctx.beginPath();
                ctx.arc(i + Math.random() * 16, j + Math.random() * 16, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    const floorTexture = new THREE.CanvasTexture(canvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);
    
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({ 
            map: floorTexture,
            roughness: 0.9,
            metalness: 0.1,
            emissive: 0x220000,
            emissiveIntensity: 0.1
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Zone colorate per ogni squadra (4 angoli)
    const teamZones = [
        { team: 'red', x: -300, z: -300, color: 0xff0000 },
        { team: 'black', x: 300, z: -300, color: 0x666666 },
        { team: 'green', x: -300, z: 300, color: 0x00ff00 },
        { team: 'purple', x: 300, z: 300, color: 0xff00ff }
    ];
    
    teamZones.forEach(zone => {
        // Base colorata per ogni squadra
        const base = new THREE.Mesh(
            new THREE.CircleGeometry(80, 32),
            new THREE.MeshStandardMaterial({ 
                color: zone.color,
                emissive: zone.color,
                emissiveIntensity: 0.3,
                roughness: 0.6
            })
        );
        base.rotation.x = -Math.PI / 2;
        base.position.set(zone.x, 0.1, zone.z);
        scene.add(base);
        
        // Mura protettive per ogni base
        createArenaWalls(zone.x, zone.z, 90, 15, zone.color);
        
        // Alberi attorno alla base
        for(let i=0; i<8; i++) {
            let angle = (i / 8) * Math.PI * 2;
            let x = zone.x + Math.cos(angle) * 120;
            let z = zone.z + Math.sin(angle) * 120;
            createPineTree(x, z, random());
        }
    });
    
    // Arena centrale neutra
    const centralPlatform = new THREE.Mesh(
        new THREE.CylinderGeometry(60, 60, 5, 32),
        new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.5,
            roughness: 0.5
        })
    );
    centralPlatform.position.set(0, 2.5, 0);
    centralPlatform.castShadow = true;
    centralPlatform.receiveShadow = true;
    scene.add(centralPlatform);
    // Non aggiungiamo agli obstacles per renderla calpestabile
    
    // Pilastri centrali
    for(let i=0; i<4; i++) {
        let angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        let x = Math.cos(angle) * 40;
        let z = Math.sin(angle) * 40;
        createPillar(x, z, 30);
    }
    
    // Ostacoli tra le zone
    for(let i=0; i<16; i++) {
        let angle = (i / 16) * Math.PI * 2;
        let radius = 150 + random() * 50;
        let x = Math.cos(angle) * radius;
        let z = Math.sin(angle) * radius;
        createRock(x, z, random());
    }
    
    // Tempio di Rigenerazione in zona isolata
    createHealingTemple(450, 450);
}

function createHealingTemple(x, z) {
    // Pavimento del tempio
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(40, 32),
        new THREE.MeshStandardMaterial({ 
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.3,
            roughness: 0.6
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0.2, z);
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Mura alte del tempio
    for(let i=0; i<8; i++) {
        let angle = (i / 8) * Math.PI * 2;
        let wallX = x + Math.cos(angle) * 45;
        let wallZ = z + Math.sin(angle) * 45;
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(12, 35, 3),
            new THREE.MeshStandardMaterial({ 
                color: 0x88ff88,
                roughness: 0.7
            })
        );
        wall.position.set(wallX, 17.5, wallZ);
        wall.rotation.y = angle;
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        obstacles.push(wall);
    }
    
    // Totem di cura centrale
    const totem = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 4, 25, 6),
        new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.6,
            roughness: 0.4,
            metalness: 0.3
        })
    );
    totem.position.set(x, 12.5, z);
    totem.castShadow = true;
    scene.add(totem);
    
    // Cristallo in cima
    const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(4, 0),
        new THREE.MeshStandardMaterial({ 
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        })
    );
    crystal.position.set(x, 28, z);
    scene.add(crystal);
    crystal.userData.isHealingCrystal = true;
    
    // Particelle luminose intorno al totem
    window.healingTotemPos = new THREE.Vector3(x, 12.5, z);
}

// Crea mura circolari
function createArenaWalls(centerX, centerZ, radius, height, color) {
    const segments = 32;
    for(let i=0; i<segments; i++) {
        let angle1 = (i / segments) * Math.PI * 2;
        let angle2 = ((i+1) / segments) * Math.PI * 2;
        
        let x = centerX + Math.cos(angle1) * radius;
        let z = centerZ + Math.sin(angle1) * radius;
        
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(radius * 0.2, height, 3),
            new THREE.MeshStandardMaterial({ 
                color: color,
                emissive: color,
                emissiveIntensity: 0.2,
                roughness: 0.7,
                metalness: 0.3
            })
        );
        wall.position.set(x, height/2, z);
        wall.rotation.y = angle1;
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        obstacles.push(wall);
    }
}

// Crea rocce
function createRock(x, z, seedOffset) {
    const size = 8 + seedOffset * 8;
    const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            roughness: 0.9,
            metalness: 0.1
        })
    );
    rock.position.set(x, size/2, z);
    rock.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    obstacles.push(rock);
}

// Crea pilastri
function createPillar(x, z, height) {
    const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 6, height, 8),
        new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            roughness: 0.7,
            metalness: 0.4
        })
    );
    pillar.position.set(x, height/2, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
    obstacles.push(pillar);
}

function createPineTree(x, z, seedOffset) {
            const grp = new THREE.Group(); grp.position.set(x,0,z);
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2, 4, 30, 8), new THREE.MeshStandardMaterial({color:0x1a0f00, roughness: 0.9})); 
            trunk.position.y = 15; 
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            grp.add(trunk);
            
            const leafMat = new THREE.MeshStandardMaterial({color:0x0a290a, roughness: 0.8});
            const l1 = new THREE.Mesh(new THREE.ConeGeometry(16, 25, 8), leafMat); l1.position.y=25; l1.castShadow = true; grp.add(l1);
            const l2 = new THREE.Mesh(new THREE.ConeGeometry(12, 25, 8), leafMat); l2.position.y=40; l2.castShadow = true; grp.add(l2);
            const l3 = new THREE.Mesh(new THREE.ConeGeometry(8, 20, 8), leafMat); l3.position.y=52; l3.castShadow = true; grp.add(l3);
            const scale = 0.8 + seedOffset * 0.6; grp.scale.setScalar(scale); scene.add(grp);
            // Non aggiungiamo agli obstacles per evitare collisioni bloccanti
        }

function createFantasyHouse(x, z, seedOffset) {
            const grp = new THREE.Group(); grp.position.set(x, 0, z);
            const width = 20 + seedOffset * 10; const depth = 20 + seedOffset * 10; const height = 15;
            const walls = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color: 0x4a3c31, roughness: 0.8 })); 
            walls.position.y = height / 2; 
            walls.castShadow = true;
            walls.receiveShadow = true;
            grp.add(walls);
            
            const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.8, 10, 4), new THREE.MeshStandardMaterial({ color: 0x2c1e1e, roughness: 0.9 })); 
            roof.position.y = height + 5; 
            roof.rotation.y = Math.PI / 4; 
            roof.castShadow = true;
            grp.add(roof);
            
            const door = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 1), new THREE.MeshStandardMaterial({ color: 0x1a1110 })); 
            door.position.set(0, 5, depth/2 + 0.1); 
            grp.add(door);
            
            grp.rotation.y = seedOffset * Math.PI * 2; scene.add(grp);
            // Non aggiungiamo agli obstacles per evitare collisioni bloccanti
        }

