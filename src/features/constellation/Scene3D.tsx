import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Billboard, OrbitControls, Text } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { buildBodies, toSceneVec3, SCENE_SCALE, type Body } from './layout'

interface Props {
  activeKey: string | null
  /** World-space point the camera should fly toward (from layout.toSceneVec3),
   *  or null to leave the camera where the user last left it. Set on click,
   *  not on hover, so pointing around doesn't fling the camera around too. */
  focusTarget: [number, number, number] | null
  onHover: (b: Body | null) => void
  onSelect: (b: Body, pointerType: string) => void
}

/** Phase 1 scene: lit/bloomed suns + planets, continuous planet orbit motion,
 *  a static particle starfield backdrop, camera fly-to on selection, hover/
 *  active billboarded labels, and touch-tuned OrbitControls. */
export function Scene3D({ activeKey, focusTarget, onHover, onSelect }: Props) {
  const { suns, planets } = useMemo(() => buildBodies(), [])
  const controlsRef = useRef<any>(null)
  // Coarse pointer (touch/stylus) devices get gentler rotate speed and a
  // touch-appropriate minimum zoom distance so pinch-to-zoom doesn't clip
  // straight through a sun.
  const isTouch = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  )

  return (
    <Canvas
      className="absolute inset-0 touch-none"
      camera={{ position: [0, 6, 26], fov: 50, near: 0.1, far: 500 }}
      // Cap device pixel ratio lower on touch/coarse-pointer devices — most
      // phones report a devicePixelRatio of 2-3, and rendering bloom +
      // antialiasing at full native res on integrated mobile GPUs is the
      // single biggest frame-time cost in this scene. 1.5 keeps things crisp
      // enough while meaningfully cutting fill-rate cost.
      dpr={isTouch ? [1, 1.5] : [1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={['#05070a']} />
        <fog attach="fog" args={['#05070a', 40, 110]} />

        <ambientLight intensity={0.42} />
        <hemisphereLight args={['#22364a', '#05070a', 0.35]} />
        <pointLight position={[0, 10, 10]} intensity={40} distance={80} decay={2} />
        <pointLight position={[-18, -8, -14]} intensity={14} distance={70} decay={2} color="#e0408a" />

        <ParticleStars count={isTouch ? 900 : 1600} />

        {suns.map((s) => (
          <SunNode key={s.key} body={s} active={activeKey === s.key} onHover={onHover} onSelect={onSelect} />
        ))}
        {planets.map((p) => (
          <PlanetNode
            key={p.key}
            body={p}
            active={activeKey === p.key}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}

        <CameraRig focus={focusTarget} controlsRef={controlsRef} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={isTouch ? 0.12 : 0.08}
          rotateSpeed={isTouch ? 0.4 : 0.55}
          zoomSpeed={0.8}
          panSpeed={0.6}
          minDistance={isTouch ? 5 : 4}
          maxDistance={70}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          // Touch: one-finger rotate, two-finger dolly/pan. Damping/rotate
          // speed above are tuned softer on coarse-pointer devices so drags
          // feel settled rather than jittery or over-sensitive.
        />

        <EffectComposer multisampling={0}>
          {/* Conservative bloom: cheap enough for integrated GPUs/mobile —
           *  mipmap-based blur avoids a full-res blur pass, and threshold
           *  keeps only the emissive bodies (not ambient fill) glowing. */}
          <Bloom
            mipmapBlur
            luminanceThreshold={0.18}
            luminanceSmoothing={0.4}
            intensity={0.55}
            radius={0.55}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}

/** Smoothly flies the camera + orbit target toward `focus` whenever it
 *  changes, preserving the current orbit distance (clamped to a comfortable
 *  range) rather than snapping — reads as a deliberate "fly to" rather than
 *  a cut. Frame-rate independent exponential smoothing (no dt-dependent
 *  jitter across displays running at different refresh rates). */
function CameraRig({
  focus,
  controlsRef,
}: {
  focus: [number, number, number] | null
  controlsRef: React.RefObject<any>
}) {
  const { camera } = useThree()
  const desiredPos = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())
  const dir = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    const controls = controlsRef.current
    if (!controls || !focus) return

    desiredTarget.current.set(focus[0], focus[1], focus[2])
    dir.current.copy(camera.position).sub(controls.target)
    if (dir.current.lengthSq() < 1e-6) dir.current.set(0, 0.25, 1)
    dir.current.normalize()

    const currentDist = camera.position.distanceTo(controls.target)
    const dist = THREE.MathUtils.clamp(currentDist, 4.5, 9)
    desiredPos.current.copy(desiredTarget.current).addScaledVector(dir.current, dist)

    const k = 1 - Math.pow(0.0025, dt)
    camera.position.lerp(desiredPos.current, k)
    controls.target.lerp(desiredTarget.current, k)
    controls.update()
  })

  return null
}

/** Large static point cloud on a sphere shell around the scene. Deliberately
 *  has no useFrame — the user asked for a cheap, non-animated starfield. */
function ParticleStars({ count = 1600 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 42 + Math.random() * 55
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [count])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#9fe9dd"
        size={0.07}
        sizeAttenuation
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  )
}

