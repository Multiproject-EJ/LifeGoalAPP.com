import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Actual distant ruins and soft, three-dimensional overhead light volumes. */
export function createIsland7WaterAtmosphereV2(shelf: THREE.Object3D, quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'ISLAND_7_V2_WATER_DEPTH';
  const shafts = new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{strength:{value:0.035},time:{value:0},tint:{value:new THREE.Color(0x79dce6)}},
    vertexShader:'attribute vec2 shaftVariation;varying vec2 vShaft;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){vShaft=shaftVariation;vUv=uv;vNormal=normalMatrix*normal;vec4 p=modelViewMatrix*vec4(position,1.0);vView=-p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader:'uniform float strength;uniform float time;uniform vec3 tint;varying vec2 vShaft;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){float edge=pow(abs(dot(normalize(vNormal),normalize(vView))),2.5);float ends=smoothstep(0.0,0.25,vUv.y)*(1.0-smoothstep(0.75,1.0,vUv.y));float shimmer=.86+.14*sin(time*.24+vShaft.y+vUv.y*7.0);gl_FragColor=vec4(tint,edge*ends*strength*vShaft.x*shimmer);}',
  });
  const count=quality==='high'?24:quality==='medium'?16:10;
  const rayParts:THREE.BufferGeometry[]=[];
  const transform=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const width=.18+(i%5)*.105,length=14+(i%7)*1.15;
    const geometry=new THREE.CylinderGeometry(width*.30,width*1.65,length,10,1,true);
    transform.position.set(((i*7)%23-11)*1.08,8+(i%5)*.7,-17+((i*5)%19)*1.05);
    transform.rotation.set(.035*Math.sin(i*1.71),0,-.16-(i%4)*.025);transform.updateMatrix();geometry.applyMatrix4(transform.matrix);
    const variations=new Float32Array(geometry.getAttribute('position').count*2);
    for(let v=0;v<variations.length;v+=2){variations[v]=.55+(i%6)*.12;variations[v+1]=i*1.713;}
    geometry.setAttribute('shaftVariation',new THREE.BufferAttribute(variations,2));rayParts.push(geometry);
  }
  const rayGeometry=mergeGeometries(rayParts,false);rayParts.forEach(g=>g.dispose());
  if(!rayGeometry)throw new Error('Could not build underwater ray field');
  const rayField=new THREE.Mesh(rayGeometry,shafts);rayField.name='ISLAND_7_V2_SUN_RAY_FIELD';root.add(rayField);
  root.userData.rayCount=count;
  const stoneParts:THREE.BufferGeometry[]=[],glassParts:THREE.BufferGeometry[]=[];
  const ray=new THREE.Raycaster();shelf.updateWorldMatrix(true,true);
  for(const [x,z] of [[-8.5,-10.5],[8.5,-12],[-6,-16]]){
    ray.set(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(shelf,true)[0]; if(!hit || hit.point.y>12 || hit.point.y<0)continue;
    const y=hit.point.y;
    const base=new THREE.CylinderGeometry(1.1,1.25,.22,12);base.translate(x,y+.07,z);stoneParts.push(base);
    for(const side of [-1,1]){const pillar=new THREE.CylinderGeometry(.16,.22,1.9,8);pillar.translate(x+side*.65,y+1,z);stoneParts.push(pillar);}
    const arch=new THREE.TorusGeometry(.65,.16,5,16,Math.PI);arch.translate(x,y+1.93,z);stoneParts.push(arch);
    const crystal=new THREE.OctahedronGeometry(.15);crystal.scale(1,2,1);crystal.translate(x,y+.55,z);glassParts.push(crystal);
  }
  const stone=new THREE.MeshStandardMaterial({color:0x3b7884,roughness:.92,metalness:0});
  const glow=new THREE.MeshStandardMaterial({color:0xffd69a,emissive:0xe9a353,emissiveIntensity:.15});
  for(const [parts,material,name] of [[stoneParts,stone,'ISLAND_7_DISTANT_RUIN_ARCHES'],[glassParts,glow,'ISLAND_7_DISTANT_RUIN_LIGHTS']] as const){
    if(parts.length){const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(merged){const mesh=new THREE.Mesh(merged,material);mesh.name=name;root.add(mesh);}}
    else material.dispose();
  }
  return {root,animate:(elapsed:number)=>{shafts.uniforms.time.value=elapsed;},setNight:(night:number)=>{shafts.uniforms.strength.value=.035-night*.027;shafts.uniforms.tint.value.setHex(night?0x548ee8:0x79dce6);glow.emissiveIntensity=.15+night*.8;}};
}
