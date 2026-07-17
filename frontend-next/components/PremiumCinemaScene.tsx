"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      boxGeometry: any;
      directionalLight: any;
      group: any;
      mesh: any;
      meshStandardMaterial: any;
      torusGeometry: any;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      boxGeometry: any;
      directionalLight: any;
      group: any;
      mesh: any;
      meshStandardMaterial: any;
      torusGeometry: any;
    }
  }
}

function SignalRings() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y = t * 0.22;
    group.current.rotation.z = Math.sin(t * 0.45) * 0.08;
  });

  return (
    <group ref={group} position={[1.25, 0.2, -0.4]} rotation={[0.45, -0.5, 0.05]}>
      {[1.35, 1.72, 2.12].map((radius, index) => (
        <mesh key={radius} rotation={[Math.PI / 2, 0, index * 0.55]}>
          <torusGeometry args={[radius, 0.012, 12, 140]} />
          <meshStandardMaterial
            color={index === 1 ? "#0284C7" : "#E11D48"}
            emissive={index === 1 ? "#0284C7" : "#E11D48"}
            emissiveIntensity={0.35}
            roughness={0.28}
            metalness={0.62}
            transparent
            opacity={0.72}
          />
        </mesh>
      ))}
    </group>
  );
}

function PosterStack() {
  const group = useRef<THREE.Group>(null);
  const posters = useMemo(
    () => [
      { position: [-1.0, 0.2, 0.32], rotation: [0.0, 0.32, -0.08], color: "#FFFFFF", stripe: "#E11D48" },
      { position: [-0.34, -0.14, 0.7], rotation: [0.02, 0.08, 0.08], color: "#F8FAFC", stripe: "#F5C518" },
      { position: [0.38, 0.1, 0.42], rotation: [0.0, -0.22, 0.05], color: "#FFFFFF", stripe: "#0284C7" },
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.y = Math.sin(t * 0.8) * 0.08;
    group.current.rotation.y = Math.sin(t * 0.35) * 0.08;
  });

  return (
    <group ref={group} position={[0.45, -0.05, 0]} scale={0.95}>
      {posters.map((poster, index) => (
        <group
          key={poster.stripe}
          position={poster.position as [number, number, number]}
          rotation={poster.rotation as [number, number, number]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.96, 0.045]} />
            <meshStandardMaterial color={poster.color} roughness={0.42} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0.33, 0.026]}>
            <boxGeometry args={[0.52, 0.08, 0.012]} />
            <meshStandardMaterial color={poster.stripe} roughness={0.35} metalness={0.18} />
          </mesh>
          <mesh position={[0, -0.08, 0.026]}>
            <boxGeometry args={[0.48, 0.46, 0.01]} />
            <meshStandardMaterial
              color={index === 1 ? "#FFF7D6" : "#EAF0F7"}
              roughness={0.5}
              metalness={0.06}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FilmRibbon() {
  const group = useRef<THREE.Group>(null);
  const segments = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => {
        const x = -2.1 + index * 0.28;
        return {
          x,
          y: Math.sin(index * 0.75) * 0.22 - 0.92,
          z: Math.cos(index * 0.55) * 0.22,
          rotation: Math.sin(index * 0.5) * 0.42,
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.x = Math.sin(clock.getElapsedTime() * 0.35) * 0.16;
  });

  return (
    <group ref={group} rotation={[0.16, -0.2, -0.08]}>
      {segments.map((segment, index) => (
        <mesh
          key={index}
          position={[segment.x, segment.y, segment.z]}
          rotation={[0, segment.rotation, 0.24]}
        >
          <boxGeometry args={[0.2, 0.34, 0.018]} />
          <meshStandardMaterial
            color={index % 3 === 0 ? "#111827" : "#334155"}
            roughness={0.36}
            metalness={0.25}
            transparent
            opacity={0.78}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function PremiumCinemaScene() {
  return (
    <div className="hero-3d-canvas absolute inset-y-0 right-0 hidden w-[55%] lg:block">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5.4], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[2.6, 3.2, 4.2]} intensity={2.1} />
        <directionalLight position={[-3, -1.5, 2]} intensity={0.85} color="#E11D48" />
        <SignalRings />
        <PosterStack />
        <FilmRibbon />
      </Canvas>
    </div>
  );
}
