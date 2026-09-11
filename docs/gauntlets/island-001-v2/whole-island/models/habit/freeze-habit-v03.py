from pathlib import Path
import runpy,json,hashlib,math
P=Path(__file__).resolve().parent
ctx=runpy.run_path(str(P/'verify-habit-v03.py'));g=ctx['g'];vals=ctx['vals'];result=ctx['result']
assert result['triangles']<=23153
assert result['degenerateTriangles']==0
old=json.loads((P/'habit-v02-export-checks.json').read_text());new={r['node']:r for r in result['meshes']};unchanged=[]
for r in old['meshes']:
 if r['owner']!='oak-canopy':
  assert r['signature']==new[r['node']]['signature'],r['node'];unchanged.append(r['node'])
near=[]
for n in g['nodes']:
 if 'mesh' not in n:continue
 for prim in g['meshes'][n['mesh']]['primitives']:
  if any(.20<y<1.15 and math.hypot(x-.72,z-1.07)<.20 for x,y,z in vals(prim['attributes']['POSITION'])):near.append(n['name'])
assert not near
(P/'habit-v03.py').write_bytes((Path.cwd()/'scripts/island001-v2-blender/oak.py').read_bytes())
previous={v:hashlib.sha256((P/(v+'.glb')).read_bytes()).hexdigest() for v in ['habit-v01','habit-v02']}
assert previous['habit-v02']=='68dc4983a6b803f0705bc3ac15d3bd9fd1be5448b398f1d12e878e9c0d36a458'
assert previous['habit-v01']=='e714b56ef956abc087dad0fc9670b9d6f8f2f9a2d94760b0a78a1cf3ed53b604'
(P/'habit-v03-freeze.json').write_text(json.dumps({'version':'habit-v03','frozen':True,'liftClearancePassed':True,'allNonCanopySignaturesUnchanged':unchanged,'priorFilesPreserved':previous,'files':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in [P/'habit-v03.py',P/'habit-v03.glb',P/'habit-v03.blend']}},indent=2)+'\n')
print('Frozen: exact non-canopy signatures, lift, geometry budget and prior files verified')
