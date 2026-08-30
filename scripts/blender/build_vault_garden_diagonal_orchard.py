"""Build Vault Garden's camera-matched royal coastal terrace gardens.

The editable blend retains the exact VaultIslandLab phone cameras and their
protected corridor guides. Exported GLBs contain authored geometry and PBR
materials only; Three.js owns the physical sky, lighting, and water motion.
"""

import math
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_vault_handcrafted_assets import (
    assign,
    box,
    clear_scene,
    curve_tube,
    cylinder,
    ico_gem,
    principled,
    sphere,
    torus,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEV_ROOT = PROJECT_ROOT / "public/assets/dev/vault-island-lab"
PRODUCTION_ROOT = PROJECT_ROOT / "public/assets/islands/special/vault-island"
WORK_ROOT = PROJECT_ROOT / "work/vault-island-interior/blender"

VERSION = "v008"
ROUTE = "sunset-cliff-palace-gardens-v008"
PHONE_WIDTH = 390
PHONE_HEIGHT = 844
GUIDE_COLLECTION_NAME = "VAULT_GARDEN_DIAGONAL_ORCHARD_CAMERA_GUIDES_DO_NOT_EXPORT"

# Exact VaultIslandLab Garden Gallery presets in Three.js coordinates.
RUNTIME_CAMERAS = {
    "front": {
        "fov": 52.0,
        "position": (0.15, 6.8, 10.8),
        "target": (0.0, 1.15, -4.8),
    },
    "left": {
        "fov": 52.0,
        "position": (-2.55, 6.35, 9.45),
        "target": (-0.75, 1.25, -5.65),
    },
    "right": {
        "fov": 52.0,
        "position": (2.55, 6.35, 9.45),
        "target": (0.75, 1.25, -5.65),
    },
}


def reset_scene():
    """Make reruns deterministic, including reruns from the saved blend."""
    clear_scene()
    for datablocks in (bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def three_to_blender(point):
    """Convert Three.js (X right, Y up, Z forward) to Blender coordinates."""
    x, y, z = point
    return (-x, z, y)


def three_dimensions_to_blender(dimensions):
    x, y, z = dimensions
    return (x, z, y)


def tag(obj, system, runtime_role=None):
    obj["vaultHandcraftedAsset"] = True
    obj["vaultGardenDiagonalOrchardPart"] = obj.name
    obj["vaultGardenDiagonalOrchardSystem"] = system
    obj["constructionRoute"] = ROUTE
    obj["runtimeHideProceduralArchitecture"] = True
    if runtime_role:
        obj["runtimeRole"] = runtime_role
    return obj


def tbox(
    name,
    location,
    dimensions,
    material,
    system="architecture",
    bevel_amount=0.035,
    yaw=0.0,
):
    return tag(
        box(
            name,
            three_to_blender(location),
            three_dimensions_to_blender(dimensions),
            material,
            rotation=(0.0, 0.0, yaw),
            bevel_amount=bevel_amount,
        ),
        system,
    )


def tcylinder(
    name,
    location,
    radius,
    height,
    material,
    system="architecture",
    vertices=48,
    bevel_amount=0.025,
):
    return tag(
        cylinder(
            name,
            three_to_blender(location),
            radius,
            height,
            material,
            vertices,
            bevel_amount=bevel_amount,
        ),
        system,
    )


def tsphere(name, location, scale, material, system="planting", segments=36, rings=20):
    sx, sy, sz = scale
    return tag(
        sphere(
            name,
            three_to_blender(location),
            (sx, sz, sy),
            material,
            segments,
            rings,
        ),
        system,
    )


def ttorus(
    name,
    location,
    major_radius,
    minor_radius,
    material,
    system="architecture",
    major_segments=72,
):
    return tag(
        torus(
            name,
            three_to_blender(location),
            major_radius,
            minor_radius,
            material,
            major_segments=major_segments,
        ),
        system,
    )


def tgem(
    name,
    location,
    scale,
    material,
    system="prosperity-tree",
    subdivision=2,
    yaw=0.0,
):
    sx, sy, sz = scale
    obj = ico_gem(
        name,
        three_to_blender(location),
        (sx, sz, sy),
        material,
        subdivision,
        rotation=(0.0, 0.0, yaw),
    )
    obj["runtimeAnimatedJewel"] = system == "prosperity-tree"
    return tag(obj, system, "jewel-prosperity-leaf" if system == "prosperity-tree" else None)


def tcurve(
    name,
    points,
    radius,
    material,
    system="architecture",
    cyclic=False,
    resolution=4,
    runtime_role=None,
):
    return tag(
        curve_tube(
            name,
            [three_to_blender(point) for point in points],
            radius,
            material,
            cyclic=cyclic,
            resolution=resolution,
        ),
        system,
        runtime_role,
    )


def mesh_from_three(name, vertices, faces, material, system, smooth=False, bevel_amount=0.0):
    mesh_data = bpy.data.meshes.new(name)
    # three_to_blender reflects X, so reverse winding to retain outward normals.
    converted_faces = [tuple(reversed(face)) for face in faces]
    mesh_data.from_pydata([three_to_blender(vertex) for vertex in vertices], [], converted_faces)
    mesh_data.update()
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    assign(obj, material)
    if smooth:
        for polygon in mesh_data.polygons:
            polygon.use_smooth = True
    if bevel_amount > 0.0:
        modifier = obj.modifiers.new("Orchard edge softening", "BEVEL")
        modifier.width = bevel_amount
        modifier.segments = 3
    return tag(obj, system)


def quadratic_path(start, control, end, y, segments=16):
    points = []
    for index in range(segments + 1):
        t = index / segments
        inv = 1.0 - t
        x = inv * inv * start[0] + 2.0 * inv * t * control[0] + t * t * end[0]
        z = inv * inv * start[1] + 2.0 * inv * t * control[1] + t * t * end[1]
        points.append((x, y, z))
    return points


def offset_path(points, distance):
    result = []
    for index, point in enumerate(points):
        previous = points[max(0, index - 1)]
        following = points[min(len(points) - 1, index + 1)]
        tangent_x = following[0] - previous[0]
        tangent_z = following[2] - previous[2]
        tangent_length = math.hypot(tangent_x, tangent_z) or 1.0
        normal_x = -tangent_z / tangent_length
        normal_z = tangent_x / tangent_length
        result.append((point[0] + normal_x * distance, point[1], point[2] + normal_z * distance))
    return result


def ribbon_mesh(name, points, width, thickness, material, system, bevel_amount=0.0, runtime_role=None):
    """Create a closed, extruded ribbon so route water and walks are real meshes."""
    vertices = []
    top_y = points[0][1] + thickness * 0.5
    bottom_y = points[0][1] - thickness * 0.5
    for index, point in enumerate(points):
        previous = points[max(0, index - 1)]
        following = points[min(len(points) - 1, index + 1)]
        tangent_x = following[0] - previous[0]
        tangent_z = following[2] - previous[2]
        tangent_length = math.hypot(tangent_x, tangent_z) or 1.0
        normal_x = -tangent_z / tangent_length
        normal_z = tangent_x / tangent_length
        half_width = width * 0.5
        left_x = point[0] + normal_x * half_width
        left_z = point[2] + normal_z * half_width
        right_x = point[0] - normal_x * half_width
        right_z = point[2] - normal_z * half_width
        vertices.extend(
            (
                (left_x, top_y, left_z),
                (right_x, top_y, right_z),
                (left_x, bottom_y, left_z),
                (right_x, bottom_y, right_z),
            )
        )

    faces = []
    for index in range(len(points) - 1):
        current = index * 4
        following = (index + 1) * 4
        faces.extend(
            (
                (current, following, following + 1, current + 1),
                (current + 2, current + 3, following + 3, following + 2),
                (current, current + 2, following + 2, following),
                (current + 1, following + 1, following + 3, current + 3),
            )
        )
    last = (len(points) - 1) * 4
    faces.extend(((0, 1, 3, 2), (last, last + 2, last + 3, last + 1)))
    obj = mesh_from_three(name, vertices, faces, material, system, bevel_amount=bevel_amount)
    if runtime_role:
        obj["runtimeRole"] = runtime_role
    return obj


def path_joint(name, point, previous, following, width, material, index):
    tangent_x = following[0] - previous[0]
    tangent_z = following[2] - previous[2]
    yaw = math.atan2(tangent_x, tangent_z)
    return tbox(
        f"{name}-{index:02d}",
        (point[0], point[1] + 0.055, point[2]),
        (width, 0.035, 0.065),
        material,
        "diagonal-walks",
        0.008,
        yaw,
    )


def create_runtime_camera(name, spec, guide_collection):
    camera_data = bpy.data.cameras.new(f"vault-garden-orchard-runtime-{name}-camera-data")
    camera_data.sensor_fit = "VERTICAL"
    camera_data.sensor_height = 32.0
    camera_data.lens = camera_data.sensor_height / (
        2.0 * math.tan(math.radians(spec["fov"]) * 0.5)
    )
    camera_data.clip_start = 0.1
    camera_data.clip_end = 80.0
    camera = bpy.data.objects.new(f"vault-garden-orchard-runtime-{name}-camera", camera_data)
    guide_collection.objects.link(camera)

    position = Vector(three_to_blender(spec["position"]))
    target = Vector(three_to_blender(spec["target"]))
    camera.location = position
    camera.rotation_euler = (target - position).to_track_quat("-Z", "Y").to_euler()
    camera["exportToGlb"] = False
    camera["runtimeThreePosition"] = spec["position"]
    camera["runtimeThreeTarget"] = spec["target"]
    camera["runtimeVerticalFovDegrees"] = spec["fov"]
    camera["runtimeAspect"] = PHONE_WIDTH / PHONE_HEIGHT

    target_guide = bpy.data.objects.new(f"vault-garden-orchard-runtime-{name}-target-guide", None)
    target_guide.empty_display_type = "SPHERE"
    target_guide.empty_display_size = 0.16
    target_guide.location = target
    target_guide["exportToGlb"] = False
    target_guide["runtimeGuideRole"] = "camera-target"
    guide_collection.objects.link(target_guide)

    corridor = bpy.data.objects.new(f"vault-garden-orchard-runtime-{name}-protected-corridor", None)
    corridor.empty_display_type = "CUBE"
    corridor.empty_display_size = 1.0
    corridor.location = position.lerp(target, 0.43)
    corridor.rotation_euler = camera.rotation_euler
    corridor.scale = (0.72, 1.56, (position - target).length * 0.42)
    corridor["exportToGlb"] = False
    corridor["cameraClearanceRule"] = "No opaque foreground mass may enter this phone-camera corridor."
    guide_collection.objects.link(corridor)
    return camera


def orchard_materials():
    mats = {
        "limestone_honey": principled(
            "Orchard honey limestone",
            (0.68, 0.54, 0.36),
            roughness=0.44,
        ),
        "limestone_sun": principled(
            "Orchard sunlit warm limestone",
            (0.84, 0.72, 0.52),
            roughness=0.36,
        ),
        "limestone_pale": principled(
            "Orchard pale carved limestone",
            (0.91, 0.84, 0.69),
            roughness=0.31,
        ),
        "limestone_shadow": principled(
            "Orchard deep limestone reveal",
            (0.27, 0.21, 0.15),
            roughness=0.56,
        ),
        "cliff_limestone": principled(
            "Orchard weathered coastal limestone",
            (0.5, 0.39, 0.27),
            roughness=0.72,
        ),
        "cliff_shadow": principled(
            "Orchard weathered cliff shadow",
            (0.19, 0.16, 0.13),
            roughness=0.82,
        ),
        "pearl_marble": principled(
            "Orchard polished pearl marble",
            (0.82, 0.80, 0.75),
            metallic=0.04,
            roughness=0.19,
        ),
        "blue_marble": principled(
            "Orchard deep blue marble",
            (0.018, 0.075, 0.22),
            metallic=0.08,
            roughness=0.15,
        ),
        "blue_marble_light": principled(
            "Orchard veined sapphire marble",
            (0.03, 0.19, 0.42),
            metallic=0.06,
            roughness=0.18,
        ),
        "gold": principled(
            "Orchard restrained polished gold",
            (0.79, 0.45, 0.12),
            metallic=1.0,
            roughness=0.13,
        ),
        "antique_gold": principled(
            "Orchard deep antique gold",
            (0.34, 0.17, 0.045),
            metallic=1.0,
            roughness=0.25,
        ),
        "sapphire": principled(
            "Orchard sapphire architectural accent",
            (0.008, 0.07, 0.27),
            metallic=0.1,
            roughness=0.12,
        ),
        "onyx": principled(
            "Orchard polished dark water reveal",
            (0.006, 0.016, 0.025),
            metallic=0.08,
            roughness=0.11,
        ),
        "soil": principled(
            "Orchard deep garden soil",
            (0.065, 0.038, 0.018),
            roughness=0.92,
        ),
        "foliage_dark": principled(
            "Orchard sculpted cypress emerald",
            (0.012, 0.12, 0.052),
            roughness=0.62,
        ),
        "foliage_mid": principled(
            "Orchard clipped emerald foliage",
            (0.02, 0.25, 0.085),
            roughness=0.56,
        ),
        "foliage_light": principled(
            "Orchard sunlit topiary foliage",
            (0.08, 0.39, 0.14),
            roughness=0.54,
        ),
        "ruby": principled(
            "Orchard cut ruby gemstone",
            (0.55, 0.006, 0.025),
            roughness=0.065,
            transmission=0.34,
            emission=(0.13, 0.0, 0.008),
            emission_strength=0.22,
        ),
        "amethyst": principled(
            "Orchard cut amethyst gemstone",
            (0.27, 0.014, 0.49),
            roughness=0.065,
            transmission=0.38,
            emission=(0.045, 0.0, 0.12),
            emission_strength=0.24,
        ),
        "aquamarine": principled(
            "Orchard cut aquamarine gemstone",
            (0.002, 0.38, 0.62),
            roughness=0.05,
            transmission=0.46,
            emission=(0.0, 0.11, 0.2),
            emission_strength=0.3,
        ),
        "emerald": principled(
            "Orchard cut emerald gemstone",
            (0.002, 0.3, 0.08),
            roughness=0.065,
            transmission=0.36,
        ),
        "diamond": principled(
            "Orchard faceted clear crystal",
            (0.74, 0.9, 0.96),
            roughness=0.025,
            transmission=0.78,
            emission=(0.08, 0.17, 0.2),
            emission_strength=0.16,
        ),
        "flower": principled(
            "Orchard jewel flower planting",
            (0.34, 0.035, 0.24),
            roughness=0.38,
            emission=(0.055, 0.004, 0.035),
            emission_strength=0.08,
        ),
        "cloud_warm": principled(
            "Sunset cliff palace volumetric warm cloud",
            (0.94, 0.72, 0.46),
            roughness=0.88,
            emission=(0.19, 0.075, 0.018),
            emission_strength=0.34,
        ),
        "cloud_pearl": principled(
            "Sunset cliff palace volumetric pearl cloud",
            (0.94, 0.87, 0.75),
            roughness=0.9,
            emission=(0.13, 0.085, 0.045),
            emission_strength=0.22,
        ),
    }
    water = principled(
        "Orchard dark transmissive blue-green water",
        (0.008, 0.19, 0.24),
        metallic=0.02,
        roughness=0.045,
        transmission=0.62,
    )
    water.diffuse_color = (0.008, 0.19, 0.24, 0.84)
    node = water.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (0.008, 0.19, 0.24, 0.84)
    node.inputs["Alpha"].default_value = 0.84
    ior = node.inputs.get("IOR")
    if ior:
        ior.default_value = 1.34
    if hasattr(water, "surface_render_method"):
        try:
            water.surface_render_method = "DITHERED"
        except TypeError:
            pass
    mats["water"] = water
    sea_water = principled(
        "Orchard deep open crystalline sea",
        (0.004, 0.12, 0.2),
        metallic=0.015,
        roughness=0.075,
        transmission=0.48,
    )
    sea_water.diffuse_color = (0.004, 0.12, 0.2, 0.9)
    sea_node = sea_water.node_tree.nodes.get("Principled BSDF")
    sea_node.inputs["Base Color"].default_value = (0.004, 0.12, 0.2, 0.9)
    sea_node.inputs["Alpha"].default_value = 0.9
    sea_ior = sea_node.inputs.get("IOR")
    if sea_ior:
        sea_ior.default_value = 1.333
    if hasattr(sea_water, "surface_render_method"):
        try:
            sea_water.surface_render_method = "DITHERED"
        except TypeError:
            pass
    mats["sea_water"] = sea_water
    return mats


def cypress(name, location, height, radius, material):
    """Create one continuous lathed cypress mass with an irregular profile."""
    x, base_y, z = location
    profile = (
        (0.0, 0.18),
        (0.1, 0.48),
        (0.25, 0.66),
        (0.43, 0.7),
        (0.6, 0.6),
        (0.75, 0.48),
        (0.88, 0.32),
        (0.96, 0.16),
    )
    segments = 24
    vertices = []
    for y_factor, radius_factor in profile:
        for segment in range(segments):
            theta = segment / segments * math.pi * 2.0
            undulation = 1.0 + 0.055 * math.sin(theta * 3.0 + y_factor * 5.0)
            local_radius = radius * radius_factor / 0.7 * undulation
            vertices.append(
                (
                    x + math.cos(theta) * local_radius,
                    base_y + y_factor * height,
                    z + math.sin(theta) * local_radius,
                )
            )
    faces = []
    for ring in range(len(profile) - 1):
        for segment in range(segments):
            following_segment = (segment + 1) % segments
            current = ring * segments + segment
            following = (ring + 1) * segments + segment
            faces.append((current, following, following + (following_segment - segment), current + (following_segment - segment)))
    apex = len(vertices)
    vertices.append((x, base_y + height, z))
    last_ring = (len(profile) - 1) * segments
    for segment in range(segments):
        following_segment = (segment + 1) % segments
        faces.append((last_ring + segment, apex, last_ring + following_segment))
    return mesh_from_three(name, vertices, faces, material, "planting", smooth=True)


def rocky_coastal_mass(name, location, scale, material, phase=0.0):
    """Build one low-poly, fully volumetric cliff mass with broken coastal strata."""
    center_x, base_y, center_z = location
    scale_x, scale_y, scale_z = scale
    rings = (
        (0.0, 0.76),
        (0.18, 1.0),
        (0.45, 0.91),
        (0.72, 0.68),
        (0.94, 0.38),
    )
    segments = 18
    vertices = []
    for ring_index, (height_factor, radius_factor) in enumerate(rings):
        for segment in range(segments):
            angle = segment / segments * math.pi * 2.0
            fracture = (
                1.0
                + 0.12 * math.sin(angle * 3.0 + phase)
                + 0.065 * math.sin(angle * 7.0 - phase * 0.7)
            )
            terrace = 1.0 - 0.035 * (ring_index % 2)
            vertices.append(
                (
                    center_x + math.cos(angle) * scale_x * radius_factor * fracture * terrace,
                    base_y + height_factor * scale_y,
                    center_z + math.sin(angle) * scale_z * radius_factor * fracture,
                )
            )
    faces = []
    for ring_index in range(len(rings) - 1):
        for segment in range(segments):
            following = (segment + 1) % segments
            lower = ring_index * segments + segment
            lower_next = ring_index * segments + following
            upper = (ring_index + 1) * segments + segment
            upper_next = (ring_index + 1) * segments + following
            faces.append((lower, upper, upper_next, lower_next))
    top_center = len(vertices)
    vertices.append((center_x, base_y + scale_y, center_z))
    top_ring = (len(rings) - 1) * segments
    for segment in range(segments):
        following = (segment + 1) % segments
        faces.append((top_ring + segment, top_center, top_ring + following))
    return mesh_from_three(name, vertices, faces, material, "coastal-cliff", smooth=False, bevel_amount=0.045)


def loggia_arch(name, side, center_z, width, height, material):
    x = side * 3.02
    floor_y = 0.54
    spring_y = floor_y + height * 0.58
    points = (
        (x, floor_y + 0.12, center_z - width * 0.5),
        (x, spring_y, center_z - width * 0.5),
        (x, floor_y + height * 0.88, center_z - width * 0.32),
        (x, floor_y + height, center_z),
        (x, floor_y + height * 0.88, center_z + width * 0.32),
        (x, spring_y, center_z + width * 0.5),
        (x, floor_y + 0.12, center_z + width * 0.5),
    )
    return tcurve(name, points, 0.065, material, "palace-loggias", resolution=3)


def build_foundation(mats):
    tbox(
        "vault-garden-orchard-deep-honey-limestone-foundation",
        (0.0, -0.22, -3.68),
        (9.25, 0.44, 16.85),
        mats["limestone_honey"],
        "foundation",
        0.075,
    )
    tbox(
        "vault-garden-orchard-pearl-marble-arrival-apron",
        (0.0, 0.055, 3.72),
        (5.1, 0.15, 1.72),
        mats["pearl_marble"],
        "foundation",
        0.05,
    )
    for side in (-1, 1):
        side_slug = "left" if side < 0 else "right"
        tbox(
            f"vault-garden-orchard-{side_slug}-deep-sapphire-marble-parterre",
            (side * 2.52, 0.085, -1.9),
            (1.82, 0.12, 10.9),
            mats["blue_marble" if side < 0 else "blue_marble_light"],
            "foundation",
            0.045,
        )
        for z in (2.68, 0.2, -2.28, -4.76):
            tbox(
                f"vault-garden-orchard-{side_slug}-parterre-gold-cross-band-{z:+.2f}",
                (side * 2.52, 0.17, z),
                (1.68, 0.035, 0.055),
                mats["gold"],
                "foundation",
                0.008,
            )
    for side in (-1, 1):
        tbox(
            f"vault-garden-orchard-foundation-antique-gold-edge-{side:+d}",
            (side * 4.48, 0.035, -3.68),
            (0.075, 0.08, 16.55),
            mats["antique_gold"],
            "foundation",
            0.012,
        )


def build_water_route(mats):
    main_center = quadratic_path((0.02, 4.3), (-0.04, -0.25), (0.0, -3.55), 0.22, 20)
    left_center = quadratic_path((0.0, -3.55), (-0.7, -6.0), (-2.3, -8.8), 0.27, 22)
    right_center = quadratic_path((0.0, -3.55), (0.76, -6.2), (2.3, -9.2), 0.29, 24)
    route_specs = (
        ("entry", main_center, 0.9, 0.7),
        ("left-fountain", left_center, 0.82, 0.64),
        ("right-tree", right_center, 0.78, 0.6),
    )
    for phase, (slug, centerline, bed_width, water_width) in enumerate(route_specs):
        bed = ribbon_mesh(
            f"vault-garden-orchard-{slug}-continuous-onyx-channel-bed",
            [(x, y - 0.055, z) for x, y, z in centerline],
            bed_width,
            0.18,
            mats["onyx"],
            "water-route",
            0.025,
        )
        bed["waterRouteBranch"] = slug
        water = ribbon_mesh(
            f"vault-garden-orchard-{slug}-real-blue-green-water-mesh",
            centerline,
            water_width,
            0.065,
            mats["water"],
            "water-route",
            0.018,
            "animated-channel-water-surface",
        )
        water["waterPhase"] = 0.35 + phase * 0.57
        water["waterRouteBranch"] = slug

    # The compass is submerged beneath one continuous water chamber. It remains
    # ceremonial without interrupting the navigable canal silhouette.
    tcylinder(
        "vault-garden-coastal-canal-split-blue-marble-chamber",
        (0.0, 0.08, -3.55),
        1.06,
        0.18,
        mats["blue_marble"],
        "water-route",
        72,
        0.025,
    )
    split_water = tcylinder(
        "vault-garden-coastal-canal-split-real-blue-green-water-mesh",
        (0.0, 0.255, -3.55),
        0.92,
        0.075,
        mats["water"],
        "water-route",
        72,
        0.012,
    )
    split_water["waterPhase"] = 1.08
    ttorus(
        "vault-garden-coastal-canal-split-solid-gold-engineered-ring",
        (0.0, 0.3, -3.55),
        1.01,
        0.042,
        mats["gold"],
        "water-route",
        84,
    )
    tcylinder(
        "vault-garden-coastal-canal-split-sapphire-compass-medallion",
        (0.0, 0.195, -3.55),
        0.68,
        0.035,
        mats["blue_marble"],
        "water-route",
        72,
        0.012,
    )
    for ray_index in range(8):
        angle = ray_index / 8.0 * math.pi * 2.0
        length = 0.58 if ray_index % 2 == 0 else 0.42
        tcurve(
            f"vault-garden-coastal-canal-split-compass-ray-{ray_index + 1:02d}",
            (
                (0.0, 0.215, -3.55),
                (math.sin(angle) * length, 0.215, -3.55 + math.cos(angle) * length),
            ),
            0.025 if ray_index % 2 == 0 else 0.018,
            mats["gold"],
            "water-route",
            resolution=2,
        )
    tgem(
        "vault-garden-coastal-canal-split-medallion-center-jewel",
        (0.0, 0.275, -3.55),
        (0.11, 0.075, 0.11),
        mats["aquamarine"],
        "water-route",
        2,
    )

    return left_center, right_center


def build_diagonal_walks(mats, left_water, right_water):
    # Separate outer-bank walks never cross the canal or one another in phone views.
    left_walk = quadratic_path((-1.34, 4.08), (-1.48, -1.0), (-3.2, -8.28), 0.31, 24)
    right_walk = quadratic_path((1.34, 4.08), (1.48, -1.2), (3.2, -8.7), 0.31, 24)
    walk_specs = (
        ("left-fountain-walk", left_walk, mats["blue_marble"]),
        ("right-prosperity-walk", right_walk, mats["blue_marble_light"]),
    )
    for slug, centerline, inlay_material in walk_specs:
        ribbon_mesh(
            f"vault-garden-orchard-{slug}-broad-pearl-marble-slab",
            [(x, y + 0.015, z) for x, y, z in centerline],
            1.1,
            0.18,
            mats["pearl_marble"],
            "diagonal-walks",
            0.035,
        )
        ribbon_mesh(
            f"vault-garden-orchard-{slug}-continuous-sapphire-marble-inlay",
            [(x, y + 0.12, z) for x, y, z in centerline],
            0.64,
            0.035,
            inlay_material,
            "diagonal-walks",
            0.015,
        )
        for edge_index, distance in enumerate((-0.49, 0.49)):
            ribbon_mesh(
                f"vault-garden-orchard-{slug}-continuous-gold-edge-{edge_index + 1}",
                [(x, y + 0.12, z) for x, y, z in offset_path(centerline, distance)],
                0.065,
                0.045,
                mats["gold" if edge_index == 0 else "antique_gold"],
                "diagonal-walks",
                0.008,
            )
        for joint_index, path_index in enumerate((3, 7, 11, len(centerline) - 3)):
            path_joint(
                f"vault-garden-orchard-{slug}-broad-gold-joint",
                centerline[path_index],
                centerline[path_index - 1],
                centerline[path_index + 1],
                0.98,
                mats["gold"],
                joint_index + 1,
            )


def build_tall_split_palace_cloisters(mats):
    """Frame the route with two tall palace wings while leaving the sea axis open."""
    bay_centers = (3.05, 0.95, -1.15, -3.25, -5.35, -7.45, -9.35)
    for side in (-1, 1):
        side_slug = "left" if side < 0 else "right"
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-walkable-cloister-plinth",
            (side * 3.62, 0.25, -2.65),
            (1.48, 0.5, 14.65),
            mats["limestone_sun"],
            "palace-loggias",
            0.055,
        )
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-tall-outer-palace-spine",
            (side * 4.16, 2.75, -2.65),
            (0.42, 5.0, 14.65),
            mats["limestone_honey"],
            "palace-loggias",
            0.04,
        )
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-continuous-coffered-cloister-roof",
            (side * 3.58, 5.55, -2.65),
            (1.62, 0.42, 14.9),
            mats["limestone_pale"],
            "palace-loggias",
            0.045,
        )
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-continuous-pearl-entablature",
            (side * 3.12, 5.25, -2.65),
            (0.5, 0.38, 14.72),
            mats["pearl_marble"],
            "palace-loggias",
            0.035,
        )
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-continuous-gold-entablature-band",
            (side * 2.85, 5.36, -2.65),
            (0.075, 0.09, 14.75),
            mats["gold"],
            "palace-loggias",
            0.012,
        )

        # Deep front and rear returns keep the long open colonnades volumetric.
        for return_slug, return_z in (("front", 4.38), ("rear", -10.05)):
            tbox(
                f"vault-garden-royal-terrace-{side_slug}-{return_slug}-deep-roof-return",
                (side * 3.46, 5.55, return_z),
                (2.0, 0.42, 0.9),
                mats["limestone_pale"],
                "palace-loggias",
                0.04,
            )
            tbox(
                f"vault-garden-royal-terrace-{side_slug}-{return_slug}-walkable-plinth-return",
                (side * 3.46, 0.25, return_z),
                (2.0, 0.5, 0.76),
                mats["limestone_sun"],
                "palace-loggias",
                0.045,
            )

        for coffer_index, z in enumerate((3.15, 1.0, -1.15, -3.3, -5.45, -7.6, -9.35)):
            tbox(
                f"vault-garden-royal-terrace-{side_slug}-sapphire-roof-coffer-{coffer_index + 1:02d}",
                (side * 3.55, 5.31, z),
                (0.92, 0.055, 1.35),
                mats["sapphire"],
                "palace-loggias",
                0.018,
            )

        for column_index, z in enumerate((4.0, 2.0, 0.0, -2.0, -4.0, -6.0, -8.0, -9.8)):
            x = side * 3.02
            tcylinder(
                f"vault-garden-royal-terrace-{side_slug}-column-{column_index + 1:02d}-limestone-base",
                (x, 0.48, z),
                0.3,
                0.32,
                mats["limestone_honey"],
                "palace-loggias",
                32,
            )
            tcylinder(
                f"vault-garden-royal-terrace-{side_slug}-column-{column_index + 1:02d}-pearl-shaft",
                (x, 2.82, z),
                0.18,
                4.5,
                mats["pearl_marble"],
                "palace-loggias",
                40,
            )
            tcylinder(
                f"vault-garden-royal-terrace-{side_slug}-column-{column_index + 1:02d}-gold-capital",
                (x, 5.1, z),
                0.31,
                0.2,
                mats["gold"],
                "palace-loggias",
                32,
            )

        for arch_index, z in enumerate(bay_centers):
            tcurve(
                f"vault-garden-royal-terrace-{side_slug}-open-gold-arch-{arch_index + 1:02d}",
                (
                    (side * 3.02, 0.66, z - 0.78),
                    (side * 3.02, 3.72, z - 0.78),
                    (side * 3.02, 4.72, z),
                    (side * 3.02, 3.72, z + 0.78),
                    (side * 3.02, 0.66, z + 0.78),
                ),
                0.065,
                mats["gold" if arch_index % 2 == 0 else "antique_gold"],
                "palace-loggias",
                resolution=3,
            )

        # Each wing terminates in a taller coastal belvedere rather than a rear wall.
        pavilion_x = side * 4.75
        pavilion_z = -11.6 + (0.3 if side < 0 else -0.3)
        for deck_index, (deck_y, deck_width, deck_depth) in enumerate(
            ((0.72, 3.4, 3.2), (1.4, 3.0, 2.8), (2.05, 2.62, 2.45))
        ):
            tbox(
                f"vault-garden-royal-terrace-{side_slug}-belvedere-walkable-step-{deck_index + 1}",
                (pavilion_x, deck_y - 0.24, pavilion_z),
                (deck_width, 0.48, deck_depth),
                mats[("limestone_honey", "limestone_sun", "pearl_marble")[deck_index]],
                "palace-loggias",
                0.07,
            )
        for column_index, (dx, dz) in enumerate(((-0.92, -0.72), (-0.92, 0.72), (0.92, -0.72), (0.92, 0.72))):
            tcylinder(
                f"vault-garden-royal-terrace-{side_slug}-belvedere-column-{column_index + 1:02d}",
                (pavilion_x + dx, 4.38, pavilion_z + dz),
                0.18,
                4.6,
                mats["pearl_marble"],
                "palace-loggias",
                32,
                0.015,
            )
            tcylinder(
                f"vault-garden-royal-terrace-{side_slug}-belvedere-gold-capital-{column_index + 1:02d}",
                (pavilion_x + dx, 6.73, pavilion_z + dz),
                0.31,
                0.22,
                mats["gold"],
                "palace-loggias",
                28,
                0.015,
            )
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-belvedere-open-crown-roof",
            (pavilion_x, 7.05, pavilion_z),
            (2.72, 0.4, 2.42),
            mats["limestone_pale"],
            "palace-loggias",
            0.055,
        )
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-belvedere-solid-gold-cornice",
            (pavilion_x, 6.8, pavilion_z),
            (2.84, 0.12, 2.54),
            mats["gold"],
            "palace-loggias",
            0.018,
        )


