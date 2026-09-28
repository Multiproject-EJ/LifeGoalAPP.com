import * as THREE from 'three';

/** Immutable material coordinates; the animated loft only updates positions/normals. */
export function assignIsland22DragonRingUV(geometry:THREE.BufferGeometry,radialSegments:number,headRings:number,neckRings:number){
 const count=geometry.attributes.position.count,rings=count/radialSegments,uv=new Float32Array(count*2),surface=new Float32Array(count*3);
 for(let r=0;r<rings;r++){
  const longitudinal=r<headRings?.14*r/(headRings-1):r<headRings+neckRings?.14+.10*(r-headRings+1)/(neckRings+1):.24+.76*(r-headRings-neckRings)/(rings-headRings-neckRings-1);
  for(let j=0;j<radialSegments;j++){const i=r*radialSegments+j,a=j/radialSegments*Math.PI*2;uv[i*2]=j/radialSegments;uv[i*2+1]=longitudinal;surface[i*3]=Math.cos(a);surface[i*3+1]=Math.sin(a);surface[i*3+2]=longitudinal;}
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 // Circular encoding avoids the interpolation seam without changing approved indices.
 geometry.setAttribute('dragonSurface',new THREE.BufferAttribute(surface,3));
}

/** Restrained skin relief and opaque, translucent-looking wing finish; no silhouette displacement. */
export function applyIsland22DragonFinish(material:THREE.MeshStandardMaterial,kind:'skin'|'wing'){
 const skin=kind==='skin';
 material.onBeforeCompile=(shader)=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nvarying vec3 vDragonFinish;\n${skin?'attribute vec3 dragonSurface;':''}`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>\nvDragonFinish=${skin?'dragonSurface':'vec3(position.x,position.z,position.y)'};`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vDragonFinish;\nfloat dragonRelief=0.0;`);
  const pattern=skin?`
    float angle=atan(vDragonFinish.y,vDragonFinish.x);
    float along=vDragonFinish.z*62.0;
    float row=floor(along);
    vec2 cell=vec2(fract(angle*3.8197186+mod(row,2.0)*.5)-.5,fract(along));
    float arc=length(vec2(cell.x*.98,(cell.y-.12)*.73));
    float aa=max(fwidth(arc),.008);
    float seam=1.0-smoothstep(aa,aa*2.5,abs(arc-.48));
    float belly=smoothstep(.18,.65,-vDragonFinish.y);
    float plate=1.0-smoothstep(.035,.035+max(fwidth(along),.03),abs(fract(along*.70)-.08));
    dragonRelief=mix(seam,plate,belly);
    diffuseColor.rgb*=1.0-dragonRelief*mix(.13,.11,belly);
    diffuseColor.rgb+=vec3(.025,.035,.028)*(1.0-seam)*(1.0-belly)*cell.y;
  `:`
    vec2 p=vDragonFinish.xy;
    float vein=pow(.5+.5*sin(p.x*16.0+p.y*9.0+sin(p.y*3.0)*.4),22.0);
    float edgeGlow=.5+.5*sin(p.y*.8);
    dragonRelief=vein*.35;
    diffuseColor.rgb=mix(diffuseColor.rgb*vec3(.79,.91,.91),diffuseColor.rgb*vec3(1.09,1.06,.98),edgeGlow);
    diffuseColor.rgb*=1.0-vein*.085;
  `;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${pattern}`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+dragonRelief*.10,.28,.8);');
 };
 material.customProgramCacheKey=()=>`island22-finish-v2-${kind}`;
 material.needsUpdate=true;
}
