import * as THREE from 'three';
import config from './island19WonderGrotto.json';
import type { Island19CircuitFMaterials } from './Island19CoasterCarnivalCircuitFWorld';
import type { Island3DQuality } from './island5ThreePilotContract';

const center = new THREE.Vector3(...config.center as [number, number, number]);
const radii = new THREE.Vector3(...config.radii as [number, number, number]);

export function grandGrottoNorm(point: THREE.Vector3) {
  return ((point.x-center.x)/radii.x)**2 + ((point.y-center.y)/radii.y)**2 + ((point.z-center.z)/radii.z)**2;
}

/** Remove hidden liner triangles at physical cavity intersections. The retained
 * island itself is Boolean-carved from the same JSON volume in Blender. */
export function trimGrottoIntersection(geometry: THREE.BufferGeometry, remove: (point: THREE.Vector3) => boolean) {
  const position = geometry.getAttribute('position');
  const oldIndex = geometry.getIndex();
  const count = oldIndex?.count ?? position.count;
  const indices: number[] = [];
  const midpoint = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i += 3) {
    const a = oldIndex ? oldIndex.getX(i) : i;
    const b = oldIndex ? oldIndex.getX(i+1) : i+1;
    const c = oldIndex ? oldIndex.getX(i+2) : i+2;
    midpoint.fromBufferAttribute(position, a).add(p.fromBufferAttribute(position, b)).add(p.fromBufferAttribute(position, c)).multiplyScalar(1/3);
    if (!remove(midpoint)) indices.push(a, b, c);
  }
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export function createGrandTreasureGrotto(
  path: THREE.CurvePath<THREE.Vector3>, materials: Island19CircuitFMaterials, quality: Island3DQuality,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_D019_GRAND_TREASURE_GROTTO';
  const passageSamples = Array.from({length: 1200}, (_, i) => path.getPoint(i/1199));
  const rock = new THREE.MeshStandardMaterial({
    color: 0x303847, roughness: .95, side: THREE.DoubleSide, flatShading: true, vertexColors: true,
    emissive: 0x1a1120, emissiveIntensity: .22,
  });
  const shellGeometry = new THREE.SphereGeometry(1, quality === 'high' ? 96 : 64, quality === 'high' ? 64 : 40);
  shellGeometry.scale(radii.x, radii.y, radii.z).translate(center.x, center.y, center.z);
  const rockPositions = shellGeometry.getAttribute('position');
  const rockColors = new Float32Array(rockPositions.count * 3);
  const rockPoint = new THREE.Vector3();
  for (let i = 0; i < rockPositions.count; i++) {
    rockPoint.fromBufferAttribute(rockPositions, i);
    const strata = Math.sin(rockPoint.y * 3.1 + Math.sin(rockPoint.x * .9) + Math.cos(rockPoint.z * 1.2));
    const fracture = Math.sin(rockPoint.x * 5.7 + rockPoint.z * 2.3) * Math.cos(rockPoint.y * 4.1);
    const relief = .035 + .065 * (strata + 1) / 2;
    const inward = rockPoint.clone().sub(center).normalize();
    rockPoint.addScaledVector(inward, -relief);
    rockPositions.setXYZ(i, rockPoint.x, rockPoint.y, rockPoint.z);
    const shade = .55 + .22 * (strata + 1) / 2 + .16 * (fracture + 1) / 2;
    rockColors.set([shade * .88, shade * .94, shade], i * 3);
  }
  shellGeometry.setAttribute('color', new THREE.BufferAttribute(rockColors, 3));
  shellGeometry.computeVertexNormals();
  trimGrottoIntersection(shellGeometry, p => passageSamples.some(sample => sample.distanceToSquared(p) < 1.73**2));
  const shell = new THREE.Mesh(shellGeometry, rock);
  shell.name = 'ISLAND_19_D019_PHYSICAL_GRAND_GROTTO_LINING';
  root.add(shell);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.55, 64),
    new THREE.MeshStandardMaterial({color: 0x4c3930, roughness: .86, emissive: 0x291407, emissiveIntensity: .3}));
  floor.rotation.x = -Math.PI/2;
  floor.position.set(center.x, config.floorY, center.z);
  floor.name = 'ISLAND_19_D019_TREASURE_FLOOR';
  root.add(floor);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const gold = materials.gold.clone();
  gold.emissive.setHex(0xae5309);
  gold.emissiveIntensity = .28;
  gold.roughness = .27;
  const piles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), gold, 34);
  piles.name = 'ISLAND_19_D019_MONUMENTAL_GOLD_HOARD';
  for (let i=0; i<34; i++) {
    const angle = i * 2.399963;
    const radius = Math.sqrt(i/34) * 3.35;
    const height = .65 + (1-radius/4) * (1.2 + .55*Math.sin(i*1.7));
    matrix.compose(new THREE.Vector3(center.x + Math.cos(angle)*radius, config.floorY + height*.4, Math.sin(angle)*radius*.78),
      rotation.setFromEuler(new THREE.Euler(.1*Math.sin(i), angle, .08*Math.cos(i))),
      new THREE.Vector3(.8 + i%3*.2, height, .72 + i%4*.16));
    piles.setMatrixAt(i, matrix);
  }
  root.add(piles);
  const coinCount = quality === 'low' ? 180 : 420;
  const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.13,.035,8), gold, coinCount);
  coins.name = 'ISLAND_19_D019_GOLD_COIN_RIVERS';
  for (let i=0; i<coinCount; i++) {
    const angle = i*2.399963;
    const radius = .2 + Math.sqrt(i/coinCount)*3.8;
    matrix.compose(new THREE.Vector3(center.x+Math.cos(angle)*radius, config.floorY+.16+Math.max(0,1-radius/4)*1.7, Math.sin(angle)*radius*.77),
      rotation.setFromEuler(new THREE.Euler(Math.sin(i)*.25,angle,Math.cos(i)*.24)), new THREE.Vector3(1,1,1));
    coins.setMatrixAt(i,matrix);
  }
  root.add(coins);
  const crystal = new THREE.MeshPhysicalMaterial({color:0x80efff,metalness:.24,roughness:.12,clearcoat:1,emissive:0x20a4be,emissiveIntensity:.6});
  const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0), crystal, 18);
  crystals.name = 'ISLAND_19_D019_COLOSSAL_CRYSTAL_CLUSTERS';
  for(let i=0;i<18;i++){
    const angle=i/18*Math.PI*2;
    const radius=3.5 + .2*Math.sin(i);
    matrix.compose(new THREE.Vector3(center.x+Math.cos(angle)*radius,config.floorY+1.2,Math.sin(angle)*radius*.8),
      rotation.setFromEuler(new THREE.Euler(.16*Math.cos(i),angle,.16*Math.sin(i))),new THREE.Vector3(.32+i%3*.09,1.4+i%4*.32,.35));
    crystals.setMatrixAt(i,matrix);
  }
  root.add(crystals);
  // Hanging minerals, tiny lamps and balcony piers provide a readable size
  // hierarchy: wagon, bridge, enormous walls, then the distant treasure floor.
  const stalactites = new THREE.InstancedMesh(new THREE.ConeGeometry(.45,2.5,7),rock,26);
  let mineralCount = 0;
  for(let i=0;i<26;i++){
    const angle=i*2.399963, radius=1.4+(i%5)*.8;
    const x=Math.cos(angle)*radius, z=Math.sin(angle)*radius*.72;
    const ceiling=center.y+radii.y*Math.sqrt(Math.max(.05,1-(x/radii.x)**2-(z/radii.z)**2));
    const mineralPosition = new THREE.Vector3(center.x+x,ceiling-.65,z);
    const mineralScale = new THREE.Vector3(.55+i%3*.16,.6+i%4*.2,.7);
    // Keep the whole hanging mineral, not just its origin, outside the
    // train/eye sleeve at the steep second-level entrance.
    const clearance = 1.73 + 1.33 * Math.max(mineralScale.x, mineralScale.y, mineralScale.z);
    if (passageSamples.some(sample => sample.distanceToSquared(mineralPosition) < clearance**2)) continue;
    matrix.compose(mineralPosition,rotation.setFromEuler(new THREE.Euler(Math.PI,0,0)),mineralScale);
    stalactites.setMatrixAt(mineralCount++,matrix);
  }
  stalactites.count = mineralCount;
  stalactites.name='ISLAND_19_D019_HIGH_CEILING_MINERALS';
  root.add(stalactites);
  const balconyFrames=Array.from({length:420},(_,i)=>i/419).map(u=>{
    const position=path.getPoint(u),tangent=path.getTangent(u).normalize();
    const side=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tangent).normalize();
    return {position,side};
  }).filter(f=>grandGrottoNorm(f.position)<.86 && f.position.y<-9.5);
  const pierCount=Math.ceil(balconyFrames.length/5)*2;
  const piers=new THREE.InstancedMesh(new THREE.CylinderGeometry(.075,.14,1,8),materials.wetBasalt,pierCount);
  piers.name='ISLAND_19_D019_GROTTO_BALCONY_LOAD_PIERS';
  let pier=0;
  balconyFrames.forEach((frame,i)=>{
    if(i%5) return;
    for(const side of [-1,1]){
      const height=frame.position.y-.08-config.floorY;
      const p=frame.position.clone().addScaledVector(frame.side,side*.36);
      p.y=config.floorY+height/2;
      matrix.compose(p,new THREE.Quaternion(),new THREE.Vector3(1,height,1));
      piers.setMatrixAt(pier++,matrix);
    }
  });
  piers.count=pier;
  root.add(piers);
  for(const [x,z,color,intensity] of [[-2,0,0xffab36,120],[2,1,0x6feeff,80],[0,-2,0xffdb7c,90]]) {
    const light=new THREE.PointLight(color,intensity,18,1.6);
    light.position.set(center.x+x,-14.7,z);
    root.add(light);
  }
  root.userData={decisionId:config.decisionId,physicalCavity:true,center:config.center,radii:config.radii,floorY:config.floorY,gameplayAuthority:false};
  return root;
}

export function createSeabedOutsideGrandGrotto(seabedY: number, originX: number, originZ: number) {
  const outline=new THREE.Shape();
  outline.absarc(0,0,24,0,Math.PI*2,false);
  const crossSection=Math.sqrt(1-((seabedY-center.y)/radii.y)**2);
  const hole=new THREE.Path();
  hole.absellipse(center.x-originX,-center.z+originZ,radii.x*crossSection+1.1,radii.z*crossSection+1.1,0,Math.PI*2,true);
  outline.holes.push(hole);
  return new THREE.ShapeGeometry(outline,96);
}
