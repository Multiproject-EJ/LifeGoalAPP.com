"""Build the approved hand-authored Blender assets for Vault Island.

The script intentionally owns visible form and material surfaces. Three.js keeps
runtime concerns such as loading, interaction, unlock state, and animation.
"""

import math
import os
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEV_ROOT = PROJECT_ROOT / "public/assets/dev/vault-island-lab"
PRODUCTION_ROOT = PROJECT_ROOT / "public/assets/islands/special/vault-island"
WORK_ROOT = PROJECT_ROOT / "work/vault-island-interior/blender"
MUSEUM_VERSION = "v031"
CROWN_VERSION = "v002"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def principled(name, color, metallic=0.0, roughness=0.35, transmission=0.0, emission=None, emission_strength=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1.0)
    node = material.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1.0)
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    transmission_input = node.inputs.get("Transmission Weight") or node.inputs.get("Transmission")
    if transmission_input:
        transmission_input.default_value = transmission
    if emission is not None:
        emission_input = node.inputs.get("Emission Color") or node.inputs.get("Emission")
        if emission_input:
            emission_input.default_value = (*emission, 1.0)
        strength_input = node.inputs.get("Emission Strength")
        if strength_input:
            strength_input.default_value = emission_strength
    return material


def museum_materials():
    return {
        "limestone": principled("Handcrafted warm French limestone", (0.63, 0.51, 0.36), roughness=0.46),
        "limestone_light": principled("Handcrafted honed ivory limestone", (0.82, 0.73, 0.56), roughness=0.36),
        "limestone_shadow": principled("Handcrafted carved limestone shadow", (0.31, 0.25, 0.19), roughness=0.5),
        "marble": principled("Handcrafted polished pearl marble", (0.74, 0.67, 0.55), roughness=0.24),
        "gold": principled("Handcrafted polished 22k gold", (0.91, 0.56, 0.055), metallic=1.0, roughness=0.13),
        "antique_gold": principled("Handcrafted antique chased gold", (0.42, 0.22, 0.035), metallic=1.0, roughness=0.23),
        "silver": principled("Handcrafted polished silver", (0.72, 0.77, 0.82), metallic=1.0, roughness=0.16),
        "lapis": principled("Handcrafted lapis enamel", (0.018, 0.075, 0.22), metallic=0.12, roughness=0.16),
        "sapphire": principled("Handcrafted sapphire enamel", (0.012, 0.22, 0.47), metallic=0.08, roughness=0.12),
        "onyx": principled("Handcrafted black onyx", (0.012, 0.016, 0.026), metallic=0.08, roughness=0.12),
        "velvet": principled("Handcrafted midnight royal velvet", (0.025, 0.022, 0.075), roughness=0.72),
        "ruby": principled("Handcrafted ruby gemstone", (0.58, 0.008, 0.035), roughness=0.08, transmission=0.28, emission=(0.12, 0.0, 0.008), emission_strength=0.18),
        "amethyst": principled("Handcrafted amethyst gemstone", (0.31, 0.025, 0.52), roughness=0.08, transmission=0.34, emission=(0.05, 0.0, 0.12), emission_strength=0.2),
        "cyan": principled("Handcrafted luminous aquamarine", (0.01, 0.46, 0.72), roughness=0.06, transmission=0.42, emission=(0.0, 0.12, 0.23), emission_strength=0.45),
        "emerald": principled("Handcrafted emerald gemstone", (0.008, 0.31, 0.12), roughness=0.08, transmission=0.3),
        "pearl": principled("Handcrafted warm pearl", (0.92, 0.86, 0.71), metallic=0.08, roughness=0.2),
        "glass": principled("Handcrafted museum crystal", (0.72, 0.9, 1.0), roughness=0.035, transmission=0.72),
    }


def assign(obj, material):
    obj.data.materials.append(material)
    return obj


def finish(obj, bevel_amount=0.035, bevel_segments=3, smooth=True):
    if bevel_amount > 0:
        modifier = obj.modifiers.new("Handcrafted edge softening", "BEVEL")
        modifier.width = bevel_amount
        modifier.segments = bevel_segments
    if smooth and hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    obj["vaultHandcraftedAsset"] = True
    return obj


def box(name, location, dimensions, material, rotation=(0.0, 0.0, 0.0), bevel_amount=0.035):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material)
    return finish(obj, bevel_amount, 3, False)


def cylinder(name, location, radius, depth, material, vertices=48, rotation=(0.0, 0.0, 0.0), bevel_amount=0.025):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    assign(obj, material)
    return finish(obj, bevel_amount, 3, True)


def sphere(name, location, scale, material, segments=36, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material)
    return finish(obj, 0.008, 2, True)


def ico_gem(name, location, scale, material, subdivision=2, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivision, radius=1.0, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material)
    obj["vaultGemstone"] = True
    return obj


def torus(name, location, major_radius, minor_radius, material, rotation=(0.0, 0.0, 0.0), major_segments=72, minor_segments=12):
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
    assign(obj, material)
    return finish(obj, 0.0, 0, True)


def curve_tube(name, points, radius, material, cyclic=False, resolution=4):
    curve_data = bpy.data.curves.new(name, "CURVE")
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
    assign(obj, material)
    obj["vaultHandcraftedAsset"] = True
    return obj


def radial_transform(angle, radius, z):
    return (math.sin(angle) * radius, -math.cos(angle) * radius, z)


