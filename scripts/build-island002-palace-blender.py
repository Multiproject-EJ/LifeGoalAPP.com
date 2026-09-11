"""Author Island002's continuous roof/keep mesh in Blender and export Three arrays.

Run: Blender --background --python scripts/build-island002-palace-blender.py
The approved source owns the silhouette. This is a new Blender construction
family after the two procedural families were retired, not an approval reset.
"""
import bpy
import bmesh
import hashlib
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/gauntlets/island-002-v2/parts/palace/blender'
EXPORT = ROOT / 'src/features/gamification/level-worlds/dev/generated/island002-palace-roof.json'
SOURCE = ROOT / 'docs/visual-references/island-002-celestial-v2/002-source.png'
OUT.mkdir(parents=True, exist_ok=True)
EXPORT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

MATERIALS = {}
for name, color, metallic, roughness in [
    ('ivory', (0.94, 0.91, 0.82, 1), 0.0, 0.65),
    ('sapphire', (0.025, 0.15, 0.43, 1), 0.10, 0.36),
    ('gold', (0.83, 0.53, 0.11, 1), 0.8, 0.28),
    ('warmGlow', (1.0, 0.72, 0.29, 1), 0.0, 0.45),
]:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get('Principled BSDF')
    principled.inputs['Base Color'].default_value = color
    principled.inputs['Metallic'].default_value = metallic
    principled.inputs['Roughness'].default_value = roughness
    MATERIALS[name] = mat


def to_blender(point):
    x, y, z = point
    return (x, -z, y)


def object_mesh(name, vertices, faces, material='ivory', phase=3, stage=3):
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata([to_blender(p) for p in vertices], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MATERIALS[material])
    obj['phase'] = phase
    obj['constructionStage'] = stage
    obj['materialKey'] = material
    return obj


def cross_section_volume(name, rings, sides=12, center=(0, 0), phase=3, material='sapphire', stage=3):
    # Explicit authored section contours, joined as a watertight mesh in Blender.
    # No lathe/cone primitive and no modifier that hides an unchanged cylinder.
    vertices = []
    for y, radius in rings:
        for i in range(sides):
            angle = (i + 0.5) / sides * math.tau
            vertices.append((center[0] + math.sin(angle) * radius, y, center[1] + math.cos(angle) * radius))
    faces = [tuple(reversed(range(sides)))]
    for j in range(len(rings) - 1):
        for i in range(sides):
            nxt = (i + 1) % sides
            faces.append((j*sides+i, j*sides+nxt, (j+1)*sides+nxt, (j+1)*sides+i))
    faces.append(tuple((len(rings)-1)*sides+i for i in range(sides)))
    return object_mesh(name, vertices, faces, material, phase, stage)


def arch_outline(width, height):
    r = width / 2
    spring = height - r
    points = [(-r, 0), (r, 0)]
    points += [(r * math.cos(t), spring + r * math.sin(t)) for t in [i/12*math.pi for i in range(13)]]
    return points


def arch_object(name, width, height, bottom, inner, outer, angle, material='ivory', phase=2, stage=2):
    outline = arch_outline(width, height)
    points = []
    for radial in [inner, outer]:
        for tangent, y in outline:
            points.append((math.cos(angle)*tangent + math.sin(angle)*radial,
                           bottom+y,
                           -math.sin(angle)*tangent + math.cos(angle)*radial - 0.09))
    n = len(outline)
    faces = [tuple(reversed(range(n))), tuple(range(n, n*2))]
    faces += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
    return object_mesh(name, points, faces, material, phase, stage)


# The L2 body widens continuously into the funded residence below. Its window
# recesses are actually boolean-cut into one closed solid, not an open cage.
keep = cross_section_volume('PALACE_BLENDER_CONTINUOUS_INHABITED_KEEP', [
    (1.34, 0.53), (1.43, 0.49), (1.53, 0.37), (1.60, 0.335),
    (2.31, 0.335), (2.35, 0.35), (2.40, 0.35),
], sides=8, center=(0, -0.09), phase=2, material='ivory', stage=2)
for i in range(8):
    angle = i / 8 * math.tau
    cutter = arch_object(f'WINDOW_RECESS_CUTTER_{i}', 0.168, 0.55, 1.72, 0.245, 0.39, angle)
    modifier = keep.modifiers.new(f'Authored_window_recess_{i}', 'BOOLEAN')
    modifier.operation = 'DIFFERENCE'
    modifier.solver = 'EXACT'
    modifier.object = cutter
    bpy.context.view_layer.objects.active = keep
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    arch_object(f'PALACE_BLENDER_KEEP_RECESSED_GLAZING_{i}', 0.158, 0.539, 1.725,
                0.249, 0.254, angle, material='warmGlow', phase=2, stage=4)

