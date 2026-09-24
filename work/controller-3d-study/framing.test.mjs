import assert from 'node:assert/strict';
import * as THREE from 'three';
import {controllerFraming} from '../../src/features/gamification/level-worlds/components/living-controller/framing.js';
import {PILL} from '../../src/features/gamification/level-worlds/components/living-controller/multiplier-hologram.js';
for(const aspect of [1,1.5,1.65,2]){
 const frame=controllerFraming(aspect),camera=new THREE.PerspectiveCamera(32,aspect,.1,100);
 camera.position.set(0,frame.y,frame.z);camera.lookAt(0,frame.y,0);camera.updateMatrixWorld();
 for(const p of [[-PILL.width/2,PILL.y+.35,.23],[PILL.width/2,PILL.y+.35,.23],[-3,-1.65,.4],[3,-1.65,.4]]){
  const v=new THREE.Vector3(...p).project(camera);
  assert.ok(Math.abs(v.x)<.98&&Math.abs(v.y)<.98,'Pill and handles stay inside viewport');
 }
}
console.log('PASS: pill and shell framing across portrait/mobile/wide aspect ratios');
