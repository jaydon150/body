"""
pipelines/02-clean-meshes/clean_glbs.py
P1.05: Blender headless mesh cleanup for the 79 canonical BP3D-derived glbs.

Invocation (from any cwd):
    & "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" \\
        --background --python clean_glbs.py

Per the asset-pipeline agent prompt + ADR 0006:

- For every mesh object inside each glb (paired bones have 2+ mesh objects),
  weld duplicate vertices, recompute normals outside, count non-manifold
  edges/verts (do NOT delete -- could destroy real anatomical detail).
- Preserve the multi-mesh structure (laterality).
- Export back to glb (binary).
- Blender's glTF exporter overwrites asset.copyright with its own string and
  may strip asset.extras. The Node-side companion script
  `reinject_attribution.mjs` post-processes each cleaned glb to restore
  attribution from the original.
- Per-file telemetry is written to clean-telemetry.json next to this script
  so the Node script can pair (original_metadata, cleaned_glb_path).

Hard rules respected:
- Do NOT decimate (P1.06 owns that).
- Do NOT smooth shading. Do NOT recompute UVs. Do NOT merge meshes.
- Weld + normals-outside + log non-manifold only.

Output:
- Each glb at data/canonical/meshes/<dir>/lod0.glb is rewritten in place
  with a sibling `lod0.glb.original-backup` produced before the operation
  (deleted on success; preserved on failure so the original survives).
- clean-telemetry.json with per-file before/after stats and non-manifold
  counts.
"""

from __future__ import annotations

import bpy
import json
import os
import shutil
import sys
import time
import traceback
from pathlib import Path


# ----- Paths --------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
MESH_ROOT = REPO_ROOT / "data" / "canonical" / "meshes"
TELEMETRY_PATH = SCRIPT_DIR / "clean-telemetry.json"

# Optional override: a single glb id (e.g. "uberon_0000981") for smoke testing.
SMOKE_TARGET = os.environ.get("CLEAN_SMOKE_TARGET", "").strip() or None

# Vertex-weld threshold in metres. BP3D meshes are roughly human-scale (~1-2m).
# 0.0001 m = 0.1 mm. Conservative -- only welds true duplicates.
WELD_THRESHOLD = 1e-4


# ----- Blender helpers ----------------------------------------------------

