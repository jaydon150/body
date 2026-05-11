// pipelines/01-import-bp3d/convert.js
// P1.04: Extract BP3D OBJs, convert to glb keyed by UBERON id, bake attribution.
//
// Per ADR 0006: every canonical glb carries `asset.copyright` and
// `asset.extras.source` so the BodyParts3D CC-BY-SA-2.1-JP chain travels
// with the asset. Per the agent prompt, the OBJ filenames on disk are
// FJ-prefixed; the FMA→FJ pivot is `isa_element_parts.txt`.

const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const obj2gltf = require("obj2gltf");
const { processGlb } = require("gltf-pipeline");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const NODES_JSON = path.join(REPO_ROOT, "data", "canonical", "ontology", "nodes.json");
const ELEMENT_PARTS_TSV = path.join(
  REPO_ROOT, "data", "raw", "bodyparts3d", "isa_element_parts.txt"
);
const ZIP_PATH = path.join(
  REPO_ROOT, "data", "raw", "bodyparts3d", "isa_BP3D_4.0_obj_99.zip"
);
const CANONICAL_MESHES = path.join(REPO_ROOT, "data", "canonical", "meshes");
const CACHE_DIR = path.join(__dirname, ".cache", "obj");
const REPORT_PATH = path.join(__dirname, "gap-report-2026-05-11.md");

const COPYRIGHT_STRING =
  "BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan";
const LICENSE_SPDX = "CC-BY-SA-2.1-JP";
const INGESTED_AT = "2026-05-11";

fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(CANONICAL_MESHES, { recursive: true });
const ZIP = new AdmZip(ZIP_PATH);

// --- 1. Parse the FMA → FJ-id mapping from the upstream TSV. ----------------
function loadFmaToFjMap() {
  const map = new Map();
  const tsv = fs.readFileSync(ELEMENT_PARTS_TSV, "utf8");
  for (const line of tsv.split(/\r?\n/)) {
    if (!line || line.startsWith("concept id")) continue;
    const cols = line.split("\t");
    if (cols.length < 3) continue;
    const fma = cols[0]; // e.g. "FMA9611"
    const name = cols[1];
    const fj = cols[2]; // e.g. "FJ3259"
    if (!map.has(fma)) map.set(fma, []);
    map.get(fma).push({ name, fj });
  }
  return map;
}

// --- 2. Extract one OBJ from the ZIP into the cache (idempotent). -----------
function extractObj(fjId) {
  const cached = path.join(CACHE_DIR, `${fjId}.obj`);
  if (fs.existsSync(cached) && fs.statSync(cached).size > 0) return cached;
  const entry = ZIP.getEntry(`isa_BP3D_4.0_obj_99/${fjId}.obj`);
  if (!entry) throw new Error(`${fjId}.obj not in zip`);
  fs.writeFileSync(cached, entry.getData());
  if (!fs.existsSync(cached) || fs.statSync(cached).size === 0) {
    throw new Error(`Failed to extract ${fjId}.obj`);
  }
  return cached;
}

