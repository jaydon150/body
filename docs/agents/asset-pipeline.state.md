# Agent state: asset-pipeline

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 — P1.04 (BP3D OBJ → glb conversion + attribution baking)

---

## Open items

1. **License-page version discrepancy.** The canonical project portal `lifesciencedb.jp/bp3d/info/license/index.html` declares CC BY-SA 2.1 Japan; the LSDB Archive mirror `dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html` displays a CC BY 4.0 summary. Per ADR 0005 the project follows the canonical lifesciencedb.jp version (CC BY-SA 2.1 JP). Pre-launch compliance review should reconcile and confirm. Not a Phase 1 blocker.
2. **CC BY-SA 2.1 JP legal code is Japanese-only.** The authoritative legal code lives at `creativecommons.org/licenses/by-sa/2.1/jp/legalcode.ja`. The English deed is a summary, not the law. Compliance review item.
3. **PART-OF hierarchy is downloaded but unused for Phase 1.** Phase 1 only needs the IS-A hierarchy (it's what the FMA crosswalk pivots on). The PART-OF archive (62 MB, 1,258 OBJs) is kept on disk because Phase 2+ compound-organ assembly will likely need it. Pipeline 01-import-bp3d should default to IS-A but accept a PART-OF flag.
4. **No FJ-id → individual-file checksum manifest yet.** A future hardening step could add a per-file SHA256 sidecar to detect raw-data corruption. Deferred — `unzip -l` integrity check is sufficient for now.
5. **29 skeletal sub-structures lack BP3D meshes.** Logged in `pipelines/01-import-bp3d/gap-report-2026-05-11.md`. Pattern: BP3D models the parent bone (femur, humerus, scapula, hip bone) as a single OBJ but does not ship its named sub-features (head/neck/shaft/condyles, glenoid/acromion/coracoid, ilium/ischium/pubis). Phalanges (manus and pes proximal/middle/distal) and coccyx + whole-sternum also miss. **For Phase 1**: Anatomy Domain should decide per-structure whether the missing nodes become procedural-decomposition tasks (Blender splits the parent), hand-author tasks, or remain "concept-only" anatomy graph nodes with no mesh until Phase 2. The femur seed already has a procedural proxy registered in `data/derived/mesh-registry.json` covering FMA:9611; the femur sub-features are the strongest candidates for procedural decomposition because the parent-mesh anatomy is well known.
6. **Sternum (UBERON:0000975) gap is recoverable at the registry level.** Manubrium (FMA:7486), body of sternum (FMA:7487), and xiphoid (FMA:7488) all converted successfully. P1.08 can synthesize a virtual "whole sternum" entry by referencing the three child glbs without needing a new mesh extraction. Anatomy Domain should sign off on this approach before P1.08 commits.
7. **No vertex-merge / cleanup applied to merged paired-bone glbs.** When left + right halves are concatenated, the two halves are kept as separate `mesh` nodes inside the glTF (separate primitives) rather than welded. This is correct for distinguishing sides in the runtime (a click should select one side, not the pair), but P1.05 cleanup may want to verify normals are consistent across the two halves and tag each `mesh` with a `laterality` extras tag. Logged for P1.05.
8. **OBJ → glb conversion preserves only geometry, not normals from source.** BP3D OBJs include `vn` (vertex normals) but my merge routine rewrites them. `obj2gltf` recomputes per-triangle normals on import. For the 99% decimation tier the normals are still smooth enough to look correct, but the cleanup step (P1.05) should regenerate normals consistently per glb.

## Decisions log

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

### Outbound — to Asset Pipeline (next invocation, P1.05 cleanup)

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
