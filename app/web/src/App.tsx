import { SkeletalScene } from './scene/SkeletalScene';
import { StructurePanel } from './ui/StructurePanel';

/**
 * Phase 1 vertical slice: 79 BP3D-derived skeletal meshes loaded from the
 * canonical registry (`data/derived/mesh-registry.json`) and rendered with
 * a shared bone material. GPU picking and selection wiring arrives in
 * P1.11 — the StructurePanel slot remains for the next dispatch.
 */
export function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>body</h1>
          <p>Phase 1 vertical slice — 79 skeletal structures</p>
        </div>
        <StructurePanel />
      </header>
      <main className="app-canvas">
        <SkeletalScene />
      </main>
    </div>
  );
}
