// pipelines/02-clean-meshes/verify.mjs
// P1.05 verification: parse 3 sample cleaned glbs (femur, mandible, rib 8)
// and confirm:
//   - asset.copyright still reads verbatim BodyParts3D attribution
//   - asset.extras.source.edits[] includes the cleanup edit tag
//   - the structure is still valid (JSON parses, mesh count > 0)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const TARGETS = [
  { id: "uberon_0000981", label: "femur (multi-FJ paired bone)" },
  { id: "uberon_0001684", label: "mandible (single-FJ)" },
  { id: "uberon_0010757", label: "rib 8 (anomaly case)" },
];

const EXPECTED_COPYRIGHT =
  "BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan";
const EXPECTED_EDIT_TAG = "blender_5.1.1_cleanup:remove_doubles+normals_make_consistent";

function parseGlb(p) {
  const buf = fs.readFileSync(p);
  if (buf.toString("ascii", 0, 4) !== "glTF") throw new Error("bad magic");
  const totalLength = buf.readUInt32LE(8);
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.toString("ascii", 16, 20);
  if (jsonType !== "JSON") throw new Error(`bad chunk type: ${jsonType}`);
  const jsonStr = buf.toString("utf8", 20, 20 + jsonLen);
  return { totalLength, fileSize: buf.length, jsonObj: JSON.parse(jsonStr) };
}

let pass = 0, fail = 0;
for (const t of TARGETS) {
  const rel = `data/canonical/meshes/${t.id}/lod0.glb`;
  const abs = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.log(`FAIL ${t.label}: ${rel} not found`);
    fail++;
    continue;
  }
  let info;
  try {
    info = parseGlb(abs);
  } catch (err) {
    console.log(`FAIL ${t.label}: parse error -- ${err.message}`);
    fail++;
    continue;
  }

  const a = info.jsonObj.asset || {};
  const src = a.extras?.source;
  const edits = src?.edits || [];
  const meshes = info.jsonObj.meshes || [];

  console.log(`\n${t.label}`);
  console.log(`  rel             : ${rel}`);
  console.log(`  file_size       : ${info.fileSize} bytes`);
  console.log(`  mesh count      : ${meshes.length}`);
  console.log(`  asset.copyright : ${a.copyright}`);
  console.log(`  source.fma_id   : ${src?.fma_id}`);
  console.log(`  source.original : ${src?.original_id}`);
  console.log(`  source.edits    : ${JSON.stringify(edits)}`);
  console.log(`  source.cleanup_telemetry: ${JSON.stringify(src?.cleanup_telemetry)}`);

  const okCopyright = a.copyright === EXPECTED_COPYRIGHT;
  const okEditTag = edits.includes(EXPECTED_EDIT_TAG);
  const okMeshes = meshes.length > 0;

  if (okCopyright && okEditTag && okMeshes) {
    console.log(`  PASS`);
    pass++;
  } else {
    console.log(`  FAIL  copyright=${okCopyright} edit_tag=${okEditTag} meshes=${okMeshes}`);
    fail++;
  }
}

console.log(`\n=== verify P1.05: ${pass} pass, ${fail} fail ===`);
process.exit(fail === 0 ? 0 : 1);
