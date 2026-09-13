import assert from 'node:assert/strict';
import {createServer} from 'vite';
import * as THREE from 'three';
const server=await createServer({appType:'custom',configFile:false,cacheDir:'.vite-cache/frostfire-interior',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const world=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts');
 const def={id:'wisdom',position:[0,0,0]};const mats=world.createIsland3FrostmoonMaterials();
 const levels=[1,2,3].map(level=>world.buildIsland3FrostmoonLandmark(def,level,'high',mats,{constructionPreview:'target'}));
 const meshes=o=>{const a=[];o.traverse(m=>{if(m.isMesh&&!m.userData.constructionTemporary)a.push(m);});return a;};
 for(let i=0;i<2;i++)assert(!levels[i].getObjectByName('ISLAND_3_FROSTFIRE_LOW_RADIAL_COPPER_ROOF'),'L1/L2 must stay open while interior is furnished');
 for(const key of ['LOW_RADIAL_COPPER_ROOF','ROOF_RIBS_BRACKETS_SNOW_SEAMS_AND_ICICLES','OPEN_LANTERN_STACK','OPEN_BOOK_CREST']) {
  const part=levels[2].getObjectByName('ISLAND_3_FROSTFIRE_'+key);assert(part,key+' missing');assert(meshes(part).every(m=>m.userData.constructionStage===5),key+' must close at stage 5');
 }
 for(const level of levels) {
  const floor=level.getObjectByName('ISLAND_3_FROSTFIRE_INTERIOR_STONE_FLOOR');assert(floor,'floor missing');
  const table=level.getObjectByName('ISLAND_3_FROSTFIRE_INTERIOR_READING_TABLE');assert(table,'reading table missing');assert(meshes(table).every(m=>m.userData.constructionStage===3));
  const readingBook=level.getObjectByName('ISLAND_3_FROSTFIRE_INTERIOR_TABLE_OPEN_BOOK');
  const bookBounds=new THREE.Box3().setFromObject(readingBook);
  const tableTop=new THREE.Vector3(0,.765,0);table.localToWorld(tableTop);
  assert(bookBounds.min.y>=tableTop.y-.003,'open book must rest above tabletop, not intersect it');
  assert(bookBounds.max.y-bookBounds.min.y<.16,'reading book must lie open on table, not stand vertically');
  const shell=level.getObjectByName('ISLAND_3_FROSTFIRE_OCTAGONAL_STONE_AND_TIMBER_SHELL');assert.equal(shell.children.length,8);assert(meshes(shell).every(m=>m.geometry.type==='BoxGeometry'),'shell must be hollow panels, not filled cylinder');
 }
 for(const level of levels.slice(1)) {
  for(const name of ['INTERIOR_REAR_HEARTH','INTERIOR_SHELF_BANK_-1','INTERIOR_SHELF_BANK_1','INTERIOR_READING_BENCH_-1','INTERIOR_READING_BENCH_1'])assert(level.getObjectByName('ISLAND_3_FROSTFIRE_'+name),name+' missing');
 }
 const signature=m=>{m.updateWorldMatrix(true,false);m.geometry.computeBoundingBox();return JSON.stringify([m.geometry.type,m.geometry.parameters,m.matrixWorld.elements.map(n=>+n.toFixed(5)),Array.isArray(m.material)?m.material.map(v=>v.name):m.material.name]);};
 for(let i=0;i<2;i++) {
  const next=new Map();for(const m of meshes(levels[i+1])){const s=signature(m);next.set(s,(next.get(s)||0)+1);}
  const missing=[];for(const m of meshes(levels[i])){const s=signature(m);if(next.get(s))next.set(s,next.get(s)-1);else missing.push(m.name||m.parent.name);}
  assert.deepEqual(missing,[],`L${i+1} funded geometry must remain identical in L${i+2}`);
 }
 console.log('PASS: hollow room, visible L1/L2 interior, roof stage 5, interior stage ownership, funded geometry retained across both upgrades.');
}finally{await server.close();}
