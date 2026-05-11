# Summary — Ontology and 3D asset strategy review

**Raw source:** [`../raw/2026-05-11-ontology-and-dataset-review.md`](../raw/2026-05-11-ontology-and-dataset-review.md)
**Ingested:** 2026-05-11
**Confidence:** mixed — see "Factual issues" section. Treat conclusions as proposals, not facts.

## Headline recommendations from the source

1. **Ontology backbone: switch primary from FMA → UBERON.**
   - UBERON is actively maintained, graph-native, multi-species, bridge-oriented to other anatomy ontologies.
   - FMA's public OBO track is reported inactive; OWL distribution reportedly has thousands of unsatisfiable classes (specific number cited in the source flagged as unverified by orchestrator).
   - TA2 stays as the surface-vocabulary layer (display names, synonyms, Latin terms, search).
   - FMA crossrefs preserved because BodyParts3D maps to FMA IDs (so we still need them as aliases).

2. **Asset strategy: BodyParts3D + OpenAnatomy hybrid.**
   - BodyParts3D for whole-body baseline.
   - OpenAnatomy added as a regional supplement — its brain atlas is much richer than BodyParts3D's brain.
   - Z-Anatomy de-emphasized: ambiguous license (Zenodo says CC BY 4.0; app-side says CC BY-SA) and no published ontology mapping table.
   - Visible Human ruled out unless we want to do CT/MRI segmentation ourselves.
   - Commercial paths (BioDigital, Complete Anatomy, Visible Body, Zygote) reserved as post-v1 options. Zygote is the only one whose license cleanly contemplates hosted-software distribution.

3. **Application-graph edges.** Add these relation types beyond the FMA-derived enum: `display_group`, `dissection_order`, `member_of_system`.

4. **Standards reality check.** DICOM uses SNOMED-derived body-part codes natively, not FMA/UBERON/TA2. FHIR has no first-class anatomy code system. Translation: don't choose ontology backbone expecting native interop with clinical standards; assume a mapping layer.

5. **MVP timeline estimate from source.** 4–10 weeks for a usable browser-based gross-anatomy viewer from BodyParts3D / OpenAnatomy base. Faster than the orchestrator's prior 9–14 month estimate, but "usable" is squishy and the source defines it narrowly.

## What the orchestrator verified independently

- **BodyParts3D license = CC BY-SA 2.1 Japan**, not CC BY 4.0 as the report claims. Verified directly at `https://lifesciencedb.jp/bp3d/info/license/index.html` (2026-05-11). Required attribution string: *"BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan."* **ADR 0002's share-alike claim stands.**
- **UBERON license = CC BY 3.0** per the OBO Foundry page. Active usage by Bgee, ENCODE, FANTOM5, Monarch confirmed there. Activity status terms were not on the OBO page in the form the source claimed (no explicit "active" label visible), but the documented integrations are consistent with an actively maintained ontology.

## Factual issues in the source

1. **BodyParts3D licensing claim is wrong.** The report states the BodyParts3D archive is CC BY 4.0 and concludes the dataset is commercially redistributable with attribution. The actual license is CC BY-SA 2.1 Japan with share-alike. This is a material error: anyone making a commercial decision based on the report's bucketing of BodyParts3D as "cleanest open SaaS-compatible" would be wrong.

2. **FMA's "69,151 unsatisfiable classes" specific number is not independently verified** by the orchestrator. Cited only to a maintainer issue ID in the source. The general thrust (FMA's public OBO track is stale, has logical issues) is well-supported, but the specific count should not be quoted without independent verification.

3. **Several specific polycounts, structure counts, and dates** (e.g. Zygote tri counts, OpenAnatomy "300+ structures," BodyParts3D "2,234 mesh entries") are presented as facts but cited only to product/marketing pages. Treat as approximate, not authoritative.

4. **The report cites a "2026-04-01 UBERON release."** The orchestrator could not independently confirm an exact release date on the OBO Foundry page during ingestion; the GitHub releases page would need a direct check.

## Deltas vs Phase 0 locked decisions

| Phase 0 lock | Source's proposed change | Orchestrator's read |
|--------------|-------------------------|----------------------|
| ADR 0001 — FMA as primary ID scheme | UBERON as primary; FMA as alias | **Defensible.** Need a new ADR superseding 0001 on this specific point. Schema change is small — already supports aliases. |
| ADR 0002 — Z-Anatomy / BodyParts3D as asset base | BodyParts3D + OpenAnatomy hybrid; de-emphasize Z-Anatomy | **Defensible.** New ADR refining 0002 to add OpenAnatomy and downgrade Z-Anatomy. |
| ADR 0002 — CC-BY-SA-2.1-JP share-alike accepted | Source asserts CC BY 4.0 | **Source is wrong; 0002 is right.** No change needed. |
| Master spec §6 v1 systems (skin/skeleton/muscular) | No change suggested | No action. |
| Master spec §11 risks | No new risks, but report adds nuance | Update §11 to acknowledge: FMA's stale OBO state is a new risk on the existing data-model pillar. |
| Relation enum in `anatomical-id-schema.json` | Add `display_group`, `dissection_order`, `member_of_system` | **Defensible.** Schema additions are non-breaking; add when first consumer needs them, not speculatively. |

## Routing

- **Anatomy Domain agent** should own the ontology-pivot ADR draft.
- **Asset Pipeline agent** should own the OpenAnatomy-addition ADR draft.
- **Compliance agent (deferred Tier 3)** should re-verify license claims before public release; this summary documents the BodyParts3D verification.

## Open items for orchestrator

1. Propose ADR drafts (0004 ontology-pivot, 0005 asset-source-refinement) for user approval.
2. Confirm whether the source's recommendation to add `display_group` / `dissection_order` / `member_of_system` is wanted now or deferred.
3. Reconcile the timeline estimate (source: 4–10 weeks for MVP; orchestrator's prior: 9–14 months for solo+AI to credible v1). The two estimates measure different things — clarify Phase 1 acceptance criteria carefully.
