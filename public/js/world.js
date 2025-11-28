// world.js - Sistema mappa SQUADRE

function setupWorld() {
    // Crea solo mappa team
    createTeamMap();
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
    
    // Crea pattern terreno molto scuro quasi nero
    for (let i = 0; i < 512; i += 16) {
        for (let j = 0; j < 512; j += 16) {
            const rand = Math.random();
            if (rand < 0.15) {
                // Macchie di sangue scuro
                const gradient = ctx.createRadialGradient(i + 8, j + 8, 2, i + 8, j + 8, 10);
                gradient.addColorStop(0, '#1a0000');
                gradient.addColorStop(0.5, '#100000');
                gradient.addColorStop(1, '#0a0000');
                ctx.fillStyle = gradient;
            } else if (rand < 0.3) {
                // Sangue coagulato nero
                ctx.fillStyle = `rgb(${10 + Math.random() * 15}, ${2 + Math.random() * 8}, ${2 + Math.random() * 8})`;
            } else if (rand < 0.5) {
                // Terreno nero con hint rosso
                ctx.fillStyle = `rgb(${8 + Math.random() * 12}, ${5 + Math.random() * 10}, ${5 + Math.random() * 10})`;
            } else {
                // Terreno nero base
                const base = 5 + Math.random() * 10;
                ctx.fillStyle = `rgb(${base}, ${base * 0.5}, ${base * 0.5})`;
            }
            ctx.fillRect(i, j, 16, 16);
            
            // Aggiungi schizzi di sangue scuro
            if (Math.random() < 0.2) {
                ctx.strokeStyle = 'rgba(30,0,0,0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(i + Math.random() * 16, j + Math.random() * 16);
                ctx.lineTo(i + Math.random() * 16, j + Math.random() * 16);
                ctx.stroke();
            }
            // Gocce di sangue molto scure
            if (Math.random() < 0.1) {
                ctx.fillStyle = '#220000';
                ctx.beginPath();
                ctx.arc(i + Math.random() * 16, j + Math.random() * 16, 1 + Math.random() * 1.5, 0, Math.PI * 2);
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
            roughness: 0.95,
            metalness: 0.05,
            emissive: 0x050000,
            emissiveIntensity: 0.05
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
        
        // Mura protettive rimosse (causavano collisioni invisibili)
        // createArenaWalls(zone.x, zone.z, 90, 15, zone.color);
        
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
    
    // Pilastri centrali rimossi (causavano blocchi)
    // for(let i=0; i<4; i++) {
    //     let angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    //     let x = Math.cos(angle) * 40;
    //     let z = Math.sin(angle) * 40;
    //     createPillar(x, z, 30);
    // }
    
    // Ostacoli tra le zone (ridotti) (ridotti)
    for(let i=0; i<8; i++) {
        let angle = (i / 8) * Math.PI * 2;
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
        // Non aggiungiamo alle collisioni - solo decorative
        // obstacles.push(wall);
    }
}

// Crea rocce
function createRock(x, z, seedOffset) {
    const size = 4 + seedOffset * 3; // Smaller rocks (4-7 units instead of 8-16)
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
    // Non aggiungiamo collisioni - solo decorativi
    // obstacles.push(pillar);
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

