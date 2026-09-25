import assert from 'node:assert/strict';
import {createPersonalityClock,personalityPose} from '../../src/features/gamification/level-worlds/components/living-controller/personality.js';
const base={arrivalKey:'1',activity:0,dice:24};
const clock=createPersonalityClock();
assert.equal(clock(100,base).kind,'rest');
assert.equal(clock(129,base).kind,'rest');
assert.equal(clock(130,base).kind,'wiggle');
assert.equal(clock(132,base).kind,'rest');
assert.equal(clock(160,base).kind,'cowboy');
assert.equal(clock(160.1,{...base,activity:1}).kind,'rest','Input immediately cancels idle');
assert.equal(clock(190.1,{...base,activity:1,blocked:true}).kind,'rest');
assert.equal(clock(191,{...base,activity:1,arrivalKey:'2',blocked:true}).kind,'rest');
assert.equal(clock(192,{...base,activity:1,arrivalKey:'2'}).kind,'arrival','Defer arrival until modal releases attention');
assert.equal(clock(192.1,{...base,activity:2,arrivalKey:'2'}).kind,'rest','Input cancels arrival too');
for(const flag of ['rolling','autoRolling','jackpot','hidden','reduced','blocked']){
 const c=createPersonalityClock();c(0,base);assert.equal(c(60,{...base,[flag]:true}).kind,'rest',flag);
}
const c=createPersonalityClock();c(0,base);assert.equal(c(60,{...base,dice:0}).kind,'rest');
assert.equal(personalityPose({kind:'arrival',age:0}).dark,true);
assert.ok(Math.abs(personalityPose({kind:'arrival',age:2.2999}).ry-4*Math.PI)<.001,'Exactly two turns');
assert.ok(personalityPose({kind:'arrival',age:2.3}).burst>0);
assert.equal(personalityPose({kind:'arrival',age:3.1}).burst,0);
assert.equal(personalityPose({kind:'cowboy',age:1}).cowboy,true);
for(const kind of ['arrival','wiggle','tilt','cowboy','rest'])for(let age=0;age<3.5;age+=.02){const p=personalityPose({kind,age});for(const v of Object.values(p))if(typeof v==='number')assert.ok(Number.isFinite(v));}
console.log('PASS: personality timing, interruption, modal deferral, two spins, accessibility and finite poses');
