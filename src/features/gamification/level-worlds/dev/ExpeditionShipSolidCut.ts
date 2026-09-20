import * as THREE from 'three';

// Closed-solid BSP subtraction for the authorized lower housing. Unlike a
// visibility/raycast mask, splits preserve real faces and create cavity walls.
// Input must be a closed consistently wound solid; do not use on a merged
// collection of intersecting furniture or a transparent open sheet.
const EPSILON=1e-6;
class Vertex {
  constructor(public p:THREE.Vector3,public n:THREE.Vector3,public uv:THREE.Vector2){}
  clone(){return new Vertex(this.p.clone(),this.n.clone(),this.uv.clone());}
  flip(){this.n.negate();}
  interpolate(other:Vertex,t:number){return new Vertex(this.p.clone().lerp(other.p,t),this.n.clone().lerp(other.n,t).normalize(),this.uv.clone().lerp(other.uv,t));}
}
class Plane {
  constructor(public normal:THREE.Vector3,public w:number){}
  clone(){return new Plane(this.normal.clone(),this.w);}
  flip(){this.normal.negate();this.w=-this.w;}
  split(polygon:Polygon,coplanarFront:Polygon[],coplanarBack:Polygon[],front:Polygon[],back:Polygon[]){
    let type=0;const types=polygon.vertices.map(v=>{const t=this.normal.dot(v.p)-this.w;const kind=t< -EPSILON?2:t>EPSILON?1:0;type|=kind;return kind;});
    if(type===0)(this.normal.dot(polygon.plane.normal)>0?coplanarFront:coplanarBack).push(polygon);
    else if(type===1)front.push(polygon);
    else if(type===2)back.push(polygon);
    else {
      const f:Vertex[]=[],b:Vertex[]=[];
      for(let i=0;i<polygon.vertices.length;i++){
        const j=(i+1)%polygon.vertices.length,a=polygon.vertices[i],z=polygon.vertices[j],ta=types[i],tz=types[j];
        if(ta!==2)f.push(a);if(ta!==1)b.push(ta!==2?a.clone():a);
        if((ta|tz)===3){const t=(this.w-this.normal.dot(a.p))/this.normal.dot(z.p.clone().sub(a.p));const v=a.interpolate(z,t);f.push(v);b.push(v.clone());}
      }
      if(f.length>=3)front.push(new Polygon(f));if(b.length>=3)back.push(new Polygon(b));
    }
  }
}
class Polygon {
  plane:Plane;
  constructor(public vertices:Vertex[]){const a=vertices[0].p,b=vertices[1].p,c=vertices[2].p;const n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();this.plane=new Plane(n,n.dot(a));}
  clone(){return new Polygon(this.vertices.map(v=>v.clone()));}
  flip(){this.vertices.reverse().forEach(v=>v.flip());this.plane.flip();}
}
class Node {
  plane?:Plane;front?:Node;back?:Node;polygons:Polygon[]=[];
  constructor(polygons:Polygon[]=[]){this.build(polygons);}
  invert(){this.polygons.forEach(p=>p.flip());this.plane?.flip();this.front?.invert();this.back?.invert();[this.front,this.back]=[this.back,this.front];}
  clipPolygons(polygons:Polygon[]):Polygon[]{
    if(!this.plane)return polygons.slice();let front:Polygon[]=[],back:Polygon[]=[];
    polygons.forEach(p=>this.plane!.split(p,front,back,front,back));
    if(this.front)front=this.front.clipPolygons(front);back=this.back?this.back.clipPolygons(back):[];return front.concat(back);
  }
  clipTo(other:Node){this.polygons=other.clipPolygons(this.polygons);this.front?.clipTo(other);this.back?.clipTo(other);}
  allPolygons():Polygon[]{return this.polygons.concat(this.front?.allPolygons()??[],this.back?.allPolygons()??[]);}
  build(polygons:Polygon[]){
    if(!polygons.length)return;if(!this.plane)this.plane=polygons[0].plane.clone();const f:Polygon[]=[],b:Polygon[]=[];
    polygons.forEach(p=>this.plane!.split(p,this.polygons,this.polygons,f,b));
    if(f.length){this.front??=new Node();this.front.build(f);}if(b.length){this.back??=new Node();this.back.build(b);}
  }
}
function polygonsOf(g:THREE.BufferGeometry){
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv'),out:Polygon[]=[];
  for(let i=0;i<(g.index?.count??p.count);i+=3){const v=[0,1,2].map(j=>{const k=g.index?.getX(i+j)??i+j;return new Vertex(new THREE.Vector3().fromBufferAttribute(p,k),new THREE.Vector3().fromBufferAttribute(n,k),uv?new THREE.Vector2(uv.getX(k),uv.getY(k)):new THREE.Vector2());});
    if(v[1].p.clone().sub(v[0].p).cross(v[2].p.clone().sub(v[0].p)).lengthSq()>1e-18)out.push(new Polygon(v));
  }return out;
}
/** Boxes are expressed in the geometry's current coordinate frame. */
export function subtractSolidBoxes(source:THREE.BufferGeometry,boxes:THREE.Box3[]){
  let polygons=polygonsOf(source);
  for(const box of boxes){
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const cutter=new THREE.BoxGeometry(size.x,size.y,size.z);cutter.translate(center.x,center.y,center.z);
    const a=new Node(polygons.map(p=>p.clone())),b=new Node(polygonsOf(cutter));cutter.dispose();
    a.invert();a.clipTo(b);b.clipTo(a);b.invert();b.clipTo(a);b.invert();a.build(b.allPolygons());a.invert();polygons=a.allPolygons();
  }
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[];
  for(const polygon of polygons)for(let i=1;i<polygon.vertices.length-1;i++){
    const triangle=[polygon.vertices[0],polygon.vertices[i],polygon.vertices[i+1]];
    // Tiny bevel slivers still seal the solid. The old area cutoff discarded
    // 12/26 valid faces and opened measured cracks. Reject only faces that
    // actually collapse in the Float32 representation being emitted.
    const rounded=triangle.map(v=>new THREE.Vector3(Math.fround(v.p.x),Math.fround(v.p.y),Math.fround(v.p.z)));
    if(rounded[1].clone().sub(rounded[0]).cross(rounded[2].clone().sub(rounded[0])).lengthSq()===0)continue;
    triangle.forEach(v=>{positions.push(v.p.x,v.p.y,v.p.z);normals.push(v.n.x,v.n.y,v.n.z);uvs.push(v.uv.x,v.uv.y);});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={...source.userData,solidSubtraction:{boxes:boxes.map(b=>({min:b.min.toArray(),max:b.max.toArray()})),physicalCavityWalls:true,requiresIndependentClosureAudit:true}};return geometry;
}
