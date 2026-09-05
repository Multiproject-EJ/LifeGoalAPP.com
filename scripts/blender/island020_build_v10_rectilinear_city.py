"""Build V10: an orthogonal terraced lava-city inside the circular game ring."""

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


FAMILY = "island-020-rectilinear-terraced-lava-city-v10"
GRID = 13
CELL = 1.22
CENTER = GRID // 2
SEED = 0x2010


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
    obj["export_role"] = "v10-representative-macro-slice"
    return obj


def joined(parts: list[bpy.types.Object], name: str, semantic: str, part_id: str) -> bpy.types.Object:
    return tag(kit.join_meshes(parts, name, semantic, part_id), semantic, part_id)


def valid_cell(cell: tuple[int, int]) -> bool:
    ix, iy = cell
    if not (0 <= ix < GRID and 0 <= iy < GRID):
        return False
    dx, dy = ix - CENTER, iy - CENTER
    if dx * dx + dy * dy > 38:
        return False
    # Central cathedral owns a 3x3 socket.
    if abs(dx) <= 1 and abs(dy) <= 1:
        return False
    return True


def world_xy(cell: tuple[int, int]) -> tuple[float, float]:
    ix, iy = cell
    return ((ix - CENTER) * CELL, (iy - CENTER) * CELL)


def build_graph() -> set[tuple[tuple[int, int], tuple[int, int]]]:
    rng = random.Random(SEED)
    start = (CENTER, 0)
    cells = {(x, y) for x in range(GRID) for y in range(GRID) if valid_cell((x, y))}
    visited = {start}
    stack = [start]
    links: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    while stack:
        current = stack[-1]
        x, y = current
        neighbours = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        rng.shuffle(neighbours)
        available = [n for n in neighbours if n in cells and n not in visited]
        if not available:
            stack.pop()
            continue
        nxt = available[0]
        links.add(tuple(sorted((current, nxt))))
        visited.add(nxt)
        stack.append(nxt)
    # Open four cathedral approaches without changing the outer perfect maze.
    for a, b in (
        ((CENTER, CENTER - 2), (CENTER, CENTER - 1)),
        ((CENTER + 2, CENTER), (CENTER + 1, CENTER)),
        ((CENTER, CENTER + 2), (CENTER, CENTER + 1)),
        ((CENTER - 2, CENTER), (CENTER - 1, CENTER)),
    ):
        if valid_cell(a):
            links.add(tuple(sorted((a, b))))
    return links


def connected(links: set[tuple[tuple[int, int], tuple[int, int]]], a: tuple[int, int], b: tuple[int, int]) -> bool:
    return tuple(sorted((a, b))) in links


