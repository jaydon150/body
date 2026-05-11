# Pipeline 03 — decimate-lods (P1.06)

**Owner:** Asset Pipeline agent
**Input:** 79 cleaned canonical glbs at `data/canonical/meshes/uberon_*/lod0.glb` (produced by P1.05)
**Output:** `lod1.glb` (~50% triangle count) + `lod2.glb` (~10%) beside each `lod0.glb`. Attribution preserved across both new LODs.

## What this pipeline does

For every glb under `data/canonical/meshes/uberon_*/lod0.glb`:

1. **Snapshot** the LOD0 `asset.copyright` and `asset.extras.source` block. Blender's glTF exporter strips these on export; we cache the originals so the reinject step has an authoritative source. (Same pattern as P1.05.)
2. **Blender 5.1.1 headless LOD generation** — for each mesh object inside the glb (paired bones have 2+ meshes), add a `DECIMATE` modifier in `COLLAPSE` mode and apply it:
   - **LOD1 at ratio 0.5** (target ~50% triangle count).
   - **LOD2 at ratio 0.1** (target ~10%).
3. **Sanity guards** applied per mesh:
   - If a mesh has fewer than 100 triangles at LOD1 time, skip the LOD1 decimate (carry geometry through unchanged). At LOD2 the 0.1 decimate still runs.
   - If LOD2 decimation produces fewer than 20 triangles, fall back to ratio 0.3 for that specific mesh (re-import + re-decimate single-pass).
   - If a decimate accidentally increases tris (Blender quirk), abandon and carry source geometry through.
4. **Export** to `lod1.glb` and `lod2.glb` next to the existing `lod0.glb` (LOD0 is never modified).
5. **Re-inject** attribution into both new LOD files via direct binary surgery on the GLB JSON chunk:
   - Restore `asset.copyright` verbatim from the LOD0 snapshot.
   - Restore `asset.extras.source` with the full provenance block.
   - Append `"blender_5.1.1_decimate:lod1_ratio_0.5"` (or LOD2 equivalent) to `extras.source.edits[]`.
   - Add `extras.source.lod{1,2}_telemetry` with the per-mesh decimate report and any fallback notes.
6. **Update** the sibling `source.txt` with a `## LODs (P1.06)` block.
7. **Verify** three sample LOD chains (femur, mandible, rib 8) — LOD0/LOD1/LOD2 each carry attribution, edits[] reflects the full pipeline chain, and triangle counts are strictly monotonically decreasing.

## What this pipeline explicitly does NOT do

- **Does not modify LOD0.** LOD0 is read-only after P1.05; only new LOD1 + LOD2 files are written.
- **Does not extract or convert raw OBJ data.** Decimation operates on the canonical LOD0 only.
- **Does not decimate UVs.** Position + normal only (BP3D meshes carry no useful UVs).
- **Does not auto-delete non-manifold geometry.** Same policy as P1.05.
- **Does not merge or split meshes.** Multi-mesh paired-bone glbs keep their structure across LODs.

## Prereqs

- **Blender 5.x.** Default path `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`. Override with `-BlenderExe`.
- **Node 18+.** No npm packages required (zero-dep direct GLB binary parser, like P1.05).

## Running

```powershell
# Full 79-glb pass
.\run.ps1

# Smoke test a single glb first
.\run.ps1 -SmokeTarget uberon_0000981

# Re-run just the reinject + source.txt + verify steps
.\run.ps1 -SkipSnapshot -SkipBlender
```

Or step-by-step:

```powershell
node reinject_attribution.mjs --snapshot
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python decimate_lods.py
node reinject_attribution.mjs --reinject
node update_source_txt.mjs
node verify.mjs
```

## Idempotency

- Re-running produces deterministic `lod1.glb` + `lod2.glb` because Blender's Decimate (Collapse) is deterministic on identical input topology, and the reinject pass deduplicates edit tags before appending.
- `source.txt` updates replace the existing `## LODs (P1.06)` block (if any) rather than accumulating duplicates.

## Outputs

- **`data/canonical/meshes/uberon_*/lod1.glb`** — ~50% LOD.
- **`data/canonical/meshes/uberon_*/lod2.glb`** — ~10% LOD.
- **Updated `source.txt`** with the `## LODs (P1.06)` block.
- **`decimate-telemetry.json`** — per-glb / per-LOD telemetry. Gitignored (per-run).
- **`pre-lod-metadata.json`** — pre-Blender LOD0 attribution snapshot. Gitignored.
- **`reinject-report.json`** — per-LOD attribution-survival report. Gitignored.

## ADR compliance

Per ADR 0006 (runtime attribution): `asset.copyright` and `asset.extras.source` must travel with every canonical asset. **Derived LOD files are canonical assets** in their own right, so the same discipline applies — Blender strips on export, the reinject pass is the safety net, and `edits[]` carries the full pipeline chain (P1.04 conversion → P1.05 cleanup → P1.06 decimate).

Per the Asset Pipeline agent rules: no anonymous edits. The decimate operation is recorded in:
- `asset.extras.source.edits[]` inside each LOD glb (machine-readable)
- `source.txt` next to each glb (human-readable)

## Failure handling

If any glb fails to import, decimate, export, or reinject:
- Partial LOD outputs for that mesh are deleted (so a re-run starts clean).
- LOD0 is never touched on failure.
- The failure is logged in `decimate-telemetry.json` and `reinject-report.json`.
- The orchestration script exits non-zero so the Orchestrator surfaces the problem.
