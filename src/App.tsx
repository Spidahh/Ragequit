import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import Player from './components/Player/Player'

export default function App() {
  return (
    <Canvas
      shadows
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Physics gravity={[0, -30, 0]}>
        {/* Ground */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[50, 0.5, 50]} position={[0, 0, 0]} />
          <mesh position={[0, 0, 0]} receiveShadow>
            <boxGeometry args={[100, 1, 100]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
        </RigidBody>

        {/* Player */}
        <Player />
      </Physics>
    </Canvas>
  )
}
