// Spell particle layer — three.quarks on top of the crossed-plane cores.
//
// Three effects, all element-tinted (STILE §7: magic is THE saturated additive
// layer): ember trails that stream off a bolt in flight (emission-over-distance
// so density is speed-independent), a spark burst on impact, and a short
// muzzle puff at the cast origin. Everything shares ONE additive sprite
// material (soft-circle texture, per-particle color) → a single SpriteBatch =
// a single shader program, warmed at init so the first cast never compiles.

import * as THREE from 'three'
import {
  ApplyForce,
  BatchedRenderer,
  Bezier,
  ColorOverLife,
  ConstantColor,
  ConstantValue,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  PointEmitter,
  RenderMode,
  SizeOverLife,
  SphereEmitter,
  Vector3 as QVector3,
  Vector4 as QVector4,
} from 'three.quarks'

import { VfxTextures } from './vfx-textures.js'

export type SpellStyle = 'fire' | 'ice' | 'lightning' | 'dark' | 'nature' | 'neutral'

export interface EmberHandle {
  /** Parent this to the moving projectile object. */
  emitter: THREE.Object3D
  release: () => void
}

export interface SpellParticles {
  attachEmbers: (style: SpellStyle, parent: THREE.Object3D) => EmberHandle
  burstImpact: (pos: THREE.Vector3, style: SpellStyle) => void
  muzzleFlash: (pos: THREE.Vector3, style: SpellStyle) => void
  update: (dtSec: number) => void
}

// Slightly desaturated wide-glow versions of ELEMENT hues would fight the
// additive core; particles reuse the projectile hues so bolt + trail read as
// one object (Riot readability rule: the hot point owns the color).
const STYLE_RGB: Record<SpellStyle, [number, number, number]> = {
  fire: [1.0, 0.42, 0.12],
  ice: [0.3, 0.9, 1.0],
  lightning: [1.0, 0.92, 0.25],
  dark: [0.65, 0.25, 1.0],
  nature: [0.35, 1.0, 0.25],
  neutral: [0.2, 0.85, 1.0],
}

function styleColor(style: SpellStyle, alpha: number): QVector4 {
  const [r, g, b] = STYLE_RGB[style]
  return new QVector4(r, g, b, alpha)
}

/** Fade+shrink curve shared by every one-shot particle. */
function shrinkOverLife(): SizeOverLife {
  return new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.85, 0.45, 0.05), 0]]))
}

function fadeOverLife(style: SpellStyle): ColorOverLife {
  const [r, g, b] = STYLE_RGB[style]
  // Constant hue, alpha 1 → 0 over the particle's life (additive = fade out).
  return new ColorOverLife(
    new Gradient(
      [[new QVector3(r, g, b), 0]],
      [
        [1, 0],
        [0, 1],
      ],
    ),
  )
}

export function initSpellParticles(scene: THREE.Scene): SpellParticles {
  const batchRenderer = new BatchedRenderer()
  scene.add(batchRenderer)

  // ONE shared material → one batch → one shader for the whole layer.
  const material = new THREE.MeshBasicMaterial({
    map: VfxTextures.shield,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  // Bloom layer 1 on top of default 0 — the halo is what sells "energy".
  const bloomLayers = new THREE.Layers()
  bloomLayers.enable(1)

  function addSystem(system: ParticleSystem): ParticleSystem {
    batchRenderer.addSystem(system)
    return system
  }

  function makeEmberSystem(style: SpellStyle): ParticleSystem {
    return new ParticleSystem({
      duration: 1,
      looping: true,
      autoDestroy: true, // takes effect once looping is turned off on release
      worldSpace: true,
      shape: new SphereEmitter({ radius: 0.06 }),
      startLife: new IntervalValue(0.25, 0.5),
      startSpeed: new IntervalValue(0.1, 0.6),
      startSize: new IntervalValue(0.05, 0.13),
      startColor: new ConstantColor(styleColor(style, 0.9)),
      emissionOverTime: new ConstantValue(10),
      emissionOverDistance: new ConstantValue(9),
      behaviors: [fadeOverLife(style), shrinkOverLife()],
      renderMode: RenderMode.BillBoard,
      material,
      layers: bloomLayers,
      renderOrder: 2,
    })
  }

  function makeBurstSystem(
    style: SpellStyle,
    count: number,
    speed: [number, number],
    life: [number, number],
    size: [number, number],
    gravity: number,
  ): ParticleSystem {
    const behaviors = [fadeOverLife(style), shrinkOverLife()]
    if (gravity > 0) {
      behaviors.push(new ApplyForce(new QVector3(0, -1, 0), new ConstantValue(gravity)) as never)
    }
    return new ParticleSystem({
      duration: 0.7,
      looping: false,
      autoDestroy: true,
      worldSpace: true,
      shape: new PointEmitter(),
      startLife: new IntervalValue(life[0], life[1]),
      startSpeed: new IntervalValue(speed[0], speed[1]),
      startSize: new IntervalValue(size[0], size[1]),
      startColor: new ConstantColor(styleColor(style, 1)),
      emissionOverTime: new ConstantValue(0),
      emissionBursts: [
        { time: 0, count: new ConstantValue(count), cycle: 1, interval: 1, probability: 1 },
      ],
      behaviors,
      renderMode: RenderMode.BillBoard,
      material,
      layers: bloomLayers,
      renderOrder: 2,
    })
  }

  // Warm the single sprite-batch shader during load (mirrors the crossed-plane
  // warm-up): an invisible burst far below the arena floor.
  addSystem(
    makeBurstSystem('neutral', 4, [0.5, 1], [0.3, 0.4], [0.05, 0.08], 0),
  ).emitter.position.set(0, -120, 8)

  return {
    attachEmbers(style, parent) {
      const system = addSystem(makeEmberSystem(style))
      parent.add(system.emitter)
      return {
        emitter: system.emitter,
        release() {
          // Let live embers fade out; autoDestroy reaps the system afterwards.
          system.looping = false
          system.endEmit()
        },
      }
    },
    burstImpact(pos, style) {
      const system = addSystem(makeBurstSystem(style, 18, [1.5, 5], [0.25, 0.55], [0.05, 0.12], 4))
      system.emitter.position.copy(pos)
    },
    muzzleFlash(pos, style) {
      const system = addSystem(makeBurstSystem(style, 8, [0.6, 2], [0.12, 0.25], [0.06, 0.14], 0))
      system.emitter.position.copy(pos)
    },
    update(dtSec) {
      batchRenderer.update(Math.min(dtSec, 0.1))
    },
  }
}
