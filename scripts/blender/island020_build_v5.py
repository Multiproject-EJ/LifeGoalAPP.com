"""Build Island 020 family v5 as a semantic multipart Blender/GLB asset.

Run with Blender, never normal Python:
  Blender --background --python scripts/blender/island020_build_v5.py -- \
    --output-glb docs/visual-references/island-020-lava-labyrinth/retired-runtime-assets/lava-labyrinth-v5-blockout.glb \
    --output-blend .assetgauntlet/island-020-actual-3d-v5/build/lava-labyrinth-v5-blockout.blend \
    --render-dir .assetgauntlet/island-020-actual-3d-v5/qa/raw

The exact source image remains visual authority. This script is deliberately
deterministic so the GLB is reviewable, reproducible and never an opaque hand
edit. Gameplay, the canonical board and moving-system state remain in Three.js.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


SEED = 0x20C1A7
MAZE_CELLS = 9
MAZE_CELL_SIZE = 0.56


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--render-dir", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def ensure_parent(path: str) -> Path:
    resolved = Path(path).expanduser().resolve()
    resolved.parent.mkdir(parents=True, exist_ok=True)
    return resolved


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.75,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if emission_input:
            emission_input.default_value = emission
        strength_input = bsdf.inputs.get("Emission Strength")
        if strength_input:
            strength_input.default_value = emission_strength
    return material


def tag(obj: bpy.types.Object, semantic: str, part_id: str) -> bpy.types.Object:
    obj["island"] = 20
    obj["family"] = "authored-multipart-glb-v5"
    obj["semantic"] = semantic
    obj["part_id"] = part_id
    return obj


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
    if width <= 0:
        return
    modifier = obj.modifiers.new(name="V5_EDGE_BEVEL", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    bevel: float = 0.035,
    rotation_z: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=(0.0, 0.0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_bevel(obj, bevel)
    obj.data.materials.append(material)
    return obj


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_bottom: float,
    radius_top: float,
    depth: float,
    vertices: int,
    material: bpy.types.Material,
    *,
    rotation_z: float = 0.0,
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=location,
        rotation=(0.0, 0.0, rotation_z),
    )
    obj = bpy.context.object
    obj.name = name
    if bevel:
        apply_bevel(obj, bevel, 1)
    obj.data.materials.append(material)
    return obj


def join_meshes(objects: list[bpy.types.Object], name: str, semantic: str, part_id: str) -> bpy.types.Object:
    if not objects:
        raise RuntimeError(f"Cannot join an empty object list for {name}")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    return tag(joined, semantic, part_id)


def ring_radius(index: int, segments: int, base: float, phase: float, irregularity: float) -> float:
    angle = index / segments * math.tau
    return base * (
        1.0
        + math.sin(angle * 3.0 + phase) * irregularity
        + math.sin(angle * 7.0 - phase * 0.63) * irregularity * 0.42
        + math.sin(angle * 11.0 + 0.8) * irregularity * 0.18
    )


def create_ring_volume(
    name: str,
    rings: list[tuple[float, float, float, float]],
    segments: int,
    material: bpy.types.Material,
    semantic: str,
    part_id: str,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    for radius, z, phase, irregularity in rings:
        for index in range(segments):
            angle = index / segments * math.tau
            resolved_radius = ring_radius(index, segments, radius, phase, irregularity)
            vertices.append((math.cos(angle) * resolved_radius, math.sin(angle) * resolved_radius, z))
    faces: list[tuple[int, ...]] = [tuple(range(segments))]
    for ring_index in range(len(rings) - 1):
        top_offset = ring_index * segments
        bottom_offset = (ring_index + 1) * segments
        for index in range(segments):
            nxt = (index + 1) % segments
            faces.append((top_offset + index, top_offset + nxt, bottom_offset + nxt, bottom_offset + index))
    last_offset = (len(rings) - 1) * segments
    faces.append(tuple(last_offset + index for index in reversed(range(segments))))
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    apply_bevel(obj, 0.055, 2)
    return tag(obj, semantic, part_id)


def create_ribbon(
    name: str,
    points: list[tuple[float, float, float]],
    width: float,
    thickness: float,
    material: bpy.types.Material,
    semantic: str,
    part_id: str,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    for index, point in enumerate(points):
        previous = Vector(points[max(0, index - 1)])
        following = Vector(points[min(len(points) - 1, index + 1)])
        tangent = following - previous
        planar = Vector((tangent.x, tangent.y, 0.0))
        if planar.length < 1e-5:
            planar = Vector((0.0, 1.0, 0.0))
        planar.normalize()
        side = Vector((-planar.y, planar.x, 0.0)) * width
        center = Vector(point)
        vertices.extend([tuple(center + side), tuple(center - side)])
    faces = [(index * 2, index * 2 + 2, index * 2 + 3, index * 2 + 1) for index in range(len(points) - 1)]
    mesh = bpy.data.meshes.new(f"{name}_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    solidify = obj.modifiers.new(name="V5_CHANNEL_DEPTH", type="SOLIDIFY")
    solidify.thickness = thickness
    solidify.offset = -0.5
    bevel = obj.modifiers.new(name="V5_CHANNEL_EDGE", type="BEVEL")
    bevel.width = min(width * 0.18, 0.055)
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return tag(obj, semantic, part_id)


def generate_maze() -> list[list[bool]]:
    randomizer = random.Random(SEED)
    walls = [[True, True, True, True] for _ in range(MAZE_CELLS * MAZE_CELLS)]
    visited = [False] * (MAZE_CELLS * MAZE_CELLS)

    def index(x: int, y: int) -> int:
        return y * MAZE_CELLS + x

    stack = [(MAZE_CELLS // 2, MAZE_CELLS // 2)]
    visited[index(*stack[0])] = True
    directions = [(0, -1, 0, 2), (1, 0, 1, 3), (0, 1, 2, 0), (-1, 0, 3, 1)]
    while stack:
        x, y = stack[-1]
        candidates = []
        for dx, dy, wall, opposite in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < MAZE_CELLS and 0 <= ny < MAZE_CELLS and not visited[index(nx, ny)]:
                candidates.append((nx, ny, wall, opposite))
        if not candidates:
            stack.pop()
            continue
        nx, ny, wall, opposite = randomizer.choice(candidates)
        walls[index(x, y)][wall] = False
        walls[index(nx, ny)][opposite] = False
        visited[index(nx, ny)] = True
        stack.append((nx, ny))

    # Guarantee the authored Iron Skiff line through the city independently of
    # the DFS choice. This route is visible, connected and easy to steer.
    route = [(4, 4), (4, 3), (3, 3), (3, 2), (4, 2), (4, 1), (4, 0)]
    for (x0, y0), (x1, y1) in zip(route, route[1:]):
        dx, dy = x1 - x0, y1 - y0
        direction_index = {(0, -1): (0, 2), (1, 0): (1, 3), (0, 1): (2, 0), (-1, 0): (3, 1)}[(dx, dy)]
        walls[index(x0, y0)][direction_index[0]] = False
        walls[index(x1, y1)][direction_index[1]] = False
    walls[index(4, 0)][0] = False
    return walls


def build_world(materials: dict[str, bpy.types.Material]) -> list[bpy.types.Object]:
    exported: list[bpy.types.Object] = []
    terrain = create_ring_volume(
        "I020_TERRAIN_SHELL",
        [
            (5.5, 0.18, 0.25, 0.085),
            (5.42, -0.7, 1.1, 0.1),
            (4.88, -1.85, 2.0, 0.14),
            (3.78, -3.4, 3.4, 0.2),
            (1.72, -5.15, 4.3, 0.25),
        ],
        48,
        materials["deep_stone"],
        "closed-volcanic-terrain",
        "p01",
    )
    exported.append(terrain)
    mesa = create_ring_volume(
        "I020_CITY_MESA",
        [(4.38, 0.67, 0.8, 0.075), (4.7, 0.12, 1.7, 0.09)],
        40,
        materials["stone"],
        "irregular-city-mesa",
        "p01",
    )
    exported.append(mesa)

    terrace_parts: list[bpy.types.Object] = []
    for index, (radius, z, height, phase) in enumerate(
        ((4.78, 0.38, 0.42, 0.3), (3.96, 0.66, 0.46, 1.4), (3.2, 0.83, 0.34, 2.1))
    ):
        terrace_parts.append(
            create_ring_volume(
                f"I020_CRATER_TERRACE_{index + 1}",
                [(radius, z + height, phase, 0.075), (radius + 0.2, z, phase + 0.7, 0.08)],
                36,
                materials["deep_stone" if index % 2 == 0 else "stone"],
                "crater-city-terrace",
                "p01",
            )
        )
    exported.append(join_meshes(terrace_parts, "I020_CRATER_CITY_TERRACES", "stepped-crater-city", "p01"))

    buttresses: list[bpy.types.Object] = []
    for index in range(30):
        angle = index / 30 * math.tau
        radius = 5.03 + (index % 3) * 0.13
        depth = 2.35 + (index % 5) * 0.32
        buttress = add_cone(
            f"I020_CLIFF_BUTTRESS_{index + 1:02d}",
            (math.cos(angle) * radius, math.sin(angle) * radius, -1.15 - depth * 0.34),
            0.28 + (index % 3) * 0.07,
            0.82 + (index % 4) * 0.1,
            depth,
            5,
            materials["deep_stone"],
            rotation_z=-angle + (index % 2) * 0.18,
        )
        buttresses.append(buttress)
    exported.append(join_meshes(buttresses, "I020_CLIFF_BUTTRESSES", "cliff-strata", "p01"))

    crown_parts: list[bpy.types.Object] = []
    for index in range(20):
        angle = index / 20 * math.tau + 0.08
        radius = 4.3 + 0.3 * math.sin(index * 2.17)
        height = 0.72 + (index % 4) * 0.27
        crown_parts.append(
            add_cone(
                f"I020_CRATER_CROWN_{index + 1:02d}",
                (math.cos(angle) * radius, math.sin(angle) * radius, 0.68 + height * 0.5),
                0.3 + (index % 3) * 0.08,
                0.15 + (index % 2) * 0.05,
                height,
                5,
                materials["deep_stone"],
                rotation_z=-angle + 0.32,
                bevel=0.025,
            )
        )
    exported.append(join_meshes(crown_parts, "I020_CRATER_CROWN_CRAGS", "volcanic-crown-crags", "p01"))

    walls = generate_maze()
    half = MAZE_CELLS * MAZE_CELL_SIZE * 0.5
    maze_parts: list[bpy.types.Object] = []
    bastion_parts: list[bpy.types.Object] = []
    wall_number = 0

    def wall_allowed(x: float, y: float) -> bool:
        return math.hypot(x, y) >= 0.86

    def add_wall(x: float, y: float, horizontal: bool, edge: str) -> None:
        nonlocal wall_number
        if not wall_allowed(x, y):
            return
        wall_number += 1
        feature_hash = abs(round((x * 71 + y * 43) * 100))
        height = 0.7 + (feature_hash % 5) * 0.13
        length = MAZE_CELL_SIZE + 0.08
        wall = add_box(
            f"I020_MAZE_WALL_{wall_number:03d}_{edge}",
            (x, y, 0.56 + height * 0.5),
            (length if horizontal else 0.17, 0.17 if horizontal else length, height),
            materials["stone"],
            bevel=0.028,
        )
        maze_parts.append(wall)
        if feature_hash % 7 == 0:
            pier_height = height + 0.5
            pier = add_box(
                f"I020_MAZE_WATCH_PIER_{wall_number:03d}",
                (x, y, 0.56 + pier_height * 0.5),
                (0.27, 0.27, pier_height),
                materials["deep_stone"],
                bevel=0.035,
            )
            bastion_parts.append(pier)
            roof = add_cone(
                f"I020_MAZE_WATCH_ROOF_{wall_number:03d}",
                (x, y, 0.58 + pier_height + 0.18),
                0.25,
                0.0,
                0.38,
                4,
                materials["iron"],
                rotation_z=math.pi / 4,
            )
            bastion_parts.append(roof)

    for y in range(MAZE_CELLS):
        for x in range(MAZE_CELLS):
            cell = walls[y * MAZE_CELLS + x]
            cx = -half + MAZE_CELL_SIZE * (x + 0.5)
            cy = -half + MAZE_CELL_SIZE * (y + 0.5)
            if cell[0]:
                add_wall(cx, cy - MAZE_CELL_SIZE * 0.5, True, "N")
            if cell[3]:
                add_wall(cx - MAZE_CELL_SIZE * 0.5, cy, False, "W")
            if x == MAZE_CELLS - 1 and cell[1]:
                add_wall(cx + MAZE_CELL_SIZE * 0.5, cy, False, "E")
            if y == MAZE_CELLS - 1 and cell[2]:
                add_wall(cx, cy + MAZE_CELL_SIZE * 0.5, True, "S")
    exported.append(join_meshes(maze_parts, "I020_CONNECTED_9X9_MAZE", "connected-orthogonal-maze", "p09"))
    exported.append(join_meshes(bastion_parts, "I020_MAZE_BASTIONS", "maze-watch-bastions", "p09"))

    city_parts: list[bpy.types.Object] = []
    for index, (x, y, sx, sy, h) in enumerate(
        (
            (-1.72, -1.72, 0.46, 0.46, 1.05), (1.72, -1.72, 0.46, 0.46, 1.2),
            (-1.72, 1.72, 0.46, 0.46, 1.22), (1.72, 1.72, 0.46, 0.46, 1.08),
            (-2.32, -0.86, 0.42, 0.58, 1.0), (2.32, -0.86, 0.42, 0.58, 1.14),
            (-2.28, 0.9, 0.44, 0.56, 1.16), (2.28, 0.9, 0.44, 0.56, 1.0),
            (-0.92, 2.28, 0.56, 0.42, 1.0), (0.92, 2.28, 0.56, 0.42, 1.18),
        )
    ):
        city_parts.append(add_box(f"I020_MAZE_CITY_BLOCK_{index + 1}", (x, y, 0.62 + h * 0.5), (sx, sy, h), materials["deep_stone"], bevel=0.045))
        city_parts.append(add_cone(f"I020_MAZE_CITY_ROOF_{index + 1}", (x, y, 0.65 + h + 0.18), max(sx, sy) * 0.58, 0.0, 0.38, 4, materials["iron"], rotation_z=math.pi / 4))
    exported.append(join_meshes(city_parts, "I020_MAZE_CITY_MASSES", "inhabited-maze-city", "p09"))

    keep_parts: list[bpy.types.Object] = []
    keep_parts.append(add_box("I020_KEEP_LOWER", (0.0, 0.0, 1.42), (1.48, 1.48, 1.58), materials["deep_stone"], bevel=0.075))
    keep_parts.append(add_box("I020_KEEP_MIDDLE", (0.0, 0.0, 2.72), (1.04, 1.04, 1.34), materials["stone"], bevel=0.065))
    keep_parts.append(add_box("I020_KEEP_UPPER", (0.0, 0.0, 3.9), (0.68, 0.68, 1.18), materials["stone"], bevel=0.055))
    keep_parts.append(add_box("I020_KEEP_CROWN_HOUSE", (0.0, 0.0, 4.7), (0.92, 0.92, 0.46), materials["deep_stone"], bevel=0.045))
    for index, (x, y) in enumerate(((-0.69, -0.69), (0.69, -0.69), (0.69, 0.69), (-0.69, 0.69))):
        keep_parts.append(add_box(f"I020_KEEP_BUTTRESS_{index + 1}", (x, y, 1.95), (0.28, 0.28, 2.75), materials["deep_stone"], bevel=0.035))
        keep_parts.append(add_box(f"I020_KEEP_BUTTRESS_TIER_{index + 1}", (x, y, 3.4), (0.22, 0.22, 0.58), materials["stone"], bevel=0.03))
        keep_parts.append(add_cone(f"I020_KEEP_BUTTRESS_ROOF_{index + 1}", (x, y, 3.97), 0.28, 0.0, 0.62, 4, materials["iron"], rotation_z=math.pi / 4))
    for index, (x, y, sx, sy) in enumerate(((0, -1.02, 0.82, 0.56), (1.02, 0, 0.56, 0.82), (0, 1.02, 0.82, 0.56), (-1.02, 0, 0.56, 0.82))):
        keep_parts.append(add_box(f"I020_KEEP_WING_{index + 1}", (x, y, 1.1), (sx, sy, 1.02), materials["stone"], bevel=0.045))
        keep_parts.append(add_cone(f"I020_KEEP_WING_SPIRE_{index + 1}", (x, y, 1.93), max(sx, sy) * 0.42, 0.0, 0.62, 4, materials["iron"], rotation_z=math.pi / 4))
    roof = add_cone("I020_KEEP_CROWN_ROOF", (0.0, 0.0, 5.28), 0.58, 0.0, 0.92, 4, materials["iron"], rotation_z=math.pi / 4)
    keep_parts.append(roof)
    exported.append(join_meshes(keep_parts, "I020_CRUCIBLE_KEEP", "central-crucible-keep", "p08"))

    window_parts: list[bpy.types.Object] = []
    for level, z in enumerate((1.55, 2.78, 3.94)):
        width = (0.31, 0.24, 0.18)[level]
        for face, (x, y, sx, sy) in enumerate(((0, -0.75 + level * 0.2, width, 0.05), (0.75 - level * 0.2, 0, 0.05, width), (0, 0.75 - level * 0.2, width, 0.05), (-0.75 + level * 0.2, 0, 0.05, width))):
            window_parts.append(add_box(f"I020_KEEP_WINDOW_{level + 1}_{face + 1}", (x, y, z), (sx, sy, 0.58 - level * 0.08), materials["molten"], bevel=0.025))
    flame = add_cone("I020_KEEP_CROWN_FLAME", (0.0, 0.0, 5.92), 0.26, 0.0, 0.92, 7, materials["molten"], rotation_z=0.18, bevel=0.02)
    window_parts.append(flame)

    cascade_specs = (
        ([(0.0, -0.77, 3.86), (0.0, -0.8, 2.9), (0.0, -0.88, 1.92), (0.0, -1.18, 0.72)], "FRONT"),
        ([(0.77, 0.0, 3.86), (0.8, 0.0, 2.9), (0.88, 0.0, 1.92), (1.18, 0.0, 0.72)], "RIGHT"),
        ([(0.0, 0.77, 3.86), (0.0, 0.8, 2.9), (0.0, 0.88, 1.92), (0.0, 1.18, 0.72)], "REAR"),
        ([(-0.77, 0.0, 3.86), (-0.8, 0.0, 2.9), (-0.88, 0.0, 1.92), (-1.18, 0.0, 0.72)], "LEFT"),
    )
    for points, label in cascade_specs:
        window_parts.append(create_ribbon(f"I020_KEEP_MOLTEN_CASCADE_{label}", points, 0.12, 0.045, materials["molten"], "keep-molten-cascade", "p11"))
    exported.append(join_meshes(window_parts, "I020_KEEP_MOLTEN_APERTURES", "keep-molten-apertures", "p11"))

    gate_parts: list[bpy.types.Object] = []
    gate_specs = ((0.0, -2.78, 0.0), (2.78, 0.0, math.pi / 2), (0.0, 2.78, math.pi), (-2.78, 0.0, -math.pi / 2))
    for gate_index, (gx, gy, rotation) in enumerate(gate_specs):
        side = Vector((math.cos(rotation), math.sin(rotation), 0.0))
        lateral = Vector((-side.y, side.x, 0.0))
        for sign in (-1, 1):
            position = Vector((gx, gy, 0.0)) + lateral * sign * 0.46
            gate_parts.append(add_box(f"I020_GATE_{gate_index + 1}_PIER_{sign:+d}", (position.x, position.y, 1.28), (0.36, 0.36, 1.48), materials["deep_stone"], bevel=0.045))
            gate_parts.append(add_cone(f"I020_GATE_{gate_index + 1}_ROOF_{sign:+d}", (position.x, position.y, 2.25), 0.38, 0.0, 0.58, 4, materials["iron"], rotation_z=math.pi / 4))
        gate_parts.append(add_box(f"I020_GATE_{gate_index + 1}_LINTEL", (gx, gy, 1.82), (1.3, 0.28, 0.28), materials["iron"], bevel=0.035, rotation_z=rotation))
    exported.append(join_meshes(gate_parts, "I020_FOUR_GATEHOUSES", "maze-gatehouses", "p10"))

    stair_parts: list[bpy.types.Object] = []
    for direction in range(4):
        angle = direction * math.pi / 2
        outward = Vector((math.sin(angle), -math.cos(angle), 0.0))
        for step in range(7):
            distance = 2.95 + step * 0.16
            position = outward * distance
            stair_parts.append(add_box(
                f"I020_APPROACH_{direction + 1}_STEP_{step + 1}",
                (position.x, position.y, 0.6 - step * 0.055),
                (0.92, 0.22, 0.11),
                materials["stone"],
                bevel=0.018,
                rotation_z=-angle,
            ))
    exported.append(join_meshes(stair_parts, "I020_APPROACH_STAIRS", "four-approach-stairs", "p04"))

    escape_points = [
        (0.0, -0.72, 1.72),
        (0.0, -1.08, 0.79),
        (-0.56, -1.08, 0.77),
        (-0.56, -1.64, 0.76),
        (0.0, -1.64, 0.75),
        (0.0, -2.2, 0.73),
        (0.0, -2.8, 0.69),
        (0.0, -3.72, 0.38),
        (0.0, -4.5, -0.5),
        (0.0, -5.03, -1.88),
        (0.0, -5.26, -3.55),
    ]
    escape_bed = create_ribbon("I020_IRON_SKIFF_ESCAPE_BED", escape_points, 0.4, 0.14, materials["iron"], "iron-skiff-escape-bed", "p24")
    escape_flow = create_ribbon("I020_IRON_SKIFF_ESCAPE_FLOW", [(x, y, z + 0.055) for x, y, z in escape_points], 0.28, 0.065, materials["molten"], "iron-skiff-escape-flow", "p24")
    exported.extend((escape_bed, escape_flow))

    tributaries = [
        [(0.34, 0.24, 0.8), (0.9, 0.56, 0.78), (1.52, 0.56, 0.76), (2.08, 1.12, 0.72), (2.7, 1.54, 0.68), (3.72, 1.98, 0.36), (4.68, 2.28, -1.5)],
        [(-0.34, 0.24, 0.8), (-0.9, 0.56, 0.78), (-1.52, 0.56, 0.76), (-2.08, 1.12, 0.72), (-2.7, 1.54, 0.68), (-3.7, 1.98, 0.34), (-4.62, 2.42, -1.6)],
        [(0.12, 0.54, 0.8), (0.1, 1.12, 0.78), (0.66, 1.68, 0.75), (0.66, 2.26, 0.72), (0.1, 2.82, 0.65), (0.32, 3.96, 0.2), (0.52, 4.82, -1.82)],
        [(-0.42, -0.2, 0.8), (-1.05, -0.3, 0.78), (-1.62, -0.86, 0.76), (-2.2, -0.86, 0.72), (-2.84, -1.42, 0.66), (-3.84, -1.72, 0.28), (-4.68, -2.0, -1.62)],
    ]
    bed_parts: list[bpy.types.Object] = []
    flow_parts: list[bpy.types.Object] = []
    for index, points in enumerate(tributaries):
        bed_parts.append(create_ribbon(f"I020_LAVA_BED_{index + 1}", points, 0.34, 0.12, materials["iron"], "lava-channel-bed", "p03"))
        flow_parts.append(create_ribbon(f"I020_LAVA_FLOW_{index + 1}", [(x, y, z + 0.05) for x, y, z in points], 0.23, 0.06, materials["molten"], "lava-channel-flow", "p03"))
    exported.append(join_meshes(bed_parts, "I020_LAVA_CHANNEL_BEDS", "recessed-lava-beds", "p03"))
    exported.append(join_meshes(flow_parts, "I020_LAVA_CHANNEL_FLOWS", "molten-preview-flows", "p03"))
    return exported


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_render(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 700
    scene.render.resolution_y = 850
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.008, 0.003, 0.003, 1.0)
    background.inputs["Strength"].default_value = 0.28
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    bpy.ops.object.light_add(type="AREA", location=(-6.5, -7.5, 13.5))
    key = bpy.context.object
    key.name = "I020_REVIEW_WARM_KEY"
    key.data.energy = 1350
    key.data.shape = "DISK"
    key.data.size = 7.0
    key.data.color = (1.0, 0.34, 0.12)
    look_at(key, (0.0, 0.0, 0.4))

    bpy.ops.object.light_add(type="AREA", location=(7.5, 4.5, 9.0))
    rim = bpy.context.object
    rim.name = "I020_REVIEW_COOL_RIM"
    rim.data.energy = 900
    rim.data.size = 6.0
    rim.data.color = (0.18, 0.33, 0.58)
    look_at(rim, (0.0, 0.0, 0.8))

    bpy.ops.object.light_add(type="POINT", location=(0.0, -0.4, 2.35))
    furnace = bpy.context.object
    furnace.name = "I020_REVIEW_FURNACE_LIGHT"
    furnace.data.energy = 720
    furnace.data.color = (1.0, 0.08, 0.015)
    furnace.data.shadow_soft_size = 2.1

    camera_data = bpy.data.cameras.new("I020_REVIEW_CAMERA")
    camera = bpy.data.objects.new("I020_REVIEW_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 56
    camera.data.sensor_width = 36
    scene.camera = camera
    return camera


def render_views(camera: bpy.types.Object, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    views = {
        "front": ((5.2, -15.2, 11.6), (0.0, -0.15, 0.0)),
        "left-45": ((-11.4, -12.0, 10.6), (0.0, 0.0, -0.1)),
        "right-45": ((11.4, -12.0, 10.6), (0.0, 0.0, -0.1)),
        "rear": ((-5.2, 15.2, 11.6), (0.0, 0.15, -0.1)),
        "top": ((0.0, -0.2, 22.6), (0.0, 0.0, -0.25)),
        "front-cliff-low": ((6.0, -17.0, 7.2), (0.0, -0.5, -0.65)),
    }
    for view_name, (position, target) in views.items():
        camera.location = position
        look_at(camera, target)
        bpy.context.scene.render.filepath = str(render_dir / f"island-020-v5-blockout-{view_name}-v001.png")
        bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_glb = ensure_parent(args.output_glb)
    output_blend = ensure_parent(args.output_blend)
    render_dir = Path(args.render_dir).expanduser().resolve()
    clear_scene()
    materials = {
        "stone": make_material("I020_CLAY_CUT_BASALT", (0.16, 0.13, 0.14, 1.0), roughness=0.92),
        "deep_stone": make_material("I020_CLAY_DEEP_OBSIDIAN", (0.035, 0.028, 0.032, 1.0), roughness=0.96),
        "iron": make_material("I020_CLAY_BLACK_IRON", (0.055, 0.045, 0.05, 1.0), metallic=0.72, roughness=0.48),
        "molten": make_material(
            "I020_MOLTEN_SEMANTIC_PREVIEW",
            (0.95, 0.075, 0.008, 1.0),
            metallic=0.0,
            roughness=0.24,
            emission=(1.0, 0.025, 0.002, 1.0),
            emission_strength=4.8,
        ),
    }
    exported = build_world(materials)
    for obj in exported:
        obj["export_role"] = "runtime-semantic-part"
    camera = setup_render(materials)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        export_cameras=False,
        export_lights=False,
        export_apply=True,
        export_yup=True,
    )
    render_views(camera, render_dir)
    print(f"ISLAND020_V5_EXPORT objects={len(exported)} glb={output_glb} blend={output_blend} renders={render_dir}")


if __name__ == "__main__":
    main()
