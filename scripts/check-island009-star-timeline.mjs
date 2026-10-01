import ts from 'typescript';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const code = ts.transpileModule(readFileSync('src/features/gamification/level-worlds/dev/Island9StarBeneathTimeline.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.ESNext}}).outputText;
const {resolveStarBeneathPose:pose,STAR_BENEATH_FINALE_SECONDS:duration}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const end=pose({stage:8,transitionAge:duration,playing:true,reducedMotion:false});
for(const reducedMotion of [false,true]) for(let stage=0;stage<=8;stage++) {
 const loaded=pose({stage,transitionAge:0,playing:false,reducedMotion});
 assert.equal(loaded.active,false);assert.equal(loaded.stage,stage);assert.equal(loaded.starRise,stage===8?1:0);
}
for(let age=0;age<=duration;age+=.1){
 const p=pose({stage:8,transitionAge:age,playing:true,reducedMotion:false});
 assert(Object.values(p).every(x=>typeof x==='boolean'||Number.isFinite(x)));
 assert(p.starRise>=0&&p.starRise<=1);assert(p.constellation>=0&&p.constellation<=1);
 assert.deepEqual(p,pose({stage:8,transitionAge:age,playing:true,reducedMotion:false}));
 const reduced=pose({stage:8,transitionAge:age,playing:true,reducedMotion:true});assert.deepEqual(reduced,end);
}
assert.equal(pose({stage:8,transitionAge:2,playing:true,reducedMotion:false}).active,true);
assert.equal(pose({stage:3,transitionAge:3,playing:true,reducedMotion:false}).active,false);
assert.equal(pose({stage:NaN,transitionAge:NaN,playing:true,reducedMotion:false}).stage,0);
console.log('PASS: staged loading, deterministic absolute-time choreography, bounded finale, reduced-motion terminal equivalence.');
const {createStarBeneathPlayback}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let latest;
const cursor=createStarBeneathPlayback(p=>latest=p);
cursor.update({activatedStages:8,constructionSequence:0},true);assert.equal(cursor.active,false);assert.equal(latest.cooling,1);
cursor.update({activatedStages:8,constructionSequence:1});assert.equal(cursor.active,true);
cursor.animate(100,false);assert.equal(latest.starRise,0);
cursor.update({activatedStages:8,constructionSequence:1});cursor.animate(104,false);assert(latest.starRise>0);
cursor.animate(104.1,true);assert.equal(cursor.active,false);assert.equal(latest.cooling,1);
cursor.animate(105,false);assert.equal(latest.cooling,1);assert.equal(cursor.active,false);
cursor.update({activatedStages:3,constructionSequence:0},true);assert.equal(latest.starRise,0);assert.equal(latest.stage,3);
console.log('PASS: reload snapshot, replay sequence, no duplicate restart, mid-play reduced-motion cancellation.');
