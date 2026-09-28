import { createSeaDragonWaterBurst } from './Island22DragonWaterVFX';
import { assignIsland22DragonRingUV, applyIsland22DragonFinish } from './Island22DragonFinishV2';
import { resolveSeaDragonCinematicCamera, fitSeaDragonCameraToBounds } from './Island22DragonCinematicCamera';
import { addSeaDragonArticulatedWing, seaDragonHeadSections, seaDragonFinVolume } from './Island22DragonAnatomyV2';
import * as THREE from 'three';
import { addSeaDragonScaleSurface } from './Island22DragonV2';
import { createIsland22IconicWaterDragonParts } from './Island22IconicWaterDragonParts';

export const ISLAND_22_FISH_TARGET_KG = 100;
export const ISLAND_22_FISH_TARGET_LB = 220.5;
export const ISLAND_22_DRAGON_TRIGGER_KG = 78;
export const ISLAND_22_DRAGON_TRIGGER_LB = 172;
export const ISLAND_22_DRAGON_CINEMATIC_SECONDS = 23.5;
export const ISLAND_22_POND_APERTURE_RADIUS = 3.34;
export const ISLAND_22_DRAGON_ERUPTION_BODY_RADIUS = 3;
export const ISLAND_22_DRAGON_APERTURE_FILL_RATIO = ISLAND_22_DRAGON_ERUPTION_BODY_RADIUS / ISLAND_22_POND_APERTURE_RADIUS;
export const ISLAND_22_DRAGON_FOLDED_BODY_LENGTH = 24;
export const ISLAND_22_DRAGON_FULL_LAUNCH_ROOT_Y = 33.4;
export const ISLAND_22_DRAGON_FULL_LAUNCH_TAIL_Y = ISLAND_22_DRAGON_FULL_LAUNCH_ROOT_Y - ISLAND_22_DRAGON_FOLDED_BODY_LENGTH;
export const ISLAND_22_DRAGON_ERUPTION_CENTER_OFFSET_XZ = 0;
const ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS = 21.45;
const ISLAND_22_DRAGON_DIVE_SUBMERGED_SECONDS = 22.68;
const ISLAND_22_DRAGON_RENDER_CUTOFF_SECONDS = 22.6;

export type Island22WaterDragonPhase =
  | 'fishing'
  | 'vortex'
  | 'evacuation'
  | 'ground-shake'
  | 'eruption'
  | 'unfurl'
  | 'flight'
  | 'dive'
  | 'repair-mission';

export interface Island22WaterDragonPresentation {
  fishCaughtKg: number;
  previewElapsedSeconds?: number;
  reducedMotion?: boolean;
  impactRepairProgress?: number;
}

export interface Island22WaterDragonCameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  shake: number;
  fov: number;
}

export interface Island22WaterDragonMissionRuntime {
  root: THREE.Group;
  update: (elapsed: number, presentation: Island22WaterDragonPresentation) => void;
  getCameraPose: () => Island22WaterDragonCameraPose;
  getPhase: () => Island22WaterDragonPhase;
}

interface MissionOptions {
  parent: THREE.Group;
  pond: THREE.Mesh;
  depth: THREE.Mesh;
  pondShadow: THREE.Mesh;
  ocean?: THREE.Mesh;
  quality?: 'low' | 'medium' | 'high';
  boats: THREE.Group[];
  pondSkiffs: THREE.Group[];
  updateFishers: (progress: number, panic: number) => void;
  impactHouse?: { anchor: THREE.Object3D; applyDamage: (amount: number, age: number, reducedMotion: boolean) => void };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const dragonRadiusAt = (pointIndex: number, pointCount: number) => {
  const t = pointIndex / Math.max(1, pointCount - 1);
  return t<.20 ? THREE.MathUtils.lerp(1.43,3.0,Math.sin(smooth(t/.20)*Math.PI/2)) : THREE.MathUtils.lerp(3.0,.17,Math.pow((t-.20)/.80,.92));
};

export function resolveIsland22WaterDragonPhase(seconds: number): Island22WaterDragonPhase {
  if (seconds < 0) return 'fishing';
  if (seconds < 2.6) return 'vortex';
  if (seconds < 5.2) return 'evacuation';
  if (seconds < 7.2) return 'ground-shake';
  if (seconds < 10.2) return 'eruption';
  if (seconds < 13.4) return 'unfurl';
  if (seconds < 19.2) return 'flight';
  if (seconds < ISLAND_22_DRAGON_DIVE_SUBMERGED_SECONDS) return 'dive';
  return 'repair-mission';
}

function beam(material: THREE.Material, radius: number) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 10), material);
  mesh.castShadow = true;
  return mesh;
}

function placeBeam(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3, radiusScale = 1) {
  const delta = new THREE.Vector3().subVectors(end, start);
  mesh.position.copy(start).addScaledVector(delta, 0.5);
  mesh.scale.set(radiusScale, delta.length(), radiusScale);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
}

