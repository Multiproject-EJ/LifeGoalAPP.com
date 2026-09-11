import * as THREE from 'three';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

export function createV2Palette() {
  return {
    stone: new THREE.MeshStandardMaterial({color:0xe9dfc7,roughness:0.72}),
    shade: new THREE.MeshStandardMaterial({color:0xbbae91,roughness:0.84}),
    trim: new THREE.MeshStandardMaterial({color:0xf4ebd8,roughness:0.57}),
    gold: new THREE.MeshStandardMaterial({color:0xb58c43,metalness:0.75,roughness:0.3}),
    blue: new THREE.MeshStandardMaterial({color:0x163c71,metalness:0.18,roughness:0.28}),
    glass: new THREE.MeshPhysicalMaterial({color:0x98d9dd,metalness:0.04,roughness:0.12,transparent:true,opacity:0.3,side:THREE.DoubleSide,depthWrite:false}),
    dark: new THREE.MeshStandardMaterial({color:0x3c3b31,roughness:0.85}),
    wood: new THREE.MeshStandardMaterial({color:0x765133,roughness:0.66}),
    water: new THREE.MeshStandardMaterial({color:0x4bc3cb,metalness:0.18,roughness:0.18}),
    leaf: new THREE.MeshStandardMaterial({color:0x526d31,roughness:0.9}),
    leafLight: new THREE.MeshStandardMaterial({color:0x819644,roughness:0.88}),
    leafDark: new THREE.MeshStandardMaterial({color:0x2f512c,roughness:0.96}),
    flower: new THREE.MeshStandardMaterial({color:0xb073b3,roughness:0.82}),
    glow: new THREE.MeshStandardMaterial({color:0xffe9ac,emissive:0xffcc64,emissiveIntensity:0.6,roughness:0.4}),
  };
}
export type V2Palette = ReturnType<typeof createV2Palette>;
export function part(parent:THREE.Group,name:string,stage=1) {const g=new THREE.Group();g.name=name;g.userData.constructionStage=stage;parent.add(g);return g;}
export function solid(parent:THREE.Group,name:string,geometry:THREE.BufferGeometry,material:THREE.Material,p:[number,number,number]=[0,0,0]){
  if(!geometry.getAttribute('uv'))geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count*2),2));
  const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...p);m.castShadow=!material.transparent;m.receiveShadow=true;parent.add(m);return m;
}
export function box(parent:THREE.Group,name:string,size:[number,number,number],p:[number,number,number],mat:THREE.Material){return solid(parent,name,new THREE.BoxGeometry(...size),mat,p);}
export function disc(parent:THREE.Group,name:string,r:number,h:number,p:[number,number,number],mat:THREE.Material,segments=32){return solid(parent,name,new THREE.CylinderGeometry(r,r,h,segments),mat,p);}
export function tube(parent:THREE.Group,name:string,points:THREE.Vector3[],r:number,mat:THREE.Material,segments=24){return solid(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),segments,r,6,false),mat);}
export function beam(parent:THREE.Group,name:string,from:THREE.Vector3,to:THREE.Vector3,r:number,mat:THREE.Material){const m=solid(parent,name,new THREE.CylinderGeometry(r,r,from.distanceTo(to),6),mat);m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize());return m;}
export function arc(parent:THREE.Group,name:string,inner:number,outer:number,y:number,h:number,start:number,end:number,mat:THREE.Material,segments=32){
  const points:THREE.Vector2[]=[];for(let i=0;i<=segments;i++){const a=start+(end-start)*i/segments;points.push(new THREE.Vector2(Math.sin(a)*outer,-Math.cos(a)*outer));}for(let i=segments;i>=0;i--){const a=start+(end-start)*i/segments;points.push(new THREE.Vector2(Math.sin(a)*inner,-Math.cos(a)*inner));}
  const g=new THREE.ExtrudeGeometry(new THREE.Shape(points),{depth:h,bevelEnabled:false,steps:1,curveSegments:2});g.rotateX(-Math.PI/2);return solid(parent,name,g,mat,[0,y,0]);
}
export function portal(parent:THREE.Group,name:string,w:number,h:number,d:number,p:[number,number,number],mat:THREE.Material){
  const thick=w*.1, spring=h-w*.5, outer=new THREE.Shape();
  outer.moveTo(-w/2,0);outer.lineTo(-w/2,spring);outer.absarc(0,spring,w/2,Math.PI,0,true);outer.lineTo(w/2,0);
  outer.lineTo(w/2-thick,0);outer.lineTo(w/2-thick,spring);outer.absarc(0,spring,w/2-thick,0,Math.PI,false);outer.lineTo(-w/2+thick,0);outer.closePath();
  const g=new THREE.ExtrudeGeometry(outer,{depth:d,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,curveSegments:12});g.translate(0,0,-d*.5);return solid(parent,name,g,mat,p);
}
export function greenery(parent:THREE.Group,name:string,p:[number,number,number],scale:number,palette:V2Palette,seed=0){
  for(let i=0;i<7;i++){const a=i*2.399+seed;const m=solid(parent,`${name}_${i}`,new THREE.IcosahedronGeometry(1,1),i%3===0?palette.leafLight:i%3===1?palette.leaf:palette.leafDark,[p[0]+Math.sin(a)*scale*.32,p[1]+Math.sin(i*1.7)*scale*.12,p[2]+Math.cos(a)*scale*.3]);m.scale.set(scale*.53,scale*.35,scale*.48);m.rotation.y=a;}
}
export function cypress(parent:THREE.Group,name:string,p:[number,number,number],h:number,palette:V2Palette){solid(parent,name+'_TRUNK',new THREE.CylinderGeometry(.025,.05,h*.6,6),palette.wood,[p[0],p[1]+h*.3,p[2]]);const m=solid(parent,name,new THREE.SphereGeometry(1,8,6),palette.leafDark,[p[0],p[1]+h*.65,p[2]]);m.scale.set(h*.14,h*.6,h*.14);}
export function finishPart(g:THREE.Group,preview:boolean){if(!preview)compactStaticGeometry(g,g.name);}