def build_royal_coastal_cliff_terraces(mats):
    """Descend both palace wings toward the sea on walkable, volumetric cliffs."""
    terrace_rows = (
        (-10.3, 1.18, 4.9, 3.8),
        (-13.0, 0.62, 5.7, 4.2),
        (-16.2, 0.04, 6.6, 4.8),
    )
    for side in (-1, 1):
        side_slug = "left" if side < 0 else "right"
        for row_index, (z, deck_y, width, depth) in enumerate(terrace_rows):
            center_x = side * (4.65 + row_index * 0.55)
            rocky_coastal_mass(
                f"vault-garden-royal-coast-{side_slug}-terrace-cliff-mass-{row_index + 1:02d}",
                (center_x, -2.25 - row_index * 0.38, z - 0.45),
                (width * 0.72, 3.55 + row_index * 0.45, depth * 0.62),
                mats["cliff_limestone" if row_index < 2 else "cliff_shadow"],
                phase=0.9 * row_index + (0.35 if side > 0 else 1.25),
            )
            tbox(
                f"vault-garden-royal-coast-{side_slug}-walkable-stepped-terrace-{row_index + 1:02d}",
                (center_x, deck_y, z),
                (width, 0.34, depth),
                mats[("limestone_pale", "limestone_sun", "limestone_honey")[row_index]],
                "coastal-terraces",
                0.08,
            )
            tbox(
                f"vault-garden-royal-coast-{side_slug}-terrace-gold-edge-{row_index + 1:02d}",
                (center_x - side * width * 0.5, deck_y + 0.22, z),
                (0.08, 0.1, depth * 0.94),
                mats["gold"],
                "coastal-terraces",
                0.012,
            )
            for planter_index, dz in enumerate((-depth * 0.28, depth * 0.28)):
                plant_x = center_x + side * width * 0.18
                tbox(
                    f"vault-garden-royal-coast-{side_slug}-terrace-planter-{row_index + 1:02d}-{planter_index + 1}",
                    (plant_x, deck_y + 0.25, z + dz),
                    (0.78, 0.38, 0.72),
                    mats["limestone_honey"],
                    "coastal-terraces",
                    0.055,
                )
                cypress(
                    f"vault-garden-royal-coast-{side_slug}-terrace-cypress-{row_index + 1:02d}-{planter_index + 1}",
                    (plant_x, deck_y + 0.42, z + dz),
                    2.45 - row_index * 0.24,
                    0.46,
                    mats["foliage_dark"],
                )


