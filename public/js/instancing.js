// Instanced Rendering System per massime performance
// Raggruppa oggetti identici in un'unica draw call

const instancedMeshes = {};

function createInstancedObstacles(obstacleData, scene) {
    // Raggruppa ostacoli per tipo
    const groupedByType = {};
    obstacleData.forEach(obs => {
        const key = `${obs.type}_${obs.size}`;
        if (!groupedByType[key]) groupedByType[key] = [];
        groupedByType[key].push(obs);
    });
    
    Object.keys(groupedByType).forEach(key => {
        const group = groupedByType[key];
        const count = group.length;
        
        // Crea geometria base
        const firstObs = group[0];
        let geometry;
        if (firstObs.type === 'box') {
            geometry = new THREE.BoxGeometry(firstObs.size, firstObs.size, firstObs.size);
        } else if (firstObs.type === 'cylinder') {
            geometry = new THREE.CylinderGeometry(firstObs.size / 2, firstObs.size / 2, firstObs.size);
        } else {
            geometry = new THREE.SphereGeometry(firstObs.size / 2, 8, 6);
        }
        
        const material = new THREE.MeshLambertMaterial({ 
            color: firstObs.color || 0x888888,
            flatShading: true 
        });
        
        // Crea instanced mesh
        const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        instancedMesh.castShadow = false;
        instancedMesh.receiveShadow = false;
        
        // Imposta matrici per ogni istanza
        const matrix = new THREE.Matrix4();
        group.forEach((obs, i) => {
            matrix.setPosition(obs.position.x, obs.position.y, obs.position.z);
            instancedMesh.setMatrixAt(i, matrix);
        });
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        scene.add(instancedMesh);
        instancedMeshes[key] = instancedMesh;
        
        console.log(`[INSTANCING] Created ${count} instances of ${key}`);
    });
}

// Aggiungi al sistema LOD
function addLODToInstanced(mesh, distances = { high: 50, low: 150 }) {
    // Per instanced mesh, possiamo usare frustum culling automatico
    mesh.frustumCulled = true;
    return mesh;
}