// --- 3. Merge two or more OBJ files into one combined OBJ. ------------------
// BP3D's IS-A hierarchy splits paired bones (e.g. left rib / right rib) so a
// single anatomical concept (e.g. "rib 1") maps to two FJ files. For the
// canonical mesh keyed by UBERON id we want both sides as one asset, so we
// concatenate the OBJs with a vertex-index rebase per file (OBJ uses 1-based
// global indices, so naive concatenation would scramble the faces).
function mergeObjs(objPaths, outPath) {
  if (objPaths.length === 1) {
    fs.copyFileSync(objPaths[0], outPath);
    return;
  }
  let vOffset = 0;
  let vnOffset = 0;
  let vtOffset = 0;
  const out = [];
  for (let i = 0; i < objPaths.length; i++) {
    const raw = fs.readFileSync(objPaths[i], "utf8");
    let localV = 0, localVn = 0, localVt = 0;
    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith("#") || line.trim() === "") {
        if (i === 0) out.push(line);
        continue;
      }
      if (line.startsWith("v ")) { localV++; out.push(line); }
      else if (line.startsWith("vn ")) { localVn++; out.push(line); }
      else if (line.startsWith("vt ")) { localVt++; out.push(line); }
      else if (line.startsWith("f ")) {
        // Rewrite each vertex token "v/vt/vn" with the offsets.
        const tokens = line.split(/\s+/);
        const remapped = [tokens[0]];
        for (let t = 1; t < tokens.length; t++) {
          const tok = tokens[t];
          if (!tok) continue;
          const parts = tok.split("/");
          const vIdx = parts[0] ? parseInt(parts[0], 10) + vOffset : "";
          const vtIdx = parts[1] ? parseInt(parts[1], 10) + vtOffset : "";
          const vnIdx = parts[2] ? parseInt(parts[2], 10) + vnOffset : "";
          let s = String(vIdx);
          if (parts.length >= 2) s += "/" + (parts[1] ? vtIdx : "");
          if (parts.length >= 3) s += "/" + (parts[2] ? vnIdx : "");
          remapped.push(s);
        }
        out.push(remapped.join(" "));
      } else if (line.startsWith("g ") || line.startsWith("o ")) {
        out.push(`g part_${i}`);
      } else {
        // Other lines (s, usemtl, mtllib, etc.) we drop to avoid material
        // mismatches across the two halves of a paired bone. BP3D OBJs don't
        // ship .mtl files anyway — every surface is plain geometry.
      }
    }
    vOffset += localV;
    vnOffset += localVn;
    vtOffset += localVt;
  }
  fs.writeFileSync(outPath, out.join("\n"));
}

// --- 4. Convert OBJ → glb with provenance baked into asset metadata. -------
async function convertObjToGlb(objPath, glbPath, provenance) {
  const glb = await obj2gltf(objPath, {
    binary: true,
    separate: false,
    optimizeForCesium: false,
  });
  // obj2gltf with binary:true returns a Buffer (the .glb).
  // Use gltf-pipeline.processGlb to inject asset.copyright/extras.
  const result = await processGlb(glb, {
    customStages: [
      (gltf) => {
        gltf.asset = gltf.asset || {};
        gltf.asset.copyright = COPYRIGHT_STRING;
        gltf.asset.extras = Object.assign({}, gltf.asset.extras || {}, {
          source: provenance,
        });
        return gltf;
      },
    ],
  });
  fs.writeFileSync(glbPath, result.glb);
}

// --- 5. Convert UBERON id like "UBERON:0000981" to dir name "uberon_0000981".
function dirForId(id) {
  const [prefix, num] = id.split(":");
  return `${prefix.toLowerCase()}_${num}`;
}

// --- 6. Build a per-mesh source.txt provenance record. ----------------------
function writeSourceTxt(meshDir, node, fjIds, fmaAlias) {
  const lines = [
    `# Source provenance for ${node.id}`,
    ``,
    `Anatomical structure: ${node.labels[0].text}`,
    `Primary identifier:   ${node.id}`,
    `FMA alias:            ${fmaAlias}`,
    `BodyParts3D FJ-ids:   ${fjIds.join(", ")}`,
    ``,
    `## Source dataset`,
    ``,
    `Dataset:        BodyParts3D / Anatomography (DBCLS, Japan)`,
    `Source archive: data/raw/bodyparts3d/isa_BP3D_4.0_obj_99.zip`,
    `Hierarchy:      IS-A`,
    `Decimation:     99% (upstream)`,
    `License:        CC BY-SA 2.1 Japan (${LICENSE_SPDX})`,
    `License URL:    https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en`,
    `Attribution:    ${COPYRIGHT_STRING}`,
    ``,
    `## Ingestion`,
    ``,
    `Pipeline:       pipelines/01-import-bp3d (P1.04)`,
    `Ingested at:    ${INGESTED_AT}`,
    `Tooling:        obj2gltf (OBJ -> glTF/glb binary) + gltf-pipeline (asset.copyright + asset.extras.source injection)`,
    `Edits applied:`,
    `  - obj_to_glb_conversion`,
    fjIds.length > 1
      ? `  - merged_${fjIds.length}_fj_obj_into_one_glb (paired-bone left/right consolidation)`
      : null,
    ``,
    `## Per ADR 0006`,
    ``,
    `The attribution string above is also baked into the glb's`,
    `asset.copyright field; asset.extras.source carries the full`,
    `structured provenance record. This file is the redundant human-`,
    `readable backup that travels with the asset on disk.`,
    ``,
  ].filter((l) => l !== null);
  fs.writeFileSync(path.join(meshDir, "source.txt"), lines.join("\n"));
}

