# BodyParts3D — license registry entry

**Source:** BodyParts3D / Anatomography (DBCLS, Japan)
**SPDX-like identifier:** `CC-BY-SA-2.1-JP`
**Verified:** 2026-05-11 (Asset Pipeline agent, Phase 1 step P1.03)
**Used by:** `data/raw/bodyparts3d/` → (eventually) `data/canonical/meshes/` for every BodyParts3D-sourced mesh.

## Required attribution (verbatim)

Every artifact derived from BodyParts3D — canonical glTF/glb files, build bundles, runtime UI surfaces, derivative documentation — MUST display:

> BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan

This string is the upstream-required attribution form. It is also baked into the `asset.copyright` field of every canonical `.glb` produced by the pipeline (per ADR 0006).

## License

**Creative Commons Attribution-ShareAlike 2.1 Japan.**

- Human-readable deed (English): https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
- Legal code (Japanese, authoritative): https://creativecommons.org/licenses/by-sa/2.1/jp/legalcode.ja
- Upstream license page: https://lifesciencedb.jp/bp3d/info/license/index.html

### Key obligations under CC BY-SA 2.1 JP

- **Attribution:** the verbatim string above, plus a link to the license, plus indication of changes made. Indication of changes for the body project = the cleanup operations recorded in each mesh's pipeline metadata (`asset.extras.source.edits_applied` per ADR 0006).
- **ShareAlike:** any derivative work — including assets cleaned and converted to glTF in `data/canonical/meshes/` — must be distributed under the same license (CC BY-SA 2.1 JP) or a compatible later version. ADR 0002 records that the body project's own CC-BY-SA-4.0 declaration coexists with the upstream Japan-license obligations; jurisdictional version-compatibility (2.1 JP ↔ 4.0 international) is a pre-launch compliance review item.
- **No additional restrictions:** the project may not impose DRM, technical restrictions, or terms-of-service clauses that limit downstream re-use of these assets.

## Where this license is also recorded

| Location | Purpose |
|---|---|
| `data/raw/bodyparts3d/LICENSE` | Verbatim text alongside the raw download. |
| `data/raw/bodyparts3d/README.md` | Provenance of the raw download, with attribution string. |
| `ATTRIBUTIONS.md` (repo root) | Repository-level chain document. |
| Every canonical `.glb` in `data/canonical/meshes/` | `asset.copyright` field, per ADR 0006. |
| `build-manifest.json` | `attributions` array, per ADR 0006. |
| The deployed web app's "About this atlas" surface | User-facing attribution, per ADR 0006. |

## Sharp edges

1. **Two license claims on the upstream surface.** The canonical project portal at lifesciencedb.jp states CC BY-SA 2.1 JP. The LSDB Archive mirror at dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html displays a CC BY 4.0 summary. ADR 0005 follows the canonical lifesciencedb.jp version (CC BY-SA 2.1 JP). The discrepancy is in the asset-pipeline open-items log for compliance-review resolution.
2. **Japanese-language legal code.** The authoritative legal code is Japanese only. The English deed is a summary, not a substitute. Pre-launch compliance review should validate the project's read of the Japanese text or seek a translated interpretation.
3. **Version compatibility with CC BY-SA 4.0.** The body project's overall license stance is CC-BY-SA-4.0 (per ADR 0002). Whether CC-BY-SA-2.1-JP derivatives can be re-licensed to 4.0 international is jurisdiction-dependent and is a pre-launch legal review item, not an Asset Pipeline call.
