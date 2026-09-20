import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Measured GREAT_TREE coordinates. The existing glass roof is immutable. */
export const HOLLOW_OAK = Object.freeze({
  floor: -.25892857, roof: 1.6071429, deckTop: 1.34, centerZ: .10,
  innerX: .45, innerZ: .39, outerX: .58, outerZ: .49,
  stairInner: .12, stairOuter: .36, turns: 2, steps: 64,
  deckX: .90, deckZ: .58, doorHalfAngle: .23, doorHeight: .32,
});

/** One continuous thick wall: exterior, bore, doorway jambs and end annuli.
 * The analytic bore is independent of bark lobes, so roots cannot invade stairs.
 * No sampled SDF, overlapping root cylinders, or convex branch junctions.
 */
export function createHollowOakWall(high: boolean, branchPorts = false) {
  const n = branchPorts ? (high ? 40 : 32) : high ? 64 : 48;
  const {floor, centerZ, doorHalfAngle} = HOLLOW_OAK;
  const levels = [floor-.035, floor, floor+.13, floor+.25, floor+.32, .20, .46, .70, .90, 1.08, 1.22, 1.305];
  const angles = Array.from({length:n+1},(_,i)=>Math.PI/2 + doorHalfAngle + (Math.PI*2-2*doorHalfAngle)*i/n);
  const positions:number[]=[], indices:number[]=[];
  const id=(layer:number,row:number,col:number)=>(layer*levels.length+row)*(n+1)+col;
  for(let layer=0;layer<2;layer++) for(let j=0;j<levels.length;j++) for(let i=0;i<=n;i++) {
    const y=levels[j],a=angles[i];
    const lobe=Math.pow(.5+.5*Math.cos(7*a+.32*Math.sin(y*2)),4);
    const roots=Math.pow(Math.max(0,1-(y-floor)/.50),3);
    const crown=branchPorts ? 0 : Math.pow(Math.max(0,(y-.64)/.665),1.6);
    const ripple=.018*Math.sin(3*a+y*2)+.012*Math.cos(11*a-y);
    const rx=layer ? HOLLOW_OAK.innerX : .54 + .045*lobe + ripple + roots*(.04+.24*lobe) + crown*(.03+.20*lobe);
    const rz=layer ? HOLLOW_OAK.innerZ : .465 + .015*lobe + ripple*.3 + roots*.045*lobe + crown*(.015+.045*lobe);
    positions.push(Math.cos(a)*rx,y,centerZ+Math.sin(a)*rz);
  }
  const quad=(a:number,b:number,c:number,d:number)=>indices.push(a,b,d,b,c,d);
  for(let j=0;j<levels.length-1;j++) for(let i=0;i<n;i++) {
    quad(id(0,j,i),id(0,j+1,i),id(0,j+1,i+1),id(0,j,i+1));
    quad(id(1,j,i+1),id(1,j+1,i+1),id(1,j+1,i),id(1,j,i));
  }
  // The omitted forward wedge forms a real entry opening only below its lintel.
  // Above the doorway it is closed with an additional wall sector, not a patch
  // floating in front of the trunk. All seams reuse the existing corner vertices.
  for(let j=0;j<levels.length-1;j++) {
    if(levels[j] < floor + HOLLOW_OAK.doorHeight - 1e-7) {
      quad(id(0,j,n),id(0,j+1,n),id(1,j+1,n),id(1,j,n));
      quad(id(1,j,0),id(1,j+1,0),id(0,j+1,0),id(0,j,0));
    } else {
      quad(id(0,j,n),id(0,j+1,n),id(0,j+1,0),id(0,j,0));
      quad(id(1,j,0),id(1,j+1,0),id(1,j+1,n),id(1,j,n));
    }
  }
  for(const j of [0,levels.length-1]) for(let i=0;i<n;i++) {
    if(j===0)quad(id(0,j,i+1),id(1,j,i+1),id(1,j,i),id(0,j,i));
    else quad(id(0,j,i),id(1,j,i),id(1,j,i+1),id(0,j,i+1));
  }
  const lintel=levels.findIndex(y=>Math.abs(y-floor-HOLLOW_OAK.doorHeight)<1e-7);
  quad(id(0,lintel,n),id(1,lintel,n),id(1,lintel,0),id(0,lintel,0));
  const top=levels.length-1;
  quad(id(0,top,0),id(1,top,0),id(1,top,n),id(0,top,n));
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  return g;
}

