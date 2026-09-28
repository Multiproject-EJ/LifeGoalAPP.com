import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {createIsland22WaterDragonMission} from '../features/gamification/level-worlds/dev/Island22WaterDragonMission';
import {createIsland22FishermansVillageLivingAmbience,createIsland22FishermansVillageMaterials,buildIsland22FishermansVillageLandmark} from '../features/gamification/level-worlds/dev/Island22FishermansVillageThreeWorld';
import {ISLAND_3D_QUALITY_PROFILES,ISLAND_5_LANDMARKS} from '../features/gamification/level-worlds/dev/island5ThreePilotContract';
const params=new URLSearchParams(location.search),studio=params.get('mode')==='studio';
const quality=params.get('quality')==='low'?'low':params.get('quality')==='high'?'high':'medium';
if(params.has('capture'))document.body.dataset.capture='true';
const renderer=new THREE.WebGLRenderer({antialias:true,stencil:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(studio?0x34464d:0x8ecdda);if(!studio)scene.fog=new THREE.FogExp2(0x8dbfc5,.0048);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.08).texture;scene.environmentIntensity=.34;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffe0b7,0x3e514c,1.48));const sun=new THREE.DirectionalLight(0xffbd72,3.35);sun.position.set(-12,11,-8);scene.add(sun);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,350);
const materials=createIsland22FishermansVillageMaterials();const ocean=new THREE.Mesh(new THREE.CircleGeometry(42,72),materials.ocean);ocean.rotation.x=-Math.PI/2;
let world:ReturnType<typeof createIsland22FishermansVillageLivingAmbience>|undefined;
let mission:ReturnType<typeof createIsland22WaterDragonMission>|undefined;
let dragon:THREE.Object3D;
if(studio){const parent=new THREE.Group();scene.add(parent);const pond=new THREE.Mesh(new THREE.CircleGeometry(3.34,48),materials.ocean),depth=pond.clone(),pondShadow=pond.clone();mission=createIsland22WaterDragonMission({parent,pond,depth,pondShadow,boats:[],pondSkiffs:[],updateFishers:()=>{}});dragon=mission.root;for(const child of parent.children)if(child!==dragon)child.visible=false;}
else{world=createIsland22FishermansVillageLivingAmbience(scene,ISLAND_3D_QUALITY_PROFILES[quality],materials,ocean);for(const def of ISLAND_5_LANDMARKS)world.root.add(buildIsland22FishermansVillageLandmark(def,3,quality,materials));dragon=world.root.getObjectByName('ISLAND_22_WATER_DRAGON_MISSION_ROOT')!;}
// Isolated normalized anatomy must not inherit the world ocean discard plane.
const studioClipUniforms:Array<{value:number}>=[];
if(studio){const visited=new Set<THREE.Material>();dragon.traverse(o=>{if(!(o instanceof THREE.Mesh))return;for(const material of Array.isArray(o.material)?o.material:[o.material]){if(visited.has(material))continue;visited.add(material);const prior=material.onBeforeCompile;material.onBeforeCompile=(shader:Parameters<THREE.Material['onBeforeCompile']>[0],renderer:THREE.WebGLRenderer)=>{prior.call(material,shader,renderer);const uniform=shader.uniforms.uDragonWaterClipActive;if(uniform){uniform.value=0;studioClipUniforms.push(uniform);}};}});}
const clay=new THREE.MeshStandardMaterial({color:0xaca99c,roughness:.85,side:THREE.DoubleSide});if(params.has('clay'))dragon.traverse(o=>{if(o instanceof THREE.Mesh)o.material=clay});
let time=Number(params.get('time')??15),playing=false,last=performance.now();
const slider=document.querySelector<HTMLInputElement>('#time')!,label=document.querySelector<HTMLElement>('#label')!,play=document.querySelector<HTMLButtonElement>('#play')!;
function render(t:number){time=t;const presentation={fishCaughtKg:78,previewElapsedSeconds:t,reducedMotion:params.has('reducedMotion'),impactRepairProgress:Number(params.get('repair')??0)};if(world){world.updateWaterDragonMission(presentation);world.animate(4);}else mission!.update(4,presentation);
const pose=world?.getWaterDragonMissionCameraPose()??mission!.getCameraPose();
if(studio){for(const child of dragon.parent!.children)if(child!==dragon)child.visible=false;dragon.position.set(0,0,0);dragon.rotation.set(0,0,0);const a=Number(params.get('azimuth')??45)*Math.PI/180,e=Number(params.get('elevation')??15)*Math.PI/180;const target=t<10.2?new THREE.Vector3(0,-9,0):new THREE.Vector3(-10,0,0);const distance=t<10.2?70:62;camera.fov=42;camera.position.copy(target).add(new THREE.Vector3(Math.cos(a)*Math.cos(e),Math.sin(e),Math.sin(a)*Math.cos(e)).multiplyScalar(distance));camera.lookAt(target);}else{camera.fov=pose.fov;camera.position.copy(pose.position);camera.lookAt(pose.target);}camera.updateProjectionMatrix();scene.updateMatrixWorld(true);for(const uniform of studioClipUniforms)uniform.value=0;renderer.render(scene,camera);slider.value=String(t);label.textContent=`${t.toFixed(2)}s · ${world?.getWaterDragonMissionPhase()??mission!.getPhase()}`;return {time:t,phase:world?.getWaterDragonMissionPhase()??mission!.getPhase(),camera:{position:camera.position.toArray(),target:pose.target.toArray(),fov:camera.fov},calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
slider.oninput=()=>{playing=false;play.textContent='Play';render(Number(slider.value));};play.onclick=()=>{playing=!playing;if(playing&&time>=24)time=0;play.textContent=playing?'Pause':'Play';};
Object.assign(window,{dragonStudy:{setTime:render,play:()=>{time=0;playing=true;play.textContent='Pause';},pause:()=>{playing=false},inspect:()=>render(time)}});
function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;if(playing){time=Math.min(24,time+dt);if(time===24){playing=false;play.textContent='Play';}}render(time);requestAnimationFrame(frame);}requestAnimationFrame(frame);
