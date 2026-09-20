import * as THREE from 'three';
import {MarchingCubes} from 'three/examples/jsm/objects/MarchingCubes.js';

/** All dimensions are GREAT_TREE local coordinates, not hull/world coordinates. */
export const OAK_CIRCULATION = Object.freeze({floor: -0.25892857, deckTop: 1.2475, eyeHeight: 0.2, steps: 30});
type Knot = [number, number, number, number];
// Roots, trunk and boughs belong to ONE living surface. These are field guides,
// not visible cylinders: smooth union removes the seams at every fork.
const OAK_PATHS: Knot[][] = [
  [[0,-.30,0,.25],[-.065,.10,.015,.21],[-.025,.43,-.045,.18],[.075,.72,-.095,.15],[.19,1.05,-.13,.12],[.31,1.42,-.12,.09],[.48,1.77,-.10,.028]],
  [[-.02,-.12,0,.22],[-.32,-.23,.12,.13],[-.70,-.29,.24,.035]],
  [[.05,-.12,0,.21],[.34,-.24,.20,.12],[.67,-.29,.36,.028]],
  [[-.02,-.15,-.02,.20],[-.24,-.25,-.30,.12],[-.58,-.30,-.47,.032]],
  [[.04,-.14,-.02,.20],[.36,-.24,-.24,.12],[.71,-.29,-.41,.035]],
  [[-.025,.43,-.045,.18],[-.23,.75,-.06,.145],[-.44,1.02,-.04,.11],[-.64,1.30,.03,.074],[-.97,1.53,.06,.024]],
  [[-.23,.75,-.06,.135],[-.32,1.15,-.20,.095],[-.47,1.57,-.30,.056],[-.72,1.79,-.39,.022]],
  [[.075,.72,-.095,.145],[.39,.96,-.18,.12],[.67,1.19,-.26,.081],[.99,1.43,-.22,.024]],
  [[.19,1.05,-.13,.12],[.34,1.31,.18,.089],[.55,1.58,.36,.061],[.86,1.71,.41,.025]],
  [[.19,1.05,-.13,.12],[.20,1.28,-.40,.084],[.08,1.55,-.63,.045],[-.10,1.75,-.68,.02]],
  [[-.44,1.02,-.04,.10],[-.51,1.36,.23,.075],[-.64,1.60,.48,.04],[-.85,1.72,.55,.02]],
];

function oakGeometry(high: boolean, material: THREE.Material) {
  const resolution = high ? 40 : 32;
  const field = new MarchingCubes(resolution, material, false, false, 16000);
  field.isolation = 0;
  const segments = OAK_PATHS.flatMap(path => path.slice(1).map((b,i) => {
    const a=path[i]; const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
    return {a,b,dx,dy,dz,len2:dx*dx+dy*dy+dz*dz};
  }));
  const center = new THREE.Vector3(0,.77,0);
  const extent = new THREE.Vector3(1.22,1.27,.92);
  for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++) {
    const px=(x/resolution*2-1)*extent.x;
    const py=(y/resolution*2-1)*extent.y+center.y;
    const pz=(z/resolution*2-1)*extent.z;
    let distance=10;
    for(const s of segments) {
      const t=THREE.MathUtils.clamp(((px-s.a[0])*s.dx+(py-s.a[1])*s.dy+(pz-s.a[2])*s.dz)/s.len2,0,1);
      const d=Math.hypot(px-s.a[0]-t*s.dx,py-s.a[1]-t*s.dy,pz-s.a[2]-t*s.dz)-THREE.MathUtils.lerp(s.a[3],s.b[3],t);
      const h=Math.max(.055-Math.abs(distance-d),0)/.055;
      distance=Math.min(distance,d)-h*h*.055*.25;
    }
    field.field[x+y*resolution+z*resolution*resolution]=-distance;
  }
  field.update();
  const geometry=new THREE.BufferGeometry();
  // MarchingCubes preallocates: only live vertices count towards GPU/budgets.
  const count=field.count;
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(field.geometry.getAttribute('position').array.slice(0,count*3),3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(field.geometry.getAttribute('normal').array.slice(0,count*3),3));
  geometry.scale(extent.x,extent.y,extent.z);
  geometry.translate(center.x,center.y,center.z);
  geometry.normalizeNormals();
  geometry.computeBoundingSphere();
  field.geometry.dispose();
  return geometry;
}

function part(parent:THREE.Object3D,name:string,geometry:THREE.BufferGeometry,material:THREE.Material) {
  const mesh=new THREE.Mesh(geometry,material); mesh.name=name;
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.oakStructural=true;
  parent.add(mesh);return mesh;
}

