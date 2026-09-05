"""Apply V9's one permitted bounded macro correction without changing its maze graph."""

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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--render-dir", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def build_city_bastion_system(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    p: list[bpy.types.Object] = []
    step = math.tau / v9.SECTORS
    # Small attached bastions sit on wall junctions, retaining full corridor width.
    for ring in range(v9.RINGS + 1):
        radius = v9.INNER_RADIUS + ring * v9.CELL_DEPTH
        for sector in range(0, v9.SECTORS, 2):
            angle = (sector + (ring % 2) * 0.5) * step
            x, y = math.cos(angle) * radius, math.sin(angle) * radius
            height = 1.18 + 0.22 * ((ring * 5 + sector) % 5)
            width = 0.25 + 0.035 * ((ring + sector) % 3)
            p.append(v9.add_cylinder(f"I020_V9C_MAZE_BASTION_{ring}_{sector}", (x, y, 0.86 + height * 0.5), width, height, materials["deep" if (ring + sector) % 4 == 0 else "basalt"], 8))
            p.append(v9.add_cylinder(f"I020_V9C_MAZE_BASTION_LIP_{ring}_{sector}", (x, y, 0.90 + height), width * 1.35, 0.14, materials["iron"], 8))

    # Radially stepped forge roofs turn selected wall runs into inhabited blocks.
    for ring in range(v9.RINGS):
        r = v9.INNER_RADIUS + ring * v9.CELL_DEPTH + v9.CELL_DEPTH * 0.52
        for sector in range((ring + 1) % 2, v9.SECTORS, 4):
            angle = (sector + 0.5) * step
            x, y = math.cos(angle) * r, math.sin(angle) * r
            tangent = angle + math.pi / 2
            height = 0.76 + 0.24 * ((sector + ring) % 4)
            p.append(kit.add_box(f"I020_V9C_MAZE_FORGE_BLOCK_{ring}_{sector}", (x, y, 0.82 + height * 0.5), (0.72, 0.48, height), materials["basalt"], bevel=0.07, rotation_z=tangent))
            p.append(kit.add_box(f"I020_V9C_MAZE_FORGE_ROOF_{ring}_{sector}", (x, y, 0.88 + height), (0.82, 0.58, 0.16), materials["iron"], bevel=0.045, rotation_z=tangent))
    return v9.joined(p, "I020_V9C_CITY_BASTION_SYSTEM", "maze-attached-city-bastions", "v9c-11")


