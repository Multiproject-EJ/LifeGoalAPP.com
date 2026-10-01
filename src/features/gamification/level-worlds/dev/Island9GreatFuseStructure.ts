import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Island3DQuality, Island5LandmarkDefinition } from './island5ThreePilotContract';
import type { Island9HeartshaftMaterials } from './Island9HeartshaftThreeWorld';
import type { IslandConstructionFactoryOptions } from './IslandConstructionAuthoring';

/** Unwired family10/r05 occupied chassis and explicitly reallocated axial cell schedule.
 * Exact source anchors are approximate; hidden recess/wheel-side closure inferred.
 * This is continued family10 refinement, not a new family or visual approval. */
export const GREAT_FUSE_SOURCE_PROFILE = {
  family: 'ordered-pressure-cell-stack-eccentric-drive', globalFamily: 10, unitFamily: 1,
  source: 'docs/visual-references/island-009-heartshaft-crucible/009-source.png',
  crop: 'docs/visual-references/island-009-heartshaft-crucible/derived-crops/great-fuse-exact-v001.png',
  cropPixelsXYXY: [600, 15, 941, 530], cropDimensions: [341, 515],
  // Coordinates in the exact crop, before authoring. Perspective is not a dimensioned drawing.
  projectedAnchorsPx: { crown: [195, 58], mainAxis: [189, 237], bearing: [184, 376],
    stackLeftRight: [151, 232], wheelCentre: [83, 306], wheelEnvelope: [43, 236, 146, 362],
    highReturn: [[223, 108], [293, 145], [304, 176], [294, 260]], driveHousing: [241, 331] },
  anchorUncertaintyPx: 14,
  inference: 'Hidden cross-sections, backside drive transmission and pipe junctions; wheel plane inferred from projected oval. No recovered world dimensions.',
  allocation: { stackRadius: .395, cellPitch: .3105, cellCount: 8, arrayBottom: 1.22,
    crownTop: 4.635, wheelRadius: .70, wheelPlaneYaw: .90, wheelCentre: [-.72, 1.70, .18] },
  footprintRadius: 1.53, heightCeiling: 4.635, yaw: 0,
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type Phase = 1 | 2 | 3 | 4 | 5;
function owner(id: string, level: number) {
  const group = new THREE.Group(); group.name = id; group.userData.partId = id;
  group.userData.constructionBuildLevel = level; group.userData.keepSeparate = true;
  group.userData.sculptRuntime = { presentationOnly: true, parts: [{ id, nodeName: id }], sockets: {} };
  return group;
}
function socket(parent: THREE.Object3D, name: string, at: THREE.Vector3) {
  const node = new THREE.Object3D(); node.name = name; node.position.copy(at); node.userData.socket = true; parent.add(node);
  if (parent.userData.sculptRuntime) parent.userData.sculptRuntime.sockets[name] = { nodeName: name, localPosition: at.toArray() };
  return node;
}
function mesh(parent: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, at: THREE.Vector3, phase: Phase) {
  const node = new THREE.Mesh(geometry, material); node.name = name; node.position.copy(at);
  node.castShadow = true; node.receiveShadow = true;
  node.userData.partId = parent.userData.partId;
  node.userData.constructionBuildLevel = parent.userData.constructionBuildLevel;
  node.userData.constructionStage = phase; parent.add(node); return node;
}
function rod(parent: THREE.Group, name: string, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, phase: Phase, segments = 8) {
  const delta = b.clone().sub(a);
  const node = mesh(parent, name, new THREE.CylinderGeometry(radius, radius, delta.length(), segments), material, a.clone().add(b).multiplyScalar(.5), phase);
  node.quaternion.setFromUnitVectors(V(0, 1, 0), delta.normalize());
  return node;
}
/** Separate meridian strips retain the exact profile while preventing corner-normal averaging. */
function hardMeridian(profile: number[][], segments: number, start = 0, length = Math.PI * 2) {
  const strips = profile.slice(1).map((b, i) => {
    const a = profile[i], dr = b[0] - a[0], dy = b[1] - a[1], magnitude = Math.hypot(dr, dy);
    const strip = new THREE.LatheGeometry([new THREE.Vector2(...a as [number, number]), new THREE.Vector2(...b as [number, number])], segments, start, length);
    const normals = strip.getAttribute('normal');
    for (let j = 0; j <= segments; j++) {
      const angle = start + j / segments * length;
      for (let k = 0; k < 2; k++) normals.setXYZ(j * 2 + k, Math.sin(angle) * dy / magnitude, -dr / magnitude, Math.cos(angle) * dy / magnitude);
    }
    return strip;
  });
  const result = mergeGeometries(strips, false)!; strips.forEach(strip => strip.dispose()); return result;
}
function rigidAnnulus(outer: number, inner: number, height: number, segments: number) {
  return hardMeridian([[inner, -height / 2], [outer, -height / 2], [outer, height / 2], [inner, height / 2], [inner, -height / 2]], segments);
}
function accessPlinth(radius: number, height: number) {
  // A closed polygonal plinth with a real rectangular stair well, not hidden steps.
  const shape = new THREE.Shape();
  shape.moveTo(.295, radius - .295 * Math.tan(Math.PI / 16));
  for (let i = 1; i < 16; i++) shape.lineTo(Math.sin(i * Math.PI / 8) * radius, Math.cos(i * Math.PI / 8) * radius);
  shape.lineTo(-.195, radius - .195 * Math.tan(Math.PI / 16));
  shape.lineTo(-.195, .40); shape.lineTo(.295, .40); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
  geometry.rotateX(Math.PI / 2);
  geometry.setIndex(Array.from({ length: geometry.getAttribute('position').count }, (_, i) => i)); return geometry;
}
function chassisExtrusion(points: number[][], depth: number) {
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});geometry.setIndex(Array.from({length:geometry.getAttribute('position').count},(_,i)=>i));return geometry;
}
/** Conforming solid-cell boundary extraction: internal faces are omitted.
 * Authored cast outline and service void share vertices, including bevel loops.
 * This is the actual load volume, not a shell placed over the old receiver. */
