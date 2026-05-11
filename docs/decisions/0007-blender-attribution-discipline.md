# ADR 0007 — Blender pipeline attribution discipline

**Status:** Accepted
**Date:** 2026-05-11
**Deciders:** orchestrator (after two consecutive empirical confirmations from Asset Pipeline subagent invocations P1.05 and P1.06)
**Supersedes:** —

## Context

ADR 0006 requires that runtime attribution travels with every canonical asset — `asset.copyright` and `asset.extras.source` baked into each glb. Phase 1 step P1.04 established this at the point of asset creation (`obj2gltf` conversion + `gltf-pipeline` post-process injection).

In Phase 1 step P1.05 (Blender headless cleanup), the Asset Pipeline subagent discovered empirically that **Blender 5.1.1's glTF exporter overwrites `asset.copyright` and drops `asset.extras` unconditionally**, even when `export_copyright` and `export_extras` flags are explicitly set. Without intervention, every Blender pass through an asset destroys its attribution metadata. The subagent worked around this by implementing a pre-snapshot + post-export re-injection pattern: read attribution from the input glb before Blender touches it, run Blender, then post-process the output glb to overwrite Blender's stamped `asset.copyright` with the snapshotted value and merge the snapshotted `asset.extras` with new pipeline-specific edits appended to `asset.extras.source.edits[]`.

In Phase 1 step P1.06 (LOD decimation), the same pattern was inherited as a P1.05 template and **the issue was confirmed a second time** — both LOD1 and LOD2 generation triggered the same exporter behavior, and the same workaround held cleanly. Two consecutive empirical confirmations across two distinct Blender operations (cleanup and decimation) constitute enough evidence to canonicalize the pattern rather than leave it as a per-pipeline trial-and-error rediscovery.

A third pattern is informative: the canonical glb chunk-type bytes are NUL-padded (`42 49 4E 00`, displayed as `"BIN\0"` but rendered by most editors as `"BIN "`). Both `obj2gltf` (P1.04) and Blender (P1.05, P1.06) emit NUL. Any reinject implementation that assumes space-padding will fail silently or write malformed glbs. This is documented here because it travels with the same pipeline concern.

Without an ADR, any future pipeline that touches glbs through Blender (compound-organ assembly, manual cleanup, future LOD strategies, animation rigging) will rediscover the issue through broken attribution chains, broken CI, or — worst case — silently-shipped attribution-less assets.

## Decision

**Every asset pipeline step that produces a glb via Blender MUST implement the pre-snapshot + post-export re-injection pattern.**

Specifically:

1. **Before any Blender pass** that takes a glb as input and produces a glb as output, the pipeline reads the input glb's `asset.copyright` (string) and `asset.extras` (object) and snapshots both into a per-glb metadata cache.

