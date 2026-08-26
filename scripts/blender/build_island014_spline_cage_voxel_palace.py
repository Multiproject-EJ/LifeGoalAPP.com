"""Build Island 014's source-calibrated P0-P7 clay palace blockout.

This is an early representation gate, not a final landmark.  Major masses are
constructed from custom non-circular lofts and closed architectural profiles;
no source pixels are exported and P8-P11 are intentionally absent.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / ".gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-spline-cage-voxel-sculpt/build-contract.v1.json"
VALIDATION = ROOT / ".gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-spline-cage-voxel-sculpt/build-validation.early.v1.json"
BLEND = ROOT / "work/island-visual-library/island-014-honeycomb-kingdom/source/palace-spline-cage-voxel-v001.blend"
GLB = ROOT / "src/features/gamification/level-worlds/dev/assets/island014/honeycomb-royal-palace-spline-v001.glb"
SOURCE = ROOT / "docs/visual-references/island-014-honeycomb-kingdom/014-source.png"
CROP = ROOT / ".gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-lower-cathedral-body/isolation/derived-crops/palace-visible-source-crop-v001.png"
TURNAROUND = ROOT / ".gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-front-facade/isolation/generated-references/palace-source-faithful-turnaround-v002.png"


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    argv = __import__("sys").argv
    parsed, _ = parser.parse_known_args(argv[argv.index("--") + 1 :] if "--" in argv else [])
    return parsed


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def display_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path.resolve())


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights, bpy.data.materials):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, roughness=0.58, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def tag(obj, subassembly, stage, mat, role):
    obj["island14PalacePart"] = True
    obj["island14Subassembly"] = subassembly
    obj["constructionStage"] = stage
    obj["blockoutRole"] = role
    if mat is not None and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    return obj


def mesh_object(name, vertices, faces, mat, subassembly, stage, role, bevel=0.0):
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    tag(obj, subassembly, stage, mat, role)
    if bevel:
        modifier = obj.modifiers.new("BLOCKOUT_EDGE_SOFTEN", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
    return obj


def apply_modifier(obj, modifier):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def noncircular_ring(width, depth, z, front_bias=0.0):
    """Twelve-point bevelled cross-plan; intentionally not circular."""
    w = width / 2.0
    d = depth / 2.0
    y0 = front_bias
    return [
        (-0.56 * w, y0 - d, z),
        (0.56 * w, y0 - d, z),
        (0.82 * w, y0 - 0.84 * d, z),
        (w, y0 - 0.48 * d, z),
        (w, y0 + 0.34 * d, z),
        (0.78 * w, y0 + 0.74 * d, z),
        (0.48 * w, y0 + d, z),
        (-0.48 * w, y0 + d, z),
        (-0.78 * w, y0 + 0.74 * d, z),
        (-w, y0 + 0.34 * d, z),
        (-w, y0 - 0.48 * d, z),
        (-0.82 * w, y0 - 0.84 * d, z),
    ]


def loft(name, rings, mat, subassembly, stage, role, bevel=0.0):
    count = len(rings[0])
    if any(len(ring) != count for ring in rings):
        raise ValueError(f"{name}: inconsistent ring sizes")
    vertices = [vertex for ring in rings for vertex in ring]
    faces = [tuple(range(count - 1, -1, -1))]
    for ri in range(len(rings) - 1):
        a = ri * count
        b = (ri + 1) * count
        for i in range(count):
            j = (i + 1) % count
            faces.append((a + i, a + j, b + j, b + i))
    last = (len(rings) - 1) * count
    faces.append(tuple(last + i for i in range(count)))
    return mesh_object(name, vertices, faces, mat, subassembly, stage, role, bevel)


def profile_prism(name, profile, front_y, back_y, mat, subassembly, stage, role, bevel=0.0):
    count = len(profile)
    vertices = [(x, front_y, z) for x, z in profile] + [(x, back_y, z) for x, z in profile]
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, 2 * count))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    return mesh_object(name, vertices, faces, mat, subassembly, stage, role, bevel)


def ring_prism(name, outer, inner, front_y, back_y, mat, subassembly, stage, role, bevel=0.0):
    if len(outer) != len(inner):
        raise ValueError(f"{name}: ring profiles must have same point count")
    n = len(outer)
    vertices = (
        [(x, front_y, z) for x, z in outer]
        + [(x, back_y, z) for x, z in outer]
        + [(x, front_y, z) for x, z in inner]
        + [(x, back_y, z) for x, z in inner]
    )
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.extend(
            [
                (i, j, 2 * n + j, 2 * n + i),
                (n + j, n + i, 3 * n + i, 3 * n + j),
                (i, n + i, n + j, j),
                (2 * n + j, 3 * n + j, 3 * n + i, 2 * n + i),
            ]
        )
    return mesh_object(name, vertices, faces, mat, subassembly, stage, role, bevel)


def plan_prism(name, footprint, bottom, top, mat, subassembly, stage, role, bevel=0.0):
    vertices = [(x, y, bottom) for x, y in footprint] + [(x, y, top) for x, y in footprint]
    n = len(footprint)
    faces = [tuple(range(n - 1, -1, -1)), tuple(n + i for i in range(n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return mesh_object(name, vertices, faces, mat, subassembly, stage, role, bevel)


def hex_profile(cx, cz, radius):
    return [
        (cx + math.cos(math.pi / 6 + i * math.pi / 3) * radius,
         cz + math.sin(math.pi / 6 + i * math.pi / 3) * radius)
        for i in range(6)
    ]


def arch_profile(cx, base, width, height):
    w = width / 2
    return [
        (cx - w, base),
        (cx + w, base),
        (cx + w, base + height * 0.56),
        (cx + width * 0.33, base + height * 0.78),
        (cx, base + height),
        (cx - width * 0.33, base + height * 0.78),
        (cx - w, base + height * 0.56),
    ]


def inset_arch(cx, base, width, height, inset):
    return arch_profile(cx, base + inset, width - inset * 2, height - inset * 1.55)


def tower_loft(name, x, y, base, width, depth, body_height, roof_height, mat, subassembly, stage, role):
    rings = []
    for z, ws, ds in [
        (base, 1.05, 1.04),
        (base + body_height * 0.08, 1.05, 1.04),
        (base + body_height * 0.16, 1.00, 1.00),
        (base + body_height * 0.72, 0.96, 0.96),
        (base + body_height * 0.86, 1.02, 1.00),
        (base + body_height, 1.02, 1.00),
        (base + body_height + roof_height * 0.24, 0.94, 0.94),
        (base + body_height + roof_height * 0.56, 0.72, 0.72),
        (base + body_height + roof_height * 0.83, 0.38, 0.38),
        (base + body_height + roof_height, 0.08, 0.08),
    ]:
        ring = noncircular_ring(width * ws, depth * ds, z)
        rings.append([(px + x, py + y, pz) for px, py, pz in ring])
    return loft(name, rings, mat, subassembly, stage, role, bevel=0.012)


def make_materials():
    return {
        "clay": material("I14_EARLY_WARM_CLAY", (0.49, 0.27, 0.095), 0.52),
        "light": material("I14_EARLY_LIGHT_CLAY", (0.72, 0.47, 0.19), 0.48),
        "dark": material("I14_EARLY_RECESS_CLAY", (0.055, 0.022, 0.009), 0.64),
        "portal": material("I14_EARLY_PORTAL_CLAY", (0.18, 0.06, 0.075), 0.58),
    }


def build_p0(mats):
    # Twelve deliberately stepped, non-circular civic cross-sections.
    specs = [
        (0.28, 3.36, 2.55),
        (0.43, 3.36, 2.55),
        (0.54, 3.26, 2.48),
        (0.66, 3.26, 2.48),
        (0.78, 3.08, 2.35),
        (0.92, 3.08, 2.35),
        (1.04, 2.92, 2.18),
        (1.17, 2.92, 2.18),
        (1.29, 2.66, 2.02),
        (1.42, 2.66, 2.02),
        (1.53, 2.42, 1.88),
        (1.64, 2.42, 1.88),
    ]
    rings = [noncircular_ring(width, depth, z, front_bias=0.03) for z, width, depth in specs]
    shell = loft("P0_UNIFIED_12_SECTION_CIVIC_SHELL", rings, mats["clay"], "P0", 1, "unified-nave-transept-shell")
    shell["sourceCrossSectionCount"] = 12
    # Voxel remesh is applied to the already closed spline hull, never to primitives.
    bpy.context.view_layer.objects.active = shell
    shell.select_set(True)
    shell.data.remesh_voxel_size = 0.035
    bpy.ops.object.voxel_remesh()
    shell.select_set(False)
    return [shell]


def build_p1(mats):
    result = []
    court = [(-1.84, -1.40), (-1.58, -1.68), (1.58, -1.68), (1.84, -1.40), (1.84, 1.34), (1.45, 1.54), (-1.45, 1.54), (-1.84, 1.34)]
    result.append(plan_prism("P1_ROYAL_COURT", court, 0.02, 0.28, mats["dark"], "P1", 1, "royal-court", 0.04))
    for index in range(8):
        z0 = 0.07 + index * 0.055
        width = 1.62 - index * 0.075
        near_y = -2.04 + index * 0.12
        far_y = near_y + 0.22
        footprint = [(-width / 2, near_y), (width / 2, near_y), (width * 0.46, far_y), (-width * 0.46, far_y)]
        result.append(plan_prism(f"P1_ROYAL_STAIR_{index + 1}", footprint, z0, z0 + 0.105, mats["light"], "P1", 1, "royal-stair", 0.018))
    return result


def build_p2(mats):
    outer = arch_profile(0, 0.40, 1.08, 1.42)
    inner = inset_arch(0, 0.40, 1.08, 1.42, 0.13)
    tunnel = ring_prism("P2_DEEP_PORTAL_TUNNEL", outer, inner, -1.51, -0.95, mats["light"], "P2", 2, "deep-closed-portal-tunnel", 0.018)
    door_profile = inset_arch(0, 0.43, 0.76, 1.18, 0.025)
    door = profile_prism("P2_RECESSED_ROYAL_DOUBLE_DOOR", door_profile, -1.02, -0.86, mats["portal"], "P2", 2, "recessed-double-door", 0.014)
    seam = profile_prism("P2_PORTAL_CENTER_SEAM", [(-0.022,0.48),(0.022,0.48),(0.022,1.45),(-0.022,1.45)], -1.04, -0.98, mats["light"], "P2", 2, "door-center-seam", 0.006)
    return [tunnel, door, seam]


def build_p3(mats):
    result = []
    specs = [
        ("OUTER_LEFT", -1.30, 0.52, 0.74, 1.08, -1.22),
        ("INNER_LEFT", -0.72, 0.62, 0.73, 1.30, -1.30),
        ("INNER_RIGHT", 0.72, 0.62, 0.73, 1.30, -1.30),
        ("OUTER_RIGHT", 1.30, 0.52, 0.74, 1.08, -1.22),
    ]
    for label, cx, base, width, height, front_y in specs:
        outer = arch_profile(cx, base, width, height)
        inner = inset_arch(cx, base, width, height, 0.105)
        result.append(ring_prism(f"P3_BAY_{label}_DEEP_FRAME", outer, inner, front_y - 0.20, front_y + 0.32, mats["light"], "P3", 2, "countable-front-bay-with-side-return", 0.014))
        result.append(profile_prism(f"P3_BAY_{label}_OCCUPIED_RECESS", inner, front_y + 0.31, front_y + 0.45, mats["dark"], "P3", 2, "deep-occupied-bay-recess", 0.008))
    return result


def build_p4(mats):
    rings = []
    for z, width, depth in [
        (1.18, 1.22, 1.34),
        (1.32, 1.25, 1.34),
        (1.48, 1.15, 1.28),
        (1.72, 1.12, 1.24),
        (2.00, 1.08, 1.18),
        (2.28, 1.03, 1.12),
        (2.58, 1.03, 1.08),
        (2.77, 1.08, 1.08),
        (2.88, 1.08, 1.08),
    ]:
        rings.append(noncircular_ring(width, depth, z, front_bias=0.06))
    keep = loft("P4_CENTRAL_CIVIC_KEEP", rings, mats["clay"], "P4", 3, "central-keep", 0.018)
    result = [keep]
    rose_center = (0.0, 2.25)
    rose_cells = [(0.0, 0.0)] + [(math.cos(i * math.pi / 3) * 0.225, math.sin(i * math.pi / 3) * 0.225) for i in range(6)]
    for index, (dx, dz) in enumerate(rose_cells):
        outer = hex_profile(rose_center[0] + dx, rose_center[1] + dz, 0.145)
        inner = hex_profile(rose_center[0] + dx, rose_center[1] + dz, 0.095)
        result.append(ring_prism(f"P4_RECESSED_ROSE_CELL_{index + 1}", outer, inner, -0.575, -0.31, mats["light"], "P4", 3, "recessed-rose-tube", 0.006))
        result.append(profile_prism(f"P4_ROSE_DARK_BACK_{index + 1}", inner, -0.305, -0.22, mats["dark"], "P4", 3, "rose-recess-backer", 0.003))
    return result


def build_p5(mats):
    result = []
    lantern_rings = []
    for z, width, depth in [(2.72,1.06,1.06),(2.84,1.08,1.08),(2.96,0.98,1.00),(3.14,0.98,1.00),(3.24,1.02,1.03),(3.31,1.02,1.03)]:
        lantern_rings.append(noncircular_ring(width, depth, z, front_bias=0.06))
    result.append(loft("P5_UPPER_LANTERN", lantern_rings, mats["light"], "P5", 3, "upper-lantern", 0.012))
    dome_rings = []
    for z, width, depth in [(3.29,1.02,1.03),(3.36,1.00,1.01),(3.47,0.90,0.91),(3.57,0.68,0.69),(3.64,0.39,0.40),(3.68,0.10,0.10)]:
        dome_rings.append(noncircular_ring(width, depth, z, front_bias=0.06))
    result.append(loft("P5_SHALLOW_SEGMENTED_HERO_ROOF", dome_rings, mats["clay"], "P5", 3, "shallow-segmented-hero-roof", 0.01))
    crown_rings = [
        noncircular_ring(0.12,0.12,3.65,front_bias=0.06),
        noncircular_ring(0.20,0.20,3.72,front_bias=0.06),
        noncircular_ring(0.08,0.08,3.80,front_bias=0.06),
        noncircular_ring(0.02,0.02,3.84,front_bias=0.06),
    ]
    result.append(loft("P5_HERO_CROWN", crown_rings, mats["light"], "P5", 3, "hero-crown"))
    return result


def build_p6(mats):
    specs = [
        ("FRONT_LEFT", -1.02, -0.20, 1.24, 0.62, 0.64, 0.72, 0.23),
        ("FRONT_RIGHT", 1.02, -0.20, 1.24, 0.62, 0.64, 0.68, 0.22),
        ("REAR_LEFT", -0.86, 0.58, 1.16, 0.48, 0.52, 0.72, 0.20),
        ("REAR_RIGHT", 0.88, 0.62, 1.14, 0.50, 0.53, 0.62, 0.18),
    ]
    result = []
    for label, x, y, base, width, depth, body_h, roof_h in specs:
        result.append(tower_loft(f"P6_{label}_SPLINE_TOWER", x, y, base, width, depth, body_h, roof_h, mats["light"], "P6", 4, "varied-subordinate-tower"))
    return result


def build_p7(mats):
    result = []
    # Quiet rear apse is a closed gabled mass, deliberately subordinate to the hero keep.
    apse = arch_profile(0, 0.34, 1.18, 1.34)
    result.append(profile_prism("P7_REAR_APSE_GABLED_BODY", apse, 1.05, 1.62, mats["clay"], "P7", 4, "authored-rear-apse", 0.025))
    rear_outer = arch_profile(0, 0.46, 0.54, 0.72)
    rear_inner = inset_arch(0, 0.46, 0.54, 0.72, 0.08)
    result.append(ring_prism("P7_REAR_SERVICE_PORTAL", rear_outer, rear_inner, 1.66, 1.38, mats["light"], "P7", 4, "rear-service-portal", 0.01))
    result.append(profile_prism("P7_REAR_SERVICE_RECESS", rear_inner, 1.37, 1.28, mats["dark"], "P7", 4, "rear-service-recess", 0.006))
    for index, cx in enumerate((-0.42, 0.42)):
        outer = hex_profile(cx, 1.36, 0.16)
        inner = hex_profile(cx, 1.36, 0.105)
        result.append(ring_prism(f"P7_REAR_OCCUPIED_CELL_{index + 1}", outer, inner, 1.46, 1.24, mats["light"], "P7", 4, "rear-occupied-cell", 0.006))
        result.append(profile_prism(f"P7_REAR_DARK_CELL_{index + 1}", inner, 1.23, 1.16, mats["dark"], "P7", 4, "rear-cell-backer", 0.004))
    # Side buttress/service masses use custom asymmetric polygonal lofts.
    for side in (-1, 1):
        x = side * 1.60
        rings = []
        for z, width, depth in [(0.38,0.38,1.14),(0.52,0.42,1.14),(1.04,0.40,1.02),(1.32,0.32,0.86),(1.52,0.12,0.62)]:
            ring = noncircular_ring(width, depth, z, front_bias=0.10)
            rings.append([(px + x, py, pz) for px,py,pz in ring])
        result.append(loft(f"P7_SIDE_SERVICE_BAY_{'RIGHT' if side > 0 else 'LEFT'}", rings, mats["clay"], "P7", 4, "side-service-bay", 0.012))
    return result


def build_palace(mats):
    builders = [build_p0, build_p1, build_p2, build_p3, build_p4, build_p5, build_p6, build_p7]
    objects = []
    for index, builder in enumerate(builders):
        print(f"BUILD:P{index}:START", flush=True)
        objects.extend(builder(mats))
        print(f"BUILD:P{index}:DONE", flush=True)
    return objects


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def custom_ground(mat):
    footprint = [(-6,-6),(6,-6),(6,6),(-6,6)]
    return plan_prism("REVIEW_GROUND", footprint, -0.09, -0.04, mat, "REVIEW", 0, "review-only")


def add_render_support():
    ground_mat = material("I14_EARLY_GROUND", (0.018, 0.023, 0.032), 0.78)
    custom_ground(ground_mat)
    world = bpy.context.scene.world or bpy.data.worlds.new("I14_EARLY_STUDIO_WORLD")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.012, 0.020, 0.035, 1)
    background.inputs["Strength"].default_value = 0.28
    for name, loc, energy, size, color in [
        ("KEY", (-4.8,-5.2,7.0), 1800, 4.4, (1.0,0.78,0.52)),
        ("FILL", (4.2,-1.7,4.6), 950, 4.0, (0.46,0.62,1.0)),
        ("RIM", (0.5,5.2,6.0), 1450, 3.5, (1.0,0.45,0.12)),
    ]:
        data = bpy.data.lights.new("I14_EARLY_" + name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        light = bpy.data.objects.new("I14_EARLY_" + name, data)
        bpy.context.collection.objects.link(light)
        light.location = loc
        look_at(light, (0,0,1.7))
    camera_data = bpy.data.cameras.new("I14_EARLY_CAMERA_DATA")
    camera = bpy.data.objects.new("I14_EARLY_CAMERA", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 58
    camera.data.sensor_width = 36
    bpy.context.scene.camera = camera
    return camera


def configure_render(resolution):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = resolution[0]
    scene.render.resolution_y = resolution[1]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False


def render(camera, path, location, target, resolution):
    camera.location = location
    look_at(camera, target)
    configure_render(resolution)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def mesh_metrics(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    triangles = 0
    boundary_edges = 0
    nonmanifold_edges = 0
    object_reports = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        edge_uses = [0] * len(mesh.edges)
        edge_lookup = {tuple(sorted(edge.vertices)): index for index, edge in enumerate(mesh.edges)}
        for poly in mesh.polygons:
            verts = list(poly.vertices)
            for index, a in enumerate(verts):
                b = verts[(index + 1) % len(verts)]
                key = tuple(sorted((a,b)))
                if key in edge_lookup:
                    edge_uses[edge_lookup[key]] += 1
        obj_boundary = sum(1 for uses in edge_uses if uses == 1)
        obj_nonmanifold = sum(1 for uses in edge_uses if uses != 2)
        boundary_edges += obj_boundary
        nonmanifold_edges += obj_nonmanifold
        object_reports.append({"name":obj.name,"triangles":len(mesh.loop_triangles),"boundaryEdges":obj_boundary,"nonmanifoldEdges":obj_nonmanifold})
        evaluated.to_mesh_clear()
    return {"meshCount":len(object_reports),"triangleCount":triangles,"boundaryEdges":boundary_edges,"nonmanifoldEdges":nonmanifold_edges,"objects":object_reports}


def projected_landmarks(camera):
    scene = bpy.context.scene
    # Exact-crop trace normalized to the visible palace bounds, image-top origin.
    target = {
        "finialApex": (0.500,0.000),
        "heroDomeLeft": (0.350,0.105),
        "heroDomeRight": (0.650,0.105),
        "roseCenter": (0.500,0.350),
        "portalApex": (0.500,0.535),
        "portalLeft": (0.345,0.640),
        "portalRight": (0.655,0.640),
        "bayOuterLeft": (0.115,0.610),
        "bayInnerLeft": (0.310,0.565),
        "bayInnerRight": (0.690,0.565),
        "bayOuterRight": (0.885,0.610),
        "stairLeft": (0.275,0.995),
        "stairRight": (0.725,0.995),
    }
    world = {
        "finialApex": (0,0.06,3.84),
        "heroDomeLeft": (-0.51,0.06,3.43),
        "heroDomeRight": (0.51,0.06,3.43),
        "roseCenter": (0,-0.69,2.25),
        "portalApex": (0,-1.53,1.82),
        "portalLeft": (-0.54,-1.53,1.31),
        "portalRight": (0.54,-1.53,1.31),
        "bayOuterLeft": (-1.30,-1.44,1.12),
        "bayInnerLeft": (-0.72,-1.52,1.25),
        "bayInnerRight": (0.72,-1.52,1.25),
        "bayOuterRight": (1.30,-1.44,1.12),
        "stairLeft": (-0.81,-2.04,0.12),
        "stairRight": (0.81,-2.04,0.12),
    }
    raw = {key: world_to_camera_view(scene, camera, Vector(value)) for key,value in world.items()}
    xs = [point.x for point in raw.values()]
    ys_top = [1 - point.y for point in raw.values()]
    min_x,max_x=min(xs),max(xs); min_y,max_y=min(ys_top),max(ys_top)
    achieved = {}
    squared = 0.0
    for key, point in raw.items():
        normalized = ((point.x-min_x)/(max_x-min_x),(1-point.y-min_y)/(max_y-min_y))
        achieved[key] = [round(normalized[0],5),round(normalized[1],5)]
        tx,ty=target[key]
        squared += (normalized[0]-tx)**2 + (normalized[1]-ty)**2
    rms = math.sqrt(squared / (len(target)*2))*100
    return {
        "normalization":"visible-palace landmark bounds; x and image-top y in [0,1]",
        "target":{key:list(value) for key,value in target.items()},
        "achieved":achieved,
        "rmsPercentOfFacadeWidth":round(rms,3),
    }


def main():
    output_dir = Path(parse_args().output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=False)
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    GLB.parent.mkdir(parents=True, exist_ok=True)
    VALIDATION.parent.mkdir(parents=True, exist_ok=True)

    reset_scene()
    mats = make_materials()
    palace = build_palace(mats)
    bpy.context.scene["island14ConstructionFamily"] = "blender-source-calibrated-spline-cage-voxel-sculpt"
    bpy.context.scene["blockoutScope"] = "P0-P7-clay-only"
    bpy.context.scene["exactSourceSha256"] = sha256(SOURCE)
    bpy.context.scene["turnaroundAuthority"] = "hidden-depth-and-rear-only"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

    select_only(palace)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB), export_format="GLB", use_selection=True,
        export_apply=True, export_cameras=False, export_lights=False,
        export_yup=True, export_extras=True,
    )

    camera = add_render_support()
    camera.data.lens = 58
    views = []
    radius = 7.8
    for degrees in (0,45,90,180,315):
        angle = math.radians(degrees)
        location = (math.sin(angle)*radius,-math.cos(angle)*radius,3.75)
        name = f"orbit-{degrees:03d}-clay.png"
        render(camera,output_dir/name,location,(0,0,1.76),(720,720))
        views.append(name)
    camera.data.lens = 59
    render(camera,output_dir/"phone-clay.png",(0,-8.7,4.15),(0,0,1.70),(390,844))
    views.append("phone-clay.png")

    # Re-establish the locked front camera for calibration after the orbit loop.
    camera.data.lens = 58
    camera.location = (0,-radius,3.75)
    look_at(camera,(0,0,1.76))
    metrics = mesh_metrics(palace)
    landmarks = projected_landmarks(camera)
    ratios = {
        "footprintDepthOverWidth":round(2.55/3.36,4),
        "heightOverWidth":round(3.84/3.36,4),
        "centralKeepWidthOverWidth":round(1.14/3.36,4),
        "heroDomeDiameterOverWidth":round(1.02/3.36,4),
        "frontBayWidthOverWidth":round(0.74/3.36,4),
    }

    output_hashes = {name:sha256(output_dir/name) for name in views}
    validation = {
        "schemaVersion":1,
        "status":"builder-produced-unreviewed-early-blockout",
        "constructionFamily":"blender-source-calibrated-spline-cage-voxel-sculpt",
        "scope":"P0-P7 clay only; P8-P11 absent; no runtime integration",
        "contract":{"path":str(CONTRACT.relative_to(ROOT)),"sha256":sha256(CONTRACT)},
        "authority":{
            "exactSource":{"path":str(SOURCE.relative_to(ROOT)),"sha256":sha256(SOURCE)},
            "exactCrop":{"path":str(CROP.relative_to(ROOT)),"sha256":sha256(CROP)},
            "turnaroundV2":{"path":str(TURNAROUND.relative_to(ROOT)),"sha256":sha256(TURNAROUND),"authority":"hidden-depth-and-rear-only"},
        },
        "cameraFit":{"lensMm":58,"location":[0,-radius,3.75],"target":[0,0,1.76],"landmarks":landmarks},
        "ratios":ratios,
        "ratioContractPass":{
            "footprintDepthOverWidth":0.72 <= ratios["footprintDepthOverWidth"] <= 0.82,
            "heightOverWidth":1.10 <= ratios["heightOverWidth"] <= 1.18,
            "centralKeepWidthOverWidth":0.32 <= ratios["centralKeepWidthOverWidth"] <= 0.36,
            "heroDomeDiameterOverWidth":0.28 <= ratios["heroDomeDiameterOverWidth"] <= 0.32,
            "frontBayWidthOverWidth":0.21 <= ratios["frontBayWidthOverWidth"] <= 0.24,
        },
        "geometry":metrics,
        "semanticSubassemblies":[f"P{i}" for i in range(8)],
        "excludedSubassemblies":["P8","P9","P10","P11"],
        "artifacts":{
            "builder":{"path":str(Path(__file__).resolve().relative_to(ROOT)),"sha256":sha256(Path(__file__).resolve())},
            "blend":{"path":str(BLEND.relative_to(ROOT)),"sha256":sha256(BLEND)},
            "earlyGlb":{"path":str(GLB.relative_to(ROOT)),"sha256":sha256(GLB),"bytes":GLB.stat().st_size},
            "evidence":{"directory":display_path(output_dir),"files":output_hashes},
        },
        "builderStatement":"Geometry and integrity metrics only; builder does not self-approve the visual gate.",
    }
    VALIDATION.write_text(json.dumps(validation,indent=2)+"\n")
    # Manifest is intentionally the final file written inside the immutable packet.
    manifest = {
        "schemaVersion":1,
        "status":"immutable-unreviewed-early-r01",
        "constructionFamily":"blender-source-calibrated-spline-cage-voxel-sculpt",
        "scope":"P0-P7 clay early blockout",
        "views":views,
        "files":output_hashes,
        "validation":{"path":str(VALIDATION.relative_to(ROOT)),"sha256":sha256(VALIDATION)},
        "builder":{"path":str(Path(__file__).resolve().relative_to(ROOT)),"sha256":sha256(Path(__file__).resolve())},
        "blend":{"path":str(BLEND.relative_to(ROOT)),"sha256":sha256(BLEND)},
        "glb":{"path":str(GLB.relative_to(ROOT)),"sha256":sha256(GLB)},
        "source":{"path":str(SOURCE.relative_to(ROOT)),"sha256":sha256(SOURCE)},
        "exactCrop":{"path":str(CROP.relative_to(ROOT)),"sha256":sha256(CROP)},
        "turnaroundV2":{"path":str(TURNAROUND.relative_to(ROOT)),"sha256":sha256(TURNAROUND),"authority":"hidden-depth-and-rear-only"},
    }
    (output_dir/"capture-manifest.v1.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps({"status":"ok","outputDir":str(output_dir),"validation":str(VALIDATION),"triangles":metrics["triangleCount"],"landmarkRms":landmarks["rmsPercentOfFacadeWidth"]},indent=2))


if __name__ == "__main__":
    main()
