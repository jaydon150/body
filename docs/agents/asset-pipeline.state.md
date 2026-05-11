# Agent state: asset-pipeline

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 — P1.03 (BodyParts3D download)

---

## Open items

1. **License-page version discrepancy.** The canonical project portal `lifesciencedb.jp/bp3d/info/license/index.html` declares CC BY-SA 2.1 Japan; the LSDB Archive mirror `dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html` displays a CC BY 4.0 summary. Per ADR 0005 the project follows the canonical lifesciencedb.jp version (CC BY-SA 2.1 JP). Pre-launch compliance review should reconcile and confirm. Not a Phase 1 blocker.
2. **CC BY-SA 2.1 JP legal code is Japanese-only.** The authoritative legal code lives at `creativecommons.org/licenses/by-sa/2.1/jp/legalcode.ja`. The English deed is a summary, not the law. Compliance review item.
3. **PART-OF hierarchy is downloaded but unused for Phase 1.** Phase 1 only needs the IS-A hierarchy (it's what the FMA crosswalk pivots on). The PART-OF archive (62 MB, 1,258 OBJs) is kept on disk because Phase 2+ compound-organ assembly will likely need it. Pipeline 01-import-bp3d should default to IS-A but accept a PART-OF flag.
4. **No FJ-id → individual-file checksum manifest yet.** A future hardening step could add a per-file SHA256 sidecar to detect raw-data corruption. Deferred — `unzip -l` integrity check is sufficient for now.

## Decisions log

### 2026-05-11 — P1.03

- **Download source chosen:** `dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/` (the LSDB Archive file host that the canonical project page at `lifesciencedb.jp/bp3d/` links to). Verified by separate HEAD requests on the two ZIP archives — both returned HTTP 200 with `Last-Modified: Wed, 22 May 2013 06:46:24 GMT` for isa and `06:45:40 GMT` for partof. This timestamp matches ADR 0005's note that "BodyParts3D underlying data has not been updated since 2013." No silent substitution; the canonical URL is alive.
- **Archive variants chosen:** the 99% reduction tier (`*_obj_99.zip`). The 95% tier (`*_obj_95.zip`, much larger per the upstream README) was NOT downloaded. Rationale: Phase 1 produces our own LODs via `pipelines/03-decimate-lods`; we need clean polygons for LOD0 but don't need the heaviest mesh density the upstream offers. The 99% file is the right tradeoff between source quality and download budget.
- **Both hierarchies downloaded** (IS-A and PART-OF). IS-A is the primary pivot for the FMA crosswalk; PART-OF is reserved for Phase 2+ compound-organ assembly. Per-source download size justifies keeping both rather than re-downloading later.
- **Auto-download path taken** (not the manual-instructions deferred path) because total size 210 MB is under the 500 MB threshold defined in the task brief.
- **Raw-vs-tracked split in `.gitignore`:** mesh ZIPs are ignored (reproducible from URLs), text metadata + README + LICENSE are tracked. Pattern uses an `ignore + re-include` shape (`data/raw/*/*` then `!data/raw/*/README.md` etc.) rather than per-extension ignores, which lets future per-source folders inherit the same shape automatically.

## Handoffs

### Outbound — to Asset Pipeline (next invocation, P1.04)

The next agent run consumes:

- `data/raw/bodyparts3d/isa_BP3D_4.0_obj_99.zip` (142.9 MB, 2,234 OBJ files, IS-A hierarchy).
- `data/raw/bodyparts3d/partof_BP3D_4.0_obj_99.zip` (64.9 MB, 1,258 OBJ files, PART-OF hierarchy) — held in reserve.
- `data/raw/bodyparts3d/isa_element_parts.txt` — primary FMA concept id → element file id mapping (the FJ-prefixed `.obj` filenames). Pipeline 01-import-bp3d should treat this as the source of truth.
- `data/raw/bodyparts3d/isa_parts_list_e.txt` — FMA concept id → BP representation id → English name (header-only metadata; useful for the import provenance record per ADR 0006).
- The other `.txt` files for inclusion relations and the PART-OF analogues, all in the same folder.

The Phase 1 skeletal subset only needs the OBJ files corresponding to the FMA IDs in `docs/references/summaries/uberon-fma-skeletal-crosswalk.md` (86 verified rows, ~100 with second-pass-required rows added by Anatomy Domain). The full ~2,234-file archive remains in raw so subsequent phases import on demand without re-downloading.

**Pipeline 01-import-bp3d responsibilities (when it runs):**

1. Extract `isa_BP3D_4.0_obj_99.zip` into a working directory under `pipelines/01-import-bp3d/.cache/` or similar — NOT back into `data/raw/`.
2. Parse `isa_element_parts.txt` to build FMA → FJ-id → OBJ-path lookup. Note: one FMA concept can map to multiple element files (e.g. `FMA3710` (vascular tree) maps to seven FJ-prefixed files).
3. For the Phase 1 skeletal subset, resolve each crosswalk FMA ID through this lookup and import the corresponding OBJ(s).
4. Per ADR 0006, the import step should already populate provisional provenance metadata (`source: BodyParts3D`, `license_spdx_or_descriptive: CC-BY-SA-2.1-JP`, `original_id: FMA<digits>`, `ingested_at: 2026-...`) on each emerging glb so the bake step at P1.08 has it ready.

### Inbound — none yet

No prior agent has handed off to Asset Pipeline. P1.03 is this agent's first invocation.

## Invocation history

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
