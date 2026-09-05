"""Build Island 020 V9's source-traced radial macro slice.

Unlike the retired castle-on-a-plate families, this route begins with the
complete circular city grammar: a deterministic polar maze, outer board ring,
cathedral-scale forge embedded in the maze, and a banked volumetric escape
channel.  Only one southwest sector receives meso-detail before the macro gate.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import island020_build_v5 as kit


FAMILY = "island-020-source-traced-radial-kit-v9"
SEED = 0x2009
RINGS = 4
SECTORS = 28
INNER_RADIUS = 3.25
CELL_DEPTH = 1.62
FRONT_SECTOR = 21


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--render-dir", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def tag(obj: bpy.types.Object, semantic: str, part_id: str) -> bpy.types.Object:
    obj["island"] = 20
    obj["family"] = FAMILY
    obj["semantic"] = semantic
    obj["part_id"] = part_id
    obj["export_role"] = "v9-representative-macro-slice"
    return obj


def joined(objects: list[bpy.types.Object], name: str, semantic: str, part_id: str) -> bpy.types.Object:
    return tag(kit.join_meshes(objects, name, semantic, part_id), semantic, part_id)


def annular_box(
    name: str,
    inner: float,
    outer: float,
    angle_a: float,
    angle_b: float,
    z_bottom: float,
    height: float,
    material: bpy.types.Material,
    semantic: str,
    part_id: str,
    segments: int = 5,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    for z in (z_bottom, z_bottom + height):
        for radius in (inner, outer):
            for i in range(segments + 1):
                t = i / segments
                angle = angle_a + (angle_b - angle_a) * t
                vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
    count = segments + 1
    faces: list[tuple[int, ...]] = []
    # bottom/top strips
    for layer in (0, 1):
        offset = layer * count * 2
        for i in range(segments):
            quad = (offset + i, offset + i + 1, offset + count + i + 1, offset + count + i)
            faces.append(tuple(reversed(quad)) if layer == 0 else quad)
    # curved inner/outer walls
    top_offset = count * 2
    for radial_index in (0, 1):
        offset = radial_index * count
        for i in range(segments):
            quad = (offset + i, offset + i + 1, top_offset + offset + i + 1, top_offset + offset + i)
            faces.append(quad if radial_index else tuple(reversed(quad)))
    # end caps
    for i in (0, segments):
        faces.append((i, count + i, top_offset + count + i, top_offset + i))
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    kit.apply_bevel(obj, min(0.045, height * 0.12), 2)
    return tag(obj, semantic, part_id)


def add_cylinder(name: str, location: tuple[float, float, float], radius: float, depth: float, material: bpy.types.Material, vertices: int = 10) -> bpy.types.Object:
    return kit.add_cone(name, location, radius, radius, depth, vertices, material, bevel=0.045)


def add_flow(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    material: bpy.types.Material,
    semantic: str,
    part_id: str,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(f"{name}_CURVE", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 4
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 3
    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return tag(bpy.context.object, semantic, part_id)


def add_basalt_nodes(material: bpy.types.Material, scale: float = 4.0, strength: float = 0.22) -> None:
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 5.0
    noise.inputs["Roughness"].default_value = 0.72
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = 0.16
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


def make_maze_connections() -> set[tuple[tuple[int, int], tuple[int, int]]]:
    rng = random.Random(SEED)
    start = (0, FRONT_SECTOR)
    visited = {start}
    stack = [start]
    links: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    while stack:
        ring, sector = stack[-1]
        candidates = []
        if ring > 0:
            candidates.append((ring - 1, sector))
        if ring < RINGS - 1:
            candidates.append((ring + 1, sector))
        candidates.extend(((ring, (sector - 1) % SECTORS), (ring, (sector + 1) % SECTORS)))
        rng.shuffle(candidates)
        unvisited = [cell for cell in candidates if cell not in visited]
        if not unvisited:
            stack.pop()
            continue
        nxt = unvisited[0]
        edge = tuple(sorted(((ring, sector), nxt)))
        links.add(edge)
        visited.add(nxt)
        stack.append(nxt)
    return links


def connected(links: set[tuple[tuple[int, int], tuple[int, int]]], a: tuple[int, int], b: tuple[int, int]) -> bool:
    return tuple(sorted((a, b))) in links


def build_foundation(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    obj = kit.create_ring_volume(
        "I020_V9_VOLCANIC_FOUNDATION",
        [
            (11.85, 0.35, 0.2, 0.035), (11.72, -0.20, 0.9, 0.055),
            (11.30, -1.40, 1.7, 0.075), (10.75, -2.80, 2.6, 0.105),
            (9.80, -4.50, 3.6, 0.145), (8.25, -6.20, 4.7, 0.19),
        ],
        112,
        materials["cliff"],
        "volcanic-foundation",
        "v9-00",
    )
    return tag(obj, "volcanic-foundation", "v9-00")


def build_maze(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object, dict[str, object]]:
    links = make_maze_connections()
    floors: list[bpy.types.Object] = []
    walls: list[bpy.types.Object] = []
    angle_step = math.tau / SECTORS
    wall_thickness = 0.16
    maze_graph: dict[str, object] = {"rings": RINGS, "sectors": SECTORS, "links": []}
    for edge in sorted(links):
        maze_graph["links"].append([list(edge[0]), list(edge[1])])

    for ring in range(RINGS):
        inner = INNER_RADIUS + ring * CELL_DEPTH
        outer = inner + CELL_DEPTH
        floor_z = 0.54 + ring * 0.075
        for sector in range(SECTORS):
            a = sector * angle_step
            b = (sector + 1) * angle_step
            # Individual slabs and tiny gutters preserve the radial cell rhythm.
            floors.append(annular_box(f"I020_V9_MAZE_FLOOR_{ring}_{sector}", inner + 0.045, outer - 0.045, a + 0.008, b - 0.008, floor_z, 0.26, materials["path_a" if (ring + sector) % 3 else "path_b"], "maze-walkable-cell", f"cell-{ring}-{sector}", 4))
            height = 0.78 + 0.16 * ((ring * 7 + sector * 3) % 4)

            # Clockwise radial wall. An opening means a real graph connection.
            right = (ring, (sector + 1) % SECTORS)
            if not connected(links, (ring, sector), right):
                angle = b
                radius_mid = (inner + outer) * 0.5
                x, y = math.cos(angle) * radius_mid, math.sin(angle) * radius_mid
                walls.append(kit.add_box(f"I020_V9_RADIAL_WALL_{ring}_{sector}", (x, y, floor_z + 0.28 + height * 0.5), (CELL_DEPTH - 0.16, wall_thickness, height), materials["basalt"], bevel=0.045, rotation_z=angle))

            # Outer arc wall. The outermost ring is closed except the escape gate.
            outward = (ring + 1, sector)
            has_outward = ring < RINGS - 1 and connected(links, (ring, sector), outward)
            is_exit = ring == RINGS - 1 and sector in (FRONT_SECTOR, (FRONT_SECTOR + 1) % SECTORS)
            if not has_outward and not is_exit:
                walls.append(annular_box(f"I020_V9_ARC_WALL_{ring}_{sector}", outer - wall_thickness * 0.5, outer + wall_thickness * 0.5, a + 0.018, b - 0.018, floor_z + 0.25, height, materials["deep" if sector % 4 == 0 else "basalt"], "maze-wall", f"wall-{ring}-{sector}", 3))

    return (
        joined(floors, "I020_V9_RADIAL_MAZE_FLOORS", "complete-radial-walkable-maze", "v9-01"),
        joined(walls, "I020_V9_RADIAL_MAZE_WALLS", "deterministic-polar-maze-walls", "v9-02"),
        maze_graph,
    )


def build_outer_board(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    parts: list[bpy.types.Object] = []
    step = math.tau / SECTORS
    for sector in range(SECTORS):
        a = sector * step + 0.012
        b = (sector + 1) * step - 0.012
        parts.append(annular_box(f"I020_V9_BOARD_TILE_{sector:02d}", 9.88, 11.28, a, b, 0.78, 0.34, materials["board_a" if sector % 2 else "board_b"], "outer-board-tile", f"board-{sector:02d}", 4))
        angle = (a + b) * 0.5
        # Dark inset rune gives every tile authored scale without image textures.
        x, y = math.cos(angle) * 10.58, math.sin(angle) * 10.58
        parts.append(add_cylinder(f"I020_V9_BOARD_RUNE_{sector:02d}", (x, y, 1.16), 0.17 + (sector % 3) * 0.025, 0.06, materials["iron"], 6 + sector % 3))
    parts.append(annular_box("I020_V9_BOARD_INNER_RAIL", 9.58, 9.82, 0.0, math.tau, 0.66, 0.62, materials["iron"], "board-inner-rail", "v9-03a", 112))
    parts.append(annular_box("I020_V9_BOARD_OUTER_RAIL", 11.30, 11.55, 0.0, math.tau, 0.60, 0.74, materials["deep"], "board-outer-rail", "v9-03b", 112))
    return joined(parts, "I020_V9_OUTER_BOARD_RING", "source-scale-outer-board-ring", "v9-03")


def build_keep(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    p: list[bpy.types.Object] = []
    molten: list[bpy.types.Object] = []
    # Broad embedded podium meets the inner maze ring on all sides.
    p.extend((
        add_cylinder("I020_V9_KEEP_PODIUM", (0.0, 0.0, 0.92), 3.18, 1.02, materials["deep"], 12),
        add_cylinder("I020_V9_KEEP_TERRACE", (0.0, 0.0, 1.50), 2.72, 0.48, materials["basalt"], 12),
        kit.add_box("I020_V9_KEEP_LOWER_FORGE", (0.0, 0.08, 2.18), (3.82, 3.35, 1.52), materials["basalt"], bevel=0.13),
        kit.add_box("I020_V9_KEEP_TOWER", (0.0, 0.12, 4.78), (2.32, 2.20, 4.10), materials["deep"], bevel=0.10),
        kit.add_box("I020_V9_KEEP_BELFRY", (0.0, 0.12, 7.10), (1.78, 1.72, 0.72), materials["basalt"], bevel=0.08),
    ))
    # One source-like forge spire, not a forest of fairytale roofs.
    p.append(kit.add_cone("I020_V9_KEEP_FORGE_SPIRE", (0.0, 0.12, 8.46), 1.18, 0.12, 2.10, 8, materials["iron"], rotation_z=math.pi / 8, bevel=0.045))
    p.append(add_cylinder("I020_V9_KEEP_SPIRE_LANTERN", (0.0, 0.12, 9.62), 0.20, 0.42, materials["iron"], 8))

    # Tall attached buttresses carry the tower into the podium.
    for index, (x, y, sx, sy) in enumerate(((-1.42, -1.28, 0.68, 0.86), (1.42, -1.28, 0.68, 0.86), (-1.42, 1.38, 0.68, 0.86), (1.42, 1.38, 0.68, 0.86))):
        p.append(kit.add_box(f"I020_V9_KEEP_BUTTRESS_{index}", (x, y, 3.55), (sx, sy, 4.55), materials["basalt"], bevel=0.075))
        p.append(kit.add_cone(f"I020_V9_KEEP_BUTTRESS_CAP_{index}", (x, y, 6.10), 0.50, 0.14, 1.10, 6, materials["iron"], rotation_z=math.pi / 6, bevel=0.035))

    # Attached workshops fill the inner city and make the keep inseparable from it.
    for index, angle in enumerate(i * math.tau / 10 for i in range(10)):
        radius = 2.35 + 0.20 * (index % 2)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        p.append(kit.add_box(f"I020_V9_KEEP_WORKSHOP_{index}", (x, y, 1.78 + 0.12 * (index % 3)), (1.18, 1.02, 1.72 + 0.24 * (index % 3)), materials["basalt" if index % 3 else "deep"], bevel=0.09, rotation_z=angle))
        chimney_x, chimney_y = math.cos(angle + 0.14) * (radius + 0.28), math.sin(angle + 0.14) * (radius + 0.28)
        p.append(add_cylinder(f"I020_V9_KEEP_CHIMNEY_{index}", (chimney_x, chimney_y, 2.90 + 0.16 * (index % 3)), 0.22, 2.25, materials["iron"], 8))
        p.append(add_cylinder(f"I020_V9_KEEP_CHIMNEY_LIP_{index}", (chimney_x, chimney_y, 4.06 + 0.16 * (index % 3)), 0.29, 0.16, materials["deep"], 8))

    # Large molten apertures on all tower faces and a front furnace door.
    for index, (x, y, sx, sy) in enumerate(((0.0, -1.115, 0.34, 0.07), (1.175, 0.12, 0.07, 0.34), (0.0, 1.355, 0.34, 0.07), (-1.175, 0.12, 0.07, 0.34))):
        molten.append(kit.add_box(f"I020_V9_KEEP_MOLTEN_WINDOW_{index}", (x, y, 4.88), (sx, sy, 2.42), materials["lava_hot"], bevel=0.08))
    molten.append(kit.add_box("I020_V9_KEEP_FURNACE_DOOR", (0.0, -1.635, 2.12), (0.72, 0.07, 1.55), materials["lava"], bevel=0.11))
    return (
        joined(p, "I020_V9_CENTRAL_FORGE_CATHEDRAL", "embedded-cathedral-scale-forge-keep", "v9-04"),
        joined(molten, "I020_V9_KEEP_MOLTEN_CORE", "keep-molten-core", "v9-05"),
    )


def build_sector_detail(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    p: list[bpy.types.Object] = []
    # Southwest quadrant (roughly 180–270°) receives the only meso-detail.
    for index, (radius, angle_deg, height, width) in enumerate((
        (4.15, 194, 1.85, 0.46), (5.15, 205, 2.35, 0.52), (6.10, 214, 1.75, 0.45),
        (7.20, 224, 2.55, 0.56), (8.15, 235, 1.92, 0.48), (4.65, 246, 2.42, 0.54),
        (5.82, 254, 1.72, 0.44), (7.05, 262, 2.28, 0.52), (8.55, 267, 1.88, 0.46),
    )):
        angle = math.radians(angle_deg)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        p.append(add_cylinder(f"I020_V9_SW_FORGE_TOWER_{index}", (x, y, 1.10 + height * 0.5), width, height, materials["deep" if index % 3 == 0 else "basalt"], 8))
        p.append(add_cylinder(f"I020_V9_SW_FORGE_TOWER_LIP_{index}", (x, y, 1.16 + height), width * 1.24, 0.18, materials["iron"], 8))
    for index, (r1, r2, angle_deg, z) in enumerate(((3.55, 5.05, 216, 2.12), (5.22, 6.75, 232, 2.48), (6.90, 8.55, 249, 2.18))):
        angle = math.radians(angle_deg)
        radius_mid = (r1 + r2) * 0.5
        x, y = math.cos(angle) * radius_mid, math.sin(angle) * radius_mid
        p.append(kit.add_box(f"I020_V9_SW_ELEVATED_BRIDGE_{index}", (x, y, z), (r2 - r1, 0.52, 0.28), materials["iron"], bevel=0.06, rotation_z=angle))
        for side in (-1, 1):
            side_angle = angle + math.pi / 2
            p.append(kit.add_box(f"I020_V9_SW_BRIDGE_RAIL_{index}_{side}", (x + math.cos(side_angle) * side * 0.28, y + math.sin(side_angle) * side * 0.28, z + 0.28), (r2 - r1, 0.10, 0.38), materials["deep"], bevel=0.03, rotation_z=angle))
    # Two visible stair flights prove multi-level traversal scale.
    for flight, (radius, angle_deg, rising) in enumerate(((5.25, 224, 1), (7.25, 255, -1))):
        angle = math.radians(angle_deg)
        for step in range(8):
            r = radius + (step - 3.5) * 0.15
            x, y = math.cos(angle) * r, math.sin(angle) * r
            z = 0.92 + (step if rising > 0 else 7 - step) * 0.11
            p.append(kit.add_box(f"I020_V9_SW_STAIR_{flight}_{step}", (x, y, z), (0.25, 0.72, 0.18), materials["path_b"], bevel=0.025, rotation_z=angle))
    return joined(p, "I020_V9_PLAYABLE_SW_SECTOR_DETAIL", "playable-multi-level-southwest-sector", "v9-06")


def build_lava_system(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    flows: list[bpy.types.Object] = []
    # Radial channels remain rounded volumes in visible masonry troughs.
    front = [(0.0, -2.0, 1.18), (0.12, -3.1, 0.95), (-0.18, -4.6, 0.80), (0.14, -6.2, 0.68), (-0.10, -8.2, 0.58), (0.0, -10.2, 0.48)]
    for i, (offset, radius) in enumerate(((-0.34, 0.24), (0.0, 0.32), (0.36, 0.22))):
        flows.append(add_flow(f"I020_V9_FRONT_FLOW_{i}", [(x + offset, y, z + 0.03 * i) for x, y, z in front], radius, materials["lava_hot" if i == 1 else "lava"], "front-volumetric-flow", "v9-07"))
    for stream_index, (radius, start, end) in enumerate(((5.75, math.radians(150), math.radians(282)), (7.55, math.radians(20), math.radians(132)))):
        points = []
        for i in range(18):
            t = i / 17
            angle = start + (end - start) * t
            resolved = radius + 0.16 * math.sin(i * 1.6 + stream_index)
            points.append((math.cos(angle) * resolved, math.sin(angle) * resolved, 0.62 + 0.05 * math.sin(i)))
        flows.append(add_flow(f"I020_V9_RING_FLOW_{stream_index}", points, 0.18, materials["lava"], "maze-volumetric-flow", "v9-07"))
    flow_root = joined(flows, "I020_V9_MAZE_MOLTEN_SYSTEM", "banked-volumetric-maze-flows", "v9-07")

    cascade: list[bpy.types.Object] = []
    center = [(0.0, -10.1, 0.42), (0.05, -10.7, -0.35), (-0.12, -11.05, -1.55), (0.10, -11.25, -2.95), (-0.06, -11.50, -4.48), (0.04, -11.72, -5.82)]
    for i, (offset, radius) in enumerate(((-0.62, 0.30), (-0.28, 0.36), (0.12, 0.40), (0.50, 0.29))):
        cascade.append(add_flow(f"I020_V9_CASCADE_{i}", [(x + offset + 0.05 * math.sin(j + i), y - i * 0.025, z) for j, (x, y, z) in enumerate(center)], radius, materials["lava_hot" if i == 2 else "lava"], "front-volumetric-cascade", "v9-08"))
    cascade_root = joined(cascade, "I020_V9_FRONT_VOLUMETRIC_CASCADE", "front-volumetric-cascade", "v9-08")

    basin: list[bpy.types.Object] = [
        add_cylinder("I020_V9_PLUNGE_BASIN_ROCK", (0.0, -12.05, -6.10), 2.05, 0.54, materials["deep"], 28),
        add_cylinder("I020_V9_PLUNGE_BASIN_LAVA", (0.0, -12.12, -5.78), 1.62, 0.18, materials["lava"], 32),
    ]
    for i in range(12):
        angle = i * math.tau / 12
        basin.append(kit.add_cone(f"I020_V9_BASIN_ROCK_{i}", (math.cos(angle) * 1.86, -12.10 + math.sin(angle) * 0.82, -5.68), 0.42, 0.28, 0.92, 7, materials["cliff"], rotation_z=angle, bevel=0.04))
    return flow_root, cascade_root, joined(basin, "I020_V9_ESCAPE_PLUNGE_BASIN", "escape-plunge-basin", "v9-09")


def build_front_gate(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    p: list[bpy.types.Object] = []
    for side in (-1, 1):
        x = side * 1.42
        p.append(kit.add_cone(f"I020_V9_GATE_PYLON_{side}", (x, -9.72, 1.82), 0.70, 0.56, 2.85, 8, materials["basalt"], rotation_z=math.pi / 8, bevel=0.06))
        p.append(add_cylinder(f"I020_V9_GATE_PYLON_LIP_{side}", (x, -9.72, 3.30), 0.76, 0.20, materials["iron"], 8))
        p.append(kit.add_box(f"I020_V9_GATE_BANK_{side}", (side * 2.35, -9.72, 1.36), (1.45, 0.72, 1.76), materials["deep"], bevel=0.10))
    p.append(kit.add_box("I020_V9_GATE_LINTEL", (0.0, -9.72, 3.02), (2.18, 0.82, 0.58), materials["iron"], bevel=0.07))
    for i in range(5):
        p.append(kit.add_box(f"I020_V9_GATE_TOOTH_{i}", (-0.92 + i * 0.46, -9.72, 3.48), (0.24, 0.38, 0.48), materials["deep"], bevel=0.03))
    return joined(p, "I020_V9_FRONT_FURNACE_GATE", "front-furnace-escape-gate", "v9-10")


def build_background(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    background: list[bpy.types.Object] = []
    background.append(add_cylinder("I020_V9_BACKGROUND_LAVA_FIELD", (0.0, 0.0, -6.55), 34.0, 0.24, materials["lava_dim"], 96))
    rng = random.Random(SEED + 99)
    for i in range(34):
        angle = i * math.tau / 34 + rng.uniform(-0.06, 0.06)
        radius = rng.uniform(15.0, 27.0)
        height = rng.uniform(2.8, 9.0)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        background.append(kit.add_cone(f"I020_V9_BACKGROUND_SPIRE_{i}", (x, y, -6.35 + height * 0.5), rng.uniform(0.65, 1.65), 0.05, height, rng.choice((6, 7, 8)), materials["cliff"], rotation_z=rng.random(), bevel=0.04))
    return background


def setup_render(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 980
    scene.render.resolution_y = 980
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.006, 0.004, 0.006, 1.0)
    bg.inputs["Strength"].default_value = 0.28
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    for name, location, energy, size, color, target in (
        ("I020_V9_KEY", (-16.0, -18.0, 25.0), 4300, 12.0, (1.0, 0.44, 0.18), (0.0, -1.0, 0.0)),
        ("I020_V9_FILL", (18.0, -5.0, 18.0), 3000, 11.0, (0.20, 0.34, 0.60), (0.0, 0.0, 0.6)),
        ("I020_V9_TOP", (0.0, 4.0, 30.0), 2600, 10.0, (1.0, 0.25, 0.07), (0.0, 0.0, 0.0)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        light.data.color = color
        kit.look_at(light, target)
    for i, (location, energy, radius) in enumerate((
        ((0.0, -2.4, 2.0), 900, 2.0), ((0.0, -6.0, 1.1), 1150, 2.2),
        ((0.0, -10.4, -0.6), 1550, 2.5), ((0.0, -11.5, -4.4), 1750, 2.8),
        ((-5.0, -5.0, 1.0), 750, 1.8), ((5.5, 3.6, 1.0), 620, 1.8),
    )):
        bpy.ops.object.light_add(type="POINT", location=location)
        light = bpy.context.object
        light.name = f"I020_V9_HEAT_LIGHT_{i}"
        light.data.energy = energy
        light.data.color = (1.0, 0.045, 0.004)
        light.data.shadow_soft_size = radius
    camera_data = bpy.data.cameras.new("I020_V9_REVIEW_CAMERA")
    camera = bpy.data.objects.new("I020_V9_REVIEW_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 58
    scene.camera = camera
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "source-match": ((15.5, -28.0, 24.0), (0.0, -0.3, 0.25)),
        "left-45": ((-23.5, -23.5, 18.5), (0.0, -0.3, 0.2)),
        "right-45": ((23.5, -23.5, 18.5), (0.0, -0.3, 0.2)),
        "rear-sanity": ((14.0, 27.0, 19.5), (0.0, 0.0, 0.35)),
        "top-maze": ((0.0, -0.5, 37.0), (0.0, -0.4, 0.0)),
        "front-cliff-low": ((12.0, -31.0, 9.5), (0.0, -3.0, -1.5)),
    }
    for name, (position, target) in views.items():
        camera.location = position
        kit.look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v9-macro-{name}-v001.png")
        bpy.ops.render.render(write_still=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    for obj in scene.objects:
        if obj.type == "MESH" and not obj.name.startswith("I020_V9_BACKGROUND"):
            obj.show_wire = True
            obj.show_all_edges = True
    camera.location = (15.5, -28.0, 24.0)
    kit.look_at(camera, (0.0, -0.3, 0.25))
    scene.render.filepath = str(render_dir / "island-020-v9-macro-wireframe-source-match-v001.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = kit.ensure_parent(args.output_glb)
    output_blend = kit.ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    kit.clear_scene()
    materials = {
        "basalt": kit.make_material("I020_V9_BASALT", (0.115, 0.075, 0.066, 1.0), roughness=0.88),
        "deep": kit.make_material("I020_V9_DEEP_BASALT", (0.020, 0.017, 0.022, 1.0), roughness=0.94),
        "cliff": kit.make_material("I020_V9_CLIFF", (0.033, 0.025, 0.028, 1.0), roughness=0.96),
        "iron": kit.make_material("I020_V9_BLACK_IRON", (0.026, 0.029, 0.035, 1.0), metallic=0.58, roughness=0.58),
        "path_a": kit.make_material("I020_V9_PATH_STONE_A", (0.205, 0.145, 0.105, 1.0), roughness=0.86),
        "path_b": kit.make_material("I020_V9_PATH_STONE_B", (0.135, 0.092, 0.078, 1.0), roughness=0.90),
        "board_a": kit.make_material("I020_V9_BOARD_STONE_A", (0.43, 0.31, 0.20, 1.0), roughness=0.78),
        "board_b": kit.make_material("I020_V9_BOARD_STONE_B", (0.30, 0.205, 0.15, 1.0), roughness=0.82),
        "lava": kit.make_material("I020_V9_LAVA", (1.0, 0.055, 0.002, 1.0), roughness=0.22, emission=(1.0, 0.012, 0.001, 1.0), emission_strength=3.6),
        "lava_hot": kit.make_material("I020_V9_LAVA_HOT", (1.0, 0.32, 0.018, 1.0), roughness=0.18, emission=(1.0, 0.075, 0.002, 1.0), emission_strength=4.8),
        "lava_dim": kit.make_material("I020_V9_LAVA_FIELD", (0.18, 0.007, 0.001, 1.0), roughness=0.34, emission=(0.38, 0.004, 0.001, 1.0), emission_strength=1.1),
    }
    for key in ("basalt", "deep", "cliff", "path_a", "path_b"):
        add_basalt_nodes(materials[key], 4.0 if key != "cliff" else 2.4, 0.16 if key.startswith("path") else 0.24)

    exports: list[bpy.types.Object] = [build_foundation(materials)]
    maze_floor, maze_walls, maze_graph = build_maze(materials)
    exports.extend((maze_floor, maze_walls, build_outer_board(materials)))
    exports.extend(build_keep(materials))
    exports.append(build_sector_detail(materials))
    exports.extend(build_lava_system(materials))
    exports.append(build_front_gate(materials))
    background = build_background(materials)
    camera = setup_render(materials)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in exports:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = exports[0]
    bpy.ops.export_scene.gltf(filepath=str(output_glb), export_format="GLB", use_selection=True, export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    render_views(camera, render_dir)
    print(f"ISLAND020_V9_MACRO_EXPORT objects={len(exports)} background={len(background)} graph_links={len(maze_graph['links'])} glb={output_glb}")


if __name__ == "__main__":
    main()
