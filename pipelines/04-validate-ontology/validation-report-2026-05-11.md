# Validation report — 2026-05-11

**Pipeline step:** P1.07 (validate-ontology cross-check)
**Agent dispatch:** cross-domain (Asset Pipeline + Anatomy Domain)
**Generated:** 2026-05-11 (UTC by script run)
**Overall status:** **PASS** (8/8 checks pass; zero blockers for P1.08)

This is a read-only validation produced by `pipelines/04-validate-ontology/validate.mjs`.
Machine-readable detail in `validation-data.json` (gitignored).

---

## Headline

| Check | Topic | Result |
|---|---|---|
| 1 | Completeness math | **PASS** — 17 non-structure + 79 with-mesh + 29 without-mesh = 125 total |
| 2 | LOD chain completeness | **PASS** — 79/79 dirs have all 4 files; 79/79 source.txt carry both headers |
| 3 | Attribution survival across 237 glbs | **PASS** — 237/237 glbs carry valid copyright + fma_id + edit chain |
| 4 | Ontology DAG coherence | **PASS** — 125 nodes / 125 edges / 0 dup ids / 0 ref failures / 0 cycles |
| 5 | Gap-report reconciliation | **PASS** — all 29 gap rows are structure-nodes without mesh dirs; no inverse drift |
| 6 | Sternum composite opportunity | **PASS** — UBERON:0000975 lacks mesh; 3 children have full LOD chains |
| 7 | Femur seed reconciliation | **PASS** — proxy entry still in registry; real BP3D femur present + attributed |
| 8 | Seed registry schema spot-check | **PASS** — `data/derived/mesh-registry.json` validates against the manifest schema |

Overall: **PASS.** Registry baking (P1.08) is unblocked. No critical issues.

---

## Counts at a glance

- Ontology version: **2026-05-11**
- Total nodes: **125** — 1 system / 16 region / 108 structure
- Total edges: **125** — `regional_part_of`=70, `member_of`=30, `constitutional_part_of`=24, `systemic_part_of`=1 (per state log; this report verifies the counts add to 125)
- Canonical mesh directories: **79** under `data/canonical/meshes/uberon_*/`
- Canonical glbs on disk: **237** (79 × 3 LODs)
- Total glb bytes on disk (LOD0 + LOD1 + LOD2): ~14.37 MB per the P1.06 state-log handoff
- Gap-report rows: **29** (matches structures-without-mesh count exactly)

---

## Check 1 — Completeness math

**Status:** PASS

### Counts

- Total ontology nodes: **125**
- By kind:
  - `system`: 1 (skeletal system, `UBERON:0001434`)
  - `region`: 16 (axial / appendicular / skull / vertebral column / thoracic cage / pectoral & pelvic girdles / upper & lower limb skeletons / cervical & thoracic & lumbar vertebra sets / metacarpals / metatarsals / phalanges of manus & pes parents)
  - `structure`: 108
- Of the 108 `kind: "structure"` nodes:
  - **79** have a `data/canonical/meshes/uberon_NNNNNNN/` directory
  - **29** do NOT have a mesh directory
- All 29 structures-without-mesh appear in the P1.04 gap report (see Check 5).

### Math identity

```
non_structure(17) + with_mesh(79) + without_mesh(29) = 125 = total
                17 +              79 +              29 = 125  ✓
```

The `region+system` count (16+1 = 17) plus `structure_with_mesh` (79) plus
`structure_without_mesh` (29) equals total `nodes.json[].length` (125). Math closes.

### Structures without a mesh directory (29)

All 29 are documented in `pipelines/01-import-bp3d/gap-report-2026-05-11.md`.
The full enumeration (UBERON id → label):

