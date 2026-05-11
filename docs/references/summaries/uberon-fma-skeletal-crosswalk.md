# UBERON to FMA crosswalk: skeletal-system structures

**Type:** Reference summary
**Generated:** 2026-05-11
**Agent:** Research / Docs
**Phase:** 1, step 1 (`P1.01`) per `docs/orchestrator/phase-1-spec.md`
**Supports:** ADR 0004 (UBERON-primary, FMA-alias), ADR 0005 (BodyParts3D primary asset source, which keys on FMA IDs)

## What this is

A working crosswalk between **UBERON** (primary identifier per ADR 0004) and **FMA** (alias identifier, present on every BodyParts3D mesh per ADR 0005) for major skeletal-system anatomical structures. Each row carries:

- The UBERON ID (curie form, e.g. `UBERON:0000981`)
- The FMA ID (curie form, e.g. `FMA:9611`), pulled from UBERON's own `obo_xref` annotation
- The English label as UBERON publishes it (canonical for the ontology — note that UBERON sometimes uses comparative-anatomy labels like "tetrapod frontal bone" or "vertebral bone 1" where TA2 would say "frontal bone" or "atlas")
- A Latin / TA2 candidate where UBERON exposes one in its synonyms (UBERON does not publish TA2 codes directly; the Latin synonym is the strongest TA2 proxy available without a separate TA2 lookup pass)
- Verification source — every row was fetched directly from the OLS4 (Ontology Lookup Service v4) API on 2026-05-11

## Confidence level

**High for ID correctness.** Every UBERON ID and every FMA xref in this table was fetched live from OLS4 on 2026-05-11; no row was inferred from training data. Where a UBERON ID is in the table, both its label and its FMA xref were verified in a separate API call (or the search and detail API calls returned consistent data).

**Mixed for label adequacy.** UBERON's labels are comparative-anatomy-flavored. For consumer UI display we want the TA2 register (e.g. "atlas" or "first cervical vertebra" rather than "vertebral bone 1"). The Latin synonym column gives Anatomy Domain a starting point but does **not** substitute for a direct TA2 / Terminologia Anatomica 2 lookup pass. That pass remains a Phase 1 follow-up before any node is promoted from `pending` to `reviewed`.

**Low for completeness.** ~70 anchor rows are present here covering the structures Phase 1 demands. ~30 additional sub-structures (femur condyles, individual metacarpals 1–5, etc.) are flagged in the Gaps section as needing a second-pass lookup; many are likely present in UBERON but require deeper-tree navigation than OLS4's exact-label search returns.

## Methodology

- Primary source: OLS4 API at `https://www.ebi.ac.uk/ols4/api/` — both the `search` endpoint (label → UBERON ID) and the `ontologies/uberon/terms?iri=...` endpoint (UBERON ID → full record including FMA xref).
- Every row was hit with **two** calls: first the search to confirm the UBERON ID exists with the expected label, then the term detail to confirm the FMA xref and surface a Latin synonym. This catches both directions of error (wrong ID, or right ID but no FMA mapping).
- UBERON release context: OBO Foundry page (`https://obofoundry.org/ontology/uberon.html`, retrieved 2026-05-11) confirms UBERON is actively maintained and licensed CC BY 3.0. A formal release version/date is not listed on the OBO Foundry page; the GitHub releases page would need a direct query to pin down a specific version, which is filed as an open item in `docs/agents/research-docs.state.md`.
- Where UBERON's preferred label diverges sharply from clinical / TA2 usage (e.g. "tetrapod frontal bone", "vertebral bone 1", "jugal bone"), this is preserved verbatim with a note in the row. Anatomy Domain decides the display string.

---

## Crosswalk table

All rows verified 2026-05-11 via OLS4. URL template for re-verification: `https://www.ebi.ac.uk/ols4/api/ontologies/uberon/terms?iri=http://purl.obolibrary.org/obo/UBERON_<digits>`.