def inward_dome_shell(name, radius, height, base_z, material, start=-1.42, end=1.42, segments=52, rings=16):
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
    mesh_data = bpy.data.meshes.new(name)
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.update()
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    assign(obj, material)
    for polygon in mesh_data.polygons:
        polygon.use_smooth = True
    obj["vaultHandcraftedAsset"] = True
    return obj


def radial_box(name, angle, radius, z, dimensions, material, depth_offset=0.0, bevel_amount=0.035):
    x, y, _ = radial_transform(angle, radius + depth_offset, z)
    return box(name, (x, y, z), dimensions, material, rotation=(0.0, 0.0, -angle), bevel_amount=bevel_amount)


def wall_arch(name, center, width, spring_z, rise, material, tube_radius=0.07, rotation_z=0.0):
    x, y, _ = center
    points = [
        (x - width * 0.5, y, spring_z - 1.75),
        (x - width * 0.5, y, spring_z),
        (x - width * 0.36, y, spring_z + rise * 0.7),
        (x, y, spring_z + rise),
        (x + width * 0.36, y, spring_z + rise * 0.7),
        (x + width * 0.5, y, spring_z),
        (x + width * 0.5, y, spring_z - 1.75),
    ]
    arch = curve_tube(name, points, tube_radius, material)
    arch.rotation_euler[2] = rotation_z
    return arch


def linear_arch_xz(name, center_x, y, floor_z, width, height, material, radius=0.07):
    spring_z = floor_z + height * 0.63
    return curve_tube(name, [
        (center_x - width * 0.5, y, floor_z + 0.16),
        (center_x - width * 0.5, y, spring_z),
        (center_x - width * 0.36, y, floor_z + height * 0.87),
        (center_x, y, floor_z + height),
        (center_x + width * 0.36, y, floor_z + height * 0.87),
        (center_x + width * 0.5, y, spring_z),
        (center_x + width * 0.5, y, floor_z + 0.16),
    ], radius, material)


def linear_arch_yz(name, x, center_y, floor_z, width, height, material, radius=0.07):
    spring_z = floor_z + height * 0.63
    return curve_tube(name, [
        (x, center_y - width * 0.5, floor_z + 0.16),
        (x, center_y - width * 0.5, spring_z),
        (x, center_y - width * 0.36, floor_z + height * 0.87),
        (x, center_y, floor_z + height),
        (x, center_y + width * 0.36, floor_z + height * 0.87),
        (x, center_y + width * 0.5, spring_z),
        (x, center_y + width * 0.5, floor_z + 0.16),
    ], radius, material)


def barrel_vault_shell(name, half_width, length_start, length_end, base_z, rise, material, x_segments=28, y_segments=20):
    vertices = []
    for y_index in range(y_segments + 1):
        y = length_start + (length_end - length_start) * y_index / y_segments
        for x_index in range(x_segments + 1):
            phi = -math.pi / 2 + math.pi * x_index / x_segments
            vertices.append((math.sin(phi) * half_width, y, base_z + math.cos(phi) * rise))
    faces = []
    row = x_segments + 1
    for y_index in range(y_segments):
        for x_index in range(x_segments):
            a = y_index * row + x_index
            b = a + 1
            c = a + row + 1
            d = a + row
            faces.append((a, d, c, b))
    mesh_data = bpy.data.meshes.new(name)
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.update()
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    assign(obj, material)
    for polygon in mesh_data.polygons:
        polygon.use_smooth = True
    obj["vaultHandcraftedAsset"] = True
    return obj


def straight_column(prefix, x, y, base_z, height, mats, radius=0.17):
    cylinder(f"{prefix}-octagonal-stone-socle", (x, y, base_z + 0.13), radius * 1.8, 0.26, mats["limestone_shadow"], 8)
    cylinder(f"{prefix}-solid-gold-base", (x, y, base_z + 0.31), radius * 1.45, 0.12, mats["gold"], 40)
    cylinder(f"{prefix}-honed-limestone-shaft", (x, y, base_z + 0.38 + height * 0.5), radius, height, mats["limestone_light"], 48)
    for flute_index in range(8):
        theta = flute_index / 8 * math.pi * 2
        cylinder(
            f"{prefix}-hand-cut-flute",
            (x + math.cos(theta) * radius * 0.84, y + math.sin(theta) * radius * 0.84, base_z + 0.38 + height * 0.5),
            radius * 0.1,
            height * 0.88,
            mats["limestone_shadow"],
            12,
            bevel_amount=0.004,
        )
    cylinder(f"{prefix}-solid-gold-neck", (x, y, base_z + height + 0.42), radius * 1.4, 0.1, mats["gold"], 40)
    cylinder(f"{prefix}-carved-capital", (x, y, base_z + height + 0.56), radius * 1.95, 0.2, mats["limestone_light"], 8)
    for leaf_index in range(8):
        theta = leaf_index / 8 * math.pi * 2
        ico_gem(
            f"{prefix}-gold-acanthus-leaf",
            (x + math.cos(theta) * radius * 1.55, y + math.sin(theta) * radius * 1.55, base_z + height + 0.57),
            (0.075, 0.035, 0.12),
            mats["gold"],
            1,
            (0.0, 0.0, theta),
        )


