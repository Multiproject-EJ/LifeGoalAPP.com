"""Bounded v008→v009 correction: enlarge only the two gold throughpass arches.

The source remains immutable. Selection requires both exact gold atlas UV and
world-space bounds; all non-selected vertices are verified unchanged.
"""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/assets/islands/island-019'
WORK = ROOT / 'work/island-visual-library/island-019-coaster-carnival/blender'
bpy.ops.wm.open_mainfile(filepath=str(WORK / 'coaster-carnival-exterior-v008.blend'))
obj = bpy.data.objects['ISLAND_19_CIRCUIT_I_STATIC_BATCH']
mesh = obj.data
uvs = mesh.uv_layers['CircuitIAtlasUV'].data
gold = set()
for loop in mesh.loops:
    uv = uvs[loop.index].uv
    if abs(uv.x - .875) < .001 and abs(uv.y - .375) < .001:
        gold.add(loop.vertex_index)
before = [v.co.copy() for v in mesh.vertices]
selected = [[], []]
inverse = obj.matrix_world.inverted()
for index in sorted(gold):
    p = obj.matrix_world @ before[index]
    if abs(p.x) > 1.08 or not 1.97 <= p.z <= 3.23:
        continue
    for face, y in enumerate([3.32, 5.48]):
        if abs(p.y - y) < .12:
            selected[face].append(index)
assert all(100 <= len(face) <= 3000 for face in selected), [len(face) for face in selected]
assert len(selected[0]) == len(selected[1]), 'Portal pair must remain symmetric'
owned = set(selected[0] + selected[1])
# No selected surface may share a face with an unselected object or fixture.
for polygon in mesh.polygons:
    count = sum(index in owned for index in polygon.vertices)
    assert count in (0, len(polygon.vertices)), 'Selection would tear an attachment'
for index in owned:
    p = obj.matrix_world @ before[index]
    p.z = 2.08 + (p.z - 2.08) * 1.25
    mesh.vertices[index].co = inverse @ p
assert all((v.co - before[v.index]).length < 1e-7 for v in mesh.vertices if v.index not in owned)
mesh.update()
obj['palaceArchCorrection'] = 'd019-v009: gold portal vertical profile ×1.25 about world Z2.08'
bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'coaster-carnival-exterior-v009.blend'))
bpy.ops.object.select_all(action='DESELECT')
root = obj.parent
root.select_set(True)
obj.select_set(True)
for child in root.children_recursive:
    child.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(filepath=str(ASSETS / 'coaster-carnival-exterior-v009.glb'),
    export_format='GLB', use_selection=True, export_apply=True,
    export_extras=True, export_yup=True, export_materials='EXPORT')
report = {'source':'v008','output':'v009','selectedVerticesPerArch':[len(face) for face in selected],
    'nonSelectedVerticesUnchanged':True,'verticalScale':1.25,'pivotBlenderZ':2.08,
    'atlas':'coaster-carnival-exterior-atlas-v008.png','requiresFinalClearanceGate':True}
(ROOT / '.img2threejs/island-019-coaster-carnival/palace-head-clearance-v009.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
