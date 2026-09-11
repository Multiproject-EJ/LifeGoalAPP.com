"""Prove all prior nursery/stair/terrace/egg geometry survives the final correction."""
from pathlib import Path
from collections import Counter
import struct,json,hashlib
HERE=Path(__file__).resolve().parent

def load(path):
    b=path.read_bytes();ln=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+ln]);data=b[28+ln:]
    def values(i):
        a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];fmt,size={5126:('f',4),5125:('I',4),5123:('H',2)}[a['componentType']];n={'SCALAR':1,'VEC3':3}[a['type']];off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',n*size)
        return [struct.unpack_from('<'+fmt*n,data,off+k*stride) for k in range(a['count'])]
    meshes={}
    for node in g['nodes']:
        if 'mesh' not in node:continue
        bag=Counter()
        for prim in g['meshes'][node['mesh']]['primitives']:
            pos=values(prim['attributes']['POSITION']);ids=[v[0] for v in values(prim['indices'])]
            for i in range(0,len(ids),3):bag[tuple(sorted(pos[ids[i+j]] for j in range(3)))]+=1
        meshes[node['name']]={'triangles':bag,'parts':node['extras']['sourceParts'],'level':node['extras']['buildLevel'],'stage':node['extras']['constructionStage']}
    return meshes
baseline=load(HERE/'family02-blockout-b03.glb');current=load(HERE/'family02-correction-b04.glb');checks=[]
for name,old in baseline.items():
    if name.startswith('conservatory-'):continue
    new=current[name];missing=old['triangles']-new['triangles'];extra=new['triangles']-old['triangles']
    assert not missing,name+' lost or moved prior triangles'
    assert set(old['parts']).issubset(new['parts']) and old['stage']==new['stage'] and old['level']==new['level']
    checks.append({'mesh':name,'priorTrianglesRetained':sum(old['triangles'].values()),'missingTriangles':sum(missing.values()),'addedTriangles':sum(extra.values()),'addedParts':sorted(set(new['parts'])-set(old['parts'])),'passed':True})
assert sum(len(c['addedParts']) for c in checks)==3
source=HERE/'hatchery-family02-b03.py';script=HERE.parents[4]/'scripts/island001-v2-blender/hatchery.py'
# Report frozen old binaries explicitly, independently of any current source path.
report={'status':'passed-mechanical-preservation-only','allExistingNonConservatoryTrianglesUnchanged':True,'checks':checks,'frozenB03SHA256':hashlib.sha256((HERE/'family02-blockout-b03.glb').read_bytes()).hexdigest(),'currentB04SHA256':hashlib.sha256((HERE/'family02-correction-b04.glb').read_bytes()).hexdigest()}
(HERE/'family02-correction-b04-preservation-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'priorNonConservatoryMeshes':len(checks),'priorTrianglesRetained':sum(c['priorTrianglesRetained'] for c in checks),'newShoulderTriangles':sum(c['addedTriangles'] for c in checks),'passed':True},indent=2))
