import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ISLAND_5_LANDMARKS } from './island5ThreePilotContract';
import type { Island3DQuality, Island3DQualityProfile, Island5LandmarkDefinition } from './island5ThreePilotContract';
import type { Island9HeartshaftMaterials } from './Island9HeartshaftThreeWorld';
import type { IslandConstructionFactoryOptions } from './IslandConstructionAuthoring';

/** Admitted first slice only. Family 6: shared-boundary open arch roots and conditioned height field; no production activation. */
export const ISLAND_009_V2_FAMILY = 'welded-open-arch-load-roots-conditioned-heightfield';
const MOUTH = 2.60;
const TOP = 0.18;
const BOTTOM = -6.32;
const TAU = Math.PI * 2;
const params = () => typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function part(id: string) {
  const group = new THREE.Group();
  group.name = `ISLAND_009_V2_${id.toUpperCase().replace(/-/g, '_')}`;
  group.userData.partId = id;
  group.userData.keepSeparate = true;
  group.userData.sculptRuntime = { clickable: true, explodable: true, parts: [{ id, name: id, nodeName: group.name, kind: 'part' }], sockets: {}, colliders: [], destructionGroups: [{ id, breakable: false }] };
  return group;
}
function addMesh(parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, mat: THREE.Material, position = v(0, 0, 0)) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name; mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.explodeWithParent = true;
  parent.add(mesh); return mesh;
}
function beam(parent: THREE.Object3D, name: string, a: THREE.Vector3, b: THREE.Vector3, width: number, depth: number, mat: THREE.Material) {
  const mesh = addMesh(parent, name, new THREE.BoxGeometry(width, a.distanceTo(b), depth), mat, a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize()); return mesh;
}
function socket(parent: THREE.Object3D, name: string, position: THREE.Vector3) {
  const node = new THREE.Object3D(); node.name = name; node.position.copy(position); node.userData.socket = true; parent.add(node);
  if(parent.userData.sculptRuntime)parent.userData.sculptRuntime.sockets[name]={nodeName:name,localPosition:position.toArray()};
  return node;
}
function annulus(inner: number, outer: number, height: number, segments: number) {
  const shape = new THREE.Shape(); shape.absarc(0, 0, outer, 0, TAU, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, TAU, true); shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: segments });
  geo.rotateX(-Math.PI / 2); return geo;
}
function radialSurface(rows: number, segments: number, point: (row: number, theta: number) => THREE.Vector3) {
  const positions: number[] = [], indices: number[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i <= segments; i++) positions.push(...point(j, i / segments * TAU).toArray());
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < segments; i++) {
    const a = j * (segments + 1) + i, b = a + 1, c = a + segments + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function createIsland9V2MacroAmbience(scene: THREE.Scene, profile: Island3DQualityProfile, _materials: Island9HeartshaftMaterials, water: THREE.Mesh) {
  water.visible = false;
  const root = part('macro-environment'); root.userData.family = ISLAND_009_V2_FAMILY;
  const mantle = part('caldera-mantle'), throat = part('shaft-throat'), heart = part('deep-heart');
  const stone = material(0x697078), wall = material(0x535b66), hot = material(0x9b9d9d);
  const segments = profile.id === 'high' ? 96 : profile.id === 'medium' ? 72 : 48;
  // Connected geological height field triangulated over an irregular boundary.
  // Fixed pads and the exact route collar are constraints, not raised islands.
  const boundary=(a:number)=>7.72+.40*Math.sin(a*3+.3)+.25*Math.cos(a*7-.6);
  const height=(x:number,z:number)=>{
    const r=Math.hypot(x,z), route=THREE.MathUtils.smoothstep(r,4.10,4.85);
    const pad=Math.min(...ISLAND_5_LANDMARKS.filter(d=>d.id!=='boss').map(d=>Math.hypot(x-d.position[0],z-d.position[2])));
    const protectedPad=THREE.MathUtils.smoothstep(pad,1.65,2.30);
    const ridge=Math.pow(Math.max(0,Math.sin(x*.93+z*.38)),2)*.90;
    const crossRidge=Math.pow(Math.max(0,Math.cos(z*1.1-x*.21)),3)*.60;
    const ravine=Math.exp(-Math.pow((x+.38*z-.8)/.42,2))*.44;
    return TOP+route*protectedPad*(ridge+crossRidge-ravine-.12);
  };
  // Regular welded sampling of the SAME Cartesian height function: no Earcut
  // triangles, midpoint slivers, zero-area seam duplicates or flat down normals.
  const rows=24,columns=192,positions:number[]=[],indices:number[]=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<columns;i++) {
    const a=i/columns*TAU,r=THREE.MathUtils.lerp(4.10,boundary(a),j/rows),x=Math.cos(a)*r,z=Math.sin(a)*r;
    positions.push(x,height(x,z),z);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++) {
    const a=j*columns+i,b=j*columns+(i+1)%columns,c=(j+1)*columns+i,d=(j+1)*columns+(i+1)%columns;
    indices.push(a,b,c,b,d,c);
  }
  const terrain=new THREE.BufferGeometry();terrain.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));terrain.setIndex(indices);terrain.computeVertexNormals();
  addMesh(mantle,'V6_CONDITIONED_SHARED_VERTEX_HEIGHTFIELD',terrain,stone);
  const routeCollar=radialSurface(2,192,(j,a)=>v(Math.cos(a)*(j?4.10:MOUTH),TOP,Math.sin(a)*(j?4.10:MOUTH)));
  const routeIndex=routeCollar.getIndex()!;for(let i=0;i<routeIndex.count;i+=3){const t=routeIndex.getX(i+1);routeIndex.setX(i+1,routeIndex.getX(i+2));routeIndex.setX(i+2,t);}routeCollar.computeVertexNormals();
  addMesh(mantle,'V6_FLAT_PROTECTED_ROUTE_COLLAR',routeCollar,stone);
  const cliff=radialSurface(3,192,(j,a)=>{
    const r=boundary(a),x=Math.cos(a)*r,z=Math.sin(a)*r,t=j/2;
    return v(x*(1-.045*t),THREE.MathUtils.lerp(height(x,z),-3.8-.65*Math.sin(a*4),t),z*(1-.045*t));
  });cliff.computeVertexNormals();addMesh(mantle,'V6_CONNECTED_GEOLOGICAL_ROOT',cliff,wall);
  // Family 4 topology: open nearly vertical bore. Every profile radius stays
  // above 2.39 through all visible depths. There is no convergent floor or shelf.
  const section = [[MOUTH,TOP],[2.59,-.25],[2.56,-.80],[2.53,-1.45],
    [2.51,-2.20],[2.48,-3.00],[2.46,-3.90],[2.43,-4.80],[2.41,-5.60],[2.40,BOTTOM]];
  const interior = radialSurface(section.length, segments, (j, a) => {
    // Low-frequency longitudinal cliff folds continue between vertical strata.
    const fold = j === 0 ? 0 : .045 * Math.sin(a*11+.4) + .018*Math.cos(a*19+j*.24);
    const r = section[j][0] + fold;
    return v(Math.cos(a)*r, section[j][1], Math.sin(a)*r);
  }).toNonIndexed(); interior.computeVertexNormals();
  const bore=addMesh(throat, 'V4_UNCAPPED_VERTICAL_BORE', interior, wall);bore.userData.keepSeparate=true;
  socket(mantle, 'caldera-mantle/shaft-mouth', v(0, TOP, 0));
  socket(throat, 'shaft-throat/heart-seat', v(0, -7.6, 0));
  // Inferred slender energy-bearing geological column continues below the wall.
  // It occupies only a small fraction of the bore and never bridges to its sides.
  const columnProfile = [[.38,-7.6],[.30,-6.3],[.25,-4.8],[.23,-3.6],[.25,-2.75]];
  const column = radialSurface(columnProfile.length, 12, (j,a) => {
    const r=columnProfile[j][0]*(1+.12*Math.sin(a*5+.4));
    return v(Math.cos(a)*r,columnProfile[j][1],Math.sin(a)*r);
  }).toNonIndexed(); column.computeVertexNormals();
  addMesh(heart,'V4_DEEP_GEOLOGICAL_ENERGY_COLUMN',column,wall);
  const crownProfile = [[.25,-.20],[.31,-.07],[.29,.10],[.16,.23],[0,.26]];
  const crown = radialSurface(crownProfile.length,12,(j,a) => {
    const r=crownProfile[j][0]*(1+.08*Math.sin(a*5));
    return v(Math.cos(a)*r,crownProfile[j][1],Math.sin(a)*r);
  }).toNonIndexed(); crown.computeVertexNormals();
  // Radius-zero crown tip contributes one zero-area face per sector; omit those
  // without moving any vertex or changing the retained visible heart profile.
  const crownPositions=crown.getAttribute('position'),crownFaces:number[]=[];
  for(let i=0;i<crownPositions.count;i+=3) {
    const a=new THREE.Vector3().fromBufferAttribute(crownPositions,i),b=new THREE.Vector3().fromBufferAttribute(crownPositions,i+1),c=new THREE.Vector3().fromBufferAttribute(crownPositions,i+2);
    if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)crownFaces.push(i,i+1,i+2);
  }
  crown.setIndex(crownFaces);
  const core = addMesh(heart, 'V4_OPEN_BORE_HEART', crown, hot, v(0,-2.58,0));
  core.userData.studyHeart = true;
  // Naked blockout: no emission or depth light.
  throat.add(heart); mantle.add(throat); root.add(mantle); scene.add(root);
  root.userData.dimensions = { mouthRadius:MOUTH, topY:TOP, bottomY:BOTTOM, coreY:-2.58, coreRadius:.335, columnBottomY:-7.6, boreProfile:section, topology:"open-nearly-vertical-bore-no-floor", protectedInnerRadius:2.70, protectedOuterRadius:4.10, maxMantleRadius:8.5 };
  return { root, animate: (_elapsed: number) => {} };
}

