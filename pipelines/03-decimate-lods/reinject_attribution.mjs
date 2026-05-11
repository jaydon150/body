// pipelines/03-decimate-lods/reinject_attribution.mjs
// P1.06 step 2: re-inject the BodyParts3D attribution metadata that
// Blender's glTF exporter strips on export of the LOD1/LOD2 chains.
//
// Per ADR 0006 (runtime attribution) and the P1.05 attribution-discipline
// pattern: every canonical glb (including derived LOD files) must carry
//   - asset.copyright = verbatim BodyParts3D attribution
//   - asset.extras.source = structured provenance with edits[] history
//
// Algorithm:
// 1. --snapshot mode: walk every lod0.glb and snapshot its asset block.
//    Same shape as P1.05's snapshot, but written to pre-lod-metadata.json
//    in this pipeline's directory. We re-snapshot rather than reading
//    P1.05's snapshot because the *cleaned* LOD0 (post-P1.05) is the
//    authoritative parent for the LOD chain.
// 2. --reinject mode: walk decimate-telemetry.json. For each LOD1+LOD2 in
//    each successful row, splice the LOD0 attribution back via direct GLB
//    JSON-chunk surgery, and append the LOD-specific edit tag to the
//    edits[] array carried forward from LOD0.
//
// LOD1 edit tag: "blender_5.1.1_decimate:lod1_ratio_0.5"
// LOD2 edit tag: "blender_5.1.1_decimate:lod2_ratio_0.1"
// (LOD2 fallback case: "blender_5.1.1_decimate:lod2_ratio_0.3_fallback")
//
// Direct binary surgery instead of gltf-pipeline.processGlb -- same
// rationale as P1.05: faster, BIN chunk untouched, no dependency tree.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TELEMETRY_PATH = path.join(__dirname, "decimate-telemetry.json");
const PRE_LOD_META_PATH = path.join(__dirname, "pre-lod-metadata.json");

const EXPECTED_COPYRIGHT =
  "BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan";
const EXPECTED_LICENSE = "CC-BY-SA-2.1-JP";

const LOD1_EDIT_TAG = "blender_5.1.1_decimate:lod1_ratio_0.5";
const LOD2_EDIT_TAG = "blender_5.1.1_decimate:lod2_ratio_0.1";
const LOD2_FALLBACK_EDIT_TAG = "blender_5.1.1_decimate:lod2_ratio_0.3_fallback";

const REINJECT_DATE = "2026-05-11";

// ---- GLB binary parsing / writing ----------------------------------------
// Identical shape to P1.05's helpers. Kept local so this pipeline has zero
// dependencies (matches P1.05 reasoning).

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
    // The glTF chunk type field is 4 ASCII bytes. The spec says JSON chunks
    // pad to 4 bytes with 0x20 (space) and BIN chunks pad with 0x00 (NUL).
    // The chunk type itself is "BIN" + 0x00 (NUL) per the spec, but some
    // tools emit "BIN" + 0x20 (space). Accept either form.
    const typeStr = buf.toString("ascii", jsonEnd + 4, jsonEnd + 7); // first 3 chars
    const pad = buf[jsonEnd + 7];
    if (typeStr !== "BIN" || (pad !== 0x00 && pad !== 0x20)) {
      const got = buf.toString("ascii", jsonEnd + 4, jsonEnd + 8);
      throw new Error(`expected BIN chunk, got '${got}' (bytes: ${Array.from(buf.subarray(jsonEnd + 4, jsonEnd + 8))})`);
    }
    const binStart = jsonEnd + 8;
    binChunk = buf.subarray(binStart, binStart + binLen);
  }

  return { totalLength, jsonObj, binChunk };
}

function buildGlb(jsonObj, binChunk) {
  const jsonStr = JSON.stringify(jsonObj);
  let jsonBuf = Buffer.from(jsonStr, "utf8");
  const pad = (4 - (jsonBuf.length % 4)) % 4;
  if (pad > 0) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad, 0x20)]);

  let binPaddedBuf = null;
  if (binChunk) {
    const binPad = (4 - (binChunk.length % 4)) % 4;
    binPaddedBuf = binPad
      ? Buffer.concat([binChunk, Buffer.alloc(binPad, 0)])
      : binChunk;
  }
  const binChunkLen = binPaddedBuf ? binPaddedBuf.length : 0;
  const totalLength = 12 + 8 + jsonBuf.length + (binPaddedBuf ? 8 + binChunkLen : 0);

  const out = Buffer.alloc(totalLength);
  out.write("glTF", 0, "ascii");
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(totalLength, 8);

  out.writeUInt32LE(jsonBuf.length, 12);
  out.write("JSON", 16, "ascii");
  jsonBuf.copy(out, 20);

  if (binPaddedBuf) {
    let off = 20 + jsonBuf.length;
    out.writeUInt32LE(binChunkLen, off);
    // Chunk type "BIN" + 0x00 NUL pad byte (4 bytes total). This matches
    // what obj2gltf (P1.04 source) and Blender's glTF exporter (P1.05/06
    // source) both produce, so the pipeline output is byte-stable.
    out.write("BIN", off + 4, "ascii");
    out[off + 7] = 0x00;
    binPaddedBuf.copy(out, off + 8);
  }
  return out;
}

