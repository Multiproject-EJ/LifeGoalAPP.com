import * as THREE from 'three';

/** Analytic overlapping scale relief. No new textures, rigs or gameplay ownership. */
export function addSeaDragonScaleSurface(material:THREE.MeshStandardMaterial, frequency:number) {
  const prior=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    prior.call(this,shader,renderer);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vDragonSurface;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDragonSurface=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vDragonSurface;
      float dragonScale(vec2 p) {
        float row=floor(p.y);p.x+=mod(row,2.)*.5;
        vec2 cell=fract(p)-.5;
        return smoothstep(.48,.34,length(cell*vec2(1.,1.23)));
      }
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 sp=vDragonSurface*${frequency.toFixed(3)};
      float scales=dragonScale(vec2(sp.z,sp.y));
      diffuseColor.rgb*=.97+scales*.035;
      diffuseColor.rgb+=vec3(.001,.003,.003)*scales;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor + (1.-scales)*.14,.34,.88);
    `);
  };
  material.customProgramCacheKey=()=>`sea-dragon-scales-v2-${frequency}`;
}

export function createSeaDragonNeckGeometry(radialSegments:number) {
  const profile:THREE.Vector2[]=[];
  // Lathe Y becomes local Z after rotation: rear socket radius equals body collar.
  for(let i=0;i<=20;i++){
    const t=i/20;
    profile.push(new THREE.Vector2(.81-.12*t+.035*Math.sin(t*Math.PI),-2.55+t*2.5));
  }
  const geo=new THREE.LatheGeometry(profile,radialSegments);
  geo.rotateX(Math.PI/2);
  // After +90 rotation, y of the profile is z, with no additional translation.
  return geo;
}