def build_keep_transepts(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    p: list[bpy.types.Object] = []
    molten: list[bpy.types.Object] = []
    # Four stepped transepts bind the keep to the first maze ring.
    for index, angle in enumerate((0.0, math.pi / 2, math.pi, math.pi * 1.5)):
        x, y = math.cos(angle) * 2.70, math.sin(angle) * 2.70
        p.append(kit.add_box(f"I020_V9C_KEEP_TRANSEPT_{index}", (x, y, 2.18), (2.25, 1.30, 1.78), materials["basalt"], bevel=0.11, rotation_z=angle))
        p.append(kit.add_box(f"I020_V9C_KEEP_TRANSEPT_ROOF_{index}", (x, y, 3.14), (2.40, 1.46, 0.26), materials["iron"], bevel=0.055, rotation_z=angle))
        outer_x, outer_y = math.cos(angle) * 3.48, math.sin(angle) * 3.48
        p.append(v9.add_cylinder(f"I020_V9C_KEEP_TRANSEPT_TOWER_{index}", (outer_x, outer_y, 2.46), 0.52, 3.35, materials["deep"], 8))
        p.append(v9.add_cylinder(f"I020_V9C_KEEP_TRANSEPT_LIP_{index}", (outer_x, outer_y, 4.18), 0.66, 0.20, materials["iron"], 8))
        vent_x, vent_y = math.cos(angle) * 3.18, math.sin(angle) * 3.18
        molten.append(v9.add_flow(f"I020_V9C_KEEP_TRANSEPT_HEAT_{index}", [(vent_x, vent_y, 1.25), (vent_x, vent_y, 2.62)], 0.12, materials["lava"], "transept-heat-vent", "v9c-12b"))

    # A wider upper forge tier gives the tower a source-like cathedral shoulder.
    p.extend((
        kit.add_box("I020_V9C_KEEP_UPPER_CROSS_NS", (0.0, 0.12, 6.72), (1.38, 2.82, 0.58), materials["basalt"], bevel=0.08),
        kit.add_box("I020_V9C_KEEP_UPPER_CROSS_EW", (0.0, 0.12, 6.72), (2.82, 1.38, 0.58), materials["basalt"], bevel=0.08),
        v9.add_cylinder("I020_V9C_KEEP_CROWN_COLLAR", (0.0, 0.12, 7.62), 1.30, 0.28, materials["iron"], 8),
    ))
    return (
        v9.joined(p, "I020_V9C_KEEP_ATTACHED_TRANSEPTS", "keep-attached-forge-transepts", "v9c-12"),
        v9.joined(molten, "I020_V9C_KEEP_TRANSEPT_HEAT", "transept-heat-vents", "v9c-12b"),
    )


def build_rugged_cliff_crown(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    p: list[bpy.types.Object] = []
    rng = random.Random(v9.SEED + 144)
    for index in range(52):
        angle = index * math.tau / 52
        # Leave a broad front mouth for the escape cascade.
        delta = abs((angle - math.radians(270) + math.pi) % math.tau - math.pi)
        if delta < math.radians(10):
            continue
        radius = 11.48 + rng.uniform(-0.16, 0.18)
        height = rng.uniform(1.55, 3.35)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        p.append(kit.add_cone(f"I020_V9C_CLIFF_COLUMN_{index}", (x, y, -0.72 - height * 0.5), rng.uniform(0.28, 0.44), rng.uniform(0.34, 0.52), height, rng.choice((6, 7, 8)), materials["cliff" if index % 3 else "deep"], rotation_z=angle + rng.uniform(-0.2, 0.2), bevel=0.035))
    return v9.joined(p, "I020_V9C_RUGGED_CLIFF_CROWN", "rugged-basalt-cliff-crown", "v9c-13")


def build_front_cascade_banks(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    p: list[bpy.types.Object] = []
    for side in (-1, 1):
        for index in range(8):
            y = -10.45 - index * 0.20
            z = -0.38 - index * 0.78
            x = side * (0.92 + 0.08 * math.sin(index * 1.2))
            p.append(kit.add_cone(f"I020_V9C_CASCADE_BANK_{side}_{index}", (x, y, z), 0.56, 0.42, 1.48, 7, materials["cliff" if index % 2 else "basalt"], rotation_z=index * 0.17, bevel=0.045))
    return v9.joined(p, "I020_V9C_FRONT_CASCADE_BANKS", "deep-volumetric-cascade-banks", "v9c-14")


def build_dark_background(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    objects.append(v9.add_cylinder("I020_V9C_BACKGROUND_ROCK_FIELD", (0.0, 0.0, -6.60), 35.0, 0.35, materials["background_rock"], 112))
    # Sparse curved fissures illuminate rock rather than becoming a red sheet.
    for stream in range(7):
        points = []
        base_angle = stream * math.tau / 7 + 0.22
        for index in range(8):
            radius = 13.5 + index * 2.8
            angle = base_angle + 0.06 * math.sin(index * 1.3 + stream)
            points.append((math.cos(angle) * radius, math.sin(angle) * radius, -6.35 + 0.04 * math.sin(index)))
        objects.append(v9.add_flow(f"I020_V9C_BACKGROUND_FISSURE_{stream}", points, 0.22 + 0.05 * (stream % 2), materials["lava_dim"], "background-fissure", "background"))
    rng = random.Random(v9.SEED + 199)
    for index in range(42):
        angle = index * math.tau / 42 + rng.uniform(-0.055, 0.055)
        radius = rng.uniform(14.0, 29.0)
        height = rng.uniform(2.0, 8.5)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        objects.append(kit.add_cone(f"I020_V9C_BACKGROUND_SPIRE_{index}", (x, y, -6.40 + height * 0.5), rng.uniform(0.55, 1.35), 0.04, height, rng.choice((6, 7, 8)), materials["background_rock"], rotation_z=rng.random(), bevel=0.035))
    return objects


def setup_render() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1040
    scene.render.resolution_y = 1040
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.004, 0.003, 0.005, 1.0)
    bg.inputs["Strength"].default_value = 0.20
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    for name, location, energy, size, color, target in (
        ("I020_V9C_KEY", (-17.0, -20.0, 27.0), 5200, 13.0, (1.0, 0.41, 0.16), (0.0, -1.0, 0.0)),
        ("I020_V9C_FILL", (19.0, -3.0, 20.0), 3800, 12.0, (0.18, 0.31, 0.56), (0.0, 0.0, 0.7)),
        ("I020_V9C_TOP", (-2.0, 4.0, 31.0), 3100, 11.0, (1.0, 0.22, 0.055), (0.0, 0.0, 0.0)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        light.data.color = color
        kit.look_at(light, target)
    for i, (location, energy, radius) in enumerate((
        ((0.0, -2.3, 2.2), 1050, 2.1), ((0.0, -5.8, 1.1), 1350, 2.4),
        ((0.0, -10.5, -0.4), 1800, 2.7), ((0.0, -11.4, -4.2), 2100, 3.0),
        ((-5.4, -5.0, 1.1), 900, 2.0), ((5.6, 3.8, 1.0), 800, 2.0),
    )):
        bpy.ops.object.light_add(type="POINT", location=location)
        light = bpy.context.object
        light.name = f"I020_V9C_HEAT_LIGHT_{i}"
        light.data.energy = energy
        light.data.color = (1.0, 0.035, 0.003)
        light.data.shadow_soft_size = radius
    camera_data = bpy.data.cameras.new("I020_V9C_REVIEW_CAMERA")
    camera = bpy.data.objects.new("I020_V9C_REVIEW_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 60
    scene.camera = camera
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "source-match": ((16.0, -32.0, 26.0), (0.0, -1.0, -0.65)),
        "left-45": ((-26.0, -26.0, 21.0), (0.0, -0.8, -0.2)),
        "right-45": ((26.0, -26.0, 21.0), (0.0, -0.8, -0.2)),
        "rear-sanity": ((16.0, 30.0, 21.0), (0.0, 0.0, 0.2)),
        "top-maze": ((0.0, -0.6, 39.0), (0.0, -0.5, 0.0)),
        "front-cliff-low": ((13.0, -34.0, 11.0), (0.0, -3.4, -1.75)),
    }
    for name, (position, target) in views.items():
        camera.location = position
        kit.look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v9-macro-{name}-v002.png")
        bpy.ops.render.render(write_still=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    for obj in scene.objects:
        if obj.type == "MESH" and not obj.name.startswith("I020_V9C_BACKGROUND"):
            obj.show_wire = True
            obj.show_all_edges = True
    camera.location = (16.0, -32.0, 26.0)
    kit.look_at(camera, (0.0, -1.0, -0.65))
    scene.render.filepath = str(render_dir / "island-020-v9-macro-wireframe-source-match-v002.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = kit.ensure_parent(args.output_glb)
    output_blend = kit.ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    kit.clear_scene()
    materials = {
        "basalt": kit.make_material("I020_V9C_BASALT", (0.105, 0.062, 0.052, 1.0), roughness=0.90),
        "deep": kit.make_material("I020_V9C_DEEP_BASALT", (0.013, 0.011, 0.016, 1.0), roughness=0.95),
        "cliff": kit.make_material("I020_V9C_CLIFF", (0.026, 0.020, 0.024, 1.0), roughness=0.97),
        "iron": kit.make_material("I020_V9C_BLACK_IRON", (0.022, 0.025, 0.032, 1.0), metallic=0.62, roughness=0.55),
        "path_a": kit.make_material("I020_V9C_PATH_A", (0.255, 0.165, 0.105, 1.0), roughness=0.85),
        "path_b": kit.make_material("I020_V9C_PATH_B", (0.165, 0.097, 0.074, 1.0), roughness=0.90),
        "board_a": kit.make_material("I020_V9C_BOARD_A", (0.38, 0.245, 0.145, 1.0), roughness=0.80),
        "board_b": kit.make_material("I020_V9C_BOARD_B", (0.255, 0.16, 0.11, 1.0), roughness=0.84),
        "lava": kit.make_material("I020_V9C_LAVA", (0.95, 0.035, 0.001, 1.0), roughness=0.25, emission=(1.0, 0.009, 0.001, 1.0), emission_strength=2.7),
        "lava_hot": kit.make_material("I020_V9C_LAVA_HOT", (1.0, 0.19, 0.008, 1.0), roughness=0.20, emission=(1.0, 0.042, 0.001, 1.0), emission_strength=3.4),
        "lava_dim": kit.make_material("I020_V9C_LAVA_FISSURE", (0.22, 0.008, 0.001, 1.0), roughness=0.34, emission=(0.40, 0.004, 0.001, 1.0), emission_strength=0.75),
        "background_rock": kit.make_material("I020_V9C_BACKGROUND_ROCK", (0.007, 0.006, 0.009, 1.0), roughness=0.98),
    }
    for key in ("basalt", "deep", "cliff", "path_a", "path_b", "background_rock"):
        v9.add_basalt_nodes(materials[key], 3.2 if key != "background_rock" else 1.6, 0.22 if not key.startswith("path") else 0.14)

    exports: list[bpy.types.Object] = [v9.build_foundation(materials)]
    maze_floor, maze_walls, maze_graph = v9.build_maze(materials)
    exports.extend((maze_floor, maze_walls, v9.build_outer_board(materials)))
    exports.extend(v9.build_keep(materials))
    exports.append(v9.build_sector_detail(materials))
    exports.extend(v9.build_lava_system(materials))
    exports.append(v9.build_front_gate(materials))
    exports.append(build_city_bastion_system(materials))
    exports.extend(build_keep_transepts(materials))
    exports.append(build_rugged_cliff_crown(materials))
    exports.append(build_front_cascade_banks(materials))
    background = build_dark_background(materials)
    camera = setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in exports:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = exports[0]
    bpy.ops.export_scene.gltf(filepath=str(output_glb), export_format="GLB", use_selection=True, export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    render_views(camera, render_dir)
    print(f"ISLAND020_V9_CORRECTED_EXPORT objects={len(exports)} background={len(background)} graph_links={len(maze_graph['links'])} glb={output_glb}")


if __name__ == "__main__":
    main()
