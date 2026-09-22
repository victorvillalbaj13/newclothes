"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

type GarmentViewerProps = {
  color: string;
  rotationY: number;
};

function LoadingModel() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border border-white/10 border-t-white/80" />
        <span className="text-[9px] uppercase tracking-[0.3em]">
          Loading garment
        </span>
      </div>
    </Html>
  );
}

function TShirtModel({
  color,
  rotationY,
}: {
  color: string;
  rotationY: number;
}) {
  const { scene } = useGLTF("/models/tshirt.glb");

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const garmentColor = new THREE.Color(color);

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material) return;

        const mat = material as THREE.MeshStandardMaterial;

        if ("color" in mat && mat.color) {
          mat.color.copy(garmentColor);
        }

        if ("roughness" in mat) {
          mat.roughness = 0.72;
        }

        if ("metalness" in mat) {
          mat.metalness = 0;
        }

        mat.needsUpdate = true;
      });
    });
  }, [clonedScene, color]);

  return (
    <group
      rotation={[0, rotationY, 0]}
      position={[0, -1.15, 0]}
      scale={2.7}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

function Studio() {
  return (
    <>
      <ambientLight intensity={1.1} />

      <directionalLight
        position={[4, 7, 5]}
        intensity={2.4}
        castShadow
      />

      <directionalLight
        position={[-5, 3, 2]}
        intensity={1.5}
      />

      <spotLight
        position={[0, 7, 5]}
        intensity={3}
        angle={0.45}
        penumbra={1}
        distance={15}
      />

      <pointLight
        position={[0, 1, -4]}
        intensity={0.8}
      />
    </>
  );
}

export default function GarmentViewer({
  color,
  rotationY,
}: GarmentViewerProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#080808]">
      {/* Atmospheric glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[38%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.025] blur-[100px]" />
      </div>

      <Canvas
        shadows
        camera={{
          position: [0, 0.4, 7],
          fov: 32,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#080808"]} />

        <Suspense fallback={<LoadingModel />}>
          <Studio />

          <Environment preset="studio" />

          <TShirtModel
            color={color}
            rotationY={rotationY}
          />

          <OrbitControls
            enablePan={false}
            enableZoom
            enableRotate
            minDistance={4}
            maxDistance={9}
            minPolarAngle={Math.PI / 2.4}
            maxPolarAngle={Math.PI / 1.7}
            rotateSpeed={0.65}
            zoomSpeed={0.7}
          />
        </Suspense>
      </Canvas>

      {/* Viewer information */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2">
        <div className="border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md">
          <span className="text-[8px] uppercase tracking-[0.3em] text-white/40">
            Drag to rotate · Scroll to zoom
          </span>
        </div>
      </div>
    </div>
  );
}

useGLTF.preload("/models/tshirt.glb");