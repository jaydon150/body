# ADR 0008 — Composite asset entries in the mesh manifest

**Status:** Accepted
**Date:** 2026-05-11
**Deciders:** orchestrator, user, architect (cross-domain dispatch with QA at P1.09)
**Supersedes:** —

## Context

The mesh asset manifest (`app/shared/schema/mesh-asset-manifest.json`) was designed against the assumption that every anatomical concept that ships into the viewer has a one-to-one correspondence with an own mesh file on disk: a glb at `data/canonical/meshes/uberon_NNNNNNN/lod0.glb` (plus LOD1, LOD2). Every registry entry must therefore carry `lods`, `bounds`, and `provenance`.

P1.07 surfaced a case the design did not anticipate: **`UBERON:0000975` (sternum)**. The sternum is one anatomical concept, but BodyParts3D ships its three `constitutional_part_of` children (manubrium `UBERON:0002205`, body of sternum `UBERON:0006820`, xiphoid process `UBERON:0002207`) as the canonical meshes. There is no whole-sternum mesh on disk. Three options surfaced:

1. **Synthesize a whole-sternum mesh** by merging the three child glbs in Blender. Rejected by P1.08: it would create a synthetic asset whose attribution and edits chain become ambiguous (which child's `original_id` survives?), and it duplicates information already present in the children.
2. **Push the assembly into the runtime renderer/loader** without any registry record. Rejected because the registry stops being the single source of truth for "what anatomical concepts are renderable" — the renderer would need a parallel mechanism that reads ontology edges to discover composites.
3. **Extend the manifest schema** so a registry entry can be either an own-mesh entry (the existing shape) or a composite entry that references its child UBERON IDs and lets the renderer assemble at load time. Preferred — keeps the manifest as the authority and captures the assembly relationship declaratively.

Three further considerations forced the choice now rather than later:

- The sternum is **the only such case in the current dataset** (per P1.07 Check 6 — zero other parent-without-mesh whose constitutional children all have meshes). The schema extension is small in scope but the pattern will recur when Phase 2 introduces compound-organ assembly (e.g. liver lobes, kidney with cortex/medulla, multi-bone joints rendered as composites).
- **ADR 0006 (runtime attribution must travel with assets)** and **ADR 0007 (Blender attribution discipline)** together establish that every canonical asset carries its own `asset.copyright` and `asset.extras.source` baked into the glb. A composite entry has no own glb; the attribution travels via the children. The schema needs to make explicit that this is the correct case — the composite does not need its own `provenance` block because its constituent meshes already carry theirs.
- **P1.08 already implemented a "no registry entry → load children via ontology edges" fallback** in the temporary handoff to 3D Engine. A schema-level composite_children field makes the relationship explicit rather than implicit, removes the ontology lookup at runtime, and makes the registry self-contained.

## Decision

**The `mesh-asset-manifest.json` `entry` $def is a `oneOf` between two mutually exclusive shapes:**

1. **`own_mesh_entry`** — the existing shape. Requires `id`, `lods`, `bounds`, `provenance`. Optionally carries `material_hint`. The anatomical concept is realized by a concrete LOD chain on disk.

2. **`composite_entry`** — the new shape. Requires `id` and `composite_children` (a non-empty array of primary IDs matching `^(UBERON:\d{7}|FMA:\d+|BODY:\d+)$`). Optionally carries `material_hint`. Does NOT carry `lods`, `bounds`, or `provenance` — they are resolved by the renderer/registry-baker from the children at load time.

The two shapes are exclusive: an entry cannot have both `lods` and `composite_children`. The JSON Schema `oneOf` construct enforces this. Mixing the two shapes in a single entry is incoherent (a mesh AND a composite) and is rejected.

The sternum entry, when synthesized by a P1.08-followup bake, takes this shape:

```json
{
  "id": "UBERON:0000975",
  "composite_children": [
    "UBERON:0002205",
    "UBERON:0006820",
    "UBERON:0002207"
  ],
  "material_hint": "bone"
}
```

The 79 existing own-mesh entries are unchanged; the addition is purely additive.

## Consequences

### Positive

- **Sternum (and future composites) become first-class registry entries.** The renderer/UI can discover them without needing a fallback path through ontology edges.
- **Attribution chain stays clean.** Each child mesh carries its own `asset.copyright` and `asset.extras.source` per ADR 0006 / ADR 0007. The composite inherits attribution transitively at runtime — `bundle_attributions.json` (per ADR 0006) is built from the union of constituent meshes' attribution strings, which is the correct semantics.
- **Schema is self-documenting.** A reader of the manifest sees explicitly which entries are composite and what they're made of, rather than inferring from a missing mesh + an ontology lookup.
- **Pattern generalizes to Phase 2+ compound-organ assembly.** When the liver is added with its lobes, when kidneys are added with cortex/medulla, the same composite_entry shape applies. No further schema change needed.
- **CI validation is stronger.** The `oneOf` enforces "exactly one shape" — a malformed entry with both lods AND composite_children fails validation, catching pipeline bugs at the earliest point.

### Negative

- **The schema is slightly more complex** — two shapes instead of one, mediated by `oneOf`. A reader has to understand the distinction. Mitigated by clear descriptions on each $def.
- **The bake step has a small new responsibility:** when emitting a composite, it must verify each child id is itself an own-mesh entry in the same manifest (cross-entry consistency). This is a bake-time check, not a schema-time check (JSON Schema doesn't support cross-entry validation), and falls to the validator/baker.
- **Runtime renderer code path is now two-way:** load own-mesh directly, or resolve children for composites. Modest new code surface in P1.10 + P1.13.

### Neutral

- **Existing data is unchanged.** All 79 current entries match the `own_mesh_entry` shape; they continue to validate without any modification.
- **`provenance` semantics for composites are deliberately omitted, not made optional.** A composite without a provenance block is correct; the attribution travels via children. If a future case arises where a composite needs its own attribution (e.g. a hand-authored assembly choice that itself constitutes a creative act), this ADR will be revisited.

## Alternatives considered

- **A single shape with `lods`, `bounds`, `provenance` all optional.** Rejected: would let bad data through — an entry with no `lods` AND no `composite_children` would validate but be useless. The `oneOf` forces exactly one valid shape.
- **A discriminator field `kind: "own_mesh" | "composite"`.** Considered. JSON Schema 2020-12 supports `if/then/else` for discriminator-style validation. `oneOf` over two well-defined sub-shapes is cleaner here because the required-field set is already disjoint enough to make the `oneOf` unambiguous.
- **Inline the composite children as full entries instead of just IDs.** Rejected: would duplicate the children's `lods`/`bounds`/`provenance` data, breaking the single-source-of-truth invariant.
- **Resolve composites at registry-bake time** by inlining the children's combined LOD chain into the parent entry. Rejected: erases the semantic distinction (the composite IS the concept; the children ARE its parts). Future renderers may want to peel a composite into its parts; that's harder if the bake has already flattened the relationship.
- **Defer the schema change** and continue with the P1.08 runtime-fallback rule. Rejected because the schema change is the right shape, the cost is small, and P1.09 is the dedicated dispatch for cross-cutting schema work. Deferring it puts more weight on a fragile runtime convention.

## Schema impact

- `app/shared/schema/mesh-asset-manifest.json`: `entry` $def restructured as `oneOf [own_mesh_entry, composite_entry]`. The existing entry shape (renamed `own_mesh_entry`) is byte-equivalent in its required-fields contract; the only added type is `composite_entry`.
- No other schemas affected.

## Bake / runtime impact

- **P1.08-followup bake** (deferred until Architect signs off — this ADR closes that door): emit one `composite_entry` for `UBERON:0000975` with the three child IDs. The full manifest will then have 80 entries (79 own-mesh + 1 composite).
- **P1.10 (3D Engine) registry-driven loader:** branch on `composite_children` presence. When set, fetch the children's LOD chains and assemble at load time; compute union-AABB from children's bounds.
- **P1.13 (UI):** detail panel for a composite displays "(composite of: manubrium, body of sternum, xiphoid process)" with click-through to each child.
- **Attribution surface (ADR 0006):** composites contribute no new attribution string — they inherit transitively from their children's `asset.copyright`. The `bundle_attributions.json` builder must therefore walk composite entries and dedupe.

## Phase impact

- **Phase 1:** Sternum entry synthesized in a P1.08-followup bake; the schema is in place from P1.09 onward. The 79 existing entries are unchanged.
- **Phase 2:** Compound-organ assembly (liver lobes, kidney cortex/medulla, multi-bone joints rendered as units) uses the same shape. No further schema change anticipated.

## References

- ADR 0001 — graph-not-tree (composite entries align with the typed-DAG model; `constitutional_part_of` edges already encode the parent-child relationships used by composites)
- ADR 0004 — ontology-primary-uberon (composite child IDs follow the same UBERON-primary pattern)
- ADR 0006 — runtime-attribution (attribution travels via children for composites)
- ADR 0007 — blender-attribution-discipline (children carry the baked attribution that composites inherit)
- `pipelines/04-validate-ontology/validation-report-2026-05-11.md` Check 6 — the empirical case that forced this ADR
- `docs/agents/asset-pipeline.state.md` P1.08 entry (open item #0) — the handoff that requested this schema extension
