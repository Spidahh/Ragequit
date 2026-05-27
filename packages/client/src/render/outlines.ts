import * as THREE from 'three'

const VERTEX_SHADER = `
uniform float thickness;

#include <common>
#include <skinning_pars_vertex>

void main() {
  vec3 objectNormal = vec3( normal );
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vec3 transformedNormal = objectNormal;

  vec3 transformed = vec3( position );

  #include <skinning_vertex>

  // Extrude along the animated normal
  vec3 displacedPosition = transformed + transformedNormal * thickness;

  vec4 mvPosition = modelViewMatrix * vec4( displacedPosition, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
}
`

const FRAGMENT_SHADER = `
uniform vec3 outlineColor;

void main() {
  gl_FragColor = vec4( outlineColor, 1.0 );
}
`

/**
 * Creates the unlit, backface-culled outline ShaderMaterial.
 * @param thickness Displacement thickness along the normal vector.
 * @param color Hex integer color (defaults to very dark graphite-black).
 * @param _isSkinned Kept for call-site clarity; Three injects skinning defines for SkinnedMesh.
 */
export function createOutlineMaterial(
  thickness: number,
  color: number,
  _isSkinned: boolean,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      thickness: { value: thickness },
      outlineColor: { value: new THREE.Color(color) },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: true,
  })
}

/**
 * Clones a mesh or skinned mesh to generate its inverted-hull outline shell.
 * @param source The source Mesh or SkinnedMesh to outline.
 * @param thickness The outline border weight.
 * @param color The outline color (default is dark graphite #0f0f15).
 */
export function createOutlineMesh(
  source: THREE.Mesh | THREE.SkinnedMesh,
  thickness = 0.015,
  color = 0x0f0f15,
): THREE.Mesh {
  const isSkinned = source instanceof THREE.SkinnedMesh && !!(source as THREE.SkinnedMesh).skeleton
  const mat = createOutlineMaterial(thickness, color, isSkinned)

  let outline: THREE.Mesh
  if (isSkinned) {
    const skinnedSource = source as THREE.SkinnedMesh
    const skinnedOutline = new THREE.SkinnedMesh(source.geometry.clone(), mat)
    // Bind to the exact same skeleton bones and transform matrices
    skinnedOutline.bind(skinnedSource.skeleton, skinnedSource.bindMatrix)
    outline = skinnedOutline
  } else {
    outline = new THREE.Mesh(source.geometry.clone(), mat)
  }

  outline.name = `${source.name}_outline`
  outline.castShadow = false
  outline.receiveShadow = false
  outline.frustumCulled = false

  return outline
}
