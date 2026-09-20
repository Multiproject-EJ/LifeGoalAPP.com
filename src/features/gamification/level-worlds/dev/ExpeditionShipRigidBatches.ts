import * as THREE from 'three';

const ALLOWED = new Set([
  'walker-hip-mechanism', 'walker-knee-mechanism', 'walker-ankle-joint',
  'walker-upper-leg', 'walker-lower-leg', 'walker-upper-armour',
  'walker-lower-armour', 'walker-adaptive-foot',
]);

function identicalGeometry(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  if (JSON.stringify(a.groups) !== JSON.stringify(b.groups)) return false;
  const names = Object.keys(a.attributes).sort();
  if (names.join() !== Object.keys(b.attributes).sort().join()) return false;
  for (const name of [...names, 'index']) {
    const x = name === 'index' ? a.index : a.attributes[name];
    const y = name === 'index' ? b.index : b.attributes[name];
    if (!x || !y) { if (x !== y) return false; continue; }
    if (x.itemSize !== y.itemSize || x.normalized !== y.normalized || x.array.length !== y.array.length) return false;
    for (let i=0;i<x.array.length;i++) if (x.array[i] !== y.array[i]) return false;
  }
  return true;
}

/** Reuse identical rigid surfaces without changing a single vertex or rig pose.
 * Named logical parts remain at the original parents. Only leaf surfaces move
 * into instance batches; each batch exposes its logical instance parts.
 */
export function batchExpeditionRigidSurfaces(root: THREE.Group) {
  const candidates: THREE.Mesh[]=[];
  root.traverse(o=>{if(o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && !o.children.length && ALLOWED.has(o.name)) candidates.push(o);});
  const buckets: THREE.Mesh[][]=[];
  const materialKey=(m:THREE.Mesh)=>(Array.isArray(m.material)?m.material:[m.material]).map(v=>v.uuid).join(',');
  for(const mesh of candidates) {
    const bucket=buckets.find(b=>b[0].name===mesh.name && materialKey(b[0])===materialKey(mesh)
      && b[0].castShadow===mesh.castShadow && b[0].receiveShadow===mesh.receiveShadow
      && b[0].renderOrder===mesh.renderOrder && identicalGeometry(b[0].geometry,mesh.geometry));
    if(bucket)bucket.push(mesh);else buckets.push([mesh]);
  }
  const updates:Array<()=>void>=[], batches:THREE.InstancedMesh[]=[], retiredGeometries=new Set<THREE.BufferGeometry>();
  const retainedGeometries=new Set<THREE.BufferGeometry>();
  for(const meshes of buckets.filter(b=>b.length>1)) {
    const first=meshes[0];
    const batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
    batches.push(batch);
    retainedGeometries.add(first.geometry);
    batch.name=`RIGID_INSTANCES_${first.name}_${updates.length}`;
    batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.renderOrder=first.renderOrder;
    batch.frustumCulled=false;
    const proxies=meshes.map((mesh,index)=>{
      const proxy=new THREE.Object3D();proxy.copy(mesh,false);
      proxy.userData={...mesh.userData,rigidBatch:batch.name,instanceIndex:index};
      const parent=mesh.parent!; const order=parent.children.indexOf(mesh);
      parent.remove(mesh);parent.add(proxy);
      parent.children.splice(parent.children.indexOf(proxy),1);parent.children.splice(order,0,proxy);
      retiredGeometries.add(mesh.geometry);
      return proxy;
    });
    batch.userData.logicalParts=proxies.map((p,index)=>({name:p.name,parent:p.parent!.name,instanceIndex:index}));
    root.add(batch);
    const inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4(),hidden=new THREE.Matrix4().makeScale(0,0,0);
    const sync=()=>{
      inverse.copy(batch.matrixWorld).invert();
      let lastVisible=-1;
      for(let i=0;i<proxies.length;i++){
        let visible=true;
        for(let p:THREE.Object3D|null=proxies[i];p;p=p.parent)if(!p.visible){visible=false;break;}
        if(visible){matrix.multiplyMatrices(inverse,proxies[i].matrixWorld);batch.setMatrixAt(i,matrix);lastVisible=i;}
        else batch.setMatrixAt(i,hidden);
      }
      batch.count=lastVisible+1;batch.instanceMatrix.needsUpdate=true;
    };
    updates.push(sync);
  }
  return {
    sync:()=>{root.updateMatrixWorld(true);updates.forEach(update=>update());},
    dispose:(disposeInstances=true)=>{if(disposeInstances)batches.forEach(batch=>batch.dispose());retiredGeometries.forEach(g=>{if(!retainedGeometries.has(g))g.dispose();});},
  };
}
