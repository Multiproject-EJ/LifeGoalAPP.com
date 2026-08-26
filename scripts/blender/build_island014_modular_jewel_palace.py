"""Build and headlessly render Island 014's modular honey-jewel palace.

The exact source crop controls the front. The generated v2 turnaround is used
only to continue authored side/rear structure. No reference pixels are exported.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
GLB = ROOT / "src/features/gamification/level-worlds/dev/assets/island014/honeycomb-royal-palace-v001.glb"
BLEND = ROOT / "work/island-visual-library/island-014-honeycomb-kingdom/source/palace-blender-modular-jewel-v001.blend"


def args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    parsed, _ = parser.parse_known_args(__import__("sys").argv[__import__("sys").argv.index("--") + 1:] if "--" in __import__("sys").argv else [])
    return parsed


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def set_input(bsdf, name, value):
    socket = bsdf.inputs.get(name)
    if socket is not None:
        socket.default_value = value


def make_material(name, color, metallic, roughness, *, transmission=0.0, coat=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    set_input(bsdf, "Base Color", (*color, 1.0))
    set_input(bsdf, "Metallic", metallic)
    set_input(bsdf, "Roughness", roughness)
    set_input(bsdf, "IOR", 1.46)
    set_input(bsdf, "Transmission Weight", transmission)
    set_input(bsdf, "Coat Weight", coat)
    set_input(bsdf, "Coat Roughness", 0.06 if coat else 0.2)
    if emission:
        set_input(bsdf, "Emission Color", (*emission[0], 1.0))
        set_input(bsdf, "Emission Strength", emission[1])
    mat.diffuse_color = (*color, 1.0)
    return mat


def materials():
    return {
        "wax": make_material("I14_WAX_STONE", (0.22, 0.058, 0.006), 0.16, 0.28, coat=0.28),
        "gold": make_material("I14_ROYAL_GOLD", (0.58, 0.19, 0.006), 0.82, 0.13, coat=0.42),
        "bronze": make_material("I14_DARK_BRONZE", (0.026, 0.006, 0.0015), 0.76, 0.25),
        "recess": make_material("I14_OCCUPIED_RECESS", (0.003, 0.001, 0.001), 0.22, 0.20),
        "amber": make_material("I14_AMBER_GLAZING", (0.68, 0.075, 0.002), 0.06, 0.10, transmission=0.28, coat=0.82, emission=((0.9, 0.08, 0.001), 1.2)),
        "purple": make_material("I14_PURPLE_ENAMEL", (0.11, 0.002, 0.27), 0.38, 0.10, coat=0.96),
        "honey": make_material("I14_VISCOUS_HONEY", (0.48, 0.055, 0.0015), 0.04, 0.055, transmission=0.18, coat=1.0, emission=((0.75, 0.055, 0.0), 0.18)),
    }


def tag(obj, material, subassembly, stage):
    if material is not None and hasattr(obj.data, "materials"):
        obj.data.materials.append(material)
    obj["island14PalacePart"] = True
    obj["island14Subassembly"] = subassembly
    obj["constructionStage"] = stage
    return obj


def apply_bevel(obj, width=0.035, segments=2):
    mod = obj.modifiers.new("JEWEL_EDGE_BEVEL", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)


def cube(name, loc, dims, mat, subassembly, stage, bevel=0.025, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tag(obj, mat, subassembly, stage)
    if bevel:
        apply_bevel(obj, bevel)
    return obj


def cylinder(name, radius, depth, loc, mat, subassembly, stage, vertices=12, rotation=(0, 0, 0), bevel=0.018):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    tag(obj, mat, subassembly, stage)
    if bevel:
        apply_bevel(obj, bevel)
    return obj


def sphere(name, radius, loc, scale, mat, subassembly, stage, segments=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(8, segments // 2), radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return tag(obj, mat, subassembly, stage)


def jewel_spire(name, radius, depth, loc, mat, subassembly, stage):
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=radius, radius2=radius*0.24, depth=depth, location=loc)
    obj=bpy.context.object; obj.name=name
    return tag(obj,mat,subassembly,stage)


def shallow_dome(name, radius, rise, base_z, x, y, mat, subassembly, stage, segments=16, rings=5):
    vertices = [(0, 0, rise)]
    for ring in range(1, rings + 1):
        theta = (math.pi / 2) * ring / rings
        rr = radius * math.sin(theta)
        zz = rise * math.cos(theta)
        for i in range(segments):
            a = math.tau * i / segments
            vertices.append((math.cos(a) * rr, math.sin(a) * rr, zz))
    vertices.append((0, 0, 0))
    bottom = len(vertices) - 1
    faces = []
    for i in range(segments):
        faces.append((0, 1 + i, 1 + (i + 1) % segments))
    for ring in range(1, rings):
        start_a = 1 + (ring - 1) * segments
        start_b = 1 + ring * segments
        for i in range(segments):
            j = (i + 1) % segments
            faces.append((start_a + i, start_b + i, start_b + j, start_a + j))
    last = 1 + (rings - 1) * segments
    for i in range(segments):
        faces.append((bottom, last + (i + 1) % segments, last + i))
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = (x, y, base_z)
    tag(obj, mat, subassembly, stage)
    bevel = obj.modifiers.new("CUPOLA_EDGE_SOFTEN", "BEVEL")
    bevel.width = 0.012
    bevel.segments = 2
    return obj


def curve_path(name, points, bevel, mat, subassembly, stage, cyclic=False, resolution=2):
    data = bpy.data.curves.new(name + "_CURVE", "CURVE")
    data.dimensions = "3D"
    data.resolution_u = resolution
    data.bevel_depth = bevel
    data.bevel_resolution = 2
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return tag(obj, mat, subassembly, stage)


def arch_points(cx, front_y, base_z, width, straight, rise, count=10):
    points = [(cx - width / 2, front_y, base_z), (cx - width / 2, front_y, base_z + straight)]
    for i in range(count + 1):
        a = math.pi - math.pi * i / count
        points.append((cx + math.cos(a) * width / 2, front_y, base_z + straight + math.sin(a) * rise))
    points += [(cx + width / 2, front_y, base_z)]
    return points


def hex_frame(name, center, radius, plane, mat, subassembly, stage, bevel=0.028):
    cx, cy, cz = center
    points = []
    for i in range(6):
        a = math.pi / 6 + i * math.pi / 3
        if plane == "front":
            points.append((cx + math.cos(a) * radius, cy, cz + math.sin(a) * radius))
        elif plane == "side":
            points.append((cx, cy + math.cos(a) * radius, cz + math.sin(a) * radius))
        else:
            points.append((cx + math.cos(a) * radius, cy + math.sin(a) * radius, cz))
    return curve_path(name, points, bevel, mat, subassembly, stage, cyclic=True)


def radial_window(name, x, y, z, radius, angle, mats, subassembly, stage, scale=1.0):
    radial = Vector((math.sin(angle), -math.cos(angle), 0))
    tangent = Vector((math.cos(angle), math.sin(angle), 0))
    center = Vector((x, y, z)) + radial * (radius + 0.012)
    dark = cube(name + "_DARK_CELL", center, (0.20 * scale, 0.055, 0.32 * scale), mats["recess"], subassembly, stage, 0.025, rotation=(0, 0, -angle))
    dark.location += radial * 0.015
    amber = cube(name + "_AMBER_CORE", center + radial * 0.04, (0.09 * scale, 0.035, 0.18 * scale), mats["amber"], subassembly, stage, 0.018, rotation=(0, 0, -angle))
    pts = []
    for u, v in [(-0.14, -0.16), (-0.14, 0.08), (0, 0.22), (0.14, 0.08), (0.14, -0.16)]:
        p = center + tangent * (u * scale) + radial * 0.075
        pts.append((p.x, p.y, z + v * scale))
    curve_path(name + "_ATTACHED_ARCH", pts, 0.026 * scale, mats["gold"], subassembly, stage)
    return [dark, amber]


def dome_cage(prefix, x, y, base_z, radius, rise, mats, subassembly, stage, ribs=8):
    shallow_dome(prefix + "_SHALLOW_CUPOLA", radius, rise, base_z, x, y, mats["wax"], subassembly, stage, segments=16, rings=5)
    cylinder(prefix + "_CUPOLA_EAVE", radius * 1.03, 0.10, (x, y, base_z + 0.015), mats["bronze"], subassembly, stage, vertices=16, bevel=0.018)
    cylinder(prefix + "_CUPOLA_GOLD_SEAT", radius * 0.96, 0.08, (x, y, base_z + 0.055), mats["gold"], subassembly, stage, vertices=16, bevel=0.012)
    for rib in range(ribs):
        a = math.tau * rib / ribs
        points = []
        for step in range(6):
            theta = (math.pi / 2) * step / 5
            rr = radius * math.cos(theta)
            zz = rise * math.sin(theta)
            points.append((x + math.cos(a) * rr, y + math.sin(a) * rr, base_z + zz + 0.015))
        curve_path(f"{prefix}_ATTACHED_CAGE_RIB_{rib + 1}", points, 0.021, mats["gold"], subassembly, stage)


def tower(prefix, x, y, base_z, radius, height, dome_rise, mats, subassembly, stage, window_angles=(0,), material="wax"):
    cylinder(prefix + "_BEVELLED_DRUM", radius, height, (x, y, base_z + height / 2), mats[material], subassembly, stage, vertices=12, bevel=0.025)
    cylinder(prefix + "_LOWER_COLLAR", radius * 1.08, 0.10, (x, y, base_z + 0.09), mats["bronze"], subassembly, stage, vertices=12, bevel=0.014)
    cylinder(prefix + "_GOLD_EAVE", radius * 1.10, 0.11, (x, y, base_z + height - 0.02), mats["gold"], subassembly, stage, vertices=12, bevel=0.018)
    for wi, angle in enumerate(window_angles):
        radial_window(f"{prefix}_WINDOW_{wi + 1}", x, y, base_z + height * 0.55, radius, angle, mats, subassembly, stage, 0.86)
    dome_cage(prefix, x, y, base_z + height, radius * 1.02, dome_rise, mats, subassembly, stage)
    cylinder(prefix + "_FINIAL_STEM", 0.035, 0.15, (x, y, base_z + height + dome_rise + 0.075), mats["bronze"], subassembly, stage, vertices=8, bevel=0.006)
    jewel_spire(prefix + "_FINIAL_JEWEL_SPIRE", 0.065, 0.19, (x, y, base_z + height + dome_rise + 0.17), mats["gold"], subassembly, stage)


def prism(name, profile, front_y, back_y, mat, subassembly, stage):
    count = len(profile)
    verts = [(x, front_y, z) for x, z in profile] + [(x, back_y, z) for x, z in profile]
    faces = [list(range(count - 1, -1, -1)), list(range(count, count * 2))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    tag(obj, mat, subassembly, stage)
    # Concave curtain silhouettes remain welded solids; Blender's bevel modifier
    # is unstable on these deliberately folded profiles in 5.2 headless mode.
    if "FUSED_CURTAIN" not in name:
        apply_bevel(obj, 0.018)
    return obj


def ring_prism(name, outer, inner, front_y, back_y, mat, subassembly, stage):
    n = len(outer)
    verts = ([(x, front_y, z) for x, z in outer] + [(x, back_y, z) for x, z in outer]
             + [(x, front_y, z) for x, z in inner] + [(x, back_y, z) for x, z in inner])
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces += [(i, j, 2*n+j, 2*n+i), (n+j, n+i, 3*n+i, 3*n+j),
                  (i, n+i, n+j, j), (2*n+j, 3*n+j, 3*n+i, 2*n+i)]
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    tag(obj, mat, subassembly, stage)
    apply_bevel(obj, 0.015)
    return obj


def build_palace(mats):
    before = set(bpy.context.scene.objects)
    print("BUILD:A",flush=True)
    # A: broad court, grounded stairs, and deep royal portal.
    cube("S1_A_ROYAL_COURT", (0, 0, 0.16), (3.70, 2.95, 0.32), mats["bronze"], "A", 1, 0.08)
    cube("S1_A_WAX_COURT_CAP", (0, -0.05, 0.37), (3.54, 2.78, 0.18), mats["wax"], "A", 1, 0.045)
    for i in range(9):
        width = 1.56 - i * 0.055
        cube(f"S1_A_ROYAL_STAIR_{i + 1}", (0, -1.85 + i * 0.14, 0.44 + i * 0.075), (width, 0.23, 0.14), mats["gold"], "A", 1, 0.025)

    # Broad stepped architectural base, never a single hive mound.
    cube("S2_BASE_LOWER_CROSS", (0, 0, 0.78), (3.34, 2.48, 0.76), mats["wax"], "E", 2, 0.07)
    cube("S2_BASE_TRANSCEPT", (0, -0.06, 1.18), (3.05, 1.78, 0.46), mats["gold"], "E", 2, 0.055)
    cube("S2_BASE_NAVE", (0, 0.18, 1.28), (1.72, 2.30, 0.62), mats["wax"], "E", 2, 0.055)
    curve_path("S2_E_WRAPAROUND_LOWER_TRACERY", [(-1.63,-1.17,0.70),(1.63,-1.17,0.70),(1.63,1.17,0.70),(-1.63,1.17,0.70)], 0.055, mats["gold"], "E", 2, cyclic=True)
    curve_path("S2_E_WRAPAROUND_UPPER_TRACERY", [(-1.50,-0.88,1.39),(1.50,-0.88,1.39),(1.50,0.88,1.39),(-1.50,0.88,1.39)], 0.045, mats["bronze"], "E", 2, cyclic=True)

    # Exactly four countable front inhabited bays: two lower, two taller inner.
    bay_specs = [
        ("BAY_1_OUTER_LEFT", -1.38, 0.48, 0.29, 0.78, 0.20),
        ("BAY_2_INNER_LEFT", -0.79, 0.58, 0.30, 0.92, 0.21),
        ("BAY_3_INNER_RIGHT", 0.79, 0.58, 0.30, 0.92, 0.21),
        ("BAY_4_OUTER_RIGHT", 1.38, 0.48, 0.29, 0.78, 0.20),
    ]
    for label, x, base_z, radius, height, rise in bay_specs:
        tower(f"S2_B_{label}", x, -1.04, base_z, radius, height, rise, mats, "B", 2, window_angles=(0,), material="wax" if x < 0 else "gold")
    print("BUILD:B",flush=True)

    # Deep gold honey arch and wide purple double doors.
    outer = [(-0.76,0.40),(0.76,0.40),(0.76,1.29),(0.58,1.60),(0,1.98),(-0.58,1.60),(-0.76,1.29)]
    inner = [(-0.59,0.42),(0.59,0.42),(0.59,1.23),(0.44,1.49),(0,1.80),(-0.44,1.49),(-0.59,1.23)]
    prism("S2_A_PORTAL_DARK_REVEAL", inner, -1.325, -1.17, mats["recess"], "A", 2)
    ring_prism("S2_A_PORTAL_DEEP_GOLD_ARCH", outer, inner, -1.49, -1.15, mats["gold"], "A", 2)
    purple = [(-0.53,0.44),(0.53,0.44),(0.53,1.20),(0.39,1.44),(0,1.71),(-0.39,1.44),(-0.53,1.20)]
    prism("S2_A_PORTAL_PURPLE_DOUBLE_DOOR", purple, -1.51, -1.43, mats["purple"], "A", 2)
    cube("S2_A_PORTAL_CENTER_SEAM", (0,-1.565,1.02), (0.035,0.045,1.10), mats["gold"], "A", 2, 0.008)
    for side, x in (("LEFT", -0.13), ("RIGHT", 0.13)):
        sphere(f"S2_A_PORTAL_HANDLE_{side}", 0.05, (x,-1.59,1.00), (0.72,0.46,1.0), mats["amber"], "A", 2, 12)
    sphere("S2_A_PORTAL_BEE_BODY", 0.085, (0,-1.59,1.25), (0.74,0.48,1.35), mats["gold"], "A", 2, 12)
    sphere("S2_A_PORTAL_BEE_HEAD", 0.05, (0,-1.59,1.35), (1,0.65,1), mats["bronze"], "A", 2, 12)
    sphere("S2_A_PORTAL_BEE_WING_LEFT", 0.07, (-0.09,-1.58,1.28), (1.5,0.32,0.7), mats["amber"], "A", 2, 12)
    sphere("S2_A_PORTAL_BEE_WING_RIGHT", 0.07, (0.09,-1.58,1.28), (1.5,0.32,0.7), mats["amber"], "A", 2, 12)
    print("BUILD:PORTAL",flush=True)

    # C: elegant central civic lantern with embedded rose and shallow hero dome.
    cylinder("S3_C_CIVIC_LANTERN_LOWER", 0.66, 0.88, (0,0.06,1.88), mats["wax"], "C", 3, vertices=12, bevel=0.035)
    cylinder("S3_C_CIVIC_LANTERN_MIDDLE", 0.58, 0.64, (0,0.06,2.55), mats["gold"], "C", 3, vertices=12, bevel=0.03)
    cylinder("S3_C_CIVIC_LANTERN_WINDOW_DRUM", 0.51, 0.48, (0,0.06,3.08), mats["wax"], "C", 3, vertices=12, bevel=0.025)
    cylinder("S3_C_LOWER_GOLD_COLLAR", 0.69, 0.09, (0,0.06,1.50), mats["gold"], "C", 3, vertices=16, bevel=0.015)
    cylinder("S3_C_MIDDLE_BRONZE_COLLAR", 0.61, 0.10, (0,0.06,2.27), mats["bronze"], "C", 3, vertices=16, bevel=0.015)
    cylinder("S3_C_UPPER_GOLD_COLLAR", 0.60, 0.09, (0,0.06,2.84), mats["gold"], "C", 3, vertices=16, bevel=0.015)
    for wi, angle in enumerate((0, math.pi/3, 2*math.pi/3, math.pi, 4*math.pi/3, 5*math.pi/3)):
        radial_window(f"S3_C_MIDDLE_OCCUPIED_WINDOW_{wi + 1}", 0, 0.06, 2.58, 0.58, angle, mats, "C", 3, 0.72)
    for wi, angle in enumerate((0, math.pi/2, math.pi, 3*math.pi/2)):
        radial_window(f"S3_C_LANTERN_WINDOW_{wi + 1}", 0, 0.06, 3.09, 0.51, angle, mats, "C", 3, 0.88)
    dome_cage("S4_C_HERO", 0, 0.06, 3.32, 0.58, 0.43, mats, "C", 4, ribs=10)
    cylinder("S4_C_HERO_CROWN", 0.16, 0.17, (0,0.06,3.84), mats["gold"], "C", 4, vertices=8, bevel=0.018)
    jewel_spire("S4_C_HERO_FINIAL_SPIRE", 0.085, 0.24, (0,0.06,4.01), mats["gold"], "C", 4)
    # Rose sits on the visible front of the lower lantern, surrounded by attached radial tracery.
    cylinder("S3_C_ROSE_DARK_BACK", 0.34, 0.075, (0,-0.635,2.35), mats["recess"], "C", 3, vertices=12, rotation=(math.pi/2,0,0), bevel=0.01)
    hex_frame("S3_C_ROSE_OUTER_FRAME", (0,-0.685,2.35), 0.37, "front", mats["gold"], "C", 3, 0.038)
    for i in range(6):
        a = i * math.pi / 3
        curve_path(f"S3_C_ROSE_SPOKE_{i + 1}", [(0,-0.705,2.35),(math.cos(a)*0.29,-0.705,2.35+math.sin(a)*0.29)], 0.021, mats["gold"], "C", 3)
    print("BUILD:C",flush=True)

    # D: four subordinate varied shoulder/satellite towers.
    shoulder_specs = [
        ("FRONT_LEFT",-1.17,-0.12,1.24,0.31,0.72,0.22),
        ("FRONT_RIGHT",1.17,-0.12,1.24,0.31,0.67,0.21),
        ("REAR_LEFT",-0.96,0.68,1.15,0.27,0.76,0.20),
        ("REAR_RIGHT",0.98,0.72,1.12,0.29,0.62,0.19),
    ]
    for label,x,y,base_z,radius,height,rise in shoulder_specs:
        angles = (0, math.pi/2) if x > 0 else (0, -math.pi/2)
        tower(f"S3_D_{label}", x, y, base_z, radius, height, rise, mats, "D", 3, window_angles=angles, material="gold" if "FRONT" in label else "wax")
    print("BUILD:D",flush=True)

    # E/H: attached side and rear service architecture with fewer real openings.
    for side in (-1,1):
        cube(f"S3_H_SIDE_SERVICE_BAY_{side}", (side*1.57,0.18,0.95), (0.34,1.10,0.68), mats["wax"], "H", 3, 0.045)
        for idx, yy in enumerate((-0.12,0.35)):
            hex_frame(f"S3_E_SIDE_{side}_ATTACHED_HEX_{idx+1}", (side*1.75,yy,1.02), 0.16, "side", mats["gold"], "E", 3, 0.026)
            cube(f"S3_H_SIDE_{side}_RECESS_{idx+1}", (side*1.755,yy,1.02), (0.055,0.20,0.25), mats["recess"], "H", 3, 0.016)
    cube("S3_H_REAR_APSE", (0,1.36,0.94), (1.08,0.46,0.80), mats["wax"], "H", 3, 0.055)
    dome_cage("S3_H_REAR_APSE", 0, 1.36, 1.34, 0.47, 0.22, mats, "H", 3, ribs=6)
    rear_profile = [(-0.24,0.55),(0.24,0.55),(0.24,1.03),(0,1.22),(-0.24,1.03)]
    prism("S3_H_REAR_SERVICE_DOOR", rear_profile, 1.615, 1.52, mats["recess"], "H", 3)
    for x in (-1.46,-0.56,0.56,1.46):
        cube(f"S3_E_REAR_BUTTRESS_{x}", (x,1.19,0.86), (0.18,0.30,0.80), mats["bronze"], "E", 3, 0.035)
    for x in (-0.78,0,0.78):
        hex_frame(f"S3_E_REAR_ATTACHED_HEX_{x}", (x,1.255,1.15), 0.16, "front", mats["gold"], "E", 3, 0.026)
    print("BUILD:H",flush=True)

    # Dense but continuous wall tracery: connected honeycomb cells across front and wrapping sides.
    for row,(z,offset) in enumerate(((0.72,0.0),(1.06,0.19))):
        for column,x in enumerate((-1.46,-1.08,-0.70,0.70,1.08,1.46)):
            xx=x + (offset if x < 0 else -offset)
            hex_frame(f"S3_E_FRONT_STRUCTURAL_CELL_R{row}_C{column}", (xx,-1.255,z), 0.17, "front", mats["gold"], "E", 3, 0.024)
    for side in (-1,1):
        for row,z in enumerate((0.70,1.02)):
            for yy in (-0.70,-0.30,0.10,0.50,0.90):
                hex_frame(f"S3_E_WRAP_SIDE_CELL_{side}_{row}_{yy}", (side*1.695,yy,z), 0.15, "side", mats["gold"] if row else mats["bronze"], "E", 3, 0.022)
    print("BUILD:E",flush=True)

    # G: thick fused honey curtains, welded directly beneath the architectural cornice.
    cube("S5_G_FRONT_HONEY_CORNICE", (0,-1.39,1.38), (3.16,0.20,0.17), mats["honey"], "G", 5, 0.07)
    curtain_profiles = [
        ("LEFT_OUTER",[(-1.58,1.38),(-1.10,1.38),(-1.10,1.12),(-1.18,0.88),(-1.27,1.10),(-1.37,0.98),(-1.47,1.17),(-1.58,1.08)]),
        ("LEFT_INNER",[(-1.08,1.38),(-0.67,1.38),(-0.67,1.12),(-0.75,0.93),(-0.84,1.13),(-0.95,1.01),(-1.08,1.17)]),
        ("RIGHT_INNER",[(0.67,1.38),(1.08,1.38),(1.08,1.17),(0.95,1.01),(0.84,1.13),(0.75,0.93),(0.67,1.12)]),
        ("RIGHT_OUTER",[(1.10,1.38),(1.58,1.38),(1.58,1.08),(1.47,1.17),(1.37,0.98),(1.27,1.10),(1.18,0.88),(1.10,1.12)]),
    ]
    for label,profile in curtain_profiles:
        prism(f"S5_G_FRONT_FUSED_CURTAIN_{label}",profile,-1.51,-1.34,mats["honey"],"G",5)
    for index,(x,z,scale_z) in enumerate(((-1.18,0.83,1.45),(-0.75,0.89,1.25),(0.75,0.89,1.25),(1.18,0.83,1.45))):
        sphere(f"S5_G_FRONT_WELDED_GLOSS_DROP_{index+1}",0.095,(x,-1.49,z),(0.82,0.62,scale_z),mats["honey"],"G",5,16)
    for side in (-1,1):
        curve_path(f"S5_G_SIDE_HONEY_CHANNEL_{side}", [(side*1.72,-0.55,1.34),(side*1.73,0.05,1.30),(side*1.72,0.66,1.34)], 0.105, mats["honey"], "G", 5)
        for yy,length in ((-0.18,0.30),(0.48,0.23)):
            curve_path(f"S5_G_SIDE_HONEY_FUSED_DROP_{side}_{yy}", [(side*1.735,yy,1.32),(side*1.74,yy,1.32-length)], 0.075, mats["honey"], "G", 5)
            sphere(f"S5_G_SIDE_HONEY_DROP_{side}_{yy}", 0.085, (side*1.74,yy,1.28-length), (0.8,0.8,1.45), mats["honey"], "G", 5, 16)
    curve_path("S5_G_REAR_HONEY_CHANNEL", [(-0.92,1.27,1.31),(0,1.30,1.24),(0.92,1.27,1.31)], 0.105, mats["honey"], "G", 5)
    for x,length in ((-0.62,0.28),(0.58,0.34)):
        curve_path(f"S5_G_REAR_HONEY_FUSED_DROP_{x}", [(x,1.29,1.30),(x,1.30,1.30-length)], 0.075, mats["honey"], "G", 5)
        sphere(f"S5_G_REAR_HONEY_DROP_{x}", 0.085, (x,1.30,1.26-length), (0.82,0.82,1.48), mats["honey"], "G", 5, 16)
    print("BUILD:G",flush=True)

    return [obj for obj in bpy.context.scene.objects if obj not in before and obj.type in {"MESH", "CURVE"}]


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def prepare_export_batches(objects):
    """Keep the source .blend modular, but make the shipped GLB inexpensive."""
    converted=[]
    for obj in list(objects):
        if obj.type == "CURVE":
            select_only([obj])
            bpy.ops.object.convert(target="MESH")
            obj=bpy.context.object
        if obj.type == "MESH":
            converted.append(obj)
    groups={}
    for obj in converted:
        material=obj.data.materials[0].name if obj.data.materials and obj.data.materials[0] else "NO_MATERIAL"
        key=(str(obj.get("island14Subassembly","X")),int(obj.get("constructionStage",5)),material)
        groups.setdefault(key,[]).append(obj)
    batches=[]
    for (subassembly,stage,material), group in groups.items():
        select_only(group)
        if len(group) > 1:
            bpy.context.view_layer.objects.active=group[0]
            bpy.ops.object.join()
        batch=bpy.context.object
        batch.name=f"S{stage}_{subassembly}_BATCH_{material}"
        batch["island14Subassembly"]=subassembly
        batch["constructionStage"]=stage
        batch["exportBatchMaterial"]=material
        batches.append(batch)
    return batches


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_render_support():
    world = bpy.context.scene.world or bpy.data.worlds.new("I14_STUDIO_WORLD")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.012,0.022,0.038,1)
    bg.inputs["Strength"].default_value = 0.32
    cube("STUDIO_GROUND", (0,0,-0.07), (10,10,0.10), make_material("STUDIO_GROUND_MAT", (0.025,0.03,0.038), 0.0, 0.72), "STUDIO", 1, 0)
    for name,loc,energy,size,color in [
        ("KEY",(-4,-5,7),1700,5.0,(1.0,0.82,0.58)),
        ("FILL",(4,-2,4),1050,4.0,(0.48,0.62,1.0)),
        ("RIM",(0,5,6),1350,3.5,(1.0,0.56,0.16)),
    ]:
        data=bpy.data.lights.new("I14_"+name,"AREA"); data.energy=energy; data.shape="DISK"; data.size=size; data.color=color
        light=bpy.data.objects.new("I14_"+name,data); bpy.context.collection.objects.link(light); light.location=loc; look_at(light,(0,0,1.7))
    camera_data=bpy.data.cameras.new("I14_CAMERA_DATA")
    camera=bpy.data.objects.new("I14_CAMERA",camera_data); bpy.context.collection.objects.link(camera)
    camera.data.lens=55; bpy.context.scene.camera=camera
    return camera


def render(camera, path, location, target, resolution, samples=40):
    camera.location=location; look_at(camera,target)
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE"
    scene.render.resolution_x=resolution[0]; scene.render.resolution_y=resolution[1]; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"; scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=False; scene.render.filepath=str(path)
    scene.render.image_settings.color_depth="8"
    scene.render.resolution_percentage=100
    scene.render.use_file_extension=True
    scene.render.fps=30
    bpy.ops.render.render(write_still=True)


def metrics(objects):
    deps=bpy.context.evaluated_depsgraph_get(); triangles=0; meshes=0; material_names=set()
    for obj in objects:
        if obj.type != "MESH":
            continue
        meshes += 1
        evaluated=obj.evaluated_get(deps); mesh=evaluated.to_mesh(); mesh.calc_loop_triangles(); triangles += len(mesh.loop_triangles)
        for mat in obj.data.materials:
            if mat: material_names.add(mat.name)
        evaluated.to_mesh_clear()
    return {"meshCount":meshes,"triangleCount":triangles,"materialFamilies":sorted(material_names),"materialFamilyCount":len(material_names)}


def render_evidence(output_dir, glb_path):
    reset_scene(); bpy.ops.import_scene.gltf(filepath=str(glb_path))
    imported=[o for o in bpy.context.scene.objects if o.type in {"MESH","CURVE"}]
    camera=add_render_support(); output_dir.mkdir(parents=True,exist_ok=True)
    views=[]; radius=8.2
    for degrees in (0,45,90,135,180,225,270,315):
        angle=math.radians(degrees); loc=(math.sin(angle)*radius,-math.cos(angle)*radius,4.15)
        name=f"orbit-{degrees:03d}-materials-on.png"; render(camera,output_dir/name,loc,(0,0,1.75),(720,720)); views.append(name)
    saved={obj.name:[mat for mat in obj.data.materials] for obj in imported if obj.type=="MESH"}
    clay=make_material("I14_CLAY_REVIEW",(0.56,0.38,0.18),0.0,0.62)
    for obj in imported:
        if obj.type=="MESH": obj.data.materials.clear(); obj.data.materials.append(clay)
    for degrees in (0,45,315):
        angle=math.radians(degrees); loc=(math.sin(angle)*radius,-math.cos(angle)*radius,4.15)
        name=f"orbit-{degrees:03d}-clay.png"; render(camera,output_dir/name,loc,(0,0,1.75),(720,720)); views.append(name)
    for obj in imported:
        if obj.type=="MESH":
            obj.data.materials.clear()
            for mat in saved[obj.name]: obj.data.materials.append(mat)
    render(camera,output_dir/"front-close-materials-on.png",(0,-5.3,2.65),(0,-0.05,1.72),(720,720)); views.append("front-close-materials-on.png")
    render(camera,output_dir/"front-close-honey-material-proof.png",(-1.05,-3.65,1.65),(-1.05,-1.27,1.05),(720,720)); views.append("front-close-honey-material-proof.png")
    camera.data.lens=58
    render(camera,output_dir/"phone-overview.png",(0,-8.7,4.45),(0,0,1.62),(390,844)); views.append("phone-overview.png")
    report={"schemaVersion":1,"source":"re-imported exported GLB","glb":str(glb_path.relative_to(ROOT)),"views":views,"metrics":metrics(imported)}
    (output_dir/"render-report.json").write_text(json.dumps(report,indent=2)+"\n")
    return report


def main():
    output_dir=Path(args().output_dir).resolve(); GLB.parent.mkdir(parents=True,exist_ok=True); BLEND.parent.mkdir(parents=True,exist_ok=True)
    reset_scene(); mats=materials(); print("BUILD:START",flush=True); palace=build_palace(mats); print("BUILD:DONE",flush=True)
    bpy.context.scene["island14ConstructionFamily"]="blender-modular-honey-jewel-palace-runtime-glb"
    bpy.context.scene["exactSourceSha256"]="3c1dfccaf52ee596a6488e844d53b51414693d6dbd400513ee52fa06132a580e"
    bpy.context.scene["turnaroundV2Role"]="hidden-continuity-only"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    palace=prepare_export_batches(palace)
    select_only(palace)
    bpy.ops.export_scene.gltf(filepath=str(GLB),export_format="GLB",use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_yup=True,export_extras=True)
    report=render_evidence(output_dir,GLB)
    print(json.dumps({"status":"ok","blend":str(BLEND),"glb":str(GLB),"outputDir":str(output_dir),"report":report},indent=2))


if __name__ == "__main__":
    main()