def build_planting_terraces(mats):
    terrace_specs = (
        ("front-left-low", -2.72, 0.3, 1.15, 0.86, 1.05, "low"),
        ("front-right-low", 2.72, 0.32, 0.45, 0.86, 1.05, "low"),
        ("middle-left-low", -2.76, 0.42, -2.05, 0.96, 1.4, "low"),
        ("middle-right-cypress", 2.86, 0.54, -3.95, 1.02, 1.62, "cypress"),
        ("fountain-side-grove", -3.5, 0.68, -6.55, 1.2, 1.72, "cypress"),
        ("tree-side-grove", 3.58, 0.7, -6.75, 1.2, 1.82, "cypress"),
    )
    for index, (slug, x, deck_y, z, width, depth, planting) in enumerate(terrace_specs):
        stone = (mats["limestone_sun"], mats["limestone_honey"], mats["limestone_pale"])[index % 3]
        tbox(
            f"vault-garden-orchard-{slug}-stepped-limestone-terrace",
            (x, deck_y - 0.18, z),
            (width, 0.42, depth),
            stone,
            "planting",
            0.075,
        )
        tbox(
            f"vault-garden-orchard-{slug}-deep-soil-bed",
            (x, deck_y + 0.075, z),
            (width - 0.18, 0.12, depth - 0.2),
            mats["soil"],
            "planting",
            0.045,
        )

        if planting == "low":
            for plant_index, dx in enumerate((-0.24, 0.24)):
                tsphere(
                    f"vault-garden-orchard-{slug}-low-groundcover-{plant_index + 1}",
                    (x + dx, deck_y + 0.31, z),
                    (0.29, 0.24, 0.42),
                    mats["foliage_mid" if plant_index == 0 else "foliage_light"],
                    "planting",
                    24,
                    12,
                )
                tgem(
                    f"vault-garden-orchard-{slug}-jewel-flower-{plant_index + 1}",
                    (x + dx, deck_y + 0.57, z - 0.05),
                    (0.09, 0.13, 0.08),
                    mats["flower"],
                    "planting",
                    1,
                    plant_index * 0.7,
                )
        elif planting == "cypress":
            tcylinder(
                f"vault-garden-orchard-{slug}-antique-gold-tree-trunk",
                (x, deck_y + 0.58, z - 0.12),
                0.075,
                0.95,
                mats["antique_gold"],
                "planting",
                16,
                0.01,
            )
            cypress(
                f"vault-garden-orchard-{slug}-sculpted-cypress-mass",
                (x, deck_y + 0.42, z - 0.12),
                2.4 if index == 3 else 2.7,
                0.46,
                mats["foliage_dark"],
            )
            tsphere(
                f"vault-garden-orchard-{slug}-low-clipped-hedge-mass",
                (x, deck_y + 0.42, z + 0.68),
                (0.48, 0.34, 0.5),
                mats["foliage_mid"],
                "planting",
                30,
                16,
            )
        elif planting == "topiary":
            tcylinder(
                f"vault-garden-orchard-{slug}-antique-gold-topiary-trunk",
                (x, deck_y + 0.48, z - 0.18),
                0.065,
                0.72,
                mats["antique_gold"],
                "planting",
                16,
                0.01,
            )
            tsphere(
                f"vault-garden-orchard-{slug}-clipped-oval-topiary-mass",
                (x, deck_y + 1.05, z - 0.18),
                (0.49, 0.72, 0.49),
                mats["foliage_light"],
                "planting",
                34,
                18,
            )
            tsphere(
                f"vault-garden-orchard-{slug}-low-emerald-hedge-mass",
                (x, deck_y + 0.42, z + 0.63),
                (0.5, 0.33, 0.54),
                mats["foliage_mid"],
                "planting",
                30,
                16,
            )
        else:
            tsphere(
                f"vault-garden-orchard-{slug}-continuous-clipped-hedge-mass",
                (x, deck_y + 0.48, z),
                (width * 0.38, 0.48, depth * 0.4),
                mats["foliage_mid" if index == 0 else "foliage_dark"],
                "planting",
                34,
                18,
            )
            tsphere(
                f"vault-garden-orchard-{slug}-lighter-topiary-accent",
                (x + (0.2 if x < 0 else -0.2), deck_y + 0.82, z - 0.45),
                (0.34, 0.5, 0.34),
                mats["foliage_light"],
                "planting",
                30,
                16,
            )