function addWheel(parent: THREE.Object3D, centre: THREE.Vector3, radius: number, mat: THREE.Material, name: string, segments: number) {
  const wheel = new THREE.Group(); wheel.name = name; wheel.position.copy(centre); parent.add(wheel);
  addMesh(wheel, name + '_RIM', new THREE.TorusGeometry(radius, 0.070, 6, segments), mat);
  addMesh(wheel, name + '_HUB', new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12).rotateX(Math.PI / 2), mat);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; beam(wheel, name + '_SPOKE_' + i, v(0, 0, 0), v(Math.cos(a) * radius, Math.sin(a) * radius, 0), 0.035, 0.07, mat); }
  return wheel;
}
function profileRail(parent: THREE.Object3D, points: Array<[number, number]>, z: number, mat: THREE.Material, name: string) {
  const shape = new THREE.Shape(); points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  return addMesh(parent, name, new THREE.ExtrudeGeometry(shape, { depth: 0.11, bevelEnabled: false }), mat, v(0, 0, z));
}

/** Stable neutral diagnostic. No camera transforms and no geometry mutation. */
export function prepareIsland9V2MacroEvidence(scene: THREE.Scene) {
  if (scene.userData.island9V2Prepared) return;
  scene.userData.island9V2Prepared = true;
  const mode = params().get('island9V2Mode') ?? 'clay';
  if (mode === 'context') return;
  scene.background = new THREE.Color(0x262d35); scene.fog = null;
  const clones = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  scene.traverse(object => {
    if (object instanceof THREE.Light) object.visible = false;
    if (!(object instanceof THREE.Mesh)) return;
    const isMacro = (() => { let n: THREE.Object3D | null = object; while (n) { if (n.userData.family === ISLAND_009_V2_FAMILY) return true; n = n.parent; } return false; })();
    const strip = (original: THREE.Material) => {
      // Invisible hit proxies are functional context, never diagnostic geometry.
      if (original.opacity < 0.1 || !original.colorWrite) return original;
      if (!clones.has(original)) {
        const base = original as THREE.MeshStandardMaterial;
        const mat = material(isMacro && base.color ? base.color.getHex() : 0x525a66);
        mat.wireframe = mode === 'wire'; clones.set(original, mat);
      }
      return clones.get(original)!;
    };
    object.material = Array.isArray(object.material) ? object.material.map(strip) : strip(object.material);
  });
  const hemi = new THREE.HemisphereLight(0xe7efff, 0x34303a, 2.0); hemi.name = 'V2_NEUTRAL_HEMISPHERE'; scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 3.2); key.name = 'V2_NEUTRAL_KEY'; key.position.set(-8, 14, 7); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -10; key.shadow.camera.right = 10; key.shadow.camera.top = 10; key.shadow.camera.bottom = -10; key.shadow.normalBias = 0.025;
  scene.add(key);
}

