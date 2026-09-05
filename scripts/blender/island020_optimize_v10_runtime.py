"""Create a phone-safe runtime GLB from the V10 visual-gate export."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


KEEP = (
    "CITY_FLOORS",
    "CITY_MASONRY",
    "CITY_ARCHITECTURE",
    "FORGE_CATHEDRAL",
    "CATHEDRAL_HEAT",
    "CITY_LAVA_ROUTES",
    "PERIMETER_FORGE_DISTRICTS",
    "CATHEDRAL_FACADE_AND_GATE",
    "CATHEDRAL_SMALL_HEAT_WINDOWS",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-glb", required=True)
    parser.add_argument("--output-glb", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def decimate_ratio(name: str) -> float:
    if "LAVA" in name or "HEAT" in name:
        return 0.70
    if "FORGE_CATHEDRAL" in name or "FACADE" in name:
        return 0.48
    if "FLOORS" in name:
        return 0.28
    if "MASONRY" in name:
        return 0.30
    if "ARCHITECTURE" in name or "PERIMETER" in name:
        return 0.34
    return 0.42


def mesh_totals() -> tuple[int, int]:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    return sum(len(obj.data.vertices) for obj in meshes), sum(len(obj.data.polygons) for obj in meshes)


def main() -> None:
    args = parse_args()
    input_glb = str(Path(args.input_glb).expanduser().resolve())
    output_glb = Path(args.output_glb).expanduser().resolve()
    output_glb.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=input_glb)

    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH" or not any(token in obj.name for token in KEEP):
            bpy.data.objects.remove(obj, do_unlink=True)

    before_vertices, before_faces = mesh_totals()
    for obj in [candidate for candidate in bpy.context.scene.objects if candidate.type == "MESH"]:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new(name="I020_V10_PHONE_DECIMATE", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = decimate_ratio(obj.name)
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj["runtime_lod"] = "phone-safe-v10"
        obj["source_family"] = "island-020-rectilinear-terraced-lava-city-v10"
        obj.select_set(False)

    after_vertices, after_faces = mesh_totals()
    bpy.ops.object.select_all(action="DESELECT")
    exports = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for obj in exports:
        obj.select_set(True)
    if exports:
        bpy.context.view_layer.objects.active = exports[0]
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_cameras=False,
        export_lights=False,
        export_apply=True,
        export_yup=True,
    )
    print(
        "ISLAND020_V10_RUNTIME_OPTIMIZED "
        f"objects={len(exports)} vertices={before_vertices}->{after_vertices} "
        f"faces={before_faces}->{after_faces} glb={output_glb}"
    )


if __name__ == "__main__":
    main()
