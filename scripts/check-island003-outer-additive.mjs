import assert from 'node:assert/strict';
import {createServer} from 'vite';
import * as THREE from 'three';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir='.img2threejs/island-003-v2/outer-additive';
const server=await createServer({appType:'custom',configFile:false,cacheDir:'.vite-cache/outer-additive-check',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const world=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');
 const mats=world.createIsland3FrostmoonMaterials();
 const meshes=o=>{const result=[];o.traverse(m=>{if(m.isMesh&&!m.userData.constructionTemporary)result.push(m);});return result;};
 const signature=m=>{m.updateWorldMatrix(true,false);return JSON.stringify([m.geometry.type,Array.from(m.geometry.attributes.position.array),m.geometry.index?Array.from(m.geometry.index.array):null,m.matrixWorld.elements.map(n=>+n.toFixed(5)),Array.isArray(m.material)?m.material.map(v=>v.name):m.material.name]);};
 const vertexHash=root=>{root.updateMatrixWorld(true);const points=[];for(const m of meshes(root)){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);points.push(v.toArray().map(n=>n.toFixed(4)).join(','));}}return createHash('sha256').update(points.sort().join('\n')).digest('hex');};
 const report={};
 for(const [slug,id] of [['snowfeather','hatchery'],['hearthguard','habit']])for(const quality of ['high','medium','low']) {
  const levels=[1,2,3].map(level=>world.buildIsland3FrostmoonLandmark({id,position:[0,0,0]},level,quality,mats,{constructionPreview:'source'}));
  const key=slug+'-'+quality;const l3VertexHash=vertexHash(levels[2]);
  if(process.argv.includes('--baseline')){report[key]={l3VertexHash};continue;}
  const baseline=JSON.parse(fs.readFileSync(dir+'/baseline-geometry.json'));
  if(slug==='snowfeather'){
   // One independently requested exception: retract the two existing rails
   // that crossed the front eggs. Restoring just those rails must recover
   // the exact original L3 vertex multiset, proving no wider shape change.
   const frame=levels[2].getObjectByName('ISLAND_3_SNOWFEATHER_FOUNDATION_FRAME');
   const rails=frame.children.filter(m=>m.isMesh&&m.geometry.parameters.width===.12);
   assert.equal(rails.length,2);
   const originals=rails.map(m=>({mesh:m,geometry:m.geometry,z:m.position.z}));
   for(const m of rails){assert.equal(m.geometry.parameters.depth,.92);assert.equal(m.position.z,-.33);m.geometry=new THREE.BoxGeometry(.12,.72,1.54);m.position.z=-.02;}
   const spots=[];
   for(const side of [-1,1]){
    const bay=levels[2].getObjectByName(`ISLAND_3_SNOWFEATHER_HEATED_NEST_BAY_${side<0?'LEFT':'RIGHT'}`);
    const patches=bay.children.filter(m=>m.isMesh&&m.material===mats.eggSpot);
    for(const [index,spot] of patches.entries()){
     spots.push({mesh:spot,position:spot.position.clone(),quaternion:spot.quaternion.clone()});
     const relative=spot.position.clone().sub(new THREE.Vector3(0,.86,0));
     const ellipsoid=relative.x**2/.24**2+relative.y**2/(.24*1.42)**2+relative.z**2/.24**2;
     assert(Math.abs(ellipsoid-1)<.015,'egg patch center must touch its ellipsoid');
     const angle=index/patches.length*Math.PI*2+side*.35;
     spot.position.set(Math.cos(angle)*.17,.86+(index%3-1)*.08,Math.sin(angle)*.19+.17);spot.quaternion.identity();
    }
   }
   assert.equal(vertexHash(levels[2]),baseline[key].l3VertexHash,'only two egg-intersecting rails and floating spot placement may differ from approved L3');
   for(const item of originals){item.mesh.geometry.dispose();item.mesh.geometry=item.geometry;item.mesh.position.z=item.z;}
   for(const item of spots){item.mesh.position.copy(item.position);item.mesh.quaternion.copy(item.quaternion);}
  }else assert.equal(l3VertexHash,baseline[key].l3VertexHash,`${key} approved final L3 geometry must remain unchanged`);
  const continuity=[];
  for(let i=0;i<2;i++) {
   const next=new Map();for(const m of meshes(levels[i+1])){const s=signature(m);next.set(s,(next.get(s)||0)+1);}
   const missing=[];for(const m of meshes(levels[i])){const s=signature(m);if(next.get(s))next.set(s,next.get(s)-1);else missing.push({name:m.name,parent:m.parent.name,parameters:m.geometry.parameters});}
   continuity.push({transition:`L${i+1}-L${i+2}`,missing});
   assert.deepEqual(missing,[],`${key} funded geometry must remain identical in L${i+2}`);
  }
  report[key]={l3VertexHash,l3Unchanged:slug!=='snowfeather',baselineException:slug==='snowfeather'?'Two rear foundation rails retracted and egg spots seated on ellipsoid; restoring only these contacts recovers original vertex hash':null,continuity,levels:levels.map((root,i)=>({level:i+1,meshes:meshes(root).length,bounds:new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray()}))};
 }
 const output=dir+(process.argv.includes('--baseline')?'/baseline-geometry.json':'/geometry-check.json');fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await server.close();}
