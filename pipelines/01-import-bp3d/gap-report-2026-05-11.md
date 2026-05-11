# BodyParts3D import gap report — 2026-05-11

Pipeline step: P1.04 (Asset Pipeline, invocation #2).
Source: `data/raw/bodyparts3d/isa_BP3D_4.0_obj_99.zip` via FMA→FJ pivot in `isa_element_parts.txt`.

## Headline

- **79 canonical glb files written** to `data/canonical/meshes/<id>/lod0.glb`.
- **29 gaps** — structures in the 108-node skeletal ontology whose FMA alias does not appear in BodyParts3D's element-parts table.
- **0 conversion failures** (OBJ extracted but glb pipeline errored).

## Gaps (FMA not in BP3D)

These structures exist in the UBERON skeletal ontology but BodyParts3D does not ship a separate mesh for them. Most are sub-structures of a larger bone that BP3D models as a whole (e.g. femur head/neck/shaft are parts of the femur mesh, not separate OBJs).

| UBERON id | Label | FMA alias | Note |
|---|---|---|---|
| UBERON:0001350 | coccyx | FMA:20229 | FMA not in isa_element_parts.txt |
| UBERON:0000975 | sternum | FMA:7485 | FMA not in isa_element_parts.txt |
| UBERON:0006657 | glenoid cavity of scapula | FMA:23275 | FMA not in isa_element_parts.txt |
| UBERON:0002497 | acromion of scapula | FMA:23260 | FMA not in isa_element_parts.txt |
| UBERON:0006633 | coracoid process of scapula | FMA:13455 | FMA not in isa_element_parts.txt |
| UBERON:0004651 | spine of scapula | FMA:13453 | FMA not in isa_element_parts.txt |
| UBERON:0006801 | head of humerus | FMA:13304 | FMA not in isa_element_parts.txt |
| UBERON:4200172 | neck of humerus | FMA:23356 | FMA not in isa_element_parts.txt |
| UBERON:0004652 | shaft of humerus | FMA:13305 | FMA not in isa_element_parts.txt |
| UBERON:0000144 | trochlea of humerus | FMA:23370 | FMA not in isa_element_parts.txt |
| UBERON:0010853 | capitulum of humerus | FMA:23373 | FMA not in isa_element_parts.txt |
| UBERON:0006806 | medial epicondyle of humerus | FMA:23441 | FMA not in isa_element_parts.txt |
| UBERON:0006807 | lateral epicondyle of humerus | FMA:23442 | FMA not in isa_element_parts.txt |
| UBERON:0002234 | proximal phalanx of manus | FMA:75816 | FMA not in isa_element_parts.txt |
| UBERON:0003864 | middle phalanx of manus | FMA:75817 | FMA not in isa_element_parts.txt |
| UBERON:0003865 | distal phalanx of manus | FMA:75818 | FMA not in isa_element_parts.txt |
| UBERON:0001273 | ilium | FMA:16589 | FMA not in isa_element_parts.txt |
| UBERON:0001274 | ischium | FMA:16592 | FMA not in isa_element_parts.txt |
| UBERON:0001275 | pubis | FMA:16595 | FMA not in isa_element_parts.txt |
| UBERON:0006767 | head of femur | FMA:32851 | FMA not in isa_element_parts.txt |
| UBERON:0007119 | neck of femur | FMA:42385 | FMA not in isa_element_parts.txt |
| UBERON:0006862 | shaft of femur | FMA:32847 | FMA not in isa_element_parts.txt |
| UBERON:0002503 | greater trochanter of femur | FMA:32852 | FMA not in isa_element_parts.txt |
| UBERON:0002504 | lesser trochanter of femur | FMA:32853 | FMA not in isa_element_parts.txt |
| UBERON:0009984 | medial condyle of femur | FMA:32858 | FMA not in isa_element_parts.txt |
| UBERON:0009985 | lateral condyle of femur | FMA:32859 | FMA not in isa_element_parts.txt |
| UBERON:0003868 | proximal phalanx of pes | FMA:75828 | FMA not in isa_element_parts.txt |
| UBERON:0003866 | middle phalanx of pes | FMA:75829 | FMA not in isa_element_parts.txt |
| UBERON:0003867 | distal phalanx of pes | FMA:75830 | FMA not in isa_element_parts.txt |

## Conversion failures

None.

## Notes for downstream agents

- The gap list is **expected behaviour**, not a pipeline error. BP3D's hierarchical model contains parent bones but not their named sub-features. Reconstructing these for the atlas needs either (a) procedural decomposition of the parent mesh in Blender (P1.05) or (b) hand-authoring.
- The femur seed (`UBERON:0000981`) gets a real BP3D-derived glb. The existing procedural `procedural/femur-proxy-threejs` record in `data/derived/mesh-registry.json` is untouched; P1.08 reconciles the two.
- The sternum (`UBERON:0000975`) is a gap, but its three components — manubrium, body of sternum, xiphoid — all convert successfully. The Anatomy Domain can either assemble a composite sternum at the registry level (P1.08) or leave it as a missing-mesh node until Phase 2.
- Paired bones (ribs, hip bone, all limb bones) appear in BP3D as separate left/right FJ files. This pipeline merges both sides into a single glb per UBERON concept, with vertex/normal/uv index rebasing across the two OBJ halves.
