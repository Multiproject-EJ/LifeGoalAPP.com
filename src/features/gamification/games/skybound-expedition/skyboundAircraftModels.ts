import * as THREE from 'three';
import type { SkyboundAircraftId } from '../../level-worlds/services/skyboundPilotAcademy';
import {
  createCadetToyGliderLookDevLights,
  createCadetToyGliderModel,
  type CadetGliderModel,
  type CadetGliderRuntime,
} from './cadetToyGliderModel';

export type SkyboundAircraftModel = CadetGliderModel;
export type SkyboundAircraftRuntime = CadetGliderRuntime;
export { createCadetToyGliderLookDevLights as createSkyboundAircraftLights };

const material = (color:number, metalness=0.08, roughness=0.38, emissive=0) => new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: emissive ? 0.7 : 0 });

function register(root:SkyboundAircraftModel,id:string,mesh:THREE.Mesh,parent:THREE.Object3D=root) {
  mesh.name=id; mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh);
  root.userData.sculptRuntime.nodes[id]=mesh; root.userData.sculptRuntime.meshes[id]=mesh;
  return mesh;
}

function tint(root:SkyboundAircraftModel, primary:number, secondary:number, trim:number) {
  const runtime=root.userData.sculptRuntime;
  const primaryIds=['fuselage-shell','left-wing','right-wing','left-tailplane','right-tailplane'];
  primaryIds.forEach((id)=>{ const mesh=runtime.meshes[id]; if(mesh)mesh.material=material(primary,0.12,0.34); });
  ['navy-belly-band','tail-fin','rear-nozzle'].forEach((id)=>{ const mesh=runtime.meshes[id]; if(mesh)mesh.material=material(secondary,0.22,0.3); });
  ['nose-cap','left-wing-trim','right-wing-trim'].forEach((id)=>{ const mesh=runtime.meshes[id]; if(mesh)mesh.material=material(trim,0.55,0.24); });
}

function addLandingGear(root:SkyboundAircraftModel) {
  const gear=material(0x172335,0.3,0.35);
  for(const side of [-1,1]) {
    const strut=register(root,`gear-strut-${side}`,new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,0.7,8),gear));
    strut.position.set(side*0.58,-0.63,0.35); strut.rotation.z=side*0.16;
    const wheel=register(root,`gear-wheel-${side}`,new THREE.Mesh(new THREE.TorusGeometry(0.18,0.07,8,16),gear),strut);
    wheel.position.y=-0.38; wheel.rotation.y=Math.PI/2;
  }
}

function buildPropTrainer(root:SkyboundAircraftModel) {
  root.name='Kestrel Prop Trainer'; tint(root,0xe8f1e9,0x1c5685,0xf2b63d);
  root.userData.sculptRuntime.nodes['left-wing'].scale.set(0.92,1,1.22);
  root.userData.sculptRuntime.nodes['right-wing'].scale.set(0.92,1,1.22);
  root.userData.sculptRuntime.meshes['fuselage-shell'].scale.set(0.72,0.55,2.15);
  const hub=register(root,'propeller-hub',new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.22,0.38,18),material(0xe8c456,0.55,0.24)));
  hub.position.set(0,0,2.27); hub.rotation.x=Math.PI/2;
  const propeller=new THREE.Group(); propeller.name='propeller'; propeller.position.set(0,0,0.23); hub.add(propeller); root.userData.sculptRuntime.nodes.propeller=propeller;
  for(const angle of [0,Math.PI/2]) { const blade=register(root,`prop-blade-${angle}`,new THREE.Mesh(new THREE.CapsuleGeometry(0.1,1.05,4,8),material(0x15283e,0.15,0.3)),propeller); blade.rotation.z=angle; }
  addLandingGear(root);
}

function addJetIntakes(root:SkyboundAircraftModel,color:number) {
  for(const side of [-1,1]) {
    const intake=register(root,`intake-${side}`,new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.38,1.3,16,1,true),material(color,0.5,0.24)));
    intake.position.set(side*0.63,-0.07,-0.2); intake.rotation.x=Math.PI/2;
  }
}

function buildJetTrainer(root:SkyboundAircraftModel) {
  root.name='Vortex Jet Trainer'; tint(root,0xddebf1,0x123c68,0x42d9e8);
  root.userData.sculptRuntime.nodes['left-wing'].scale.set(1.12,0.8,0.72);
  root.userData.sculptRuntime.nodes['right-wing'].scale.set(1.12,0.8,0.72);
  root.userData.sculptRuntime.nodes['left-wing'].rotation.y=-0.18;
  root.userData.sculptRuntime.nodes['right-wing'].rotation.y=0.18;
  root.userData.sculptRuntime.meshes['fuselage-shell'].scale.set(0.58,0.43,2.42);
  addJetIntakes(root,0x163855);
  const stripe=register(root,'trainer-cyan-spine',new THREE.Mesh(new THREE.BoxGeometry(0.12,0.08,3.1),material(0x48e7ef,0.25,0.2,0x123f48)));
  stripe.position.set(0,0.43,-0.12);
}