function occupiedServiceChassis(){
 const xs=[-.60,-.25,-.14,.24,.56,.69],ys=[.37,.88,1.08,1.22],zs=[-.55,.10,.26,.45];
 const solid=(i:number,j:number,k:number)=>i>=0&&i<xs.length-1&&j>=0&&j<ys.length-1&&k>=0&&k<zs.length-1&&!(i===0&&k<2)&&!(i===2&&j===0&&k>=1);
 const point=(i:number,j:number,k:number)=>{let x=xs[i],y=ys[j],z=zs[k];const b=Math.max(0,(y-1.08)/.14);if(i===0)x+=.08*b;if(i===xs.length-1)x-=.05*b;if(k===0)z+=.04*b;if(k===zs.length-1)z-=.03*b;return V(x,y,z);};
 const positions:number[]=[],indices:number[]=[];
 const face=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,d:THREE.Vector3,normal:THREE.Vector3)=>{const q=[a,b,c,d];if(b.clone().sub(a).cross(c.clone().sub(a)).dot(normal)<0)q.reverse();const n=positions.length/3;for(const p of q)positions.push(...p.toArray());indices.push(n,n+1,n+2,n,n+2,n+3);};
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++)for(let k=0;k<zs.length-1;k++)if(solid(i,j,k)){
  if(!solid(i-1,j,k))face(point(i,j,k),point(i,j+1,k),point(i,j+1,k+1),point(i,j,k+1),V(-1,0,0));
  if(!solid(i+1,j,k))face(point(i+1,j,k),point(i+1,j+1,k),point(i+1,j+1,k+1),point(i+1,j,k+1),V(1,0,0));
  if(!solid(i,j-1,k))face(point(i,j,k),point(i+1,j,k),point(i+1,j,k+1),point(i,j,k+1),V(0,-1,0));
  if(!solid(i,j+1,k))face(point(i,j+1,k),point(i+1,j+1,k),point(i+1,j+1,k+1),point(i,j+1,k+1),V(0,1,0));
  if(!solid(i,j,k-1))face(point(i,j,k),point(i+1,j,k),point(i+1,j+1,k),point(i,j+1,k),V(0,0,-1));
  if(!solid(i,j,k+1))face(point(i,j,k+1),point(i+1,j,k+1),point(i+1,j+1,k+1),point(i,j+1,k+1),V(0,0,1));
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(positions.length/3*2).fill(0),2));return g;
}
function loadShapedUpperPlatform() {
  const geometry=chassisExtrusion([[.295,.75],[.72,.75],[1.16,.40],[1.20,-.10],[.95,-.55],[.70,-.75],[-.55,-.80],[-1.13,-.45],[-1.21,.15],[-.85,.59],[-.195,.60],[-.195,.40],[.295,.40]],.17);
  geometry.rotateX(Math.PI/2);return geometry;
}
function annulus(outer: number, inner: number, height: number, segments: number) {
  return new THREE.LatheGeometry([[inner, -height / 2], [outer, -height / 2], [outer, height / 2], [inner, height / 2], [inner, -height / 2]].map(([r, y]) => new THREE.Vector2(r, y)), segments);
}
/** Batch direct meshes only, within one owner, phase and material. Child pivots/sockets remain untouched. */
function batchOwner(group: THREE.Group) {
  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of group.children) if (child instanceof THREE.Mesh) {
    const material = child.material as THREE.Material;
    const key = `${material.uuid}:${child.userData.constructionStage}`;
    const items = batches.get(key) ?? []; items.push(child); batches.set(key, items);
  }
  for (const items of batches.values()) {
    if (items.length < 2) continue;
    const geometries = items.map(node => { node.updateMatrix(); return node.geometry.clone().applyMatrix4(node.matrix); });
    const geometry = mergeGeometries(geometries, false); geometries.forEach(g => g.dispose());
    if (!geometry) throw new Error('Great Fuse compatible structural batch failed');
    const combined = new THREE.Mesh(geometry, items[0].material);
    combined.name = `${group.name}_PHASE_${items[0].userData.constructionStage}_BATCH`;
    combined.userData = { ...items[0].userData, sourceMeshes: items.map(node => node.name) };
    combined.castShadow = true; combined.receiveShadow = true;
    for (const node of items) { group.remove(node); node.geometry.dispose(); }
    group.add(combined);
  }
}
export function buildIsland9GreatFuseStructure(
  definition: Island5LandmarkDefinition, level: 0 | 1 | 2 | 3, quality: Island3DQuality,
  _materials: Island9HeartshaftMaterials, _options: IslandConstructionFactoryOptions = {},
) {
  const root = owner('great-fuse-structural-assembly', 0);
  root.name = 'ISLAND_9_HEARTSHAFT_HABIT_ROOT'; root.position.set(...definition.position);
  root.userData.family = GREAT_FUSE_SOURCE_PROFILE.family; root.userData.authoringProfile = GREAT_FUSE_SOURCE_PROFILE;
  root.userData.profileYaw = 0; root.userData.footprintRadius = 1.53; root.userData.approval = 'unreviewed';
  root.userData.constructionPreviewImplemented = false;
  socket(root, 'ISLAND_9_HABIT_FOCUS_SOCKET', V(0, 1.5, 0));
  const neutral = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: 0 });
  const foundation = neutral(0x747b7e), cast = neutral(0xa0a5a7), recess = neutral(0x59636a);
  const n = quality === 'high' ? 40 : quality === 'medium' ? 32 : 24;
  const base = owner('fuse-grounded-base', 0); root.add(base);
  mesh(base, 'FUSE_BASE_LOWER_STEP', accessPlinth(1.33, .20), foundation, V(0, .20, 0), 1);
  mesh(base, 'FUSE_BASE_UPPER_STEP', loadShapedUpperPlatform(), foundation, V(0, .37, 0), 1);
  for (let i = 0; i < 5; i++) {
    const height = (i + 1) * .074;
    mesh(base, 'FUSE_ACCESS_STEP_' + i, new THREE.BoxGeometry(.49, height, .18), foundation,
      V(.05, height / 2, 1.34 - i * .18), 1);
  }
  mesh(base, 'FUSE_ENTRY_LANDING', new THREE.BoxGeometry(.49, .37, .13), foundation, V(.05, .185, .465), 1);
  batchOwner(base);
  if (!level) return root;

  const spine = owner('fuse-spine', 1); root.add(spine);
  // A single closed, shared-boundary service casting occupies the full raised
  // first-cell seat. Its L-shaped forward cheek leaves the complete rotating
  // wheel slab and rear-left feed clear. The entrance is a real bounded recess.
  mesh(spine,'FUSE_OCCUPIED_SERVICE_RECEIVER',occupiedServiceChassis(),cast,V(0,0,0),1);
  socket(spine, 'fuse-spine/bearing-seat', V(.05, 1.22, -.17));
  socket(spine, 'fuse-spine/service-entry', V(.05,.37,.45));
  socket(spine, 'fuse-spine/left-feed-contact', V(-.30,.70,-.17));
  const array = owner('fuse-charge-array', 1); root.add(array);
  const count = level === 1 ? 3 : level === 2 ? 6 : 8;
  const axial=.3105/.378; // Reauthor each explicit section; no whole-unit scale.
  for (let i = 0; i < count; i++) {
    const buildLevel = i < 3 ? 1 : i < 6 ? 2 : 3;
    const cell = owner(`fuse-charge-cell-${String(i + 1).padStart(2, '0')}`, buildLevel);
    cell.userData.cellIndex = i; cell.position.set(.05, 1.22 + i * .3105, -.17); array.add(cell);
    // Eight straight-sided pressure housings, each with a narrow structural seam.
    mesh(cell, 'FUSE_CELL_' + i + '_PRESSURE_SHELL', rigidAnnulus(.360, .282, .288*axial, n), cast, V(0, .189*axial, 0), 2);
    mesh(cell, 'FUSE_CELL_' + i + '_LOWER_FLANGE', rigidAnnulus(.395, .268, .040*axial, n), cast, V(0, .028*axial, 0), 3);
    mesh(cell, 'FUSE_CELL_' + i + '_UPPER_FLANGE', rigidAnnulus(.386, .268, .032*axial, n), cast, V(0, .354*axial, 0), 3);
    mesh(cell, 'FUSE_CELL_' + i + '_CONTAINED_SPINE', new THREE.CylinderGeometry(.275, .275, .3105, n), recess, V(0, .189*axial, 0), 2);
    socket(cell, cell.name + '/inlet', V(0, 0, 0)); socket(cell, cell.name + '/outlet', V(0, .3105, 0));
    batchOwner(cell);
  }
  batchOwner(spine);
  if (level >= 2) {
    const drive = owner('eccentric-drive', 2); root.add(drive);
    const wheel = owner('fuse-eccentric-flywheel-pivot', 2);
    wheel.position.set(-.72, 1.70, .18); wheel.rotation.y = .90; drive.add(wheel);
    const hub = V(-.045, -.035, 0);
    const rim = mesh(wheel, 'FUSE_FLYWHEEL_HEAVY_RIM', annulus(.70, .585, .12, n), cast, V(0, 0, 0), 3); rim.rotation.x = Math.PI / 2;
    const inner = mesh(wheel, 'FUSE_FLYWHEEL_INNER_RAIL', annulus(.562, .535, .07, n), recess, V(0, 0, .015), 3); inner.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      rod(wheel, 'FUSE_FLYWHEEL_SPOKE_' + i, hub, V(Math.cos(a) * .625, Math.sin(a) * .625, 0), .043, cast, 4);
    }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      const tooth = mesh(wheel, 'FUSE_FLYWHEEL_RIM_TOOTH_' + i, new THREE.BoxGeometry(.047, .055, .135), cast, V(Math.cos(a) * .70, Math.sin(a) * .70, 0), 3); tooth.rotation.z = a - Math.PI / 2;
    }
    rod(wheel, 'FUSE_ECCENTRIC_AXLE', hub.clone().add(V(0, 0, -.34)), hub.clone().add(V(0, 0, .13)), .115, recess, 4, 12);
    const hubCollar = mesh(wheel, 'FUSE_ECCENTRIC_BEARING_COLLAR', annulus(.155, .116, .105, n), cast, hub.clone().add(V(0, 0, .035)), 4); hubCollar.rotation.x = Math.PI / 2;
    const bearingCentre = hub.clone().add(V(0, 0, -.23)).applyAxisAngle(V(0, 1, 0), .90).add(wheel.position);
    const axleEnd = hub.clone().add(V(0, 0, -.34)).applyAxisAngle(V(0, 1, 0), .90).add(wheel.position);
    // A single load-bearing tapered cheek lies behind the frozen wheel sweep.
    const pedestal=mesh(drive,'FUSE_OCCUPIED_BEARING_PEDESTAL',chassisExtrusion([[-.24,.37],[.58,.37],[.58,.60],[.21,.72],[.145,1.52],[.145,1.815],[-.145,1.815],[-.145,1.52],[-.21,.72]],.22),cast,V(bearingCentre.x,0,bearingCentre.z),2);
    pedestal.geometry.translate(0,0,-.11);pedestal.rotation.y=.90;
    rod(drive, 'FUSE_DRIVE_TRANSMISSION', axleEnd, V(.05, 1.665, -.17), .105, recess, 4, 12);
    socket(wheel, 'eccentric-drive/axle', hub.clone().add(V(0, 0, -.23)));
    socket(drive, 'eccentric-drive/bearing', bearingCentre);
    socket(drive, 'eccentric-drive/ground-seat', V(bearingCentre.x, .36, bearingCentre.z));
    mesh(drive,'FUSE_BEARING_TO_BODY_LOAD_WEB',chassisExtrusion([[-.64,.37],[-.25,.37],[-.25,.60],[-.42,.66],[-.64,.58]],.17),cast,V(0,0,-.49),1);
    batchOwner(wheel); batchOwner(drive);

    const housing = owner('fuse-lower-drive-housing', 2); root.add(housing);
    // Broad connected side casting retains the source arch, backed by real occupied depth.
    mesh(housing,'FUSE_DRIVE_FOOT',new THREE.BoxGeometry(.76,.30,.72),cast,V(.86,.52,.08),1);
    const arch = new THREE.Shape();arch.moveTo(-.38,-.48);arch.lineTo(.38,-.48);arch.lineTo(.38,.36);arch.quadraticCurveTo(.38,.65,0,.65);arch.quadraticCurveTo(-.38,.65,-.38,.36);arch.closePath();
    const opening=new THREE.Path();opening.moveTo(-.14,-.16);opening.lineTo(-.14,.32);opening.quadraticCurveTo(0,.56,.14,.32);opening.lineTo(.14,-.16);opening.closePath();arch.holes.push(opening);
    const geometry=new THREE.ExtrudeGeometry(arch,{depth:.54,bevelEnabled:false,curveSegments:quality==='high'?10:6});geometry.setIndex(Array.from({length:geometry.getAttribute('position').count},(_,i)=>i));
    mesh(housing,'FUSE_ARCHED_DRIVE_CASTING',geometry,cast,V(.86,1.13,-.18),2);
    mesh(housing,'FUSE_DRIVE_RECESSED_INTERIOR',new THREE.BoxGeometry(.28,.63,.24),recess,V(.86,1.30,-.12),2);
    const pressureShoulder=hardMeridian([[0,1.56],[.24,1.56],[.29,1.66],[.29,1.77],[.25,1.83],[.25,2.00],[.18,2.14],[0,2.14]],n);
    // Lathe pole triangles are zero-area caps; retain only real triangles in this new owned solid.
    const pp=pressureShoulder.getAttribute('position'),pi=pressureShoulder.index!,real:number[]=[];for(let j=0;j<pi.count;j+=3){const ids=[pi.getX(j),pi.getX(j+1),pi.getX(j+2)],v=ids.map(k=>new THREE.Vector3().fromBufferAttribute(pp,k));if(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).lengthSq()>1e-18)real.push(...ids);}pressureShoulder.setIndex(real);
    mesh(housing,'FUSE_OCCUPIED_INLET_SHOULDER',pressureShoulder,cast,V(.86,0,.10),2);
    const shaft = mesh(housing, 'FUSE_LOWER_DRIVE_BEARING', new THREE.CylinderGeometry(.17, .17, .14, n), recess, V(.86, .82, .35), 4); shaft.rotation.x = Math.PI / 2;
    rod(housing, 'FUSE_DRIVE_TOP_INLET', V(.86, 1.52, .10), V(.86, 2.20, .10), .105, cast, 4, 12);
    socket(housing, 'fuse-drive/return-inlet', V(.86, 2.20, .10));
    batchOwner(housing);
  }
  if (level === 3) {
    const crown = owner('fuse-open-upper-collar', 3); root.add(crown);
    mesh(crown, 'FUSE_HEAD_BEARING', rigidAnnulus(.418, .263, .12, n), cast, V(.05, 3.76, -.17), 3);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2;
      rod(crown, 'FUSE_OPEN_NECK_RIB_' + i, V(.05 + Math.cos(a) * .298, 3.78, -.17 + Math.sin(a) * .298), V(.05 + Math.cos(a) * .326, 4.39, -.17 + Math.sin(a) * .326), .024, cast, 3); }
    mesh(crown, 'FUSE_NECK_CONTAINED_PRESSURE_CORE', new THREE.CylinderGeometry(.13, .13, .62, 12), recess, V(.05, 4.10, -.17), 4);
    mesh(crown, 'FUSE_UPPER_OPEN_COLLAR', rigidAnnulus(.463, .272, .19, n), cast, V(.05, 4.43, -.17), 3);
    mesh(crown, 'FUSE_STEPPED_CROWN_RIM', rigidAnnulus(.429, .264, .08, n), recess, V(.05, 4.535, -.17), 3);
    mesh(crown, 'FUSE_FLARED_OPEN_CROWN', rigidAnnulus(.407, .281, .10, n), cast, V(.05, 4.585, -.17), 3);
    rod(crown, 'FUSE_HIGH_RETURN_PORT_BOSS', V(.16, 4.09, -.17), V(.44, 4.09, -.17), .115, cast, 4, 12);
    socket(crown, 'fuse-spine/high-return-outlet', V(.39, 4.09, -.17));
    batchOwner(crown);
    const pipes = owner('fuse-asymmetric-return-pipes', 3); root.add(pipes);
    const rightPoints = [V(.39, 4.09, -.17), V(.67, 4.09, -.17), V(1.16, 3.92, -.17), V(1.25, 3.70, -.17), V(1.24, 2.63, -.17), V(1.15, 2.39, -.12), V(.86, 2.20, .10)];
    const rightCurve = new THREE.CatmullRomCurve3(rightPoints, false, 'centripetal');
    mesh(pipes, 'FUSE_HIGH_ASYMMETRIC_RETURN', new THREE.TubeGeometry(rightCurve, quality === 'high' ? 56 : 36, .103, 10, false), cast, V(0, 0, 0), 4);
    const leftCurve = new THREE.CatmullRomCurve3([V(-.24, 4.32, -.17), V(-.46, 4.13, -.19), V(-.53, 3.90, -.22), V(-.52, 1.14, -.23), V(-.30, .70, -.17)], false, 'centripetal');
    mesh(pipes, 'FUSE_NARROW_LEFT_FEED', new THREE.TubeGeometry(leftCurve, quality === 'high' ? 48 : 32, .072, 8, false), recess, V(0, 0, 0), 4);
    socket(pipes, 'fuse-return/outlet-contact', rightPoints[0]); socket(pipes, 'fuse-return/inlet-contact', rightPoints[rightPoints.length - 1]);
    root.userData.interfaceContacts = [
      ['fuse-spine/high-return-outlet', 'fuse-return/outlet-contact'],
      ['fuse-drive/return-inlet', 'fuse-return/inlet-contact'],
      ['eccentric-drive/axle', 'eccentric-drive/bearing'],
    ];
    batchOwner(pipes);
  }
  root.userData.cellCount = count;
  root.userData.axialRevision={firstSeatY:1.22,pitch:.3105,topY:3.704,count:8,sourceInference:'Approximate projected chassis/stack mass ratio; hidden L-shaped casting and bearing recess inferred.'};
  root.userData.inferences = GREAT_FUSE_SOURCE_PROFILE.inference;
  return root;
}
