// ---------------------------------------------------------------------------
// The arena lighting rig.
//
// Extracted out of main.ts (file-budget: AGENTS.md). It is one cohesive thing —
// the four lights that decide what the game LOOKS like — and it had accumulated
// more explanatory comment than the render loop it sat next to.
//
// The direction is a dark, gritty night arena (Vermintide / Amid Evil / Dark
// Messiah): a cold moon carving form, a blue rim peeling bodies off the walls,
// warm firelight pooling on the ground, and a personal light so the player is
// never swallowed by the gloom.
//
// WHAT THE MEASUREMENTS SAID
//
// A captured gameplay frame was analysed rather than eyeballed: peak luminance
// 179/255 — no white anywhere in the image — and 52 % of all pixels inside the
// darkest tenth of the range. That is not moody, it is an image with no tonal
// range at all, and it is a large part of why the game read as a prototype next
// to a shipped one. The ambient floor here is part of the fix; the rest lives in
// the grade (vignette) and the post pipeline (bloom threshold).
//
// Re-measure after touching any of these. It is very easy to set light values by
// feel and end up back at a frame that is half black.
// ---------------------------------------------------------------------------
import * as THREE from 'three'

export interface ArenaLights {
  /** Warm personal pool that follows the player; main.ts moves it every frame. */
  playerLight: THREE.PointLight
}

export function installArenaLights(scene: THREE.Scene): ArenaLights {
  // Ambient FILL — deliberately weak against the key. It was once 3.4 against a
  // 1.7 key: an omnidirectional wash twice the strength of the directional, in
  // the same pale blue, so nothing in the scene had a light DIRECTION, which is
  // what made everything read flat. Shipped games run the key several times the
  // ambient.
  //
  // Raised 0.55 -> 0.85 because the previous value left the arena's upper
  // structure at literal zero: the top third of a captured frame was pure black,
  // which is not gloom, it is absence. This gives unlit geometry a floor value
  // so the building has a silhouette.
  scene.add(new THREE.HemisphereLight(0x9aa6c8, 0x6a5a3c, 0.85))

  // KEY — the moon. This carves form and casts every shadow in the game.
  const key = new THREE.DirectionalLight(0xbcc8e8, 3.6)
  key.position.set(12, 28, 14)
  key.castShadow = true
  key.shadow.mapSize.width = 2048
  key.shadow.mapSize.height = 2048
  key.shadow.camera.near = 1
  key.shadow.camera.far = 120
  key.shadow.camera.left = -40
  key.shadow.camera.right = 40
  key.shadow.camera.top = 40
  key.shadow.camera.bottom = -40
  key.shadow.bias = -0.0008
  scene.add(key)

  // RIM / back light — its whole job is silhouette separation: a bright edge
  // along the far side of a body so it reads against the arena wall instead of
  // merging into it. Moonlight blue on purpose; a cyan/teal rim turns the warm
  // sandstone visibly green at grazing angles.
  const rim = new THREE.DirectionalLight(0x6f80b4, 1.7)
  rim.position.set(-14, 9, -16)
  scene.add(rim)

  // Ground bounce — warm ember glow off the floor, so the lower arena stays
  // grounded in firelight rather than floating in blue.
  const bounce = new THREE.PointLight(0xff7a30, 0.22, 24, 2)
  bounce.position.set(0, 0.4, 0)
  scene.add(bounce)

  // Player follow-light — you carry a torch-like pool with you, so the fighter
  // and the ground under them stay readable wherever the arena is dark.
  const playerLight = new THREE.PointLight(0xffb070, 0.7, 9, 2)
  scene.add(playerLight)

  return { playerLight }
}
