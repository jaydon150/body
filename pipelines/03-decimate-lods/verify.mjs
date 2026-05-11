// pipelines/03-decimate-lods/verify.mjs
// P1.06 verification: parse 3 sample LOD chains (femur, mandible, rib 8)
// across all three LOD levels and confirm:
//   - LOD0/LOD1/LOD2 each carry asset.copyright (verbatim BodyParts3D attribution)
//   - LOD0 edits[] -> contains P1.04 conversion + P1.05 cleanup tags
//   - LOD1 edits[] -> also contains the LOD1 decimate tag
//   - LOD2 edits[] -> also contains the LOD2 decimate tag (and optional fallback)
//   - LOD0 tris > LOD1 tris > LOD2 tris (monotonic decreasing)
//   - All three files structurally valid (JSON parses, mesh count > 0)

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

const P104_TAG_CONVERSION = "obj_to_glb_conversion";
const P105_TAG_CLEANUP = "blender_5.1.1_cleanup:remove_doubles+normals_make_consistent";
const LOD1_TAG = "blender_5.1.1_decimate:lod1_ratio_0.5";
const LOD2_TAG = "blender_5.1.1_decimate:lod2_ratio_0.1";

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

function trisForMesh(gltf, mesh) {
  let total = 0;
  for (const prim of mesh.primitives) {
    if (prim.indices != null) {
      total += Math.floor(gltf.accessors[prim.indices].count / 3);
    } else {
      total += Math.floor(gltf.accessors[prim.attributes.POSITION].count / 3);
    }
  }
  return total;
}

function totalTris(gltf) {
  let t = 0;
  for (const m of gltf.meshes || []) t += trisForMesh(gltf, m);
  return t;
}

let pass = 0;
let fail = 0;
const lines = [];

for (const t of TARGETS) {
  console.log(`\n${t.label}`);
  const triBy = {};
  const editsBy = {};
  const okPerLod = {};

  for (const lod of ["lod0", "lod1", "lod2"]) {
    const rel = `data/canonical/meshes/${t.id}/${lod}.glb`;
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) {
      console.log(`  FAIL ${lod}: ${rel} not found`);
      okPerLod[lod] = false;
      continue;
    }
    let info;
    try {
      info = parseGlb(abs);
    } catch (err) {
      console.log(`  FAIL ${lod}: parse error -- ${err.message}`);
      okPerLod[lod] = false;
      continue;
    }
    const a = info.jsonObj.asset || {};
    const src = a.extras?.source;
    const edits = src?.edits || [];
    const meshes = info.jsonObj.meshes || [];
    const tris = totalTris(info.jsonObj);

    triBy[lod] = tris;
    editsBy[lod] = edits;

    const okCopyright = a.copyright === EXPECTED_COPYRIGHT;
    const okMeshes = meshes.length > 0;
    const hasP104 = edits.includes(P104_TAG_CONVERSION);
    const hasP105 = edits.includes(P105_TAG_CLEANUP);
    const hasLodTag =
      lod === "lod0" ? true : lod === "lod1" ? edits.includes(LOD1_TAG) : edits.includes(LOD2_TAG);

    okPerLod[lod] = okCopyright && okMeshes && hasP104 && hasP105 && hasLodTag;

    console.log(`  ${lod}:`);
    console.log(`    rel             : ${rel}`);
    console.log(`    file_size       : ${info.fileSize} bytes`);
    console.log(`    mesh count      : ${meshes.length}`);
    console.log(`    triangle total  : ${tris}`);
    console.log(`    asset.copyright : ${a.copyright}`);
    console.log(`    source.edits    : ${JSON.stringify(edits)}`);
  }

  // Monotonic decreasing check.
  const okMonotonic =
    triBy.lod0 != null &&
    triBy.lod1 != null &&
    triBy.lod2 != null &&
    triBy.lod0 > triBy.lod1 &&
    triBy.lod1 > triBy.lod2;

  console.log(
    `  triangle order: LOD0=${triBy.lod0} > LOD1=${triBy.lod1} > LOD2=${triBy.lod2}  ` +
      (okMonotonic ? "(OK)" : "(FAIL monotonic decreasing)"),
  );

  const ok = okPerLod.lod0 && okPerLod.lod1 && okPerLod.lod2 && okMonotonic;
  console.log(`  ${ok ? "PASS" : "FAIL"}`);
  if (ok) pass++;
  else fail++;
  lines.push({ id: t.id, label: t.label, ok, triBy, editsBy });
}

console.log(`\n=== verify P1.06: ${pass} pass, ${fail} fail ===`);
process.exit(fail === 0 ? 0 : 1);