```
UBERON:0001350  coccyx
UBERON:0000975  sternum                          (composite candidate — see Check 6)
UBERON:0006657  glenoid cavity of scapula
UBERON:0002497  acromion of scapula
UBERON:0006633  coracoid process of scapula
UBERON:0004651  spine of scapula
UBERON:0006801  head of humerus
UBERON:4200172  neck of humerus
UBERON:0004652  shaft of humerus
UBERON:0000144  trochlea of humerus
UBERON:0010853  capitulum of humerus
UBERON:0006806  medial epicondyle of humerus
UBERON:0006807  lateral epicondyle of humerus
UBERON:0002234  proximal phalanx of manus
UBERON:0003864  middle phalanx of manus
UBERON:0003865  distal phalanx of manus
UBERON:0001273  ilium
UBERON:0001274  ischium
UBERON:0001275  pubis
UBERON:0006767  head of femur
UBERON:0007119  neck of femur
UBERON:0006862  shaft of femur
UBERON:0002503  greater trochanter of femur
UBERON:0002504  lesser trochanter of femur
UBERON:0009984  medial condyle of femur
UBERON:0009985  lateral condyle of femur
UBERON:0003868  proximal phalanx of pes
UBERON:0003866  middle phalanx of pes
UBERON:0003867  distal phalanx of pes
```

---

## Check 2 — LOD chain completeness

**Status:** PASS

### Per-directory file presence

- **79 / 79** directories under `data/canonical/meshes/uberon_*/` contain
  exactly `lod0.glb` + `lod1.glb` + `lod2.glb` + `source.txt`.
- No missing files. No extra files of concern noticed (each dir is exactly
  these 4 files).

### `source.txt` header presence

- **79 / 79** `source.txt` files contain both required headers:
  - `## Cleanup (P1.05)`
  - `## LODs (P1.06)`

No `source.txt` is missing either header.

---

## Check 3 — Attribution survival across all 237 glbs

**Status:** PASS

### Method

Each glb (79 dirs × 3 LODs = 237 files) parsed via the zero-dependency
GLB binary surgery pattern from `pipelines/02-clean-meshes/reinject_attribution.mjs`
and `pipelines/03-decimate-lods/reinject_attribution.mjs`. The parser
accepts both NUL- and space-padded chunk-type bytes per ADR 0007. For
each glb, the validator asserts:

1. `asset.copyright` exists and starts with `"BodyParts3D, Copyright"`
2. `asset.extras.source.fma_id` matches the directory's UBERON node `aliases.fma`
3. `asset.extras.source.edits[]` includes the expected pipeline-chain entries:
   - LOD0: `obj_to_glb_conversion` + `blender_5.1.1_cleanup:remove_doubles+normals_make_consistent`
     (and `merged_2_fj_obj_into_one_glb` for paired-bone glbs with 2 mesh nodes)
   - LOD1: LOD0 chain + `blender_5.1.1_decimate:lod1_ratio_0.5`
   - LOD2: LOD0 chain + (`blender_5.1.1_decimate:lod2_ratio_0.1` AND/OR
     `blender_5.1.1_decimate:lod2_ratio_0.3_fallback`)

### Results

- Total glbs checked: **237** (79 LOD0 + 79 LOD1 + 79 LOD2)
- Pass: **237 / 237**
- Failure count: **0**

### LOD2 ratio-0.3 fallback observation

Two LOD2 glbs carry the fallback tag, matching the P1.06 state-log:

- `uberon_0001429` (pisiform, part_1)
- `uberon_0002445` (carpal, part_1)

Both carry the standard `blender_5.1.1_decimate:lod2_ratio_0.1` tag
alongside the `_fallback` tag — consistent with the documented per-mesh
fallback behavior (the whole-glb still ran the standard ratio, and the
fallback tag flags the specific sub-mesh).

P1.08 should propagate a `quality_notes: ["lod2_used_ratio_0.3_fallback"]`
field on these two registry entries so QA can spot-check them.

---

## Check 4 — Ontology DAG coherence

**Status:** PASS