function sector(inner:number,outer:number,start:number,end:number,depth:number,segments:number) {
  const s=new THREE.Shape();
  for(let i=0;i<=segments;i++) {const a=start+(end-start)*i/segments; if(!i)s.moveTo(Math.cos(a)*outer,-Math.sin(a)*outer);else s.lineTo(Math.cos(a)*outer,-Math.sin(a)*outer);}
  for(let i=segments;i>=0;i--) {const a=start+(end-start)*i/segments;s.lineTo(Math.cos(a)*inner,-Math.sin(a)*inner);} s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:1});g.rotateX(-Math.PI/2);return g;
}

function part(parent:THREE.Object3D,name:string,g:THREE.BufferGeometry,mat:THREE.Material,id:string) {
  const m=new THREE.Mesh(g,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;
  m.userData.oakStructural=true;m.userData.componentId=id;parent.add(m);return m;
}

export type OakCirculationDimensions = Readonly<Record<keyof typeof HOLLOW_OAK, number>> & {
  railHeight?: number; railRadius?: number; treadDepth?: number;
};

export function addHollowOakStructure(tree:THREE.Group,bark:THREE.Material,timber:THREE.Material,bronze:THREE.Material,high:boolean,branchedGeometry?:THREE.BufferGeometry,dimensions:OakCirculationDimensions=HOLLOW_OAK) {
  const c=dimensions, rise=(c.deckTop-c.floor)/c.steps;
  const railHeight=c.railHeight??.18, railRadius=c.railRadius??.005, treadDepth=c.treadDepth??.018;
  const stairPostCount=c.turns*8+1, pathSegments=c.turns>2?128:64;
  const wall=part(tree,'great-tree-trunk',branchedGeometry ?? createHollowOakWall(high),bark,'oak');
  wall.userData.topology='continuous-hollow-wall';wall.userData.oakCutawayWall=true;
  wall.userData.sockets={floor:[0,c.floor,c.centerZ],crown:[0,c.deckTop,c.centerZ]};
  const branchAlias=new THREE.Group();branchAlias.name='great-tree-branch-network';wall.add(branchAlias);
  const circulation=new THREE.Group();circulation.name='GREAT_TREE_CIRCULATION';tree.add(circulation);
  circulation.userData.componentId='circulation';
  const start=Math.PI/2, angleStep=c.turns*Math.PI*2/c.steps;
  const treads=new THREE.InstancedMesh(sector(c.stairInner,c.stairOuter,0,angleStep,treadDepth,branchedGeometry?1:2),timber,c.steps);
  treads.name='great-tree-stair-treads';treads.userData={oakStructural:true,componentId:'treads',rise,startY:c.floor,endY:c.deckTop,enclosed:true};
  const matrix=new THREE.Matrix4();
  for(let i=0;i<c.steps;i++) {matrix.makeRotationY(-(start+i*angleStep));matrix.setPosition(0,c.floor+(i+1)*rise-treadDepth,c.centerZ);treads.setMatrixAt(i,matrix);}
  treads.castShadow=true;treads.receiveShadow=true;circulation.add(treads);
  const point=(t:number,r:number,h:number)=>new THREE.Vector3(Math.cos(start+t*c.turns*Math.PI*2)*r,c.floor+t*(c.deckTop-c.floor)+h,c.centerZ+Math.sin(start+t*c.turns*Math.PI*2)*r);
  for(const [name,r,h,thickness,mat,id] of [
    ['great-tree-stair-stringer',c.stairInner+(c.stairOuter-c.stairInner)*.625,-treadDepth,c.railRadius?railRadius*2:.012,bronze,'stringer'],
    ['great-tree-stair-handrail',c.stairInner+railRadius,railHeight,c.railRadius??.007,timber,'stair-handrail'],
  ] as const) {
    const path=new THREE.CatmullRomCurve3(Array.from({length:pathSegments+1},(_,i)=>point(i/pathSegments,r,h)));
    part(circulation,name,new THREE.TubeGeometry(path,c.turns>2?(high?128:96):branchedGeometry?(high?64:48):(high?96:64),thickness,4,false),mat,id);
  }
  const postGeo=new THREE.CylinderGeometry(railRadius,railRadius,railHeight,4);
  const posts=new THREE.InstancedMesh(postGeo,bronze,stairPostCount);posts.name='great-tree-stair-posts';posts.userData={oakStructural:true,componentId:'stair-posts'};
  for(let i=0;i<stairPostCount;i++){matrix.makeTranslation(...point(i/(stairPostCount-1),c.stairInner+railRadius,railHeight/2).toArray());posts.setMatrixAt(i,matrix);}circulation.add(posts);

  const crown=new THREE.Group();crown.name='GREAT_TREE_CROWN_TERRACE_AND_PAVILION';crown.userData.componentId='crown';tree.add(crown);
  // Elliptical outer outline with a circular stairwell, not an ellipse-scaled bore.
  const deckShape=new THREE.Shape();deckShape.absellipse(0,0,c.deckX,c.deckZ,0,Math.PI*2,false,0);
  const hole=new THREE.Path();hole.absarc(0,0,c.stairOuter+.015,0,Math.PI*2,true);deckShape.holes.push(hole);
  const deckGeo=new THREE.ExtrudeGeometry(deckShape,{depth:.05,bevelEnabled:false,curveSegments:branchedGeometry?24:high?32:24});deckGeo.rotateX(-Math.PI/2);
  const deck=part(crown,'great-tree-crown-deck',deckGeo,timber,'crown');deck.position.set(0,c.deckTop-.05,c.centerZ);
  const bridge=part(crown,'great-tree-crown-arrival',new THREE.BoxGeometry(.24,.05,.20),timber,'arrival-bridge');bridge.position.set(0,c.deckTop-.025,c.centerZ+c.stairOuter+.03);
  for(const [name,rx,rz,a,b,id] of [
    ['great-tree-crown-guard',c.deckX-.015,c.deckZ-.015,0,Math.PI*2,'deck-guard'],
    ['great-tree-stairwell-guard',c.stairOuter+.018,c.stairOuter+.018,Math.PI/2+.36,Math.PI*2+Math.PI/2-.36,'stairwell-guard'],
  ] as const) {
    const path=new THREE.CatmullRomCurve3(Array.from({length:49},(_,i)=>{const q=a+(b-a)*i/48;return new THREE.Vector3(Math.cos(q)*rx,c.deckTop+railHeight,c.centerZ+Math.sin(q)*rz);}));
    part(crown,name,new THREE.TubeGeometry(path,branchedGeometry?48:high?64:48,c.railRadius??.006,4,false),bronze,id);
  }
  const guards=new THREE.InstancedMesh(postGeo,bronze,32);guards.name='great-tree-crown-posts';guards.userData={oakStructural:true,componentId:'deck-posts'};
  for(let i=0;i<32;i++) {const outer=i<20;const a=outer?i/20*Math.PI*2:Math.PI/2+.36+(Math.PI*2-.72)*(i-20)/11;matrix.makeTranslation(Math.cos(a)*(outer?c.deckX-.015:c.stairOuter+.018),c.deckTop+railHeight/2,c.centerZ+Math.sin(a)*(outer?c.deckZ-.015:c.stairOuter+.018));guards.setMatrixAt(i,matrix);}crown.add(guards);
  if(branchedGeometry) {
    // Shared post geometry/material is one instanced surface system. Explicit
    // instance ranges retain stair/crown semantic picking without 49 meshes.
    const batchedPosts=new THREE.InstancedMesh(postGeo,bronze,stairPostCount+32);
    batchedPosts.name='great-tree-guard-post-system';batchedPosts.userData={oakStructural:true,componentId:'guard-post-system',partRanges:[{id:'stair-posts',start:0,count:stairPostCount},{id:'deck-posts',start:stairPostCount,count:32}]};
    for(let i=0;i<stairPostCount+32;i++){(i<stairPostCount?posts:guards).getMatrixAt(i<stairPostCount?i:i-stairPostCount,matrix);batchedPosts.setMatrixAt(i,matrix);}
    circulation.remove(posts);crown.remove(guards);posts.dispose();guards.dispose();tree.add(batchedPosts);
    const outer=crown.getObjectByName('great-tree-crown-guard') as THREE.Mesh;
    const inner=crown.getObjectByName('great-tree-stairwell-guard') as THREE.Mesh;
    const outerCount=outer.geometry.index!.count;
    const merged=mergeGeometries([outer.geometry,inner.geometry])!;
    const guard=part(crown,'great-tree-crown-guard-system',merged,bronze,'crown-guard-system');
    guard.userData.partRanges=[{id:'deck-guard',start:0,count:outerCount},{id:'stairwell-guard',start:outerCount,count:inner.geometry.index!.count}];
    crown.remove(outer,inner);outer.geometry.dispose();inner.geometry.dispose();
  }
  tree.userData.sculptRuntime={version:1,rootMotionNode:'GREAT_TREE',static:true,breakable:false,architecture:'hollow-inhabited-oak',dimensions:c};
  return crown;
}
