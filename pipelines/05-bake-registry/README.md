# pipelines/05-bake-registry

Phase 1 step **P1.08** — bake the canonical mesh-asset registry.

This step is the **last asset-side step** in Phase 1. After this the
project crosses to the application side (3D Engine, UI). The output —
`data/derived/mesh-registry.json` — is the contract handed to those
downstream agents.

## What it does

Walks `data/canonical/meshes/uberon_*/` (79 directories), parses each
glb's JSON header, and emits one registry entry per directory conforming
to `app/shared/schema/mesh-asset-manifest.json`. For each entry:

- `id` — UBERON id derived from the directory name.
- `lods[]` — 3 entries (level 0/1/2). For each LOD:
  - `file` — path relative to `data/canonical/meshes/` (e.g. `uberon_0000981/lod0.glb`).
  - `triangle_count` — sum of `(indices.count / 3)` across all
    primitives (or `(POSITION.count / 3)` for un-indexed primitives).
  - `vertex_count` — sum of POSITION accessor counts across primitives.
  - `byte_size` — `fs.stat` size in bytes.
  - `compression` — always `"none"` in Phase 1.
- `bounds` — world AABB computed from the LOD0 glb by transforming each
  primitive's POSITION accessor min/max by the accumulated node-matrix
  transform and unioning across all mesh primitives. The schema requires
  bounds at the entry level, not per-LOD; LOD0 is authoritative.
- `material_hint` — always `"bone"` for the Phase 1 skeletal set.
- `provenance` — pulled from LOD0's `asset.extras.source`:
  - `source` (`"BodyParts3D"`), `license` (`"CC-BY-SA-2.1-JP"`),
    `original_id` (the FJ-id, e.g. `"FJ3289"` or `"FJ3259+FJ3365"` for
    paired-bone merges), `ingested_at` (`"2026-05-11"`), `edits[]` (the
    LOD0 cleanup chain — LOD-specific decimate tags are stripped at the
    entry level since LOD details are implicit in the lods array's
    monotonic triangle counts).

## Two intentional asymmetries

1. **Femur supersession.** The user's existing
   `data/derived/mesh-registry.json` seed pointed `UBERON:0000981` at a
   procedural Three.js proxy. This bake replaces it with the real
   BP3D-derived femur at `data/canonical/meshes/uberon_0000981/lod0.glb`
   (and lod1/lod2). The procedural-proxy code retirement in
   `app/web/src/scene/FemurScene.tsx` + `anatomySeed.ts` is P1.10's
   decision per the P1.07 validation report.

2. **Sternum (UBERON:0000975) intentionally omitted.** The sternum is a
   composite of 3 children (manubrium UBERON:0002205 / body UBERON:0006820 /
   xiphoid UBERON:0002207) — all three have full LOD chains, but the
   sternum itself has no mesh. The current
   `mesh-asset-manifest.json` schema has no `composite_children` field,
   and extending it is **Architect authority (P1.09)**. Until then the
   3D Engine + UI should treat "ontology node exists but no registry
   entry" as "load children via `constitutional_part_of` edges in
   `data/canonical/ontology/relations.json`". This is a temporary rule.
   After P1.09 schema upgrade, a follow-up bake can synthesize the
   sternum entry with a `composite_children: [UBERON:0002205,
   UBERON:0006820, UBERON:0002207]` field.

## How to run

```bash
node bake.mjs       # rebuilds data/derived/mesh-registry.json
node validate.mjs   # validates the output against the schema
```

Both are zero-dependency (Node built-ins only).

## Determinism

`node bake.mjs` is **idempotent**: re-running produces byte-identical
output. This is achieved by:

- Sorting entries by UBERON id ascending.
- Using a fixed `generated_at` timestamp (`"2026-05-11T00:00:00Z"`)
  rather than a current-time stamp.
- Reading all numeric values verbatim from the glb accessors (no
  rounding, no floating-point reformatting).
- 2-space indented JSON with deterministic key insertion order.

## ADR 0007 compliance

The GLB parser accepts both NUL- and space-padded BIN chunk-type bytes,
matching the P1.06 parser pattern.

## Phase 1 → Phase 2 boundary

After this step, the asset side of Phase 1 is complete. Subsequent
agents (Architect P1.09, 3D Engine P1.10–12, UI P1.13–14) consume
`data/derived/mesh-registry.json` as a read-only artifact and may add
sibling derived files (`spatial-index.bin`, `thumbnails/`) but do not
mutate this registry directly. Re-baking happens here in
`pipelines/05-bake-registry/` whenever upstream canonical meshes change.
