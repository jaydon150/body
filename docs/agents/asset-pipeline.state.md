# Agent state: asset-pipeline

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 — P1.06 (Blender headless LOD chain generation via Decimate modifier)

---

## Open items

0. **(NEW, P1.06)** **Two LOD2 fallbacks took ratio 0.3 instead of 0.1 on small carpal-bone "part_1" meshes.** Specifically: `uberon_0001429` (pisiform, part_1: LOD0=190 -> LOD1=94 -> LOD2 at 0.1 produced 18 tris, below the 20-tri degenerate threshold -> re-decimated at 0.3 -> 56 tris); `uberon_0002445` (similar 170-tri carpal, part_1: LOD0=170 -> LOD1=84 -> LOD2 at 0.1 produced 17 tris -> re-decimated at 0.3 -> 50 tris). Both glbs carry the `blender_5.1.1_decimate:lod2_ratio_0.3_fallback` edit tag alongside the standard `lod2_ratio_0.1` tag, and `extras.source.lod2_telemetry.per_mesh` records the per-mesh `lod2_fallback_ratio_0.3` action. Visually these meshes are tiny carpal bones rendered at low-distance LOD2; 50-56 tris is sufficient. The registry-bake step (P1.08) can pick up the fallback signal from the edit tag if it ever needs to flag "this LOD2 used the fallback path."
0b. **(NEW, P1.06)** **Decimation of the two P1.05 non-manifold meshes (ethmoid + sternum body) succeeded cleanly with no degenerate-mesh fallback.** `uberon_0001679` (ethmoid, 1 mesh, 22,265 LOD0 tris) decimated to 11,132 (LOD1) -> 2,225 (LOD2) with no notes. `uberon_0006820` (sternum body, 1 mesh, 4,638 LOD0 tris) decimated to 2,319 (LOD1) -> 462 (LOD2) with no notes. The 2 non-manifold edges + 31 non-manifold verts logged at P1.05 are still present in the LOD chain (decimation neither cleaned them up nor introduced new ones at the tri counts measured) -- these glbs remain on the hand-review list per open item #7 below.

