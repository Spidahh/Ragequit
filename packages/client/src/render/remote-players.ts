import * as THREE from 'three'
import { HP_MAX, INTERPOLATION_DELAY_MS } from '@ragequit/shared'
import { SWING_ARC_YAW_OFFSET, makeSwingArcMesh } from './factories.js'
import { makeCharacter, applyWeaponProp, makeCastRing } from './characters.js'

// Minimal schema shape consumed by this module.
export interface RemotePlayerSchema {
  name: string
  transform: { x: number; y: number; z: number; yaw: number }
  hp: number
  alive: boolean
  activeWeapon: string
  lastSwingStartTick: number
  casting: boolean
  castEndsAtTick: number
  invulnUntilTick: number
  statuses: ReadonlyArray<{ kind: string; stacks: number; remainingSec: number }>
}

interface RemoteSnapshot {
  at: number
  x: number
  y: number
  z: number
  yaw: number
}

interface RemoteState {
  mesh: THREE.Group
  snapshots: RemoteSnapshot[]
  arc: THREE.Mesh
  arcExpiresAt: number
  lastSwingStartTick: number
  castRing: THREE.Mesh
  nameplate: HTMLDivElement
  hpFill: HTMLDivElement
  hp: number
  alive: boolean
  lastWeapon: string
}

export interface RemotePlayersOptions {
  scene: THREE.Scene
  toonGradient: THREE.DataTexture
  nameplateContainer: HTMLElement
  isWeapon: (w: string) => boolean
  capsuleHeightM: number
  capsuleHalfHeightM: number
}

export interface RemotePlayersController {
  updateFromSchema: (
    players: Map<string, RemotePlayerSchema>,
    selfSessionId: string,
    now: number,
    schemaTick: number,
    onSelfSwing: (tick: number) => void,
  ) => void
  renderFrame: (now: number, camera: THREE.Camera, domElement: HTMLElement) => void
  renderEmissives: (
    now: number,
    tickNow: number,
    statusEmissive: Record<string, number>,
    getPlayers: () => Map<string, RemotePlayerSchema> | null,
  ) => void
  clear: () => void
  getWorldPos: (sid: string) => THREE.Vector3 | null
  setDamageBlink: (sid: string, untilMs: number) => void
}

