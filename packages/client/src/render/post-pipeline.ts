// The post-processing chain: selective bloom, ground-contact AO, cinematic
// grade, sRGB output. Extracted out of main.ts (file-budget: AGENTS.md).
//
// Order matters and is not arbitrary:
//   scene render → GTAO → bloom mix → grade (linear HDR) → OutputPass (sRGB)
// The grade runs before OutputPass so it works in linear HDR and nothing gets
// decoded twice; GTAO sits before the bloom mix so its darkening does not eat
// emissive glow.

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

import { createGradePass } from './grade-pass.js'

export interface PostPipeline {
  /** Renders only the emissive layer; its result is mixed into the final pass. */
  bloomComposer: EffectComposer
  /** The one that reaches the screen. */
  finalComposer: EffectComposer
  /** Layer 1 — bloom-eligible emissive objects. Layer 0 is everything else. */
  bloomLayer: THREE.Layers
}

const BLOOM_MIX_SHADER = {
  vertexShader:
    'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader:
    'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() { gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }',
}

export function createPostPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostPipeline {
  const bloomLayer = new THREE.Layers()
  bloomLayer.set(1)

  const bloomComposer = new EffectComposer(renderer)
  bloomComposer.renderToScreen = false
  bloomComposer.addPass(new RenderPass(scene, camera))
  bloomComposer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.62, // strength
      0.55, // radius
      // Threshold was 0.75, above what the torch flames actually reach, so the
      // one warm light source in the arena never bloomed and the frame had no
      // highlight at all (measured peak 179/255). 0.55 lets fire and spell
      // emissives through — bloom is where a dark scene gets its brights.
      0.55,
    ),
  )

  // Multisampled target. Once EffectComposer owns the buffers, the canvas's own
  // `antialias: true` does nothing at all — every silhouette in the game was
  // coming out stair-stepped, on every frame. The bloom composer deliberately
  // stays at 0 samples: its output is blurred, so AA there is paid for and then
  // thrown away.
  // Size it properly at construction. EffectComposer only derives its own size
  // from the renderer when it makes its OWN target; hand it one and it adopts
  // that target's dimensions instead — a 1x1 here renders the entire game as a
  // single stretched pixel until the first window resize.
  const dpr = renderer.getPixelRatio()
  const finalTarget = new THREE.WebGLRenderTarget(
    Math.max(1, Math.floor(window.innerWidth * dpr)),
    Math.max(1, Math.floor(window.innerHeight * dpr)),
    {
      type: THREE.HalfFloatType,
      samples: Math.min(4, renderer.capabilities.maxSamples),
    },
  )
  const finalComposer = new EffectComposer(renderer, finalTarget)
  finalComposer.addPass(new RenderPass(scene, camera))

  // Adds the bloom composer's result (selective: only emissive layer-1 meshes
  // survive the per-frame black-out) onto the base scene. WITHOUT this the bloom
  // is computed and discarded every frame.
  const bloomMixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      ...BLOOM_MIX_SHADER,
    }),
    'baseTexture',
  )
  bloomMixPass.needsSwap = true
  finalComposer.addPass(bloomMixPass)
  finalComposer.addPass(createGradePass())
  finalComposer.addPass(new OutputPass())

  // Soft contact shadows where cover, props, characters and walls meet — the
  // single biggest "rendered, not flat" upgrade in the chain.
  const gtaoPass = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight)
  gtaoPass.blendIntensity = 1.2
  finalComposer.insertPass(gtaoPass, 1)

  return { bloomComposer, finalComposer, bloomLayer }
}