// ---- Pre-LOD metadata snapshot -------------------------------------------

function snapshotPreLod() {
  const meshRoot = path.join(REPO_ROOT, "data", "canonical", "meshes");
  const dirs = fs
    .readdirSync(meshRoot)
    .filter((d) => d.startsWith("uberon_"))
    .sort();
  const out = {};
  for (const d of dirs) {
    const glb = path.join(meshRoot, d, "lod0.glb");
    if (!fs.existsSync(glb)) continue;
    const { jsonObj } = parseGlb(fs.readFileSync(glb));
    out[d] = {
      asset: {
        copyright: jsonObj.asset?.copyright ?? null,
        extras: jsonObj.asset?.extras ?? null,
      },
      bytes: fs.statSync(glb).size,
      meshes: (jsonObj.meshes || []).length,
    };
  }
  fs.writeFileSync(PRE_LOD_META_PATH, JSON.stringify(out, null, 2));
  console.log(`LOD snapshot written: ${PRE_LOD_META_PATH} (${Object.keys(out).length} glbs)`);
}

// ---- Re-injection (one LOD file at a time) -------------------------------

/**
 * Re-inject attribution into one LOD file (LOD1 or LOD2).
 *
 * @param {string} dirName      Mesh directory name (e.g. "uberon_0000981")
 * @param {string} lodLabel     "lod1" or "lod2"
 * @param {object} originalMeta The LOD0 metadata snapshot for this dir.
 * @param {object} lodTelemetry The per-LOD telemetry row from decimate-telemetry.json.
 */
function reinjectOneLod(dirName, lodLabel, originalMeta, lodTelemetry) {
  const lodFileName = `${lodLabel}.glb`;
  const glbPath = path.join(REPO_ROOT, "data", "canonical", "meshes", dirName, lodFileName);
  if (!fs.existsSync(glbPath)) {
    return { dir: dirName, lod: lodLabel, status: "skip", reason: "file not found" };
  }

  const buf = fs.readFileSync(glbPath);
  const { jsonObj, binChunk } = parseGlb(buf);

  // Determine which edit tag(s) to append.
  // Default to the LOD-level standard tag. If any mesh had a fallback,
  // append the fallback tag as well (so the chain shows both intent + actual).
  const editsToAppend = [];
  if (lodLabel === "lod1") {
    editsToAppend.push(LOD1_EDIT_TAG);
  } else if (lodLabel === "lod2") {
    editsToAppend.push(LOD2_EDIT_TAG);
    if (lodTelemetry.fallback_applied > 0) {
      editsToAppend.push(LOD2_FALLBACK_EDIT_TAG);
    }
  }

  // Build edits[] history starting from the LOD0 chain.
  const originalEdits = originalMeta.asset?.extras?.source?.edits;
  const edits = Array.isArray(originalEdits) ? [...originalEdits] : [];
  for (const tag of editsToAppend) {
    if (!edits.includes(tag)) edits.push(tag);
  }

  // Restore the asset block.
  jsonObj.asset = jsonObj.asset || {};
  jsonObj.asset.copyright = originalMeta.asset.copyright || EXPECTED_COPYRIGHT;
  jsonObj.asset.extras = jsonObj.asset.extras || {};

  const originalSource = originalMeta.asset?.extras?.source;
  if (originalSource) {
    // Preserve the LOD0 cleanup_telemetry (P1.05 telemetry) AND add the
    // current LOD's decimate_telemetry alongside it. The two coexist so
    // the LOD file is self-describing.
    const carryThrough = { ...originalSource };
    jsonObj.asset.extras.source = {
      ...carryThrough,
      edits,
      [`${lodLabel}_at`]: REINJECT_DATE,
      [`${lodLabel}_telemetry`]: {
        ratio: lodTelemetry.ratio,
        fallback_applied: lodTelemetry.fallback_applied,
        mesh_count: lodTelemetry.mesh_count,
        tris_before: lodTelemetry.tris_before,
        tris_after: lodTelemetry.tris_after,
        bytes: lodTelemetry.bytes,
        per_mesh: lodTelemetry.meshes.map((m) => ({
          name: m.name,
          tris_before: m.tris_before,
          tris_after: m.tris_after,
          ratio_applied: m.ratio_applied,
          action: m.action,
        })),
        notes: lodTelemetry.notes || [],
      },
    };
  } else {
    jsonObj.asset.extras.source = {
      source: "BodyParts3D",
      license: EXPECTED_LICENSE,
      ingested_at: REINJECT_DATE,
      edits,
    };
  }

  const rebuilt = buildGlb(jsonObj, binChunk);
  fs.writeFileSync(glbPath, rebuilt);

  // Verify by re-parsing.
  const verifyBuf = fs.readFileSync(glbPath);
  const { jsonObj: verifyObj } = parseGlb(verifyBuf);
  const verifyEdits = verifyObj.asset?.extras?.source?.edits || [];

  const okCopyright =
    verifyObj.asset?.copyright === (originalMeta.asset.copyright || EXPECTED_COPYRIGHT);
  const okSource =
    verifyObj.asset?.extras?.source?.license === (originalSource?.license || EXPECTED_LICENSE);
  const okAllEditTags = editsToAppend.every((t) => verifyEdits.includes(t));

  return {
    dir: dirName,
    lod: lodLabel,
    bytes: rebuilt.length,
    status: "ok",
    ok_copyright: okCopyright,
    ok_source: okSource,
    ok_edit_tags: okAllEditTags,
    edits: verifyEdits,
  };
}

