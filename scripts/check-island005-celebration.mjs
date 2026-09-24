import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false}});
try {
 const {resolveSunshoreCreatureCelebration:pose,shouldCelebrateSunshoreMaxRoll:trigger}=await server.ssrLoadModule('/src/features/gamification/level-worlds/services/islandRunCreatureCelebration.ts');
 const {resolveIslandRunMaxMultiplierThrowCadence:cadence}=await server.ssrLoadModule('/src/features/gamification/level-worlds/services/islandRunDiceThrowPresentation.ts');
 for(const island of [1,4,5,10,15])for(const status of ['ok','insufficient_dice','tutorial_order_required'])for(const strength of ['normal','hard'])assert.equal(trigger(island,status,strength),island===5&&status==='ok'&&strength==='hard');
 let first=true,count=0;const triggered=[];
 for(let roll=1;roll<=21;roll++){const next=cadence({isAtMaxAvailableMultiplier:true,firstMaxThrowPending:first,consecutiveMaxMultiplierRolls:count});if(trigger(5,'ok',next.throwStrength))triggered.push(roll);first=next.nextFirstMaxThrowPending;count=next.nextConsecutiveMaxMultiplierRolls;}
 assert.deepEqual(triggered,[1,10,20]);
 const from=[2.3,1.72,0],normal=[-1.1,1.8,1.9];const phases=new Set();let height=0;
 for(let i=0;i<720;i++){const p=pose(i/100,from,normal);assert(p);phases.add(p.phase);assert(p.position.every(Number.isFinite));assert(p.squash>.5);height=Math.max(height,p.position[1]);}
 assert.equal(phases.size,6);assert(height>5.5);assert.equal(pose(7.2,from,normal),null);
 assert.deepEqual(pose(0,from,normal).position,from);
 for(const boundary of [1.5,2.8,4.6,5.3]){const a=pose(boundary-1e-6,from,normal),b=pose(boundary+1e-6,from,normal);assert(Math.hypot(...a.position.map((v,i)=>v-b.position[i]))<1e-3,`position discontinuity at ${boundary}`);}
 const end=pose(7.2-1e-6,from,normal);assert(Math.hypot(...end.position.map((v,i)=>v-normal[i]))<1e-6);assert(Math.abs(end.blend-1)<1e-6);
 for(const t of [0,.3,.8]){const p=pose(t,from,normal,true);assert.deepEqual(p.position,normal);assert.equal(p.roll,0);assert.equal(p.spin,0);assert.equal(p.squash,1);}
 assert.equal(pose(.9,from,normal,true),null);
 console.log('PASS max-roll cadence, rejected/non-max/non-Island005 suppression, every sequence phase, continuous positions, bounce height, exact normal-motion handoff and reduced-motion suppression');
}finally{await server.close();}
