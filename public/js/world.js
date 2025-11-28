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
    
    // Griglia e pavimento base
    const gridHelper = new THREE.GridHelper(2000, 100, 0x440000, 0x220000);
    scene.add(gridHelper);
    
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({ 
            color: 0x1a0000,
            roughness: 0.8,
            metalness: 0.2
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Arena circolare centrale con mura
    createArenaWalls(0, 0, 200, 20, 0xff0000);
    
    // Alberi sparsi
    for(let i=0; i<30; i++) { 
        let angle = (i / 30) * Math.PI * 2;
        let radius = 250 + random() * 200;
        let x = Math.cos(angle) * radius;
        let z = Math.sin(angle) * radius;
        createPineTree(x, z, random()); 
    }
    
    // Case sparse fuori dall'arena
    for(let i=0; i<12; i++) { 
        let angle = (i / 12) * Math.PI * 2 + random() * 0.5;
        let radius = 300 + random() * 150;
        let x = Math.cos(angle) * radius;
        let z = Math.sin(angle) * radius;
        createFantasyHouse(x, z, random()); 
    }
    
    // Ostacoli centrali (rocce)
    for(let i=0; i<8; i++) {
        let angle = (i / 8) * Math.PI * 2;
        let x = Math.cos(angle) * 80;
        let z = Math.sin(angle) * 80;
        createRock(x, z, random());
    }
}

// MAPPA SQUADRE - 4 zone colorate per ogni team
function createTeamMap() {
    console.log('[WORLD] Creating TEAM Map');
    
    // Griglia e pavimento base
    const gridHelper = new THREE.GridHelper(2000, 100, 0x004444, 0x002222);
    scene.add(gridHelper);
    
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({ 
            color: 0x001a1a,
            roughness: 0.8,
            metalness: 0.2
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
    scene.add(centralPlatform);
    obstacles.push(centralPlatform);
    
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
            const scale = 0.8 + seedOffset * 0.6; grp.scale.setScalar(scale); scene.add(grp); obstacles.push(grp);
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
            
            grp.rotation.y = seedOffset * Math.PI * 2; scene.add(grp); obstacles.push(grp);
        }

