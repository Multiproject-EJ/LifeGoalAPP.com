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
import { createSkyboundAircraftLights, createSkyboundAircraftModel } from './skyboundAircraftModels';
import type { SkyboundAimView } from './skyboundExpeditionRenderer';
import { startSkyboundSoftwareRenderer } from './skyboundSoftwareRenderer';

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
  scene.background = new THREE.Color(level.skyBottom);
  scene.fog = new THREE.FogExp2(level.skyTop, levelId === 'storm' ? 0.008 : levelId === 'stratosphere' ? 0.0035 : 0.0055);

  const cliffColor = levelId === 'canyon' ? 0x7e4936 : levelId === 'storm' ? 0x283047 : levelId === 'stratosphere' ? 0x52677e : 0x675845;
  const grassColor = levelId === 'storm' ? 0x50665c : levelId === 'stratosphere' ? 0x7ca4a3 : new THREE.Color(level.ground).getHex();
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
    scene.add(tower);
  };

  const addFloatingIsland = (x: number, topY: number, z: number, radius: number, academy = false) => {
    const island = new THREE.Group();
    const cliff = new THREE.Mesh(new THREE.ConeGeometry(radius, radius * 1.7, 9), cliffMaterial);
    cliff.position.y = -radius * 0.84;
    cliff.rotation.z = Math.PI;
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
    new THREE.MeshBasicMaterial({ color: 0xe6f7ff, transparent: true, opacity: levelId === 'storm' ? 0.34 : 0.62, depthWrite: false }),
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
    new THREE.BoxGeometry(7, 0.18, 28),
    new THREE.MeshStandardMaterial({ color: 0x263b50, roughness: 0.8 }),
  );
  runway.position.set(0, 0.3, 5);
  runway.receiveShadow = true;
  scene.add(runway);
  for (let index = 0; index < 7; index += 1) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 2.1), new THREE.MeshBasicMaterial({ color: 0xffdf69 }));
    stripe.position.set(0, 0.42, -5 + index * 3.2);
    scene.add(stripe);
  }

  const launchRig = new THREE.Group();
  const slingMaterial = new THREE.MeshStandardMaterial({ color: aircraftId === 'goldwing_fighter' ? 0xffdf65 : 0xf3ba4c, roughness: 0.34, metalness: 0.48 });
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 4.5, 10), slingMaterial);
    arm.position.set(side * 1.35, 2.4, -2.6);
    arm.rotation.z = side * -0.24;
    arm.castShadow = true;
    launchRig.add(arm);
  }
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.07, 8, 28, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x0a2344, roughness: 0.7 }),
  );
  band.position.set(0, 4.15, -2.6);
  band.rotation.z = Math.PI;
  launchRig.add(band);
  launchRig.visible = aircraftId === 'toy_glider';
  scene.add(launchRig);

  if (aircraftId !== 'toy_glider') {
    const railColor = aircraftId === 'goldwing_fighter' ? 0xffd85a : aircraftId === 'storm_interceptor' ? 0x8d75e4 : 0x62d8ef;
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, aircraftId === 'storm_interceptor' ? 24 : 18), new THREE.MeshStandardMaterial({ color: railColor, emissive: railColor, emissiveIntensity: 0.45, metalness: 0.55, roughness: 0.3 }));
      rail.position.set(side * 1.1, 0.65, 2); scene.add(rail);
    }
  }

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

  for (let index = 0; index < 34; index += 1) {
    const cloud = makeCloud();
    cloud.position.set((seeded(index, 3) - 0.5) * 70, 18 + seeded(index, 7) * 44, seeded(index, 11) * goalDistance);
    cloud.scale.setScalar(0.8 + seeded(index, 12) * 1.8);
    scene.add(cloud);
  }
  return objectMeshes;
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
    const objectMeshes = addWorld(scene, props.levelId, props.goalDistance, props.aircraftId);
    const plane = createSkyboundAircraftModel(props.aircraftId);
    plane.scale.setScalar(props.aircraftId === 'toy_glider' ? 0.72 : props.aircraftId === 'prop_trainer' ? 0.78 : 0.82);
    scene.add(plane);
    const runtime = plane.userData.sculptRuntime;
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

    const debris: DebrisBody[] = [];
    const detached = new Set<string>();
    let crashElapsed = 0;
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

      if (flight) {
        plane.position.set(flight.lateralX, flight.y, flight.x);
        plane.rotation.set(-flight.pitchRad, 0, -flight.bankRad);
        for (const id of flight.detachedPartIds) detachPart(id, flight.impactSerial);
        if (flight.impactSerial !== lastImpactSerial) {
          shake = 1;
          lastImpactSerial = flight.impactSerial;
        }
        if (flight.status === 'crashed') {
          crashElapsed += dt;
          plane.position.y = Math.max(ground + 0.7, flight.y - crashElapsed * crashElapsed * 7.2);
          plane.rotation.z += crashElapsed * 0.9;
          plane.rotation.x += crashElapsed * 0.48;
        }
      } else {
        plane.position.set(0, 5.25 + Math.sin(time * 0.0018) * 0.08, -0.3);
        plane.rotation.set(-(aim.angleDeg * Math.PI) / 180, 0, 0);
      }

      flame.visible = phase === 'flying' && boostingRef.current;
      flame.scale.y = 0.7 + Math.sin(time * 0.024) * 0.22;
      const propeller = runtime.nodes.propeller;
      if (propeller) propeller.rotation.z += dt * (phase === 'flying' ? 26 : 7);
      stabilizerAura.visible = phase === 'flying' && stabilizingRef.current;
      stabilizerAura.rotation.z += dt * 1.8;

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

      const target = plane.position;
      const desiredCamera = new THREE.Vector3(target.x * 0.78, target.y + 4.4, target.z - (phase === 'aiming' ? 12.5 : 13.5));
      if (phase === 'aiming') desiredCamera.x += 7.5;
      camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 5.2));
      if (shake > 0.01) {
        camera.position.x += (seeded(Math.floor(time), 3) - 0.5) * shake * 0.7;
        camera.position.y += (seeded(Math.floor(time), 8) - 0.5) * shake * 0.45;
        shake *= Math.pow(0.045, dt);
      }
      const lookTarget = new THREE.Vector3(target.x * 0.88, target.y + 0.8, target.z + (phase === 'aiming' ? 4 : 14));
      camera.lookAt(lookTarget);
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
  }, [props.aircraftId, props.goalDistance, props.levelId, props.sortieKey]);

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
    {webglUnavailable && <div className="skybound__webgl-fallback" role="status"><strong>CHASE CAM · LIVE</strong><span>Academy airspace</span></div>}
  </>);
}
