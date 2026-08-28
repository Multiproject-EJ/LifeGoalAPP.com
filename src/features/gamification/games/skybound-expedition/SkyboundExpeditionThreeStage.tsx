import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  getSkyboundCourseObjects,
  getSkyboundGroundHeight,
  getSkyboundLevel,
  type SkyboundFlightState,
  type SkyboundLevelId,
} from '../../level-worlds/services/skyboundExpeditionFlight';
import type { SkyboundAircraftId } from '../../level-worlds/services/skyboundPilotAcademy';
import { applySkyboundAircraftAssembly, createSkyboundAircraftLights, createSkyboundAircraftModel } from './skyboundAircraftModels';
import { applySkyboundAircraftMotion, getSkyboundLaunchPose } from './skyboundAircraftMotion';
import type { SkyboundAimView } from './skyboundExpeditionRenderer';
import { startSkyboundSoftwareRenderer } from './skyboundSoftwareRenderer';
import { getSkyboundLaunchFacility } from './skyboundLaunchFacilities';
import { getSkyboundWorldPresentation, type SkyboundWorldLandmark } from './skyboundWorldPresentation';

type StagePhase = 'aiming' | 'flying' | 'result';

interface Props {
  phase: StagePhase;
  levelId: SkyboundLevelId;
  goalDistance: number;
  flight: SkyboundFlightState | null;
  aim: SkyboundAimView;
  sortieKey: number;
  boosting: boolean;
  stabilizing: boolean;
  aircraftId: SkyboundAircraftId;
  assemblyLevel: number;
  onPointerDown: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: React.PointerEventHandler<HTMLCanvasElement>;
}

interface DebrisBody {
  object: THREE.Object3D;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
}

function seeded(index: number, salt: number) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value:number,minimum:number,maximum:number) {
  return Math.max(minimum,Math.min(maximum,value));
}

function canCreateWebglContext() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

function makeCloud() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xf3fbff, roughness: 1, transparent: true, opacity: 0.78 });
  for (let index = 0; index < 4; index += 1) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + index * 0.18, 1), material);
    puff.position.set((index - 1.5) * 1.25, seeded(index, 4) * 0.5, seeded(index, 9) * 0.7);
    puff.scale.y = 0.62;
    group.add(puff);
  }
  return group;
}

