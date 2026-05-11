# Attributions

This project builds on freely-licensed anatomical datasets. Every derivative work in this repository that incorporates upstream geometry, ontology, or labels carries the upstream license obligations alongside this project's own license declarations. This file documents the chain.

## Upstream anatomical data

### BodyParts3D

- **Source.** BodyParts3D, The Database Center for Life Science (DBCLS), Japan.
- **License.** Creative Commons Attribution–ShareAlike 2.1 Japan (CC-BY-SA-2.1-JP).
- **Reference.** Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. "BodyParts3D: 3D structure database for anatomical concepts." *Nucleic Acids Research*, 2009.
- **Project URL.** https://lifesciencedb.jp/bp3d/ (subject to availability of the original portal).

### Z-Anatomy

- **Source.** Z-Anatomy, derived and curated from BodyParts3D and additional contributors.
- **License.** Inherits CC-BY-SA-2.1-JP from BodyParts3D where its meshes are derived; Z-Anatomy's own additions are released under the same share-alike terms.
- **Project URL.** https://www.z-anatomy.com/

### Other datasets (reserved)

The following datasets are listed here for future-reference and are not currently imported. If integrated in a future phase, full attribution and license terms will be added.

- **Open Anatomy Project (Brigham and Women's Hospital / SPL Harvard).** Segmented anatomical models. License typically Creative Commons (per dataset).
- **Visible Human Project (U.S. National Library of Medicine).** Cryosection imagery. Public domain via U.S. federal work, subject to NLM redistribution terms.
- **Terminologia Anatomica (TA2).** Anatomical nomenclature. Citation required.
- **Foundational Model of Anatomy (FMA).** Anatomical ontology. Licensing of FMA terms and structure: see the FMA project documentation.
- **UBERON.** Cross-species anatomical ontology. CC-BY.

## Anatomical nomenclature standards (referenced, not redistributed)

- **Terminologia Anatomica, Second Edition (TA2).** Federative International Programme on Anatomical Terminology (FIPAT).
- **Foundational Model of Anatomy (FMA).** Structural Informatics Group, University of Washington.

Identifiers from these standards are referenced in this project's ontology. The standards themselves are not redistributed in whole.

## License chain summary

| Layer | Upstream license | This project's added layer |
|-------|------------------|---------------------------|
| Mesh geometry derived from BodyParts3D / Z-Anatomy | CC-BY-SA-2.1-JP | CC-BY-SA-4.0 alongside upstream |
| Ontology + labels referencing FMA / TA2 identifiers | per source | CC-BY-SA-4.0 |
| New content (descriptions, quizzes, learning paths) authored for this project | n/a | CC-BY-SA-4.0 |
| Source code | n/a | AGPL-3.0-or-later |
| Project documentation | n/a | CC-BY-4.0 |

## Software dependencies

Open-source library acknowledgements (Three.js, react-three-fiber, React, Vite, etc.) are tracked in the respective `package.json` files and surfaced via the application's About panel when shipped.

## Required attribution form

If you redistribute or modify content derived from this project:

1. Preserve the upstream attribution to BodyParts3D and Z-Anatomy.
2. Preserve this project's attribution and license declarations.
3. Distribute derivative content under CC-BY-SA-4.0 (or upstream-compatible).
4. Distribute derivative code under AGPL-3.0-or-later.
5. Document any further changes in your own ATTRIBUTIONS file.

See [LICENSE](LICENSE), [LICENSE-CONTENT](LICENSE-CONTENT), and [LICENSE-DOCS](LICENSE-DOCS) for the full license texts.
