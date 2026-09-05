import math
import os
import shutil
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
VERSION = "v045"
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
        "marble": material("interior-white-marble", (0.68, 0.59, 0.45), roughness=0.34),
        "marble_light": material("interior-pearl-marble", (0.82, 0.75, 0.62), roughness=0.27),
        "marble_shadow": material("interior-shadow-marble", (0.16, 0.17, 0.2), roughness=0.4),
        "blue": material("interior-midnight-enamel", (0.008, 0.035, 0.105), metallic=0.12, roughness=0.11),
        "blue_light": material("interior-sapphire-enamel", (0.015, 0.12, 0.26), metallic=0.08, roughness=0.105),
        "gold": material("interior-polished-gold", (0.72, 0.39, 0.035), metallic=0.98, roughness=0.085),
        "dark_gold": material("interior-antique-gold", (0.42, 0.19, 0.035), metallic=0.86, roughness=0.2),
        "silver": material("interior-polished-silver", (0.72, 0.82, 0.9), metallic=0.95, roughness=0.105),
        "warm": material("interior-warm-glass", (0.62, 0.16, 0.025), roughness=0.14, emission=(1.0, 0.24, 0.025), emission_strength=2.5),
        "cyan": material("interior-cyan-gem", (0.02, 0.55, 0.72), roughness=0.07, emission=(0.01, 0.42, 0.72), emission_strength=1.25),
        "ruby": material("interior-ruby-gem", (0.62, 0.015, 0.06), roughness=0.06, emission=(0.42, 0.005, 0.02), emission_strength=0.85),
        "emerald": material("interior-emerald-gem", (0.008, 0.19, 0.065), roughness=0.2, emission=(0.0, 0.08, 0.025), emission_strength=0.22),
        "crystal": material("interior-cut-crystal", (0.58, 0.82, 0.9), metallic=0.16, roughness=0.055),
    }


def assign(obj, mat):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    return obj


def batch_static_architecture(asset_slug):
    protected_names = {
        "vault-interior-coffered-rotunda-vault",
        "vault-palace-atrium-visible-main-dome-underside",
    }
    protected_fragments = (
        "museum-display-base-",
        "museum-display-gold-ring-",
        "museum-display-blue-plinth-",
        "museum-display-crown-light-",
        "museum-relic-plaque-",
        "deep-roof-return",
        "continuous-coffered-cloister-roof",
        "coastal-horizon-real-animated-sea-water-mesh",
        "distant-atmospheric-ridge",
    )
    candidates = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type in {"MESH", "CURVE"}
        and obj.name not in protected_names
        and not any(fragment in obj.name for fragment in protected_fragments)
    ]
    for obj in candidates:
        if obj.type == "MESH" and not obj.modifiers:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")

    batches = {}
    for obj in candidates:
        if obj.name not in bpy.context.view_layer.objects:
            continue
        material_key = tuple(slot.material.name if slot.material else "none" for slot in obj.material_slots)
        completion_key = "360-completion" in obj.name
        batches.setdefault((completion_key, material_key), []).append(obj)

    for batch_index, ((is_completion, material_key), objects) in enumerate(batches.items()):
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.join()
        material_slug = "-".join(material_key).replace("_", "-")[:48] or "unassigned"
        active.name = (
            f"{asset_slug}-360-completion-batch-{batch_index:02d}-{material_slug}"
            if is_completion
            else f"{asset_slug}-authored-batch-{batch_index:02d}-{material_slug}"
        )
        active["batchedObjectCount"] = len(objects)


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


