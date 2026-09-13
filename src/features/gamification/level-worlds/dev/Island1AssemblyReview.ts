import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createIsland1WorldMaterials } from './Island1ThreeWorld';
import { ISLAND_5_LANDMARKS } from './island5ThreePilotContract';
import { buildIsland1AssemblyLandmark, createIsland1AssemblyCraterTerrain, createIsland1AssemblyCraterRuntime } from './Island1AssemblyCraterThreeWorld';
import { preloadIsland001V2Assets } from './Island1V2Assets';
import { prepareIslandConstructionLevelDelta } from './IslandConstructionLevelDelta';
import { ISLAND_1_MARINA_ANIMATION_DURATION_SECONDS } from './Island1AssemblyMarina';
import {createAssemblySeaGeometry} from './Island1V2Terrain';
import {showAssemblyMandate} from './Island1AssemblyMandate';
async function startReview() {
  document.getElementById('status')!.textContent = 'Loading island models…';
  // Keep the marina review interactive while optional GLB landmarks warm the
  // browser cache; procedural V2 fallbacks are enough for this composition.
  void preloadIsland001V2Assets().catch(() => undefined);
const params = new URLSearchParams(location.search);
const mode = params.get('mode') || 'hall';
const view = params.get('view') || 'iso';
const quality = params.get('quality') === 'low' ? 'low' : params.get('quality') === 'medium' ? 'medium' : 'high';
const level = Math.min(3, Math.max(0, Number(params.get('level') ?? 3))) as 0|1|2|3;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc1d9d7);
scene.fog = new THREE.Fog(0xc1d9d7, 46, 108);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
let width = params.has('phone') ? 390 : window.innerWidth, height = params.has('phone') ? 844 : window.innerHeight;
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const roomEnvironment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
const environmentTarget = pmrem.fromScene(roomEnvironment,.06);
scene.environment = environmentTarget.texture; scene.environmentIntensity = .4;
roomEnvironment.dispose(); pmrem.dispose();
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(48, width / height, 0.04, 220);
const controls = new OrbitControls(camera, renderer.domElement);
window.addEventListener('resize',()=>{width=params.has('phone')?390:window.innerWidth;height=params.has('phone')?844:window.innerHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});
const focus = ISLAND_5_LANDMARKS.find(def => def.id === mode);
const angles: Record<string, number> = { iso: 0.55, front:0, right:Math.PI/2, back:Math.PI, left:-Math.PI/2, opposite:-0.55 };
const angle = params.has('angle') ? Number(params.get('angle')) * Math.PI / 180 : angles[view] ?? 0.55;
const target = focus ? new THREE.Vector3(...focus.position).add(new THREE.Vector3(0, 1.35, 0)) : new THREE.Vector3(0, mode.startsWith('hall') ? -1.75 : mode === 'marina' ? -1.4 : 0.2, mode === 'marina' ? 3 : 0);
const distance = params.has('phone') ? Math.max(focus ? 6.4 : mode === 'marina' ? 46 : 30, (focus ? 3.7 : mode === 'marina' ? 29 : 16.5)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)) : focus ? 6.4 : mode === 'marina' ? 44 : 23;
camera.position.copy(target).add(new THREE.Vector3(Math.sin(angle) * distance, view === 'top' ? distance * 2 : distance * 0.56, Math.cos(angle) * distance));
if (mode === 'hall-hero') {
  target.set(0,-2.55,-.7);
  const depth=Math.max(19,15/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
  camera.position.set(0,target.y+depth*.24,target.z+depth);
}
controls.target.copy(target); controls.update();
if(mode==='marina'){camera.position.set(25,16,32);controls.target.set(0,-1.5,5);controls.update();}
scene.add(new THREE.HemisphereLight(0xe9f4ff, 0x7c8870, 1.0));
const sun = new THREE.DirectionalLight(0xffe3b6, 2.4);
sun.position.set(-8, 14, 8); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.025;scene.add(sun);
const fill = new THREE.DirectionalLight(0xb2d6ef, 0.8); fill.position.set(6, 2, -7); scene.add(fill);
const materials = createIsland1WorldMaterials();
const runtime = createIsland1AssemblyCraterRuntime(scene, quality, materials);
const surface = new THREE.Group();
surface.add(createIsland1AssemblyCraterTerrain(quality, { top: materials.leaf, cliff: materials.navy, innerSoil: materials.bark, innerRock: materials.ivoryShade, rim: materials.gold }));
const sea = new THREE.Mesh(createAssemblySeaGeometry(), new THREE.MeshStandardMaterial({ color: 0x267f92, roughness: 0.24, metalness:0.15 }));
const waterMaterial=sea.material as THREE.MeshStandardMaterial;
waterMaterial.color.setHex(0x176e83);waterMaterial.roughness=.29;
waterMaterial.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMarinaWater;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMarinaWater=position;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMarinaWater;').replace('#include <color_fragment>','#include <color_fragment>\nfloat ripple=sin(vMarinaWater.x*9.0+vMarinaWater.y*1.8+sin(vMarinaWater.y*2.0)*.65); diffuseColor.rgb*=0.98+0.035*ripple;');
};
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
let sequence=0, cutaway=mode.startsWith('hall'), stage=10, playing=false, marinaCinema=false;
let mandateDialog: ReturnType<typeof showAssemblyMandate> | null = null, previewMandateSigned=false;
const openMandate=()=>{
 if(mandateDialog)return;
 mandateDialog=showAssemblyMandate({signed:previewMandateSigned,onSign:async()=>{previewMandateSigned=true;},onClose:()=>{mandateDialog=null;}});
};
const mandateButton=document.createElement('button');mandateButton.textContent='Sign the mandate';mandateButton.id='marina-mandate';
document.getElementById('cinema-controls')!.append(mandateButton);mandateButton.onclick=openMandate;
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
function overview(){cutaway=false;visibility();camera.fov=48;camera.position.set(25,16,32);controls.target.set(0,-1.5,5);camera.updateProjectionMatrix();controls.update();}
document.getElementById('marina-before')!.onclick=()=>{stage=10;playing=false;marinaCinema=false;controls.enabled=true;runtime.updateAssemblyCrater({chargesDetonated:10,targetCharges:10,completed:true,constructionSequence:sequence},true);runtime.setMarinaProgress(0);overview();timeline.value='0';};
document.getElementById('marina-after')!.onclick=()=>{stage=10;playing=false;marinaCinema=false;controls.enabled=true;runtime.updateAssemblyCrater({chargesDetonated:10,targetCharges:10,completed:true,constructionSequence:sequence},true);runtime.setMarinaProgress(1);overview();timeline.value='100';};
document.getElementById('marina-play')!.onclick=()=>{
 mandateDialog?.close();
 stage=10;runtime.updateAssemblyCrater({chargesDetonated:10,targetCharges:10,completed:true,constructionSequence:sequence},true);
 if(reduced.matches){runtime.setMarinaProgress(1);playing=false;marinaCinema=false;openMandate();return;}
 runtime.animate(performance.now()/1000);runtime.replayMarina();playing=true;marinaCinema=true;controls.enabled=false;
};
const timeline=document.getElementById('marina-timeline') as HTMLInputElement;
function showMarinaFrame(p:number){
 playing=false;marinaCinema=false;runtime.setMarinaProgress(p);applyMarinaCamera();controls.enabled=true;controls.update();timeline.value=String(p*100);
}
function applyMarinaCamera(){
 const m=runtime.getMarinaPresentation();camera.position.fromArray(m.cameraPosition);controls.target.fromArray(m.cameraTarget);camera.fov=m.cameraFov;camera.updateProjectionMatrix();camera.lookAt(controls.target);
 const openThreshold=false; // Real doorway, no hidden cliff while entering.
 if(cutaway!==openThreshold){cutaway=openThreshold;visibility();}
}
timeline.oninput=()=>showMarinaFrame(Number(timeline.value)/100);
document.getElementById('marina-pause')!.onclick=()=>{playing=false;marinaCinema=false;controls.enabled=true;controls.update();};
document.getElementById('marina-end-meeting')!.onclick=()=>{
 const now=performance.now()/1000;runtime.animate(now);runtime.endMarinaMeeting();
 if(reduced.matches)runtime.animate(now+2);else playing=true;
 openMandate();
};
document.querySelectorAll<HTMLButtonElement>('[data-marina-shot]').forEach(b=>b.onclick=()=>showMarinaFrame(Number(b.dataset.marinaShot)));
if(params.has('marinaProgress'))showMarinaFrame(Number(params.get('marinaProgress')));
if(params.has('mandate'))openMandate();
// Inspect the real instanced crowd head, not a separate high-detail showcase model.
if(params.has('delegateView')){
 showMarinaFrame(params.has('delegateBody')?.36:1);scene.updateMatrixWorld(true);
 const heads=runtime.root.getObjectByName('DELEGATE_FACES') as THREE.InstancedMesh;
 const matrix=new THREE.Matrix4();heads.getMatrixAt(0,matrix);matrix.premultiply(heads.matrixWorld);
 const face=new THREE.Vector3().setFromMatrixPosition(matrix);
 const yaw=THREE.MathUtils.degToRad(Number(params.get('delegateView'))||0);
 const direction=new THREE.Vector3(0,0,-1).transformDirection(matrix).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
 const body=params.has('delegateBody');
 if(body)face.y-=.27;
 camera.position.copy(face).addScaledVector(direction,body?1.8:.64).add(new THREE.Vector3(0,body?.15:.055,0));
 controls.target.copy(face);camera.fov=40;camera.updateProjectionMatrix();controls.update();
}
document.getElementById('cutaway')!.onclick=()=>{cutaway=!cutaway;visibility();};
const capture=document.createElement('button');capture.textContent='Save capture';document.querySelector('nav')!.append(capture);
const film=document.createElement('button');film.textContent='Save arrival film';document.querySelector('nav')!.append(film);
film.onclick=()=>{
 if(reduced.matches){film.textContent='Reduced motion is enabled';return;}
 film.disabled=true;
 const stream=renderer.domElement.captureStream(24),chunks:Blob[]=[];
 const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1200000});
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.onstop=async()=>{
  stream.getTracks().forEach(track=>track.stop());
  try{
   const blob=new Blob(chunks,{type:'video/webm'});
   const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
   const response=await fetch('/__island001_capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'marina-v8-aurelian-delegation-final.webm',png:data,metadata:{duration:ISLAND_1_MARINA_ANIMATION_DURATION_SECONDS,width,height,quality}})});
   film.textContent=response.ok?'Film saved':`Film failed: ${await response.text()}`;
  }catch(error){film.textContent=`Film failed: ${String(error)}`;}
  film.disabled=false;
 };
 recorder.start(1000);document.getElementById('marina-play')!.click();film.textContent='Recording arrival…';
 window.setTimeout(()=>recorder.stop(),(ISLAND_1_MARINA_ANIMATION_DURATION_SECONDS+.8)*1000);
};
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
  for(const age of next===10?[.8,3.5,5.3,7.5,10,13.4,18,25,33,41]:[.8,1.8,3.5,5.3]){
   runtime.animate(age);renderer.render(scene,camera);
   const name=`${params.get('capture')||'capture'}-${mode}-mission-${next}-t${Math.round(age*10)}.png`;
   const response=await fetch('/__island001_capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,png:renderer.domElement.toDataURL('image/png'),metadata:{mode,charges:next,ageSeconds:age,quality,width,height,camera:camera.position.toArray(),target:controls.target.toArray(),blast:runtime.getBlastPresentation(),construction:runtime.getConstructionPresentation(),marina:runtime.getMarinaPresentation(),three:THREE.REVISION}})});
   if(!response.ok){missionCapture.textContent=`Mission failed: ${await response.text()}`;missionCapture.disabled=false;return;}
   missionCapture.textContent=`Saved ${next}/10 at ${age}s`;
  }
 }
 stage=10;missionCapture.disabled=false;
};
renderer.setAnimationLoop((time)=>{
 if(playing&&!reduced.matches)runtime.animate(time/1000);
 const marina=runtime.getMarinaPresentation();
 mandateButton.disabled=!marina.completed;
 if(marinaCinema){
  applyMarinaCamera();timeline.value=String(marina.progress*100);
  if(marina.completed){marinaCinema=false;playing=true;controls.enabled=true;controls.update();runtime.endMarinaMeeting();openMandate();}
 }
 renderer.render(scene,camera);
 (document.getElementById('marina-end-meeting') as HTMLButtonElement).disabled=!marina.completed||marina.meetingState==='ended';
 const gate=marina.meetingState==='ended'?(marina.waterfallFlow>.001?'Meeting ended · entrance reopening':'Meeting ended · entrance open'):marina.meetingState==='in-session'?'Meeting in session · waterfall sealed':marina.meetingState==='admitting'?(marina.waterfallFlow>0?(marina.enteredCount===marina.delegateCount?'Everyone inside · waterfall returning':'Waterfall opening entrance'):`Entrance open · ${marina.enteredCount}/${marina.delegateCount} inside`):'Waterfall flowing';
 document.getElementById('status')!.textContent=`${marina.arrivedCraftCount}/${marina.craftCount} docked · ${gate} · ${marina.seatedCount}/${marina.delegateCount} seated`;
});

}
void startReview().catch(error => { document.getElementById('status')!.textContent = `Model load failed: ${String(error)}`; });