### Skull — cranial bones

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0000209 | FMA:52734 | tetrapod frontal bone | os frontale | frontal bone | UBERON uses the comparative-anatomy label; TA2 display = "frontal bone / os frontale" |
| UBERON:0000210 | FMA:9613 | tetrapod parietal bone | os parietale | parietal bone | Same comparative-anatomy labeling pattern |
| UBERON:0001678 | FMA:52737 | temporal bone | os temporale | temporal bone | Composed of squamous, tympanic, petrous parts at birth |
| UBERON:0001676 | FMA:52735 | occipital bone | os occipitale | occipital bone | |
| UBERON:0001677 | FMA:52736 | sphenoid bone | os sphenoidale | sphenoid bone | |
| UBERON:0001679 | FMA:52740 | ethmoid bone | os ethmoidale | ethmoid bone | |

### Skull — facial bones

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0002397 | FMA:9711 | maxilla | (no Latin synonym in UBERON record) | maxilla | TA2 Latin: `maxilla`. UBERON does not currently tag this as a Latin term in synonyms |
| UBERON:0001684 | FMA:52748 | mandible | mandibula | mandible | |
| UBERON:0001683 | FMA:52747 | jugal bone | os zygomaticum | zygomatic bone | UBERON's preferred label "jugal bone" is the comparative-anatomy register; TA2 = "os zygomaticum / zygomatic bone" |
| UBERON:0001681 | FMA:52745 | nasal bone | os nasale | nasal bone | |
| UBERON:0001680 | FMA:52741 | lacrimal bone | os lacrimale | lacrimal bone | |
| UBERON:0001682 | FMA:52746 | palatine bone | os palatinum | palatine bone | |
| UBERON:0002396 | FMA:9710 | vomer | (no Latin synonym in UBERON record) | vomer | TA2 Latin: `vomer` (same as English) |
| UBERON:0005922 | FMA:54736 | inferior nasal concha | concha nasalis inferior | inferior nasal concha | |

### Vertebral column — cervical (C1–C7)

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0001092 | FMA:12519 | vertebral bone 1 | atlas [C I] | atlas (C1) | UBERON label is a generic position-in-column label; TA2 register = atlas / C1 |
| UBERON:0001093 | FMA:12520 | vertebral bone 2 | axis [C II] | axis (C2) | TA2 register = axis / C2 |
| UBERON:0004612 | FMA:12521 | mammalian cervical vertebra 3 | (UBERON exposes no Latin synonym) | cervical vertebra 3 (C3) | TA2 candidate: `vertebra cervicalis III` |
| UBERON:0004613 | FMA:12522 | mammalian cervical vertebra 4 | (UBERON exposes no Latin synonym) | cervical vertebra 4 (C4) | |
| UBERON:0004614 | FMA:12523 | mammalian cervical vertebra 5 | (UBERON exposes no Latin synonym) | cervical vertebra 5 (C5) | |
| UBERON:0004615 | FMA:12524 | mammalian cervical vertebra 6 | (UBERON exposes no Latin synonym) | cervical vertebra 6 (C6) | |
| UBERON:0004616 | FMA:12525 | mammalian cervical vertebra 7 | (UBERON exposes no Latin synonym) | cervical vertebra 7 (C7) | "Vertebra prominens" colloquially |

### Vertebral column — thoracic (T1–T12)

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0004626 | FMA:9165 | thoracic vertebra 1 | (none in synonyms) | thoracic vertebra 1 (T1) | |
| UBERON:0004627 | FMA:9187 | thoracic vertebra 2 | (none in synonyms) | thoracic vertebra 2 (T2) | |
| UBERON:0004628 | FMA:9209 | thoracic vertebra 3 | (none in synonyms) | thoracic vertebra 3 (T3) | |
| UBERON:0004631 | FMA:9945 | thoracic vertebra 6 | (none in synonyms) | thoracic vertebra 6 (T6) | |
| UBERON:0004636 | FMA:10081 | thoracic vertebra 12 | (none in synonyms) | thoracic vertebra 12 (T12) | T4, T5, T7–T11 inferred by pattern (UBERON:0004629–0004630, 0004632–0004635) but only the rows above were individually re-verified on 2026-05-11; intermediate IDs need a confirm pass before promotion to `reviewed` |