function BodyLabel({ text, color, size, visible }: { text: string; color: string; size: number; visible: boolean }) {
  if (!visible) return null
  return (
    <Billboard position={[0, size * 1.9, 0]}>
      <Text fontSize={size * 0.85} color={color} outlineWidth={0.01} outlineColor="#05070a" anchorY="bottom">
        {text.toUpperCase()}
      </Text>
    </Billboard>
  )
}

function SunNode({
  body,
  active,
  onHover,
  onSelect,
}: {
  body: Body
  active: boolean
  onHover: (b: Body | null) => void
  onSelect: (b: Body, pointerType: string) => void
}) {
  const pos = useMemo(() => toSceneVec3(body), [body])
  const radius = (body.r / 16) * 0.9

  return (
    <group position={pos}>
      {/* Generous invisible hit sphere — the visible sphere is too small a
       *  target to click/tap reliably at typical camera distances, mirroring
       *  the 2D SVG version's oversized transparent hit circles. */}
      <mesh
        onPointerEnter={(e: ThreeEvent<PointerEvent>) => e.pointerType !== 'touch' && onHover(body)}
        onPointerLeave={(e: ThreeEvent<PointerEvent>) => e.pointerType !== 'touch' && onHover(null)}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onSelect(body, e.pointerType)
        }}
      >
        <sphereGeometry args={[radius * 2.4, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={body.accent}
          emissive={body.accent}
          emissiveIntensity={active ? 2.4 : 1.5}
          toneMapped={false}
        />
      </mesh>
      {/* Faint always-on aura so suns read as light sources even without bloom */}
      <mesh scale={1.6}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshBasicMaterial color={body.accent} transparent opacity={active ? 0.14 : 0.08} depthWrite={false} />
      </mesh>
      <BodyLabel text={body.label} color={active ? body.accent : '#8a96a3'} size={radius} visible />
    </group>
  )
}

function PlanetNode({
  body,
  active,
  onHover,
  onSelect,
}: {
  body: Body
  active: boolean
  onHover: (b: Body | null) => void
  onSelect: (b: Body, pointerType: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const sunPos = useMemo(() => {
    // Planets orbit their sun; recover the sun's world position from the
    // planet's own base position minus its orbit offset at phase 0.
    const [x, y, z] = toSceneVec3(body)
    if (!body.orbit) return [x, y, z] as [number, number, number]
    const ox = Math.cos(body.orbit.phase) * body.orbit.radius * SCENE_SCALE
    const oy = Math.sin(body.orbit.phase) * body.orbit.radius * SCENE_SCALE * 0.8
    return [x - ox, y + oy, z] as [number, number, number]
  }, [body])
  const radius = (body.r / 16) * 0.9

  useFrame(({ clock }) => {
    if (!groupRef.current || !body.orbit) return
    const t = clock.getElapsedTime() * body.orbit.speed + body.orbit.phase
    const tilt = (body.orbit.tiltDeg * Math.PI) / 180
    const r = body.orbit.radius * SCENE_SCALE
    const x = Math.cos(t) * r
    const zLocal = Math.sin(t) * r * Math.sin(tilt)
    const yLocal = Math.sin(t) * r * Math.cos(tilt) * 0.8
    groupRef.current.position.set(sunPos[0] + x, sunPos[1] + yLocal, sunPos[2] + zLocal)
  })

  return (
    <group ref={groupRef} position={sunPos}>
      {/* Generous invisible hit sphere, same reasoning as SunNode. */}
      <mesh
        onPointerEnter={(e: ThreeEvent<PointerEvent>) => {
          if (e.pointerType === 'touch') return
          setHovered(true)
          onHover(body)
        }}
        onPointerLeave={(e: ThreeEvent<PointerEvent>) => {
          if (e.pointerType === 'touch') return
          setHovered(false)
          onHover(null)
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onSelect(body, e.pointerType)
        }}
      >
        <sphereGeometry args={[radius * 3, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh
        onPointerEnter={(e: ThreeEvent<PointerEvent>) => {
          if (e.pointerType === 'touch') return
          setHovered(true)
          onHover(body)
        }}
        onPointerLeave={(e: ThreeEvent<PointerEvent>) => {
          if (e.pointerType === 'touch') return
          setHovered(false)
          onHover(null)
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onSelect(body, e.pointerType)
        }}
      >
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={active ? body.accent : '#0a0c10'}
          emissive={body.accent}
          emissiveIntensity={active ? 1.5 : 0.55}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      <BodyLabel
        text={body.label}
        color={body.accent}
        size={radius * 1.4}
        visible={active || hovered}
      />
    </group>
  )
}
