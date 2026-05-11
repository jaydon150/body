# Pipeline 02 — clean-meshes (P1.05)

**Owner:** Asset Pipeline agent
**Input:** 79 canonical glbs at `data/canonical/meshes/uberon_*/lod0.glb` (produced by P1.04)
**Output:** the same 79 glbs, in place, with welded duplicates and consistent normals; attribution preserved.

## What this pipeline does

For every glb under `data/canonical/meshes/uberon_*/lod0.glb`:

1. **Snapshot** the original `asset.copyright` and `asset.extras.source` block. Blender's glTF exporter overwrites the copyright field and strips/replaces `extras`, so we cache the originals before touching the file.
2. **Blender 5.1.1 headless cleanup** per mesh object inside the glb (paired bones have 2+ meshes):
   - `bpy.ops.mesh.remove_doubles(threshold=1e-4)` — weld duplicate vertices within 0.1 mm.
   - `bpy.ops.mesh.normals_make_consistent(inside=False)` — recompute normals outside.
   - `bpy.ops.mesh.select_non_manifold(...)` — count (do **not** delete) non-manifold edges + verts. Deleting could destroy real anatomical detail.
3. **Re-export** to glb (binary) preserving the multi-mesh structure (laterality is still selectable at runtime).
4. **Re-inject** attribution by direct binary surgery on the GLB JSON chunk:
   - Restore `asset.copyright` verbatim from the pre-Blender snapshot.
   - Restore `asset.extras.source` with the full provenance block.
   - Append `"blender_5.1.1_cleanup:remove_doubles+normals_make_consistent"` to `extras.source.edits[]`.
   - Add `extras.source.cleanup_telemetry` with non-manifold counts and vert/tri before/after.
5. **Update** the sibling `source.txt` with the cleanup record.
6. **Verify** three sample glbs (femur, mandible, rib 8) survived round-trip with attribution intact.

## What this pipeline explicitly does NOT do

- **No decimation.** That is P1.06 (`03-decimate-lods`).
- **No smooth shading recomputation.** BP3D-derived normals after `normals_make_consistent` are sufficient.
- **No UV regeneration.** The 79 BP3D glbs have no textures attached at LOD0.
- **No mesh merging.** Paired-bone glbs keep their two mesh objects (left/right laterality at runtime).
- **No auto-deletion of non-manifold geometry.** Logged for hand-review only.

## Prereqs

- **Blender 5.x.** Default path `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`. Override with `-BlenderExe` parameter.
- **Node 18+.** No npm packages required (zero-dep direct GLB binary parser).

## Running

From this directory in PowerShell:

```powershell
# Full 79-glb pass (~few minutes)
.\run.ps1

# Smoke test a single glb first
.\run.ps1 -SmokeTarget uberon_0000981

# Re-run just the reinject step (Blender pass already done)
.\run.ps1 -SkipSnapshot -SkipBlender
```

Or step-by-step:

```powershell
node reinject_attribution.mjs --snapshot
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python clean_glbs.py
node reinject_attribution.mjs --reinject
node verify.mjs
```

## Idempotency

- Re-running with no upstream changes produces no diffs in the glbs **except** the `edits[]` array already contains the cleanup tag; re-running the reinject step is a no-op (the tag is deduplicated).
- The Blender pass will re-run weld + normals; since both ops are deterministic, the output is byte-stable.
- Each glb is backed up (`lod0.glb.original-backup`) for the duration of one cleanup; on success the backup is removed.

## Outputs

- **In-place rewrites** of `data/canonical/meshes/uberon_*/lod0.glb`.
- **`clean-telemetry.json`** — per-glb verts/tris before/after, non-manifold counts. Gitignored (per-run).
- **`pre-clean-metadata.json`** — pre-Blender attribution snapshot. Gitignored.
- **`reinject-report.json`** — per-glb attribution-survival report. Gitignored.
- **Updated `source.txt`** in each mesh directory with a cleanup record (P1.05 line).

## ADR compliance

Per ADR 0006 (runtime attribution): `asset.copyright` and `asset.extras.source` must travel with every canonical asset. Blender's glTF exporter does **not** preserve these; the reinject step is the safety net. Three sample glbs are verified post-cleanup as a non-skippable gate.

Per the Asset Pipeline agent rules: no anonymous edits. The cleanup operation is recorded in:
- `asset.extras.source.edits[]` inside each glb (machine-readable)
- `source.txt` next to each glb (human-readable)

## Failure handling

If any glb fails to import, export, or reinject:
- The per-file backup is restored.
- The failure is logged in `clean-telemetry.json` and `reinject-report.json`.
- `source.txt` for that mesh is NOT updated (so the human-readable record stays accurate).
- The orchestration script exits non-zero so the Orchestrator surfaces the problem.
