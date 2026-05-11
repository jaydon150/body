import { FemurScene } from './scene/FemurScene';
import { StructurePanel } from './ui/StructurePanel';

/**
 * First vertical model seed: a selectable, UBERON-keyed procedural femur proxy.
 * Imported BodyParts3D meshes replace this once the asset pipeline is ready.
 */
export function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>body</h1>
          <p>First skeletal proxy — selectable femur seed</p>
        </div>
        <StructurePanel />
      </header>
      <main className="app-canvas">
        <FemurScene />
      </main>
    </div>
  );
}
