import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { swapEasings } from './useCDSwap'

const COUNT = 220
const DISC_EDGE = 1.55
const OUTER_R = 3.2

interface DustSwapProps {
  progress: number
  swapping: boolean
  outgoingColor: string
  incomingColor: string
}

/**
 * Particle dissolve replacing the previous hand choreography. Two THREE.Points
 * clouds — one for the outgoing disc dispersing outward, one for the incoming
 * disc gathering inward — both sized from the beat gradients so each swap
 * carries the right palette.
 */
export function DustSwap({ progress, swapping, outgoingColor, incomingColor }: DustSwapProps) {
  return (
    <>
      <DustCloud progress={progress} swapping={swapping} color={outgoingColor} mode="outward" />
      <DustCloud progress={progress} swapping={swapping} color={incomingColor} mode="inward" />
    </>
  )
}

function DustCloud({
  progress,
  swapping,
  color,
  mode,
}: {
  progress: number
  swapping: boolean
  color: string
  mode: 'outward' | 'inward'
}) {
  const pointsRef = useRef<THREE.Points>(null)

  // Fixed per-particle layout (angle, radial offset, height jitter, size).
  const seed = useMemo(() => {
    const angles = new Float32Array(COUNT)
    const radialJitter = new Float32Array(COUNT)
    const heights = new Float32Array(COUNT)
    const sizes = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      angles[i] = Math.random() * Math.PI * 2
      radialJitter[i] = (Math.random() - 0.5) * 0.5
      heights[i] = (Math.random() - 0.5) * 0.35
      sizes[i] = 0.6 + Math.random() * 0.9
    }
    return { angles, radialJitter, heights, sizes }
  }, [])

  const positions = useMemo(() => new Float32Array(COUNT * 3), [])
  const colorAttr = useMemo(() => {
    const c = new THREE.Color(color)
    const arr = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    }
    return arr
  }, [color])

  // Keep the per-vertex colour buffer in sync with the prop colour.
  useEffect(() => {
    const c = new THREE.Color(color)
    for (let i = 0; i < COUNT; i++) {
      colorAttr[i * 3] = c.r
      colorAttr[i * 3 + 1] = c.g
      colorAttr[i * 3 + 2] = c.b
    }
    const geom = pointsRef.current?.geometry
    if (geom) {
      const a = geom.getAttribute('color')
      if (a) a.needsUpdate = true
    }
  }, [color, colorAttr])

  useFrame(() => {
    const points = pointsRef.current
    if (!points) return

    // Where in the start..end interp are we?
    let radiusLerp = 0
    let amp = 0
    if (mode === 'outward') {
      const t = Math.min(1, Math.max(0, progress / 0.65))
      radiusLerp = Math.pow(t, 0.7)
      amp = swapEasings.outgoingDust(progress)
    } else {
      const t = Math.min(1, Math.max(0, (progress - 0.35) / 0.65))
      radiusLerp = 1 - Math.pow(t, 0.7)
      amp = swapEasings.incomingDust(progress)
    }
    const r = DISC_EDGE + (OUTER_R - DISC_EDGE) * radiusLerp
    const rise = radiusLerp * 0.5

    for (let i = 0; i < COUNT; i++) {
      const a = seed.angles[i]
      const off = seed.radialJitter[i]
      const h = seed.heights[i] + rise
      positions[i * 3] = Math.cos(a) * (r + off)
      positions[i * 3 + 1] = h
      positions[i * 3 + 2] = Math.sin(a) * (r + off)
    }
    const geom = points.geometry
    geom.attributes.position.needsUpdate = true

    const mat = points.material as THREE.PointsMaterial
    mat.opacity = swapping ? amp * 0.85 : 0
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={COUNT} itemSize={3} args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" array={colorAttr} count={COUNT} itemSize={3} args={[colorAttr, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}
