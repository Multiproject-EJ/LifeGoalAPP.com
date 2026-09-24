import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
  const {createSunshoreSeaLife}=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island5SunshoreV2SeaLife.ts');
  for(const quality of ['high','low']) {
    const ocean=createSunshoreSeaLife(quality), animals=ocean.root.children;
    const seen=new Set(), counts=new Set();let nearest=Infinity, largestStep=0;const previous=new Map();
    for(let tick=0;tick<=3600;tick++) {
      ocean.update(tick/10);let visible=0;
      for(const a of animals) {
        const p=a.position,r=Math.hypot(p.x,p.z);assert(Number.isFinite(r));nearest=Math.min(nearest,r);
        if(a.visible&&r<17) {visible++;seen.add(a.userData.species);const old=previous.get(a);if(old&&Math.hypot(old.x,old.z)<17)largestStep=Math.max(largestStep,p.distanceTo(old));}
        previous.set(a,p.clone());
      }
      counts.add(visible);
    }
    assert(nearest>8.5,'Swimmers must stay outside island and route');
    assert(largestStep<.4,'No near-shore jumps between successive frames');
    assert.equal(seen.size,6,'Every species must visit visible water during six minutes');
    assert(counts.size>8,'Encounter population must vary over time');
    ocean.update(12);const first=animals.map(a=>a.position.clone());ocean.update(42);
    assert(animals.some((a,i)=>a.position.distanceTo(first[i])>2),'No shared 30-second scene loop');
    ocean.update(12);assert(animals.every((a,i)=>a.position.distanceTo(first[i])<1e-8),'Deterministic elapsed-time poses');
    console.log(JSON.stringify({quality,population:animals.length,species:[...seen],nearest,largestStep,populationStates:counts.size}));
  }
} finally {await server.close();}
