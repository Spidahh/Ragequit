import * as THREE from 'three'

interface ImpactFx {
  slot: number
  bornAt: number
  lifeMs: number
  pos: THREE.Vector3
  color: number
  profile: ImpactProfile
  angle: number
}

export type ImpactProfile = 'magic' | 'melee' | 'pierce' | 'parry' | 'tick'

// ImpactPool — two layered instanced effects per impact:
//  1. Sphere flash — quick initial burst, fades from centre outward.
//  2. Ring shockwave — thin torus that expands outward fast then slows.
//  3. Directionless accent shard — profile-scaled so hits read by silhouette.
// All layers share a slot index so they always animate in sync.
export class ImpactPool {
  readonly mesh: THREE.InstancedMesh // sphere burst
  readonly ringMesh: THREE.InstancedMesh // shockwave ring
  readonly accentMesh: THREE.InstancedMesh // profile silhouette

  private readonly sphereColors: THREE.InstancedBufferAttribute
  private readonly ringColors: THREE.InstancedBufferAttribute
  private readonly accentColors: THREE.InstancedBufferAttribute
  private readonly hiddenMat = new THREE.Matrix4().makeScale(0, 0, 0)
  private readonly impacts: ImpactFx[] = []
  private nextSlot = 0

  constructor(private readonly poolSize = 64) {
    // --- Sphere burst ---
    const sphereGeo = new THREE.SphereGeometry(0.15, 8, 6)
    const sphereMat = new THREE.MeshBasicMaterial({ transparent: true, vertexColors: false })
    this.mesh = new THREE.InstancedMesh(sphereGeo, sphereMat, poolSize)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.sphereColors = new THREE.InstancedBufferAttribute(new Float32Array(poolSize * 3), 3)
    this.mesh.instanceColor = this.sphereColors

    // --- Shockwave ring — thin torus, lies flat in XZ plane ---
    const ringGeo = new THREE.TorusGeometry(1, 0.04, 6, 32)
    ringGeo.rotateX(Math.PI / 2) // make it horizontal
    const ringMat = new THREE.MeshBasicMaterial({ transparent: true, vertexColors: false })
    this.ringMesh = new THREE.InstancedMesh(ringGeo, ringMat, poolSize)
    this.ringMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.ringColors = new THREE.InstancedBufferAttribute(new Float32Array(poolSize * 3), 3)
    this.ringMesh.instanceColor = this.ringColors

    // --- Accent shard — one cheap shape, profile-scaled per contact type ---
    const accentGeo = new THREE.OctahedronGeometry(0.24, 0)
    const accentMat = new THREE.MeshBasicMaterial({
      transparent: true,
      vertexColors: false,
      depthWrite: false,
    })
    this.accentMesh = new THREE.InstancedMesh(accentGeo, accentMat, poolSize)
    this.accentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.accentColors = new THREE.InstancedBufferAttribute(new Float32Array(poolSize * 3), 3)
    this.accentMesh.instanceColor = this.accentColors

    for (let i = 0; i < poolSize; i++) {
      this.mesh.setMatrixAt(i, this.hiddenMat)
      this.ringMesh.setMatrixAt(i, this.hiddenMat)
      this.accentMesh.setMatrixAt(i, this.hiddenMat)
    }
    this.mesh.instanceMatrix.needsUpdate = true
    this.ringMesh.instanceMatrix.needsUpdate = true
    this.accentMesh.instanceMatrix.needsUpdate = true
  }

  spawn(pos: THREE.Vector3, color: number, profile: ImpactProfile = 'magic'): void {
    const slot = this.nextSlot % this.poolSize
    this.nextSlot++
    this.setColor(this.sphereColors, slot, color, 1)
    this.setColor(this.ringColors, slot, color, 1)
    this.setColor(this.accentColors, slot, color, 1)
    const existing = this.impacts.findIndex((fx) => fx.slot === slot)
    if (existing >= 0) this.impacts.splice(existing, 1)
    this.impacts.push({
      slot,
      bornAt: performance.now(),
      lifeMs: profile === 'parry' ? 320 : profile === 'tick' ? 170 : 250,
      pos: pos.clone(),
      color,
      profile,
      angle: Math.random() * Math.PI,
    })
  }