def side_display_bay(name, side, center_y, mats, style_index):
    box(f"{name}-deep-lapis-recess", (side * 4.38, center_y, 2.1), (0.34, 1.56, 3.72), mats["lapis"], bevel_amount=0.045)
    box(f"{name}-black-onyx-inner-reveal", (side * 4.18, center_y, 2.08), (0.11, 1.26, 3.24), mats["onyx"], bevel_amount=0.025)
    linear_arch_yz(f"{name}-solid-gold-architectural-arch", side * 4.12, center_y, 0.2, 1.42, 3.56, mats["gold"], 0.075)
    if style_index % 2 == 0:
        ico_gem(f"{name}-crown-jewel", (side * 4.04, center_y, 3.92), (0.08, 0.13, 0.16), mats["cyan"] if style_index % 4 == 0 else mats["amethyst"], 2)
    else:
        box(f"{name}-silver-royal-lintel", (side * 4.05, center_y, 3.78), (0.08, 1.2, 0.1), mats["silver"], bevel_amount=0.018)
    plinth_x = side * 3.42
    cylinder(f"{name}-museum-octagonal-plinth", (plinth_x, center_y, 0.34), 0.55, 0.3, mats["limestone_light"], 8)
    cylinder(f"{name}-museum-lapis-riser", (plinth_x, center_y, 0.57), 0.43, 0.24, mats["lapis"], 8)
    torus(f"{name}-museum-solid-gold-collar", (plinth_x, center_y, 0.71), 0.43, 0.042, mats["gold"], major_segments=48)
    box(f"{name}-museum-accession-plaque", (plinth_x - side * 0.48, center_y, 0.33), (0.08, 0.42, 0.15), mats["antique_gold"], bevel_amount=0.018)


def fluted_column(prefix, angle, radius, base_z, height, mats, shaft_radius=0.17):
    x, y, _ = radial_transform(angle, radius, base_z)
    cylinder(f"{prefix}-stepped-socle", (x, y, base_z + 0.13), shaft_radius * 1.7, 0.26, mats["limestone_shadow"], 40)
    cylinder(f"{prefix}-gold-foot", (x, y, base_z + 0.3), shaft_radius * 1.4, 0.12, mats["gold"], 40)
    cylinder(f"{prefix}-shaft", (x, y, base_z + 0.36 + height * 0.5), shaft_radius, height, mats["limestone_light"], 48)
    for flute_index in range(8):
        theta = flute_index / 8 * math.pi * 2
        flute = cylinder(
            f"{prefix}-deep-hand-cut-flute",
            (x + math.cos(theta) * shaft_radius * 0.82, y + math.sin(theta) * shaft_radius * 0.82, base_z + 0.36 + height * 0.5),
            shaft_radius * 0.12,
            height * 0.9,
            mats["limestone_shadow"],
            12,
            bevel_amount=0.005,
        )
        flute.scale.x = 0.55
    cylinder(f"{prefix}-gold-neck", (x, y, base_z + 0.39 + height), shaft_radius * 1.32, 0.1, mats["gold"], 40)
    cylinder(f"{prefix}-carved-capital", (x, y, base_z + 0.54 + height), shaft_radius * 1.85, 0.2, mats["limestone_light"], 8)
    for leaf_index in range(8):
        theta = leaf_index / 8 * math.pi * 2
        ico_gem(
            f"{prefix}-capital-gold-acanthus-leaf",
            (x + math.cos(theta) * shaft_radius * 1.5, y + math.sin(theta) * shaft_radius * 1.5, base_z + 0.55 + height),
            (0.08, 0.035, 0.13),
            mats["gold"],
            1,
            (0.0, 0.0, theta),
        )


def display_bay(name, angle, width, height, floor_z, mats, style, hero=False):
    radius = 5.16
    x, y, _ = radial_transform(angle, radius, floor_z)
    radial_box(f"{name}-deep-lapis-recess", angle, radius, floor_z + height * 0.5, (width, 0.38, height), mats["lapis"], bevel_amount=0.045)
    radial_box(f"{name}-onyx-shadow-reveal", angle, radius - 0.23, floor_z + height * 0.5, (width - 0.22, 0.13, height - 0.24), mats["onyx"], bevel_amount=0.025)
    for side in (-1, 1):
        pillar_angle = angle + side * width / radius * 0.56
        fluted_column(f"{name}-monumental-pilaster", pillar_angle, radius - 0.15, floor_z, height - 0.42, mats, 0.135 if not hero else 0.17)
    wall_arch(
        f"{name}-layered-gold-arch",
        (x, y - 0.31, floor_z),
        width * 0.84,
        floor_z + height * 0.62,
        height * 0.31,
        mats["gold"],
        0.075 if not hero else 0.1,
        -angle,
    )
    if style == "pediment":
        crown_z = floor_z + height + 0.24
        curve_tube(
            f"{name}-broken-royal-pediment",
            [
                (x - width * 0.48, y - 0.34, crown_z - 0.16),
                (x - width * 0.12, y - 0.34, crown_z + 0.17),
                (x, y - 0.34, crown_z + 0.02),
                (x + width * 0.12, y - 0.34, crown_z + 0.17),
                (x + width * 0.48, y - 0.34, crown_z - 0.16),
            ],
            0.065,
            mats["gold"],
        ).rotation_euler[2] = -angle
    elif style == "gem":
        ico_gem(f"{name}-crown-aquamarine", radial_transform(angle, radius - 0.48, floor_z + height + 0.22), (0.13, 0.09, 0.2), mats["cyan"], 2)
    else:
        radial_box(f"{name}-silver-royal-lintel", angle, radius - 0.4, floor_z + height + 0.08, (width * 0.9, 0.1, 0.12), mats["silver"], bevel_amount=0.02)
    plinth_radius = 3.62 if not hero else 3.78
    px, py, _ = radial_transform(angle, plinth_radius, floor_z)
    cylinder(f"{name}-octagonal-limestone-plinth-base", (px, py, floor_z + 0.13), 0.54 if not hero else 0.66, 0.26, mats["limestone_light"], 8)
    cylinder(f"{name}-lapis-pedestal-riser", (px, py, floor_z + 0.37), 0.42 if not hero else 0.52, 0.28, mats["lapis"], 8)
    torus(f"{name}-solid-gold-pedestal-collar", (px, py, floor_z + 0.53), 0.42 if not hero else 0.52, 0.04, mats["gold"], major_segments=48)
    plaque = radial_box(f"{name}-museum-accession-plaque", angle, plinth_radius - 0.5, floor_z + 0.3, (0.42, 0.08, 0.15), mats["antique_gold"], bevel_amount=0.018)
    plaque["museumBayId"] = name


