import assert from 'node:assert/strict';
import {createServer} from 'vite';
import * as THREE from 'three';
import fs from 'node:fs';
const server=await createServer({appType:'custom',configFile:false,cacheDir:'.vite-cache/keep-frozen-world-check',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const world=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');
 const frozen=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrozenWorldThreeModel.ts');
 const mats=world.createIsland3FrostmoonMaterials();
 const levels=[1,2,3].map(level=>world.buildIsland3FrostmoonLandmark({id:'boss',position:[0,0,0]},level,'high',mats,{constructionPreview:'source'}));
 const meshes=o=>{const a=[];o.traverse(m=>{if(m.isMesh&&!m.userData.constructionTemporary)a.push(m);});return a;};
 const signature=m=>{m.updateWorldMatrix(true,false);return JSON.stringify([m.geometry.type,Array.from(m.geometry.attributes.position.array),m.geometry.index?Array.from(m.geometry.index.array):null,m.matrixWorld.elements.map(n=>+n.toFixed(5)),Array.isArray(m.material)?m.material.map(v=>v.name):m.material.name]);};
 const continuity=[];
 for(let i=0;i<2;i++) {
  const next=new Map();for(const m of meshes(levels[i+1])){const s=signature(m);next.set(s,(next.get(s)||0)+1);}
  const missing=[];for(const m of meshes(levels[i])){const s=signature(m);if(next.get(s))next.set(s,next.get(s)-1);else missing.push({name:m.name,parent:m.parent.name,parameters:m.geometry.parameters,matrix:m.matrixWorld.elements});}
  continuity.push({transition:`L${i+1}-L${i+2}`,missing});
  assert.deepEqual(missing,[],`Funded Keep geometry must remain identical in L${i+2}`);
 }
 for (const root of levels.slice(0,2)) assert(!root.getObjectByName('ISLAND_3_AURORA_KEEP_MAIN_SNOW_COPPER_GABLE_ROOF'),'main high roof funded only at L3');
 assert(levels[2].getObjectByName('ISLAND_3_AURORA_KEEP_MAIN_SNOW_COPPER_GABLE_ROOF'));
 const frozenRoot=frozen.createIsland3FrozenWorld(mats,'high');
 for(const name of ['ISLAND_3_V2_STATIC_TERRAIN','ISLAND_3_V2_STATIC_PRESSURE_RIDGES','ISLAND_3_V2_STATIC_VEGETATION'])assert(frozenRoot.getObjectByName(name),'explicit safe batch root '+name);
 const frozenMeshes=meshes(frozenRoot);assert(frozenMeshes.length<30,'frozen world must use economical material batches');
 assert.equal(frozenRoot.userData.freightRampWidth,3.8);
 const samples=frozenRoot.userData.freightRampSamples;
 assert(samples.length>15&&samples[0].t<0&&samples.at(-1).t>.32,'solid ramp extends beneath both shelf landing and sea exit');
 for(const sample of samples.slice(1,-1)){
  assert(Math.abs(sample.y-THREE.MathUtils.lerp(.3,-2.75,THREE.MathUtils.smoothstep(sample.t,.04,.32)))<1e-7,'ramp follows actual cart elevation');
  const ray=new THREE.Raycaster(new THREE.Vector3(sample.x,2,sample.z),new THREE.Vector3(0,-1,0));
  frozenRoot.updateMatrixWorld(true);
  const hits=ray.intersectObjects(frozenMeshes,false);assert(hits.some(hit=>Math.abs(hit.point.y-sample.y)<.025),'actual upward-facing ramp geometry grounds cart path '+JSON.stringify({sample,hits:hits.map(h=>h.point.y)}));
 }
 assert(frozenRoot.userData.groundedHorizonCragCount>=5&&frozenRoot.userData.plantedShrubBankCount>=5,'horizon and mixed low planting present');
 for(const material of [mats.snow,mats.frostRock,mats.timber,mats.indigo]){
  assert.equal(material.map.magFilter,THREE.LinearFilter);assert.equal(material.map.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(material.map.generateMipmaps,true);assert(material.map.repeat.x<2);
 }
  const record={continuity,levels:levels.map((root,i)=>({level:i+1,meshes:meshes(root).length,bounds:new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray()})),frozenWorld:{meshes:frozenMeshes.length,triangles:frozenMeshes.reduce((n,m)=>n+(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3,0),firCount:frozenRoot.userData.plantedFirCount,shrubBankCount:frozenRoot.userData.plantedShrubBankCount,horizonCragCount:frozenRoot.userData.groundedHorizonCragCount,rampWidth:frozenRoot.userData.freightRampWidth,rampGroundedRayChecks:samples.length-2},filteredMipmappedMaterials:true};
 fs.writeFileSync('.img2threejs/island-003-v2/keep-frozen-world/geometry-check.json',JSON.stringify(record,null,2));console.log(JSON.stringify(record,null,2));
}finally{await server.close();}
