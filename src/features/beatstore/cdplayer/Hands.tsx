import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { swapEasings } from './useCDSwap'

interface HandsProps {
  /** Overall swap progress, 0 = idle off-stage, 1 = retract complete. */
  progress: number
  swapping: boolean
}

// Friendly palette: pastel mint chassis, lavender accents, warm coral glow.
const MINT = '#A8E6D0'
const LAVENDER = '#B6A8FF'
const CORAL = '#FFB48A'

/**
 * Two stylised "robot/alien" hands that glide in from off-stage during a
 * CD swap, grip the disc, lift, place, and retract. Modelled from primitives
 * (no GLTF assets). Friendly vibe: pastel mint + lavender, rounded shapes,
 * soft emissive joints.
 */
export function Hands({ progress, swapping }: HandsProps) {
  // Subtle idle hover so the hands feel alive even when off-stage.
  const tRef = useRef(0)
  const leftRef = useRef<THREE.Group>(null)
  const rightRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    tRef.current += delta
    const approach = swapping ? swapEasings.handsApproach(progress) : 0
    const lift = swapping ? swapEasings.handsLift(progress) : 0
    const hover = Math.sin(tRef.current * 2.4) * 0.04

    // Off-stage rest position is x = ±3.2 (well outside the visualiser ring).
    // Grip position is at x = ±1.8 (just outside the disc).
    const restX = 3.2
    const gripX = 1.85
    const x = restX + (gripX - restX) * approach
    const y = 0.05 + lift + hover * (1 - approach * 0.7)
    const tilt = (1 - approach) * 0.35 // rotated outward when off-stage

    if (leftRef.current) {
      leftRef.current.position.set(-x, y, 0)
      leftRef.current.rotation.set(0, Math.PI - tilt, 0)
    }
    if (rightRef.current) {
      rightRef.current.position.set(x, y, 0)
      rightRef.current.rotation.set(0, tilt, 0)
    }
  })

  return (
    <>
      <group ref={leftRef}>
        <Hand grip={swapping ? swapEasings.handsApproach(progress) : 0} />
      </group>
      <group ref={rightRef}>
        <Hand grip={swapping ? swapEasings.handsApproach(progress) : 0} />
      </group>
    </>
  )
}

function Hand({ grip }: { grip: number }) {
  // Forearm + palm + 3 fingers. The fingers tilt inward as `grip` → 1.
  const fingerCurl = useMemo(() => {
    return (base: number) => base + grip * 0.55
  }, [grip])

  return (
    <group>
      {/* Forearm */}
      <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.16, 0.9, 6, 12]} />
        <meshStandardMaterial color={MINT} metalness={0.45} roughness={0.4} />
      </mesh>

      {/* Wrist ring — glowing */}
      <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.18, 0.04, 12, 32]} />
        <meshStandardMaterial color={LAVENDER} emissive={LAVENDER} emissiveIntensity={1.4} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Palm */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.22, 24, 18]} />
        <meshStandardMaterial color={MINT} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Knuckle glow */}
      <mesh position={[-0.05, 0.1, 0]}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={1.6} />
      </mesh>

      {/* Three friendly fingers — slight curl on grip */}
      <Finger position={[-0.15, 0.08, 0.1]} rotation={[0, 0, fingerCurl(-0.2)]} />
      <Finger position={[-0.18, 0.0, 0]} rotation={[0, 0, fingerCurl(-0.05)]} />
      <Finger position={[-0.15, -0.08, -0.1]} rotation={[0, 0, fingerCurl(0.1)]} />

      {/* Thumb */}
      <Finger position={[0.05, -0.15, 0.05]} rotation={[0, 0, fingerCurl(-0.6)]} length={0.22} thickness={0.05} />
    </group>
  )
}

function Finger({
  position,
  rotation,
  length = 0.28,
  thickness = 0.045,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  length?: number
  thickness?: number
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[-length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[thickness, length, 4, 8]} />
        <meshStandardMaterial color={MINT} metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[-length - thickness * 0.6, 0, 0]}>
        <sphereGeometry args={[thickness * 1.1, 12, 8]} />
        <meshStandardMaterial color={LAVENDER} emissive={LAVENDER} emissiveIntensity={0.6} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}
