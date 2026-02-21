'use client';

import { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

type Capability = 'low' | 'medium' | 'high';

function getCapability(): Capability {
  if (typeof window === 'undefined') return 'medium';
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (isMobile && (cores <= 4 || mem <= 2)) return 'low';
  if (isMobile) return 'medium';
  return cores >= 8 ? 'high' : 'medium';
}

// Orbital ring around the AI core
function OrbitalRing({
  radius,
  speed,
  tiltX,
  tiltZ,
  color,
}: {
  radius: number;
  speed: number;
  tiltX: number;
  tiltZ: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * speed;
  });
  return (
    <mesh ref={ref} rotation={[tiltX, 0, tiltZ]}>
      <torusGeometry args={[radius, 0.007, 8, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  );
}

// Click/tap pulse ring that expands and fades
function PulseRing({ onDone }: { onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);
  const duration = 1.3;

  useEffect(() => {
    const timer = setTimeout(onDone, duration * 1000);
    return () => clearTimeout(timer);
  }, [onDone]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (startTime.current === null) startTime.current = clock.getElapsedTime();
    const progress = Math.min((clock.getElapsedTime() - startTime.current) / duration, 1);
    const s = 1 + progress * 3.5;
    ref.current.scale.set(s, s, s);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.85 * (1 - progress);
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.6, 0.018, 8, 80]} />
      <meshBasicMaterial color="#FFD84D" transparent opacity={0.85} />
    </mesh>
  );
}

// Central AI Core: glass icosahedron + inner sphere + yellow spark + rings
function AiCore({
  capability,
  mouse,
}: {
  capability: Capability;
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const sparkRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const [pulseRings, setPulseRings] = useState<number[]>([]);
  const nextId = useRef(0);
  const currentRot = useRef({ x: 0, y: 0 });
  const targetRot = useRef({ x: 0, y: 0 });

  const handleInteraction = useCallback(() => {
    setPulseRings((r) => [...r, nextId.current++]);
  }, []);

  useEffect(() => {
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchend', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchend', handleInteraction);
    };
  }, [handleInteraction]);

  const removeRing = useCallback((id: number) => {
    setPulseRings((r) => r.filter((x) => x !== id));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Smooth parallax toward mouse
    targetRot.current.x = mouse.current.y * 0.45;
    targetRot.current.y = mouse.current.x * 0.45;
    currentRot.current.x += (targetRot.current.x - currentRot.current.x) * 0.04;
    currentRot.current.y += (targetRot.current.y - currentRot.current.y) * 0.04;

    if (groupRef.current) {
      groupRef.current.rotation.x = currentRot.current.x;
      groupRef.current.rotation.y = currentRot.current.y + t * 0.1;
    }

    // Inner sphere breathe
    if (innerRef.current) {
      const breathe = 1 + Math.sin(t * 1.8) * 0.07;
      innerRef.current.scale.setScalar(breathe);
    }

    // Spark tumble
    if (sparkRef.current) {
      sparkRef.current.rotation.y = t * 2.8;
      sparkRef.current.rotation.z = t * 1.4;
    }

    // Wireframe slow own rotation
    if (wireRef.current) {
      wireRef.current.rotation.y = t * 0.05;
      wireRef.current.rotation.x = t * 0.03;
    }
  });

  const detail = capability === 'high' ? 3 : 2;

  return (
    <group ref={groupRef}>
      {/* Outer glass shell */}
      <mesh>
        <icosahedronGeometry args={[1.15, detail]} />
        <meshPhysicalMaterial
          color="#2EE6C9"
          transparent
          opacity={0.07}
          roughness={0.0}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe digital mesh */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.17, detail]} />
        <meshBasicMaterial color="#2EE6C9" wireframe transparent opacity={0.22} />
      </mesh>

      {/* Inner glowing core */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial
          color="#2EE6C9"
          emissive="#2EE6C9"
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Yellow center spark */}
      <mesh ref={sparkRef}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color="#FFD84D" transparent opacity={0.95} />
      </mesh>

      {/* Orbital rings */}
      {capability !== 'low' && (
        <>
          <OrbitalRing radius={1.6} speed={0.45} tiltX={Math.PI / 2} tiltZ={0} color="#2EE6C9" />
          <OrbitalRing radius={1.9} speed={0.28} tiltX={Math.PI / 3} tiltZ={Math.PI / 6} color="#FFD84D" />
          {capability === 'high' && (
            <OrbitalRing radius={2.2} speed={0.18} tiltX={Math.PI / 5} tiltZ={Math.PI / 4} color="#2EE6C9" />
          )}
        </>
      )}

      {/* Pulse rings */}
      {pulseRings.map((id) => (
        <PulseRing key={id} onDone={() => removeRing(id)} />
      ))}
    </group>
  );
}

// Spherical particle cloud
function Particles({ capability }: { capability: Capability }) {
  const ref = useRef<THREE.Points>(null);
  const count = capability === 'low' ? 600 : capability === 'medium' ? 1200 : 2500;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.8 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.025;
      ref.current.rotation.x = clock.getElapsedTime() * 0.012;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#2EE6C9"
        size={0.022}
        sizeAttenuation
        depthWrite={false}
        opacity={0.45}
      />
    </Points>
  );
}

function Scene({
  capability,
  mouse,
}: {
  capability: Capability;
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}) {
  return (
    <>
      <color attach="background" args={['#070b14']} />
      <ambientLight intensity={0.25} />
      <pointLight position={[4, 4, 4]} intensity={2} color="#2EE6C9" />
      <pointLight position={[-4, -3, 3]} intensity={1} color="#FFD84D" />
      <pointLight position={[0, 0, 2]} intensity={0.5} color="#2EE6C9" />
      <Particles capability={capability} />
      <AiCore capability={capability} mouse={mouse} />
    </>
  );
}

function FallbackBg() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 70% 60% at 60% 40%, rgba(46,230,201,0.1) 0%, transparent 65%), #070b14',
      }}
    />
  );
}

export default function ThreeHeroBackground() {
  const [capability, setCapability] = useState<Capability>('medium');
  const [webglOk, setWebglOk] = useState(true);
  const [ready, setReady] = useState(false);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Check WebGL
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) { setWebglOk(false); return; }
    } catch {
      setWebglOk(false);
      return;
    }

    setCapability(getCapability());
    setReady(true);

    // Mouse parallax
    const onMouse = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouse);

    // Touch drag rotation
    let lastTouch = { x: 0, y: 0 };
    const onTouchStart = (e: TouchEvent) => {
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - lastTouch.x;
      const dy = t.clientY - lastTouch.y;
      mouse.current.x = Math.max(-1, Math.min(1, mouse.current.x + dx * 0.004));
      mouse.current.y = Math.max(-1, Math.min(1, mouse.current.y - dy * 0.004));
      lastTouch = { x: t.clientX, y: t.clientY };
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Gyroscope
    const onGyro = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        mouse.current.x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 45));
        mouse.current.y = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 45));
      }
    };
    window.addEventListener('deviceorientation', onGyro);

    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('deviceorientation', onGyro);
    };
  }, []);

  if (!webglOk) return <FallbackBg />;
  if (!ready) return <div className="absolute inset-0 bg-[#070b14]" />;

  const dprRange: [number, number] =
    capability === 'low' ? [0.5, 1] : capability === 'medium' ? [0.8, 1.5] : [1, 2];

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 58 }}
        dpr={dprRange}
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: capability !== 'low',
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          <Scene capability={capability} mouse={mouse} />
        </Suspense>
      </Canvas>
    </div>
  );
}