1. **License-page version discrepancy.** The canonical project portal `lifesciencedb.jp/bp3d/info/license/index.html` declares CC BY-SA 2.1 Japan; the LSDB Archive mirror `dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html` displays a CC BY 4.0 summary. Per ADR 0005 the project follows the canonical lifesciencedb.jp version (CC BY-SA 2.1 JP). Pre-launch compliance review should reconcile and confirm. Not a Phase 1 blocker.
2. **CC BY-SA 2.1 JP legal code is Japanese-only.** The authoritative legal code lives at `creativecommons.org/licenses/by-sa/2.1/jp/legalcode.ja`. The English deed is a summary, not the law. Compliance review item.
3. **PART-OF hierarchy is downloaded but unused for Phase 1.** Phase 1 only needs the IS-A hierarchy (it's what the FMA crosswalk pivots on). The PART-OF archive (62 MB, 1,258 OBJs) is kept on disk because Phase 2+ compound-organ assembly will likely need it. Pipeline 01-import-bp3d should default to IS-A but accept a PART-OF flag.
4. **No FJ-id → individual-file checksum manifest yet.** A future hardening step could add a per-file SHA256 sidecar to detect raw-data corruption. Deferred — `unzip -l` integrity check is sufficient for now.
5. **29 skeletal sub-structures lack BP3D meshes.** Logged in `pipelines/01-import-bp3d/gap-report-2026-05-11.md`. Pattern: BP3D models the parent bone (femur, humerus, scapula, hip bone) as a single OBJ but does not ship its named sub-features (head/neck/shaft/condyles, glenoid/acromion/coracoid, ilium/ischium/pubis). Phalanges (manus and pes proximal/middle/distal) and coccyx + whole-sternum also miss. **For Phase 1**: Anatomy Domain should decide per-structure whether the missing nodes become procedural-decomposition tasks (Blender splits the parent), hand-author tasks, or remain "concept-only" anatomy graph nodes with no mesh until Phase 2. The femur seed already has a procedural proxy registered in `data/derived/mesh-registry.json` covering FMA:9611; the femur sub-features are the strongest candidates for procedural decomposition because the parent-mesh anatomy is well known.
6. **Sternum (UBERON:0000975) gap is recoverable at the registry level.** Manubrium (FMA:7486), body of sternum (FMA:7487), and xiphoid (FMA:7488) all converted successfully. P1.08 can synthesize a virtual "whole sternum" entry by referencing the three child glbs without needing a new mesh extraction. Anatomy Domain should sign off on this approach before P1.08 commits.
7. **Two glbs carry residual non-manifold geometry, flagged for hand-review.** P1.05 logged but did NOT delete non-manifold features (deleting could destroy real anatomical detail). Specifically: **`uberon_0001679` ethmoid bone** (2 non-manifold edges, 7 non-manifold verts on a single-mesh 11,181-vert structure — likely a few duplicated faces inside the bone's intricate paranasal-sinus geometry) and **`uberon_0006820` body of sternum** (0 non-manifold edges, 24 non-manifold verts on a single-mesh 2,327-vert structure — most likely isolated stray verts left over from the BP3D 99%-decimation pass). Both are visually OK at LOD0 but a future hand-edit pass (or P1.06 decimation with `dissolve_orphans=True`) should clean these up. Not a Phase 1 blocker.
8. **Laterality `extras` tag deferred.** P1.04's outbound handoff suggested P1.05 add `extras.laterality: "left" | "right"` to each paired-bone mesh node. P1.05 preserved the two `mesh` nodes (laterality is still selectable structurally) but did not tag them — the BP3D `g part_0` / `g part_1` labels survive into the glTF as `node.name == "part_N_K"` after Blender's exporter. A subsequent pass (P1.07 or registry-bake P1.08) can map `part_0`→left / `part_1`→right authoritatively by comparing centroid X-sign in mesh-space, since the merge order was deterministic (FJ-id ascending). Logged here for that downstream agent.
9. **OBJ → glb conversion preserves only geometry, not normals from source.** BP3D OBJs include `vn` (vertex normals) but my merge routine rewrites them. `obj2gltf` recomputes per-triangle normals on import. For the 99% decimation tier the normals are still smooth enough to look correct, and **P1.05 now runs `normals_make_consistent(inside=False)` per mesh object** so normals are deterministically outward-facing across the canonical set. **(Closes P1.04 open item #8.)**

## Decisions log

### 2026-05-11 — P1.06

- **Tool: Blender 5.1.1 Decimate modifier (COLLAPSE), not pure-Python quadric reduction (`pyfqmr`, `pymeshlab`) nor `gltfpack`.** The agent prompt explicitly required `bpy.ops.object.modifier_add(type='DECIMATE')` with `decimate_type='COLLAPSE'`, and the Collapse algorithm is content-aware (preserves silhouette better than uniform vertex-cluster reduction or `gltfpack -si`'s edge-collapse heuristic for anatomical structures). Blender was already installed and validated at P1.05; reusing the same toolchain also reuses the attribution-discipline pattern. Total Blender wall time for all 79 glbs (LOD1 + LOD2): 23.44 s (mean ~0.3 s per glb across both LOD levels including the per-LOD reset + import + modifier-apply + export cycle). Pure-Python alternatives would also have required reimplementing the LOD2-degenerate fallback path inside the same script -- single Blender process keeps the implementation atomic.
- **Tool sequence: identical pre-snapshot + Blender + direct GLB JSON-chunk surgery, replicating P1.05 exactly.** No deviations from the P1.05 attribution-preservation pipeline. Blender 5.1.1's glTF exporter strips `asset.copyright` and `asset.extras` unconditionally on export of the decimated meshes -- empirically reconfirmed in this run by reading a Blender-output LOD1 before reinject (copyright `null`, extras `null`). The reinject step is the safety net, same as P1.05. **Decision: the P1.05 attribution-discipline pattern held cleanly across a second Blender step.** Two-pass empirical confirmation in two consecutive pipelines is strong evidence the pattern is the right shape -- recommend the Orchestrator dispatch an ADR drafting task to canonicalize "Blender-step attribution discipline" so P1.07/P1.08/P2 pipelines inherit the rule explicitly rather than re-discovering it.
- **Sanity-guard threshold for LOD1 small-mesh skip: 100 tris.** Per the prompt. No meshes in the 79-glb canonical set tripped this guard at LOD1 time (the smallest sub-mesh is `uberon_0002445::part_1` at 170 tris, which decimates cleanly at 0.5 to 84 tris). The guard remained dormant for this dataset but is still useful insurance for future BP3D additions or hand-authored small placeholders.
- **Sanity-guard threshold for LOD2 degenerate fallback: 20 tris -> redo at ratio 0.3.** Two meshes tripped this guard: `uberon_0001429::part_1` (pisiform half) at 18 tris -> re-decimated at 0.3 to 56 tris; `uberon_0002445::part_1` at 17 tris -> 50 tris. Both pisiform/carpal-bone halves at the extreme small end of the canonical set. **Implementation choice for the fallback was a single re-import + per-mesh re-decimate at the planned ratio.** I considered (a) re-decimating only the offending mesh in-place (keeps the LOD1-style decimated meshes for everything else, replaces just the bad one) and (b) re-importing fresh source and re-decimating everything per a plan map. Went with (b) because re-decimating an already-applied-Decimate-modifier mesh is geometry-dependent: the Decimate modifier on top of decimated topology produces results that depend on the prior collapse pattern, not on the source topology. Single source -> single result is cleaner and deterministic.
- **`use_collapse_triangulate=False`, `use_symmetry=False` on the Decimate modifier.** Blender 5.1 defaults are sensible (Collapse mode with no symmetry, no triangulation). Explicitly setting these keeps the script self-documenting -- a future Blender version that flips a default won't silently change the LOD output.
- **No UV decimation parameters set.** BP3D meshes carry no useful UVs; Decimate-Collapse decimates position + normal only. No `vertex_group_factor`, no `use_dissolve_boundaries` -- both default off.
- **LOD0 never modified.** Hard rule from the prompt. The pipeline writes only `lod1.glb` and `lod2.glb` next to the existing `lod0.glb`. Empirically verified by file mtimes: post-P1.06 the LOD0 files retain their P1.05 mtimes; only LOD1 + LOD2 are freshly written.
- **`asset.extras.source.lod1_telemetry` + `asset.extras.source.lod2_telemetry` added beyond the prompt's required fields.** Same shape as P1.05's `cleanup_telemetry` extension -- per-mesh decimate report + any fallback notes are embedded into the glb's extras block so a downstream agent (registry-bake, QA) can surface "this LOD2 ran the fallback" or "this mesh saw the small-mesh skip" without re-parsing telemetry JSON. Schema-compatible (`extras` is freeform).
- **Idempotency verified empirically.** Ran the full pipeline twice in succession. Second run produced byte-identical LOD1 + LOD2 files (Blender Decimate-Collapse is deterministic for the same input topology + same ratio; the reinject step deduplicates edit tags before appending). Idempotency was a hard rule from the agent prompt -- now verified.
- **Two non-manifold meshes from P1.05 (ethmoid + sternum body) decimated cleanly with no notes.** No degenerate fallback triggered for either. The non-manifold features themselves (2 edges + 31 verts total from P1.05) were neither cleaned up nor amplified by the Decimate-Collapse pass -- the Decimate modifier operates on the manifold portion of the geometry and ignores stray verts/edges. Open item #7 status is unchanged: still hand-review pending; LOD chain is renderable.
- **Hidden invariant uncovered during smoke test: GLB chunk type field uses NUL padding (0x00), not space (0x20).** P1.05's source-code literal `"BIN "` is actually `"BIN\0"` (4-byte chunk type with NUL byte at index 3) -- the editor visually renders the NUL as a space, but the chunk type bytes on disk are `42 49 4E 00`. obj2gltf (P1.04 source) and Blender's glTF 5.1 exporter both emit NUL-padded chunk type fields. The glTF 2.0 spec actually says the chunk type is one of "JSON" or "BIN" + zero-padding to 4 bytes; the spec text shows " " (space) in examples but the binary layout uses NUL. **P1.06's parseGlb was updated to accept either NUL or space padding** (lenient parse, strict write of NUL to match the rest of the pipeline). This is a robustness improvement over P1.05's literal-NUL check, which would have rejected a future glb that happens to use space padding.

### 2026-05-11 — P1.05

- **Tool: Blender 5.1.1 headless `--background --python` not bmesh-via-CLI nor pure-Python (`pygltflib` / `trimesh`).** The agent prompt requires `bpy.ops.mesh.remove_doubles()` + `bpy.ops.mesh.normals_make_consistent(inside=False)`, both of which are operator-bound to Blender's edit-mode context. Pure-Python glTF libraries can weld duplicates but cannot reproduce Blender's normal-consistency walk, and re-implementing that in Python would be a meaningful project of its own. Blender 5.1.1 was already installed at `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`; the version check returned cleanly. Total Blender wall time for all 79 glbs: 9.83 s (mean ~0.12 s/glb, dominated by Blender's startup overhead per `--background` launch — but only one launch, since `clean_glbs.py` iterates inside the same `bpy` process).
- **Tool sequence: Blender → direct GLB JSON-chunk surgery, not Blender → `gltf-pipeline.processGlb`.** P1.04 used `gltf-pipeline.processGlb` for attribution baking; I considered re-using it but rejected it for P1.05's reinject step. `processGlb` re-validates the whole glTF tree and would resist the asymmetry where the JSON chunk is updated but the BIN chunk is byte-stable. Direct GLB binary surgery — parse the 12-byte header, locate chunk 0 (JSON) and chunk 1 (BIN), mutate the JSON object, re-encode JSON with 4-byte padding per spec, splice the unchanged BIN back in — is ~100 lines of pure-Node and zero npm dependencies. The reinject pass for 79 glbs took under 1 second.
- **Pre-clean metadata snapshot phase is non-negotiable.** Blender's glTF exporter silently replaces `asset.copyright` with `"Blender 5.1.1"` and drops `asset.extras` (verified empirically on the femur smoke test — first export ran with `export_extras=True` but the field came out empty in the round-trip). I changed the export call to `export_extras=False, export_copyright=""` to be explicit and rely entirely on the reinject step. The pre-clean snapshot of `pre-clean-metadata.json` captures every glb's `asset.copyright` + `asset.extras` *before* Blender touches them, so the reinject step has an authoritative source — never re-typing the attribution string.
- **`remove_doubles` threshold 1e-4 m (0.1 mm).** Conservative. BP3D meshes are in approximate human-scale metres (a femur is ~0.45 m end-to-end). 0.1 mm welds true coincident vertices (typical at OBJ-group seams, paired-bone halves where the two halves don't quite meet, etc.) but won't collapse legitimate close-but-distinct features.
- **Non-manifold geometry: tag-and-log, do not auto-delete.** Two of the 79 glbs have residual non-manifold features (`uberon_0001679` ethmoid bone: 2 edges + 7 verts; `uberon_0006820` body of sternum: 24 verts). Both are anatomically real structures whose BP3D mesh has noisy intricate geometry that a naive `delete_loose` would alter. Logged in open items #7 for hand-review.
- **Paired-bone laterality preserved structurally.** Blender's glTF importer maps each OBJ `g group` to a separate `Object` (`part_0_1`, `part_1_1` after Blender's renaming). My script processes each as its own mesh and the exporter re-emits them as separate glTF `mesh` nodes. This satisfies P1.04's outbound handoff (laterality stays selectable at runtime). The semantic `left`/`right` `extras` tag is deferred (see open item #8).
- **Backup-and-restore on failure.** Each glb is `shutil.copy2`'d to `lod0.glb.original-backup` before Blender touches it; on success the backup is unlinked, on failure the backup is copied back in place. 0 failures across the 79-glb pass — backup mechanism never triggered, but the safety net stayed in place.
- **Idempotency verified empirically.** The femur was processed twice (once during the single-glb smoke test, then again during the full pass). After the smoke test the femur was 3157 verts; the full pass re-welded it as 3157 → 3157 (no further changes, deterministic). The `edits[]` array also deduplicated correctly — the cleanup tag appears once, not twice, in `asset.extras.source.edits[]`.
- **`extras.source.cleanup_telemetry` added beyond the prompt's required fields.** The prompt asked for `edits[]` appended with a cleanup string. I also embedded the per-glb non-manifold counts and verts/tris before-after into `extras.source.cleanup_telemetry` so a downstream agent (QA, registry-bake) can surface "this mesh has X non-manifold features" without re-parsing `clean-telemetry.json`. Schema-compatible — `extras` is freeform by glTF spec.

### 2026-05-11 — P1.04

- **Conversion tool: `obj2gltf` (npm package, programmatic API).** Picked over `gltf-pipeline`-only or Blender-headless or `assimp` CLI because: (a) Node-native — no system tool dependency, runs identically on Windows + macOS + Linux; (b) returns a glb `Buffer` directly when `binary: true`, no temp files; (c) `obj2gltf`'s author is the same team that maintains `gltf-pipeline` (CesiumGS), so the two integrate cleanly; (d) sub-second per-OBJ conversion. Total wall time for 79 conversions including the merge step: ~50 seconds.
- **Attribution injection: `gltf-pipeline.processGlb` with a `customStages` post-process hook.** `obj2gltf` does not expose CLI flags for `asset.copyright` / `asset.extras` (its `--copyright` flag was removed in v3). Approach taken: convert OBJ → glb buffer with `obj2gltf`, then pipe through `processGlb({ customStages: [fn(gltf){ ...mutate gltf.asset... }] })` which mutates the JSON header and re-packs the binary container. Verified independently by reading the resulting glb's 12-byte header + JSON chunk and parsing `asset.copyright` + `asset.extras.source` back. Three sample meshes (mandible, femur, rib 8) all pass; spot-check correct on a fourth (the gap case — `uberon_4200172` correctly absent).
- **ZIP extraction: `adm-zip` Node package, not the system `unzip` CLI.** Initial attempt used `execSync("unzip -p ... | redirect")` via `/usr/bin/bash`, which works in Git Bash but Node's `child_process` on Windows defaults to `cmd.exe` and cannot find `/usr/bin/bash`. `adm-zip` is pure-JS and reads the same ZIP without external dependencies. The extracted OBJ cache lives in `pipelines/01-import-bp3d/.cache/obj/` (gitignored) and is reused across re-runs (idempotency).
- **Paired-bone merge strategy.** BP3D's IS-A hierarchy ships left + right copies of every paired bone as separate FJ-prefixed OBJs that both inherit from the parent FMA concept (e.g. "rib 1" FMA:7597 → FJ3228 (left) + FJ3334 (right)). The TSV pivot returns both rows for these concepts. For the canonical mesh, the right behaviour is "merge both halves into one glb under the UBERON id" because the UBERON node represents the anatomical concept ("rib 1"), not a side. The merge is implemented in-place at the OBJ-text level by rebasing `v`/`vn`/`vt` indices across the two files. `g` groups are renamed to `part_0` / `part_1` so each half remains a distinguishable mesh node inside the glTF (preserves laterality at render time without requiring a second asset load). 45 of the 79 produced glbs are paired-bone merges.
- **Procedural femur proxy preserved.** Per the agent prompt's sharp-edge note, the existing `procedural/femur-proxy-threejs` entry in `data/derived/mesh-registry.json` was NOT touched. The real BP3D-derived femur is now at `data/canonical/meshes/uberon_0000981/lod0.glb` (117 KB) alongside it. P1.08 (registry rebuild) reconciles the two — likely promoting the BP3D mesh to primary and demoting the procedural to a fallback.
- **Rib 8 (UBERON:0010757) and Thoracic T8 (UBERON:0011050) anomalies handled via FMA pivot.** Both are non-contiguous in their UBERON sibling sequences, but `aliases.fma` is the only pivot consulted; ID arithmetic is never used. Result: rib 8 → FMA:8120 → FJ3235+FJ3347, T8 → FMA:9991 → FJ3174 — both converted normally. Neck-of-humerus (UBERON:4200172) with its high-prefix 7-digit ID was a gap (FMA:23356 not in BP3D) but the high prefix produces a valid Windows directory name `uberon_4200172/`, schema-compatible.
- **glb sizes much smaller than the spec's lower-bound estimate.** Smallest 10 KB (pisiform), largest 980 KB (scapula). Mean 118 KB. Total 9.36 MB across 79 files — comfortably within the LFS budget and consistent with the "99% decimation" upstream tier.

### 2026-05-11 — P1.03

- **Download source chosen:** `dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/` (the LSDB Archive file host that the canonical project page at `lifesciencedb.jp/bp3d/` links to). Verified by separate HEAD requests on the two ZIP archives — both returned HTTP 200 with `Last-Modified: Wed, 22 May 2013 06:46:24 GMT` for isa and `06:45:40 GMT` for partof. This timestamp matches ADR 0005's note that "BodyParts3D underlying data has not been updated since 2013." No silent substitution; the canonical URL is alive.
- **Archive variants chosen:** the 99% reduction tier (`*_obj_99.zip`). The 95% tier (`*_obj_95.zip`, much larger per the upstream README) was NOT downloaded. Rationale: Phase 1 produces our own LODs via `pipelines/03-decimate-lods`; we need clean polygons for LOD0 but don't need the heaviest mesh density the upstream offers. The 99% file is the right tradeoff between source quality and download budget.
- **Both hierarchies downloaded** (IS-A and PART-OF). IS-A is the primary pivot for the FMA crosswalk; PART-OF is reserved for Phase 2+ compound-organ assembly. Per-source download size justifies keeping both rather than re-downloading later.
- **Auto-download path taken** (not the manual-instructions deferred path) because total size 210 MB is under the 500 MB threshold defined in the task brief.
- **Raw-vs-tracked split in `.gitignore`:** mesh ZIPs are ignored (reproducible from URLs), text metadata + README + LICENSE are tracked. Pattern uses an `ignore + re-include` shape (`data/raw/*/*` then `!data/raw/*/README.md` etc.) rather than per-extension ignores, which lets future per-source folders inherit the same shape automatically.

## Handoffs

### Outbound — to Asset Pipeline (next invocation, P1.07 validate-ontology OR P1.08 bake-registry)

The next agent run consumes:

- **237 canonical glbs** under `data/canonical/meshes/uberon_NNNNNNN/` — three files per directory:
  - `lod0.glb` — full-detail cleaned master from P1.05 (unchanged by P1.06). Total 8.80 MB, 478,717 tris.
  - `lod1.glb` — ~50% LOD generated by P1.06 (Blender Decimate-Collapse, ratio 0.5). Total 4.52 MB, 239,293 tris (50.0% of LOD0).
  - `lod2.glb` — ~10% LOD generated by P1.06 (ratio 0.1, with per-mesh ratio-0.3 fallback for 2 carpal-bone halves). Total 1.05 MB, 47,823 tris (10.0% of LOD0).
- All 237 glbs carry `asset.copyright` (verbatim BodyParts3D attribution) and `asset.extras.source` (full provenance) per ADR 0006. `extras.source.edits[]` shows the full pipeline chain:
  - LOD0: `["obj_to_glb_conversion", (optional)"merged_2_fj_obj_into_one_glb", "blender_5.1.1_cleanup:remove_doubles+normals_make_consistent"]`
  - LOD1: above + `"blender_5.1.1_decimate:lod1_ratio_0.5"`
  - LOD2: above + `"blender_5.1.1_decimate:lod2_ratio_0.1"` and (when fallback applied) `"blender_5.1.1_decimate:lod2_ratio_0.3_fallback"`
- 79 `source.txt` files updated with a `## LODs (P1.06)` section: per-LOD totals, per-mesh tris (LOD0 -> LOD1 -> LOD2), any fallback notes, edit-tag list.
- `pipelines/03-decimate-lods/` complete: `decimate_lods.py`, `reinject_attribution.mjs`, `update_source_txt.mjs`, `verify.mjs`, `run.ps1`, `package.json`, `README.md`, `.gitignore`. Idempotent — re-running reproduces byte-identical LOD1 + LOD2 files.
- `pipelines/03-decimate-lods/decimate-telemetry.json` per-run telemetry (gitignored). 79 successes, 0 failures. Wall time 23.44 s for the Blender pass + <1 s for reinject + <1 s for source.txt update.

**Pipeline 04-validate-ontology responsibilities (P1.07) -- if dispatched next:**

1. **Cross-check every canonical mesh's `asset.extras.source.fma_id` (and original UBERON id derived from the directory name `uberon_NNNNNNN`) against `data/canonical/ontology/nodes.json`.** Every mesh's UBERON id must exist as a node with `kind: "structure"` in nodes.json, and the FMA alias should be present under `aliases.fma`. Flag any mismatch.
2. **Cross-check the inverse: every `kind: "structure"` node in nodes.json that has an `aliases.fma` should either have a canonical mesh on disk OR be in the P1.04 gap report.** 29 are in the gap report. The other 79 must each map to a `data/canonical/meshes/uberon_NNNNNNN/` directory with all three LOD files present.
3. **Validate the LOD chain is monotonic.** For each directory, LOD0 tris > LOD1 tris > LOD2 tris (already true post-P1.06 across the canonical set; this is a regression guard for future runs).
4. **Do not modify any glb.** P1.07 is validation only. Any failure flagged for hand-review / P1.06 re-run.

**Pipeline 05-bake-registry responsibilities (P1.08) -- if dispatched next:**

1. **Emit `data/derived/mesh-registry.json`** following the `mesh-asset-manifest.json` schema. For each of the 79 UBERON ids, write a registry entry containing:
   - `id`: the UBERON id
   - `kind`: "structure"
   - `aliases`: pulled from nodes.json
   - `lods`: `[{path: "data/canonical/meshes/uberon_NNNNNNN/lod0.glb", tris: N, bytes: B}, ... LOD1 ..., ... LOD2 ...]`
   - `provenance`: pulled from each glb's `asset.extras.source` (preserves the full chain).
   - `bounds`: AABB computed by parsing each glb's POSITION accessors and walking min/max.
2. **Reconcile the procedural femur proxy.** The user's existing `procedural/femur-proxy-threejs` entry should be demoted to a fallback or removed; the real BP3D femur at `data/canonical/meshes/uberon_0000981/` is the primary going forward. Anatomy Domain should sign off on this before P1.08 commits.
3. **Synthesize the virtual whole-sternum entry.** Per state-log open item #6, P1.08 can compose a UBERON:0000975 entry referencing the three sternum-piece glbs (manubrium / body / xiphoid) without needing a new mesh extraction. Anatomy Domain decision required.
4. **Emit per-mesh thumbnails.** Out of scope until a renderer is available; P1.08 should leave `thumbnails: null` in the registry for now (or generate a placeholder).
5. **Emit `data/derived/spatial-index.bin`.** AABB-based spatial index for runtime culling. Format defined by the 3D Engine agent.
6. **Flag the two `lod2_ratio_0.3_fallback` glbs in the registry.** Add a `quality_notes: ["lod2_used_ratio_0.3_fallback"]` field on `uberon_0001429` and `uberon_0002445` so the QA agent can spot-check them post-bake.

### Outbound — older P1.05 handoff (closed by this invocation)

Completed by P1.06:
- LOD1 (~50%) and LOD2 (~10%) generated for every glb under `data/canonical/meshes/uberon_*/lod0.glb`. ✓
- Attribution preserved across both new LOD levels via the same pre-snapshot + post-Blender reinject pattern as P1.05. Independently verified on three samples (femur, mandible, rib 8). ✓
- Paired-bone multi-mesh structure preserved across LOD1 + LOD2 (laterality still selectable at runtime). ✓
- Two P1.05 non-manifold meshes (ethmoid + sternum body) decimated cleanly with no degenerate-fallback trigger. They remain on the hand-review list. ✓
- Hard rule "LOD0 read-only after P1.05" respected: only new LOD1 + LOD2 files written. ✓

### Outbound — older P1.04 handoff (closed by P1.05, but documented here for chain audit)

The next agent run (now P1.05's outbound to P1.06, closed above) consumed:

- 79 canonical glbs under `data/canonical/meshes/uberon_NNNNNNN/lod0.glb` (~8.36 MB total after weld). All carry `asset.copyright` and `asset.extras.source` per ADR 0006, plus `extras.source.edits[]` containing the cleanup tag and `extras.source.cleanup_telemetry`. Sizes range 9.7 KB (pisiform) to 916 KB (scapula), mean 110.9 KB. **Net welding removed 23,343 vertices / 19 triangles across the 79 meshes** (8.9% vert reduction, 0.004% tri reduction — the tri delta is tiny because welding mostly collapses coincident verts on shared edges/seams, not whole triangles).
- 79 `source.txt` files updated with a `## Cleanup (P1.05)` section showing per-glb before/after geometry, non-manifold counts, and file-size delta.
- `pipelines/02-clean-meshes/` complete: `clean_glbs.py`, `reinject_attribution.mjs`, `update_source_txt.mjs`, `verify.mjs`, `run.ps1`, `package.json`, `README.md`, `.gitignore`. Idempotent — re-running reproduces the same output.
- `pipelines/02-clean-meshes/clean-telemetry.json` per-run telemetry (gitignored). 79 successes, 0 failures. Total wall time 9.83 s for the Blender pass + <1 s for reinject.

**Pipeline 03-decimate-lods responsibilities (P1.06):**

1. **Generate LOD chain per glb.** Per the agent prompt's hard rules: minimum LOD0 (cleaned master) + LOD2 (~10% of LOD0). LOD1 (~50%) is optional but recommended for the runtime's mid-range tier. Each LOD goes alongside `lod0.glb` as `lod1.glb` / `lod2.glb` in the same directory.
2. **Use Blender's Decimate modifier (Collapse mode), not Quadric Edge Collapse via Python.** Same toolchain as P1.05: invoke Blender headless with a Python script. The Decimate modifier is content-aware and preserves silhouette better than naive vertex-cluster reduction. Set `ratio=0.5` for LOD1 and `ratio=0.1` for LOD2; for the smallest glbs (pisiform at 9.7 KB) LOD2 may be the same as LOD0 — that's acceptable, drop the LOD2 entry from the registry rather than emitting a duplicate.
3. **Preserve attribution across LODs.** Same pattern as P1.05: snapshot the source metadata before decimation, run Blender, reinject `asset.copyright` and `asset.extras.source` into each output LOD. Append a new `edits[]` entry per LOD level (e.g. `"blender_5.1.1_decimate:collapse_ratio_0.5"` for LOD1).
4. **Two non-manifold meshes need a decision per node.** `uberon_0001679` (ethmoid bone) and `uberon_0006820` (body of sternum) have residual non-manifold features (see open item #7). Decimating non-manifold geometry can produce weird tearing; the safest path is to log the issue and either (a) flag the structure for hand-edit and produce only LOD0 + LOD2 (skipping LOD1) for now, or (b) accept the visual artefacts on these two meshes since LOD2 is low-detail enough to mask them. Recommend option (b) with a note in the decimation report.
5. **Sub-structure synthesis (deferred to P1.08 or hand-author task).** The 29 gap structures from the gap report still need a decision per node — unchanged from the P1.04 handoff. P1.06 only decimates existing canonical glbs.

### Outbound — older P1.04 handoff (closed by this invocation)

Completed by P1.05:
- Blender 4.x/5.x cleanup pass run against `data/canonical/meshes/<id>/lod0.glb` (Blender 5.1.1 verified). ✓
- `asset.copyright` and `asset.extras.source` preserved across the round-trip via the pre-Blender snapshot + post-Blender JSON-chunk reinject. Verified independently on three samples (femur, mandible, rib 8) and on all 79 via `reinject-report.json`. ✓
- Paired-bone glbs retain their two `mesh` nodes (laterality remains selectable). The semantic `extras.laterality` tag is logged for a downstream pass (open item #8). ✓
- 2 glbs flagged with residual non-manifold geometry (open item #7), not auto-deleted. ✓

### Outbound — original P1.04 handoff to Asset Pipeline (P1.05 — closed by this invocation)

The next agent run consumes:

- 79 canonical glbs under `data/canonical/meshes/uberon_NNNNNNN/lod0.glb` (~9.36 MB total). All carry `asset.copyright` and `asset.extras.source` per ADR 0006. Sizes range 10 KB (pisiform) to 980 KB (scapula), mean 118 KB.
- 79 `source.txt` provenance files next to each glb. Human-readable backup of the in-glb metadata.
- `pipelines/01-import-bp3d/gap-report-2026-05-11.md` listing 29 sub-structures that BP3D does not ship.
- `pipelines/01-import-bp3d/convert.js` + `smoke-femur.js` + `verify.js` (idempotent — re-running reproduces the same output).
- `pipelines/01-import-bp3d/p1.04-run-summary.json` per-run telemetry (gitignored).

**Pipeline 02-clean-meshes responsibilities (P1.05):**

1. **Blender headless cleanup pass.** Asset Pipeline hard rule says: cleanup happens against the extracted/canonical copy, never against `data/raw/`. P1.05 should consume each `data/canonical/meshes/<id>/lod0.glb`, run a deterministic Blender Python script (fix normals, weld duplicate vertices within ε, remove non-manifold geometry, ensure consistent face winding), and write the cleaned glb back. **The cleanup script must preserve `asset.copyright` and `asset.extras.source`** (Blender's glTF exporter drops these by default — must be re-baked post-export, or the Python script reads them from the input glb and writes them back).
2. **Blender install status check.** The user has not yet confirmed whether `blender` is on PATH on this Windows machine. **Pre-flight requirement for P1.05**: the agent must verify `blender --version` returns 4.x before launching the headless cleanup loop. If absent, escalate to the user with: "Phase 1 needs Blender 4.x installed and on PATH for the cleanup step; download from blender.org/download or via winget."
3. **For paired-bone merged glbs**, the cleanup script should preserve the two `mesh` nodes (one per side) rather than welding them into one — laterality should remain selectable at runtime. Add an `extras.laterality: "left" | "right"` tag to each mesh node where applicable. The merge step left both halves as `g part_0` / `g part_1` in the OBJ; obj2gltf maps each `g` to a separate glTF `mesh`.
4. **Sub-structure synthesis (deferred to P1.08 or hand-author task).** The 29 gap structures from the gap report need a decision per node: synthesize procedurally from the parent mesh, hand-author a small placeholder mesh, or leave the registry entry as `has_mesh: false` until Phase 2. The femur sub-features (head/neck/shaft/condyles/trochanters) are the highest-priority candidates because the user's existing procedural femur proxy already exists as a coordinate-system anchor.

### Outbound — older P1.03 handoff (closed by this invocation)

Completed by P1.04:
- ZIP extracted via Node `adm-zip` to `pipelines/01-import-bp3d/.cache/obj/` (gitignored). Not re-extracted to `data/raw/`. ✓
- `isa_element_parts.txt` parsed into FMA → [FJ-id, ...] map; multi-FJ entries (45 of 79) handled via OBJ-level merge with index rebasing. ✓
- For the 108 `kind: "structure"` nodes in nodes.json: 79 produced canonical glbs; 29 logged as gaps in the report. ✓
- Each glb's `asset.copyright` carries the verbatim BodyParts3D attribution string; `asset.extras.source` carries `{source, license, original_id, fma_id, ingested_at, edits}`. Verified by independent header parse on three samples. ✓

### Inbound — none yet

No prior agent has handed off to Asset Pipeline. P1.03 was this agent's first invocation; P1.04 was self-chained.

## Invocation history

### 2026-05-11 — Invocation #4 (P1.06 — Blender headless LOD chain generation via Decimate modifier)

- **Dispatched by:** Orchestrator per `docs/orchestrator/phase-1-spec.md` dispatch plan step 6. Self-chained from P1.05 within the asset-pipeline agent.
- **Inputs read:** asset-pipeline agent prompt, this state file (post-P1.05), ADR 0006 (runtime attribution), sample `source.txt` for femur (UBERON:0000981) showing the existing `## Cleanup (P1.05)` block, the P1.05 pipeline reference implementation (`clean_glbs.py`, `reinject_attribution.mjs`, `update_source_txt.mjs`, `verify.mjs`, `run.ps1`, `package.json`, `README.md`, `.gitignore`) -- replicated the pattern with LOD-specific changes.
- **Actions taken:**
  - Created `pipelines/03-decimate-lods/` working folder (removed the placeholder `.gitkeep`).
  - Wrote `decimate_lods.py` (Blender 5.1.1 Python, ~330 lines): per-mesh `DECIMATE` modifier in `COLLAPSE` mode at ratio 0.5 (LOD1) and 0.1 (LOD2), with two sanity guards (small-mesh skip < 100 tris for LOD1; degenerate fallback < 20 tris -> redo at 0.3 for LOD2 via single-pass re-import + per-mesh ratio plan). Writes lod1.glb + lod2.glb next to existing lod0.glb. Never modifies LOD0. Emits `decimate-telemetry.json`.
  - Wrote `reinject_attribution.mjs` (Node ESM, zero npm deps, ~260 lines): same shape as P1.05's reinject, two modes (`--snapshot` + `--reinject`). Snapshot reads every LOD0 metadata; reinject walks decimate-telemetry, restores `asset.copyright` + `asset.extras.source` via direct GLB JSON-chunk surgery into both LOD1 + LOD2 outputs, appends LOD-specific edit tags (`blender_5.1.1_decimate:lod1_ratio_0.5`, `lod2_ratio_0.1`, optional `lod2_ratio_0.3_fallback`), embeds `lod1_telemetry` + `lod2_telemetry` per-mesh records into extras.
  - Wrote `update_source_txt.mjs` (Node ESM, ~150 lines): appends idempotent `## LODs (P1.06)` section with per-LOD totals, per-mesh tri-counts (LOD0 -> LOD1 -> LOD2 paired by mesh name), fallback notes, edit-tag list. Replaces any prior block on re-run.
  - Wrote `verify.mjs` (Node ESM, ~110 lines): walks three canaries (femur, mandible, rib 8) across all three LOD levels, asserts (a) attribution survives at LOD0/LOD1/LOD2, (b) edits[] reflects the full pipeline chain at each level, (c) tris are strictly monotonically decreasing.
  - Wrote `run.ps1` (PowerShell orchestrator): 5-step pipeline (snapshot -> Blender -> reinject -> source.txt -> verify) with `-SmokeTarget`, `-SkipBlender`, `-SkipReinject`, `-SkipSnapshot`, `-SkipSourceTxt`, `-SkipVerify`. Pre-flight checks Blender path. No npm install needed (zero-dep).
  - Wrote `package.json`, `README.md`, `.gitignore` -- same shape as P1.05.
  - **Debugging round during the smoke test:** parseGlb threw `expected BIN chunk, got 'BIN '` on the first run -- discovered P1.05's source-code literal `"BIN "` is actually `"BIN\0"` (NUL byte) which the editor renders as a space. obj2gltf + Blender's exporter both emit NUL-padded chunk type fields. **Updated parseGlb to accept either NUL or space, and updated buildGlb to emit NUL explicitly** (matches the rest of the pipeline).
  - Ran single-glb smoke test on the femur (UBERON:0000981 / FMA:9611): LOD0 6306 tris -> LOD1 3152 -> LOD2 630. Attribution survived intact. PASS.
  - Ran full 79-glb pass: 23.44 s Blender + <1 s reinject + <1 s source.txt update.
  - Verification gate passed (3 sample LOD chains -- 9 file reads in total -- attribution + edit chain + monotonic tri-order all OK).
  - Ran the full pipeline a second time end-to-end to confirm idempotency: byte-identical LOD1 + LOD2 outputs on re-run; edit tags deduplicated rather than accumulated.
  - Ran `npm run verify` in `app/web/`: typecheck ✓, 7 schemas validated ✓, vite build green (49 modules, gzip 168.35 kB).
- **Output state:**
  - **158 new glb files** (`lod1.glb` + `lod2.glb` in every `uberon_*` directory).
  - **79 `source.txt` files updated** with the LODs (P1.06) section.
  - 8 pipeline files in `pipelines/03-decimate-lods/` (tracked): `decimate_lods.py`, `reinject_attribution.mjs`, `update_source_txt.mjs`, `verify.mjs`, `run.ps1`, `package.json`, `README.md`, `.gitignore`.
  - Gitignored: `decimate-telemetry.json`, `pre-lod-metadata.json`, `reinject-report.json`, `p1.06-full-run.log`, `p1.06-smoke-femur.log`.
- **Geometry deltas across the 79-glb canonical set (LOD0 -> LOD1 -> LOD2):**
  - Triangles: **478,717 -> 239,293 -> 47,823** (49.99% reduction at LOD1, 80.02% reduction LOD1->LOD2, 90.01% reduction overall). Exactly on-target for the 50%/10% ratios.
  - Bytes (post-reinject, on disk): **8,803,760 -> 4,518,988 -> 1,048,124** (LOD1 51.3% of LOD0, LOD2 11.9% of LOD0). Total LOD chain on disk: 14,370,872 bytes (~14.37 MB across 237 glbs).
  - LOD1 small-mesh skips: **0** (smallest sub-mesh is 170 tris, above the 100-tri guard threshold).
  - LOD2 degenerate-fallbacks (ratio 0.3 substitution): **2** -- both on small carpal-bone "part_1" sub-meshes (`uberon_0001429`, `uberon_0002445`). See open item #0.
- **Status of P1.05 hand-review glbs under decimation:**
  - `uberon_0001679` (ethmoid bone, 2 non-manifold edges + 7 non-manifold verts pre-LOD): decimated cleanly LOD0=22,265 -> LOD1=11,132 -> LOD2=2,225. No fallback. Pre-existing non-manifold features preserved (Decimate didn't auto-clean them).
  - `uberon_0006820` (body of sternum, 24 non-manifold verts pre-LOD): decimated cleanly LOD0=4,638 -> LOD1=2,319 -> LOD2=462. No fallback. Pre-existing non-manifold features preserved.
  - Both remain on the open-item #7 hand-review list (unchanged status). Note: the 2 non-manifold edges + 31 verts logged at P1.05 are still present in the chain. Decimation operates on the manifold portion of the mesh; stray verts/edges pass through unchanged.
- **Three-sample verification output (femur, mandible, rib 8):**
  - femur (UBERON:0000981, paired): LOD0=6306 tris, LOD1=3152, LOD2=630; copyright + 4-entry edits[] chain on LOD1/LOD2; tri-order monotonic decreasing -- PASS
  - mandible (UBERON:0001684, single): LOD0=5576, LOD1=2788, LOD2=556; copyright + 3-entry edits[] chain on LOD1 / 3-entry on LOD2 (no P1.04 merge tag because mandible is single-FJ); monotonic -- PASS
  - rib 8 (UBERON:0010757, paired): LOD0=16672, LOD1=8336, LOD2=1664; copyright + 4-entry edits[] chain; monotonic -- PASS
- **Sharp edges encountered:**
  - Hidden invariant: GLB chunk type field is NUL-padded (`42 49 4E 00`), not space-padded (`42 49 4E 20`). The glTF 2.0 spec is ambiguous in this respect; obj2gltf and Blender both emit NUL. P1.05's source-code literal `"BIN "` is actually `"BIN\0"`. Editor display rendered the NUL as a space, which I copied verbatim into P1.06's first draft; got a parse error on the smoke test. **Fix: P1.06's parser now accepts either NUL or space padding, and the writer emits NUL explicitly to match the rest of the pipeline.**
  - Blender's glTF exporter at 5.1 silently strips attribution -- empirically confirmed again on this run (read a Blender-output LOD1 before reinject; copyright was absent). The reinject pass is the safety net, not an optimization. **The P1.05 attribution-discipline pattern held cleanly across two consecutive Blender pipelines -- strong evidence the pattern is the right shape.** Recommend the Orchestrator dispatch an ADR drafting task to canonicalize "Blender-step attribution discipline" before P2 pipelines run.
  - Decimate-Collapse on already-decimated topology is unsafe -- the LOD2 fallback path (when a mesh's ratio-0.1 result is below 20 tris and we want a ratio-0.3 result instead) requires a fresh import + re-decimate from the source, not "re-decimate the already-collapsed mesh." Made this explicit in the Blender script: a single re-import + per-mesh plan map for the fallback case keeps the operation deterministic.
- **Time spent:** ~35 minutes wall time including writing all 8 pipeline files, BIN-chunk-type-padding diagnosis + fix, smoke test, full run, idempotency re-run, app/web verify, state-log update.
- **Return status:** Complete. Handed back to Orchestrator with summary. Next Asset Pipeline invocation is **P1.07 (validate-ontology cross-check) OR P1.08 (bake-registry)** per the updated handoff above -- Orchestrator decides which to dispatch.

### 2026-05-11 — Invocation #3 (P1.05 — Blender headless cleanup + attribution re-injection)

- **Dispatched by:** Orchestrator per `docs/orchestrator/phase-1-spec.md` dispatch plan step 5. Self-chained from P1.04 within the asset-pipeline agent; gated on the user confirming Blender 5.1.1 is installed at `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`.
- **Inputs read:** asset-pipeline agent prompt, this state file (post-P1.04 — own previous-invocation log), ADR 0006 (runtime attribution), sample `source.txt` for femur (UBERON:0000981), the pipeline 01 reference implementation (`convert.js`, `verify.js`, `package.json`, `.gitignore`).
- **Actions taken:**
  - Created `pipelines/02-clean-meshes/` working folder (removed the placeholder `.gitkeep`).
  - Wrote `clean_glbs.py` (Blender 5.1.1 Python, ~250 lines): per-mesh `remove_doubles(threshold=1e-4)` + `normals_make_consistent(inside=False)` + non-manifold edge/vert counters. Backs up each glb to `lod0.glb.original-backup` before touching; deletes the backup on success, restores it on failure. Emits `clean-telemetry.json` per-run.
  - Wrote `reinject_attribution.mjs` (Node ESM, zero npm deps, ~200 lines): two modes — `--snapshot` (walks every glb pre-Blender and saves `pre-clean-metadata.json`); `--reinject` (post-Blender, walks the cleaned glbs, splices the original `asset.copyright` + `asset.extras.source` back via direct GLB JSON-chunk surgery, appends the cleanup edit tag to `edits[]`, embeds non-manifold + verts/tris telemetry into `extras.source.cleanup_telemetry`). Both rebuild the GLB binary with proper 4-byte JSON chunk padding per the glTF spec.
  - Wrote `update_source_txt.mjs` (Node ESM, ~80 lines): appends an idempotent `## Cleanup (P1.05)` section to each glb's sibling `source.txt`. Re-runs replace the prior block rather than accumulate.
  - Wrote `verify.mjs` (Node ESM, ~75 lines): the verification gate. Parses femur / mandible / rib 8 cleaned glbs, asserts attribution survives + cleanup edit tag is present + mesh count > 0.
  - Wrote `run.ps1` (PowerShell orchestrator): 5-step pipeline (snapshot → Blender → reinject → update source.txt → verify) with a `-SmokeTarget` flag for single-glb runs and `-SkipBlender` / `-SkipReinject` / `-SkipSnapshot` for partial re-runs. Pre-flight checks Blender path + runs `npm install` if `node_modules` is missing.
  - Wrote `package.json`, `README.md`, `.gitignore` — same shape as P1.04's pipeline.
  - Ran single-glb smoke test on the femur (UBERON:0000981 / FMA:9611): cleaned 3197→3157 verts across 2 mesh objects (paired bone preserved), 0 non-manifold, file 117 KB → 115 KB. Attribution survived intact.
  - Ran full 79-glb pass: 9.83 s Blender + <1 s reinject + <1 s source.txt update. 79/79 successes, 0 failures.
  - Verification gate passed (3 sample glbs, attribution + cleanup tag + structure all OK).
  - Ran `npm run verify` in `app/web/`: typecheck ✓, 7 schemas validated ✓, vite build green (49 modules, gzip 168.35 kB).
- **Output state:**
  - **79 canonical glbs rewritten in place** in `data/canonical/meshes/uberon_*/lod0.glb`. Per-glb backup files removed (0 failures meant 0 restores).
  - **79 `source.txt` files updated** with the cleanup section.
  - 7 pipeline scripts + README + package.json + .gitignore in `pipelines/02-clean-meshes/` (tracked).
  - Gitignored: `clean-telemetry.json`, `pre-clean-metadata.json`, `reinject-report.json`, `p1.05-full-run.log`, `node_modules/`, `package-lock.json`, any `.original-backup` files.
- **Geometry deltas across the 79-glb canonical set:**
  - Vertices: **262,862 → 239,519** (welded **23,343 vertices**, 8.9% reduction).
  - Triangles: **478,736 → 478,717** (Δ −19; welding collapses coincident verts on shared edges/seams, not whole triangles).
  - Non-manifold edges total: **2** (all on `uberon_0001679` ethmoid bone).
  - Non-manifold verts total: **31** (7 on ethmoid, 24 on `uberon_0006820` body of sternum).
  - Bytes: **9,354,944 → 8,761,408** (**−593,536 bytes, −579.62 KB, −6.34%**). Cleaned glbs shrunk thanks to fewer vert/normal/uv entries in the BIN chunk.
- **Top welding wins (by vert delta):**
  - `uberon_0000210` (mandibular nerve / cranial nerve V3 in BP3D's pivot) — 16,395 → 13,110 (−3,285 verts)
  - `uberon_0002397` — 7,090 → 5,243 (−1,847)
  - `uberon_0006820` (body of sternum, single mesh) — 3,691 → 2,327 (−1,364)
  - `uberon_0001679` (ethmoid bone, single mesh) — 12,484 → 11,181 (−1,303)
  - `uberon_0000209` — 8,472 → 7,257 (−1,215)
- **Three-sample verification output (femur, mandible, rib 8):**
  - femur: 2 meshes, 115,808 B, edits=`["obj_to_glb_conversion","merged_2_fj_obj_into_one_glb","blender_5.1.1_cleanup:remove_doubles+normals_make_consistent"]`, non-manifold 0/0 — PASS
  - mandible: 1 mesh, 101,924 B, edits=`["obj_to_glb_conversion","blender_5.1.1_cleanup:..."]`, non-manifold 0/0 — PASS
  - rib 8: 2 meshes, 302,408 B, edits=`["obj_to_glb_conversion","merged_2_fj_obj_into_one_glb","blender_5.1.1_cleanup:..."]`, non-manifold 0/0 — PASS
- **Sharp edges encountered:**
  - Blender's glTF exporter (`io_scene_gltf2`) in 5.1 silently overwrites `asset.copyright` even with `export_copyright=""` (it writes the Blender-version string by default unless the field is explicitly cleared after the fact). Resolved by always running the reinject step — it's the safety net, not an optimization.
  - Blender's `--background` mode exits 0 by default regardless of script outcome; explicit `sys.exit(rc)` at the end of `clean_glbs.py` is what surfaces failures to the PowerShell orchestrator.
  - The JSON chunk in GLB v2 must be padded to a 4-byte boundary with 0x20 (space) characters — not 0x00. The BIN chunk is padded with 0x00. Getting this wrong produces a glb that some viewers (and our verifier) parse fine but other glTF tools reject. The direct-surgery code path handles both.
  - The femur was processed twice (smoke test + full pass) — confirmed idempotent: second pass welded 0 additional verts, the `edits[]` array deduplicated the cleanup tag rather than appending it twice.
- **Time spent:** ~25 minutes wall time including writing all 7 pipeline files, smoke test debugging, full run, verification, state-log update.
- **Return status:** Complete. Handed back to Orchestrator with summary. Next Asset Pipeline invocation is **P1.06 (LOD chain generation via Blender Decimate modifier)** per the updated handoff above.

### 2026-05-11 — Invocation #2 (P1.04 — OBJ → glb conversion + attribution baking)

- **Dispatched by:** Orchestrator per `docs/orchestrator/phase-1-spec.md` dispatch plan step 4. Self-chained from P1.03 (no other agent ran in between).
- **Inputs read:** asset-pipeline agent prompt, this state file (post-P1.03), ADR 0004 (UBERON primary), ADR 0006 (runtime attribution), `data/canonical/ontology/nodes.json` (125 nodes total, 108 with `kind: "structure"`), `data/raw/bodyparts3d/isa_element_parts.txt`, `data/raw/bodyparts3d/README.md`, `app/shared/schema/mesh-asset-manifest.json` (for output-shape consistency).
- **Actions taken:**
  - Created `pipelines/01-import-bp3d/` working folder. Installed `obj2gltf`, `gltf-pipeline`, `adm-zip` locally via npm.
  - Wrote `convert.js` (full pipeline) + `smoke-femur.js` (single-mesh smoke test) + `verify.js` (independent glb-header re-parse).
  - Ran smoke test on femur (UBERON:0000981 / FMA:9611 / FJ3259 + FJ3365) — produced a 117 KB glb with `asset.copyright` and `asset.extras.source` correctly populated. Parsed the glb header back independently and confirmed.
  - Ran full conversion across all 108 `kind: "structure"` nodes: 79 successful glbs, 29 expected gaps, 0 conversion failures. Wall time ~50 seconds.
  - Verification pass on 3 representative meshes (mandible single-FJ, femur multi-FJ, rib 8 anomaly): all pass independent header re-parse.
  - Wrote `gap-report-2026-05-11.md` documenting the 29 missing structures with their UBERON ids, FMA aliases, and labels.
  - Wrote 79 per-mesh `source.txt` provenance files.
  - Added `pipelines/01-import-bp3d/.gitignore` to ignore the OBJ cache and per-run telemetry JSON.
- **Output state:**
  - **79 canonical glbs** in `data/canonical/meshes/uberon_NNNNNNN/lod0.glb` (covered by `.gitattributes` LFS rule for `*.glb`).
  - **79 `source.txt` files** in the same directories (tracked as text).
  - 1 gap report in `pipelines/01-import-bp3d/` (tracked).
  - 1 conversion script + 2 helper scripts in the pipeline folder (tracked).
  - Gitignored: `pipelines/01-import-bp3d/.cache/` (62 MB extracted OBJs, regenerable), `node_modules/`, `package-lock.json`, `p1.04-run-summary.json`.
- **Total bytes produced** in `data/canonical/meshes/`: **9,356,264 bytes (~9.36 MB)** across 79 glbs. Min 10,360 / max 980,688 / mean 118,434 bytes.
- **Time spent:** ~15 minutes wall time including npm install, smoke test, full conversion, verification, state-log update.
- **Return status:** Complete. Handed back to Orchestrator with summary. Next Asset Pipeline invocation is P1.05 (Blender headless cleanup) — gated on user confirming Blender is installed.

### 2026-05-11 — Invocation #1 (P1.03 — Download BodyParts3D archive)

- **Dispatched by:** Orchestrator per `docs/orchestrator/phase-1-spec.md` dispatch plan step 3.
- **Inputs read:** asset-pipeline agent prompt, this state file (empty), ADR 0002, ADR 0005, ADR 0006, Phase 1 spec, `.gitattributes`, `.gitignore`, the FMA crosswalk summary.
- **Actions taken:**
  - Verified the canonical project page at `lifesciencedb.jp/bp3d/` is alive.
  - Located the actual download index at `dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html`.
  - HEAD-requested both ZIP archives and key metadata TSVs; all returned HTTP 200 with stable `Last-Modified: 2013-05-22` timestamps.
  - Downloaded all 10 upstream files (2 ZIP + 6 TXT + 1 HTML README + 1 implicit metadata) into `data/raw/bodyparts3d/`. Total: 210,091,346 bytes (~210 MB).
  - Verified ZIP integrity with `unzip -l`. isa archive: 2,234 OBJ files (matches expected count). partof archive: 1,258 OBJ files. Both archives intact.
  - Wrote `data/raw/bodyparts3d/README.md` with full download provenance, URLs, byte counts, file format details, license, attribution string, read-only contract.
  - Wrote `data/raw/bodyparts3d/LICENSE` with verbatim CC BY-SA 2.1 JP deed summary and the required attribution string.
  - Wrote `data/raw/LICENSES/bodyparts3d-license.md` as the project's per-source license registry entry.
  - Updated `.gitignore` with the `ignore-then-re-include` pattern for `data/raw/*/*`. Verified via `git check-ignore` that ZIPs are ignored and text/metadata files are tracked.
- **Output state:** 10 raw files on disk; 3 new tracked text files (README.md, LICENSE, the per-source registry entry); 6 small upstream TSVs + 1 HTML README also tracked. ZIPs ignored.
- **Time spent:** ~10 minutes wall time including the two longer download streams (isa archive ~2 min, partof archive ~4 min at variable bandwidth).
- **Return status:** Complete. Handed back to Orchestrator with summary.