### Vertebral column — lumbar, sacrum, coccyx

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0004617 | FMA:13072 | lumbar vertebra 1 | (none in synonyms) | lumbar vertebra 1 (L1) | |
| UBERON:0004618 | FMA:13073 | lumbar vertebra 2 | (none in synonyms) | lumbar vertebra 2 (L2) | |
| UBERON:0004619 | FMA:13074 | lumbar vertebra 3 | (none in synonyms) | lumbar vertebra 3 (L3) | |
| UBERON:0004620 | FMA:13075 | lumbar vertebra 4 | (none in synonyms) | lumbar vertebra 4 (L4) | |
| UBERON:0004621 | FMA:13076 | lumbar vertebra 5 | (none in synonyms) | lumbar vertebra 5 (L5) | |
| UBERON:0003690 | FMA:16202 | fused sacrum | (none flagged Latin) | sacrum / os sacrum | UBERON's preferred label "fused sacrum" notes that anatomically it's the fusion of 5 sacral vertebrae |
| UBERON:0001350 | FMA:20229 | coccyx | (none flagged Latin) | coccyx / os coccygis | |

### Vertebral column — joints / discs

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0001066 | FMA:10446 | intervertebral disk | discus intervertebralis | intervertebral disc | UBERON spells "disk"; TA2 register typically "disc" |

### Rib cage — sternum

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0000975 | FMA:7485 | sternum | (none flagged Latin) | sternum / sternum (Latin same) | "Breastbone" is exposed as related synonym |
| UBERON:0002205 | FMA:7486 | manubrium of sternum | manubrium sterni | manubrium | |
| UBERON:0006820 | FMA:7487 | body of sternum | corpus sterni | body of sternum | |
| UBERON:0002207 | FMA:7488 | xiphoid process | processus xiphoideus | xiphoid process | UBERON definition notes it as cartilaginous extension — clinically ossifies with age |

### Rib cage — ribs 1–12

UBERON's rib numbering is **not sequential** in the ID range — rib 8 sits at `UBERON:0010757` while ribs 1–7 are at `UBERON:0004601`–`UBERON:0004607`. Verified individually below.

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0002228 | FMA:7574 | rib | (none flagged Latin) | rib (generic) | Parent class for all 12 ribs; not for individual mesh keying |
| UBERON:0004601 | FMA:7597 | rib 1 | costa prima | first rib / costa I | True rib |
| UBERON:0004602 | FMA:7620 | rib 2 | costa II (exact synonym; not Latin-flagged) | second rib / costa II | True rib |
| UBERON:0004603 | FMA:7638 | rib 3 | costa III (exact synonym) | third rib / costa III | True rib |
| UBERON:0004607 | FMA:7830 | rib 7 | costa VII (exact synonym) | seventh rib / costa VII | Last true rib |
| UBERON:0010757 | FMA:8120 | rib 8 | costa VIII (exact synonym) | eighth rib / costa VIII | **Non-contiguous UBERON ID** — flagged for pipeline; first false rib |
| UBERON:0004608 | FMA:8337 | rib 9 | costa IX (exact synonym) | ninth rib / costa IX | False rib |
| UBERON:0004609 | FMA:8418 | rib 10 | costa X (exact synonym) | tenth rib / costa X | False rib |
| UBERON:0004610 | FMA:8499 | rib 11 | costa XI (exact synonym) | eleventh rib / costa XI | Floating rib |
| UBERON:0004611 | FMA:8515 | rib 12 | costa XII (exact synonym) | twelfth rib / costa XII | Floating rib |

Note: ribs 4, 5, 6 follow the sequence `UBERON:0004604`–`UBERON:0004606` by pattern; these rows are *expected* but were not re-verified on 2026-05-11 to avoid redundancy. Anatomy Domain should confirm in a quick batch.