def build_city_maze(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object, int]:
    links = build_graph()
    floors: list[bpy.types.Object] = []
    masonry: list[bpy.types.Object] = []
    details: list[bpy.types.Object] = []
    cells = [(x, y) for x in range(GRID) for y in range(GRID) if valid_cell((x, y))]
    for ix, iy in cells:
        x, y = world_xy((ix, iy))
        tier = 0.06 * ((ix + iy * 2) % 3)
        floors.append(kit.add_box(f"I020_V10_CITY_FLOOR_{ix}_{iy}", (x, y, 0.68 + tier), (CELL - 0.055, CELL - 0.055, 0.30), materials["path_a" if (ix + iy) % 3 else "path_b"], bevel=0.045))

        # Build north/east walls once; invalid neighbours become fortified perimeter.
        for direction, neighbour in (((1, 0), (ix + 1, iy)), ((0, 1), (ix, iy + 1))):
            neighbour_valid = valid_cell(neighbour)
            if connected(links, (ix, iy), neighbour):
                continue
            # Preserve the front escape mouth.
            if iy == 0 and ix in (CENTER, CENTER + 1) and direction == (0, 1):
                continue
            dx, dy = direction
            wx = x + dx * CELL * 0.5
            wy = y + dy * CELL * 0.5
            height = 1.05 + 0.22 * ((ix * 3 + iy * 5 + dx) % 5)
            if dx:
                dims = (0.22, CELL + 0.10, height)
            else:
                dims = (CELL + 0.10, 0.22, height)
            masonry.append(kit.add_box(f"I020_V10_CITY_WALL_{ix}_{iy}_{dx}_{dy}", (wx, wy, 0.90 + tier + height * 0.5), dims, materials["deep" if (ix + iy) % 5 == 0 else "basalt"], bevel=0.055))
            # Architectural coping and compact end buttresses make each wall a building facade.
            cap_dims = (dims[0] * 1.10, dims[1] * 1.10, 0.16)
            details.append(kit.add_box(f"I020_V10_CITY_WALL_CAP_{ix}_{iy}_{dx}_{dy}", (wx, wy, 0.96 + tier + height), cap_dims, materials["iron"], bevel=0.035))
            for side in (-1, 1):
                bx = wx + (0 if dx else side * CELL * 0.42)
                by = wy + (side * CELL * 0.42 if dx else 0)
                details.append(v9.add_cylinder(f"I020_V10_WALL_BUTTRESS_{ix}_{iy}_{dx}_{dy}_{side}", (bx, by, 0.94 + tier + height * 0.42), 0.16, height * 0.84, materials["deep"], 8))

        # Close the west/south circumference without duplicating interior walls.
        for dx, dy in ((-1, 0), (0, -1)):
            neighbour = (ix + dx, iy + dy)
            if valid_cell(neighbour) or connected(links, (ix, iy), neighbour):
                continue
            if dy == -1 and iy == 0 and ix in (CENTER, CENTER + 1):
                continue
            wx, wy = x + dx * CELL * 0.5, y + dy * CELL * 0.5
            height = 1.18 + 0.20 * ((ix * 5 + iy * 3) % 4)
            dims = (0.22, CELL + 0.10, height) if dx else (CELL + 0.10, 0.22, height)
            masonry.append(kit.add_box(f"I020_V10_CITY_BOUNDARY_{ix}_{iy}_{dx}_{dy}", (wx, wy, 0.90 + tier + height * 0.5), dims, materials["deep"], bevel=0.055))
            details.append(kit.add_box(f"I020_V10_CITY_BOUNDARY_CAP_{ix}_{iy}_{dx}_{dy}", (wx, wy, 0.96 + tier + height), (dims[0] * 1.10, dims[1] * 1.10, 0.16), materials["iron"], bevel=0.035))

    # Taller inhabited forge blocks occupy perimeter pockets, never graph corridors.
    for index, (ix, iy, sx, sy, h) in enumerate((
        (2, 4, 0.86, 0.72, 2.15), (3, 8, 0.94, 0.76, 1.82), (4, 2, 0.82, 0.88, 2.36),
        (4, 10, 0.88, 0.74, 2.08), (8, 2, 0.92, 0.72, 1.96), (9, 9, 0.82, 0.88, 2.28),
        (10, 5, 0.90, 0.70, 2.04), (2, 7, 0.76, 0.82, 1.74), (10, 8, 0.78, 0.82, 1.88),
    )):
        if not valid_cell((ix, iy)):
            continue
        x, y = world_xy((ix, iy))
        details.append(kit.add_box(f"I020_V10_FORGE_BLOCK_{index}", (x, y, 1.04 + h * 0.5), (sx, sy, h), materials["basalt"], bevel=0.085))
        details.append(kit.add_box(f"I020_V10_FORGE_BLOCK_ROOF_{index}", (x, y, 1.12 + h), (sx * 1.16, sy * 1.16, 0.20), materials["iron"], bevel=0.045))
        details.append(v9.add_cylinder(f"I020_V10_FORGE_BLOCK_STACK_{index}", (x + sx * 0.32, y + sy * 0.26, 1.25 + h + 0.58), 0.14, 1.20, materials["deep"], 8))

    # Three elevated crossovers and two stairs prove layered traversal.
    for index, (ix, iy, horizontal, z) in enumerate(((3, 5, True, 2.55), (8, 4, False, 2.25), (9, 7, True, 2.48))):
        x, y = world_xy((ix, iy))
        dims = (CELL * 2.1, 0.48, 0.26) if horizontal else (0.48, CELL * 2.1, 0.26)
        details.append(kit.add_box(f"I020_V10_CITY_BRIDGE_{index}", (x, y, z), dims, materials["iron"], bevel=0.06))
        for side in (-1, 1):
            rail_x = x if horizontal else x + side * 0.27
            rail_y = y + side * 0.27 if horizontal else y
            rail_dims = (dims[0], 0.10, 0.38) if horizontal else (0.10, dims[1], 0.38)
            details.append(kit.add_box(f"I020_V10_CITY_BRIDGE_RAIL_{index}_{side}", (rail_x, rail_y, z + 0.28), rail_dims, materials["deep"], bevel=0.025))
    for flight, (ix, iy, horizontal) in enumerate(((3, 4, True), (8, 8, False))):
        x0, y0 = world_xy((ix, iy))
        for step in range(9):
            offset = (step - 4) * 0.13
            x = x0 + (offset if horizontal else 0)
            y = y0 + (0 if horizontal else offset)
            dims = (0.26, 0.68, 0.16) if horizontal else (0.68, 0.26, 0.16)
            details.append(kit.add_box(f"I020_V10_CITY_STAIR_{flight}_{step}", (x, y, 0.96 + step * 0.11), dims, materials["path_b"], bevel=0.02))
    return (
        joined(floors, "I020_V10_CITY_FLOORS", "rectilinear-walkable-maze-cells", "v10-01"),
        joined(masonry, "I020_V10_CITY_MASONRY", "orthogonal-terraced-maze-walls", "v10-02"),
        joined(details, "I020_V10_CITY_ARCHITECTURE", "maze-attached-forge-architecture", "v10-03"),
        len(links),
    )


