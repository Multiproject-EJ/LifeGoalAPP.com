"""Build Island 014 palace facade V2 as closed modular masonry."""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "work/island-visual-library/island-014-honeycomb-kingdom/blender"
RUNTIME = ROOT / "src/features/gamification/level-worlds/dev/assets/island14PalaceFacadeBlenderV2.json"
BLEND = OUT / "palace-front-facade-v003.blend"
GLB = OUT / "palace-front-facade-v003.glb"

COLORS = {
    "warmGold": (0.94, 0.50, 0.055, 1), "paleGold": (1.0, 0.80, 0.25, 1),
    "waxCream": (1.0, 0.80, 0.43, 1), "darkBronze": (0.075, 0.032, 0.012, 1),
    "royalPurple": (0.24, 0.035, 0.36, 1), "warmWindow": (1.0, 0.46, 0.025, 1),
    "honeyGlass": (1.0, 0.56, 0.02, 0.82),
}


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def materials():
    result = {}
    for key, rgba in COLORS.items():
        mat = bpy.data.materials.new(f"ISLAND_14_V2_{key.upper()}")
        mat.diffuse_color = rgba
        result[key] = mat
    return result


def finish(obj, key, mats):
    obj.data.materials.append(mats[key])
    obj["island14MaterialKey"] = key
    obj["island14FacadePart"] = True
    return obj


def prism(name, profile, front_y, back_y, key, mats):
    n = len(profile)
    verts = [(x, front_y, z) for x, z in profile] + [(x, back_y, z) for x, z in profile]
    faces = [list(range(n - 1, -1, -1)), list(range(n, 2 * n))]
    faces += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, key, mats)


def ring(name, outer, inner, front_y, back_y, key, mats):
    if len(outer) != len(inner):
        raise ValueError(name)
    n = len(outer)
    verts = ([(x, front_y, z) for x, z in outer] + [(x, back_y, z) for x, z in outer]
             + [(x, front_y, z) for x, z in inner] + [(x, back_y, z) for x, z in inner])
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces += [[i, j, 2*n+j, 2*n+i], [n+j, n+i, 3*n+i, 3*n+j],
                  [i, n+i, n+j, j], [2*n+j, 3*n+j, 3*n+i, 2*n+i]]
    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(verts, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, key, mats)


def poly(radius, count, x, z, phase=math.pi/2):
    return [(x + math.cos(phase + i * math.tau/count) * radius,
             z + math.sin(phase + i * math.tau/count) * radius) for i in range(count)]


def box(name, loc, dims, key, mats, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, key, mats)
    if bevel:
        mod = obj.modifiers.new("V2_EDGE_SOFTEN", "BEVEL")
        mod.width, mod.segments, mod.limit_method = bevel, 2, "ANGLE"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def cylinder(name, radius, depth, loc, key, mats, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
        location=loc, rotation=(math.pi/2, 0, 0))
    obj = bpy.context.object
    obj.name = name
    return finish(obj, key, mats)


def join(objects, test, name):
    found = [o for o in objects if test(o)]
    if len(found) < 2:
        return objects
    keys = {o.get("island14MaterialKey") for o in found}
    if len(keys) != 1:
        raise RuntimeError(f"mixed materials: {name}")
    bpy.ops.object.select_all(action="DESELECT")
    for o in found:
        o.select_set(True)
    bpy.context.view_layer.objects.active = found[0]
    bpy.ops.object.join()
    found[0].name = name
    found[0]["island14MaterialKey"] = keys.pop()
    found[0]["island14FacadePart"] = True
    return [o for o in objects if o not in found] + [found[0]]


