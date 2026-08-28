import math
import os
import shutil
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
PALACE_VERSION = "v015"
OUTPUT = ROOT / f"public/assets/dev/vault-island-lab/vault-palace-{PALACE_VERSION}.glb"
PRODUCTION_OUTPUT = ROOT / "public/assets/islands/special/vault-island/vault-palace.glb"
BLEND_OUTPUT = ROOT / f"work/vault-island-palace/vault-palace-{PALACE_VERSION}.blend"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, metallic=0.0, roughness=0.45, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in shader.inputs:
        shader.inputs["Coat Weight"].default_value = 0.45 if metallic else 0.2
        shader.inputs["Coat Roughness"].default_value = max(0.04, roughness * 0.45)
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = emission_strength
    return mat


def assign(obj, mat):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    return obj


def bevel(obj, amount=0.04, segments=3):
    modifier = obj.modifiers.new("architectural-bevel", "BEVEL")
    modifier.width = amount
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    return obj


def box(name, location, dimensions, mat, bevel_amount=0.035):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    if bevel_amount:
        bevel(obj, bevel_amount, 3)
    return obj


def cylinder(name, location, radius, depth, mat, vertices=20, rotation=None, bevel_amount=0.018):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    if bevel_amount:
        bevel(obj, bevel_amount, 2)
    return obj


def cone(name, location, radius1, radius2, depth, mat, vertices=16):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    bevel(obj, min(radius1 * 0.08, 0.025), 2)
    return obj


