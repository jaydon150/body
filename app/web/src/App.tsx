import { Canvas } from '@react-three/fiber';

/**
 * Phase 0 placeholder. Renders an empty R3F canvas to verify the toolchain.
 * Real scene graph + selection + peel come from the 3D Engine agent in Phase 1+.
 * See docs/agents/3d-engine.md.
 */
export function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>body</h1>
        <p>Phase 0 — infrastructure only. No anatomy yet.</p>
      </header>
      <main className="app-canvas">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#0a0a0a']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
        </Canvas>
      </main>
    </div>
  );
}
