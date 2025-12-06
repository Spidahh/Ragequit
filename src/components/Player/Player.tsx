import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import { PerspectiveCamera, PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../../store/gameStore'
import { SKILL_REGISTRY } from '../../data/SkillRegistry'

const SPEED = 12
const JUMP_FORCE = 15

export default function Player() {
  const body = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const { activeSlot, loadout, setActiveSlot } = useGameStore()

  // INPUT STATE
  const [input, setInput] = useState({
    w: false,
    s: false,
    a: false,
    d: false,
    space: false,
  })

  // KEYBOARD LISTENERS
  useEffect(() => {
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      const key = e.key.toLowerCase()
      switch (key) {
        case 'w':
          setInput((i) => ({ ...i, w: isDown }))
          break
        case 's':
          setInput((i) => ({ ...i, s: isDown }))
          break
        case 'a':
          setInput((i) => ({ ...i, a: isDown }))
          break
        case 'd':
          setInput((i) => ({ ...i, d: isDown }))
          break
        case ' ':
          setInput((i) => ({ ...i, space: isDown }))
          e.preventDefault()
          break
      }

      if (isDown) {
        if (key === '1') setActiveSlot(0)
        if (key === '2') setActiveSlot(1)
        if (key === '3') setActiveSlot(2)
      }
    }

    window.addEventListener('keydown', (e) => handleKey(e, true))
    window.addEventListener('keyup', (e) => handleKey(e, false))

    return () => {
      window.removeEventListener('keydown', (e) => handleKey(e, true))
      window.removeEventListener('keyup', (e) => handleKey(e, false))
    }
  }, [setActiveSlot])

  // LOGICA CAMBIO VISUALE
  const currentSkillId = loadout[activeSlot]
  const currentSkill = SKILL_REGISTRY.find((s) => s.id === currentSkillId)
  // Default a FPS se non trova skill, TPS se è Melee/Ranged
  const isTPS = currentSkill
    ? currentSkill.type === 'MELEE' || currentSkill.type === 'RANGED'
    : false

  useFrame((state) => {
    if (!body.current) return

    // 1. MOVIMENTO FISICO
    const velocity = body.current.linvel()
    const { w, s, a, d, space } = input

    // Direzione relativa alla camera
    // Importante: PointerLockControls ruota la camera, noi prendiamo quella rotazione
    const frontVector = new THREE.Vector3(0, 0, Number(s) - Number(w))
    const sideVector = new THREE.Vector3(Number(a) - Number(d), 0, 0)
    const direction = new THREE.Vector3()

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(state.camera.rotation) // Usa la rotazione globale della camera

    let jumpY = velocity.y
    if (space && Math.abs(velocity.y) < 0.1) jumpY = JUMP_FORCE

    body.current.setLinvel({ x: direction.x, y: jumpY, z: direction.z }, true)

    // 2. CAMERA LERP (FPS <-> TPS)
    if (cameraRef.current) {
      const targetPos = isTPS
        ? new THREE.Vector3(0, 1.5, 4)
        : new THREE.Vector3(0, 0.5, 0)
      cameraRef.current.position.lerp(targetPos, 0.1)
    }
  })

  return (
    <RigidBody ref={body} colliders={false} lockRotations position={[0, 5, 0]}>
      <CapsuleCollider args={[0.75, 0.5]} />

      {/* CAMERA INTERNA - Si muove col corpo */}
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0.5, 0]} />
      <PointerLockControls />

      {/* MESH VISIVA (Visibile solo in TPS) */}
      <group visible={isTPS}>
        <mesh castShadow>
          <capsuleGeometry args={[0.5, 1.5, 4, 8]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        {/* Naso (per vedere dove guardi in TPS) */}
        <mesh position={[0, 0.5, -0.5]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </group>
    </RigidBody>
  )
}
