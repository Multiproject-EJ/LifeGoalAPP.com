import assert from 'node:assert/strict';
import {createServer} from 'vite';
import * as THREE from 'three';
import fs from 'node:fs';
const server=await createServer({appType:'custom',configFile:false,cacheDir:'.vite-cache/moonwell-thermal-check',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const world=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');
 const frozen=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrozenWorldThreeModel.ts');
 const mats=world.createIsland3FrostmoonMaterials();
 const levels=[1,2,3].map(level=>world.buildIsland3FrostmoonLandmark({id:'event',position:[0,0,0]},level,'high',mats,{constructionPreview:'source'}));
 const meshes=o=>{const a=[];o.traverse(m=>{if(m.isMesh&&!m.userData.constructionTemporary)a.push(m);});return a;};
 const signature=m=>{m.updateWorldMatrix(true,false);return JSON.stringify([m.geometry.type,Array.from(m.geometry.attributes.position.array),m.geometry.index?Array.from(m.geometry.index.array):null,m.matrixWorld.elements.map(n=>+n.toFixed(5)),Array.isArray(m.material)?m.material.map(v=>v.name):m.material.name]);};
 const continuity=[];
 for(let i=0;i<2;i++) {
  const next=new Map();for(const m of meshes(levels[i+1])){const s=signature(m);next.set(s,(next.get(s)||0)+1);}
  const missing=[];for(const m of meshes(levels[i])){const s=signature(m);if(next.get(s))next.set(s,next.get(s)-1);else missing.push({name:m.name,parent:m.parent.name,parameters:m.geometry.parameters,matrix:m.matrixWorld.elements});}
  continuity.push({transition:`L${i+1}-L${i+2}`,missing});
  assert.deepEqual(missing,[],`Funded Keep geometry must remain identical in L${i+2}`);
 }
 const thermal=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3MoonwellThermalPresentation.ts');
 const normal=world.buildIsland3FrostmoonLandmark({id:'event',position:[0,0,0]},3,'high',mats);
 const roleMeshes=meshes(normal).filter(m=>m.userData.moonwellThermalRole);
 const counts=Object.fromEntries(['ice','water','heater','bubble','steam'].map(role=>[role,roleMeshes.filter(m=>m.userData.moonwellThermalRole===role).length]));
 assert.deepEqual(counts,{ice:7,water:1,heater:1,bubble:5,steam:3},'roles must survive normal compaction');
 const animator=thermal.createMoonwellThermalAnimator(normal);
 animator.update({heated:false,running:false,sequence:0,previewProgress:0},0,false);
 for(const m of roleMeshes)if(['water','bubble','steam'].includes(m.userData.moonwellThermalRole))assert.equal(m.visible,false,'cold default hides all liquid/boiling effects');
 for(const m of roleMeshes.filter(m=>m.userData.moonwellThermalRole==='ice'))assert(m.visible&&m.material.opacity===1&&!m.material.transparent,'cold cover must be opaque');
 animator.update({heated:true,running:false,sequence:0,previewProgress:1},1,false);
 for(const m of roleMeshes.filter(m=>m.userData.moonwellThermalRole==='ice'))assert.equal(m.visible,false,'heated basin loses ice');
 for(const m of roleMeshes.filter(m=>m.userData.moonwellThermalRole==='water'))assert.equal(m.visible,true,'heated basin exposes water');
 animator.update({heated:true,running:false,sequence:0,previewProgress:1},1,true);
 for(const m of roleMeshes.filter(m=>['bubble','steam'].includes(m.userData.moonwellThermalRole)))assert.equal(m.visible,false,'reduced motion settles without steam/bubble movement');
 animator.dispose();
 const record={continuity,levels:levels.map((root,i)=>({level:i+1,meshes:meshes(root).length,bounds:new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray()})),normalMeshCount:meshes(normal).length,thermalRoleCounts:counts,coldOpaque:true,heatedLiquid:true,reducedMotion:true};
 fs.writeFileSync('.img2threejs/island-003-v2/moonwell-thermal/geometry-check.json',JSON.stringify(record,null,2));console.log(JSON.stringify(record,null,2));
}finally{await server.close();}
