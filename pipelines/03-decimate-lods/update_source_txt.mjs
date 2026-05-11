// pipelines/03-decimate-lods/update_source_txt.mjs
// P1.06 step 4: append an LODs (P1.06) section to each successful glb's
// sibling source.txt. Reads decimate-telemetry.json.
//
// Idempotent: if an existing "## LODs (P1.06)" block is present, we replace
// it (so re-runs don't accumulate duplicates). Same pattern as P1.05's
// update_source_txt.mjs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TELEMETRY_PATH = path.join(__dirname, "decimate-telemetry.json");

const LOD_DATE = "2026-05-11";
const LOD_HEADER = "## LODs (P1.06)";
const LOD1_EDIT_TAG = "blender_5.1.1_decimate:lod1_ratio_0.5";
const LOD2_EDIT_TAG = "blender_5.1.1_decimate:lod2_ratio_0.1";
const LOD2_FALLBACK_EDIT_TAG = "blender_5.1.1_decimate:lod2_ratio_0.3_fallback";

function pad(n, w) {
  return String(n).padStart(w, " ");
}

function renderLodBlock(row) {
  const lod0 = row.lod0;
  const lod1 = row.lod1;
  const lod2 = row.lod2;

  const lod1SmallSkips = lod1.meshes.filter((m) => m.action === "skip_small_mesh").length;
  const lod2Degenerates = lod2.fallback_applied;

  const editTagsLines = [];
  editTagsLines.push(`  ${LOD1_EDIT_TAG}`);
  editTagsLines.push(`  ${LOD2_EDIT_TAG}`);
  if (lod2Degenerates > 0) editTagsLines.push(`  ${LOD2_FALLBACK_EDIT_TAG}`);

  const meshDetailLines = [];
  // Pair LOD1 + LOD2 per mesh name for the same-mesh per-LOD ratios.
  const lod1ByName = new Map(lod1.meshes.map((m) => [m.name, m]));
  const lod2ByName = new Map(lod2.meshes.map((m) => [m.name, m]));
  const allNames = Array.from(new Set([...lod1ByName.keys(), ...lod2ByName.keys()]));
  for (const name of allNames) {
    const m1 = lod1ByName.get(name);
    const m2 = lod2ByName.get(name);
    const lod0Tris = m1?.tris_before ?? m2?.tris_before ?? 0;
    const lod1Tris = m1?.tris_after ?? "n/a";
    const lod2Tris = m2?.tris_after ?? "n/a";
    const lod1Note = m1?.action !== "decimate" ? ` (${m1?.action})` : "";
    const lod2Note = m2?.action !== "decimate" ? ` (${m2?.action})` : "";
    meshDetailLines.push(
      `    ${name}: LOD0=${lod0Tris} -> LOD1=${lod1Tris}${lod1Note} -> LOD2=${lod2Tris}${lod2Note}`,
    );
  }

  const notesLines = [];
  if (lod1.notes && lod1.notes.length > 0) {
    notesLines.push("  LOD1 notes:");
    for (const n of lod1.notes) notesLines.push(`    - ${n}`);
  }
  if (lod2.notes && lod2.notes.length > 0) {
    notesLines.push("  LOD2 notes:");
    for (const n of lod2.notes) notesLines.push(`    - ${n}`);
  }
  if (notesLines.length === 0) notesLines.push("  (none)");

  const lines = [
    LOD_HEADER,
    "",
    "Pipeline:       pipelines/03-decimate-lods (P1.06)",
    `Generated at:   ${LOD_DATE}`,
    "Tooling:        Blender 5.1.1 headless --background (Decimate modifier, COLLAPSE) + reinject_attribution.mjs (direct GLB JSON-chunk surgery)",
    "Ratios used:",
    `  LOD1: ${0.5} (target ~50% of LOD0 triangle count)`,
    `  LOD2: ${0.1} (target ~10% of LOD0 triangle count)`,
    `  LOD2 fallback: ${0.3} (applied per-mesh when LOD2 below ${20} tris)`,
    "Sanity guards:",
    `  small-mesh skip (LOD1): mesh tris < ${100}`,
    `  degenerate fallback (LOD2): mesh tris < ${20} after decimate -> redo at 0.3`,
    "",
    "Per-LOD totals:",
    `  LOD0:  tris=${pad(lod0.tris, 7)}  bytes=${pad(lod0.bytes, 8)}  meshes=${lod0.mesh_count}`,
    `  LOD1:  tris=${pad(lod1.tris_after, 7)}  bytes=${pad(lod1.bytes, 8)}  meshes=${lod1.mesh_count}` +
      (lod1SmallSkips > 0 ? `  (small-mesh skips: ${lod1SmallSkips})` : ""),
    `  LOD2:  tris=${pad(lod2.tris_after, 7)}  bytes=${pad(lod2.bytes, 8)}  meshes=${lod2.mesh_count}` +
      (lod2Degenerates > 0 ? `  (fallback ratio 0.3 applied to ${lod2Degenerates} mesh${lod2Degenerates === 1 ? "" : "es"})` : ""),
    "",
    "Per-mesh triangle counts (LOD0 -> LOD1 -> LOD2):",
    ...meshDetailLines,
    "",
    "Notes:",
    ...notesLines,
    "",
    "Edit tags (also in glb's asset.extras.source.edits[]):",
    ...editTagsLines,
    "",
  ];
  return lines.join("\n");
}

function updateOne(row) {
  const dir = path.join(REPO_ROOT, row.rel_dir);
  const sourceTxtPath = path.join(dir, "source.txt");
  if (!fs.existsSync(sourceTxtPath)) {
    return { dir: row.rel_dir, status: "skip", reason: "no source.txt" };
  }
  let content = fs.readFileSync(sourceTxtPath, "utf8");

  // If an existing LOD block exists, replace it.
  const headerIdx = content.indexOf(LOD_HEADER);
  if (headerIdx !== -1) {
    const after = content.indexOf("\n## ", headerIdx + LOD_HEADER.length);
    const cutEnd = after === -1 ? content.length : after + 1;
    content = content.slice(0, headerIdx) + content.slice(cutEnd);
    content = content.replace(/[\r\n]+$/, "") + "\n\n";
  } else {
    if (!content.endsWith("\n\n")) {
      content = content.replace(/[\r\n]+$/, "") + "\n\n";
    }
  }
  content = content + renderLodBlock(row);
  fs.writeFileSync(sourceTxtPath, content);
  return { dir: row.rel_dir, status: "ok" };
}

function main() {
  if (!fs.existsSync(TELEMETRY_PATH)) {
    console.error(`decimate telemetry not found: ${TELEMETRY_PATH}`);
    process.exit(2);
  }
  const t = JSON.parse(fs.readFileSync(TELEMETRY_PATH, "utf8"));
  const successes = t.results.filter((r) => r.status === "ok");
  const reports = successes.map(updateOne);
  const ok = reports.filter((r) => r.status === "ok").length;
  const skip = reports.filter((r) => r.status === "skip").length;
  console.log(`source.txt updated (P1.06 LODs block): ${ok} files`);
  if (skip > 0) console.log(`source.txt skipped: ${skip} (no existing source.txt)`);
  process.exit(0);
}

main();
