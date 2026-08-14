import * as THREE from 'three'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

// Cinematic colour-grade pass — the final touch that lifts the render from "flat
// stylized" toward a produced look. It runs in finalComposer JUST BEFORE
// OutputPass, so its input (tDiffuse) is the linear HDR scene (post-bloom,
// pre-tone-map). Grading before tone-mapping is the filmically correct order and
// sidesteps the colour-space double-decode you get from any pass placed AFTER
// OutputPass. Every op below is therefore HDR-safe (monotonic, no crush of
// values > 1 from bloom or the bright sky).
//
//   • Saturation  — held below 1 so the world stays desaturated/grounded, but
//     high enough (0.92, per STILE.md) that the element-coded magic still sings.
//   • Contrast    — a linear stretch about mid-grey adds punch.
//   • Split-tone  — shadows drift cool, highlights warm (classic teal/amber).
//   • Vignette    — darkens the frame edges, focusing the eye on the fight.
//   • Dither      — a faint pixel-keyed jitter that softens flat-colour banding.
//
// All knobs are uniforms so the look can be tuned live / exposed in settings later.
export interface GradeOptions {
  vignette?: number // 0 = none, ~0.5 = noticeable corner falloff
  saturation?: number // multiplier (1 = unchanged)
  contrast?: number // linear stretch about mid-grey (0 = none)
  warmth?: number // split-tone strength (shadows cool / highlights warm)
  grain?: number // dither amplitude in linear units
}

// Linear-space mid-grey pivot (≈ 0.5 in sRGB). Contrast stretches about this.
const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uVignette;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uWarmth;
  uniform float uGrain;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;

    // Saturation around perceptual luma.
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(luma), c, uSaturation);

    // Linear contrast about mid-grey — monotonic, safe for HDR values > 1.
    c = max(vec3(0.0), (c - 0.18) * (1.0 + uContrast) + 0.18);

    // Split-tone: cool shadows, warm highlights, pivoting on luma.
    vec3 cool = vec3(0.86, 0.95, 1.06);
    vec3 warm = vec3(1.07, 1.0, 0.88);
    c *= mix(cool, warm, smoothstep(0.04, 0.6, luma)) * uWarmth + (1.0 - uWarmth);

    // Vignette — radial falloff from frame centre.
    vec2 d = vUv - 0.5;
    c *= clamp(1.0 - uVignette * dot(d, d) * 1.9, 0.0, 1.0);

    // Faint dither to soften banding in flat toon fills / sky gradient.
    c += (hash(gl_FragCoord.xy) - 0.5) * uGrain;

    gl_FragColor = vec4(max(c, 0.0), 1.0);
  }
`

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export function createGradePass(opts: GradeOptions = {}): ShaderPass {
  return new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        // Gritty dark-fantasy grade (Vermintide / Amid Evil): desaturated, punchy
        // contrast, a vignette closing the frame, and film grain.
        //
        // Vignette was 0.66, which puts the corners at 37 % brightness
        // (1 - 0.66 * 0.5 * 1.9). Measured on a real gameplay frame that helped
        // push 52 % of the screen into the darkest tenth of the range, with a
        // peak luminance of 179/255 — an image with no highlights and half of it
        // void. 0.40 leaves the corners at 62 %: still a closed, cinematic frame,
        // but it stops eating the picture. Re-measure with tools/verify before
        // moving it again; this number is easy to set by feel and get wrong.
        uVignette: { value: opts.vignette ?? 0.4 },
        uSaturation: { value: opts.saturation ?? 0.92 },
        uContrast: { value: opts.contrast ?? 0.2 },
        uWarmth: { value: opts.warmth ?? 0.06 },
        uGrain: { value: opts.grain ?? 0.016 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    }),
  )
}