| Sub-check | Result |
|---|---|
| Edge `from` resolves to a node | 125/125 OK (0 ref failures) |
| Edge `to` resolves to a node | 125/125 OK (0 ref failures) |
| Node ids are unique | 0 duplicates |
| No cycles (DFS over directed adjacency) | 0 cycles |
| Node schema conformance (`anatomical-id-schema.json` `node` $def) | 125/125 OK |
| Edge schema conformance (`anatomical-id-schema.json` `edge` $def) | 125/125 OK |

### Schema check details

For each node:

- `id` matches `^(UBERON:\d{7}|FMA:\d+|BODY:\d+)$` ✓ — all 125 nodes use UBERON-primary
- `labels[]` has at least one entry with `text` (string, minLen 1) + `lang`
  (matches `^[a-z]{2,3}(-[A-Z][a-zA-Z]{1,7})?$`) ✓
- `kind` is in `{concept, structure, region, system, tissue, cell, compound}` ✓
- `status` (when present) is in `{reviewed, pending, deprecated}` ✓ — every
  node carries `status: "pending"` (anatomist promotion to `reviewed` is a
  separate downstream pass)

For each edge:

- `from`, `to` match the primary-id pattern ✓
- `type` is in the relation enum ✓
- `source` (optional) is a free string ✓

No `additionalProperties` violations spotted in either nodes or edges
(the validator does a hand-rolled property check rather than an Ajv pass;
this is sufficient for the spot-check at this scale — Phase 1 step P1.09
will add the full Ajv pass per the asset-pipeline state log).

---

## Check 5 — Gap-report reconciliation

**Status:** PASS

### Forward direction (gap report → ontology)

29 of 29 gap rows correspond to nodes that:

- Exist in `nodes.json` with `kind: "structure"` ✓
- LACK a `data/canonical/meshes/uberon_*/` directory ✓

No gap row is a phantom (every gap is a real structure node).
No gap row points to a node that actually has a mesh.

### Inverse direction (ontology → gap report)

0 structure-nodes-without-mesh are missing from the gap report. Every
node in the 29-without-mesh set appears as a row in
`pipelines/01-import-bp3d/gap-report-2026-05-11.md`.

No orphans in either direction.

---

## Check 6 — Sternum composite opportunity

**Status:** PASS

### Sternum facts

- `UBERON:0000975` (sternum) **exists** in `nodes.json` as `kind: "structure"`
- `UBERON:0000975` **has no** `data/canonical/meshes/uberon_0000975/` directory
- The 3 constitutional-part children, all with **complete LOD0/LOD1/LOD2 chains**:

| Child UBERON id | Label | Mesh dir | LOD0 | LOD1 | LOD2 |
|---|---|---|---|---|---|
| UBERON:0002205 | manubrium | `uberon_0002205` | ✓ | ✓ | ✓ |
| UBERON:0006820 | body of sternum | `uberon_0006820` | ✓ | ✓ | ✓ |
| UBERON:0002207 | xiphoid process | `uberon_0002207` | ✓ | ✓ | ✓ |

The 3 child UBERON IDs are:
- **UBERON:0002205** — manubrium of sternum (FMA:7486)
- **UBERON:0006820** — body of sternum (FMA:7487)
- **UBERON:0002207** — xiphoid process (FMA:7488)

### P1.08 composite-assembly instructions

The registry entry for `UBERON:0000975` should be **synthesized** rather
than reference a non-existent mesh on disk. Recommended shape:

```json
{
  "id": "UBERON:0000975",
  "kind": "structure",
  "composite": true,
  "composite_parts": [
    { "id": "UBERON:0002205", "relation": "constitutional_part_of" },
    { "id": "UBERON:0006820", "relation": "constitutional_part_of" },
    { "id": "UBERON:0002207", "relation": "constitutional_part_of" }
  ],
  "lods": [
    /* registry's renderer should resolve composite at load time
       by concatenating the three child glbs into a virtual group */
  ],
  "bounds": /* union of the 3 child bounds */
}
```