def build_cathedral(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    p: list[bpy.types.Object] = []
    molten: list[bpy.types.Object] = []
    p.extend((
        kit.add_box("I020_V10_KEEP_PODIUM", (0.0, 0.0, 0.92), (4.42, 4.25, 1.05), materials["deep"], bevel=0.16),
        kit.add_box("I020_V10_KEEP_LOWER_CROSS_NS", (0.0, 0.0, 1.78), (2.42, 5.15, 1.18), materials["basalt"], bevel=0.13),
        kit.add_box("I020_V10_KEEP_LOWER_CROSS_EW", (0.0, 0.0, 1.78), (5.15, 2.42, 1.18), materials["basalt"], bevel=0.13),
        kit.add_box("I020_V10_KEEP_MAIN_TOWER", (0.0, 0.08, 4.62), (2.42, 2.34, 4.72), materials["deep"], bevel=0.105),
        kit.add_box("I020_V10_KEEP_UPPER_TIER", (0.0, 0.08, 7.10), (2.82, 2.68, 0.54), materials["basalt"], bevel=0.075),
        v9.add_cylinder("I020_V10_KEEP_CROWN", (0.0, 0.08, 7.62), 1.35, 0.38, materials["iron"], 8),
        kit.add_cone("I020_V10_KEEP_FORGE_SPIRE", (0.0, 0.08, 8.82), 1.08, 0.10, 2.10, 8, materials["iron"], rotation_z=math.pi / 8, bevel=0.04),
    ))
    # Corner furnace towers and flying industrial bridges.
    corners = ((-1.62, -1.54), (1.62, -1.54), (1.62, 1.62), (-1.62, 1.62))
    for index, (x, y) in enumerate(corners):
        p.append(kit.add_box(f"I020_V10_KEEP_CORNER_TOWER_{index}", (x, y, 3.35), (0.84, 0.84, 4.35), materials["basalt"], bevel=0.075))
        p.append(kit.add_cone(f"I020_V10_KEEP_CORNER_CAP_{index}", (x, y, 5.96), 0.58, 0.12, 1.18, 6, materials["iron"], rotation_z=math.pi / 6, bevel=0.035))
        p.append(kit.add_box(f"I020_V10_KEEP_BRIDGE_{index}", (x * 0.56, y * 0.56, 4.18), (abs(x) * 0.95 if index % 2 else 0.42, 0.42 if index % 2 else abs(y) * 0.95, 0.30), materials["iron"], bevel=0.05))
    # Eight base workshops make the keep a city hub.
    for index, angle in enumerate(i * math.tau / 8 for i in range(8)):
        radius = 2.58
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        p.append(kit.add_box(f"I020_V10_KEEP_WORKSHOP_{index}", (x, y, 1.82 + 0.12 * (index % 2)), (1.18, 0.94, 1.62 + 0.24 * (index % 3)), materials["basalt"], bevel=0.09, rotation_z=angle))
        p.append(v9.add_cylinder(f"I020_V10_KEEP_STACK_{index}", (x + math.cos(angle + 0.25) * 0.36, y + math.sin(angle + 0.25) * 0.36, 3.42), 0.16, 2.05, materials["deep"], 8))
    for index, (x, y, sx, sy) in enumerate(((0.0, -1.19, 0.40, 0.07), (1.23, 0.08, 0.07, 0.40), (0.0, 1.35, 0.40, 0.07), (-1.23, 0.08, 0.07, 0.40))):
        molten.append(kit.add_box(f"I020_V10_KEEP_WINDOW_{index}", (x, y, 4.82), (sx, sy, 2.65), materials["lava_hot"], bevel=0.09))
        # Dark mullion prevents the white-strip read.
        molten.append(kit.add_box(f"I020_V10_KEEP_WINDOW_MULLION_{index}", (x, y, 4.82), (sx * 1.65 if sx > sy else sx, sy * 1.65 if sy > sx else sy, 0.18), materials["iron"], bevel=0.02))
    molten.append(kit.add_box("I020_V10_KEEP_FRONT_FURNACE", (0.0, -2.62, 1.82), (0.86, 0.08, 1.62), materials["lava"], bevel=0.12))
    return joined(p, "I020_V10_FORGE_CATHEDRAL", "rectilinear-industrial-forge-cathedral", "v10-04"), joined(molten, "I020_V10_CATHEDRAL_HEAT", "cathedral-molten-core", "v10-05")


def build_lava(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    flows: list[bpy.types.Object] = []
    routes = (
        [(0.0, -2.4, 1.08), (0.05, -3.5, 0.82), (-0.08, -5.0, 0.73), (0.10, -6.5, 0.66), (-0.05, -8.0, 0.56), (0.0, -9.75, 0.45)],
        [(-2.2, 1.2, 0.70), (-3.4, 1.2, 0.68), (-4.6, 0.1, 0.64), (-5.8, -0.2, 0.60), (-6.8, -1.2, 0.55)],
        [(2.2, 1.4, 0.72), (3.2, 2.1, 0.68), (4.5, 2.0, 0.64), (5.6, 3.0, 0.60), (6.7, 3.1, 0.56)],
    )
    for route_index, route in enumerate(routes):
        for strand, (offset, radius) in enumerate(((-0.18, 0.18), (0.15, 0.22))):
            points = [(x + offset if route_index == 0 else x, y + offset if route_index != 0 else y, z + strand * 0.02) for x, y, z in route]
            flows.append(v9.add_flow(f"I020_V10_CITY_FLOW_{route_index}_{strand}", points, radius, materials["lava_hot" if strand else "lava"], "orthogonal-city-lava-flow", "v10-06"))
    flow_root = joined(flows, "I020_V10_CITY_LAVA_ROUTES", "orthogonal-banked-lava-routes", "v10-06")

    cascade: list[bpy.types.Object] = []
    line = [(0.0, -9.7, 0.42), (0.03, -10.25, -0.34), (-0.10, -10.65, -1.55), (0.12, -10.92, -2.95), (-0.06, -11.20, -4.42), (0.02, -11.50, -5.78)]
    for i, (offset, radius) in enumerate(((-0.62, 0.30), (-0.26, 0.38), (0.16, 0.40), (0.54, 0.28))):
        cascade.append(v9.add_flow(f"I020_V10_CASCADE_{i}", [(x + offset + 0.05 * math.sin(j + i), y - i * 0.02, z) for j, (x, y, z) in enumerate(line)], radius, materials["lava_hot" if i == 2 else "lava"], "volumetric-front-cascade", "v10-07"))
    cascade_root = joined(cascade, "I020_V10_FRONT_CASCADE", "volumetric-front-cascade", "v10-07")
    basin_parts = [v9.add_cylinder("I020_V10_BASIN_ROCK", (0.0, -11.85, -6.12), 2.10, 0.58, materials["deep"], 28), v9.add_cylinder("I020_V10_BASIN_LAVA", (0.0, -11.90, -5.78), 1.62, 0.18, materials["lava"], 32)]
    for i in range(12):
        a = i * math.tau / 12
        basin_parts.append(kit.add_cone(f"I020_V10_BASIN_RIM_{i}", (math.cos(a) * 1.88, -11.90 + math.sin(a) * 0.82, -5.70), 0.42, 0.27, 0.90, 7, materials["cliff"], rotation_z=a, bevel=0.035))
    return flow_root, cascade_root, joined(basin_parts, "I020_V10_ESCAPE_BASIN", "iron-skiff-escape-basin", "v10-08")


def build_cliffs(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    p: list[bpy.types.Object] = []
    rng = random.Random(SEED + 55)
    for index in range(64):
        angle = index * math.tau / 64
        delta = abs((angle - math.radians(270) + math.pi) % math.tau - math.pi)
        if delta < math.radians(9):
            continue
        radius = 11.48 + rng.uniform(-0.15, 0.16)
        h = rng.uniform(1.8, 3.7)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        p.append(kit.add_cone(f"I020_V10_CLIFF_COLUMN_{index}", (x, y, -0.78 - h * 0.5), rng.uniform(0.28, 0.44), rng.uniform(0.34, 0.54), h, rng.choice((6, 7, 8)), materials["cliff" if index % 3 else "deep"], rotation_z=angle + rng.uniform(-0.14, 0.14), bevel=0.035))
    for side in (-1, 1):
        for index in range(8):
            p.append(kit.add_cone(f"I020_V10_CASCADE_BANK_{side}_{index}", (side * (0.94 + 0.06 * math.sin(index)), -10.15 - index * 0.20, -0.42 - index * 0.78), 0.56, 0.42, 1.48, 7, materials["cliff"], rotation_z=index * 0.17, bevel=0.04))
    return joined(p, "I020_V10_RUGGED_CLIFFS", "rugged-banked-volcanic-cliffs", "v10-09")


def build_background(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = [v9.add_cylinder("I020_V10_BACKGROUND_FIELD", (0.0, 0.0, -6.62), 35.0, 0.30, materials["background"], 112)]
    rng = random.Random(SEED + 91)
    for index in range(48):
        angle = index * math.tau / 48 + rng.uniform(-0.05, 0.05)
        radius = rng.uniform(14.5, 29.0)
        h = rng.uniform(2.4, 8.8)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        objects.append(kit.add_cone(f"I020_V10_BACKGROUND_SPIRE_{index}", (x, y, -6.42 + h * 0.5), rng.uniform(0.55, 1.4), 0.04, h, rng.choice((6, 7, 8)), materials["background"], rotation_z=rng.random(), bevel=0.035))
    # Pools are separated islands of heat, never a flat red sheet.
    for index in range(10):
        angle = index * math.tau / 10 + 0.18
        radius = 16.0 + (index % 3) * 4.3
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        objects.append(v9.add_cylinder(f"I020_V10_BACKGROUND_POOL_{index}", (x, y, -6.38), 1.2 + 0.3 * (index % 2), 0.10, materials["lava_dim"], 16))
    return objects


def setup_render() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1060
    scene.render.resolution_y = 1060
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.006, 0.004, 0.006, 1.0)
    bg.inputs["Strength"].default_value = 0.34
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    for name, location, energy, size, color, target in (
        ("I020_V10_KEY", (-18.0, -21.0, 28.0), 6500, 14.0, (1.0, 0.48, 0.20), (0.0, -1.0, 0.0)),
        ("I020_V10_FILL", (20.0, -2.0, 21.0), 4800, 13.0, (0.20, 0.36, 0.64), (0.0, 0.0, 0.8)),
        ("I020_V10_TOP", (-2.0, 4.0, 32.0), 3900, 12.0, (1.0, 0.25, 0.065), (0.0, 0.0, 0.0)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        light.data.color = color
        kit.look_at(light, target)
    for i, (location, energy) in enumerate((((0.0, -2.5, 2.0), 1200), ((0.0, -6.0, 1.0), 1550), ((0.0, -10.4, -0.5), 2100), ((0.0, -11.3, -4.2), 2400), ((-5.4, 0.0, 1.0), 900), ((5.4, 2.7, 1.0), 900))):
        bpy.ops.object.light_add(type="POINT", location=location)
        light = bpy.context.object
        light.name = f"I020_V10_HEAT_{i}"
        light.data.energy = energy
        light.data.color = (1.0, 0.04, 0.003)
        light.data.shadow_soft_size = 2.2
    camera_data = bpy.data.cameras.new("I020_V10_REVIEW_CAMERA")
    camera = bpy.data.objects.new("I020_V10_REVIEW_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 61
    scene.camera = camera
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "source-match": ((15.5, -31.0, 25.5), (0.0, -0.9, -0.45)),
        "left-45": ((-25.5, -25.5, 20.5), (0.0, -0.7, -0.1)),
        "right-45": ((25.5, -25.5, 20.5), (0.0, -0.7, -0.1)),
        "rear-sanity": ((15.5, 29.0, 20.5), (0.0, 0.0, 0.25)),
        "top-maze": ((0.0, -0.5, 38.5), (0.0, -0.4, 0.0)),
        "front-cliff-low": ((12.5, -33.0, 10.5), (0.0, -3.2, -1.65)),
    }
    for name, (position, target) in views.items():
        camera.location = position
        kit.look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v10-macro-{name}-v001.png")
        bpy.ops.render.render(write_still=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    for obj in scene.objects:
        if obj.type == "MESH" and not obj.name.startswith("I020_V10_BACKGROUND"):
            obj.show_wire = True
            obj.show_all_edges = True
    camera.location = (15.5, -31.0, 25.5)
    kit.look_at(camera, (0.0, -0.9, -0.45))
    scene.render.filepath = str(render_dir / "island-020-v10-macro-wireframe-source-match-v001.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = kit.ensure_parent(args.output_glb)
    output_blend = kit.ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    kit.clear_scene()
    materials = {
        "basalt": kit.make_material("I020_V10_BASALT", (0.125, 0.072, 0.055, 1.0), roughness=0.90),
        "deep": kit.make_material("I020_V10_DEEP", (0.014, 0.012, 0.017, 1.0), roughness=0.95),
        "cliff": kit.make_material("I020_V10_CLIFF", (0.027, 0.020, 0.024, 1.0), roughness=0.97),
        "iron": kit.make_material("I020_V10_IRON", (0.024, 0.027, 0.034, 1.0), metallic=0.60, roughness=0.56),
        "path_a": kit.make_material("I020_V10_PATH_A", (0.275, 0.175, 0.108, 1.0), roughness=0.84),
        "path_b": kit.make_material("I020_V10_PATH_B", (0.175, 0.100, 0.075, 1.0), roughness=0.89),
        "board_a": kit.make_material("I020_V10_BOARD_A", (0.40, 0.26, 0.15, 1.0), roughness=0.79),
        "board_b": kit.make_material("I020_V10_BOARD_B", (0.27, 0.17, 0.11, 1.0), roughness=0.83),
        "lava": kit.make_material("I020_V10_LAVA", (0.92, 0.035, 0.001, 1.0), roughness=0.24, emission=(1.0, 0.009, 0.001, 1.0), emission_strength=2.55),
        "lava_hot": kit.make_material("I020_V10_LAVA_HOT", (1.0, 0.18, 0.006, 1.0), roughness=0.19, emission=(1.0, 0.036, 0.001, 1.0), emission_strength=3.1),
        "lava_dim": kit.make_material("I020_V10_LAVA_DIM", (0.12, 0.004, 0.001, 1.0), roughness=0.36, emission=(0.22, 0.002, 0.001, 1.0), emission_strength=0.38),
        "background": kit.make_material("I020_V10_BACKGROUND", (0.006, 0.005, 0.008, 1.0), roughness=0.98),
    }
    for key in ("basalt", "deep", "cliff", "path_a", "path_b", "background"):
        v9.add_basalt_nodes(materials[key], 3.4 if key != "background" else 1.8, 0.22 if not key.startswith("path") else 0.14)

    foundation = v9.build_foundation(materials)
    tag(foundation, "volcanic-foundation", "v10-00")
    board = v9.build_outer_board(materials)
    tag(board, "source-scale-outer-board-ring", "v10-10")
    exports: list[bpy.types.Object] = [foundation]
    floors, masonry, architecture, graph_links = build_city_maze(materials)
    exports.extend((floors, masonry, architecture, board))
    exports.extend(build_cathedral(materials))
    exports.extend(build_lava(materials))
    exports.append(build_cliffs(materials))
    background = build_background(materials)
    camera = setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in exports:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = exports[0]
    bpy.ops.export_scene.gltf(filepath=str(output_glb), export_format="GLB", use_selection=True, export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    render_views(camera, render_dir)
    print(f"ISLAND020_V10_MACRO_EXPORT objects={len(exports)} background={len(background)} graph_links={graph_links} glb={output_glb}")


if __name__ == "__main__":
    main()
