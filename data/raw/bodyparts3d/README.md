# data/raw/bodyparts3d/ — BodyParts3D raw download

**Source:** BodyParts3D / Anatomography (DBCLS, Japan)
**Retrieved:** 2026-05-11 by Asset Pipeline agent (Phase 1 step P1.03)
**Status:** Raw / read-only (per Asset Pipeline hard rule 1)

## What this folder is

A verbatim copy of the BodyParts3D version 4.0 polygon dataset (99% reduction tier) plus its companion metadata tables. This is the upstream source for the Phase 1 mesh import pipeline (`pipelines/01-import-bp3d`). No file in this folder should ever be modified — the pipeline transforms raw → canonical and writes elsewhere (`data/canonical/meshes/<primary_id>/`).

Two parallel mesh archives are present because BodyParts3D ships two hierarchies of the same model — the IS-A hierarchy (classification, used as the primary source) and the PART-OF hierarchy (compositional). See "Archive structure" below.

## Source page

- Primary project portal: https://lifesciencedb.jp/bp3d/
- LSDB Archive (the actual file host): https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html
- Download index (file listing): https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Original publication: Mitsuhashi N. et al., "BodyParts3D: 3D structure database for anatomical concepts," *Nucleic Acids Research* 37 (Database issue): D782–D785 (2009). https://academic.oup.com/nar/article/37/suppl_1/D782/1000752

## Download URLs used (verbatim)

All retrieved 2026-05-11 from the `/LATEST/` path on `dbarchive.biosciencedbc.jp`. The `Last-Modified` header on every file is 2013-05-22 — BodyParts3D version 4.0 has not been updated since 2013 (consistent with ADR 0005's "BodyParts3D underlying data has not been updated since 2013").

| File | URL | Bytes | Format |
|---|---|---:|---|
| `isa_BP3D_4.0_obj_99.zip` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip | 142,903,898 | ZIP of OBJ meshes (IS-A hierarchy, 99% decimation) |
| `partof_BP3D_4.0_obj_99.zip` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip | 64,888,505 | ZIP of OBJ meshes (PART-OF hierarchy, 99% decimation) |
| `isa_parts_list_e.txt` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt | 128,086 | TSV: FMA concept id → BP representation id → English name (IS-A) |
| `partof_parts_list_e.txt` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_parts_list_e.txt | 59,351 | TSV: FMA concept id → BP representation id → English name (PART-OF) |
| `isa_inclusion_relation_list.txt` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_inclusion_relation_list.txt | 207,664 | TSV: IS-A inclusion relations between parts |
| `partof_inclusion_relation_list.txt` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_inclusion_relation_list.txt | 91,241 | TSV: PART-OF inclusion relations between parts |
| `isa_element_parts.txt` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt | 1,142,159 | TSV: FMA concept id → name → element file id (the FJ-prefixed `.obj` filename) for IS-A. **This is the mapping pipeline 01-import-bp3d uses to pivot from FMA → mesh file.** |
| `partof_element_parts.txt` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_element_parts.txt | 651,179 | TSV: same shape, PART-OF |
| `README_e.html` | https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html | 19,263 | Upstream README (snapshot 2013-05-22) |

**Total downloaded:** ~210 MB across 10 files. Both ZIPs pass `unzip -l` integrity check.

## Archive structure

After extraction (which is **not done here** — extraction is the responsibility of pipeline step P1.04 `01-import-bp3d`):

- `isa_BP3D_4.0_obj_99/` (when extracted) — **2,234 OBJ files**, ~479 MB uncompressed. Filenames are `FJ<digits>.obj` (e.g. `FJ1252.obj`, `FJ3659.obj`). The FJ-prefix is the BodyParts3D "element file id"; it maps to FMA concept IDs via `isa_element_parts.txt`.
- `partof_BP3D_4.0_obj_99/` (when extracted) — 1,258 OBJ files, ~217 MB uncompressed. Same `FJ<digits>.obj` naming. Some FJ ids appear in both hierarchies; the mesh data per FJ id is the same — only the higher-level grouping (the concept that *contains* that mesh) differs.

**Mesh-count match to expectation:** the isa archive's 2,234 OBJ count matches the order-of-magnitude expected mesh count for BodyParts3D in the project briefing.

**Pivot for the FMA crosswalk:** the IS-A hierarchy is the one Phase 1's ontology pivot (`docs/references/summaries/uberon-fma-skeletal-crosswalk.md`) needs. Pipeline 01-import-bp3d should treat `isa_element_parts.txt` as the source of truth for FMA → FJ-id → OBJ-file mapping. The PART-OF tables are kept because some Phase 2+ structures (compound organs, joints) will likely be assembled from PART-OF groupings rather than IS-A members.

## License

- **License:** Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP).
- **Verified:** at https://lifesciencedb.jp/bp3d/info/license/index.html on 2026-05-11.
- **Canonical license URL (deed):** https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
- **Legal code (Japanese, authoritative):** https://creativecommons.org/licenses/by-sa/2.1/jp/legalcode.ja
- **Local copy:** see `./LICENSE` in this folder, and `data/raw/LICENSES/bodyparts3d-license.md` for the per-source registry entry.

