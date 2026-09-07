"""Build Circuit I's atlas-batched Island 019 exterior.

Decisions d016 and d017 authorize the source-identity rebuild and the physical
palace throughpass. The asset owns only static exterior art; the canonical
board, Wonder Express spline, gameplay services, animated train and carnival
ride pivots remain in Three.js.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "public/assets/islands/island-019"
WORK_DIR = ROOT / "work/island-visual-library/island-019-coaster-carnival/blender"
EVIDENCE_DIR = ROOT / "work/island-visual-library/island-019-coaster-carnival/evidence/grand-grotto-d019-r01/raw"
REPORT_PATH = ROOT / ".img2threejs/island-019-coaster-carnival/grand-grotto-build-report-d019-r01.json"
ATLAS_PATH = ASSET_DIR / "coaster-carnival-exterior-atlas-v008.png"
GLB_PATH = ASSET_DIR / "coaster-carnival-exterior-v008.glb"
BLEND_PATH = WORK_DIR / "coaster-carnival-exterior-v008.blend"
ROUTE_PATH = ROOT / "src/features/gamification/level-worlds/dev/island19WonderRoute.json"
GROTTO_PATH = ROOT / "src/features/gamification/level-worlds/dev/island19WonderGrotto.json"

PALETTE = {
    "basalt": (0.19, 0.285, 0.33, 1.0),
    "wet-rock": (0.105, 0.255, 0.32, 1.0),
    "grass": (0.10, 0.42, 0.22, 1.0),
    "moss": (0.31, 0.62, 0.24, 1.0),
    "ivory": (1.0, 0.93, 0.73, 1.0),
    "terracotta": (0.82, 0.22, 0.075, 1.0),
    "teal": (0.025, 0.54, 0.54, 1.0),
    "gold": (1.0, 0.66, 0.075, 1.0),
    "red": (0.92, 0.065, 0.03, 1.0),
    "blue": (0.03, 0.54, 0.83, 1.0),
    "stone": (0.72, 0.63, 0.50, 1.0),
    "dark": (0.06, 0.045, 0.04, 1.0),
    "pink": (1.0, 0.30, 0.48, 1.0),
    "flower": (1.0, 0.82, 0.19, 1.0),
    "window": (0.045, 0.16, 0.22, 1.0),
    "foam": (0.93, 1.0, 1.0, 1.0),
}
GRID = 4
ATLAS_SIZE = 256
ATLAS_MATERIALS = {}


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def make_atlas():
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    image = bpy.data.images.new("ISLAND_19_CIRCUIT_I_PALETTE_ATLAS", width=ATLAS_SIZE, height=ATLAS_SIZE, alpha=True)
    pixels = [0.0] * (ATLAS_SIZE * ATLAS_SIZE * 4)
    keys = list(PALETTE)
    tile = ATLAS_SIZE // GRID
    for y in range(ATLAS_SIZE):
        for x in range(ATLAS_SIZE):
            col = min(GRID - 1, x // tile)
            row = min(GRID - 1, y // tile)
            color = PALETTE[keys[row * GRID + col]]
            offset = (y * ATLAS_SIZE + x) * 4
            pixels[offset:offset + 4] = color
    image.pixels = pixels
    image.filepath_raw = str(ATLAS_PATH)
    image.file_format = "PNG"
    image.save()

    material_specs = {
        "rock": (0.78, 0.02),
        "paint": (0.42, 0.04),
        "metal": (0.22, 0.68),
    }
    materials = {}
    for family, (roughness, metallic) in material_specs.items():
        material = bpy.data.materials.new(f"ISLAND_19_CIRCUIT_I_ATLAS_{family.upper()}_MATERIAL")
        material.use_nodes = True
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        principled = nodes.get("Principled BSDF")
        tex = nodes.new("ShaderNodeTexImage")
        tex.name = f"ISLAND_19_CIRCUIT_I_ATLAS_{family.upper()}_TEXTURE"
        tex.image = image
        tex.interpolation = "Closest"
        links.new(tex.outputs["Color"], principled.inputs["Base Color"])
        principled.inputs["Roughness"].default_value = roughness
        principled.inputs["Metallic"].default_value = metallic
        materials[family] = material
    return materials


def atlas_center(key: str):
    index = list(PALETTE).index(key)
    col = index % GRID
    row = index // GRID
    return ((col + 0.5) / GRID, (row + 0.5) / GRID)


def finish(obj, key: str):
    if obj.type != "MESH":
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.convert(target="MESH")
        obj = bpy.context.object
    while len(obj.data.materials):
        obj.data.materials.pop(index=0)
    family = "metal" if key in {"gold", "dark"} else "rock" if key in {"basalt", "wet-rock", "grass", "moss", "stone"} else "paint"
    obj.data.materials.append(ATLAS_MATERIALS[family])
    uv_layer = obj.data.uv_layers.get("CircuitIAtlasUV") or obj.data.uv_layers.new(name="CircuitIAtlasUV")
    u, v = atlas_center(key)
    for loop in obj.data.loops:
        uv_layer.data[loop.index].uv = (u, v)
    for polygon in obj.data.polygons:
        polygon.material_index = 0
    obj["atlasCell"] = key
    obj["decisionId"] = "d016+d017"
    return obj


def box(name, location, dimensions, key: str, bevel: float = 0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("CIRCUIT_I_EDGE_SOFTEN", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish(obj, key)


def cylinder(name, location, radius, depth, key: str, vertices: int = 16, scale=(1.0, 1.0, 1.0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, key)


def cone(name, location, radius1, radius2, depth, key: str, vertices: int = 16, scale=(1.0, 1.0, 1.0)):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, key)


def sphere(name, location, scale, key: str, segments: int = 16, rings: int = 8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, key)


def text_mesh(name: str, body: str, location, size: float, depth: float, key: str):
    curve = bpy.data.curves.new(f"{name}-curve", type="FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = depth
    curve.bevel_depth = depth * 0.22
    curve.bevel_resolution = 1
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.radians(90), 0.0, 0.0)
    return finish(obj, key)


def torus(name, location, major_radius, minor_radius, key: str, rotation=(0.0, 0.0, 0.0), major_segments=32, minor_segments=6):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, key)


def curve_tube(name: str, points, radius: float, key: str, resolution: int = 1):
    curve = bpy.data.curves.new(f"{name}-curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, source in zip(spline.points, points):
        point.co = (*source, 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return finish(obj, key)


def mesh_object(name: str, vertices, faces, key: str):
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, key)


def build_island_shell(objects):
    rings = [
        (0.18, 8.95, 7.34, -0.14, -0.18),
        (-0.28, 9.05, 7.42, -0.08, -0.16),
        (-1.10, 8.82, 7.18, 0.00, -0.08),
        (-2.10, 8.48, 6.84, -0.05, 0.00),
        (-3.18, 8.02, 6.42, 0.08, 0.08),
        (-4.28, 7.43, 5.94, 0.14, 0.16),
        (-6.20, 8.50, 7.00, 0.03, 0.24),
        (-10.00, 9.20, 7.50, -0.02, 0.30),
        (-15.00, 9.20, 7.50, -0.02, 0.30),
        (-20.00, 8.20, 6.80, -0.02, 0.30),
        (-24.00, 5.50, 4.60, -0.02, 0.30),
    ]
    sectors = 96
    vertices = []
    for ring_index, (z, rx, ry, ox, oy) in enumerate(rings):
        for index in range(sectors):
            angle = math.tau * index / sectors
            factor = 1.0 + 0.050 * math.sin(angle * 3 + ring_index * 0.34) + 0.026 * math.cos(angle * 7 - 0.45)
            if ring_index == 0:
                factor += 0.05 * max(0.0, -math.sin(angle))
            teeth = 0.0
            if ring_index == len(rings) - 1:
                teeth = 0.30 + (0.46 if index % 5 == 0 else 0.18 if index % 3 == 0 else 0.0)
            vertices.append((ox + math.cos(angle) * rx * factor, oy + math.sin(angle) * ry * factor, z - teeth))
    faces = []
    for ring_index in range(len(rings) - 1):
        for index in range(sectors):
            nxt = (index + 1) % sectors
            angle = math.tau * (index + 0.5) / sectors
            front_open = ring_index <= 5 and abs(math.atan2(math.sin(angle + math.pi / 2), math.cos(angle + math.pi / 2))) < 0.20
            cave_open = 1 <= ring_index <= 6 and abs(math.atan2(math.sin(angle - 0.10), math.cos(angle - 0.10))) < 0.22
            # d018: closed terrain, with actual spline-cut portals below.
            a = ring_index * sectors + index
            b = ring_index * sectors + nxt
            c = (ring_index + 1) * sectors + nxt
            d = (ring_index + 1) * sectors + index
            faces.append((a, b, c, d))
    top_center = len(vertices)
    vertices.append((-0.12, -0.18, 0.18))
    bottom_center = len(vertices)
    vertices.append((0.0, 0.28, -24.72))
    for index in range(sectors):
        nxt = (index + 1) % sectors
        faces.append((top_center, nxt, index))
        last = (len(rings) - 1) * sectors
        faces.append((bottom_center, last + index, last + nxt))
    objects.append(mesh_object("CIRCUIT_H_DEEP_IRREGULAR_CLIFF", vertices, faces, "basalt"))
    objects.append(cylinder("CIRCUIT_H_PARK_TERRACE", (-0.12, -0.18, 0.19), 1.0, 0.22, "grass", 64, (8.78, 7.15, 1.0)))

    # Wet rock teeth and moss shelves break the root into the source's rich edge rhythm.
    for index in range(34):
        angle = math.tau * index / 34 + 0.04 * math.sin(index * 2.7)
        rx = 7.9 + 0.25 * math.sin(index * 1.9)
        ry = 6.4 + 0.18 * math.cos(index * 2.3)
        location = (math.cos(angle) * rx, math.sin(angle) * ry, -3.30 - 0.58 * (index % 3))
        objects.append(cone(f"CIRCUIT_H_WET_ROOT_{index:02d}", location, 0.48, 0.30, 1.4 + 0.25 * (index % 4), "wet-rock", 7, (1.0, 0.8, 1.0)))
    for index in range(28):
        angle = math.tau * (index + 0.5) / 28
        location = (math.cos(angle) * 8.30, math.sin(angle) * 6.76, 0.22 + 0.05 * (index % 3))
        objects.append(sphere(f"CIRCUIT_H_MOSS_LEDGE_{index:02d}", location, (0.55, 0.34, 0.18), "moss", 10, 6))


def add_turret(objects, prefix, x, y, base_z, height, radius=0.58):
    objects.append(cylinder(f"{prefix}_BODY", (x, y, base_z + height * 0.5), radius, height, "ivory", 16))
    objects.append(cylinder(f"{prefix}_TEAL_BAND", (x, y, base_z + height * 0.72), radius * 1.05, 0.18, "teal", 16))
    objects.append(cone(f"{prefix}_ROOF", (x, y, base_z + height + 0.48), radius * 1.32, 0.10, 0.95, "terracotta", 16))
    objects.append(sphere(f"{prefix}_FINIAL", (x, y, base_z + height + 1.02), (0.11, 0.11, 0.17), "gold", 10, 6))
    for side in (-1, 1):
        objects.append(box(f"{prefix}_WINDOW_{side:+d}", (x + side * radius * 0.58, y - radius * 0.88, base_z + height * 0.55), (0.18, 0.05, 0.42), "window", 0.03))


def build_palace_and_gateway(objects):
    palace_start = len(objects)
    # Main palace sits behind the canonical fountain/board from the source-facing camera.
    # d017: construct the mass around a real train-sized void. No mesh crosses
    # x +/-0.925 or z 0.80..2.72 through the full 2.05 m building depth.
    objects.append(box("CIRCUIT_I_PALACE_PORTAL_LEFT_JAMB", (-1.40, 1.00, 1.72), (0.95, 2.05, 3.08), "ivory", 0.16))
    objects.append(box("CIRCUIT_I_PALACE_PORTAL_RIGHT_JAMB", (1.40, 1.00, 1.72), (0.95, 2.05, 3.08), "ivory", 0.16))
    objects.append(box("CIRCUIT_I_PALACE_PORTAL_LINTEL", (0.0, 1.00, 3.50), (1.90, 2.05, 0.52), "ivory", 0.14))
    objects.append(box("CIRCUIT_H_PALACE_RED_PLINTH", (0.0, 0.90, 0.50), (4.25, 2.42, 0.60), "terracotta", 0.12))
    objects.append(cylinder("CIRCUIT_I_PALACE_UPPER_CENTRAL_TOWER", (0.0, 0.92, 4.72), 1.08, 2.88, "ivory", 24))
    objects.append(cylinder("CIRCUIT_I_PALACE_TEAL_CROWN", (0.0, 0.92, 6.02), 1.22, 0.34, "teal", 24))
    objects.append(sphere("CIRCUIT_I_PALACE_TEAL_DOME", (0.0, 0.92, 6.41), (1.28, 1.28, 0.78), "teal", 24, 12))
    objects.append(cone("CIRCUIT_I_PALACE_DOME_CAP", (0.0, 0.92, 7.13), 0.46, 0.03, 0.95, "gold", 18))
    add_turret(objects, "CIRCUIT_H_PALACE_LEFT", -2.30, 0.86, 0.40, 3.32, 0.68)
    add_turret(objects, "CIRCUIT_H_PALACE_RIGHT", 2.30, 0.86, 0.40, 3.32, 0.68)
    add_turret(objects, "CIRCUIT_H_PALACE_REAR_LEFT", -1.42, 1.90, 0.42, 2.92, 0.54)
    add_turret(objects, "CIRCUIT_H_PALACE_REAR_RIGHT", 1.42, 1.90, 0.42, 2.92, 0.54)
    for index in range(7):
        x = -1.38 + index * 0.46
        if abs(x) > 1.0:
            objects.append(box(f"CIRCUIT_I_PALACE_FRONT_WINDOW_{index}", (x, -0.045, 1.88), (0.22, 0.055, 0.62), "window", 0.04))
            objects.append(box(f"CIRCUIT_I_PALACE_GOLD_TRIM_{index}", (x, -0.085, 2.55), (0.31, 0.045, 0.11), "gold", 0.02))
    for face, portal_y in (("FRONT", -0.08), ("REAR", 2.08)):
        arch_points = []
        for index in range(25):
            angle = math.pi - math.pi * index / 24
            arch_points.append((math.cos(angle) * 0.93, portal_y, 2.08 + math.sin(angle) * 1.04))
        objects.append(curve_tube(f"CIRCUIT_I_PALACE_RAIL_PORTAL_{face}_ARCH", arch_points, 0.10, "gold"))
    for side in (-1, 1):
        objects.append(box(f"CIRCUIT_I_PALACE_PORTAL_REVEAL_{side:+d}", (side * 0.98, 1.0, 1.55), (0.12, 2.05, 1.95), "teal", 0.035))
    objects.append(curve_tube("CIRCUIT_H_PALACE_GOLD_CROWN", [(-1.80, -0.10, 3.10), (-0.90, -0.28, 3.58), (0.0, -0.34, 3.76), (0.90, -0.28, 3.58), (1.80, -0.10, 3.10)], 0.10, "gold"))
    # Palace/throughpass move together behind the canonical central fountain.
    for obj in objects[palace_start:]:
        obj.location.y += 3.4
    # The enlarged route arrives over the rear shore on a real pier.
    objects.append(box("CIRCUIT_J_REAR_STATION_PIER", (0, 9.1, 1.18), (2.3, 3.55, 0.30), "stone", 0.06))
    for pier_y in (7.6, 9.0, 10.4):
        for side in (-1, 1):
            objects.append(cylinder(f"CIRCUIT_J_PIER_PILE_{pier_y}_{side}", (side * 0.96, pier_y, -3.35), 0.12, 9.1, "gold", 10))

    # Source-facing entry becomes a small architectural district rather than one tan block.
    gate_y = -6.88
    for side in (-1, 1):
        x = side * 2.18
        objects.append(box(f"CIRCUIT_H_GATE_PIER_{side:+d}", (x, gate_y, 1.10), (1.00, 1.34, 3.20), "stone", 0.16))
        add_turret(objects, f"CIRCUIT_H_GATE_TOWER_{side:+d}", x, gate_y, 0.30, 3.00, 0.68)
        objects.append(box(f"CIRCUIT_H_GATE_BANNER_{side:+d}", (x, gate_y - 0.73, 1.88), (0.48, 0.06, 1.08), "red", 0.03))
    arch_points = []
    for index in range(25):
        angle = math.pi - math.pi * index / 24
        arch_points.append((math.cos(angle) * 2.02, gate_y - 0.46, 1.46 + math.sin(angle) * 1.72))
    objects.append(curve_tube("CIRCUIT_H_GATE_GOLD_ARCH", arch_points, 0.18, "gold"))
    objects.append(box("CIRCUIT_H_GATE_SIGN_GOLD_RAIL", (0.0, gate_y - 0.68, 3.45), (4.48, 0.08, 1.10), "gold", 0.20))
    objects.append(box("CIRCUIT_H_GATE_SIGN_FACE", (0.0, gate_y - 0.75, 3.45), (4.12, 0.10, 0.84), "teal", 0.18))
    objects.append(text_mesh("CIRCUIT_H_GATE_TITLE", "COASTER ISLAND", (0.0, gate_y - 0.83, 3.45), 0.46, 0.045, "ivory"))
    objects.append(box("CIRCUIT_H_GATE_BRIDGE", (0.0, -7.78, -0.06), (3.72, 2.12, 0.28), "stone", 0.10))
    for step in range(5):
        objects.append(box(f"CIRCUIT_H_GATE_STEP_{step}", (0.0, -8.25 - step * 0.24, -0.20 - step * 0.10), (3.60 + step * 0.18, 0.32, 0.12), "ivory", 0.025))

    # Waterfall receiving channels remain static; the existing elapsed-time ribbons animate above them.
    for side in (-1, 1):
        x = side * 2.80
        objects.append(box(f"CIRCUIT_H_WATERFALL_CHANNEL_{side:+d}", (x, -7.13, -1.35), (0.92, 0.70, 3.35), "blue", 0.20))
        objects.append(box(f"CIRCUIT_H_WATERFALL_LIP_{side:+d}", (x, -7.28, 0.30), (1.16, 0.90, 0.34), "foam", 0.11))
        objects.append(sphere(f"CIRCUIT_H_WATERFALL_SPLASH_{side:+d}", (x, -7.55, -2.95), (0.74, 0.34, 0.24), "foam", 12, 7))


def build_park_districts(objects):
    # Static bases support the existing animated Ferris wheel, carousel and drop-tower pivots.
    objects.append(cylinder("CIRCUIT_H_FERRIS_PLAZA", (-5.40, -0.25, 0.34), 1.46, 0.30, "stone", 28, (1.0, 0.78, 1.0)))
    objects.append(cylinder("CIRCUIT_H_CAROUSEL_PLAZA", (5.15, -1.90, 0.35), 1.62, 0.32, "stone", 28, (1.0, 0.82, 1.0)))
    objects.append(cylinder("CIRCUIT_H_DROP_TOWER_BASE", (5.55, 1.90, 0.70), 0.82, 1.02, "teal", 20))

    kiosk_specs = [
        (-5.7, -3.75, "terracotta", "CIRCUIT_H_TICKET_BOOTH"),
        (4.7, -4.10, "teal", "CIRCUIT_H_SWEET_SHOP"),
        (-6.7, 2.85, "red", "CIRCUIT_H_BALLOON_STALL"),
        (3.7, 3.95, "terracotta", "CIRCUIT_H_SEA_VIEW_KIOSK"),
        (-3.9, 4.35, "teal", "CIRCUIT_H_GAME_STALL"),
    ]
    for x, y, roof_key, prefix in kiosk_specs:
        objects.append(box(f"{prefix}_BODY", (x, y, 0.70), (1.16, 0.94, 1.05), "ivory", 0.08))
        objects.append(cone(f"{prefix}_ROOF", (x, y, 1.46), 0.88, 0.10, 0.62, roof_key, 12))
        objects.append(box(f"{prefix}_COUNTER", (x, y - 0.51, 0.72), (0.75, 0.16, 0.22), "gold", 0.03))

    # Dense repeated ecology is authored individually, then collapsed into the single atlas batch.
    clearings = [(-5.4, -0.25, 1.65), (5.15, -1.9, 1.8), (5.55, 1.9, 1.2), (0.0, 0.65, 2.35)]
    tree_index = 0
    for ring, count in ((5.15, 34), (6.55, 44), (7.65, 46)):
        for index in range(count):
            angle = math.tau * index / count + ring * 0.07
            x = math.cos(angle) * (ring + 0.22 * math.sin(index * 2.17))
            y = math.sin(angle) * (ring * 0.80 + 0.18 * math.cos(index * 1.73))
            if y < -5.45 and abs(x) < 2.9:
                continue
            if any(math.hypot(x - cx, y - cy) < radius for cx, cy, radius in clearings):
                continue
            trunk_height = 0.52 + 0.09 * (tree_index % 4)
            objects.append(cylinder(f"CIRCUIT_H_TREE_TRUNK_{tree_index:03d}", (x, y, 0.34 + trunk_height * 0.5), 0.08, trunk_height, "dark", 7))
            objects.append(cone(f"CIRCUIT_H_TREE_CROWN_{tree_index:03d}", (x, y, 0.62 + trunk_height), 0.38 + 0.04 * (tree_index % 3), 0.04, 0.82, "grass" if tree_index % 3 else "moss", 8))
            tree_index += 1

    for index in range(72):
        angle = math.tau * index / 72 + 0.15
        radius = 4.25 + 0.55 * math.sin(index * 2.31)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius * 0.82
        if math.hypot(x, y - 0.65) < 2.55:
            continue
        objects.append(sphere(f"CIRCUIT_H_FLOWER_BED_{index:03d}", (x, y, 0.43), (0.18, 0.18, 0.14), "flower" if index % 2 else "pink", 8, 5))

    # Gold lamps and red pennants provide the source's park-scale sparkle without micro-mesh draw calls.
    for index in range(30):
        angle = math.tau * index / 30
        radius = 5.85
        x, y = math.cos(angle) * radius, math.sin(angle) * radius * 0.78
        objects.append(cylinder(f"CIRCUIT_H_LAMP_POST_{index:02d}", (x, y, 0.82), 0.045, 0.86, "gold", 6))
        objects.append(sphere(f"CIRCUIT_H_LAMP_GLOW_{index:02d}", (x, y, 1.28), (0.10, 0.10, 0.14), "flower", 8, 5))
        if index % 2 == 0:
            objects.append(cone(f"CIRCUIT_H_PENNANT_{index:02d}", (x, y, 1.67), 0.18, 0.0, 0.38, "red", 3))


def join_static(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = "ISLAND_19_CIRCUIT_I_STATIC_BATCH"
    joined["representation"] = "three-material-single-atlas-joined-static-exterior"
    joined["gameplayAuthority"] = False
    joined["animatedRideOwnedByThreeJs"] = True
    for polygon in joined.data.polygons:
        polygon.use_smooth = False
    return joined


def carve_continuous_ride(objects):
    """Subtract the exact shared ride spline from the island's own meshes.

    This is not a second underground island. It makes a real connected void
    inside the retained cliff and terrace, lined by the runtime cavern shell.
    """
    route = json.loads(ROUTE_PATH.read_text())
    grotto = json.loads(GROTTO_PATH.read_text())
    points = [Vector(knot["position"]) for knot in route["knots"]]
    handles = []
    for index, point in enumerate(points):
        previous, following = points[(index - 1) % len(points)], points[(index + 1) % len(points)]
        direction = Vector(route["knots"][index].get("tangent", following - previous)).normalized()
        handles.append(direction * min((point - previous).length, (point - following).length) * route["knots"][index]["handleScale"])

    def cutter(name, first, last, radius, eye_offset=0.0, closed=False):
        samples = []
        for index in range(first, last):
            nxt = (index + 1) % len(points)
            a, b, c, d = points[index], points[index] + handles[index], points[nxt] - handles[nxt], points[nxt]
            for step in range(25):
                t = step / 25
                p = a * (1-t)**3 + b * (3*(1-t)**2*t) + c * (3*(1-t)*t*t) + d * t**3
                tangent = ((b-a) * (3*(1-t)**2) + (c-b) * (6*(1-t)*t) + (d-c) * (3*t*t)).normalized()
                side = Vector((0, 1, 0)).cross(tangent).normalized()
                up = tangent.cross(side).normalized()
                samples.append((p + up * eye_offset, side, up))
        if not closed:
            end = last % len(points)
            tangent = handles[end].normalized()
            side = Vector((0, 1, 0)).cross(tangent).normalized()
            up = tangent.cross(side).normalized()
            samples.append((points[end] + up * eye_offset, side, up))
        vertices, faces = [], []
        sides = 20
        for p, side, up in samples:
            for k in range(sides):
                angle = math.tau * k / sides
                q = p + side * (math.cos(angle) * radius) + up * (math.sin(angle) * radius)
                vertices.append((q.x, -q.z, q.y))
        for i in range(len(samples) if closed else len(samples)-1):
            ni = (i+1) % len(samples)
            for k in range(sides):
                nk = (k+1) % sides
                faces.append((i*sides+k, i*sides+nk, ni*sides+nk, ni*sides+k))
        if not closed:
            faces.append(tuple(reversed(range(sides))))
            faces.append(tuple((len(samples)-1)*sides+k for k in range(sides)))
        obj = mesh_object(name, vertices, faces, "basalt")
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(obj.data)
        bm.free()
        return obj

    plunge_index = next(i for i, knot in enumerate(route["knots"]) if knot["id"] == "plunge-mouth")
    deep = cutter("D018_DEEP_ROUTE_VOID", plunge_index, len(points), route["radius"] + 0.10)
    clearance = cutter("D018_TRAIN_CLEARANCE", 0, len(points), 0.78, 0.40, True)
    cx, cy, cz = grotto["center"]
    rx, ry, rz = grotto["radii"]
    chamber = sphere("D019_TRUE_SECOND_LEVEL_CAVITY", (cx, -cz, cy), (rx + .12, rz + .12, ry + .12), "basalt", 72, 48)
    for obj in objects:
        # Closed shells and independent props each get a real difference,
        # avoiding Boolean ambiguity from intersecting joined solids.
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(obj.data)
        bm.free()
        for tool in (chamber, deep, clearance):
            if tool == chamber and min((obj.matrix_world @ Vector(corner)).z for corner in obj.bound_box) > cy + ry + .12:
                continue
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new("D018_PHYSICAL_TRACK_PASSAGE", "BOOLEAN")
            modifier.operation = "DIFFERENCE"
            modifier.solver = "EXACT"
            modifier.object = tool
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(deep, do_unlink=True)
    bpy.data.objects.remove(clearance, do_unlink=True)
    bpy.data.objects.remove(chamber, do_unlink=True)


def semantic_empty(name: str, parent, location=(0.0, 0.0, 0.0)):
    empty = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(empty)
    empty.parent = parent
    empty.location = location
    empty["semanticSocket"] = True
    return empty


def triangle_count(obj) -> int:
    return sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)


def point_camera(camera, target):
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_evidence(root, static_batch):
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.camera_add(location=(0.0, -25.5, 12.8))
    camera = bpy.context.object
    camera.name = "CIRCUIT_I_EVIDENCE_CAMERA"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 20.8
    bpy.context.scene.camera = camera
    key_data = bpy.data.lights.new("CIRCUIT_H_KEY", type="AREA")
    key_data.energy = 1850
    key_data.shape = "DISK"
    key_data.size = 8.0
    key = bpy.data.objects.new("CIRCUIT_H_KEY", key_data)
    bpy.context.collection.objects.link(key)
    key.location = (-10.0, -14.0, 18.0)
    fill_data = bpy.data.lights.new("CIRCUIT_H_FILL", type="AREA")
    fill_data.energy = 700
    fill_data.size = 9.0
    fill = bpy.data.objects.new("CIRCUIT_H_FILL", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = (12.0, 4.0, 9.0)
    world = bpy.context.scene.world
    world.color = (0.055, 0.09, 0.13)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 760
    scene.render.resolution_y = 980
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    views = {
        "front": ((0.0, -25.5, 12.8), (0.0, -0.4, -0.55), 20.8),
        "right": ((24.0, -4.5, 10.5), (0.0, 0.0, -0.75), 20.6),
        "rear": ((0.0, 25.5, 11.0), (0.0, 0.0, -0.85), 20.6),
        "left": ((-24.0, -4.5, 10.5), (0.0, 0.0, -0.75), 20.6),
        "top-oblique": ((17.0, -20.0, 21.0), (0.0, 0.0, -0.4), 22.5),
    }
    for name, (location, target, scale) in views.items():
        camera.location = location
        camera.data.ortho_scale = scale
        point_camera(camera, target)
        scene.render.filepath = str(EVIDENCE_DIR / f"blender-{name}-correction-r02.png")
        bpy.ops.render.render(write_still=True)


def export_asset(root, static_batch):
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    static_batch.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = static_batch
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_extras=True,
        export_yup=True,
        export_materials="EXPORT",
    )


def main():
    global ATLAS_MATERIALS
    reset_scene()
    ATLAS_MATERIALS = make_atlas()
    root = bpy.data.objects.new("ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR", None)
    bpy.context.collection.objects.link(root)
    root["assetId"] = "island-019-coaster-carnival-exterior-v008"
    root["decisionId"] = "d016+d017+d018+d019"
    root["gameplayAuthority"] = False
    root["canonicalBoardOwnedByAsset"] = False
    root["wonderExpressOwnedByAsset"] = False
    objects = []
    build_island_shell(objects)
    build_palace_and_gateway(objects)
    build_park_districts(objects)
    carve_continuous_ride(objects)
    static_batch = join_static(objects)
    static_batch.parent = root
    semantic_empty("ISLAND_19_CIRCUIT_I_BOARD_SOCKET", root, (0.0, 0.0, 0.42))
    semantic_empty("ISLAND_19_CIRCUIT_I_RIDE_SOCKET", root, (0.0, 0.0, 0.0))
    semantic_empty("ISLAND_19_CIRCUIT_I_DEEP_TUBE_ENTRY_SOCKET", root, (7.25, 0.78, -6.88))
    semantic_empty("ISLAND_19_CIRCUIT_I_PURPOSE_BUILT_RAIL_PORTAL_SOCKET", root, (0.0, 4.4, 1.62))
    triangles = triangle_count(static_batch)
    if triangles > 60000:
        raise RuntimeError(f"Circuit H static exterior exceeds 60,000 triangles: {triangles}")
    render_evidence(root, static_batch)
    export_asset(root, static_batch)
    report = {
        "schemaVersion": 1,
        "family": "circuit-i-source-identity-and-structural-ride-exterior",
        "decisionId": "d016+d017+d018+d019",
        "status": "bounded-correction-built-awaiting-runtime-quality-lord",
        "revision": "r02",
        "hypothesis": "The shared C1 route carves a continuous physical void through this island's own cliff, terrace and obstructing scenery; no image plate or replacement island is used.",
        "staticMeshCount": 1,
        "materialCount": len(static_batch.data.materials),
        "expectedStaticDrawCalls": len(static_batch.data.materials),
        "triangles": triangles,
        "triangleBudget": 60000,
        "drawCallBudget": 3,
        "atlas": str(ATLAS_PATH.relative_to(ROOT)),
        "glb": str(GLB_PATH.relative_to(ROOT)),
        "blend": str(BLEND_PATH.relative_to(ROOT)),
        "evidenceDirectory": str(EVIDENCE_DIR.relative_to(ROOT)),
        "gameplayWrites": False,
        "boardGeometryOwned": False,
        "wonderExpressRouteOwned": False,
        "purposeBuiltRailPortalOwned": True,
        "palacePortalClearWidth": 1.85,
        "palacePortalClearHeight": 3.02,
        "palaceRearwardOffset": 3.4,
        "sharedRouteSource": str(ROUTE_PATH.relative_to(ROOT)),
        "physicalGrotto": json.loads(GROTTO_PATH.read_text()),
        "palacePortalDepth": 2.05,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