def reset_scene() -> None:
    """Wipe the scene clean before importing the next glb."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(glb_path: Path) -> list[bpy.types.Object]:
    """Import the glb and return the list of mesh objects in scene."""
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def mesh_stats(obj: bpy.types.Object) -> dict:
    """Return vertex / triangle counts for a single mesh object."""
    me = obj.data
    # Triangulated face count: each polygon contributes (loop_count - 2) tris.
    tri = sum(max(0, len(p.vertices) - 2) for p in me.polygons)
    return {
        "name": obj.name,
        "verts": len(me.vertices),
        "faces": len(me.polygons),
        "tris": tri,
    }


def select_only(obj: bpy.types.Object) -> None:
    """Make obj the active + only-selected object."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def clean_one_mesh(obj: bpy.types.Object) -> dict:
    """
    Run the three cleanup ops against one mesh object.
    Returns per-mesh telemetry:
      {
        before: {verts, faces, tris},
        after:  {verts, faces, tris},
        non_manifold_edges: int,
        non_manifold_verts: int,
      }
    """
    before = mesh_stats(obj)

    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")

    # 1. Weld duplicate vertices.
    bpy.ops.mesh.remove_doubles(threshold=WELD_THRESHOLD)

    # 2. Recompute normals outside.
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)

    # 3. Count non-manifold edges (logs only; we never auto-delete).
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.mesh.select_mode(type="EDGE")
    # select_non_manifold accepts kwargs filtering which kinds we want.
    bpy.ops.mesh.select_non_manifold(
        extend=False,
        use_wire=True,
        use_boundary=False,  # boundary edges are expected on open meshes
        use_multi_face=True,
        use_non_contiguous=True,
        use_verts=False,
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    non_manifold_edges = sum(1 for e in obj.data.edges if e.select)

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.mesh.select_mode(type="VERT")
    bpy.ops.mesh.select_non_manifold(extend=False, use_wire=True, use_verts=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    non_manifold_verts = sum(1 for v in obj.data.vertices if v.select)

    after = mesh_stats(obj)

    return {
        "before": before,
        "after": after,
        "non_manifold_edges": non_manifold_edges,
        "non_manifold_verts": non_manifold_verts,
    }


def export_glb(glb_path: Path) -> None:
    """Export all mesh objects in the scene back to glb (binary)."""
    # Select all mesh objects so the exporter only writes geometry from them.
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        # Geometry-only -- we restore attribution post-process via Node.
        export_extras=False,
        export_copyright="",
    )


# ----- Main loop ----------------------------------------------------------

def find_targets() -> list[Path]:
    """Return list of (uberon_dir, lod0.glb) tuples to process."""
    if SMOKE_TARGET:
        glb = MESH_ROOT / SMOKE_TARGET / "lod0.glb"
        if not glb.is_file():
            raise FileNotFoundError(f"smoke target not found: {glb}")
        return [glb]
    return sorted(MESH_ROOT.glob("uberon_*/lod0.glb"))


def process_glb(glb_path: Path) -> dict:
    """
    Process one glb in place. Returns telemetry dict.
    On any exception, restores the backup so the original glb is intact.
    """
    rel = glb_path.relative_to(REPO_ROOT)
    backup = glb_path.with_suffix(".glb.original-backup")
    started = time.time()

    # Before-snapshot from the original file size + glb-header parse comes
    # from the Node side. Here we just record bytes.
    orig_bytes = glb_path.stat().st_size

    try:
        # Make a safety backup so we can roll back on any failure.
        shutil.copy2(glb_path, backup)

        reset_scene()
        meshes = import_glb(glb_path)
        if not meshes:
            raise RuntimeError("no mesh objects after import")

        # Switch to object mode if Blender left us in some other state.
        if bpy.context.object and bpy.context.object.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")

        per_mesh = []
        for obj in meshes:
            per_mesh.append(clean_one_mesh(obj))

        # Re-export (overwrites the glb on disk).
        # Make sure we're in object mode for export.
        if bpy.context.object and bpy.context.object.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        export_glb(glb_path)

        new_bytes = glb_path.stat().st_size
        elapsed = time.time() - started

        # All good -- remove backup.
        try:
            backup.unlink()
        except OSError:
            pass

        verts_before = sum(m["before"]["verts"] for m in per_mesh)
        verts_after = sum(m["after"]["verts"] for m in per_mesh)
        tris_before = sum(m["before"]["tris"] for m in per_mesh)
        tris_after = sum(m["after"]["tris"] for m in per_mesh)
        nm_edges = sum(m["non_manifold_edges"] for m in per_mesh)
        nm_verts = sum(m["non_manifold_verts"] for m in per_mesh)

        print(
            f"  OK  {rel} | meshes={len(per_mesh)} "
            f"verts {verts_before}->{verts_after} ({verts_after - verts_before:+d}) "
            f"tris {tris_before}->{tris_after} ({tris_after - tris_before:+d}) "
            f"non_manifold edges={nm_edges} verts={nm_verts} "
            f"bytes {orig_bytes}->{new_bytes} ({new_bytes - orig_bytes:+d}) "
            f"in {elapsed:.2f}s"
        )

        return {
            "rel_path": str(rel).replace("\\", "/"),
            "status": "ok",
            "mesh_count": len(per_mesh),
            "meshes": per_mesh,
            "verts_before": verts_before,
            "verts_after": verts_after,
            "tris_before": tris_before,
            "tris_after": tris_after,
            "non_manifold_edges": nm_edges,
            "non_manifold_verts": nm_verts,
            "bytes_before": orig_bytes,
            "bytes_after": new_bytes,
            "elapsed_seconds": round(elapsed, 3),
        }

    except Exception as exc:
        # Restore the original glb from backup.
        try:
            if backup.is_file():
                shutil.copy2(backup, glb_path)
                backup.unlink()
        except OSError:
            pass
        print(f"  FAIL {rel}: {exc}")
        traceback.print_exc(file=sys.stdout)
        return {
            "rel_path": str(rel).replace("\\", "/"),
            "status": "fail",
            "error": f"{type(exc).__name__}: {exc}",
            "bytes_before": orig_bytes,
        }


def main() -> int:
    if not MESH_ROOT.is_dir():
        print(f"FATAL: mesh root not found: {MESH_ROOT}")
        return 2

    targets = find_targets()
    print(f"P1.05 Blender cleanup -- {len(targets)} target(s)")
    print(f"  weld threshold:   {WELD_THRESHOLD} m")
    print(f"  blender version:  {bpy.app.version_string}")
    print(f"  mesh root:        {MESH_ROOT}")
    print()

    started = time.time()
    results = []
    for i, glb in enumerate(targets, 1):
        print(f"[{i}/{len(targets)}] {glb.parent.name}")
        results.append(process_glb(glb))

    elapsed = time.time() - started
    successes = [r for r in results if r["status"] == "ok"]
    failures = [r for r in results if r["status"] == "fail"]

    summary = {
        "blender_version": bpy.app.version_string,
        "weld_threshold_metres": WELD_THRESHOLD,
        "total_glbs": len(targets),
        "successes": len(successes),
        "failures": len(failures),
        "elapsed_seconds": round(elapsed, 3),
        "verts_before_total": sum(r.get("verts_before", 0) for r in successes),
        "verts_after_total": sum(r.get("verts_after", 0) for r in successes),
        "tris_before_total": sum(r.get("tris_before", 0) for r in successes),
        "tris_after_total": sum(r.get("tris_after", 0) for r in successes),
        "bytes_before_total": sum(r.get("bytes_before", 0) for r in successes),
        "bytes_after_total": sum(r.get("bytes_after", 0) for r in successes),
        "non_manifold_edges_total": sum(r.get("non_manifold_edges", 0) for r in successes),
        "non_manifold_verts_total": sum(r.get("non_manifold_verts", 0) for r in successes),
        "smoke_target": SMOKE_TARGET,
    }

    payload = {"summary": summary, "results": results}
    TELEMETRY_PATH.write_text(json.dumps(payload, indent=2))

    print()
    print("=== P1.05 Blender summary ===")
    print(json.dumps(summary, indent=2))
    print(f"\nTelemetry written: {TELEMETRY_PATH}")

    return 0 if not failures else 1


if __name__ == "__main__":
    rc = main()
    # Blender doesn't exit with our return code by default in --background;
    # call sys.exit to make sure orchestration sees the status.
    sys.exit(rc)
