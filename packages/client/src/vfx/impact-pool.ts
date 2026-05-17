import * as THREE from 'three'

interface ImpactFx {
  slot: number
  bornAt: number
  lifeMs: number
  pos: THREE.Vector3
  color: number
}

export class ImpactPool {
  readonly mesh: THREE.InstancedMesh

  private readonly colors: THREE.InstancedBufferAttribute
  private readonly hiddenMat = new THREE.Matrix4().makeScale(0, 0, 0)
  private readonly impacts: ImpactFx[] = []
  private nextSlot = 0

  constructor(private readonly poolSize = 64) {
    const geo = new THREE.SphereGeometry(0.18, 8, 6)
    const mat = new THREE.MeshBasicMaterial({ transparent: true, vertexColors: false })
    this.mesh = new THREE.InstancedMesh(geo, mat, poolSize)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.colors = new THREE.InstancedBufferAttribute(new Float32Array(poolSize * 3), 3)
    this.mesh.instanceColor = this.colors
    for (let i = 0; i < poolSize; i++) this.mesh.setMatrixAt(i, this.hiddenMat)
    this.mesh.instanceMatrix.needsUpdate = true
  }

  spawn(pos: THREE.Vector3, color: number): void {
    const slot = this.nextSlot % this.poolSize
    this.nextSlot++
    this.setSlotColor(slot, color, 1)
    const existing = this.impacts.findIndex((fx) => fx.slot === slot)
    if (existing >= 0) this.impacts.splice(existing, 1)
    this.impacts.push({ slot, bornAt: performance.now(), lifeMs: 230, pos: pos.clone(), color })
  }

  update(now: number): void {
    let dirty = false
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const fx = this.impacts[i]!
      const age = now - fx.bornAt
      if (age >= fx.lifeMs) {
        this.mesh.setMatrixAt(fx.slot, this.hiddenMat)
        this.impacts.splice(i, 1)
        dirty = true
        continue
      }
      const k = age / fx.lifeMs
      const scale = 0.18 * (1 + k * 2.8)
      const mat4 = new THREE.Matrix4()
        .makeTranslation(fx.pos.x, fx.pos.y, fx.pos.z)
        .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
      this.mesh.setMatrixAt(fx.slot, mat4)
      this.setSlotColor(fx.slot, fx.color, 1 - k)
      dirty = true
    }
    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true
      this.colors.needsUpdate = true
    }
  }

  private setSlotColor(slot: number, color: number, fade: number): void {
    const r = (((color >> 16) & 0xff) / 255) * fade
    const g = (((color >> 8) & 0xff) / 255) * fade
    const b = ((color & 0xff) / 255) * fade
    this.colors.setXYZ(slot, r, g, b)
    this.colors.needsUpdate = true
  }
}