def cone(name, location, radius_bottom, radius_top, depth, mat, vertices=32, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    bevel(obj, 0.035, 3)
    bpy.ops.object.shade_smooth()
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


def faceted_gem(name, location, scale, mat, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
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


def inward_dome(name, radius, height, base_z, mat, gold, start=-1.34, end=1.34, segments=36, rings=14, add_oculus=True):
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
    if add_oculus:
        torus(f"{name}-oculus-ring", (0, 0, base_z + height), 0.56, 0.085, gold)
        cylinder(f"{name}-oculus-gem", (0, 0, base_z + height + 0.025), 0.46, 0.04, mat, 40)
    return obj


def radial_panel(name, angle, radius, z, dimensions, mat, bevel_amount=0.035):
    x = math.sin(angle) * radius
    y = -math.cos(angle) * radius
    panel = box(name, (x, y, z), dimensions, mat, rotation=(0, 0, -angle), bevel_amount=bevel_amount)
    return panel


def radial_gallery_slab(prefix, radius, z, mats, start=-1.22, end=1.22, segments=13, depth=1.05):
    for index in range(segments):
        angle = start + (end - start) * (index + 0.5) / segments
        arc_width = radius * (end - start) / segments * 1.08
        radial_panel(
            f"{prefix}-walkable-marble-gallery-slab",
            angle,
            radius,
            z,
            (arc_width, depth, 0.28),
            mats["marble_light"],
            0.055,
        )
        radial_panel(
            f"{prefix}-midnight-coffered-slab-underside",
            angle,
            radius - 0.03,
            z - 0.17,
            (arc_width * 0.92, depth * 0.82, 0.07),
            mats["blue"],
            0.025,
        )


def classical_column(prefix, angle, radius, base_z, height, mats, shaft_radius=0.16):
    x = math.sin(angle) * radius
    y = -math.cos(angle) * radius
    cylinder(f"{prefix}-marble-column-base", (x, y, base_z + 0.12), shaft_radius * 1.55, 0.24, mats["marble_light"], 24)
    cylinder(f"{prefix}-gold-column-base-collar", (x, y, base_z + 0.27), shaft_radius * 1.28, 0.08, mats["gold"], 24)
    cylinder(f"{prefix}-fluted-marble-column-shaft", (x, y, base_z + height * 0.5), shaft_radius, height - 0.42, mats["marble_light"], 24)
    cylinder(f"{prefix}-gold-column-neck", (x, y, base_z + height - 0.2), shaft_radius * 1.24, 0.09, mats["gold"], 24)
    capital = box(
        f"{prefix}-carved-marble-column-capital",
        (x, y, base_z + height - 0.08),
        (shaft_radius * 3.1, shaft_radius * 2.6, 0.22),
        mats["marble_light"],
        rotation=(0, 0, -angle),
        bevel_amount=0.055,
    )
    capital["architecturalRole"] = "load-bearing-gallery-column"


def dome_coffer_rings(prefix, radius, height, base_z, mats, start=-1.34, end=1.34):
    for ring_index, phi in enumerate((0.2, 0.38, 0.56, 0.73)):
        ring_radius = math.cos(phi) * radius * 0.992
        z = base_z + math.sin(phi) * height - 0.02
        curve_tube(
            f"{prefix}-concentric-gold-coffer-ring-{ring_index:02d}",
            arc_points(ring_radius, z, start, end, 45),
            0.045,
            mats["dark_gold"] if ring_index % 2 else mats["gold"],
        )


def build_atrium_chandelier(mats):
    cylinder("vault-palace-atrium-chandelier-suspension", (0, -0.12, 9.62), 0.035, 2.25, mats["gold"], 14)
    for ring_index, (radius, z, tube) in enumerate(((0.84, 8.52, 0.055), (0.58, 8.27, 0.04), (0.3, 8.02, 0.032))):
        torus(f"vault-palace-atrium-chandelier-tier-ring-{ring_index:02d}", (0, -0.12, z), radius, tube, mats["gold"], major_segments=64)
        count = 16 - ring_index * 4
        for index in range(count):
            angle = index / count * math.pi * 2
            x = math.sin(angle) * radius
            y = -0.12 + math.cos(angle) * radius
            chain_height = 0.2 + ring_index * 0.08 + (index % 2) * 0.08
            cylinder(
                "vault-palace-atrium-chandelier-fine-gold-chain",
                (x, y, z - chain_height * 0.5),
                0.008,
                chain_height,
                mats["gold"],
                8,
            )
            faceted_gem(
                "vault-palace-atrium-chandelier-cut-crystal-prism",
                (x, y, z - chain_height - 0.1),
                (0.055, 0.055, 0.13 + ring_index * 0.025),
                mats["cyan"] if index % 8 == 0 and ring_index == 0 else mats["crystal"],
            )
    faceted_gem("vault-palace-atrium-chandelier-crystal-heart", (0, -0.12, 7.62), (0.18, 0.18, 0.34), mats["crystal"], 3)


def loggia_level(prefix, base_z, gallery_z, radius, mats, bay_count=9):
    radial_gallery_slab(prefix, radius - 0.52, gallery_z, mats, -1.22, 1.22, max(11, bay_count + 2), 1.08)
    curve_tube(f"{prefix}-deep-gallery-slab-front", arc_points(radius - 1.02, gallery_z + 0.02, -1.22, 1.22), 0.17, mats["marble_light"])
    curve_tube(f"{prefix}-deep-gold-cornice", arc_points(radius - 0.96, gallery_z + 0.16, -1.22, 1.22), 0.075, mats["gold"])
    curve_tube(f"{prefix}-continuous-gold-rail", arc_points(radius - 1.1, gallery_z + 0.84, -1.17, 1.17), 0.05, mats["gold"])
    curve_tube(f"{prefix}-continuous-marble-rail", arc_points(radius - 1.1, gallery_z + 0.68, -1.17, 1.17), 0.075, mats["marble_light"])

    for index in range(bay_count + 2):
        angle = -1.12 + index * (2.24 / (bay_count + 1))
        radial_panel(
            f"{prefix}-carved-solid-gallery-parapet",
            angle,
            radius - 1.1,
            gallery_z + 0.38,
            (0.62, 0.13, 0.48),
            mats["marble_light"],
            0.04,
        )
        radial_panel(
            f"{prefix}-gallery-parapet-blue-inlay",
            angle,
            radius - 1.16,
            gallery_z + 0.38,
            (0.4, 0.045, 0.22),
            mats["blue"],
            0.025,
        )

    for index in range(bay_count):
        angle = -1.03 + index * (2.06 / (bay_count - 1))
        x = math.sin(angle) * radius
        y = -math.cos(angle) * radius
        radial_panel(
            f"{prefix}-deep-blue-arched-recess-{index:02d}",
            angle,
            radius + 0.02,
            base_z + (gallery_z - base_z) * 0.48,
            (1.05, 0.34, max(2.45, gallery_z - base_z - 0.42)),
            mats["blue"] if base_z < 1 else mats["blue_light"],
        )
        marble_frame = arch_frame(
            f"{prefix}-substantial-ivory-arch-{index:02d}",
            (x, y - 0.12, base_z + 0.17),
            1.18,
            max(1.75, gallery_z - base_z - 1.05),
            0.59,
            0.115,
            mats["marble_light"],
            -angle,
        )
        marble_frame.rotation_euler[2] = -angle
        frame = arch_frame(
            f"{prefix}-layered-gold-arch-{index:02d}",
            (x, y - 0.16, base_z + 0.22),
            0.92,
            max(1.62, gallery_z - base_z - 1.16),
            0.46,
            0.055,
            mats["gold"],
            -angle,
        )
        frame.rotation_euler[2] = -angle
        sphere(f"{prefix}-warm-sconce", (x, y - 0.32, base_z + (gallery_z - base_z) * 0.5), (0.12, 0.065, 0.18), mats["warm"], 16, 8)

    for index in range(bay_count + 1):
        angle = -1.03 + (index + 0.5) * (2.06 / bay_count)
        classical_column(prefix, angle, radius - 0.04, base_z, gallery_z - base_z - 0.08, mats, 0.17)

    for index in range(25):
        angle = -1.14 + index * (2.28 / 24)
        x = math.sin(angle) * (radius - 1.1)
        y = -math.cos(angle) * (radius - 1.1)
        cylinder(f"{prefix}-marble-baluster", (x, y, gallery_z + 0.56), 0.038, 0.52, mats["marble_light"], 10)


def completion_loggia_arc(prefix, base_z, gallery_z, radius, mats, start, end, bay_count):
    radial_gallery_slab(prefix, radius - 0.52, gallery_z, mats, start, end, bay_count + 2, 1.08)
    curve_tube(f"{prefix}-deep-gallery-slab-front", arc_points(radius - 1.02, gallery_z + 0.02, start, end, 31), 0.17, mats["marble_light"])
    curve_tube(f"{prefix}-deep-gold-cornice", arc_points(radius - 0.96, gallery_z + 0.16, start, end, 31), 0.075, mats["gold"])
    curve_tube(f"{prefix}-continuous-gold-rail", arc_points(radius - 1.1, gallery_z + 0.84, start + 0.04, end - 0.04, 31), 0.05, mats["gold"])
    curve_tube(f"{prefix}-continuous-marble-rail", arc_points(radius - 1.1, gallery_z + 0.68, start + 0.04, end - 0.04, 31), 0.075, mats["marble_light"])

    for index in range(bay_count):
        angle = start + (end - start) * (index + 0.5) / bay_count
        radial_panel(
            f"{prefix}-deep-blue-arched-recess-{index:02d}",
            angle,
            radius + 0.02,
            base_z + (gallery_z - base_z) * 0.48,
            (0.88, 0.34, max(2.45, gallery_z - base_z - 0.42)),
            mats["blue"] if base_z < 1 else mats["blue_light"],
        )
        x = math.sin(angle) * radius
        y = -math.cos(angle) * radius
        frame = arch_frame(
            f"{prefix}-layered-gold-arch-{index:02d}",
            (x, y - math.cos(angle) * 0.12, base_z + 0.2),
            0.78,
            max(1.62, gallery_z - base_z - 1.16),
            0.39,
            0.05,
            mats["gold"],
            -angle,
        )
        frame.rotation_euler[2] = -angle
        classical_column(prefix, angle + (end - start) / (bay_count * 2), radius - 0.04, base_z, gallery_z - base_z - 0.08, mats, 0.16)
        sphere(
            f"{prefix}-warm-sconce",
            (math.sin(angle) * (radius - 0.25), -math.cos(angle) * (radius - 0.25), base_z + (gallery_z - base_z) * 0.5),
            (0.1, 0.07, 0.16),
            mats["warm"],
            16,
            8,
        )

    for index in range(bay_count * 2 + 1):
        angle = start + (end - start) * index / (bay_count * 2)
        radial_panel(
            f"{prefix}-carved-solid-gallery-parapet",
            angle,
            radius - 1.1,
            gallery_z + 0.38,
            (0.5, 0.13, 0.48),
            mats["marble_light"],
            0.04,
        )


def build_atrium_side_reliquary(side, mats):
    angle = side * math.pi / 2
    prefix = "vault-palace-atrium-360-completion-side-reliquary"
    radius = 5.16
    radial_panel(f"{prefix}-shadow-arched-niche", angle, radius, 3.62, (1.76, 0.52, 6.42), mats["marble_shadow"], 0.055)
    radial_panel(f"{prefix}-sapphire-inset", angle, radius - 0.2, 3.64, (1.38, 0.14, 5.92), mats["blue"], 0.035)
    x = math.sin(angle) * radius
    y = -math.cos(angle) * radius
    frame = arch_frame(
        f"{prefix}-layered-gold-arch",
        (x, y - math.cos(angle) * 0.22, 0.56),
        1.68,
        4.65,
        0.84,
        0.105,
        mats["gold"],
        -angle,
    )
    frame.rotation_euler[2] = -angle
    for column_side in (-1, 1):
        classical_column(prefix, angle + column_side * 0.17, 5.02, 0.36, 5.82, mats, 0.18)

    sculpture_radius = 4.54
    sculpture_x = math.sin(angle) * sculpture_radius
    sculpture_y = -math.cos(angle) * sculpture_radius
    cylinder(f"{prefix}-carved-pedestal", (sculpture_x, sculpture_y, 0.64), 0.48, 0.62, mats["marble_light"], 32)
    cylinder(f"{prefix}-pedestal-gold-collar", (sculpture_x, sculpture_y, 0.98), 0.52, 0.12, mats["gold"], 32)
    cone(f"{prefix}-royal-vessel", (sculpture_x, sculpture_y, 1.72), 0.38, 0.2, 1.24, mats["dark_gold"], 28)
    torus(f"{prefix}-royal-vessel-rim", (sculpture_x, sculpture_y, 2.36), 0.32, 0.075, mats["gold"], major_segments=40)
    sphere(
        f"{prefix}-crown-jewel",
        (sculpture_x, sculpture_y, 3.02),
        (0.34, 0.25, 0.5),
        mats["emerald"] if side < 0 else mats["ruby"],
        24,
        12,
    )
    sphere(f"{prefix}-crown-jewel-halo", (sculpture_x, sculpture_y, 4.54), (0.22, 0.09, 0.31), mats["warm"], 20, 10)


def build_atrium_360_completion(mats):
    start = 2.18
    end = math.pi * 2 - 2.18
    for index in range(15):
        angle = start + (end - start) * index / 14
        radial_panel(
            "vault-palace-atrium-360-completion-entry-side-wall-segment",
            angle,
            5.32,
            4.05,
            (0.88, 0.62, 8.22),
            mats["marble"],
            0.035,
        )
        radial_panel(
            "vault-palace-atrium-360-completion-entry-side-midnight-reveal",
            angle,
            5.05,
            4.0,
            (0.56, 0.1, 7.55),
            mats["blue_light"] if index % 2 == 0 else mats["blue"],
            0.025,
        )

    completion_loggia_arc("vault-palace-atrium-360-completion-first-gallery", 0.38, 4.05, 4.95, mats, start, end, 7)
    completion_loggia_arc("vault-palace-atrium-360-completion-second-gallery", 4.12, 7.72, 4.95, mats, start, end, 7)
    curve_tube("vault-palace-atrium-360-completion-crown-cornice", arc_points(4.98, 8.08, start, end, 35), 0.18, mats["marble_light"])
    curve_tube("vault-palace-atrium-360-completion-crown-gold-band", arc_points(4.91, 8.22, start, end, 35), 0.09, mats["gold"])
    inward_dome(
        "vault-palace-atrium-360-completion-dome-underside",
        4.92,
        4.15,
        8.26,
        mats["blue"],
        mats["gold"],
        start=start,
        end=end,
        segments=36,
        rings=16,
        add_oculus=False,
    )
    dome_coffer_rings("vault-palace-atrium-360-completion-dome-underside", 4.92, 4.15, 8.26, mats, start, end)
    build_atrium_side_reliquary(-1, mats)
    build_atrium_side_reliquary(1, mats)

    entry_angle = math.pi
    radial_panel("vault-palace-atrium-360-completion-grand-entry-blue-double-door", entry_angle, 5.0, 2.25, (2.5, 0.34, 4.1), mats["blue"])
    entry_frame = arch_frame(
        "vault-palace-atrium-360-completion-grand-entry-gold-arch",
        (0, 5.2, 0.32),
        2.65,
        2.45,
        1.325,
        0.13,
        mats["gold"],
        -entry_angle,
    )
    entry_frame.rotation_euler[2] = -entry_angle
    for side in (-1, 1):
        box(
            "vault-palace-atrium-360-completion-grand-entry-door-leaf",
            (side * 0.63, 4.78, 2.1),
            (1.12, 0.2, 3.72),
            mats["blue_light"],
            bevel_amount=0.055,
        )
        for stud_z in (0.82, 1.46, 2.1, 2.74, 3.38):
            sphere(
                "vault-palace-atrium-360-completion-grand-entry-gold-stud",
                (side * 0.63, 4.64, stud_z),
                (0.065, 0.045, 0.065),
                mats["gold"],
                14,
                7,
            )
        box(
            "vault-palace-atrium-360-completion-grand-entry-gold-side-stile",
            (side * 1.32, 4.46, 2.18),
            (0.15, 0.12, 4.2),
            mats["gold"],
            bevel_amount=0.028,
        )
    box(
        "vault-palace-atrium-360-completion-grand-entry-gold-lintel",
        (0, 4.46, 4.24),
        (2.78, 0.14, 0.18),
        mats["gold"],
        bevel_amount=0.038,
    )
    box(
        "vault-palace-atrium-360-completion-grand-entry-gold-center-seam",
        (0, 4.42, 2.16),
        (0.11, 0.1, 3.8),
        mats["gold"],
        bevel_amount=0.024,
    )
    sphere(
        "vault-palace-atrium-360-completion-grand-entry-ruby-lock",
        (0, 4.3, 2.16),
        (0.21, 0.08, 0.21),
        mats["ruby"],
        22,
        11,
    )
    torus(
        "vault-palace-atrium-360-completion-grand-entry-crest",
        (0, 4.38, 4.78),
        0.38,
        0.07,
        mats["gold"],
        rotation=(math.pi / 2, 0, 0),
        major_segments=40,
    )
    sphere("vault-palace-atrium-360-completion-grand-entry-crest-gem", (0, 4.3, 4.78), (0.18, 0.07, 0.18), mats["ruby"], 20, 10)


def build_split_stair(mats):
    box("vault-palace-atrium-entry-landing", (0, -4.18, 6.25), (3.25, 1.52, 0.42), mats["marble_light"], bevel_amount=0.1)
    box("vault-palace-atrium-entry-landing-gold-fascia", (0, -3.39, 6.08), (3.42, 0.16, 0.42), mats["gold"], bevel_amount=0.045)
    box("vault-palace-atrium-entry-landing-midnight-runner", (0, -4.15, 6.49), (1.54, 1.34, 0.055), mats["blue"], bevel_amount=0.03)
    for side in (-1, 1):
        box(
            "vault-palace-atrium-entry-runner-gold-border",
            (side * 0.79, -4.15, 6.51),
            (0.06, 1.4, 0.05),
            mats["gold"],
            bevel_amount=0.01,
        )
    radial_panel("vault-palace-atrium-monumental-entry-blue-door", 0, 5.14, 7.86, (2.38, 0.42, 3.05), mats["blue"])
    arch_frame("vault-palace-atrium-monumental-entry-ivory-surround", (0, -5.3, 6.36), 2.86, 2.1, 1.43, 0.2, mats["marble_light"])
    arch_frame("vault-palace-atrium-monumental-entry-gold-frame", (0, -5.42, 6.5), 2.42, 1.95, 1.21, 0.095, mats["gold"])
    torus(
        "vault-palace-atrium-entry-royal-crest-gold-ring",
        (0, -5.54, 9.62),
        0.38,
        0.085,
        mats["gold"],
        rotation=(math.pi / 2, 0, 0),
        major_segments=40,
    )
    sphere("vault-palace-atrium-entry-royal-crest-ruby", (0, -5.64, 9.62), (0.23, 0.07, 0.23), mats["ruby"], 24, 12)
    for side in (-1, 1):
        sphere(
            "vault-palace-atrium-entry-flanking-cyan-jewel",
            (side * 1.56, -5.58, 8.0),
            (0.16, 0.07, 0.24),
            mats["cyan"],
            20,
            10,
        )

    for side in (-1, 1):
        outer_rail = []
        inner_rail = []
        stringer = []
        for index in range(31):
            t = index / 30
            smooth = t * t * (3 - 2 * t)
            x = side * (0.76 + smooth * 2.62)
            y = -3.42 + t * 4.34
            z = 6.0 - t * 5.5
            step = box(
                "vault-palace-atrium-split-descent-marble-step",
                (x, y, z),
                (1.26 + t * 0.28, 0.36, 0.2),
                mats["marble_light"],
                rotation=(0, 0, side * -0.19 * t),
                bevel_amount=0.035,
            )
            box(
                "vault-palace-atrium-split-descent-midnight-runner",
                (x - side * 0.08, y, z + 0.115),
                (0.62 + t * 0.12, 0.28, 0.035),
                mats["blue"],
                rotation=(0, 0, side * -0.19 * t),
                bevel_amount=0.012,
            )
            gold_nose = box(
                "vault-palace-atrium-stair-gold-nosing",
                (x, y + 0.18, z + 0.09),
                (1.3 + t * 0.28, 0.045, 0.055),
                mats["gold"],
                rotation=(0, 0, side * -0.19 * t),
                bevel_amount=0.01,
            )
            step["stairSide"] = side
            gold_nose["stairSide"] = side
            outer_rail.append((x + side * 0.74, y, z + 0.78))
            inner_rail.append((x - side * 0.47, y, z + 0.72))
            stringer.append((x, y - 0.04, z - 0.16))
            if index % 2 == 0:
                cylinder("vault-palace-atrium-stair-marble-newel", outer_rail[-1], 0.065, 0.84, mats["marble_light"], 14)
            if index % 3 == 0:
                cylinder("vault-palace-atrium-stair-inner-marble-baluster", inner_rail[-1], 0.048, 0.72, mats["marble_light"], 12)
        curve_tube("vault-palace-atrium-stair-substantial-outer-marble-balustrade", outer_rail, 0.11, mats["marble_light"])
        curve_tube("vault-palace-atrium-stair-continuous-outer-gold-rail", [(x, y, z + 0.14) for x, y, z in outer_rail], 0.045, mats["gold"])
        curve_tube("vault-palace-atrium-stair-substantial-inner-marble-balustrade", inner_rail, 0.09, mats["marble_light"])
        curve_tube("vault-palace-atrium-stair-continuous-inner-gold-rail", [(x, y, z + 0.12) for x, y, z in inner_rail], 0.035, mats["gold"])
        curve_tube("vault-palace-atrium-stair-massive-marble-stringer", stringer, 0.46, mats["marble"])
        curve_tube(
            "vault-palace-atrium-stair-outer-load-bearing-stringer",
            [(x + side * 0.47, y, z - 0.12) for x, y, z in stringer],
            0.24,
            mats["marble_shadow"],
        )
        curve_tube(
            "vault-palace-atrium-stair-inner-load-bearing-stringer",
            [(x - side * 0.47, y, z - 0.12) for x, y, z in stringer],
            0.22,
            mats["marble_shadow"],
        )
        for support_t in (0.44, 0.7):
            support_smooth = support_t * support_t * (3 - 2 * support_t)
            support_x = side * (0.76 + support_smooth * 2.62)
            support_y = -3.42 + support_t * 4.34
            stair_underside_z = 6.0 - support_t * 5.5 - 0.42
            support_height = max(0.85, stair_underside_z - 0.18)
            cylinder(
                "vault-palace-atrium-stair-load-bearing-marble-pier",
                (support_x, support_y, 0.18 + support_height * 0.5),
                0.2,
                support_height,
                mats["marble_light"],
                24,
            )
            cylinder(
                "vault-palace-atrium-stair-load-bearing-pier-base",
                (support_x, support_y, 0.2),
                0.29,
                0.28,
                mats["marble"],
                24,
            )
            box(
                "vault-palace-atrium-stair-load-bearing-pier-capital",
                (support_x, support_y, stair_underside_z - 0.04),
                (0.58, 0.54, 0.2),
                mats["gold"],
                bevel_amount=0.045,
            )
        box("vault-palace-atrium-lower-stair-landing", (side * 3.38, 1.12, 0.3), (1.88, 1.72, 0.42), mats["marble_light"], bevel_amount=0.09)
        box("vault-palace-atrium-lower-stair-landing-blue-inlay", (side * 3.38, 1.12, 0.525), (1.18, 1.18, 0.035), mats["blue"], bevel_amount=0.025)
        box("vault-palace-atrium-lower-stair-landing-gold-fascia", (side * 3.38, 1.99, 0.31), (1.96, 0.12, 0.44), mats["gold"], bevel_amount=0.035)
        for landing_side in (-1, 1):
            cylinder(
                "vault-palace-atrium-lower-stair-landing-monumental-newel",
                (side * 3.38 + landing_side * 0.78, 1.78, 0.92),
                0.11,
                1.05,
                mats["marble_light"],
                20,
            )
            cylinder(
                "vault-palace-atrium-lower-stair-landing-newel-gold-collar",
                (side * 3.38 + landing_side * 0.78, 1.78, 1.42),
                0.15,
                0.1,
                mats["gold"],
                20,
            )

    box("vault-palace-atrium-upper-landing-structural-soffit", (0, -4.02, 5.96), (3.42, 1.78, 0.26), mats["marble_shadow"], bevel_amount=0.08)
    for support_x in (-1.34, 1.34):
        cylinder("vault-palace-atrium-upper-landing-marble-support-base", (support_x, -3.86, 0.22), 0.28, 0.34, mats["marble_light"], 28)
        cylinder("vault-palace-atrium-upper-landing-fluted-support", (support_x, -3.86, 3.04), 0.2, 5.42, mats["marble_light"], 28)
        cylinder("vault-palace-atrium-upper-landing-gold-support-neck", (support_x, -3.86, 5.69), 0.27, 0.12, mats["gold"], 28)
        box("vault-palace-atrium-upper-landing-carved-support-capital", (support_x, -3.86, 5.82), (0.64, 0.58, 0.22), mats["marble_light"], bevel_amount=0.055)
    for upper_x in (-1.52, -0.28, 0.28, 1.52):
        cylinder("vault-palace-atrium-upper-landing-terminal-newel", (upper_x, -3.28, 6.62), 0.09, 0.88, mats["marble_light"], 18)
        cylinder("vault-palace-atrium-upper-landing-terminal-gold-finial", (upper_x, -3.28, 7.08), 0.13, 0.1, mats["gold"], 18)


def curved_stair_mass(name, centers, width, thickness, mat):
    vertices = []
    for index, (x, y, z) in enumerate(centers):
        previous = centers[max(0, index - 1)]
        following = centers[min(len(centers) - 1, index + 1)]
        tangent_x = following[0] - previous[0]
        tangent_y = following[1] - previous[1]
        tangent_length = max(0.001, math.hypot(tangent_x, tangent_y))
        normal_x = -tangent_y / tangent_length
        normal_y = tangent_x / tangent_length
        half_width = width * 0.5
        left = (x + normal_x * half_width, y + normal_y * half_width)
        right = (x - normal_x * half_width, y - normal_y * half_width)
        vertices.extend([
            (left[0], left[1], z),
            (right[0], right[1], z),
            (left[0], left[1], z - thickness),
            (right[0], right[1], z - thickness),
        ])

    faces = []
    for index in range(len(centers) - 1):
        offset = index * 4
        next_offset = (index + 1) * 4
        faces.extend([
            (offset, next_offset, next_offset + 1, offset + 1),
            (offset + 2, offset + 3, next_offset + 3, next_offset + 2),
            (offset, offset + 2, next_offset + 2, next_offset),
            (offset + 1, next_offset + 1, next_offset + 3, offset + 3),
        ])
    last = (len(centers) - 1) * 4
    faces.extend([(0, 1, 3, 2), (last, last + 2, last + 3, last + 1)])
    mesh_data = bpy.data.meshes.new(f"{name}-mesh")
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.update()
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    assign(obj, mat)
    bevel(obj, 0.065, 3)
    return obj


def build_split_stair_family_b(mats):
    box("vault-palace-atrium-family-b-upper-entry-landing", (0, -4.12, 5.88), (3.25, 1.72, 0.5), mats["marble_light"], bevel_amount=0.12)
    box("vault-palace-atrium-family-b-upper-entry-landing-soffit", (0, -4.08, 5.5), (3.92, 1.88, 0.28), mats["marble_shadow"], bevel_amount=0.08)
    box("vault-palace-atrium-family-b-upper-entry-blue-runner", (0, -4.08, 6.16), (1.42, 1.46, 0.055), mats["blue"], bevel_amount=0.025)
    box("vault-palace-atrium-family-b-upper-entry-gold-fascia", (0, -3.23, 5.8), (3.46, 0.16, 0.48), mats["gold"], bevel_amount=0.035)

    radial_panel("vault-palace-atrium-family-b-monumental-entry-blue-door", 0, 5.18, 7.35, (2.5, 0.48, 3.25), mats["blue"])
    arch_frame("vault-palace-atrium-family-b-monumental-entry-limestone-surround", (0, -5.35, 5.96), 3.05, 2.22, 1.52, 0.22, mats["marble_light"])
    arch_frame("vault-palace-atrium-family-b-monumental-entry-gold-inlay", (0, -5.5, 6.12), 2.48, 2.0, 1.24, 0.075, mats["gold"])

    for support_x in (-1.48, 1.48):
        cylinder("vault-palace-atrium-family-b-upper-landing-column-base", (support_x, -4.0, 0.28), 0.34, 0.42, mats["marble"], 32)
        cylinder("vault-palace-atrium-family-b-upper-landing-load-bearing-column", (support_x, -4.0, 2.9), 0.25, 5.18, mats["marble_light"], 36)
        cylinder("vault-palace-atrium-family-b-upper-landing-column-gold-neck", (support_x, -4.0, 5.42), 0.33, 0.14, mats["gold"], 32)
        box("vault-palace-atrium-family-b-upper-landing-column-capital", (support_x, -4.0, 5.57), (0.74, 0.68, 0.2), mats["marble_light"], bevel_amount=0.055)

    for side in (-1, 1):
        centers = []
        for index in range(27):
            t = index / 26
            smooth = t * t * (3 - 2 * t)
            x = side * (1.22 + smooth * 2.1)
            y = -3.28 + t * 4.48
            z = 5.55 - t * 5.0
            centers.append((x, y, z - 0.12))
            width = 1.12 + t * 0.12
            rotation_z = side * -0.16 * t
            box(
                "vault-palace-atrium-family-b-grand-split-stair-tread",
                (x, y, z),
                (width, 0.34, 0.24),
                mats["marble_light"],
                rotation=(0, 0, rotation_z),
                bevel_amount=0.028,
            )
            box(
                "vault-palace-atrium-family-b-grand-split-stair-blue-runner",
                (x - side * 0.04, y, z + 0.135),
                (0.58, 0.28, 0.035),
                mats["blue"],
                rotation=(0, 0, rotation_z),
                bevel_amount=0.008,
            )
            if index % 2 == 0:
                box(
                    "vault-palace-atrium-family-b-grand-split-stair-gold-nosing",
                    (x, y + 0.17, z + 0.09),
                    (width + 0.04, 0.028, 0.038),
                    mats["gold"],
                    rotation=(0, 0, rotation_z),
                    bevel_amount=0.006,
                )

        curved_stair_mass(
            "vault-palace-atrium-family-b-solid-supported-stair-soffit",
            centers,
            1.36,
            0.42,
            mats["marble_shadow"],
        )

        outer_rail = []
        inner_rail = []
        for index, (x, y, z) in enumerate(centers):
            previous = centers[max(0, index - 1)]
            following = centers[min(len(centers) - 1, index + 1)]
            tangent_x = following[0] - previous[0]
            tangent_y = following[1] - previous[1]
            tangent_length = max(0.001, math.hypot(tangent_x, tangent_y))
            normal_x = -tangent_y / tangent_length
            normal_y = tangent_x / tangent_length
            outward = -side
            outer_rail.append((x + normal_x * outward * 0.6, y + normal_y * outward * 0.6, z + 0.78))
            inner_rail.append((x - normal_x * outward * 0.47, y - normal_y * outward * 0.47, z + 0.62))
            if index % 4 == 0:
                cylinder("vault-palace-atrium-family-b-outer-stair-baluster", outer_rail[-1], 0.06, 0.78, mats["marble_light"], 16)
        curve_tube("vault-palace-atrium-family-b-continuous-outer-limestone-handrail", outer_rail, 0.105, mats["marble_light"])
        curve_tube("vault-palace-atrium-family-b-continuous-outer-gold-cap", [(x, y, z + 0.12) for x, y, z in outer_rail], 0.036, mats["gold"])
        curve_tube("vault-palace-atrium-family-b-solid-inner-parapet", inner_rail, 0.085, mats["marble_light"])
        curve_tube("vault-palace-atrium-family-b-inner-parapet-gold-cap", [(x, y, z + 0.11) for x, y, z in inner_rail], 0.032, mats["gold"])

        for support_t in (0.48, 0.72):
            support_index = round(support_t * (len(centers) - 1))
            support_x, support_y, support_top = centers[support_index]
            support_height = max(0.8, support_top - 0.42)
            cylinder(
                "vault-palace-atrium-family-b-stair-load-bearing-column",
                (support_x, support_y, 0.24 + support_height * 0.5),
                0.2,
                support_height,
                mats["marble_light"],
                28,
            )
            cylinder("vault-palace-atrium-family-b-stair-column-base", (support_x, support_y, 0.26), 0.3, 0.32, mats["marble"], 28)
            box("vault-palace-atrium-family-b-stair-column-capital", (support_x, support_y, support_top - 0.24), (0.58, 0.56, 0.18), mats["gold"], bevel_amount=0.04)

        box("vault-palace-atrium-family-b-broad-lower-landing", (side * 3.42, 1.38, 0.34), (1.74, 1.5, 0.48), mats["marble_light"], bevel_amount=0.11)
        box("vault-palace-atrium-family-b-lower-landing-blue-inlay", (side * 3.42, 1.38, 0.6), (1.02, 1.0, 0.045), mats["blue"], bevel_amount=0.025)
        box("vault-palace-atrium-family-b-lower-landing-gold-fascia", (side * 3.42, 2.16, 0.34), (1.82, 0.12, 0.48), mats["gold"], bevel_amount=0.035)
        for landing_side in (-1, 1):
            newel_x = side * 3.42 + landing_side * 0.68
            cylinder("vault-palace-atrium-family-b-monumental-landing-newel", (newel_x, 2.02, 0.98), 0.14, 1.18, mats["marble_light"], 22)
            sphere("vault-palace-atrium-family-b-landing-newel-gold-finial", (newel_x, 2.02, 1.62), (0.17, 0.17, 0.2), mats["gold"], 20, 12)


def build_atrium():
    clear_scene()
    mats = materials()
    root = bpy.data.objects.new("vault-palace-atrium-blender-architecture-v028", None)
    bpy.context.collection.objects.link(root)

    cylinder("vault-palace-atrium-polished-marble-floor", (0, 0, -0.1), 5.62, 0.26, mats["marble_light"], 112)
    cylinder("vault-palace-atrium-blue-floor-medallion", (0, 0.78, 0.045), 2.62, 0.04, mats["blue"], 88)
    torus("vault-palace-atrium-floor-gold-ring", (0, 0.78, 0.075), 2.62, 0.055, mats["gold"])
    torus("vault-palace-atrium-descent-void-gold-rim", (0, 1.12, 0.13), 1.42, 0.11, mats["gold"])
    torus("vault-palace-atrium-descent-void-silver-inner-rim", (0, 1.12, 0.145), 1.27, 0.035, mats["silver"])
    cylinder("vault-palace-atrium-central-vault-descent-void", (0, 1.12, 0.02), 1.3, 0.15, mats["blue"], 72)
    box("vault-palace-atrium-royal-blue-processional-runner", (0, -1.35, 0.085), (1.18, 3.92, 0.045), mats["blue"], bevel_amount=0.035)
    for side in (-1, 1):
        box("vault-palace-atrium-processional-runner-gold-border", (side * 0.62, -1.35, 0.11), (0.055, 3.98, 0.04), mats["gold"], bevel_amount=0.012)

    for index in range(18):
        angle = index / 18 * math.pi * 2
        box(
            "vault-palace-atrium-floor-gold-sunburst-inlay",
            (math.sin(angle) * 2.02, math.cos(angle) * 2.02 + 0.78, 0.09),
            (0.055, 1.38, 0.03),
            mats["gold"],
            rotation=(0, 0, -angle),
            bevel_amount=0.008,
        )

    # A backed, open-front rotunda gives every loggia real recess depth without enclosing the phone camera.
    for index in range(29):
        angle = -2.18 + index * (4.36 / 28)
        side_wing = abs(angle) > 1.34
        radial_panel(
            "vault-palace-atrium-deep-curved-wall-segment",
            angle,
            5.32,
            4.05,
            (1.08, 0.62, 8.22),
            mats["marble"] if side_wing else mats["marble_shadow"],
            0.035,
        )
        radial_panel(
            "vault-palace-atrium-deep-midnight-wall-reveal",
            angle,
            5.05,
            4.0,
            (0.7, 0.1, 7.55),
            mats["blue_light"] if side_wing else mats["blue"],
            0.025,
        )

    for side in (-1, 1):
        for bay_index, side_angle in enumerate((1.48, 1.72, 1.96)):
            angle = side * side_angle
            radius = 4.93
            x = math.sin(angle) * radius
            y = -math.cos(angle) * radius
            side_arch = arch_frame(
                "vault-palace-atrium-enclosed-garden-wing-gold-wall-arch",
                (x, y, 0.38),
                0.82,
                2.44,
                0.41,
                0.065,
                mats["gold"],
                -angle,
            )
            side_arch.rotation_euler[2] = -angle
            sphere(
                "vault-palace-atrium-enclosed-garden-wing-jewel-sconce",
                (math.sin(angle) * 4.82, -math.cos(angle) * 4.82, 3.2),
                (0.09, 0.065, 0.14),
                mats["cyan"] if bay_index % 2 == 0 else mats["ruby"],
                16,
                8,
            )

    loggia_level("vault-palace-atrium-first-tall-floor-gallery", 0.38, 4.05, 4.95, mats, 9)
    loggia_level("vault-palace-atrium-second-tall-floor-gallery", 4.12, 7.72, 4.95, mats, 9)
    curve_tube("vault-palace-atrium-monumental-crown-cornice", arc_points(4.98, 8.08, -1.29, 1.29), 0.18, mats["marble_light"])
    curve_tube("vault-palace-atrium-monumental-crown-gold-band", arc_points(4.91, 8.22, -1.29, 1.29), 0.09, mats["gold"])
    inward_dome("vault-palace-atrium-visible-main-dome-underside", 4.92, 4.15, 8.26, mats["blue"], mats["gold"], start=-2.18, end=2.18, segments=64, rings=16)
    dome_coffer_rings("vault-palace-atrium-visible-main-dome-underside", 4.92, 4.15, 8.26, mats, -2.16, 2.16)
    build_atrium_360_completion(mats)
    build_split_stair_family_b(mats)
    build_atrium_chandelier(mats)

    radial_panel("vault-palace-atrium-under-stair-vault-threshold", 0, 5.0, 2.35, (2.52, 0.5, 4.18), mats["blue"])
    arch_frame("vault-palace-atrium-under-stair-monumental-ivory-arch", (0, -5.2, 0.28), 2.82, 2.72, 1.41, 0.18, mats["marble_light"])
    arch_frame("vault-palace-atrium-under-stair-layered-gold-arch", (0, -5.34, 0.4), 2.38, 2.52, 1.19, 0.09, mats["gold"])
    torus(
        "vault-palace-atrium-under-stair-vault-door-gold-ring",
        (0, -5.5, 2.22),
        0.82,
        0.085,
        mats["gold"],
        rotation=(math.pi / 2, 0, 0),
        major_segments=56,
    )
    sphere("vault-palace-atrium-under-stair-vault-door-cyan-dial", (0, -5.61, 2.22), (0.2, 0.07, 0.2), mats["cyan"], 24, 12)

    for side in (-1, 1):
        parterre_x = side * 4.72
        parterre_y = 2.06
        bed = cylinder(
            "vault-palace-atrium-formal-garden-sunken-marble-bed",
            (parterre_x, parterre_y, 0.12),
            1.08,
            0.22,
            mats["marble_light"],
            64,
        )
        bed.scale = (0.76, 1.18, 1.0)
        border = torus(
            "vault-palace-atrium-formal-garden-solid-gold-moulding",
            (parterre_x, parterre_y, 0.25),
            0.98,
            0.065,
            mats["gold"],
            major_segments=64,
        )
        border.scale = (0.76, 1.18, 1.0)
        soil = cylinder(
            "vault-palace-atrium-formal-garden-emerald-ground",
            (parterre_x, parterre_y, 0.24),
            0.86,
            0.08,
            mats["emerald"],
            64,
        )
        soil.scale = (0.74, 1.15, 1.0)
        cylinder(
            "vault-palace-atrium-formal-garden-central-gold-planter",
            (parterre_x, parterre_y, 0.53),
            0.3,
            0.48,
            mats["gold"],
            36,
        )
        cylinder(
            "vault-palace-atrium-formal-garden-topiary-trunk",
            (parterre_x, parterre_y, 1.14),
            0.06,
            0.92,
            mats["dark_gold"],
            14,
        )
        for crown_z, crown_radius in ((0.96, 0.4), (1.4, 0.34), (1.8, 0.27)):
            sphere(
                "vault-palace-atrium-formal-garden-sculpted-topiary-crown",
                (parterre_x, parterre_y, crown_z),
                (crown_radius, crown_radius, crown_radius * 1.2),
                mats["emerald"],
                24,
                12,
            )
        for flower_index in range(12):
            flower_angle = flower_index / 12 * math.pi * 2
            faceted_gem(
                "vault-palace-atrium-formal-garden-jewel-flower",
                (
                    parterre_x + math.sin(flower_angle) * 0.56,
                    parterre_y + math.cos(flower_angle) * 0.78,
                    0.42 + (flower_index % 3) * 0.045,
                ),
                (0.06, 0.06, 0.085),
                (mats["ruby"], mats["cyan"], mats["crystal"])[flower_index % 3],
                1,
            )
        fountain_x = side * 4.76
        fountain_y = 2.12
        cylinder("vault-palace-atrium-formal-garden-fountain-marble-base", (fountain_x, fountain_y, 0.32), 0.42, 0.38, mats["marble_light"], 40)
        torus("vault-palace-atrium-formal-garden-fountain-gold-basin", (fountain_x, fountain_y, 0.53), 0.38, 0.055, mats["gold"], major_segments=40)
        cylinder("vault-palace-atrium-formal-garden-fountain-water", (fountain_x, fountain_y, 0.54), 0.33, 0.035, mats["cyan"], 40)
        sphere("vault-palace-atrium-formal-garden-fountain-crystal-jet", (fountain_x, fountain_y, 0.98), (0.08, 0.08, 0.42), mats["cyan"], 18, 9)
        for route_index in range(5):
            route_t = route_index / 4
            route_x = side * (1.56 + route_t * 1.28)
            route_y = 1.1 + route_t * 0.72
            route_tile = cylinder(
                "vault-palace-atrium-formal-garden-route-medallion",
                (route_x, route_y, 0.18),
                0.18,
                0.045,
                mats["blue"],
                28,
            )
            route_tile.scale = (1.0, 0.66, 1.0)
            route_ring = torus(
                "vault-palace-atrium-formal-garden-route-gold-inlay",
                (route_x, route_y, 0.215),
                0.16,
                0.022,
                mats["gold"],
                major_segments=28,
            )
            route_ring.scale = (1.0, 0.66, 1.0)

        # A deep colonnaded garden nave continues visibly beyond the entry parterre.
        nave_x = side * 4.18
        box(
            "vault-palace-atrium-garden-nave-continuous-marble-floor",
            (nave_x, 0.12, 0.12),
            (1.58, 4.72, 0.22),
            mats["marble_light"],
            bevel_amount=0.055,
        )
        box(
            "vault-palace-atrium-garden-nave-midnight-processional-path",
            (nave_x, 0.12, 0.255),
            (0.68, 4.46, 0.05),
            mats["blue"],
            bevel_amount=0.022,
        )
        for path_side in (-1, 1):
            box(
                "vault-palace-atrium-garden-nave-continuous-gold-path-border",
                (nave_x + path_side * 0.37, 0.12, 0.29),
                (0.045, 4.5, 0.035),
                mats["gold"],
                bevel_amount=0.008,
            )
        for bay_index, bay_y in enumerate((-1.42, -0.42, 0.58, 1.58)):
            for aisle_side in (-1, 1):
                column_x = nave_x + aisle_side * 0.66
                cylinder(
                    "vault-palace-atrium-garden-nave-fluted-limestone-column",
                    (column_x, bay_y, 1.73),
                    0.14,
                    3.08,
                    mats["marble_light"],
                    24,
                )
                cylinder(
                    "vault-palace-atrium-garden-nave-column-gold-base",
                    (column_x, bay_y, 0.24),
                    0.21,
                    0.14,
                    mats["gold"],
                    24,
                )
                box(
                    "vault-palace-atrium-garden-nave-carved-column-capital",
                    (column_x, bay_y, 3.28),
                    (0.42, 0.42, 0.2),
                    mats["marble_light"],
                    bevel_amount=0.045,
                )
            cylinder(
                "vault-palace-atrium-garden-nave-gold-planter",
                (nave_x + side * 0.84, bay_y + 0.28, 0.5),
                0.24,
                0.42,
                mats["gold"],
                28,
            )
            sphere(
                "vault-palace-atrium-garden-nave-clipped-emerald-shrub",
                (nave_x + side * 0.84, bay_y + 0.28, 0.93),
                (0.28, 0.28, 0.42),
                mats["emerald"],
                20,
                10,
            )
            faceted_gem(
                "vault-palace-atrium-garden-nave-jewel-flower",
                (nave_x - side * 0.48, bay_y, 0.46),
                (0.07, 0.07, 0.1),
                mats["ruby"] if bay_index % 2 else mats["cyan"],
                1,
            )
        for aisle_side in (-1, 1):
            box(
                "vault-palace-atrium-garden-nave-gold-entablature",
                (nave_x + aisle_side * 0.66, 0.08, 3.44),
                (0.24, 4.66, 0.2),
                mats["gold"],
                bevel_amount=0.045,
            )
        box(
            "vault-palace-atrium-garden-nave-destination-sapphire-wall",
            (nave_x, -2.08, 1.82),
            (1.72, 0.24, 3.46),
            mats["blue_light"],
            bevel_amount=0.055,
        )
        destination_arch = arch_frame(
            "vault-palace-atrium-garden-nave-destination-gold-arch",
            (nave_x, -1.92, 0.32),
            1.32,
            2.1,
            0.66,
            0.09,
            mats["gold"],
        )
        destination_arch.rotation_euler[2] = 0
        cylinder("vault-palace-atrium-garden-nave-fountain-marble-base", (nave_x, -1.32, 0.38), 0.48, 0.42, mats["marble_light"], 44)
        torus("vault-palace-atrium-garden-nave-fountain-gold-basin", (nave_x, -1.32, 0.62), 0.43, 0.06, mats["gold"], major_segments=44)
        cylinder("vault-palace-atrium-garden-nave-fountain-crystal-water", (nave_x, -1.32, 0.63), 0.37, 0.035, mats["cyan"], 44)
        sphere("vault-palace-atrium-garden-nave-fountain-luminous-jet", (nave_x, -1.32, 1.18), (0.1, 0.1, 0.5), mats["cyan"], 18, 9)

    # The v026 interior naves replace the retired exterior-conservatory prototype.
    for side in ():
        angle = side * 0.96
        x = math.sin(angle) * 5.08
        y = -math.cos(angle) * 5.08
        radial_panel(
            "vault-palace-atrium-left-garden-door" if side < 0 else "vault-palace-atrium-right-garden-door",
            angle,
            5.08,
            1.72,
            (1.62, 0.42, 3.18),
            mats["blue"],
        )
        frame = arch_frame("vault-palace-atrium-garden-door-gold-arch", (x, y - 0.25, 0.2), 1.72, 2.02, 0.86, 0.09, mats["gold"], -angle)
        frame.rotation_euler[2] = -angle

        garden_radius = 4.83
        garden_x = math.sin(angle) * garden_radius
        garden_y = -math.cos(angle) * garden_radius
        tangent_x = math.cos(angle)
        tangent_y = math.sin(angle)
        cylinder("vault-palace-atrium-garden-gold-planter", (garden_x, garden_y, 0.38), 0.34, 0.52, mats["gold"], 40)
        cylinder("vault-palace-atrium-garden-cypress-trunk", (garden_x, garden_y, 1.15), 0.08, 1.26, mats["dark_gold"], 16)
        for foliage_index, (offset, z, scale) in enumerate(((-0.22, 1.15, 0.42), (0.18, 1.58, 0.5), (-0.08, 2.05, 0.58))):
            sphere(
                "vault-palace-atrium-garden-sculpted-cypress-foliage",
                (garden_x + tangent_x * offset, garden_y + tangent_y * offset, z),
                (0.28, 0.22, scale),
                mats["emerald"],
                22,
                11,
            )
        for flower_index in range(5):
            offset = -0.36 + flower_index * 0.18
            faceted_gem(
                "vault-palace-atrium-garden-jewel-flower",
                (garden_x + tangent_x * offset, garden_y + tangent_y * offset, 0.7 + (flower_index % 2) * 0.11),
                (0.055, 0.055, 0.075),
                mats["ruby"] if flower_index % 2 == 0 else mats["cyan"],
                1,
            )

        for step_index in range(6):
            t = step_index / 5
            box(
                "vault-palace-atrium-garden-portal-marble-step",
                (x - side * t * 0.72, y + t * 0.56, 0.08 + step_index * 0.08),
                (1.35, 0.34, 0.14),
                mats["marble_light"],
                rotation=(0, 0, -angle),
                bevel_amount=0.025,
            )

        # The side route resolves as a complete palace conservatory from a phone-height camera.
        threshold_angle = side * 1.72
        tangent_x = math.cos(threshold_angle)
        tangent_y = math.sin(threshold_angle)
        foreground_x = side * 4.82
        foreground_y = -1.28
        threshold_radius = 4.66
        box(
            "vault-palace-atrium-enclosed-garden-courtyard-floor",
            (side * 4.78, 0.62, 0.08),
            (2.34, 4.92, 0.2),
            mats["marble_light"],
            bevel_amount=0.05,
        )
        box(
            "vault-palace-atrium-enclosed-garden-courtyard-outer-wall",
            (side * 5.72, 0.62, 2.18),
            (0.34, 4.92, 4.36),
            mats["marble_shadow"],
            bevel_amount=0.06,
        )
        box(
            "vault-palace-atrium-enclosed-garden-courtyard-blue-wall-inset",
            (side * 5.52, 0.62, 2.18),
            (0.08, 4.48, 3.94),
            mats["blue"],
            bevel_amount=0.035,
        )
        box(
            "vault-palace-atrium-garden-conservatory-coffered-ceiling",
            (side * 4.78, 0.62, 4.22),
            (2.34, 4.92, 0.18),
            mats["blue"],
            bevel_amount=0.05,
        )
        for ceiling_y in (-1.32, -0.36, 0.6, 1.56, 2.52):
            box(
                "vault-palace-atrium-garden-conservatory-gold-ceiling-rib",
                (side * 4.78, ceiling_y, 4.1),
                (2.28, 0.075, 0.08),
                mats["gold"],
                bevel_amount=0.015,
            )
        for ceiling_x in (side * 4.0, side * 4.78, side * 5.5):
            box(
                "vault-palace-atrium-garden-conservatory-gold-longitudinal-rib",
                (ceiling_x, 0.62, 4.08),
                (0.075, 4.72, 0.08),
                mats["gold"],
                bevel_amount=0.015,
            )
        box(
            "vault-palace-atrium-garden-conservatory-gold-crown-cornice",
            (side * 5.48, 0.62, 4.03),
            (0.14, 4.52, 0.18),
            mats["gold"],
            bevel_amount=0.035,
        )
        for niche_index, niche_y in enumerate((-1.02, 0.62, 2.26)):
            box(
                "vault-palace-atrium-garden-conservatory-luminous-wall-bay",
                (side * 5.45, niche_y, 2.02),
                (0.07, 1.14, 2.98),
                mats["blue_light"],
                bevel_amount=0.04,
            )
            wall_arch = arch_frame(
                "vault-palace-atrium-garden-conservatory-layered-gold-wall-arch",
                (side * 5.39, niche_y, 0.5),
                1.08,
                2.08,
                0.54,
                0.075,
                mats["gold"],
                side * math.pi / 2,
            )
            wall_arch.rotation_euler[2] = side * math.pi / 2
            faceted_gem(
                "vault-palace-atrium-garden-conservatory-crown-jewel",
                (side * 5.31, niche_y, 3.35),
                (0.065, 0.11, 0.09),
                mats["cyan"] if niche_index % 2 == 0 else mats["ruby"],
                1,
            )
        box(
            "vault-palace-atrium-continuous-garden-route-runner",
            (side * 2.82, 0.48, 0.145),
            (2.72, 0.7, 0.055),
            mats["blue"],
            bevel_amount=0.025,
        )
        for runner_edge in (-1, 1):
            box(
                "vault-palace-atrium-continuous-garden-route-gold-border",
                (side * 2.82, 0.48 + runner_edge * 0.37, 0.185),
                (2.76, 0.045, 0.025),
                mats["gold"],
                bevel_amount=0.008,
            )
        for marker_index in range(5):
            marker_x = side * (1.82 + marker_index * 0.52)
            marker_y = 0.48
            torus(
                "vault-palace-atrium-garden-route-gold-medallion",
                (marker_x, marker_y, 0.22),
                0.16,
                0.025,
                mats["gold"],
                major_segments=32,
            )
            faceted_gem(
                "vault-palace-atrium-garden-route-luminous-waypoint",
                (marker_x, marker_y, 0.27),
                (0.055, 0.055, 0.075),
                mats["cyan"] if marker_index % 2 == 0 else mats["emerald"],
                1,
            )
        radial_panel(
            "vault-palace-atrium-garden-threshold-daylight-recess",
            threshold_angle,
            threshold_radius,
            1.95,
            (1.82, 0.34, 3.56),
            mats["blue_light"],
        )
        arch_radius = 4.28
        arch_x = math.sin(threshold_angle) * arch_radius
        arch_y = -math.cos(threshold_angle) * arch_radius
        threshold_frame = arch_frame(
            "vault-palace-atrium-garden-threshold-monumental-gold-arch",
            (arch_x, arch_y, 0.18),
            1.9,
            2.35,
            0.95,
            0.12,
            mats["gold"],
            -threshold_angle,
        )
        threshold_frame.rotation_euler[2] = -threshold_angle
        inner_frame = arch_frame(
            "vault-palace-atrium-garden-threshold-ivory-inner-arch",
            (math.sin(threshold_angle) * 4.22, -math.cos(threshold_angle) * 4.22, 0.3),
            1.54,
            2.14,
            0.77,
            0.08,
            mats["marble_light"],
            -threshold_angle,
        )
        inner_frame.rotation_euler[2] = -threshold_angle
        for column_offset in (-0.92, 0.92):
            column_x = arch_x + tangent_x * column_offset
            column_y = arch_y + tangent_y * column_offset
            cylinder(
                "vault-palace-atrium-garden-threshold-limestone-column",
                (column_x, column_y, 1.72),
                0.16,
                3.14,
                mats["marble_light"],
                24,
            )
            cylinder(
                "vault-palace-atrium-garden-threshold-gold-column-base",
                (column_x, column_y, 0.2),
                0.23,
                0.16,
                mats["gold"],
                24,
            )
            box(
                "vault-palace-atrium-garden-threshold-carved-capital",
                (column_x, column_y, 3.28),
                (0.44, 0.34, 0.2),
                mats["marble_light"],
                rotation=(0, 0, -threshold_angle),
                bevel_amount=0.045,
            )
        box(
            "vault-palace-atrium-garden-threshold-gold-entablature",
            (arch_x, arch_y, 3.48),
            (2.32, 0.3, 0.22),
            mats["gold"],
            rotation=(0, 0, -threshold_angle),
            bevel_amount=0.06,
        )
        sphere(
            "vault-palace-atrium-garden-threshold-daylight-lantern",
            (math.sin(threshold_angle) * 4.36, -math.cos(threshold_angle) * 4.36, 3.05),
            (0.14, 0.08, 0.18),
            mats["warm"],
            18,
            9,
        )
        courtyard_x = side * 4.52
        courtyard_y = 0.18
        cylinder("vault-palace-atrium-garden-courtyard-fountain-stone-base", (courtyard_x, courtyard_y, 0.3), 0.58, 0.36, mats["marble_light"], 48)
        torus("vault-palace-atrium-garden-courtyard-fountain-gold-basin", (courtyard_x, courtyard_y, 0.52), 0.53, 0.065, mats["gold"], major_segments=48)
        cylinder("vault-palace-atrium-garden-courtyard-fountain-water", (courtyard_x, courtyard_y, 0.53), 0.47, 0.04, mats["cyan"], 48)
        cylinder("vault-palace-atrium-garden-courtyard-fountain-gold-stem", (courtyard_x, courtyard_y, 0.94), 0.07, 0.76, mats["gold"], 20)
        sphere("vault-palace-atrium-garden-courtyard-fountain-crystal-jet", (courtyard_x, courtyard_y, 1.34), (0.13, 0.13, 0.48), mats["cyan"], 18, 9)
        for hedge_side in (-1, 1):
            hedge_x = side * 5.02
            hedge_y = courtyard_y + hedge_side * 0.82
            cylinder("vault-palace-atrium-garden-courtyard-cypress-gold-planter", (hedge_x, hedge_y, 0.37), 0.3, 0.48, mats["gold"], 32)
            cylinder("vault-palace-atrium-garden-courtyard-cypress-trunk", (hedge_x, hedge_y, 1.28), 0.065, 1.42, mats["dark_gold"], 16)
            for crown_z, crown_scale in ((1.05, 0.42), (1.55, 0.36), (2.02, 0.29)):
                sphere(
                    "vault-palace-atrium-garden-courtyard-sculpted-cypress-crown",
                    (hedge_x, hedge_y, crown_z),
                    (crown_scale, crown_scale, crown_scale * 1.45),
                    mats["emerald"],
                    22,
                    11,
                )
        box(
            "vault-palace-atrium-garden-courtyard-floor-beyond",
            (math.sin(threshold_angle) * 4.58, -math.cos(threshold_angle) * 4.58, 0.12),
            (1.72, 2.22, 0.18),
            mats["marble_light"],
            rotation=(0, 0, -threshold_angle),
            bevel_amount=0.045,
        )
        for route_index in range(7):
            t = route_index / 6
            route_x = side * (2.12 + t * 1.7)
            route_y = 0.28 + t * 0.34
            box(
                "vault-palace-atrium-continuous-garden-route-tile",
                (route_x, route_y, 0.16),
                (0.54, 0.38, 0.08),
                mats["blue"] if route_index % 2 else mats["marble_light"],
                rotation=(0, 0, side * -0.54),
                bevel_amount=0.025,
            )
            box(
                "vault-palace-atrium-continuous-garden-route-gold-inlay",
                (route_x, route_y, 0.205),
                (0.46, 0.035, 0.018),
                mats["gold"],
                rotation=(0, 0, side * -0.54),
                bevel_amount=0.005,
            )
        cylinder("vault-palace-atrium-visible-garden-gold-planter", (foreground_x, foreground_y, 0.44), 0.4, 0.58, mats["gold"], 40)
        torus("vault-palace-atrium-visible-garden-planter-ornamental-ring", (foreground_x, foreground_y, 0.61), 0.34, 0.045, mats["dark_gold"], major_segments=40)
        cylinder("vault-palace-atrium-visible-garden-cypress-trunk", (foreground_x, foreground_y, 1.32), 0.075, 1.4, mats["dark_gold"], 16)
        for crown_index, (z, radius, height) in enumerate(((1.08, 0.43, 0.62), (1.55, 0.37, 0.7), (2.04, 0.31, 0.78))):
            sphere(
                "vault-palace-atrium-visible-garden-sculpted-cypress-tier",
                (foreground_x, foreground_y, z),
                (radius, radius, height),
                mats["emerald"],
                24,
                12,
            )
        for flower_index in range(8):
            flower_angle = flower_index / 8 * math.pi * 2
            faceted_gem(
                "vault-palace-atrium-visible-garden-jewel-flower-ring",
                (
                    foreground_x + math.sin(flower_angle) * 0.31,
                    foreground_y + math.cos(flower_angle) * 0.31,
                    0.72,
                ),
                (0.055, 0.055, 0.075),
                mats["ruby"] if flower_index % 2 == 0 else mats["cyan"],
                1,
            )

    batch_static_architecture("vault-atrium")
    for obj in bpy.context.scene.objects:
        obj["vaultInteriorPart"] = obj.name
    export_asset("vault-atrium", root)


def build_vault_door(mats):
    # The door stands at the rear and reads as a massive layered mechanism rather than wall decoration.
    center = (0, -5.18, 2.58)
    cylinder("vault-interior-grand-round-door-stone-surround", (0, -5.02, 2.58), 2.05, 0.46, mats["marble_shadow"], 72, rotation=(math.pi / 2, 0, 0))
    cylinder("vault-interior-grand-round-door-frame", center, 1.76, 0.4, mats["gold"], 72, rotation=(math.pi / 2, 0, 0))
    cylinder("vault-interior-grand-round-door", (0, -5.42, 2.58), 1.55, 0.3, mats["blue"], 72, rotation=(math.pi / 2, 0, 0))
    torus("vault-interior-grand-door-inner-gold-ring", (0, -5.59, 2.58), 1.02, 0.09, mats["gold"], rotation=(math.pi / 2, 0, 0))
    for index in range(12):
        angle = index / 12 * math.pi * 2
        sphere(
            "vault-interior-door-gold-bolt",
            (math.sin(angle) * 1.25, -5.61, 2.58 + math.cos(angle) * 1.25),
            (0.12, 0.065, 0.12),
            mats["gold"],
            14,
            7,
        )
    sphere("vault-interior-door-center-gem-dial", (0, -5.72, 2.58), (0.34, 0.12, 0.34), mats["cyan"], 28, 14)


def build_display_bay(index, angle, radius, mats):
    x = math.sin(angle) * radius
    y = -math.cos(angle) * radius
    base = cylinder(f"vault-interior-museum-display-base-{index:02d}", (x, y, 0.22), 0.52, 0.34, mats["marble_light"], 40)
    base.rotation_euler[2] = -angle
    torus(f"vault-interior-museum-display-gold-ring-{index:02d}", (x, y, 0.4), 0.47, 0.055, mats["gold"])
    cylinder(f"vault-interior-museum-display-blue-plinth-{index:02d}", (x, y, 0.64), 0.37, 0.46, mats["blue"], 40)
    sphere(f"vault-interior-museum-display-crown-light-{index:02d}", (x, y, 2.88), (0.15, 0.1, 0.15), mats["warm"], 18, 9)
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
    niche_radius = 5.18
    nx = math.sin(angle) * niche_radius
    ny = -math.cos(angle) * niche_radius
    radial_panel(f"vault-interior-double-height-arched-bay-{index:02d}", angle, niche_radius, 2.3, (1.28, 0.5, 4.18), mats["blue"])
    radial_panel(f"vault-interior-double-height-onyx-bay-inset-{index:02d}", angle, niche_radius - 0.18, 2.3, (0.88, 0.12, 3.68), mats["marble_shadow"])
    frame = arch_frame(
        f"vault-interior-layered-gold-museum-arch-{index:02d}",
        (nx, ny - 0.2, 0.3),
        1.36,
        2.95,
        0.68,
        0.085,
        mats["gold"],
        -angle,
    )
    frame.rotation_euler[2] = -angle
    for side in (-1, 1):
        pillar_angle = angle + side * 0.13
        classical_column("vault-interior-monumental-museum", pillar_angle, 5.02, 0.25, 4.45, mats, 0.16)


def build_collection_wing(side, mats):
    x = side * 4.62
    for row in range(7):
        for column in range(4):
            box(
                "vault-interior-safe-deposit-box",
                (x, -1.18 - column * 0.09, 0.68 + row * 0.43),
                (0.62, 0.2, 0.31),
                mats["dark_gold"] if (row + column) % 3 == 0 else mats["blue"],
                rotation=(0, 0, side * -0.22),
                bevel_amount=0.025,
            )
            sphere(
                "vault-interior-safe-box-knob",
                (x - side * 0.09, -1.34 - column * 0.09, 0.68 + row * 0.43),
                (0.045, 0.025, 0.045),
                mats["gold"],
                12,
                6,
            )
    box("vault-interior-collection-wing-marble-frame", (x, -1.12, 1.98), (1.04, 0.28, 3.72), mats["marble_light"], rotation=(0, 0, side * -0.22), bevel_amount=0.08)
    box("vault-interior-collection-wing-blue-header", (x, -1.28, 3.95), (1.08, 0.16, 0.34), mats["blue"], rotation=(0, 0, side * -0.22), bevel_amount=0.05)


def build_vault_side_guardian(side, mats):
    angle = side * math.pi / 2
    prefix = "vault-interior-360-completion-side-guardian"
    radius = 5.12
    radial_panel(f"{prefix}-onyx-reliquary", angle, radius, 2.7, (1.7, 0.42, 4.82), mats["marble_shadow"], 0.05)
    radial_panel(f"{prefix}-sapphire-reliquary", angle, radius - 0.2, 2.72, (1.32, 0.12, 4.38), mats["blue"], 0.035)

    x = math.sin(angle) * radius
    y = -math.cos(angle) * radius
    frame = arch_frame(
        f"{prefix}-solid-gold-arch",
        (x, y - math.cos(angle) * 0.2, 0.52),
        1.58,
        3.28,
        0.79,
        0.095,
        mats["gold"],
        -angle,
    )
    frame.rotation_euler[2] = -angle

    guardian_radius = 4.48
    guardian_x = math.sin(angle) * guardian_radius
    guardian_y = -math.cos(angle) * guardian_radius
    cylinder(f"{prefix}-pearl-plinth", (guardian_x, guardian_y, 0.52), 0.46, 0.56, mats["marble_light"], 32)
    cylinder(f"{prefix}-gold-plinth-band", (guardian_x, guardian_y, 0.84), 0.5, 0.1, mats["gold"], 32)
    cone(f"{prefix}-guardian-obelisk", (guardian_x, guardian_y, 1.86), 0.34, 0.12, 1.82, mats["dark_gold"], 8)
    faceted_gem(
        f"{prefix}-sentinel-gem",
        (guardian_x, guardian_y, 2.96),
        (0.34, 0.25, 0.48),
        mats["cyan"] if side < 0 else mats["ruby"],
        2,
    )
    ring_rotation = (math.pi / 2, 0, -angle)
    torus(f"{prefix}-armillary-outer-ring", (guardian_x, guardian_y, 2.96), 0.68, 0.055, mats["gold"], rotation=ring_rotation, major_segments=44)
    torus(f"{prefix}-armillary-inner-ring", (guardian_x, guardian_y, 2.96), 0.48, 0.03, mats["silver"], rotation=ring_rotation, major_segments=40)
    sphere(f"{prefix}-warm-crown-light", (guardian_x, guardian_y, 4.48), (0.16, 0.08, 0.22), mats["warm"], 18, 9)


def build_vault_360_completion(mats):
    start = 1.37
    end = math.pi * 2 - 1.37
    wall_segments = 27
    for index in range(wall_segments):
        angle = start + (end - start) * index / (wall_segments - 1)
        radial_panel(
            "vault-interior-360-completion-curved-wall-segment",
            angle,
            5.48,
            3.38,
            (0.92, 0.58, 6.82),
            mats["marble"],
            0.03,
        )
        radial_panel(
            "vault-interior-360-completion-deep-sapphire-wall-reveal",
            angle,
            5.2,
            3.3,
            (0.58, 0.1, 6.16),
            mats["blue_light"] if index % 2 == 0 else mats["blue"],
            0.02,
        )

    radial_gallery_slab("vault-interior-360-completion-first-tall-floor", 4.93, 4.45, mats, start, end, 21, 0.92)
    curve_tube("vault-interior-360-completion-first-floor-balcony", arc_points(4.42, 4.48, start, end, 45), 0.17, mats["marble_light"])
    curve_tube("vault-interior-360-completion-first-floor-gold-cornice", arc_points(4.36, 4.62, start, end, 45), 0.075, mats["gold"])
    curve_tube("vault-interior-360-completion-upper-crown-cornice", arc_points(5.18, 6.7, start, end, 45), 0.16, mats["marble_light"])
    curve_tube("vault-interior-360-completion-upper-crown-gold-band", arc_points(5.11, 6.84, start, end, 45), 0.08, mats["gold"])

    bay_count = 12
    for index in range(bay_count):
        angle = start + (end - start) * (index + 0.5) / bay_count
        radial_panel(
            f"vault-interior-360-completion-lower-arcade-blue-bay-{index:02d}",
            angle,
            5.16,
            2.32,
            (0.84, 0.3, 3.92),
            mats["blue"] if index % 2 else mats["blue_light"],
        )
        classical_column(
            "vault-interior-360-completion-lower-arcade",
            angle + (end - start) / (bay_count * 2),
            5.02,
            0.25,
            4.45,
            mats,
            0.16,
        )
        safe_radius = 4.95
        safe_x = math.sin(angle) * safe_radius
        safe_y = -math.cos(angle) * safe_radius
        if index not in (5, 6):
            for row in range(4):
                safe = radial_panel(
                    "vault-interior-360-completion-gilded-safe-deposit-box",
                    angle,
                    safe_radius,
                    0.86 + row * 0.46,
                    (0.58, 0.13, 0.32),
                    mats["dark_gold"] if (row + index) % 3 == 0 else mats["blue_light"],
                    0.025,
                )
                safe["depositBay"] = index
        sphere(
            "vault-interior-360-completion-safe-bay-jewel-marker",
            (safe_x, safe_y, 3.48),
            (0.11, 0.08, 0.16),
            (mats["ruby"], mats["cyan"], mats["emerald"])[index % 3],
            16,
            8,
        )

    upper_bays = 10
    for index in range(upper_bays):
        angle = start + (end - start) * (index + 0.5) / upper_bays
        radial_panel(
            f"vault-interior-360-completion-upper-gallery-blue-bay-{index:02d}",
            angle,
            5.16,
            5.62,
            (0.88, 0.34, 1.72),
            mats["blue_light"],
        )
        sphere(
            "vault-interior-360-completion-upper-gallery-jewel-light",
            (math.sin(angle) * 4.92, -math.cos(angle) * 4.92, 5.72),
            (0.12, 0.08, 0.18),
            mats["cyan"] if index % 2 == 0 else mats["ruby"],
            18,
            9,
        )

    inward_dome(
        "vault-interior-360-completion-coffered-rotunda-vault",
        5.22,
        2.65,
        6.86,
        mats["blue"],
        mats["gold"],
        start=start,
        end=end,
        segments=54,
        rings=12,
        add_oculus=False,
    )
    dome_coffer_rings("vault-interior-360-completion-coffered-rotunda-vault", 5.22, 2.65, 6.86, mats, start, end)
    build_vault_side_guardian(-1, mats)
    build_vault_side_guardian(1, mats)

    entry_angle = math.pi
    radial_panel("vault-interior-360-completion-entry-vestibule-blue-door", entry_angle, 4.91, 2.18, (2.58, 0.42, 4.02), mats["blue_light"])
    entry_arch = arch_frame(
        "vault-interior-360-completion-entry-vestibule-gold-arch",
        (0, 5.2, 0.3),
        2.62,
        2.35,
        1.31,
        0.13,
        mats["gold"],
        -entry_angle,
    )
    entry_arch.rotation_euler[2] = -entry_angle
    for side in (-1, 1):
        box(
            "vault-interior-360-completion-entry-vestibule-door-leaf",
            (side * 0.61, 4.62, 2.16),
            (1.12, 0.22, 3.7),
            mats["blue_light"],
            bevel_amount=0.055,
        )
        box(
            "vault-interior-360-completion-entry-vestibule-gold-door-stile",
            (side * 1.25, 4.48, 2.18),
            (0.13, 0.12, 4.12),
            mats["gold"],
            bevel_amount=0.025,
        )
        for stud_z in (0.72, 1.42, 2.12, 2.82, 3.52):
            sphere(
                "vault-interior-360-completion-entry-vestibule-gold-door-stud",
                (side * 0.61, 4.46, stud_z),
                (0.075, 0.045, 0.075),
                mats["gold"],
                14,
                7,
            )
    box(
        "vault-interior-360-completion-entry-vestibule-gold-lintel",
        (0, 4.48, 4.18),
        (2.7, 0.14, 0.16),
        mats["gold"],
        bevel_amount=0.035,
    )
    box(
        "vault-interior-360-completion-entry-vestibule-gold-center-seam",
        (0, 4.44, 2.17),
        (0.105, 0.1, 3.78),
        mats["gold"],
        bevel_amount=0.022,
    )
    for side in (-1, 1):
        cylinder(
            "vault-interior-360-completion-entry-vestibule-guard-column",
            (side * 1.62, 4.86, 2.2),
            0.19,
            4.05,
            mats["marble_light"],
            28,
        )
        cylinder(
            "vault-interior-360-completion-entry-vestibule-gold-column-capital",
            (side * 1.62, 4.86, 4.18),
            0.31,
            0.16,
            mats["gold"],
            28,
        )
    torus(
        "vault-interior-360-completion-entry-vestibule-sovereign-seal",
        (0, 4.38, 4.72),
        0.42,
        0.08,
        mats["gold"],
        rotation=(math.pi / 2, 0, 0),
        major_segments=44,
    )
    sphere("vault-interior-360-completion-entry-vestibule-seal-gem", (0, 4.3, 4.72), (0.2, 0.07, 0.2), mats["cyan"], 22, 11)
    sphere("vault-interior-360-completion-entry-vestibule-jewel-lock", (0, 4.3, 2.18), (0.2, 0.08, 0.2), mats["ruby"], 22, 11)


def build_vault():
    clear_scene()
    mats = materials()
    root = bpy.data.objects.new("vault-interior-blender-museum-v026", None)
    bpy.context.collection.objects.link(root)

    cylinder("vault-interior-polished-floor", (0, 0, -0.1), 5.72, 0.28, mats["marble_light"], 112)
    cylinder("vault-interior-midnight-compass-inset", (0, 0.32, 0.05), 4.62, 0.045, mats["blue"], 112)
    torus("vault-interior-floor-gold-ring", (0, 0.32, 0.09), 4.58, 0.065, mats["gold"])
    torus("vault-interior-floor-silver-ring", (0, 0.32, 0.105), 4.34, 0.026, mats["silver"])
    torus("vault-interior-floor-inner-gold-ring", (0, 0.72, 0.11), 1.42, 0.055, mats["gold"])
    for index in range(24):
        angle = index / 24 * math.pi * 2
        box(
            "vault-interior-floor-sunburst-inlay",
            (math.sin(angle) * 2.52, math.cos(angle) * 2.52 + 0.32, 0.1),
            (0.05, 2.42, 0.03),
            mats["gold"] if index % 3 else mats["silver"],
            rotation=(0, 0, -angle),
            bevel_amount=0.006,
        )

    for index in range(19):
        angle = -1.37 + index * (2.74 / 18)
        radial_panel("vault-interior-curved-rear-wall", angle, 5.48, 3.38, (1.02, 0.58, 6.82), mats["marble"], 0.03)
        radial_panel("vault-interior-deep-sapphire-wall-reveal", angle, 5.2, 3.3, (0.64, 0.1, 6.16), mats["blue_light"], 0.02)
    radial_gallery_slab("vault-interior-first-tall-floor", 4.93, 4.45, mats, -1.29, 1.29, 15, 0.92)
    curve_tube("vault-interior-first-tall-floor-balcony", arc_points(4.42, 4.48, -1.3, 1.3), 0.17, mats["marble_light"])
    curve_tube("vault-interior-first-tall-floor-gold-cornice", arc_points(4.36, 4.62, -1.3, 1.3), 0.075, mats["gold"])
    curve_tube("vault-interior-upper-crown-cornice", arc_points(5.18, 6.7, -1.34, 1.34), 0.16, mats["marble_light"])
    curve_tube("vault-interior-upper-crown-gold-band", arc_points(5.11, 6.84, -1.34, 1.34), 0.08, mats["gold"])

    angles = [-1.28, -0.92, -0.58, -0.2, 0.2, 0.58, 0.92, 1.28]
    for index, angle in enumerate(angles):
        build_display_bay(index, angle, 3.48, mats)

    for index in range(7):
        angle = -1.16 + index * (2.32 / 6)
        radial_panel(
            f"vault-interior-upper-museum-blue-bay-{index:02d}",
            angle,
            5.16,
            5.62,
            (0.9, 0.34, 1.72),
            mats["blue_light"],
        )
        ux = math.sin(angle) * 5.16
        uy = -math.cos(angle) * 5.16
        upper_frame = arch_frame(
            f"vault-interior-upper-museum-ivory-arch-{index:02d}",
            (ux, uy - 0.18, 4.68),
            1.0,
            1.02,
            0.5,
            0.075,
            mats["marble_light"],
            -angle,
        )
        upper_frame.rotation_euler[2] = -angle
        sphere(
            "vault-interior-upper-gallery-warm-cove-lamp",
            (math.sin(angle) * 4.92, -math.cos(angle) * 4.92, 4.88),
            (0.11, 0.08, 0.16),
            mats["warm"],
            16,
            8,
        )

    # Central inspection stage remains free so selected treasures can animate into it.
    cylinder("vault-interior-central-inspection-dais", (0, 0.82, 0.16), 1.08, 0.3, mats["marble_light"], 72)
    cylinder("vault-interior-central-inspection-enamel", (0, 0.82, 0.35), 0.82, 0.1, mats["blue"], 72)
    torus("vault-interior-central-inspection-gold-ring", (0, 0.82, 0.42), 0.82, 0.055, mats["gold"])
    torus("vault-interior-central-inspection-silver-ring", (0, 0.82, 0.43), 0.67, 0.022, mats["silver"])
    build_vault_door(mats)
    build_collection_wing(-1, mats)
    build_collection_wing(1, mats)

    # A shallow coffered ceiling keeps the room grand without hiding the rear museum bays.
    inward_dome("vault-interior-coffered-rotunda-vault", 5.22, 2.65, 6.86, mats["blue"], mats["gold"], start=-1.36, end=1.36, segments=44, rings=12)
    dome_coffer_rings("vault-interior-coffered-rotunda-vault", 5.22, 2.65, 6.86, mats, -1.34, 1.34)
    build_vault_360_completion(mats)
    for index in range(7):
        angle = -0.99 + index * 0.33
        x = math.sin(angle) * 4.86
        y = -math.cos(angle) * 4.86
        sphere("vault-interior-upper-gallery-jewel-light", (x, y, 5.72), (0.14, 0.08, 0.2), mats["cyan"] if index % 2 == 0 else mats["ruby"], 18, 9)

    batch_static_architecture("vault-museum")
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
    target = os.environ.get("VAULT_INTERIOR_ASSET", "all")
    if target in ("all", "atrium"):
        build_atrium()
    if target in ("all", "museum"):
        build_vault()


if __name__ == "__main__":
    main()