export function recordIsland9V2MacroEvidence(scene: THREE.Scene, camera: THREE.Camera, target: THREE.Vector3, canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const perspective = camera as THREE.PerspectiveCamera;
  canvas.dataset.island9V2Evidence = JSON.stringify({ family: ISLAND_009_V2_FAMILY, mode: params().get('island9V2Mode') ?? 'clay', camera: { position: camera.position.toArray(), target: target.toArray(), fov: perspective.fov, aspect: perspective.aspect, zoom: perspective.zoom, projection: camera.projectionMatrix.toArray(), world: camera.matrixWorld.toArray() }, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, routeSource: 'shared route unchanged; camera supplied by separate approved DEV study harness', productionActivated: false });
  if (!canvas.dataset.island9V2Structure) {
    const roots = scene.children.filter(x => x.userData.family === ISLAND_009_V2_FAMILY);
    const parts: Array<{ id: string; name: string; bounds: number[][] }> = [];
    roots.forEach(root => root.traverse(n => { if (n.userData.partId) { const box = new THREE.Box3().setFromObject(n); parts.push({ id: n.userData.partId, name: n.name, bounds: [box.min.toArray(), box.max.toArray()] }); } }));
    const ray = new THREE.Raycaster(v(0, 0.1, 0), v(0, -1, 0), 0, 10);
    const hits = ray.intersectObjects(roots, true).map(hit => ({ name: hit.object.name, y: hit.point.y }));
    canvas.dataset.island9V2Structure = JSON.stringify({ parts, centreDownRay: hits, chainContacts: roots.flatMap(root => root.userData.chainContacts ?? []), mouthRadius: MOUTH, bottomY: BOTTOM });
  }
}

