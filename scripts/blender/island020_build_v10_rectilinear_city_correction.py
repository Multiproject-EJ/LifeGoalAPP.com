"""Apply V10's single bounded correction while preserving its maze graph."""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import island020_build_v5 as kit
import island020_build_v9_macro_slice as v9
import island020_build_v10_rectilinear_city as v10


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--render-dir", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def build_perimeter_districts(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    p: list[bpy.types.Object] = []
    # Twelve irregular compounds fill the moat but leave the board ring distinct.
    for compound in range(12):
        angle = compound * math.tau / 12 + 0.045 * math.sin(compound * 1.7)
        base_radius = 8.05 + 0.16 * (compound % 3)
        for module in range(3):
            resolved_angle = angle + (module - 1) * 0.055
            radius = base_radius + (module - 1) * 0.42
            x, y = math.cos(resolved_angle) * radius, math.sin(resolved_angle) * radius
            height = 1.28 + 0.34 * ((compound + module) % 4)
            tangent = resolved_angle + math.pi / 2
            p.append(kit.add_box(f"I020_V10C_OUTER_FORGE_{compound}_{module}", (x, y, 0.86 + height * 0.5), (0.76 + module * 0.08, 0.62, height), materials["basalt" if module != 1 else "deep"], bevel=0.085, rotation_z=tangent))
            p.append(kit.add_box(f"I020_V10C_OUTER_FORGE_ROOF_{compound}_{module}", (x, y, 0.93 + height), (0.90 + module * 0.08, 0.76, 0.18), materials["iron"], bevel=0.045, rotation_z=tangent))
        # One chimney and one arch-like bridge identify each cluster as architecture.
        cx, cy = math.cos(angle) * (base_radius - 0.15), math.sin(angle) * (base_radius - 0.15)
        p.append(v9.add_cylinder(f"I020_V10C_OUTER_STACK_{compound}", (cx, cy, 2.55), 0.18, 2.65, materials["deep"], 8))
        p.append(v9.add_cylinder(f"I020_V10C_OUTER_STACK_LIP_{compound}", (cx, cy, 3.92), 0.24, 0.16, materials["iron"], 8))

    # Four masonry links join the inner city to the outer district without
    # blocking the maze's floor graph.
    for index, angle in enumerate((0.0, math.pi / 2, math.pi, math.pi * 1.5)):
        x, y = math.cos(angle) * 7.55, math.sin(angle) * 7.55
        p.append(kit.add_box(f"I020_V10C_OUTER_LINK_{index}", (x, y, 2.05), (2.30, 0.62, 0.30), materials["iron"], bevel=0.065, rotation_z=angle))
        for side in (-1, 1):
            side_angle = angle + math.pi / 2
            p.append(kit.add_box(f"I020_V10C_OUTER_LINK_RAIL_{index}_{side}", (x + math.cos(side_angle) * side * 0.34, y + math.sin(side_angle) * side * 0.34, 2.32), (2.30, 0.10, 0.38), materials["deep"], bevel=0.025, rotation_z=angle))
    return v10.joined(p, "I020_V10C_PERIMETER_FORGE_DISTRICTS", "perimeter-attached-forge-districts", "v10c-11")


