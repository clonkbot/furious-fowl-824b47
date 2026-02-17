import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Sky, Cloud, Html } from '@react-three/drei'
import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// Game state types
interface Bird {
  id: number
  position: [number, number, number]
  velocity: [number, number, number]
  launched: boolean
  color: string
}

interface Pig {
  id: number
  position: [number, number, number]
  velocity: [number, number, number]
  alive: boolean
}

interface Block {
  id: number
  position: [number, number, number]
  rotation: [number, number, number]
  velocity: [number, number, number]
  type: 'wood' | 'stone' | 'glass'
  destroyed: boolean
}

// Stylized cartoon bird component
function CartoonBird({
  position,
  color,
  onClick,
  isSelected
}: {
  position: [number, number, number]
  color: string
  onClick?: () => void
  isSelected?: boolean
}) {
  const ref = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (ref.current && !isSelected) {
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
    if (ref.current && isSelected) {
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.1)
    }
  })

  return (
    <group ref={ref} position={position} onClick={onClick}>
      {/* Body */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color={hovered ? '#ff6b6b' : color}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Eyes */}
      <group position={[0, 0.15, 0.35]}>
        <mesh position={[-0.15, 0, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.15, 0, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        {/* Pupils */}
        <mesh position={[-0.15, 0, 0.08]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.15, 0, 0.08]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
      {/* Beak */}
      <mesh position={[0, -0.05, 0.45]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.15, 0.3, 3]} />
        <meshStandardMaterial color="#ff9f43" roughness={0.5} />
      </mesh>
      {/* Angry eyebrows */}
      <mesh position={[-0.15, 0.32, 0.35]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.2, 0.06, 0.05]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      <mesh position={[0.15, 0.32, 0.35]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.2, 0.06, 0.05]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      {/* Tail feathers */}
      <mesh position={[0, 0.15, -0.5]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.3, 0.4, 0.1]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0.8, 0]}>
          <coneGeometry args={[0.15, 0.3, 4]} />
          <meshStandardMaterial color="#ffd93d" emissive="#ffd93d" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  )
}

// Flying bird (after launch)
function FlyingBird({
  bird,
  onCollision
}: {
  bird: Bird
  onCollision: (pos: [number, number, number]) => void
}) {
  const ref = useRef<THREE.Group>(null!)
  const velocityRef = useRef(new THREE.Vector3(...bird.velocity))
  const positionRef = useRef(new THREE.Vector3(...bird.position))

  useFrame((_, delta) => {
    if (ref.current) {
      // Apply gravity
      velocityRef.current.y -= 15 * delta

      // Update position
      positionRef.current.add(velocityRef.current.clone().multiplyScalar(delta))
      ref.current.position.copy(positionRef.current)

      // Rotate based on velocity
      ref.current.rotation.z = Math.atan2(velocityRef.current.y, velocityRef.current.x) - Math.PI / 2

      // Check for ground collision or out of bounds
      if (positionRef.current.y < 0.5 || positionRef.current.x > 20) {
        onCollision([positionRef.current.x, positionRef.current.y, positionRef.current.z])
      }
    }
  })

  return (
    <group ref={ref} position={bird.position}>
      <mesh castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={bird.color} roughness={0.3} />
      </mesh>
      {/* Trail effect */}
      <mesh position={[-0.3, 0, 0]} scale={[0.8, 0.8, 0.8]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={bird.color} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

// Cartoon pig enemy
function CartoonPig({
  pig,
  onHit
}: {
  pig: Pig
  onHit: () => void
}) {
  const ref = useRef<THREE.Group>(null!)
  const [wobble, setWobble] = useState(0)

  useFrame((state) => {
    if (ref.current && pig.alive) {
      ref.current.position.y = pig.position[1] + Math.sin(state.clock.elapsedTime * 3 + pig.id) * 0.05
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 2 + pig.id) * 0.05
    }
  })

  if (!pig.alive) return null

  return (
    <group ref={ref} position={pig.position}>
      {/* Body */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#55a630" roughness={0.4} />
      </mesh>
      {/* Snout */}
      <mesh position={[0, -0.1, 0.5]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#80c04a" roughness={0.4} />
      </mesh>
      {/* Nostrils */}
      <mesh position={[-0.08, -0.1, 0.6]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      <mesh position={[0.08, -0.1, 0.6]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.2, 0.2, 0.4]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.2, 0.2, 0.4]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.2, 0.2, 0.52]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.2, 0.2, 0.52]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.4, 0.45, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.15, 0.3, 8]} />
        <meshStandardMaterial color="#55a630" />
      </mesh>
      <mesh position={[0.4, 0.45, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.15, 0.3, 8]} />
        <meshStandardMaterial color="#55a630" />
      </mesh>
    </group>
  )
}