/** Merge only static geometry owned by one semantic part; sockets/pivots survive. */
function compactPart(owner: THREE.Group) {
  owner.updateWorldMatrix(true,true);
  const inverse=owner.matrixWorld.clone().invert();
  const buckets=new Map<THREE.Material,Array<{mesh:THREE.Mesh;geometry:THREE.BufferGeometry}>>();
  const visit=(node:THREE.Object3D)=>{
    for(const child of [...node.children]) {
      if(child!==owner && child.userData.partId) {compactPart(child as THREE.Group);continue;}
      if(child instanceof THREE.Mesh && !Array.isArray(child.material) && !child.userData.studyHeart && !child.userData.keepSeparate) {
        const geometry=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone());
        geometry.applyMatrix4(inverse.clone().multiply(child.matrixWorld));
        for(const key of Object.keys(geometry.attributes))if(key!=='position'&&key!=='normal')geometry.deleteAttribute(key);
        if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
        const bucket=buckets.get(child.material)??[];bucket.push({mesh:child,geometry});buckets.set(child.material,bucket);
      } else visit(child);
    }
  };
  visit(owner);
  for(const [mat,items]of buckets) {
    const merged=mergeGeometries(items.map(i=>i.geometry),false);
    if(merged){for(const i of items){i.mesh.removeFromParent();i.geometry.dispose();}addMesh(owner,owner.name+'_STATIC_'+mat.uuid.slice(0,6),merged,mat);}
  }
}
function round(parent:THREE.Object3D,name:string,r:number,h:number,p:THREE.Vector3,mat:THREE.Material,rt=r) {
  return addMesh(parent,name,new THREE.CylinderGeometry(rt,r,h,16),mat,p);
}
function pipe(parent:THREE.Object3D,name:string,points:THREE.Vector3[],radius:number,mat:THREE.Material) {
  return addMesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,radius,7,false),mat);
}
function vessel(parent:THREE.Object3D,name:string,p:THREE.Vector3,r:number,h:number,mat:THREE.Material) {
  const mesh=addMesh(parent,name,new THREE.SphereGeometry(1,16,10),mat,p);mesh.scale.set(r,h*.5,r);return mesh;
}
function wheelPart(parent:THREE.Object3D,id:string,p:THREE.Vector3,r:number,mat:THREE.Material) {
  const wheel=addWheel(parent,p,r,mat,id,32);wheel.userData.partId=id;wheel.userData.keepSeparate=true;return wheel;
}

