"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function TshirtModel() {
  const { scene } = useGLTF("/models/tshirt.glb");

  return (
    <primitive
      object={scene}
      scale={1}
      position={[0, 0, 0]}
    />
  );
}

function Model() {
  return (
    <Suspense fallback={null}>
      <TshirtModel />
    </Suspense>
  );
}

export default function CustomPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        padding: "40px",
      }}
    >
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 700,
          marginBottom: "10px",
        }}
      >
        NEWCLOTHES CUSTOM STUDIO
      </h1>

      <p
        style={{
          color: "#888",
          marginBottom: "30px",
        }}
      >
        Prueba directa del modelo 3D
      </p>

      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          height: "650px",
          background: "#111",
          border: "1px solid #333",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <Canvas
          camera={{
            position: [0, 0, 8],
            fov: 40,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          <color attach="background" args={["#111111"]} />

          <ambientLight intensity={2} />

          <directionalLight
            position={[5, 5, 5]}
            intensity={4}
          />

          <directionalLight
            position={[-5, 2, 5]}
            intensity={2}
          />

          <directionalLight
            position={[0, -2, -5]}
            intensity={2}
          />

          <Model />

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3}
            maxDistance={15}
          />
        </Canvas>
      </div>

      <p
        style={{
          marginTop: "20px",
          color: "#666",
          fontSize: "14px",
        }}
      >
        Cargando modelo: /models/tshirt.glb
      </p>
    </main>
  );
}

useGLTF.preload("/models/tshirt.glb");