import * as THREE from 'three';
import {createHollowOakWall,HOLLOW_OAK} from './ExpeditionShipHollowOak';

/** Final corrected-target family: actual branch ports in the outer bark wall.
 * The bore stays intact; branch surfaces share the port vertices, not intersecting
 * cylinders. Every branch has an independently curved, tapering cross-section.
 */
export function createBranchedOakWall(high:boolean) {
  const base=createHollowOakWall(high,true), n=high?40:32, rows=12;
  const positions=Array.from(base.attributes.position.array), original=Array.from(base.index!.array);
  const indices:number[]=[];
  const at=(j:number,i:number)=>j*(n+1)+i;
  const vertex=(i:number)=>new THREE.Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]);
  const quad=(a:number,b:number,c:number,d:number)=>indices.push(a,b,d,b,c,d);
  const holes=[.15,.34,.65,.85].map(f=>({i:Math.round(f*n)-1,j:6,width:2,height:2}));
  // Outer-wall quads precede their matching bore quad in the original buffer.
  const surfaceIndexCount=(rows-1)*n*12;
  for(let k=0;k<surfaceIndexCount;k+=12) {
    const cell=k/12,j=Math.floor(cell/n),i=cell%n;
    const hole=holes.some(h=>i>=h.i&&i<h.i+h.width&&j>=h.j&&j<h.j+h.height);
    if(!hole)indices.push(...original.slice(k,k+6));
    indices.push(...original.slice(k+6,k+12));
  }
  indices.push(...original.slice(surfaceIndexCount));
  // Repair the independently diagnosed lintel/top-wedge winding in this new
  // family only. The immutable failed family1 remains reproducible unchanged.
  for(let k=indices.length-12;k<indices.length;k+=3)[indices[k+1],indices[k+2]]=[indices[k+2],indices[k+1]];
  for(const h of holes) {
    // This loop follows the removed wall patch boundary; side quads consume its
    // reverse edge direction, preserving a two-sided manifold at the collar.
    const boundary:number[]=[];
    for(let j=h.j;j<h.j+h.height;j++)boundary.push(at(j,h.i));
    for(let i=h.i;i<h.i+h.width;i++)boundary.push(at(h.j+h.height,i));
    for(let j=h.j+h.height;j>h.j;j--)boundary.push(at(j,h.i+h.width));
    for(let i=h.i+h.width;i>h.i;i--)boundary.push(at(h.j,i));
    const center=boundary.reduce((a,i)=>a.add(vertex(i)),new THREE.Vector3()).multiplyScalar(1/boundary.length);
    const a=Math.atan2(center.z-HOLLOW_OAK.centerZ,center.x),sign=Math.sign(center.x);
    const end=new THREE.Vector3(sign*.855,1.295,HOLLOW_OAK.centerZ+Math.sin(a)*.40);
    const radial=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
    const up=new THREE.Vector3(0,1,0),side=new THREE.Vector3().crossVectors(radial,up).normalize();
    const phases=boundary.map(i=>{const v=vertex(i).sub(center);return Math.atan2(v.dot(side)/.105,v.y/.22);});
    let previous=boundary;
    for(let k=1;k<=5;k++) {
      const t=k/5, ease=t*t*(3-2*t);
      const p=center.clone().lerp(end,t);
      p.addScaledVector(radial,Math.sin(t*Math.PI)*.05);
      const tangent=end.clone().sub(center).addScaledVector(radial,Math.cos(t*Math.PI)*.05*Math.PI).normalize();
      const axisA=up.clone().addScaledVector(tangent,-up.dot(tangent)).normalize();
      const axisB=new THREE.Vector3().crossVectors(tangent,axisA).normalize();
      const radius=THREE.MathUtils.lerp(.13,.045,ease);
      const ring=phases.map(phase=>{
        const q=p.clone().addScaledVector(axisA,Math.cos(phase)*radius).addScaledVector(axisB,Math.sin(phase)*radius);
        const id=positions.length/3;positions.push(q.x,q.y,q.z);return id;
      });
      for(let i=0;i<ring.length;i++)quad(previous[i],previous[(i+1)%ring.length],ring[(i+1)%ring.length],ring[i]);
      previous=ring;
    }
    const tip=positions.length/3;positions.push(end.x,end.y,end.z);
    for(let i=0;i<previous.length;i++)indices.push(previous[i],previous[(i+1)%previous.length],tip);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();base.dispose();return g;
}
