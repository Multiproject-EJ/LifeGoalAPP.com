import * as THREE from 'three';
import { compactStaticGeometry, type CrownCitadelMaterials } from './CrownCitadelThreeModel';
import type { Island3DQuality, Island3DQualityProfile, Island5LandmarkDefinition, Island5LandmarkId } from './island5ThreePilotContract';

/** Same Crown-of-Tides architecture; canonical story and anchors are unchanged. */
export const ISLAND_4_DRIFTWOOD_WORLD_NAME = 'Driftwood Isle';
export const ISLAND_4_DRIFTWOOD_LANDMARK_LABELS: Record<Island5LandmarkId, string> = {
  boss: 'Crown Citadel', hatchery: 'Coral Cradle', habit: 'Tidekeeper Hall',
  wisdom: 'Pearl Archive', event: 'Concord Event Arena',
};
export const ISLAND_4_ROOF_COLORS: Record<Island5LandmarkId, number> = {
  boss: 0x633ab5, hatchery: 0xf07868, habit: 0x129fae, wisdom: 0xc85e38, event: 0x199aaa,
};
const standard = (color: number, roughness = .72, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
export function createIsland4DriftwoodMaterials() {
  return {
    stone: standard(0xeadfc9), stoneShade: standard(0xb4a38d,.9),
    timber: standard(0x966038,.85), timberDark: standard(0x493225,.9),
    copper: standard(0xe6b447,.32,.65), cream: standard(0xfff0d1,.7),
    purple: standard(ISLAND_4_ROOF_COLORS.boss,.42,.12), coral: standard(ISLAND_4_ROOF_COLORS.hatchery,.42,.08),
    teal: standard(ISLAND_4_ROOF_COLORS.habit,.38,.12), terracotta: standard(ISLAND_4_ROOF_COLORS.wisdom,.7),
    foliage: standard(0x1e6942,.92), foliageLight: standard(0x51a64b,.9), flower: standard(0xf58999,.8),
    glow: new THREE.MeshStandardMaterial({color:0xffe8b7,emissive:0xffbd66,emissiveIntensity:.45,roughness:.4}),
  };
}
export type Island4DriftwoodMaterials = ReturnType<typeof createIsland4DriftwoodMaterials>;

/** Color channels are cloned once per landmark BEFORE compaction. Exact-hex
 * recoloring after compaction misses the bright roofs, banners and glazing. */
export function createIsland4LandmarkPalette<T extends CrownCitadelMaterials>(source: T, id: Island5LandmarkId): T {
  const result = {...source};
  for (const key of ['purpleRoof','purpleRoofBright','banner'] as const) {
    result[key] = source[key].clone();
    result[key].color.setHex(ISLAND_4_ROOF_COLORS[id]);
    if(key==='purpleRoofBright') result[key].color.multiplyScalar(1.12);
    result[key].name = `ISLAND_4_${id}_${key}`;
  }
  for (const [key, value] of Object.entries(result)) if(value instanceof THREE.MeshPhysicalMaterial) {
    const glass=value.clone(); glass.transmission=0; glass.forceSinglePass=true;
    if(key==='coralGlass') {glass.color.setHex(ISLAND_4_ROOF_COLORS[id]);glass.opacity=.68;}
    (result as Record<string, unknown>)[key]=glass;
  }
  return result;
}

function part(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, name: string, position: readonly number[], stage=3) {
  const node=new THREE.Mesh(geometry,material); node.name=name; node.position.set(position[0]!,position[1]!,position[2]!);
  node.castShadow=true;node.receiveShadow=true;node.userData.constructionStage=stage;parent.add(node);return node;
}
const cube=(x:number,y:number,z:number)=>new THREE.BoxGeometry(x,y,z);
const tube=(radius:number,height:number,segments=12)=>new THREE.CylinderGeometry(radius,radius,height,segments);

/** Real walls replace an opaque room-sized solid, retaining original facade. */
function hollowBox(original: THREE.Mesh, materials: Island4DriftwoodMaterials, parent: THREE.Group) {
  const {width:w,height:h,depth:d}= (original.geometry as THREE.BoxGeometry).parameters;
  const shell=new THREE.Group();shell.name='ISLAND_4_OPEN_MASONRY_ROOM';shell.position.copy(original.position);shell.quaternion.copy(original.quaternion);shell.scale.copy(original.scale);
  const wall=.085;
  part(shell,cube(w,h,wall),original.material as THREE.Material,'ROOM_BACK_WALL',[0,0,-d/2+wall/2],2);
  for(const sign of [-1,1]) {
    part(shell,cube(wall,h,d),original.material as THREE.Material,'ROOM_SIDE_WALL',[sign*(w/2-wall/2),0,0],2);
    const pierWidth=Math.max(.08,(w-Math.min(.65,w*.65))/2);
    part(shell,cube(pierWidth,h,wall),original.material as THREE.Material,'ROOM_FRONT_PIER',[sign*(w/2-pierWidth/2),0,d/2-wall/2],2);
  }
  part(shell,cube(w,.07,d),materials.stoneShade,'ROOM_FLOOR',[0,-h/2+.035,0],1);
  part(shell,cube(w,.13,wall),original.material as THREE.Material,'ROOM_LINTEL',[0,h/2-.065,d/2-wall/2],2);
  original.parent?.add(shell);original.parent?.remove(original);original.geometry.dispose();
  parent.userData.hasOpenInterior=true;
}

function addInterior(parent: THREE.Group, id: Island5LandmarkId, materials:Island4DriftwoodMaterials, quality:Island3DQuality, level:number) {
  const furniture=new THREE.Group();furniture.name=`ISLAND_4_${id.toUpperCase()}_INTERIOR`;parent.add(furniture);
  const n=quality==='low'?8:12;
  if(id==='wisdom') {
    for(const x of [-.68,.68]) for(let row=0;row<3;row++) {
      part(furniture,cube(.5,.045,.2),materials.timber,'ARCHIVE_BOOKSHELF',[x,.8+row*.2,-.28],3);
      for(let i=0;i<5;i++) part(furniture,cube(.058,.12+(i%2)*.025,.12),[materials.teal,materials.coral,materials.purple,materials.cream][i%4]!,'ARCHIVE_BOOK',[x-.2+i*.09,.88+row*.2,-.28],4);
    }
    part(furniture,cube(.62,.07,.33),materials.timber,'ARCHIVE_READING_TABLE',[0,.91,.06],3);
    for(const x of [-.23,.23]) part(furniture,cube(.055,.24,.23),materials.timberDark,'TABLE_TRESTLE',[x,.77,.06],3);
    for(const z of [-.23,.35]) part(furniture,cube(.66,.08,.12),materials.timber,'ARCHIVE_READING_BENCH',[0,.8,z],4);
    for(const x of [-.1,.1]) {const book=part(furniture,cube(.18,.025,.15),materials.cream,'OPEN_READING_BOOK',[x,.966,.06],4);book.rotation.z=x<0?-.12:.12;}
  } else if(id==='hatchery') {
    for(let i=0;i<(level===1?2:4);i++) {
      const a=i*Math.PI/2,x=Math.cos(a)*.48,z=Math.sin(a)*.48;
      const nest=part(furniture,new THREE.TorusGeometry(.19,.055,6,n),materials.timber,'NURSERY_CRADLE',[x,.64,z],3);nest.rotation.x=Math.PI/2;
      const egg=part(furniture,new THREE.SphereGeometry(.13,n,8),i%2?materials.cream:materials.coral,'NURSERY_EGG',[x,.76,z],4);egg.scale.y=1.35;
    }
  } else if(id==='habit') {
    for(const x of [-.55,.55]) {
      part(furniture,cube(.26,.06,.52),materials.timber,'HALL_PRACTICE_BENCH',[x,1.12,.02],3);
      for(const z of [-.17,.2]) part(furniture,tube(.035,.22,6),materials.copper,'HALL_BENCH_LEG',[x,1,z],3);
    }
  } else if(id==='boss') {
    part(furniture,cube(.4,.18,.35),materials.copper,'CITADEL_THRONE_DAIS',[0,.7,-.25],3);
    part(furniture,cube(.36,.75,.1),materials.purple,'CITADEL_THRONE_BACK',[0,1.05,-.39],4);
    part(furniture,cube(.8,.025,.9),materials.purple,'CITADEL_CEREMONIAL_RUNNER',[0,.52,.1],3);
  }
}

/** Works on the unbatched LOCAL building, before construction authoring. */
export function upgradeIsland4LegacyLandmark(root:THREE.Group, definition:Island5LandmarkDefinition, level:0|1|2|3, quality:Island3DQuality, materials:Island4DriftwoodMaterials) {
  root.name=`ISLAND_4_V2_${definition.id.toUpperCase()}_MODEL`;
  root.userData.sculptRuntime={clickable:true,explodable:true,world:'island-004-v2',part:definition.id,pivots:'local origin',socket:'canonical landmark anchor'};
  if(level===0)return root;
  const candidates:THREE.Mesh[]=[];
  root.traverse(node=>{if(node instanceof THREE.Mesh)candidates.push(node);});
  if(definition.id==='boss' && level>=2) {
    const profile=[new THREE.Vector2(.94,-.56),new THREE.Vector2(.94,-.43),new THREE.Vector2(.90,-.23),new THREE.Vector2(.78,.0),new THREE.Vector2(.59,.22),new THREE.Vector2(.35,.41),new THREE.Vector2(.07,.56)];
    for(const node of candidates) {
      if(node.geometry instanceof THREE.ConeGeometry && node.geometry.parameters.radius===.94) {
        node.geometry.dispose();node.geometry=new THREE.LatheGeometry(profile,quality==='low'?20:40);node.name='CITADEL_V2_ROUNDED_CROWN_DOME';
      }
      // Replace straight roof meridians with curves matching the new dome.
      if(node.parent===root&&node.position.y>3.3&&node.position.y<4.4&&node.geometry instanceof THREE.CylinderGeometry&&node.geometry.parameters.radiusTop===.025) {node.removeFromParent();node.geometry.dispose();}
      if(node.parent===root&&node.geometry instanceof THREE.TorusGeometry&&node.geometry.parameters.radius===.54) {node.removeFromParent();node.geometry.dispose();}
    }
    for(let i=0;i<(quality==='low'?8:12);i++) {
      const a=i*Math.PI*2/(quality==='low'?8:12);
      const curve=new THREE.CatmullRomCurve3(profile.map(p=>new THREE.Vector3(Math.sin(a)*(p.x+.012),p.y+3.82,Math.cos(a)*(p.x+.012)-.12)));
      const rib=part(root,new THREE.TubeGeometry(curve,16,.018,5,false),materials.copper,'CITADEL_V2_CURVED_GOLD_RIB',[0,0,0],5);rib.userData.island4Roof=true;
    }
    const crown=root.getObjectByName('CROWN_CITADEL_CROWN');if(crown)crown.position.y+=.22;
  }
  candidates.forEach((node,index)=>{
    const material=Array.isArray(node.material)?node.material[0]!:node.material;
    const isRoof=material.name.includes('purpleRoof');
    if(isRoof) {node.userData.constructionStage=5;node.userData.island4Roof=true;}
    if(definition.id==='wisdom') {
      if(node.geometry instanceof THREE.BoxGeometry) {
        const p=node.geometry.parameters;
        if(p.height>.65&&p.depth>.7&&p.width>.5) hollowBox(node,materials,root);
      }
      if(node.position.y>1.65 || isRoof) {node.userData.archiveInspectionHide=true;node.userData.constructionStage=5;}
      else if(node.position.z>=.30 && node.position.y>.95) node.userData.archiveInspectionWall=true;
    }
    if(definition.id==='boss' && node.geometry instanceof THREE.BoxGeometry) {
      const p=node.geometry.parameters;
      if(p.width>1.8&&p.depth>1.4&&p.height>.7) hollowBox(node,materials,root);
    }
    if(definition.id==='hatchery' && node.geometry instanceof THREE.SphereGeometry && node.geometry.parameters.radius===.86) {
      node.parent?.remove(node);node.geometry.dispose();
    }
    if(!node.name)node.name=`ISLAND_4_${definition.id.toUpperCase()}_ARCHITECTURE_${index}`;
    node.userData.landmarkId=definition.id;
  });
  if(definition.id==='wisdom') root.traverse(node=>{
    if(node.name==='ROOM_FRONT_PIER'||node.name==='ROOM_LINTEL') node.userData.archiveInspectionWall=true;
  });
  addInterior(root,definition.id,materials,quality,level);
  // Processional stair stops before the canonical route's inner edge.
  if(definition.id==='boss')for(let i=0;i<5;i++)part(root,cube(1.1+i*.1,.07,.17),materials.cream,'CITADEL_V2_PROCESSIONAL_STAIR',[0,.42-i*.065,1.35+i*.16],1);
  return root;
}

/** Roof, interior and shell remain independently pickable/explodable. */
export function compactIsland4Landmark(root:THREE.Group,id:Island5LandmarkId) {
  root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert();
  const buckets=new Map<string,THREE.Group>();const meshes:THREE.Mesh[]=[];
  root.traverse(n=>{if(n instanceof THREE.Mesh&&!(n instanceof THREE.InstancedMesh)&&n.name!=='CROWN_CITADEL_VOICE_PRISM')meshes.push(n);});
  for(const mesh of meshes) {
    const kind=mesh.userData.archiveInspectionHide||mesh.userData.island4Roof?'ROOF':mesh.userData.archiveInspectionWall?'CUTAWAY_FACADE':mesh.name.match(/BOOK|TABLE|BENCH|NURSERY|THRONE|RUNNER/)?'INTERIOR':'SHELL';
    let group=buckets.get(kind);
    if(!group){group=new THREE.Group();group.name=`ISLAND_4_${id.toUpperCase()}_${kind}`;group.userData.landmarkId=id;group.userData.archiveInspectionHide=(kind==='ROOF'||kind==='CUTAWAY_FACADE')&&id==='wisdom';buckets.set(kind,group);}
    const local=inv.clone().multiply(mesh.matrixWorld);mesh.removeFromParent();local.decompose(mesh.position,mesh.quaternion,mesh.scale);group.add(mesh);
  }
  for(const [kind,group]of buckets){root.add(group);compactStaticGeometry(group,group.name);group.traverse(n=>{n.userData.landmarkId=id;n.userData.partId=`${id}-${kind.toLowerCase()}`;});}
  root.userData.sculptRuntime={...root.userData.sculptRuntime,partIds:[...buckets.keys()].map(k=>`${id}-${k.toLowerCase()}`)};
}

function addPalm(parent:THREE.Group,x:number,z:number,height:number,rotation:number,m:Island4DriftwoodMaterials) {
  const palm=new THREE.Group();palm.name='ISLAND_4_PALM';palm.position.set(x,.27,z);palm.rotation.y=rotation;
  const trunk=part(palm,new THREE.CylinderGeometry(.048,.075,height,7),m.timber,'PALM_TRUNK',[0,height/2,0]);trunk.rotation.z=.12;
  for(let i=0;i<7;i++) {
    const a=i*Math.PI*2/7;const geometry=new THREE.BufferGeometry();const positions:number[]=[],indices:number[]=[];
    for(let j=0;j<=5;j++) {const t=j/5,r=.9*t,w=.17*Math.sin(Math.PI*t),y=height+.18*Math.sin(Math.PI*t)-.28*t;
      for(const side of [-1,1])positions.push(Math.sin(a)*r+Math.cos(a)*w*side-.1,y,Math.cos(a)*r-Math.sin(a)*w*side);
      if(j<5){const k=j*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));geometry.computeVertexNormals();
    part(palm,geometry,i%2?m.foliage:m.foliageLight,'PALM_FROND',[0,0,0]);
  }
  parent.add(palm);
}

/** Retains authored coast, paths, sky, boats and gardens supplied by base. */
export function createIsland4DriftwoodLivingAmbience(scene:THREE.Scene,profile:Island3DQualityProfile,m:Island4DriftwoodMaterials,ocean:THREE.Mesh,base:{root:THREE.Group;animate:(elapsed:number)=>void}) {
  const root=new THREE.Group();root.name='ISLAND_4_V2_LIVING_WORLD';root.add(base.root);
  // The original formal garden generator predates these footprint checks.
  // Remove only scenery instances inside buildings or directly before doors.
  const centers=[[-4.36,-3.9],[4.36,-3.9],[-4.36,3.9],[4.36,3.9]];
  for(const node of base.root.children) if(node instanceof THREE.InstancedMesh&&!node.name) {
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
    for(let i=0;i<node.count;i++) {node.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
      if(centers.some(([x,z])=>Math.hypot(position.x-x!,position.z-z!)<1.66 || (Math.abs(position.x-x!)<.65&&position.z>z!&&position.z<z!+2.25))) {
        matrix.makeScale(0,0,0);node.setMatrixAt(i,matrix);
      }}
    node.instanceMatrix.needsUpdate=true;
  }
  const sky=base.root.getObjectByName('ISLAND_5_SKY_DOME');
  if(sky instanceof THREE.Mesh) {
    sky.material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
      vertexShader:'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`varying vec3 p;
        float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        void main(){float h=clamp((p.y+12.0)/75.0,0.0,1.0);vec3 c=mix(vec3(.60,.83,.95),vec3(.12,.48,.81),h);
          vec2 q=vec2(atan(p.x,p.z)*3.6,p.y*.07);float n=noise(q)+.5*noise(q*2.1)+.25*noise(q*4.2);
          float cloud=smoothstep(.88,1.32,n)*smoothstep(-4.0,9.0,p.y);c=mix(c,vec3(.96,.98,1.0),cloud*.9);gl_FragColor=vec4(c,1.0);}`});
  }
  m.foliage.side=THREE.DoubleSide;m.foliageLight.side=THREE.DoubleSide;
  const planting=new THREE.Group();planting.name='ISLAND_4_V2_MIXED_COASTAL_GARDENS';
  const palms:readonly [number,number,number][]=[[-6.1,-3.8,1.1],[6.1,-3.8,1.12],[-6,1.9,1.05],[6,1.9,1.1],[-3,-5.9,1.1],[3.1,-5.9,1.15],[-1.8,5.6,.9],[1.8,5.6,.95]];
  palms.slice(0,profile.id==='low'?4:8).forEach(([x,z,h],i)=>addPalm(planting,x,z,h,i*.8,m));
  const flowerCount=profile.id==='low'?50:profile.id==='medium'?110:160;
  for(let i=0;i<flowerCount;i++) {
    const a=i*2.39996,r=4.25+(i%9)*.19,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)>3.1&&Math.abs(z)>2.2)continue;
    if(Math.abs(x)<.65&&z>0)continue;
    const shrub=part(planting,new THREE.IcosahedronGeometry(.12,0),i%3?m.foliageLight:m.foliage,'GARDEN_LOW_SHRUB',[x,.37,z]);shrub.scale.set(1.45,.85,1);
    part(planting,new THREE.IcosahedronGeometry(.055,0),i%3?m.flower:m.cream,'GARDEN_FLOWER',[x+.05,.48,z]);
  }
  compactStaticGeometry(planting,planting.name);root.add(planting);
  const rocks=new THREE.Group();rocks.name='ISLAND_4_V2_ARTICULATED_SHORE';
  const rockCount=profile.id==='low'?48:88;
  for(let i=0;i<rockCount;i++) {
    const a=i/rockCount*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);
    let radius=6.22;
    for(const [x,z]of centers){const b=x!*dx+z!*dz,discriminant=b*b-(x!*x!+z!*z!-2.04*2.04);if(discriminant>0)radius=Math.max(radius,b+Math.sqrt(discriminant));}
    radius+=Math.sin(i*2.31)*.12;
    const rock=part(rocks,new THREE.DodecahedronGeometry(.29,0),i%3?m.stoneShade:m.stone,'COAST_ERODED_BOULDER',[dx*radius,-.21+Math.sin(i*1.7)*.14,dz*radius]);
    rock.scale.set(1.1+i%3*.25,.75+i%4*.2,.8+i%2*.4);rock.rotation.set(i*.4,i*2.3,i*.2);
  }
  compactStaticGeometry(rocks,rocks.name);root.add(rocks);
  const water=new THREE.MeshPhysicalMaterial({color:0x159dc3,roughness:.28,metalness:.08,clearcoat:.55,transparent:false});
  const time={value:0};
  water.onBeforeCompile=shader=>{
    shader.uniforms.island4Time=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 island4World;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nisland4World=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 island4World; uniform float island4Time;
      float i4hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float i4noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(i4hash(i),i4hash(i+vec2(1,0)),f.x),mix(i4hash(i+vec2(0,1)),i4hash(i+vec2(1,1)),f.x),f.y);}
      float i4wave(vec2 p){return i4noise(p*vec2(2.0,6.0))*.55+i4noise(p*vec2(6.0,14.0))*.3+i4noise(p*vec2(14.0,31.0))*.15;}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 p=island4World.xz; float t=island4Time;
      p+=vec2(t*.065,t*.038);float w=i4wave(p);
      float nx=(i4wave(p+vec2(.035,0))-w)*1.8;
      float nz=(i4wave(p+vec2(0,.035))-w)*1.4;
      normal=normalize(normal+vec3(nx,nz,0.0));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float ripple=i4wave(island4World.xz+vec2(island4Time*.065,island4Time*.038));
      diffuseColor.rgb*=.8+.4*ripple;
      diffuseColor.rgb+=vec3(.02,.08,.10)*smoothstep(.64,.85,ripple);`);
  };
  water.customProgramCacheKey=()=> 'island004-water-v2';ocean.material=water;scene.add(root);
  return {root,animate:(elapsed:number,reducedMotion=false)=>{const t=reducedMotion?0:elapsed;base.animate(t);time.value=t;m.glow.emissiveIntensity=.45*(reducedMotion?1:1+.2*Math.sin(t*1.6));}};
}
