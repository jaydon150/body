// pipelines/04-validate-ontology/validate.mjs
// P1.07: validate-ontology cross-check.
//
// Reads:
//   data/canonical/ontology/{nodes,relations,synonyms}.json
//   data/canonical/meshes/uberon_NNNNNNN/{lod0,lod1,lod2}.glb + source.txt
//   data/derived/mesh-registry.json
//   pipelines/01-import-bp3d/gap-report-2026-05-11.md
//   app/shared/schema/anatomical-id-schema.json
//   app/shared/schema/mesh-asset-manifest.json
//
// Emits:
//   pipelines/04-validate-ontology/validation-report-2026-05-11.md
//   pipelines/04-validate-ontology/validation-data.json (machine-readable detail)
//
// Read-only. Zero npm deps; only node built-ins.
//
// Per ADR 0007: accept both NUL- and space-padded chunk-type bytes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const ONTOLOGY_DIR = path.join(REPO_ROOT, "data", "canonical", "ontology");
const MESH_ROOT = path.join(REPO_ROOT, "data", "canonical", "meshes");
const DERIVED_REGISTRY = path.join(REPO_ROOT, "data", "derived", "mesh-registry.json");
const GAP_REPORT = path.join(REPO_ROOT, "pipelines", "01-import-bp3d", "gap-report-2026-05-11.md");
const ANATOMICAL_SCHEMA = path.join(REPO_ROOT, "app", "shared", "schema", "anatomical-id-schema.json");
const MESH_MANIFEST_SCHEMA = path.join(REPO_ROOT, "app", "shared", "schema", "mesh-asset-manifest.json");

const REPORT_PATH = path.join(__dirname, "validation-report-2026-05-11.md");
const DATA_PATH = path.join(__dirname, "validation-data.json");

const EXPECTED_COPYRIGHT_PREFIX = "BodyParts3D, Copyright";

const RELATION_ENUM = new Set([
  "regional_part_of",
  "constitutional_part_of",
  "systemic_part_of",
  "member_of",
  "branch_of",
  "tributary_of",
  "innervates",
  "supplied_by",
]);

const KIND_ENUM = new Set([
  "concept",
  "structure",
  "region",
  "system",
  "tissue",
  "cell",
  "compound",
]);

const STATUS_ENUM = new Set(["reviewed", "pending", "deprecated"]);

const PRIMARY_ID_RE = /^(UBERON:\d{7}|FMA:\d+|BODY:\d+)$/;
const LANG_RE = /^[a-z]{2,3}(-[A-Z][a-zA-Z]{1,7})?$/;

// LOD-specific edit tag expectations (per state log + ADR 0007).
const LOD1_EDIT_TAG = "blender_5.1.1_decimate:lod1_ratio_0.5";
const LOD2_EDIT_TAG = "blender_5.1.1_decimate:lod2_ratio_0.1";
const LOD2_FALLBACK_TAG = "blender_5.1.1_decimate:lod2_ratio_0.3_fallback";
const CLEANUP_TAG = "blender_5.1.1_cleanup:remove_doubles+normals_make_consistent";
const CONVERT_TAG = "obj_to_glb_conversion";
const MERGE_TAG = "merged_2_fj_obj_into_one_glb";

// Two known LOD2 fallbacks per state log open item #0 (P1.06).
const LOD2_FALLBACK_DIRS = new Set(["uberon_0001429", "uberon_0002445"]);

// ----- GLB binary parsing (zero-dep, ADR-0007-compliant) ------------------