### Required attribution string (verbatim)

Every downstream artifact derived from these files must surface the following attribution per ADR 0006 (runtime attribution must travel with assets):

> BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan

This string MUST appear in:

- The `asset.copyright` field of every canonical `.glb` (pipeline `05-bake-registry` / `06-bake-attribution`).
- The "About this atlas" surface in the deployed web app.
- The `build-manifest.json` `attributions` array.
- This README.

### License-page version note (sharp edge)

The **canonical project portal** at `lifesciencedb.jp/bp3d/info/license/index.html` (verified 2026-05-11) states **CC BY-SA 2.1 Japan**, and this is the version ADR 0005 cites and the project treats as authoritative. The **mirror/archive page** at `dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html` (the LSDB Archive's own aggregate license summary) claims **CC BY 4.0** for the dbarchive surface. The project follows the canonical lifesciencedb.jp version per ADR 0005 — **CC BY-SA 2.1 Japan**. The discrepancy is flagged in `docs/agents/asset-pipeline.state.md` as an open item for compliance review pre-launch (it does not block Phase 1).

## Read-only contract

Per Asset Pipeline hard rule 1 (`docs/agents/asset-pipeline.md`):

> Raw data is read-only. Never modify files under `data/raw/`. Re-running the pipeline from raw must always produce the same canonical output (idempotency).

If a mesh in this folder is found to be defective and a cleanup is needed, the cleanup MUST happen in `pipelines/02-clean-meshes/` against the extracted copy — never as an in-place edit here.

## Companion files in this folder

- `README.md` — this file. **Tracked in git** (text, small).
- `LICENSE` — verbatim CC BY-SA 2.1 Japan deed + the BodyParts3D attribution. **Tracked in git**.
- `*.zip` — large mesh archives. **Gitignored** (re-downloadable from upstream URLs above).
- `*.txt`, `*.html` — small text/metadata. **Tracked in git** so the FMA↔mesh-id mapping is committed without requiring re-download.

The exact patterns are codified in the repo's top-level `.gitignore`.

## Re-download instructions

If this folder is missing or corrupted, the following Bash + curl sequence reproduces it exactly:

```bash
cd data/raw/bodyparts3d
for f in \
  isa_BP3D_4.0_obj_99.zip \
  partof_BP3D_4.0_obj_99.zip \
  isa_parts_list_e.txt \
  partof_parts_list_e.txt \
  isa_inclusion_relation_list.txt \
  partof_inclusion_relation_list.txt \
  isa_element_parts.txt \
  partof_element_parts.txt \
  README_e.html; do
  curl -L -o "$f" "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/$f"
done
```

Expected total: ~210 MB. Verify with `unzip -l isa_BP3D_4.0_obj_99.zip | tail -3` — should report `2234 files`.

## Handoff to next pipeline step

The next agent invocation (Asset Pipeline, P1.04) consumes:

- The two `.zip` archives (extracts them to a working directory, not back into `data/raw/`).
- `isa_element_parts.txt` (primary FMA → FJ-id → OBJ-file mapping).
- The IS-A hierarchy (Phase 1 default; PART-OF stays available for Phase 2+).

For Phase 1's skeletal-only scope (~100 structures), only a subset of the 2,234 OBJ files will be imported into the canonical store. The rest are retained in raw so subsequent phases can pick them up without re-downloading.
