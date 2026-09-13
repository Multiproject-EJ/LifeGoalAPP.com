import assert from 'node:assert/strict';
import {createServer} from 'vite';
import * as THREE from 'three';
import fs from 'node:fs';
const server=await createServer({appType:'custom',configFile:false,cacheDir:'.vite-cache/archive-inspection-check',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const world=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');
 const materials=world.createIsland3FrostmoonMaterials(); const def={id:'wisdom',position:[0,0,0]};
 const source=world.buildIsland3FrostmoonLandmark(def,3,'high',materials,{constructionPreview:'source'});
 const board=world.buildIsland3FrostmoonLandmark(def,3,'high',materials);
 const vertices=root=>{root.updateMatrixWorld(true);const result=[];const point=new THREE.Vector3();root.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){point.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);result.push(point.toArray().map(n=>Math.round(n*10000)).join(','));}});return result.sort();};
 assert.deepEqual(vertices(board),vertices(source),'inspection compaction must preserve every authored vertex in world space');
 const enclosure=board.getObjectByName('ISLAND_3_FROSTFIRE_INSPECTION_ENCLOSURE');assert(enclosure?.userData.archiveInspectionHide,'reversible enclosure root missing');
 const count=root=>root.getObjectsByProperty('isMesh',true).length;
 assert(count(enclosure)>0&&count(enclosure)<16,'enclosure batches should be populated and economical');
 const enclosedBounds=new THREE.Box3().setFromObject(enclosure);assert(enclosedBounds.max.y>2,'roof/stack inside enclosure');
 const allVertices=vertices(board);enclosure.visible=false;assert.deepEqual(vertices(board),allVertices,'inspection only changes visibility');enclosure.visible=true;assert.deepEqual(vertices(board),allVertices,'closing roof restores exact model');
 const report={vertexPreservation:true,visibilityOnly:true,sourceMeshes:count(source),boardMeshes:count(board),enclosureMeshes:count(enclosure),boundHeight:enclosedBounds.getSize(new THREE.Vector3()).y};
 fs.writeFileSync('.img2threejs/island-003-v2/archive-inspection/geometry-check.json',JSON.stringify(report,null,2));console.log(report);
}finally{await server.close();}