Note: the mesh-asset-manifest schema as currently written
(`app/shared/schema/mesh-asset-manifest.json`) does not yet have a
`composite` field. **P1.08 will need to either**:

(a) extend the schema to add an optional `composite` block (preferred —
non-breaking addition, captures the assembly semantics on disk), or
(b) emit the sternum entry as a registry-level alias that maps to the 3
children at runtime (skip the schema change, push the composite logic
into the loader).

Anatomy Domain should sign off on (a) vs. (b) before P1.08 commits.

### Other composite-synthesis opportunities

**Zero other parents** in the ontology meet the same condition (parent
node lacks a mesh AND all its `constitutional_part_of` structure-children
have full LOD chains).

The 29 gap structures are not composite-synthesis candidates because
they are LEAF sub-structures of meshes that exist as wholes — e.g. "head
of femur" is a part of the femur mesh, not a parent whose parts have
their own meshes. These are decomposition candidates (P2 procedural
splits), not composition candidates.

The sternum is unique in this dataset: the only parent-without-mesh
whose constitutional children all have meshes.

---

## Check 7 — Femur seed reconciliation

**Status:** PASS

### Findings

- **Procedural proxy entry**: still present in
  `data/derived/mesh-registry.json` with `id: "UBERON:0000981"` and
  `lods[0].file: "procedural/femur-proxy-threejs"`. ✓
- **Real BP3D-derived femur**: present at
  `data/canonical/meshes/uberon_0000981/lod0.glb`. ✓
- **Real femur attribution**: valid. `asset.copyright` starts with
  `"BodyParts3D, Copyright"`. `asset.extras.source` summary:
  - source: `BodyParts3D`
  - license: `CC-BY-SA-2.1-JP`
  - fma_id: `FMA:9611`
  - original_id: `FJ3259+FJ3365`
  - edits[]: 3 entries (convert + merge + cleanup) at LOD0

### P1.08 reconciliation choice

The procedural proxy should be **demoted to a fallback or removed**, and
the real BP3D-derived femur becomes the primary `UBERON:0000981`
registry entry with all three LODs.

### Procedural-proxy code retirement

The procedural-femur-proxy code lives in:

- `app/web/src/scene/FemurScene.tsx`
- `app/web/src/scene/anatomySeed.ts`

The retirement choice is **scope-dependent on when P1.10 wires the
registry-driven loader**:

- **If P1.10 ships the registry-driven loader before retiring the seed:**
  keep the procedural-proxy code in place as a Three.js dev fallback
  (useful while the registry loader is iterated). Mark it deprecated and
  remove after the loader is stable.
- **If P1.10 lands after a longer gap:** retire the procedural-proxy
  code at P1.08 commit time to avoid leaving stale render paths in the
  app source.

Decision deferred to the Orchestrator when P1.10 is dispatched.
**No action needed at P1.08 beyond replacing the registry entry.**

---

## Check 8 — Schema-conformance spot-check on the seed registry

**Status:** PASS

### Findings

- `data/derived/mesh-registry.json` has 1 entry (the procedural femur
  proxy).
- That entry validates against `app/shared/schema/mesh-asset-manifest.json`:
  - `version` is a string ✓
  - `generated_at` is a string ✓
  - `entries[0].id` matches the primary-id pattern ✓
  - `entries[0].lods` is a non-empty array of valid `lod` shapes ✓
  - `entries[0].bounds` has `min` (3-vector) + `max` (3-vector) ✓
  - `entries[0].provenance` has `source` + `license` (both strings) ✓
  - `entries[0].material_hint` (`"bone"`) is in the enum ✓
- 0 validation errors.

### Note

This is informational. P1.08 will rebuild the registry from the
canonical store; the seed entry is a baseline for that rebuild and a
sanity check that the schema itself is well-formed and the seed pattern
remains valid as a reference shape.

---

## Critical issues

**Zero.** P1.08 (bake-registry) is **unblocked**.

---

## Open items surfaced (informational, not blockers)

