// Independent verification: parse the glb header of one mesh (mandible)
// and confirm asset.copyright and asset.extras.source are populated.

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TARGETS = [
  "data/canonical/meshes/uberon_0001684/lod0.glb", // mandible (single-FJ)
  "data/canonical/meshes/uberon_0000981/lod0.glb", // femur (multi-FJ)
  "data/canonical/meshes/uberon_0010757/lod0.glb", // rib 8 anomaly
  "data/canonical/meshes/uberon_4200172/lod0.glb", // neck of humerus (high prefix) -- expected NOT to exist (gap)
];

function parseGlb(p) {
  const buf = fs.readFileSync(p);
  const magic = buf.toString("ascii", 0, 4);
  if (magic !== "glTF") throw new Error(`${p}: bad magic ${magic}`);
  const version = buf.readUInt32LE(4);
  const length = buf.readUInt32LE(8);
  const jsonLength = buf.readUInt32LE(12);
  const jsonChunkType = buf.toString("ascii", 16, 20);
  if (jsonChunkType !== "JSON") throw new Error(`${p}: bad chunk type ${jsonChunkType}`);
  const json = buf.toString("utf8", 20, 20 + jsonLength);
  return { magic, version, length, parsed: JSON.parse(json), fileSize: buf.length };
}

let pass = 0, fail = 0;
for (const rel of TARGETS) {
  const full = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log(`[skip] ${rel} (expected gap)`);
    continue;
  }
  const info = parseGlb(full);
  const a = info.parsed.asset;
  console.log(`\n${rel}`);
  console.log(`  glb size: ${info.fileSize} bytes`);
  console.log(`  asset.copyright: ${a.copyright}`);
  console.log(`  asset.extras.source.fma_id: ${a.extras && a.extras.source && a.extras.source.fma_id}`);
  console.log(`  asset.extras.source.original_id: ${a.extras && a.extras.source && a.extras.source.original_id}`);
  console.log(`  asset.extras.source.license: ${a.extras && a.extras.source && a.extras.source.license}`);
  console.log(`  asset.extras.source.ingested_at: ${a.extras && a.extras.source && a.extras.source.ingested_at}`);
  const expected = "BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan";
  if (a.copyright !== expected) {
    console.log(`  FAIL: copyright mismatch`); fail++; continue;
  }
  if (!a.extras || !a.extras.source || a.extras.source.license !== "CC-BY-SA-2.1-JP") {
    console.log(`  FAIL: license missing`); fail++; continue;
  }
  pass++;
}
console.log(`\n=== verify: ${pass} pass, ${fail} fail ===`);
process.exit(fail > 0 ? 1 : 0);