function parseGlb(buf) {
  const magic = buf.toString("ascii", 0, 4);
  if (magic !== "glTF") throw new Error(`bad magic: ${magic}`);
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported glTF version: ${version}`);
  const totalLength = buf.readUInt32LE(8);

  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.toString("ascii", 16, 20);
  if (jsonType !== "JSON") throw new Error(`expected JSON chunk, got '${jsonType}'`);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLen;
  const jsonStr = buf.toString("utf8", jsonStart, jsonEnd);
  const jsonObj = JSON.parse(jsonStr);

  let binChunk = null;
  if (jsonEnd < totalLength) {
    const binLen = buf.readUInt32LE(jsonEnd);
    // Per ADR 0007: accept NUL or space padding for chunk type "BIN" + pad.
    const typeStr = buf.toString("ascii", jsonEnd + 4, jsonEnd + 7);
    const padByte = buf[jsonEnd + 7];
    if (typeStr !== "BIN" || (padByte !== 0x00 && padByte !== 0x20)) {
      const got = buf.toString("ascii", jsonEnd + 4, jsonEnd + 8);
      const bytes = Array.from(buf.subarray(jsonEnd + 4, jsonEnd + 8));
      throw new Error(`expected BIN chunk, got '${got}' (bytes: ${bytes})`);
    }
    const binStart = jsonEnd + 8;
    binChunk = buf.subarray(binStart, binStart + binLen);
  }
  return { totalLength, jsonObj, binChunk };
}

// ----- Helpers -------------------------------------------------------------

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listMeshDirs() {
  return fs
    .readdirSync(MESH_ROOT)
    .filter((d) => d.startsWith("uberon_"))
    .sort();
}

function meshDirToUberonId(d) {
  // uberon_0000981 -> UBERON:0000981
  const m = d.match(/^uberon_(\d{7})$/);
  if (!m) return null;
  return `UBERON:${m[1]}`;
}

function uberonIdToMeshDir(id) {
  // UBERON:0000981 -> uberon_0000981
  const m = id.match(/^UBERON:(\d{7})$/);
  if (!m) return null;
  return `uberon_${m[1]}`;
}

// ----- Check 1: Completeness math ----------------------------------------

function check1Completeness(nodes, dirs) {
  const byKind = {};
  for (const n of nodes) {
    byKind[n.kind] = (byKind[n.kind] || 0) + 1;
  }
  const total = nodes.length;

  const structureNodes = nodes.filter((n) => n.kind === "structure");
  const meshDirSet = new Set(dirs);

  const structuresWithMesh = [];
  const structuresWithoutMesh = [];
  for (const n of structureNodes) {
    const dir = uberonIdToMeshDir(n.id);
    if (dir && meshDirSet.has(dir)) {
      structuresWithMesh.push(n.id);
    } else {
      structuresWithoutMesh.push({ id: n.id, label: n.labels[0]?.text || null });
    }
  }

  const nonStructuresCount = total - structureNodes.length;
  const mathOk = nonStructuresCount + structuresWithMesh.length + structuresWithoutMesh.length === total;

  return {
    name: "Completeness math",
    total_nodes: total,
    by_kind: byKind,
    structure_total: structureNodes.length,
    structures_with_mesh: structuresWithMesh.length,
    structures_without_mesh: structuresWithoutMesh.length,
    structures_without_mesh_list: structuresWithoutMesh,
    non_structure_count: nonStructuresCount,
    math_holds: mathOk,
    math_expression: `non_structure(${nonStructuresCount}) + with_mesh(${structuresWithMesh.length}) + without_mesh(${structuresWithoutMesh.length}) = ${nonStructuresCount + structuresWithMesh.length + structuresWithoutMesh.length} | total=${total}`,
    status: mathOk ? "PASS" : "FAIL",
  };
}

// ----- Check 2: LOD chain completeness -----------------------------------

function check2LodChain(dirs) {
  const missing = [];
  const sourceHeaderMisses = [];
  let dirsOk = 0;
  let headersOk = 0;
  for (const d of dirs) {
    const dirAbs = path.join(MESH_ROOT, d);
    const wantFiles = ["lod0.glb", "lod1.glb", "lod2.glb", "source.txt"];
    const haveFiles = wantFiles.filter((f) => fs.existsSync(path.join(dirAbs, f)));
    if (haveFiles.length === wantFiles.length) {
      dirsOk++;
    } else {
      missing.push({
        dir: d,
        missing_files: wantFiles.filter((f) => !haveFiles.includes(f)),
      });
    }

    const srcPath = path.join(dirAbs, "source.txt");
    if (fs.existsSync(srcPath)) {
      const txt = fs.readFileSync(srcPath, "utf8");
      const hasCleanup = txt.includes("## Cleanup (P1.05)");
      const hasLods = txt.includes("## LODs (P1.06)");
      if (hasCleanup && hasLods) {
        headersOk++;
      } else {
        sourceHeaderMisses.push({
          dir: d,
          has_cleanup_p1_05: hasCleanup,
          has_lods_p1_06: hasLods,
        });
      }
    }
  }
  return {
    name: "LOD chain completeness",
    dirs_total: dirs.length,
    dirs_with_all_4_files: dirsOk,
    missing_files: missing,
    source_txt_with_both_headers: headersOk,
    source_txt_header_misses: sourceHeaderMisses,
    status: missing.length === 0 && sourceHeaderMisses.length === 0 ? "PASS" : "FAIL",
  };
}

// ----- Check 3: Attribution survival -------------------------------------

function check3Attribution(dirs, nodes) {
  // Build UBERON id -> aliases.fma map.
  const fmaByUberon = {};
  for (const n of nodes) {
    if (n.id.startsWith("UBERON:")) {
      fmaByUberon[n.id] = n.aliases?.fma || null;
    }
  }

  const failures = [];
  const perLodCounts = { lod0: 0, lod1: 0, lod2: 0 };
  const perLodFailCounts = { lod0: 0, lod1: 0, lod2: 0 };
  let totalGlbs = 0;
  let totalPass = 0;
  const fallbackTagSeen = [];

  for (const d of dirs) {
    const uberonId = meshDirToUberonId(d);
    const expectedFma = fmaByUberon[uberonId];

    for (const lodName of ["lod0", "lod1", "lod2"]) {
      const glbPath = path.join(MESH_ROOT, d, `${lodName}.glb`);
      if (!fs.existsSync(glbPath)) {
        failures.push({ dir: d, lod: lodName, reason: "file_missing" });
        continue;
      }
      totalGlbs++;
      perLodCounts[lodName]++;

      let parseResult;
      try {
        const buf = fs.readFileSync(glbPath);
        parseResult = parseGlb(buf);
      } catch (err) {
        failures.push({ dir: d, lod: lodName, reason: `parse_error: ${err.message}` });
        perLodFailCounts[lodName]++;
        continue;
      }
      const asset = parseResult.jsonObj.asset || {};
      const errs = [];

      // copyright check
      const copyright = asset.copyright || "";
      if (!copyright.startsWith(EXPECTED_COPYRIGHT_PREFIX)) {
        errs.push(`copyright_bad:${JSON.stringify(copyright.slice(0, 30))}`);
      }

      const source = asset.extras?.source || {};

      // fma_id check
      const gotFma = source.fma_id || null;
      if (expectedFma && gotFma !== expectedFma) {
        errs.push(`fma_mismatch: ontology=${expectedFma} glb=${gotFma}`);
      } else if (!expectedFma && gotFma) {
        // Allow: ontology lacks fma but glb has one.
      }

      // edits[] chain check
      const edits = Array.isArray(source.edits) ? source.edits : [];
      const requiredAtThisLod = [];

      // LOD0 always: convert + cleanup
      requiredAtThisLod.push(CONVERT_TAG);
      requiredAtThisLod.push(CLEANUP_TAG);

      if (lodName === "lod1") {
        requiredAtThisLod.push(LOD1_EDIT_TAG);
      } else if (lodName === "lod2") {
        // LOD2 must have either standard tag OR fallback tag
        // (For the 2 known fallback dirs the standard tag is also present alongside fallback per state log.)
        const hasStd = edits.includes(LOD2_EDIT_TAG);
        const hasFb = edits.includes(LOD2_FALLBACK_TAG);
        if (!hasStd && !hasFb) {
          errs.push(`lod2_no_decimate_tag`);
        }
        if (hasFb) {
          fallbackTagSeen.push({ dir: d, lod: lodName });
          if (!LOD2_FALLBACK_DIRS.has(d)) {
            // Not a hard failure but worth flagging
            errs.push(`unexpected_fallback_dir`);
          }
        }
        if (LOD2_FALLBACK_DIRS.has(d) && !hasFb) {
          errs.push(`missing_expected_fallback_tag_for_${d}`);
        }
      }

      for (const t of requiredAtThisLod) {
        if (!edits.includes(t)) {
          errs.push(`missing_edit_tag:${t}`);
        }
      }

      // Paired-bone files should have merge tag at LOD0/1/2. We can detect
      // paired-bone if there are 2 meshes in the glb.
      const meshes = parseResult.jsonObj.meshes || [];
      if (meshes.length === 2) {
        if (!edits.includes(MERGE_TAG)) {
          errs.push(`paired_bone_missing_merge_tag`);
        }
      }

      if (errs.length === 0) {
        totalPass++;
      } else {
        failures.push({ dir: d, lod: lodName, fma_expected: expectedFma, fma_got: gotFma, errors: errs });
        perLodFailCounts[lodName]++;
      }
    }
  }

  return {
    name: "Attribution survival across all 237 glbs",
    total_glbs_checked: totalGlbs,
    total_pass: totalPass,
    failure_count: failures.length,
    failures,
    per_lod_counts: perLodCounts,
    per_lod_fail_counts: perLodFailCounts,
    fallback_tag_dirs_seen: Array.from(new Set(fallbackTagSeen.map((f) => f.dir))).sort(),
    status: failures.length === 0 ? "PASS" : "FAIL",
  };
}

// ----- Check 4: Ontology DAG coherence -----------------------------------

function check4DagCoherence(nodes, edges) {
  const idSet = new Set();
  const dupIds = [];
  for (const n of nodes) {
    if (idSet.has(n.id)) dupIds.push(n.id);
    idSet.add(n.id);
  }

  // Schema-conformance on nodes
  const nodeSchemaFailures = [];
  for (const n of nodes) {
    const errs = [];
    if (!PRIMARY_ID_RE.test(n.id)) errs.push(`id_pattern:${n.id}`);
    if (!Array.isArray(n.labels) || n.labels.length === 0) errs.push("labels_missing");
    else {
      for (let i = 0; i < n.labels.length; i++) {
        const l = n.labels[i];
        if (!l.text || typeof l.text !== "string") errs.push(`labels[${i}].text`);
        if (!l.lang || !LANG_RE.test(l.lang)) errs.push(`labels[${i}].lang:${l.lang}`);
      }
    }
    if (!KIND_ENUM.has(n.kind)) errs.push(`kind:${n.kind}`);
    if (n.status !== undefined && !STATUS_ENUM.has(n.status)) errs.push(`status:${n.status}`);
    if (errs.length > 0) nodeSchemaFailures.push({ id: n.id, errors: errs });
  }

  // Edge referential integrity + schema
  const edgeRefFailures = [];
  const edgeSchemaFailures = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const errs = [];
    if (!PRIMARY_ID_RE.test(e.from)) errs.push(`from_pattern:${e.from}`);
    if (!PRIMARY_ID_RE.test(e.to)) errs.push(`to_pattern:${e.to}`);
    if (!RELATION_ENUM.has(e.type)) errs.push(`type:${e.type}`);
    if (errs.length > 0) edgeSchemaFailures.push({ index: i, edge: e, errors: errs });

    if (!idSet.has(e.from)) edgeRefFailures.push({ index: i, edge: e, reason: "from_missing" });
    if (!idSet.has(e.to)) edgeRefFailures.push({ index: i, edge: e, reason: "to_missing" });
  }

  // Cycle check via DFS over directed edges (treating edge from->to).
  const adj = new Map();
  for (const id of idSet) adj.set(id, []);
  for (const e of edges) {
    if (adj.has(e.from)) adj.get(e.from).push(e.to);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const id of idSet) color.set(id, WHITE);
  let cycleFound = null;
  function dfs(u, stack) {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of adj.get(u) || []) {
      if (!idSet.has(v)) continue;
      if (color.get(v) === GRAY) {
        const start = stack.indexOf(v);
        cycleFound = stack.slice(start).concat([v]);
        return true;
      }
      if (color.get(v) === WHITE) {
        if (dfs(v, stack)) return true;
      }
    }
    stack.pop();
    color.set(u, BLACK);
    return false;
  }
  for (const id of idSet) {
    if (color.get(id) === WHITE) {
      if (dfs(id, [])) break;
    }
  }

  const ok = dupIds.length === 0
    && nodeSchemaFailures.length === 0
    && edgeRefFailures.length === 0
    && edgeSchemaFailures.length === 0
    && !cycleFound;

  return {
    name: "Ontology DAG coherence",
    total_nodes: nodes.length,
    total_edges: edges.length,
    duplicate_ids: dupIds,
    node_schema_failures: nodeSchemaFailures,
    edge_ref_failures: edgeRefFailures,
    edge_schema_failures: edgeSchemaFailures,
    cycle_found: cycleFound,
    status: ok ? "PASS" : "FAIL",
  };
}

// ----- Check 5: Gap-report reconciliation --------------------------------

function check5GapReport(nodes, dirs) {
  const text = fs.readFileSync(GAP_REPORT, "utf8");
  // Parse table rows.
  const rows = [];
  const lines = text.split(/\r?\n/);
  let inTable = false;
  for (const line of lines) {
    if (/^\| UBERON id\s+\|/.test(line)) { inTable = true; continue; }
    if (inTable && /^\|\s*-+/.test(line)) continue; // separator
    if (inTable && /^\|/.test(line)) {
      const parts = line.split("|").map((s) => s.trim()).filter((s) => s !== "");
      if (parts.length >= 3) {
        rows.push({
          uberon: parts[0],
          label: parts[1],
          fma: parts[2],
        });
      }
    } else if (inTable && !/^\|/.test(line)) {
      inTable = false;
    }
  }

  // For each gap row, the node should exist as kind=structure AND must NOT have a mesh dir.
  const dirSet = new Set(dirs);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const gapRowFailures = [];
  for (const row of rows) {
    const n = nodeById.get(row.uberon);
    const expectedDir = uberonIdToMeshDir(row.uberon);
    const hasDir = expectedDir && dirSet.has(expectedDir);
    const errs = [];
    if (!n) errs.push("node_missing");
    else if (n.kind !== "structure") errs.push(`kind_is_${n.kind}`);
    if (hasDir) errs.push("has_mesh_dir_unexpectedly");
    if (errs.length > 0) gapRowFailures.push({ row, errors: errs });
  }

  // Inverse: every node with kind=structure that has no mesh dir should be in the gap report.
  const gapIds = new Set(rows.map((r) => r.uberon));
  const missingFromGap = [];
  for (const n of nodes) {
    if (n.kind !== "structure") continue;
    const dir = uberonIdToMeshDir(n.id);
    const hasDir = dir && dirSet.has(dir);
    if (!hasDir && !gapIds.has(n.id)) {
      missingFromGap.push({ id: n.id, label: n.labels[0]?.text || null });
    }
  }

  return {
    name: "Gap-report reconciliation",
    gap_report_row_count: rows.length,
    gap_row_failures: gapRowFailures,
    structures_missing_mesh_not_in_gap_report: missingFromGap,
    status: gapRowFailures.length === 0 && missingFromGap.length === 0 ? "PASS" : "FAIL",
  };
}

// ----- Check 6: Sternum composite opportunity ----------------------------

function check6Sternum(nodes, edges, dirs) {
  const dirSet = new Set(dirs);
  const STERNUM_ID = "UBERON:0000975";
  const sternumNode = nodes.find((n) => n.id === STERNUM_ID);
  const sternumDir = uberonIdToMeshDir(STERNUM_ID);
  const sternumHasMesh = dirSet.has(sternumDir);

  // Find children via constitutional_part_of edges into sternum.
  const constChildren = edges
    .filter((e) => e.to === STERNUM_ID && e.type === "constitutional_part_of")
    .map((e) => e.from);

  const childDetails = constChildren.map((cid) => {
    const cnode = nodes.find((n) => n.id === cid);
    const cdir = uberonIdToMeshDir(cid);
    return {
      id: cid,
      label: cnode?.labels[0]?.text || null,
      mesh_dir: cdir,
      has_mesh: dirSet.has(cdir),
      has_lod0: fs.existsSync(path.join(MESH_ROOT, cdir, "lod0.glb")),
      has_lod1: fs.existsSync(path.join(MESH_ROOT, cdir, "lod1.glb")),
      has_lod2: fs.existsSync(path.join(MESH_ROOT, cdir, "lod2.glb")),
    };
  });

  const allChildrenHaveMesh = childDetails.length > 0 && childDetails.every(
    (c) => c.has_mesh && c.has_lod0 && c.has_lod1 && c.has_lod2,
  );

  // Find OTHER composite-synthesis opportunities:
  // parent kind=structure, parent lacks mesh dir, all constitutional_part_of
  // children of parent (kind=structure) have full LOD chains.
  const otherOpportunities = [];
  const childrenByParent = new Map();
  for (const e of edges) {
    if (e.type !== "constitutional_part_of") continue;
    if (!childrenByParent.has(e.to)) childrenByParent.set(e.to, []);
    childrenByParent.get(e.to).push(e.from);
  }
  for (const [parentId, kids] of childrenByParent.entries()) {
    if (parentId === STERNUM_ID) continue;
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode || parentNode.kind !== "structure") continue;
    const parentDir = uberonIdToMeshDir(parentId);
    if (!parentDir || dirSet.has(parentDir)) continue; // skip parents that have a mesh
    // Children that are structures
    const structKids = kids
      .map((cid) => nodes.find((n) => n.id === cid))
      .filter((n) => n && n.kind === "structure");
    if (structKids.length === 0) continue;
    const allHave = structKids.every((c) => {
      const cd = uberonIdToMeshDir(c.id);
      return cd && dirSet.has(cd)
        && fs.existsSync(path.join(MESH_ROOT, cd, "lod0.glb"))
        && fs.existsSync(path.join(MESH_ROOT, cd, "lod1.glb"))
        && fs.existsSync(path.join(MESH_ROOT, cd, "lod2.glb"));
    });
    if (allHave) {
      otherOpportunities.push({
        parent_id: parentId,
        parent_label: parentNode.labels[0]?.text || null,
        children: structKids.map((c) => ({ id: c.id, label: c.labels[0]?.text || null })),
      });
    }
  }

  return {
    name: "Sternum composite opportunity",
    sternum_id: STERNUM_ID,
    sternum_has_mesh: sternumHasMesh,
    sternum_node_exists: !!sternumNode,
    sternum_constitutional_children: childDetails,
    all_children_have_full_lod_chain: allChildrenHaveMesh,
    other_composite_opportunities: otherOpportunities,
    status: !sternumHasMesh && allChildrenHaveMesh ? "PASS" : "FAIL",
  };
}

// ----- Check 7: Femur seed reconciliation --------------------------------

function check7Femur(registry, dirs) {
  const proxyEntry = registry.entries.find(
    (e) => e.id === "UBERON:0000981"
      && e.lods?.[0]?.file === "procedural/femur-proxy-threejs",
  );
  const femurDir = "uberon_0000981";
  const femurLod0Abs = path.join(MESH_ROOT, femurDir, "lod0.glb");
  const realFemurExists = fs.existsSync(femurLod0Abs);

  let realFemurAttributionOk = false;
  let realFemurSource = null;
  if (realFemurExists) {
    const buf = fs.readFileSync(femurLod0Abs);
    const { jsonObj } = parseGlb(buf);
    const copyright = jsonObj.asset?.copyright || "";
    realFemurAttributionOk = copyright.startsWith(EXPECTED_COPYRIGHT_PREFIX);
    realFemurSource = jsonObj.asset?.extras?.source || null;
  }

  return {
    name: "Femur seed reconciliation",
    procedural_proxy_present_in_registry: !!proxyEntry,
    real_bp3d_femur_glb_present: realFemurExists,
    real_femur_attribution_ok: realFemurAttributionOk,
    real_femur_source_summary: realFemurSource
      ? {
          source: realFemurSource.source,
          license: realFemurSource.license,
          fma_id: realFemurSource.fma_id,
          original_id: realFemurSource.original_id,
          edits_count: Array.isArray(realFemurSource.edits) ? realFemurSource.edits.length : 0,
        }
      : null,
    p1_08_reconciliation_recommendation:
      "P1.08 rebuilds the registry: the real BP3D-derived UBERON:0000981 lod0/lod1/lod2 entry replaces the procedural proxy. "
      + "The procedural-proxy code in app/web/src/scene/FemurScene.tsx + anatomySeed.ts can stay until P1.10 wires the registry-driven loader; "
      + "remove the seed once the loader consumes the rebuilt registry.",
    status: proxyEntry && realFemurExists && realFemurAttributionOk ? "PASS" : "FAIL",
  };
}

// ----- Check 8: Schema-conformance spot-check on existing seed registry ----

function check8RegistrySchema(registry, schema) {
  // Minimal hand-rolled validator against the schema's required fields and types.
  // The seed registry is small (1 entry) so this is a lightweight pass.
  const errs = [];
  if (typeof registry.version !== "string") errs.push("version_missing_or_not_string");
  if (typeof registry.generated_at !== "string") errs.push("generated_at_missing");
  if (!Array.isArray(registry.entries)) errs.push("entries_not_array");
  else {
    for (let i = 0; i < registry.entries.length; i++) {
      const e = registry.entries[i];
      const epfx = `entries[${i}]`;
      if (!PRIMARY_ID_RE.test(e.id)) errs.push(`${epfx}.id_pattern:${e.id}`);
      if (!Array.isArray(e.lods) || e.lods.length === 0) errs.push(`${epfx}.lods_missing`);
      else {
        for (let j = 0; j < e.lods.length; j++) {
          const l = e.lods[j];
          if (typeof l.level !== "number" || l.level < 0) errs.push(`${epfx}.lods[${j}].level`);
          if (typeof l.file !== "string") errs.push(`${epfx}.lods[${j}].file`);
          if (typeof l.triangle_count !== "number" || l.triangle_count < 0) errs.push(`${epfx}.lods[${j}].triangle_count`);
          if (l.compression !== undefined && !["none", "draco", "meshopt"].includes(l.compression)) errs.push(`${epfx}.lods[${j}].compression:${l.compression}`);
        }
      }
      if (!e.bounds || !Array.isArray(e.bounds.min) || !Array.isArray(e.bounds.max)
        || e.bounds.min.length !== 3 || e.bounds.max.length !== 3) {
        errs.push(`${epfx}.bounds_shape`);
      }
      if (!e.provenance || typeof e.provenance.source !== "string" || typeof e.provenance.license !== "string") {
        errs.push(`${epfx}.provenance_required`);
      }
      if (e.material_hint !== undefined) {
        const allowed = ["bone","muscle","vessel_artery","vessel_vein","nerve","skin","fascia","fat","organ_parenchyma","cartilage","ligament","tendon","generic"];
        if (!allowed.includes(e.material_hint)) errs.push(`${epfx}.material_hint:${e.material_hint}`);
      }
    }
  }

  return {
    name: "Schema-conformance spot-check on seed registry",
    entries_count: Array.isArray(registry.entries) ? registry.entries.length : 0,
    validation_errors: errs,
    notes: "Seed registry is informational. P1.08 will rebuild it from the canonical store; this check is a baseline for that rebuild.",
    status: errs.length === 0 ? "PASS" : "FAIL",
  };
}

// ----- Top-level driver ---------------------------------------------------

function main() {
  const nodesFile = readJson(path.join(ONTOLOGY_DIR, "nodes.json"));
  const relationsFile = readJson(path.join(ONTOLOGY_DIR, "relations.json"));
  const nodes = nodesFile.nodes || [];
  const edges = relationsFile.edges || [];
  const dirs = listMeshDirs();
  const registry = readJson(DERIVED_REGISTRY);
  const meshSchema = readJson(MESH_MANIFEST_SCHEMA);

  const results = {
    generated_at: new Date().toISOString(),
    ontology_version: nodesFile.version,
    relations_version: relationsFile.version,
    mesh_dir_count: dirs.length,
    checks: {
      check1: check1Completeness(nodes, dirs),
      check2: check2LodChain(dirs),
      check3: check3Attribution(dirs, nodes),
      check4: check4DagCoherence(nodes, edges),
      check5: check5GapReport(nodes, dirs),
      check6: check6Sternum(nodes, edges, dirs),
      check7: check7Femur(registry, dirs),
      check8: check8RegistrySchema(registry, meshSchema),
    },
  };

  const statuses = Object.values(results.checks).map((c) => c.status);
  const allPass = statuses.every((s) => s === "PASS");
  results.overall_status = allPass ? "PASS" : (statuses.includes("FAIL") ? "FAIL_or_concerns" : "PASS-with-concerns");

  fs.writeFileSync(DATA_PATH, JSON.stringify(results, null, 2));
  console.log(`Validation data written: ${DATA_PATH}`);
  console.log(`Overall status: ${results.overall_status}`);
  console.log("Per-check:");
  for (const [key, c] of Object.entries(results.checks)) {
    console.log(`  ${key} (${c.name}): ${c.status}`);
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("validate.mjs")) {
  main();
}

export { main, parseGlb };