def build_left_lotus_fountain(mats):
    center_x = -2.3
    center_z = -8.8
    tcylinder(
        "vault-garden-royal-terrace-left-fountain-monumental-pearl-plinth",
        (center_x, 0.34, center_z),
        1.58,
        0.36,
        mats["pearl_marble"],
        "lotus-fountain",
        64,
        0.04,
    )
    tcylinder(
        "vault-garden-royal-terrace-left-fountain-lower-limestone-basin",
        (center_x, 0.59, center_z),
        1.38,
        0.3,
        mats["limestone_honey"],
        "lotus-fountain",
        64,
        0.035,
    )
    ttorus(
        "vault-garden-royal-terrace-left-fountain-solid-gold-basin-rim",
        (center_x, 0.76, center_z),
        1.25,
        0.06,
        mats["gold"],
        "lotus-fountain",
        72,
    )
    water = tcylinder(
        "vault-garden-royal-terrace-left-fountain-real-water-basin-mesh",
        (center_x, 0.75, center_z),
        1.19,
        0.075,
        mats["water"],
        "water-route",
        64,
        0.012,
    )
    water["runtimeRole"] = "animated-lotus-fountain-water"
    water["waterPhase"] = 2.15

    tcylinder(
        "vault-garden-royal-terrace-left-fountain-sculptural-gold-stem",
        (center_x, 2.33, center_z),
        0.15,
        3.15,
        mats["gold"],
        "lotus-fountain",
        24,
        0.018,
    )
    tier_specs = (
        ("lower", 12, 0.82, 2.62, (0.28, 0.6, 0.17), mats["diamond"]),
        ("middle", 10, 0.58, 3.28, (0.25, 0.68, 0.16), mats["aquamarine"]),
        ("crown", 8, 0.34, 3.98, (0.22, 0.72, 0.15), mats["diamond"]),
    )
    for tier_index, (tier_slug, petal_count, radius, petal_y, petal_scale, crystal_material) in enumerate(tier_specs):
        for petal_index in range(petal_count):
            angle = petal_index / petal_count * math.pi * 2.0 + tier_index * 0.22
            tgem(
                f"vault-garden-royal-terrace-left-fountain-{tier_slug}-crystal-lotus-petal-{petal_index + 1:02d}",
                (
                    center_x + math.sin(angle) * radius,
                    petal_y + 0.055 * (petal_index % 2),
                    center_z + math.cos(angle) * radius,
                ),
                petal_scale,
                crystal_material,
                "lotus-fountain",
                2,
                angle,
            )
            tcurve(
                f"vault-garden-royal-terrace-left-fountain-{tier_slug}-gold-petal-rib-{petal_index + 1:02d}",
                (
                    (center_x, petal_y - 0.32, center_z),
                    (
                        center_x + math.sin(angle) * radius * 0.62,
                        petal_y + 0.04,
                        center_z + math.cos(angle) * radius * 0.62,
                    ),
                ),
                0.024,
                mats["gold"],
                "lotus-fountain",
                resolution=2,
            )
    tgem(
        "vault-garden-royal-terrace-left-fountain-monumental-diamond-lotus-heart",
        (center_x, 4.58, center_z),
        (0.34, 0.58, 0.3),
        mats["diamond"],
        "lotus-fountain",
        3,
    )
    for jet_index in range(6):
        angle = jet_index / 6.0 * math.pi * 2.0
        end_x = center_x + math.sin(angle) * 1.03
        end_z = center_z + math.cos(angle) * 1.03
        tcurve(
            f"vault-garden-royal-terrace-left-fountain-visible-water-jet-{jet_index + 1:02d}",
            (
                (center_x + math.sin(angle) * 0.34, 3.88, center_z + math.cos(angle) * 0.34),
                ((center_x + end_x) * 0.5, 4.45, (center_z + end_z) * 0.5),
                (end_x, 0.83, end_z),
            ),
            0.018,
            mats["water"],
            "water-route",
            resolution=3,
            runtime_role="animated-fountain-water-jet",
        )