// Building block
function BuildingBlock({
  block
}: {
  block: Block
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const velocityRef = useRef(new THREE.Vector3(...block.velocity))
  const rotVelRef = useRef(new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2
  ))

  const colors = {
    wood: '#c4a35a',
    stone: '#7d7d7d',
    glass: '#87ceeb'
  }

  const materials = {
    wood: { roughness: 0.8, metalness: 0 },
    stone: { roughness: 0.9, metalness: 0.1 },
    glass: { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7 }
  }

  useFrame((_, delta) => {
    if (ref.current && block.destroyed) {
      velocityRef.current.y -= 20 * delta
      ref.current.position.add(velocityRef.current.clone().multiplyScalar(delta))
      ref.current.rotation.x += rotVelRef.current.x * delta
      ref.current.rotation.y += rotVelRef.current.y * delta
      ref.current.rotation.z += rotVelRef.current.z * delta
    }
  })

  if (block.destroyed && ref.current && ref.current.position.y < -5) return null

  return (
    <mesh
      ref={ref}
      position={block.position}
      rotation={block.rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 0.4, 0.4]} />
      <meshStandardMaterial
        color={colors[block.type]}
        {...materials[block.type]}
      />
    </mesh>
  )
}

// Slingshot
function Slingshot({
  position,
  pullBack,
  angle
}: {
  position: [number, number, number]
  pullBack: number
  angle: number
}) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      {/* Left fork */}
      <mesh position={[-0.25, 1.3, 0]} rotation={[0, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      {/* Right fork */}
      <mesh position={[0.25, 1.3, 0]} rotation={[0, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      {/* Rubber band - left */}
      {pullBack > 0 && (
        <>
          <mesh position={[-0.35 - pullBack * 0.3 * Math.cos(angle), 1.6 - pullBack * 0.3 * Math.sin(angle), 0]}>
            <cylinderGeometry args={[0.02, 0.02, pullBack * 2, 8]} />
            <meshStandardMaterial color="#e74c3c" />
          </mesh>
        </>
      )}
    </group>
  )
}

// Ground with grass texture feel
function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#7cb342" roughness={1} />
      </mesh>
      {/* Grass tufts */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.random() * 30 - 10,
            0.1,
            Math.random() * 10 - 5
          ]}
          rotation={[0, Math.random() * Math.PI, 0]}
        >
          <coneGeometry args={[0.1, 0.3, 4]} />
          <meshStandardMaterial color="#558b2f" />
        </mesh>
      ))}
    </group>
  )
}

// Trajectory preview dots
function TrajectoryPreview({
  startPos,
  velocity
}: {
  startPos: [number, number, number]
  velocity: [number, number, number]
}) {
  const points: [number, number, number][] = []
  let x = startPos[0]
  let y = startPos[1]
  let vx = velocity[0]
  let vy = velocity[1]

  for (let i = 0; i < 20; i++) {
    points.push([x, Math.max(0.5, y), startPos[2]])
    const dt = 0.1
    x += vx * dt
    vy -= 15 * dt
    y += vy * dt
    if (y < 0.5) break
  }

  return (
    <>
      {points.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.08 * (1 - i * 0.03), 8, 8]} />
          <meshStandardMaterial
            color="#ffd93d"
            transparent
            opacity={1 - i * 0.05}
            emissive="#ffd93d"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </>
  )
}

// Explosion particles
function Explosion({ position }: { position: [number, number, number] }) {
  const particles = useRef<THREE.Group>(null!)
  const [visible, setVisible] = useState(true)
  const startTime = useRef(Date.now())

  const particleData = useRef(
    Array.from({ length: 15 }).map(() => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 10
      ),
      color: ['#ff6b6b', '#ffd93d', '#ff9f43', '#ffffff'][Math.floor(Math.random() * 4)]
    }))
  )

  useFrame(() => {
    if (!particles.current) return
    const elapsed = (Date.now() - startTime.current) / 1000
    if (elapsed > 1) {
      setVisible(false)
      return
    }

    particles.current.children.forEach((child, i) => {
      const data = particleData.current[i]
      child.position.x += data.velocity.x * 0.016
      child.position.y += data.velocity.y * 0.016
      data.velocity.y -= 15 * 0.016
      child.position.z += data.velocity.z * 0.016
      child.scale.setScalar(1 - elapsed)
    })
  })

  if (!visible) return null

  return (
    <group ref={particles} position={position}>
      {particleData.current.map((data, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial
            color={data.color}
            emissive={data.color}
            emissiveIntensity={1}
          />
        </mesh>
      ))}
    </group>
  )
}

