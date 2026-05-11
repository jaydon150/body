# Agent state: architect

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 — P1.09 (Architect + QA schema upgrade, cross-domain dispatch)

---

## Open items

1. **(NEW, P1.09)** **Sternum composite entry synthesis is now unblocked.** ADR 0008 is accepted; `app/shared/schema/mesh-asset-manifest.json` now supports `composite_entry` shape via `oneOf`. A follow-up bake at `pipelines/05-bake-registry/` can synthesize the `UBERON:0000975` entry referencing `[UBERON:0002205, UBERON:0006820, UBERON:0002207]`. Handoff to Asset Pipeline; not a P1.09 deliverable.
2. **(NEW, P1.09)** **`build-manifest.json` is missing the `attributions` array specified in ADR 0006.** Per workstream A4's hard rule "tightening or clarification, not new structure," P1.09 deliberately did NOT add this field — adding it would have been new structure beyond the composite_children addition. The gap remains for a future Architect dispatch when DevOps actually needs to emit a build manifest with attributions, or sooner if the Orchestrator wants to land it. Filed for visibility; minor cost to land later because no consumer yet exists.
3. **(NEW, P1.09)** **`quality_notes: string[]` field requested by P1.08 asset-pipeline state log (open item #10) is still not in the schema.** Same reason as item 2 — workstream A4's "tightening only" rule excludes new fields. The two LOD2-ratio-0.3-fallback meshes (`uberon_0001429`, `uberon_0002445`) continue to have their fallback status implicit in the LOD2 triangle ratio rather than explicit. Filed for a future Architect dispatch.
4. **(NEW, P1.09)** **synonyms.json file remains on disk** but is logically retired per ADR 0008. The current empty-arrays placeholder still validates against the loosened anatomy schema (only `version` is required now). The hard rule "Don't mutate canonical data" forbade removing the file in this dispatch; if the Orchestrator wants it physically deleted, dispatch a separate task to Anatomy Domain. The validator no longer treats its content as authoritative — vernacular labels are sourced from `nodes.json[].labels[].source = "vernacular"`.

## Decisions log

### 2026-05-11 — P1.09 (Architect + QA schema upgrade, cross-domain dispatch)

- **Cross-domain dispatch.** Operated as both Architect (schema authority) and QA (validation tooling) for one invocation. Schema changes captured in this log; validator + smoke-test in `qa.state.md`.

- **A1 — `composite_children` added to mesh-asset-manifest.** The `entry` $def is now `oneOf [own_mesh_entry, composite_entry]`. The existing 79 entries match the `own_mesh_entry` shape exactly (no migration needed); future composite entries (sternum, future compound organs) take the `composite_entry` shape with `composite_children: array<primary_id>` required. The `oneOf` forces "exactly one of these two shapes" so a malformed mixed-shape entry (both lods AND composite_children) is rejected by ajv at validate time. This is the headline schema change of P1.09. See ADR 0008 for the full reasoning.

- **A2 — Option A chosen: loosen top-level shape of `anatomical-id-schema.json`.** The top-level required list dropped from `["version", "nodes", "edges"]` to `["version"]`. `nodes` and `edges` remain optional; when present, each item validates against the corresponding $def. Rationale: existing data already satisfies this — `nodes.json` has `{version, nodes, edges: []}`, `relations.json` has `{version, nodes: [], edges}`, `synonyms.json` has `{version, nodes: [], edges: []}`. Loosening preserves backward compatibility and matches the file-split design. Option B (split into 3 schemas) was rejected because the gain in intent-clarity does not justify the increase in schema-file count for what is fundamentally one logical contract. Option C (merge data files) was rejected as it would break the existing P1.07 design and force a data migration.

- **A3 — `synonyms.json` formally retired (Option 1).** Vernacular and alternate labels live in `nodes.json[].labels[]` with `source: "vernacular"`. This was already the established pattern per the Anatomy Domain. Retiring the separate synonyms file:
  - Avoids designing a new `synonym_entry` $def that would duplicate `label` semantics.
  - Removes one moving part from the data layout.
  - Aligns with Phase 1's "keep it simple" stance.
  Per the hard rule "Don't mutate canonical data," the file itself was left on disk; its content (empty arrays) still validates. The retirement is logical — it is now documented in this state log and in ADR 0008, and the validator does not treat it as a separate concern beyond the standard data-against-schema check. The label.source description in the schema now explicitly lists `"vernacular"` as a known value, capturing the migration path.

- **A4 — Other 6 schemas audited; minimal tightening applied.** Changes were strictly tightening or clarification per the workstream rule. Specifically:
  - `style-tokens.json`: added `additionalProperties: false` to `font_family`, `scale`, `line_height`, `duration`, `easing`, and the top-level `typography` and `motion` objects. Added descriptions to every previously-undescribed property. The `color_palette.additionalProperties: true` was kept intentionally and now carries a description explaining why (custom palette entries are permitted).
  - `test-fixture-schema.json`: added `additionalProperties: false` to the `provenance` sub-object and descriptions to its fields.
  - `build-manifest.json`: added `additionalProperties: false` to the `totals` sub-object and descriptions to its fields. Did NOT add the `attributions[]` field that ADR 0006 specifies — that would have been new structure beyond the A4 mandate. Filed as open item #2.
  - `content-record-schema.json`: added descriptions to every `citation` $def field that was missing one.
  - `selection-event-schema.json`: added descriptions to `event_type`, `timestamp`, `modifier_keys`, and each modifier key.
  - `anatomical-id-schema.json`: already updated in A2; tightenings to `label`, `node`, `edge` happened in the same write.
  Conscious omissions: no DRY-ing of the `^(UBERON:\\d{7}|FMA:\\d+|BODY:\\d+)$` pattern across the 3 schemas that use it. Each schema is self-contained and the duplication is small; cross-schema $refs would create a packaging concern not yet warranted. Filed as a future hardening candidate if the pattern shifts.

- **A5 — ADR 0008 drafted at `docs/decisions/0008-composite-asset-entries.md`.** Frames the composite_entry decision against ADR 0006 (attribution travels with assets — composites inherit transitively from children) and ADR 0007 (Blender attribution discipline — irrelevant for composites because no Blender pass occurs at composite-creation time). Lays out the four alternatives considered and explains why `oneOf` over two well-defined sub-shapes was preferred over a discriminator field or a single shape with all-optional fields.

- **All existing canonical data continues to validate after schema changes** — verified by `npm run validate:schemas`. Backward compatibility preserved end-to-end. The 79 own-mesh entries match the new `own_mesh_entry` shape exactly. nodes.json, relations.json, synonyms.json all match the loosened anatomy-id schema. Zero data files needed edits.

- **Idempotency:** the validator output is byte-identical across re-runs. No "second-run drift."

- **Read-only enforcement verified.** P1.09 wrote only to: schema files (7 in `app/shared/schema/`), the ADR (`docs/decisions/0008-composite-asset-entries.md`), the validator (`app/web/scripts/validate-schemas.mjs`), `app/web/package.json` (added ajv + ajv-formats), and the two state logs (this one + `qa.state.md`). No canonical data, mesh, ontology, or pipeline output was mutated.

## Handoffs

### To Asset Pipeline (post-P1.09)

- **Sternum composite entry is unblocked.** Schema now accepts `composite_entry`. A follow-up bake should emit the `UBERON:0000975` entry as a composite of the three child IDs. The validator will accept it without further changes.
- **The temporary "load children via ontology when no registry entry" rule from P1.08 can be retired** once the sternum entry is baked, because the composite is then declarative in the registry. The runtime 3D Engine + UI handoffs in `asset-pipeline.state.md` referenced this fallback; updating them to point at the registry composite is a clean delta.

### To 3D Engine (P1.10) and UI (P1.13)

- **Composite entries discoverable at load time.** When the loader encounters an entry with `composite_children` present, fetch each child's LOD chain and assemble. Bounds are the union of children's bounds. Per ADR 0008, attribution is inherited transitively (no own attribution string for composites).
- **`oneOf` enforcement on read.** TypeScript types generated from the schema (when that pipeline lands) will reflect the union type — code should branch on the discriminating field presence (`'composite_children' in entry`) rather than assuming a single shape.

### To DevOps (eventually)

- **`build-manifest.json` `attributions[]` field requested by ADR 0006 is still NOT in the schema** (open item #2). When DevOps starts emitting build manifests with attribution data, file a schema-change request — the addition will be trivial and non-breaking.

## Invocation history

- **2026-05-11 — P1.09** (Architect + QA schema upgrade, cross-domain dispatch). 7 schemas updated, 1 ADR drafted, 1 validator rewritten with two-phase ajv validation. All canonical data still validates; smoke-test confirmed the validator rejects a broken payload with clear `oneOf` failure errors.
