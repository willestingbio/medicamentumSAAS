'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Float, RoundedBox } from '@react-three/drei';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

function VRPreviewScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <spotLight position={[-5, 5, -5]} angle={0.3} penumbra={1} intensity={0.5} />

      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        {/* Brain-like shape */}
        <RoundedBox args={[2, 2, 2]} radius={0.3} smoothness={8} position={[0, 0, 0]}>
          <meshStandardMaterial
            color="#8127cf"
            roughness={0.3}
            metalness={0.4}
            wireframe={false}
          />
        </RoundedBox>
      </Float>

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Float key={i} speed={2 + Math.random() * 2} rotationIntensity={0} floatIntensity={1 + Math.random()}>
          <mesh position={[
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
          ]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.5} />
          </mesh>
        </Float>
      ))}

      <Environment preset="city" />
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={2}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="size-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Cargando visor 3D...</p>
      </div>
    </div>
  );
}

export function VRViewer({ assetUrl: _assetUrl }: { assetUrl?: string | null }) {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted border">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <VRPreviewScene />
        </Canvas>
      </Suspense>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
          Arrastra para rotar • Scroll para zoom
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
          onClick={() => {
            // TODO: fullscreen
          }}
        >
          <Maximize2 className="size-3.5 mr-1" />
          Pantalla completa
        </Button>
      </div>
    </div>
  );
}
