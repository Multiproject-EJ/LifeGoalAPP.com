import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';

/** Island 006 visual surfaces only. All clocks come from the existing world runtime. */
export function attachHarborWaterDetail(material: THREE.MeshPhysicalMaterial, pond = false) {
  const previous = material.onBeforeCompile;
  const time = { value: 0 };
  material.userData.harborDetailTime = time;
  material.onBeforeCompile = function(shader, renderer) {
    previous.call(this, shader, renderer);
    shader.uniforms.uHarborDetailTime = time;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vHarborSurface;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvHarborSurface = position.xy;');
    const header = `
      uniform float uHarborDetailTime;
      varying vec2 vHarborSurface;
      float harborRipple(vec2 p) {
        float t=uHarborDetailTime;
        p+=vec2(sin(p.y*.31+t*.07)*2.1,cos(p.x*.23-t*.05)*1.7);
        return sin(p.x*1.7+p.y*.7+t*.55)*.42
          +sin(p.x*.81-p.y*2.1-t*.39)*.20
          +sin(p.x*3.4+p.y*.86+t*.9+sin(p.y*.8))*.07
          +sin(p.x*.31-p.y*.52+t*.2)*.32;
      }
    `;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n'+header);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float h=harborRipple(vHarborSurface);
      vec2 slope=vec2(harborRipple(vHarborSurface+vec2(.035,0.))-h,harborRipple(vHarborSurface+vec2(0.,.035))-h);
      normal=normalize(normal+vec3(slope.x*${pond ? '.35' : '.55'},slope.y*${pond ? '.35' : '.55'},0.));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float ripple=harborRipple(vHarborSurface);
      float crest=smoothstep(.72,1.0,ripple);
      diffuseColor.rgb*=.96+ripple*.045;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.47,.77,.79),crest*${pond ? '.035' : '.065'});
      ${pond ? 'float depthFalloff=smoothstep(.2,3.3,length(vHarborSurface)); diffuseColor.rgb*=mix(.32,1.12,depthFalloff);' : ''}
    `);
  };
  material.customProgramCacheKey = () => `island006-water-v2-${pond}`;
}

/** Separate slate color/relief channels; tile relief is physical material bump, not baked lighting. */
export function addHarborSlateSurface(material: THREE.MeshStandardMaterial) {
  const size=128, color=new Uint8Array(size*size*4), relief=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const row=Math.floor(y/16), col=Math.floor((x+(row%2)*16)/32);
    const localX=(x+(row%2)*16)%32, localY=y%16;
    const seed=(Math.sin(col*73.13+row*29.17)*437.13)%1;
    const seam=localX<1.5||localY<2;
    const shade=seam?.5:.86+Math.abs(seed)*.2+localY*.005;
    const i=(y*size+x)*4;
    color[i]=Math.round(180*shade);color[i+1]=Math.round(196*shade);color[i+2]=Math.round(205*shade);color[i+3]=255;
    const b=seam?50:Math.round(145+localY*4);
    relief[i]=relief[i+1]=relief[i+2]=b;relief[i+3]=255;
  }
  const map=new THREE.DataTexture(color,size,size,THREE.RGBAFormat);
  const bump=new THREE.DataTexture(relief,size,size,THREE.RGBAFormat);
  for(const t of [map,bump]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,1);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;}
  map.colorSpace=THREE.SRGBColorSpace;map.name='ISLAND_006_SLATE_ALBEDO';bump.name='ISLAND_006_SLATE_RELIEF';
  material.map=map;material.bumpMap=bump;material.bumpScale=.065;
}

export function createHarborV2Environment(root: THREE.Group, quality: Island3DQuality) {
  const group=new THREE.Group();group.name='ISLAND_006_V2_COAST_AND_WEATHER';root.add(group);
  const count=quality==='low'?48:quality==='medium'?88:128;
  const rockMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,flatShading:true});
  const rockGeo=new THREE.DodecahedronGeometry(1,0);
  const rocks=new THREE.InstancedMesh(rockGeo,rockMat,count);
  rocks.name='ISLAND_006_EMBEDDED_COASTAL_STRATA';
  const moss=new THREE.InstancedMesh(rockGeo,new THREE.MeshStandardMaterial({color:0x617c42,roughness:1,flatShading:true}),Math.floor(count/4));
  moss.name='ISLAND_006_MOSS_CONTACT_CAPS';
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2;
    const r=8.22+Math.sin(a*7+.2)*.24+Math.sin(a*11)*.17;
    dummy.position.set(Math.cos(a)*r,-.35+(i%3)*.17,Math.sin(a)*r*1.08);
    dummy.rotation.set(Math.sin(i*7)*.2,a,Math.cos(i*3)*.13);
    dummy.scale.set(.42+(i%4)*.14,.6+(i%5)*.13,.48+(i%3)*.14);
    dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
    color.setHex([0x566568,0x7f8880,0x687579,0x92998b][i%4]);rocks.setColorAt(i,color);
    if(i%4===0&&i/4<moss.count){dummy.position.y+=dummy.scale.y*.66;dummy.scale.multiply(new THREE.Vector3(.94,.11,.93));dummy.updateMatrix();moss.setMatrixAt(i/4,dummy.matrix);}
  }
  rocks.castShadow=rocks.receiveShadow=true;moss.receiveShadow=true;group.add(rocks,moss);
  const foamMat=new THREE.MeshBasicMaterial({color:0xd9eee2,transparent:true,opacity:.45,depthWrite:false});
  const foamCount=quality==='low'?42:90;
  const foam=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),foamMat,foamCount);
  foam.name='ISLAND_006_BROKEN_SHORE_FOAM';
  for(let i=0;i<foamCount;i++){
    const a=i/foamCount*Math.PI*2,r=8.72+Math.sin(a*7+.2)*.25;
    dummy.position.set(Math.cos(a)*r,-.67,Math.sin(a)*r*1.08);
    dummy.rotation.set(-Math.PI/2,0,-a);dummy.scale.set(.15+(i%3)*.09,.08+(i%5)*.018,1);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);
  }group.add(foam);
  // Rain is one transparent line batch, confined to the weather cycle, never a gameplay timer.
  const rainCount=quality==='low'?100:quality==='medium'?220:360;
  const positions=new Float32Array(rainCount*6);
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const rainMat=new THREE.LineBasicMaterial({color:0xc9e2e8,transparent:true,opacity:0,depthWrite:false});
  const rain=new THREE.LineSegments(rainGeo,rainMat);rain.name='ISLAND_006_HARBOR_SQUALL_RAIN';rain.frustumCulled=false;group.add(rain);
  return { update(elapsed:number,intensity:number){
    const rainStrength=THREE.MathUtils.smoothstep(intensity,.48,.88);
    rain.visible=rainStrength>.001;rainMat.opacity=rainStrength*.28;
    foamMat.opacity=.25+intensity*.32;
    for(let i=0;i<rainCount;i++){
      const x=(Math.sin(i*127.1)*43758.5453%1)*15;
      const z=(Math.sin(i*311.7)*19642.349%1)*15;
      const y=((i*.713-elapsed*(5+intensity*4))%12+12)%12+.8;
      const k=i*6;positions[k]=x;positions[k+1]=y;positions[k+2]=z;
      positions[k+3]=x+.18+intensity*.16;positions[k+4]=y-.45-intensity*.35;positions[k+5]=z+.04;
    }
    rainGeo.attributes.position.needsUpdate=true;
  }};
}
