# ADR 0001 — Anatomy is modelled as a typed graph, not a tree

**Status:** Accepted
**Date:** 2026-05-11
**Deciders:** orchestrator, user
**Supersedes:** —

## Context

The viewer's central interaction is "select a system, dive into its subsystems, dive further into sub-subsystems." The natural first instinct is to model anatomy as a tree: Body → System → Organ → Tissue → Cell. This is wrong, and getting it wrong now forces a rewrite later.

Anatomy is fundamentally a directed acyclic graph with multiple inheritance:

- The **diaphragm** is part of the muscular system AND the respiratory system.
- The **pharynx** is part of the digestive AND respiratory systems.
- The **pancreas** is digestive (exocrine) AND endocrine.
- The **kidneys** are urinary AND endocrine (renin, erythropoietin).
- The **liver** is digestive AND part of the reticuloendothelial / immune system.
- The **gonads** are reproductive AND endocrine.

A tree forces a single parent per node and either suppresses these dual memberships or duplicates structures. Either path corrupts the data model.

Worse, anatomical relations are not all "is part of." The Foundational Model of Anatomy (FMA) distinguishes:

- `regional_part_of` — spatial containment (heart is *regional_part* of thorax)
- `constitutional_part_of` — compositional (left ventricle is *constitutional_part* of heart)
- `systemic_part_of` — functional system (heart is *systemic_part* of cardiovascular system)
- `member_of` — set membership (a vertebra is *member_of* vertebral column)
- `branch_of` / `tributary_of` — vessel branching
- `innervates` / `supplied_by` — functional connections

A single "parent_id" field cannot represent these. The data model needs typed edges.

## Decision

Anatomy is modelled as a **typed directed acyclic graph**. Nodes are anatomical concepts keyed by Foundational Model of Anatomy (FMA) identifiers. Edges carry an explicit relation type drawn from a fixed enumeration (initially: `regional_part_of`, `constitutional_part_of`, `systemic_part_of`, `member_of`, `branch_of`, `tributary_of`, `innervates`, `supplied_by`).

Nodes may have multiple parents. The viewer's "system view" is one *view* over this graph (filter edges by `systemic_part_of`), not the primary structure.

UBERON and Terminologia Anatomica identifiers are stored as aliases on each node, not as alternative primary keys.

## Consequences

### Positive

- Multi-system organs are represented correctly without duplication or loss.
- The peel mechanic, system isolation, dive-deeper, and search are all queries over a single uniform graph rather than special-cased traversals.
- The schema scales naturally to functional relations (innervation, vascular supply) when Phase 2+ adds them.
- Future integration with biomedical ontologies (UBERON, SNOMED CT) is straightforward — they speak this language already.

### Negative

- More complex than a tree at the schema layer. JSON Schema for typed edges is more verbose than nested parent/child arrays.
- The UI must explicitly choose which relation type drives the sidebar tree at any given view — there is no single canonical hierarchy.
- Graph queries are heavier than tree traversals. Need a small in-memory query layer; not free.

### Neutral

- Tooling: the JSON files for nodes and relations can still be hand-edited and reviewed by anatomists; we don't need a graph database for v1 (a typed JSON store + in-memory index is enough).
- Visualization: graph-rendering of the ontology is a tool for the development team, not a user-facing feature.

## Alternatives considered

- **Tree with duplicate nodes for multi-system organs.** Rejected: data inconsistency, sync drift, content errors will accumulate.
- **Tree with a single "primary system" pointer + secondary tags.** Rejected: same problem in lighter form; the "primary" choice is arbitrary and changes by use case.
- **Untyped graph (all edges treated identically).** Rejected: loses the semantic richness FMA encodes. The peel mechanic specifically needs to know that "diaphragm is *systemic_part_of* respiratory" is a different kind of edge than "diaphragm is *constitutional_part_of* muscular system."
- **Triple store / RDF / OWL.** Rejected: overkill for v1, heavy tooling, slower iteration. Reserve as a possible Phase 4+ migration target if interop with biomedical knowledge graphs becomes a goal.

## References

- Rosse C, Mejino JL Jr. "A reference ontology for biomedical informatics: the Foundational Model of Anatomy." *Journal of Biomedical Informatics*, 2003.
- UBERON: http://obophenotype.github.io/uberon/
- Terminologia Anatomica (FIPAT): https://fipat.library.dal.ca/ta2/
- BodyParts3D: https://lifesciencedb.jp/bp3d/