function addWorld(scene: THREE.Scene, levelId: SkyboundLevelId, goalDistance: number, aircraftId: SkyboundAircraftId) {
  const level = getSkyboundLevel(levelId);
  const world = getSkyboundWorldPresentation(levelId);
  const facility = getSkyboundLaunchFacility(aircraftId);
  scene.background = new THREE.Color(level.skyBottom);
  scene.fog = new THREE.FogExp2(world.hazeColor, levelId === 'storm' ? 0.008 : levelId === 'stratosphere' ? 0.0035 : 0.0055);

  const cliffColor = new THREE.Color(world.cliffColor).getHex();
  const grassColor = new THREE.Color(world.surfaceColor).getHex();
  const cliffMaterial = new THREE.MeshStandardMaterial({ color: cliffColor, roughness: 0.96, flatShading: true });
  const grassMaterial = new THREE.MeshStandardMaterial({ color: grassColor, roughness: 0.82 });
  const academyMaterial = new THREE.MeshStandardMaterial({ color: 0xf4efe1, roughness: 0.48, metalness: 0.04 });
  const academyTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8b93e,
    emissive: 0x704308,
    emissiveIntensity: 0.55,
    metalness: 0.5,
    roughness: 0.3,
  });

  const addAcademyTower = (x: number, y: number, z: number, scale = 1) => {
    const tower = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.3 * scale, 4.5 * scale, 19 * scale, 8), academyMaterial);
    body.position.y = 9.5 * scale;
    body.castShadow = true;
    tower.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2 * scale, 6.5 * scale, 8), academyTrimMaterial);
    roof.position.y = 22 * scale;
    roof.castShadow = true;
    tower.add(roof);
    for (let floor = 0; floor < 4; floor += 1) {
      const windowBand = new THREE.Mesh(
        new THREE.CylinderGeometry((3.55 + floor * 0.16) * scale, (3.65 + floor * 0.16) * scale, 1.15 * scale, 8),
        new THREE.MeshStandardMaterial({ color: 0x36d9f4, emissive: 0x0f5e84, emissiveIntensity: 1.25, metalness: 0.15, roughness: 0.25 }),
      );
      windowBand.position.y = (4.5 + floor * 4.3) * scale;
      tower.add(windowBand);
    }
    tower.position.set(x, y, z);
    tower.name = 'skybound-academy-tower';
    scene.add(tower);
  };

  const addFloatingIsland = (x: number, topY: number, z: number, radius: number, academy = false) => {
    const island = new THREE.Group();
    const cliffGeometry = levelId === 'canyon'
      ? new THREE.CylinderGeometry(radius * 0.58, radius * 0.88, radius * 1.55, 8)
      : new THREE.ConeGeometry(radius, radius * 1.7, levelId === 'storm' ? 7 : 9);
    const cliff = new THREE.Mesh(cliffGeometry, cliffMaterial);
    cliff.position.y = -radius * 0.84;
    if (levelId !== 'canyon') cliff.rotation.z = Math.PI;
    cliff.castShadow = true;
    cliff.receiveShadow = true;
    island.add(cliff);
    const turf = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, 1.65, 12), grassMaterial);
    turf.position.y = 0.2;
    turf.castShadow = true;
    turf.receiveShadow = true;
    island.add(turf);
    for (let rock = 0; rock < Math.max(3, Math.round(radius / 4)); rock += 1) {
      const outcrop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + seeded(rock, z) * 1.1, 0), cliffMaterial);
      const angle = seeded(rock, z + 2) * Math.PI * 2;
      outcrop.position.set(Math.cos(angle) * radius * 0.73, 1 + seeded(rock, z + 4) * 1.2, Math.sin(angle) * radius * 0.73);
      outcrop.scale.y = 0.65;
      island.add(outcrop);
    }
    island.position.set(x, topY, z);
    scene.add(island);
    if (academy) addAcademyTower(x, topY + 1, z, radius > 22 ? 1.15 : 0.62);
  };

  const cloudSea = new THREE.Mesh(
    new THREE.PlaneGeometry(240, goalDistance + 520),
    new THREE.MeshBasicMaterial({ color: world.lowerDeckColor, transparent: true, opacity: world.lowerDeckOpacity, depthWrite: false }),
  );
  cloudSea.rotation.x = -Math.PI / 2;
  cloudSea.position.set(0, -8.5, goalDistance / 2);
  scene.add(cloudSea);

  addFloatingIsland(0, -0.7, 4, 24);
  addAcademyTower(-14, 0.3, 8, 0.68);
  const islandCount = Math.ceil(goalDistance / 58) + 7;
  for (let index = 1; index < islandCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    addFloatingIsland(
      side * (24 + seeded(index, 5) * 28),
      7 + seeded(index, 8) * 48,
      index * 58 + seeded(index, 2) * 24,
      8 + seeded(index, 10) * 10,
      index % 7 === 0,
    );
  }
  addFloatingIsland(0, 15, goalDistance + 8, 31, true);

  const runway = new THREE.Mesh(
    new THREE.BoxGeometry(facility.deckWidth, 0.28, facility.deckLength),
    new THREE.MeshStandardMaterial({ color: facility.deckColor, roughness: facility.kind === 'magnetic_rail' ? 0.34 : 0.78, metalness: facility.kind === 'slingshot' ? 0.04 : 0.34 }),
  );
  runway.position.set(0, 0.34, 4);
  runway.receiveShadow = true;
  scene.add(runway);
  const markingCount = facility.kind === 'slingshot' ? 7 : 10;
  for (let index = 0; index < markingCount; index += 1) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(facility.kind === 'slingshot' ? 0.2 : 0.28, 0.035, facility.kind === 'slingshot' ? 2 : 1.45),
      new THREE.MeshBasicMaterial({ color: facility.edgeColor }),
    );
    stripe.position.set(0, 0.51, -facility.deckLength * .34 + index * (facility.deckLength * .72 / Math.max(1, markingCount - 1)));
    scene.add(stripe);
  }

  const launchMotion: THREE.Object3D[] = [];
  if (facility.kind !== 'slingshot') {
    const lampMaterial = new THREE.MeshStandardMaterial({ color:facility.energyColor,emissive:facility.energyColor,emissiveIntensity:1.25,roughness:.22 });
    for (const side of [-1, 1]) {
      const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(.12,.045,facility.deckLength*.92),new THREE.MeshBasicMaterial({color:facility.edgeColor}));
      edgeLine.position.set(side*(facility.deckWidth*.44),.52,4);scene.add(edgeLine);
      for(let lamp=0;lamp<8;lamp+=1){
        const light=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),lampMaterial.clone());
        light.position.set(side*(facility.deckWidth*.48),.63,-facility.deckLength*.34+lamp*(facility.deckLength*.68/7));
        light.userData.skyboundLaunchPulse=true;scene.add(light);launchMotion.push(light);
      }
    }
  }

  const launchRig = new THREE.Group();
  if (facility.kind === 'slingshot') {
    const slingMaterial = new THREE.MeshStandardMaterial({ color: 0x9b5c29, roughness: 0.72, metalness: 0.05 });
    const crossbar=new THREE.Mesh(new THREE.BoxGeometry(4.2,.42,.5),slingMaterial);crossbar.position.set(0,.62,-2.6);crossbar.castShadow=true;launchRig.add(crossbar);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 4.5, 10), slingMaterial);
      arm.position.set(side * 1.35, 2.4, -2.6);
      arm.rotation.z = side * -0.24;
      arm.castShadow = true;
      launchRig.add(arm);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.075, 1, 10),
        new THREE.MeshStandardMaterial({ color: 0x153f69, emissive: 0x23b5d1, emissiveIntensity: 0.35, roughness: 0.58 }),
      );
      band.name = side < 0 ? 'skybound-launch-band-left' : 'skybound-launch-band-right';
      band.castShadow = true;
      launchRig.add(band);
    }
  }
  launchRig.name = 'skybound-launch-rig';
  launchRig.visible = facility.kind === 'slingshot';
  scene.add(launchRig);

  if (facility.kind !== 'slingshot') {
    const railMaterial = new THREE.MeshStandardMaterial({ color: facility.energyColor, emissive: facility.energyColor, emissiveIntensity: 0.48, metalness: 0.62, roughness: 0.24 });
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(facility.kind === 'runway' ? .12 : .22, .2, facility.deckLength*.62), railMaterial.clone());
      rail.position.set(side * (facility.kind === 'runway' ? 2.2 : 1.15), 0.68, 3);rail.userData.skyboundLaunchPulse=true;scene.add(rail);launchMotion.push(rail);
    }
    if(facility.kind==='runway'){
      const hangar=new THREE.Group();const shell=new THREE.Mesh(new THREE.TorusGeometry(4.4,.38,8,24,Math.PI),new THREE.MeshStandardMaterial({color:0xe8edf0,roughness:.62,metalness:.18}));shell.rotation.z=Math.PI;hangar.add(shell);
      for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.5,3.8,.7),shell.material);post.position.set(side*4.4,-1.8,0);hangar.add(post);}hangar.position.set(-11,4.2,-7);hangar.rotation.y=.3;scene.add(hangar);
      const mast=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,5,8),shell.material);mast.position.set(6,3,-3);scene.add(mast);
      const sock=new THREE.Mesh(new THREE.ConeGeometry(.42,2,10,1,true),new THREE.MeshBasicMaterial({color:0xff6f4a,side:THREE.DoubleSide}));sock.rotation.z=-Math.PI/2;sock.position.set(6.8,5,-3);sock.userData.skyboundWorldMotion='windsock';scene.add(sock);launchMotion.push(sock);
    }else if(facility.kind==='boost_runway'){
      for(const side of [-1,1]){const panel=new THREE.Mesh(new THREE.BoxGeometry(3.7,2.8,.3),new THREE.MeshStandardMaterial({color:0x9c552d,roughness:.5,metalness:.35}));panel.position.set(side*3.3,1.7,-10);panel.rotation.x=-.32;scene.add(panel);}
      for(const side of [-1,1]){const pylon=new THREE.Mesh(new THREE.CylinderGeometry(.28,.42,4.5,10),railMaterial.clone());pylon.position.set(side*4.3,2.7,-2);pylon.userData.skyboundLaunchPulse=true;scene.add(pylon);launchMotion.push(pylon);}
    }else if(facility.kind==='storm_catapult'){
      const shuttle=new THREE.Mesh(new THREE.BoxGeometry(3.2,.48,3.8),railMaterial.clone());shuttle.position.set(0,.82,-3);shuttle.userData.skyboundLaunchPulse=true;scene.add(shuttle);launchMotion.push(shuttle);
      for(const side of [-1,1]){for(let coil=0;coil<3;coil+=1){const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.12,8,24),railMaterial.clone());ring.rotation.y=Math.PI/2;ring.position.set(side*4.8,1.2,-7+coil*5);ring.userData.skyboundLaunchPulse=true;scene.add(ring);launchMotion.push(ring);}}
    }else{
      const spine=new THREE.Mesh(new THREE.BoxGeometry(.34,.16,facility.deckLength*.78),railMaterial.clone());spine.position.set(0,.72,3);spine.userData.skyboundLaunchPulse=true;scene.add(spine);launchMotion.push(spine);
      for(let arch=0;arch<4;arch+=1){const ring=new THREE.Mesh(new THREE.TorusGeometry(3.3,.13,10,38,Math.PI),railMaterial.clone());ring.rotation.z=Math.PI;ring.position.set(0,3.7,-8+arch*7);ring.userData.skyboundLaunchPulse=true;scene.add(ring);launchMotion.push(ring);}
    }
  }

  const worldMotion: THREE.Object3D[] = [];
  const landmarkStone = new THREE.MeshStandardMaterial({ color:world.cliffColor,roughness:.94,flatShading:true });
  const landmarkLight = new THREE.MeshStandardMaterial({ color:level.accent,emissive:level.accent,emissiveIntensity:1.1,roughness:.32,metalness:.28 });
  const addLandmark = (landmark:SkyboundWorldLandmark) => {
    const group = new THREE.Group();
    const z = 18 + landmark.distanceRatio * Math.max(120, goalDistance - 36);
    const addPillar = (x:number,height:number,radius:number,material:THREE.Material=landmarkStone) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(radius*.72,radius,height,8),material);
      pillar.position.set(x,height/2,0);pillar.castShadow=true;group.add(pillar);return pillar;
    };
    if (landmark.kind === 'academy_tower') {
      addAcademyTower(landmark.lateralX,landmark.altitude,z,landmark.scale*.72);
      return;
    }
    if (landmark.kind === 'wind_turbine') {
      addPillar(0,19,.48,new THREE.MeshStandardMaterial({color:0xe8f3f0,roughness:.48}));
      const rotor = new THREE.Group();rotor.position.y=18.8;
      const hub = new THREE.Mesh(new THREE.SphereGeometry(.72,12,8),landmarkLight);rotor.add(hub);
      for(let blade=0;blade<3;blade+=1){const arm=new THREE.Mesh(new THREE.BoxGeometry(.45,6.7,.16),new THREE.MeshStandardMaterial({color:0xf4faf7,roughness:.4}));arm.position.y=3.15;arm.rotation.z=(blade/3)*Math.PI*2;rotor.add(arm);}
      rotor.userData.skyboundWorldMotion='turbine';group.add(rotor);worldMotion.push(rotor);
    } else if (landmark.kind === 'training_balloon') {
      const balloon=new THREE.Mesh(new THREE.SphereGeometry(4,18,12),new THREE.MeshStandardMaterial({color:0xfff0b4,emissive:0x4d2c08,emissiveIntensity:.16,roughness:.58}));balloon.scale.y=1.18;group.add(balloon);
      for(let stripe=0;stripe<3;stripe+=1){const band=new THREE.Mesh(new THREE.TorusGeometry(3.65-stripe*.35,.22,8,30),new THREE.MeshStandardMaterial({color:stripe%2?0x39d8e8:0xe85b58,roughness:.42}));band.rotation.x=Math.PI/2;band.position.y=(stripe-1)*1.35;group.add(band);}
      const basket=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.2,1.2),landmarkStone);basket.position.y=-5;group.add(basket);group.userData.skyboundWorldMotion='float';worldMotion.push(group);
    } else if (landmark.kind === 'lighthouse') {
      const body=addPillar(0,18,2.2,new THREE.MeshStandardMaterial({color:0xf8efe2,roughness:.62}));
      for(let stripe=0;stripe<3;stripe+=1){const band=new THREE.Mesh(new THREE.CylinderGeometry(2.1-stripe*.17,2.22-stripe*.17,2.3,16),new THREE.MeshStandardMaterial({color:0xd84b45,roughness:.55}));band.position.y=4.2+stripe*4.5;group.add(band);}
      body.scale.x=.92;const beacon=new THREE.Group();beacon.position.y=19;
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(.7,12,8),landmarkLight);beacon.add(lamp);
      const beam=new THREE.Mesh(new THREE.ConeGeometry(4.3,24,18,1,true),new THREE.MeshBasicMaterial({color:0xfff0a5,transparent:true,opacity:.13,depthWrite:false,blending:THREE.AdditiveBlending}));beam.rotation.z=-Math.PI/2;beam.position.x=12;beacon.add(beam);beacon.userData.skyboundWorldMotion='beacon';group.add(beacon);worldMotion.push(beacon);
    } else if (landmark.kind === 'sea_stack' || landmark.kind === 'mesa') {
      const mesa=landmark.kind==='mesa';
      for(let stack=0;stack<3;stack+=1){const height=(mesa?18:13)+stack*4;const pillar=addPillar((stack-1)*5.2,height,(mesa?4.8:3.3)-stack*.3);pillar.position.z=(stack%2)*2.5;}
    } else if (landmark.kind === 'coastal_arch' || landmark.kind === 'rock_arch') {
      const archMaterial=landmark.kind==='rock_arch'?new THREE.MeshStandardMaterial({color:0x9c5137,roughness:.96,flatShading:true}):landmarkStone;
      addPillar(-5.4,14,2.8,archMaterial);addPillar(5.4,14,2.8,archMaterial);
      const arch=new THREE.Mesh(new THREE.TorusGeometry(5.5,2.4,8,24,Math.PI),archMaterial);arch.position.y=13;arch.rotation.z=0;group.add(arch);
    } else if (landmark.kind === 'thermal_column') {
      const column=new THREE.Mesh(new THREE.CylinderGeometry(3.5,7,34,18,1,true),new THREE.MeshBasicMaterial({color:0xffd170,transparent:true,opacity:.13,depthWrite:false,blending:THREE.AdditiveBlending}));column.position.y=17;group.add(column);
      for(let ring=0;ring<5;ring+=1){const flow=new THREE.Mesh(new THREE.TorusGeometry(3.5+ring*.55,.13,8,30),new THREE.MeshBasicMaterial({color:0xffec9b,transparent:true,opacity:.42,depthWrite:false}));flow.rotation.x=Math.PI/2;flow.position.y=4+ring*6;flow.userData.skyboundWorldMotion='thermal';flow.userData.motionOffset=ring;group.add(flow);worldMotion.push(flow);}
    } else if (landmark.kind === 'thunderhead') {
      const thunderMaterial=new THREE.MeshStandardMaterial({color:0x46536b,emissive:0x11182b,emissiveIntensity:.35,roughness:1,transparent:true,opacity:.9});
      for(let puff=0;puff<7;puff+=1){const cloud=new THREE.Mesh(new THREE.IcosahedronGeometry(4.2+seeded(puff,z)*3,1),thunderMaterial);cloud.position.set((puff-3)*3.1,seeded(puff,4)*4,(seeded(puff,8)-.5)*4);cloud.scale.y=.7;group.add(cloud);}
      group.userData.skyboundWorldMotion='thunder';worldMotion.push(group);
    } else if (landmark.kind === 'lightning_beacon' || landmark.kind === 'storm_spire') {
      const count=landmark.kind==='storm_spire'?3:1;
      for(let spike=0;spike<count;spike+=1){const spire=new THREE.Mesh(new THREE.ConeGeometry(2.2+spike*.4,24+spike*7,6),landmarkStone);spire.position.set((spike-(count-1)/2)*5,(24+spike*7)/2,0);group.add(spire);}
      if(landmark.kind==='lightning_beacon'){const bolt=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,29,0),new THREE.Vector3(-2,24,0),new THREE.Vector3(1,19,0),new THREE.Vector3(-1,14,0)]),new THREE.LineBasicMaterial({color:0xd7f7ff,transparent:true,opacity:.92}));bolt.userData.skyboundWorldMotion='lightning';group.add(bolt);worldMotion.push(bolt);}
    } else if (landmark.kind === 'aurora') {
      for(let ribbon=0;ribbon<3;ribbon+=1){const aurora=new THREE.Mesh(new THREE.PlaneGeometry(28+ribbon*7,6+ribbon*2,10,1),new THREE.MeshBasicMaterial({color:ribbon===1?0x6cebd9:0x79a6ff,transparent:true,opacity:.15+ribbon*.04,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));aurora.position.set((ribbon-1)*4,ribbon*5,0);aurora.rotation.z=(ribbon-1)*.18;aurora.userData.skyboundWorldMotion='aurora';aurora.userData.motionOffset=ribbon;group.add(aurora);worldMotion.push(aurora);}
    } else if (landmark.kind === 'orbital_marker') {
      const marker=new THREE.Mesh(new THREE.TorusGeometry(7,.28,10,42),landmarkLight);marker.rotation.y=.45;group.add(marker);
      for(const side of [-1,1]){const panel=new THREE.Mesh(new THREE.BoxGeometry(5,.15,2.2),new THREE.MeshStandardMaterial({color:0x246ca1,emissive:0x0e304c,emissiveIntensity:.7,metalness:.45,roughness:.34}));panel.position.x=side*7;group.add(panel);}group.userData.skyboundWorldMotion='orbit';worldMotion.push(group);
    } else if (landmark.kind === 'star_cluster') {
      const positions=new Float32Array(90*3);for(let index=0;index<90;index+=1){positions[index*3]=(seeded(index,2)-.5)*70;positions[index*3+1]=(seeded(index,5)-.5)*38;positions[index*3+2]=(seeded(index,8)-.5)*18;}
      const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3)),new THREE.PointsMaterial({color:0xfff1b6,size:.48,transparent:true,opacity:.86,sizeAttenuation:true}));group.add(stars);
    }
    group.name=`skybound-landmark-${landmark.id}`;group.scale.setScalar(landmark.scale);group.position.set(landmark.lateralX,landmark.altitude,z);group.userData.skyboundBaseY=landmark.altitude;scene.add(group);
  };
  world.landmarks.forEach(addLandmark);

  const objectMeshes = new Map<string, THREE.Object3D>();
  for (const object of getSkyboundCourseObjects(levelId, goalDistance)) {
    let mesh: THREE.Object3D;
    if (object.kind === 'wind_ring') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(3.8, object.radius * 0.27), 0.42, 12, 38),
        new THREE.MeshStandardMaterial({ color: 0x5cf4ff, emissive: 0x187a91, emissiveIntensity: 1.7, roughness: 0.25 }),
      );
      const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      chevron.rotation.x = Math.PI / 2;
      ring.add(chevron);
      mesh = ring;
    } else if (object.kind === 'salvage') {
      mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.78, 0),
        new THREE.MeshStandardMaterial({ color: 0xffdd56, emissive: 0x8a4c05, emissiveIntensity: 1.1, roughness: 0.28, metalness: 0.5 }),
      );
    } else {
      const hazard = new THREE.Group();
      for (let spike = 0; spike < 4; spike += 1) {
        const crystal = new THREE.Mesh(
          new THREE.ConeGeometry(1.2 + spike * 0.18, 7 + spike * 1.4, 5),
          new THREE.MeshStandardMaterial({ color: 0x9d2f38, emissive: 0x35070a, emissiveIntensity: 0.9, roughness: 0.6 }),
        );
        crystal.position.set((spike - 1.5) * 1.25, (spike * 0.7) - 2, (spike % 2) * 0.7);
        crystal.rotation.z = (spike - 1.5) * 0.11;
        crystal.castShadow = true;
        hazard.add(crystal);
      }
      mesh = hazard;
    }
    mesh.name = object.id;
    mesh.position.set(object.lateralX ?? 0, object.y, object.x);
    mesh.userData.courseKind = object.kind;
    scene.add(mesh);
    objectMeshes.set(object.id, mesh);
  }

  const gate = new THREE.Group();
  const gateMaterial = new THREE.MeshStandardMaterial({ color: 0xf3ba4c, emissive: 0x704000, emissiveIntensity: 1.4, metalness: 0.35, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(1, 14, 1), gateMaterial);
    pylon.position.set(side * 7, 7, 0);
    gate.add(pylon);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(15, 1, 1), gateMaterial);
  top.position.y = 14;
  gate.add(top);
  gate.position.z = goalDistance;
  scene.add(gate);

  for (let index = 0; index < world.cloudCount; index += 1) {
    const cloud = makeCloud();
    cloud.traverse((object)=>{if(object instanceof THREE.Mesh){const material=object.material as THREE.MeshStandardMaterial;material.color.set(world.cloudColor);material.opacity=world.cloudOpacity;}});
    cloud.position.set((seeded(index, 3) - 0.5) * 70, 18 + seeded(index, 7) * 44, seeded(index, 11) * goalDistance);
    cloud.scale.setScalar(0.8 + seeded(index, 12) * 1.8);
    scene.add(cloud);
  }
  return { objectMeshes, worldMotion, launchMotion };
}

