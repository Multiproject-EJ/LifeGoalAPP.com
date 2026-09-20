import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const THREE = require('three');
const source = readFileSync('src/features/gamification/level-worlds/dev/Island4OpeningPalaceThreeModel.ts','utf8');
const output = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exported = {};
new Function('require','exports',output)(require,exported);
const materials = new Proxy({}, {get:()=>new THREE.MeshStandardMaterial()});
const model = exported.createIsland4OpeningPalaceModel({level:3,quality:'high',materials});
model.updateMatrixWorld(true);
const ray = (x,y,z,dx,dy,dz) => new THREE.Raycaster(new THREE.Vector3(x,y,z),new THREE.Vector3(dx,dy,dz)).intersectObject(model,true).map(h=>({part:h.object.name,distance:+h.distance.toFixed(3)}));
const bounds = new THREE.Box3().setFromObject(model);
const failures=[];
const check=(name,ok)=>{console.log((ok?'PASS ':'FAIL ')+name);if(!ok)failures.push(name);};
check('stairs stay before protected route radius',exported.OPENING_PALACE_ENVELOPE.stairFront<exported.OPENING_PALACE_ENVELOPE.protectedRouteRadius);
check('entry ray enters true lower hall',!ray(0,.7,3,0,0,-1).some(h=>h.distance<3));
// Probe the open middle-storey bay above the revised 1.97-world-Y rail.
check('upper aperture above balcony rail is a true void',!ray(0,2.3,3,0,0,-1).some(h=>h.distance<3));
check('compact height ceiling respected',bounds.max.y<=exported.OPENING_PALACE_ENVELOPE.maxHeight+.001);
check('third storey is actually built',!!model.getObjectByName('upper-hall'));
check('runner uses tread annuli rather than interior pie wedges', (()=>{
  for(let i=1;i<7;i++){
    const n=model.getObjectByName('STAIR_RUNNER_'+i);
    if(!n||new THREE.Box3().setFromObject(n).min.z<1.39)return false;
  }
  return !model.getObjectByName('STAIR_RUNNER_0')&&!!model.getObjectByName('PALACE_LANDING_RUNNER');
})());
check('runner has connecting risers and a deliberate foot trim',
  [2,3,4,5,6].every(i=>!!model.getObjectByName('STAIR_RUNNER_RISER_'+i))&&!!model.getObjectByName('STAIR_RUNNER_FOOT_TRIM'));
check('four coherent turret groups',model.getObjectByName('palace-turrets').children.length===4);
check('crown top remains above dome',new THREE.Box3().setFromObject(model.getObjectByName('crown')).max.y>3.8);
check('all meshes finite and named', (()=>{let good=true;model.traverse(n=>{if(!n.isMesh)return;if(!n.name)good=false;const p=n.geometry.getAttribute('position');for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i]))good=false;});return good;})());
check('all visible meshes have unique part names and authored reveal stages', (()=>{
  const names=new Set();let good=true;
  model.traverse(n=>{if(!n.isMesh)return;if(names.has(n.name)||!Number.isInteger(n.userData.constructionStage)||n.userData.constructionStage<1||n.userData.constructionStage>5)good=false;names.add(n.name);});return good;
})());
check('actual transformed geometry stays inside protected route', (()=>{
  let good=true;const v=new THREE.Vector3();
  model.traverse(n=>{if(!n.isMesh)return;const p=n.geometry.getAttribute('position');for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld);if(Math.hypot(v.x,v.z)>=exported.OPENING_PALACE_ENVELOPE.protectedRouteRadius)good=false;}});return good;
})());
const meshSnapshot = model => {
  model.updateMatrixWorld(true);
  const result = new Map();
  model.traverse(n=>{if(n.isMesh)result.set(n.name,JSON.stringify({position:Array.from(n.geometry.getAttribute('position').array),matrix:n.matrixWorld.elements}));});
  return result;
};
for (const [from,to] of [[1,2],[2,3]]) {
  const a=meshSnapshot(exported.createIsland4OpeningPalaceModel({level:from,quality:'high',materials}));
  const b=meshSnapshot(exported.createIsland4OpeningPalaceModel({level:to,quality:'high',materials}));
  check('funded L'+from+' meshes retained exactly in L'+to,[...a].every(([name,mesh])=>b.get(name)===mesh));
}
console.log(JSON.stringify({bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},lowerEntryRay:ray(0,.7,3,0,0,-1),upperWindowRay:ray(0,2.3,3,0,0,-1)},null,2));
if(failures.length)process.exitCode=1;
