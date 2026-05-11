# ADR 0006 — Runtime attribution must travel with assets

**Status:** Accepted
**Date:** 2026-05-11
**Deciders:** orchestrator, user
**Supersedes:** —

## Context

ADR 0002 and ADR 0005 lock BodyParts3D as the v1 asset base under CC-BY-SA-2.1 Japan. CC-BY-SA's share-alike clause requires that the attribution notice travel **with the work**, not be relegated to a repository-level file that the end user may never see. ATTRIBUTIONS.md at the repository root satisfies the obligation for someone who clones the source code; it does not satisfy the obligation for a user who only visits the deployed app.

Three places where attribution must surface:

1. **In the source assets themselves.** glTF supports `asset.copyright`, `asset.extras`, and per-node `extras` fields. The mesh files we ship must carry their upstream provenance metadata so they remain attributable after any extraction, fork, or redistribution.
2. **In the runtime UI.** A user opening the deployed viewer must be able to find the attribution — typically via an "About" surface, "Attributions" panel, or persistent footer credit.
3. **In bundled output manifests.** The build manifest (per `build-manifest.json`) should record per-artifact provenance so the assembled bundle is auditable.

This question is forced now because: (a) the user surfaced it explicitly after the BodyParts3D license verification, and (b) the Asset Pipeline agent's first Phase 1 run will produce canonical glTF assets — the time to bake provenance into them is at creation, not as a retrofit.

There is also a forward-looking reason. When OpenAnatomy is added in Phase 2 (per ADR 0005), its assets inherit the 3D Slicer License which **also requires attribution to Brigham and Women's Hospital, Inc.** Two distinct upstream attribution chains will then coexist in the bundle. Per-asset metadata is the only way to keep them straight at runtime.

## Decision

**Every canonical asset records its source provenance and license in machine-readable metadata that travels with the asset.** The deployed app must surface this attribution in a user-visible, persistently accessible location.

Specifically:

1. **glTF metadata baking.** The `pipelines/05-bake-registry` step (or a dedicated `pipelines/06-bake-attribution` step inserted before it) writes into every canonical `.glb`:
   - `asset.copyright` — short attribution string per the upstream license's required form (e.g. `"BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan"` for BodyParts3D-derived meshes).
   - `asset.extras.source` — structured object: `{ source, license_spdx_or_descriptive, original_id, ingested_at, edits_applied }`. Mirrors the `provenance` block in `mesh-asset-manifest.json`.
   - For derived or hand-authored assets, the corresponding hand-authored attribution.

2. **In-app attribution surface.** The web app must include:
   - An "About this atlas" surface (modal, panel, or dedicated route) listing every upstream source contributing to the loaded scene, with the verbatim attribution string and a link to the upstream license.
   - The selected-structure detail panel must include the structure's specific provenance (which upstream source the mesh came from) when applicable.
   - The attribution surface must be reachable in fewer than three clicks from the main viewer.

3. **Build manifest provenance.** `build-manifest.json` (per the existing schema) gains an `attributions` array listing every distinct upstream source contributing to the build. CI fails if the bundle contains assets whose source isn't in this array.

4. **No attribution-free assets in `data/canonical/meshes/`.** A canonical mesh without a `source.txt` provenance record fails CI. The schema validation for `mesh-asset-manifest.json` enforces that every entry has a complete `provenance` block.

## Consequences

### Positive

- Share-alike obligations to BodyParts3D / Z-Anatomy (if ever activated) are demonstrably satisfied at every distribution layer — code, source assets, runtime UI, build artifacts.
- Multiple upstream chains coexist cleanly when OpenAnatomy is added in Phase 2.
- Auditable. A future Compliance agent activation pre-launch can verify attribution coverage by reading the manifest, not by trawling source.
- Aligns the project with academic-publication best practices: every dataset cited carries a stable attribution.

### Negative

- Adds work to Asset Pipeline (metadata baking step) and UI (attribution surface). Modest additional Phase 1 scope.
- Per-mesh metadata slightly bloats glb files. Acceptable; well under the bundle budget.
- Hand-authored or AI-generated assets must also carry attribution (e.g. "Procedural femur proxy, hand-authored by [author], CC-BY-SA-4.0"). This is a discipline item, not a tooling item.

### Neutral

- The orchestrator's existing ATTRIBUTIONS.md continues to exist as the canonical chain document at the repository level. ADR 0006 makes it the *backbone* of the attribution story, not the only location.

## Alternatives considered

- **Attribution in ATTRIBUTIONS.md only.** Rejected: doesn't satisfy share-alike for deployed-only users; this is the option the user explicitly pushed back on.
- **Attribution in app footer only, not in asset metadata.** Rejected: if an asset is extracted from the bundle, attribution is lost. The metadata travels.
- **Attribution in asset metadata only, no runtime UI.** Rejected: end users (not developers) need to see attribution. The runtime UI is for them.
- **Cookie-banner-style attribution overlay on first load.** Rejected: ugly, easily dismissed and forgotten. Persistent "About" access is the right pattern.

## Schema impact

- `mesh-asset-manifest.json` already includes a `provenance` block. No change.
- `build-manifest.json` gains an optional `attributions: string[]` field. Non-breaking addition.
- A new optional `bundle_attributions.json` could be emitted by the build for the runtime UI to fetch; defer the specifics to Asset Pipeline + UI when they integrate.

## Phase impact

- **Phase 1:** Pipeline gains a step (or 05-bake-registry is extended) to bake glTF metadata. UI gains an "About" surface listing upstream sources. The procedural femur proxy (user-authored seed) gains an attribution record.
- **Phase 2:** When OpenAnatomy is imported, the attribution surface populates from both BodyParts3D and OpenAnatomy automatically.

## References

- ADR 0002 — asset-source (CC-BY-SA-2.1-JP share-alike obligation)
- ADR 0005 — asset-source-refinement (introduces OpenAnatomy, second attribution chain)
- `ATTRIBUTIONS.md` — repository-level chain (continues to exist as backbone)
- BodyParts3D required attribution string: verified at `lifesciencedb.jp/bp3d/info/license/index.html` (2026-05-11)
- 3D Slicer License (BSD-permissive, attribution required): verified at `github.com/Slicer/Slicer/blob/main/License.txt` (2026-05-11)
- glTF 2.0 specification: `asset.copyright` and `asset.extras` fields
