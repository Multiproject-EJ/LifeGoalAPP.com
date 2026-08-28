import math
import shutil
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
VERSION = "v001"
DEV_ROOT = ROOT / "public/assets/dev/vault-island-lab"
PRODUCTION_ROOT = ROOT / "public/assets/islands/special/vault-island"
WORK_ROOT = ROOT / "work/vault-island-interior/blender"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, metallic=0.0, roughness=0.35, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in shader.inputs:
        shader.inputs["Coat Weight"].default_value = 0.52 if metallic else 0.28
        shader.inputs["Coat Roughness"].default_value = max(0.035, roughness * 0.35)
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = emission_strength
    return mat


def materials():
    return {
        "marble": material("interior-white-marble", (0.82, 0.79, 0.7), roughness=0.24),
        "marble_light": material("interior-pearl-marble", (0.96, 0.93, 0.83), roughness=0.2),
        "marble_shadow": material("interior-shadow-marble", (0.5, 0.49, 0.44), roughness=0.3),
        "blue": material("interior-midnight-enamel", (0.018, 0.075, 0.17), metallic=0.08, roughness=0.13),
        "blue_light": material("interior-sapphire-enamel", (0.025, 0.18, 0.34), metallic=0.05, roughness=0.12),
        "gold": material("interior-polished-gold", (0.94, 0.53, 0.08), metallic=0.94, roughness=0.105),
        "dark_gold": material("interior-antique-gold", (0.42, 0.19, 0.035), metallic=0.86, roughness=0.2),
        "silver": material("interior-polished-silver", (0.72, 0.82, 0.9), metallic=0.95, roughness=0.105),
        "warm": material("interior-warm-glass", (0.62, 0.16, 0.025), roughness=0.14, emission=(1.0, 0.24, 0.025), emission_strength=2.5),
        "cyan": material("interior-cyan-gem", (0.02, 0.55, 0.72), roughness=0.07, emission=(0.01, 0.42, 0.72), emission_strength=1.25),
        "ruby": material("interior-ruby-gem", (0.62, 0.015, 0.06), roughness=0.06, emission=(0.42, 0.005, 0.02), emission_strength=0.85),
        "emerald": material("interior-emerald-gem", (0.01, 0.38, 0.2), roughness=0.07, emission=(0.0, 0.22, 0.08), emission_strength=0.75),
    }


def assign(obj, mat):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    return obj


def bevel(obj, amount=0.04, segments=3):
    modifier = obj.modifiers.new("luxury-edge-bevel", "BEVEL")
    modifier.width = amount
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    return obj


def box(name, location, dimensions, mat, rotation=(0, 0, 0), bevel_amount=0.04):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    if bevel_amount:
        bevel(obj, bevel_amount, 3)
    return obj


def cylinder(name, location, radius, depth, mat, vertices=32, rotation=(0, 0, 0), bevel_amount=0.02):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    if bevel_amount:
        bevel(obj, bevel_amount, 2)
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


def torus(name, location, major_radius, minor_radius, mat, rotation=(0, 0, 0), major_segments=64, minor_segments=10):
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