def build_cathedral_facade(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    p: list[bpy.types.Object] = []
    glow: list[bpy.types.Object] = []
    # Stepped shoulders and vertical ribs break the tower's blank rectangular body.
    p.extend((
        kit.add_box("I020_V10C_KEEP_MID_SHOULDER_NS", (0.0, 0.08, 5.72), (2.78, 2.18, 0.42), materials["basalt"], bevel=0.07),
        kit.add_box("I020_V10C_KEEP_MID_SHOULDER_EW", (0.0, 0.08, 5.72), (2.18, 2.78, 0.42), materials["basalt"], bevel=0.07),
        v9.add_cylinder("I020_V10C_KEEP_UPPER_COLLAR", (0.0, 0.08, 7.38), 1.52, 0.24, materials["iron"], 8),
    ))
    for index, angle in enumerate(i * math.pi / 2 for i in range(4)):
        x, y = math.cos(angle) * 1.28, 0.08 + math.sin(angle) * 1.28
        dims = (0.28, 0.58, 3.95) if index % 2 == 0 else (0.58, 0.28, 3.95)
        p.append(kit.add_box(f"I020_V10C_KEEP_VERTICAL_RIB_{index}", (x, y, 4.80), dims, materials["basalt"], bevel=0.05))
        p.append(kit.add_box(f"I020_V10C_KEEP_RIB_CAP_{index}", (x, y, 6.84), (dims[0] * 1.45, dims[1] * 1.45, 0.26), materials["iron"], bevel=0.035))

    # Smaller divided heat apertures sit beside the existing windows.
    for index, (x, y, sx, sy) in enumerate(((-0.58, -1.205, 0.16, 0.055), (0.58, -1.205, 0.16, 0.055), (1.245, -0.50, 0.055, 0.16), (1.245, 0.66, 0.055, 0.16), (-1.245, -0.50, 0.055, 0.16), (-1.245, 0.66, 0.055, 0.16))):
        glow.append(kit.add_box(f"I020_V10C_KEEP_SMALL_WINDOW_{index}", (x, y, 4.15 + 0.22 * (index % 2)), (sx, sy, 1.18), materials["lava"], bevel=0.055))

    # Monumental front gate exposes the continuous escape channel.
    for side in (-1, 1):
        p.append(kit.add_box(f"I020_V10C_FRONT_GATE_TOWER_{side}", (side * 1.16, -8.62, 1.84), (0.82, 0.88, 2.65), materials["basalt"], bevel=0.075))
        p.append(v9.add_cylinder(f"I020_V10C_FRONT_GATE_LIP_{side}", (side * 1.16, -8.62, 3.24), 0.52, 0.18, materials["iron"], 8))
    p.append(kit.add_box("I020_V10C_FRONT_GATE_LINTEL", (0.0, -8.62, 3.08), (1.62, 0.72, 0.50), materials["iron"], bevel=0.06))
    for tooth in range(5):
        p.append(kit.add_box(f"I020_V10C_FRONT_GATE_TOOTH_{tooth}", (-0.68 + tooth * 0.34, -8.62, 3.48), (0.20, 0.30, 0.42), materials["deep"], bevel=0.025))
    return v10.joined(p, "I020_V10C_CATHEDRAL_FACADE_AND_GATE", "layered-cathedral-facade-and-escape-gate", "v10c-12"), v10.joined(glow, "I020_V10C_CATHEDRAL_SMALL_HEAT_WINDOWS", "divided-cathedral-heat-windows", "v10c-12b")


def build_background(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = [v9.add_cylinder("I020_V10C_BACKGROUND_FIELD", (0.0, 0.0, -6.62), 36.0, 0.30, materials["background"], 112)]
    rng = random.Random(v10.SEED + 190)
    for index in range(52):
        angle = index * math.tau / 52 + rng.uniform(-0.045, 0.045)
        radius = rng.uniform(15.0, 30.0)
        h = rng.uniform(2.3, 9.2)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        objects.append(kit.add_cone(f"I020_V10C_BACKGROUND_SPIRE_{index}", (x, y, -6.42 + h * 0.5), rng.uniform(0.55, 1.35), 0.04, h, rng.choice((6, 7, 8)), materials["background"], rotation_z=rng.random(), bevel=0.035))
    return objects


def setup_render() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.008, 0.005, 0.007, 1.0)
    bg.inputs["Strength"].default_value = 0.48
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    for name, location, energy, size, color, target in (
        ("I020_V10C_KEY", (-18.0, -22.0, 29.0), 7600, 15.0, (1.0, 0.50, 0.22), (0.0, -1.0, 0.0)),
        ("I020_V10C_FILL", (21.0, -1.0, 22.0), 5900, 14.0, (0.22, 0.39, 0.68), (0.0, 0.0, 0.8)),
        ("I020_V10C_TOP", (-2.0, 4.0, 33.0), 4900, 13.0, (1.0, 0.28, 0.075), (0.0, 0.0, 0.0)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        light.data.color = color
        kit.look_at(light, target)
    for i, (location, energy) in enumerate((((0.0, -2.5, 2.0), 1450), ((0.0, -6.0, 1.0), 1900), ((0.0, -9.8, -0.2), 2500), ((0.0, -11.3, -4.2), 2850), ((-5.4, 0.0, 1.0), 1050), ((5.4, 2.7, 1.0), 1050))):
        bpy.ops.object.light_add(type="POINT", location=location)
        light = bpy.context.object
        light.name = f"I020_V10C_HEAT_{i}"
        light.data.energy = energy
        light.data.color = (1.0, 0.045, 0.004)
        light.data.shadow_soft_size = 2.3
    camera_data = bpy.data.cameras.new("I020_V10C_REVIEW_CAMERA")
    camera = bpy.data.objects.new("I020_V10C_REVIEW_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 62
    scene.camera = camera
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "source-match": ((8.0, -33.5, 26.5), (0.0, -1.5, -0.65)),
        "left-45": ((-26.5, -26.5, 21.5), (0.0, -0.9, -0.1)),
        "right-45": ((26.5, -26.5, 21.5), (0.0, -0.9, -0.1)),
        "rear-sanity": ((14.0, 31.0, 21.5), (0.0, 0.0, 0.25)),
        "top-maze": ((0.0, -0.5, 39.5), (0.0, -0.5, 0.0)),
        "front-cliff-low": ((7.0, -35.0, 11.5), (0.0, -3.6, -1.75)),
    }
    for name, (position, target) in views.items():
        camera.location = position
        kit.look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v10-macro-{name}-v002.png")
        bpy.ops.render.render(write_still=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    for obj in scene.objects:
        if obj.type == "MESH" and not obj.name.startswith("I020_V10C_BACKGROUND"):
            obj.show_wire = True
            obj.show_all_edges = True
    camera.location = (8.0, -33.5, 26.5)
    kit.look_at(camera, (0.0, -1.5, -0.65))
    scene.render.filepath = str(render_dir / "island-020-v10-macro-wireframe-source-match-v002.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = kit.ensure_parent(args.output_glb)
    output_blend = kit.ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    kit.clear_scene()
    materials = {
        "basalt": kit.make_material("I020_V10C_BASALT", (0.145, 0.082, 0.058, 1.0), roughness=0.89),
        "deep": kit.make_material("I020_V10C_DEEP", (0.018, 0.014, 0.018, 1.0), roughness=0.95),
        "cliff": kit.make_material("I020_V10C_CLIFF", (0.032, 0.023, 0.026, 1.0), roughness=0.97),
        "iron": kit.make_material("I020_V10C_IRON", (0.028, 0.031, 0.038, 1.0), metallic=0.60, roughness=0.55),
        "path_a": kit.make_material("I020_V10C_PATH_A", (0.31, 0.195, 0.115, 1.0), roughness=0.84),
        "path_b": kit.make_material("I020_V10C_PATH_B", (0.195, 0.108, 0.078, 1.0), roughness=0.89),
        "board_a": kit.make_material("I020_V10C_BOARD_A", (0.44, 0.285, 0.16, 1.0), roughness=0.78),
        "board_b": kit.make_material("I020_V10C_BOARD_B", (0.30, 0.18, 0.115, 1.0), roughness=0.82),
        "lava": kit.make_material("I020_V10C_LAVA", (0.90, 0.032, 0.001, 1.0), roughness=0.25, emission=(1.0, 0.008, 0.001, 1.0), emission_strength=2.25),
        "lava_hot": kit.make_material("I020_V10C_LAVA_HOT", (1.0, 0.15, 0.005, 1.0), roughness=0.20, emission=(1.0, 0.030, 0.001, 1.0), emission_strength=2.75),
        "background": kit.make_material("I020_V10C_BACKGROUND", (0.007, 0.005, 0.008, 1.0), roughness=0.98),
    }
    for key in ("basalt", "deep", "cliff", "path_a", "path_b", "background"):
        v9.add_basalt_nodes(materials[key], 3.5 if key != "background" else 1.8, 0.22 if not key.startswith("path") else 0.14)
    foundation = v9.build_foundation(materials)
    v10.tag(foundation, "volcanic-foundation", "v10-00")
    board = v9.build_outer_board(materials)
    v10.tag(board, "source-scale-outer-board-ring", "v10-10")
    exports: list[bpy.types.Object] = [foundation]
    floors, masonry, architecture, graph_links = v10.build_city_maze(materials)
    exports.extend((floors, masonry, architecture, board))
    exports.extend(v10.build_cathedral(materials))
    exports.extend(v10.build_lava(materials))
    exports.append(v10.build_cliffs(materials))
    exports.append(build_perimeter_districts(materials))
    exports.extend(build_cathedral_facade(materials))
    background = build_background(materials)
    camera = setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in exports:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = exports[0]
    bpy.ops.export_scene.gltf(filepath=str(output_glb), export_format="GLB", use_selection=True, export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    render_views(camera, render_dir)
    print(f"ISLAND020_V10_CORRECTED_EXPORT objects={len(exports)} background={len(background)} graph_links={graph_links} glb={output_glb}")


if __name__ == "__main__":
    main()
