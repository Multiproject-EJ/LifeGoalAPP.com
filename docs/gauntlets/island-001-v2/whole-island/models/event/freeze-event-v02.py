from pathlib import Path
import runpy,json,hashlib
P=Path(__file__).resolve().parent
ctx=runpy.run_path(str(P/'verify-event-v02.py'));g=ctx['g'];vals=ctx['vals'];result=ctx['result'];material_checks=[]
for n in g['nodes']:
 if 'mesh' not in n or 'split-blue-dome-shell' not in ' '.join(n.get('extras',{}).get('sourceParts',[])):continue
 for prim in g['meshes'][n['mesh']]['primitives']:
  channels=[key for key in prim['attributes'] if key.startswith('COLOR_')]
  for channel in channels:
   accessor=g['accessors'][prim['attributes'][channel]];divisor={5121:255,5123:65535}.get(accessor['componentType'],1) if accessor.get('normalized') else 1
   colors=vals(prim['attributes'][channel]);assert all(all(abs(c/divisor-1)<1e-6 for c in v[:3]) for v in colors)
  material_checks.append({'node':n['name'],'material':g['materials'][prim['material']]['name'],'vertexColorsWhite':True})
assert len(material_checks)==4
old=json.loads((P/'event-v01-export-checks.json').read_text());new={r['node']:r for r in result['meshes']}
unchanged=[]
for r in old['meshes']:
 if r['owner']=='observatory-armillary' or 'garden-colors' in ' '.join(r['materials']):
  assert r['signature']==new[r['node']]['signature'],r['node'];unchanged.append(r['node'])
assert all(v['passed'] for v in json.loads((P/'event-v02-support-checks.json').read_text()))
clear=json.loads((P/'event-v02-aperture-clearance-checks.json').read_text());assert not clear['intrudingMeshes'] and all(a['passed'] for a in clear['aperture'])
# Source path resolution is explicit at invocation below if run from worktree.
source=Path.cwd()/'scripts/island001-v2-blender/observatory.py'
(P/'event-v02.py').write_bytes(source.read_bytes())
(P/'event-v02-material-checks.json').write_text(json.dumps(material_checks,indent=2)+'\n')
(P/'event-v02-freeze.json').write_text(json.dumps({'version':'event-v02','frozen':True,'unchangedArmillaryAndGardenNodes':unchanged,'files':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in [P/'event-v02.py',P/'event-v02.glb',P/'event-v02.blend']},'v01Preserved':hashlib.sha256((P/'event-v01.glb').read_bytes()).hexdigest()=='2847de95531921946043348d597bf64a4249e39a46a43aca9ff92a9b01cd2137'},indent=2)+'\n')
backup=P/'event-v02.blend1'
if backup.exists():backup.unlink()
print('Frozen: actual materials, positive roof supports, aperture, lift, unchanged instrument and gardens verified')
