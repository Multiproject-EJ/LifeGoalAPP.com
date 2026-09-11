"""Read-only checks on the exported binary; no visual-quality verdict."""
import json,struct,math,hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parent
path=HERE/'family02-correction-b04.glb'
b=path.read_bytes();assert b[:4]==b'glTF'
ln=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+ln]);start=20+ln;binary=b[start+8:]
formats={5126:('f',4),5125:('I',4),5123:('H',2),5121:('B',1)}
widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def values(i):
    a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];fmt,size=formats[a['componentType']];n=widths[a['type']];stride=v.get('byteStride',n*size);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt*n,binary,offset+j*stride) for j in range(a['count'])]
parents={child:i for i,node in enumerate(g['nodes']) for child in node.get('children',[])}
records=[];bboxmin=[math.inf]*3;bboxmax=[-math.inf]*3;radius=0
for i,node in enumerate(g['nodes']):
    assert not any(k in node for k in ['matrix','translation','rotation','scale']),f'Non-identity transform {node.get("name")}'
    if 'mesh' not in node:continue
    e=node.get('extras',{});assert e['buildLevel'] in [1,2];assert e['constructionStage'] in [1,2,3,4]
    assert g['nodes'][parents[i]]['name']==e['semanticOwner'];assert e['sourceParts']
    signatures=[];count=0;degenerate=0
    for primitive in g['meshes'][node['mesh']]['primitives']:
        pos=values(primitive['attributes']['POSITION']);indices=[v[0] for v in values(primitive['indices'])]
        assert len(indices)%3==0 and all(0<=j<len(pos) for j in indices)
        count+=len(indices)//3
        for p in pos:
            assert all(math.isfinite(x) for x in p)
            for ax,x in enumerate(p):bboxmin[ax]=min(bboxmin[ax],x);bboxmax[ax]=max(bboxmax[ax],x)
            radius=max(radius,math.hypot(p[0],p[2]))
        for attribute in primitive['attributes'].values():assert all(all(math.isfinite(x) for x in v) for v in values(attribute))
        for k in range(0,len(indices),3):
            a,c,d=[pos[indices[k+j]] for j in range(3)];u=[c[j]-a[j] for j in range(3)];v=[d[j]-a[j] for j in range(3)]
            cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
            if sum(x*x for x in cross)<1e-20:degenerate+=1
        signatures.append(hashlib.sha256(json.dumps({'positions':pos,'indices':indices,'material':primitive['material']},separators=(',',':')).encode()).hexdigest())
    records.append({'node':node['name'],'buildLevel':e['buildLevel'],'stage':e['constructionStage'],'triangles':count,'degenerateTriangles':degenerate,'signature':hashlib.sha256(''.join(signatures).encode()).hexdigest(),'sourceParts':e['sourceParts']})
assert radius<=1.6 and abs(bboxmin[1])<1e-6
expected={'hatchery-terraces':1,'hatchery-wings':2,'hatchery-conservatory':3,'hatchery-egg':4}
for name,stage in expected.items():assert any(n.get('name')==name and n['extras']['constructionStage']==stage for n in g['nodes'])
roof=json.loads((HERE/'family02-correction-b04-support-checks.json').read_text());assert roof['noBooleanModifiers'] and all(r['passed'] for r in roof['roofChecks'])
parts={p for r in records for p in r['sourceParts']}
for check in roof['roofChecks']:
    assert check['roof'] in parts
    for support in check['solidSupports']:assert support['name'] in parts and support['triangles']>0
stages={str(level):{'meshes':sum(r['buildLevel']<=level for r in records),'triangles':sum(r['triangles'] for r in records if r['buildLevel']<=level),'signatures':{r['node']:r['signature'] for r in records if r['buildLevel']<=level}} for level in [1,2,3]}
assert all(stages['2']['signatures'][k]==v for k,v in stages['1']['signatures'].items())
assert stages['3']==stages['2']
result={'status':'mechanical-passed-awaiting-independent-visual-QC','asset':path.name,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'axes':'Y-up/front+Z/ground0','bbox':{'min':bboxmin,'max':bboxmax},'maxRadius':radius,'levels':stages,'additiveL1PreservedInL2':True,'L3MacroEqualsL2':True,'qualityTiers':'Same maximal asset in all quality tiers for macro; optimization deferred','meshCount':len(records),'triangles':sum(r['triangles'] for r in records),'degenerateTriangles':sum(r['degenerateTriangles'] for r in records),'roofSupportStations':sum(len(r['stations']) for r in roof['roofChecks']),'meshes':records,'materials':[{'name':m['name'],'alphaMode':m.get('alphaMode','OPAQUE'),'doubleSided':m.get('doubleSided',False)} for m in g['materials']]}
(HERE/'family02-correction-b04-export-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['status','sha256','bytes','bbox','maxRadius','meshCount','triangles','degenerateTriangles','roofSupportStations']},indent=2))