def curve_tube(name, points, radius, mat, cyclic=False):
    curve_data = bpy.data.curves.new(name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
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


def arc_points(radius, z, start=-1.22, end=1.22, count=33, y_offset=0.0):
    return [
        (
            math.sin(start + (end - start) * index / (count - 1)) * radius,
            -math.cos(start + (end - start) * index / (count - 1)) * radius + y_offset,
            z,
        )
        for index in range(count)
    ]


def arch_frame(name, center, width, upright_height, radius, tube_radius, mat, rotation_z=0.0):
    half = width / 2
    points = [(-half, 0, 0), (-half, 0, upright_height)]
    for index in range(17):
        angle = math.pi - index / 16 * math.pi
        points.append((math.cos(angle) * radius, 0, upright_height + math.sin(angle) * radius))
    points.extend([(half, 0, upright_height), (half, 0, 0)])
    obj = curve_tube(name, points, tube_radius, mat)
    obj.location = center
    obj.rotation_euler[2] = rotation_z
    return obj


def inward_dome(name, radius, height, base_z, mat, gold, start=-1.34, end=1.34, segments=36, rings=14):
    vertices = []
    for ring in range(rings + 1):
        phi = ring / rings * math.pi / 2
        ring_radius = math.cos(phi) * radius
        z = base_z + math.sin(phi) * height
        for segment in range(segments + 1):
            angle = start + (end - start) * segment / segments
            vertices.append((math.sin(angle) * ring_radius, -math.cos(angle) * ring_radius, z))
    faces = []
    row = segments + 1
    for ring in range(rings):
        for segment in range(segments):
            a = ring * row + segment
            b = a + 1
            c = a + row + 1
            d = a + row
            faces.append((a, d, c, b))
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    assign(obj, mat)
    for polygon in data.polygons:
        polygon.use_smooth = True

    curve_tube(f"{name}-spring-gold-cornice", arc_points(radius, base_z, start, end, 45), radius * 0.018, gold)
    for index in range(11):
        angle = start + (end - start) * index / 10
        points = []
        for step in range(12):
            phi = step / 11 * math.pi / 2
            ring_radius = math.cos(phi) * radius * 0.995
            points.append((
                math.sin(angle) * ring_radius,
                -math.cos(angle) * ring_radius,
                base_z + math.sin(phi) * height - 0.015,
            ))
        curve_tube(f"{name}-gold-rib-{index:02d}", points, 0.038, gold)
    torus(f"{name}-oculus-ring", (0, 0, base_z + height), 0.56, 0.085, gold)
    cylinder(f"{name}-oculus-gem", (0, 0, base_z + height + 0.025), 0.46, 0.04, mat, 40)
    return obj


def radial_panel(name, angle, radius, z, dimensions, mat, bevel_amount=0.035):
    x = math.sin(angle) * radius
    y = -math.cos(angle) * radius
    panel = box(name, (x, y, z), dimensions, mat, rotation=(0, 0, -angle), bevel_amount=bevel_amount)
    return panel


def loggia_level(prefix, base_z, gallery_z, radius, mats, bay_count=9):
    curve_tube(f"{prefix}-deep-gallery-slab-front", arc_points(radius - 0.62, gallery_z, -1.2, 1.2), 0.15, mats["marble_light"])
    curve_tube(f"{prefix}-deep-gold-cornice", arc_points(radius - 0.54, gallery_z + 0.1, -1.2, 1.2), 0.07, mats["gold"])
    curve_tube(f"{prefix}-continuous-gold-rail", arc_points(radius - 0.92, gallery_z + 0.66, -1.15, 1.15), 0.045, mats["gold"])
    curve_tube(f"{prefix}-continuous-marble-rail", arc_points(radius - 0.92, gallery_z + 0.54, -1.15, 1.15), 0.065, mats["marble_light"])

    for index in range(bay_count):
        angle = -1.03 + index * (2.06 / (bay_count - 1))
        x = math.sin(angle) * radius
        y = -math.cos(angle) * radius
        radial_panel(
            f"{prefix}-deep-blue-arched-recess-{index:02d}",
            angle,
            radius + 0.02,
            base_z + 1.22,
            (0.86, 0.26, 2.18),
            mats["blue"] if base_z < 1 else mats["blue_light"],
        )
        marble_frame = arch_frame(
            f"{prefix}-substantial-ivory-arch-{index:02d}",
            (x, y - 0.12, base_z + 0.17),
            1.02,
            1.52,
            0.51,
            0.09,
            mats["marble_light"],
            -angle,
        )
        marble_frame.rotation_euler[2] = -angle
        frame = arch_frame(
            f"{prefix}-layered-gold-arch-{index:02d}",
            (x, y - 0.16, base_z + 0.22),
            0.82,
            1.42,
            0.41,
            0.05,
            mats["gold"],
            -angle,
        )
        frame.rotation_euler[2] = -angle
        for side in (-1, 1):
            offset_angle = angle + side * 0.105
            px = math.sin(offset_angle) * (radius - 0.07)
            py = -math.cos(offset_angle) * (radius - 0.07)
            cylinder(f"{prefix}-monumental-column", (px, py, base_z + 1.22), 0.12, 2.36, mats["marble_light"], 20)
            cylinder(f"{prefix}-gold-capital", (px, py, base_z + 2.38), 0.18, 0.13, mats["gold"], 16)
        sphere(f"{prefix}-warm-sconce", (x, y - 0.31, base_z + 1.24), (0.1, 0.06, 0.15), mats["warm"], 16, 8)

    for index in range(27):
        angle = -1.12 + index * (2.24 / 26)
        x = math.sin(angle) * (radius - 0.92)
        y = -math.cos(angle) * (radius - 0.92)
        cylinder(f"{prefix}-marble-baluster", (x, y, gallery_z + 0.27), 0.035, 0.48, mats["marble_light"], 10)


def build_split_stair(mats):
    box("vault-palace-atrium-entry-landing", (0, -3.48, 3.64), (2.5, 1.22, 0.3), mats["marble_light"], bevel_amount=0.07)
    box("vault-palace-atrium-entry-landing-gold-fascia", (0, -2.86, 3.49), (2.62, 0.12, 0.32), mats["gold"], bevel_amount=0.03)
    box("vault-palace-atrium-entry-landing-midnight-runner", (0, -3.45, 3.81), (1.18, 1.12, 0.045), mats["blue"], bevel_amount=0.025)
    for side in (-1, 1):
        box(
            "vault-palace-atrium-entry-runner-gold-border",
            (side * 0.61, -3.45, 3.83),
            (0.045, 1.16, 0.04),
            mats["gold"],
            bevel_amount=0.01,
        )
    radial_panel("vault-palace-atrium-monumental-entry-blue-door", 0, 4.16, 4.73, (1.72, 0.28, 2.25), mats["blue"])
    arch_frame("vault-palace-atrium-monumental-entry-ivory-surround", (0, -4.26, 3.48), 2.18, 1.72, 1.09, 0.15, mats["marble_light"])
    arch_frame("vault-palace-atrium-monumental-entry-gold-frame", (0, -4.34, 3.62), 1.82, 1.52, 0.91, 0.08, mats["gold"])
    torus(
        "vault-palace-atrium-entry-royal-crest-gold-ring",
        (0, -4.53, 5.42),
        0.28,
        0.065,
        mats["gold"],
        rotation=(math.pi / 2, 0, 0),
        major_segments=40,
    )
    sphere("vault-palace-atrium-entry-royal-crest-ruby", (0, -4.60, 5.42), (0.17, 0.055, 0.17), mats["ruby"], 24, 12)
    for side in (-1, 1):
        sphere(
            "vault-palace-atrium-entry-flanking-cyan-jewel",
            (side * 1.18, -4.48, 4.68),
            (0.12, 0.055, 0.18),
            mats["cyan"],
            20,
            10,
        )

    for side in (-1, 1):
        outer_rail = []
        inner_rail = []
        stringer = []
        for index in range(22):
            t = index / 21
            smooth = t * t * (3 - 2 * t)
            x = side * (0.58 + smooth * 2.05)
            y = -2.88 + t * 3.36
            z = 3.42 - t * 3.06
            step = box(
                "vault-palace-atrium-split-descent-marble-step",
                (x, y, z),
                (0.98 + t * 0.18, 0.34, 0.18),
                mats["marble_light"],
                rotation=(0, 0, side * -0.16 * t),
                bevel_amount=0.025,
            )
            gold_nose = box(
                "vault-palace-atrium-stair-gold-nosing",
                (x, y + 0.17, z + 0.07),
                (1.0 + t * 0.18, 0.035, 0.045),
                mats["gold"],
                rotation=(0, 0, side * -0.16 * t),
                bevel_amount=0.01,
            )
            step["stairSide"] = side
            gold_nose["stairSide"] = side
            outer_rail.append((x + side * 0.58, y, z + 0.66))
            inner_rail.append((x - side * 0.54, y, z + 0.61))
            stringer.append((x, y - 0.02, z - 0.08))
            if index % 2 == 0:
                cylinder("vault-palace-atrium-stair-marble-newel", outer_rail[-1], 0.055, 0.72, mats["marble_light"], 12)
        curve_tube("vault-palace-atrium-stair-substantial-outer-marble-balustrade", outer_rail, 0.085, mats["marble_light"])
        curve_tube("vault-palace-atrium-stair-continuous-outer-gold-rail", [(x, y, z + 0.11) for x, y, z in outer_rail], 0.035, mats["gold"])
        curve_tube("vault-palace-atrium-stair-substantial-inner-marble-balustrade", inner_rail, 0.07, mats["marble_light"])
        curve_tube("vault-palace-atrium-stair-massive-marble-stringer", stringer, 0.19, mats["marble"])
        box("vault-palace-atrium-lower-stair-landing", (side * 2.64, 0.72, 0.22), (1.45, 1.32, 0.28), mats["marble_light"], bevel_amount=0.07)


def build_atrium():
    clear_scene()
    mats = materials()
    root = bpy.data.objects.new("vault-palace-atrium-blender-architecture-v001", None)
    bpy.context.collection.objects.link(root)

    cylinder("vault-palace-atrium-polished-marble-floor", (0, 0, -0.08), 4.72, 0.22, mats["marble_light"], 96)
    cylinder("vault-palace-atrium-blue-floor-medallion", (0, 0.36, 0.045), 2.16, 0.035, mats["blue"], 72)
    torus("vault-palace-atrium-floor-gold-ring", (0, 0.36, 0.07), 2.16, 0.045, mats["gold"])
    torus("vault-palace-atrium-descent-void-gold-rim", (0, 0.78, 0.11), 1.22, 0.085, mats["gold"])
    cylinder("vault-palace-atrium-central-vault-descent-void", (0, 0.78, 0.02), 1.12, 0.12, mats["blue"], 64)

    for index in range(18):
        angle = index / 18 * math.pi * 2
        box(
            "vault-palace-atrium-floor-gold-sunburst-inlay",
            (math.sin(angle) * 1.72, math.cos(angle) * 1.72 + 0.36, 0.085),
            (0.045, 1.18, 0.025),
            mats["gold"],
            rotation=(0, 0, -angle),
            bevel_amount=0.008,
        )

    # A backed, open-front rotunda gives every loggia real recess depth without enclosing the phone camera.
    for index in range(15):
        angle = -1.28 + index * (2.56 / 14)
        radial_panel("vault-palace-atrium-deep-curved-wall-segment", angle, 4.54, 3.05, (1.0, 0.42, 6.18), mats["marble_shadow"], 0.025)

    loggia_level("vault-palace-atrium-first-tall-floor-gallery", 0.34, 2.95, 4.2, mats)
    loggia_level("vault-palace-atrium-second-tall-floor-gallery", 3.02, 5.62, 4.2, mats)
    curve_tube("vault-palace-atrium-monumental-crown-cornice", arc_points(4.22, 6.02, -1.25, 1.25), 0.13, mats["marble_light"])
    curve_tube("vault-palace-atrium-monumental-crown-gold-band", arc_points(4.18, 6.12, -1.25, 1.25), 0.07, mats["gold"])
    inward_dome("vault-palace-atrium-visible-main-dome-underside", 4.2, 3.5, 6.14, mats["blue"], mats["gold"])
    build_split_stair(mats)

    for side in (-1, 1):
        angle = side * 0.88
        x = math.sin(angle) * 4.07
        y = -math.cos(angle) * 4.07
        radial_panel(
            "vault-palace-atrium-left-garden-door" if side < 0 else "vault-palace-atrium-right-garden-door",
            angle,
            4.08,
            1.34,
            (1.25, 0.3, 2.35),
            mats["warm"],
        )
        frame = arch_frame("vault-palace-atrium-garden-door-gold-arch", (x, y - 0.2, 0.22), 1.32, 1.55, 0.66, 0.075, mats["gold"], -angle)
        frame.rotation_euler[2] = -angle

    for obj in bpy.context.scene.objects:
        obj["vaultInteriorPart"] = obj.name
    export_asset("vault-atrium", root)


def build_vault_door(mats):
    # The door stands at the rear and reads as a massive layered mechanism rather than wall decoration.
    center = (0, -4.38, 2.15)
    cylinder("vault-interior-grand-round-door-frame", center, 1.52, 0.34, mats["gold"], 64, rotation=(math.pi / 2, 0, 0))
    cylinder("vault-interior-grand-round-door", (0, -4.58, 2.15), 1.35, 0.24, mats["blue"], 64, rotation=(math.pi / 2, 0, 0))
    torus("vault-interior-grand-door-inner-gold-ring", (0, -4.72, 2.15), 0.88, 0.07, mats["gold"], rotation=(math.pi / 2, 0, 0))
    for index in range(12):
        angle = index / 12 * math.pi * 2
        sphere(
            "vault-interior-door-gold-bolt",
            (math.sin(angle) * 1.08, -4.74, 2.15 + math.cos(angle) * 1.08),
            (0.1, 0.055, 0.1),
            mats["gold"],
            14,
            7,
        )
    sphere("vault-interior-door-center-gem-dial", (0, -4.82, 2.15), (0.28, 0.1, 0.28), mats["cyan"], 24, 12)


def build_display_bay(index, angle, radius, mats):
    x = math.sin(angle) * radius
    y = -math.cos(angle) * radius
    base = cylinder(f"vault-interior-museum-display-base-{index:02d}", (x, y, 0.2), 0.44, 0.3, mats["marble_light"], 32)
    base.rotation_euler[2] = -angle
    torus(f"vault-interior-museum-display-gold-ring-{index:02d}", (x, y, 0.36), 0.4, 0.04, mats["gold"])
    cylinder(f"vault-interior-museum-display-blue-plinth-{index:02d}", (x, y, 0.56), 0.32, 0.38, mats["blue"], 32)
    sphere(f"vault-interior-museum-display-crown-light-{index:02d}", (x, y, 2.34), (0.12, 0.09, 0.12), mats["warm"], 16, 8)
    plaque_radius = radius - 0.47
    plaque_x = math.sin(angle) * plaque_radius
    plaque_y = -math.cos(angle) * plaque_radius
    plaque = box(
        f"vault-interior-museum-relic-plaque-{index:02d}",
        (plaque_x, plaque_y, 0.62),
        (0.34, 0.1, 0.17),
        mats["dark_gold"],
        rotation=(0, 0, -angle),
        bevel_amount=0.025,
    )
    plaque["museumRelicNumber"] = index + 1
    gem_mat = (mats["ruby"], mats["cyan"], mats["emerald"])[index % 3]
    sphere(
        f"vault-interior-museum-relic-plaque-gem-{index:02d}",
        (math.sin(angle) * (plaque_radius - 0.06), -math.cos(angle) * (plaque_radius - 0.06), 0.63),
        (0.055, 0.038, 0.055),
        gem_mat,
        16,
        8,
    )
    # Deep arched niche behind each freestanding case establishes ownership and room cadence.
    niche_radius = 4.56
    nx = math.sin(angle) * niche_radius
    ny = -math.cos(angle) * niche_radius
    radial_panel(f"vault-interior-double-height-arched-bay-{index:02d}", angle, niche_radius, 1.86, (1.05, 0.36, 3.3), mats["blue"])
    frame = arch_frame(
        f"vault-interior-layered-gold-museum-arch-{index:02d}",
        (nx, ny - 0.2, 0.3),
        1.08,
        2.25,
        0.54,
        0.06,
        mats["gold"],
        -angle,
    )
    frame.rotation_euler[2] = -angle
    for side in (-1, 1):
        pillar_angle = angle + side * 0.115
        px = math.sin(pillar_angle) * 4.42
        py = -math.cos(pillar_angle) * 4.42
        cylinder("vault-interior-monumental-museum-column", (px, py, 1.9), 0.13, 3.36, mats["marble_light"], 18)


def build_collection_wing(side, mats):
    x = side * 3.68
    for row in range(5):
        for column in range(3):
            box(
                "vault-interior-safe-deposit-box",
                (x, -1.32 - column * 0.08, 0.72 + row * 0.42),
                (0.56, 0.18, 0.3),
                mats["dark_gold"] if (row + column) % 3 == 0 else mats["blue"],
                rotation=(0, 0, side * -0.22),
                bevel_amount=0.025,
            )
            sphere(
                "vault-interior-safe-box-knob",
                (x - side * 0.08, -1.46 - column * 0.08, 0.72 + row * 0.42),
                (0.045, 0.025, 0.045),
                mats["gold"],
                12,
                6,
            )
    box("vault-interior-collection-wing-marble-frame", (x, -1.18, 1.62), (0.86, 0.22, 2.72), mats["marble_light"], rotation=(0, 0, side * -0.22), bevel_amount=0.06)


def build_vault():
    clear_scene()
    mats = materials()
    root = bpy.data.objects.new("vault-interior-blender-museum-v001", None)
    bpy.context.collection.objects.link(root)

    cylinder("vault-interior-polished-floor", (0, 0, -0.09), 4.9, 0.24, mats["marble_light"], 96)
    cylinder("vault-interior-midnight-compass-inset", (0, 0.2, 0.045), 3.92, 0.035, mats["blue"], 96)
    torus("vault-interior-floor-gold-ring", (0, 0.2, 0.08), 3.9, 0.05, mats["gold"])
    torus("vault-interior-floor-inner-gold-ring", (0, 0.45, 0.095), 1.18, 0.04, mats["gold"])
    for index in range(24):
        angle = index / 24 * math.pi * 2
        box(
            "vault-interior-floor-sunburst-inlay",
            (math.sin(angle) * 2.14, math.cos(angle) * 2.14 + 0.2, 0.09),
            (0.04, 2.05, 0.025),
            mats["gold"] if index % 3 else mats["silver"],
            rotation=(0, 0, -angle),
            bevel_amount=0.006,
        )

    for index in range(17):
        angle = -1.34 + index * (2.68 / 16)
        radial_panel("vault-interior-curved-rear-wall", angle, 4.78, 2.65, (0.94, 0.42, 5.35), mats["marble"], 0.02)
    curve_tube("vault-interior-first-tall-floor-balcony", arc_points(4.23, 3.18, -1.3, 1.3), 0.14, mats["marble_light"])
    curve_tube("vault-interior-first-tall-floor-gold-cornice", arc_points(4.18, 3.28, -1.3, 1.3), 0.065, mats["gold"])
    curve_tube("vault-interior-upper-crown-cornice", arc_points(4.56, 5.2, -1.34, 1.34), 0.12, mats["marble_light"])
    curve_tube("vault-interior-upper-crown-gold-band", arc_points(4.5, 5.3, -1.34, 1.34), 0.065, mats["gold"])

    angles = [-1.28, -0.92, -0.58, -0.2, 0.2, 0.58, 0.92, 1.28]
    for index, angle in enumerate(angles):
        build_display_bay(index, angle, 3.08, mats)

    for index in range(7):
        angle = -1.12 + index * (2.24 / 6)
        radial_panel(
            f"vault-interior-upper-museum-blue-bay-{index:02d}",
            angle,
            4.48,
            4.2,
            (0.72, 0.26, 1.32),
            mats["blue_light"],
        )
        ux = math.sin(angle) * 4.48
        uy = -math.cos(angle) * 4.48
        upper_frame = arch_frame(
            f"vault-interior-upper-museum-ivory-arch-{index:02d}",
            (ux, uy - 0.16, 3.48),
            0.82,
            0.78,
            0.41,
            0.065,
            mats["marble_light"],
            -angle,
        )
        upper_frame.rotation_euler[2] = -angle

    # Central inspection stage remains free so selected treasures can animate into it.
    cylinder("vault-interior-central-inspection-dais", (0, 0.74, 0.14), 0.86, 0.24, mats["marble_light"], 64)
    cylinder("vault-interior-central-inspection-enamel", (0, 0.74, 0.28), 0.67, 0.08, mats["blue"], 64)
    torus("vault-interior-central-inspection-gold-ring", (0, 0.74, 0.34), 0.67, 0.045, mats["gold"])
    build_vault_door(mats)
    build_collection_wing(-1, mats)
    build_collection_wing(1, mats)

    # A shallow coffered ceiling keeps the room grand without hiding the rear museum bays.
    inward_dome("vault-interior-coffered-rotunda-vault", 4.62, 1.5, 5.32, mats["blue"], mats["gold"], start=-1.36, end=1.36, segments=36, rings=8)
    for index in range(7):
        angle = -0.93 + index * 0.31
        x = math.sin(angle) * 4.18
        y = -math.cos(angle) * 4.18
        sphere("vault-interior-upper-gallery-jewel-light", (x, y, 4.34), (0.11, 0.07, 0.16), mats["cyan"] if index % 2 == 0 else mats["ruby"], 16, 8)

    for obj in bpy.context.scene.objects:
        obj["vaultInteriorPart"] = obj.name
    export_asset("vault-museum", root)


def export_asset(slug, root):
    DEV_ROOT.mkdir(parents=True, exist_ok=True)
    PRODUCTION_ROOT.mkdir(parents=True, exist_ok=True)
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    versioned = DEV_ROOT / f"{slug}-{VERSION}.glb"
    production = PRODUCTION_ROOT / f"{slug}.glb"
    blend = WORK_ROOT / f"{slug}-{VERSION}.blend"
    bpy.context.scene["vaultInteriorVersion"] = VERSION
    bpy.context.scene["vaultInteriorAsset"] = slug
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.export_scene.gltf(
        filepath=str(versioned),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_attributes=True,
    )
    shutil.copyfile(versioned, production)
    print(f"VAULT_INTERIOR_ASSET={slug}")
    print(f"VAULT_INTERIOR_GLB={versioned}")
    print(f"VAULT_INTERIOR_PRODUCTION={production}")
    print(f"VAULT_INTERIOR_BLEND={blend}")
    print(f"VAULT_INTERIOR_OBJECTS={len(bpy.context.scene.objects)}")


def main():
    build_atrium()
    build_vault()


if __name__ == "__main__":
    main()
