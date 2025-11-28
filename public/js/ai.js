// ai.js - Logica IA per il mostro PvE

function createAIMonster() {
    console.log("createAIMonster chiamato, isPvEMode:", typeof isPvEMode !== 'undefined' ? isPvEMode : 'undefined', "playerMesh:", typeof playerMesh !== 'undefined' ? 'exists' : 'undefined');
    
    const mesh = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, metalness: 0.8 }); // Rosso scuro
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xff4500, metalness: 0.9 }); // Arancione
    
    // Corpo più grande del giocatore
    const torso = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 4), armorMat); 
    torso.position.y = 4; 
    mesh.add(torso);
    
    const chest = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.5, 4.5), metalMat); 
    chest.position.y = 6.5; 
    mesh.add(chest);
    
    // Testa grande
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.5, 4.5), armorMat);
    helmet.position.y = 11;
    mesh.add(helmet);
    
    // Occhi brillanti (rossi)
    const eyeGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.8, 11.5, -1.5);
    mesh.add(eyeL);
    
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.8, 11.5, -1.5);
    mesh.add(eyeR);
    
    // Gambe spesse
    const legGeo = new THREE.BoxGeometry(2.2, 4, 2.2);
    const legL = new THREE.Mesh(legGeo, armorMat);
    legL.geometry.translate(0, -2, 0);
    legL.position.set(-2, 4, 0);
    mesh.add(legL);
    
    const legR = new THREE.Mesh(legGeo, armorMat);
    legR.geometry.translate(0, -2, 0);
    legR.position.set(2, 4, 0);
    mesh.add(legR);
    
    // Braccia spesse
    const armGeo = new THREE.BoxGeometry(2, 7, 2);
    const armL = new THREE.Mesh(armGeo, armorMat);
    armL.geometry.translate(0, -3, 0);
    armL.position.set(-4, 9, 0);
    mesh.add(armL);
    
    const armR = new THREE.Mesh(armGeo, armorMat);
    armR.geometry.translate(0, -3, 0);
    armR.position.set(4, 9, 0);
    mesh.add(armR);
    
    // Spawna il mostro vicino al player
    let spawnPos = { x: 0, y: 6, z: 0 };
    if (typeof playerMesh !== 'undefined' && playerMesh) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40;
        spawnPos.x = playerMesh.position.x + Math.cos(angle) * distance;
        spawnPos.z = playerMesh.position.z + Math.sin(angle) * distance;
        spawnPos.y = 6;
    }
    mesh.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    scene.add(mesh);
    
    aiMonster = {
        mesh: mesh,
        hp: 150,
        maxHp: 150,
        position: mesh.position.clone(),
        targetPos: mesh.position.clone(),
        lastAttackTime: Date.now(),
        lastSpellTime: Date.now(),
        state: 'patrol', // 'patrol', 'chase', 'attack', 'dead'
        spellType: 0, // 0: fireball, 1: beam, 2: push
        isAttacking: false,
        attackTimer: 0,
        speedMultiplier: 1.2
    };
    
    console.log("Mostro creato con successo a posizione:", mesh.position);
    console.log("aiMonster oggetto:", aiMonster);
    
    return aiMonster;
}

function updateAIMonster(delta) {
    if (!aiMonster || aiMonster.state === 'dead') return;
    
    const distanceToPlayer = aiMonster.mesh.position.distanceTo(playerMesh.position);
    const direction = new THREE.Vector3().subVectors(playerMesh.position, aiMonster.mesh.position).normalize();
    
    // Cambio di stato
    if (distanceToPlayer < 120) {
        aiMonster.state = 'chase';
    } else if (distanceToPlayer > 150) {
        aiMonster.state = 'patrol';
    }
    
    // Patruglia
    if (aiMonster.state === 'patrol') {
        const patrolDir = new THREE.Vector3(
            Math.sin(Date.now() * 0.0005) * 0.5,
            0,
            Math.cos(Date.now() * 0.0005) * 0.5
        );
        aiMonster.mesh.position.addScaledVector(patrolDir, 100 * delta * aiMonster.speedMultiplier);
    }
    
    // Inseguimento
    if (aiMonster.state === 'chase') {
        aiMonster.mesh.position.addScaledVector(direction, 80 * delta * aiMonster.speedMultiplier);
        
        // Rotazione verso il giocatore
        aiMonster.mesh.lookAt(playerMesh.position);
        
        // Attacco a distanza
        const now = Date.now();
        if (distanceToPlayer < 200 && now - aiMonster.lastSpellTime > 1500) {
            aiMonsterCastSpell();
            aiMonster.lastSpellTime = now;
        }
        
        // Attacco in mischia
        if (distanceToPlayer < 60 && now - aiMonster.lastAttackTime > 1000) {
            aiMonsterAttack();
            aiMonster.lastAttackTime = now;
        }
    }
}

