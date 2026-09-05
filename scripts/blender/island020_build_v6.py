"""Build Island 020 v6 as a silhouette-first semantic multipart GLB.

This is a distinct post-v5 representation: exposed lava navigation canals are
laid out first, then a circular-clipped orthogonal city and cruciform keep are
built around them.  The result is deterministic, reviewable and editable.
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


SEED = 0x20A6
CELLS = 11
CELL = 0.59
CITY_RADIUS = 3.65


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--render-dir", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def retag(obj: bpy.types.Object, semantic: str, part_id: str) -> bpy.types.Object:
    obj["island"] = 20
    obj["family"] = "silhouette-first-modular-city-glb-v6"
    obj["semantic"] = semantic
    obj["part_id"] = part_id
    obj["export_role"] = "runtime-semantic-part"
    return obj


def connected_maze() -> tuple[list[list[bool]], list[tuple[int, int]]]:
    randomizer = random.Random(SEED)
    walls = [[True, True, True, True] for _ in range(CELLS * CELLS)]
    visited = [False] * (CELLS * CELLS)

    def idx(x: int, y: int) -> int:
        return y * CELLS + x

    stack = [(CELLS // 2, CELLS // 2)]
    visited[idx(*stack[0])] = True
    directions = ((0, -1, 0, 2), (1, 0, 1, 3), (0, 1, 2, 0), (-1, 0, 3, 1))
    while stack:
        x, y = stack[-1]
        choices = []
        for dx, dy, wall, opposite in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < CELLS and 0 <= ny < CELLS and not visited[idx(nx, ny)]:
                choices.append((nx, ny, wall, opposite))
        if not choices:
            stack.pop()
            continue
        nx, ny, wall, opposite = randomizer.choice(choices)
        walls[idx(x, y)][wall] = False
        walls[idx(nx, ny)][opposite] = False
        visited[idx(nx, ny)] = True
        stack.append((nx, ny))

    # A legible, steerable Iron Skiff line: forward, left/right choice, then
    # forward again. It exits the front gate independently of DFS randomness.
    route = [(5, 5), (5, 4), (4, 4), (4, 3), (5, 3), (5, 2), (6, 2), (6, 1), (5, 1), (5, 0)]
    direction_lookup = {(0, -1): (0, 2), (1, 0): (1, 3), (0, 1): (2, 0), (-1, 0): (3, 1)}
    for (x0, y0), (x1, y1) in zip(route, route[1:]):
        own, other = direction_lookup[(x1 - x0, y1 - y0)]
        walls[idx(x0, y0)][own] = False
        walls[idx(x1, y1)][other] = False
    walls[idx(5, 0)][0] = False
    return walls, route


def cell_center(x: int, y: int) -> tuple[float, float]:
    half = CELLS * CELL * 0.5
    return (-half + CELL * (x + 0.5), -half + CELL * (y + 0.5))


def build_world(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    exported: list[bpy.types.Object] = []

    terrain = kit.create_ring_volume(
        "I020_V6_VOLCANIC_UNDERSIDE",
        [
            (5.55, 0.18, 0.18, 0.09),
            (5.42, -0.72, 1.0, 0.11),
            (4.72, -1.95, 2.25, 0.16),
            (3.52, -3.42, 3.55, 0.22),
            (1.35, -5.28, 4.7, 0.3),
        ],
        64,
        materials["deep_stone"],
        "closed-volcanic-terrain",
        "p01",
    )
    exported.append(retag(terrain, "closed-volcanic-terrain", "p01"))

    foundation = kit.create_ring_volume(
        "I020_V6_CITY_FOUNDATION",
        [(4.78, 0.76, 0.42, 0.075), (5.08, 0.12, 1.45, 0.09)],
        56,
        materials["stone"],
        "city-foundation-deck",
        "p02",
    )
    exported.append(retag(foundation, "city-foundation-deck", "p02"))

    cliff_parts: list[bpy.types.Object] = []
    for index in range(32):
        angle = index / 32 * math.tau + 0.04
        radius = 5.0 + 0.24 * math.sin(index * 1.93)
        depth = 2.1 + (index % 6) * 0.36
        cliff_parts.append(
            kit.add_cone(
                f"I020_V6_CLIFF_COLUMN_{index + 1:02d}",
                (math.cos(angle) * radius, math.sin(angle) * radius, -0.65 - depth * 0.43),
                0.32 + (index % 3) * 0.06,
                0.62 + (index % 4) * 0.08,
                depth,
                6,
                materials["deep_stone"],
                rotation_z=-angle,
                bevel=0.025,
            )
        )
    exported.append(retag(kit.join_meshes(cliff_parts, "I020_V6_CLIFF_COLUMNS", "cliff-column-crown", "p01"), "cliff-column-crown", "p01"))

    walls, route_cells = connected_maze()
    route_set = set(route_cells)
    wall_parts: list[bpy.types.Object] = []
    pier_parts: list[bpy.types.Object] = []
    segment_number = 0

    def include_segment(x: float, y: float) -> bool:
        return math.hypot(x, y) <= CITY_RADIUS and math.hypot(x, y) >= 0.98

    def add_wall(x: float, y: float, horizontal: bool) -> None:
        nonlocal segment_number
        if not include_segment(x, y):
            return
        segment_number += 1
        radial = min(1.0, math.hypot(x, y) / CITY_RADIUS)
        feature = abs(round((x * 127 + y * 83) * 100))
        height = 0.72 + (1.0 - radial) * 0.42 + (feature % 3) * 0.1
        wall_parts.append(
            kit.add_box(
                f"I020_V6_MAZE_WALL_{segment_number:03d}",
                (x, y, 0.78 + height * 0.5),
                (CELL + 0.08 if horizontal else 0.19, 0.19 if horizontal else CELL + 0.08, height),
                materials["stone" if feature % 4 else "deep_stone"],
                bevel=0.026,
            )
        )
        if feature % 5 == 0:
            pier_height = height + 0.3
            pier_parts.append(
                kit.add_box(
                    f"I020_V6_MAZE_PIER_{segment_number:03d}",
                    (x, y, 0.78 + pier_height * 0.5),
                    (0.27, 0.27, pier_height),
                    materials["deep_stone"],
                    bevel=0.035,
                )
            )
            pier_parts.append(
                kit.add_box(
                    f"I020_V6_MAZE_PIER_CAP_{segment_number:03d}",
                    (x, y, 0.8 + pier_height),
                    (0.34, 0.34, 0.12),
                    materials["iron"],
                    bevel=0.025,
                )
            )

    for y in range(CELLS):
        for x in range(CELLS):
            cx, cy = cell_center(x, y)
            cell_walls = walls[y * CELLS + x]
            if cell_walls[0]:
                add_wall(cx, cy - CELL * 0.5, True)
            if cell_walls[3]:
                add_wall(cx - CELL * 0.5, cy, False)
            if x == CELLS - 1 and cell_walls[1]:
                add_wall(cx + CELL * 0.5, cy, False)
            if y == CELLS - 1 and cell_walls[2]:
                add_wall(cx, cy + CELL * 0.5, True)
    exported.append(retag(kit.join_meshes(wall_parts, "I020_V6_CONNECTED_LABYRINTH", "connected-orthogonal-labyrinth", "p09"), "connected-orthogonal-labyrinth", "p09"))
    exported.append(retag(kit.join_meshes(pier_parts, "I020_V6_LABYRINTH_PIERS", "labyrinth-flat-roof-piers", "p09"), "labyrinth-flat-roof-piers", "p09"))

    # Secondary flat-roof city masses only occupy non-route cells near the
    # perimeter. They increase source-like density without blocking the canal.
    mass_parts: list[bpy.types.Object] = []
    for y in range(CELLS):
        for x in range(CELLS):
            if (x, y) in route_set:
                continue
            cx, cy = cell_center(x, y)
            radius = math.hypot(cx, cy)
            signature = (x * 17 + y * 29 + SEED) % 11
            if not (2.25 <= radius <= 3.45 and signature in (0, 1, 4)):
                continue
            height = 0.78 + (signature % 3) * 0.22
            mass_parts.append(kit.add_box(f"I020_V6_CITY_MASS_{x}_{y}", (cx, cy, 0.78 + height * 0.5), (0.34, 0.34, height), materials["deep_stone"], bevel=0.045))
            mass_parts.append(kit.add_box(f"I020_V6_CITY_CAP_{x}_{y}", (cx, cy, 0.82 + height), (0.44, 0.44, 0.13), materials["iron"], bevel=0.025))
    exported.append(retag(kit.join_meshes(mass_parts, "I020_V6_FLAT_ROOF_CITY_MASSES", "flat-roof-maze-city", "p09"), "flat-roof-maze-city", "p09"))

    keep_parts: list[bpy.types.Object] = []
    keep_parts.extend(
        (
            kit.add_box("I020_V6_KEEP_PLINTH", (0.0, 0.0, 1.12), (2.0, 2.0, 0.68), materials["deep_stone"], bevel=0.08),
            kit.add_box("I020_V6_KEEP_SHOULDER_NS", (0.0, 0.0, 1.42), (1.38, 2.72, 0.34), materials["deep_stone"], bevel=0.055),
            kit.add_box("I020_V6_KEEP_SHOULDER_EW", (0.0, 0.0, 1.42), (2.72, 1.38, 0.34), materials["deep_stone"], bevel=0.055),
            kit.add_box("I020_V6_KEEP_CROSS_NS", (0.0, 0.0, 1.72), (0.9, 2.38, 0.82), materials["stone"], bevel=0.055),
            kit.add_box("I020_V6_KEEP_CROSS_EW", (0.0, 0.0, 1.72), (2.38, 0.9, 0.82), materials["stone"], bevel=0.055),
            kit.add_box("I020_V6_KEEP_LOWER_TOWER", (0.0, 0.0, 2.65), (1.3, 1.3, 1.24), materials["deep_stone"], bevel=0.065),
            kit.add_box("I020_V6_KEEP_MID_TOWER", (0.0, 0.0, 3.72), (0.94, 0.94, 1.02), materials["stone"], bevel=0.055),
            kit.add_box("I020_V6_KEEP_BELFRY", (0.0, 0.0, 4.55), (0.68, 0.68, 0.66), materials["deep_stone"], bevel=0.045),
            kit.add_cone("I020_V6_KEEP_CROWN", (0.0, 0.0, 5.22), 0.54, 0.08, 0.86, 4, materials["iron"], rotation_z=math.pi / 4, bevel=0.025),
        )
    )
    for index, (x, y) in enumerate(((-0.72, -0.72), (0.72, -0.72), (0.72, 0.72), (-0.72, 0.72))):
        keep_parts.append(kit.add_cone(f"I020_V6_KEEP_BUTTRESS_{index + 1}", (x, y, 2.12), 0.26, 0.17, 2.35, 4, materials["deep_stone"], rotation_z=math.pi / 4, bevel=0.02))
        keep_parts.append(kit.add_cone(f"I020_V6_KEEP_BUTTRESS_SPIRE_{index + 1}", (x, y, 3.53), 0.26, 0.02, 0.62, 4, materials["iron"], rotation_z=math.pi / 4, bevel=0.015))
    for index, (x, y, sx, sy) in enumerate(((0.0, -1.18, 0.68, 0.34), (1.18, 0.0, 0.34, 0.68), (0.0, 1.18, 0.68, 0.34), (-1.18, 0.0, 0.34, 0.68))):
        keep_parts.append(kit.add_box(f"I020_V6_KEEP_WING_GATE_{index + 1}", (x, y, 1.55), (sx, sy, 0.98), materials["deep_stone"], bevel=0.04))
        keep_parts.append(kit.add_box(f"I020_V6_KEEP_SIDE_TOWER_{index + 1}", (x, y, 2.28), (0.48, 0.48, 1.56), materials["stone"], bevel=0.045))
        keep_parts.append(kit.add_cone(f"I020_V6_KEEP_SIDE_CROWN_{index + 1}", (x, y, 3.38), 0.36, 0.03, 0.66, 4, materials["iron"], rotation_z=math.pi / 4, bevel=0.018))
    exported.append(retag(kit.join_meshes(keep_parts, "I020_V6_CRUCIFORM_CRUCIBLE_KEEP", "cruciform-crucible-keep", "p08"), "cruciform-crucible-keep", "p08"))

    molten_parts: list[bpy.types.Object] = []
    for level, (z, offset, height, width) in enumerate(((2.65, 0.66, 0.65, 0.18), (3.73, 0.48, 0.56, 0.14), (4.55, 0.35, 0.35, 0.11))):
        for face, (x, y, sx, sy) in enumerate(((0, -offset, width, 0.04), (offset, 0, 0.04, width), (0, offset, width, 0.04), (-offset, 0, 0.04, width))):
            molten_parts.append(kit.add_box(f"I020_V6_KEEP_APERTURE_{level}_{face}", (x, y, z), (sx, sy, height), materials["molten"], bevel=0.02))
    exported.append(retag(kit.join_meshes(molten_parts, "I020_V6_KEEP_MOLTEN_APERTURES", "keep-molten-apertures", "p11"), "keep-molten-apertures", "p11"))

    gate_parts: list[bpy.types.Object] = []
    for gate_index, angle in enumerate((0.0, math.pi / 2, math.pi, math.pi * 1.5)):
        outward = Vector((math.sin(angle), -math.cos(angle), 0.0))
        lateral = Vector((-outward.y, outward.x, 0.0))
        center = outward * 3.68
        for sign in (-1, 1):
            pos = center + lateral * sign * 0.52
            gate_parts.append(kit.add_box(f"I020_V6_GATE_{gate_index}_PIER_{sign}", (pos.x, pos.y, 1.55), (0.4, 0.4, 1.55), materials["deep_stone"], bevel=0.05))
            gate_parts.append(kit.add_cone(f"I020_V6_GATE_{gate_index}_CAP_{sign}", (pos.x, pos.y, 2.58), 0.38, 0.04, 0.58, 4, materials["iron"], rotation_z=math.pi / 4, bevel=0.02))
        gate_parts.append(kit.add_box(f"I020_V6_GATE_{gate_index}_LINTEL", (center.x, center.y, 2.08), (1.38, 0.3, 0.32), materials["iron"], bevel=0.04, rotation_z=-angle))
    exported.append(retag(kit.join_meshes(gate_parts, "I020_V6_CARDINAL_GATEHOUSES", "four-cardinal-gatehouses", "p10"), "four-cardinal-gatehouses", "p10"))

    stair_parts: list[bpy.types.Object] = []
    for direction in range(4):
        angle = direction * math.pi / 2
        outward = Vector((math.sin(angle), -math.cos(angle), 0.0))
        for step in range(9):
            pos = outward * (3.94 + step * 0.17)
            stair_parts.append(kit.add_box(f"I020_V6_STAIR_{direction}_{step}", (pos.x, pos.y, 0.73 - step * 0.07), (1.05, 0.24, 0.13), materials["stone"], bevel=0.018, rotation_z=-angle))
    exported.append(retag(kit.join_meshes(stair_parts, "I020_V6_APPROACH_STAIRS", "four-approach-stairs", "p04"), "four-approach-stairs", "p04"))

    route_points = []
    for index, (x, y) in enumerate(route_cells):
        cx, cy = cell_center(x, y)
        route_points.append((cx, cy, 0.91 + (0.22 if index == 0 else 0.0)))
    route_points.extend(((0.0, -3.68, 0.83), (0.0, -4.45, 0.22), (0.0, -5.18, -0.75), (0.0, -5.62, -2.15), (0.0, -5.7, -4.25)))
    bed = kit.create_ribbon("I020_V6_IRON_SKIFF_CANAL_BED", route_points, 0.33, 0.12, materials["iron"], "iron-skiff-navigation-bed", "p24")
    flow = kit.create_ribbon("I020_V6_IRON_SKIFF_CANAL_FLOW", [(x, y, z + 0.055) for x, y, z in route_points], 0.24, 0.06, materials["molten"], "iron-skiff-navigation-flow", "p24")
    exported.extend((retag(bed, "iron-skiff-navigation-bed", "p24"), retag(flow, "iron-skiff-navigation-flow", "p24")))

    branch_specs = (
        [(0.15, 0.35, 0.92), (0.9, 0.65, 0.9), (1.52, 1.24, 0.88), (2.35, 1.24, 0.86), (3.2, 1.72, 0.78), (4.8, 2.25, -0.5), (5.32, 2.48, -2.0), (5.42, 2.52, -3.82)],
        [(-0.15, 0.35, 0.92), (-0.9, 0.65, 0.9), (-1.52, 1.24, 0.88), (-2.35, 1.24, 0.86), (-3.2, 1.72, 0.78), (-4.75, 2.35, -0.55), (-5.28, 2.58, -2.05), (-5.38, 2.62, -3.9)],
        [(0.0, 0.65, 0.92), (0.0, 1.38, 0.9), (0.58, 1.96, 0.88), (0.58, 2.7, 0.84), (0.0, 3.55, 0.72), (0.22, 4.95, -0.62), (0.25, 5.52, -2.15), (0.28, 5.62, -3.95)],
    )
    branch_beds: list[bpy.types.Object] = []
    branch_flows: list[bpy.types.Object] = []
    for index, points in enumerate(branch_specs):
        branch_beds.append(kit.create_ribbon(f"I020_V6_BRANCH_BED_{index}", points, 0.29, 0.11, materials["iron"], "branching-lava-canal-bed", "p03"))
        branch_flows.append(kit.create_ribbon(f"I020_V6_BRANCH_FLOW_{index}", [(x, y, z + 0.05) for x, y, z in points], 0.2, 0.055, materials["molten"], "branching-lava-canal-flow", "p03"))
    exported.append(retag(kit.join_meshes(branch_beds, "I020_V6_BRANCH_CANAL_BEDS", "branching-lava-canal-beds", "p03"), "branching-lava-canal-beds", "p03"))
    exported.append(retag(kit.join_meshes(branch_flows, "I020_V6_BRANCH_CANAL_FLOWS", "branching-lava-canal-flows", "p03"), "branching-lava-canal-flows", "p03"))
    return exported


def setup_render() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 760
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.012, 0.006, 0.006, 1.0)
    background.inputs["Strength"].default_value = 0.42
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    for name, kind, location, energy, size, color, target in (
        ("I020_V6_WARM_KEY", "AREA", (-7.0, -8.0, 14.0), 1750, 7.5, (1.0, 0.38, 0.16), (0.0, 0.0, 0.0)),
        ("I020_V6_COOL_RIM", "AREA", (8.0, 5.0, 11.0), 1250, 7.0, (0.18, 0.34, 0.62), (0.0, 0.0, 0.7)),
        ("I020_V6_TOP_FILL", "AREA", (0.0, 0.0, 16.0), 1050, 8.0, (1.0, 0.5, 0.24), (0.0, 0.0, 0.0)),
    ):
        bpy.ops.object.light_add(type=kind, location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        light.data.color = color
        kit.look_at(light, target)
    for index, location in enumerate(((0, -1.4, 1.25), (0, -2.8, 1.1), (1.8, 1.2, 1.1), (-1.8, 1.2, 1.1), (0, 2.8, 1.1), (0, -5.65, -2.1), (5.3, 2.5, -2.0), (-5.3, 2.6, -2.0), (0.25, 5.55, -2.0))):
        bpy.ops.object.light_add(type="POINT", location=location)
        glow = bpy.context.object
        glow.name = f"I020_V6_CANAL_GLOW_{index}"
        glow.data.energy = 310 if index >= 5 else 230
        glow.data.color = (1.0, 0.08, 0.01)
        glow.data.shadow_soft_size = 1.2

    camera_data = bpy.data.cameras.new("I020_V6_REVIEW_CAMERA")
    camera = bpy.data.objects.new("I020_V6_REVIEW_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 54
    scene.camera = camera
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "front": ((4.6, -15.8, 11.7), (0.0, -0.15, -0.15)),
        "left-45": ((-11.4, -12.6, 10.8), (0.0, 0.0, -0.2)),
        "right-45": ((11.4, -12.6, 10.8), (0.0, 0.0, -0.2)),
        "rear": ((-4.6, 15.8, 11.7), (0.0, 0.15, -0.2)),
        "top": ((0.0, -0.3, 23.5), (0.0, 0.0, -0.35)),
        "front-cliff-low": ((5.6, -17.8, 7.8), (0.0, -0.45, -0.75)),
    }
    for name, (position, target) in views.items():
        camera.location = position
        kit.look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v6-blockout-{name}-v001.png")
        bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = kit.ensure_parent(args.output_glb)
    output_blend = kit.ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    kit.clear_scene()
    materials = {
        "stone": kit.make_material("I020_V6_CLAY_BASALT", (0.23, 0.18, 0.17, 1.0), roughness=0.92),
        "deep_stone": kit.make_material("I020_V6_CLAY_OBSIDIAN", (0.065, 0.052, 0.055, 1.0), roughness=0.96),
        "iron": kit.make_material("I020_V6_CLAY_IRON", (0.08, 0.065, 0.065, 1.0), metallic=0.68, roughness=0.5),
        "molten": kit.make_material("I020_V6_MOLTEN_PREVIEW", (1.0, 0.12, 0.005, 1.0), roughness=0.2, emission=(1.0, 0.028, 0.001, 1.0), emission_strength=7.5),
    }
    exported = build_world(materials)
    camera = setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.export_scene.gltf(filepath=str(output_glb), export_format="GLB", export_cameras=False, export_lights=False, export_apply=True, export_yup=True)
    render_views(camera, render_dir)
    print(f"ISLAND020_V6_EXPORT objects={len(exported)} glb={output_glb} blend={output_blend} renders={render_dir}")


if __name__ == "__main__":
    main()