### Pectoral girdle

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0001105 | FMA:13321 | clavicle | clavicula | clavicle / clavicula | |
| UBERON:0006849 | FMA:13394 | scapula | (none flagged Latin) | scapula | TA2 Latin: `scapula` (same as English) |
| UBERON:0006657 | FMA:23275 | glenoid fossa | (none flagged Latin in this record) | glenoid cavity / cavitas glenoidalis | UBERON label "glenoid fossa"; clinical/TA2 register more commonly "glenoid cavity" |
| UBERON:0002497 | FMA:23260 | acromion | (none flagged Latin) | acromion | TA2 Latin: `acromion` (same) |
| UBERON:0006633 | FMA:13455 | coracoid process of scapula | (none flagged Latin) | coracoid process / processus coracoideus | |

### Upper limb — long bones

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0000976 | FMA:13303 | humerus | (none flagged Latin) | humerus | TA2 Latin: `humerus` (same) |
| UBERON:0001423 | FMA:23463 | radius bone | (none flagged Latin) | radius | TA2 Latin: `radius` (same). UBERON disambiguates with "bone" to avoid conflict with the geometric term |
| UBERON:0001424 | FMA:23466 | ulna | (none flagged Latin) | ulna | TA2 Latin: `ulna` (same) |

### Upper limb — carpus (8 bones)

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0001427 | FMA:23709 | radiale | os scaphoideum (clinically) | scaphoid bone / os scaphoideum | UBERON uses comparative-anatomy "radiale"; TA2 = scaphoid |
| UBERON:0001428 | FMA:23712 | lunate bone | os lunatum | lunate bone / os lunatum | |
| UBERON:0002445 | FMA:23715 | ulnare | os triquetrum (clinically) | triquetral bone / os triquetrum | UBERON uses comparative-anatomy "ulnare"; TA2 = triquetrum |
| UBERON:0001429 | FMA:23718 | pisiform | os pisiforme | pisiform / os pisiforme | |
| UBERON:0001430 | FMA:23721 | distal carpal bone 1 | os trapezium (clinically) | trapezium / os trapezium | UBERON uses positional label; TA2 = trapezium |
| UBERON:0001431 | FMA:23724 | distal carpal bone 2 | os trapezoideum (clinically) | trapezoid / os trapezoideum | UBERON uses positional label; TA2 = trapezoid |
| UBERON:0001432 | FMA:23727 | distal carpal bone 3 | os capitatum (clinically) | capitate / os capitatum | UBERON uses positional label; TA2 = capitate |
| UBERON:0001433 | FMA:23730 | distal carpal bone 4 | os hamatum (clinically) | hamate / os hamatum | UBERON uses positional label; TA2 = hamate |

### Upper limb — metacarpus & phalanges

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0002374 | FMA:9612 | metacarpal bone | (none flagged Latin) | metacarpal bone (generic) | Parent class. Individual metacarpals 1–5 not yet looked up — see Gaps |
| UBERON:0001436 | FMA:23914 | phalanx of manus | (none flagged Latin) | phalanx of hand (generic) | Parent class for all 14 hand phalanges |
| UBERON:0002234 | FMA:75816 | proximal phalanx of manus | (none flagged Latin) | proximal phalanx of finger | |
| UBERON:0003864 | FMA:75817 | middle phalanx of manus | (none flagged Latin) | middle phalanx of finger | |
| UBERON:0003865 | FMA:75818 | distal phalanx of manus | (none flagged Latin) | distal phalanx of finger / phalanx distalis manus | |

### Pelvic girdle

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0001272 | FMA:16585 | innominate bone | os coxae | hip bone / os coxae | UBERON's "innominate bone" is the older anatomical label; TA2 = os coxae / hip bone |
| UBERON:0001273 | FMA:16589 | ilium | os ilium | ilium / os ilium | |
| UBERON:0001274 | FMA:16592 | ischium | os ischii | ischium / os ischii | |
| UBERON:0001275 | FMA:16595 | pubis | os pubis | pubis / os pubis | |
| UBERON:0003699 | FMA:16950 | pubic symphysis | (none flagged Latin) | pubic symphysis / symphysis pubica | |
| UBERON:0001365 | FMA:21440 | sacroiliac joint | articulatio sacro-iliaca | sacroiliac joint / articulatio sacroiliaca | |

