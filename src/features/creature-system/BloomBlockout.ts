import * as THREE from 'three';
import parts from './bloomBlockout.data.json';

/** Rough static maquette from the blockout spec. Never a fallback for other families. */
export function createBloomBlockout() {
  const root=new THREE.Group();root.name='bloom-rounded-maquette';
  const geometry=new THREE.SphereGeometry(1,24,16);
  const palette:Record<string,string>={rose:'#b86c7b',pink:'#de939d',moss:'#7e8850',amber:'#dea24d'};
  const materials=Object.fromEntries(Object.entries(palette).map(([id,color])=>[id,new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0})]));
  const nodes:Record<string,THREE.Group>={},meshes:Record<string,THREE.Mesh>={},sockets:Record<string,THREE.Object3D>={};
  for(const row of parts){
    const [id,position,dimensions,material,rotation]=row as [string,number[],number[],string,number[]?];
    const pivot=new THREE.Group();pivot.name=id;pivot.position.fromArray(position);
    if(rotation)pivot.rotation.set(rotation[0],rotation[1],rotation[2]);
    const mesh=new THREE.Mesh(geometry,materials[material]);mesh.name=id+'-mesh';
    mesh.scale.set(dimensions[0]/2,dimensions[1]/2,dimensions[2]/2);mesh.userData.partId=id;
    pivot.add(mesh);root.add(pivot);nodes[id]=pivot;meshes[id]=mesh;
    const socket=new THREE.Object3D();socket.name='socket-'+id;socket.position.fromArray(position);root.add(socket);sockets[id]=socket;
  }
  root.userData.sculptRuntime={nodes,meshes,sockets,colliders:{body:{type:'sphere',radius:.8}},destructionGroups:{shell:Object.values(nodes)},rig:'static-blockout-only'};
  const explode=(amount:number)=>{Object.entries(nodes).forEach(([id,node])=>{node.position.copy(sockets[id].position);node.position.y-=.8;node.position.multiplyScalar(1+Math.max(0,amount));node.position.y+=.8;});};
  root.userData.sculptRuntime.explode=explode;
  return {root,nodes,meshes,explode,dispose:()=>{geometry.dispose();Object.values(materials).forEach(m=>m.dispose());}};
}

/** Shared camera and lighting for frozen poster and first live frame. */
export function createBloomScene(canvas:HTMLCanvasElement,size:number){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(size,size,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1.35,1.35,1.35,-1.35,.1,30);camera.position.set(-2.8,2.4,5);camera.lookAt(0,.84,0);
  scene.add(new THREE.HemisphereLight('#fff1e3','#555367',2));
  const key=new THREE.DirectionalLight('#ffe5cd',3);key.position.set(-3,5,4);scene.add(key);
  const fill=new THREE.DirectionalLight('#dce9ff',1);fill.position.set(3,2,1);scene.add(fill);
  const model=createBloomBlockout();scene.add(model.root);
  const render=()=>renderer.render(scene,camera);render();
  return {renderer,scene,camera,model,render,dispose:()=>{model.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