def build_museum():
    clear_scene()
    mats = museum_materials()
    root = bpy.data.objects.new("vault-museum-handcrafted-blender-v029", None)
    bpy.context.collection.objects.link(root)

    cylinder("vault-museum-handcrafted-polished-marble-floor", (0.0, 0.0, -0.12), 5.82, 0.32, mats["marble"], 128)
    cylinder("vault-museum-handcrafted-lapis-compass-floor", (0.0, 0.36, 0.06), 4.82, 0.055, mats["lapis"], 128)
    torus("vault-museum-handcrafted-outer-gold-floor-moulding", (0.0, 0.36, 0.11), 4.76, 0.07, mats["gold"], major_segments=128)
    torus("vault-museum-handcrafted-inner-silver-floor-moulding", (0.0, 0.36, 0.12), 4.42, 0.028, mats["silver"], major_segments=128)
    for ray_index in range(32):
        angle = ray_index / 32 * math.pi * 2
        box(
            "vault-museum-handcrafted-floor-sunburst-ray",
            (math.sin(angle) * 2.55, math.cos(angle) * 2.55 + 0.36, 0.105),
            (0.038 if ray_index % 2 else 0.06, 2.38, 0.025),
            mats["gold"] if ray_index % 4 else mats["silver"],
            rotation=(0.0, 0.0, -angle),
            bevel_amount=0.004,
        )

    for panel_index in range(23):
        angle = -1.42 + panel_index * (2.84 / 22)
        radial_box("vault-museum-handcrafted-massive-curved-limestone-wall", angle, 5.58, 3.6, (0.82, 0.78, 7.2), mats["limestone"], bevel_amount=0.025)
        if panel_index % 2 == 0:
            radial_box("vault-museum-handcrafted-ashlar-stone-course", angle, 5.14, 1.18 + (panel_index % 3) * 1.36, (0.72, 0.08, 0.08), mats["limestone_shadow"], bevel_amount=0.01)

    # Two very tall floors with a readable balcony datum and upper treasury tier.
    for panel_index in range(19):
        angle = -1.34 + panel_index * (2.68 / 18)
        radial_box("vault-museum-handcrafted-upper-gallery-slab", angle, 4.94, 4.42, (0.88, 1.05, 0.22), mats["limestone_light"], bevel_amount=0.035)
        radial_box("vault-museum-handcrafted-upper-gallery-gold-fascia", angle, 4.37, 4.55, (0.82, 0.07, 0.15), mats["gold"], bevel_amount=0.018)
        radial_box("vault-museum-handcrafted-upper-gallery-deep-shadow-soffit", angle, 4.48, 4.3, (0.84, 0.38, 0.12), mats["limestone_shadow"], bevel_amount=0.015)
    for baluster_index in range(29):
        angle = -1.31 + baluster_index * (2.62 / 28)
        x, y, _ = radial_transform(angle, 4.35, 4.84)
        cylinder("vault-museum-handcrafted-upper-gallery-baluster", (x, y, 4.84), 0.035, 0.58, mats["gold"], 12)
    curve_tube(
        "vault-museum-handcrafted-upper-gallery-heavy-gold-handrail",
        [radial_transform(-1.31 + index * (2.62 / 48), 4.35, 5.15) for index in range(49)],
        0.065,
        mats["gold"],
    )

    bay_specs = [
        ("vault-interior-key-authored-relic-bay", -1.12, 1.0, 2.95, "lintel", False),
        ("vault-interior-compass-authored-relic-bay", -0.75, 1.0, 3.15, "gem", False),
        ("vault-interior-egg-authored-relic-bay", -0.38, 1.08, 3.35, "pediment", False),
        ("vault-interior-crown-authored-relic-bay", 0.0, 1.42, 3.75, "pediment", True),
        ("vault-interior-hourglass-authored-relic-bay", 0.38, 1.08, 3.35, "gem", False),
        ("vault-interior-chalice-authored-relic-bay", 0.75, 1.0, 3.15, "lintel", False),
        ("vault-interior-medallion-authored-relic-bay", 1.12, 1.0, 2.95, "gem", False),
    ]
    for bay_name, angle, width, height, style, hero in bay_specs:
        display_bay(bay_name, angle, width, height, 0.18, mats, style, hero)

    # The Wisdom Crystal owns the upper central bay and proves the second floor is functional.
    display_bay("vault-interior-obelisk-authored-relic-bay", 0.0, 1.36, 1.72, 4.82, mats, "gem", True)

    # Central inspection dais remains clear for the reveal choreography.
    cylinder("vault-museum-handcrafted-central-reveal-dais-base", (0.0, 0.9, 0.17), 1.22, 0.34, mats["limestone_light"], 96)
    cylinder("vault-museum-handcrafted-central-reveal-dais-onyx", (0.0, 0.9, 0.37), 0.94, 0.12, mats["onyx"], 96)
    torus("vault-museum-handcrafted-central-reveal-dais-gold-halo", (0.0, 0.9, 0.45), 0.94, 0.06, mats["gold"], major_segments=96)
    for medallion_index in range(8):
        angle = medallion_index / 8 * math.pi * 2
        ico_gem(
            "vault-museum-handcrafted-central-reveal-dais-gem",
            (math.sin(angle) * 0.76, math.cos(angle) * 0.76 + 0.9, 0.49),
            (0.055, 0.055, 0.08),
            (mats["ruby"], mats["cyan"], mats["emerald"], mats["amethyst"])[medallion_index % 4],
            1,
        )

    # Layered sovereign door at the rear of the second-floor axis.
    door_center = (0.0, -5.36, 2.75)
    cylinder("vault-museum-handcrafted-monumental-door-stone-surround", (0.0, -5.04, 2.75), 2.12, 0.5, mats["limestone_shadow"], 96, rotation=(math.pi / 2, 0.0, 0.0))
    cylinder("vault-museum-handcrafted-monumental-door-solid-gold-frame", door_center, 1.82, 0.42, mats["gold"], 96, rotation=(math.pi / 2, 0.0, 0.0))
    cylinder("vault-museum-handcrafted-monumental-door-lapis-face", (0.0, -5.6, 2.75), 1.58, 0.28, mats["lapis"], 96, rotation=(math.pi / 2, 0.0, 0.0))
    torus("vault-museum-handcrafted-monumental-door-inner-gold-ring", (0.0, -5.77, 2.75), 1.04, 0.09, mats["gold"], rotation=(math.pi / 2, 0.0, 0.0), major_segments=96)
    for bolt_index in range(16):
        theta = bolt_index / 16 * math.pi * 2
        ico_gem(
            "vault-museum-handcrafted-monumental-door-jewel-bolt",
            (math.sin(theta) * 1.29, -5.79, 2.75 + math.cos(theta) * 1.29),
            (0.075, 0.045, 0.075),
            mats["gold"] if bolt_index % 2 else mats["silver"],
            1,
        )
    ico_gem("vault-interior-door-center-gem-dial", (0.0, -5.82, 2.75), (0.36, 0.12, 0.36), mats["cyan"], 3)

    # A continuous shell closes the room; ribs sit beneath it as visible structure.
    inward_dome_shell(
        "vault-museum-handcrafted-enclosed-lapis-vaulted-ceiling",
        5.24,
        1.7,
        6.72,
        mats["lapis"],
    )
    curve_tube(
        "vault-museum-handcrafted-ceiling-heavy-limestone-spring-cornice",
        [radial_transform(-1.4 + index * (2.8 / 64), 5.24, 6.72) for index in range(65)],
        0.16,
        mats["limestone_light"],
    )
    curve_tube(
        "vault-museum-handcrafted-ceiling-solid-gold-spring-moulding",
        [radial_transform(-1.4 + index * (2.8 / 64), 5.13, 6.88) for index in range(65)],
        0.075,
        mats["gold"],
    )
    for rib_index in range(13):
        angle = -1.3 + rib_index * (2.6 / 12)
        curve_tube(
            "vault-museum-handcrafted-deep-vaulted-ceiling-rib",
            [
                radial_transform(angle, 5.15, 6.7),
                radial_transform(angle, 3.75, 7.48),
                radial_transform(angle, 1.85, 8.05),
                (0.0, 0.1, 8.32),
            ],
            0.09 if rib_index % 2 == 0 else 0.055,
            mats["gold"] if rib_index % 2 == 0 else mats["silver"],
        )
    torus("vault-museum-handcrafted-ceiling-oculus-gold-ring", (0.0, 0.1, 8.28), 0.76, 0.11, mats["gold"], major_segments=96)
    sphere("vault-museum-handcrafted-ceiling-oculus-crystal", (0.0, 0.1, 8.24), (0.62, 0.62, 0.16), mats["cyan"], 48, 24)

    export_asset("vault-museum", MUSEUM_VERSION, root)