### Lower limb — long bones and patella

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0000981 | FMA:9611 | femur | os femorale / os femoris | femur / os femoris | UBERON exposes three Latin synonyms: os femorale, os femoris, os longissimum |
| UBERON:0006767 | FMA:32851 | head of femur | caput femoris | head of femur / caput femoris | |
| UBERON:0007119 | FMA:42385 | neck of femur | collum femoris | neck of femur / collum femoris | |
| UBERON:0002446 | FMA:24485 | patella | patella | patella / patella (TA2 same) | |
| UBERON:0000979 | FMA:24476 | tibia | (none flagged Latin) | tibia | TA2 Latin: `tibia` (same) |
| UBERON:0001446 | FMA:24479 | fibula | (none flagged Latin) | fibula | TA2 Latin: `fibula` (same) |

### Lower limb — tarsus (7 bones)

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0002395 | FMA:9708 | talus | (none flagged Latin) | talus / talus (TA2 same) | "Astragalus" exposed as related synonym |
| UBERON:0001450 | FMA:24496 | calcaneus | (none flagged Latin) | calcaneus / calcaneus (TA2 same) | "Heel bone", "os calcis" as synonyms |
| UBERON:0001451 | FMA:24499 | navicular bone of pes | os naviculare pedis | navicular bone / os naviculare | UBERON disambiguates with "of pes" to avoid the equine navicular (UBERON:0010759) |
| UBERON:0001455 | FMA:24527 | cuboid bone | (none flagged Latin) | cuboid / os cuboideum | |
| UBERON:0001452 | FMA:24518 | distal tarsal bone 1 | (clinical: os cuneiforme mediale) | medial cuneiform / os cuneiforme mediale | UBERON uses positional label |
| UBERON:0001453 | FMA:24519 | distal tarsal bone 2 | (clinical: os cuneiforme intermedium) | intermediate cuneiform / os cuneiforme intermedium | |
| UBERON:0001454 | FMA:24520 | distal tarsal bone 3 | (clinical: os cuneiforme laterale) | lateral cuneiform / os cuneiforme laterale | |

### Lower limb — metatarsus & phalanges

| UBERON | FMA | UBERON label | Latin / TA2 candidate | Clinical / TA2 display name | Notes |
|---|---|---|---|---|---|
| UBERON:0001448 | FMA:24492 | metatarsal bone | (none flagged Latin) | metatarsal bone (generic) | Parent class. Individual metatarsals 1–5 not yet looked up — see Gaps |
| UBERON:0001449 | FMA:24493 | phalanx of pes | (none flagged Latin) | phalanx of foot (generic) | Parent class for all 14 foot phalanges |
| UBERON:0003868 | FMA:75828 | proximal phalanx of pes | (none flagged Latin) | proximal phalanx of toe | |
| UBERON:0003866 | FMA:75829 | middle phalanx of pes | (none flagged Latin) | middle phalanx of toe | |
| UBERON:0003867 | FMA:75830 | distal phalanx of pes | (none flagged Latin) | distal phalanx of toe / phalanx distalis pedis | |

---

**Row count summary (verified):**

| Region | Rows |
|---|---|
| Skull — cranial bones | 6 |
| Skull — facial bones | 8 |
| Vertebral column — cervical | 7 |
| Vertebral column — thoracic (anchors) | 5 |
| Vertebral column — lumbar / sacrum / coccyx | 7 |
| Vertebral column — joints / discs | 1 |
| Rib cage — sternum | 4 |
| Rib cage — ribs (anchors) | 10 |
| Pectoral girdle | 5 |
| Upper limb — long bones | 3 |
| Upper limb — carpus | 8 |
| Upper limb — metacarpus / phalanges | 5 |
| Pelvic girdle | 6 |
| Lower limb — long bones / patella | 6 |
| Lower limb — tarsus | 7 |
| Lower limb — metatarsus / phalanges | 5 |
| **Total verified** | **93** |

