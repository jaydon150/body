# scene/\_archive

Retired Phase 0 / early-Phase-1 scene seeds. Preserved for reference, not
imported by the live app.

## Contents

- `FemurScene.tsx` — the procedural-femur-proxy R3F scene that lived in the
  app shell before the canonical BodyParts3D registry was baked. It built a
  cylinder + sphere primitive stack approximating a femur and wired a manual
  raycast into `selectionStore`. Retired by P1.10 once the registry-driven
  `SkeletalScene` could render the real 79-mesh skeleton.
- `anatomySeed.ts` — the single-entry "femur seed" constant
  (`UBERON:0000981` + label + material hint) that the proxy scene read.
  Retired alongside FemurScene; per-entry data now comes from the canonical
  registry.

## Why archived, not deleted

These files document the "before" state of the vertical-slice path and the
shape the selection store was designed against. Keeping them in tree (a) makes
it easy to diff how registry-driven loading replaced the procedural seed
and (b) preserves the user's hand-authored seed work as part of project
history. They are excluded from the live module graph (App.tsx no longer
imports them) so they have zero runtime cost.

If a future agent needs the procedural-proxy fallback for offline / no-
registry development, restoring it is a one-line App.tsx edit.
