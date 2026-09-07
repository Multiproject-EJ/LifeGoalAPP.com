// Local read-only geometry regression: actual shipped mesh plus retained runtime parts.
// Six longitudinal clearance traces are sampled, not a continuous-volume collision proof.
import { createServer } from 'vite';
import fs from 'node:fs';
import * as T from 'three';
const root=process.cwd();
const server=await createServer({root,configFile:false,server:{middlewareMode:true,watch:null,hmr:false},logLevel:'error'});
try {
 const mod=await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island19CoasterCarnivalCircuitFWorld.ts');
 const world=mod.createIsland19CoasterCarnivalCircuitFWorld({quality:'high'});

 world.root.updateMatrixWorld(true);
 const b=fs.readFileSync(root+'/public/assets/islands/island-019/coaster-carnival-exterior-v009.glb'),jl=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+jl).toString()),bin=b.subarray(28+jl);
 function acc(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],o=(v.byteOffset||0)+(a.byteOffset||0);return {a,view:new DataView(bin.buffer,bin.byteOffset+o),stride:v.byteStride||({VEC3:3,SCALAR:1}[a.type])*(a.componentType===5123?2:4)};}
 const glb=new T.Group();for(const prim of j.meshes[0].primitives){const p=acc(prim.attributes.POSITION),ix=acc(prim.indices),positions=[],indices=[];for(let n=0;n<p.a.count;n++)positions.push(p.view.getFloat32(n*p.stride,true),p.view.getFloat32(n*p.stride+4,true),p.view.getFloat32(n*p.stride+8,true));for(let n=0;n<ix.a.count;n++)indices.push(ix.a.componentType===5123?ix.view.getUint16(n*ix.stride,true):ix.view.getUint32(n*ix.stride,true));const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.name='V009_STATIC_MATERIAL_'+prim.material;glb.add(m);}glb.updateMatrixWorld(true);
 const candidates=[];world.root.traverse(o=>{if(!o.isMesh)return;let a=o,landmark=false;while(a){if(a.name==="ISLAND_19_D019_GRAND_TREASURE_GROTTO"||a.name==='ISLAND_19_CIRCUIT_F_ANIMATED_CARNIVAL_LANDMARKS'||a.name==='ISLAND_19_CIRCUIT_I_SOURCE_CREST_SUPPORT_LATTICE'||a.name==='ISLAND_19_CIRCUIT_F_TRAVERSABLE_TREASURE_CAVERN')landmark=true;a=a.parent;}if(o.name === "ISLAND_19_CIRCUIT_I_UNDERSEA_VISIBLE_SEABED" || o.name === "ISLAND_19_CIRCUIT_F_OCEAN" || o.name.startsWith('ISLAND_19_G01_')||landmark||o.name==='ISLAND_19_CIRCUIT_F_LOAD_PATH_SUPPORTS'||o.name==='ISLAND_19_CIRCUIT_I_UNDERSEA_TUBE_SEAFLOOR_SUPPORTS')candidates.push(o);});
 const bins=new Map();for(const mesh of glb.children){const a=mesh.geometry.attributes.position,ix=mesh.geometry.index;for(let k=0;k<ix.count;k+=3){const vs=[0,1,2].map(d=>new T.Vector3().fromBufferAttribute(a,ix.getX(k+d))),bb=new T.Box3().setFromPoints(vs),tri={vs,name:mesh.name};for(let x=Math.floor(bb.min.x);x<=Math.floor(bb.max.x);x++)for(let y=Math.floor(bb.min.y);y<=Math.floor(bb.max.y);y++)for(let z=Math.floor(bb.min.z);z<=Math.floor(bb.max.z);z++){const key=[x,y,z].join(',');if(!bins.has(key))bins.set(key,[]);bins.get(key).push(tri);}}}
 world.root.getObjectByName('ISLAND_19_D021_PARK_DETAILS')?.traverse(o => { if(o.isMesh)candidates.push(o); });
 const rays=[['center',0,0,0],['eye',0,1.32,.1],['left-body',-.43,.55,.35],['right-body',.43,.55,.35],['left-head',-.3,1.44,0],['right-head',.3,1.44,0]],report={diagnostics:world.diagnostics,hits:{}};
 for(const [name,side,up,forward] of rays){const hits=[];let prev=null;for(let k=0;k<=1800;k++){const u=k/1800,f=world.getRideFrame(u),pos=f.position.clone().addScaledVector(f.side,side).addScaledVector(f.up,up).addScaledVector(f.tangent,forward);if(prev){const d=pos.clone().sub(prev),len=d.length(),r=new T.Raycaster(prev,d.normalize(),0,len);for(const hit of r.intersectObjects(candidates,false)){let parent=hit.object.parent?.name||'';hits.push({u:+u.toFixed(5),name:hit.object.name,parent,p:hit.point.toArray().map(x=>+x.toFixed(3))});}const bb=new T.Box3().setFromPoints([prev,pos]),tris=new Set();for(let x=Math.floor(bb.min.x);x<=Math.floor(bb.max.x);x++)for(let y=Math.floor(bb.min.y);y<=Math.floor(bb.max.y);y++)for(let z=Math.floor(bb.min.z);z<=Math.floor(bb.max.z);z++)for(const tri of bins.get([x,y,z].join(','))||[])tris.add(tri);for(const tri of tris){const pt=new T.Vector3();if(r.ray.intersectTriangle(...tri.vs,false,pt)&&prev.distanceTo(pt)<=len)hits.push({u:+u.toFixed(5),name:tri.name,p:pt.toArray().map(x=>+x.toFixed(3))});}}prev=pos;}report.hits[name]=hits;}
 const totalHits = Object.values(report.hits).reduce((sum, hits) => sum + hits.length, 0);
 report.sweepIntervals = 1800;
 report.totalHits = totalHits;
 console.log(JSON.stringify(report,null,2));
 if (process.env.ISLAND19_CLEARANCE_REPORT) fs.writeFileSync(process.env.ISLAND19_CLEARANCE_REPORT, JSON.stringify(report, null, 2));
 if (totalHits || !world.diagnostics.valid) process.exitCode = 1;
} finally {await server.close();}
