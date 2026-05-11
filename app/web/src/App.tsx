import { SkeletalScene } from './scene/SkeletalScene';
import { AppShell } from './ui/AppShell';

/**
 * Phase 1 vertical slice: 79 BP3D-derived skeletal meshes loaded from the
 * canonical registry (`data/derived/mesh-registry.json`) and rendered with
 * a shared bone material. P1.13 (UI shell) wraps the canvas in the full
 * navigation chrome — Sidebar, Breadcrumbs, Search, DetailPanel,
 * PeelControls, NomenclatureToggle, AttributionSurface. P1.14 wires the
 * remaining UI ↔ engine integration (touch input, content fetch, dive
 * gestures).
 */
export function App() {
  return (
    <AppShell>
      <SkeletalScene />
    </AppShell>
  );
}
