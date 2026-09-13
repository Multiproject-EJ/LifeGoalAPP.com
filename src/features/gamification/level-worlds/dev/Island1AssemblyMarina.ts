import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island1WorldMaterials } from './Island1ThreeWorld';
import { MarinaGeometry, createMarinaCraftGeometry, MARINA_SPACECRAFT_ARCHETYPES } from './Island1MarinaGeometry';
import { createMarinaDelegates } from './Island1MarinaDelegates';
import {craftArrival,MARINA_FILM_SECONDS,MARINA_INTERIOR_START,MARINA_PODIUM_START} from './Island1MarinaChoreography';

export const ISLAND_1_MARINA_ANIMATION_DURATION_SECONDS = MARINA_FILM_SECONDS;
export const ISLAND_1_MARINA_BERTH_COUNT = 220;
export const ISLAND_1_MARINA_DESIGN_FAMILY_COUNT = 50;
export const ISLAND_1_MARINA_YACHT_FRACTION = .05;
export type Island1MarinaPhase = 'hidden' | 'entry-hall' | 'building' | 'arriving' | 'people' | 'podium' | 'complete';
export interface Island1MarinaPresentation {
  active: boolean; completed: boolean; progress: number; phase: Island1MarinaPhase;
  constructionProgress: number; arrivalProgress: number; peopleProgress: number;
  berthCount: number; craftCount: number; spacecraftCount: number; yachtCount: number; designFamilyCount: number;
  cameraPosition: readonly [number,number,number]; cameraTarget: readonly [number,number,number];
  cameraFov: number; interior: boolean; seatedCount: number; delegateCount: number;
  enteredCount: number; waterfallFlow: number; waterfallDraining: boolean;
  arrivedCraftCount:number; visibleCraftCount:number;
  meetingState: 'waiting' | 'admitting' | 'in-session' | 'ended';
}
export interface Island1AssemblyMarinaRuntime { root: THREE.Group; update: (progress: number, elapsed: number)=>void; endMeeting: (elapsed:number)=>void; getPresentation: ()=>Island1MarinaPresentation; }
const DECK=-2.38, SPOKES=10, PAIRS=11, START=13.8, SPACING=5.2;
const clamp=(v:number)=>THREE.MathUtils.clamp(Number.isFinite(v)?v:0,0,1);
const ease=(v:number)=>THREE.MathUtils.smoothstep(clamp(v),0,1);
const phase=(p:number,a:number,b:number)=>ease((p-a)/(b-a));
export function resolveIsland1MarinaCounts(q:Island3DQuality){
  const craftCount=q==='high'?216:q==='medium'?144:72,yachtCount=Math.round(craftCount*.05);
  return {craftCount,yachtCount,spacecraftCount:craftCount-yachtCount,pedestrianCount:q==='high'?96:q==='medium'?56:28,assemblyOccupantCount:q==='high'?120:q==='medium'?72:40,farArrivalCount:q==='high'?96:q==='medium'?64:32};
}
export function resolveIsland1MarinaPhase(p:number):Island1MarinaPhase{
  return p<=0?'hidden':p<.065?'entry-hall':p<.18?'building':p<.70?'arriving':p<MARINA_PODIUM_START?'people':p<1?'podium':'complete';
}
function softTexture(){
  if(typeof document==='undefined')return undefined;
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');if(!x)return undefined;
  const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(174,235,255,.8)');g.addColorStop(.18,'rgba(106,199,255,.35)');g.addColorStop(1,'rgba(85,177,225,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
/** Presentation-only; replay and scrubbing share the same deterministic clock. */
export function createIsland1AssemblyMarina(quality:Island3DQuality,materials:Island1WorldMaterials):Island1AssemblyMarinaRuntime{
  const root=new THREE.Group();root.name='ISLAND_1_ASSEMBLY_DIPLOMATIC_MARINA';
  Object.assign(root.userData,{presentationOnly:true,berthCount:220,designFamilyCount:50,fleetMix:{spacecraft:.95,yachts:.05},lodStrategy:'sculpted near/mid fleet, low-cost soft distant arrivals',archetypes:MARINA_SPACECRAFT_ARCHETYPES});
  const counts=resolveIsland1MarinaCounts(quality),dummy=new THREE.Object3D();
  const stone=0xe6ddc9,navy=0x172f45,gold=0xbc934e,wood=0xa88762,cyan=0x9ae7ee;
  const surface=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.46,metalness:.28});
  const shipMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.25,metalness:.56,emissive:0x7ca0b3,emissiveIntensity:.035});
  const glow=new THREE.MeshBasicMaterial({color:0xbdeef9});
  const instance=(name:string,g:THREE.BufferGeometry,m:THREE.Material,n:number)=>{const mesh=new THREE.InstancedMesh(g,m,n);mesh.name=name;mesh.frustumCulled=false;mesh.castShadow=quality!=='low';mesh.receiveShadow=true;root.add(mesh);return mesh;};
  const put=(mesh:THREE.InstancedMesh,i:number,p:THREE.Vector3,rotation:number,s:THREE.Vector3)=>{
    dummy.position.copy(p);dummy.rotation.set(0,rotation,0);dummy.scale.copy(s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  };
  const vec=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  const one=vec(1,1,1),small=vec(.00001,.00001,.00001);
  // Thick ivory pontoons, inset timber, navy fascia, continuous brass rails and lamps.
  const deckPart=new MarinaGeometry();
  deckPart.box(navy,[0,-.19,0],[1.85,.34,SPACING]);
  deckPart.box(stone,[0,-.015,0],[1.92,.15,SPACING]);
  deckPart.box(wood,[0,.072,0],[1.53,.035,SPACING-.05]);
  for(const s of [-1,1]){
    deckPart.box(gold,[s*.88,.13,0],[.045,.035,SPACING]);
    for(const z of [-1.55,1.55]){
      deckPart.cylinder(gold,[s*.84,.47,z],.028,.76);
      deckPart.ellipsoid(0xffdb92,[s*.84,.88,z],[.075,.1,.075]);
      deckPart.box(gold,[s*.84,.64,z],[.04,.04,.9]);
    }
    // Rails stop at the boarding opening rather than cutting across the passenger route.
    for(const z of [-1.66,1.66])deckPart.box(gold,[s*.84,.67,z],[.035,.035,1.05]);
  }
  for(let z=-2;z<=2;z+=.26)deckPart.box(0x84664d,[0,.094,z],[1.5,.008,.012]);
  const promenade=instance('ISLAND_1_MARINA_TEN_RADIAL_PROMENADES',deckPart.finish(),surface,SPOKES*(PAIRS+2));
  const fingerPart=new MarinaGeometry();
  fingerPart.box(navy,[0,-.15,0],[4.25,.25,.72]);fingerPart.box(stone,[0,0,0],[4.35,.13,.78]);fingerPart.box(wood,[0,.083,0],[4.12,.025,.57]);
  for(const z of [-.35,.35]){fingerPart.box(gold,[0,.14,z],[4.25,.027,.028]);for(const x of [-1.8,1.8])fingerPart.cylinder(gold,[x,.28,z],.055,.37);}
  const fingers=instance('ISLAND_1_MARINA_220_BERTH_FINGERS',fingerPart.finish(),surface,220);
  const nodePart=new MarinaGeometry();
  nodePart.cylinder(navy,[0,-.18,0],1.68,.3,undefined,1.58);nodePart.cylinder(stone,[0,0,0],1.64,.15);nodePart.torus(gold,[0,.1,0],1.5,.03);
  nodePart.cylinder(stone,[1.12,.28,0],.38,.43);nodePart.cylinder(gold,[1.12,.52,0],.38,.05);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;nodePart.ellipsoid(0x476d43,[1.12+Math.sin(a)*.18,.75,Math.cos(a)*.18],[.21,.33,.21]);}
  nodePart.cylinder(gold,[1.12,2,0],.034,3.2);
  nodePart.box(navy,[1.42,2.4,0],[.52,1.35,.035]);nodePart.box(gold,[1.42,3.08,0],[.58,.025,.055]);
  nodePart.torus(gold,[1.42,2.5,.026],.14,.018,[0,0,0]);
  const nodes=instance('ISLAND_1_MARINA_LANTERN_GARDEN_PLAZAS',nodePart.finish(),surface,30);
  // Circular arrival concourse physically joins every radial promenade.
  const ringPart=new MarinaGeometry();
  ringPart.torus(navy,[0,-.1,0],9.6,.55);ringPart.add(new THREE.RingGeometry(9.02,10.18,100),stone,[0,.04,0],[1,1,1],[-Math.PI/2,0,0]);
  ringPart.torus(gold,[0,.12,0],10.1,.035);
  const ring=new THREE.Mesh(ringPart.finish(),surface);ring.name='MARINA_ARRIVAL_CONCOURSE';ring.position.y=DECK;root.add(ring);
  // Vaulted ceremonial vestibule, open along the camera/passenger route.
  const entryHall=new THREE.Group();entryHall.name='ISLAND_1_MARINA_GRAND_ENTRY_HALL';entryHall.position.set(0,DECK,8.0);root.add(entryHall);
  const hall=new MarinaGeometry();hall.box(navy,[0,-.08,1.47],[5.4,.35,1.86]);hall.box(stone,[0,.11,1.47],[5.65,.17,1.90]);
  hall.box(navy,[0,.21,1.47],[1.4,.02,1.88]);
  for(const s of [-1,1])hall.box(stone,[s*1.88,.11,-.30],[1.85,.17,1.60]);
  for(const s of [-1,1]){
    for(const z of [-.65,1.9]){
      hall.cylinder(stone,[s*2.15,1.27,z],.2,2.3,undefined,.15);
      hall.cylinder(gold,[s*2.15,.25,z],.27,.12);hall.cylinder(gold,[s*2.15,2.38,z],.24,.12);
    }
    hall.box(navy,[s*2.32,1.50,1.97],[.52,1.45,.05]);hall.box(gold,[s*2.32,2.24,2.01],[.58,.04,.07]);
    hall.torus(gold,[s*2.32,1.62,2.015],.15,.02,[0,0,0]);
    for(let i=0;i<4;i++)hall.ellipsoid(0x4c7146,[s*2.7,.51,-.5+i*.65],[.28,.5,.28]);
  }
  for(const z of [-.66,1.92]){
    hall.torus(stone,[0,2.34,z],2.15,.17,[0,0,0],Math.PI);
    hall.torus(gold,[0,2.34,z+.12],2.15,.032,[0,0,0],Math.PI);
  }
  for(let i=0;i<9;i++){
    const a=i/8*Math.PI;hall.box(i%2?navy:gold,[Math.cos(a)*2.16,2.34+Math.sin(a)*2.16,.63],[.07,.07,2.65]);
  }
  hall.torus(gold,[0,3.15,1.95],.48,.045,[0,0,0]);hall.ellipsoid(cyan,[0,3.15,1.95],[.2,.2,.10]);
  const hallMesh=new THREE.Mesh(hall.finish(),surface);hallMesh.name='MARINA_VAULTED_ENTRY_ARCADE';hallMesh.castShadow=true;entryHall.add(hallMesh);
  const entryLight=new THREE.PointLight(0xffd8a1,12,9,2);entryLight.position.set(0,2.8,.6);entryHall.add(entryLight);
  // A broad descending threshold connects marina deck to the hall's top seating tier.
  const threshold=new MarinaGeometry();
  for(let i=0;i<13;i++){
    threshold.box(stone,[0,.12-i*.102,8.55-i*.14],[1.65,.14,.15]);
    threshold.box(navy,[0,.196-i*.102,8.55-i*.14],[1.30,.012,.15]);
    for(const s of [-1,1])threshold.box(gold,[s*.69,.208-i*.102,8.55-i*.14],[.025,.015,.15]);
  }
  const stairs=new THREE.Mesh(threshold.finish(),surface);stairs.position.y=DECK;stairs.name='MARINA_HALL_DESCENDING_THRESHOLD';root.add(stairs);

  interface Craft {position:THREE.Vector3;angle:number;family:number;yacht:boolean;spoke:number;pair:number;slot:number;batch:THREE.InstancedMesh;start:number;end:number;}
  const sockets=Array.from({length:counts.craftCount},(_,i)=>{
    const berth=Math.floor(i*220/counts.craftCount),spoke=Math.floor(berth/22),within=berth%22,pair=Math.floor(within/2),side=within%2?-1:1,angle=spoke/SPOKES*Math.PI*2;
    const radius=START+pair*SPACING;
    const position=vec(Math.sin(angle)*radius+Math.cos(angle)*side*3.75,DECK+.63,Math.cos(angle)*radius-Math.sin(angle)*side*3.75);
    const yacht=i>=counts.craftCount-counts.yachtCount,family=yacht?50+(i%2):(i*13+spoke*7)%50;
    return {position,angle:angle+side*Math.PI/2,family,yacht,spoke,pair,...craftArrival(i,counts.craftCount)};
  });
  const fleetBatches=new Map<number,THREE.InstancedMesh>();
  sockets.forEach(s=>{if(!fleetBatches.has(s.family)){
    const members=sockets.filter(c=>c.family===s.family).length;
    fleetBatches.set(s.family,instance('MARINA_CRAFT_'+(s.yacht?'YACHT':MARINA_SPACECRAFT_ARCHETYPES[Math.floor(s.family/5)])+'_'+s.family,createMarinaCraftGeometry(s.yacht?s.family-50:s.family,s.yacht),shipMaterial,members));
  }});
  const slots=new Map<number,number>();
  const craft:Craft[]=sockets.map(s=>{const slot=slots.get(s.family)||0;slots.set(s.family,slot+1);return {...s,slot,batch:fleetBatches.get(s.family)!};});
  const thrust=instance('MARINA_BLUE_ENGINE_EXHAUST',new THREE.ConeGeometry(.15,.85,8),new THREE.MeshBasicMaterial({color:0x5bdfff,transparent:true,opacity:.72,depthWrite:false}),counts.craftCount*2);
  const gangways=instance('MARINA_DEPLOYING_BOARDING_RAMPS',new THREE.BoxGeometry(.48,.055,1.6),materials.gold,counts.craftCount);
  const landingGlow=instance('MARINA_HOVER_DOCK_LIGHTS',new THREE.TorusGeometry(.7,.025,4,18),glow,counts.craftCount);
  const arrivalFlash=instance('MARINA_LOCAL_ARRIVAL_FLASHES',new THREE.TorusGeometry(1,.09,4,20),new THREE.MeshBasicMaterial({color:0xa6e9ff,transparent:true,opacity:.55,depthWrite:false}),counts.craftCount);
  const arrivalPuffs=instance('MARINA_LANDING_VAPOUR_PUFFS',new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xc8e6e8,transparent:true,opacity:.28,depthWrite:false}),counts.craftCount*6);
  arrivalFlash.castShadow=arrivalPuffs.castShadow=false;
  // Beyond the occupied marina only soft engine sprites are used.
  const farArray=new Float32Array(counts.farArrivalCount*3);
  for(let i=0;i<counts.farArrivalCount;i++){const a=i*2.39996,r=58+i%19*2.3;farArray.set([Math.sin(a)*r,DECK+2+i%7*.38,Math.cos(a)*r],i*3);}
  const farGeo=new THREE.BufferGeometry();farGeo.setAttribute('position',new THREE.BufferAttribute(farArray,3));
  const tex=softTexture(),far=new THREE.Points(farGeo,new THREE.PointsMaterial({color:0xaee6ff,size:1.6,...(tex?{map:tex}:{}),transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending}));
  far.name='ISLAND_1_MARINA_SOFT_FAR_FLEET';far.frustumCulled=false;root.add(far);
  const delegates=createMarinaDelegates(quality,craft);root.add(delegates.root);
  // Warm architectural fill inside the cavern, isolated to the presentation.
  const roomLight=new THREE.PointLight(0xffd8a2,22,13,2);roomLight.position.set(0,-2.8,1.8);root.add(roomLight);
  // Finished acoustic wall replaces the raw cavern read behind the incoming audience.
  const wall=new MarinaGeometry();
  for(let i=-13;i<=13;i++){
    const a=i*.113;if(Math.abs(a)<.18)continue;
    const r=6.69,x=Math.sin(a)*r,z=Math.cos(a)*r;
    wall.box(navy,[x,-1.98,z],[.75,3.3,.12],[0,a,0]);
    wall.box(gold,[x,-.39,z-.025],[.75,.06,.16],[0,a,0]);
    wall.box(0x775941,[x,-3.35,z-.04],[.75,.55,.15],[0,a,0]);
    wall.box(gold,[Math.sin(a+.049)*r,-1.98,Math.cos(a+.049)*r],[.025,3.28,.15],[0,a,0]);
    if(i%3===0){wall.box(stone,[x,-1.8,z-.13],[.23,2.6,.22],[0,a,0]);wall.box(0xffdfa0,[x,-1.6,z-.27],[.055,.85,.055],[0,a,0]);}
  }
  for(const s of [-1,1]){wall.box(stone,[s*1.12,-2.19,6.56],[.18,2.5,.32]);wall.box(gold,[s*.99,-2.2,6.36],[.025,2.46,.03]);}
  wall.torus(stone,[0,-.98,6.55],1.12,.1,[0,0,0],Math.PI);
  wall.add(new THREE.RingGeometry(2.76,6.70,72),0x31495a,[0,-.23,0],[1,1,1],[Math.PI/2,0,0]);
  for(const r of [2.8,4.12,5.4,6.66])wall.torus(gold,[0,-.27,0],r,.035);
  for(let i=0;i<32;i++){const a=i/32*Math.PI*2;wall.box(gold,[Math.sin(a)*4.75,-.28,Math.cos(a)*4.75],[.055,.055,3.85],[0,a,0]);}
  const wallMesh=new THREE.Mesh(wall.finish(),surface);wallMesh.name='ASSEMBLY_MARINA_ARRIVAL_PORTAL_AND_ACOUSTIC_WALL';root.add(wallMesh);
  let presentation:Island1MarinaPresentation;
  let meetingEndedAt:number|null=null;
  let previousProgress=0,lastElapsed=0;
  let lastConstruction=-1;
  const cameraKeys=[
    {p:0,pos:[25,16,32],aim:[0,-1.5,5],fov:48},
    {p:.17,pos:[11,5.6,24],aim:[4,2.1,17],fov:42},
    {p:.22,pos:[10,1.4,20],aim:[4.1,-.1,15],fov:43},
    {p:.275,pos:[1,.15,22],aim:[3.8,-1.3,13.9],fov:50},
    {p:.305,pos:[-.6,-.55,17.0],aim:[2.6,-1.55,13.8],fov:44},
    {p:.345,pos:[-1.35,-1.15,16.05],aim:[.75,-1.73,13.65],fov:48},
    {p:.39,pos:[-1.45,-1.20,15.25],aim:[.22,-1.72,12.6],fov:48},
    {p:.46,pos:[8,3.8,27],aim:[0,-.8,16],fov:55},
    {p:.54,pos:[27,19,43],aim:[0,-1.1,8],fov:62},
    {p:.63,pos:[38,24,34],aim:[0,-1.1,0],fov:68},
    {p:.70,pos:[27,19,38],aim:[0,-1.1,3],fov:64},
    {p:.755,pos:[1.4,-.6,11.3],aim:[0,-2.1,7],fov:56},
    {p:MARINA_INTERIOR_START,pos:[.35,-1.65,8.0],aim:[0,-3.5,5.8],fov:62},
    {p:.805,pos:[.22,-2.68,6.4],aim:[0,-4.4,2.6],fov:62},
    {p:.835,pos:[.1,-4.65,2.3],aim:[0,-5.1,0],fov:64},
    // The podium view is a deliberate editorial cut, avoiding a backwards spin through the lectern.
    {p:MARINA_PODIUM_START,pos:[0,-4.52,-1.18],aim:[0,-3.9,4.9],fov:78},
    {p:1,pos:[.08,-4.48,-1.18],aim:[0,-3.88,4.9],fov:78},
  ];
  function update(raw:number,elapsed:number){
    const p=clamp(raw),t=Number.isFinite(elapsed)?elapsed:0,buildP=clamp(p*.31/.18),constructionProgress=phase(buildP,.025,.31),arrivalProgress=phase(p,.18,.70),peopleProgress=phase(p,.318,1);
    if(p<previousProgress||p===0)meetingEndedAt=null;
    previousProgress=p;lastElapsed=t;
    root.visible=p>0;
    if(constructionProgress!==lastConstruction){
      const h=phase(buildP,.002,.115);entryHall.visible=h>0;entryHall.scale.set(1,Math.max(.001,h),1);entryHall.position.y=DECK-(1-h)*.6;
      ring.visible=buildP>.06;ring.scale.setScalar(Math.max(.001,phase(buildP,.035,.13)));stairs.visible=buildP>.1;
      for(let spoke=0;spoke<SPOKES;spoke++){
        const a=spoke/SPOKES*Math.PI*2,radial=vec(Math.sin(a),0,Math.cos(a)),tangent=vec(Math.cos(a),0,-Math.sin(a));
        for(let j=0;j<PAIRS+2;j++){
          const entranceSegment=spoke===0&&j===0;
          const r=entranceSegment?11.30:9.6+j*SPACING,g=phase(buildP,.045+j*.012+spoke*.001,.095+j*.012+spoke*.001);
          const pos=radial.clone().multiplyScalar(r).setY(DECK-(1-g)*.7);
          put(promenade,spoke*(PAIRS+2)+j,pos,a,g>0?vec(1,g,entranceSegment?1.8/SPACING:1):small);
        }
        for(let pair=0;pair<PAIRS;pair++)for(let sideIndex=0;sideIndex<2;sideIndex++){
          const side=sideIndex?-1:1,g=phase(buildP,.075+pair*.013+spoke*.001,.125+pair*.013+spoke*.001);
          const r=START+pair*SPACING;
          // Boat occupies the bay BEFORE this finger; the walkway runs alongside the hull.
          const pos=radial.clone().multiplyScalar(r+2.25).addScaledVector(tangent,side*2.7).setY(DECK);
          put(fingers,spoke*22+pair*2+sideIndex,pos,a,g>0?vec(g,1,1):small);
        }
        for(let j=0;j<3;j++){const g=phase(buildP,.06+j*.065,.14+j*.065);put(nodes,spoke*3+j,radial.clone().multiplyScalar(10+j*23.4).setY(DECK),a,g>0&&!(spoke===0&&j===0)?vec(1,g,1):small);}
      }
      [promenade,fingers,nodes].forEach(m=>m.instanceMatrix.needsUpdate=true);lastConstruction=constructionProgress;
    }
    craft.forEach((s,i)=>{
      const a=phase(p,s.start,s.end),visible=p>s.start,approach=1-a;
      const radial=s.position.clone().setY(0).normalize();
      const pos=s.position.clone().addScaledVector(radial,approach*(i<4?3.5:8+s.pair*.3));
      pos.y+=(s.yacht?0:approach*approach*(i<4?4.5:3+s.pair*.25))+(s.yacht?Math.sin(t*1.1+i)*.024:Math.sin(t*.7+i)*.025*a);
      if(i===0){
        // Braking arc, held hover, then a deliberate vertical final settle.
        const flight=phase(p,s.start,.265),settle=phase(p,.272,s.end);
        pos.copy(s.position).addScaledVector(radial,(1-flight)*6);
        pos.x+=Math.sin(flight*Math.PI)*1.1;
        pos.y+=(1-flight)*5.8+(1-settle)*.48;
      }
      const yaw=s.angle+approach*.34,size=s.yacht?.83:1.04+(s.family%5)*.045;
      put(s.batch,s.slot,pos,yaw,visible?vec(size,size,size):small);
      if(i===0){
        dummy.rotation.set(-Math.sin(a*Math.PI)*.11,yaw,Math.sin(a*Math.PI)*.13);
        dummy.updateMatrix();s.batch.setMatrixAt(s.slot,dummy.matrix);
      }
      for(let e=0;e<2;e++){
        const local=vec((e?1:-1)*.45,.09,2.0).applyAxisAngle(vec(0,1,0),yaw).add(pos);
        const engine=i===0?(1-phase(p,.28,.31))*(.45+approach):.3+approach;
        dummy.position.copy(local);dummy.rotation.set(Math.PI/2,yaw,0);dummy.scale.setScalar(visible&&!s.yacht?Math.max(.00001,engine)*size:.00001);dummy.updateMatrix();thrust.setMatrixAt(i*2+e,dummy.matrix);
      }
      const ramp=phase(p,s.end-.025,s.end+.025),rampPos=s.position.clone().addScaledVector(vec(Math.sin(s.angle),0,Math.cos(s.angle)),-2.35).setY(DECK+.16);
      put(gangways,i,rampPos,s.angle,ramp>0?vec(1,1,ramp):small);
      dummy.position.copy(pos).setY(DECK+.17);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(visible&&!s.yacht?size:.00001);dummy.updateMatrix();landingGlow.setMatrixAt(i,dummy.matrix);
      const age=(p-s.end)/.028,burst=age>0&&age<1?Math.sin(age*Math.PI):0;
      dummy.position.copy(s.position).setY(DECK+.24);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(burst>0?(1+age*1.8)*burst:.00001);dummy.updateMatrix();arrivalFlash.setMatrixAt(i,dummy.matrix);
      for(let n=0;n<6;n++){
        const angle=n/6*Math.PI*2+i;
        const puff=s.position.clone().add(vec(Math.sin(angle)*(1+Math.max(0,age)*1.1),-.5+Math.max(0,age)*.65,Math.cos(angle)*(1+Math.max(0,age)*1.1)));
        put(arrivalPuffs,i*6+n,puff,angle,burst>0?vec(.38*burst,.28*burst,.48*burst):small);
      }
    });
    [...fleetBatches.values(),thrust,gangways,landingGlow,arrivalFlash,arrivalPuffs].forEach(m=>m.instanceMatrix.needsUpdate=true);
    far.visible=p>.47;far.rotation.y=Math.sin(t*.009)*.035;
    delegates.update(p,t);
    let k=0;while(k<cameraKeys.length-2&&p>=cameraKeys[k+1].p)k++;
    const a=cameraKeys[k],b=cameraKeys[k+1],blend=a.p===.835?0:phase(p,a.p,b.p);
    const cameraPosition=a.pos.map((v,i)=>THREE.MathUtils.lerp(v,b.pos[i],blend)) as [number,number,number];
    const cameraTarget=a.aim.map((v,i)=>THREE.MathUtils.lerp(v,b.aim[i],blend)) as [number,number,number];
    const closing=phase(p,delegates.lastEntryProgress+.008,delegates.lastEntryProgress+.043);
    const openingStart=delegates.firstEntryProgress-.085,openingEnd=delegates.firstEntryProgress-.025;
    const admissionFlow=1-phase(p,openingStart,openingEnd)+closing;
    const release=meetingEndedAt===null?0:phase(t,meetingEndedAt,meetingEndedAt+2);
    const waterfallFlow=clamp(admissionFlow*(1-release));
    const meetingState=meetingEndedAt!==null?'ended':p>=delegates.lastEntryProgress+.043?'in-session':p>=openingStart?'admitting':'waiting';
    presentation={active:p>0&&p<1,completed:p>=1,progress:p,phase:resolveIsland1MarinaPhase(p),constructionProgress,arrivalProgress,peopleProgress,berthCount:220,craftCount:counts.craftCount,spacecraftCount:counts.spacecraftCount,yachtCount:counts.yachtCount,designFamilyCount:50,cameraPosition,cameraTarget,cameraFov:THREE.MathUtils.lerp(a.fov,b.fov,blend),interior:p>=MARINA_INTERIOR_START,seatedCount:delegates.getSeatedCount(),delegateCount:delegates.count,enteredCount:delegates.getEnteredCount(),waterfallFlow,waterfallDraining:(p<delegates.lastEntryProgress)||meetingEndedAt!==null,meetingState,arrivedCraftCount:craft.filter(c=>p>=c.end).length,visibleCraftCount:craft.filter(c=>p>c.start).length};
  }
  root.userData.sculptRuntime={componentIds:root.children.map(c=>c.name),sockets:{islandEntry:[0,DECK,7.5],berthCount:220},colliderProxies:{entryHall:{type:'box',size:[5.65,4.7,3.6]}},destruction:{breakable:false,reason:'civic infrastructure'}};
  update(0,0);
  return {root,update,getPresentation:()=>presentation,endMeeting:(elapsed)=>{if(presentation.completed){meetingEndedAt=Number.isFinite(elapsed)?elapsed:lastElapsed;update(previousProgress,lastElapsed);}}};
}
