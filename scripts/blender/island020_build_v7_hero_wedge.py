"""Build the naked V7 representative hero wedge for Island 020.

This script deliberately builds only the macro slice authorized by the V7
Gauntlet contract.  It is not a finished island: the keep, axial forge, front
gate/stair, southwest maze district and front lavafall cliff must prove the new
monumental fortress family before the remaining quadrants or detail can exist.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import island020_build_v5 as kit


FAMILY = "island-020-monumental-fortress-maze-v7"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--render-dir", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def retag(obj: bpy.types.Object, semantic: str, part_id: str) -> bpy.types.Object:
    obj["island"] = 20
    obj["family"] = FAMILY
    obj["semantic"] = semantic
    obj["part_id"] = part_id
    obj["export_role"] = "representative-hero-wedge"
    return obj


def joined(parts: list[bpy.types.Object], name: str, semantic: str, part_id: str) -> bpy.types.Object:
    return retag(kit.join_meshes(parts, name, semantic, part_id), semantic, part_id)


def add_pyramid(
    parts: list[bpy.types.Object],
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
) -> None:
    parts.append(
        kit.add_cone(
            name,
            location,
            radius,
            0.035,
            depth,
            4,
            material,
            rotation_z=math.pi / 4,
            bevel=0.025,
        )
    )


def add_rect_merlons(
    parts: list[bpy.types.Object],
    prefix: str,
    center: tuple[float, float],
    dimensions: tuple[float, float],
    z: float,
    material: bpy.types.Material,
    count_x: int,
    count_y: int,
) -> None:
    cx, cy = center
    width, depth = dimensions
    merlon_w = min(0.28, width / max(5, count_x * 2))
    merlon_d = min(0.28, depth / max(5, count_y * 2))
    for edge_y in (-depth * 0.5, depth * 0.5):
        for index in range(count_x):
            x = cx - width * 0.43 + width * 0.86 * (index / max(1, count_x - 1))
            parts.append(kit.add_box(f"{prefix}_Y_{edge_y:+.2f}_{index}", (x, cy + edge_y, z), (merlon_w, 0.25, 0.42), material, bevel=0.025))
    for edge_x in (-width * 0.5, width * 0.5):
        for index in range(1, max(1, count_y - 1)):
            y = cy - depth * 0.38 + depth * 0.76 * (index / max(1, count_y - 1))
            parts.append(kit.add_box(f"{prefix}_X_{edge_x:+.2f}_{index}", (cx + edge_x, y, z), (0.25, merlon_d, 0.42), material, bevel=0.025))


def build_context_foundation(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    foundation = kit.create_ring_volume(
        "I020_V7_HERO_CONTEXT_FOUNDATION",
        [
            (6.48, 0.35, 0.18, 0.065),
            (6.42, -0.18, 1.0, 0.075),
            (6.18, -1.35, 2.0, 0.105),
            (5.82, -2.75, 3.1, 0.14),
            (5.1, -4.25, 4.2, 0.19),
            (3.65, -5.95, 5.2, 0.26),
        ],
        72,
        materials["deep_clay"],
        "neutral-context-foundation",
        "context-01",
    )
    return retag(foundation, "neutral-context-foundation", "context-01")


def build_front_cliff(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    cliff_parts: list[bpy.types.Object] = []
    for index in range(23):
        t = index / 22
        x = -6.0 + t * 12.0
        y = -5.55 - 0.35 * math.cos(t * math.pi * 2.0) - 0.15 * math.sin(index * 1.7)
        height = 2.6 + (index % 5) * 0.52 + 1.1 * (1.0 - abs(t - 0.5) * 1.55)
        radius = 0.48 + (index % 4) * 0.09
        cliff_parts.append(
            kit.add_cone(
                f"I020_V7_FRONT_CLIFF_COLUMN_{index:02d}",
                (x, y, -1.35 - height * 0.5),
                radius * 0.7,
                radius,
                height,
                6,
                materials["deep_clay" if index % 3 else "clay"],
                rotation_z=index * 0.21,
                bevel=0.035,
            )
        )
    for index, (x, y, z, sx, sy, sz, rz) in enumerate(
        (
            (-4.8, -5.7, -3.6, 2.1, 1.05, 0.7, 0.24),
            (-2.8, -5.95, -4.3, 2.8, 1.25, 0.85, -0.18),
            (2.9, -5.92, -4.2, 2.6, 1.3, 0.82, 0.16),
            (4.9, -5.66, -3.5, 2.0, 1.0, 0.68, -0.22),
            (-1.6, -6.0, -5.05, 2.2, 1.3, 0.58, 0.12),
            (1.5, -6.1, -5.0, 2.4, 1.35, 0.62, -0.14),
        )
    ):
        cliff_parts.append(kit.add_box(f"I020_V7_CLIFF_STRATA_{index}", (x, y, z), (sx, sy, sz), materials["deep_clay"], bevel=0.16, rotation_z=rz))
    cliff = joined(cliff_parts, "I020_V7_FRONT_CLIFF", "front-layered-volcanic-cliff", "hero-07")

    fall_points = [
        (0.0, -4.72, 0.78),
        (0.0, -5.12, 0.42),
        (0.0, -5.48, -0.38),
        (0.0, -5.68, -1.45),
        (0.0, -5.82, -2.65),
        (0.0, -5.95, -3.92),
        (0.0, -6.18, -5.22),
    ]
    fall = kit.create_ribbon("I020_V7_FRONT_LAVAFALL", fall_points, 0.58, 0.16, materials["molten_semantic"], "front-cliff-lavafall", "hero-08")
    return cliff, retag(fall, "front-cliff-lavafall", "hero-08")


def build_keep(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    parts: list[bpy.types.Object] = []
    parts.extend(
        [
            kit.add_box("I020_V7_KEEP_FOUNDATION", (0.0, 0.0, 0.82), (4.15, 3.65, 0.9), materials["deep_clay"], bevel=0.13),
            kit.add_box("I020_V7_KEEP_LOWER_HALL", (0.0, 0.05, 1.72), (3.25, 3.0, 1.28), materials["clay"], bevel=0.11),
            kit.add_box("I020_V7_KEEP_CROSS_NS", (0.0, 0.0, 2.35), (1.75, 4.25, 0.72), materials["deep_clay"], bevel=0.08),
            kit.add_box("I020_V7_KEEP_CROSS_EW", (0.0, 0.0, 2.35), (4.25, 1.75, 0.72), materials["deep_clay"], bevel=0.08),
            kit.add_box("I020_V7_KEEP_MAIN_TOWER", (0.0, 0.08, 3.75), (2.05, 2.0, 3.2), materials["clay"], bevel=0.095),
            kit.add_box("I020_V7_KEEP_UPPER_TOWER", (0.0, 0.08, 5.78), (1.62, 1.58, 1.18), materials["deep_clay"], bevel=0.075),
            kit.add_box("I020_V7_KEEP_BELFRY", (0.0, 0.08, 6.78), (1.32, 1.3, 0.94), materials["clay"], bevel=0.06),
        ]
    )
    add_rect_merlons(parts, "I020_V7_KEEP_MAIN_MERLON", (0.0, 0.08), (2.05, 2.0), 5.56, materials["deep_clay"], 6, 6)
    add_rect_merlons(parts, "I020_V7_KEEP_BELFRY_MERLON", (0.0, 0.08), (1.32, 1.3), 7.42, materials["deep_clay"], 4, 4)
    add_pyramid(parts, "I020_V7_KEEP_CROWN", (0.0, 0.08, 8.55), 1.06, 2.05, materials["iron_clay"])
    add_pyramid(parts, "I020_V7_KEEP_CROWN_FINIAL", (0.0, 0.08, 9.78), 0.18, 0.65, materials["iron_clay"])

    for index, (x, y) in enumerate(((-1.48, -1.22), (1.48, -1.22), (1.48, 1.28), (-1.48, 1.28))):
        parts.append(kit.add_box(f"I020_V7_KEEP_BUTTRESS_BASE_{index}", (x, y, 2.25), (0.82, 0.82, 3.2), materials["deep_clay"], bevel=0.075))
        parts.append(kit.add_box(f"I020_V7_KEEP_BUTTRESS_UPPER_{index}", (x, y, 4.18), (0.64, 0.64, 1.1), materials["clay"], bevel=0.055))
        add_pyramid(parts, f"I020_V7_KEEP_BUTTRESS_ROOF_{index}", (x, y, 5.12), 0.56, 1.25, materials["iron_clay"])

    for index, (x, y, sx, sy, rz) in enumerate(
        (
            (0.0, -1.76, 1.25, 0.56, 0.0),
            (1.95, 0.08, 0.56, 1.25, 0.0),
            (0.0, 1.86, 1.25, 0.56, 0.0),
            (-1.95, 0.08, 0.56, 1.25, 0.0),
        )
    ):
        parts.append(kit.add_box(f"I020_V7_KEEP_FLYING_BUTTRESS_{index}", (x, y, 3.2), (sx, sy, 0.42), materials["deep_clay"], bevel=0.07, rotation_z=rz))

    keep = joined(parts, "I020_V7_CENTRAL_CRUCIBLE_KEEP", "monumental-central-crucible-keep", "hero-01")

    apertures: list[bpy.types.Object] = []
    for level, (z, offset, height, width) in enumerate(((3.62, 1.035, 1.48, 0.19), (5.82, 0.82, 0.68, 0.14), (6.8, 0.67, 0.54, 0.12))):
        for face, (x, y, sx, sy) in enumerate(((0, -offset, width, 0.055), (offset, 0.08, 0.055, width), (0, 0.08 + offset, width, 0.055), (-offset, 0.08, 0.055, width))):
            apertures.append(kit.add_box(f"I020_V7_KEEP_APERTURE_{level}_{face}", (x, y, z), (sx, sy, height), materials["molten_semantic"], bevel=0.025))
    aperture_root = joined(apertures, "I020_V7_KEEP_MOLTEN_APERTURES", "keep-molten-apertures", "hero-01b")
    return keep, aperture_root


def build_forge_spine(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    masonry: list[bpy.types.Object] = []
    for side in (-1, 1):
        x = side * 1.42
        masonry.append(kit.add_box(f"I020_V7_FORGE_SPINE_WALL_{side}", (x, -2.35, 1.15), (0.52, 4.2, 1.7), materials["deep_clay"], bevel=0.09))
        for y_index, y in enumerate((-1.2, -2.35, -3.5)):
            masonry.append(kit.add_box(f"I020_V7_FORGE_SPINE_PIER_{side}_{y_index}", (x, y, 2.12), (0.72, 0.72, 2.55), materials["clay"], bevel=0.08))
            add_pyramid(masonry, f"I020_V7_FORGE_SPINE_PIER_ROOF_{side}_{y_index}", (x, y, 3.86), 0.55, 1.15, materials["iron_clay"])
        masonry.append(kit.add_box(f"I020_V7_FORGE_SPINE_PARAPET_{side}", (x, -2.35, 2.25), (0.68, 4.35, 0.28), materials["iron_clay"], bevel=0.045))
    spine_root = joined(masonry, "I020_V7_FORGE_SPINE", "axial-fortified-forge-spine", "hero-02")

    points = [(0.0, -0.95, 1.18), (0.0, -1.72, 1.05), (0.0, -2.55, 0.92), (0.0, -3.42, 0.82), (0.0, -4.42, 0.62), (0.0, -4.9, 0.28)]
    bed = retag(kit.create_ribbon("I020_V7_FORGE_CHANNEL_BED", points, 0.62, 0.22, materials["iron_clay"], "recessed-forge-channel-bed", "hero-02b"), "recessed-forge-channel-bed", "hero-02b")
    flow = retag(kit.create_ribbon("I020_V7_FORGE_CHANNEL_FLOW", [(x, y, z + 0.09) for x, y, z in points], 0.43, 0.12, materials["molten_semantic"], "forge-channel-flow", "hero-02c"), "forge-channel-flow", "hero-02c")
    return spine_root, bed, flow


def build_front_gate_and_stair(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    gate: list[bpy.types.Object] = []
    for side in (-1, 1):
        x = side * 1.38
        gate.append(kit.add_box(f"I020_V7_FRONT_GATE_TOWER_{side}", (x, -4.48, 2.05), (1.05, 1.28, 3.45), materials["clay"], bevel=0.085))
        gate.append(kit.add_box(f"I020_V7_FRONT_GATE_TOWER_SHOULDER_{side}", (x, -4.48, 3.9), (1.24, 1.45, 0.42), materials["deep_clay"], bevel=0.055))
        add_pyramid(gate, f"I020_V7_FRONT_GATE_ROOF_{side}", (x, -4.48, 4.78), 0.9, 1.45, materials["iron_clay"])
        wing_x = side * 2.75
        gate.append(kit.add_box(f"I020_V7_FRONT_GATE_WING_{side}", (wing_x, -4.52, 1.42), (1.95, 0.7, 2.2), materials["deep_clay"], bevel=0.1))
        add_rect_merlons(gate, f"I020_V7_FRONT_GATE_WING_MERLON_{side}", (wing_x, -4.52), (1.95, 0.7), 2.74, materials["iron_clay"], 5, 3)
    gate.append(kit.add_box("I020_V7_FRONT_GATE_LINTEL", (0.0, -4.48, 3.25), (1.85, 0.72, 0.62), materials["deep_clay"], bevel=0.07))
    add_rect_merlons(gate, "I020_V7_FRONT_GATE_LINTEL_MERLON", (0.0, -4.48), (1.85, 0.72), 3.78, materials["iron_clay"], 5, 3)
    gate_root = joined(gate, "I020_V7_FRONT_GATEHOUSE", "monumental-front-gatehouse", "hero-03")

    stair_parts: list[bpy.types.Object] = []
    for index in range(12):
        y = -4.86 - index * 0.17
        z = 0.56 - index * 0.085
        width = 2.3 + index * 0.12
        stair_parts.append(kit.add_box(f"I020_V7_GRAND_STAIR_STEP_{index:02d}", (0.0, y, z), (width, 0.28, 0.17), materials["clay"], bevel=0.022))
    for side in (-1, 1):
        stair_parts.append(kit.add_box(f"I020_V7_GRAND_STAIR_BALUSTRADE_{side}", (side * 1.55, -5.75, 0.42), (0.3, 2.0, 0.72), materials["deep_clay"], bevel=0.06, rotation_z=side * 0.06))
    stair_root = joined(stair_parts, "I020_V7_GRAND_STAIR", "front-gate-grand-stair", "hero-04")
    return gate_root, stair_root


def build_southwest_maze(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    parts: list[bpy.types.Object] = []
    segments = (
        (-3.95, -2.35, 0.52, 3.65, 2.25, 0.0),
        (-2.72, -3.65, 2.9, 0.46, 1.7, 0.0),
        (-2.65, -1.08, 2.55, 0.46, 1.85, 0.0),
        (-1.78, -2.15, 0.46, 2.2, 1.45, 0.0),
        (-3.12, -2.42, 1.55, 0.42, 1.3, 0.0),
        (-2.52, -2.92, 0.42, 1.42, 1.15, 0.0),
        (-3.45, -1.72, 0.42, 1.05, 1.52, 0.0),
        (-2.15, -1.62, 1.15, 0.4, 1.2, 0.0),
        (-3.35, -3.08, 0.95, 0.4, 1.08, 0.0),
    )
    for index, (x, y, sx, sy, height, rz) in enumerate(segments):
        z = 0.38 + height * 0.5
        parts.append(kit.add_box(f"I020_V7_SW_MAZE_WALL_{index:02d}", (x, y, z), (sx, sy, height), materials["clay" if index % 3 else "deep_clay"], bevel=0.07, rotation_z=rz))
        if index in (0, 1, 2, 4):
            add_rect_merlons(parts, f"I020_V7_SW_MAZE_WALL_MERLON_{index}", (x, y), (sx, sy), 0.42 + height, materials["deep_clay"], max(3, int(sx / 0.45)), max(3, int(sy / 0.45)))

    for index, (x, y, height) in enumerate(((-4.08, -4.05, 3.15), (-4.05, -0.72, 2.85), (-1.55, -3.58, 2.7), (-2.55, -2.22, 2.35))):
        parts.append(kit.add_box(f"I020_V7_SW_MAZE_BASTION_{index}", (x, y, 0.38 + height * 0.5), (0.86, 0.86, height), materials["deep_clay"], bevel=0.085))
        add_pyramid(parts, f"I020_V7_SW_MAZE_BASTION_ROOF_{index}", (x, y, 0.38 + height + 0.62), 0.66, 1.22, materials["iron_clay"])

    parts.append(kit.add_box("I020_V7_SW_MAZE_ELEVATED_BRIDGE", (-2.75, -2.15, 2.12), (2.55, 0.72, 0.34), materials["deep_clay"], bevel=0.075))
    for side in (-1, 1):
        parts.append(kit.add_box(f"I020_V7_SW_MAZE_BRIDGE_PIER_{side}", (-3.55 if side < 0 else -1.95, -2.15, 1.28), (0.52, 0.52, 1.85), materials["clay"], bevel=0.065))

    for index in range(7):
        parts.append(kit.add_box(f"I020_V7_SW_MAZE_INNER_STAIR_{index}", (-1.25 - index * 0.16, -3.15, 0.48 + index * 0.17), (0.68, 0.28, 0.2), materials["clay"], bevel=0.02))
    return joined(parts, "I020_V7_SOUTHWEST_MAZE_DISTRICT", "multi-level-southwest-maze-district", "hero-05")


def build_world(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    exported: list[bpy.types.Object] = [build_context_foundation(materials)]
    exported.extend(build_front_cliff(materials))
    exported.extend(build_keep(materials))
    exported.extend(build_forge_spine(materials))
    exported.extend(build_front_gate_and_stair(materials))
    exported.append(build_southwest_maze(materials))
    return exported


def setup_render() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 760
    scene.render.resolution_y = 980
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.014, 0.012, 0.014, 1.0)
    background.inputs["Strength"].default_value = 0.62
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    for name, kind, location, energy, size, color, target in (
        ("I020_V7_CLAY_KEY", "AREA", (-9.0, -13.0, 17.0), 2050, 8.5, (1.0, 0.72, 0.55), (0.0, -0.8, 0.5)),
        ("I020_V7_CLAY_RIM", "AREA", (12.0, 4.0, 15.0), 1650, 8.0, (0.35, 0.55, 1.0), (0.0, -0.2, 1.5)),
        ("I020_V7_CLAY_TOP", "AREA", (-1.0, 0.0, 22.0), 1150, 9.0, (1.0, 0.48, 0.25), (0.0, -1.0, 0.0)),
    ):
        bpy.ops.object.light_add(type=kind, location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        light.data.color = color
        kit.look_at(light, target)
    for index, location in enumerate(((0.0, -1.1, 1.8), (0.0, -3.0, 1.2), (0.0, -5.7, -1.2), (0.0, -6.0, -4.2))):
        bpy.ops.object.light_add(type="POINT", location=location)
        glow = bpy.context.object
        glow.name = f"I020_V7_SEMANTIC_LAVA_GLOW_{index}"
        glow.data.energy = 260 if index < 2 else 390
        glow.data.color = (1.0, 0.09, 0.015)
        glow.data.shadow_soft_size = 1.0

    camera_data = bpy.data.cameras.new("I020_V7_REVIEW_CAMERA")
    camera = bpy.data.objects.new("I020_V7_REVIEW_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 56
    scene.camera = camera
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "front-hero": ((6.8, -24.5, 14.8), (0.0, -1.0, 0.9)),
        "left-45": ((-16.8, -19.5, 13.8), (0.0, -0.65, 0.75)),
        "right-45": ((16.8, -19.5, 13.8), (0.0, -0.65, 0.75)),
        "rear-sanity": ((6.8, 23.8, 14.6), (0.0, 0.15, 0.85)),
        "top-maze": ((0.0, -0.5, 30.0), (0.0, -0.8, -0.2)),
        "front-cliff-low": ((6.6, -26.5, 8.2), (0.0, -2.1, -1.7)),
    }
    for name, (position, target) in views.items():
        camera.location = position
        kit.look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v7-hero-wedge-{name}-v001.png")
        bpy.ops.render.render(write_still=True)

    # A least-flattering front wireframe exposes overlaps and paper-thin masses.
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.show_wireframes = True
    camera.location = (6.8, -24.5, 14.8)
    kit.look_at(camera, (0.0, -1.0, 0.9))
    scene.render.filepath = str(render_dir / "island-020-v7-hero-wedge-wireframe-front-v001.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = kit.ensure_parent(args.output_glb)
    output_blend = kit.ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    kit.clear_scene()
    materials = {
        "clay": kit.make_material("I020_V7_NAKED_BASALT_CLAY", (0.28, 0.245, 0.23, 1.0), roughness=0.94),
        "deep_clay": kit.make_material("I020_V7_NAKED_DEEP_CLAY", (0.105, 0.09, 0.095, 1.0), roughness=0.96),
        "iron_clay": kit.make_material("I020_V7_NAKED_IRON_CLAY", (0.07, 0.075, 0.085, 1.0), metallic=0.35, roughness=0.72),
        "molten_semantic": kit.make_material("I020_V7_SEMANTIC_MOLTEN", (1.0, 0.14, 0.008, 1.0), roughness=0.24, emission=(1.0, 0.025, 0.002, 1.0), emission_strength=5.0),
    }
    exported = build_world(materials)
    camera = setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.export_scene.gltf(filepath=str(output_glb), export_format="GLB", export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    render_views(camera, render_dir)
    print(f"ISLAND020_V7_HERO_WEDGE_EXPORT objects={len(exported)} glb={output_glb} blend={output_blend} renders={render_dir}")


if __name__ == "__main__":
    main()
