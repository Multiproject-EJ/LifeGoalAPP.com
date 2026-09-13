import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import * as THREE from 'three';
const output=process.argv[2];assert(output&&!fs.existsSync(output),'Use a new check receipt');
const server=await createServer({appType:'custom',configFile:false,cacheDir:'.vite-cache/frostwell-forest-check',logLevel:'error',server:{middlewareMode:true,hmr:false}});
const checks=[];
try{
 const tests=await server.ssrLoadModule('/src/features/gamification/level-worlds/services/__tests__/island5ThreePilotContract.test.ts');
 for(const test of tests.island5ThreePilotContractTests.filter(t=>/Frostwell|Frostmoon/.test(t.name))){await test.run();checks.push(test.name);console.log('PASS',test.name)}
 const {createIsland3FrostmoonMaterials}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');
 const {createIsland3SnowTree}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3SnowTreeGeometry.ts');
 const {createIsland3FrozenWorld}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrozenWorldThreeModel.ts');
 const mats=createIsland3FrostmoonMaterials(),qualities=[];
 for(const quality of ['low','medium','high']){
  const samples=[];
  for(const seed of [0,.71,1.42,2.13]){
   const tree=createIsland3SnowTree(mats,quality,2,seed);const bounds=new THREE.Box3().setFromObject(tree),size=bounds.getSize(new THREE.Vector3());let triangles=0;
   tree.traverse(m=>{if(m.isMesh){assert(Array.from(m.geometry.attributes.position.array).every(Number.isFinite));triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3}});
   assert(bounds.min.y>=-.005&&bounds.max.y<=2.1,'trees remain grounded and inside prior height envelope');
   assert(size.x<=1.7&&size.z<=1.7,'branches remain within planting footprint');assert(triangles<1500,'individual tree geometry remains bounded');
   samples.push({species:tree.userData.treeSpecies,triangles,size:size.toArray()});
  }
  const terrain=createIsland3FrozenWorld(mats,quality);let meshes=0;terrain.traverse(m=>{if(m.isMesh)meshes++});assert(meshes<30,'static vegetation retains economical material batches');qualities.push({quality,samples,compactedWorldMeshes:meshes});
 }
 fs.writeFileSync(output,JSON.stringify({status:'pass',checks,qualities,note:'Structural, animation-state and cost checks; visual quality is reviewed separately.'},null,2));
 console.log('PASS all quality tiers, grounded bounds, finite geometry and static batching');
}finally{await server.close()}
