import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const BAR_COUNT = 128
const INNER_RADIUS = 3.2
const BAR_HEIGHT_MAX = 0.6
const BAR_WIDTH = 0.06
const BAR_THICKNESS = 0.025

interface VisualiserRingProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  playing: boolean
  /** Hue offset applied to all bars; rotate it over time for a colourful sweep. */
  baseHue?: number
}

/**
 * A ring of `BAR_COUNT` instanced bars orbiting the disc. Each frame, sample
 * the analyser's frequency data, scale each bar's height by its bin, and tint
 * it from a rotating HSL palette. When no audio is playing the bars rest in a
 * gentle idle wave so the ring stays alive.
 */
export function VisualiserRing({ analyserRef, playing, baseHue = 0.72 }: VisualiserRingProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const tRef = useRef(0)

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    tRef.current += delta

    const analyser = analyserRef.current
    let data = dataRef.current
    if (analyser && (!data || data.length !== analyser.frequencyBinCount)) {
      data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
      dataRef.current = data
    }
    if (analyser && data) analyser.getByteFrequencyData(data)

    const hueRot = (tRef.current * 0.08) % 1

    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * Math.PI * 2
      // Map bar -> frequency bin (mirrored across the ring for symmetry).
      const half = BAR_COUNT / 2
      const binIdx = i < half ? i : BAR_COUNT - 1 - i
      let amp = 0
      if (data && data.length > 0) {
        const bin = Math.floor((binIdx / half) * (data.length - 1))
        amp = data[bin] / 255
      }
      // Idle wave when no real data.
      const idle = (Math.sin(tRef.current * 1.6 + i * 0.18) * 0.5 + 0.5) * 0.18
      const target = playing ? Math.max(amp * 0.95, idle * 0.25) : idle
      const h = 0.08 + target * BAR_HEIGHT_MAX

      const r = INNER_RADIUS + h / 2
      dummy.position.set(Math.cos(angle) * r, 0.02, Math.sin(angle) * r)
      dummy.rotation.set(0, -angle, 0)
      dummy.scale.set(1, h / 0.1, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      const hue = (baseHue + hueRot + i / BAR_COUNT) % 1
      const sat = 0.7 + target * 0.3
      const light = 0.45 + target * 0.25
      color.setHSL(hue, sat, light)
      mesh.setColorAt(i, color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BAR_COUNT]} frustumCulled={false}>
      <boxGeometry args={[BAR_WIDTH, 0.1, BAR_THICKNESS]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
