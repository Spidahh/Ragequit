/**
 * CAMERA RIG
 * 
 * Manages dynamic camera switching between FPS (Magic Casting) and TPS (Melee/Ranged Awareness)
 * Per BIBLE Section 3: Hybrid Perspective
 * 
 * FPS MODE: Testa (Head position, for instant cast magic)
 * TPS MODE: Spalle (Over-the-shoulder, for melee/ranged awareness)
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../store/gameStore'
import { getSkillByLoadoutSlot } from '../../data/SkillRegistry'

export interface CameraRigProps {
  playerPosition: THREE.Vector3 // Player's RigidBody position
}

export function CameraRig({ playerPosition }: CameraRigProps) {
  const { camera } = useThree()
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0))
  const currentCameraRef = useRef(new THREE.Vector3(0, 0, 0))

  // Get active skill to determine camera mode
  const loadout = useGameStore((state) => state.loadout)
  const activeSlot = useGameStore((state) => state.activeSlot)
  const equippedSkill = getSkillByLoadoutSlot(loadout, activeSlot)

  // Determine if we should be in FPS or TPS mode
  const isFpsMode = equippedSkill?.type === 'MAGIC'

  useFrame(() => {
    if (!playerPosition) return

    // Target camera position (local to player)
    let targetOffset: [number, number, number]

    if (isFpsMode) {
      // FPS MODE: Head position (testa)
      // Player looking down the sights
      targetOffset = [0, 0.2, 0]
    } else {
      // TPS MODE: Over-the-shoulder (spalle)
      // Behind and above for awareness
      targetOffset = [0, 1.5, 4]
    }

    // Convert local offset to world position
    cameraTargetRef.current.set(
      playerPosition.x + targetOffset[0],
      playerPosition.y + targetOffset[1],
      playerPosition.z + targetOffset[2]
    )

    // Smooth camera movement (lerp)
    currentCameraRef.current.lerp(cameraTargetRef.current, 0.1)

    // Apply to three.js camera
    camera.position.copy(currentCameraRef.current)
    camera.lookAt(
      playerPosition.x,
      playerPosition.y + 0.5, // Look at chest level
      playerPosition.z
    )
  })

  // Return null - this component only manages camera, no visible mesh
  return null
}
