import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const {createIslandRunTileRewardThreeObjects}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/IslandRunTileRewardThreeObjects.ts');
 const {sunshoreCreatureClearanceLift:lift}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/SunshoreCreatureClearance.ts');
 for(const quality of ['low','medium','high'])for(const heading of [0,.7,2.5]) {
  const runtime=createIslandRunTileRewardThreeObjects({tileMap:[{index:19,tileType:'traffic_light'}],tileTransforms:[{index:19,position:[0,0,3],rotationYRad:heading}],quality,compactCollectibles:true,staticBatchNonMissionRewards:true});
  const beacon=runtime.root.getObjectByName('ISLAND_RUN_TILE_OBJECT_TRAFFIC_BEACON'),lamps=[];
  beacon.traverse(o=>{if(o.name.startsWith('TRAFFIC_LAMP_'))lamps.push(o)});
  assert.equal(lamps.length,8);assert.equal(beacon.rotation.y,Math.PI-heading);
  assert.equal(beacon.position.x,0);assert.equal(beacon.position.z,2.54,'traffic pole belongs on inner tile rim');
  for(let charge=0;charge<=8;charge++) {
   runtime.setTrafficLightCharge(charge);runtime.animate(2,-1);
   assert.equal(lamps.filter(o=>o.material.emissiveIntensity>1).length,charge);
   assert.equal(beacon.rotation.y,Math.PI-heading,'signal must never spin with rewards');
  }
  runtime.setTrafficLightCharge(0);runtime.animate(3,-1);assert(lamps.every(o=>o.material.emissiveIntensity<1));
 }
 console.log('PASS shared traffic beacon: all qualities/headings, eight cumulative lamps, reset, static facing');
 let checked=0;
 for(const top of [1.05,1.6,2.85])for(const size of [.5,1.2,2.8])for(let i=0;i<2000;i++) {
  const a=i*.013,r=(i%200)/50,x=Math.cos(a)*r,z=Math.sin(a)*r,bottom=.3+Math.sin(i)*.2;
  const minX=x-size,maxX=x+size,minZ=z-size,maxZ=z+size;
  const near=Math.hypot(Math.max(minX,Math.min(0,maxX)),Math.max(minZ,Math.min(0,maxZ)));
  const far=Math.hypot(Math.max(Math.abs(minX),Math.abs(maxX)),Math.max(Math.abs(minZ),Math.abs(maxZ)));
  const offset=lift(minX,maxX,minZ,maxZ,bottom,top);
  assert(Number.isFinite(offset)&&offset>=0);
  if(near<=2.12&&far>=1.28)assert(bottom+offset>=top+.139999,'whole creature bounds must clear crown');
  checked++;
 }
 assert.equal(lift(6,7,6,7,0,3),0);
 console.log(`PASS ${checked} ring/creature-size/height clearance cases including battle-scale wings`);
}finally{await server.close();}