function annularSector(inner:number,outer:number,start:number,end:number,depth:number,segments:number) {
  const shape=new THREE.Shape();
  for(let i=0;i<=segments;i++) {
    const a=THREE.MathUtils.lerp(start,end,i/segments);
    if(i===0)shape.moveTo(Math.cos(a)*outer,-Math.sin(a)*outer);
    else shape.lineTo(Math.cos(a)*outer,-Math.sin(a)*outer);
  }
  for(let i=segments;i>=0;i--) {
    const a=THREE.MathUtils.lerp(start,end,i/segments);
    shape.lineTo(Math.cos(a)*inner,-Math.sin(a)*inner);
  }
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:1});
  g.rotateX(-Math.PI/2);return g;
}

export function addOakStructure(tree:THREE.Group,bark:THREE.Material,timber:THREE.Material,bronze:THREE.Material,high:boolean,geometryOverride?:THREE.BufferGeometry) {
  const oak=part(tree,'great-tree-trunk',geometryOverride ?? oakGeometry(high,bark),bark);
  oak.userData.topology='continuous-sculpt';
  oak.userData.componentId='oak';
  oak.userData.sockets={floor:[0,OAK_CIRCULATION.floor,0],crown:[0,OAK_CIRCULATION.deckTop,0]};
  // Stable semantic alias retained for existing consumers; no second branch mesh.
  const branches=new THREE.Group();branches.name='great-tree-branch-network';oak.add(branches);
  tree.userData.sculptRuntime={version:1,rootMotionNode:'GREAT_TREE',static:true,breakable:false};

  const circulation=new THREE.Group();circulation.name='GREAT_TREE_CIRCULATION';tree.add(circulation);
  circulation.userData.componentId='circulation';
  const {floor,deckTop,steps}=OAK_CIRCULATION;
  const start=2.7;
  const rise=(deckTop-floor)/steps;
  const treadGeometry=annularSector(.84,1.16,0,Math.PI*2/steps,.023,2);
  const treads=new THREE.InstancedMesh(treadGeometry,timber,steps);
  treads.name='great-tree-stair-treads';treads.userData.oakStructural=true;
  treads.userData.rise=rise;treads.userData.startY=floor;treads.userData.endY=deckTop;
  const matrix=new THREE.Matrix4();
  for(let i=0;i<steps;i++) {
    matrix.makeRotationY(-(start+i/steps*Math.PI*2));
    matrix.premultiply(new THREE.Matrix4().makeScale(.64,1,.40));
    matrix.setPosition(-.04,floor+(i+1)*rise-.023,0);treads.setMatrixAt(i,matrix);
  }
  treads.castShadow=true;treads.receiveShadow=true;circulation.add(treads);
  const stairPoint=(t:number,r:number,height:number)=>new THREE.Vector3(-.04+Math.cos(start+t*Math.PI*2)*.64*r,floor+t*(deckTop-floor)+height,Math.sin(start+t*Math.PI*2)*.40*r);
  for(const [name,r,height,radius,mat] of [
    ['great-tree-stair-stringer',1,-.027,.022,bronze],
    ['great-tree-stair-handrail',1.14,.18,.009,timber],
  ] as const) {
    const curve=new THREE.CatmullRomCurve3(Array.from({length:61},(_,i)=>stairPoint(i/60,r,height)));
    part(circulation,name,new THREE.TubeGeometry(curve,high?90:60,radius,5,false),mat);
  }
  const postGeometry=new THREE.CylinderGeometry(.006,.008,.18,5);
  const posts=new THREE.InstancedMesh(postGeometry,bronze,11);posts.name='great-tree-stair-posts';posts.userData.oakStructural=true;
  for(let i=0;i<11;i++){matrix.makeTranslation(...stairPoint(i/10,1.14,.09).toArray());posts.setMatrixAt(i,matrix);}circulation.add(posts);

  const crown=new THREE.Group();crown.name='GREAT_TREE_CROWN_TERRACE_AND_PAVILION';tree.add(crown);
  crown.userData.componentId='crown';
  const deck=part(crown,'great-tree-crown-deck',annularSector(.29,.8,start,Math.PI*2+1.5,.05,high?44:30),timber);
  deck.position.y=deckTop-.05;
  const guardPoints=Array.from({length:49},(_,i)=>{const a=THREE.MathUtils.lerp(start,Math.PI*2+1.5,i/48);return new THREE.Vector3(Math.cos(a)*.78,deckTop+.18,Math.sin(a)*.78);});
  part(crown,'great-tree-crown-guard',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(guardPoints),high?64:40,.008,5,false),bronze);
  const deckPosts=new THREE.InstancedMesh(postGeometry,bronze,18);deckPosts.name='great-tree-crown-posts';deckPosts.userData.oakStructural=true;
  for(let i=0;i<18;i++){const a=THREE.MathUtils.lerp(start,Math.PI*2+1.5,i/17);matrix.makeTranslation(Math.cos(a)*.78,deckTop+.09,Math.sin(a)*.78);deckPosts.setMatrixAt(i,matrix);}crown.add(deckPosts);
  return crown;
}