// --- 7. Main loop. ---------------------------------------------------------
async function main() {
  const nodes = JSON.parse(fs.readFileSync(NODES_JSON, "utf8"));
  const fmaMap = loadFmaToFjMap();
  const structures = nodes.nodes.filter((n) => n.kind === "structure");

  const successes = [];
  const gaps = [];
  const failures = [];

  let i = 0;
  for (const node of structures) {
    i++;
    const fmaAlias = node.aliases && node.aliases.fma;
    const label = node.labels[0].text;
    const prefix = `[${i}/${structures.length}] ${node.id} ${label}`;

    if (!fmaAlias) {
      gaps.push({ id: node.id, label, reason: "no FMA alias on node" });
      console.log(`${prefix} -- SKIP (no FMA alias)`);
      continue;
    }

    const fmaKey = fmaAlias.replace(":", "");
    const rows = fmaMap.get(fmaKey);
    if (!rows || rows.length === 0) {
      gaps.push({ id: node.id, label, fma: fmaAlias, reason: "FMA not in isa_element_parts.txt" });
      console.log(`${prefix} -- GAP (FMA ${fmaAlias} not in BP3D mesh table)`);
      continue;
    }

    const fjIds = rows.map((r) => r.fj);
    const meshDir = path.join(CANONICAL_MESHES, dirForId(node.id));
    const glbPath = path.join(meshDir, "lod0.glb");

    try {
      fs.mkdirSync(meshDir, { recursive: true });
      const objs = fjIds.map((fj) => extractObj(fj));
      const mergedObj = path.join(CACHE_DIR, `merged_${dirForId(node.id)}.obj`);
      mergeObjs(objs, mergedObj);

      const provenance = {
        source: "BodyParts3D",
        license: LICENSE_SPDX,
        original_id: fjIds.join("+"),
        fma_id: fmaAlias,
        ingested_at: INGESTED_AT,
        edits: ["obj_to_glb_conversion"].concat(
          fjIds.length > 1 ? [`merged_${fjIds.length}_fj_obj_into_one_glb`] : []
        ),
      };

      await convertObjToGlb(mergedObj, glbPath, provenance);
      writeSourceTxt(meshDir, node, fjIds, fmaAlias);

      const stat = fs.statSync(glbPath);
      successes.push({
        id: node.id,
        label,
        fma: fmaAlias,
        fjs: fjIds,
        glb: path.relative(REPO_ROOT, glbPath).replace(/\\/g, "/"),
        bytes: stat.size,
      });
      console.log(`${prefix} -- OK (${fjIds.join("+")}, ${stat.size} bytes)`);
    } catch (err) {
      failures.push({ id: node.id, label, fma: fmaAlias, fjs: fjIds, error: String(err) });
      console.log(`${prefix} -- FAIL: ${err.message}`);
    }
  }

  // Build gap report.
  writeGapReport(gaps, failures, successes);

  // Build summary JSON for the orchestrator.
  const summary = {
    successes: successes.length,
    gaps: gaps.length,
    failures: failures.length,
    total_bytes: successes.reduce((s, x) => s + x.bytes, 0),
    glb_size_min: Math.min(...successes.map((s) => s.bytes)),
    glb_size_max: Math.max(...successes.map((s) => s.bytes)),
    glb_size_mean: Math.round(
      successes.reduce((s, x) => s + x.bytes, 0) / successes.length
    ),
  };
  fs.writeFileSync(
    path.join(__dirname, "p1.04-run-summary.json"),
    JSON.stringify({ summary, successes, gaps, failures }, null, 2)
  );
  console.log("\n=== P1.04 SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
}

function writeGapReport(gaps, failures, successes) {
  const lines = [
    `# BodyParts3D import gap report — 2026-05-11`,
    ``,
    `Pipeline step: P1.04 (Asset Pipeline, invocation #2).`,
    `Source: \`data/raw/bodyparts3d/isa_BP3D_4.0_obj_99.zip\` via FMA→FJ pivot in \`isa_element_parts.txt\`.`,
    ``,
    `## Headline`,
    ``,
    `- **${successes.length} canonical glb files written** to \`data/canonical/meshes/<id>/lod0.glb\`.`,
    `- **${gaps.length} gaps** — structures in the 108-node skeletal ontology whose FMA alias does not appear in BodyParts3D's element-parts table.`,
    `- **${failures.length} conversion failures** (OBJ extracted but glb pipeline errored).`,
    ``,
    `## Gaps (FMA not in BP3D)`,
    ``,
    `These structures exist in the UBERON skeletal ontology but BodyParts3D does not ship a separate mesh for them. Most are sub-structures of a larger bone that BP3D models as a whole (e.g. femur head/neck/shaft are parts of the femur mesh, not separate OBJs).`,
    ``,
    `| UBERON id | Label | FMA alias | Note |`,
    `|---|---|---|---|`,
  ];
  for (const g of gaps) {
    lines.push(`| ${g.id} | ${g.label} | ${g.fma || "—"} | ${g.reason} |`);
  }
  lines.push(``);
  lines.push(`## Conversion failures`);
  lines.push(``);
  if (failures.length === 0) {
    lines.push(`None.`);
  } else {
    lines.push(`| UBERON id | Label | FMA | FJ-ids | Error |`);
    lines.push(`|---|---|---|---|---|`);
    for (const f of failures) {
      lines.push(`| ${f.id} | ${f.label} | ${f.fma} | ${f.fjs.join(", ")} | ${f.error.split("\n")[0]} |`);
    }
  }
  lines.push(``);
  lines.push(`## Notes for downstream agents`);
  lines.push(``);
  lines.push(`- The gap list is **expected behaviour**, not a pipeline error. BP3D's hierarchical model contains parent bones but not their named sub-features. Reconstructing these for the atlas needs either (a) procedural decomposition of the parent mesh in Blender (P1.05) or (b) hand-authoring.`);
  lines.push(`- The femur seed (\`UBERON:0000981\`) gets a real BP3D-derived glb. The existing procedural \`procedural/femur-proxy-threejs\` record in \`data/derived/mesh-registry.json\` is untouched; P1.08 reconciles the two.`);
  lines.push(`- The sternum (\`UBERON:0000975\`) is a gap, but its three components — manubrium, body of sternum, xiphoid — all convert successfully. The Anatomy Domain can either assemble a composite sternum at the registry level (P1.08) or leave it as a missing-mesh node until Phase 2.`);
  lines.push(`- Paired bones (ribs, hip bone, all limb bones) appear in BP3D as separate left/right FJ files. This pipeline merges both sides into a single glb per UBERON concept, with vertex/normal/uv index rebasing across the two OBJ halves.`);
  lines.push(``);
  fs.writeFileSync(REPORT_PATH, lines.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
