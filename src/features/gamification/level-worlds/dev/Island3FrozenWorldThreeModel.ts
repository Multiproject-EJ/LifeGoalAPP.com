import * as THREE from 'three';
import { createIsland3SnowTree } from './Island3SnowTreeGeometry';
import type { Island3FrostmoonMaterials } from './Island3FrostmoonThreeWorld';
import type { Island3DQuality } from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

/** Presentation-only frozen terrain. Semantic roots are deliberately separate
 * from the operating Frostwell, swaying wildlife and material-swapping lamps. */
export function createIsland3FrozenWorld(materials: Island3FrostmoonMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_3_V2_FROZEN_WORLD';
  const terrain = new THREE.Group(); terrain.name = 'ISLAND_3_V2_STATIC_TERRAIN';
  const ridges = new THREE.Group(); ridges.name = 'ISLAND_3_V2_STATIC_PRESSURE_RIDGES';
  const planting = new THREE.Group(); planting.name = 'ISLAND_3_V2_STATIC_VEGETATION';
  for (const part of [terrain, ridges, planting]) part.userData.rigidTerrainBatch = true;
  root.add(terrain, ridges, planting);
  const blueIce = new THREE.MeshStandardMaterial({ color: 0x79b9ce, roughness: .78, metalness: .03 });
  const deepIce = new THREE.MeshStandardMaterial({ color: 0x467f9e, roughness: .84 });
  const seaIce = new THREE.MeshStandardMaterial({ color: 0xb7d5e1, roughness: .93 });
  const sea = new THREE.Mesh(new THREE.BoxGeometry(140, 3.2, 140), seaIce);
  sea.name = 'ISLAND_3_CONTINUOUS_MANY_METRES_DEEP_FROZEN_OCEAN';
  sea.position.y = -4.35; sea.receiveShadow = true;
  sea.userData.iceThicknessWorldUnits = 3.2;
  terrain.add(sea);
  const outline = new THREE.Shape();
  const count = quality === 'low' ? 32 : 64;
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2;
    // One continuous rounded shelf encloses the canonical outer plots.
    const x = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), .62) * (6.85 + .13 * Math.sin(a * 7));
    const z = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), .62) * (6.35 + .13 * Math.cos(a * 9));
    if (i === 0) outline.moveTo(x, -z); else outline.lineTo(x, -z);
  }
  outline.closePath();
  function stratum(name: string, bottom: number, top: number, mat: THREE.Material, scale: number) {
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: top - bottom, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    const layer = new THREE.Mesh(geometry, mat); layer.name = name;
    layer.position.y = bottom; layer.scale.set(scale, 1, scale); layer.receiveShadow = true; layer.castShadow = true;
    terrain.add(layer);
  }
  stratum('ISLAND_3_DEEP_BLUE_ICE_STRATUM', -2.83, -1.12, deepIce, 1.018);
  stratum('ISLAND_3_COMPACTED_PALE_ICE_STRATUM', -1.2, .06, blueIce, 1.008);
  stratum('ISLAND_3_CONNECTED_MINERAL_SEAM', -.02, .25, materials.frostRock, 1);
  for (const [index, y] of [-2.26, -1.72, -.91, -.38].entries()) {
    stratum(`ISLAND_3_VISIBLE_COMPRESSION_BAND_${index}`, y, y + .055, index % 2 ? seaIce : blueIce, 1.023);
  }
  stratum('ISLAND_3_CONTINUOUS_SNOW_CAP', .20, .38, materials.snow, 1.012);
  // Ground the offshore works in the same solid ice field, retaining its bore
  // and local cutaway. This buttress is hidden with terrain during the mission.
  const offshore = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.7, 2.5, 12), blueIce);
  offshore.name = 'ISLAND_3_FROSTWELL_GROUNDED_ICE_BUTTRESS';
  offshore.position.set(0, -1.55, -9.4); terrain.add(offshore);
  const offshoreSnow = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, .12, 12), materials.snow);
  offshoreSnow.position.set(0, -.31, -9.4); terrain.add(offshoreSnow);
  const ridgeGeo = new THREE.DodecahedronGeometry(1, 0);
  const cliffCount = quality === 'low' ? 28 : 48;
  for (let i = 0; i < cliffCount; i++) {
    const a = i / cliffCount * Math.PI * 2;
    const x = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), .62) * 6.8;
    const z = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), .62) * 6.3;
    const ice = new THREE.Mesh(ridgeGeo, i % 3 ? blueIce : deepIce);
    ice.position.set(x, -1.35, z); ice.scale.set(.35 + i % 3 * .08, 1.42, .32 + i % 2 * .08); ice.rotation.y = a;
    ridges.add(ice);
    const rock = new THREE.Mesh(ridgeGeo, materials.frostRock);
    rock.position.set(x, .02, z); rock.scale.set(.48, .23 + i % 3 * .04, .45); ridges.add(rock);
    const snow = new THREE.Mesh(ridgeGeo, materials.snow);
    snow.position.set(x, .2, z); snow.scale.set(.51, .24, .48); ridges.add(snow);
  }
  // Low grounded pressure ridges break the uninterrupted frozen sea; none are
  // detached floaters and none enter the route or Frostwell approach corridor.
  for (let i = 0; i < (quality === 'low' ? 35 : 80); i++) {
    const a = i * 2.39996; const radius = 11.6 + i % 9 * 2.7;
    const ridge = new THREE.Mesh(ridgeGeo, i % 4 ? seaIce : blueIce);
    ridge.position.set(Math.cos(a) * radius, -2.65, Math.sin(a) * radius);
    ridge.scale.set(1.4 + i % 3 * .5, .22 + i % 4 * .11, .42 + i % 2 * .16);
    ridge.rotation.y = a + .6; ridges.add(ridge);
  }
  // A solid ice ramp follows the actual freight route, with its underside
  // submerged in the continuous sea. The inward flat landing joins the shelf.
  const rampPositions: number[] = [];
  const rampIndices: number[] = [];
  const rampSnowPositions: number[] = [];
  const rampSnowIndices: number[] = [];
  const rampSections = 20;
  const rampSamples: Array<{t: number; x: number; y: number; z: number}> = [];
  for (let i = 0; i <= rampSections; i++) {
    const t = -.10 + i / rampSections * .49;
    const x = -6.4 - 18.2 * t;
    const z = -6.15 - 14.8 * t + Math.sin(Math.PI * t) * 1.45;
    const y = THREE.MathUtils.lerp(.3, -2.75, THREE.MathUtils.smoothstep(t, .04, .32));
    const tangent = new THREE.Vector2(-18.2, -14.8 + Math.PI * Math.cos(Math.PI * t) * 1.45).normalize();
    const nx = -tangent.y * 1.9; const nz = tangent.x * 1.9;
    rampPositions.push(x + nx,y-.055,z+nz, x-nx,y-.055,z-nz, x+nx,-3.0,z+nz, x-nx,-3.0,z-nz);
    rampSnowPositions.push(x+nx,y,z+nz, x-nx,y,z-nz);
    rampSamples.push({t,x,y,z});
    if (i < rampSections) {
      const a=i*4,b=a+4;
      rampIndices.push(a,b,a+1, a+1,b,b+1, a,a+2,b, a+2,b+2,b, a+1,b+1,a+3, a+3,b+1,b+3, a+2,a+3,b+2, a+3,b+3,b+2);
      const c=i*2; rampSnowIndices.push(c,c+2,c+1,c+1,c+2,c+3);
    }
  }
  rampIndices.push(0,1,2,1,3,2);
  const last=rampSections*4; rampIndices.push(last,last+2,last+1,last+1,last+2,last+3);
  for (const [name,positions,indices,mat] of [
    ['ISLAND_3_GROUNDED_FREIGHT_ICE_DESCENT',rampPositions,rampIndices,blueIce],
    ['ISLAND_3_FREIGHT_DESCENT_SNOW_SURFACE',rampSnowPositions,rampSnowIndices,materials.snow],
  ] as const) {
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const uv:number[]=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]*.18,positions[i+2]*.18);
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;mesh.receiveShadow=true;terrain.add(mesh);
  }
  root.userData.freightRampSamples=rampSamples;
  root.userData.freightRampWidth=3.8;
  // Connected ridgelines, rather than floating conical islands, sit directly
  // on the frozen sea well beyond all board approaches and moving skimmers.
  const horizonMaterial=new THREE.MeshStandardMaterial({color:0x7997aa,roughness:1});
  const horizonCount=quality==='low'?5:8;
  for(let cluster=0;cluster<horizonCount;cluster++) {
    const angle=cluster/horizonCount*Math.PI*2+.18;
    const radius=34+(cluster%3)*3;
    const width=7.5+(cluster%3)*1.2;
    const height=3.5+(cluster%4)*.85;
    const profile=[.02,.16,.31,.47,.55,.72,.66,.84,1,.86,.73,.78,.54,.37,.18,.02];
    const crossSections=[-1,-.5,0,.5,1];
    const rowHeight=[0,.55,1,.46,0];
    const vertices:number[]=[];const indices:number[]=[];
    const positionAt=(column:number,cross:number)=>{
      const phase=column/(profile.length-1);
      const x=(phase-.5)*width;
      const ridgeZ=Math.sin(column*.72+cluster)*.36;
      const row=THREE.MathUtils.clamp((cross+1)*2,0,3.999);
      const lower=Math.floor(row),blend=row-lower;
      const fraction=THREE.MathUtils.lerp(rowHeight[lower],rowHeight[lower+1],blend);
      return new THREE.Vector3(x,height*profile[column]*fraction,ridgeZ+cross*(2.8+.25*Math.sin(column)));
    };
    for(let column=0;column<profile.length;column++) {
      for(let row=0;row<crossSections.length;row++) vertices.push(...positionAt(column,crossSections[row]).toArray());
      if(column<profile.length-1)for(let row=0;row<4;row++) {
        const a=column*5+row,b=a+5;
        indices.push(a,a+1,b,a+1,b+1,b);
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    const uv:number[]=[];for(let i=0;i<vertices.length;i+=3)uv.push(vertices[i]/width,vertices[i+2]/6);
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const crag=new THREE.Mesh(geometry,horizonMaterial);crag.name='ISLAND_3_GROUNDED_DISTANT_CRAG_RIDGELINE';
    crag.position.set(Math.cos(angle)*radius,-2.80,Math.sin(angle)*radius);crag.rotation.y=-angle+Math.PI/2;ridges.add(crag);
    // One continuous snow shoulder conforms to the rock on both sides of its
    // ridge. Irregular lower edges expose broad rock slopes; no summit disks.
    const snowVertices:number[]=[];const snowIndices:number[]=[];
    for(let column=0;column<profile.length;column++) {
      const left=-.55-.13*Math.sin(column*1.3+cluster);
      const right=.56+.12*Math.cos(column*.9+cluster);
      for(const cross of [left,0,right]) {
        const v=positionAt(column,cross);v.y+=.025;snowVertices.push(...v.toArray());
      }
      if(column<profile.length-1)for(let row=0;row<2;row++) {
        const a=column*3+row,b=a+3;snowIndices.push(a,a+1,b,a+1,b+1,b);
      }
    }
    const snowGeometry=new THREE.BufferGeometry();snowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(snowVertices,3));
    const snowUv:number[]=[];for(let i=0;i<snowVertices.length;i+=3)snowUv.push(snowVertices[i]/width,snowVertices[i+2]/6);
    snowGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(snowUv,2));snowGeometry.setIndex(snowIndices);snowGeometry.computeVertexNormals();
    const snow=new THREE.Mesh(snowGeometry,materials.snow);snow.name='ISLAND_3_CONTINUOUS_SLOPED_CRAG_SNOW_SHOULDER';crag.add(snow);
  }
  root.userData.groundedHorizonCragCount=horizonCount;
  const positions: Array<[number, number, number]> = [];
  const pineCount = quality === 'high' ? 36 : quality === 'medium' ? 26 : 18;
  const plots = [[-4.36,-3.9],[4.36,-3.9],[-4.36,3.9],[4.36,3.9]];
  for (let i = 0; i < pineCount; i++) {
    const a = i / pineCount * Math.PI * 2 + .11;
    const x = Math.cos(a) * (5.45 + i % 3 * .28);
    const z = Math.sin(a) * (5.2 + i % 3 * .24);
    if (plots.some(([px,pz]) => Math.hypot(x-px,z-pz) < 1.82)) continue;
    const h = (z > 2 ? 1.05 : 1.65) + i % 4 * .19;
    positions.push([x,z,h]);
  }
  for (const [index, [x,z,h]] of positions.entries()) {
    const tree = createIsland3SnowTree(materials, quality, h, index * .71);
    tree.position.set(x, .37, z);
    planting.add(tree);
  }
  // Low banks provide plant variety without filling the route or obscuring
  // secondary landmarks. All repeated geometry is compacted below.
  const berryMaterial=new THREE.MeshStandardMaterial({color:0x923d43,roughness:.82});
  const grassMaterial=new THREE.MeshStandardMaterial({color:0xa5b9b0,roughness:1,side:THREE.DoubleSide});
  const berryGeo=new THREE.IcosahedronGeometry(.045,0);
  let shrubCount=0;
  for(const [index,[x,z]] of positions.entries()) {
    if(index%2)continue;
    const bank=new THREE.Group();bank.name='ISLAND_3_JUNIPER_ROWAN_AND_FROST_GRASS_BANK';bank.position.set(x*.91,.38,z*.91);
    for(let lobe=0;lobe<3;lobe++) {
      const a=lobe/3*Math.PI*2+index;
      const shrub=new THREE.Mesh(ridgeGeo,materials.pine);shrub.position.set(Math.cos(a)*.18,.16,Math.sin(a)*.18);shrub.scale.set(.27,.2,.24);bank.add(shrub);
      const cap=new THREE.Mesh(ridgeGeo,materials.snow);cap.position.copy(shrub.position);cap.position.y+=.13;cap.scale.set(.22,.055,.18);bank.add(cap);
      for(let b=0;b<3;b++) {
        const berry=new THREE.Mesh(berryGeo,berryMaterial);berry.position.set(Math.cos(a)*.25+(b-1)*.065,.27+(b%2)*.06,Math.sin(a)*.25+.04);bank.add(berry);
      }
    }
    const blades:number[]=[];
    for(let blade=0;blade<7;blade++) {
      const a=blade/7*Math.PI*2;const gx=Math.cos(a)*.4,gz=Math.sin(a)*.4;
      blades.push(gx-.025,0,gz,gx+.025,0,gz,gx+Math.cos(a)*.08,.2+(blade%3)*.04,gz+Math.sin(a)*.08);
    }
    const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));grassGeo.computeVertexNormals();bank.add(new THREE.Mesh(grassGeo,grassMaterial));
    planting.add(bank);shrubCount++;
  }
  // Three semantic batches, each retaining material buckets and shadow state.
  // Dynamic wildlife and mission surfaces never enter these compacted roots.
  for (const part of [terrain,ridges,planting]) compactStaticGeometry(part);
  root.userData.representativeSlice = 'keep-frozen-world-macro-v001';
  root.userData.plantedFirCount = positions.length;
  root.userData.plantedShrubBankCount = shrubCount;
  return root;
}