# Roof rise/eave width ≈1.46/.76; roof/exposed drum ≈1.6. A single continuous
# sapphire mesh carries the entire taper from eave to apex; there is no skirt.
cross_section_volume('PALACE_BLENDER_PRINCIPAL_SAPPHIRE_CROWN', [
    (2.41, 0.38), (2.435, 0.38), (2.48, 0.357), (2.66, 0.314),
    (2.94, 0.247), (3.22, 0.177), (3.49, 0.107),
    (3.71, 0.051), (3.865, 0.006), (3.875, 0.001),
], center=(0, -0.09), phase=3)

# Closed terminal is deliberately small at macro gate. The later approved gold
# celestial crest must not substitute for the roof silhouette.
cross_section_volume('PALACE_BLENDER_CROWN_GOLD_TERMINAL', [
    (3.857, 0.011), (3.905, 0.013), (3.94, 0.028),
    (3.977, 0.011), (4.025, 0.001),
], sides=8, center=(0, -0.09), phase=3, material='gold', stage=5)

satellites = [
    ('WEST_MID', -0.70, -0.20, 2.43, 0.185, 0.72, 2),
    ('EAST_MID', 0.70, -0.20, 2.28, 0.185, 0.67, 2),
    ('WEST_REAR', -1.04, -0.76, 1.78, 0.185, 0.59, 3),
    ('EAST_REAR', 1.04, -0.76, 1.88, 0.185, 0.67, 3),
]
for name, x, z, y, radius, height, phase in satellites:
    profile = [(0, 1), (.025, 1), (.14, .84), (.42, .59), (.69, .32), (.91, .09), (1, .003)]
    cross_section_volume('PALACE_BLENDER_'+name+'_ROOF',
        [(y + h*height, r*radius) for h, r in profile], sides=12, center=(x,z), phase=phase)

# Two smaller attached shoulder pinnacles bridge the central keep and outer
# seven-spire hierarchy. Their buried bases join the same continuous keep;
# they do not become two more freestanding cylindrical buildings.
for side, name in [(-1, 'WEST'), (1, 'EAST')]:
    center = (side * 0.28, 0.18)
    cross_section_volume('PALACE_BLENDER_'+name+'_ATTACHED_PINNACLE_BODY', [
        (1.50, .11), (1.64, .09), (1.71, .075), (2.015, .075), (2.055, .09),
    ], sides=8, center=center, phase=3, material='ivory', stage=2)
    cross_section_volume('PALACE_BLENDER_'+name+'_ATTACHED_PINNACLE_ROOF', [
        (2.06, .105), (2.08, .10), (2.20, .066), (2.35, .025), (2.44, .001),
    ], sides=12, center=center, phase=3)

# Neutral source-file inspection scene; production still uses the canonical
# runtime camera/materials. The source file includes every phase object separately.
bpy.context.scene.world.color = (0.15, 0.19, 0.24)
for obj in bpy.context.scene.objects:
    obj.select_set(False)
keep.select_set(True)
bpy.context.view_layer.objects.active = keep
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'island002-palace-continuous-keep-v001.blend'))

parts = []
for obj in sorted(bpy.context.scene.objects, key=lambda o:o.name):
    if obj.type != 'MESH' or 'phase' not in obj:
        continue
    mesh = obj.data
    mesh.calc_loop_triangles()
    position, normal, uv, indices = [], [], [], []
    for triangle in mesh.loop_triangles:
        n = mesh.polygons[triangle.polygon_index].normal
        normal_three = (n.x, n.z, -n.y)
        for vertex_index in triangle.vertices:
            v = obj.matrix_world @ mesh.vertices[vertex_index].co
            point = (v.x, v.z, -v.y)
            position.extend(round(float(c), 7) for c in point)
            normal.extend(round(float(c), 7) for c in normal_three)
            uv.extend((round(math.atan2(point[0], point[2]+.09)/math.tau+.5, 7), round(point[1]/4.1, 7)))
            indices.append(len(indices))
    parts.append(dict(name=obj.name, phase=int(obj['phase']), stage=int(obj['constructionStage']),
                      material=obj['materialKey'], position=position, normal=normal, uv=uv, index=indices))
packet = dict(schemaVersion=1, family='blender-continuous-roof-and-keep',
              coordinateSystem='Three.js right-handed Y up; palace local +Z arrival',
              sourceSha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
              authoredIn=bpy.app.version_string, parts=parts)
EXPORT.write_text(json.dumps(packet, separators=(',',':'))+'\n')
summary = dict(source=packet['sourceSha256'], blend='island002-palace-continuous-keep-v001.blend',
               generatedMesh=str(EXPORT.relative_to(ROOT)), objects=len(parts),
               triangles=sum(len(p['index'])//3 for p in parts),
               roofRise=1.465, roofWidth=.76, maxHeight=4.025,
               approval='pending independent runtime macro review')
(OUT/'build-v001.json').write_text(json.dumps(summary, indent=2)+'\n')
print(json.dumps(summary, indent=2))
