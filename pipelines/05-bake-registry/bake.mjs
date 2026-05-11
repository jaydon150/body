// pipelines/05-bake-registry/bake.mjs
// Phase 1 step P1.08 — bake the canonical mesh-asset registry.
//
// Reads:
//   data/canonical/meshes/uberon_*/lod{0,1,2}.glb (79 dirs × 3 LODs)
//   data/canonical/ontology/nodes.json (for the FMA alias cross-check;
//                                       not strictly needed since each glb
//                                       carries its own fma_id, but useful
//                                       for sanity)
//
// Writes:
//   data/derived/mesh-registry.json — full rebuild, supersedes the seed.
//
// Per the schema at app/shared/schema/mesh-asset-manifest.json:
//   - top-level: version, generated_at, entries
//   - entry: id, lods, bounds, provenance, material_hint
//   - lod: level, file, triangle_count, vertex_count?, byte_size?, compression?
//   - bounds: min[3], max[3]
//   - provenance: source, license, original_id?, ingested_at?, edits[]?
//
// Determinism:
//   - Entries sorted by UBERON id ascending.
//   - JSON serialization with 2-space indent, keys in fixed insertion order.
//   - All numeric values stored as-is (numbers from the glb, no rounding).
//
// Sternum composite (UBERON:0000975) is intentionally OMITTED from this bake
// per the P1.08 dispatch brief: the current mesh-asset-manifest.json schema
// has no field for composite_children, and extending the schema is the
// Architect's authority (P1.09). When the schema gains composite support,
// a follow-up bake can synthesize the sternum entry from the 3 child glbs
// (UBERON:0002205 manubrium / UBERON:0006820 body / UBERON:0002207 xiphoid).
//
// Per ADR 0007: accept both NUL- and space-padded BIN chunk-type bytes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const MESH_ROOT = path.join(REPO_ROOT, "data", "canonical", "meshes");
const DERIVED_REGISTRY = path.join(REPO_ROOT, "data", "derived", "mesh-registry.json");

const REGISTRY_VERSION = "p1.08-bake-1.0.0";
const INGESTED_AT = "2026-05-11";
const EXPECTED_LICENSE = "CC-BY-SA-2.1-JP";
const EXPECTED_SOURCE = "BodyParts3D";

// LOD-level decimate tags that may appear in a per-glb edits[] chain.
// We strip these out at the registry-entry level so entry.provenance.edits
// reflects only the LOD0 chain. (LOD-level details are implicit in the
// 3-entry lods array with monotonically decreasing triangle_count.)
const LOD_DECIMATE_TAGS = new Set([
  "blender_5.1.1_decimate:lod1_ratio_0.5",
  "blender_5.1.1_decimate:lod2_ratio_0.1",
  "blender_5.1.1_decimate:lod2_ratio_0.3_fallback",
]);

// ---- GLB binary parser (ADR-0007-compliant: dual NUL/space padding) ------