function startSoftwareFlightRenderer(
  canvas:HTMLCanvasElement,
  props:Props,
  getFlight:()=>SkyboundFlightState|null,
  getPhase:()=>StagePhase,
  getAim:()=>SkyboundAimView,
  isBoosting:()=>boolean,
) {
  const context=canvas.getContext('2d');
  if(!context)return()=>undefined;
  const level=getSkyboundLevel(props.levelId);
  const course=getSkyboundCourseObjects(props.levelId,props.goalDistance);
  let width=1;let height=1;let frame=0;
  const resize=()=>{const rect=canvas.getBoundingClientRect();const ratio=Math.min(window.devicePixelRatio||1,1.5);width=Math.max(1,rect.width);height=Math.max(1,rect.height);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);};
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const aircraftColors:Record<SkyboundAircraftId,[string,string,string]>={toy_glider:['#f7efeb','#0b2949','#f2bd45'],prop_trainer:['#edf3e8','#235b88','#efb83e'],jet_trainer:['#e2eff5','#153e69','#50e5ef'],storm_interceptor:['#34466d','#151d37','#9c7ae8'],goldwing_fighter:['#fff9df','#162947','#f3ce4e']};
  const drawAircraft=(x:number,y:number,bank:number,pitch:number,scale:number,detached:readonly string[])=>{
    const [primary,secondary,accent]=aircraftColors[props.aircraftId];context.save();context.translate(x,y);context.rotate(bank*.55);context.scale(scale,scale*(1-pitch*.12));
    context.fillStyle='rgba(0,0,0,.22)';context.beginPath();context.ellipse(0,12,61,14,0,0,Math.PI*2);context.fill();
    if(!detached.includes('left-wing')){context.fillStyle=primary;context.beginPath();context.moveTo(-5,0);context.lineTo(-70,20);context.lineTo(-58,32);context.lineTo(-3,18);context.closePath();context.fill();}
    if(!detached.includes('right-wing')){context.fillStyle=primary;context.beginPath();context.moveTo(5,0);context.lineTo(70,20);context.lineTo(58,32);context.lineTo(3,18);context.closePath();context.fill();}
    context.fillStyle=secondary;context.beginPath();context.moveTo(0,-30);context.quadraticCurveTo(18,-2,10,48);context.lineTo(0,62);context.lineTo(-10,48);context.quadraticCurveTo(-18,-2,0,-30);context.fill();
    context.fillStyle=accent;context.beginPath();context.ellipse(0,-19,8,12,0,0,Math.PI*2);context.fill();
    if(props.aircraftId==='prop_trainer'){context.strokeStyle='#e9f8ff';context.lineWidth=3;context.rotate(performance.now()*.025);context.beginPath();context.moveTo(-30,-28);context.lineTo(30,-28);context.moveTo(0,-58);context.lineTo(0,2);context.stroke();}
    if(props.aircraftId==='storm_interceptor'||props.aircraftId==='goldwing_fighter'){context.fillStyle=accent;context.fillRect(-29,22,5,25);context.fillRect(24,22,5,25);}
    if(isBoosting()){const flame=context.createLinearGradient(0,45,0,104);flame.addColorStop(0,'#fff');flame.addColorStop(.35,'#65f5ff');flame.addColorStop(1,'rgba(80,180,255,0)');context.fillStyle=flame;context.beginPath();context.moveTo(-7,46);context.lineTo(0,105+Math.sin(performance.now()*.03)*10);context.lineTo(7,46);context.fill();}
    context.restore();
  };
  const animate=(time:number)=>{
    const flight=getFlight();const phase=getPhase();const aim=getAim();const distance=flight?.x??0;const altitude=flight?.y??6;const lateral=flight?.lateralX??0;const horizon=height*(.37-clamp((altitude-30)/600,-.05,.08));const focal=Math.min(width,height)*1.05;
    const sky=context.createLinearGradient(0,0,0,horizon+100);sky.addColorStop(0,level.skyTop);sky.addColorStop(1,level.skyBottom);context.fillStyle=sky;context.fillRect(0,0,width,height);
    context.globalAlpha=.42;context.fillStyle='#eefaff';for(let index=0;index<8;index+=1){const cloudX=((index*211-distance*.15)%(width+260))-130;const cloudY=55+(index%4)*45;context.beginPath();context.ellipse(cloudX,cloudY,58,18,0,0,Math.PI*2);context.fill();}context.globalAlpha=1;
    context.fillStyle=props.levelId==='storm'?'#222b46':props.levelId==='canyon'?'#754b42':props.levelId==='stratosphere'?'#b8d5e8':'#416d55';context.beginPath();context.moveTo(0,horizon+55);for(let x=0;x<=width+80;x+=80){const peak=horizon+12-Math.abs(Math.sin((x+distance*.22)*.018))*70;context.lineTo(x,peak);}context.lineTo(width,height);context.lineTo(0,height);context.fill();
    const ground=context.createLinearGradient(0,horizon,0,height);ground.addColorStop(0,level.ground);ground.addColorStop(1,'#172d35');context.fillStyle=ground;context.beginPath();context.moveTo(0,horizon);context.lineTo(width,horizon);context.lineTo(width,height);context.lineTo(0,height);context.fill();
    const project=(worldLateral:number,worldY:number,worldDistance:number)=>{const depth=Math.max(4,worldDistance-distance+14);const scale=focal/depth;return{x:width/2+(worldLateral-lateral)*scale,y:horizon-(worldY-altitude)*scale,scale,depth};};
    context.strokeStyle='rgba(210,248,255,.22)';context.lineWidth=1;for(let lane=-30;lane<=30;lane+=10){context.beginPath();for(let depth=8;depth<=500;depth+=12){const p=project(lane,getSkyboundGroundHeight(props.levelId,distance+depth),distance+depth);if(depth===8)context.moveTo(p.x,p.y);else context.lineTo(p.x,p.y);}context.stroke();}
    for(let marker=Math.ceil((distance+18)/40)*40;marker<distance+500;marker+=40){const left=project(-30,getSkyboundGroundHeight(props.levelId,marker),marker);const right=project(30,getSkyboundGroundHeight(props.levelId,marker),marker);context.beginPath();context.moveTo(left.x,left.y);context.lineTo(right.x,right.y);context.stroke();}
    if(phase==='aiming'){
      context.strokeStyle=aircraftColors[props.aircraftId][2];context.lineWidth=8;context.beginPath();context.moveTo(width*.34,height*.82);context.lineTo(width*.38,height*.61);context.moveTo(width*.66,height*.82);context.lineTo(width*.62,height*.61);context.stroke();
    }
    const resolved=new Set(flight?.resolvedObjectIds??[]);const visible=course.filter((object)=>!resolved.has(object.id)&&object.x>distance-8&&object.x<distance+520).sort((a,b)=>b.x-a.x);
    for(const object of visible){const p=project(object.lateralX??0,object.y,object.x);if(p.y<-100||p.y>height+120)continue;const size=Math.max(2,object.radius*p.scale*.34);if(object.kind==='wind_ring'){context.strokeStyle='#63f4ff';context.lineWidth=Math.max(2,p.scale*.22);context.shadowBlur=12;context.shadowColor='#4beeff';context.beginPath();context.ellipse(p.x,p.y,size,size,0,0,Math.PI*2);context.stroke();context.shadowBlur=0;}else if(object.kind==='salvage'){context.fillStyle='#ffe064';context.save();context.translate(p.x,p.y);context.rotate(time*.002+object.x);context.fillRect(-size*.5,-size*.5,size,size);context.restore();}else{context.fillStyle='#a83248';for(let spike=-1;spike<=1;spike+=1){context.beginPath();context.moveTo(p.x+spike*size*.45,p.y-size);context.lineTo(p.x+(spike-.45)*size*.5,p.y+size*.8);context.lineTo(p.x+(spike+.45)*size*.5,p.y+size*.8);context.fill();}}}
    const gate=project(0,14,props.goalDistance);if(gate.depth<520){const gateSize=Math.max(7,7*gate.scale);context.strokeStyle='#ffe16d';context.lineWidth=Math.max(2,gate.scale*.28);context.strokeRect(gate.x-gateSize,gate.y-gateSize,gateSize*2,gateSize*1.4);}
    if(isBoosting()){context.strokeStyle='rgba(190,248,255,.45)';context.lineWidth=2;for(let index=0;index<12;index+=1){const x=(index*97+time*.4)%width;context.beginPath();context.moveTo(x,horizon);context.lineTo(x+(x-width/2)*.18,height);context.stroke();}}
    const planeX=width/2+(flight?.bankRad??0)*26;const planeY=height*(phase==='aiming'?.67:.72)-(flight?.pitchRad??aim.angleDeg*Math.PI/180)*12;drawAircraft(planeX,planeY,flight?.bankRad??0,flight?.pitchRad??0,Math.max(.65,Math.min(1.08,width/650)),flight?.detachedPartIds??[]);
    for(let index=0;index<(flight?.detachedPartIds.length??0);index+=1){const age=(time*.002+index*.8)%4;context.save();context.translate(planeX+(index%2?-1:1)*age*28,planeY+age*age*10);context.rotate(age*2.4);context.fillStyle=aircraftColors[props.aircraftId][index%3];context.fillRect(-9,-3,18,6);context.restore();}
    frame=requestAnimationFrame(animate);
  };
  frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
}

