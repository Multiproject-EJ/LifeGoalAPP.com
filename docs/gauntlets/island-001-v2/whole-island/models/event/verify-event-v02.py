"""Read the actual GLB bytes; verify geometry, semantics and additive stages."""
from pathlib import Path
import json,struct,math,hashlib
HERE=Path(__file__).resolve().parent;path=HERE/'event-v02.glb';raw=path.read_bytes();assert raw[:4]==b'glTF'
ln=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+ln]);data=raw[28+ln:]
def vals(i):
    a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];fmt,size={5126:('f',4),5125:('I',4),5123:('H',2),5121:('B',1)}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];stride=v.get('byteStride',n*size);off=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt*n,data,off+k*stride) for k in range(a['count'])]
parents={j:i for i,n in enumerate(g['nodes']) for j in n.get('children',[])};owners={'observatory-wings','observatory-dome','observatory-armillary'};records=[];mins=[math.inf]*3;maxs=[-math.inf]*3;radius=0
for i,node in enumerate(g['nodes']):
    assert not any(k in node for k in ['translation','rotation','scale','matrix'])
    if 'mesh' not in node:continue
    e=node['extras'];assert e['semanticOwner'] in owners and g['nodes'][parents[i]]['name']==e['semanticOwner'];assert e['buildLevel'] in [1,2,3] and e['constructionStage'] in [1,2,3,4,5];assert e['sourceParts']
    triangles=0;zero=0;finger=[];materials=[]
    for prim in g['meshes'][node['mesh']]['primitives']:
        assert prim.get('mode',4)==4;p=vals(prim['attributes']['POSITION']);ind=[v[0] for v in vals(prim['indices'])];assert len(ind)%3==0 and all(0<=x<len(p) for x in ind);triangles+=len(ind)//3
        for a in prim['attributes'].values():assert all(all(math.isfinite(x) for x in v) for v in vals(a))
        for v in p:
            for j,x in enumerate(v):mins[j]=min(mins[j],x);maxs[j]=max(maxs[j],x)
            radius=max(radius,math.hypot(v[0],v[2]))
        for j in range(0,len(ind),3):
            a,b,c=[p[ind[j+k]] for k in range(3)];u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)];cross=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);zero+=sum(x*x for x in cross)<1e-20
        material=g['materials'][prim['material']]['name'];materials.append(material);finger.append(hashlib.sha256(json.dumps([p,ind,material],separators=(',',':')).encode()).hexdigest())
    records.append({'node':node['name'],'level':e['buildLevel'],'stage':e['constructionStage'],'owner':e['semanticOwner'],'triangles':triangles,'degenerateTriangles':zero,'signature':hashlib.sha256(''.join(finger).encode()).hexdigest(),'materials':materials})
assert radius<=1.6 and maxs[1]<=2.6 and abs(mins[1])<1e-6
assert sum(r['triangles'] for r in records)<=25000
for level in [1,2,3]:assert {r['stage'] for r in records if r['level']==level}==set(range(1,6))
levels={str(l):{'addedTriangles':sum(r['triangles'] for r in records if r['level']==l),'totalTriangles':sum(r['triangles'] for r in records if r['level']<=l),'stagesInAddition':sorted({r['stage'] for r in records if r['level']==l}),'signatures':{r['node']:r['signature'] for r in records if r['level']<=l}} for l in [1,2,3]}
for lower,upper in [(1,2),(2,3)]:assert all(levels[str(upper)]['signatures'][n]==sig for n,sig in levels[str(lower)]['signatures'].items())
root=next(n for n in g['nodes'] if n.get('name')=='ISLAND_001_V2_OBSERVATORY');assert root['extras']['landmarkId']=='event' and root['extras']['sockets']['lift']==[.72,.15,1.07]
result={'status':'mechanical-pass-awaiting-whole-island-review','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'bbox':{'min':mins,'max':maxs},'radius':radius,'triangles':sum(r['triangles'] for r in records),'meshNodes':len(records),'completedOwnerMaterialBatches':len({(r['owner'],m) for r in records for m in r['materials']}),'degenerateTriangles':sum(r['degenerateTriangles'] for r in records),'additiveSignaturesPreserved':True,'levels':levels,'materials':[{'name':m['name'],'doubleSided':m.get('doubleSided',False),'emissiveFactor':m.get('emissiveFactor')} for m in g['materials']],'meshes':records}
(HERE/'event-v02-export-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['status','sha256','bytes','bbox','radius','triangles','meshNodes','completedOwnerMaterialBatches','degenerateTriangles']},indent=2))