def build_museum_family_b():
    clear_scene()
    mats = museum_materials()
    root = bpy.data.objects.new("vault-museum-handcrafted-axial-basilica-v031", None)
    bpy.context.collection.objects.link(root)
    root["museumConstructionFamily"] = "handcrafted-axial-treasury-basilica"

    box("vault-museum-basilica-continuous-polished-marble-floor", (0.0, -1.45, -0.12), (9.5, 10.9, 0.32), mats["marble"], bevel_amount=0.055)
    box("vault-museum-basilica-deep-lapis-processional-carpet", (0.0, -1.55, 0.08), (2.28, 9.9, 0.055), mats["lapis"], bevel_amount=0.025)
    for edge in (-1, 1):
        box("vault-museum-basilica-solid-gold-processional-border", (edge * 1.17, -1.55, 0.12), (0.075, 9.95, 0.055), mats["gold"], bevel_amount=0.012)
    for tile_index in range(15):
        y = 2.8 - tile_index * 0.66
        box("vault-museum-basilica-visible-marble-tile-joint", (0.0, y, 0.115), (2.22, 0.025, 0.018), mats["silver"] if tile_index % 3 == 0 else mats["antique_gold"], bevel_amount=0.003)

    for side in (-1, 1):
        box("vault-museum-basilica-massive-side-limestone-wall", (side * 4.62, -1.55, 3.55), (0.58, 10.75, 7.1), mats["limestone"], bevel_amount=0.045)
        box("vault-museum-basilica-side-wall-shadow-sockle", (side * 4.28, -1.55, 0.62), (0.18, 10.4, 1.0), mats["limestone_shadow"], bevel_amount=0.025)
    box("vault-museum-basilica-monumental-rear-limestone-wall", (0.0, -6.02, 3.65), (9.5, 0.64, 7.3), mats["limestone"], bevel_amount=0.045)

    left_bays = [
        ("vault-interior-egg-authored-relic-bay", -4.18),
        ("vault-interior-compass-authored-relic-bay", -1.76),
        ("vault-interior-key-authored-relic-bay", 0.68),
    ]
    right_bays = [
        ("vault-interior-hourglass-authored-relic-bay", -4.18),
        ("vault-interior-chalice-authored-relic-bay", -1.76),
        ("vault-interior-medallion-authored-relic-bay", 0.68),
    ]
    for side, bays in ((-1, left_bays), (1, right_bays)):
        for bay_index, (bay_name, center_y) in enumerate(bays):
            side_display_bay(bay_name, side, center_y, mats, bay_index + (0 if side < 0 else 3))

    column_y_positions = [-5.25, -3.0, -0.58, 1.86]
    for side in (-1, 1):
        for column_index, y in enumerate(column_y_positions):
            straight_column("vault-museum-basilica-monumental-nave-column", side * 3.82, y, 0.18, 3.72, mats, 0.18 if column_index in (0, 3) else 0.16)
        box("vault-museum-basilica-upper-loggia-stone-slab", (side * 3.92, -1.62, 4.35), (1.34, 9.42, 0.25), mats["limestone_light"], bevel_amount=0.04)
        box("vault-museum-basilica-upper-loggia-deep-shadow-soffit", (side * 3.92, -1.62, 4.18), (1.36, 9.44, 0.12), mats["limestone_shadow"], bevel_amount=0.02)
        for baluster_index in range(25):
            y = 2.82 - baluster_index * (8.84 / 24)
            cylinder("vault-museum-basilica-upper-loggia-gold-baluster", (side * 3.25, y, 4.75), 0.035, 0.68, mats["gold"], 12)
        box("vault-museum-basilica-upper-loggia-heavy-gold-handrail", (side * 3.25, -1.6, 5.11), (0.11, 9.02, 0.12), mats["gold"], bevel_amount=0.025)
        box("vault-museum-basilica-upper-loggia-lapis-wall-register", (side * 4.26, -1.62, 5.72), (0.12, 9.08, 1.04), mats["sapphire"], bevel_amount=0.03)
        for upper_bay_index, y in enumerate([-4.55, -2.55, -0.55, 1.45]):
            box("vault-museum-basilica-upper-loggia-illuminated-bay", (side * 4.16, y, 5.76), (0.08, 1.25, 0.82), mats["onyx"], bevel_amount=0.025)
            linear_arch_yz("vault-museum-basilica-upper-loggia-gold-arch", side * 4.07, y, 5.12, 1.12, 1.42, mats["gold"], 0.045)
            ico_gem("vault-museum-basilica-upper-loggia-jewel-light", (side * 3.98, y, 5.83), (0.06, 0.08, 0.11), mats["cyan"] if (upper_bay_index + (0 if side < 0 else 1)) % 2 == 0 else mats["ruby"], 2)

    box("vault-interior-crown-authored-relic-bay-deep-lapis-recess", (0.0, -5.62, 2.2), (1.78, 0.22, 4.15), mats["lapis"], bevel_amount=0.045)
    box("vault-interior-crown-authored-relic-bay-onyx-inner-reveal", (0.0, -5.47, 2.18), (1.48, 0.11, 3.7), mats["onyx"], bevel_amount=0.025)
    linear_arch_xz("vault-interior-crown-authored-relic-bay-triumphal-gold-arch", 0.0, -5.38, 0.2, 1.62, 4.05, mats["gold"], 0.095)
    cylinder("vault-interior-crown-authored-relic-bay-museum-plinth", (0.0, -4.38, 0.36), 0.68, 0.34, mats["limestone_light"], 8)
    cylinder("vault-interior-crown-authored-relic-bay-lapis-riser", (0.0, -4.38, 0.62), 0.53, 0.26, mats["lapis"], 8)
    torus("vault-interior-crown-authored-relic-bay-solid-gold-collar", (0.0, -4.38, 0.77), 0.53, 0.05, mats["gold"], major_segments=64)

    box("vault-interior-obelisk-authored-relic-bay-upper-lapis-recess", (0.0, -5.66, 5.65), (1.65, 0.22, 1.78), mats["sapphire"], bevel_amount=0.04)
    box("vault-interior-obelisk-authored-relic-bay-upper-onyx-reveal", (0.0, -5.5, 5.65), (1.35, 0.1, 1.48), mats["onyx"], bevel_amount=0.025)
    linear_arch_xz("vault-interior-obelisk-authored-relic-bay-upper-gold-arch", 0.0, -5.4, 4.78, 1.48, 1.92, mats["gold"], 0.07)
    cylinder("vault-interior-obelisk-authored-relic-bay-upper-plinth", (0.0, -4.72, 4.88), 0.54, 0.24, mats["limestone_light"], 8)
    torus("vault-interior-obelisk-authored-relic-bay-upper-gold-collar", (0.0, -4.72, 5.02), 0.48, 0.04, mats["gold"], major_segments=56)

    barrel_vault_shell("vault-museum-basilica-high-coffered-lapis-barrel-vault", 4.48, -5.72, 3.18, 6.65, 2.15, mats["lapis"])
    for rib_index in range(9):
        y = -5.55 + rib_index * 1.05
        rib_points = []
        for step in range(25):
            phi = -math.pi / 2 + math.pi * step / 24
            rib_points.append((math.sin(phi) * 4.43, y, 6.67 + math.cos(phi) * 2.12))
        curve_tube("vault-museum-basilica-transverse-solid-gold-vault-rib", rib_points, 0.075 if rib_index % 2 == 0 else 0.05, mats["gold"] if rib_index % 2 == 0 else mats["silver"])
    for side in (-1, 1):
        box("vault-museum-basilica-heavy-limestone-vault-spring", (side * 4.38, -1.35, 6.66), (0.34, 9.0, 0.32), mats["limestone_light"], bevel_amount=0.045)
        box("vault-museum-basilica-solid-gold-vault-spring-band", (side * 4.18, -1.35, 6.75), (0.08, 9.02, 0.12), mats["gold"], bevel_amount=0.02)

    cylinder("vault-museum-basilica-central-reveal-dais-base", (0.0, 0.92, 0.18), 1.15, 0.35, mats["limestone_light"], 96)
    cylinder("vault-museum-basilica-central-reveal-dais-onyx", (0.0, 0.92, 0.4), 0.88, 0.12, mats["onyx"], 96)
    torus("vault-museum-basilica-central-reveal-dais-gold-halo", (0.0, 0.92, 0.48), 0.88, 0.055, mats["gold"], major_segments=96)
    for jewel_index in range(8):
        angle = jewel_index / 8 * math.pi * 2
        ico_gem("vault-museum-basilica-central-reveal-dais-jewel", (math.sin(angle) * 0.72, math.cos(angle) * 0.72 + 0.92, 0.52), (0.05, 0.05, 0.075), (mats["ruby"], mats["cyan"], mats["emerald"], mats["amethyst"])[jewel_index % 4], 1)

    for side in (-1, 1):
        for row in range(5):
            for column in range(2):
                box("vault-museum-basilica-upper-safe-deposit-panel", (side * 4.15, -4.6 + column * 0.62, 5.28 + row * 0.24), (0.08, 0.46, 0.17), mats["antique_gold"] if (row + column) % 2 == 0 else mats["lapis"], bevel_amount=0.014)
                ico_gem("vault-museum-basilica-upper-safe-deposit-knob", (side * 4.08, -4.6 + column * 0.62, 5.28 + row * 0.24), (0.028, 0.028, 0.028), mats["gold"], 1)

    for obj in bpy.context.scene.objects:
        obj["vaultInteriorPart"] = obj.name
    export_asset("vault-museum", MUSEUM_VERSION, root)