function addTwinFins(root:SkyboundAircraftModel,color:number) {
  const original=root.userData.sculptRuntime.nodes['tail-fin']; original.visible=false;
  for(const side of [-1,1]) {
    const fin=register(root,side<0?'tail-fin':'aux-tail-fin',new THREE.Mesh(new THREE.BoxGeometry(0.1,1.3,0.82),material(color,0.28,0.3)));
    fin.position.set(side*0.46,0.62,-1.62); fin.rotation.z=side*-0.18;
    if(side<0) root.userData.sculptRuntime.nodes['tail-fin']=fin;
  }
}

function buildStormInterceptor(root:SkyboundAircraftModel) {
  root.name='Tempest Storm Interceptor'; tint(root,0x29395d,0x101a34,0x8cf5ff);
  root.userData.sculptRuntime.nodes['left-wing'].scale.set(1.24,0.76,1.5);
  root.userData.sculptRuntime.nodes['right-wing'].scale.set(1.24,0.76,1.5);
  root.userData.sculptRuntime.nodes['left-wing'].rotation.y=-0.28;
  root.userData.sculptRuntime.nodes['right-wing'].rotation.y=0.28;
  root.userData.sculptRuntime.meshes['fuselage-shell'].scale.set(0.62,0.42,2.58);
  addJetIntakes(root,0x6b56a3); addTwinFins(root,0x8d70cc);
  for(const side of [-1,1]) { const coil=register(root,`storm-coil-${side}`,new THREE.Mesh(new THREE.TorusGeometry(0.34,0.055,8,24),material(0x78f7ff,0.15,0.18,0x2d9ca8))); coil.position.set(side*0.72,0,-1.7); coil.rotation.x=Math.PI/2; }
}

function buildGoldwing(root:SkyboundAircraftModel) {
  root.name='Goldwing Fighter'; tint(root,0xfff8df,0x132642,0xf4c83e);
  root.userData.sculptRuntime.nodes['left-wing'].scale.set(1.38,0.72,1.14);
  root.userData.sculptRuntime.nodes['right-wing'].scale.set(1.38,0.72,1.14);
  root.userData.sculptRuntime.nodes['left-wing'].rotation.y=0.12;
  root.userData.sculptRuntime.nodes['right-wing'].rotation.y=-0.12;
  root.userData.sculptRuntime.meshes['fuselage-shell'].scale.set(0.59,0.4,2.72);
  addJetIntakes(root,0xd7a923); addTwinFins(root,0xf3c944);
  const crown=register(root,'goldwing-spine',new THREE.Mesh(new THREE.BoxGeometry(0.14,0.11,3.5),material(0xf6d35b,0.7,0.18,0x5a3b00)));
  crown.position.set(0,0.42,-0.16);
  for(const side of [-1,1]) { const tip=register(root,`gold-wingtip-${side}`,new THREE.Mesh(new THREE.BoxGeometry(0.1,0.13,1.4),material(0xf8d85d,0.72,0.18,0x5a4100))); tip.position.set(side*3.25,0.08,0.04); tip.rotation.y=side*-0.14; }
}

export function createSkyboundAircraftModel(aircraftId:SkyboundAircraftId):SkyboundAircraftModel {
  const root=createCadetToyGliderModel(); root.userData.aircraftId=aircraftId;
  if(aircraftId==='prop_trainer')buildPropTrainer(root);
  else if(aircraftId==='jet_trainer')buildJetTrainer(root);
  else if(aircraftId==='storm_interceptor')buildStormInterceptor(root);
  else if(aircraftId==='goldwing_fighter')buildGoldwing(root);
  return root;
}

export function applySkyboundAircraftAssembly(root:SkyboundAircraftModel,assemblyLevel:number) {
  const level=Math.max(0,Math.min(4,Math.floor(assemblyLevel)));
  const runtime=root.userData.sculptRuntime;
  const setVisible=(ids:readonly string[],visible:boolean)=>ids.forEach((id)=>{const node=runtime.nodes[id];if(node)node.visible=visible;});
  setVisible(['left-wing'],level>=1);
  setVisible(['right-wing'],level>=2);
  setVisible(['left-tailplane','right-tailplane','tail-fin','gear-strut--1','gear-strut-1'],level>=3);
  const propulsionIds=['rear-nozzle','launch-hook','propeller-hub','propeller','intake--1','intake-1','storm-coil--1','storm-coil-1','trainer-cyan-spine','goldwing-spine','gold-wingtip--1','gold-wingtip-1'];
  setVisible(propulsionIds,level>=4);
  root.userData.assemblyLevel=level;
  return root;
}
