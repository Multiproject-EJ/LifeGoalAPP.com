import assert from 'node:assert/strict';
import {resolveControllerTheme as theme} from '../../src/features/gamification/level-worlds/components/living-controller/policy.js';
import {createMaxTapGuard} from '../../src/features/gamification/level-worlds/components/living-controller/max-tap-guard.js';
for(const osDark of [true,false]){
 assert.equal(theme(osDark,false,'gold',1),'ice');
 assert.equal(theme(osDark,false,'auto',2,'dark'),'light');
 assert.equal(theme(osDark,false,'auto',3,'dark'),'snow');
 assert.equal(theme(osDark,false,'auto',9,'ice'),'dark','Island 009 showcases the free dark theme');
 assert.equal(theme(osDark,false,'auto',4,'dark'),'dark');
 assert.equal(theme(osDark,false,'auto',5,'gold'),'ice','Unowned premium preference never grants entitlement');
 assert.equal(theme(osDark,false,'auto',12,'dark','treasure'),'gold');
 assert.equal(theme(osDark,true,'wood',3,'dark'),'wood','Dev preview only');
 assert.equal(theme(osDark,false,'wood',3,'dark'),'snow');
}
const g=createMaxTapGuard();g.reached(100);
assert.equal(g.protect(200,true),true);
assert.equal(g.protect(700),true);
assert.equal(g.protect(800),false,'Third rapid tap after max can wrap once bounce ends');
g.reached(2000);assert.equal(g.protect(3000),false,'One second pause skips spare taps');
g.reached(4000);g.protect(4100);assert.equal(g.protect(5100),false,'Pause is measured from last tap');
console.log('PASS: island themes, OS independence, dev isolation, default restoration and MAX tap protection');
