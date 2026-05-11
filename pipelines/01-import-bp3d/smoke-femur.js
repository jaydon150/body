// Smoke test: convert just the femur (UBERON:0000981, FMA:9611,
// FJ3259 + FJ3365) end-to-end, then parse the resulting glb header
// and verify asset.copyright is set.

const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const obj2gltf = require("obj2gltf");
const { processGlb } = require("gltf-pipeline");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ZIP_PATH = path.join(REPO_ROOT, "data", "raw", "bodyparts3d", "isa_BP3D_4.0_obj_99.zip");
const TMP = path.join(__dirname, ".cache", "smoke");
const OUT_GLB = path.join(TMP, "femur.glb");

const COPYRIGHT = "BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan";

fs.mkdirSync(TMP, { recursive: true });
const zip = new AdmZip(ZIP_PATH);

function extractObj(fj, out) {
  const entry = zip.getEntry(`isa_BP3D_4.0_obj_99/${fj}.obj`);
  if (!entry) throw new Error(`${fj}.obj not in zip`);
  fs.writeFileSync(out, entry.getData());
}

function mergeObjs(objPaths, outPath) {
  let vOffset = 0, vnOffset = 0, vtOffset = 0;
  const out = [];
  for (let i = 0; i < objPaths.length; i++) {
    const raw = fs.readFileSync(objPaths[i], "utf8");
    let localV = 0, localVn = 0, localVt = 0;
    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith("#") || line.trim() === "") { if (i===0) out.push(line); continue; }
      if (line.startsWith("v ")) { localV++; out.push(line); }
      else if (line.startsWith("vn ")) { localVn++; out.push(line); }
      else if (line.startsWith("vt ")) { localVt++; out.push(line); }
      else if (line.startsWith("f ")) {
        const tokens = line.split(/\s+/);
        const remap = [tokens[0]];
        for (let t = 1; t < tokens.length; t++) {
          const tok = tokens[t]; if (!tok) continue;
          const parts = tok.split("/");
          const vi = parts[0] ? parseInt(parts[0],10)+vOffset : "";
          const vti = parts[1] ? parseInt(parts[1],10)+vtOffset : "";
          const vni = parts[2] ? parseInt(parts[2],10)+vnOffset : "";
          let s = String(vi);
          if (parts.length>=2) s += "/" + (parts[1] ? vti : "");
          if (parts.length>=3) s += "/" + (parts[2] ? vni : "");
          remap.push(s);
        }
        out.push(remap.join(" "));
      } else if (line.startsWith("g ") || line.startsWith("o ")) { out.push(`g part_${i}`); }
    }
    vOffset += localV; vnOffset += localVn; vtOffset += localVt;
  }
  fs.writeFileSync(outPath, out.join("\n"));
}

async function run() {
  const a = path.join(TMP, "FJ3259.obj");
  const b = path.join(TMP, "FJ3365.obj");
  extractObj("FJ3259", a);
  extractObj("FJ3365", b);
  const merged = path.join(TMP, "femur_merged.obj");
  mergeObjs([a, b], merged);
  console.log("Merged OBJ size:", fs.statSync(merged).size);

  const glb = await obj2gltf(merged, { binary: true, separate: false });
  console.log("Initial glb buffer size:", glb.length, "isBuffer:", Buffer.isBuffer(glb));

  const provenance = {
    source: "BodyParts3D",
    license: "CC-BY-SA-2.1-JP",
    original_id: "FJ3259+FJ3365",
    fma_id: "FMA:9611",
    ingested_at: "2026-05-11",
    edits: ["obj_to_glb_conversion", "merged_2_fj_obj_into_one_glb"],
  };

  const result = await processGlb(glb, {
    customStages: [
      (gltf) => {
        gltf.asset = gltf.asset || {};
        gltf.asset.copyright = COPYRIGHT;
        gltf.asset.extras = Object.assign({}, gltf.asset.extras || {}, { source: provenance });
        return gltf;
      },
    ],
  });
  fs.writeFileSync(OUT_GLB, result.glb);

  // Parse the glb header back to verify asset.copyright is present.
  const buf = fs.readFileSync(OUT_GLB);
  const magic = buf.toString("ascii", 0, 4);
  const version = buf.readUInt32LE(4);
  const length = buf.readUInt32LE(8);
  const jsonLength = buf.readUInt32LE(12);
  const jsonChunkType = buf.toString("ascii", 16, 20);
  const json = buf.toString("utf8", 20, 20 + jsonLength);
  console.log("glb magic:", magic, "version:", version, "total length:", length);
  console.log("JSON chunk type:", jsonChunkType, "JSON length:", jsonLength);

  const parsed = JSON.parse(json);
  console.log("\nasset section:");
  console.log(JSON.stringify(parsed.asset, null, 2));

  if (parsed.asset.copyright !== COPYRIGHT) {
    console.error("FAIL: copyright not set correctly");
    process.exit(1);
  }
  if (!parsed.asset.extras || !parsed.asset.extras.source || parsed.asset.extras.source.original_id !== "FJ3259+FJ3365") {
    console.error("FAIL: extras.source not set correctly");
    process.exit(1);
  }
  console.log("\nSMOKE TEST PASS. glb size:", buf.length);
}

run().catch((e) => { console.error(e); process.exit(1); });