1. **Sternum composite shape needs a schema addition (or runtime alias).**
   See Check 6. P1.08 should decide between extending the mesh-asset-manifest
   schema with a `composite` block or pushing composite resolution into
   the loader. Anatomy Domain sign-off recommended.

2. **Procedural-femur-proxy code retirement timing.** Per Check 7, the
   `FemurScene.tsx` + `anatomySeed.ts` code stays or goes depending on
   P1.10 scheduling. Not a P1.08 concern.

3. **The 2 LOD2 ratio-0.3 fallback glbs** (`uberon_0001429`, `uberon_0002445`)
   should carry a `quality_notes` flag in the registry per the P1.06 state
   log handoff. Same handoff already documented.

4. **Schema extension for `composite`** (if option (a) in Check 6 is
   chosen) needs an Architect sign-off and a schema-version bump in
   `mesh-asset-manifest.json`. Filed back to Orchestrator.

5. **Open items 6, 8 from `asset-pipeline.state.md` and open items in
   `anatomy-domain.state.md`** remain valid — this validation does not
   close them, only confirms the canonical store is in a consistent
   shape for P1.08 to consume.

---

## Sharp edges seen during validation

- The P1.05 `pipelines/02-clean-meshes/reinject_attribution.mjs` parser
  uses a strict literal `"BIN "` check (with NUL byte that renders as
  space). The P1.06 `pipelines/03-decimate-lods/reinject_attribution.mjs`
  parser was updated per ADR 0007 to accept either NUL or space padding.
  This validation script (`validate.mjs`) follows the P1.06 / ADR 0007
  pattern. **No correctness consequence** for this run — all canonical
  glbs are NUL-padded — but if future glbs come in space-padded, the
  P1.05 parser will fail and the P1.06 + P1.07 parsers will succeed.
  Worth aligning P1.05's parser to the ADR 0007 pattern as a hardening
  pass.

- The `kind` field in `nodes.json` is currently only 3 values out of the
  7-value enum (`system`, `region`, `structure`). No `concept`, `tissue`,
  `cell`, or `compound` nodes exist yet. The Phase 1 scope is skeletal-
  only and these other kinds will appear in later phases. Not an issue.

---

## Inputs read

- `data/canonical/ontology/nodes.json` (125 nodes)
- `data/canonical/ontology/relations.json` (125 edges)
- `data/canonical/ontology/synonyms.json` (schema-valid placeholder per
  the anatomy-domain state log)
- `data/canonical/meshes/uberon_*/lod0.glb` × 79
- `data/canonical/meshes/uberon_*/lod1.glb` × 79
- `data/canonical/meshes/uberon_*/lod2.glb` × 79
- `data/canonical/meshes/uberon_*/source.txt` × 79
- `data/derived/mesh-registry.json` (1 entry — seed)
- `pipelines/01-import-bp3d/gap-report-2026-05-11.md` (29 rows)
- `app/shared/schema/anatomical-id-schema.json`
- `app/shared/schema/mesh-asset-manifest.json`

---

## Outputs written

- `pipelines/04-validate-ontology/validate.mjs` (this validator, tracked)
- `pipelines/04-validate-ontology/package.json` (tracked)
- `pipelines/04-validate-ontology/README.md` (tracked)
- `pipelines/04-validate-ontology/.gitignore` (tracked)
- `pipelines/04-validate-ontology/validation-report-2026-05-11.md` (this report, tracked)
- `pipelines/04-validate-ontology/validation-data.json` (machine-readable detail, gitignored)

---

## Conclusion

The canonical store and ontology are in a clean, internally consistent
shape. **P1.08 (bake-registry) is unblocked.**

The two known follow-ups are well understood and documented in the
existing state logs:

- The sternum composite entry needs a schema-shape decision (extend
  `mesh-asset-manifest.json` with `composite`, or alias at runtime).
- The femur procedural proxy needs to be replaced by the real BP3D mesh
  in the rebuilt registry; the proxy code's removal is P1.10's call.
