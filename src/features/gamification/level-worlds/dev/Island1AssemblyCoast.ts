import * as THREE from 'three';
import { ISLAND_1_OCEAN_SURFACE_Y, type Island1WorldMaterials } from './Island1ThreeWorld';
import type { Island3DQuality } from './island5ThreePilotContract';

/** Island 001's outer-cliff waterfall; all scenery stays beyond the playable crown. */
export function createAssemblyHeroCoast(quality: Island3DQuality, materials: Island1WorldMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_001_HERO_WATERFALL_COAST';
  root.userData.presentationOnly = true;
  const seaY = ISLAND_1_OCEAN_SURFACE_Y;
  const water = new THREE.MeshStandardMaterial({ color: 0x4ecbd9, emissive: 0x124c63, emissiveIntensity: 0.25, roughness: 0.24, metalness: 0.12, side: THREE.DoubleSide });
  const foam = new THREE.MeshBasicMaterial({ color: 0xdbffff, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
  const rock = new THREE.MeshStandardMaterial({ color: 0xb8aa8b, roughness: 0.94 });
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.29, 6.3), new THREE.Vector3(0, 0.2, 6.65),
    new THREE.Vector3(0.05, -0.4, 7.05), new THREE.Vector3(-0.06, -1.25, 7.27),
    new THREE.Vector3(0, -2.5, 7.42), new THREE.Vector3(0,-3.57,7.26),
  ]);
  const channelPoints=Array.from({length:25},(_,i)=>{const t=i/24;return new THREE.Vector3(Math.sin(t*Math.PI)*.12,.285-t*.012,4.34+t*1.98);});
  const channelVertices:number[]=[],channelIndices:number[]=[];
  channelPoints.forEach((p,i)=>{const width=.22+i/24*.38;channelVertices.push(p.x-width,p.y,p.z,p.x+width,p.y,p.z);if(i<24){const n=i*2;channelIndices.push(n,n+2,n+1,n+1,n+2,n+3);}});
  const channelGeometry=new THREE.BufferGeometry();channelGeometry.setAttribute('position',new THREE.Float32BufferAttribute(channelVertices,3));channelGeometry.setIndex(channelIndices);channelGeometry.computeVertexNormals();
  const channel=new THREE.Mesh(channelGeometry,water);channel.name='HERO_CASCADE_UPSTREAM_SPRING_CHANNEL';root.add(channel);
  const bankMaterial=new THREE.MeshStandardMaterial({color:0xc6b99b,roughness:.85});
  for(const side of [-1,1]) {
    const points=channelPoints.map((p,i)=>p.clone().add(new THREE.Vector3(side*(.25+i/24*.4),-.025,0)));
    const bank=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.065,6,false),bankMaterial);root.add(bank);
  }
  const arch=new THREE.Shape();arch.moveTo(-.86,.25);arch.lineTo(-.86,.62);arch.quadraticCurveTo(0,.98,.86,.62);arch.lineTo(.86,.25);arch.lineTo(.61,.25);arch.quadraticCurveTo(0,.75,-.61,.25);arch.closePath();
  const bridge=new THREE.Mesh(new THREE.ExtrudeGeometry(arch,{depth:.40,bevelEnabled:false,curveSegments:20}),bankMaterial);bridge.position.z=5.13;bridge.name='ISLAND_001_SPRING_STONE_FOOTBRIDGE';bridge.castShadow=true;root.add(bridge);
  for(const z of [5.13,5.53]) {
    const points=Array.from({length:21},(_,i)=>{const x=-.85+i/20*1.7;return new THREE.Vector3(x,.66+.18*(1-(x/.85)**2),z);});
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.033,5,false),bankMaterial));
  }
  const segments = quality === 'low' ? 16 : 32;
  const vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, p = path.getPoint(t);
    const width = 1.12 + t * 0.06 + Math.sin(t * Math.PI * 3) * 0.035;
    vertices.push(p.x - width, p.y, p.z, p.x + width, p.y + 0.025 * Math.sin(t * 9), p.z);
    if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const curtain = new THREE.Mesh(geometry, water);
  curtain.name = 'HERO_CASCADE_WATER_CURTAIN';
  root.add(curtain);
  const source = new THREE.Mesh(new THREE.CircleGeometry(0.64, 24), water);
  source.name = 'HERO_CASCADE_SPRING_POOL';
  source.rotation.x = -Math.PI / 2; source.scale.set(1.18, 0.8, 1);
  source.position.set(0, 0.285, 6.18); root.add(source);

  const dummy = new THREE.Object3D();
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rock, 18);
  rocks.name = 'HERO_CASCADE_ERODED_ROCK_SHOULDERS';
  for (let i = 0; i < rocks.count; i++) {
    const side = i % 2 === 0 ? -1 : 1, row = Math.floor(i / 2), t = row / 8;
    const point = path.getPoint(t);
    dummy.position.set(side * (1.55 + Math.sin(row * 2.1) * 0.09), point.y - 0.18, point.z - 0.08);
    dummy.rotation.set(row * 0.3, row * 1.7, side * 0.2);
    dummy.scale.set(0.35 + row % 3 * 0.07, 0.25 + row % 2 * 0.14, 0.38);
    dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
  }
  root.add(rocks);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), materials.moonstone);
  lip.name = 'HERO_CASCADE_SPRING_LIP'; lip.position.set(0, 0.18, 6.45); root.add(lip);
  const streakCount = quality === 'low' ? 10 : quality === 'medium' ? 18 : 26;
  const streaks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3), foam, streakCount);
  streaks.name = 'HERO_CASCADE_FLOW_STREAKS'; streaks.frustumCulled = false; root.add(streaks);
  const sprayCount = quality === 'low' ? 6 : quality === 'medium' ? 12 : 18;
  const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3), foam, sprayCount);
  spray.name = 'HERO_CASCADE_PLUNGE_SPRAY'; spray.frustumCulled = false; root.add(spray);
  const ringGeometry = new THREE.RingGeometry(0.82, 1, quality === 'low' ? 20 : 36);
  ringGeometry.rotateX(-Math.PI / 2);
  const ringFoam = foam.clone(); ringFoam.opacity = .24;
  const rings = new THREE.InstancedMesh(ringGeometry, ringFoam, 4);
  rings.name = 'HERO_CASCADE_SEA_IMPACT_RINGS'; rings.frustumCulled = false; root.add(rings);
  const tangent = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let previousFlow=-1,previousDraining=false;
  function animate(elapsed: number, rawFlow=1, draining=false) {
    // A newly mounted Three Timer can report a slightly negative first frame.
    // Curve sampling requires [0, 1], including immediately after remount.
    elapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
    const flow=THREE.MathUtils.clamp(Number.isFinite(rawFlow)?rawFlow:1,0,1);
    const active=flow>.001;
    root.userData.waterfallFlow=flow;
    [curtain,streaks,spray,rings].forEach(mesh=>mesh.visible=active);
    // Turn-off drains from the lip down; restart grows a falling sheet from the lip.
    // The source pool and upstream spring remain, rather than vanishing the whole coast.
    if(flow!==previousFlow||draining!==previousDraining){
      const attr=geometry.getAttribute('position');
      for(let i=0;i<=segments;i++){
        const t=(draining?1-flow:0)+i/segments*flow,p=path.getPoint(t);
        const width=1.12+t*.06+Math.sin(t*Math.PI*3)*.035;
        attr.setXYZ(i*2,p.x-width,p.y,p.z);
        attr.setXYZ(i*2+1,p.x+width,p.y+.025*Math.sin(t*9),p.z);
      }
      attr.needsUpdate=true;geometry.computeVertexNormals();
      previousFlow=flow;previousDraining=draining;
    }
    foam.opacity=.72*flow;ringFoam.opacity=.24*flow;
    if(!active)return;
    for (let i = 0; i < streakCount; i++) {
      const t = (draining?1-flow:0)+((elapsed * 0.48 + i * 0.618034) % 1)*flow;
      const p = path.getPoint(t); tangent.copy(path.getTangent(t));
      dummy.position.copy(p); dummy.position.x += Math.sin(i * 2.39) * (0.51 + t * 0.14); dummy.position.z += 0.03;
      dummy.quaternion.setFromUnitVectors(up, tangent);
      dummy.scale.set(0.025 + i % 3 * 0.009, 0.1 + t * 0.13, 0.018); dummy.updateMatrix(); streaks.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < sprayCount; i++) {
      const t = (elapsed * 0.7 + i / sprayCount) % 1, a = i * 2.39996;
      dummy.position.set(Math.cos(a) * (0.5 + t * 0.55), seaY + 0.1 + Math.sin(t * Math.PI) * 0.42, 7.62 + Math.sin(a) * t * 0.46);
      dummy.rotation.set(0, a, 0); dummy.scale.setScalar(0.035 + (1 - t) * 0.04); dummy.updateMatrix(); spray.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < 4; i++) {
      const t = (elapsed * 0.32 + i / 4) % 1;
      dummy.position.set(0, seaY + 0.025 + i * 0.002, 7.7);
      dummy.rotation.set(0, 0, 0); dummy.scale.set(0.5 + t * 1.1, 1, 0.28 + t * 0.7); dummy.updateMatrix(); rings.setMatrixAt(i, dummy.matrix);
    }
    [streaks, spray, rings].forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  }
  animate(0);
  return { root, animate };
}