// Main game scene
function GameScene({
  gameState,
  setGameState
}: {
  gameState: {
    birds: Bird[]
    pigs: Pig[]
    blocks: Block[]
    currentBird: number
    score: number
    pullBack: number
    angle: number
    explosions: { id: number; position: [number, number, number] }[]
  }
  setGameState: React.Dispatch<React.SetStateAction<typeof gameState>>
}) {
  const slingshotPos: [number, number, number] = [-8, 0, 0]

  const handleBirdCollision = useCallback((birdId: number, pos: [number, number, number]) => {
    setGameState(prev => {
      const newPigs = prev.pigs.map(pig => {
        const dist = Math.sqrt(
          Math.pow(pos[0] - pig.position[0], 2) +
          Math.pow(pos[1] - pig.position[1], 2)
        )
        if (dist < 2 && pig.alive) {
          return { ...pig, alive: false }
        }
        return pig
      })

      const newBlocks = prev.blocks.map(block => {
        const dist = Math.sqrt(
          Math.pow(pos[0] - block.position[0], 2) +
          Math.pow(pos[1] - block.position[1], 2)
        )
        if (dist < 1.5 && !block.destroyed) {
          return {
            ...block,
            destroyed: true,
            velocity: [
              (Math.random() - 0.5) * 5,
              Math.random() * 5 + 2,
              (Math.random() - 0.5) * 5
            ] as [number, number, number]
          }
        }
        return block
      })

      const killedPigs = prev.pigs.filter(p => p.alive).length - newPigs.filter(p => p.alive).length
      const destroyedBlocks = newBlocks.filter(b => b.destroyed).length - prev.blocks.filter(b => b.destroyed).length

      const newExplosions = [...prev.explosions]
      if (killedPigs > 0 || destroyedBlocks > 0) {
        newExplosions.push({ id: Date.now(), position: pos })
      }

      return {
        ...prev,
        birds: prev.birds.map(b =>
          b.id === birdId ? { ...b, launched: false, position: [-100, -100, 0] as [number, number, number] } : b
        ),
        pigs: newPigs,
        blocks: newBlocks,
        score: prev.score + killedPigs * 1000 + destroyedBlocks * 100,
        currentBird: prev.currentBird + 1,
        explosions: newExplosions
      }
    })
  }, [setGameState])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[-5, 10, -5]} intensity={0.5} color="#ffd93d" />

      {/* Environment */}
      <Sky sunPosition={[100, 20, 100]} turbidity={0.3} rayleigh={0.5} />
      <Cloud position={[-10, 15, -10]} speed={0.2} opacity={0.5} />
      <Cloud position={[10, 12, -15]} speed={0.3} opacity={0.4} />
      <Cloud position={[0, 18, -20]} speed={0.1} opacity={0.6} />

      {/* Ground */}
      <Ground />

      {/* Slingshot */}
      <Slingshot
        position={slingshotPos}
        pullBack={gameState.pullBack}
        angle={gameState.angle}
      />

      {/* Waiting birds */}
      {gameState.birds.slice(gameState.currentBird + 1).map((bird, i) => (
        <CartoonBird
          key={bird.id}
          position={[-10 - i * 1.2, 0.5, 0]}
          color={bird.color}
        />
      ))}

      {/* Current bird on slingshot */}
      {gameState.currentBird < gameState.birds.length &&
       !gameState.birds[gameState.currentBird].launched && (
        <CartoonBird
          position={[
            slingshotPos[0] - gameState.pullBack * Math.cos(gameState.angle),
            slingshotPos[1] + 1.5 - gameState.pullBack * Math.sin(gameState.angle),
            0
          ]}
          color={gameState.birds[gameState.currentBird].color}
          isSelected={true}
        />
      )}

      {/* Trajectory preview */}
      {gameState.pullBack > 0 && gameState.currentBird < gameState.birds.length && (
        <TrajectoryPreview
          startPos={[
            slingshotPos[0] - gameState.pullBack * Math.cos(gameState.angle),
            slingshotPos[1] + 1.5 - gameState.pullBack * Math.sin(gameState.angle),
            0
          ]}
          velocity={[
            gameState.pullBack * 8 * Math.cos(gameState.angle),
            gameState.pullBack * 8 * Math.sin(gameState.angle),
            0
          ]}
        />
      )}

      {/* Flying birds */}
      {gameState.birds.map(bird =>
        bird.launched && (
          <FlyingBird
            key={bird.id}
            bird={bird}
            onCollision={(pos) => handleBirdCollision(bird.id, pos)}
          />
        )
      )}

      {/* Pigs */}
      {gameState.pigs.map(pig => (
        <CartoonPig
          key={pig.id}
          pig={pig}
          onHit={() => {}}
        />
      ))}

      {/* Blocks */}
      {gameState.blocks.map(block => (
        <BuildingBlock key={block.id} block={block} />
      ))}

      {/* Explosions */}
      {gameState.explosions.map(exp => (
        <Explosion key={exp.id} position={exp.position} />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        minDistance={5}
        maxDistance={30}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[3, 3, 0]}
      />
    </>
  )
}

