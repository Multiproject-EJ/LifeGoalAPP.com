import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Closed cambered wings, a rounded body, and surface-anchored luminous markings. */
export function createIsland7MantaV2() {
  const root=new THREE.Group();root.name='ISLAND_7_V2_CLOSED_MANTA';
  const outline=new THREE.Shape();outline.moveTo(1.1,0);
  outline.bezierCurveTo(.55,.15,.30,.58,0,.38);outline.bezierCurveTo(-.30,.58,-.55,.15,-1.1,0);
  outline.bezierCurveTo(-.65,-.08,-.27,-.42,0,-.28);outline.bezierCurveTo(.27,-.42,.65,-.08,1.1,0);outline.closePath();
  const wing=new THREE.ExtrudeGeometry(outline,{depth:.10,bevelEnabled:true,bevelThickness:.035,bevelSize:.03,bevelSegments:2,steps:1,curveSegments:9});
  wing.rotateX(-Math.PI/2);const p=wing.getAttribute('position');
  for(let i=0;i<p.count;i++){const x=p.getX(i);p.setY(i,p.getY(i)*(1-Math.min(.8,Math.abs(x)*.7)) + Math.pow(Math.abs(x),1.7)*.18);}
  wing.computeVertexNormals();
  const body=new THREE.SphereGeometry(1,16,8);body.scale(.23,.13,.38);body.translate(0,.085,-.03);
  const tail=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,.035,.28),new THREE.Vector3(0,.045,.75),new THREE.Vector3(.1,.13,1.55)]),12,.018,5,false);
  const parts=[wing,body,tail].map(g=>{const out=g.index?g.toNonIndexed():g;if(out!==g)g.dispose();return out;});
  const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!merged)throw new Error('Manta merge failed');
  const material=new THREE.MeshStandardMaterial({color:0x25657c,roughness:.42,metalness:.16});
  const mesh=new THREE.Mesh(merged,material);mesh.name='ISLAND_7_V2_MANTA_BODY';root.add(mesh);root.updateMatrixWorld(true);
  const spotGeometry=new THREE.OctahedronGeometry(.018),spotMaterial=new THREE.MeshStandardMaterial({color:0xb4fff3,emissive:0x45d7d6,emissiveIntensity:.65,roughness:.3});
  const transforms:THREE.Matrix4[]=[];const ray=new THREE.Raycaster();
  for(let i=0;i<42;i++){const x=((i*17)%41)/41*1.7-.85,z=((i*11)%37)/37*.52-.22;ray.set(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];if(hit){const matrix=new THREE.Matrix4().makeTranslation(hit.point.x,hit.point.y+.012,hit.point.z);transforms.push(matrix);}}
  const spots=new THREE.InstancedMesh(spotGeometry,spotMaterial,transforms.length);transforms.forEach((m,i)=>spots.setMatrixAt(i,m));spots.name='ISLAND_7_V2_MANTA_BIOLUMINESCENT_MARKINGS';root.add(spots);
  return root;
}
