import * as THREE from 'three';
/** F12 r05: additional bounded refinement, not a new family. Regional ledges
 * and unseen mainland are explicit inferences; original pixels remain authority. */
export const ISLAND_9_BASALT_TERRACE_SPEC={"outerBoundaryXZ":[[8.15,0.4],[7.65,2.6],[6.4,5.4],[4.6,6.85],[2.2,8.0],[-0.7,8.23],[-2.75,7.85],[-5.15,6.62],[-6.8,4.8],[-7.95,2.0],[-8.2,-0.5],[-7.7,-3.1],[-6.3,-5.55],[-4.7,-6.95],[-2,-8.15],[0.5,-8.3],[3,-7.85],[5.45,-6.3],[6.9,-4.6],[8,-2.2]],"controlRegions":[{"id":"front-central-corridor","xz":[[-2.2,4.15],[2,4.15],[1.7,7.8],[-2.4,7.4]],"floor":-0.65},{"id":"rear-central-apron","xz":[[-2.3,-4.12],[2.2,-4.12],[2.65,-6.05],[0.7,-7.3],[-2.4,-6.75]],"floor":-0.4},{"id":"left-connecting-apron","xz":[[-4.12,-2.1],[-4.12,2.1],[-6.5,2.45],[-7.8,0.6],[-7.3,-2.4]],"floor":-0.55},{"id":"right-connecting-apron","xz":[[4.12,-2.2],[6.9,-2.6],[8.1,-0.25],[7,2.6],[4.12,2]],"floor":-0.45},{"id":"front-left-shoulder","xz":[[-6.4,5.4],[-2.6,5.6],[-2.2,7.5],[-4.1,7]],"floor":-0.9},{"id":"front-right-shoulder","xz":[[2.4,5.6],[5.9,5.7],[4.4,7],[2.2,7.8]],"floor":-0.75}],"rearCliffRuns":[{"xz":[[-4.85,-6.25],[-4.35,-6.75],[-3.4,-7.1],[-2.5,-7.2]],"topY":[1.25,1.4,1.15,1.35]},{"xz":[[-2.15,-7.4],[-0.85,-7.78],[0.15,-7.66],[1.2,-7.62]],"topY":[1.6,1.8,1.45,1.65]},{"xz":[[1.55,-7.46],[2.8,-7.3],[3.75,-6.94],[4.6,-6.5]],"topY":[1.1,1.5,1.35,1.2]}],"seamY":-1,"maximumRadius":8.5,"shellJoinY":-6.32,"receiverTransitionScale":1.1,"ambientRadius":48,"farGroundY":-1} as const;
const FROZEN_AMBIENT_SEAM=[[8.15,-1,0.4],[7.65,-1,2.6],[6.4,-1,5.4],[6.142980769230769,-1,5.607043269230769],[6.023215984776403,-1,5.703520456707897],[4.6,-1,6.85],[4.539784946236561,-1,6.878853046594981],[3.931147540983603,-1,7.17049180327869],[2.2,-1,8],[1.4965821389195137,-1,8.055788313120177],[-0.7,-1,8.23],[-2.1009885118888594,-1,7.970304568527919],[-2.75,-1,7.85],[-4.7341688654353575,-1,6.833113456464379],[-5.15,-1,6.62],[-6.010219922380335,-1,5.671151358344115],[-6.248830853325235,-1,5.407956270877619],[-6.4305539358600585,-1,5.207510204081632],[-6.8,-1,4.8],[-7.839917965147323,-1,2.268025823989127],[-7.95,-1,2],[-8.13811659192825,-1,0.11883408071748947],[-8.2,-1,-0.5],[-7.826396735718769,-1,-2.4427369742623997],[-7.758075221238938,-1,-2.798008849557522],[-7.7,-1,-3.1],[-6.3886597938144325,-1,-5.394845360824743],[-6.3,-1,-5.55],[-4.7,-1,-6.95],[-3.709999999999999,-1,-7.390000000000001],[-2,-1,-8.15],[-0.26791808873719525,-1,-8.25392491467577],[0.5,-1,-8.3],[0.765472312703584,-1,-8.252214983713355],[3,-1,-7.85],[3.5021739130434772,-1,-7.532298136645963],[4.140585571012617,-1,-7.128405046910385],[5.45,-1,-6.3],[5.45530649588289,-1,-6.293778591033854],[5.627667984189723,-1,-6.0916996047430825],[5.726190476190476,-1,-5.976190476190475],[6.9,-1,-4.6],[7.759955005624297,-1,-2.723734533183352],[8,-1,-2.2],[8.114092140921409,-1,-0.2224028906955724]] as const;
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
type Tri=[THREE.Vector3,THREE.Vector3,THREE.Vector3];
type Region={id:string;center:THREE.Vector2;outline:THREE.Vector2[];innerScale:number;floor:number;kind:'plot'|'fissure';boundary:THREE.Vector3[]};
const orient=(a:THREE.Vector2,b:THREE.Vector2,p:THREE.Vector3)=>(b.x-a.x)*(p.z-a.y)-(b.y-a.y)*(p.x-a.x);
function ccw(points:THREE.Vector2[]){const area=points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a.x*b.y-b.x*a.y;},0);return area<0?[...points].reverse():points;}
function inside(p:THREE.Vector3,polygon:THREE.Vector2[]){return polygon.every((a,i)=>orient(a,polygon[(i+1)%polygon.length],p)>=-1e-8);}
function split(poly:THREE.Vector3[],a:THREE.Vector2,b:THREE.Vector2){const yes:THREE.Vector3[]=[],no:THREE.Vector3[]=[];for(let i=0;i<poly.length;i++){const u=poly[i],v=poly[(i+1)%poly.length],du=orient(a,b,u),dv=orient(a,b,v),iu=du>=-1e-9,iv=dv>=-1e-9;(iu?yes:no).push(u);if(iu!==iv){const p=u.clone().lerp(v,du/(du-dv));yes.push(p);no.push(p);}}return {yes,no};}
// Remove only repeated/collinear clipping artifacts; preserve polygon corners
// and every physical boundary. Coordinates and receiving constraints are fixed.
function cleanClip(poly:THREE.Vector3[]){const out=poly.filter((p,i)=>p.distanceToSquared(poly[(i+poly.length-1)%poly.length])>1e-18);let changed=true;while(changed&&out.length>3){changed=false;for(let i=0;i<out.length;i++){const a=out[(i+out.length-1)%out.length],b=out[i],c=out[(i+1)%out.length],u=b.clone().sub(a),v=c.clone().sub(b);if(u.dot(v)>=0&&u.clone().cross(v).lengthSq()<=1e-20*u.lengthSq()*v.lengthSq()){out.splice(i,1);changed=true;break;}}}return out;}
function hull(points:THREE.Vector2[]){const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a:THREE.Vector2,b:THREE.Vector2,c:THREE.Vector2)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);const half=(list:THREE.Vector2[])=>{const out:THREE.Vector2[]=[];for(const p of list){while(out.length>1&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p);}return out;};const a=half(sorted),b=half([...sorted].reverse());a.pop();b.pop();return a.concat(b);}
function material(color:number){return new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0});}
function regular(radius:number,n:number){return Array.from({length:n},(_,i)=>new THREE.Vector2(Math.cos(i*Math.PI*2/n)*radius,Math.sin(i*Math.PI*2/n)*radius));}
function geometry(triangles:Tri[]){const vertices:number[]=[],normals:number[]=[];for(const [a,b,c]of triangles){const n=b.clone().sub(a).cross(c.clone().sub(a));if(n.lengthSq()<1e-20)continue;n.normalize();for(const p of [a,b,c]){vertices.push(...p.toArray());normals.push(...n.toArray());}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.computeBoundingBox();g.computeBoundingSphere();return g;}
function mesh(root:THREE.Group,name:string,tris:Tri[],mat:THREE.Material,kind:string){const m=new THREE.Mesh(geometry(tris),mat);m.name=name;m.castShadow=m.receiveShadow=true;m.userData={partId:kind,buildLevel:0,constructionPhase:'persistent-geological-substrate'};root.add(m);return m;}


// Constrained coplanar edge flips preserve every boundary vertex and shared
// edge while replacing poor internal diagonals; no surface position changes.
function conditionTriangles(tris:Tri[]){const key=(p:THREE.Vector3)=>p.toArray().map(x=>Math.round(x*1e8)).join(',');const aspect=(t:Tri)=>Math.max(t[0].distanceToSquared(t[1]),t[1].distanceToSquared(t[2]),t[2].distanceToSquared(t[0]))/t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).length();let total=0;for(let pass=0;pass<20;pass++){const edges=new Map<string,{id:number;a:THREE.Vector3;b:THREE.Vector3;c:THREE.Vector3}[]>();tris.forEach((t,id)=>{for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],c=t[(i+2)%3],k=[key(a),key(b)].sort().join('|'),v=edges.get(k)??[];v.push({id,a,b,c});edges.set(k,v);}});const used=new Set<number>();let flips=0;for(const pair of edges.values()){if(pair.length!==2)continue;const [l,r]=pair;if(used.has(l.id)||used.has(r.id))continue;const {a,b,c}=l,d=r.c,n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();if(Math.abs(d.clone().sub(a).dot(n))>1e-8)continue;const cd=d.clone().sub(c);if(cd.clone().cross(a.clone().sub(c)).dot(n)*cd.clone().cross(b.clone().sub(c)).dot(n)>=-1e-20)continue;let t1:Tri=[c,d,a],t2:Tri=[d,c,b];for(const t of [t1,t2])if(t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).dot(n)<0)[t[1],t[2]]=[t[2],t[1]];if(Math.max(aspect(t1),aspect(t2))>=Math.max(aspect(tris[l.id]),aspect(tris[r.id]))*.95)continue;tris[l.id]=t1;tris[r.id]=t2;used.add(l.id);used.add(r.id);flips++;}total+=flips;if(!flips)break;}return total;}
type Cell={id:string;polygon:THREE.Vector2[];height:number;plane?:number[];bounds?:number[]};
export function applyIsland9BasaltTerraceStructure(environmentRoot:THREE.Object3D,_quality:unknown='high'){
 const old=environmentRoot.getObjectByName('V6_CONDITIONED_SHARED_VERTEX_HEIGHTFIELD'),oldCliff=environmentRoot.getObjectByName('V6_CONNECTED_GEOLOGICAL_ROOT'),collar=environmentRoot.getObjectByName('V6_FLAT_PROTECTED_ROUTE_COLLAR'),bore=environmentRoot.getObjectByName('V4_UNCAPPED_VERTICAL_BORE');
 if(!(old instanceof THREE.Mesh)||!(oldCliff instanceof THREE.Mesh)||!(collar instanceof THREE.Mesh)||!(bore instanceof THREE.Mesh))throw new Error('Expected untouched F06 terrain interfaces');
 if(old.userData.memoryPressReceivingPatch)throw new Error('F11 receiving patch must be disabled');
 const root=new THREE.Group();root.name='ISLAND_9_AUTHORED_BASALT_TERRACES';root.userData={partId:'authored-basalt-substrate',family:12,round:'r05',keepSeparate:true,approval:'unreviewed'};
 const ambient=new THREE.Group();ambient.name='ISLAND_9_AMBIENT_GEOLOGICAL_CONTINUATION';ambient.userData={nonInteractive:true,ambientBackground:true,clickable:false,colliders:[],inference:'Unseen mainland inferred; exact local seam, far groundY-1; underground local shell remains inferred.'};
 const ringAt=(m:THREE.Mesh,y:number,r?:number)=>{const a=m.geometry.getAttribute('position'),map=new Map<string,THREE.Vector3>();for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i);if(Math.abs(p.y-y)>1e-5||(r!==undefined&&Math.abs(Math.hypot(p.x,p.z)-r)>1e-5))continue;map.set(`${Math.round(p.x*1e7)},${Math.round(p.z*1e7)}`,p);}return [...map.values()].sort((a,b)=>Math.atan2(a.z,a.x)-Math.atan2(b.z,b.x));};
 const route=ringAt(collar,.18,4.1),bottom=ringAt(bore,-6.32),outer=ccw(ISLAND_9_BASALT_TERRACE_SPEC.outerBoundaryXZ.map(([x,z])=>new THREE.Vector2(x,z)));
 const v2=(v:THREE.Vector3)=>new THREE.Vector2(v.x,v.z),v3=(v:THREE.Vector2,y=0)=>V(v.x,y,v.y);
 let cells:Cell[]=[{id:'mainland-connecting-ledges',polygon:outer,height:-.75}];
 // Convex difference creates a partition, never overlapping independent slabs.
 const partition=(outline:THREE.Vector2[],id:string,height:number,remove=false,plane?:number[],eligible?:string,protectDrainage=false)=>{const next:Cell[]=[];const poly=ccw(outline),bounds=[Math.min(...poly.map(p=>p.x)),Math.min(...poly.map(p=>p.y)),Math.max(...poly.map(p=>p.x)),Math.max(...poly.map(p=>p.y))];for(const cell of cells){const cb=cell.bounds??(cell.bounds=[Math.min(...cell.polygon.map(p=>p.x)),Math.min(...cell.polygon.map(p=>p.y)),Math.max(...cell.polygon.map(p=>p.x)),Math.max(...cell.polygon.map(p=>p.y))]);if(cb[2]<bounds[0]-1e-9||cb[0]>bounds[2]+1e-9||cb[3]<bounds[1]-1e-9||cb[1]>bounds[3]+1e-9){next.push(cell);continue;}if((eligible&&cell.id!==eligible)||(protectDrainage&&cell.id.includes('fracture'))){next.push(cell);continue;}let rem=cell.polygon.map(v=>v3(v));const outside:THREE.Vector3[][]=[];for(let i=0;i<poly.length&&rem.length;i++){const s=split(rem,poly[i],poly[(i+1)%poly.length]);if(s.no.length>=3)outside.push(cleanClip(s.no));rem=s.yes;}if(rem.length<3){next.push(cell);continue;}for(const out of outside)if(out.length>=3)next.push({...cell,bounds:undefined,polygon:out.map(v2)});if(!remove)next.push({id,height,plane,polygon:cleanClip(rem).map(v2)});}cells=next.filter(c=>Math.abs(c.polygon.reduce((area,a,i)=>{const b=c.polygon[(i+1)%c.polygon.length];return area+a.x*b.y-b.x*a.y;},0))>1e-12);};

 const planeThrough=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3)=>{const n=b.clone().sub(a).cross(c.clone().sub(a));return[-n.x/n.y,-n.z/n.y,n.dot(a)/n.y];};
 const facet=(id:string,points:THREE.Vector3[],eligible?:string,protectDrainage=false)=>{const poly=points.map(v2),plane=planeThrough(points[0],points[1],points[2]);partition(poly,id,points.reduce((s,p)=>s+p.y,0)/points.length,false,plane,eligible,protectDrainage);};

 // Distinct source-informed ridge sections. Each row is independently authored
 // in world X,Y,Z: outer foot, canted crest and inner foot; no scaled rings.
 // Adjacent rows share exact vertices. Long oblique faces replace stepped props.
 const outcropRecords:unknown[]=[],rearRecords:unknown[]=[];
 const ridge=(id:string,rows:number[][][],rear=false)=>{
  const outline=rows.map(r=>new THREE.Vector2(r[0][0],r[0][2])).concat([...rows].reverse().map(r=>new THREE.Vector2(r[2][0],r[2][2])));
  const faces:number[][][]=[];
  for(let j=0;j<rows.length-1;j++)for(let k=0;k<2;k++){
   const a=rows[j][k],b=rows[j+1][k],c=rows[j][k+1],d=rows[j+1][k+1];
   // Alternating diagonals follow distinct cleavage planes, not horizontal tiers.
   if((j+k)%2)faces.push([a,b,d],[a,d,c]);else faces.push([a,b,c],[b,d,c]);
  }
  for(const [i,f]of faces.entries())facet(id+'/'+i,f.map(p=>V(p[0],p[1],p[2])),undefined,true);
  const record={id,rootPolygon:outline.map(p=>p.toArray()),sections:rows,triangularFaces:faces.length,representation:'connected oblique fracture planes; distinct authored crest schedule'};
  outcropRecords.push(record);if(rear)rearRecords.push({id,sections:rows,topY:Math.max(...rows.flat().map(p=>p[1])),rootPolygon:record.rootPolygon});
 };
 // Connected star-shaped shoulder bodies: unequal occupied lobes, not added
 // boulders or overlapping plates. Cap slopes own the shared side-wall heights.
 const ledges=[
 {id:'wisdom-support-ledge',c:[-4.36,3.9],h:-.08,p:[[-6.9,2.25,-.5],[-5.8,2.1,-.28],[-5.3,2.35,-.17],[-3.25,2.18,-.35],[-2.85,3.15,-.21],[-2.55,4.60,-.42],[-3.1,5.80,-.65],[-4.2,5.62,-.33],[-5.0,5.95,-.53],[-6.4,5.4,-.72],[-6.7,4.35,-.31]]},
 {id:'habit-support-ledge',c:[4.36,-3.9],h:0,p:[[2.65,-5.75,-.5],[3.8,-5.6,-.23],[4.8,-6.08,-.52],[5.7,-6.10,-.62],[6.25,-4.85,-.36],[6.05,-4.25,-.18],[6.35,-3.45,-.42],[5.8,-2.13,-.25],[4.9,-2.03,0],[4.0,-2.12,0],[2.75,-2.20,-.37],[2.57,-3.3,-.26]]},
 {id:'hatchery-support-ledge',c:[-4.36,-3.9],h:-.1,p:[[-6.35,-5.4,-.55],[-5.35,-5.65,-.27],[-4.6,-5.45,-.20],[-3.35,-5.80,-.49],[-2.65,-4.30,-.28],[-2.8,-3.30,-.19],[-3.10,-2.25,-.44],[-4.30,-2.05,-.26],[-5.1,-2.36,-.17],[-6.50,-2.65,-.52],[-6.24,-3.85,-.3]]},
 {id:'event-support-ledge',c:[4.36,3.9],h:-.1,p:[[2.75,2.20,-.32],[4.0,2.07,-.25],[4.8,2.36,-.18],[6.35,2.45,-.56],[6.13,3.7,-.26],[6.55,4.6,-.48],[6.15,5.50,-.67],[4.75,5.83,-.34],[4.15,5.56,-.21],[3.4,5.9,-.51],[2.55,4.40,-.45],[2.82,3.7,-.22]]}];
 for(const l of ledges)for(let i=0;i<l.p.length;i++){const a=l.p[i],b=l.p[(i+1)%l.p.length];facet(l.id,[V(l.c[0],l.h,l.c[1]),V(a[0],a[2],a[1]),V(b[0],b[2],b[1])]);}
 for(const c of [...ISLAND_9_BASALT_TERRACE_SPEC.controlRegions].reverse()){
  const center=c.xz.reduce((s,p)=>s.add(new THREE.Vector2(...p)),new THREE.Vector2()).multiplyScalar(1/c.xz.length);
  const offsets=c.id==='front-central-corridor'?[.025,-.035,.02,-.035]:c.id==='rear-central-apron'?[.12,-.08,.26,-.12,.15]:[.30,-.14,.18,-.19,.22];
  for(let i=0;i<c.xz.length;i++){const a=c.xz[i],b=c.xz[(i+1)%c.xz.length];facet(c.id,[V(center.x,c.floor,center.y),V(a[0],c.floor+offsets[i],a[1]),V(b[0],c.floor+offsets[(i+1)%c.xz.length],b[1])]);}
 }
 // Full-depth fracture cells reach real named ledge boundaries; only their
 // owning apron is cut, so branches terminate at existing geological joints.
 const fractures=[{id:'front-fracture',owner:'front-central-corridor',floor:-.87,path:[[.15,4.05],[-.18,5.5],[.20,6.25],[-.12,7.9]]},{id:'front-fracture-branch',owner:'front-central-corridor',floor:-.87,path:[[.20,6.25],[-1.10,6.38],[-2.6,6.42]]},{id:'rear-fracture',owner:'rear-central-apron',floor:-.62,path:[[.25,-4.02],[-.12,-5.32],[.22,-5.88],[.7,-7.5]]},{id:'rear-fracture-branch',owner:'rear-central-apron',floor:-.62,path:[[.22,-5.88],[-1.05,-6.15],[-2.65,-6.52]]}];
 for(const f of fractures)for(let i=0;i<f.path.length-1;i++){const a=new THREE.Vector2(...f.path[i] as [number,number]),b=new THREE.Vector2(...f.path[i+1] as [number,number]),n=new THREE.Vector2(-(b.y-a.y),b.x-a.x).normalize().multiplyScalar(.12);partition([a.clone().add(n),a.clone().sub(n),b.clone().sub(n),b.clone().add(n)],f.id,f.floor,false,undefined,f.owner);}

 // Independently positioned compound ridges: source tall rear cliffs and
 // clustered unequal spires; hidden rear closure is inferred. End sections
 // descend into apron, broad feet replace adjoining ground caps in this graph.
 ridge('rear-west-fractured-ridge',[
 [[-4.65,-.55,-6.78],[-4.28,.36,-6.55],[-3.92,-.38,-6.23]],
 [[-3.82,-.60,-7.27],[-3.54,1.31,-6.98],[-3.25,-.32,-5.97]],
 [[-3.04,-.70,-7.61],[-2.83,.75,-7.10],[-2.75,-.30,-5.81]],
 [[-2.53,-.67,-7.78],[-2.48,1.52,-7.22],[-2.18,-.37,-5.96]],
 [[-2.25,-.63,-7.84],[-2.08,.12,-6.81],[-1.93,-.4,-6.0]]],true);
 ridge('rear-central-split-ridge',[
 [[-1.94,-.70,-7.94],[-1.66,.28,-7.04],[-1.50,-.38,-6.0]],
 [[-1.15,-.72,-8.05],[-1.22,1.79,-7.52],[-.83,-.30,-5.88]],
 [[-.43,-.7,-8.05],[-.39,.87,-7.47],[-.20,-.4,-5.66]],
 [[.17,-.65,-8.0],[.30,1.47,-7.54],[.56,-.35,-5.82]],
 [[.89,-.6,-7.94],[.78,.26,-7.02],[1.05,-.4,-5.91]]],true);
 ridge('rear-east-cleavage',[
 [[1.3,-.65,-7.82],[1.51,.17,-7.2],[1.66,-.4,-6.05]],
 [[2.03,-.55,-7.75],[2.39,1.35,-7.08],[2.47,-.36,-5.94]],
 [[2.83,-.60,-7.53],[2.89,.66,-6.87],[3.07,-.42,-6.01]],
 [[3.54,-.54,-7.22],[3.63,1.15,-6.85],[3.62,-.46,-6.17]],
 [[4.28,-.65,-6.76],[4.12,.15,-6.58],[3.98,-.46,-6.39]]],true);
 ridge('left-apron-cleft-spine',[
 [[-7.30,-.60,-1.90],[-6.84,-.05,-1.84],[-5.78,-.42,-1.60]],
 [[-7.72,-.62,-1.1],[-7.08,.67,-.93],[-5.24,-.20,-.89]],
 [[-7.84,-.67,-.23],[-7.15,1.17,-.15],[-5.02,-.38,-.11]],
 [[-7.67,-.63,.42],[-6.78,.38,.69],[-4.90,-.29,.52]],
 [[-7.39,-.55,1.24],[-6.93,.81,1.14],[-5.38,-.22,1.28]],
 [[-6.92,-.49,1.72],[-6.65,-.12,1.67],[-5.78,-.38,1.74]]]);
 ridge('right-apron-oblique-spine',[
 [[7.04,-.42,-1.91],[6.76,.12,-1.63],[5.81,-.34,-1.47]],
 [[7.56,-.58,-1.27],[6.98,.94,-1.11],[5.27,-.18,-.81]],
 [[7.78,-.63,-.49],[7.06,.46,-.35],[4.99,-.28,-.04]],
 [[7.65,-.6,.33],[6.92,1.23,.66],[5.10,-.17,.63]],
 [[7.37,-.55,1.21],[6.77,.39,1.23],[5.51,-.33,1.39]],
 [[7.0,-.54,1.73],[6.59,-.1,1.78],[5.88,-.4,1.78]]]);
 ridge('front-west-fault-shoulder',[
 [[-1.91,-.75,7.71],[-1.87,-.30,7.08],[-1.61,-.65,5.85]],
 [[-1.39,-.74,7.91],[-1.36,.97,7.47],[-1.08,-.38,5.52]],
 [[-.75,-.73,7.96],[-.78,.34,7.34],[-.54,-.48,5.84]],
 [[-.40,-.70,7.88],[-.42,.73,7.5],[-.34,-.62,6.5]],
 [[-.30,-.72,7.75],[-.28,-.30,7.13],[-.25,-.65,6.60]]]);
 ridge('front-east-broken-shoulder',[
 [[.43,-.68,7.95],[.48,-.19,7.10],[.49,-.65,6.53]],
 [[.86,-.66,7.94],[.94,1.07,7.34],[.92,-.36,5.42]],
 [[1.40,-.67,7.83],[1.35,.40,7.19],[1.55,-.41,5.47]],
 [[1.97,-.66,7.60],[1.83,.83,7.05],[2.03,-.52,6.13]],
 [[2.09,-.68,7.47],[2.15,-.12,7.05],[2.23,-.65,6.47]]]);
 const regions:Region[]=[];
 const addPlot=(id:string,x:number,z:number,floor:number,p:THREE.Vector2[])=>regions.push({id,center:new THREE.Vector2(x,z),floor,kind:'plot',innerScale:1/1.10,outline:ccw(p.map(v=>new THREE.Vector2(x+v.x*1.10,z+v.y*1.10))),boundary:[]});
 addPlot('wisdom',-4.36,3.9,-.04,[[-1.22,.68],[-.72,1.20],[.22,1.43],[1.19,.72],[1.30,.12],[.90,-.71],[.10,-.96],[-.91,-.64],[-1.27,-.06]].map(p=>new THREE.Vector2(...p as [number,number])));
 addPlot('habit',4.36,-3.9,0,hull([...regular(1.33,16),new THREE.Vector2(-.195,1.44),new THREE.Vector2(.295,1.44)]));
 addPlot('hatchery',-4.36,-3.9,-.05,regular(1.43,16));addPlot('event',4.36,3.9,-.05,regular(1.43,16));
 for(const r of regions)partition(r.outline,r.id,r.floor,true);
 partition(route.map(v2),'protected-route',.18,true);
 // Canonicalise coordinates and split all collinear graph edges at every
 // incident vertex. Boundary ownership then uses complete matching segments.
 const frozenSnapVertices=[...route.map(v2),...regions.flatMap(r=>r.outline)],snapLog:{from:number[];to:number[];distance:number}[]=[];const numericWelds:{from:number[];to:number[];distance:number}[]=[],weldGrid=new Map<string,THREE.Vector2[]>();const canonical=new Map<string,THREE.Vector2>();const canon=(input:THREE.Vector2)=>{let p=input;const boundaries=[route.map(v2),...regions.map(r=>r.outline)];const candidate=frozenSnapVertices.find(v=>v.distanceToSquared(p)<=.005*.005&&boundaries.some(poly=>poly.some((a,i)=>{const b=poly[(i+1)%poly.length];if(a.distanceToSquared(v)>1e-16&&b.distanceToSquared(v)>1e-16)return false;const d=b.clone().sub(a),t=p.clone().sub(a).dot(d)/d.lengthSq();return t>=-1e-8&&t<=1+1e-8&&Math.abs(d.x*(p.y-a.y)-d.y*(p.x-a.x))<2e-7*d.length();})));if(candidate&&candidate.distanceToSquared(p)>1e-18){snapLog.push({from:p.toArray(),to:candidate.toArray(),distance:p.distanceTo(candidate)});p=candidate;}const key=`${Math.round(p.x*1e7)},${Math.round(p.y*1e7)}`;const old=canonical.get(key);if(old)return old;const gx=Math.floor(p.x*1e5),gz=Math.floor(p.y*1e5);for(let x=gx-1;x<=gx+1;x++)for(let z=gz-1;z<=gz+1;z++)for(const q of weldGrid.get(`${x},${z}`)??[]){if(q.distanceToSquared(p)<=4e-12){numericWelds.push({from:p.toArray(),to:q.toArray(),distance:p.distanceTo(q)});return q;}}canonical.set(key,p);const gk=`${gx},${gz}`,bucket=weldGrid.get(gk)??[];bucket.push(p);weldGrid.set(gk,bucket);return p;};
 for(const p of [...outer,...FROZEN_AMBIENT_SEAM.map(([x,,z])=>new THREE.Vector2(x,z)),...route.map(v2),...regions.flatMap(r=>r.outline)])canon(p);
 for(const c of cells)c.polygon=cleanClip(c.polygon.map(canon).map(p=>v3(p))).map(v2);cells=cells.filter(c=>c.polygon.length>=3&&Math.abs(c.polygon.reduce((sum,a,i)=>{const b=c.polygon[(i+1)%c.polygon.length];return sum+a.x*b.y-b.x*a.y;},0))>1e-12);
 for(const p of [...outer,...FROZEN_AMBIENT_SEAM.map(([x,,z])=>new THREE.Vector2(x,z)),...route.map(v2),...regions.flatMap(r=>r.outline)])canon(p);
 let vertices=[...canonical.values()];
 const onEdge=(p:THREE.Vector2,a:THREE.Vector2,b:THREE.Vector2,tolerance=2e-7)=>{const d=b.clone().sub(a),len=d.length(),t=p.clone().sub(a).dot(d)/(len*len);return Math.abs(d.x*(p.y-a.y)-d.y*(p.x-a.x))<=tolerance*len&&t>=-1e-8&&t<=1+1e-8;};
 let indexedVertices:THREE.Vector2[]|undefined,vertexGrid=new Map<string,THREE.Vector2[]>();
 const edgeCandidates=(a:THREE.Vector2,b:THREE.Vector2)=>{if(indexedVertices!==vertices){vertexGrid=new Map();for(const p of vertices){const k=`${Math.floor(p.x)},${Math.floor(p.y)}`,list=vertexGrid.get(k)??[];list.push(p);vertexGrid.set(k,list);}indexedVertices=vertices;}const result:THREE.Vector2[]=[];for(let x=Math.floor(Math.min(a.x,b.x)-1e-6);x<=Math.floor(Math.max(a.x,b.x)+1e-6);x++)for(let z=Math.floor(Math.min(a.y,b.y)-1e-6);z<=Math.floor(Math.max(a.y,b.y)+1e-6);z++)result.push(...(vertexGrid.get(`${x},${z}`)??[]));return result;};
 const conform=(polygon:THREE.Vector2[])=>polygon.flatMap((a,i)=>{const b=polygon[(i+1)%polygon.length],d=b.clone().sub(a);return edgeCandidates(a,b).filter(p=>onEdge(p,a,b)&&p.distanceToSquared(b)>1e-14).sort((p,q)=>p.clone().sub(a).dot(d)-q.clone().sub(a).dot(d));});
 for(const c of cells)c.polygon=conform(c.polygon);
 // Merge same-owner convex fragments before triangulation. Shared vertices
 // remain until a global degree-two test proves they are redundant everywhere.
 const pk=(p:THREE.Vector2)=>`${Math.round(p.x*1e7)},${Math.round(p.y*1e7)}`;
 let merged=true;while(merged){merged=false;const map=new Map<string,number>(),used=new Set<number>(),removed=new Set<number>();for(let i=0;i<cells.length;i++){if(used.has(i))continue;const c=cells[i];for(let k=0;k<c.polygon.length;k++){const a=c.polygon[k],b=c.polygon[(k+1)%c.polygon.length],edge=[pk(a),pk(b)].sort().join('|'),j=map.get(edge);if(j===undefined){map.set(edge,i);continue;}if(used.has(j)||j===i)continue;const d=cells[j];if(c.id!==d.id||c.height!==d.height||JSON.stringify(c.plane)!==JSON.stringify(d.plane))continue;
  const border=new Map<string,[THREE.Vector2,THREE.Vector2]>();for(const poly of [c.polygon,d.polygon])for(let q=0;q<poly.length;q++){const u=poly[q],v=poly[(q+1)%poly.length],e=[pk(u),pk(v)].sort().join('|');if(border.has(e))border.delete(e);else border.set(e,[u,v]);}
  if(border.size<3)continue;const directed=new Map([...border.values()].map(([u,v])=>[pk(u),v]));const first=[...border.values()][0][0],loop:THREE.Vector2[]=[];let cursor=first;for(let q=0;q<=border.size;q++){loop.push(cursor);const next=directed.get(pk(cursor));if(!next)break;cursor=next;if(pk(cursor)===pk(first))break;}
  if(loop.length!==border.size||pk(cursor)!==pk(first))continue;
  if(loop.some((v,q)=>{const a=loop[(q+loop.length-1)%loop.length],b=loop[(q+1)%loop.length];return(v.x-a.x)*(b.y-v.y)-(v.y-a.y)*(b.x-v.x)<-1e-8;}))continue;
  cells[j]={...d,polygon:loop};removed.add(i);used.add(i);used.add(j);merged=true;break;
 }}cells=cells.filter((_,i)=>!removed.has(i));}
 const incident=new Map<string,Set<string>>();for(const c of cells)for(let i=0;i<c.polygon.length;i++){const a=c.polygon[i],b=c.polygon[(i+1)%c.polygon.length];for(const [u,v]of [[a,b],[b,a]]){const set=incident.get(pk(u))??new Set<string>();set.add(pk(v));incident.set(pk(u),set);}}
 const protectedPoints=new Set([...outer,...FROZEN_AMBIENT_SEAM.map(([x,,z])=>new THREE.Vector2(x,z)),...route.map(v2),...regions.flatMap(r=>r.outline)].map(pk));const redundant=new Set<string>();
 for(const [k,neighbors]of incident){if(protectedPoints.has(k)||neighbors.size!==2)continue;const [a,b]=[...neighbors].map(k=>canonical.get(k)!);const p=canonical.get(k)!;if(a&&b&&p&&onEdge(p,a,b,1e-9))redundant.add(k);}
 for(const c of cells)c.polygon=c.polygon.filter(p=>!redundant.has(pk(p)));
 vertices=[...new Map([...cells.flatMap(c=>c.polygon),...outer,...FROZEN_AMBIENT_SEAM.map(([x,,z])=>new THREE.Vector2(x,z)),...route.map(v2),...regions.flatMap(r=>r.outline)].map(p=>[pk(p),p])).values()];
 root.userData.conditioning={mergedConvexSameOwnerFragments:true,removedGlobalCollinearVertices:redundant.size,remainingCells:cells.length,mutableSnaps:snapLog,numericWelds};
 const isOuter=(p:THREE.Vector2)=>outer.some((a,i)=>onEdge(p,a,outer[(i+1)%outer.length]));
 const sharedHeights=new Map<string,number[]>(),heightWelds:{point:number[];from:number;to:number}[]=[];
 const heightAt=(c:Cell,p:THREE.Vector2)=>{if(isOuter(p))return-1;const y=c.plane?c.plane[0]*p.x+c.plane[1]*p.y+c.plane[2]:c.height,k=pk(p),values=sharedHeights.get(k)??[],same=values.find(v=>Math.abs(v-y)<=.00002);if(same!==undefined){if(Math.abs(same-y)>1e-9)heightWelds.push({point:p.toArray(),from:y,to:same});return same;}values.push(y);sharedHeights.set(k,values);return y;};
 const caps:Tri[]=[],walls:Tri[]=[],under:Tri[]=[],ambientTris:Tri[]=[];
 const emit=(target:Tri[],a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,normal:THREE.Vector3)=>{if(b.clone().sub(a).cross(c.clone().sub(a)).dot(normal)<0)[b,c]=[c,b];if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-18)target.push([a,b,c]);};
 type Edge={a:THREE.Vector2;b:THREE.Vector2;cell:Cell};const edges=new Map<string,Edge[]>(),key=(p:THREE.Vector2)=>`${Math.round(p.x*1e7)},${Math.round(p.y*1e7)}`;
 for(const c of cells){const center=c.polygon.reduce((p,v)=>p.add(v),new THREE.Vector2()).multiplyScalar(1/c.polygon.length);if(c.polygon.length===3&&c.polygon.every(p=>!isOuter(p)))emit(caps,...c.polygon.map(p=>v3(p,heightAt(c,p))) as Tri,V(0,1,0));for(let i=0;i<c.polygon.length;i++){const a=c.polygon[i],b=c.polygon[(i+1)%c.polygon.length];if(c.polygon.length!==3||c.polygon.some(p=>isOuter(p)))emit(caps,v3(center,heightAt(c,center)),v3(a,heightAt(c,a)),v3(b,heightAt(c,b)),V(0,1,0));const k=[key(a),key(b)].sort().join('|'),owners=edges.get(k)??[];owners.push({a,b,cell:c});edges.set(k,owners);}}
 const wall=(a:THREE.Vector2,b:THREE.Vector2,la:number,lb:number,ha:number,hb:number,normal:THREE.Vector3)=>{emit(walls,v3(a,la),v3(b,lb),v3(a,ha),normal);emit(walls,v3(b,lb),v3(b,hb),v3(a,ha),normal);};
 const edgeRecords=[];const seam:THREE.Vector3[]=[];
 for(const owners of edges.values()){
  const {a,b,cell}=owners[0],normal=V(b.y-a.y,0,a.x-b.x).normalize();
  if(owners.length===2){const other=owners[1].cell;if(Math.abs(heightAt(cell,a)-heightAt(other,a))+Math.abs(heightAt(cell,b)-heightAt(other,b))>1e-8)wall(a,b,heightAt(cell,a),heightAt(cell,b),heightAt(other,a),heightAt(other,b),normal.clone().multiplyScalar(heightAt(cell,a.clone().lerp(b,.5))>heightAt(other,a.clone().lerp(b,.5))?1:-1));}
  else if(owners.length===1){
   if(isOuter(a)&&isOuter(b)){wall(a,b,-6.32,-6.32,-1,-1,normal);seam.push(v3(a,-1));}
   else {const receiver=regions.find(r=>r.outline.some((p,i)=>onEdge(a,p,r.outline[(i+1)%r.outline.length])&&onEdge(b,p,r.outline[(i+1)%r.outline.length])));
    if(receiver){receiver.boundary.push(v3(a,heightAt(cell,a)),v3(b,heightAt(cell,b)));}
    else {const isRoute=route.some((p,i)=>onEdge(a,v2(p),v2(route[(i+1)%route.length]))&&onEdge(b,v2(p),v2(route[(i+1)%route.length])));if(!isRoute)throw new Error('Unowned internal terrain boundary '+JSON.stringify({a:a.toArray(),b:b.toArray(),owner:cell.id}));wall(a,b,heightAt(cell,a),heightAt(cell,b),.18,.18,normal.clone().negate());}
   }
  }else throw new Error('Nonmanifold authored ledge edge');
  edgeRecords.push({a:a.toArray(),b:b.toArray(),owners:owners.map(o=>o.cell.id),heights:owners.map(o=>[heightAt(o.cell,a),heightAt(o.cell,b)])});
 }
 // Receiving ramps own removed polygons; same exact r01 inner interface.
 for(const r of regions){const ring=conform(r.outline),triangles:Tri[]=[];const inner=ring.map(p=>new THREE.Vector2(r.center.x+(p.x-r.center.x)*r.innerScale,r.center.y+(p.y-r.center.y)*r.innerScale));const heights:number[][]=[];
  for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length,a=ring[i],b=ring[j],owners=edges.get([key(a),key(b)].sort().join('|'));if(!owners||owners.length!==1)throw new Error(`Missing receiver edge ${r.id}`);const ha=heightAt(owners[0].cell,a),hb=heightAt(owners[0].cell,b),fa=r.id==='habit'?0:ha,fb=r.id==='habit'?0:hb;heights.push([fa,fb]);if(r.id==='habit')wall(a,b,ha,hb,0,0,V(b.y-a.y,0,a.x-b.x));emit(triangles,v3(inner[i],r.floor),v3(a,fa),v3(b,fb),V(0,1,0));emit(triangles,v3(inner[i],r.floor),v3(b,fb),v3(inner[j],r.floor),V(0,1,0));emit(triangles,v3(r.center,r.floor),v3(inner[i],r.floor),v3(inner[j],r.floor),V(0,1,0));}
  for(let i=0;i<ring.length;i++){const prev=heights[(i+ring.length-1)%ring.length][1],next=heights[i][0];if(prev!==next)emit(triangles,v3(inner[i],r.floor),v3(ring[i],prev),v3(ring[i],next),V(ring[i].x-r.center.x,0,ring[i].y-r.center.y));}
  mesh(root,'BASALT_SURFACE_'+r.id,triangles,material(0x697078),'receiving-'+r.id);
 }
 // Exact seam links to separately owned inferred mainland. It is never an
 // oversized clickable local footprint. No exposed overlapping cap at seam.
 const seamRing=FROZEN_AMBIENT_SEAM.map(p=>V(p[0],p[1],p[2]));const lower=seamRing.map(p=>p.clone().setY(-6.32));
 // Angular monotone zipper uses the exact45 seam and96 bore vertices.
 // No positional change; avoids Earcut's long near-collinear underside fans.
 const angle=(p:THREE.Vector3)=>Math.atan2(p.z,p.x);
 const exterior=[...lower].sort((a,b)=>angle(a)-angle(b)),interior=[...bottom].sort((a,b)=>angle(a)-angle(b));
 let oi=0,ii=0;while(oi<exterior.length||ii<interior.length){const a=exterior[oi%exterior.length],b=interior[ii%interior.length],an=oi<exterior.length?(oi+1<exterior.length?angle(exterior[oi+1]):angle(exterior[0])+2*Math.PI):Infinity,bn=ii<interior.length?(ii+1<interior.length?angle(interior[ii+1]):angle(interior[0])+2*Math.PI):Infinity;if(an<bn){emit(under,a,exterior[(oi+1)%exterior.length],b,V(0,-1,0));oi++;}else{emit(under,a,interior[(ii+1)%interior.length],b,V(0,-1,0));ii++;}}
 root.userData.undersideAuthoring={method:'angular-shared-loop-zipper',boundaryDisplacement:0,outerVertices:exterior.length,innerVertices:interior.length};
 const far=seamRing.map(p=>p.clone().setY(0).normalize().multiplyScalar(48).setY(-1));for(let i=0;i<seamRing.length;i++){const j=(i+1)%seamRing.length;emit(ambientTris,seamRing[i],far[i],seamRing[j],V(0,1,0));emit(ambientTris,seamRing[j],far[i],far[j],V(0,1,0));}
 root.userData.conditioning.coplanarInternalEdgeFlips=conditionTriangles(caps)+conditionTriangles(walls)+conditionTriangles(under);
 mesh(root,'BASALT_AUTHORED_PLANAR_TERRACES',caps,material(0x697078),'caldera-mantle');mesh(root,'BASALT_SHARED_RETAINING_CLIFFS',walls,material(0x535b66),'caldera-cliffs');mesh(root,'BASALT_OPEN_ANNULAR_UNDERSIDE',under,material(0x535b66),'geological-underside');
 const ambientMesh=mesh(ambient,'BASALT_NONINTERACTIVE_MAINLAND_CAP',ambientTris,material(0x697078),'ambient-mainland');ambientMesh.userData.nonInteractive=true;ambientMesh.raycast=()=>{};
 root.userData.conditioning.mutableHeightWelds=heightWelds;root.userData.cells=cells.map(c=>({id:c.id,height:c.height,plane:c.plane,polygon:c.polygon.map(p=>p.toArray())}));root.userData.planarGraph=edgeRecords;root.userData.rearWallRuns=rearRecords;root.userData.outcropBelts=outcropRecords;root.userData.receivingRegions=regions.map(r=>({id:r.id,kind:r.kind,floor:r.floor,center:r.center.toArray(),outerPolygon:r.outline.map(v=>v.toArray()),innerScale:r.innerScale}));root.userData.retainedRouteJoin={y:.18,count:route.length};root.userData.retainedBoreJoin={y:-6.32,count:bottom.length,vertices:bottom.map(p=>p.toArray())};root.userData.ambientNodeName=ambient.name;root.userData.ambientSeam=seamRing.map(p=>p.toArray());ambient.userData.localSeam=seamRing.map(p=>p.toArray());root.userData.inference='Underside join at actual bore bottom-6.32; frozen heart column continues below as out-of-unit dependency. Rear cliffs and unseen mainland inferred.';
 old.removeFromParent();oldCliff.removeFromParent();const parent=collar.parent??environmentRoot;parent.add(root,ambient);return root;
}
