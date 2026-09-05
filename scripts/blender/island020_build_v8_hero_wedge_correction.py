"""Apply the one permitted structural correction to Island 020 V8's hero wedge."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import island020_build_v5 as kit
import island020_build_v8_hero_wedge as v8


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--render-dir", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def add_correction_geometry(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    exported: list[bpy.types.Object] = []

    # Attached rock shelves occupy the hero wedge's dead apron and lead the eye
    # back into the keep. They are geological context, not unfrozen quadrants.
    shelves: list[bpy.types.Object] = []
    for i, (x, y, z, sx, sy, sz, rz) in enumerate((
        (3.45, -0.55, 0.58, 4.55, 3.40, 0.56, -0.12),
        (3.82, -2.42, 0.70, 3.55, 1.62, 0.76, 0.10),
        (-4.15, 0.24, 0.64, 3.60, 2.05, 0.66, 0.08),
        (-4.72, -3.72, 0.52, 2.35, 1.72, 0.48, -0.14),
    )):
        shelves.append(kit.add_box(f"I020_V8C_BASALT_SHELF_{i}", (x, y, z), (sx, sy, sz), materials["deep"], bevel=0.20, rotation_z=rz))
    exported.append(v8.joined(shelves, "I020_V8C_ATTACHED_BASALT_SHELVES", "attached-basalt-shelves", "v8c-hero-09"))

    # The west maze is promoted from a handful of walls into a dense, stepped
    # forge district with visible roofs, overpasses and compressed alleys.
    district: list[bpy.types.Object] = []
    modules = (
        (-4.72, -2.60, 1.04, 1.05, 1.18, 1.42), (-4.38, -1.20, 1.28, 1.36, 0.86, 1.88),
        (-3.72, -3.62, 1.10, 1.22, 0.96, 1.52), (-3.42, -0.52, 1.05, 1.28, 0.88, 1.44),
        (-2.72, -3.96, 1.25, 1.12, 0.90, 1.82), (-2.38, -0.68, 1.16, 1.04, 0.92, 1.62),
        (-1.62, -3.02, 1.22, 0.88, 1.24, 1.76), (-1.48, -1.06, 1.08, 0.82, 1.08, 1.48),
    )
    for i, (x, y, z, sx, sy, sz) in enumerate(modules):
        district.append(kit.add_cone(f"I020_V8C_MAZE_FORGE_{i}", (x, y, z), max(sx, sy) * 0.58, max(sx, sy) * 0.48, sz, 8, materials["clay" if i % 3 else "deep"], rotation_z=math.pi / 8, bevel=0.06))
        district.append(v8.add_cylinder(f"I020_V8C_MAZE_FORGE_LIP_{i}", (x, y, z + sz * 0.53), max(sx, sy) * 0.62, 0.20, materials["iron"], 8))
    for i, (x, y, sx, sy, z) in enumerate((
        (-3.92, -2.05, 2.55, 0.42, 2.18), (-2.65, -2.82, 0.46, 2.48, 1.82),
        (-2.86, -1.23, 2.26, 0.38, 2.42), (-1.95, -2.12, 0.38, 1.72, 2.26),
    )):
        district.append(kit.add_box(f"I020_V8C_MAZE_OVERPASS_{i}", (x, y, z), (sx, sy, 0.34), materials["iron"], bevel=0.065))
        district.append(kit.add_box(f"I020_V8C_MAZE_OVERPASS_RAIL_{i}", (x, y, z + 0.30), (sx * 1.02, sy * 1.02, 0.22), materials["deep"], bevel=0.035))
    exported.append(v8.joined(district, "I020_V8C_DENSE_FORGE_DISTRICT", "corrected-dense-forge-maze", "v8c-hero-10"))

    # Small embedded heat seams make the maze part of the same molten machine.
    molten: list[bpy.types.Object] = []
    molten.append(v8.add_flow_tube("I020_V8C_MAZE_FLOW_A", [(-4.65, -3.52, 0.80), (-3.92, -3.08, 0.76), (-3.10, -2.82, 0.70), (-2.28, -2.55, 0.63), (-1.38, -2.42, 0.56)], 0.15, materials["molten"], "maze-molten-flow", "v8c-hero-11"))
    molten.append(v8.add_flow_tube("I020_V8C_MAZE_FLOW_B", [(-4.15, -0.64, 0.84), (-3.45, -1.12, 0.76), (-3.16, -1.85, 0.70), (-2.82, -2.62, 0.65)], 0.11, materials["hot"], "maze-molten-flow", "v8c-hero-11"))
    exported.append(v8.joined(molten, "I020_V8C_MAZE_MOLTEN_FLOWS", "maze-molten-flow", "v8c-hero-11"))

    # A secondary furnace shoulder and cross-bridges bind the tower to the
    # district, removing the isolated chess-piece silhouette.
    machinery: list[bpy.types.Object] = []
    for i, (x, y, z, r, h) in enumerate(((2.55, 0.62, 2.10, 0.72, 3.30), (3.62, -0.48, 1.65, 0.58, 2.55), (-2.65, 0.72, 1.90, 0.68, 2.95))):
        machinery.append(kit.add_cone(f"I020_V8C_KEEP_MACHINE_{i}", (x, y, z), r, r * 0.76, h, 8, materials["clay"], rotation_z=math.pi / 8, bevel=0.065))
        machinery.append(v8.add_cylinder(f"I020_V8C_KEEP_MACHINE_LIP_{i}", (x, y, z + h * 0.54), r * 1.08, 0.22, materials["iron"], 8))
    machinery.extend((
        kit.add_box("I020_V8C_KEEP_LINK_WEST", (-2.22, 0.18, 2.78), (1.85, 0.72, 0.42), materials["iron"], bevel=0.07),
        kit.add_box("I020_V8C_KEEP_LINK_EAST", (2.28, 0.18, 2.52), (2.05, 0.68, 0.38), materials["iron"], bevel=0.07),
        kit.add_box("I020_V8C_KEEP_LINK_FRONT", (0.0, -2.02, 2.62), (0.82, 1.92, 0.38), materials["iron"], bevel=0.07),
    ))
    exported.append(v8.joined(machinery, "I020_V8C_KEEP_ATTACHED_MACHINERY", "keep-attached-forge-machinery", "v8c-hero-12"))

    # Broader rounded strands make the cascade read as a hot river breaking
    # into ropes, while remaining truly volumetric.
    cascade: list[bpy.types.Object] = []
    line = [(0.0, -5.08, 0.38), (0.04, -5.45, -0.22), (-0.10, -5.72, -1.22), (0.10, -5.95, -2.46), (-0.04, -6.20, -3.72), (0.04, -6.48, -4.78)]
    for i, (offset, radius) in enumerate(((-0.54, 0.28), (-0.18, 0.33), (0.20, 0.32), (0.56, 0.25))):
        cascade.append(v8.add_flow_tube(f"I020_V8C_CASCADE_BODY_{i}", [(x + offset + 0.05 * math.sin(j + i), y - 0.04 * i, z) for j, (x, y, z) in enumerate(line)], radius, materials["molten"], "corrected-volumetric-cascade", "v8c-hero-13"))
    exported.append(v8.joined(cascade, "I020_V8C_BROAD_LAVA_CASCADE", "corrected-volumetric-cascade", "v8c-hero-13"))
    return exported


def setup_render() -> bpy.types.Object:
    camera = v8.setup_render()
    scene = bpy.context.scene
    scene.render.resolution_x = 900
    scene.render.resolution_y = 980
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.014, 0.010, 0.011, 1.0)
    bg.inputs["Strength"].default_value = 0.52
    scene.view_settings.look = "AgX - Medium High Contrast"
    # Recover basalt shape from the blacks while preserving heat-led lighting.
    bpy.data.objects["I020_V8_KEY"].data.energy = 2900
    bpy.data.objects["I020_V8_RIM"].data.energy = 2350
    bpy.data.objects["I020_V8_TOP"].data.energy = 1350
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "front-hero": ((7.0, -25.2, 15.2), (-0.45, -1.55, 0.05)),
        "left-45": ((-17.4, -20.6, 14.5), (-0.55, -1.20, 0.30)),
        "right-45": ((17.3, -20.5, 14.3), (-0.25, -1.15, 0.25)),
        "rear-sanity": ((7.0, 23.5, 14.2), (-0.25, -0.20, 0.62)),
        "top-maze": ((0.0, -0.8, 30.0), (-0.85, -1.50, -0.38)),
        "front-cliff-low": ((6.3, -26.2, 7.8), (-0.10, -2.62, -2.00)),
    }
    for name, (position, target) in views.items():
        camera.location = position
        kit.look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v8-hero-wedge-{name}-v002.png")
        bpy.ops.render.render(write_still=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    for obj in scene.objects:
        if obj.type == "MESH":
            obj.show_wire = True
            obj.show_all_edges = True
    camera.location = (7.0, -25.2, 15.2)
    kit.look_at(camera, (-0.45, -1.55, 0.05))
    scene.render.filepath = str(render_dir / "island-020-v8-hero-wedge-wireframe-front-v002.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = kit.ensure_parent(args.output_glb)
    output_blend = kit.ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    kit.clear_scene()
    materials = {
        "clay": kit.make_material("I020_V8C_BASALT_CLAY", (0.24, 0.19, 0.17, 1.0), roughness=0.91),
        "deep": kit.make_material("I020_V8C_DEEP_BASALT", (0.052, 0.039, 0.042, 1.0), roughness=0.94),
        "iron": kit.make_material("I020_V8C_BLACK_IRON", (0.040, 0.041, 0.047, 1.0), metallic=0.48, roughness=0.65),
        "molten": kit.make_material("I020_V8C_MOLTEN", (0.95, 0.065, 0.003, 1.0), roughness=0.25, emission=(1.0, 0.016, 0.001, 1.0), emission_strength=3.2),
        "hot": kit.make_material("I020_V8C_WHITE_HOT", (1.0, 0.29, 0.035, 1.0), roughness=0.20, emission=(1.0, 0.07, 0.002, 1.0), emission_strength=4.4),
    }
    exports = v8.build_world(materials)
    exports.extend(add_correction_geometry(materials))
    camera = setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.export_scene.gltf(filepath=str(output_glb), export_format="GLB", export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    render_views(camera, render_dir)
    print(f"ISLAND020_V8_CORRECTED_EXPORT objects={len(exports)} glb={output_glb} blend={output_blend} renders={render_dir}")


if __name__ == "__main__":
    main()