// Initial game state factory
function createInitialGameState() {
  return {
    birds: [
      { id: 1, position: [-8, 1.5, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], launched: false, color: '#e74c3c' },
      { id: 2, position: [-9, 0.5, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], launched: false, color: '#f1c40f' },
      { id: 3, position: [-10, 0.5, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], launched: false, color: '#3498db' },
    ],
    pigs: [
      { id: 1, position: [8, 0.6, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], alive: true },
      { id: 2, position: [10, 2.6, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], alive: true },
      { id: 3, position: [12, 0.6, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], alive: true },
    ],
    blocks: [
      // Ground level structure
      { id: 1, position: [7, 0.2, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'wood' as const, destroyed: false },
      { id: 2, position: [9, 0.2, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'wood' as const, destroyed: false },
      { id: 3, position: [11, 0.2, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'wood' as const, destroyed: false },
      { id: 4, position: [13, 0.2, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'wood' as const, destroyed: false },
      // First floor
      { id: 5, position: [8, 1.2, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'stone' as const, destroyed: false },
      { id: 6, position: [12, 1.2, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'stone' as const, destroyed: false },
      // Second level supports
      { id: 7, position: [9, 1.8, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'glass' as const, destroyed: false },
      { id: 8, position: [11, 1.8, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'glass' as const, destroyed: false },
      // Roof
      { id: 9, position: [10, 2.6, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], type: 'wood' as const, destroyed: false },
    ],
    currentBird: 0,
    score: 0,
    pullBack: 0,
    angle: Math.PI / 4,
    explosions: [] as { id: number; position: [number, number, number] }[]
  }
}

export default function App() {
  const [gameState, setGameState] = useState(createInitialGameState)
  const [isDragging, setIsDragging] = useState(false)
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const canvasRef = useRef<HTMLDivElement>(null)

  // Check win/lose conditions
  useEffect(() => {
    const alivePigs = gameState.pigs.filter(p => p.alive).length
    const remainingBirds = gameState.birds.length - gameState.currentBird

    if (alivePigs === 0) {
      setGameStatus('won')
    } else if (remainingBirds === 0 && !gameState.birds.some(b => b.launched)) {
      setGameStatus('lost')
    }
  }, [gameState])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameState.currentBird >= gameState.birds.length) return
    if (gameState.birds[gameState.currentBird].launched) return
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // Calculate pullback and angle based on mouse position
    const centerX = 0.2 // Slingshot approximate position
    const centerY = 0.5

    const dx = centerX - x
    const dy = y - centerY

    const pullBack = Math.min(3, Math.sqrt(dx * dx + dy * dy) * 10)
    const angle = Math.atan2(dy, dx)

    setGameState(prev => ({
      ...prev,
      pullBack: Math.max(0, pullBack),
      angle: Math.max(-Math.PI / 6, Math.min(Math.PI / 2.5, angle))
    }))
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (gameState.pullBack > 0.5 && gameState.currentBird < gameState.birds.length) {
      const velocity: [number, number, number] = [
        gameState.pullBack * 8 * Math.cos(gameState.angle),
        gameState.pullBack * 8 * Math.sin(gameState.angle),
        0
      ]

      setGameState(prev => ({
        ...prev,
        birds: prev.birds.map((b, i) =>
          i === prev.currentBird
            ? {
                ...b,
                launched: true,
                velocity,
                position: [
                  -8 - prev.pullBack * Math.cos(prev.angle),
                  1.5 - prev.pullBack * Math.sin(prev.angle),
                  0
                ] as [number, number, number]
              }
            : b
        ),
        pullBack: 0
      }))
    } else {
      setGameState(prev => ({ ...prev, pullBack: 0 }))
    }
  }

  const resetGame = () => {
    setGameState(createInitialGameState())
    setGameStatus('playing')
  }

  const pigsAlive = gameState.pigs.filter(p => p.alive).length
  const birdsLeft = gameState.birds.length - gameState.currentBird

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-sky-300 to-sky-500">
      {/* Game Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <Canvas
          shadows
          camera={{ position: [0, 8, 18], fov: 50 }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <GameScene gameState={gameState} setGameState={setGameState} />
          </Suspense>
        </Canvas>
      </div>

      {/* HUD - Score and Stats */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 pointer-events-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Title */}
          <div className="pointer-events-auto">
            <h1
              className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg"
              style={{ fontFamily: 'Bangers, cursive', letterSpacing: '0.05em' }}
            >
              <span className="text-red-500">FURIOUS</span>{' '}
              <span className="text-yellow-400">FOWL</span>
            </h1>
            <p
              className="text-white/80 text-sm md:text-base mt-1"
              style={{ fontFamily: 'Quicksand, sans-serif' }}
            >
              Drag to aim • Release to launch
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-3 md:gap-4 pointer-events-auto">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2 md:px-6 md:py-3">
              <div
                className="text-yellow-400 text-2xl md:text-4xl font-bold"
                style={{ fontFamily: 'Bangers, cursive' }}
              >
                {gameState.score.toLocaleString()}
              </div>
              <div
                className="text-white/70 text-xs md:text-sm uppercase tracking-wider"
                style={{ fontFamily: 'Quicksand, sans-serif' }}
              >
                Score
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2 md:px-6 md:py-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl md:text-3xl">🐦</span>
                <span
                  className="text-white text-2xl md:text-4xl font-bold"
                  style={{ fontFamily: 'Bangers, cursive' }}
                >
                  {birdsLeft}
                </span>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2 md:px-6 md:py-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl md:text-3xl">🐷</span>
                <span
                  className="text-white text-2xl md:text-4xl font-bold"
                  style={{ fontFamily: 'Bangers, cursive' }}
                >
                  {pigsAlive}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Power indicator */}
      {gameState.pullBack > 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-6 py-3">
            <div className="flex items-center gap-3">
              <span
                className="text-white text-lg"
                style={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}
              >
                POWER
              </span>
              <div className="w-32 h-4 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, gameState.pullBack / 3 * 100)}%`,
                    background: gameState.pullBack < 1 ? '#ffd93d' : gameState.pullBack < 2 ? '#ff9f43' : '#e74c3c'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Over / Win Modal */}
      {(gameStatus === 'won' || gameStatus === 'lost') && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl p-8 md:p-12 text-center shadow-2xl max-w-md w-full"
            style={{
              border: '4px solid #c4a35a',
              boxShadow: '0 0 60px rgba(255, 200, 100, 0.3)'
            }}
          >
            <h2
              className={`text-4xl md:text-6xl font-bold mb-4 ${gameStatus === 'won' ? 'text-green-600' : 'text-red-600'}`}
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              {gameStatus === 'won' ? '🎉 VICTORY! 🎉' : '💥 GAME OVER 💥'}
            </h2>
            <p
              className="text-2xl md:text-3xl text-amber-800 mb-2"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              Score: {gameState.score.toLocaleString()}
            </p>
            <p
              className="text-amber-700 mb-8"
              style={{ fontFamily: 'Quicksand, sans-serif' }}
            >
              {gameStatus === 'won'
                ? 'All pigs have been defeated!'
                : 'You ran out of birds!'}
            </p>
            <button
              onClick={resetGame}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-xl md:text-2xl px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
              style={{ fontFamily: 'Bangers, cursive', letterSpacing: '0.05em' }}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Instructions toast - mobile */}
      <div className="absolute bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-4 md:w-72 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 text-white/80 text-sm" style={{ fontFamily: 'Quicksand, sans-serif' }}>
          <p className="font-semibold text-white mb-1">How to play:</p>
          <ul className="space-y-1 text-xs md:text-sm">
            <li>• Drag from the bird to aim</li>
            <li>• Release to launch</li>
            <li>• Destroy all pigs to win!</li>
            <li>• Orbit camera with mouse/touch</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="absolute bottom-2 left-0 right-0 text-center text-white/50 text-xs"
        style={{ fontFamily: 'Quicksand, sans-serif' }}
      >
        Requested by @vladyy__01 · Built by @clonkbot
      </footer>
    </div>
  )
}