function aiMonsterCastSpell() {
    if (!aiMonster) return;
    
    // Seleziona casualmente uno spell: 1=Missile, 2=Push, 3=Fireball, 4=Beam
    const spellChoice = Math.floor(Math.random() * 4) + 1;
    const origin = aiMonster.mesh.position.clone();
    const direction = new THREE.Vector3().subVectors(playerMesh.position, origin).normalize();
    
    if (spellChoice === 1) {
        // Missile/Bolt
        const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        projectile.position.copy(origin.clone().add(new THREE.Vector3(0, 3, 0)));
        projectile.userData = {
            velocity: direction.multiplyScalar(400),
            damage: 15,
            type: 'missile',
            lifeTime: 3,
            age: 0,
            owner: 'ai'
        };
        scene.add(projectile);
        projectiles.push(projectile);
    } else if (spellChoice === 2) {
        // Push
        const pushRadius = 80;
        const pushForce = 600;
        
        if (playerMesh.position.distanceTo(origin) < pushRadius) {
            const playerDir = new THREE.Vector3().subVectors(playerMesh.position, origin).normalize();
            velocity.add(playerDir.multiplyScalar(pushForce));
            velocity.y += 150;
            playerStats.hp = Math.max(0, playerStats.hp - 20);
            flashScreen('red');
            spawnParticles(playerMesh.position, 0xffcc00, 20, 20, 0.6, false);
        }
        
        // Effetto visivo onda
        const waveGeo = new THREE.RingGeometry(pushRadius - 10, pushRadius + 10, 32);
        const waveMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5 });
        const wave = new THREE.Mesh(waveGeo, waveMat);
        wave.position.copy(origin);
        wave.position.y += 2;
        wave.rotation.x = -Math.PI / 2;
        scene.add(wave);
        setTimeout(() => scene.remove(wave), 600);
    } else if (spellChoice === 3) {
        // Fireball
        const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        projectile.position.copy(origin.clone().add(new THREE.Vector3(0, 3, 0)));
        projectile.userData = {
            velocity: direction.multiplyScalar(350),
            damage: 25,
            type: 'fireball',
            lifeTime: 4,
            age: 0,
            owner: 'ai'
        };
        scene.add(projectile);
        projectiles.push(projectile);
    } else {
        // Beam (raggio energia)
        const beamDir = direction.clone();
        const beamRange = 250;
        const rayOrigin = origin.clone().add(new THREE.Vector3(0, 5, 0));
        
        const raycaster = new THREE.Raycaster(rayOrigin, beamDir, 0, beamRange);
        if (raycaster.ray.distanceToPoint(playerMesh.position) < 30) {
            playerStats.hp = Math.max(0, playerStats.hp - 30);
            flashScreen('red');
            spawnParticles(playerMesh.position, 0xffff00, 25, 25, 0.7, false);
        }
        
        // Effetto visivo beam
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([rayOrigin, rayOrigin.clone().addScaledVector(beamDir, beamRange)]),
            new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 3 })
        );
        scene.add(line);
        setTimeout(() => scene.remove(line), 400);
    }
}

function aiMonsterAttack() {
    if (!aiMonster) return;
    
    const playerDir = new THREE.Vector3().subVectors(playerMesh.position, aiMonster.mesh.position).normalize();
    const damageAmount = 20;
    
    playerStats.hp = Math.max(0, playerStats.hp - damageAmount);
    flashScreen('red');
    spawnParticles(playerMesh.position, 0xff0000, 10, 15, 0.4, false);
    
    // Knockback
    velocity.addScaledVector(playerDir, 300);
    velocity.y += 100;
    
    aiMonster.isAttacking = true;
    aiMonster.attackTimer = 0;
    
    setTimeout(() => {
        if (aiMonster) aiMonster.isAttacking = false;
    }, 500);
}

function damageAIMonster(damage) {
    if (!aiMonster || aiMonster.state === 'dead') return;
    
    aiMonster.hp -= damage;
    
    if (aiMonster.hp <= 0) {
        aiMonster.state = 'dead';
        aiMonster.mesh.visible = false;
        spawnParticles(aiMonster.mesh.position, 0xff0000, 100, 80, 1.5, true);
        addToLog('Mostro sconfitto!', 'kill');
        
        // Rinascita del mostro dopo 3 secondi
        setTimeout(() => {
            if (aiMonster && aiMonster.state === 'dead') {
                aiMonster.hp = aiMonster.maxHp;
                aiMonster.state = 'patrol';
                aiMonster.mesh.visible = true;
                
                // Spawna il mostro vicino al player
                const angle = Math.random() * Math.PI * 2;
                const distance = 40;
                aiMonster.mesh.position.set(
                    playerMesh.position.x + Math.cos(angle) * distance,
                    6,
                    playerMesh.position.z + Math.sin(angle) * distance
                );
                
                addToLog('Mostro rinato!', 'info');
            }
        }, 3000);
    }
}