function factory(definition:Island5LandmarkDefinition,level:0|1|2|3) {
  const root=part(definition.id==='hatchery'?'blastglass-incubator':definition.id==='habit'?'great-fuse':definition.id==='wisdom'?'memory-press':'seismic-switchyard');
  root.name=`ISLAND_9_HEARTSHAFT_${definition.id.toUpperCase()}_ROOT`;root.position.set(...definition.position);root.userData.family=ISLAND_009_V2_FAMILY;
  const stone=material(0x6c7379),shell=material(0x969b9c),recess=material(0x596269);
  const fixed=part(definition.id+'-foundation');root.add(fixed);
  round(fixed,'F5_FOUNDATION',1.43,.26,v(0,.08,0),stone,1.35);
  // Original full L3 envelope, never rescaled between construction levels.
  const body=new THREE.Group();body.rotation.y=Math.atan2(-definition.position[0],-definition.position[2]);root.add(body);
  const addStage=(n:number)=>{const g=part(definition.id+'-stage-'+n);g.userData.constructionStage=n;body.add(g);return g;};
  socket(root,`ISLAND_9_${definition.id.toUpperCase()}_FOCUS_SOCKET`,v(0,1.5,0));
  root.userData.footprintRadius=1.53;
  if(level>=1) {
    const g=addStage(1);
    if(definition.id==='hatchery') {
      round(g,'INCUBATOR_LOWER_DRUM',.69,.62,v(0,.56,0),shell,.63);
      vessel(g,'INCUBATOR_LOWER_CHAMBER',v(0,1.35,0),.63,1.30,recess);
      for(const x of [-.67,.67])for(const z of [-.28,.28])beam(g,'INCUBATOR_LOWER_STANCHION',v(x,.79,z),v(x*.81,1.97,z),.13,.13,shell);
      round(g,'INCUBATOR_FIRST_SHOULDER',.70,.20,v(0,1.96,0),shell);
    } else if(definition.id==='habit') {
      round(g,'FUSE_MASONRY_PLINTH',.95,.38,v(0,.38,0),stone,.80);
      round(g,'FUSE_FIRST_CHAMBER',.53,1.16,v(.29,1.03,-.14),recess);
      round(g,'FUSE_FIRST_SEAT',.63,.15,v(.29,.52,-.14),shell);
      round(g,'FUSE_FIRST_CAP',.63,.18,v(.29,1.60,-.14),shell);
      wheelPart(g,'great-fuse-primary-wheel',v(-.68,.94,.31),.55,shell);
      beam(g,'FUSE_WHEEL_LOAD_BLOCK',v(-.68,.3,.30),v(-.68,.98,.30),.40,.37,stone);
    } else if(definition.id==='wisdom') {
      round(g,'PRESS_BROAD_LOWER_FURNACE',.91,1.10,v(0,.85,0),shell,.84);
      round(g,'PRESS_TIERED_SHOULDER',.89,.40,v(0,1.59,0),shell,.61);
      const front=new THREE.Shape();front.moveTo(-.49,1.48);front.lineTo(.49,1.48);front.lineTo(0,2.45);front.closePath();
      const hole=new THREE.Path();hole.moveTo(-.31,1.63);hole.lineTo(0,2.20);hole.lineTo(.31,1.63);hole.closePath();front.holes.push(hole);
      addMesh(g,'PRESS_TRIANGULAR_LOAD_FRAME',new THREE.ExtrudeGeometry(front,{depth:.23,bevelEnabled:false}),shell,v(0,0,.48));
      vessel(g,'PRESS_ARCHED_FURNACE_BACK',v(0,1.97,-.02),.56,1.13,recess);
      for(const x of [-.91,.91])beam(g,'PRESS_SPLAYED_BUTTRESS',v(x,.20,0),v(x*.60,1.45,0),.24,.40,stone);
    } else {
      round(g,'CHAMBER_ENGINE_BASE',.88,.45,v(0,.46,0),shell,.75);
      round(g,'CHAMBER_TALL_PRESSURE_VESSEL',.60,1.70,v(0,1.52,0),recess,.58);
      for(const x of [-.70,.70])beam(g,'CHAMBER_CRADLE',v(x,.40,0),v(x*.80,2.37,0),.18,.22,shell);
      round(g,'CHAMBER_CROWN_SEAT',.68,.20,v(0,2.40,0),shell);
    }
  }
  if(level>=2) {
    const g=addStage(2);
    if(definition.id==='hatchery') {
      vessel(g,'INCUBATOR_UPPER_CHAMBER',v(0,2.58,0),.57,1.12,recess);
      for(const x of [-.60,.60])for(const z of [-.26,.26])beam(g,'INCUBATOR_UPPER_STANCHION',v(x,1.98,z),v(x*.72,3.17,z),.13,.13,shell);
      round(g,'INCUBATOR_UPPER_SHOULDER',.61,.22,v(0,3.14,0),shell,.43);
      pipe(g,'INCUBATOR_LEFT_FEED',[v(-.77,.35,-.10),v(-1.03,1.1,-.10),v(-.96,2.65,-.10),v(-.50,2.84,-.10)],.13,shell);
    } else if(definition.id==='habit') {
      round(g,'FUSE_SECOND_CHAMBER',.53,1.15,v(.29,2.26,-.14),recess);
      round(g,'FUSE_SECOND_CAP',.62,.18,v(.29,2.87,-.14),shell);
      pipe(g,'FUSE_RETURN_PIPE',[v(1.05,.40,-.12),v(1.15,1.25,-.12),v(1.09,2.57,-.12),v(.61,2.80,-.12)],.14,shell);
      round(g,'FUSE_AUXILIARY_RESERVOIR',.24,1.32,v(-.63,1.37,-.75),shell);
    } else if(definition.id==='wisdom') {
      round(g,'PRESS_ARCH_TOP',.43,.23,v(0,2.46,-.09),shell,.27);
      round(g,'PRESS_FLUE',.20,.82,v(-.13,2.94,-.16),shell,.16);
      round(g,'PRESS_LEFT_AUXILIARY',.19,1.35,v(-.96,1.08,.34),shell,.15);
      round(g,'PRESS_RIGHT_AUXILIARY',.19,1.72,v(.93,1.28,.34),shell,.15);
      wheelPart(g,'memory-press-front-wheel',v(-.26,.66,.91),.29,shell);
    } else {
      round(g,'CHAMBER_TOP_PRESSURE_STACK',.39,.87,v(0,2.93,0),shell,.25);
      for(const x of [-.92,.92]) {
        round(g,'CHAMBER_SIDE_RESERVOIR',.24,x<0?1.82:1.34,v(x,x<0?1.23:.99,-.13),shell,.19);
        pipe(g,'CHAMBER_SIDE_PRESSURE_LINE',[v(x,.78,-.13),v(x,1.80,-.13),v(x*.60,2.03,-.10)],.09,shell);
      }
      wheelPart(g,'pressure-chamber-front-wheel',v(.18,.73,.94),.31,shell);
    }
  }
  if(level>=3) {
    const g=addStage(3);
    if(definition.id==='hatchery') {
      round(g,'INCUBATOR_NARROW_CROWN',.30,.56,v(0,3.51,0),shell,.18);
      round(g,'INCUBATOR_RIGHT_EXHAUST',.17,2.7,v(.97,1.65,-.13),shell,.14);
      pipe(g,'INCUBATOR_CROWN_FEED',[v(.97,2.88,-.13),v(.89,3.20,-.13),v(.30,3.32,-.10)],.11,shell);
    } else if(definition.id==='habit') {
      round(g,'FUSE_THIRD_CHAMBER',.53,1.04,v(.29,3.46,-.14),recess);
      round(g,'FUSE_CROWN',.65,.23,v(.29,4.02,-.14),shell,.54);
      pipe(g,'FUSE_OVERHEAD_RETURN',[v(1.08,2.48,-.12),v(1.12,3.38,-.12),v(.90,3.80,-.12),v(.63,3.90,-.12)],.14,shell);
    } else if(definition.id==='wisdom') {
      round(g,'PRESS_CHIMNEY_CROWN',.24,.15,v(-.13,3.38,-.16),shell);
      pipe(g,'PRESS_REAR_WORK_PIPE',[v(-.71,.49,-.67),v(-.82,1.50,-.60),v(-.45,2.11,-.35)],.12,shell);
    } else {
      round(g,'CHAMBER_CROWN_FLUE',.17,.42,v(0,3.57,0),shell,.13);
      round(g,'CHAMBER_REAR_STACK',.19,2.88,v(-.40,1.95,-.90),shell,.15);
      round(g,'CHAMBER_SMALL_STACK',.18,2.12,v(.53,1.50,-.82),shell,.14);
    }
  }
  compactPart(root);return root;
}