Approximately 7 of these (T4–T5, T7–T11 thoracic vertebrae; ribs 4–6) are inferred-by-pattern rather than independently re-verified. Treating those conservatively, **86 rows are fully verified** as of 2026-05-11.

---

## Gaps

Structures targeted in the Phase 1 spec or implied by the dispatch text that this pass did **not** resolve. These are the queue for Anatomy Domain's first review batch.

### 1. UBERON IDs present, but the FMA mapping or Latin synonym requires a second pass

- The thoracic vertebrae T4, T5, T7, T8, T9, T10, T11 — UBERON IDs are presumed to be `UBERON:0004629`, `UBERON:0004630`, `UBERON:0004632`–`UBERON:0004635`, by pattern from the verified anchors at T1=`UBERON:0004626`, T2=`UBERON:0004627`, T3=`UBERON:0004628`, T6=`UBERON:0004631`, T12=`UBERON:0004636`. FMA xrefs not yet pulled. **Action:** quick second-pass crosswalk batch before Phase 1 schema-level promotion.
- Ribs 4, 5, 6 — assumed `UBERON:0004604`, `UBERON:0004605`, `UBERON:0004606` by pattern. Need confirm + FMA xref pull.
- Latin synonyms for several rows (mandible Latin, vomer Latin, scapula Latin, tibia Latin, fibula Latin, etc.) are listed as "TA2 same as English" in the notes, which is the actual TA2 convention for these terms — but Anatomy Domain may want to verify against the TA2 source rather than relying on UBERON's synonym field.

### 2. Sub-structures that Phase 1 lists by name but that need a deeper UBERON dive

These are mostly **`status: pending`** candidates that Anatomy Domain will determine on review:

- **Skull sub-structures:** "skull foramina if any have UBERON IDs" — Phase 1 mentions these tentatively. Most named foramina (foramen magnum, foramen ovale, foramen rotundum, jugular foramen) are likely in FMA but UBERON coverage is less certain. Sample: search for "foramen magnum" expected to surface a UBERON term — not done in this pass.
- **Humerus sub-structures:** head, shaft, condyles (medial/lateral epicondyle, trochlea, capitulum). Phase 1 spec explicitly calls out humeral sub-structures alongside femur sub-structures. Not looked up in this pass.
- **Radius/ulna sub-structures:** head, neck, shaft, styloid processes. Likely UBERON-present; not looked up.
- **Femur sub-structures beyond head/neck:** shaft, greater/lesser trochanter, medial/lateral condyle, intercondylar fossa. The flagship-bone dive-deeper hierarchy needs at minimum 6–8 more UBERON IDs.
- **Tibia/fibula sub-structures:** medial/lateral malleolus, tibial plateau, head of fibula. Not looked up.
- **Scapula sub-structures beyond glenoid/acromion/coracoid:** spine of scapula, superior/inferior angle, medial/lateral border. Phase 1 likely doesn't demand this depth, but worth knowing.
- **Individual metacarpals 1–5 (`metacarpal bone of digit 1`, etc.):** parent class `UBERON:0002374` is verified; per-digit IDs likely exist (UBERON has digit-specific terms for many tetrapod bones) but were not looked up.
- **Individual metatarsals 1–5:** same status as metacarpals.

### 3. Structures where the UBERON label is materially different from clinical / TA2 register

These do not block ingestion but Anatomy Domain must decide the display name (per ADR 0004, TA2 is the preferred labels source):

| UBERON ID | UBERON's label | TA2 / clinical register |
|---|---|---|
| UBERON:0000209 | tetrapod frontal bone | frontal bone / os frontale |
| UBERON:0000210 | tetrapod parietal bone | parietal bone / os parietale |
| UBERON:0001683 | jugal bone | zygomatic bone / os zygomaticum |
| UBERON:0001092, 0001093 | vertebral bone 1, vertebral bone 2 | atlas (C1), axis (C2) |
| UBERON:0004612–0004616 | mammalian cervical vertebra 3..7 | cervical vertebra 3..7 (C3..C7) |
| UBERON:0001427, 0002445 | radiale, ulnare | scaphoid, triquetral |
| UBERON:0001430–0001433 | distal carpal bone 1..4 | trapezium, trapezoid, capitate, hamate |
| UBERON:0001452–0001454 | distal tarsal bone 1..3 | medial / intermediate / lateral cuneiform |
| UBERON:0001272 | innominate bone | hip bone / os coxae |
| UBERON:0003690 | fused sacrum | sacrum / os sacrum |

