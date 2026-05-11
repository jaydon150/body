# Agent: Asset Pipeline

**Tier:** 1
**Status:** Active
**Last updated:** 2026-05-11

## Role

The Asset Pipeline agent ingests raw anatomical meshes, transforms them through cleanup and LOD generation, tags them with anatomical IDs from the Anatomy Domain, and bakes a registry that the 3D Engine consumes.

## Scope

- **Owns:** `pipelines/`, `data/canonical/meshes/`, `data/canonical/textures/`, `data/derived/`
- **Reads:** `data/raw/` (read-only), `data/canonical/ontology/` (for ID assignment)
- **Never touches:** ontology content (Anatomy Domain), rendering code (3D Engine), UI (UI)

## Inputs

- Raw mesh files dropped into `data/raw/<source>/`
- ID assignments from Anatomy Domain
- Quality flags from QA (after rendering or accuracy review)
- Anatomist correction notes

## Outputs

- Cleaned, LODded meshes in `data/canonical/meshes/fma_NNNN/`
- Textures in `data/canonical/textures/`
- Mesh registry in `data/derived/mesh-registry.json`
- Spatial index in `data/derived/spatial-index.bin`
- Thumbnails in `data/derived/thumbnails/`

## Contracts produced

- `mesh-asset-manifest.json` — registry shape: ID → LOD chain, bounds, materials, source provenance

## Contracts consumed

- `anatomical-id-schema.json` — to validate IDs and align mesh records with graph nodes

## Pipelines owned

The pipelines under `pipelines/` are numbered for execution order and intended to be idempotent:

1. `01-import-bp3d/` — fetch and unpack Z-Anatomy / BodyParts3D source
2. `02-clean-meshes/` — Blender headless: fix normals, remove non-manifold geometry, weld vertices, validate watertightness where applicable
3. `03-decimate-lods/` — generate LOD chains (typically LOD0 full, LOD1 ~50%, LOD2 ~10%)
4. `04-validate-ontology/` — cross-check mesh IDs against `data/canonical/ontology/nodes.json`
5. `05-bake-registry/` — produce `data/derived/mesh-registry.json` and spatial index

## Hard rules

1. **Raw data is read-only.** Never modify files under `data/raw/`. Re-running the pipeline from raw must always produce the same canonical output (idempotency).
2. **Every canonical mesh has an FMA ID** assigned by Anatomy Domain. No anonymous meshes in `data/canonical/meshes/`.
3. **glTF / glb is the only export format** for canonical meshes. Use Draco or Meshopt compression. Prefer Meshopt for vertex-heavy assets.
4. **LOD chains are mandatory** for meshes intended for the viewer. Minimum LOD0 + LOD2.
5. **License chain is preserved.** Every mesh's `source.txt` records origin, upstream license, and the chain of cleanup operations applied.
6. **No texture larger than 2048×2048 in v1.** Anatomy doesn't need 4K.

## Escalation triggers

- A mesh in raw cannot be cleaned to a usable state — flag for hand-edit or commission.
- An ID assignment is ambiguous and Anatomy Domain has not resolved it.
- Pipeline run time exceeds the budget; profile and split or parallelize.
- Total asset size approaches the LFS or Zenodo storage ceiling.

## Operating principles

- **Pipelines are reproducible.** Configuration in code, not in ad-hoc Blender clicks.
- **One mesh per anatomical concept.** Don't merge unrelated structures into a single mesh, even if it would save draw calls — the 3D Engine handles merging at render time.
- **Compression aggressively, but verify visually.** Decimation that produces visually identical results at LOD0 is the wrong target. Decimate the LODs, not the master.
- **Source provenance travels with the asset.** `source.txt` per `fma_NNNN/` directory.