def build_right_prosperity_tree(mats):
    center_x = 2.3
    center_z = -9.2
    tcylinder(
        "vault-garden-orchard-right-tree-pale-limestone-basin",
        (center_x, 0.48, center_z),
        1.32,
        0.38,
        mats["limestone_pale"],
        "prosperity-tree",
        84,
        0.04,
    )
    tcylinder(
        "vault-garden-orchard-right-tree-onyx-basin-reveal",
        (center_x, 0.68, center_z),
        1.12,
        0.15,
        mats["onyx"],
        "prosperity-tree",
        84,
        0.018,
    )
    tree_water = tcylinder(
        "vault-garden-orchard-right-tree-real-blue-green-basin-water",
        (center_x, 0.78, center_z),
        1.04,
        0.075,
        mats["water"],
        "water-route",
        84,
        0.012,
    )
    tree_water["runtimeRole"] = "animated-prosperity-basin-water"
    tree_water["waterPhase"] = 1.42
    ttorus(
        "vault-garden-orchard-right-tree-restrained-gold-basin-rim",
        (center_x, 0.84, center_z),
        1.12,
        0.05,
        mats["gold"],
        "prosperity-tree",
        88,
    )

    tcurve(
        "vault-garden-orchard-right-tree-full-sculptural-gold-trunk",
        (
            (center_x, 0.77, center_z),
            (center_x - 0.12, 1.85, center_z + 0.04),
            (center_x + 0.08, 2.85, center_z - 0.05),
            (center_x, 3.55, center_z),
        ),
        0.22,
        mats["gold"],
        "prosperity-tree",
        resolution=4,
    )
    for root_index, (dx, dz) in enumerate(((-0.68, 0.22), (0.58, 0.38), (0.42, -0.52))):
        tcurve(
            f"vault-garden-orchard-right-tree-gold-root-flare-{root_index + 1:02d}",
            (
                (center_x, 0.84, center_z),
                (center_x + dx * 0.45, 0.79, center_z + dz * 0.45),
                (center_x + dx, 0.76, center_z + dz),
            ),
            0.075,
            mats["antique_gold"],
            "prosperity-tree",
            resolution=3,
        )

    branch_tips = (
        (-0.88, 3.25, 0.42),
        (-0.82, 3.82, -0.2),
        (-0.72, 4.34, 0.62),
        (-0.46, 4.68, -0.5),
        (-0.14, 5.0, 0.16),
        (0.24, 4.88, -0.68),
        (0.56, 4.58, 0.58),
        (0.82, 4.2, -0.3),
        (1.06, 3.68, 0.48),
        (1.18, 3.18, -0.42),
        (-0.5, 3.58, -0.74),
        (0.16, 4.05, 0.78),
        (0.64, 3.48, -0.8),
    )
    jewel_materials = (
        mats["aquamarine"],
        mats["emerald"],
        mats["ruby"],
        mats["amethyst"],
    )
    for branch_index, (dx, tip_y, dz) in enumerate(branch_tips):
        branch_base_y = 2.35 + (branch_index % 3) * 0.24
        tcurve(
            f"vault-garden-orchard-right-tree-gold-branch-{branch_index + 1:02d}",
            (
                (center_x, branch_base_y, center_z),
                (center_x + dx * 0.46, tip_y - 0.36, center_z + dz * 0.42),
                (center_x + dx, tip_y, center_z + dz),
            ),
            0.058 if branch_index % 4 == 0 else 0.046,
            mats["gold"],
            "prosperity-tree",
            resolution=3,
        )
        tgem(
            f"vault-garden-orchard-right-tree-terminal-jewel-leaf-{branch_index + 1:02d}",
            (center_x + dx, tip_y, center_z + dz),
            (
                0.21 + 0.025 * (branch_index % 2),
                0.31 + 0.035 * (branch_index % 3),
                0.17 + 0.025 * ((branch_index + 1) % 2),
            ),
            jewel_materials[branch_index % len(jewel_materials)],
            "prosperity-tree",
            2,
            branch_index * 0.53,
        )
        if branch_index % 2 == 0:
            tgem(
                f"vault-garden-orchard-right-tree-inner-jewel-leaf-{branch_index + 1:02d}",
                (
                    center_x + dx * 0.58,
                    tip_y - 0.28,
                    center_z + dz * 0.55 + (0.13 if branch_index % 4 == 0 else -0.13),
                ),
                (0.15, 0.23, 0.12),
                jewel_materials[(branch_index + 2) % len(jewel_materials)],
                "prosperity-tree",
                2,
                branch_index * 0.41,
            )
    tgem(
        "vault-garden-orchard-right-tree-central-prosperity-heart-jewel",
        (center_x + 0.03, 3.62, center_z + 0.08),
        (0.33, 0.44, 0.3),
        mats["amethyst"],
        "prosperity-tree",
        3,
    )