def sphere(name, location, scale, mat, segments=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    bpy.ops.object.shade_smooth()
    return obj


def torus(name, location, major_radius, minor_radius, mat, rotation=(0, 0, 0), major_segments=36, minor_segments=8):
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
    assign(obj, mat)
    bpy.ops.object.shade_smooth()
    return obj


def curve_tube(name, points, radius, mat, cyclic=False, resolution=2):
    curve_data = bpy.data.curves.new(name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = resolution
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 3
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    assign(obj, mat)
    return obj


def text_mesh(name, text, location, size, depth, mat, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = depth
    obj.data.bevel_depth = depth * 0.32
    obj.data.bevel_resolution = 2
    assign(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj


def arch_panel(name, location, width, side_height, radius, depth, mat):
    half = width / 2
    outline = [(-half, 0)]
    outline.append((half, 0))
    outline.append((half, side_height))
    steps = 12
    for index in range(steps + 1):
        angle = index / steps * math.pi
        outline.append((math.cos(angle) * radius, side_height + math.sin(angle) * radius))
    outline.append((-half, 0))
    front_y = -depth / 2
    back_y = depth / 2
    vertices = [(x, front_y, z) for x, z in outline[:-1]] + [(x, back_y, z) for x, z in outline[:-1]]
    count = len(outline) - 1
    faces = [tuple(range(count)), tuple(range(count, count * 2))[::-1]]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    mesh_data = bpy.data.meshes.new(name)
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.update()
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    assign(obj, mat)
    bevel(obj, 0.014, 2)
    return obj


def triangular_prism(name, location, width, height, depth, mat):
    half = width / 2
    front_y = -depth / 2
    back_y = depth / 2
    profile = [(-half, 0), (half, 0), (0, height)]
    vertices = [(x, front_y, z) for x, z in profile] + [(x, back_y, z) for x, z in profile]
    faces = [
        (0, 1, 2),
        (5, 4, 3),
        (0, 3, 4, 1),
        (1, 4, 5, 2),
        (2, 5, 3, 0),
    ]
    mesh_data = bpy.data.meshes.new(name)
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.update()
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    assign(obj, mat)
    bevel(obj, 0.026, 3)
    return obj


def arch_frame(name, location, width, side_height, radius, tube_radius, mat, y_offset=-0.02):
    half = width / 2
    left = [(-half, y_offset, 0), (-half, y_offset, side_height)]
    right = [(half, y_offset, 0), (half, y_offset, side_height)]
    arc = []
    for index in range(17):
        angle = index / 16 * math.pi
        arc.append((math.cos(angle) * radius, y_offset, side_height + math.sin(angle) * radius))
    parent = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(parent)
    parent.location = location
    for suffix, points in (("left", left), ("right", right), ("arch", arc)):
        child = curve_tube(f"{name}-{suffix}", points, tube_radius, mat)
        child.parent = parent
    return parent


def dome(name, location, radius, height, mat, gold, rib_count=10):
    rings = 12
    segments = 32
    vertices = []
    for ring in range(rings + 1):
        phi = ring / rings * math.pi / 2
        ring_radius = math.sin(phi) * radius
        z = math.cos(phi) * height
        for segment in range(segments):
            angle = segment / segments * math.pi * 2
            vertices.append((math.sin(angle) * ring_radius, math.cos(angle) * ring_radius, z))
    faces = []
    for ring in range(rings):
        for segment in range(segments):
            nxt = (segment + 1) % segments
            a = ring * segments + segment
            b = ring * segments + nxt
            c = (ring + 1) * segments + nxt
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    assign(obj, mat)
    for polygon in data.polygons:
        polygon.use_smooth = True
    torus(f"{name}-gold-rim", location, radius * 1.01, radius * 0.045, gold)
    for index in range(rib_count):
        angle = index / rib_count * math.pi * 2
        points = []
        for step in range(9):
            phi = step / 8 * math.pi / 2
            ring_radius = math.sin(phi) * radius * 1.015
            z = math.cos(phi) * height * 1.015
            points.append((
                location[0] + math.sin(angle) * ring_radius,
                location[1] + math.cos(angle) * ring_radius,
                location[2] + z,
            ))
        curve_tube(f"{name}-proud-gold-rib-{index:02d}", points, radius * 0.022, gold)
    return obj


def finial(name, location, scale, gold, gem=None):
    cylinder(f"{name}-stem", (location[0], location[1], location[2] + scale * 0.32), scale * 0.045, scale * 0.64, gold, 10)
    sphere(f"{name}-orb", (location[0], location[1], location[2] + scale * 0.68), (scale * 0.12,) * 3, gold, 16, 8)
    cone(f"{name}-spire", (location[0], location[1], location[2] + scale * 0.94), scale * 0.1, 0.0, scale * 0.52, gold, 10)
    if gem:
        sphere(f"{name}-gem", (location[0], location[1], location[2] + scale * 1.23), (scale * 0.07, scale * 0.07, scale * 0.12), gem, 12, 6)


def window(name, x, y, z, scale, mats):
    arch_panel(f"{name}-shadow-surround", (x, y + 0.015, z - 0.025), 0.34 * scale, 0.46 * scale, 0.17 * scale, 0.075, mats["marble_shadow"])
    arch_panel(f"{name}-recess", (x, y - 0.035, z), 0.25 * scale, 0.4 * scale, 0.125 * scale, 0.065, mats["window"])
    arch_frame(f"{name}-marble-frame", (x, y - 0.075, z), 0.32 * scale, 0.44 * scale, 0.16 * scale, 0.032 * scale, mats["marble"])
    arch_frame(f"{name}-gold-inlay", (x, y - 0.105, z), 0.27 * scale, 0.41 * scale, 0.135 * scale, 0.015 * scale, mats["gold"])
    sphere(f"{name}-keystone", (x, y - 0.13, z + 0.55 * scale), (0.035 * scale, 0.025 * scale, 0.05 * scale), mats["cyan"], 12, 6)


def rear_window(name, x, y, z, scale, mats):
    arch_panel(f"{name}-shadow-surround", (x, y - 0.015, z - 0.025), 0.34 * scale, 0.46 * scale, 0.17 * scale, 0.075, mats["marble_shadow"])
    arch_panel(f"{name}-recess", (x, y + 0.035, z), 0.25 * scale, 0.4 * scale, 0.125 * scale, 0.065, mats["window"])
    arch_frame(f"{name}-marble-frame", (x, y + 0.075, z), 0.32 * scale, 0.44 * scale, 0.16 * scale, 0.032 * scale, mats["marble"], y_offset=0.02)
    arch_frame(f"{name}-gold-inlay", (x, y + 0.105, z), 0.27 * scale, 0.41 * scale, 0.135 * scale, 0.015 * scale, mats["gold"], y_offset=0.02)
    sphere(f"{name}-keystone", (x, y + 0.13, z + 0.55 * scale), (0.035 * scale, 0.025 * scale, 0.05 * scale), mats["cyan"], 12, 6)


def facade_pediment(name, x, y, z, width, mats, rear=False):
    face_y = y + (0.045 if rear else -0.045)
    points = [
        (x - width / 2, face_y, z),
        (x, face_y, z + width * 0.34),
        (x + width / 2, face_y, z),
    ]
    curve_tube(name, points, width * 0.045, mats["gold"])
    sphere(f"{name}-crown-gem", (x, face_y + (0.018 if rear else -0.018), z + width * 0.34), (width * 0.075, width * 0.038, width * 0.09), mats["purple"], 12, 6)


def facade_balustrade(name, y, z, width, mats, rear=False):
    face_y = y + (0.045 if rear else -0.045)
    box(f"{name}-top-rail", (0, face_y, z + 0.28), (width, 0.05, 0.055), mats["gold"], 0.012)
    box(f"{name}-bottom-rail", (0, face_y, z), (width, 0.05, 0.045), mats["dark_gold"], 0.01)
    count = 17
    for index in range(count):
        x = -width * 0.47 + index * (width * 0.94 / (count - 1))
        cylinder(f"{name}-turned-baluster", (x, face_y, z + 0.14), 0.018, 0.28, mats["gold"], 10)


def tower(name, x, y, radius, height, mats, dome_scale=1.12, base_z=0.0):
    cylinder(f"{name}-two-floor-body", (x, y, base_z + height / 2), radius, height, mats["marble"], 20, bevel_amount=0.03)
    torus(f"{name}-floor-course", (x, y, base_z + height * 0.49), radius * 1.02, 0.025, mats["gold"])
    torus(f"{name}-roof-course", (x, y, base_z + height), radius * 1.04, 0.035, mats["gold"])
    for floor_z in (height * 0.19, height * 0.61):
        for angle in (-0.55, 0, 0.55):
            wx = x + math.sin(angle) * (radius + 0.008)
            wy = y - math.cos(angle) * (radius + 0.01)
            panel = arch_panel(f"{name}-warm-window", (wx, wy, base_z + floor_z), radius * 0.38, height * 0.12, radius * 0.19, 0.025, mats["window"])
            panel.rotation_euler[2] = -angle
    dome_base = base_z + height
    dome(f"{name}-blue-dome", (x, y, dome_base), radius * dome_scale, radius * dome_scale * 0.75, mats["blue"], mats["gold"], 6)
    finial(f"{name}-finial", (x, y, dome_base + radius * dome_scale * 0.75), radius * 0.7, mats["gold"])


def lantern_tower(name, x, y, radius, base_z, shaft_height, mats, front=True):
    """Source-facing palace tower with three visible architectural stages."""
    face = -1 if front else 1
    cylinder(f"{name}-buttressed-shaft", (x, y, base_z + shaft_height / 2), radius, shaft_height, mats["marble"], 20, bevel_amount=0.025)
    for level in (base_z + 0.08, base_z + shaft_height * 0.48, base_z + shaft_height - 0.08):
        torus(f"{name}-gilded-stage-course", (x, y, level), radius * 1.07, 0.026, mats["gold"])

    for stage, stage_z in enumerate((base_z + shaft_height * 0.14, base_z + shaft_height * 0.55)):
        for angle_degrees in range(0, 360, 60):
            angle = math.radians(angle_degrees)
            wx = x + math.sin(angle) * (radius + 0.012)
            wy = y + math.cos(angle) * (radius + 0.012)
            panel = arch_panel(
                f"{name}-stage-{stage}-radial-tall-lancet",
                (wx, wy, stage_z),
                radius * 0.48,
                shaft_height * 0.2,
                radius * 0.24,
                0.035,
                mats["window"],
            )
            panel.rotation_euler[2] = -angle
            arch_frame(
                f"{name}-stage-{stage}-radial-lancet-gold-frame",
                (wx, wy, stage_z),
                radius * 0.52,
                shaft_height * 0.2,
                radius * 0.26,
                radius * 0.038,
                mats["gold"],
            ).rotation_euler[2] = -angle

    for angle in range(0, 360, 90):
        radians = math.radians(angle)
        px = x + math.sin(radians) * radius * 1.02
        py = y + math.cos(radians) * radius * 1.02
        cylinder(f"{name}-corner-pinnacle", (px, py, base_z + shaft_height * 0.63), radius * 0.11, shaft_height * 0.82, mats["marble"], 12)
        cylinder(f"{name}-corner-pinnacle-gold-cap", (px, py, base_z + shaft_height * 1.04), radius * 0.15, 0.08, mats["gold"], 12)
        cone(f"{name}-corner-pinnacle-spire", (px, py, base_z + shaft_height * 1.14), radius * 0.12, 0, shaft_height * 0.2, mats["gold"], 10)

    lantern_z = base_z + shaft_height
    cylinder(f"{name}-open-lantern", (x, y, lantern_z + radius * 0.38), radius * 0.78, radius * 0.72, mats["marble"], 16, bevel_amount=0.02)
    for angle in range(0, 360, 60):
        radians = math.radians(angle)
        wx = x + math.sin(radians) * radius * 0.79
        wy = y + math.cos(radians) * radius * 0.79
        cylinder(f"{name}-lantern-gold-column", (wx, wy, lantern_z + radius * 0.39), radius * 0.07, radius * 0.68, mats["gold"], 10)
    dome(f"{name}-crowned-blue-dome", (x, y, lantern_z + radius * 0.72), radius * 0.9, radius * 0.74, mats["blue"], mats["gold"], 8)
    finial(f"{name}-needle-finial", (x, y, lantern_z + radius * 1.46), radius * 1.25, mats["gold"], mats["cyan"])


def facade_buttress(name, x, y, base_z, height, mats, rear=False):
    face = 1 if rear else -1
    cylinder(f"{name}-marble-shaft", (x, y, base_z + height / 2), 0.075, height, mats["marble"], 12, bevel_amount=0.012)
    for z, radius in ((base_z + 0.06, 0.105), (base_z + height * 0.49, 0.095), (base_z + height - 0.05, 0.11)):
        cylinder(f"{name}-gilded-collar", (x, y + face * 0.008, z), radius, 0.075, mats["gold"], 12)
    cone(f"{name}-marble-crown", (x, y, base_z + height + 0.15), 0.13, 0.045, 0.3, mats["marble"], 12)
    sphere(f"{name}-crown-jewel", (x, y + face * 0.035, base_z + height + 0.31), (0.045, 0.035, 0.06), mats["purple"] if x < 0 else mats["cyan"], 12, 6)


def build_palace():
    clear_scene()
    mats = {
        "marble": material("vault-palace-white-marble", (0.78, 0.76, 0.7), roughness=0.26),
        "marble_shadow": material("vault-palace-shadow-stone", (0.63, 0.62, 0.6), roughness=0.6),
        "gold": material("vault-palace-polished-gold", (0.95, 0.62, 0.12), metallic=1.0, roughness=0.09),
        "dark_gold": material("vault-palace-antique-gold", (0.38, 0.18, 0.025), metallic=1.0, roughness=0.24),
        "blue": material("vault-palace-midnight-enamel", (0.018, 0.095, 0.3), metallic=0.08, roughness=0.12),
        "window": material("vault-palace-warm-glass", (0.008, 0.018, 0.045), metallic=0.12, roughness=0.15, emission=(0.55, 0.16, 0.025), emission_strength=0.55),
        "void": material("vault-palace-atrium-void", (0.008, 0.018, 0.045), roughness=0.6, emission=(0.02, 0.08, 0.16), emission_strength=0.7),
        "cyan": material("vault-palace-cyan-gem", (0.04, 0.75, 1.0), metallic=0.05, roughness=0.04, emission=(0.0, 0.2, 0.35), emission_strength=0.7),
        "purple": material("vault-palace-amethyst", (0.42, 0.03, 0.8), metallic=0.02, roughness=0.05, emission=(0.13, 0.0, 0.3), emission_strength=0.5),
    }

    root = bpy.data.objects.new("vault-palace-glb-root", None)
    bpy.context.collection.objects.link(root)

    podium = cylinder("palace-octagonal-podium", (0, 0, 0.08), 1.66, 0.16, mats["marble"], 24, bevel_amount=0.045)
    podium.parent = root
    torus("palace-podium-gold-course", (0, 0, 0.16), 1.61, 0.035, mats["gold"])

    lower_body = box("palace-broad-lower-basilica-body", (0, 0.04, 0.62), (2.74, 1.56, 1.24), mats["marble"], 0.12)
    lower_body.parent = root
    upper_keep = box("palace-narrow-upper-basilica-keep", (0, 0.06, 1.78), (2.02, 1.42, 1.34), mats["marble"], 0.11)
    upper_keep.parent = root
    for side in (-1, 1):
        wing = box(f"palace-{'left' if side < 0 else 'right'}-gabled-wing", (side * 1.22, 0.05, 0.92), (0.76, 1.38, 1.84), mats["marble"], 0.09)
        wing.parent = root
        cone(f"palace-wing-gable-{side}", (side * 1.22, -0.65, 1.9), 0.46, 0.0, 0.54, mats["marble"], 4).rotation_euler[1] = math.pi / 4

    # Projected facade skins create real shadow bands before ornament is added.
    box("palace-front-layered-facade-skin", (0, -0.82, 1.12), (2.58, 0.22, 2.24), mats["marble"], 0.055)
    box("palace-rear-layered-facade-skin", (0, 0.88, 1.12), (2.58, 0.22, 2.24), mats["marble"], 0.055)
    for side in (-1, 1):
        box("palace-side-layered-facade-skin", (side * 1.57, 0.03, 1.12), (0.2, 1.34, 2.24), mats["marble"], 0.05)

    # Stepped side chapels make the body read as an ornate palace rather than one block.
    for side in (-1, 1):
        cylinder("palace-faceted-side-chapel", (side * 1.43, -0.18, 0.84), 0.44, 1.68, mats["marble"], 10, bevel_amount=0.035)
        torus("palace-side-chapel-gold-course", (side * 1.43, -0.18, 1.63), 0.45, 0.035, mats["gold"])
        for angle in (-0.5, 0, 0.5):
            wx = side * 1.43 + math.sin(angle) * 0.445
            wy = -0.18 - math.cos(angle) * 0.45
            panel = arch_panel("palace-side-chapel-lancet", (wx, wy, 0.27), 0.2, 0.5, 0.1, 0.035, mats["window"])
            panel.rotation_euler[2] = -angle

    box("palace-first-floor-marble-cornice", (0, -0.01, 1.0), (3.18, 1.76, 0.12), mats["marble"], 0.035)
    box("palace-first-floor-gold-course", (0, -0.01, 1.07), (3.24, 1.8, 0.05), mats["gold"], 0.014)
    box("palace-upper-keep-marble-cornice", (0, 0.02, 2.33), (2.18, 1.62, 0.14), mats["marble"], 0.04)
    box("palace-upper-keep-gold-course", (0, 0.02, 2.41), (2.26, 1.68, 0.055), mats["gold"], 0.018)

    # A broad classical crown breaks the cylindrical castle reading and gives
    # front and rear elevations the same ceremonial hierarchy.
    triangular_prism("palace-front-monumental-crown-pediment", (0, -0.99, 2.27), 1.78, 0.58, 0.2, mats["marble"])
    box("palace-front-monumental-crown-cornice", (0, -1.105, 2.3), (1.94, 0.1, 0.11), mats["marble"], 0.026)
    box("palace-front-monumental-crown-gold-course", (0, -1.165, 2.34), (1.98, 0.045, 0.045), mats["gold"], 0.012)
    curve_tube(
        "palace-front-monumental-crown-gold-rake",
        [(-0.86, -1.105, 2.29), (0, -1.105, 2.82), (0.86, -1.105, 2.29)],
        0.034,
        mats["gold"],
    )
    arch_panel("palace-front-monumental-crown-blue-rose-bay", (0, -1.12, 2.36), 0.46, 0.06, 0.23, 0.055, mats["blue"])
    arch_frame("palace-front-monumental-crown-marble-rose-frame", (0, -1.17, 2.36), 0.54, 0.07, 0.27, 0.04, mats["marble"])
    arch_frame("palace-front-monumental-crown-gold-rose-tracery", (0, -1.215, 2.36), 0.47, 0.06, 0.235, 0.022, mats["gold"])
    torus("palace-front-monumental-crown-gold-rosette", (0, -1.25, 2.57), 0.14, 0.022, mats["gold"], rotation=(math.pi / 2, 0, 0), major_segments=28, minor_segments=7)
    sphere("palace-front-monumental-crown-jewel", (0, -1.285, 2.57), (0.085, 0.045, 0.11), mats["cyan"], 20, 10)
    triangular_prism("palace-rear-monumental-crown-pediment", (0, 1.05, 2.27), 1.78, 0.58, 0.2, mats["marble"])
    box("palace-rear-monumental-crown-cornice", (0, 1.165, 2.3), (1.94, 0.1, 0.11), mats["marble"], 0.026)
    box("palace-rear-monumental-crown-gold-course", (0, 1.225, 2.34), (1.98, 0.045, 0.045), mats["gold"], 0.012)
    curve_tube(
        "palace-rear-monumental-crown-gold-rake",
        [(-0.86, 1.165, 2.29), (0, 1.165, 2.82), (0.86, 1.165, 2.29)],
        0.034,
        mats["gold"],
    )
    arch_panel("palace-rear-monumental-crown-blue-rose-bay", (0, 1.18, 2.36), 0.46, 0.06, 0.23, 0.055, mats["blue"])
    arch_frame("palace-rear-monumental-crown-marble-rose-frame", (0, 1.23, 2.36), 0.54, 0.07, 0.27, 0.04, mats["marble"], y_offset=0.02)
    arch_frame("palace-rear-monumental-crown-gold-rose-tracery", (0, 1.275, 2.36), 0.47, 0.06, 0.235, 0.022, mats["gold"], y_offset=0.02)
    torus("palace-rear-monumental-crown-gold-rosette", (0, 1.31, 2.57), 0.14, 0.022, mats["gold"], rotation=(math.pi / 2, 0, 0), major_segments=28, minor_segments=7)
    sphere("palace-rear-monumental-crown-jewel", (0, 1.345, 2.57), (0.085, 0.045, 0.11), mats["purple"], 20, 10)
    for side in (-1, 1):
        for y, rear, gem in ((-1.14, False, mats["cyan"]), (1.2, True, mats["purple"])):
            cylinder("palace-monumental-crown-corner-finial-stem", (side * 0.86, y, 2.47), 0.024, 0.28, mats["gold"], 10)
            cone("palace-monumental-crown-corner-finial-spire", (side * 0.86, y, 2.68), 0.07, 0, 0.2, mats["gold"], 10)
            sphere("palace-monumental-crown-corner-set-jewel", (side * 0.86, y + (0.02 if rear else -0.02), 2.82), (0.038, 0.03, 0.055), gem, 12, 6)

    front_y = -0.94
    for x in (-1.18, -0.86, -0.54, 0.54, 0.86, 1.18):
        column = cylinder("palace-two-floor-facade-pilaster", (x, front_y - 0.04, 1.02), 0.052, 1.92, mats["marble"], 12, bevel_amount=0.012)
        column.parent = root
        cylinder("palace-pilaster-gold-capital", (x, front_y - 0.04, 1.9), 0.082, 0.1, mats["gold"], 12)
        cylinder("palace-pilaster-gold-base", (x, front_y - 0.04, 0.12), 0.075, 0.08, mats["gold"], 12)

    for index, x in enumerate((-1.14, -0.78, 0.78, 1.14)):
        window(f"palace-front-lower-window-{index}", x, front_y - 0.04, 0.16, 1.08, mats)
        facade_pediment(f"palace-front-lower-window-{index}-pediment", x, front_y - 0.13, 0.79, 0.38, mats)
    for index, x in enumerate((-0.72, -0.36, 0.36, 0.72)):
        window(f"palace-front-upper-window-{index}", x, -0.84, 1.18, 1.0, mats)
        facade_pediment(f"palace-front-upper-window-{index}-pediment", x, -0.94, 1.83, 0.34, mats)

    # Dense classical orders remove the flat prototype reading at phone scale.
    for x in (-1.32, -0.98, -0.62, 0.62, 0.98, 1.32):
        for z in (0.18, 0.97, 1.08, 1.92):
            cylinder("palace-front-column-jewel-collar", (x, front_y - 0.075, z), 0.072 if z in (0.18, 1.08) else 0.085, 0.055, mats["gold"], 14)
        sphere("palace-front-column-capital-gem", (x, front_y - 0.115, 1.96), (0.042, 0.032, 0.055), mats["cyan"] if x < 0 else mats["purple"], 12, 6)
    facade_balustrade("palace-front-first-floor-grand-balustrade", front_y - 0.06, 1.08, 3.05, mats)

    # Deep, repeated facade buttresses are the dominant source cue at phone scale.
    for index, x in enumerate((-1.52, -1.2, -0.86, -0.42, 0.42, 0.86, 1.2, 1.52)):
        facade_buttress(f"palace-front-grand-buttress-{index}", x, front_y - 0.11, 0.08, 2.16 if abs(x) < 1 else 2.38, mats)

    for side in (-1, 1):
        cylinder("palace-front-rounded-gallery-drum", (side * 0.82, -0.67, 0.92), 0.245, 1.84, mats["marble"], 20, bevel_amount=0.028)
        torus("palace-front-rounded-gallery-floor-course", (side * 0.82, -0.67, 0.98), 0.252, 0.025, mats["gold"])
        torus("palace-front-rounded-gallery-crown", (side * 0.82, -0.67, 1.84), 0.258, 0.035, mats["gold"])
        for floor_z in (0.27, 1.19):
            for angle in (-0.5, 0, 0.5):
                panel = arch_panel(
                    "palace-front-rounded-gallery-dark-window",
                    (side * 0.82 + math.sin(angle) * 0.245, -0.67 - math.cos(angle) * 0.25, floor_z),
                    0.13,
                    0.23,
                    0.065,
                    0.024,
                    mats["window"],
                )
                panel.rotation_euler[2] = -angle

    for index, x in enumerate((-1.28, -0.9, 0.9, 1.28)):
        arch_panel("palace-front-gilded-statue-niche", (x, front_y - 0.1, 1.34), 0.17, 0.25, 0.085, 0.028, mats["blue"])
        cone("palace-front-gilded-guardian", (x, front_y - 0.15, 1.49), 0.065, 0.025, 0.28, mats["gold"], 10)
        sphere("palace-front-guardian-crown", (x, front_y - 0.15, 1.67), (0.045, 0.032, 0.055), mats["cyan"] if index % 2 == 0 else mats["purple"], 12, 6)

    for side in (-1, 1):
        side_x = side * 1.68
        for floor_z in (0.25, 1.25):
            for y in (-0.42, 0.0, 0.42):
                panel = arch_panel("palace-side-recessed-window", (side_x, y, floor_z), 0.2, 0.3, 0.1, 0.035, mats["window"])
                panel.rotation_euler[2] = side * math.pi / 2
        for index, y in enumerate((-0.55, -0.18, 0.2, 0.57)):
            cylinder("palace-side-grand-marble-buttress", (side_x + side * 0.055, y, 1.15), 0.065, 2.25, mats["marble"], 12, bevel_amount=0.012)
            cylinder("palace-side-buttress-gold-base", (side_x + side * 0.065, y, 0.12), 0.095, 0.08, mats["gold"], 12)
            cylinder("palace-side-buttress-gold-capital", (side_x + side * 0.065, y, 2.18), 0.105, 0.09, mats["gold"], 12)
            cone("palace-side-buttress-crowned-pinnacle", (side_x + side * 0.055, y, 2.42), 0.11, 0.025, 0.42, mats["marble"], 12)
            sphere(
                "palace-side-buttress-crown-jewel",
                (side_x + side * 0.085, y, 2.66),
                (0.04, 0.04, 0.055),
                mats["cyan"] if index % 2 == 0 else mats["purple"],
                12,
                6,
            )

    # The rear is an inferred ceremonial treasury facade. It keeps the accepted
    # front massing intact while making the palace complete in a 360-degree orbit.
    rear_y = 1.0
    for x in (-1.18, -0.86, -0.54, 0.54, 0.86, 1.18):
        cylinder("palace-rear-two-floor-pilaster", (x, rear_y + 0.035, 1.02), 0.048, 1.92, mats["marble"], 12, bevel_amount=0.012)
        cylinder("palace-rear-pilaster-gold-capital", (x, rear_y + 0.035, 1.9), 0.078, 0.1, mats["gold"], 12)
        cylinder("palace-rear-pilaster-gold-base", (x, rear_y + 0.035, 0.12), 0.07, 0.08, mats["gold"], 12)
    for index, x in enumerate((-1.14, -0.78, 0.78, 1.14)):
        rear_window(f"palace-rear-lower-window-{index}", x, rear_y + 0.04, 0.16, 1.08, mats)
        facade_pediment(f"palace-rear-lower-window-{index}-pediment", x, rear_y + 0.13, 0.79, 0.38, mats, rear=True)
    for index, x in enumerate((-0.72, -0.36, 0.36, 0.72)):
        rear_window(f"palace-rear-upper-window-{index}", x, 0.92, 1.18, 1.0, mats)
        facade_pediment(f"palace-rear-upper-window-{index}-pediment", x, 1.02, 1.83, 0.34, mats, rear=True)
    facade_balustrade("palace-rear-first-floor-grand-balustrade", rear_y + 0.06, 1.08, 3.05, mats, rear=True)
    for index, x in enumerate((-1.5, -1.14, -0.72, 0.72, 1.14, 1.5)):
        facade_buttress(f"palace-rear-grand-buttress-{index}", x, rear_y + 0.1, 0.08, 2.08, mats, rear=True)

    arch_panel("palace-rear-treasury-door", (0, rear_y + 0.1, 0.12), 0.46, 0.42, 0.23, 0.06, mats["blue"])
    arch_frame("palace-rear-treasury-door-frame", (0, rear_y + 0.16, 0.12), 0.52, 0.43, 0.26, 0.03, mats["gold"], y_offset=0.02)
    box("palace-rear-balcony", (0, 0.94, 1.35), (1.24, 0.38, 0.12), mats["marble"], 0.035)
    box("palace-rear-balcony-gold-rail", (0, 1.16, 1.66), (1.3, 0.045, 0.045), mats["gold"], 0.012)
    for index in range(-5, 6):
        cylinder("palace-rear-baluster", (index * 0.115, 1.16, 1.51), 0.016, 0.3, mats["gold"], 8)
    box("palace-rear-blue-crest-plaque", (0, 0.9, 1.91), (0.74, 0.11, 0.28), mats["blue"], 0.045)
    torus("palace-rear-gold-crest-medallion", (0, 0.975, 1.91), 0.13, 0.022, mats["gold"], rotation=(math.pi / 2, 0, 0))
    sphere("palace-rear-purple-crest-gem", (0, 1.01, 1.91), (0.078, 0.04, 0.078), mats["purple"], 16, 8)

    # Projecting narthex with a genuinely dark recess and a visible inner vault door.
    box("palace-narthex-left-pier", (-0.47, -0.94, 0.72), (0.24, 0.44, 1.44), mats["marble"], 0.055)
    box("palace-narthex-right-pier", (0.47, -0.94, 0.72), (0.24, 0.44, 1.44), mats["marble"], 0.055)
    arch_panel("palace-narthex-deep-void", (0, -1.18, 0.08), 0.62, 0.68, 0.31, 0.12, mats["void"])
    arch_frame("palace-narthex-monumental-gold-frame", (0, -1.27, 0.08), 0.7, 0.7, 0.35, 0.05, mats["gold"])
    for side in (-1, 1):
        cylinder("palace-narthex-solomonic-column", (side * 0.48, -1.25, 0.57), 0.06, 1.08, mats["gold"], 14)
        sphere("palace-narthex-shoulder-gem", (side * 0.48, -1.27, 1.18), (0.075, 0.055, 0.095), mats["purple"] if side < 0 else mats["cyan"], 16, 8)

    arch_panel("palace-inner-blue-vault-door", (0, -0.78, 0.3), 0.34, 0.38, 0.17, 0.035, mats["blue"])
    arch_frame("palace-inner-vault-door-gold-frame", (0, -0.81, 0.3), 0.38, 0.38, 0.19, 0.02, mats["gold"])
    # Open ceremonial leaves clarify that this is a traversable palace entry,
    # while the medallion reads as the secure threshold to the vault descent.
    for side in (-1, 1):
        leaf = box(
            "palace-open-midnight-enamel-door-leaf",
            (side * 0.31, -1.325, 0.5),
            (0.16, 0.045, 0.78),
            mats["blue"],
            0.018,
        )
        leaf.rotation_euler[1] = side * 0.12
        box("palace-open-door-leaf-gold-spine", (side * 0.31, -1.352, 0.5), (0.035, 0.026, 0.76), mats["gold"], 0.008)
        for z in (0.2, 0.48, 0.76):
            box("palace-open-door-leaf-gold-rail", (side * 0.31, -1.355, z), (0.15, 0.024, 0.025), mats["gold"], 0.006)
    torus("palace-entry-security-medallion", (0, -1.37, 0.57), 0.115, 0.022, mats["gold"], rotation=(math.pi / 2, 0, 0), major_segments=28, minor_segments=7)
    sphere("palace-entry-security-cyan-heart", (0, -1.4, 0.57), (0.05, 0.027, 0.05), mats["cyan"], 16, 8)
    for index in range(8):
        angle = index / 8 * math.pi * 2
        curve_tube(
            "palace-entry-security-sunray",
            [
                (math.sin(angle) * 0.03, -1.385, 0.57 + math.cos(angle) * 0.03),
                (math.sin(angle) * 0.1, -1.385, 0.57 + math.cos(angle) * 0.1),
            ],
            0.009,
            mats["gold"],
        )
    for index in range(9):
        step = box("palace-visible-atrium-step", (0, -1.285 + index * 0.025, 0.04 + index * 0.035), (0.62 - index * 0.018, 0.08, 0.065), mats["marble"], 0.01)
        step.parent = root
    for side in (-1, 1):
        for index in range(8):
            t = index / 7
            split_step = box(
                "palace-visible-split-vault-stair",
                (side * (0.12 + t * 0.23), -1.34, 0.25 + t * 0.52),
                (0.3, 0.08, 0.055),
                mats["marble"],
                0.01,
            )
            split_step.rotation_euler[1] = side * 0.12
            cylinder(
                "palace-visible-split-stair-gold-post",
                (side * (0.29 + t * 0.24), -1.39, 0.41 + t * 0.52),
                0.012,
                0.25,
                mats["gold"],
                8,
            )
        curve_tube(
            "palace-visible-split-stair-gold-handrail",
            [
                (side * 0.29, -1.39, 0.54),
                (side * 0.4, -1.39, 0.8),
                (side * 0.54, -1.39, 1.08),
            ],
            0.018,
            mats["gold"],
        )
    sphere("palace-atrium-chandelier-gem", (0, -1.39, 1.22), (0.11, 0.05, 0.16), mats["cyan"], 16, 8)
    torus("palace-atrium-chandelier-crown", (0, -1.39, 1.22), 0.18, 0.025, mats["gold"], rotation=(math.pi / 2, 0, 0))

    box("palace-narthex-balcony", (0, -1.05, 1.36), (1.24, 0.4, 0.12), mats["marble"], 0.035)
    box("palace-narthex-balcony-gold-rail", (0, -1.28, 1.67), (1.3, 0.045, 0.045), mats["gold"], 0.012)
    for index in range(-5, 6):
        cylinder("palace-narthex-baluster", (index * 0.115, -1.28, 1.52), 0.016, 0.3, mats["gold"], 8)
    box("palace-charm-crest-blue-plaque", (0, -1.24, 1.9), (1.18, 0.12, 0.34), mats["blue"], 0.05)
    torus("palace-charm-crest-gold-medallion", (-0.47, -1.32, 1.9), 0.09, 0.02, mats["gold"], rotation=(math.pi / 2, 0, 0))
    sphere("palace-charm-crest-cyan-gem", (-0.47, -1.36, 1.9), (0.05, 0.035, 0.05), mats["cyan"], 16, 8)
    text_mesh("palace-charm-palace-gold-lettering", "CHARM PALACE", (0.1, -1.318, 1.9), 0.115, 0.012, mats["gold"])

    lantern_tower("palace-front-left-tower", -1.38, -0.43, 0.32, 0.04, 3.15, mats)
    lantern_tower("palace-front-right-tower", 1.38, -0.43, 0.32, 0.04, 3.15, mats)
    lantern_tower("palace-front-inner-left-belfry", -0.58, -0.2, 0.2, 1.72, 1.65, mats)
    lantern_tower("palace-front-inner-right-belfry", 0.58, -0.2, 0.2, 1.72, 1.65, mats)
    lantern_tower("palace-rear-left-tower", -1.06, 0.55, 0.27, 0.04, 2.9, mats, front=False)
    lantern_tower("palace-rear-right-tower", 1.06, 0.55, 0.27, 0.04, 2.9, mats, front=False)
    tower("palace-rear-inner-left-belfry", -0.5, 0.36, 0.17, 0.9, mats, 1.06, base_z=2.0)
    tower("palace-rear-inner-right-belfry", 0.5, 0.36, 0.17, 0.9, mats, 1.06, base_z=2.0)
    tower("palace-rear-left-needle-tower", -0.86, 0.34, 0.135, 1.12, mats, 1.04, base_z=1.86)
    tower("palace-rear-right-needle-tower", 0.86, 0.34, 0.135, 1.12, mats, 1.04, base_z=1.86)
    tower("palace-upper-left-towerlet", -0.78, -0.4, 0.17, 1.12, mats, 1.05, base_z=1.48)
    tower("palace-upper-right-towerlet", 0.78, -0.4, 0.17, 1.12, mats, 1.05, base_z=1.48)
    tower("palace-upper-rear-left-towerlet", -0.58, 0.44, 0.14, 0.8, mats, 1.03, base_z=1.52)
    tower("palace-upper-rear-right-towerlet", 0.58, 0.44, 0.14, 0.8, mats, 1.03, base_z=1.52)

    for index in range(12):
        angle = index / 12 * math.pi * 2
        x = math.sin(angle) * 1.18
        y = math.cos(angle) * 0.78
        cylinder("palace-roofline-gold-baluster", (x, y, 2.45), 0.016, 0.22 + (0.06 if index % 3 == 0 else 0), mats["gold"], 8)
        if index % 3 == 0:
            sphere("palace-roofline-set-gem", (x, y, 2.62), (0.042, 0.042, 0.058), mats["cyan"] if index % 2 == 0 else mats["purple"], 12, 6)

    for side in (-1, 1):
        curve_tube(
            "palace-filigree-crown-arch",
            [(side * 0.93, -0.35, 2.72), (side * 0.82, -0.12, 3.02), (side * 0.7, 0.02, 2.83)],
            0.026,
            mats["gold"],
        )
        for step in range(4):
            sphere(
                "palace-filigree-crown-jewel",
                (side * (0.91 - step * 0.055), -0.31 + step * 0.08, 2.76 + math.sin(step / 3 * math.pi) * 0.22),
                (0.035, 0.028, 0.045),
                mats["cyan"] if step % 2 == 0 else mats["purple"],
                12,
                6,
            )

    drum = cylinder("palace-main-dome-windowed-drum", (0, 0.08, 2.76), 0.9, 0.72, mats["marble"], 32, bevel_amount=0.035)
    drum.parent = root
    torus("palace-main-dome-drum-gold-base", (0, 0.08, 2.41), 0.91, 0.048, mats["gold"])
    torus("palace-main-dome-drum-gold-crown", (0, 0.08, 3.12), 0.92, 0.048, mats["gold"])
    for index in range(12):
        angle = index / 12 * math.pi * 2
        x = math.sin(angle) * 0.905
        y = 0.08 + math.cos(angle) * 0.905
        panel = arch_panel("palace-main-dome-drum-tall-warm-window", (x, y, 2.46), 0.2, 0.36, 0.1, 0.04, mats["window"])
        panel.rotation_euler[2] = -angle
        frame = arch_frame(
            "palace-main-dome-drum-layered-gold-tracery",
            (x, y - math.cos(angle) * 0.025, 2.46),
            0.23,
            0.36,
            0.115,
            0.018,
            mats["gold"],
        )
        frame.rotation_euler[2] = -angle
        pilaster_angle = angle + math.pi / 12
        px = math.sin(pilaster_angle) * 0.925
        py = 0.08 + math.cos(pilaster_angle) * 0.925
        cylinder("palace-main-dome-drum-marble-pilaster", (px, py, 2.76), 0.034, 0.64, mats["marble"], 10, bevel_amount=0.008)
        cylinder("palace-main-dome-drum-gold-capital", (px, py, 3.06), 0.055, 0.07, mats["gold"], 10)

    dome("palace-monumental-ribbed-blue-dome", (0, 0.08, 3.14), 0.92, 0.9, mats["blue"], mats["gold"], 14)
    cylinder("palace-main-dome-lantern", (0, 0.08, 4.17), 0.17, 0.32, mats["marble"], 16)
    torus("palace-main-dome-lantern-gold-band", (0, 0.08, 4.32), 0.18, 0.025, mats["gold"])
    finial("palace-main-dome-crown", (0, 0.08, 4.34), 0.6, mats["gold"], mats["cyan"])

    # Ceremonial roof pearls and gold flying buttresses finish the palace silhouette.
    for side in (-1, 1):
        for x in (0.42, 0.72, 1.05):
            sphere("palace-roof-pearl", (side * x, -0.55 + x * 0.18, 2.39), (0.045, 0.045, 0.06), mats["gold"], 12, 6)
        curve_tube(
            "palace-gold-flying-buttress",
            [(side * 0.82, 0.48, 2.15), (side * 1.25, 0.48, 1.72), (side * 1.45, 0.2, 1.2)],
            0.035,
            mats["gold"],
        )

    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.select_set(True)
        obj["vaultPalacePart"] = obj.name

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    BLEND_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene["vaultPalaceSourceSha256"] = "5f2841dcf97303c7e8cf8091d0c02a0c22f24904eeea41044df68ab4a583fa57"
    bpy.context.scene["vaultPalaceVersion"] = PALACE_VERSION
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUTPUT))
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_attributes=True,
    )
    PRODUCTION_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(OUTPUT, PRODUCTION_OUTPUT)
    print(f"VAULT_PALACE_OUTPUT={OUTPUT}")
    print(f"VAULT_PALACE_PRODUCTION_OUTPUT={PRODUCTION_OUTPUT}")
    print(f"VAULT_PALACE_BLEND={BLEND_OUTPUT}")
    print(f"VAULT_PALACE_OBJECTS={len(bpy.context.scene.objects)}")


if __name__ == "__main__":
    build_palace()