  update(now: number): void {
    let dirty = false
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const fx = this.impacts[i]!
      const age = now - fx.bornAt
      if (age >= fx.lifeMs) {
        this.mesh.setMatrixAt(fx.slot, this.hiddenMat)
        this.ringMesh.setMatrixAt(fx.slot, this.hiddenMat)
        this.accentMesh.setMatrixAt(fx.slot, this.hiddenMat)
        this.impacts.splice(i, 1)
        dirty = true
        continue
      }
      const k = age / fx.lifeMs // 0 → 1 linear progress

      // Sphere: ease-out — quick initial pop then slow fade.
      // Scale: 0.15 → 0.40 over life; fade out linearly from alpha 1 → 0.
      const sphereEase = 1 - (1 - k) * (1 - k) // quadratic ease-out
      const sphereScale = 0.15 + sphereEase * 0.4
      const sphereAlpha = Math.max(0, 1 - k * 1.3)
      const sphereProfileScale =
        fx.profile === 'parry'
          ? 1.35
          : fx.profile === 'tick'
            ? 0.55
            : fx.profile === 'pierce'
              ? 0.8
              : 1
      this.setMatrix(
        this.mesh,
        fx.slot,
        fx.pos,
        sphereScale * sphereProfileScale,
        sphereScale * sphereProfileScale,
        sphereScale * sphereProfileScale,
      )
      this.setColor(this.sphereColors, fx.slot, fx.color, sphereAlpha)

      // Ring: expands fast (radius 0.1 → 0.95 m) and fades after k > 0.4.
      const ringEase = 1 - (1 - Math.min(k * 1.6, 1)) * (1 - Math.min(k * 1.6, 1))
      const ringProfileScale =
        fx.profile === 'parry'
          ? 1.28
          : fx.profile === 'tick'
            ? 0.45
            : fx.profile === 'pierce'
              ? 0.72
              : 1
      const ringRadius = (0.1 + ringEase * 0.9) * ringProfileScale
      const ringAlpha = k < 0.35 ? 1.0 : Math.max(0, 1 - (k - 0.35) / 0.65)
      this.setMatrix(this.ringMesh, fx.slot, fx.pos, ringRadius, ringRadius, ringRadius)
      this.setColor(this.ringColors, fx.slot, fx.color, ringAlpha * 0.75)

      const accentEase = 1 - (1 - Math.min(k * 1.25, 1)) ** 2
      const accentAlpha = Math.max(0, 1 - k * (fx.profile === 'tick' ? 1.7 : 1.2))
      const accentScale = 0.16 + accentEase * 0.78
      const accentShape =
        fx.profile === 'melee'
          ? [accentScale * 2.3, accentScale * 0.32, accentScale * 0.58]
          : fx.profile === 'pierce'
            ? [accentScale * 0.28, accentScale * 0.28, accentScale * 2.55]
            : fx.profile === 'parry'
              ? [accentScale * 1.45, accentScale * 1.45, accentScale * 0.4]
              : fx.profile === 'tick'
                ? [accentScale * 0.48, accentScale * 0.48, accentScale * 0.48]
                : [accentScale, accentScale, accentScale]
      this.setMatrix(
        this.accentMesh,
        fx.slot,
        fx.pos,
        accentShape[0]!,
        accentShape[1]!,
        accentShape[2]!,
        fx.angle + k * (fx.profile === 'magic' ? 1.2 : 0.22),
      )
      this.setColor(this.accentColors, fx.slot, fx.color, accentAlpha)

      dirty = true
    }
    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true
      this.sphereColors.needsUpdate = true
      this.ringMesh.instanceMatrix.needsUpdate = true
      this.ringColors.needsUpdate = true
      this.accentMesh.instanceMatrix.needsUpdate = true
      this.accentColors.needsUpdate = true
    }
  }

  private setMatrix(
    im: THREE.InstancedMesh,
    slot: number,
    pos: THREE.Vector3,
    sx: number,
    sy: number,
    sz: number,
    angle = 0,
  ): void {
    const matrix = new THREE.Matrix4().compose(
      pos,
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
      new THREE.Vector3(sx, sy, sz),
    )
    im.setMatrixAt(slot, matrix)
  }

  private setColor(
    attr: THREE.InstancedBufferAttribute,
    slot: number,
    color: number,
    fade: number,
  ): void {
    attr.setXYZ(
      slot,
      (((color >> 16) & 0xff) / 255) * fade,
      (((color >> 8) & 0xff) / 255) * fade,
      ((color & 0xff) / 255) * fade,
    )
    attr.needsUpdate = true
  }
}