export function buildIsland9V2MacroLandmark(definition:Island5LandmarkDefinition,level:0|1|2|3,_quality:Island3DQuality,_materials:Island9HeartshaftMaterials,_options:IslandConstructionFactoryOptions={}) {
  if(definition.id!=='boss')return factory(definition,level);
  const root=part('heartshaft-crucible');root.name='ISLAND_9_HEARTSHAFT_BOSS_ROOT';root.position.set(...definition.position);root.userData.family=ISLAND_009_V2_FAMILY;
  const rock=material(0x676f76),cast=material(0xadb0ae),dark=material(0x5e6972);
  const foundations=part('gantry-foundations');root.add(foundations);
  const seats=[v(-2.03,TOP,-.36),v(2.04,TOP,.44),v(.08,TOP,-2.12)];
  const rotations=[.14,Math.PI-.14,-Math.PI/2];
  seats.forEach((p,i)=>{
    const seat=part('gantry-footing-'+i);seat.position.copy(p);seat.rotation.y=rotations[i];foundations.add(seat);
    // A single closed splayed arch replaces overlapping corbel/cast plates.
    // Its central void remains physically open from every azimuth.
    const arch=new THREE.Shape();arch.moveTo(-.57,-1.36);arch.lineTo(-.57,-.43);
    arch.bezierCurveTo(-.55,.26,-.40,.65,-.32,.65);arch.lineTo(.32,.65);
    arch.bezierCurveTo(.40,.65,.55,.26,.57,-.43);arch.lineTo(.57,-1.36);
    arch.lineTo(.35,-1.36);arch.lineTo(.35,-.47);arch.bezierCurveTo(.35,.07,.23,.38,0,.38);
    arch.bezierCurveTo(-.23,.38,-.35,.07,-.35,-.47);arch.lineTo(-.35,-1.36);arch.closePath();
    const archGeometry=new THREE.ExtrudeGeometry(arch,{depth:.22,bevelEnabled:false,curveSegments:12});
    archGeometry.translate(0,0,-.11);archGeometry.rotateY(Math.PI/2);
    const archPositions=archGeometry.getAttribute('position');
    for(let k=0;k<archPositions.count;k++) {
      const y=archPositions.getY(k),splay=THREE.MathUtils.smoothstep(-y,.12,1.12)*-.47;
      const bearingWidth=THREE.MathUtils.lerp(1,.56/.22,THREE.MathUtils.smoothstep(y,0,.40));
      archPositions.setX(k,archPositions.getX(k)*bearingWidth+splay);
    }
    archGeometry.computeVertexNormals();addMesh(seat,'F6_WELDED_OPEN_ROOT_ARCH',archGeometry,rock);
    // Crosshead is the widened crown of this same arch mesh, not an overlaid cap.
    socket(seat,'gantry-footing-'+i+'/wall-left',v(-.47,-1.28,-.46));
    socket(seat,'gantry-footing-'+i+'/wall-right',v(-.47,-1.28,.46));
    socket(foundations,['gantry-foundations/crane-pivot','gantry-foundations/beam-pivot','gantry-foundations/crescent-pivot'][i],p.clone().add(v(0,.65,0)));
  });
  if(level===0){compactPart(root);return root;}
  const primary=part('curved-crane');primary.position.copy(seats[0]);primary.rotation.y=rotations[0];root.add(primary);
  // Continuous cast load shell: broad buried pylon, curved shoulder and tapered
  // boom form one silhouette. Long structural windows are actual polygon holes.
  const frame=new THREE.Shape();frame.moveTo(-.25,.65);frame.lineTo(-.26,1.94);
  frame.bezierCurveTo(-.48,2.31,-.42,2.63,-.12,2.83);
  frame.bezierCurveTo(.34,3.02,1.04,3.14,1.89,3.49);
  frame.lineTo(2.01,3.23);frame.bezierCurveTo(1.34,2.97,.62,2.71,.30,2.54);
  frame.bezierCurveTo(.14,2.42,.18,2.22,.21,1.91);frame.lineTo(.25,.65);frame.closePath();
  const uprightWindow=new THREE.Path();uprightWindow.moveTo(-.12,.82);uprightWindow.lineTo(.08,.82);uprightWindow.lineTo(.035,1.98);uprightWindow.lineTo(-.08,2.00);uprightWindow.closePath();frame.holes.push(uprightWindow);
  const boomWindow=new THREE.Path();boomWindow.moveTo(.34,2.78);boomWindow.lineTo(1.70,3.29);boomWindow.lineTo(1.64,3.11);boomWindow.lineTo(.33,2.65);boomWindow.closePath();frame.holes.push(boomWindow);
  for(const z of [-.29,.13])addMesh(primary,'F5_CAST_CONTINUOUS_PYLON_AND_ARCH',new THREE.ExtrudeGeometry(frame,{depth:.16,bevelEnabled:false,curveSegments:16}),cast,v(0,0,z));
  const spineProfile=[new THREE.Vector2(.22,.65),new THREE.Vector2(.17,1.85),new THREE.Vector2(.22,2.33)];
  addMesh(primary,'F5_CONTINUOUS_LOAD_SPINE',new THREE.LatheGeometry(spineProfile,14),dark);
  beam(primary,'F5_AXLE',v(0,2.43,-.40),v(0,2.43,.40),.19,.19,dark);
  wheelPart(primary,'curved-crane-elbow-wheel',v(0,2.43,.37),.43,cast);
  wheelPart(primary,'curved-crane-rear-wheel',v(0,2.43,-.37),.43,cast);
  beam(primary,'F5_TERMINAL_AXLE',v(1.90,3.34,-.29),v(1.90,3.34,.29),.14,.14,cast);
  wheelPart(primary,'curved-crane-tip-sheave',v(1.90,3.34,0),.18,cast);
  const tips:THREE.Object3D[]=[socket(primary,'curved-crane/chain-a',v(1.90,3.18,0))];
  if(level>=2) {
    // Source-visible second machine is a shorter broad geared arm with two
    // tapered cast legs. It is deliberately not a mirrored primary crane.
    const right=part('forked-balance-beam');right.position.copy(seats[1]);right.rotation.y=rotations[1];root.add(right);
    for(const z of [-.25,.14])profileRail(right,[[-.25,.65],[-.25,1.57],[-.35,1.98],[-.12,2.21],[.31,2.14],[.28,1.91],[.11,1.67],[.18,.65],[.25,.65]],z,cast,'F5_RIGHT_CAST_PYLON');
    round(right,'F6_RIGHT_SPINE',.19,1.19,v(0,1.245,0),dark,.15);
    beam(right,'F5_RIGHT_AXLE',v(0,1.94,-.39),v(0,1.94,.39),.18,.18,dark);
    wheelPart(right,'forked-balance-elbow-wheel',v(0,1.94,.35),.37,cast);
    const arm=new THREE.Shape();arm.moveTo(-.10,2.15);arm.lineTo(1.57,2.53);arm.lineTo(1.61,2.28);arm.lineTo(.12,1.91);arm.closePath();
    const opening=new THREE.Path();opening.moveTo(.32,2.08);opening.lineTo(1.36,2.32);opening.lineTo(1.32,2.39);opening.lineTo(.32,2.16);opening.closePath();arm.holes.push(opening);
    for(const z of [-.24,.13])addMesh(right,'F5_RIGHT_FORKED_LOAD_ARM',new THREE.ExtrudeGeometry(arm,{depth:.11,bevelEnabled:false}),cast,v(0,0,z));
    beam(right,'F5_RIGHT_TERMINAL_BRIDGE',v(1.49,2.38,-.25),v(1.49,2.38,.25),.17,.17,cast);
    wheelPart(right,'forked-balance-tip-sheave',v(1.49,2.38,0),.14,cast);
    tips.push(socket(right,'forked-balance-beam/chain-b',v(1.49,2.24,0)));
    // Partly occluded rear load path: compact rooted counterbeam, no third clone.
    const rear=part('crescent-counterweight');rear.position.copy(seats[2]);rear.rotation.y=rotations[2];root.add(rear);
    round(rear,'F6_REAR_TAPERED_PEDESTAL',.26,.53,v(0,.915,0),cast,.18);
    const rearArm=new THREE.Shape();rearArm.moveTo(-.47,1.12);rearArm.bezierCurveTo(-.32,1.80,.55,2.03,1.18,1.97);rearArm.lineTo(1.25,1.75);rearArm.bezierCurveTo(.53,1.73,.11,1.44,.08,1.05);rearArm.closePath();
    addMesh(rear,'F5_REAR_CRESCENT_CASTING',new THREE.ExtrudeGeometry(rearArm,{depth:.30,bevelEnabled:false,curveSegments:14}),cast,v(0,0,-.15));
    round(rear,'F5_REAR_COUNTERMASS',.23,.67,v(-.20,1.24,0),dark,.25);
    wheelPart(rear,'crescent-terminal-sheave',v(1.15,1.85,0),.13,cast);
    tips.push(socket(rear,'crescent-counterweight/chain-c',v(1.15,1.72,0)));
  }
  if(level>=3) {
    const ring=part('ignition-ring');ring.name='ISLAND_9_IGNITION_RING_PIVOT';root.add(ring);const pose=THREE.MathUtils.clamp(Number(params().get('island9V2Pose'))||0,0,1);ring.position.y=.60-pose*.65;
    const ringShell=addMesh(ring,'V2_OPEN_IGNITION_ANNULUS',annulus(.94,1.18,.18,40),cast,v(0,-.09,0));ringShell.userData.keepSeparate=true;
    const angles=[-1.74,.45,-2.65];root.updateMatrixWorld(true);
    const contacts:Array<{from:string;to:string;a:number[];b:number[]}>=[];
    tips.forEach((top,i)=>{
      const a=root.worldToLocal(top.getWorldPosition(new THREE.Vector3()));const b=v(Math.cos(angles[i])*1.10,ring.position.y+.11,Math.sin(angles[i])*1.10);
      const lug=addMesh(ring,'F5_RING_LUG_'+i,new THREE.BoxGeometry(.18,.23,.23),cast,v(b.x,.10,b.z));
      const ringSocket=socket(ring,'ignition-ring/lug-'+i,v(b.x,.11,b.z));
      const chain=pipe(root,'F5_TAUT_SUSPENSION_'+i,[a,a.clone().lerp(b,.5),b],.025,cast);chain.userData.keepSeparate=true;chain.userData.endpoints={from:top.name,to:ringSocket.name};
      contacts.push({from:top.name,to:ringSocket.name,a:a.toArray(),b:b.toArray()});
    });root.userData.chainContacts=contacts;root.userData.ringPivot=ring.name;root.userData.suspensionMeshes=tips.map((_,i)=>'F5_TAUT_SUSPENSION_'+i);
  }
  compactPart(root);return root;
}
