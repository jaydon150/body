# pipelines/04-validate-ontology

Phase 1 step **P1.07** — cross-domain validation between the canonical
ontology (`data/canonical/ontology/`) and the canonical mesh store
(`data/canonical/meshes/`).

This step is **read-only**. It does not mutate ontology files, canonical
meshes, schemas, or the seed registry. It exists to surface drift before
P1.08 (bake-registry) canonicalizes everything.

## What it checks

Eight checks, each emitting `PASS` / `FAIL` / `N/A`:

1. **Completeness math** — node counts by `kind`; structure nodes split into
   with-mesh vs. without-mesh; the math `non_structure + with_mesh +
   without_mesh = total` must hold.
2. **LOD chain completeness** — every `data/canonical/meshes/uberon_*/`
   directory has exactly `lod0.glb`, `lod1.glb`, `lod2.glb`, `source.txt`;
   every `source.txt` carries the `## Cleanup (P1.05)` + `## LODs (P1.06)`
   headers.
3. **Attribution survival across all 237 glbs** — for each of the 79 dirs
   times 3 LODs, parse the glb (zero-dep binary surgery per ADR 0007),
   assert `asset.copyright` starts with `BodyParts3D, Copyright`, assert
   `asset.extras.source.fma_id` matches the directory's UBERON node FMA
   alias, assert `asset.extras.source.edits[]` contains the right
   pipeline-chain entries (LOD0 = convert + cleanup [+ merge for paired
   bones]; LOD1 adds the decimate-0.5 tag; LOD2 adds the decimate-0.1 tag
   or the ratio-0.3 fallback tag for the 2 known small carpal-bone halves).
4. **Ontology DAG coherence** — every edge's `from`/`to` resolves to a
   node; node ids are unique; no cycles; nodes conform to the schema's
   `node` $def shape; edges conform to the `edge` $def shape.
5. **Gap-report reconciliation** — every entry in
   `pipelines/01-import-bp3d/gap-report-2026-05-11.md` corresponds to a
   `kind: "structure"` node that LACKS a mesh directory; conversely, every
   structure-node-without-mesh-dir appears in the gap report.
6. **Sternum composite opportunity** — `UBERON:0000975` has no mesh dir;
   its 3 constitutional-part children (manubrium, body, xiphoid) all do.
   Also scans for any other parent-lacks-mesh but all-children-have-mesh
   composite-synthesis opportunities P1.08 could exploit.
7. **Femur seed reconciliation** — the procedural-femur-proxy entry in
   `data/derived/mesh-registry.json` still exists; the real BP3D-derived
   femur glb at `data/canonical/meshes/uberon_0000981/lod0.glb` is present
   and attribution-valid. P1.08 reconciliation guidance documented in the
   report.
8. **Schema-conformance spot-check on the seed registry** — the existing
   hand-seeded `data/derived/mesh-registry.json` validates against
   `app/shared/schema/mesh-asset-manifest.json`. Informational; P1.08 will
   rebuild it.

## How to run

```bash
node validate.mjs
```

Emits:

- `validation-report-2026-05-11.md` — human-readable report (committed).
- `validation-data.json` — machine-readable raw detail (gitignored).

## Zero dependencies

No `npm install` needed. The script uses only Node built-ins
(`fs`, `path`, `url`).

## ADR 0007 compliance

The GLB parser in `validate.mjs` accepts both NUL- and space-padded
chunk-type bytes per ADR 0007.