def crown_fleur(name, angle, radius, base_z, height, mats, major=False):
    radial = Vector((math.sin(angle), -math.cos(angle), 0.0))
    tangent = Vector((math.cos(angle), math.sin(angle), 0.0))
    center = radial * radius
    base = Vector((center.x, center.y, base_z))
    tip = Vector((center.x, center.y, base_z + height))
    left = base - tangent * (0.105 if major else 0.075)
    right = base + tangent * (0.105 if major else 0.075)
    curve_tube(
        f"{name}-fleur-outline-left",
        [tuple(left), tuple(base + radial * 0.05 + Vector((0, 0, height * 0.35))), tuple(tip)],
        0.035 if major else 0.026,
        mats["gold"],
    )
    curve_tube(
        f"{name}-fleur-outline-right",
        [tuple(right), tuple(base + radial * 0.05 + Vector((0, 0, height * 0.35))), tuple(tip)],
        0.035 if major else 0.026,
        mats["gold"],
    )
    ico_gem(
        f"{name}-fleur-tip-gem",
        tuple(tip),
        (0.055 if major else 0.04, 0.045 if major else 0.034, 0.08 if major else 0.06),
        mats["ruby"] if major else mats["sapphire"],
        2,
        (0.0, 0.0, angle),
    )


def build_crown():
    clear_scene()
    mats = museum_materials()
    root = bpy.data.objects.new("vault-treasure-crown-handcrafted-blender-v001", None)
    bpy.context.collection.objects.link(root)
    root["treasureId"] = "crown"
    root["revealAnchor"] = "pedestal-top"

    # The museum shell owns the pedestal; this asset starts at its contact plane.
    # A broad, weighty coronet is the primary silhouette, not a spherical cage.
    torus("treasure-crown-handcrafted-substantial-royal-circlet", (0.0, 0.0, 0.24), 0.55, 0.095, mats["gold"], major_segments=96, minor_segments=16)
    torus("treasure-crown-handcrafted-lapis-enamel-band", (0.0, 0.0, 0.26), 0.48, 0.055, mats["lapis"], major_segments=96, minor_segments=14)
    torus("treasure-crown-handcrafted-lower-chased-gold-wire", (0.0, 0.0, 0.15), 0.54, 0.027, mats["antique_gold"], major_segments=96)
    torus("treasure-crown-handcrafted-upper-beaded-gold-wire", (0.0, 0.0, 0.34), 0.54, 0.028, mats["gold"], major_segments=96)

    # Velvet is intentionally recessed so the open gold arches remain legible.
    sphere("treasure-crown-handcrafted-recessed-midnight-velvet-cap", (0.0, 0.0, 0.31), (0.43, 0.43, 0.18), mats["velvet"], 64, 32)
    cylinder("treasure-crown-handcrafted-velvet-cap-shadow-cut", (0.0, 0.0, 0.15), 0.45, 0.14, mats["velvet"], 64, bevel_amount=0.01)

    for stone_index in range(16):
        angle = stone_index / 16 * math.pi * 2
        material = (mats["ruby"], mats["sapphire"], mats["pearl"], mats["emerald"])[stone_index % 4]
        radius = 0.505
        ico_gem(
            "treasure-crown-handcrafted-band-set-jewel",
            (math.sin(angle) * radius, -math.cos(angle) * radius, 0.25),
            (0.055 if stone_index % 4 == 0 else 0.043, 0.035, 0.07 if stone_index % 4 == 0 else 0.052),
            material,
            2,
            (math.pi / 2, 0.0, angle),
        )
        sphere(
            "treasure-crown-handcrafted-granulated-gold-bead",
            (math.sin(angle + math.pi / 16) * 0.55, -math.cos(angle + math.pi / 16) * 0.55, 0.16),
            (0.028, 0.028, 0.028),
            mats["gold"],
            18,
            10,
        )

    # Eight open fleurs form a broad coronet; the front and rear points dominate.
    for fleur_index in range(8):
        angle = fleur_index / 8 * math.pi * 2
        crown_fleur(
            "treasure-crown-handcrafted-open-fleur",
            angle,
            0.51,
            0.31,
            0.78 if fleur_index % 4 == 0 else 0.5 if fleur_index % 2 == 0 else 0.37,
            mats,
            fleur_index % 2 == 0,
        )

    # The cross rises from the dominant front fleur, leaving the centre open.
    ico_gem("treasure-crown-handcrafted-front-amethyst-orb", (0.0, -0.51, 1.12), (0.12, 0.07, 0.14), mats["amethyst"], 3)
    cylinder("treasure-crown-handcrafted-front-cross-stem", (0.0, -0.51, 1.32), 0.026, 0.31, mats["gold"], 20)
    box("treasure-crown-handcrafted-front-cross-bar", (0.0, -0.512, 1.34), (0.24, 0.05, 0.055), mats["gold"], bevel_amount=0.012)
    ico_gem("treasure-crown-handcrafted-front-cross-jewel", (0.0, -0.545, 1.46), (0.047, 0.035, 0.065), mats["ruby"], 2)

    # Front authority: a larger amethyst and flanking sapphires face Blender -Y.
    ico_gem("treasure-crown-handcrafted-front-central-amethyst", (0.0, -0.555, 0.31), (0.15, 0.055, 0.2), mats["amethyst"], 3, (math.pi / 2, 0.0, 0.0))
    for side in (-1, 1):
        ico_gem("treasure-crown-handcrafted-front-side-sapphire", (side * 0.29, -0.47, 0.27), (0.075, 0.045, 0.1), mats["sapphire"], 2, (math.pi / 2, 0.0, 0.0))
        curve_tube(
            "treasure-crown-handcrafted-front-filigree-scroll",
            [(side * 0.06, -0.55, 0.4), (side * 0.22, -0.52, 0.59), (side * 0.36, -0.44, 0.43)],
            0.026,
            mats["gold"],
        )

    for obj in bpy.context.scene.objects:
        obj["vaultInteriorPart"] = obj.name
        if obj != root:
            obj["treasureId"] = "crown"
    export_asset("vault-treasure-crown", CROWN_VERSION, root, production_subdir="treasures", production_name="crown.glb")


