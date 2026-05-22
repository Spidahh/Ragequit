import * as THREE from 'three'

// DeathBurst — instanced particle burst spawned when a player dies.
// Each burst spawns N particles that shoot outward from the death point,
// decelerate, and fade out over ~0.9 s.  Blood-red particles with a small
// gold accent for own-kill feedback.
//
// Architecture: one InstancedMesh for the whole scene.  Up to MAX_BURSTS
// active simultaneously (old ones are forcibly recycled if pool is full).

const PARTICLES_PER_BURST = 18
const BURST_LIFE_MS = 900
const MAX_BURSTS = 12 // max simultaneous death bursts (rare event)
const POOL_SIZE = PARTICLES_PER_BURST * MAX_BURSTS

interface Burst {
  startMs: number
  baseSlot: number
  velocities: Float32Array // vx,vy,vz per particle
  origins: Float32Array // ox,oy,oz per particle
}

export class DeathBurst {
  readonly mesh: THREE.InstancedMesh

  private readonly hiddenMat = new THREE.Matrix4().makeScale(0, 0, 0)
  private readonly bursts: Burst[] = []
  private nextBurstIdx = 0

  constructor() {
    const geo = new THREE.IcosahedronGeometry(0.055, 0)
    const mat = new THREE.MeshBasicMaterial({ transparent: true, vertexColors: false })
    this.mesh = new THREE.InstancedMesh(geo, mat, POOL_SIZE)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    // Initialise all instances hidden
    for (let i = 0; i < POOL_SIZE; i++) {
      this.mesh.setMatrixAt(i, this.hiddenMat)
      this.mesh.setColorAt(i, new THREE.Color(0x000000))
    }
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  spawn(pos: THREE.Vector3, isKillFeedback: boolean): void {
    const slotIdx = this.nextBurstIdx % MAX_BURSTS
    this.nextBurstIdx++

    // Recycle existing burst in this slot if it's still alive
    const existing = this.bursts[slotIdx]
    if (existing) {
      for (let i = 0; i < PARTICLES_PER_BURST; i++) {
        this.mesh.setMatrixAt(existing.baseSlot + i, this.hiddenMat)
      }
    }

    const baseSlot = slotIdx * PARTICLES_PER_BURST
    const velocities = new Float32Array(PARTICLES_PER_BURST * 3)
    const origins = new Float32Array(PARTICLES_PER_BURST * 3)
    const col = new THREE.Color()

    for (let i = 0; i < PARTICLES_PER_BURST; i++) {
      // Random hemisphere direction skewed upward
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.7 // 0..126° — skew upward
      const speed = 1.8 + Math.random() * 2.4
      const vx = Math.sin(phi) * Math.cos(theta) * speed
      const vy = Math.cos(phi) * speed + 0.8 // upward bias
      const vz = Math.sin(phi) * Math.sin(theta) * speed

      velocities[i * 3] = vx
      velocities[i * 3 + 1] = vy
      velocities[i * 3 + 2] = vz
      origins[i * 3] = pos.x + (Math.random() - 0.5) * 0.2
      origins[i * 3 + 1] = pos.y + 0.5 + Math.random() * 0.4
      origins[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.2

      // Blood red base; a few accent sparks gold if own kill
      const accent = isKillFeedback && i < 3
      col.setHex(accent ? 0xffd260 : i % 5 === 0 ? 0x880000 : 0xcc1a1a)
      this.mesh.setColorAt(baseSlot + i, col)
    }

    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true

    const burst: Burst = { startMs: performance.now(), baseSlot, velocities, origins }
    this.bursts[slotIdx] = burst
  }

  update(now: number): void {
    let matDirty = false

    for (const burst of this.bursts) {
      if (!burst) continue
      const age = now - burst.startMs
      if (age >= BURST_LIFE_MS) {
        for (let i = 0; i < PARTICLES_PER_BURST; i++) {
          this.mesh.setMatrixAt(burst.baseSlot + i, this.hiddenMat)
        }
        matDirty = true
        continue
      }

      const k = age / BURST_LIFE_MS // 0 → 1
      const gravity = 4.5 // m/s² downward
      const drag = 1 - k * 0.7 // velocity falloff

      for (let i = 0; i < PARTICLES_PER_BURST; i++) {
        const t = age / 1000 // seconds elapsed
        const vx = burst.velocities[i * 3]! * drag
        const vy = burst.velocities[i * 3 + 1]! * drag - gravity * t
        const vz = burst.velocities[i * 3 + 2]! * drag
        const x = burst.origins[i * 3]! + vx * t
        const y = burst.origins[i * 3 + 1]! + vy * t
        const z = burst.origins[i * 3 + 2]! + vz * t

        // Shrink + fade: scale 1→0.1 over life
        const scale = (1 - k) * 0.9 + 0.1
        const mat4 = new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, z),
          new THREE.Quaternion(),
          new THREE.Vector3(scale, scale, scale),
        )
        this.mesh.setMatrixAt(burst.baseSlot + i, mat4)
        matDirty = true
      }
    }

    if (matDirty) this.mesh.instanceMatrix.needsUpdate = true
  }
}