def build(mats):
    o = []
    # A sealed rear host is always present behind every architectural opening.
    host = [(-1.36,.44),(1.36,.44),(1.36,1.40),(1.18,1.72),(.88,1.98),
            (.68,2.46),(0,2.91),(-.68,2.46),(-.88,1.98),(-1.18,1.72),(-1.36,1.40)]
    o.append(prism("ISLAND_14_PALACE_FACADE_BLENDER_V2_REAR_CATHEDRAL_GABLE_HOST", host, -1.10, -.78, "darkBronze", mats))

    # Closed modular masonry leaves readable recess zones without cutting the host.
    left = [(-1.34,.45),(-.60,.45),(-.60,1.42),(-.48,1.62),(-.70,2.12),(-1.08,1.82),(-1.34,1.44)]
    right = [(-x,z) for x,z in reversed(left)]
    o += [prism("ISLAND_14_PALACE_FACADE_BLENDER_V2_MASONRY_LEFT", left, -1.42, -1.02, "warmGold", mats),
          prism("ISLAND_14_PALACE_FACADE_BLENDER_V2_MASONRY_RIGHT", right, -1.42, -1.02, "warmGold", mats)]
    gable_left = [(-.72,1.84),(-.39,1.82),(-.39,2.22),(-.12,2.54),(0,2.72),(0,2.88),(-.66,2.44)]
    gable_right = [(-x,z) for x,z in reversed(gable_left)]
    o += [prism("ISLAND_14_PALACE_FACADE_BLENDER_V2_GABLE_LEFT", gable_left, -1.40, -1.00, "waxCream", mats),
          prism("ISLAND_14_PALACE_FACADE_BLENDER_V2_GABLE_RIGHT", gable_right, -1.40, -1.00, "waxCream", mats)]

    # Royal door: 1.12 wide, 0.35-deep continuous reveal, occupied backplanes.
    door_outer = [(-.61,.44),(.61,.44),(.61,1.28),(.45,1.51),(0,1.82),(-.45,1.51),(-.61,1.28)]
    door_mid = [(-.56,.46),(.56,.46),(.56,1.24),(.40,1.44),(0,1.72),(-.40,1.44),(-.56,1.24)]
    door_inner = [(-.49,.48),(.49,.48),(.49,1.20),(.34,1.38),(0,1.62),(-.34,1.38),(-.49,1.20)]
    o.append(prism("ISLAND_14_PALACE_FACADE_BLENDER_V2_DOOR_DARK_BACKPLANE", door_mid, -1.205, -1.115, "darkBronze", mats))
    o.append(prism("ISLAND_14_PALACE_FACADE_BLENDER_V2_ROYAL_PURPLE_DOUBLE_DOOR", door_inner, -1.30, -1.22, "royalPurple", mats))
    o.append(ring("ISLAND_14_PALACE_FACADE_BLENDER_V2_DOOR_OUTER_MASONRY_ARCH", door_outer, door_mid, -1.48, -1.09, "paleGold", mats))
    o.append(ring("ISLAND_14_PALACE_FACADE_BLENDER_V2_DOOR_SOLID_REVEAL_TUNNEL", door_mid, door_inner, -1.42, -1.13, "warmGold", mats))
    o.append(box("ISLAND_14_PALACE_FACADE_BLENDER_V2_DOOR_CENTER_SEAM", (0,-1.335,1.02), (.055,.05,1.02), "paleGold", mats, .006))
    for side,x in (("LEFT",-.15),("RIGHT",.15)):
        o.append(cylinder(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_DOOR_HANDLE_{side}", .055,.06,(x,-1.365,1.03),"honeyGlass",mats,12))
    o.append(cylinder("ISLAND_14_PALACE_FACADE_BLENDER_V2_DOOR_BEE_SIGIL", .115,.06,(0,-1.365,1.31),"paleGold",mats,12))

    # Four occupied honeycomb windows: each has a sealed host/backplane/core and deep rings.
    bays = [("LOWER_LEFT",-.91,1.17,.31),("LOWER_RIGHT",.91,1.17,.31),
            ("UPPER_LEFT",-.69,1.72,.235),("UPPER_RIGHT",.69,1.72,.235)]
    for label,x,z,r in bays:
        o.append(cylinder(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_{label}_SOLID_BACKPLANE",r*.86,.08,(x,-1.115,z),"darkBronze",mats,6))
        o.append(cylinder(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_{label}_AMBER_OCCUPANT",r*.49,.06,(x,-1.205,z),"warmWindow",mats,6))
        o.append(ring(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_{label}_MASONRY_REVEAL",poly(r,6,x,z),poly(r*.77,6,x,z),-1.50,-1.09,"paleGold",mats))
        o.append(ring(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_{label}_INNER_LINER",poly(r*.76,6,x,z),poly(r*.58,6,x,z),-1.40,-1.16,"warmGold",mats))

    # Rose: sealed rear plane and purple heart behind a deep radial honeycomb ring.
    rose_z = 2.28
    o.append(cylinder("ISLAND_14_PALACE_FACADE_BLENDER_V2_ROSE_SOLID_BACKPLANE",.363,.074,(0,-1.105,rose_z),"darkBronze",mats,12))
    o.append(cylinder("ISLAND_14_PALACE_FACADE_BLENDER_V2_ROSE_PURPLE_CORE",.288,.056,(0,-1.195,rose_z),"royalPurple",mats,12))
    o.append(ring("ISLAND_14_PALACE_FACADE_BLENDER_V2_ROSE_DEEP_MASONRY_REVEAL",poly(.40,12,0,rose_z),poly(.316,12,0,rose_z),-1.46,-1.09,"paleGold",mats))
    for i in range(6):
        angle = i*math.pi/3
        spoke = box(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_ROSE_DIVISION_{i+1}",
            (math.cos(angle)*.149,-1.245,rose_z+math.sin(angle)*.149),(.288,.042,.033),"paleGold",mats,.005)
        spoke.rotation_euler[1] = -angle
        bpy.context.view_layer.objects.active = spoke
        spoke.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        spoke.select_set(False)
        o.append(spoke)

    # Compact overlapping buttresses stay inside the accepted palace silhouette.
    for label,side in (("LEFT",-1),("RIGHT",1)):
        o.append(box(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_{label}_COMPACT_BUTTRESS",(side*1.31,-1.25,1.20),(.30,.42,1.42),"waxCream",mats,.045))
        bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=.21,radius2=.07,depth=.34,location=(side*1.31,-1.25,2.08))
        cap=bpy.context.object; cap.name=f"ISLAND_14_PALACE_FACADE_BLENDER_V2_{label}_BUTTRESS_CAP"; finish(cap,"warmGold",mats); o.append(cap)
        o.append(box(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_BANNER_{label}",(side*1.18,-1.485,1.57),(.16,.045,.43),"royalPurple",mats,.015))
        o.append(box(f"ISLAND_14_PALACE_FACADE_BLENDER_V2_BANNER_ANCHOR_{label}",(side*1.18,-1.50,1.82),(.25,.055,.05),"paleGold",mats,.008))
    return o


def descriptor(objects):
    deps = bpy.context.evaluated_depsgraph_get()
    records=[]; total=0
    for obj in objects:
        evaluated=obj.evaluated_get(deps)
        mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=deps)
        mesh.calc_loop_triangles()
        normal_matrix=evaluated.matrix_world.to_3x3().inverted().transposed()
        positions=[]; normals=[]; indices=[]
        for tri in mesh.loop_triangles:
            for vi in tri.vertices:
                p=evaluated.matrix_world @ mesh.vertices[vi].co
                n=(normal_matrix @ mesh.vertices[vi].normal).normalized()
                positions += [round(p.x,6),round(p.z,6),round(-p.y,6)]
                normals += [round(n.x,6),round(n.z,6),round(-n.y,6)]
                indices.append(len(indices))
        count=len(indices)//3; total += count
        records.append({"name":obj.name,"materialKey":obj.get("island14MaterialKey","warmGold"),
            "stage":2 if "DOOR" in obj.name or "LOWER" in obj.name or "HOST" in obj.name else 3,
            "positions":positions,"normals":normals,"indices":indices,"triangles":count})
        evaluated.to_mesh_clear()
    return {"schemaVersion":1,"generator":"Blender 5.2.0 LTS",
        "sourceScript":"scripts/blender/build-island014-palace-facade-v2.py",
        "coordinateMap":"three(x,y,z)=blender(x,z,-y)","partId":"palace-front-facade",
        "constructionFamily":"blender-solid-modular-honey-cathedral-facade",
        "meshCount":len(records),"triangleCount":total,"meshes":records}


def main():
    OUT.mkdir(parents=True,exist_ok=True); RUNTIME.parent.mkdir(parents=True,exist_ok=True)
    reset(); mats=materials(); objects=build(mats)
    rules=[
      (lambda x:"_MASONRY_LEFT" in x.name or "_MASONRY_RIGHT" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_MODULAR_SIDE_MASONRY"),
      (lambda x:"_GABLE_LEFT" in x.name or "_GABLE_RIGHT" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_MODULAR_GABLE_MASONRY"),
      (lambda x:"_SOLID_BACKPLANE" in x.name and "ROSE" not in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_FOUR_BAY_BACKPLANES"),
      (lambda x:"_AMBER_OCCUPANT" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_FOUR_BAY_AMBER_OCCUPANTS"),
      (lambda x:"_MASONRY_REVEAL" in x.name and "ROSE" not in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_FOUR_BAY_REVEAL_TUNNELS"),
      (lambda x:"_INNER_LINER" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_FOUR_BAY_INNER_LINERS"),
      (lambda x:"ROSE_DIVISION_" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_ROSE_SIX_DIVISIONS"),
      (lambda x:"COMPACT_BUTTRESS" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_COMPACT_BUTTRESSES"),
      (lambda x:"BUTTRESS_CAP" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_BUTTRESS_CAPS"),
      (lambda x:"BANNER_" in x.name and "ANCHOR" not in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_BANNERS"),
      (lambda x:"BANNER_ANCHOR" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_BANNER_ANCHORS"),
      (lambda x:"DOOR_HANDLE" in x.name,"ISLAND_14_PALACE_FACADE_BLENDER_V2_DOOR_HANDLES"),
    ]
    for test,name in rules: objects=join(objects,test,name)
    data=descriptor(objects)
    if data["triangleCount"]>22000 or data["meshCount"]>24 or data["meshCount"]<10:
        raise RuntimeError(f"budget failure: {data['meshCount']} meshes, {data['triangleCount']} triangles")
    RUNTIME.write_text(json.dumps(data,separators=(",",":"))+"\n",encoding="utf-8")
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(GLB),export_format="GLB",use_selection=True,
        export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
    print(json.dumps({"status":"ok","blend":str(BLEND),"glb":str(GLB),"runtime":str(RUNTIME),
        "meshCount":data["meshCount"],"triangleCount":data["triangleCount"]},indent=2))


if __name__ == "__main__": main()