def export_asset(slug, version, root, production_subdir=None, production_name=None):
    dev_root = DEV_ROOT
    production_root = PRODUCTION_ROOT / production_subdir if production_subdir else PRODUCTION_ROOT
    dev_root.mkdir(parents=True, exist_ok=True)
    production_root.mkdir(parents=True, exist_ok=True)
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    versioned = dev_root / f"{slug}-{version}.glb"
    production = production_root / (production_name or f"{slug}.glb")
    blend = WORK_ROOT / f"{slug}-{version}.blend"
    bpy.context.scene["vaultHandcraftedVersion"] = version
    bpy.context.scene["vaultHandcraftedAsset"] = slug
    bpy.context.scene["vaultHandcraftedRoute"] = "user-approved-individual-blender-assets"
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
    print(f"VAULT_HANDCRAFTED_ASSET={slug}")
    print(f"VAULT_HANDCRAFTED_GLB={versioned}")
    print(f"VAULT_HANDCRAFTED_PRODUCTION={production}")
    print(f"VAULT_HANDCRAFTED_BLEND={blend}")
    print(f"VAULT_HANDCRAFTED_OBJECTS={len(bpy.context.scene.objects)}")


def requested_target():
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1 :]
        if args:
            return args[0]
    return os.environ.get("VAULT_HANDCRAFTED_ASSET", "all")


def main():
    target = requested_target()
    if target in ("all", "museum"):
        build_museum_family_b()
    if target in ("all", "crown"):
        build_crown()


if __name__ == "__main__":
    main()
