"""Build Island 020 V8's naked industrial-crucible representative slice.

V7 proved the required scale but failed identity: it became a generic castle
and its lavafall was a flat slab.  V8 is a genuinely different geometry
family: an asymmetric, flat-crowned basalt forge city whose molten routes are
cut between banks and whose waterfall is a cluster of rounded flowing volumes.
Only the contracted hero wedge is built here; the rest of the island remains
frozen until this slice passes the source-locked visual gate.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import island020_build_v5 as kit


FAMILY = "island-020-industrial-basalt-crucible-v8"


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


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    vertices: int = 12,
) -> bpy.types.Object:
    return kit.add_cone(name, location, radius, radius, depth, vertices, material, bevel=0.045)


def add_flow_tube(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    material: bpy.types.Material,
    semantic: str,
    part_id: str,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(f"{name}_CURVE", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 3
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 3
    curve_data.resolution_u = 4
    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    return retag(obj, semantic, part_id)


def build_foundation(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    foundation = kit.create_ring_volume(
        "I020_V8_HERO_FOUNDATION",
        [
            (6.55, 0.30, 0.2, 0.055),
            (6.48, -0.15, 0.8, 0.07),
            (6.20, -1.15, 1.6, 0.10),
            (5.88, -2.35, 2.7, 0.14),
            (5.35, -3.75, 3.6, 0.18),
            (4.35, -5.35, 4.4, 0.22),
        ],
        80,
        materials["deep"],
        "layered-volcanic-foundation",
        "v8-hero-00",
    )
    return retag(foundation, "layered-volcanic-foundation", "v8-hero-00")


def build_keep(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    p: list[bpy.types.Object] = []
    # Wide stepped furnace terraces anchor the tower into the city rather than
    # perching a castle on a flat plate.
    terraces = (
        (0.0, 0.10, 0.70, 4.80, 4.25, 0.72),
        (0.0, 0.16, 1.25, 4.05, 3.55, 0.58),
        (0.0, 0.18, 1.83, 3.30, 3.00, 0.70),
    )
    for i, (x, y, z, sx, sy, sz) in enumerate(terraces):
        p.append(kit.add_box(f"I020_V8_KEEP_TERRACE_{i}", (x, y, z), (sx, sy, sz), materials["deep" if i != 1 else "clay"], bevel=0.14))

    p.append(kit.add_cone("I020_V8_KEEP_LOWER_OCTAGON", (0.0, 0.18, 3.20), 1.72, 1.48, 2.75, 8, materials["clay"], rotation_z=math.pi / 8, bevel=0.08))
    p.append(kit.add_cone("I020_V8_KEEP_UPPER_OCTAGON", (0.0, 0.18, 5.32), 1.30, 1.06, 1.60, 8, materials["deep"], rotation_z=math.pi / 8, bevel=0.06))
    p.append(kit.add_cone("I020_V8_KEEP_FURNACE_CROWN", (0.0, 0.18, 6.42), 1.48, 1.30, 0.62, 8, materials["iron"], rotation_z=math.pi / 8, bevel=0.05))
    p.append(kit.add_cone("I020_V8_KEEP_CROWN_LIP", (0.0, 0.18, 6.79), 1.58, 1.58, 0.20, 8, materials["deep"], rotation_z=math.pi / 8, bevel=0.035))

    # Massive furnace ribs and asymmetric machinery break the fantasy-castle read.
    for i, angle in enumerate((0.0, math.pi / 2, math.pi, math.pi * 1.5)):
        x, y = math.sin(angle) * 1.60, 0.18 + math.cos(angle) * 1.60
        dims = (0.48, 0.72, 3.65) if i % 2 == 0 else (0.72, 0.48, 3.65)
        p.append(kit.add_box(f"I020_V8_KEEP_RIB_{i}", (x, y, 3.48), dims, materials["deep"], bevel=0.07))
        p.append(kit.add_box(f"I020_V8_KEEP_RIB_CAP_{i}", (x, y, 5.36), (dims[0] * 1.32, dims[1] * 1.32, 0.30), materials["iron"], bevel=0.045))

    for i, (x, y, height, radius) in enumerate(((-1.82, 1.10, 3.8, 0.43), (1.82, 1.05, 4.5, 0.47), (-2.05, -0.70, 2.7, 0.36), (2.08, -0.62, 3.2, 0.39))):
        p.append(add_cylinder(f"I020_V8_KEEP_EXHAUST_{i}", (x, y, 1.65 + height * 0.5), radius, height, materials["iron"], 10))
        p.append(add_cylinder(f"I020_V8_KEEP_EXHAUST_LIP_{i}", (x, y, 1.65 + height), radius * 1.22, 0.23, materials["deep"], 10))

    for i, angle in enumerate(range(0, 360, 45)):
        rad = math.radians(angle)
        x, y = math.sin(rad) * 1.25, 0.18 + math.cos(rad) * 1.25
        p.append(kit.add_box(f"I020_V8_CROWN_TOOTH_{i}", (x, y, 7.15), (0.34, 0.34, 0.72), materials["iron"], bevel=0.035, rotation_z=rad))

    molten: list[bpy.types.Object] = []
    for i, (x, y, sx, sy, z, h) in enumerate((
        (0.0, -1.515, 0.34, 0.08, 3.75, 2.45),
        (1.515, 0.18, 0.08, 0.34, 3.65, 1.65),
        (-1.515, 0.18, 0.08, 0.34, 3.65, 1.65),
        (0.0, 1.695, 0.34, 0.08, 3.85, 1.45),
    )):
        molten.append(kit.add_box(f"I020_V8_KEEP_FURNACE_VENT_{i}", (x, y, z), (sx, sy, h), materials["molten"], bevel=0.06))

    keep = joined(p, "I020_V8_CENTRAL_CRUCIBLE_KEEP", "industrial-central-crucible-keep", "v8-hero-01")
    vents = joined(molten, "I020_V8_KEEP_MOLTEN_VENTS", "deep-furnace-vent-glow", "v8-hero-01b")
    return keep, vents


def build_forge_axis(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    banks: list[bpy.types.Object] = []
    # Channel floor sits visibly below the stepped banks.
    for side in (-1, 1):
        x = side * 0.98
        banks.append(kit.add_box(f"I020_V8_CHANNEL_BANK_{side}", (x, -2.75, 1.05), (0.72, 4.65, 1.55), materials["deep"], bevel=0.12))
        for j, y in enumerate((-1.35, -2.45, -3.55, -4.45)):
            banks.append(kit.add_cone(f"I020_V8_CHANNEL_PIER_{side}_{j}", (side * 1.43, y, 1.64 + 0.10 * (j % 2)), 0.48, 0.38, 2.55, 8, materials["clay"], rotation_z=math.pi / 8, bevel=0.055))
            banks.append(add_cylinder(f"I020_V8_CHANNEL_PIER_CAP_{side}_{j}", (side * 1.43, y, 3.00 + 0.10 * (j % 2)), 0.54, 0.22, materials["iron"], 8))
    banks.append(kit.add_box("I020_V8_CHANNEL_THRESHOLD", (0.0, -4.94, 0.82), (3.85, 0.62, 0.72), materials["deep"], bevel=0.10))
    banks_root = joined(banks, "I020_V8_DEEP_FORGE_BANKS", "deep-banked-forge-axis", "v8-hero-02")

    points = [(0.0, -0.95, 0.92), (-0.08, -1.85, 0.74), (0.10, -2.80, 0.55), (-0.06, -3.78, 0.38), (0.0, -4.86, 0.18)]
    bed = retag(kit.create_ribbon("I020_V8_CHANNEL_BED", points, 0.68, 0.30, materials["iron"], "carved-forge-channel-bed", "v8-hero-02b"), "carved-forge-channel-bed", "v8-hero-02b")
    flow_parts = [
        add_flow_tube("I020_V8_CHANNEL_FLOW_MAIN", [(x, y, z + 0.16) for x, y, z in points], 0.31, materials["molten"], "volumetric-channel-flow", "v8-hero-02c"),
        add_flow_tube("I020_V8_CHANNEL_FLOW_ROPE", [(-0.24, y, z + 0.21) for _, y, z in points], 0.12, materials["hot"], "volumetric-channel-flow", "v8-hero-02c"),
    ]
    return banks_root, bed, joined(flow_parts, "I020_V8_CHANNEL_FLOW", "volumetric-channel-flow", "v8-hero-02c")


def build_gate(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    p: list[bpy.types.Object] = []
    for side in (-1, 1):
        x = side * 1.72
        p.append(kit.add_cone(f"I020_V8_GATE_PYLON_{side}", (x, -4.92, 2.16), 0.92, 0.72, 3.72, 8, materials["clay"], rotation_z=math.pi / 8, bevel=0.07))
        p.append(add_cylinder(f"I020_V8_GATE_PYLON_LIP_{side}", (x, -4.92, 4.10), 0.94, 0.25, materials["iron"], 8))
        p.append(kit.add_box(f"I020_V8_GATE_SIDE_WING_{side}", (side * 3.10, -4.86, 1.42), (2.02, 0.88, 2.25), materials["deep"], bevel=0.11))
        for j in range(4):
            p.append(kit.add_box(f"I020_V8_GATE_WING_RIB_{side}_{j}", (side * (2.32 + j * 0.52), -5.35, 1.50), (0.25, 0.32, 2.45 - j * 0.13), materials["iron"], bevel=0.035))
    p.append(kit.add_box("I020_V8_GATE_LINTEL", (0.0, -4.92, 3.55), (2.85, 1.05, 0.72), materials["deep"], bevel=0.09))
    p.append(kit.add_box("I020_V8_GATE_HEAT_SHIELD", (0.0, -5.48, 3.78), (2.20, 0.18, 0.34), materials["iron"], bevel=0.04))
    for i in range(5):
        p.append(kit.add_box(f"I020_V8_GATE_CROWN_TOOTH_{i}", (-1.08 + i * 0.54, -4.92, 4.16), (0.30, 0.54, 0.56), materials["iron"], bevel=0.035))
    gate = joined(p, "I020_V8_FRONT_FURNACE_GATE", "industrial-front-furnace-gate", "v8-hero-03")

    stairs: list[bpy.types.Object] = []
    for i in range(11):
        y = -5.38 - i * 0.20
        z = 0.46 - i * 0.082
        stairs.append(kit.add_box(f"I020_V8_GATE_STEP_{i}", (0.0, y, z), (2.65 + i * 0.10, 0.31, 0.16), materials["clay"], bevel=0.025))
    for side in (-1, 1):
        stairs.append(kit.add_box(f"I020_V8_STAIR_BANK_{side}", (side * 1.72, -6.15, 0.32), (0.36, 2.05, 0.82), materials["deep"], bevel=0.07, rotation_z=side * 0.045))
    return gate, joined(stairs, "I020_V8_GATE_DESCENT", "front-gate-descent", "v8-hero-04")


def build_maze(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    p: list[bpy.types.Object] = []
    # Dense low forge blocks and tight lanes, avoiding miniature castle turrets.
    blocks = (
        (-3.98, -2.50, 0.72, 3.55, 2.25), (-2.83, -3.74, 2.65, 0.58, 1.55),
        (-2.72, -1.10, 2.55, 0.56, 1.82), (-1.82, -2.10, 0.58, 2.30, 1.38),
        (-3.22, -2.40, 1.45, 0.50, 1.12), (-2.50, -2.96, 0.52, 1.38, 1.06),
        (-3.62, -1.66, 0.52, 1.02, 1.28), (-2.20, -1.72, 1.08, 0.48, 1.00),
        (-3.42, -3.22, 0.95, 0.48, 0.92), (-4.54, -3.22, 0.50, 1.34, 1.30),
        (-4.52, -1.31, 0.48, 1.20, 1.48),
    )
    for i, (x, y, sx, sy, h) in enumerate(blocks):
        p.append(kit.add_box(f"I020_V8_SW_MAZE_BLOCK_{i}", (x, y, 0.34 + h * 0.5), (sx, sy, h), materials["deep" if i % 4 == 0 else "clay"], bevel=0.09))
        if i in (0, 1, 2, 4, 9, 10):
            p.append(kit.add_box(f"I020_V8_SW_MAZE_CAP_{i}", (x, y, 0.40 + h), (sx * 1.06, sy * 1.06, 0.20), materials["iron"], bevel=0.04))
    for i, (x, y, h, r) in enumerate(((-4.28, -4.18, 2.85, 0.54), (-4.42, -0.58, 2.60, 0.50), (-1.55, -3.62, 2.45, 0.46), (-2.98, -2.22, 2.20, 0.43))):
        p.append(add_cylinder(f"I020_V8_SW_FORGE_STACK_{i}", (x, y, 0.34 + h * 0.5), r, h, materials["deep"], 10))
        p.append(add_cylinder(f"I020_V8_SW_FORGE_STACK_LIP_{i}", (x, y, 0.40 + h), r * 1.20, 0.22, materials["iron"], 10))
    p.append(kit.add_box("I020_V8_SW_HIGH_BRIDGE", (-2.82, -2.22, 2.02), (2.45, 0.66, 0.34), materials["iron"], bevel=0.07))
    for side in (-1, 1):
        p.append(kit.add_box(f"I020_V8_SW_BRIDGE_RAIL_{side}", (-2.82, -2.22 + side * 0.32, 2.34), (2.45, 0.12, 0.42), materials["deep"], bevel=0.035))
    return joined(p, "I020_V8_SOUTHWEST_FORGE_MAZE", "dense-multi-level-forge-maze", "v8-hero-05")


def build_cliff_and_fall(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    rocks: list[bpy.types.Object] = []
    # Two converging basalt banks frame a recessed chute and hide the foundation seam.
    for side in (-1, 1):
        for i in range(9):
            y = -5.65 - i * 0.27
            z = -0.45 - i * 0.58
            x = side * (0.78 + 0.12 * math.sin(i * 0.9))
            rocks.append(kit.add_cone(f"I020_V8_FALL_BANK_{side}_{i}", (x, y, z), 0.62 + 0.04 * (i % 3), 0.48, 1.35, 7, materials["deep" if i % 2 else "clay"], rotation_z=i * 0.19, bevel=0.05))
    for i in range(18):
        t = i / 17
        x = -5.9 + t * 11.8
        if abs(x) < 1.35:
            continue
        y = -5.75 - 0.24 * math.sin(i * 1.23)
        h = 2.2 + (i % 4) * 0.44
        rocks.append(kit.add_cone(f"I020_V8_FRONT_CLIFF_{i}", (x, y, -1.05 - h * 0.5), 0.48, 0.62, h, 7, materials["deep"], rotation_z=i * 0.17, bevel=0.04))
    cliff = joined(rocks, "I020_V8_BANKED_FRONT_CLIFF", "banked-volcanic-cliff", "v8-hero-06")

    centerline = [(0.0, -5.10, 0.42), (0.03, -5.45, -0.20), (-0.10, -5.72, -1.22), (0.10, -5.92, -2.45), (-0.04, -6.18, -3.72), (0.05, -6.50, -4.82)]
    flows: list[bpy.types.Object] = []
    for i, (offset, radius, zoff) in enumerate(((-0.34, 0.27, 0.02), (0.0, 0.39, 0.0), (0.38, 0.24, -0.08), (-0.12, 0.18, 0.12))):
        pts = [(x + offset + math.sin(j * 1.4 + i) * 0.07, y - i * 0.025, z + zoff) for j, (x, y, z) in enumerate(centerline)]
        flows.append(add_flow_tube(f"I020_V8_LAVA_CASCADE_ROPE_{i}", pts, radius, materials["molten" if i != 3 else "hot"], "volumetric-lava-cascade", "v8-hero-07"))
    cascade = joined(flows, "I020_V8_VOLUMETRIC_LAVA_CASCADE", "volumetric-lava-cascade", "v8-hero-07")

    basin_parts: list[bpy.types.Object] = []
    basin_parts.append(add_cylinder("I020_V8_PLUNGE_BASIN_ROCK", (0.0, -6.68, -5.15), 1.48, 0.42, materials["deep"], 20))
    basin_parts.append(add_cylinder("I020_V8_PLUNGE_BASIN_LAVA", (0.0, -6.72, -4.90), 1.12, 0.16, materials["molten"], 24))
    for i, angle in enumerate(range(0, 360, 45)):
        rad = math.radians(angle)
        basin_parts.append(kit.add_cone(f"I020_V8_BASIN_RIM_{i}", (math.cos(rad) * 1.26, -6.72 + math.sin(rad) * 0.62, -4.85), 0.32, 0.24, 0.70, 7, materials["clay"], rotation_z=rad, bevel=0.03))
    basin = joined(basin_parts, "I020_V8_LAVA_PLUNGE_BASIN", "lava-plunge-basin", "v8-hero-08")
    return cliff, cascade, basin


def build_world(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    exports = [build_foundation(materials)]
    exports.extend(build_keep(materials))
    exports.extend(build_forge_axis(materials))
    exports.extend(build_gate(materials))
    exports.append(build_maze(materials))
    exports.extend(build_cliff_and_fall(materials))
    return exports


def setup_render() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 840
    scene.render.resolution_y = 980
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.008, 0.007, 0.009, 1.0)
    bg.inputs["Strength"].default_value = 0.34
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    for name, location, energy, size, color, target in (
        ("I020_V8_KEY", (-10.0, -14.0, 16.0), 2300, 8.0, (1.0, 0.52, 0.26), (0.0, -1.6, 0.3)),
        ("I020_V8_RIM", (13.0, 3.0, 14.0), 1900, 7.0, (0.23, 0.38, 0.64), (0.0, -0.4, 1.0)),
        ("I020_V8_TOP", (-2.0, 0.0, 20.0), 1000, 8.0, (1.0, 0.28, 0.09), (0.0, -1.0, 0.0)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        light.data.color = color
        kit.look_at(light, target)
    for i, (loc, energy, radius) in enumerate((
        ((0.0, -1.1, 1.8), 500, 1.4), ((0.0, -3.0, 1.0), 620, 1.5),
        ((0.0, -5.5, -0.4), 850, 1.6), ((0.0, -6.2, -3.2), 980, 2.0),
        ((-3.1, -2.3, 1.2), 280, 1.0),
    )):
        bpy.ops.object.light_add(type="POINT", location=loc)
        glow = bpy.context.object
        glow.name = f"I020_V8_LAVA_GLOW_{i}"
        glow.data.energy = energy
        glow.data.color = (1.0, 0.055, 0.006)
        glow.data.shadow_soft_size = radius

    camera_data = bpy.data.cameras.new("I020_V8_REVIEW_CAMERA")
    camera = bpy.data.objects.new("I020_V8_REVIEW_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 58
    scene.camera = camera
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "front-hero": ((7.1, -24.0, 12.8), (0.0, -1.65, 0.10)),
        "left-45": ((-16.5, -19.0, 12.4), (-0.25, -1.30, 0.30)),
        "right-45": ((16.5, -19.0, 12.4), (0.0, -1.25, 0.30)),
        "rear-sanity": ((7.2, 22.5, 13.0), (0.0, -0.10, 0.65)),
        "top-maze": ((0.0, -0.8, 29.0), (-0.7, -1.5, -0.45)),
        "front-cliff-low": ((6.4, -25.0, 6.2), (0.0, -2.65, -2.10)),
    }
    for name, (position, target) in views.items():
        camera.location = position
        kit.look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v8-hero-wedge-{name}-v001.png")
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
    camera.location = (7.1, -24.0, 12.8)
    kit.look_at(camera, (0.0, -1.65, 0.10))
    scene.render.filepath = str(render_dir / "island-020-v8-hero-wedge-wireframe-front-v001.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = kit.ensure_parent(args.output_glb)
    output_blend = kit.ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    kit.clear_scene()
    materials = {
        "clay": kit.make_material("I020_V8_BASALT_CLAY", (0.205, 0.175, 0.17, 1.0), roughness=0.92),
        "deep": kit.make_material("I020_V8_DEEP_BASALT", (0.038, 0.032, 0.039, 1.0), roughness=0.95),
        "iron": kit.make_material("I020_V8_BLACK_IRON", (0.030, 0.033, 0.040, 1.0), metallic=0.52, roughness=0.66),
        "molten": kit.make_material("I020_V8_MOLTEN", (1.0, 0.10, 0.004, 1.0), roughness=0.22, emission=(1.0, 0.018, 0.001, 1.0), emission_strength=5.4),
        "hot": kit.make_material("I020_V8_WHITE_HOT", (1.0, 0.48, 0.08, 1.0), roughness=0.18, emission=(1.0, 0.12, 0.005, 1.0), emission_strength=7.0),
    }
    exports = build_world(materials)
    camera = setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.export_scene.gltf(filepath=str(output_glb), export_format="GLB", export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    render_views(camera, render_dir)
    print(f"ISLAND020_V8_HERO_WEDGE_EXPORT objects={len(exports)} glb={output_glb} blend={output_blend} renders={render_dir}")


if __name__ == "__main__":
    main()
