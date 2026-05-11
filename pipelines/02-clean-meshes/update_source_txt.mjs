// pipelines/02-clean-meshes/update_source_txt.mjs
// P1.05 step 4: append a cleanup record to each successful glb's
// sibling source.txt. Reads clean-telemetry.json.
//
// The appended block follows the existing P1.04 source.txt format
// (see e.g. data/canonical/meshes/uberon_0000981/source.txt for the
// human-readable layout). We add a "## Cleanup (P1.05)" section.
//
// Idempotent: if the cleanup section already exists for the same
// date, we replace it (so re-runs don't accumulate duplicates).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TELEMETRY_PATH = path.join(__dirname, "clean-telemetry.json");

const CLEANUP_DATE = "2026-05-11";
const CLEANUP_HEADER = "## Cleanup (P1.05)";
const CLEANUP_EDIT_TAG = "blender_5.1.1_cleanup:remove_doubles+normals_make_consistent";

function renderCleanupBlock(row) {
  const lines = [
    CLEANUP_HEADER,
    "",
    `Pipeline:       pipelines/02-clean-meshes (P1.05)`,
    `Cleaned at:     ${CLEANUP_DATE}`,
    `Tooling:        Blender 5.1.1 headless --background + reinject_attribution.mjs (direct GLB JSON-chunk surgery)`,
    `Edits applied:`,
    `  - remove_doubles (threshold 1e-4 m / 0.1 mm)`,
    `  - normals_make_consistent (inside=False)`,
    `  - non_manifold_logged (no auto-delete)`,
    ``,
    `Geometry:`,
    `  Mesh objects:       ${row.mesh_count}`,
    `  Vertices before:    ${row.verts_before}`,
    `  Vertices after:     ${row.verts_after}  (delta ${row.verts_after - row.verts_before})`,
    `  Triangles before:   ${row.tris_before}`,
    `  Triangles after:    ${row.tris_after}  (delta ${row.tris_after - row.tris_before})`,
    `  Non-manifold edges: ${row.non_manifold_edges}`,
    `  Non-manifold verts: ${row.non_manifold_verts}`,
    ``,
    `Filesize:`,
    `  Bytes before:       ${row.bytes_before}`,
    `  Bytes after:        ${row.bytes_after}  (delta ${row.bytes_after - row.bytes_before})`,
    ``,
    `Edit tag (also in glb's asset.extras.source.edits[]):`,
    `  ${CLEANUP_EDIT_TAG}`,
    ``,
  ];
  return lines.join("\n");
}

function updateOne(row) {
  // row.rel_path looks like "data/canonical/meshes/uberon_0000981/lod0.glb"
  const dir = path.join(REPO_ROOT, path.dirname(row.rel_path));
  const sourceTxtPath = path.join(dir, "source.txt");
  if (!fs.existsSync(sourceTxtPath)) {
    return { rel: row.rel_path, status: "skip", reason: "no source.txt" };
  }
  let content = fs.readFileSync(sourceTxtPath, "utf8");

  // If an existing P1.05 block exists, replace it. We delimit it from
  // the next ## heading or end-of-file.
  const headerIdx = content.indexOf(CLEANUP_HEADER);
  if (headerIdx !== -1) {
    // Find next "## " after the header.
    const after = content.indexOf("\n## ", headerIdx + CLEANUP_HEADER.length);
    const cutEnd = after === -1 ? content.length : after + 1;
    content = content.slice(0, headerIdx) + content.slice(cutEnd);
    // Trim trailing whitespace if we cut at EOF.
    content = content.replace(/[\r\n]+$/, "") + "\n\n";
  } else {
    // Make sure there's a blank line before our block.
    if (!content.endsWith("\n\n")) {
      content = content.replace(/[\r\n]+$/, "") + "\n\n";
    }
  }
  content = content + renderCleanupBlock(row);
  fs.writeFileSync(sourceTxtPath, content);
  return { rel: row.rel_path, status: "ok" };
}

function main() {
  if (!fs.existsSync(TELEMETRY_PATH)) {
    console.error(`clean telemetry not found: ${TELEMETRY_PATH}`);
    process.exit(2);
  }
  const t = JSON.parse(fs.readFileSync(TELEMETRY_PATH, "utf8"));
  const successes = t.results.filter((r) => r.status === "ok");
  const reports = successes.map(updateOne);
  const ok = reports.filter((r) => r.status === "ok").length;
  const skip = reports.filter((r) => r.status === "skip").length;
  console.log(`source.txt updated: ${ok} files`);
  if (skip > 0) console.log(`source.txt skipped: ${skip} (no existing source.txt)`);
  process.exit(0);
}

main();
