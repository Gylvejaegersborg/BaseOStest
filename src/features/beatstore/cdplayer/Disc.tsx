import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import type { Beat } from '@/data/beats'
import { generateLabelTexture } from './textures'

interface DiscProps {
  beat: Beat
  playing: boolean
  /** Y offset for hand-driven lift animation. */
  lift?: number
  /** Opacity for fade in/out during a swap. */
  opacity?: number
  /** Radial scale (1 = normal). */
  scale?: number
}

export function Disc({ beat, playing, lift = 0, opacity = 1, scale = 1 }: DiscProps) {
  const groupRef = useRef<THREE.Group>(null)
  const rotRef = useRef(0)

  // Faster beats spin a touch faster — friendly, not literal.
  const angularVelocity = useMemo(() => (beat.bpm / 120) * 0.6, [beat.bpm])

  useFrame((_, delta) => {
    if (playing) rotRef.current += angularVelocity * delta
    if (groupRef.current) groupRef.current.rotation.y = rotRef.current
  })

  return (
    <group ref={groupRef} position={[0, lift, 0]} scale={scale}>
      {/* The disc body (slightly thick cylinder) */}
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[1.6, 1.6, 0.04, 96]} />
        <meshStandardMaterial color="#0a0a0d" metalness={0.6} roughness={0.35} transparent opacity={opacity} />
      </mesh>

      {/* Edge rim shimmer — colourful chromatic */}
      <mesh position={[0, 0.022, 0]}>
        <ringGeometry args={[1.55, 1.6, 96]} />
        <meshBasicMaterial color="#CCFF00" transparent opacity={0.5 * opacity} side={THREE.DoubleSide} />
      </mesh>

      {/* Cover art / generated label on top */}
      <CoverFace beat={beat} opacity={opacity} />

      {/* Inner ring */}
      <mesh position={[0, 0.024, 0]}>
        <ringGeometry args={[0.22, 0.26, 64]} />
        <meshBasicMaterial color="#F4F3EE" transparent opacity={0.7 * opacity} side={THREE.DoubleSide} />
      </mesh>

      {/* Centre hole (matte) */}
      <mesh position={[0, 0.026, 0]}>
        <circleGeometry args={[0.18, 64]} />
        <meshBasicMaterial color="#0B0B0E" transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>

      {/* Bottom face — subtle iridescent gradient */}
      <mesh position={[0, -0.022, 0]} rotation={[Math.PI, 0, 0]}>
        <circleGeometry args={[1.58, 96]} />
        <meshStandardMaterial
          color={beat.gradient[0]}
          emissive={beat.gradient[1]}
          emissiveIntensity={0.25}
          metalness={0.9}
          roughness={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  )
}

function CoverFace({ beat, opacity }: { beat: Beat; opacity: number }) {
  // Try the cover image; on error fall back to a generated label texture.
  const [imageFailed, setImageFailed] = useState(!beat.coverImage)

  useEffect(() => {
    setImageFailed(!beat.coverImage)
  }, [beat.coverImage])

  // Probe the image — three's TextureLoader doesn't gracefully report 404s,
  // so we do a separate HEAD-ish check via a plain Image element before loading.
  useEffect(() => {
    if (!beat.coverImage) return
    const img = new Image()
    img.onload = () => setImageFailed(false)
    img.onerror = () => setImageFailed(true)
    img.src = beat.coverImage
  }, [beat.coverImage])

  if (imageFailed) {
    return <GeneratedFace beat={beat} opacity={opacity} />
  }
  return <ImageFace url={beat.coverImage!} opacity={opacity} />
}

function ImageFace({ url, opacity }: { url: string; opacity: number }) {
  const texture = useLoader(THREE.TextureLoader, url)
  texture.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh position={[0, 0.025, 0]}>
      <circleGeometry args={[1.5, 96]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  )
}

function GeneratedFace({ beat, opacity }: { beat: Beat; opacity: number }) {
  const texture = useMemo(() => generateLabelTexture(beat.gradient, beat.title), [beat.gradient, beat.title])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh position={[0, 0.025, 0]}>
      <circleGeometry args={[1.5, 96]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  )
}
