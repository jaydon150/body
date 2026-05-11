# ADR 0004 — Ontology primary backbone: UBERON

**Status:** Accepted
**Date:** 2026-05-11
**Deciders:** orchestrator, user
**Supersedes:** ADR 0001 on the FMA-primary clause only. ADR 0001's "anatomy is a typed DAG" decision is unchanged.

## Context

ADR 0001 made two coupled decisions: anatomy is modelled as a typed DAG (not a tree), and Foundational Model of Anatomy (FMA) identifiers are the primary key for nodes. The first decision was the substantive one. The second was the natural pairing because BodyParts3D — our Phase 0-locked mesh source — maps its meshes to FMA IDs explicitly.

The deep-research feed ingested on 2026-05-11 surfaced material concerns about FMA-as-primary that were not on the table when ADR 0001 was written:

- FMA's public OBO track is classified as **inactive** on OBO Foundry. Its public OWL distribution has well-known logical issues reported by ontology maintainers (specifically, large numbers of unsatisfiable classes — exact count cited in the source flagged as unverified by the orchestrator, but the general thrust is well-supported in the bioinformatics community).
- UBERON is **actively maintained**, designed bridge-first across anatomy ontologies, graph-native for multi-parent membership, and already adopted by major data-integration projects (Bgee, ENCODE, FANTOM5, Monarch).
- UBERON is published under CC BY 3.0 (verified directly on OBO Foundry).
- The Terminologia Anatomica 2 (TA2) maintained by FIPAT is the strongest source for *user-facing* anatomical names — Latin canonical, English, synonyms — but is not itself a richly axiomatized ontology suitable as a graph backbone.

A reasonable separation falls out: pick the best maintained graph for the *internal* model, the best terminology resource for *labels and search*, and keep FMA as an *alias* layer to preserve interoperability with BodyParts3D and other legacy datasets.

The cost of remaining on FMA-as-primary now compounds with every node added: schema patterns, content references, mesh registry keys, and CI validation rules would all need to be revised later. Doing the pivot before Phase 1 anatomy content begins is the cheap moment.

## Decision

**UBERON identifiers are the primary key for anatomical-graph nodes.** Format: `UBERON:NNNNNNN`.

- FMA identifiers move to the `aliases` field on each node (alongside TA2 codes, SNOMED CT codes when applicable).
- TA2 terms become the primary source for `labels` (English and Latin) and synonyms.
- Where a structure exists in BodyParts3D but lacks a UBERON ID, a project-local identifier `BODY:NNNN` is used as primary, with the FMA ID preserved in aliases, and a `proposed` status flag set per ADR 0001's conventions. These nodes are surfaced to the Anatomy Domain agent for crosswalk research before they reach `reviewed` status.

The relation enum in `anatomical-id-schema.json` is unchanged. The DAG structure from ADR 0001 is unchanged. Only the identifier scheme on `node.id` shifts.

## Consequences

### Positive

- Backbone ontology is actively maintained. Bug fixes, new structures, and ontology evolution come "for free" from upstream.
- Cross-species interoperability is natural (UBERON's design intent), keeping the door open for comparative-anatomy extensions long after v1.
- Adoption alignment with major biomedical-data projects (Bgee, ENCODE, FANTOM5, Monarch). If the project ever cites or is cited by these ecosystems, identifier compatibility is a default rather than a translation cost.
- Crosswalks to FMA and TA2 are widely available; UBERON itself xrefs to FMA in many places.

### Negative

- A FMA→UBERON crosswalk pass is required before Phase 1 anatomy content begins. For skeletal structures this is largely tractable (both ontologies cover skeletal well); for deeper or less-canonical structures it will be more work.
- Some BodyParts3D structures have no clean UBERON equivalent. These need `BODY:NNNN` project-local IDs and surface to the Anatomy Domain agent.
- The schema's `node.id` pattern must change. Mesh asset manifests built against the FMA-primary pattern will not validate against the UBERON-primary pattern. (No such manifests exist yet in Phase 0 — the schema change is non-breaking for the live data.)

### Neutral

- Schema structure is otherwise unchanged. `aliases` already supports UBERON, FMA, TA2, SNOMED.
- Anatomist review burden does not change. Reviews continue to happen at the node level regardless of which ID format is primary.

## Alternatives considered

- **Keep FMA primary, UBERON as alias.** Rejected: doubles down on a stale upstream. Future content tied to a stalling identifier system carries technical debt that compounds.
- **Project-local IDs as primary (e.g. `BODY:NNNN`), all ontology IDs as aliases.** Rejected: maximum portability but minimum interoperability. We gain nothing in exchange for losing the ability to cite or be cited by external biomedical knowledge graphs.
- **TA2 as primary.** Rejected: TA2 is nomenclature, not ontology; weaker for graph reasoning. Use it where it shines (display and search).
- **Hybrid primary IDs by structure type** (e.g. UBERON for organs, FMA for fine-grained sub-structures). Rejected: complicates every consumer agent's resolution logic. The schema's `aliases` field already covers the "where does this also live" question without forking the primary key by domain.

## Schema impact

The `anatomical-id-schema.json` contract changes in three places, but the changes are scoped to the `node.id` regex and the `$defs` it references. No fields are added or removed.

Before (per ADR 0001 baseline):

```json
"fma_id": { "type": "string", "pattern": "^FMA:\\d+$" },
"node": {
  "properties": {
    "id": { "$ref": "#/$defs/fma_id" }
  }
}
```

After:

```json
"primary_id": {
  "type": "string",
  "pattern": "^(UBERON:\\d{7}|FMA:\\d+|BODY:\\d+)$",
  "description": "UBERON preferred. FMA accepted only when UBERON equivalent is absent and a crosswalk task is filed. BODY:NNNN reserved for structures with no upstream ontology equivalent."
},
"node": {
  "properties": {
    "id": { "$ref": "#/$defs/primary_id" }
  }
}
```

Architect-as-orchestrator applies this change in the same commit as this ADR. Schema validation in CI re-runs and must pass.

## Crosswalk task for Phase 1

Anatomy Domain's first Phase 1 task: build a FMA→UBERON crosswalk for the skeletal-system structures imported from BodyParts3D. UBERON's own FMA `xref` properties provide most of this; gaps are filed for review.

## References

- ADR 0001 — graph-not-tree (the structural decision this ADR refines)
- ADR 0002 — asset-source (BodyParts3D mapping to FMA is the reason FMA remains an alias)
- `docs/references/summaries/ontology-and-dataset-review.md` — the analysis that prompted this ADR
- `docs/references/raw/2026-05-11-ontology-and-dataset-review.md` — source material
- UBERON on OBO Foundry: https://obofoundry.org/ontology/uberon (verified 2026-05-11)
- BodyParts3D license: https://lifesciencedb.jp/bp3d/info/license/index.html (verified 2026-05-11)
