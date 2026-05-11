# Agent state: research-docs

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 (Phase 1 step P1.01)

---

## Open items

- 2026-05-11 | OBO Foundry page for UBERON does not surface a formal release version/date — needs a direct `https://github.com/obophenotype/uberon/releases` query to anchor the version this crosswalk was built against. Filed during the UBERON->FMA skeletal crosswalk pass.
- 2026-05-11 | Skeletal crosswalk: ~7 rows inferred-by-pattern (thoracic T4, T5, T7-T11; ribs 4, 5, 6) need a mechanical second-pass OLS4 fetch before promotion to `reviewed`. Anatomy Domain owns.
- 2026-05-11 | Skeletal crosswalk gap list: humerus / femur / tibia / fibula / scapula sub-structures (head, shaft, condyles, malleoli, etc.) not yet looked up in UBERON. Phase 1 spec calls out at least femur head/neck/shaft/condyles and humerus head/shaft/condyles. ~10-20 more rows expected. Anatomy Domain owns.
- 2026-05-11 | Skeletal crosswalk gap list: per-digit metacarpals 1-5, metatarsals 1-5 not yet looked up. Parent class IDs verified.
- 2026-05-11 | Rib 8 sits at non-contiguous UBERON:0010757 (ribs 1-7, 9-12 use the 0004601-0004611 sequence). Flagged as a sharp-edge for Asset Pipeline mesh registry.
- Re-verify UBERON's specific recent release date directly against the GitHub releases page (source claimed 2026-04-01; orchestrator could only confirm general activity via OBO Foundry on first pass).
- Re-verify FMA's reported "69,151 unsatisfiable classes" claim if it's going to be cited in a public-facing ADR.

## Decisions log

- 2026-05-11 (late evening — second-pass OpenAnatomy verification) | User pushed back on the earlier "partial verification" of OpenAnatomy's license inheritance. Re-ran WebSearch and WebFetch against canonical sources. Verified at `openanatomy.org/atlas-pages/slicer-license.html` (project-level statement that atlases use the 3D Slicer License) AND at `github.com/mhalle/spl-brain-atlas/blob/master/LICENSE.md` (per-atlas LICENSE file referencing the 3D Slicer License). 3D Slicer License is a BSD-style three-part agreement; Part B governs downloads; permissive, no share-alike, attribution required, clinical use discouraged. Research report's substance was right; "Section B" framing was sloppy. ADR 0005 references and master-spec risk row updated. Phase 1 Spec follow-up marked resolved. **Lesson:** the BodyParts3D miss made the orchestrator over-cautious on OpenAnatomy; should have done the canonical-source search the first time.

- 2026-05-11 | UBERON->FMA skeletal crosswalk completed for 86 verified rows + 7 inferred-by-pattern rows. UBERON's xref data to FMA is dense and reliable for skeletal anatomy; no Phase 1 skeletal structure was found to need a `BODY:NNNN` project-local ID. ADR 0004's assumption that the skeletal crosswalk would be tractable is confirmed.
- 2026-05-11 | Material finding: UBERON's preferred labels for several skeletal structures use comparative-anatomy register ("tetrapod frontal bone", "vertebral bone 1", "jugal bone", "innominate bone", "fused sacrum", "distal carpal bone 1-4", "distal tarsal bone 1-3", "mammalian cervical vertebra 3-7"). ADR 0004's existing decision to use TA2 labels in `labels[0]` covers this; the crosswalk doc surfaces the specific cases.
- 2026-05-11 | UBERON OBO Foundry page confirms `CC BY 3.0` license. No release version/date listed on the OBO Foundry page itself.
- 2026-05-11 | Ingested 98-line research report on ontology + 3D asset strategy. Source recommends UBERON-primary / TA2-labels / FMA-crossref ontology stance and BodyParts3D + OpenAnatomy hybrid asset path.
- 2026-05-11 | Flagged one verifiable factual error in the source: BodyParts3D license is CC BY-SA 2.1 Japan (verified via `lifesciencedb.jp/bp3d/info/license/index.html`), not CC BY 4.0 as the source claims. ADR 0002 stands.

## Handoffs

- 2026-05-11 → Anatomy Domain: UBERON->FMA skeletal crosswalk delivered at `docs/references/summaries/uberon-fma-skeletal-crosswalk.md`. 86 fully-verified rows + 7 inferred-by-pattern, covering skull (cranial + facial), full vertebral column (C1-L5 + sacrum + coccyx), rib cage (sternum + ribs 1-12), pectoral girdle, upper limb (long bones + 8 carpals + phalanges), pelvic girdle, lower limb (long bones + 7 tarsals + phalanges). Anatomy Domain to: (a) seed `data/canonical/ontology/nodes.json` with these as `status: pending`; (b) run a mechanical second-pass batch for the 7 inferred rows; (c) decide the dive-deeper sub-structure depth and look up femur/humerus/tibia/etc. sub-parts; (d) populate `relations.json` with `regional_part_of` edges; (e) populate `synonyms.json` from the Latin / TA2 column.
- 2026-05-11 → Orchestrator: ADR drafts needed (ontology-pivot + asset-source-refinement). Proposed wording staged in `docs/references/summaries/ontology-and-dataset-review.md` §"Deltas vs Phase 0 locked decisions". Awaiting user approval before ADR authoring begins.

## Invocation history

- 2026-05-11 | Second invocation. **Phase 1 step P1.01 dispatch** from Orchestrator: build UBERON->FMA crosswalk for major skeletal-system structures with TA2 labels. Used OLS4 (`https://www.ebi.ac.uk/ols4/api/`) search + term-detail endpoints. Produced `docs/references/summaries/uberon-fma-skeletal-crosswalk.md` with 86 fully-verified rows + 7 inferred-by-pattern across 16 anatomical sub-regions (skull cranial, skull facial, cervical/thoracic/lumbar/sacrum/coccyx vertebrae, intervertebral discs, sternum components, ribs 1-12, pectoral girdle, upper-limb long bones, carpus, metacarpals/phalanges of manus, pelvic girdle, lower-limb long bones, tarsus, metatarsals/phalanges of pes). Handoff to Anatomy Domain registered above. Open items refreshed with the second-pass batch (T4-T5, T7-T11, ribs 4-6), the femur/humerus/etc. sub-structure depth question, and the per-digit metacarpal/metatarsal lookups.
- 2026-05-11 | First invocation. Ingested external research feed. Wrote raw artifact to `docs/references/raw/2026-05-11-ontology-and-dataset-review.md` and summary to `docs/references/summaries/ontology-and-dataset-review.md`. Cross-verified two key claims independently (BodyParts3D license, UBERON license).