def build_distant_coastal_ridge(name, x_start, x_end, z, base_y, heights, material):
    """Build a smooth, thick distant ridge without radial cap artifacts."""
    count = len(heights)
    vertices = []
    for back_offset in (0.0, -4.8):
        for index, height in enumerate(heights):
            t = index / (count - 1)
            x = x_start + (x_end - x_start) * t
            vertices.append((x, base_y, z + back_offset))
            vertices.append((x, base_y + height, z + back_offset))
    faces = []
    front_offset = 0
    back_offset = count * 2
    for index in range(count - 1):
        front_a = front_offset + index * 2
        front_b = front_offset + (index + 1) * 2
        back_a = back_offset + index * 2
        back_b = back_offset + (index + 1) * 2
        faces.append((front_a, front_b, front_b + 1, front_a + 1))
        faces.append((back_a + 1, back_b + 1, back_b, back_a))
        faces.append((front_a + 1, front_b + 1, back_b + 1, back_a + 1))
    faces.extend(((0, 1, back_offset + 1, back_offset), (count * 2 - 2, back_offset + count * 2 - 2, back_offset + count * 2 - 1, count * 2 - 1)))
    return mesh_from_three(name, vertices, faces, material, "distant-coastal-ridges", smooth=True, bevel_amount=0.08)


