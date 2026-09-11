import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createIsland1WorldMaterials } from './Island1ThreeWorld';
import { ISLAND_5_LANDMARKS } from './island5ThreePilotContract';
import { buildIsland1AssemblyLandmark, createIsland1AssemblyCraterTerrain, createIsland1AssemblyCraterRuntime } from './Island1AssemblyCraterThreeWorld';
import { preloadIsland001V2Assets } from './Island1V2Assets';
import { prepareIslandConstructionLevelDelta } from './IslandConstructionLevelDelta';
async function startReview() {
  document.getElementById('status')!.textContent = 'Loading island models…';
  await preloadIsland001V2Assets();
const params = new URLSearchParams(location.search);
const mode = params.get('mode') || 'hall';
const view = params.get('view') || 'iso';
const quality = params.get('quality') === 'low' ? 'low' : params.get('quality') === 'medium' ? 'medium' : 'high';
const level = Math.min(3, Math.max(0, Number(params.get('level') ?? 3))) as 0|1|2|3;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc1d9d7);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
const width = params.has('phone') ? 390 : 1440, height = params.has('phone') ? 844 : 1080;
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const roomEnvironment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
const environmentTarget = pmrem.fromScene(roomEnvironment,.06);
scene.environment = environmentTarget.texture; scene.environmentIntensity = .4;
roomEnvironment.dispose(); pmrem.dispose();
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 150);
const controls = new OrbitControls(camera, renderer.domElement);
const focus = ISLAND_5_LANDMARKS.find(def => def.id === mode);
const angles: Record<string, number> = { iso: 0.55, front:0, right:Math.PI/2, back:Math.PI, left:-Math.PI/2, opposite:-0.55 };
const angle = params.has('angle') ? Number(params.get('angle')) * Math.PI / 180 : angles[view] ?? 0.55;
const target = focus ? new THREE.Vector3(...focus.position).add(new THREE.Vector3(0, 1.35, 0)) : new THREE.Vector3(0, mode.startsWith('hall') ? -1.75 : 0.2, 0);
const distance = params.has('phone') ? Math.max(focus ? 6.4 : 30, (focus ? 3.7 : 16.5)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)) : focus ? 6.4 : 23;
camera.position.copy(target).add(new THREE.Vector3(Math.sin(angle) * distance, view === 'top' ? distance * 2 : distance * 0.56, Math.cos(angle) * distance));
if (mode === 'hall-hero') {
  target.set(0,-2.55,-.7);
  const depth=Math.max(19,15/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
  camera.position.set(0,target.y+depth*.24,target.z+depth);
}
controls.target.copy(target); controls.update();
scene.add(new THREE.HemisphereLight(0xe9f4ff, 0x7c8870, 1.4));
const sun = new THREE.DirectionalLight(0xffe3b6, 3.2);
sun.position.set(-8, 14, 8); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.025;scene.add(sun);
const fill = new THREE.DirectionalLight(0xb2d6ef, 0.8); fill.position.set(6, 2, -7); scene.add(fill);
const materials = createIsland1WorldMaterials();
const runtime = createIsland1AssemblyCraterRuntime(scene, quality, materials);
const surface = new THREE.Group();
surface.add(createIsland1AssemblyCraterTerrain(quality, { top: materials.leaf, cliff: materials.navy, innerSoil: materials.bark, innerRock: materials.ivoryShade, rim: materials.gold }));
const sea = new THREE.Mesh(new THREE.RingGeometry(7.02, 30, 120, 8), new THREE.MeshStandardMaterial({ color: 0x267f92, roughness: 0.24, metalness:0.15 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -2.65; sea.receiveShadow=true;surface.add(sea); scene.add(surface);
const fundedLandmarks: THREE.Group[] = [];
const landmarks = ISLAND_5_LANDMARKS.filter(def => def.id !== 'boss').map(def => {
 const constructionPreview = params.has('buildFrom') && def.id === mode;
 const landmark=buildIsland1AssemblyLandmark(def, level, quality, materials, { constructionPreview: constructionPreview ? 'target' : undefined });
 if (constructionPreview && level > 0) {
   const from = Math.min(level - 1, Math.max(0, Number(params.get('buildFrom')))) as 0|1|2;
   const current = from ? buildIsland1AssemblyLandmark(def, from, quality, materials, { constructionPreview: 'current' }) : null;
   if (current) { scene.add(current); fundedLandmarks.push(current); }
   const delta = prepareIslandConstructionLevelDelta({ currentRoot: current, targetRoot: landmark });
   delta.applyProgress(Math.max(0, Math.min(1, Number(params.get('buildProgress') ?? 1))));
   landmark.userData.constructionEvidence = { from, to: level, progress: Number(params.get('buildProgress') ?? 1), stages: delta.stageCounts };
 }
 scene.add(landmark); return landmark;
});
let sequence=0, cutaway=mode.startsWith('hall'), stage=10, playing=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function visibility(){ surface.visible=!cutaway&&!focus; runtime.root.visible=!focus;runtime.setInspectionCutaway(cutaway);[...landmarks,...fundedLandmarks].forEach(landmark=>{landmark.visible=focus ? landmark.userData.landmarkId===focus.id : !cutaway||landmark.position.z<=0;}); }
visibility();runtime.updateAssemblyCrater({chargesDetonated:10,targetCharges:10,completed:true},true);
if(params.has('clay'))scene.overrideMaterial=new THREE.MeshStandardMaterial({color:0xc7c1b6,roughness:0.85});
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button=>button.onclick=()=>{
 const next=Number(button.dataset.stage), previous=next===3?0:next===8?3:next===10?8:0;
 runtime.updateAssemblyCrater({chargesDetonated:previous,targetCharges:10,completed:false,constructionSequence:sequence},true);stage=next;
 runtime.updateAssemblyCrater({chargesDetonated:next,targetCharges:10,completed:next===10,constructionSequence:++sequence},next===0||reduced.matches);playing=true;
});
document.getElementById('complete')!.onclick=()=>{stage=10;playing=false;runtime.updateAssemblyCrater({chargesDetonated:10,targetCharges:10,completed:true,constructionSequence:sequence},true);};
document.getElementById('cutaway')!.onclick=()=>{cutaway=!cutaway;visibility();};
const capture=document.createElement('button');capture.textContent='Save capture';document.querySelector('nav')!.append(capture);
capture.onclick=async()=>{renderer.render(scene,camera);const name=`${params.get('capture')||'capture'}-${mode}-${view}${params.has('clay')?'-clay':''}${params.has('phone')?'-phone':''}.png`;
 const response=await fetch('/__island001_capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,png:renderer.domElement.toDataURL('image/png'),metadata:{mode,view,level,quality,width,height,camera:camera.position.toArray(),target:controls.target.toArray(),projection:camera.projectionMatrix.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,date:new Date().toISOString(),three:THREE.REVISION}})});
 capture.textContent=response.ok?'Capture saved':`Capture failed: ${await response.text()}`;};
const orbitCapture=document.createElement('button');orbitCapture.textContent='Save orbit';document.querySelector('nav')!.append(orbitCapture);
orbitCapture.onclick=async()=>{
 const original=camera.position.clone();orbitCapture.disabled=true;
 for(let degrees=0;degrees<360;degrees+=40){
  const a=degrees*Math.PI/180;camera.position.copy(target).add(new THREE.Vector3(Math.sin(a)*distance,distance*.56,Math.cos(a)*distance));camera.lookAt(target);renderer.render(scene,camera);
  const name=`${params.get('capture')||'capture'}-${mode}-orbit-${degrees}${params.has('clay')?'-clay':''}.png`;
  const response=await fetch('/__island001_capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,png:renderer.domElement.toDataURL('image/png'),metadata:{mode,angle:degrees,level,quality,width,height,camera:camera.position.toArray(),target:target.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,three:THREE.REVISION}})});
  if(!response.ok){orbitCapture.textContent=`Orbit failed: ${await response.text()}`;break;}
  orbitCapture.textContent=`Saved ${degrees+40}/360`;
 }
 camera.position.copy(original);camera.lookAt(target);controls.update();orbitCapture.disabled=false;
};
const contactCapture=document.createElement('button');contactCapture.textContent='Save structural views';document.querySelector('nav')!.append(contactCapture);
contactCapture.onclick=async()=>{
 const original=camera.position.clone(),originalTarget=controls.target.clone(),originalMaterial=scene.overrideMaterial;
 contactCapture.disabled=true;
 const facing=focus?Math.atan2(-focus.position[0],-focus.position[2]):0;
 const shots=[{id:'front',a:facing,el:.12,d:distance},{id:'profile',a:facing+Math.PI/2,el:.12,d:distance},{id:'back',a:facing+Math.PI,el:.12,d:distance},{id:'top',a:facing,el:1.5706,d:distance},{id:'contact',a:facing+.55,el:.8,d:distance*.67},{id:'normals',a:.55,el:.51,d:distance}];
 for(const shot of shots){
  const aim=target.clone();if(shot.id==='contact')aim.y-=.6;
  camera.position.copy(aim).add(new THREE.Vector3(Math.sin(shot.a)*Math.cos(shot.el)*shot.d,Math.sin(shot.el)*shot.d,Math.cos(shot.a)*Math.cos(shot.el)*shot.d));camera.lookAt(aim);
  scene.overrideMaterial=shot.id==='normals'?new THREE.MeshNormalMaterial({side:THREE.DoubleSide}):originalMaterial;renderer.render(scene,camera);
  const name=`${params.get('capture')||'capture'}-${mode}-${shot.id}-structural.png`;
  const response=await fetch('/__island001_capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,png:renderer.domElement.toDataURL('image/png'),metadata:{mode,shot:shot.id,level,quality,width,height,camera:camera.position.toArray(),target:aim.toArray(),three:THREE.REVISION}})});
  if(shot.id==='normals')scene.overrideMaterial?.dispose();
  if(!response.ok){contactCapture.textContent=`Structural failed: ${await response.text()}`;break;}
  contactCapture.textContent=`Saved ${shot.id}`;
 }
 scene.overrideMaterial=originalMaterial;camera.position.copy(original);controls.target.copy(originalTarget);camera.lookAt(originalTarget);controls.update();contactCapture.disabled=false;
};
const missionCapture=document.createElement('button');missionCapture.textContent='Save mission sequence';document.querySelector('nav')!.append(missionCapture);
missionCapture.onclick=async()=>{
 playing=false;missionCapture.disabled=true;
 for(const next of [3,8,10]){
  const previous=next===3?0:next===8?3:8;
  runtime.updateAssemblyCrater({chargesDetonated:previous,targetCharges:10,completed:false,constructionSequence:sequence},true);
  runtime.updateAssemblyCrater({chargesDetonated:next,targetCharges:10,completed:next===10,constructionSequence:++sequence},false);
  runtime.animate(0);
  for(const age of next===10?[.8,3.5,5.3,7.5,10,13.4]:[.8,1.8,3.5,5.3]){
   runtime.animate(age);renderer.render(scene,camera);
   const name=`${params.get('capture')||'capture'}-${mode}-mission-${next}-t${Math.round(age*10)}.png`;
   const response=await fetch('/__island001_capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,png:renderer.domElement.toDataURL('image/png'),metadata:{mode,charges:next,ageSeconds:age,quality,width,height,camera:camera.position.toArray(),target:controls.target.toArray(),blast:runtime.getBlastPresentation(),construction:runtime.getConstructionPresentation(),three:THREE.REVISION}})});
   if(!response.ok){missionCapture.textContent=`Mission failed: ${await response.text()}`;missionCapture.disabled=false;return;}
   missionCapture.textContent=`Saved ${next}/10 at ${age}s`;
  }
 }
 stage=10;missionCapture.disabled=false;
};
renderer.setAnimationLoop((time)=>{if(playing&&!reduced.matches)runtime.animate(time/1000);renderer.render(scene,camera);document.getElementById('status')!.textContent=`${stage}/10 charges · ${runtime.getConstructionPresentation().active?'Building':'Hall commissioned'} · ${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles} triangles`;});

}
void startReview().catch(error => { document.getElementById('status')!.textContent = `Model load failed: ${String(error)}`; });
