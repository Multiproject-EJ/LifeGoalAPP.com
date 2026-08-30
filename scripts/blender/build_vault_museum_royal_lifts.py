"""Build the v041 royal hydraulic lift cloister correction for Vault Museum.

This is an authored, camera-matched environment builder. The editable Blend
retains the frozen phone cameras and clearance guides, while GLB export is
limited to the museum hierarchy and treasure sockets.
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
    principled,
    torus,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEV_ROOT = PROJECT_ROOT / "public/assets/dev/vault-island-lab"
PRODUCTION_ROOT = PROJECT_ROOT / "public/assets/islands/special/vault-island"
WORK_ROOT = PROJECT_ROOT / "work/vault-island-interior/blender"
VERSION = "v041"
CONSTRUCTION_ROUTE = "camera-matched-royal-hydraulic-lift-cloister-v041"

PHONE_WIDTH = 390
PHONE_HEIGHT = 844
PHONE_FOV_DEGREES = 52.0

RUNTIME_CAMERAS = {
    "front": ((0.0, 2.12, 7.62), (0.0, 2.62, -3.32)),
    "left": ((-4.5, 2.42, 6.78), (-1.72, 2.22, -3.02)),
    "right": ((4.5, 2.42, 6.78), (1.72, 2.22, -3.02)),
}

TREASURE_SOCKETS = {
    "crown": (0.0, 0.18, -4.70),
    "egg": (-1.58, 0.18, -4.74),
    "hourglass": (1.58, 0.18, -4.74),
    "key": (-3.32, 0.18, -1.62),
    "medallion": (3.32, 0.18, -1.62),
    "compass": (-1.36, 4.49, -5.18),
    "obelisk": (0.0, 4.49, -5.28),
    "chalice": (1.36, 4.49, -5.18),
}


def three_to_blender(point):
    """Convert Three.js (x right, y up, z depth) to Blender coordinates."""
    x, y, z = point
    return (-x, z, y)


def three_dimensions_to_blender(dimensions):
    x, y, z = dimensions
    return (x, z, y)


def tbox(name, location, dimensions, material, bevel_amount=0.035, rotation_y=0.0):
    return box(
        name,
        three_to_blender(location),
        three_dimensions_to_blender(dimensions),
        material,
        rotation=(0.0, 0.0, -rotation_y),
        bevel_amount=bevel_amount,
    )


def tcylinder(name, location, radius, height, material, vertices=48, bevel_amount=0.025):
    return cylinder(
        name,
        three_to_blender(location),
        radius,
        height,
        material,
        vertices,
        bevel_amount=bevel_amount,
    )


def tcylinder_depth(name, location, radius, depth, material, vertices=48, bevel_amount=0.018):
    """Cylinder with its axle on the Three.js depth axis."""
    return cylinder(
        name,
        three_to_blender(location),
        radius,
        depth,
        material,
        vertices,
        rotation=(math.pi / 2.0, 0.0, 0.0),
        bevel_amount=bevel_amount,
    )


def ttorus(name, location, major_radius, minor_radius, material, major_segments=72):
    return torus(
        name,
        three_to_blender(location),
        major_radius,
        minor_radius,
        material,
        major_segments=major_segments,
    )


def ttorus_vertical(name, location, major_radius, minor_radius, material, major_segments=72):
    """Torus in a Three.js XY plane, readable as a front-facing sheave."""
    return torus(
        name,
        three_to_blender(location),
        major_radius,
        minor_radius,
        material,
        rotation=(math.pi / 2.0, 0.0, 0.0),
        major_segments=major_segments,
    )


def tcurve(name, points, radius, material, cyclic=False):
    return curve_tube(
        name,
        [three_to_blender(point) for point in points],
        radius,
        material,
        cyclic=cyclic,
    )


def reset_scene():
    """Reset generated objects and datablocks so repeated runs stay stable."""
    clear_scene()
    for datablocks in (bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def royal_materials():
    mats = {
        "limestone": principled(
            "Vault v040 honey limestone",
            (0.70, 0.56, 0.35),
            roughness=0.43,
        ),
        "marble": principled(
            "Vault v040 polished pearl marble",
            (0.86, 0.83, 0.76),
            roughness=0.20,
        ),
        "brass": principled(
            "Vault v040 continuous brushed brass",
            (0.54, 0.31, 0.075),
            metallic=1.0,
            roughness=0.27,
        ),
        "gold": principled(
            "Vault v040 polished 22k gold",
            (0.91, 0.57, 0.055),
            metallic=1.0,
            roughness=0.12,
        ),
        "glass": principled(
            "Vault v040 clear low-iron glass",
            (0.78, 0.95, 0.96),
            roughness=0.035,
            transmission=0.94,
        ),
        "onyx": principled(
            "Vault v040 polished black onyx",
            (0.008, 0.011, 0.014),
            metallic=0.06,
            roughness=0.11,
        ),
        "lapis": principled(
            "Vault v040 restrained lapis inlay",
            (0.018, 0.065, 0.19),
            metallic=0.10,
            roughness=0.18,
        ),
    }
    glass_node = mats["glass"].node_tree.nodes.get("Principled BSDF")
    if glass_node:
        alpha_input = glass_node.inputs.get("Alpha")
        ior_input = glass_node.inputs.get("IOR")
        if alpha_input:
            alpha_input.default_value = 0.22
        if ior_input:
            ior_input.default_value = 1.45
    mats["glass"].diffuse_color = (0.78, 0.95, 0.96, 0.22)
    return mats


def create_runtime_camera(name, position, target, guide_collection):
    camera_data = bpy.data.cameras.new(f"vault-v040-{name}-phone-camera-data")
    camera_data.sensor_fit = "VERTICAL"
    camera_data.sensor_height = 32.0
    camera_data.lens = camera_data.sensor_height / (
        2.0 * math.tan(math.radians(PHONE_FOV_DEGREES) * 0.5)
    )
    camera_data.clip_start = 0.1
    camera_data.clip_end = 80.0
    camera = bpy.data.objects.new(f"vault-v040-{name}-phone-camera", camera_data)
    guide_collection.objects.link(camera)
    blender_position = Vector(three_to_blender(position))
    blender_target = Vector(three_to_blender(target))
    camera.location = blender_position
    camera.rotation_euler = (blender_target - blender_position).to_track_quat("-Z", "Y").to_euler()
    camera["runtimeThreePosition"] = position
    camera["runtimeThreeTarget"] = target
    camera["runtimeVerticalFovDegrees"] = PHONE_FOV_DEGREES
    camera["runtimeResolution"] = (PHONE_WIDTH, PHONE_HEIGHT)
    camera["exportToGlb"] = False

    corridor = bpy.data.objects.new(f"vault-v040-{name}-protected-corridor", None)
    corridor.empty_display_type = "CUBE"
    corridor.empty_display_size = 1.0
    corridor.location = blender_position.lerp(blender_target, 0.43)
    corridor.rotation_euler = camera.rotation_euler
    corridor.scale = (1.12, 2.05, (blender_position - blender_target).length * 0.44)
    corridor["exportToGlb"] = False
    corridor["cameraClearanceRule"] = (
        "Keep foreground roofs, columns, rails, and opaque masses outside this corridor."
    )
    guide_collection.objects.link(corridor)
    return camera


def barrel_vault(name, half_width, z_start, z_end, spring_y, crown_y, material):
    x_segments = 36
    z_segments = 24
    rise = crown_y - spring_y
    vertices = []
    for z_index in range(z_segments + 1):
        z = z_start + (z_end - z_start) * z_index / z_segments
        for x_index in range(x_segments + 1):
            phi = -math.pi / 2.0 + math.pi * x_index / x_segments
            vertices.append(
                three_to_blender(
                    (math.sin(phi) * half_width, spring_y + math.cos(phi) * rise, z)
                )
            )
    faces = []
    row = x_segments + 1
    for z_index in range(z_segments):
        for x_index in range(x_segments):
            a = z_index * row + x_index
            faces.append((a, a + row, a + row + 1, a + 1))
    mesh_data = bpy.data.meshes.new(name)
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.update()
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    assign(obj, material)
    for polygon in mesh_data.polygons:
        polygon.use_smooth = True
    obj["vaultHandcraftedAsset"] = True
    obj["threeSpringY"] = spring_y
    obj["threeCrownY"] = crown_y
    return obj


def build_processional_floor(mats):
    tbox(
        "vault-v040-continuous-pearl-marble-floor",
        (0.0, -0.12, -1.65),
        (9.7, 0.3, 11.5),
        mats["marble"],
        0.055,
    )
    tbox(
        "vault-v040-restrained-lapis-processional-route-2p35-wide",
        (0.0, 0.055, -1.25),
        (2.35, 0.055, 10.55),
        mats["lapis"],
        0.018,
    )
    for side in (-1, 1):
        tbox(
            f"vault-v040-processional-route-22k-gold-edge-{'left' if side < 0 else 'right'}",
            (side * 1.205, 0.09, -1.25),
            (0.055, 0.035, 10.58),
            mats["gold"],
            0.009,
        )
    for index in range(14):
        z = 3.36 - index * 0.68
        tbox(
            f"vault-v040-processional-route-marble-joint-{index + 1:02d}",
            (0.0, 0.09, z),
            (2.29, 0.018, 0.025),
            mats["brass"],
            0.003,
        )

    # A flush destination medallion keeps the route physically unobstructed.
    tcylinder(
        "vault-v040-unobstructed-inspection-destination-onyx-inlay",
        (0.0, 0.105, 1.98),
        0.92,
        0.026,
        mats["onyx"],
        96,
        0.008,
    )
    ttorus(
        "vault-v040-unobstructed-inspection-destination-gold-ring",
        (0.0, 0.125, 1.98),
        0.78,
        0.045,
        mats["gold"],
        96,
    )


def build_shell(mats):
    tbox(
        "vault-v040-monumental-rear-honey-limestone-wall",
        (0.0, 4.15, -6.15),
        (9.6, 8.3, 0.62),
        mats["limestone"],
        0.055,
    )
    for side in (-1, 1):
        label = "left" if side < 0 else "right"
        tbox(
            f"vault-v040-{label}-honey-limestone-side-return",
            (side * 4.58, 4.1, -4.2),
            (0.52, 8.2, 3.9),
            mats["limestone"],
            0.045,
        )
        tbox(
            f"vault-v040-{label}-onyx-wall-sockle",
            (side * 4.285, 0.58, -4.2),
            (0.09, 1.0, 3.55),
            mats["onyx"],
            0.018,
        )

    for x in (-3.85, -1.95, 0.0, 1.95, 3.85):
        tbox(
            "vault-v040-rear-wall-pearl-marble-vertical-order",
            (x, 4.18, -5.80),
            (0.22, 7.62, 0.14),
            mats["marble"],
            0.025,
        )
        tbox(
            "vault-v040-rear-wall-brass-capital-band",
            (x, 7.68, -5.68),
            (0.42, 0.16, 0.24),
            mats["brass"],
            0.018,
        )

    barrel_vault(
        "vault-v040-pearl-marble-barrel-vault-shell",
        4.42,
        -6.02,
        -1.55,
        7.85,
        9.70,
        mats["marble"],
    )
    for rib_index in range(7):
        z = -5.82 + rib_index * 0.68
        points = []
        for step in range(29):
            phi = -math.pi / 2.0 + math.pi * step / 28.0
            points.append(
                (math.sin(phi) * 4.39, 7.85 + math.cos(phi) * 1.85, z)
            )
        tcurve(
            f"vault-v040-barrel-vault-brushed-brass-rib-{rib_index + 1:02d}",
            points,
            0.055 if rib_index % 2 == 0 else 0.042,
            mats["brass"],
        )
    for side in (-1, 1):
        label = "left" if side < 0 else "right"
        tbox(
            f"vault-v040-{label}-barrel-vault-honey-limestone-spring",
            (side * 4.33, 7.79, -3.78),
            (0.34, 0.28, 4.42),
            mats["limestone"],
            0.04,
        )
        tbox(
            f"vault-v040-{label}-barrel-vault-gold-spring-line",
            (side * 4.12, 7.89, -3.78),
            (0.075, 0.09, 4.42),
            mats["gold"],
            0.015,
        )


def add_corbels(mats):
    for index, x in enumerate((-3.65, -1.85, 0.0, 1.85, 3.65), start=1):
        prefix = f"vault-v040-rear-deck-corbels-{index:02d}"
        tbox(
            f"{prefix}-exact-honey-limestone-mass",
            (x, 3.72, -5.64),
            (0.42, 1.1, 0.78),
            mats["limestone"],
            0.045,
        )
        tbox(
            f"{prefix}-pearl-marble-foot",
            (x, 3.19, -5.55),
            (0.29, 0.14, 0.53),
            mats["marble"],
            0.025,
        )
        tbox(
            f"{prefix}-brushed-brass-neck",
            (x, 4.20, -5.57),
            (0.49, 0.10, 0.64),
            mats["brass"],
            0.016,
        )


def add_rail_segment(prefix, x_start, x_end, y, z, mats):
    width = x_end - x_start
    center_x = (x_start + x_end) * 0.5
    tbox(f"{prefix}-brass-handrail", (center_x, y + 0.49, z), (width, 0.09, 0.10), mats["brass"], 0.018)
    tbox(f"{prefix}-brass-bottom-rail", (center_x, y + 0.12, z), (width, 0.06, 0.07), mats["brass"], 0.012)
    count = max(2, int(width / 0.34) + 1)
    for index in range(count):
        x = x_start + width * index / (count - 1)
        tcylinder(
            f"{prefix}-gold-baluster-{index + 1:02d}",
            (x, y + 0.30, z),
            0.032,
            0.42,
            mats["gold"],
            14,
            0.008,
        )


def add_depth_rail(prefix, x, z_start, z_end, y, mats):
    depth = z_end - z_start
    center_z = (z_start + z_end) * 0.5
    tbox(f"{prefix}-brass-handrail", (x, y + 0.49, center_z), (0.10, 0.09, depth), mats["brass"], 0.018)
    tbox(f"{prefix}-brass-bottom-rail", (x, y + 0.12, center_z), (0.07, 0.06, depth), mats["brass"], 0.012)
    count = max(3, int(depth / 0.38) + 1)
    for index in range(count):
        z = z_start + depth * index / (count - 1)
        tcylinder(
            f"{prefix}-gold-baluster-{index + 1:02d}",
            (x, y + 0.30, z),
            0.032,
            0.42,
            mats["gold"],
            14,
            0.008,
        )


def build_mezzanine(mats):
    tbox(
        "vault-v040-thick-u-mezzanine-rear-deck",
        (0.0, 4.2, -5.14),
        (8.0, 0.34, 1.62),
        mats["limestone"],
        0.045,
    )
    for side in (-1, 1):
        label = "left" if side < 0 else "right"
        tbox(
            f"vault-v040-thick-u-mezzanine-{label}-gallery-return",
            (side * 3.72, 4.2, -3.12),
            (1.05, 0.34, 3.35),
            mats["limestone"],
            0.045,
        )
        tbox(
            f"vault-v040-{label}-gallery-return-gold-fascia",
            (side * 3.17, 4.20, -3.12),
            (0.07, 0.20, 3.25),
            mats["gold"],
            0.012,
        )
    tbox(
        "vault-v040-rear-deck-pearl-marble-front-fascia",
        (0.0, 4.20, -4.30),
        (8.0, 0.28, 0.10),
        mats["marble"],
        0.018,
    )
    add_corbels(mats)

    # Rail segments stop at x +/-2.72 dock openings; nothing bridges a gate.
    add_rail_segment("vault-v040-left-outer-rear-rail-return", -3.92, -3.43, 4.38, -4.24, mats)
    add_rail_segment("vault-v040-center-rear-rail-return", -2.01, 2.01, 4.38, -4.24, mats)
    add_rail_segment("vault-v040-right-outer-rear-rail-return", 3.43, 3.92, 4.38, -4.24, mats)

    for x in (-3.43, -2.01, 2.01, 3.43):
        label = f"{'left' if x < 0 else 'right'}-{abs(x):.2f}".replace(".", "p")
        tbox(
            f"vault-v040-{label}-dock-masonry-newel",
            (x, 4.78, -4.28),
            (0.30, 0.82, 0.30),
            mats["limestone"],
            0.035,
        )
        tbox(
            f"vault-v040-{label}-dock-newel-gold-cap",
            (x, 5.22, -4.28),
            (0.38, 0.10, 0.38),
            mats["gold"],
            0.018,
        )

    add_depth_rail("vault-v040-left-short-gallery-rail-return", -3.16, -3.32, -1.58, 4.38, mats)
    add_depth_rail("vault-v040-right-short-gallery-rail-return", 3.16, -3.32, -1.58, 4.38, mats)
    for side in (-1, 1):
        label = "left" if side < 0 else "right"
        tbox(
            f"vault-v040-{label}-gallery-front-masonry-newel",
            (side * 3.16, 4.78, -1.52),
            (0.32, 0.82, 0.32),
            mats["limestone"],
            0.035,
        )
        tbox(
            f"vault-v040-{label}-gallery-front-newel-gold-cap",
            (side * 3.16, 5.22, -1.52),
            (0.40, 0.10, 0.40),
            mats["gold"],
            0.018,
        )


def build_treasure_socket(treasure_id, position, mats):
    x, y, z = position
    upper = y > 1.0
    base_height = 0.12 if upper else 0.18
    base_center_y = y - base_height * 0.5
    if upper:
        radius = 0.43
    elif treasure_id == "crown":
        radius = 0.56
    elif treasure_id in {"egg", "hourglass"}:
        radius = 0.37
    else:
        radius = 0.47
    prefix = f"vault-interior-{treasure_id}-treasure-socket"
    tcylinder(
        f"{prefix}-honey-limestone-plinth",
        (x, base_center_y, z),
        radius,
        base_height,
        mats["limestone"],
        8,
        0.018,
    )
    tcylinder(
        f"{prefix}-black-onyx-mounting-disc",
        (x, y + 0.018, z),
        radius * 0.78,
        0.035,
        mats["onyx"],
        48,
        0.008,
    )
    ttorus(
        f"{prefix}-polished-22k-gold-collar",
        (x, y + 0.04, z),
        radius * 0.80,
        0.035,
        mats["gold"],
        56,
    )

    socket = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(socket)
    socket.location = three_to_blender(position)
    socket.empty_display_type = "CIRCLE"
    socket.empty_display_size = radius * 0.55
    socket["treasureId"] = treasure_id
    socket["threeSocketPosition"] = position
    socket["socketRole"] = "treasure-plinth-anchor"
    socket["vaultHandcraftedAsset"] = True
    return socket


def add_open_gate(prefix, center_x, car_center_y, car_center_z, mats, facing=1):
    bottom = car_center_y - 0.74
    gate_z = car_center_z + facing * 0.48
    for side in (-1, 1):
        label = "left" if side < 0 else "right"
        x = center_x + side * 0.47
        for stile_index, z in enumerate((gate_z, gate_z + facing * 0.55), start=1):
            tbox(
                f"{prefix}-{label}-open-gate-stile-{stile_index}",
                (x, car_center_y, z),
                (0.035, 1.48, 0.035),
                mats["brass"],
                0.008,
            )
        for rail_index, y in enumerate((bottom + 0.12, car_center_y, bottom + 1.36), start=1):
            tbox(
                f"{prefix}-{label}-open-gate-rail-{rail_index}",
                (x, y, gate_z + facing * 0.275),
                (0.035, 0.045, 0.58),
                mats["brass"],
                0.008,
            )
        tcylinder(
            f"{prefix}-{label}-open-gate-hinge",
            (x, car_center_y, gate_z),
            0.055,
            1.62,
            mats["gold"],
            20,
            0.01,
        )


def build_lift(side, center_x, car_center_y, mats):
    label = "left" if side < 0 else "right"
    prefix = f"vault-v040-{label}-royal-hydraulic-lift"
    center_z = -4.05
    envelope_center = (center_x, 3.68, center_z)

    tbox(
        f"{prefix}-honey-limestone-base",
        (center_x, 0.16, center_z),
        (1.18, 0.26, 1.18),
        mats["limestone"],
        0.045,
    )
    tbox(
        f"{prefix}-black-onyx-base-wear-plate",
        (center_x, 0.31, center_z),
        (0.96, 0.045, 0.96),
        mats["onyx"],
        0.012,
    )

    for x_side in (-1, 1):
        for z_side in (-1, 1):
            corner = f"{'left' if x_side < 0 else 'right'}-{'rear' if z_side < 0 else 'front'}"
            upright_x = center_x + x_side * 0.49
            upright_z = center_z + z_side * 0.49
            tbox(
                f"{prefix}-continuous-brushed-brass-upright-{corner}",
                (upright_x, 3.68, upright_z),
                (0.075, 7.1, 0.075),
                mats["brass"],
                0.014,
            )
            tcylinder(
                f"{prefix}-upright-gold-base-shoe-{corner}",
                (upright_x, 0.38, upright_z),
                0.085,
                0.16,
                mats["gold"],
                24,
                0.012,
            )

    for z_side in (-1, 1):
        tbox(
            f"{prefix}-overhead-brushed-brass-crosshead-{'rear' if z_side < 0 else 'front'}",
            (center_x, 7.10, center_z + z_side * 0.45),
            (1.16, 0.19, 0.14),
            mats["brass"],
            0.025,
        )
    for x_side in (-1, 1):
        tbox(
            f"{prefix}-crosshead-gold-bearing-block-{'left' if x_side < 0 else 'right'}",
            (center_x + x_side * 0.28, 6.96, center_z - 0.32),
            (0.16, 0.22, 0.18),
            mats["gold"],
            0.018,
        )

    sheave_y = 6.94
    sheave_z = center_z - 0.38
    ttorus_vertical(
        f"{prefix}-visible-brushed-brass-sheave",
        (center_x, sheave_y, sheave_z),
        0.25,
        0.055,
        mats["brass"],
        72,
    )
    tcylinder_depth(
        f"{prefix}-visible-22k-gold-sheave-axle",
        (center_x, sheave_y, sheave_z),
        0.085,
        0.28,
        mats["gold"],
        32,
        0.012,
    )

    car_top = car_center_y + 0.94
    counterweight_y = 1.28 if car_center_y > 3.0 else 5.15
    counterweight_x = center_x + side * 0.30
    tcurve(
        f"{prefix}-visible-continuous-lift-cable",
        [
            (center_x - side * 0.23, car_top - 0.03, sheave_z),
            (center_x - side * 0.23, 6.68, sheave_z),
            (center_x, 7.18, sheave_z),
            (counterweight_x, 6.68, sheave_z),
            (counterweight_x, counterweight_y + 0.53, sheave_z),
        ],
        0.018,
        mats["onyx"],
    )
    tbox(
        f"{prefix}-visible-black-onyx-counterweight",
        (counterweight_x, counterweight_y, center_z - 0.44),
        (0.25, 1.05, 0.16),
        mats["onyx"],
        0.025,
    )
    for cap_side in (-1, 1):
        tbox(
            f"{prefix}-counterweight-gold-{'top' if cap_side > 0 else 'bottom'}-cap",
            (counterweight_x, counterweight_y + cap_side * 0.54, center_z - 0.44),
            (0.31, 0.07, 0.21),
            mats["gold"],
            0.012,
        )

    # The side-mounted hydraulic assembly remains visible through the open frame.
    hydraulic_x = center_x - side * 0.31
    hydraulic_z = center_z - 0.39
    tcylinder(
        f"{prefix}-visible-onyx-hydraulic-accumulator",
        (hydraulic_x, 1.42, hydraulic_z),
        0.105,
        1.92,
        mats["onyx"],
        32,
        0.016,
    )
    for band_index, band_y in enumerate((0.58, 2.26), start=1):
        ttorus(
            f"{prefix}-hydraulic-accumulator-gold-band-{band_index}",
            (hydraulic_x, band_y, hydraulic_z),
            0.108,
            0.024,
            mats["gold"],
            40,
        )
    ram_bottom = 2.34 if car_center_y > 3.0 else 0.38
    ram_top = car_center_y - 0.88 if car_center_y > 3.0 else 0.76
    tbox(
        f"{prefix}-state-matched-polished-brass-hydraulic-ram",
        (hydraulic_x, (ram_bottom + ram_top) * 0.5, hydraulic_z),
        (0.10, ram_top - ram_bottom, 0.10),
        mats["brass"],
        0.025,
    )

    car_prefix = f"{prefix}-{'upper' if car_center_y > 3.0 else 'ground'}-docked-car"
    car_bottom = car_center_y - 0.94
    tbox(
        f"{car_prefix}-pearl-marble-floor",
        (center_x, car_bottom + 0.06, center_z),
        (0.94, 0.12, 0.96),
        mats["marble"],
        0.025,
    )
    tbox(
        f"{car_prefix}-brushed-brass-canopy",
        (center_x, car_top - 0.06, center_z),
        (0.94, 0.12, 0.96),
        mats["brass"],
        0.025,
    )
    for x_side in (-1, 1):
        for z_side in (-1, 1):
            tbox(
                f"{car_prefix}-gold-corner-post",
                (center_x + x_side * 0.42, car_center_y, center_z + z_side * 0.43),
                (0.045, 1.72, 0.045),
                mats["gold"],
                0.008,
            )

    # The upper car opens toward the rear mezzanine; the ground car opens forward.
    deck_facing = car_center_y > 3.0
    closed_face_z = center_z + (0.445 if deck_facing else -0.445)
    tbox(
        f"{car_prefix}-clear-low-iron-glass-{'front' if deck_facing else 'rear'}",
        (center_x, car_center_y, closed_face_z),
        (0.78, 1.55, 0.025),
        mats["glass"],
        0.004,
    )
    for x_side in (-1, 1):
        label_side = "left" if x_side < 0 else "right"
        tbox(
            f"{car_prefix}-clear-low-iron-glass-{label_side}-side",
            (center_x + x_side * 0.445, car_center_y, center_z),
            (0.025, 1.55, 0.80),
            mats["glass"],
            0.004,
        )
        tbox(
            f"{car_prefix}-brass-{label_side}-waist-rail",
            (center_x + x_side * 0.462, car_center_y - 0.08, center_z),
            (0.035, 0.075, 0.82),
            mats["brass"],
            0.009,
        )
    tbox(
        f"{car_prefix}-brass-rear-waist-rail",
        (center_x, car_center_y - 0.08, center_z - 0.462),
        (0.82, 0.075, 0.035),
        mats["brass"],
        0.009,
    )
    for side_panel in (-1, 1):
        tbox(
            f"{car_prefix}-honey-limestone-kick-plate-{'left' if side_panel < 0 else 'right'}",
            (center_x + side_panel * 0.455, car_bottom + 0.22, center_z),
            (0.05, 0.24, 0.80),
            mats["limestone"],
            0.012,
        )
    tbox(
        f"{car_prefix}-honey-limestone-rear-kick-plate",
        (center_x, car_bottom + 0.22, center_z - 0.455),
        (0.82, 0.24, 0.05),
        mats["limestone"],
        0.012,
    )
    add_open_gate(car_prefix, center_x, car_center_y, center_z, mats, -1 if deck_facing else 1)

    tbox(
        f"{car_prefix}-onyx-call-panel",
        (center_x + side * 0.462, car_center_y + 0.28, center_z + 0.22),
        (0.045, 0.26, 0.18),
        mats["onyx"],
        0.012,
    )
    tcylinder_depth(
        f"{car_prefix}-gold-call-button",
        (center_x + side * 0.488, car_center_y + 0.30, center_z + 0.22),
        0.035,
        0.035,
        mats["gold"],
        24,
        0.006,
    )

    tbox(
        f"{prefix}-upper-dock-lapis-threshold",
        (center_x, 4.39, -4.43),
        (1.28, 0.08, 0.5),
        mats["lapis"],
        0.015,
    )
    tbox(
        f"{prefix}-upper-dock-gold-threshold-nosing",
        (center_x, 4.445, -4.18),
        (1.28, 0.035, 0.055),
        mats["gold"],
        0.008,
    )

    envelope = bpy.data.objects.new(f"{prefix}-source-envelope-guide", None)
    bpy.context.collection.objects.link(envelope)
    envelope.location = three_to_blender(envelope_center)
    envelope.empty_display_type = "CUBE"
    envelope.empty_display_size = 1.0
    envelope.scale = tuple(value * 0.5 for value in three_dimensions_to_blender((1.18, 7.1, 1.18)))
    envelope["threeEnvelopeCenter"] = envelope_center
    envelope["threeEnvelopeSize"] = (1.18, 7.1, 1.18)
    envelope["sourceGuide"] = True
    envelope["exportToGlb"] = False
    return envelope


def build_scene():
    reset_scene()
    mats = royal_materials()
    scene = bpy.context.scene
    scene.render.resolution_x = PHONE_WIDTH
    scene.render.resolution_y = PHONE_HEIGHT
    scene.render.resolution_percentage = 100
    scene["vaultMuseumConstructionRoute"] = CONSTRUCTION_ROUTE
    scene["vaultMuseumRuntimeVersion"] = VERSION
    scene["vaultMuseumCameraMatched"] = True
    scene["centralLapisRouteWidth"] = 2.35
    scene["barrelVaultSpringY"] = 7.85
    scene["barrelVaultCrownY"] = 9.70

    guide_collection = bpy.data.collections.new("VAULT_V040_SOURCE_GUIDES_DO_NOT_EXPORT")
    scene.collection.children.link(guide_collection)
    cameras = {}
    for name, (position, target) in RUNTIME_CAMERAS.items():
        cameras[name] = create_runtime_camera(name, position, target, guide_collection)
    scene.camera = cameras["front"]

    root = bpy.data.objects.new("vault-museum-royal-hydraulic-lift-cloister-v041", None)
    bpy.context.collection.objects.link(root)
    root["constructionRoute"] = CONSTRUCTION_ROUTE
    root["runtimeVersion"] = VERSION
    root["cameraMatched"] = True
    root["protectedCameraNames"] = ",".join(RUNTIME_CAMERAS.keys())
    root["treasureSocketIds"] = ",".join(TREASURE_SOCKETS.keys())
    root["liftFamily"] = "open-royal-hydraulic-cloister"

    build_processional_floor(mats)
    build_shell(mats)
    build_mezzanine(mats)
    for treasure_id, position in TREASURE_SOCKETS.items():
        build_treasure_socket(treasure_id, position, mats)

    lift_envelopes = [
        build_lift(-1, -2.72, 5.31, mats),
        build_lift(1, 2.72, 1.02, mats),
    ]
    for envelope in lift_envelopes:
        for collection in list(envelope.users_collection):
            collection.objects.unlink(envelope)
        guide_collection.objects.link(envelope)

    guide_names = {obj.name for obj in guide_collection.objects}
    bpy.ops.object.select_all(action="DESELECT")
    authored_count = 0
    for obj in scene.objects:
        if obj.name in guide_names or obj.type in {"CAMERA", "LIGHT"}:
            obj.select_set(False)
            continue
        obj["vaultInteriorPart"] = obj.name
        obj["constructionRoute"] = CONSTRUCTION_ROUTE
        obj.select_set(True)
        authored_count += 1
        if obj != root:
            obj.parent = root

    export_scene(scene, cameras, authored_count)


def export_scene(scene, cameras, authored_count):
    DEV_ROOT.mkdir(parents=True, exist_ok=True)
    PRODUCTION_ROOT.mkdir(parents=True, exist_ok=True)
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    versioned = DEV_ROOT / f"vault-museum-{VERSION}.glb"
    production = PRODUCTION_ROOT / "vault-museum.glb"
    blend = WORK_ROOT / f"vault-museum-royal-lift-cloister-{VERSION}.blend"

    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.export_scene.gltf(
        filepath=str(versioned),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_attributes=True,
        export_extras=True,
        use_selection=True,
    )
    shutil.copyfile(versioned, production)
    print(f"VAULT_ROYAL_LIFTS_GLB={versioned}")
    print(f"VAULT_ROYAL_LIFTS_PRODUCTION={production}")
    print(f"VAULT_ROYAL_LIFTS_BLEND={blend}")
    print(f"VAULT_ROYAL_LIFTS_ROUTE={CONSTRUCTION_ROUTE}")
    print(f"VAULT_ROYAL_LIFTS_CAMERAS={','.join(camera.name for camera in cameras.values())}")
    print(f"VAULT_ROYAL_LIFTS_AUTHORED_OBJECTS={authored_count}")


if __name__ == "__main__":
    build_scene()