export default function SkyboundExpeditionThreeStage(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const flightRef = useRef(props.flight);
  const phaseRef = useRef(props.phase);
  const aimRef = useRef(props.aim);
  const boostingRef = useRef(props.boosting);
  const stabilizingRef = useRef(props.stabilizing);
  flightRef.current = props.flight;
  phaseRef.current = props.phase;
  aimRef.current = props.aim;
  boostingRef.current = props.boosting;
  stabilizingRef.current = props.stabilizing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const startCompatibilityRenderer = () => startSkyboundSoftwareRenderer({
      canvas,
      levelId: props.levelId,
      goalDistance: props.goalDistance,
      aircraftId: props.aircraftId,
      assemblyLevel: props.assemblyLevel,
      getFlight: () => flightRef.current,
      getPhase: () => phaseRef.current,
      getAim: () => aimRef.current,
      isBoosting: () => boostingRef.current,
      isStabilizing: () => stabilizingRef.current,
    });
    if (!canCreateWebglContext()) {
      setWebglUnavailable(true);
      return startCompatibilityRenderer();
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 850);
    scene.add(camera);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      setWebglUnavailable(false);
    } catch {
      setWebglUnavailable(true);
      return startCompatibilityRenderer();
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    scene.add(createSkyboundAircraftLights());
    const airRush = new THREE.Group();
    airRush.name = 'skybound-air-rush';
    const airRushMaterial = new THREE.MeshBasicMaterial({ color:0xcaf9ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending });
    for(let index=0;index<30;index+=1){
      const streak=new THREE.Mesh(new THREE.BoxGeometry(.018,.018,2.4+seeded(index,12)*3.8),airRushMaterial);
      streak.position.set((seeded(index,2)-.5)*14,(seeded(index,7)-.5)*9,-2-seeded(index,4)*28);
      streak.userData.skyboundRushIndex=index;
      airRush.add(streak);
    }
    camera.add(airRush);
    const { objectMeshes, worldMotion, launchMotion } = addWorld(scene, props.levelId, props.goalDistance, props.aircraftId);
    const plane = applySkyboundAircraftAssembly(createSkyboundAircraftModel(props.aircraftId),props.assemblyLevel);
    plane.scale.setScalar(props.aircraftId === 'toy_glider' ? 1.02 : props.aircraftId === 'prop_trainer' ? 1.04 : 1.08);
    scene.add(plane);
    const runtime = plane.userData.sculptRuntime;
    const wingtipVapors: THREE.Mesh[] = [];
    for (const side of [-1, 1] as const) {
      const navigationLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        new THREE.MeshStandardMaterial({ color:side < 0 ? 0xff594f : 0x70ffab,emissive:side < 0 ? 0xff160f : 0x16ff68,emissiveIntensity:2.4,roughness:.18 }),
      );
      navigationLight.name = side < 0 ? 'left-navigation-light' : 'right-navigation-light';
      navigationLight.position.set(side * 2.55, 0.03, -0.22);
      navigationLight.visible=side<0?props.assemblyLevel>=1:props.assemblyLevel>=2;
      plane.add(navigationLight);
      const vapor = new THREE.Mesh(
        new THREE.CylinderGeometry(.035,.2,5.8,8,1,true),
        new THREE.MeshBasicMaterial({ color:0xdafaff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending }),
      );
      vapor.name = side < 0 ? 'left-wingtip-vapor' : 'right-wingtip-vapor';
      vapor.rotation.x = Math.PI / 2;
      vapor.position.set(side * 2.48, -0.04, -3.2);
      vapor.visible=side<0?props.assemblyLevel>=1:props.assemblyLevel>=2;
      plane.add(vapor);
      wingtipVapors.push(vapor);
    }
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 2.1, 14),
      new THREE.MeshBasicMaterial({ color: 0x64f6ff, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending }),
    );
    flame.name = 'cadet-boost-flame';
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0, 0, -2.95);
    plane.add(flame);
    const stabilizerAura = new THREE.Mesh(
      new THREE.TorusGeometry(3.45, 0.045, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xa6fff1, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }),
    );
    stabilizerAura.rotation.x = Math.PI / 2;
    stabilizerAura.visible = false;
    plane.add(stabilizerAura);
    const tensionAura = new THREE.Mesh(
      new THREE.TorusGeometry(2.25, 0.055, 8, 52),
      new THREE.MeshBasicMaterial({ color: 0x5cf4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    tensionAura.name = 'launch-tension-aura';
    tensionAura.position.z = -0.15;
    plane.add(tensionAura);
    const flowAura = new THREE.Mesh(
      new THREE.TorusGeometry(3.7,.055,8,56),
      new THREE.MeshBasicMaterial({color:0xffed91,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}),
    );
    flowAura.name='flow-lock-aura';flowAura.rotation.x=Math.PI/2;flowAura.position.z=-1.2;plane.add(flowAura);
    const crashSmoke=new THREE.Group();crashSmoke.name='crash-smoke';crashSmoke.visible=false;
    for(let puff=0;puff<7;puff+=1){const smoke=new THREE.Mesh(new THREE.IcosahedronGeometry(.28+seeded(puff,4)*.28,1),new THREE.MeshBasicMaterial({color:puff<2?0xff6c31:0x263140,transparent:true,opacity:.5,depthWrite:false}));smoke.position.set((seeded(puff,2)-.5)*.8,.15+seeded(puff,8)*.5,-1.7-puff*.32);smoke.userData.skyboundSmokeIndex=puff;crashSmoke.add(smoke);}plane.add(crashSmoke);
    const impactBurst=new THREE.Group();impactBurst.name='impact-burst';impactBurst.visible=false;
    for(let spark=0;spark<14;spark+=1){const shard=new THREE.Mesh(new THREE.IcosahedronGeometry(.07+seeded(spark,5)*.1,0),new THREE.MeshBasicMaterial({color:spark%3===0?0xffffff:spark%2===0?0xffd04e:0xff7046,transparent:true,opacity:1,depthWrite:false}));shard.userData.skyboundBurstVelocity=new THREE.Vector3((seeded(spark,2)-.5)*9,2+seeded(spark,7)*7,(seeded(spark,9)-.5)*6);impactBurst.add(shard);}scene.add(impactBurst);
    const leftLaunchBand = scene.getObjectByName('skybound-launch-band-left') as THREE.Mesh | undefined;
    const rightLaunchBand = scene.getObjectByName('skybound-launch-band-right') as THREE.Mesh | undefined;
    const launchRig = scene.getObjectByName('skybound-launch-rig');
    const bandAxis = new THREE.Vector3(0, 1, 0);
    const bandStart = new THREE.Vector3();
    const bandEnd = new THREE.Vector3();
    const bandDirection = new THREE.Vector3();
    const updateLaunchBand = (band:THREE.Mesh | undefined, side:-1|1, tension:number) => {
      if (!band) return;
      bandStart.set(side * 1.35, 4.15, -2.6);
      bandEnd.set(plane.position.x + side * 0.16, plane.position.y - 0.34, plane.position.z + 1.82);
      bandDirection.copy(bandEnd).sub(bandStart);
      const length = Math.max(0.1, bandDirection.length());
      band.position.copy(bandStart).add(bandEnd).multiplyScalar(0.5);
      band.quaternion.setFromUnitVectors(bandAxis, bandDirection.normalize());
      band.scale.set(1 + tension * 0.34, length, 1 + tension * 0.34);
      const material = band.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.35 + tension * 1.8;
    };

    const debris: DebrisBody[] = [];
    const detached = new Set<string>();
    let crashElapsed = 0;
    let impactBurstAge = 99;
    let lastImpactSerial = 0;
    let shake = 0;
    let frame = 0;
    let previousTime = performance.now();

    const detachPart = (id: string, impact: number) => {
      if (detached.has(id)) return;
      const part = runtime.nodes[id];
      if (!part || !part.parent) return;
      part.updateWorldMatrix(true, false);
      scene.attach(part);
      const side = id.includes('left') ? -1 : id.includes('right') ? 1 : seeded(impact, id.length) > 0.5 ? 1 : -1;
      debris.push({
        object: part,
        velocity: new THREE.Vector3(side * (3.4 + seeded(impact, 1) * 3), 3 + seeded(impact, 2) * 4, -1 + seeded(impact, 3) * 3),
        spin: new THREE.Vector3(side * 2.4, 1.8 + seeded(impact, 5) * 3, side * -3.1),
      });
      detached.add(id);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const animate = (time: number) => {
      const dt = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const flight = flightRef.current;
      const phase = phaseRef.current;
      const aim = aimRef.current;
      const ground = getSkyboundGroundHeight(props.levelId, flight?.x ?? 0);
      const integrityCapacity = flight ? Math.max(1, flight.integrity + flight.hazardHits) : 1;
      const launchPose = getSkyboundLaunchPose(aim.power, aim.pullX, aim.dragging);

      if (flight) {
        plane.position.set(flight.lateralX, flight.y, flight.x);
        plane.rotation.set(-flight.pitchRad, 0, -flight.bankRad);
        for (const id of flight.detachedPartIds) detachPart(id, flight.impactSerial);
        if (flight.impactSerial !== lastImpactSerial) {
          shake = 1;
          impactBurstAge=0;impactBurst.position.copy(plane.position);
          lastImpactSerial = flight.impactSerial;
        }
        if (flight.status === 'crashed') {
          crashElapsed += dt;
          plane.position.y = Math.max(ground + 0.7, flight.y - crashElapsed * crashElapsed * 7.2);
          plane.rotation.z += crashElapsed * 0.9;
          plane.rotation.x += crashElapsed * 0.48;
        }
      } else {
        const tensionBuzz = Math.sin(time * 0.032) * launchPose.vibration;
        plane.position.set(launchPose.lateral + tensionBuzz * 0.12, launchPose.height + tensionBuzz * 0.08, launchPose.forward);
        plane.rotation.set(-(aim.angleDeg * Math.PI) / 180 + launchPose.pitchJolt, tensionBuzz * 0.045, tensionBuzz * 0.035);
      }

      const speed = flight ? Math.hypot(flight.vx, flight.vy) : 0;
      const speedEnergy = clamp((speed - 18) / 58, 0, 1);
      const flowStrength=flight?.flowCharge??0;
      const motionPose = applySkyboundAircraftMotion(runtime, {
        phase,
        timeSeconds: time / 1000,
        dtSeconds: dt,
        aimPower: aim.power,
        aimDragging: aim.dragging,
        pitchRad: flight?.pitchRad ?? (aim.angleDeg * Math.PI) / 180,
        bankRad: flight?.bankRad ?? 0,
        speed,
        integrityRatio: flight ? flight.integrity / integrityCapacity : 1,
        boosting: boostingRef.current,
        stabilizing: stabilizingRef.current,
      });
      if (motionPose.mode === 'struggling') {
        plane.rotation.y += motionPose.shudder;
        plane.position.y += Math.abs(motionPose.shudder) * 0.28;
      }

      const vaporStrength = phase === 'flying'
        ? clamp((speed - 26) / 34 + (Math.abs(flight?.bankRad ?? 0) * .38) + (motionPose.mode === 'struggling' ? .2 : 0)+flowStrength*.34, 0, 1)
        : 0;
      for (const vapor of wingtipVapors) {
        (vapor.material as THREE.MeshBasicMaterial).opacity = vaporStrength * (.52 + Math.sin(time * .017 + vapor.position.x) * .1);
        vapor.scale.y = .72 + speedEnergy * .7;
      }

      flame.visible = phase === 'flying' && boostingRef.current;
      flame.scale.y = 0.7 + Math.sin(time * 0.024) * 0.22;
      stabilizerAura.visible = phase === 'flying' && stabilizingRef.current;
      stabilizerAura.rotation.z += dt * 1.8;
      tensionAura.visible = phase === 'aiming' && aim.power > 0.035;
      tensionAura.scale.setScalar(0.72 + launchPose.tension * 0.36 + Math.sin(time * 0.018) * launchPose.vibration * 0.03);
      (tensionAura.material as THREE.MeshBasicMaterial).opacity = 0.08 + launchPose.tension * 0.58;
      flowAura.visible=phase==='flying'&&flowStrength>.05;
      flowAura.rotation.z+=dt*(1.2+flowStrength*3.8);
      flowAura.scale.setScalar(.78+flowStrength*.34);
      (flowAura.material as THREE.MeshBasicMaterial).opacity=flowStrength*.5;
      crashSmoke.visible=flight?.status==='crashed';
      if(crashSmoke.visible){for(const child of crashSmoke.children){const index=Number(child.userData.skyboundSmokeIndex??0);child.position.y=.2+((time*.0014+index*.13)%1.4);child.position.x=(seeded(index,3)-.5)*.8+Math.sin(time*.003+index)*.16;const material=(child as THREE.Mesh).material as THREE.MeshBasicMaterial;material.opacity=.18+.34*(1-((time*.0014+index*.13)%1));}}
      impactBurstAge+=dt;impactBurst.visible=impactBurstAge<.62;
      if(impactBurst.visible){for(const child of impactBurst.children){const velocity=child.userData.skyboundBurstVelocity as THREE.Vector3;child.position.copy(velocity).multiplyScalar(impactBurstAge);child.position.y-=impactBurstAge*impactBurstAge*7;child.rotation.x+=dt*8;child.rotation.y+=dt*6;const material=(child as THREE.Mesh).material as THREE.MeshBasicMaterial;material.opacity=clamp(1-impactBurstAge/0.62,0,1);child.scale.setScalar(.65+impactBurstAge*1.7);}}
      if (launchRig) launchRig.visible = props.aircraftId === 'toy_glider' && phase === 'aiming';
      updateLaunchBand(leftLaunchBand, -1, launchPose.tension);
      updateLaunchBand(rightLaunchBand, 1, launchPose.tension);
      for(const object of launchMotion){
        if(object.userData.skyboundWorldMotion==='windsock'){
          object.rotation.x=Math.sin(time*.004)*.12;
          object.rotation.y=Math.sin(time*.0022)*.2;
          continue;
        }
        const material=(object as THREE.Mesh).material as THREE.MeshStandardMaterial|undefined;
        if(material?.emissive){material.emissiveIntensity=.38+launchPose.tension*2.2+Math.sin(time*.012+object.position.z)*.18;}
        const pulse=phase==='aiming' ? 1+launchPose.tension*.07+Math.sin(time*.016+object.position.z)*launchPose.tension*.025 : 1;
        object.scale.setScalar(pulse);
      }

      for (const body of debris) {
        body.velocity.y -= 12 * dt;
        body.object.position.addScaledVector(body.velocity, dt);
        body.object.rotation.x += body.spin.x * dt;
        body.object.rotation.y += body.spin.y * dt;
        body.object.rotation.z += body.spin.z * dt;
        const bodyGround = getSkyboundGroundHeight(props.levelId, body.object.position.z) + 0.2;
        if (body.object.position.y < bodyGround) {
          body.object.position.y = bodyGround;
          body.velocity.y *= -0.24;
          body.velocity.multiplyScalar(0.84);
          body.spin.multiplyScalar(0.78);
        }
      }

      for (const [id, object] of objectMeshes) {
        object.visible = !(flight?.resolvedObjectIds.includes(id) ?? false);
        if (object.userData.courseKind === 'salvage') {
          object.rotation.y += dt * 2.6;
          object.rotation.x += dt * 1.1;
        } else if (object.userData.courseKind === 'wind_ring') {
          object.rotation.z = Math.sin(time * 0.0015 + object.position.z) * 0.08;
        }
      }

      for (const object of worldMotion) {
        const motion = String(object.userData.skyboundWorldMotion ?? '');
        const offset = Number(object.userData.motionOffset ?? 0);
        if (motion === 'turbine') object.rotation.z = time * 0.0012;
        else if (motion === 'beacon') object.rotation.y = time * 0.00075;
        else if (motion === 'float') object.position.y = Number(object.userData.skyboundBaseY ?? 0) + Math.sin(time * 0.0011 + object.position.z) * 0.8;
        else if (motion === 'thermal') {
          object.rotation.z = time * (0.00045 + offset * 0.00008);
          object.scale.setScalar(0.86 + ((time * 0.0003 + offset * 0.16) % 0.28));
        } else if (motion === 'thunder') object.scale.setScalar(1 + Math.sin(time * 0.0015 + object.position.z) * 0.035);
        else if (motion === 'lightning') object.visible = Math.sin(time * 0.013 + object.position.z) > 0.82;
        else if (motion === 'aurora') object.position.y = offset * 5 + Math.sin(time * 0.0009 + offset) * 1.2;
        else if (motion === 'orbit') object.rotation.z = time * 0.00035;
      }

      const rushStrength=phase==='flying'?clamp(speedEnergy+(boostingRef.current ? 0.34 : 0)+flowStrength*.38,0,1):0;
      airRush.visible=rushStrength>.08;
      airRushMaterial.opacity=.08+rushStrength*.42;
      for(const child of airRush.children){
        child.position.z+=dt*(9+speed*.28+(boostingRef.current?16:0));
        if(child.position.z>-1.2){const index=Number(child.userData.skyboundRushIndex??0);child.position.z=-22-seeded(index+Math.floor(time/1000),14)*14;child.position.x=(seeded(index+Math.floor(time/900),3)-.5)*14;child.position.y=(seeded(index+Math.floor(time/1100),8)-.5)*9;}
      }

      const target = plane.position;
      const targetFov=phase==='flying'?62+(speedEnergy*9)+(boostingRef.current?5:0)+(flowStrength*3):58;
      camera.fov+=(targetFov-camera.fov)*(1-Math.exp(-dt*3.6));
      camera.updateProjectionMatrix();
      const desiredCamera = phase === 'aiming'
        ? new THREE.Vector3(5.4, 7.55, -9.5)
        : new THREE.Vector3(target.x * 0.78 + 3.25, target.y + 3.15-(flight?.pitchRad??0)*1.25, target.z-(10.35+speedEnergy*1.4));
      camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 5.2));
      if (shake > 0.01) {
        camera.position.x += (seeded(Math.floor(time), 3) - 0.5) * shake * 0.7;
        camera.position.y += (seeded(Math.floor(time), 8) - 0.5) * shake * 0.45;
        shake *= Math.pow(0.045, dt);
      }
      const lookTarget = phase === 'aiming'
        ? new THREE.Vector3(0, 4.1, -0.35)
        : new THREE.Vector3(target.x * 0.88, target.y + 0.48+(flight?.pitchRad??0)*2.1, target.z + 13+speedEnergy*8);
      camera.lookAt(lookTarget);
      if(phase==='flying'&&flight)camera.rotateZ(flight.bankRad*.16);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      renderer.forceContextLoss();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, [props.aircraftId, props.assemblyLevel, props.goalDistance, props.levelId, props.sortieKey]);

  return (<>
    <canvas
      ref={canvasRef}
      aria-label={props.phase === 'aiming'
        ? `3D ${props.aircraftId.replace(/_/g, ' ')} launch rig. Pull down and release to start the sortie.`
        : '3D chase-camera flight. Drag in any direction to steer, climb, or dive.'}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerUp}
    />
    {webglUnavailable && <div className="skybound__webgl-fallback" role="status"><strong>CHASE CAM · LIVE</strong><span>{getSkyboundLevel(props.levelId).name}</span></div>}
  </>);
}