export function initRemotePlayers({
  scene,
  toonGradient,
  nameplateContainer,
  isWeapon,
  capsuleHeightM,
  capsuleHalfHeightM,
}: RemotePlayersOptions): RemotePlayersController {
  const remotePlayers = new Map<string, RemoteState>()
  const remoteDamageBlinkUntil = new Map<string, number>()

  function spawnRemote(p: RemotePlayerSchema, sid: string): RemoteState {
    const mesh = makeCharacter(0xe04a4a, toonGradient)
    scene.add(mesh)
    const arc = makeSwingArcMesh()
    scene.add(arc)
    const castRing = makeCastRing()
    scene.add(castRing)
    const nameplate = document.createElement('div')
    nameplate.style.cssText = [
      'position:absolute',
      'transform:translate(-50%,-100%)',
      'text-align:center',
      'pointer-events:none',
      'padding:4px 8px 5px',
      'background:rgba(8,10,18,0.72)',
      'border:1px solid rgba(255,255,255,0.10)',
      'border-radius:6px',
      'backdrop-filter:blur(2px)',
    ].join(';')
    const nameLabel = document.createElement('div')
    nameLabel.textContent = p.name || `#${sid.slice(0, 4)}`
    nameLabel.style.cssText = [
      'color:#ffb0b0',
      'font:700 12px/1 ui-monospace,monospace',
      'text-shadow:0 1px 4px #000,0 0 6px rgba(255,60,60,0.5)',
      'margin-bottom:4px',
      'letter-spacing:0.06em',
      'white-space:nowrap',
    ].join(';')
    const barRow = document.createElement('div')
    barRow.style.cssText = 'display:flex;align-items:center;gap:5px'
    const barBg = document.createElement('div')
    barBg.style.cssText = [
      'width:80px',
      'height:7px',
      'background:rgba(0,0,0,0.75)',
      'border-radius:4px',
      'overflow:hidden',
      'border:1px solid rgba(255,255,255,0.12)',
      'flex-shrink:0',
    ].join(';')
    const hpFill = document.createElement('div')
    hpFill.style.cssText = [
      'height:100%',
      'width:100%',
      'background:linear-gradient(90deg,#c82020,#f04040,#ff7070)',
      'transition:width 0.12s linear,background 0.25s',
      'border-radius:4px',
    ].join(';')
    barBg.appendChild(hpFill)
    barRow.appendChild(barBg)
    nameplate.appendChild(nameLabel)
    nameplate.appendChild(barRow)
    nameplateContainer.appendChild(nameplate)
    return {
      mesh, snapshots: [], arc, arcExpiresAt: 0, lastSwingStartTick: 0,
      castRing, nameplate, hpFill, hp: HP_MAX, alive: true, lastWeapon: '',
    }
  }

  function disposeRemote(r: RemoteState): void {
    scene.remove(r.mesh)
    r.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
        else (child.material as THREE.Material).dispose()
      }
    })
    scene.remove(r.arc)
    r.arc.geometry.dispose()
    ;(r.arc.material as THREE.Material).dispose()
    scene.remove(r.castRing)
    r.castRing.geometry.dispose()
    ;(r.castRing.material as THREE.Material).dispose()
    r.nameplate.remove()
  }

  function updateFromSchema(
    players: Map<string, RemotePlayerSchema>,
    selfSessionId: string,
    now: number,
    schemaTick: number,
    onSelfSwing: (tick: number) => void,
  ): void {
    players.forEach((p, sid) => {
      if (sid === selfSessionId) {
        if (p.lastSwingStartTick > 0) onSelfSwing(p.lastSwingStartTick)
        return
      }
      let r = remotePlayers.get(sid)
      if (!r) {
        r = spawnRemote(p, sid)
        remotePlayers.set(sid, r)
      }
      r.hp = p.hp
      if (!r.alive && p.alive) r.snapshots.length = 0
      r.alive = p.alive
      const remoteWeapon = isWeapon(p.activeWeapon) ? p.activeWeapon : 'sword'
      if (r.lastWeapon !== remoteWeapon) {
        r.lastWeapon = remoteWeapon
        applyWeaponProp(r.mesh, remoteWeapon, toonGradient)
      }
      r.snapshots.push({ at: now, x: p.transform.x, y: p.transform.y, z: p.transform.z, yaw: p.transform.yaw })
      if (r.snapshots.length > 60) r.snapshots.shift()
      if (p.lastSwingStartTick > 0 && p.lastSwingStartTick !== r.lastSwingStartTick) {
        r.lastSwingStartTick = p.lastSwingStartTick
        r.arc.visible = true
        r.arcExpiresAt = now + 400
      }
      r.castRing.visible = !!p.casting && p.castEndsAtTick > schemaTick
    })
    remotePlayers.forEach((r, sid) => {
      if (!players.has(sid)) {
        disposeRemote(r)
        remotePlayers.delete(sid)
      }
    })
  }

  function renderFrame(now: number, camera: THREE.Camera, domElement: HTMLElement): void {
    const renderAt = now - INTERPOLATION_DELAY_MS
    remotePlayers.forEach((r) => {
      if (!r.alive) {
        r.mesh.visible = false
        r.arc.visible = false
        r.castRing.visible = false
        r.nameplate.style.display = 'none'
        return
      }
      r.mesh.visible = true
      const snaps = r.snapshots
      if (snaps.length === 0) return
      let a = snaps[0]!
      let b = snaps[snaps.length - 1]!
      for (let i = 0; i < snaps.length - 1; i++) {
        const s1 = snaps[i]!
        const s2 = snaps[i + 1]!
        if (s1.at <= renderAt && s2.at >= renderAt) { a = s1; b = s2; break }
      }
      const span = b.at - a.at
      const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (renderAt - a.at) / span))
      const x = a.x + (b.x - a.x) * t
      const y = a.y + (b.y - a.y) * t
      const z = a.z + (b.z - a.z) * t
      const rIdleBob = Math.sin(now * 0.0028 + r.mesh.id * 0.618) * 0.014
      r.mesh.position.set(x, y + rIdleBob, z)
      let dyaw = b.yaw - a.yaw
      if (dyaw > Math.PI) dyaw -= 2 * Math.PI
      if (dyaw < -Math.PI) dyaw += 2 * Math.PI
      const yawNow = a.yaw + dyaw * t
      r.mesh.rotation.y = yawNow
      if (r.arc.visible && now < r.arcExpiresAt) {
        const life = 1 - (r.arcExpiresAt - now) / 400
        r.arc.position.set(x, y, z)
        r.arc.rotation.set(Math.PI / 2, yawNow + SWING_ARC_YAW_OFFSET, 0, 'YXZ')
        ;(r.arc.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - life)
      } else {
        r.arc.visible = false
      }
      if (r.castRing.visible) r.castRing.position.set(x, y + capsuleHeightM + 0.1, z)
      const npWorld = new THREE.Vector3(x, y + capsuleHeightM + 0.4, z)
      npWorld.project(camera)
      if (npWorld.z <= 1) {
        const sx = (npWorld.x * 0.5 + 0.5) * domElement.clientWidth
        const sy = (-npWorld.y * 0.5 + 0.5) * domElement.clientHeight
        r.nameplate.style.left = `${sx}px`
        r.nameplate.style.top = `${sy}px`
        r.nameplate.style.display = ''
        const pct = Math.max(0, Math.min(1, r.hp / HP_MAX))
        r.hpFill.style.width = `${pct * 100}%`
        if (pct > 0.55) {
          r.hpFill.style.background = 'linear-gradient(90deg,#1a8a3a,#2ec850,#70f090)'
          r.nameplate.style.boxShadow = ''
        } else if (pct > 0.28) {
          r.hpFill.style.background = 'linear-gradient(90deg,#a87010,#d4a020,#f0c840)'
          r.nameplate.style.boxShadow = ''
        } else {
          r.hpFill.style.background = 'linear-gradient(90deg,#c82020,#f04040,#ff7070)'
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.007)
          const gAlpha = (0.25 + pulse * 0.35).toFixed(2)
          r.nameplate.style.boxShadow = `0 0 ${10 + pulse * 14}px rgba(220,30,30,${gAlpha}), 0 2px 12px rgba(0,0,0,0.6)`
        }
      } else {
        r.nameplate.style.display = 'none'
      }
    })
  }

  function renderEmissives(
    now: number,
    tickNow: number,
    statusEmissive: Record<string, number>,
    getPlayers: () => Map<string, RemotePlayerSchema> | null,
  ): void {
    remotePlayers.forEach((r, sid) => {
      const p = getPlayers()?.get(sid)
      if (!p || !r.alive) return
      const mat = r.mesh.userData['armorMat'] as THREE.MeshToonMaterial | undefined
      if (!mat?.emissive) return
      let tR = 0, tG = 0, tB = 0
      for (const st of Array.from(p.statuses ?? [])) {
        const hex = statusEmissive[st.kind]
        if (hex !== undefined) {
          tR = Math.max(tR, ((hex >> 16) & 0xff) / 255)
          tG = Math.max(tG, ((hex >> 8)  & 0xff) / 255)
          tB = Math.max(tB, ( hex        & 0xff) / 255)
        }
      }
      if (p.invulnUntilTick > tickNow) {
        const pulse = 0.45 + 0.45 * Math.sin(now * 0.025)
        tR = Math.max(tR, pulse * 1.0)
        tG = Math.max(tG, pulse * 0.85)
        tB = Math.max(tB, pulse * 0.2)
      }
      const rBlinkUntil = remoteDamageBlinkUntil.get(sid) ?? 0
      if (now < rBlinkUntil) {
        const bf = 1 - (rBlinkUntil - now) / 160
        const bs = bf < 0.5 ? bf * 2 : (1 - bf) * 2
        tR = Math.max(tR, bs * 0.95)
        tG = Math.max(tG, bs * 0.95)
        tB = Math.max(tB, bs * 0.95)
      } else if (rBlinkUntil > 0) {
        remoteDamageBlinkUntil.delete(sid)
      }
      const LERP = 0.12
      mat.emissive.r += (tR - mat.emissive.r) * LERP
      mat.emissive.g += (tG - mat.emissive.g) * LERP
      mat.emissive.b += (tB - mat.emissive.b) * LERP
      mat.emissiveIntensity = 0.70
    })
  }

  function clear(): void {
    remotePlayers.forEach((r) => disposeRemote(r))
    remotePlayers.clear()
  }

  function getWorldPos(sid: string): THREE.Vector3 | null {
    const r = remotePlayers.get(sid)
    if (!r) return null
    return r.mesh.position.clone().add(new THREE.Vector3(0, capsuleHalfHeightM, 0))
  }

  function setDamageBlink(sid: string, untilMs: number): void {
    remoteDamageBlinkUntil.set(sid, untilMs)
  }

  return { updateFromSchema, renderFrame, renderEmissives, clear, getWorldPos, setDamageBlink }
}
