import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, RapierRigidBody, useRapier } from '@react-three/rapier';
import { Vector3 } from 'three';
import { PHYSICS } from '../../config/GameData';

const CAPSULE_RADIUS = 0.5;
const CAPSULE_HEIGHT = 1.8;
const CAMERA_HEIGHT = 1.6;

export default function PlayerController() {
  const { camera } = useThree();
  const { rapier, world } = useRapier();
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  
  // Player velocity state
  const [velocity] = useState(() => new Vector3(0, 0, 0));
  
  // Ground detection
  const [, setIsGrounded] = useState(false);
  
  // Keyboard input
  const [, getKeys] = useKeyboardControls();

  useFrame((_state, delta) => {
    if (!rigidBodyRef.current) return;

    const body = rigidBodyRef.current;
    const position = body.translation();
    const keys = getKeys();

    // Get input direction
    const inputVector = new Vector3(
      (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
      0,
      (keys.backward ? 1 : 0) - (keys.forward ? 1 : 0)
    );

    // Normalize input to prevent faster diagonal movement
    if (inputVector.length() > 0) {
      inputVector.normalize();
    }

    // Rotate input relative to camera (for 3rd person controls)
    // For now, we'll keep it simple and use world-space movement
    const moveSpeed = keys.sprint ? PHYSICS.MOVE_SPEED * PHYSICS.SPRINT_MULT : PHYSICS.MOVE_SPEED;

    // Ground check using ray cast
    const rayOrigin = { x: position.x, y: position.y, z: position.z };
    const rayDirection = { x: 0, y: -1, z: 0 };
    const maxToi = CAPSULE_HEIGHT / 2 + 0.1; // Slightly below the capsule
    
    const ray = new rapier.Ray(rayOrigin, rayDirection);
    const hit = world.castRay(ray, maxToi, true);
    
    const nowGrounded = hit !== null && hit.timeOfImpact < maxToi;
    setIsGrounded(nowGrounded);

    // Apply gravity
    if (!nowGrounded) {
      velocity.y -= PHYSICS.GRAVITY * delta;
    } else {
      // Stop falling when on ground
      if (velocity.y < 0) {
        velocity.y = 0;
      }
    }

    // Jump logic
    if (keys.jump && nowGrounded) {
      velocity.y = PHYSICS.JUMP_FORCE;
      setIsGrounded(false);
    }

    // Horizontal movement
    const controlFactor = nowGrounded ? 1.0 : PHYSICS.AIR_CONTROL;
    
    if (inputVector.length() > 0) {
      // Apply movement
      velocity.x = inputVector.x * moveSpeed * controlFactor;
      velocity.z = inputVector.z * moveSpeed * controlFactor;
    } else if (nowGrounded) {
      // Apply friction when on ground and no input
      velocity.x *= Math.max(0, 1 - PHYSICS.FRICTION * delta);
      velocity.z *= Math.max(0, 1 - PHYSICS.FRICTION * delta);
      
      // Stop completely if very slow
      if (Math.abs(velocity.x) < 0.1) velocity.x = 0;
      if (Math.abs(velocity.z) < 0.1) velocity.z = 0;
    }

    // Use kinematic movement with collision detection
    const collider = body.collider(0);
    const desiredMovement = {
      x: velocity.x * delta,
      y: velocity.y * delta,
      z: velocity.z * delta,
    };

    // Character controller movement
    const characterController = world.createCharacterController(0.01);
    characterController.computeColliderMovement(
      collider,
      desiredMovement
    );

    const correctedMovement = characterController.computedMovement();
    
    // Apply the corrected movement
    body.setNextKinematicTranslation({
      x: position.x + correctedMovement.x,
      y: position.y + correctedMovement.y,
      z: position.z + correctedMovement.z,
    });

    // Update camera position to follow player
    const updatedPosition = body.translation();
    camera.position.set(
      updatedPosition.x,
      updatedPosition.y + CAMERA_HEIGHT,
      updatedPosition.z + 5
    );
    
    // Camera look at player head
    camera.lookAt(updatedPosition.x, updatedPosition.y + CAMERA_HEIGHT, updatedPosition.z);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      colliders="hull"
      position={[0, 5, 0]}
      enabledRotations={[false, false, false]}
    >
      {/* Visual representation - Capsule */}
      <mesh castShadow>
        <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_HEIGHT, 16, 32]} />
        <meshStandardMaterial color="#00ff00" wireframe={false} />
      </mesh>
      
      {/* Head marker for debugging */}
      <mesh position={[0, CAPSULE_HEIGHT / 2 + CAPSULE_RADIUS, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </RigidBody>
  );
}