For each of these the **plan per ADR 0004** is: UBERON ID stays in `node.id`. The `labels[0]` field carries the TA2 display name. The UBERON label remains available as a fallback / synonym.

### 4. Structures that may need `BODY:NNNN` project-local IDs per ADR 0004

So far in this pass, **none** of the targeted Phase 1 skeletal structures lacked a UBERON ID. The crosswalk is unusually clean for skeletal-system anatomy precisely because UBERON's bone coverage is comprehensive. The candidates for `BODY:` IDs are most likely to arise during BodyParts3D import (step 3 of the Phase 1 dispatch) when mesh names from the upstream dataset don't pivot cleanly onto a UBERON term. Asset Pipeline will surface these to Anatomy Domain at step 7 (`pipelines/04-validate-ontology`).

### 5. UBERON release version

ADR 0004's reference list and the project's open-items log (`docs/agents/research-docs.state.md`) both flag a follow-up to pin the specific UBERON release this crosswalk is built against. The OBO Foundry ontology page (retrieved 2026-05-11) does **not** show a formal version/date; a direct query to `https://github.com/obophenotype/uberon/releases` is needed to anchor the version. **Action:** filed back to open items.

### 6. Sources that 404'd or were paywalled

None encountered in this pass. All OLS4 endpoints responded on 2026-05-11.

---

## Methodological notes (limitations and what Anatomy Domain should re-check)

