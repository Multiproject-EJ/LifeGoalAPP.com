import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Island3DQuality } from './island5ThreePilotContract';

/** d021: additive i16 park dressing. No board, landmark or ride transforms owned here. */
export function createIsland19ParkDetails(path: THREE.CurvePath<THREE.Vector3>, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_D021_PARK_DETAILS';
  const buckets: THREE.BufferGeometry[][] = [[], [], []];
  const matte = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .76 });
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .62, roughness: .3 });
  const glow = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffbd59, emissiveIntensity: .45, roughness: .4 });
  const colors = { teal: 0x146567, gold: 0xdcb45e, dark: 0x273e39, wood: 0x84513d, cream: 0xf5dfac, rose: 0xd14769, leaf: 0x226645 };
  const pose = new THREE.Object3D();
  const samples = Array.from({ length: 1500 }, (_, i) => path.getPointAt(i / 1500));
  const accepted: { name: string; center: number[]; radius: number; bounds?: number[][] }[] = [];
  const rejected: string[] = [];
  const safe = (name: string, x: number, y: number, z: number, radius: number, bounds?: number[][]) => {
    // A conservative sphere contains the whole addition. Protect both train
    // body and taller rider, including the curving portals and return track.
    const center = new THREE.Vector3(x, y, z);
    const envelope = bounds ? new THREE.Box3(new THREE.Vector3(...bounds[0] as [number,number,number]), new THREE.Vector3(...bounds[1] as [number,number,number])) : null;
    if ((y - radius < 1.8 && Math.hypot(x, z) - radius < 3.95) || samples.some(p => envelope ? envelope.distanceToPoint(p) < 1.65 : p.distanceTo(center) < radius + 1.65)) {
      rejected.push(name); return false;
    }
    accepted.push({ name, center: center.toArray(), radius, ...(bounds ? {bounds} : {}) }); return true;
  };
  function add(g: THREE.BufferGeometry, position: number[], scale: number[], color: number, bucket = 0, yaw = 0) {
    pose.position.set(position[0], position[1], position[2]);
    pose.scale.set(scale[0], scale[1], scale[2]); pose.rotation.set(0, yaw, 0); pose.updateMatrix();
    const geometry = g.index ? g.toNonIndexed() : g.clone();
    g.dispose(); geometry.applyMatrix4(pose.matrix); geometry.deleteAttribute('uv');
    const c = new THREE.Color(color), count = geometry.getAttribute('position').count;
    const rgb = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) c.toArray(rgb, i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(rgb, 3)); buckets[bucket].push(geometry);
  }
  const box = (p: number[], s: number[], c: number, b = 0, yaw = 0) => add(new THREE.BoxGeometry(1, 1, 1), p, s, c, b, yaw);
  const ball = (p: number[], s: number[], c: number, b = 0) => add(new THREE.SphereGeometry(1, 6, 4), p, s, c, b);
  const post = (p: number[], radius: number, height: number, c: number, b = 1) => add(new THREE.CylinderGeometry(radius, radius, height, 6), p, [1, 1, 1], c, b);

  // Curated peripheral beds: gaps between attractions, not a second tile ring.
  const beds = [[-7.4,1.5],[-7.3,-1.4],[-6.1,4.8],[-4.1,5.65],[4.0,5.7],[6.1,4.65],[7.6,1.1],[7.2,-1.0],[5.7,-4.65],[-5.9,-4.65],[-3.65,-5.85],[3.6,-5.85]];
  beds.forEach(([x,z], i) => {
    if (!safe('garden-'+i, x,.61,z,.77)) return;
    const yaw = Math.atan2(x,z), cs = Math.cos(yaw), sn = Math.sin(yaw);
    const at = (u: number, v: number, y: number) => [x+u*cs+v*sn,y,z-u*sn+v*cs];
    box(at(0,0,.39),[1.15,.18,.6],colors.cream,0,yaw);
    box(at(0,0,.49),[1.03,.10,.49],colors.dark,0,yaw);
    for(let k=0;k<5;k++) ball(at(-.42+k*.21,0,.59),[.19,.13,.2],colors.leaf);
    const count = quality === 'low' ? 7 : 15;
    for(let k=0;k<count;k++) {
      const u = -.44+(k%5)*.22, v = -.15+Math.floor(k/5)*.15;
      const p = at(u,v,.70+(k%3)*.018);
      ball(p,[.055,.043,.055],i%3 === 0 ? 0xf3bd45 : k%2 ? 0xf1a7ae : colors.rose);
    }
  });

  // Low slatted benches with backs, two legs and curved gold arm rests.
  [[-6.8,3.5],[6.8,3.7],[-4.4,-5.0],[4.6,-4.9]].forEach(([x,z], i) => {
    if (!safe('bench-'+i,x,.65,z,.75)) return;
    const yaw = Math.atan2(-x,-z), cs=Math.cos(yaw),sn=Math.sin(yaw);
    const at=(u:number,v:number,y:number)=>[x+u*cs+v*sn,y,z-u*sn+v*cs];
    for(let k=0;k<3;k++) box(at(0,-.15+k*.15,.66),[1.12,.055,.10],colors.wood,0,yaw);
    for(let k=0;k<3;k++) box(at(0,-.20,.85+k*.11),[1.12,.065,.055],colors.wood,0,yaw);
    for(const side of [-1,1]) {
      box(at(side*.44,0,.48),[.065,.32,.4],colors.teal,1,yaw);
      box(at(side*.5,-.18,.88),[.045,.43,.045],colors.gold,1,yaw);
      box(at(side*.5,0,.86),[.055,.055,.38],colors.gold,1,yaw);
    }
  });

  // Lanterns are complete housings (foot, shaft, glass, mullions and cap),
  // not disconnected glowing dots; emissive mesh avoids extra point lights.
  [[-3.15,6.1],[3.15,6.1],[-6.5,4.8],[6.55,4.8],[-7.65,-.2],[7.65,-.8],[-4.8,-4.9],[4.8,-4.9]].forEach(([x,z],i)=>{
    if(!safe('lantern-'+i,x,1.08,z,1.05)) return;
    post([x,.39,z],.15,.16,colors.teal);
    post([x,.93,z],.045,1.04,colors.gold);
    box([x,1.48,z],[.28,.06,.28],colors.teal,1);
    box([x,1.65,z],[.17,.29,.17],colors.cream,2);
    for(const dx of [-.115,.115]) for(const dz of [-.115,.115]) post([x+dx,1.65,z+dz],.017,.34,colors.gold);
    add(new THREE.ConeGeometry(.23,.18,4),[x,1.89,z],[1,1,1],colors.teal,1,Math.PI/4);
    ball([x,2,z],[.035,.055,.035],colors.gold,1);
  });

  // Existing kiosks receive four-sided trim and framed shutters. Their actual
  // walls stay in the static v009 asset, and nothing fills a ride doorway.
  const kiosks = [[-5.7,3.75],[4.7,4.1],[-6.7,-2.85],[3.7,-3.95],[-3.9,-4.35]];
  kiosks.forEach(([x,z],i)=>{
    if(!safe('kiosk-'+i,x,.85,z,1.10)) return;
    for(const side of [-1,1]) {
      box([x+side*.53,.74,z+.49],[.055,.88,.055],colors.teal);
      box([x+side*.53,.74,z-.49],[.055,.88,.055],colors.teal);
      box([x+side*.585,.79,z],[.027,.46,.46],colors.dark);
      for(const edge of [-1,1]) box([x+side*.607,.79,z+edge*.25],[.035,.53,.045],colors.gold,1);
      box([x+side*.608,.79,z],[.035,.035,.5],colors.gold,1);
    }
    box([x,.42,z+.52],[1.12,.10,.08],colors.teal);
    box([x,1.08,z+.52],[.93,.055,.09],colors.gold,1);
    box([x,.81,z+.50],[.78,.35,.045],colors.dark);
    for(let stripe=0;stripe<7;stripe++) {
      box([x-.48+stripe*.16,1.14,z+.68],[.16,.07,.39],stripe%2?colors.cream:colors.rose);
      ball([x-.48+stripe*.16,1.09,z+.85],[.08,.08,.045],stripe%2?colors.cream:colors.rose);
    }
    box([x,.69,z+.65],[.91,.065,.22],colors.wood);
    // Rear service door and gold handle make the opposite survey intentional.
    box([x,.64,z-.485],[.35,.66,.04],colors.teal);
    ball([x+.11,.65,z-.519],[.028,.028,.028],colors.gold,1);
  });

  // Quality-Lord correction: the live front ticket pavilion is distinct from
  // the atlas kiosks. Its actual socket is (-4.5,.42,5.9), not (-5.7,0,3.75).
  if (safe('front-ticket-window',-4.5,1.22,6.56,.96,[[-5.3,.5,6.39],[-3.7,1.9,6.81]])) {
    box([-4.5,1.25,6.475],[1.24,.56,.045],colors.dark);
    for(const side of [-1,1]) box([-4.5+side*.65,1.25,6.51],[.065,.69,.07],colors.gold,1);
    box([-4.5,1.25,6.51],[.04,.56,.07],colors.gold,1);
    box([-4.5,.94,6.57],[1.4,.09,.30],colors.wood);
    for(let i=0;i<9;i++) {
      const x=-5.14+i*.16;
      box([x,1.73,6.53],[.16,.055,.48],i%2?colors.cream:colors.rose);
      ball([x,1.67,6.76],[.08,.095,.045],i%2?colors.cream:colors.rose);
    }
    for(const side of [-1,1]) {
      box([-4.5+side*.64,.76,6.51],[.065,.33,.065],colors.teal);
      box([-4.5+side*.29,1.1,6.515],[.17,.09,.025],colors.cream);
    }
  }

  // Barrel-tower windows/cornices align to the existing palace, with full
  // circumferential construction instead of a front-only decoration sheet.
  const towerX=0,towerZ=-4.32;
  for(let i=0;i<12;i++) {
    const a=i/12*Math.PI*2,x=towerX+Math.sin(a)*1.085,z=towerZ+Math.cos(a)*1.085;
    if(!safe('palace-window-'+i,x,4.92,z,.54)) continue;
    box([x,4.90,z],[.27,.73,.06],colors.dark,0,a);
    const tangent = new THREE.Vector3(Math.cos(a),0,-Math.sin(a));
    for(const side of [-1,1]) box([x+tangent.x*side*.16,4.90,z+tangent.z*side*.16],[.04,.80,.09],colors.gold,1,a);
    box([x,4.88,z],[.30,.035,.09],colors.gold,1,a);
    box([x,4.47,z],[.39,.09,.15],colors.gold,1,a);
    // Rounded arch head is a real volumetric cap above the inset.
    add(new THREE.TorusGeometry(.145,.025,4,10,Math.PI),[x,5.26,z],[1,1,1],colors.gold,1,a);
  }
  [4.12,5.73].forEach(y=>add(new THREE.TorusGeometry(1.105,.038,4,48).rotateX(Math.PI/2),[0,y,towerZ],[1,1,1],colors.gold,1));

  let triangles=0;
  buckets.forEach((parts,i)=>{
    if(!parts.length)return;
    const merged=mergeGeometries(parts,false)!; parts.forEach(g=>g.dispose());
    triangles+=merged.getAttribute('position').count/3;
    const mesh=new THREE.Mesh(merged,[matte,metal,glow][i]);
    mesh.name='ISLAND_19_D021_PARK_DETAIL_BATCH_'+i;
    mesh.castShadow=true;mesh.receiveShadow=true; root.add(mesh);
  });
  root.userData={ decisionId:'d021', gameplayAuthority:false, frozenBoard:true, accepted, rejected, triangles, drawCalls:root.children.length };
  return root;
}