function wingGeometry(side: -1 | 1) {
  const geometry = new THREE.BufferGeometry();
  const outline = [
    [0, 0, 0],
    [1.85, 0.12, side * 4.65],
    [1.02, 0.02, side * 4.18],
    [-0.9, -0.02, side * 3.82],
    [-0.38, 0, side * 3.18],
    [-1.68, -0.05, side * 2.92],
    [-0.92, -0.02, side * 2.2],
    [-1.78, -0.08, side * 1.58],
    [-0.72, 0, side * 0.32],
  ];
  // A continuous, cambered fin membrane replaces the flat triangle fan.
  const curve = new THREE.CatmullRomCurve3(outline.map(p => new THREE.Vector3(...p as [number, number, number])), true, 'centripetal');
  const boundary = curve.getPoints(64);
  const positions: number[] = [], indices: number[] = [];
  const rows=8, columns=boundary.length;
  for(let row=0;row<=rows;row++) {
    const r=row/rows;
    for(const p of boundary) positions.push(p.x*r,p.y*r+Math.sin(r*Math.PI)*.32,p.z*r);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<columns-1;col++) {
    const a=row*columns+col,b=a+columns;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function wrappedWingSheetGeometry() {
  const geometry = new THREE.BufferGeometry();
  // Eight vertices give the folded membrane a shouldered, scalloped silhouette
  // instead of reading like a rectangular armour strip in the dive camera.
  const position = new THREE.BufferAttribute(new Float32Array(24), 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setIndex([
    0, 1, 2,
    0, 2, 7,
    7, 2, 3,
    7, 3, 4,
    7, 4, 6,
    6, 4, 5,
  ]);
  return { geometry, position };
}

function tailFinGeometry(){
 const left=seaDragonFinVolume(-1,'tail'),right=seaDragonFinVolume(1,'tail');
 const p=[...left.attributes.position.array,...right.attributes.position.array],idx=[...left.index!.array,...Array.from(right.index!.array).map(i=>i+left.attributes.position.count)];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();left.dispose();right.dispose();return g;
}
function dorsalFinGeometry(){return seaDragonFinVolume(1,'crest');}

interface DynamicDragonBody {
  mesh: THREE.Mesh;
  update: (points: THREE.Vector3[], facing: THREE.Vector3, head: THREE.Group) => void;
}

function createDynamicDragonBody(
  material: THREE.Material,
  sourceRingCount: number,
  radialSegments: number,
  leadingRadius: number,
): DynamicDragonBody {
  const neckRings=12, headRings=seaDragonHeadSections.length, ringCount=headRings+neckRings+sourceRingCount;
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array(ringCount*radialSegments*3),colors=new Float32Array(positions.length),indices:number[]=[];
  for(let r=0;r<ringCount-1;r++)for(let j=0;j<radialSegments;j++){const a=r*radialSegments+j,b=a+radialSegments,d=r*radialSegments+(j+1)%radialSegments,c=d+radialSegments;indices.push(a,b,d,b,c,d);}
  for(let j=1;j<radialSegments-1;j++){indices.push(0,j,j+1);const a=(ringCount-1)*radialSegments;indices.push(a,a+j+1,a+j);}
  geometry.setIndex(indices);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  assignIsland22DragonRingUV(geometry,radialSegments,headRings,neckRings);
  const mesh=new THREE.Mesh(geometry,material);mesh.name='ISLAND_22_DRAGON_CONTINUOUS_BODY';mesh.castShadow=true;
  const samples=Array.from({length:ringCount},()=>new THREE.Vector3()),radii=Array.from({length:ringCount},()=>new THREE.Vector2());
  const update=(points:THREE.Vector3[],facing:THREE.Vector3,head:THREE.Group)=>{
   const right=new THREE.Vector3(1,0,0).applyQuaternion(head.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(head.quaternion);
   const headBase=new THREE.Vector3(0,0,-1.15*head.scale.z).applyQuaternion(head.quaternion).add(head.position);
   for(let i=0;i<headRings;i++){const [z,rx,ry,cy]=seaDragonHeadSections[headRings-1-i];samples[i].set(0,cy*head.scale.y,z*head.scale.z).applyQuaternion(head.quaternion).add(head.position);radii[i].set(rx*head.scale.x,ry*head.scale.y);}
   const endDirection=points[1].clone().sub(points[0]).normalize(),distance=headBase.distanceTo(points[0]);
   const curve=new THREE.CubicBezierCurve3(headBase,headBase.clone().addScaledVector(facing,-distance*.38),points[0].clone().addScaledVector(endDirection,-distance*.38),points[0]);
   for(let i=0;i<neckRings;i++){const t=(i+1)/(neckRings+1),r=headRings+i;curve.getPoint(t,samples[r]);const blend=t*t*(3-2*t);radii[r].set(THREE.MathUtils.lerp(.43*head.scale.x,1.43,blend),THREE.MathUtils.lerp(.44*head.scale.y,1.43,blend));}
   for(let i=0;i<sourceRingCount;i++){samples[headRings+neckRings+i].copy(points[i]);radii[headRings+neckRings+i].setScalar(dragonRadiusAt(i,sourceRingCount));}
   const axisA=right.clone(),axisB=up.clone(),tangent=new THREE.Vector3(),teal=new THREE.Color(0x328c95),cream=new THREE.Color(0xe3d8b9);
   for(let r=0;r<ringCount;r++){
    if(r>=headRings){tangent.subVectors(samples[Math.min(r+1,ringCount-1)],samples[r-1]).normalize();axisA.addScaledVector(tangent,-axisA.dot(tangent)).normalize();axisB.crossVectors(axisA,tangent).normalize();}
    for(let j=0;j<radialSegments;j++){const a=j/radialSegments*Math.PI*2,k=(r*radialSegments+j)*3,v=samples[r].clone().addScaledVector(axisA,Math.cos(a)*radii[r].x).addScaledVector(axisB,Math.sin(a)*radii[r].y);v.toArray(positions,k);const color=teal.clone().lerp(cream,THREE.MathUtils.smoothstep(-Math.sin(a),.18,.65));color.toArray(colors,k);}
   }
   geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  };
  return { mesh, update };
}

export function createIsland22WaterDragonMission(options: MissionOptions): Island22WaterDragonMissionRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_WATER_DRAGON_MISSION_ROOT';
  root.visible = false;
  options.parent.add(root);

  const teal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.48, clearcoat: 0.18, clearcoatRoughness: 0.42 });
  applyIsland22DragonFinish(teal,'skin');
  const tealSolid = new THREE.MeshPhysicalMaterial({ color: 0x328c95, roughness: 0.48, clearcoat: 0.18, clearcoatRoughness: 0.42 });
  // Macro anatomy gate: scale textures withheld.

  const tealDark = new THREE.MeshStandardMaterial({ color: 0x075f76, roughness: 0.34 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xe3d8b9, roughness: 0.6 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xfff0bf, roughness: 0.48 });
  const amber = new THREE.MeshPhysicalMaterial({ color: 0xf6a51d, emissive: 0x7a2600, emissiveIntensity: 0.9, roughness: 0.08, clearcoat: 1 });
  const membrane = new THREE.MeshPhysicalMaterial({ color: 0x87c4bf, roughness: 0.62, transparent: false, side: THREE.DoubleSide, depthWrite: true, clearcoat: 0.2, clearcoatRoughness: 0.38, emissive: 0x075d6c, emissiveIntensity: 0.12 });
  applyIsland22DragonFinish(membrane,'wing');
  const wrappedMembrane = membrane.clone();
  wrappedMembrane.color.setHex(0x0b7083);
  wrappedMembrane.emissive.setHex(0x063d49);
  wrappedMembrane.emissiveIntensity = 0.34;
  wrappedMembrane.transparent = true;
  wrappedMembrane.opacity = 0.8;
  wrappedMembrane.depthTest = true;
  wrappedMembrane.depthWrite = false;
  const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x4a1723, roughness: 0.6 });
  [teal, tealSolid, tealDark, belly, ivory, amber, membrane, wrappedMembrane, mouthMaterial].forEach((material) => {
    material.fog = false;
  });
  const scaleAccent = new THREE.MeshPhysicalMaterial({ color: 0x4dc8c5, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.16 });
  const glowAccent = new THREE.MeshPhysicalMaterial({ color: 0xc7fff0, emissive: 0x30cbd1, emissiveIntensity: 1.4, roughness: 0.16, clearcoat: 0.8 });

  const points = Array.from({ length: 31 }, () => new THREE.Vector3());
  const body = createDynamicDragonBody(teal, points.length, 24, ISLAND_22_DRAGON_ERUPTION_BODY_RADIUS);
  root.add(body.mesh);

  const ventralPlates = Array.from({ length: 0 }, (_, index) => {
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), belly);
    plate.name = `ISLAND_22_DRAGON_VENTRAL_PLATE_${index + 1}`;
    root.add(plate);
    return plate;
  });
  const lateralScales = ([-1, 1] as const).flatMap((side) => Array.from({ length: 0 }, (_, index) => {
    const scale = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), index % 3 === 0 ? glowAccent : scaleAccent);
    scale.name = `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_LATERAL_SCALE_${index + 1}`;
    root.add(scale);
    return { mesh: scale, side, index };
  }));
  const bodyArmorBands = Array.from({ length: 0 }, (_, index) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.055, 6, 24), index % 3 === 0 ? glowAccent : tealDark);
    band.name = `ISLAND_22_DRAGON_BODY_ARMOR_BAND_${index + 1}`;
    root.add(band);
    return band;
  });

  const head = new THREE.Group();
  head.name = 'ISLAND_22_DRAGON_HEAD_RIG';
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), tealSolid);
  skull.scale.set(0.8, 0.62, 1.05);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10), tealSolid);
  muzzle.scale.set(0.88, 0.54, 1.18);
  muzzle.position.set(0, -0.07, 0.56);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 10), belly);
  jaw.scale.set(0.8, 0.22, 1.16);
  jaw.position.set(0, -0.27, 0.4);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8), mouthMaterial);
  mouth.scale.set(0.82, 0.08, 1.14);
  mouth.position.set(0, -0.2, 0.55);
  [-1, 1].forEach((side) => {
    const brow = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 5), tealDark);
    brow.position.set(side * 0.24, 0.35, 0.05);
    brow.rotation.z = side * 0.44;
    brow.rotation.x = -0.45;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), amber);
    eye.position.set(side * 0.32, 0.12, 0.38);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), tealDark);
    pupil.position.set(side * 0.35, 0.12, 0.47);
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), tealDark);
    nostril.position.set(side * 0.13, 0.02, 0.84);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), scaleAccent);
    cheek.scale.set(0.6, 0.9, 1.4);
    cheek.position.set(side * 0.39, -0.05, 0.25);
    const gill = new THREE.Mesh(dorsalFinGeometry(), membrane);
    gill.scale.set(0.42, 0.34, 0.42);
    gill.position.set(side * 0.43, -0.02, -0.08);
    gill.rotation.y = side * Math.PI / 2;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.62, 7), ivory);
    horn.position.set(side * 0.31, 0.44, -0.08);
    horn.rotation.z = side * -0.48;
    horn.rotation.x = -0.42;
    head.add(brow, eye, pupil, nostril, cheek, gill, horn);
  });
  ([-1, 1] as const).forEach((side) => {
    for (let branch = 0; branch < 3; branch += 1) {
      const antler = beam(ivory, 0.018 + branch * 0.003);
      placeBeam(
        antler,
        new THREE.Vector3(side * 0.22, 0.44 + branch * 0.04, -0.12 - branch * 0.08),
        new THREE.Vector3(side * (0.48 + branch * 0.1), 0.72 + branch * 0.13, -0.32 - branch * 0.13),
      );
      head.add(antler);
    }
    for (let whiskerIndex = 0; whiskerIndex < 2; whiskerIndex += 1) {
      const whisker = beam(ivory, 0.009);
      placeBeam(
        whisker,
        new THREE.Vector3(side * 0.18, -0.1 - whiskerIndex * 0.05, 0.72),
        new THREE.Vector3(side * (0.86 + whiskerIndex * 0.16), -0.22 - whiskerIndex * 0.1, 1.18 - whiskerIndex * 0.08),
      );
      head.add(whisker);
    }
  });
  for (let index = 0; index < 6; index += 1) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.11 + index * 0.012, 0.45, 6), tealDark);
    fin.position.set(0, 0.25 - index * 0.04, -0.28 - index * 0.17);
    fin.rotation.x = -0.52;
    head.add(fin);
  }
  for (let tooth = -2; tooth <= 2; tooth += 1) {
    if (tooth === 0) continue;
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.14, 6), ivory);
    fang.position.set(tooth * 0.075, -0.26, 0.67 - Math.abs(tooth) * 0.035);
    fang.rotation.z = Math.PI;
    head.add(fang);
  }
  for (let tooth = -4; tooth <= 4; tooth += 1) {
    if (tooth === 0) continue;
    const lowerFang = new THREE.Mesh(new THREE.ConeGeometry(0.018 + (Math.abs(tooth) % 2) * 0.005, 0.12, 6), ivory);
    lowerFang.position.set(tooth * 0.052, -0.15, 0.77 - Math.abs(tooth) * 0.018);
    head.add(lowerFang);
  }
  const crownCrest = new THREE.Mesh(dorsalFinGeometry(), glowAccent);
  crownCrest.name = 'ISLAND_22_DRAGON_HEAD_CROWN_CREST';
  crownCrest.scale.set(0.78, 0.9, 0.78);
  crownCrest.position.set(0, 0.48, -0.32);
  crownCrest.rotation.y = Math.PI / 2;
  head.add(crownCrest);
  head.add(skull, muzzle, mouth, jaw);
  root.add(head);
  head.visible = false;
  head.name = 'ISLAND_22_LEGACY_DRAGON_HEAD_RIG';
  const iconicDragon = createIsland22IconicWaterDragonParts({ quality: 'medium' });
  iconicDragon.root.name = 'ISLAND_22_DRAGON_HEAD_RIG';
  root.add(iconicDragon.root);
  iconicDragon.root.getObjectByName('ISLAND_22_DRAGON_ICONIC_SKULL')!.visible=false;
  const separateNeck = iconicDragon.root.getObjectByName('ISLAND_22_DRAGON_CONTINUOUS_NECK_COLLAR');
  if (separateNeck) separateNeck.visible = false;

  const wingGroups: THREE.Group[] = [];
  ([-1, 1] as const).forEach((side) => {
    const wing = new THREE.Group();
    wing.name = side < 0 ? 'ISLAND_22_DRAGON_WING_LEFT' : 'ISLAND_22_DRAGON_WING_RIGHT';
    addSeaDragonArticulatedWing(wing,side,tealSolid,membrane,ivory);
    root.add(wing);
    wingGroups.push(wing);
  });
  const wrappedWingSheets = ([-1, 1] as const).map((side) => {
    const sheetGeometry = wrappedWingSheetGeometry();
    const sheet = new THREE.Mesh(sheetGeometry.geometry, wrappedMembrane);
    sheet.name = side < 0 ? 'ISLAND_22_DRAGON_WRAPPED_WING_LEFT' : 'ISLAND_22_DRAGON_WRAPPED_WING_RIGHT';
    sheet.visible = false;
    sheet.castShadow = true;
    sheet.frustumCulled = false;
    sheet.renderOrder = 30;
    root.add(sheet);
    return { sheet, position: sheetGeometry.position, side };
  });
  const wrappedWingSeams = ([-1, 1] as const).map((side) => {
    const seam = beam(scaleAccent, 0.085);
    seam.name = side < 0
      ? 'ISLAND_22_DRAGON_WRAPPED_WING_LEFT_LEADING_EDGE'
      : 'ISLAND_22_DRAGON_WRAPPED_WING_RIGHT_LEADING_EDGE';
    seam.visible = false;
    root.add(seam);
    return { seam, side };
  });
  const wrappedWingRibs = ([-1, 1] as const).flatMap((side) => [0, 1, 2].map((ribIndex) => {
    const rib = beam(scaleAccent, 0.055);
    rib.name = `ISLAND_22_DRAGON_WRAPPED_WING_${side < 0 ? 'LEFT' : 'RIGHT'}_RIB_${ribIndex + 1}`;
    rib.visible = false;
    rib.renderOrder = 31;
    (rib.material as THREE.Material).depthTest = false;
    (rib.material as THREE.Material).depthWrite = false;
    root.add(rib);
    return { rib, ribIndex, side };
  }));

  const limbs: Array<{ group: THREE.Group; side: -1 | 1; rear: boolean }> = [];
  const dorsalFins = Array.from({ length: 10 }, (_, index) => {
    const fin = new THREE.Mesh(dorsalFinGeometry(), membrane);
    fin.name = `ISLAND_22_DRAGON_DORSAL_FIN_${index + 1}`;
    root.add(fin);
    return fin;
  });
  const tailFin = new THREE.Mesh(tailFinGeometry(), tealSolid);
  tailFin.name = 'ISLAND_22_DRAGON_TAIL_FIN';
  root.add(tailFin);

  const vortex = new THREE.Group();
  vortex.name = 'ISLAND_22_POND_VORTEX_EFFECT';
  for (let index = 0; index < 7; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 + index * 0.38, 0.035, 6, 42), membrane);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.7 - index * 0.018;
    vortex.add(ring);
  }
  options.parent.add(vortex);

  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: 0x021b2b,
    roughness: 0.96,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.EqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.18, 2.72, 7.2, 32, 1, true), shaftMaterial);
  shaft.name = 'ISLAND_22_DRAINED_POND_SHAFT';
  shaft.position.y = -2.92;
  shaft.renderOrder = 2;
  shaft.visible = false;
  const shaftBottom = new THREE.Mesh(new THREE.CircleGeometry(2.7, 32), shaftMaterial.clone());
  (shaftBottom.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  shaftBottom.name = 'ISLAND_22_DRAINED_POND_ABYSS';
  shaftBottom.rotation.x = -Math.PI / 2;
  shaftBottom.position.y = -6.5;
  shaftBottom.renderOrder = 1;
  shaftBottom.visible = false;
  const shaftBands = new THREE.Group();
  shaftBands.name = 'ISLAND_22_DRAINED_POND_SHAFT_DEPTH_BANDS';
  const shaftBandMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x31505a, roughness: 0.9, side: THREE.BackSide, depthTest: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc }),
    new THREE.MeshStandardMaterial({ color: 0x183b48, roughness: 0.94, side: THREE.BackSide, depthTest: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc }),
  ];
  for (let index = 0; index < 4; index += 1) {
    const wallCourse = new THREE.Mesh(
      new THREE.CylinderGeometry(3.14 - index * 0.025, 3.08 - index * 0.025, 1.64, 32, 1, true),
      shaftBandMaterials[index % shaftBandMaterials.length],
    );
    wallCourse.position.y = -0.35 - index * 1.68;
    wallCourse.renderOrder = 2;
    const courseLip = new THREE.Mesh(
      new THREE.TorusGeometry(3.11 - index * 0.03, 0.07, 6, 36),
      shaftBandMaterials[(index + 1) % shaftBandMaterials.length],
    );
    courseLip.rotation.x = Math.PI / 2;
    courseLip.position.y = 0.48 - index * 1.68;
    courseLip.renderOrder = 2;
    shaftBands.add(wallCourse, courseLip);
  }
  shaftBands.visible = false;
  const wellWaterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0799ad,
    emissive: 0x034a62,
    emissiveIntensity: 0.48,
    roughness: 0.14,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.EqualStencilFunc,
  });
  const wellWaterSurface = new THREE.Mesh(new THREE.CircleGeometry(3.28, 48), wellWaterMaterial);
  wellWaterSurface.name = 'ISLAND_22_DESCENDING_WELL_WATER_SURFACE';
  wellWaterSurface.rotation.x = -Math.PI / 2;
  wellWaterSurface.renderOrder = 1;
  wellWaterSurface.visible = false;
  const loweredWaterWall = new THREE.Mesh(
    new THREE.CylinderGeometry(3.31, 3.31, 0.2, 40),
    wellWaterMaterial,
  );
  loweredWaterWall.name = 'ISLAND_22_DRAINING_WATER_CYLINDER_EDGE';
  loweredWaterWall.renderOrder = 2;
  loweredWaterWall.visible = false;
  const wellStencilMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthTest: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilFail: THREE.ReplaceStencilOp,
    stencilZFail: THREE.ReplaceStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  const wellStencilMask = new THREE.Mesh(new THREE.CircleGeometry(ISLAND_22_POND_APERTURE_RADIUS, 48), wellStencilMaterial);
  wellStencilMask.name = 'ISLAND_22_WELL_PORTAL_STENCIL';
  wellStencilMask.rotation.x = -Math.PI / 2;
  wellStencilMask.position.y = 0.605;
  wellStencilMask.renderOrder = 0;
  wellStencilMask.visible = false;
  options.parent.add(wellStencilMask, shaft, shaftBottom, shaftBands, wellWaterSurface, loweredWaterWall);

  const burst = new THREE.Group();
  burst.name = 'ISLAND_22_COLOSSUS_ERUPTION_BURST';
  const sprayMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd9ffff,
    emissive: 0x69dce8,
    emissiveIntensity: 0.78,
    roughness: 0.18,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const shockwave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 7, 48), sprayMaterial);
  shockwave.name = 'ISLAND_22_ERUPTION_SHOCKWAVE';
  shockwave.rotation.x = Math.PI / 2;
  const sprayCount = 24;
  const spray = new THREE.InstancedMesh(new THREE.ConeGeometry(0.13, 2.8, 5), sprayMaterial, sprayCount);
  spray.name = 'ISLAND_22_ERUPTION_SPRAY_COLUMNS';
  const burstMistMaterial = sprayMaterial.clone();
  burstMistMaterial.opacity = 0.23;
  const burstMist = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), burstMistMaterial);
  burstMist.name = 'ISLAND_22_ERUPTION_MIST';
  burst.add(shockwave, spray, burstMist);
  burst.visible = false;
  options.parent.add(burst);

  const diveSplash = new THREE.Group();
  diveSplash.name = 'ISLAND_22_DRAGON_DIVE_SPLASH';
  diveSplash.position.set(-5.8, -.82, 12.8);
  const diveSplashMaterial = sprayMaterial.clone();
  diveSplashMaterial.opacity = 0.92;
  const diveSplashRings = [0, 1, 2].map((index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1 - index * 0.018, 7, 54), diveSplashMaterial);
    ring.name = `ISLAND_22_DIVE_SPLASH_RING_${index + 1}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = index * 0.08;
    diveSplash.add(ring);
    return ring;
  });
  const diveSplashCount = 24;
  const diveSplashSpray = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 4.6, 6), diveSplashMaterial, diveSplashCount);
  diveSplashSpray.name = 'ISLAND_22_DIVE_SPLASH_COLUMNS';
  diveSplash.add(diveSplashSpray);
  diveSplash.visible = false;
  options.parent.add(diveSplash);

  const eruptionWaterV2=createSeaDragonWaterBurst({kind:'eruption',quality:options.quality});
  eruptionWaterV2.root.position.set(0,.64,0);options.parent.add(eruptionWaterV2.root);
  const diveWaterV2=createSeaDragonWaterBurst({kind:'dive',quality:options.quality});
  diveSplash.add(diveWaterV2.root);
  for(const ring of diveSplashRings)ring.visible=false;
  diveSplashSpray.visible=false;

  const impactWaves = new THREE.Group();
  impactWaves.name = 'ISLAND_22_SHORE_IMPACT_WASH_WAVES';
  impactWaves.position.copy(diveSplash.position);
  const impactWaveMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8ef5f1,
    emissive: 0x168fa7,
    emissiveIntensity: 0.62,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    roughness: 0.2,
  });
  const impactWaveRings = Array.from({ length: 5 }, (_, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.16 - index * 0.016, 7, 64), impactWaveMaterial.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12 + index * 0.055;
    impactWaves.add(ring);
    return ring;
  });
  impactWaves.visible = false;
  options.parent.add(impactWaves);

  const impactBuilding = options.impactHouse?.anchor ?? new THREE.Group();
  let impactRoofPanels: THREE.Mesh[] = [];
  if (!options.impactHouse) {
  impactBuilding.name = 'ISLAND_22_IMPACT_NET_HOUSE_PRESENTATION';
  impactBuilding.position.set(-4.35, 0.62, 6.92);
  impactBuilding.rotation.y = 0.38;
  const impactHouseBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 1.35), belly);
  impactHouseBody.position.y = 0.58;
  const impactHouseDoor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.08), tealDark);
  impactHouseDoor.position.set(0, 0.45, 0.715);
  const impactHouseWindow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.08), amber);
  impactHouseWindow.position.set(-0.5, 0.72, 0.715);
  impactRoofPanels = ([-1, 1] as const).map((side) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.14, 1.62), tealDark);
    panel.position.set(side * 0.43, 1.28, 0);
    panel.rotation.z = side * -0.58;
    impactBuilding.add(panel);
    return panel;
  });
  const impactHouseSign = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 0.1), ivory);
  impactHouseSign.position.set(0, 1.05, 0.76);
  impactBuilding.add(impactHouseBody, impactHouseDoor, impactHouseWindow, impactHouseSign);
  options.parent.add(impactBuilding);
  }

  const impactDebris = new THREE.Group();
  impactDebris.name = 'ISLAND_22_IMPACT_BUILDING_DEBRIS';
  impactDebris.position.copy(impactBuilding.position);
  const impactDebrisPieces = Array.from({ length: 12 }, (_, index) => {
    const piece = new THREE.Mesh(
      new THREE.BoxGeometry(0.18 + index % 3 * 0.07, 0.1 + index % 2 * 0.05, 0.42 + index % 4 * 0.08),
      index % 3 === 0 ? ivory : index % 2 === 0 ? tealDark : belly,
    );
    impactDebris.add(piece);
    return piece;
  });
  impactDebris.visible = false;
  options.parent.add(impactDebris);

  const washedFisher = new THREE.Group();
  washedFisher.name = 'ISLAND_22_WASHED_FISHER_PRESENTATION';
  const fisherBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 5, 8), tealDark);
  const fisherHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), ivory);
  fisherHead.position.y = 0.38;
  const fisherHat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.045, 12), amber);
  fisherHat.position.y = 0.51;
  washedFisher.add(fisherBody, fisherHead, fisherHat);
  washedFisher.visible = false;
  options.parent.add(washedFisher);

  // The world ocean is translucent and therefore cannot provide reliable
  // depth occlusion for the passed-through dragon. Add a mission-local world
  // water-plane discard to every dragon material so contact becomes a true
  // progressive submergence: head first, torso next, tail last. This keeps the
  // existing trajectory and avoids introducing a visible opaque ocean patch.
  const dragonWaterClipActive = { value: 0 };
  const dragonWaterInverseParent = { value: new THREE.Matrix4() };
  const dragonWaterSurface = { value: new THREE.Vector3(0,0,-.82) };
  const oceanHeight = (x:number,z:number) => {
    const uniforms = (options.ocean?.material as THREE.Material | undefined)?.userData.harborWeatherUniforms;
    const time=uniforms?.uHarborWeatherTime.value??0,strength=uniforms?.uHarborWeatherStrength.value??0,base=options.ocean?.position.y??-.82;
    dragonWaterSurface.value.set(time,strength,base);
    return base+(Math.sin(x*.52+time*1.28)*.5+Math.sin(-z*.38-time*.92+x*.11)*.32+Math.sin((x-z)*.24+time*.58)*.18)*strength;
  };
  const clipMaterials = new Set<THREE.Material>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => clipMaterials.add(material));
  });
  clipMaterials.forEach((material) => {
    const priorCompile = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      priorCompile.call(material, shader, renderer);
      shader.uniforms.uDragonWaterClipActive = dragonWaterClipActive;
      shader.uniforms.uDragonWaterInverseParent = dragonWaterInverseParent;
      shader.uniforms.uDragonWaterSurface = dragonWaterSurface;
      shader.vertexShader = shader.vertexShader
        .replace(
          'void main() {',
          'varying vec3 vDragonWorldPosition;\nvoid main() {',
        )
        .replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\n  vDragonWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'void main() {',
          'uniform float uDragonWaterClipActive;\nuniform mat4 uDragonWaterInverseParent;\nuniform vec3 uDragonWaterSurface;\nvarying vec3 vDragonWorldPosition;\nvoid main() {',
        )
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
  vec3 waterLocal=(uDragonWaterInverseParent*vec4(vDragonWorldPosition,1.)).xyz;
  float wt=uDragonWaterSurface.x;
  float waterHeight=uDragonWaterSurface.z+(sin(waterLocal.x*.52+wt*1.28)*.5+sin(-waterLocal.z*.38-wt*.92+waterLocal.x*.11)*.32+sin((waterLocal.x-waterLocal.z)*.24+wt*.58)*.18)*uDragonWaterSurface.y;
  if(uDragonWaterClipActive>.5 && waterLocal.y<waterHeight) discard;`,
        );
    };
    const priorProgramKey = material.customProgramCacheKey.bind(material);
    material.customProgramCacheKey = () => `${priorProgramKey()}|island22-dragon-water-clip-v2`;
    material.needsUpdate = true;
  });

  const initialBoats = options.boats.map((boat) => boat.position.clone());
  const initialSkiffs = options.pondSkiffs.map((boat) => boat.position.clone());
  const boatDirections = initialBoats.map((position) => position.clone().setY(0).normalize());
  const skiffEscapeTargets = initialSkiffs.map((_, index) => {
    const angle = index / Math.max(1, initialSkiffs.length) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * 10, -0.55, Math.sin(angle) * 10);
  });
  const cameraPose: Island22WaterDragonCameraPose = { position: new THREE.Vector3(11, 9, 13), target: new THREE.Vector3(0, 2, 0), shake: 0, fov: 42 };
  let phase: Island22WaterDragonPhase = 'fishing';
  const foldedPoint = new THREE.Vector3();
  const extendedPoint = new THREE.Vector3();
  const bodyTangent = new THREE.Vector3();
  const headForward = new THREE.Vector3();
  const iconicHeadPosition = new THREE.Vector3();
  const iconicHeadWorld = new THREE.Vector3();
  const iconicFacing = new THREE.Vector3();
  const eruptionFacing = new THREE.Vector3(0.62, 0.6, 0.5).normalize();
  const dragonBodyMidpointWorld = new THREE.Vector3();
  const localHeadForward = new THREE.Vector3(0, 0, 1);
  const localBodyForward = new THREE.Vector3(1, 0, 0);
  const sprayMatrix = new THREE.Matrix4();
  const sprayPosition = new THREE.Vector3();
  const sprayScale = new THREE.Vector3();
  const sprayQuaternion = new THREE.Quaternion();
  const sprayDirection = new THREE.Vector3();
  const localUp = new THREE.Vector3(0, 1, 0);
  const cameraFrom = new THREE.Vector3();
  const cameraTo = new THREE.Vector3();
  const targetFrom = new THREE.Vector3();
  const targetTo = new THREE.Vector3();
  const eruptionMidpoint = new THREE.Vector3();
  const electricStreamDirection = new THREE.Vector3(0, -0.16, 1).normalize();
  const islandBasePosition = options.parent.position.clone();
  const islandBaseRotation = options.parent.rotation.clone();
  const impactBuildingBasePosition = impactBuilding.position.clone();
  const predictedHeadWorld = new THREE.Vector3();
  const predictedTailWorld = new THREE.Vector3();
  const diveHeadTarget = new THREE.Vector3();
  const diveArcOffset = new THREE.Vector3();
  const diveContactRoot = new THREE.Vector3();
  const diveTerminalRoot = new THREE.Vector3();
  const diveTailTarget = new THREE.Vector3();
  const wingDiveQuaternion = new THREE.Quaternion();
  const wingFoldQuaternion = new THREE.Quaternion();
  const wrappedWingStart = new THREE.Vector3();
  const wrappedWingEnd = new THREE.Vector3();
  const wrappedWingInnerStart = new THREE.Vector3();
  const wrappedWingOuterStart = new THREE.Vector3();
  const wrappedWingOuterMid = new THREE.Vector3();
  const wrappedWingOuterEnd = new THREE.Vector3();
  const wrappedWingInnerEnd = new THREE.Vector3();
  const wrappedWingInnerMid = new THREE.Vector3();
  const wrappedWingShoulder = new THREE.Vector3();
  const wrappedWingRear = new THREE.Vector3();
  const wrappedWingRibStart = new THREE.Vector3();
  const wrappedWingRibEnd = new THREE.Vector3();

  const updateDragon = (seconds: number, reducedMotion: boolean) => {
    const erupt = smooth((seconds - 7.2) / 0.72);
    const skyLaunch = smooth((seconds - 7.75) / 1.85);
    const unfold = smooth((seconds - 10.05) / 3.15);
    const flight = smooth((seconds - 13.2) / 6);
    const dive = smooth((seconds - 19.2) / (ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS - 19.2));
    const submerged = smooth((seconds - ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS) / (ISLAND_22_DRAGON_RENDER_CUTOFF_SECONDS - .04 - ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS));
    const diveFold = smooth((seconds - 19.15) / 0.95);
    // At this render cutoff the full hierarchy is already below the splash
    // plane. The mission phase continues to 22.68s, but no cyan geometry leaks
    // through the water into the building-damage shot.
    root.visible = seconds >= 7.18 && seconds < ISLAND_22_DRAGON_RENDER_CUTOFF_SECONDS;
    const travelAngle = flight * Math.PI * 1.2;
    root.position.set(
      Math.cos(travelAngle) * flight * 18,
      -6.4 + erupt * 17.8 + skyLaunch * 22 - flight * 8 + Math.sin(flight * Math.PI) * 4.2,
      Math.sin(travelAngle) * flight * 16,
    );
    root.rotation.y = 0.45 + travelAngle * 0.18;
    root.rotation.x = reducedMotion ? 0 : Math.sin(flight * Math.PI * 2) * 0.1 * (1 - dive);
    const flightBank = reducedMotion ? 0 : Math.sin(flight * Math.PI * 2.15) * 0.22 * flight;
    root.rotation.z = THREE.MathUtils.lerp(flightBank, -Math.PI / 2, dive);
    for (let index = 0; index < points.length; index += 1) {
      const t = index / (points.length - 1);
      foldedPoint.set(
        Math.sin(t * Math.PI * 4.2) * (0.08 + t * 0.22),
        -t * ISLAND_22_DRAGON_FOLDED_BODY_LENGTH,
        Math.cos(t * Math.PI * 4.2) * (0.08 + t * 0.18),
      );
      extendedPoint.set(
        -t * 28,
        Math.sin(t * Math.PI * 2.2 - seconds * 1.05) * (1.05 + t * 1.35) * (1 - dive * 0.45),
        Math.sin(t * Math.PI * 2.5 - seconds * 0.72 + 0.4) * (0.75 + t * 1.25),
      );
      points[index].copy(foldedPoint).lerp(extendedPoint, unfold);
    }
    ventralPlates.forEach((plate, index) => {
      const pointIndex = 1 + Math.round(index / Math.max(1, ventralPlates.length - 1) * 22);
      const radius = dragonRadiusAt(pointIndex, points.length);
      plate.position.copy(points[pointIndex]);
      plate.position.y -= radius * 0.78;
      bodyTangent.subVectors(points[Math.min(points.length - 1, pointIndex + 1)], points[Math.max(0, pointIndex - 1)]).normalize();
      plate.quaternion.setFromUnitVectors(localBodyForward, bodyTangent);
      plate.scale.set(radius * 1.1, Math.max(0.1, radius * 0.16), radius * 1.48);
    });
    lateralScales.forEach(({ mesh, side, index }) => {
      const pointIndex = 2 + Math.round(index / 12 * 22);
      const radius = dragonRadiusAt(pointIndex, points.length);
      mesh.position.copy(points[pointIndex]);
      mesh.position.y += radius * 0.34;
      mesh.position.z += side * radius * 0.78;
      bodyTangent.subVectors(points[Math.min(points.length - 1, pointIndex + 1)], points[Math.max(0, pointIndex - 1)]).normalize();
      mesh.quaternion.setFromUnitVectors(localBodyForward, bodyTangent);
      mesh.rotateX(side * 0.42);
      mesh.scale.set(Math.max(0.5, radius * 1.05), Math.max(0.18, radius * 0.28), Math.max(0.36, radius * 0.72));
    });
    bodyArmorBands.forEach((band, index) => {
      const pointIndex = 3 + Math.round(index / Math.max(1, bodyArmorBands.length - 1) * 22);
      const radius = dragonRadiusAt(pointIndex, points.length);
      band.position.copy(points[pointIndex]);
      bodyTangent.subVectors(points[Math.min(points.length - 1, pointIndex + 1)], points[Math.max(0, pointIndex - 1)]).normalize();
      band.quaternion.setFromUnitVectors(localHeadForward, bodyTangent);
      band.scale.setScalar(Math.max(0.42, radius * 0.91));
    });
    head.position.copy(points[0]);
    headForward.subVectors(points[0], points[1]).normalize();
    head.quaternion.setFromUnitVectors(localHeadForward, headForward);
    head.scale.setScalar(5.8 + erupt * 0.7);
    jaw.rotation.x = -Math.sin(clamp01((seconds - 8.4) / 1.2) * Math.PI) * 0.28;
    const iconicScaleXY = 2.15 + erupt * .10;
    const iconicScaleZ = 2.20 + erupt * .10;
    const faceReveal = (1 - unfold) * smooth((seconds - 7.58) / 0.72);
    iconicFacing.copy(headForward).lerp(eruptionFacing, faceReveal * 0.72).normalize();
    iconicHeadPosition.copy(points[0]).addScaledVector(iconicFacing, 2.30 * iconicScaleZ);
    iconicDragon.root.position.copy(iconicHeadPosition);
    iconicDragon.root.quaternion.setFromUnitVectors(localHeadForward, iconicFacing);
    iconicDragon.root.scale.set(iconicScaleXY, iconicScaleXY, iconicScaleZ);
    body.update(points, iconicFacing, iconicDragon.root);
    const eruptionJaw = Math.sin(clamp01((seconds - 8.35) / 1.3) * Math.PI);
    const attackCharge = smooth((seconds - 15.15) / 2.15) * (1 - smooth((seconds - 18.45) / 0.5));
    const residualDiveCharge = smooth((seconds - 19.2) / 0.4)
      * (1 - smooth((seconds - 21.35) / 0.35))
      * 0.75;
    const charge = Math.max(attackCharge, residualDiveCharge);
    const flightRelease = smooth((seconds - 18.12) / 0.34) * (1 - smooth((seconds - 19.05) / 0.22));
    const diveWaterLance = smooth((seconds - 20.05) / 0.24)
      * (1 - smooth((seconds - 21.12) / 0.3))
      * 0.78;
    const release = Math.max(flightRelease, diveWaterLance);
    iconicDragon.updateAttack({
      elapsedSeconds: Math.max(0, seconds),
      charge01: charge,
      release01: release,
      streamDirection: electricStreamDirection,
      reducedMotion,
    });
    // Keep the interlocking shark teeth visible through flight and dive; a
    // nearly closed resting jaw erased the creature's most iconic face cue at
    // phone scale even though the geometry was present.
    iconicDragon.setJawOpen(Math.max(.06, eruptionJaw*.65, release));
    wingGroups.forEach((wing, index) => {
      wing.visible = true;
      wing.position.copy(points[6]);
      const side = index === 0 ? -1 : 1;
      const flap = reducedMotion ? 0 : Math.sin((seconds-12.9)*2.4) * .42 * smooth((seconds-12.6)/.8) * (1-diveFold);
      bodyTangent.subVectors(points[4],points[8]).normalize();
      wing.quaternion.setFromUnitVectors(localBodyForward,bodyTangent);
      wing.rotateX(side*(flap+Math.max(1-unfold,diveFold)*1.10));
      const wingScale = 2.8;
      (wing.userData.setAnatomicalFold as (fold:number)=>void)(Math.max(1-unfold,diveFold));
      wing.scale.set(
        wingScale,
        wingScale,
        wingScale,
      );
    });
    wrappedWingSheets.forEach(({ sheet, position, side }) => {
      sheet.visible = false;
      if (!sheet.visible) return;
      const startRadius = dragonRadiusAt(5, points.length);
      const midRadius = dragonRadiusAt(11, points.length);
      const endRadius = dragonRadiusAt(18, points.length);
      const foldWidth = smooth((diveFold - 0.08) / 0.92);
      wrappedWingInnerStart.copy(points[5]);
      wrappedWingInnerStart.z += side * startRadius * 0.46;
      wrappedWingInnerStart.y += startRadius * 0.14;
      wrappedWingOuterStart.copy(points[5]);
      wrappedWingOuterStart.z += side * startRadius * (0.5 + foldWidth * 0.18);
      wrappedWingOuterStart.y += side * startRadius * (0.16 + foldWidth * 0.32);
      wrappedWingShoulder.copy(points[8]);
      wrappedWingShoulder.z += side * dragonRadiusAt(8, points.length) * (0.6 + foldWidth * 0.38);
      wrappedWingShoulder.y += side * dragonRadiusAt(8, points.length) * (0.24 + foldWidth * 1.08);
      wrappedWingOuterMid.copy(points[11]);
      wrappedWingOuterMid.z += side * midRadius * (0.5 + foldWidth * 0.28);
      wrappedWingOuterMid.y += side * midRadius * (0.18 + foldWidth * 0.92);
      wrappedWingRear.copy(points[15]);
      wrappedWingRear.z += side * dragonRadiusAt(15, points.length) * (0.55 + foldWidth * 0.34);
      wrappedWingRear.y += side * dragonRadiusAt(15, points.length) * (0.22 + foldWidth * 0.86);
      wrappedWingOuterEnd.copy(points[18]);
      wrappedWingOuterEnd.z += side * endRadius * (0.48 + foldWidth * 0.14);
      wrappedWingOuterEnd.y += side * endRadius * (0.12 + foldWidth * 0.28);
      wrappedWingInnerEnd.copy(points[18]);
      wrappedWingInnerEnd.z += side * endRadius * 0.42;
      wrappedWingInnerEnd.y += endRadius * 0.1;
      wrappedWingInnerMid.copy(points[11]);
      wrappedWingInnerMid.z += side * midRadius * 0.43;
      wrappedWingInnerMid.y += midRadius * 0.12;
      position.setXYZ(0, wrappedWingInnerStart.x, wrappedWingInnerStart.y, wrappedWingInnerStart.z);
      position.setXYZ(1, wrappedWingOuterStart.x, wrappedWingOuterStart.y, wrappedWingOuterStart.z);
      position.setXYZ(2, wrappedWingShoulder.x, wrappedWingShoulder.y, wrappedWingShoulder.z);
      position.setXYZ(3, wrappedWingOuterMid.x, wrappedWingOuterMid.y, wrappedWingOuterMid.z);
      position.setXYZ(4, wrappedWingRear.x, wrappedWingRear.y, wrappedWingRear.z);
      position.setXYZ(5, wrappedWingOuterEnd.x, wrappedWingOuterEnd.y, wrappedWingOuterEnd.z);
      position.setXYZ(6, wrappedWingInnerEnd.x, wrappedWingInnerEnd.y, wrappedWingInnerEnd.z);
      position.setXYZ(7, wrappedWingInnerMid.x, wrappedWingInnerMid.y, wrappedWingInnerMid.z);
      position.needsUpdate = true;
      sheet.geometry.computeVertexNormals();
      sheet.geometry.computeBoundingSphere();
    });
    wrappedWingSeams.forEach(({ seam, side }) => {
      seam.visible = false;
      if (!seam.visible) return;
      const startRadius = dragonRadiusAt(5, points.length);
      const endRadius = dragonRadiusAt(18, points.length);
      wrappedWingStart.copy(points[5]);
      wrappedWingStart.z += side * startRadius * 0.82;
      wrappedWingEnd.copy(points[18]);
      wrappedWingEnd.z += side * endRadius * 0.76;
      placeBeam(seam, wrappedWingStart, wrappedWingEnd, 0.72 + diveFold * 0.45);
    });
    wrappedWingRibs.forEach(({ rib, ribIndex, side }) => {
      rib.visible = false;
      if (!rib.visible) return;
      const innerIndex = 7 + ribIndex * 3;
      const outerIndex = 8 + ribIndex * 3;
      const innerRadius = dragonRadiusAt(innerIndex, points.length);
      const outerRadius = dragonRadiusAt(outerIndex, points.length);
      wrappedWingRibStart.copy(points[innerIndex]);
      wrappedWingRibStart.z += side * innerRadius * 0.44;
      wrappedWingRibStart.y += innerRadius * 0.12;
      wrappedWingRibEnd.copy(points[outerIndex]);
      wrappedWingRibEnd.z += side * outerRadius * (0.72 + diveFold * 0.16);
      wrappedWingRibEnd.y += side * outerRadius * (0.38 + diveFold * 0.58);
      placeBeam(rib, wrappedWingRibStart, wrappedWingRibEnd, 0.64 + diveFold * 0.35);
    });
    limbs.forEach(({ group, side, rear }) => {
      group.position.copy(points[rear ? 16 : 8]);
      group.scale.setScalar(0.08 + unfold * 2.65);
      group.rotation.z = side * (0.65 - unfold * 0.35 + diveFold * 0.72);
      group.rotation.x = side * (0.16 + diveFold * 0.4);
    });
    dorsalFins.forEach((fin,index)=>{
      const pointIndex=2+index*2;
      bodyTangent.subVectors(points[Math.max(0,pointIndex-1)],points[Math.min(points.length-1,pointIndex+1)]).normalize();
      fin.quaternion.setFromUnitVectors(localBodyForward,bodyTangent);
      const dorsal=new THREE.Vector3(0,1,0).applyQuaternion(fin.quaternion);
      fin.position.copy(points[pointIndex]).addScaledVector(dorsal,dragonRadiusAt(pointIndex,points.length)*.90);
      fin.scale.setScalar(THREE.MathUtils.lerp(1.85,.65,index/dorsalFins.length));
    });
    tailFin.position.copy(points[points.length - 1]);
    bodyTangent.subVectors(points[points.length - 2], points[points.length - 1]).normalize();
    tailFin.quaternion.setFromUnitVectors(localBodyForward, bodyTangent);
    tailFin.scale.setScalar(0.3 + unfold * 2.7);
    if (dive > 0) {
      predictedHeadWorld.copy(iconicHeadPosition).addScaledVector(iconicFacing,1.66*iconicScaleZ).applyEuler(root.rotation).add(root.position);
      diveHeadTarget.copy(predictedHeadWorld).lerp(diveSplash.position, dive);
      diveArcOffset.set(
        Math.sin(dive * Math.PI) * 2.4,
        Math.sin(dive * Math.PI) * 8.5,
        Math.sin(dive * Math.PI) * 4.2,
      );
      diveHeadTarget.add(diveArcOffset);
      predictedHeadWorld.copy(iconicHeadPosition).addScaledVector(iconicFacing,1.66*iconicScaleZ).applyEuler(root.rotation);
      diveContactRoot.copy(diveHeadTarget).sub(predictedHeadWorld);
      if (submerged > 0) {
        // Solve the terminal pose from the actual tail socket, not an arbitrary
        // head plunge. At the hide boundary the final tail is below the impact
        // plane and centred on the same water aperture, so the body can finish
        // travelling through the splash instead of popping away above it.
        predictedTailWorld.copy(points[points.length - 1]).applyEuler(root.rotation);
        diveTailTarget.copy(diveSplash.position).addScaledVector(localUp, -5.2);
        diveTerminalRoot.copy(diveTailTarget).sub(predictedTailWorld);
        root.position.copy(diveContactRoot).lerp(diveTerminalRoot, submerged);
      } else {
        root.position.copy(diveContactRoot);
      }
    }
  };

  const update = (_elapsed: number, presentation: Island22WaterDragonPresentation) => {
    const repairProgress = clamp01(presentation.impactRepairProgress ?? 0);
    const active = presentation.fishCaughtKg >= ISLAND_22_DRAGON_TRIGGER_KG && repairProgress < 1;
    const seconds = active ? Math.max(0, presentation.previewElapsedSeconds ?? 0) : -1;
    phase = resolveIsland22WaterDragonPhase(seconds);
    diveSplash.position.y=oceanHeight(diveSplash.position.x,diveSplash.position.z);
    impactWaves.position.copy(diveSplash.position);
    const vortexProgress = active ? smooth(seconds / 2.6) : 0;
    const drainLinear = active ? clamp01((seconds - 0.8) / 5.8) : 0;
    const drain = Math.pow(drainLinear, 2.15);
    const waterY = 0.66 - drain * 7.05;
    vortex.visible = active && seconds < 6.2;
    vortex.rotation.y = seconds * (1.4 + vortexProgress * 4.5);
    vortex.scale.setScalar(0.75 + vortexProgress * 0.5);
    vortex.position.y = waterY - 0.66;
    options.pond.visible = !active;
    options.pond.position.y = waterY;
    options.pond.scale.setScalar(1 - smooth((seconds - 6.2) / 0.4) * 0.08);
    options.depth.position.y = waterY + 0.012;
    options.depth.scale.setScalar(1 + drain * 1.25);
    loweredWaterWall.position.y = waterY - 0.1;
    loweredWaterWall.visible = active && drain > 0.015 && seconds < 6.72;
    wellWaterSurface.position.y = waterY;
    wellWaterSurface.visible = active && seconds < 7.18;
    wellStencilMask.visible = active && seconds < 10.2;
    shaft.visible = active && drain > 0.015 && seconds < 10.2;
    shaftBottom.visible = shaft.visible;
    shaftBands.visible = shaft.visible;
    const burstProgress = clamp01((seconds - 7.18) / 1.32);
    const burstFade = 1 - smooth((seconds - 8.05) / 1.45);
    burst.visible = false;
    eruptionWaterV2.update(active?seconds-7.18:-1,Boolean(presentation.reducedMotion));
    diveWaterV2.update(active?seconds-ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS:-1,Boolean(presentation.reducedMotion));
    shockwave.scale.setScalar(0.2 + smooth(burstProgress) * 5.7);
    (shockwave.material as THREE.MeshPhysicalMaterial).opacity = 0.82 * burstFade;
    burstMist.scale.set(2.5 + burstProgress * 3.4, 0.7 + burstProgress * 5.2, 2.5 + burstProgress * 3.4);
    burstMist.position.y = 0.9 + burstProgress * 3.8;
    (burstMist.material as THREE.MeshPhysicalMaterial).opacity = 0.23 * burstFade;
    for (let index = 0; index < sprayCount; index += 1) {
      const angle = index / sprayCount * Math.PI * 2 + index * 0.17;
      const uneven = 0.78 + (index % 5) * 0.11;
      const radius = 2.45 + (index % 3) * 0.24 + burstProgress * 1.6;
      sprayPosition.set(Math.cos(angle) * radius, 0.8 + burstProgress * (2.1 + (index % 4) * 0.55), Math.sin(angle) * radius);
      sprayDirection.set(Math.cos(angle) * 0.42, 1, Math.sin(angle) * 0.42).normalize();
      sprayQuaternion.setFromUnitVectors(localUp, sprayDirection);
      sprayScale.set(0.5 + burstProgress * 0.85, Math.max(0.02, burstProgress * uneven), 0.5 + burstProgress * 0.85);
      sprayMatrix.compose(sprayPosition, sprayQuaternion, sprayScale);
      spray.setMatrixAt(index, sprayMatrix);
    }
    spray.instanceMatrix.needsUpdate = true;
    (spray.material as THREE.MeshPhysicalMaterial).opacity = 0.82 * burstFade;
    const splashProgress = smooth((seconds - ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS) / 0.38);
    // Let the initial impact read strongly, then clear the spray before the
    // 22.5s damage-camera handoff so the destroyed building is the payoff—not
    // a screen of translucent water columns.
    const splashFade = 1 - smooth((seconds - (ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS + 0.44)) / 1);
    diveSplash.visible = active && seconds >= ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS && seconds < 23.35;
    dragonWaterClipActive.value = active
      && seconds >= ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS
      && seconds < ISLAND_22_DRAGON_RENDER_CUTOFF_SECONDS
      ? 1
      : 0;
    diveSplashRings.forEach((ring, index) => {
      ring.scale.setScalar(0.3 + splashProgress * (4.8 + index * 1.65));
      (ring.material as THREE.MeshPhysicalMaterial).opacity = splashFade * (0.9 - index * 0.16);
    });
    for (let index = 0; index < diveSplashCount; index += 1) {
      const angle = index / diveSplashCount * Math.PI * 2 + (index % 3) * 0.12;
      const radius = 1.1 + (index % 4) * 0.32 + splashProgress * 3.6;
      const height = 0.9 + (index % 6) * 0.3;
      sprayPosition.set(Math.cos(angle) * radius, splashProgress * (3.2 + height * 3.4), Math.sin(angle) * radius);
      sprayDirection.set(Math.cos(angle) * 0.34, 1, Math.sin(angle) * 0.34).normalize();
      sprayQuaternion.setFromUnitVectors(localUp, sprayDirection);
      sprayScale.set(0.72 + splashProgress * 1.18, Math.max(0.02, splashProgress * height), 0.72 + splashProgress * 1.18);
      sprayMatrix.compose(sprayPosition, sprayQuaternion, sprayScale);
      diveSplashSpray.setMatrixAt(index, sprayMatrix);
    }
    diveSplashSpray.instanceMatrix.needsUpdate = true;
    (diveSplashSpray.material as THREE.MeshPhysicalMaterial).opacity = splashFade * 0.92;
    const impactProgress = smooth((seconds - ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS) / 0.72);
    const impactAge = Math.max(0, seconds - ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS);
    const damageVisible = active && seconds >= ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS && repairProgress < 1;
    const washArrival = Math.hypot(impactBuildingBasePosition.x-diveSplash.position.x,impactBuildingBasePosition.z-diveSplash.position.z)/7;
    const collapse = smooth((impactAge-washArrival)/.24);
    const damageAmount = damageVisible ? (1-repairProgress)*collapse : 0;
    if (options.impactHouse) {
      options.impactHouse.applyDamage(damageAmount, Math.max(0,impactAge-washArrival), Boolean(presentation.reducedMotion));
    } else {
    impactBuilding.position.copy(impactBuildingBasePosition);
    impactBuilding.position.y += damageVisible ? Math.sin(impactAge * 13) * 0.08 * damageAmount - 0.24 * damageAmount : 0;
    impactBuilding.rotation.set(0.12 * damageAmount, 0.38, -0.72 * damageAmount + Math.sin(impactAge * 16) * 0.08 * damageAmount);
    impactBuilding.scale.set(1, 1 - damageAmount * 0.34, 1);
    }
    impactRoofPanels.forEach((panel, index) => {
      const side = index === 0 ? -1 : 1;
      panel.position.y = 1.28 + damageAmount * (0.32 + index * 0.12);
      panel.position.x = side * (0.43 + damageAmount * 0.46);
      panel.rotation.z = side * (-0.58 - damageAmount * 0.62);
      panel.rotation.x = damageAmount * side * 0.26;
    });
    impactDebris.visible = damageVisible && damageAmount>.001 && repairProgress < 0.82;
    impactDebrisPieces.forEach((piece, index) => {
      const angle = index / impactDebrisPieces.length * Math.PI * 2 + index * 0.37;
      const debrisAge=Math.min(1.2,Math.max(0,impactAge-washArrival));
      const travel = smooth(debrisAge/.9) * damageAmount * (.55 + index % 4 * .26);
      const floor=travel>.92 ? diveSplash.position.y-impactBuildingBasePosition.y+.08 : .06;
      piece.position.set(
        Math.cos(angle) * travel,
        Math.max(floor,.5+(2.6+index%3*.35)*debrisAge-4.8*debrisAge*debrisAge),
        Math.sin(angle) * travel,
      );
      piece.rotation.set(debrisAge * (1.2 + index % 3), debrisAge * (0.8 + index % 4), index * 0.31);
      piece.scale.setScalar(Math.max(0.05, damageAmount));
    });
    impactWaves.visible = false;
    impactWaveRings.forEach((ring, index) => {
      const waveProgress = smooth((seconds - ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS - index * 0.14) / 1.45);
      ring.scale.setScalar(0.25 + waveProgress * (4.5 + index * 0.8));
      ring.position.y = 0.12 + index * 0.055 + Math.sin(waveProgress * Math.PI) * 0.48;
      (ring.material as THREE.MeshPhysicalMaterial).opacity = (1 - smooth((waveProgress - 0.5) / 0.5)) * (0.34 - index * 0.035);
    });
    const fisherWash = smooth((seconds - (ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS + 0.16)) / 1.42);
    washedFisher.visible = active && seconds >= ISLAND_22_DRAGON_DIVE_CONTACT_SECONDS + 0.12 && seconds < 23.12;
    washedFisher.position.copy(impactBuildingBasePosition).add(new THREE.Vector3(.15, .43, .18)).lerp(targetTo.set(0, -1.2, 0), fisherWash);
    washedFisher.rotation.set(fisherWash * Math.PI * 4.2, fisherWash * Math.PI * 2.4, fisherWash * Math.PI * 3.2);
    washedFisher.scale.setScalar(1 - smooth((fisherWash - 0.78) / 0.22) * 0.88);
    const recoilEnvelope = active && impactAge < 2.8 ? Math.exp(-impactAge * 0.95) : 0;
    const recoil = presentation.reducedMotion ? 0 : recoilEnvelope * Math.sin(impactAge * 18);
    options.parent.position.copy(islandBasePosition);
    options.parent.position.y += Math.abs(recoil) * 0.34;
    options.parent.rotation.copy(islandBaseRotation);
    options.parent.rotation.x += recoil * 0.045;
    options.parent.rotation.z += presentation.reducedMotion ? 0 : Math.sin(impactAge * 15.2) * recoilEnvelope * 0.055;
    options.pondShadow.visible = !active;
    options.pondShadow.rotation.y = seconds * 0.08;
    const returnProgress = phase === 'repair-mission' ? repairProgress : 0;
    const panic = active ? smooth((seconds - 2.1) / 1.2) * (1 - returnProgress) : 0;
    options.updateFishers(smooth((seconds - 2.6) / 3) * (1 - returnProgress), panic);
    options.boats.forEach((boat, index) => {
      boat.position.copy(initialBoats[index]).addScaledVector(boatDirections[index], smooth((seconds - 3.1 - index * 0.08) / 3) * 8.5 * (1 - returnProgress));
    });
    options.pondSkiffs.forEach((boat, index) => {
      const progress = smooth((seconds - 2.8 - index * 0.12) / 2.5) * (1 - returnProgress);
      boat.position.copy(initialSkiffs[index]).lerp(skiffEscapeTargets[index], progress);
    });
    updateDragon(seconds, Boolean(presentation.reducedMotion));
    options.parent.updateWorldMatrix(true,false);
    dragonWaterInverseParent.value.copy(options.parent.matrixWorld).invert();
    iconicHeadWorld.copy(iconicHeadPosition).applyEuler(root.rotation).add(root.position);
    dragonBodyMidpointWorld.copy(points[Math.floor(points.length*.44)]).applyEuler(root.rotation).add(root.position);
    const aspect=typeof window==='undefined'?1.3:window.innerWidth/Math.max(1,window.innerHeight);
    const shot=resolveSeaDragonCinematicCamera(seconds,{head:iconicHeadWorld,body:dragonBodyMidpointWorld,water:diveSplash.position,house:impactBuildingBasePosition,parentMatrix:options.parent.matrixWorld},aspect);
    if(seconds>=7.18 && seconds<22.6 && root.visible){
      root.updateWorldMatrix(true,true);
      const bounds=new THREE.Box3(),corner=new THREE.Vector3(),localPoint=new THREE.Vector3();
      root.traverseVisible(node=>{
        if(!(node instanceof THREE.Mesh))return;
        const mats=Array.isArray(node.material)?node.material:[node.material];
        if(mats.some(mat=>mat.transparent))return;
        node.geometry.computeBoundingBox();const box=node.geometry.boundingBox;if(!box||box.isEmpty())return;
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          corner.set(x,y,z).applyMatrix4(node.matrixWorld);
          localPoint.copy(corner).applyMatrix4(dragonWaterInverseParent.value);
          if(seconds<10.2 && localPoint.y<.64)continue;
          if(seconds>=21.45 && localPoint.y<oceanHeight(localPoint.x,localPoint.z))continue;
          bounds.expandByPoint(corner);
        }
      });
      if(seconds<10.2)bounds.expandByPoint(new THREE.Vector3(0,.64,0).applyMatrix4(options.parent.matrixWorld));
      if(seconds>=21.45)bounds.expandByPoint(diveSplash.position.clone().applyMatrix4(options.parent.matrixWorld));
      fitSeaDragonCameraToBounds(shot,bounds,aspect,smooth((seconds-7.18)/.22));
    }
    cameraPose.position.copy(shot.position);cameraPose.target.copy(shot.target);cameraPose.fov=shot.fov;
    const eruptionShock=1-smooth((seconds-7.2)/.9);
    cameraPose.shake=presentation.reducedMotion?0:phase==='ground-shake'?.12:phase==='eruption'?.22*eruptionShock:0;
  };

  root.userData.sculptRuntime = {
    schemaVersion: 1,
    clickable: true,
    explodable: true,
    partIds: [
      body.mesh.name,
      iconicDragon.root.name,
      ...ventralPlates.map((plate) => plate.name),
      ...lateralScales.map(({ mesh }) => mesh.name),
      ...bodyArmorBands.map((band) => band.name),
      ...wingGroups.map((wing) => wing.name),
      ...limbs.map(({ group }) => group.name),
      ...dorsalFins.map((fin) => fin.name),
      tailFin.name,
    ],
    pivots: {
      head: iconicDragon.root.name,
      leftWing: wingGroups[0].name,
      rightWing: wingGroups[1].name,
      tailFin: tailFin.name,
    },
    sockets: {
      wingRootPointIndex: 6,
      frontLimbPointIndex: 8,
      rearLimbPointIndex: 16,
      tailPointIndex: points.length - 1,
    },
    actions: ['rim-peek', 'aperture-fill-eruption', 'spray-shockwave', 'camera-recoil', 'full-body-sky-launch', 'unfurl', 'banked-turn', 'wide-flight', 'retained-wrapped-wing-head-first-dive', 'shore-impact-splash', 'island-recoil', 'wash-over-waves', 'building-destruction', 'fisher-swept-into-well', 'five-step-rebuild'],
    scaleAuthority: {
      apertureRadius: ISLAND_22_POND_APERTURE_RADIUS,
      leadingBodyRadius: ISLAND_22_DRAGON_ERUPTION_BODY_RADIUS,
      apertureFillRatio: ISLAND_22_DRAGON_APERTURE_FILL_RATIO,
    },
  };

  return { root, update, getCameraPose: () => cameraPose, getPhase: () => phase };
}