def build_open_coastal_horizon(mats):
    """Create a deep sea world with near, middle, and far parallax layers."""
    sea = tbox(
        "vault-garden-coastal-horizon-real-animated-sea-water-mesh",
        (0.0, -0.42, -43.0),
        (72.0, 0.12, 70.0),
        mats["sea_water"],
        "coastal-horizon",
        0.025,
    )
    sea["runtimeRole"] = "animated-open-sea-water"
    sea["waterPhase"] = 2.75

    build_distant_coastal_ridge(
        "vault-garden-sunset-cliff-palace-left-distant-atmospheric-ridge",
        -28.0,
        -2.4,
        -50.0,
        -0.58,
        (0.2, 0.48, 0.92, 1.45, 2.0, 1.62, 1.08, 0.72, 0.35),
        mats["cliff_shadow"],
    )
    build_distant_coastal_ridge(
        "vault-garden-sunset-cliff-palace-right-distant-atmospheric-ridge",
        2.8,
        28.0,
        -54.0,
        -0.62,
        (0.26, 0.62, 1.18, 1.72, 2.28, 1.84, 1.32, 0.76, 0.34),
        mats["cliff_shadow"],
    )


def build_monumental_cliff_palace_depth(mats):
    """Place legible palace terraces at the side thirds of the phone frame."""
    for side in (-1, 1):
        side_slug = "left" if side < 0 else "right"
        palace_x = side * 4.15
        palace_z = -13.85 + (0.35 if side < 0 else -0.35)
        for tier_index, (tier_y, width, depth) in enumerate(
            ((0.9, 5.6, 5.2), (1.62, 4.85, 4.55), (2.28, 4.15, 3.9))
        ):
            tbox(
                f"vault-garden-sunset-cliff-palace-{side_slug}-monumental-stepped-terrace-{tier_index + 1:02d}",
                (palace_x, tier_y, palace_z),
                (width, 0.62, depth),
                mats[("limestone_honey", "limestone_sun", "limestone_pale")[tier_index]],
                "monumental-cliff-palaces",
                0.1,
            )
            tbox(
                f"vault-garden-sunset-cliff-palace-{side_slug}-terrace-gold-belt-{tier_index + 1:02d}",
                (palace_x - side * width * 0.48, tier_y + 0.33, palace_z),
                (0.1, 0.1, depth * 0.92),
                mats["gold"],
                "monumental-cliff-palaces",
                0.015,
            )

        column_offsets = (
            (-1.35, -1.15), (-0.45, -1.15), (0.45, -1.15), (1.35, -1.15),
            (-1.35, 1.15), (1.35, 1.15),
        )
        for column_index, (dx, dz) in enumerate(column_offsets):
            tcylinder(
                f"vault-garden-sunset-cliff-palace-{side_slug}-pearl-column-{column_index + 1:02d}",
                (palace_x + dx, 4.55, palace_z + dz),
                0.19,
                3.9,
                mats["pearl_marble"],
                "monumental-cliff-palaces",
                32,
                0.018,
            )
            tcylinder(
                f"vault-garden-sunset-cliff-palace-{side_slug}-gold-capital-{column_index + 1:02d}",
                (palace_x + dx, 6.52, palace_z + dz),
                0.31,
                0.2,
                mats["gold"],
                "monumental-cliff-palaces",
                28,
                0.014,
            )
        tbox(
            f"vault-garden-sunset-cliff-palace-{side_slug}-pearl-crown-roof",
            (palace_x, 6.83, palace_z),
            (3.55, 0.5, 3.25),
            mats["limestone_pale"],
            "monumental-cliff-palaces",
            0.07,
        )
        tbox(
            f"vault-garden-sunset-cliff-palace-{side_slug}-solid-gold-crown-cornice",
            (palace_x, 6.54, palace_z),
            (3.72, 0.12, 3.42),
            mats["gold"],
            "monumental-cliff-palaces",
            0.018,
        )
        tcylinder(
            f"vault-garden-sunset-cliff-palace-{side_slug}-sapphire-dome-drum",
            (palace_x, 7.3, palace_z),
            0.92,
            0.62,
            mats["blue_marble_light"],
            "monumental-cliff-palaces",
            40,
            0.025,
        )
        tgem(
            f"vault-garden-sunset-cliff-palace-{side_slug}-faceted-sapphire-dome",
            (palace_x, 8.02, palace_z),
            (0.9, 0.78, 0.9),
            mats["blue_marble_light"],
            "monumental-cliff-palaces",
            3,
        )
        for cypress_index, dz in enumerate((-1.72, 1.72)):
            cypress(
                f"vault-garden-sunset-cliff-palace-{side_slug}-terrace-cypress-{cypress_index + 1:02d}",
                (palace_x + side * 1.65, 2.62, palace_z + dz),
                3.4,
                0.5,
                mats["foliage_dark"],
            )