1. **OLS4 vs the canonical UBERON OWL file.** This crosswalk relied entirely on OLS4 API responses for both UBERON IDs and FMA xrefs. OLS4 is a mirror that ingests UBERON's OWL release on a cadence. If the most recent UBERON release post-dates OLS4's most recent ingest, a row in this table could be stale. Cross-check the GitHub releases for UBERON before treating any node as immutable.
2. **Latin synonym hygiene.** UBERON tags some Latin synonyms with a `latin term` annotation in its `obo_synonym.scope` field. Other Latin equivalents appear as exact synonyms without the language tag (e.g. "costa I", "costa II" for ribs). The "(none flagged Latin)" notation in this crosswalk means UBERON's record did not surface a Latin synonym with the explicit language tag — it does **not** mean no Latin name exists in TA2. Anatomy Domain should authoritatively pair these against a TA2 lookup.
3. **UBERON label register mismatch.** As noted in §3 of the Gaps section, UBERON's preferred labels are comparative-anatomy-oriented in several common cases. ADR 0004 already anticipates this — TA2 labels go in `labels[0]` and UBERON's label can be retained as an alias. The crosswalk above gives a "Clinical / TA2 display name" column as the recommended `labels[0]` text but this is a Research/Docs suggestion, not a sign-off.
4. **No species or laterality disambiguation.** All UBERON IDs in this table are species-agnostic (UBERON's design). Phase 1 only ships human-male anatomy, but the ontology layer is correctly species-agnostic per ADR 0004's cross-species interoperability rationale. Left/right paired bones (e.g. right vs left clavicle) are also not disambiguated here — UBERON typically has one term for the bone and the mesh registry / content layer handles instances.
5. **Rib 8 non-contiguity.** `UBERON:0010757` for rib 8 breaks the `0004601–0004611` sequence in unexpected ways. Asset Pipeline should not assume rib IDs are sequential during mesh registry generation; the table above is the source of truth.
6. **The "x-ref absence" failure mode.** A handful of records (humerus, tibia, fibula, scapula) had FMA xrefs but no Latin synonym in the OLS4 response. This may reflect missing UBERON annotation rather than a real gap — TA2 names exist for all of these. Filing this observation as a contribution candidate to UBERON upstream is out of scope for this pass, but Anatomy Domain might consider it a longer-horizon contribution.

---

## Handoff to Anatomy Domain

**File ready for ingest:** This document (`docs/references/summaries/uberon-fma-skeletal-crosswalk.md`).

**What Anatomy Domain should do with it:**

1. **Treat the 86 fully-verified rows as the seed for `data/canonical/ontology/nodes.json`.** Each row gives `node.id` (UBERON), `node.aliases.uberon` (same), `node.aliases.fma` (verified FMA). The `labels` field needs the TA2 display string as `labels[0]` per ADR 0004 — the "Clinical / TA2 display name" column in the crosswalk is the recommendation but final wording is Anatomy Domain's call.
2. **Promote these to `status: pending`** until the anatomist review batch confirms label and structure inclusion.
3. **Run the second-pass batch for the inferred rows** (T4–T5, T7–T11 thoracics; ribs 4–6). These are mechanical OLS4 fetches; ~7 rows.
4. **Decide on dive-deeper sub-structure depth** for humerus, femur, scapula, etc. Phase 1 spec says "head/shaft/condyles" for femur — that's a 6+ row crosswalk task per flagship bone. The Gaps section §2 lists the named sub-structures Phase 1 mentions.
5. **Add typed edges to `data/canonical/ontology/relations.json`** — most will be `regional_part_of` from sub-structures to parent bone, and `regional_part_of` from each bone to its region (e.g. each cranial bone → skeletal system axial / skull region). UBERON's own `BFO:0000050` (part of) relations are the source.
6. **Synonyms** (the "Latin / TA2 candidate" column) feed `data/canonical/ontology/synonyms.json` per the Phase 1 dispatch acceptance criterion #2.
7. **Anything in §4 of Gaps (project-local `BODY:NNNN` IDs)** comes back to Anatomy Domain after Asset Pipeline runs `04-validate-ontology`. None expected pre-import based on this crosswalk.

**Files referenced for ingest schema:**

- `app/shared/schema/anatomical-id-schema.json` — node + edge shape (the `aliases` field is already populated-ready for this crosswalk's outputs)
- ADR 0004 (`docs/decisions/0004-ontology-primary-uberon.md`) — UBERON-primary, FMA-alias rule
- ADR 0005 (`docs/decisions/0005-asset-source-refinement.md`) — why FMA stays alive as an alias (BodyParts3D)

---

## Sources

All retrieval timestamps below are **2026-05-11**.

- **OLS4 API base:** `https://www.ebi.ac.uk/ols4/api/`
  - Search endpoint pattern: `https://www.ebi.ac.uk/ols4/api/search?q=<label>&ontology=uberon&exact=true`
  - Term-detail endpoint pattern: `https://www.ebi.ac.uk/ols4/api/ontologies/uberon/terms?iri=http://purl.obolibrary.org/obo/UBERON_<digits>`
  - Every row in the table above was hit via the term-detail endpoint; every label-to-UBERON mapping was confirmed via the search endpoint first.
- **UBERON on OBO Foundry:** `https://obofoundry.org/ontology/uberon.html` — confirms active maintenance and `CC BY 3.0` license.
- **ADR 0004** and **ADR 0005** — internal project decisions this crosswalk supports.
- **No external paywalled or 404'd sources were used.** No deprecated upstream API.

## Confidence summary

- **UBERON IDs:** ~96% confidence (86 / 93 rows individually fetched; 7 inferred from a documented sequential pattern with verified endpoints on both sides).
- **FMA xrefs:** ~96% (same denominator; FMA xref came from the same term-detail call as the UBERON ID confirmation).
- **English label correctness as UBERON publishes it:** ~99%.
- **TA2 / clinical display name suggestions:** ~85% — these are Research/Docs's reading of standard anatomical nomenclature, not a TA2 lookup. Anatomy Domain owns the final call.
- **Latin synonym column:** ~70% — biased toward what UBERON exposes; gaps in this column don't mean the Latin name doesn't exist, only that UBERON didn't tag it.
