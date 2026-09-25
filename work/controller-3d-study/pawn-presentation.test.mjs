import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const result=await build({entryPoints:['src/features/gamification/level-worlds/dev/islandPawnPresentation.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {choosePawnCamera,pawnSightBlocked,shortestPawnAngle,tileTrailOpacity,completedPawnHops}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const tower={min:[-3,0,-3],max:[3,10,3]};
assert.equal(pawnSightBlocked([0,9,6],[0,1,-6],tower),true);
assert.equal(pawnSightBlocked([9,9,6],[9,1,-6],tower),false);
for(let tile=0;tile<36;tile++){
 const angle=tile*Math.PI*2/36,target=[Math.sin(angle)*6,1,Math.cos(angle)*6];
 const clear=choosePawnCamera(target,0,[]); assert.equal(clear.heading,0);assert.equal(clear.height,8.4);
 const chosen=choosePawnCamera(target,0,[tower]);assert.equal(chosen.blocked,0,`Tower must not obstruct tile ${tile}`);
 const eye=[target[0]+Math.sin(chosen.heading)*10.8,target[1]+chosen.height,target[2]+Math.cos(chosen.heading)*10.8];
 assert.equal(pawnSightBlocked(eye,target,tower),false);
}
assert.ok(Math.abs(shortestPawnAngle(Math.PI-.1,-Math.PI+.1)-.2)<1e-8);
assert.ok(tileTrailOpacity(0,true)>tileTrailOpacity(0,false)*3);
assert.ok(tileTrailOpacity(500,false)<tileTrailOpacity(100,false));
assert.equal(tileTrailOpacity(1250,false),0);assert.equal(tileTrailOpacity(2200,true),0);
assert.equal(tileTrailOpacity(650,true,true),0);
assert.deepEqual(completedPawnHops([50,50,50,50],175,-1),[{index:0,at:50},{index:1,at:100},{index:2,at:150}]);
assert.deepEqual(completedPawnHops([50,50,50,50],200,2),[{index:3,at:200}]);
assert.deepEqual(completedPawnHops([50],49,-1),[]);
assert.equal(choosePawnCamera([0,1,-6],0,[tower],()=>0).heading,0,'Open space within a broad bound must not cause a camera turn');
console.log('PASS: 36 tile sight-lines around synthetic tower, open-layout stability, angle wrap, trail decay and landing contrast. Not a visual audit of 20 authored islands.');
