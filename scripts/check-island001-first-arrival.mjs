import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
import {writeFileSync,mkdirSync} from 'node:fs';
await build({stdin:{contents:`
import {islandRunFirstArrivalTests} from './src/features/gamification/level-worlds/services/__tests__/islandRunFirstArrival.test';
import {expeditionShipThreeContractTests} from './src/features/gamification/level-worlds/services/__tests__/expeditionShipThreeContract.test';
import {createIsland001FirstArrival} from './src/features/gamification/level-worlds/dev/Island001FirstArrival';
import * as THREE from 'three';
let failed=0;for(const test of [...islandRunFirstArrivalTests,...expeditionShipThreeContractTests]) {try{await test.run();console.log('PASS',test.name);}catch(e){failed++;console.log('FAIL',test.name,String(e));}}
const scene=new THREE.Scene(),p=new THREE.Group(),s=new THREE.Group(),c=new THREE.PerspectiveCamera(44,0.5,.1,300);
scene.add(p,s);const a=createIsland001FirstArrival(scene,p,s,[0,1,7]);
for(const t of [0,5,9,13,18,20,22,24,26,29]){a.update(t,.016,c,false,false);if(!Number.isFinite(c.position.x))throw Error('nonfinite camera');}
if(p.position.distanceTo(new THREE.Vector3(0,1,7))>1e-7)throw Error('token missed start');
p.position.set(2,1,8);a.update(30,.016,c,false,false);if(p.position.x!==2)throw Error('cinematic overwrote gameplay after handoff');
a.dispose();const b=createIsland001FirstArrival(scene,p,s,[0,1,7]);b.update(29,0,c,true,false);if(p.position.distanceTo(new THREE.Vector3(0,1,7))>1e-7)throw Error('skip/reduced motion missed start');b.dispose();
console.log('PASS actual scene player endpoint, handoff ownership, skip and disposal');
process.exit(failed ? 1 : 0);
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/check-arrival-bundle.mjs'});
await import(pathToFileURL(path.resolve('work/check-arrival-bundle.mjs')).href);