function reinjectAll() {
  if (!fs.existsSync(PRE_LOD_META_PATH)) {
    throw new Error(
      `pre-LOD metadata not found: ${PRE_LOD_META_PATH}\nRun: node reinject_attribution.mjs --snapshot first.`,
    );
  }
  if (!fs.existsSync(TELEMETRY_PATH)) {
    throw new Error(
      `decimate telemetry not found: ${TELEMETRY_PATH}\nRun the Blender pass first.`,
    );
  }
  const preLodMeta = JSON.parse(fs.readFileSync(PRE_LOD_META_PATH, "utf8"));
  const telemetry = JSON.parse(fs.readFileSync(TELEMETRY_PATH, "utf8"));

  const successes = telemetry.results.filter((r) => r.status === "ok");
  const reports = [];
  let passCount = 0;
  let failCount = 0;

  for (const row of successes) {
    const dir = row.uberon_id;
    const meta = preLodMeta[dir];
    if (!meta) {
      console.log(`  SKIP ${dir} -- no pre-LOD metadata snapshot`);
      failCount++;
      continue;
    }
    for (const lod of ["lod1", "lod2"]) {
      try {
        const r = reinjectOneLod(dir, lod, meta, row[lod]);
        reports.push(r);
        const ok = r.ok_copyright && r.ok_source && r.ok_edit_tags;
        if (ok) passCount++;
        else failCount++;
        console.log(
          `  ${ok ? "OK" : "FAIL"} ${dir}/${lod}.glb ` +
            `(copyright=${r.ok_copyright} source=${r.ok_source} edits=${r.ok_edit_tags})`,
        );
      } catch (err) {
        console.log(`  FAIL ${dir}/${lod}.glb: ${err.message}`);
        failCount++;
      }
    }
  }

  const out = { reinjected: reports.length, pass: passCount, fail: failCount, reports };
  fs.writeFileSync(
    path.join(__dirname, "reinject-report.json"),
    JSON.stringify(out, null, 2),
  );
  console.log("\n=== reinject summary ===");
  console.log(JSON.stringify({ reinjected: out.reinjected, pass: passCount, fail: failCount }, null, 2));
  return failCount === 0 ? 0 : 1;
}

// ---- CLI -----------------------------------------------------------------

const arg = process.argv[2];
if (arg === "--snapshot") {
  snapshotPreLod();
  process.exit(0);
} else if (arg === "--reinject" || !arg) {
  const rc = reinjectAll();
  process.exit(rc);
} else {
  console.error(`unknown arg: ${arg}`);
  console.error(`usage: node reinject_attribution.mjs [--snapshot|--reinject]`);
  process.exit(2);
}