def build_destination_balustrades_and_coastal_steps(mats):
    """Finish the two hero courts without closing the center sea view."""
    for side in (-1, 1):
        side_slug = "left" if side < 0 else "right"
        center_x = side * 3.35
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-destination-low-balustrade-sockle",
            (center_x, 0.58, -9.72),
            (2.0, 0.3, 0.28),
            mats["limestone_pale"],
            "far-palace-fragments",
            0.025,
        )
        for baluster_index in range(5):
            x = center_x + (baluster_index - 2) * 0.34
            tcylinder(
                f"vault-garden-royal-terrace-{side_slug}-destination-gold-baluster-{baluster_index + 1:02d}",
                (x, 0.98, -9.72),
                0.045,
                0.62,
                mats["antique_gold"],
                "far-palace-fragments",
                14,
                0.008,
            )
        tbox(
            f"vault-garden-royal-terrace-{side_slug}-destination-low-gold-handrail",
            (center_x, 1.32, -9.72),
            (2.02, 0.11, 0.13),
            mats["gold"],
            "far-palace-fragments",
            0.015,
        )
        for step_index in range(5):
            step_z = -10.15 - step_index * 0.56
            step_y = 0.42 - step_index * 0.18
            tbox(
                f"vault-garden-royal-terrace-{side_slug}-walkable-coastal-step-{step_index + 1:02d}",
                (side * 4.02, step_y, step_z),
                (1.55, 0.28, 0.62),
                mats["limestone_sun" if step_index % 2 == 0 else "limestone_honey"],
                "coastal-terraces",
                0.045,
            )
            tbox(
                f"vault-garden-royal-terrace-{side_slug}-coastal-step-gold-nosing-{step_index + 1:02d}",
                (side * 4.02, step_y + 0.16, step_z + 0.28),
                (1.48, 0.045, 0.055),
                mats["antique_gold"],
                "coastal-terraces",
                0.008,
            )


def export_scene(scene, root, guide_collection, cameras):
    DEV_ROOT.mkdir(parents=True, exist_ok=True)
    PRODUCTION_ROOT.mkdir(parents=True, exist_ok=True)
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    versioned = DEV_ROOT / "vault-garden-gallery-v008.glb"
    production = PRODUCTION_ROOT / "vault-garden-gallery.glb"
    blend = WORK_ROOT / "vault-garden-sunset-cliff-palace-v008.blend"

    export_objects = []
    guide_names = {obj.name for obj in guide_collection.objects}
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        is_exportable = obj.name not in guide_names and obj.type not in {"CAMERA", "LIGHT"}
        obj.select_set(is_exportable)
        if is_exportable:
            export_objects.append(obj)
            if obj != root:
                obj.parent = root
    bpy.context.view_layer.objects.active = root

    root["estimatedAuthoredObjectCount"] = len(export_objects)
    root["exportVersion"] = VERSION
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.export_scene.gltf(
        filepath=str(versioned),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_attributes=True,
        use_selection=True,
    )
    shutil.copyfile(versioned, production)
    print(f"VAULT_GARDEN_DIAGONAL_ORCHARD_ROUTE={ROUTE}")
    print(f"VAULT_GARDEN_DIAGONAL_ORCHARD_GLB={versioned}")
    print(f"VAULT_GARDEN_DIAGONAL_ORCHARD_PRODUCTION={production}")
    print(f"VAULT_GARDEN_DIAGONAL_ORCHARD_BLEND={blend}")
    print(f"VAULT_GARDEN_DIAGONAL_ORCHARD_CAMERAS={','.join(camera.name for camera in cameras.values())}")
    print(f"VAULT_GARDEN_DIAGONAL_ORCHARD_OBJECTS={len(export_objects)}")


def build_scene():
    reset_scene()
    mats = orchard_materials()
    scene = bpy.context.scene
    scene.render.resolution_x = PHONE_WIDTH
    scene.render.resolution_y = PHONE_HEIGHT
    scene.render.resolution_percentage = 100
    scene["constructionRoute"] = ROUTE
    scene["vaultGardenGalleryRuntimeVersion"] = VERSION
    scene["geometryOnly"] = True
    scene["runtimeOwns"] = "physical-sky,lighting,water-animation"
    scene["authoredSkyGeometry"] = False

    guide_collection = bpy.data.collections.new(GUIDE_COLLECTION_NAME)
    guide_collection.hide_render = True
    scene.collection.children.link(guide_collection)
    cameras = {
        name: create_runtime_camera(name, spec, guide_collection)
        for name, spec in RUNTIME_CAMERAS.items()
    }
    scene.camera = cameras["front"]

    root = bpy.data.objects.new("vault-garden-sunset-cliff-palace-gardens-v008-root", None)
    bpy.context.collection.objects.link(root)
    root["architectureReady"] = True
    root["constructionRoute"] = ROUTE
    root["geometryOnly"] = True
    root["runtimeOwns"] = "physical-sky,lighting,water-animation"
    root["cameraMatched"] = True
    root["sourceRuntimeModel"] = "createVaultTreasureGardenGalleryModel"
    root["replacesRetiredFamilies"] = (
        "centered-rotunda,frontal-belvedere,diagonal-orchard-v005,"
        "coastal-canal-cloister-v006,royal-coastal-terrace-gardens-v007"
    )
    root["protectedCameraNames"] = list(RUNTIME_CAMERAS.keys())
    root["protectedCameraCorridors"] = True
    root["destinationComposition"] = "asymmetric-left-monumental-lotus-fountain-right-prosperity-tree"
    root["centralHorizon"] = (
        "open-deep-real-sea-monumental-side-palaces-smooth-atmospheric-ridges-no-wall-no-backdrop"
    )
    root["mobileLegibilityContract"] = (
        "continuous-water-over-submerged-compass-equal-spaced-hero-destinations-low-foreground"
    )
    root["coastalWorldContract"] = (
        "tall-split-palace-cloisters-walkable-stepped-terraces-monumental-side-palaces-distant-ridges"
    )
    root["goalCompositionReference"] = "v007-royal-coastal-terrace-target-paintover"
    root["retiredFailureEvidence"] = "v195-royal-coastal-terrace-gardens-blockout"
    root["materialStandard"] = "honeycomb-quality-limestone-marble-gold-sapphire-gem-water-pbr"

    build_foundation(mats)
    left_water, right_water = build_water_route(mats)
    build_diagonal_walks(mats, left_water, right_water)
    build_tall_split_palace_cloisters(mats)
    build_royal_coastal_cliff_terraces(mats)
    build_planting_terraces(mats)
    build_left_lotus_fountain(mats)
    build_right_prosperity_tree(mats)
    build_monumental_cliff_palace_depth(mats)
    build_open_coastal_horizon(mats)
    build_destination_balustrades_and_coastal_steps(mats)
    export_scene(scene, root, guide_collection, cameras)


if __name__ == "__main__":
    build_scene()