function parseGlb(buf) {
  const magic = buf.toString("ascii", 0, 4);
  if (magic !== "glTF") throw new Error(`bad magic: ${magic}`);
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported glTF version: ${version}`);
  const totalLength = buf.readUInt32LE(8);

  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.toString("ascii", 16, 20);
  if (jsonType !== "JSON") throw new Error(`expected JSON chunk, got ${jsonType}`);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLen;
  const jsonStr = buf.toString("utf8", jsonStart, jsonEnd);
  const jsonObj = JSON.parse(jsonStr);

  let binChunk = null;
  if (jsonEnd < totalLength) {
    const binLen = buf.readUInt32LE(jsonEnd);
    const typeStr = buf.toString("ascii", jsonEnd + 4, jsonEnd + 7);
    const pad = buf[jsonEnd + 7];
    if (typeStr !== "BIN" || (pad !== 0x00 && pad !== 0x20)) {
      const got = buf.toString("ascii", jsonEnd + 4, jsonEnd + 8);
      throw new Error(`expected BIN chunk, got '${got}'`);
    }
    const binStart = jsonEnd + 8;
    binChunk = buf.subarray(binStart, binStart + binLen);
  }

  return { totalLength, jsonObj, binChunk };
}

// ---- Math helpers --------------------------------------------------------

// Identity 4×4 matrix as a 16-element column-major array.
function identityMatrix() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

// Multiply two 4×4 matrices in column-major order: A * B.
function multiplyMatrices(a, b) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        s += a[row + k * 4] * b[k + col * 4];
      }
      out[row + col * 4] = s;
    }
  }
  return out;
}

// Build a 4×4 transform from TRS (translation [3], rotation [4] quat xyzw,
// scale [3]). Column-major order, matches glTF spec.
function trsToMatrix(t, r, s) {
  const tx = t?.[0] ?? 0;
  const ty = t?.[1] ?? 0;
  const tz = t?.[2] ?? 0;
  const qx = r?.[0] ?? 0;
  const qy = r?.[1] ?? 0;
  const qz = r?.[2] ?? 0;
  const qw = r?.[3] ?? 1;
  const sx = s?.[0] ?? 1;
  const sy = s?.[1] ?? 1;
  const sz = s?.[2] ?? 1;

  const x2 = qx + qx;
  const y2 = qy + qy;
  const z2 = qz + qz;
  const xx = qx * x2;
  const xy = qx * y2;
  const xz = qx * z2;
  const yy = qy * y2;
  const yz = qy * z2;
  const zz = qz * z2;
  const wx = qw * x2;
  const wy = qw * y2;
  const wz = qw * z2;

  // Column-major
  return [
    (1 - (yy + zz)) * sx,  (xy + wz) * sx,        (xz - wy) * sx,        0,
    (xy - wz) * sy,        (1 - (xx + zz)) * sy,  (yz + wx) * sy,        0,
    (xz + wy) * sz,        (yz - wx) * sz,        (1 - (xx + yy)) * sz,  0,
    tx,                    ty,                    tz,                    1,
  ];
}

// Transform a 3-vector by a 4×4 matrix (column-major). Returns new array.
function transformPoint(m, p) {
  const x = p[0], y = p[1], z = p[2];
  return [
    m[0] * x + m[4] * y + m[8]  * z + m[12],
    m[1] * x + m[5] * y + m[9]  * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// Given local AABB min/max and a 4×4 transform, return world AABB by
// transforming all 8 corners and unioning.
function transformAABB(min, max, m) {
  const corners = [
    [min[0], min[1], min[2]],
    [max[0], min[1], min[2]],
    [min[0], max[1], min[2]],
    [max[0], max[1], min[2]],
    [min[0], min[1], max[2]],
    [max[0], min[1], max[2]],
    [min[0], max[1], max[2]],
    [max[0], max[1], max[2]],
  ];
  let outMin = [Infinity, Infinity, Infinity];
  let outMax = [-Infinity, -Infinity, -Infinity];
  for (const c of corners) {
    const tc = transformPoint(m, c);
    for (let i = 0; i < 3; i++) {
      if (tc[i] < outMin[i]) outMin[i] = tc[i];
      if (tc[i] > outMax[i]) outMax[i] = tc[i];
    }
  }
  return { min: outMin, max: outMax };
}

// Get a node's local transform matrix (either .matrix or TRS components).
function nodeLocalMatrix(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) {
    return node.matrix.slice();
  }
  if (node.translation || node.rotation || node.scale) {
    return trsToMatrix(node.translation, node.rotation, node.scale);
  }
  return identityMatrix();
}

// ---- LOD geometry stats --------------------------------------------------

// Extract per-LOD geometry stats from a parsed glb JSON.
//   - triangle_count: sum across all primitives. If primitive has indices,
//     use indicesAccessor.count / 3. If un-indexed (none in this dataset),
//     use POSITION accessor count / 3.
//   - vertex_count: sum of POSITION accessor counts across all primitives.
//     Note: this counts vertices per primitive (shared verts at primitive
//     boundaries get double-counted), which is the canonical "vertex count"
//     for rendering cost estimation. All canonical glbs have 1 primitive
//     per mesh and (for paired bones) separate meshes that don't share
//     vertices, so this sum matches the on-disk vertex count.
//   - Asserts mode is TRIANGLES (4) or default (undefined -> 4 per spec).
function lodGeometryStats(jsonObj) {
  let triCount = 0;
  let vertCount = 0;
  for (const mesh of jsonObj.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const mode = prim.mode ?? 4; // default is TRIANGLES
      if (mode !== 4) {
        throw new Error(
          `unsupported primitive mode ${mode} (only TRIANGLES=4 supported)`,
        );
      }
      const posIdx = prim.attributes?.POSITION;
      if (posIdx === undefined) {
        throw new Error("primitive missing POSITION attribute");
      }
      const posAcc = jsonObj.accessors[posIdx];
      vertCount += posAcc.count;
      if (prim.indices !== undefined && prim.indices !== null) {
        const idxAcc = jsonObj.accessors[prim.indices];
        if (idxAcc.count % 3 !== 0) {
          throw new Error(
            `indices count ${idxAcc.count} not divisible by 3`,
          );
        }
        triCount += idxAcc.count / 3;
      } else {
        if (posAcc.count % 3 !== 0) {
          throw new Error(
            `un-indexed POSITION count ${posAcc.count} not divisible by 3`,
          );
        }
        triCount += posAcc.count / 3;
      }
    }
  }
  return { triangle_count: triCount, vertex_count: vertCount };
}

// Compute world AABB of all primitives' POSITION accessors, applying
// node-matrix transforms across the scene graph.
function lodWorldBounds(jsonObj) {
  // Build mesh-index → world matrices[] by walking from each scene root.
  // A mesh can appear under multiple nodes (instancing). We collect ALL
  // node→mesh references with their accumulated parent transforms.
  const meshNodes = []; // [{meshIndex, worldMatrix}]

  function walk(nodeIdx, parentMatrix) {
    const node = jsonObj.nodes[nodeIdx];
    if (!node) return;
    const local = nodeLocalMatrix(node);
    const world = multiplyMatrices(parentMatrix, local);
    if (typeof node.mesh === "number") {
      meshNodes.push({ meshIndex: node.mesh, worldMatrix: world });
    }
    for (const child of node.children || []) {
      walk(child, world);
    }
  }

  const sceneIdx = jsonObj.scene ?? 0;
  const scene = jsonObj.scenes?.[sceneIdx];
  if (!scene) {
    throw new Error("glb has no usable scene");
  }
  for (const rootIdx of scene.nodes || []) {
    walk(rootIdx, identityMatrix());
  }

  let outMin = [Infinity, Infinity, Infinity];
  let outMax = [-Infinity, -Infinity, -Infinity];
  let any = false;

  for (const { meshIndex, worldMatrix } of meshNodes) {
    const mesh = jsonObj.meshes[meshIndex];
    if (!mesh) continue;
    for (const prim of mesh.primitives || []) {
      const posIdx = prim.attributes?.POSITION;
      if (posIdx === undefined) continue;
      const posAcc = jsonObj.accessors[posIdx];
      if (!Array.isArray(posAcc.min) || !Array.isArray(posAcc.max)) {
        // POSITION accessor missing min/max bounds — would have to walk the
        // BIN chunk. All canonical glbs DO include min/max (verified at
        // P1.07). Throw to flag the surprise.
        throw new Error(
          `POSITION accessor ${posIdx} missing min/max bounds`,
        );
      }
      const transformed = transformAABB(posAcc.min, posAcc.max, worldMatrix);
      for (let i = 0; i < 3; i++) {
        if (transformed.min[i] < outMin[i]) outMin[i] = transformed.min[i];
        if (transformed.max[i] > outMax[i]) outMax[i] = transformed.max[i];
      }
      any = true;
    }
  }

  if (!any) {
    throw new Error("no POSITION accessors found in any mesh");
  }
  return { min: outMin, max: outMax };
}

// ---- Per-entry build -----------------------------------------------------

function buildEntry(dirName) {
  const uberonId = uberonIdFromDirName(dirName);
  const dirPath = path.join(MESH_ROOT, dirName);
  const lodFiles = [
    { level: 0, file: "lod0.glb" },
    { level: 1, file: "lod1.glb" },
    { level: 2, file: "lod2.glb" },
  ];

  // Parse all three LODs.
  const parsed = lodFiles.map(({ level, file }) => {
    const abs = path.join(dirPath, file);
    const buf = fs.readFileSync(abs);
    const stat = fs.statSync(abs);
    const { jsonObj } = parseGlb(buf);
    return { level, file, abs, stat, jsonObj };
  });

  // LOD0 is authoritative for bounds (LOD1/LOD2 should produce equivalent
  // bounds since decimation preserves silhouette, but per the brief the
  // entry-level bounds come from LOD0).
  const lod0 = parsed[0];
  const bounds = lodWorldBounds(lod0.jsonObj);

  // Build lods[] array.
  const lods = parsed.map(({ level, file, stat, jsonObj }) => {
    const stats = lodGeometryStats(jsonObj);
    return {
      level,
      file: `${dirName}/${file}`,
      triangle_count: stats.triangle_count,
      vertex_count: stats.vertex_count,
      byte_size: stat.size,
      compression: "none",
    };
  });

  // Provenance from LOD0.
  const src = lod0.jsonObj.asset?.extras?.source;
  if (!src) {
    throw new Error(`${dirName}/lod0.glb missing asset.extras.source`);
  }

  // edits[] is the LOD0 chain. Strip LOD-decimate tags defensively (LOD0
  // should not carry them, but be safe). Preserve order.
  const lod0Edits = Array.isArray(src.edits) ? src.edits : [];
  const entryEdits = lod0Edits.filter((tag) => !LOD_DECIMATE_TAGS.has(tag));

  const provenance = {
    source: src.source || EXPECTED_SOURCE,
    license: src.license || EXPECTED_LICENSE,
    original_id: src.original_id || "",
    ingested_at: src.ingested_at || INGESTED_AT,
    edits: entryEdits,
  };

  return {
    id: uberonId,
    lods,
    bounds: {
      min: bounds.min,
      max: bounds.max,
    },
    material_hint: "bone",
    provenance,
  };
}

function uberonIdFromDirName(dirName) {
  // "uberon_0000981" → "UBERON:0000981"
  const m = /^uberon_(\d{7})$/.exec(dirName);
  if (!m) throw new Error(`unrecognized mesh dir name: ${dirName}`);
  return `UBERON:${m[1]}`;
}

// ---- Main ----------------------------------------------------------------

function main() {
  // Walk the canonical mesh root.
  const allDirs = fs
    .readdirSync(MESH_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^uberon_\d{7}$/.test(d.name))
    .map((d) => d.name)
    .sort(); // ascending = deterministic order

  console.log(`Found ${allDirs.length} canonical mesh directories.`);

  const entries = [];
  const errors = [];
  for (const dirName of allDirs) {
    try {
      const entry = buildEntry(dirName);
      entries.push(entry);
    } catch (err) {
      errors.push({ dir: dirName, error: err.message });
      console.error(`  FAIL ${dirName}: ${err.message}`);
    }
  }

  // Sort entries by UBERON id (which is already lexicographically aligned
  // with the dirName sort since `UBERON:NNNNNNN` is fixed-width).
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Deterministic generated_at: fixed UTC date stamp. We use a fixed
  // ISO 8601 timestamp at the start of the day to keep re-runs byte-stable.
  // The schema requires `format: "date-time"` so we use the canonical
  // `YYYY-MM-DDTHH:MM:SSZ` form.
  const generatedAt = "2026-05-11T00:00:00Z";

  const registry = {
    version: REGISTRY_VERSION,
    generated_at: generatedAt,
    entries,
  };

  // Pretty-print with 2-space indent. Deterministic key order is guaranteed
  // by JavaScript object insertion-order plus our explicit key ordering in
  // buildEntry().
  const jsonText = JSON.stringify(registry, null, 2) + "\n";
  fs.writeFileSync(DERIVED_REGISTRY, jsonText);

  console.log(`\n=== bake summary ===`);
  console.log(`  entries written: ${entries.length}`);
  console.log(`  errors: ${errors.length}`);
  console.log(`  output: ${DERIVED_REGISTRY}`);
  console.log(`  bytes: ${jsonText.length}`);

  if (errors.length > 0) {
    console.error("\nFAIL: errors during bake; see above.");
    process.exit(1);
  }

  if (entries.length !== 79) {
    console.error(
      `\nWARN: expected 79 entries (one per canonical mesh dir), got ${entries.length}.`,
    );
    process.exit(1);
  }
}

main();