2. **After Blender writes the output glb**, the pipeline post-processes the output to:
   - Overwrite `asset.copyright` with the snapshotted verbatim string (replacing Blender's "Blender X.Y" stamp).
   - Overwrite `asset.extras` with the snapshotted object, **then append the new pipeline-specific edit string** to `asset.extras.source.edits[]` (creating the array if absent; deduplicating if the same edit string is already present, to keep re-runs idempotent).

3. **Implementation choice is per-pipeline.** Two patterns are blessed:
   - **`gltf-pipeline` Node library** (the P1.04 approach) — convenient when other glTF processing is already happening.
   - **Zero-dependency binary surgery** (the P1.05 / P1.06 `reinject_attribution.mjs` approach) — preferred when minimizing pipeline dependencies. Implementation: parse the 12-byte GLB header, locate the JSON chunk (chunk type `0x4E4F534A` = `"JSON"`), parse + modify + re-serialize the JSON, then write back with **4-byte aligned padding** (`0x20` space) and re-emit the BIN chunk verbatim with NUL-padding (`0x00`).

4. **Chunk-type bytes are NUL-padded, not space-padded.** Any reinject implementation that assumes space-padded chunk type (`"BIN "`, `"JSON"`) will produce malformed glbs against this codebase's outputs. Decode chunk type as 4 raw bytes; do not stringify with assumed padding character.

5. **CI must verify attribution survival** on a sample of glbs after each pipeline run. Recommended minimum: the three canaries from P1.05 / P1.06 (femur `uberon_0000981`, mandible `uberon_0001684`, rib 8 `uberon_0010757`) — parse each glb's JSON header and assert `asset.copyright` is non-empty and starts with `"BodyParts3D"` (or the source-appropriate prefix when future upstreams are added).

6. **The pattern is idempotent.** Re-running any blessed pipeline on the same input must produce byte-identical output, with deduplicated `edits[]` entries. P1.05 and P1.06 both verified this.

## Consequences

### Positive

- ADR 0006 compliance is bulletproof across Blender-touching pipelines, regardless of Blender's exporter behavior at the time the pipeline runs.
- Future pipeline authors inherit the pattern via this ADR plus the reference implementations in `pipelines/02-clean-meshes/reinject_attribution.mjs` and `pipelines/03-decimate-lods/reinject_attribution.mjs`.
- Cost is bounded: ~sub-second per glb for the snapshot + reinject round-trip; trivial relative to the Blender pass itself.
- The chunk-type NUL-padding gotcha is documented in one place rather than rediscovered per implementation.

### Negative

- Adds two utility scripts (snapshot + reinject) to every Blender-touching pipeline. Minor maintenance surface.
- If Blender's exporter ever fixes the `asset.copyright`/`asset.extras` behavior, the reinject becomes a no-op overwrite with the original values. Defensive overhead, not actual cost. The ADR can be revisited if Blender's behavior changes and verified-stable.
- Couples canonical-glb correctness to a non-obvious implementation invariant. New contributors must read this ADR before touching any glb pipeline.

### Neutral

- The pattern applies only to Blender. `obj2gltf` (P1.04) and any future non-Blender glb generator can inject attribution directly without the snapshot dance — but doing so still satisfies this ADR (snapshot from "no prior version" is the identity case).
- The pattern does not constrain *what* attribution is injected — that is ADR 0006's scope. ADR 0007 only constrains *how* it survives a Blender round-trip.

## Alternatives considered

- **Wait for Blender to fix it upstream.** Rejected: there is no published commitment to fix the behavior, the bug has persisted across multiple major versions, and any fix would still require validation. Defensive workaround is cheap and works today.
- **Modify Blender's glTF exporter via the Python API to honor the flags.** Rejected: requires per-Blender-install patching; would silently fail for any contributor without the patch.
- **Don't bake attribution into asset metadata; rely on ATTRIBUTIONS.md and an in-app surface only.** Rejected: violates ADR 0006 explicitly. ADR 0006's reasoning is that share-alike notices must travel with the work; ADR 0007 ensures that travel survives transformation.
- **Use a different mesh format that round-trips metadata cleanly through Blender** (e.g. USD). Deferred: glTF is the right format for the web target; revisiting the export format is a Phase 2+ scale-up discussion if Blender's exporter behavior remains unchanged and our pipeline complexity grows.

## Reference implementations

- `pipelines/02-clean-meshes/reinject_attribution.mjs` — zero-dep binary surgery, used during P1.05 cleanup. Idempotent, NUL-aware chunk-type handling.
- `pipelines/03-decimate-lods/reinject_attribution.mjs` — same pattern applied to LOD generation, P1.06.
- `pipelines/01-import-bp3d/convert.js` — `gltf-pipeline` based; the non-Blender path for the initial OBJ→glb conversion. ADR 0007 doesn't apply because Blender is not involved, but the same logical structure (set attribution at the point of asset creation) is followed.

## References

- ADR 0006 — runtime attribution must travel with assets (this ADR operationalizes it for Blender pipelines)
- `docs/agents/asset-pipeline.state.md` — full chronology of the empirical confirmations during P1.05 and P1.06
- glTF 2.0 binary specification (chunk layout): https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout
- Blender 5.1.1 build date: 2026-04-14 (the version against which the exporter behavior was confirmed)
