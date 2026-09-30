import * as THREE from 'three';

/** Procedural mineral strata, independent of texture files or camera angle.
 * This is surface shading only: geological boundaries and collision stay fixed. */
export function applyIsland7RockSurfaceV2(material: THREE.MeshStandardMaterial) {
  const daylight = { value: 1 };
  material.userData.island7Daylight = daylight;
  material.onBeforeCompile = shader => {
    shader.uniforms.reefDaylight = daylight;
    shader.vertexShader = 'varying vec3 vReefRockPosition;\nvarying vec3 vReefRockNormal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vec4 reefPoint = vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        reefPoint = instanceMatrix * reefPoint;
      #endif
      vReefRockPosition = (modelMatrix * reefPoint).xyz;
      vec3 reefNormal = objectNormal;
      #ifdef USE_INSTANCING
        mat3 reefInstance = mat3(instanceMatrix);
        reefNormal /= vec3(dot(reefInstance[0],reefInstance[0]),dot(reefInstance[1],reefInstance[1]),dot(reefInstance[2],reefInstance[2]));
        reefNormal = reefInstance * reefNormal;
      #endif
      vReefRockNormal = normalize(mat3(modelMatrix) * reefNormal);
    `);
    shader.fragmentShader = `uniform float reefDaylight;
      varying vec3 vReefRockPosition;
      varying vec3 vReefRockNormal;
      float reefHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float reefNoise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(reefHash(i),reefHash(i+vec3(1,0,0)),f.x),mix(reefHash(i+vec3(0,1,0)),reefHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(reefHash(i+vec3(0,0,1)),reefHash(i+vec3(1,0,1)),f.x),mix(reefHash(i+vec3(0,1,1)),reefHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float reefMineral = reefNoise(vReefRockPosition*2.2);
      float reefGrain = reefNoise(vReefRockPosition*8.0);
      float reefStrata = smoothstep(.10,.32,abs(sin(vReefRockPosition.y*5.0+reefMineral*2.4)));
      diffuseColor.rgb *= (.68 + .48*reefMineral + .15*reefGrain) * mix(.90,1.0,reefStrata);
      // Deep pillars recede into the abyss; light stays concentrated on ledges.
      diffuseColor.rgb *= mix(.47,1.0,smoothstep(-8.0,-1.0,vReefRockPosition.y));
      // Continuous encrusting colonies connect the separate sculpted corals.
      // Everything is sampled in world space, including instanced foundations.
      float reefSlope = smoothstep(.18,.82,normalize(vReefRockNormal).y);
      float reefDepth = smoothstep(-11.0,-3.0,vReefRockPosition.y);
      float reefRegion = 1.0-smoothstep(8.0,13.0,length(vReefRockPosition.xz));
      float reefWarp = reefNoise(vReefRockPosition*.85);
      float reefColony = reefNoise(vReefRockPosition*1.65 + vec3(reefWarp*2.8));
      float reefRadius = length(vReefRockPosition.xz);
      float reefHabitat = mix(.12,1.0,smoothstep(3.3,5.2,reefRadius));
      reefHabitat *= smoothstep(.30,.59,reefNoise(vReefRockPosition*.63+vec3(7.1,2.3,4.9)));
      float reefCoverage = reefSlope * reefDepth * reefRegion * reefHabitat;
      float reefCrust = smoothstep(.38,.58,reefColony) * reefCoverage;
      vec3 reefLivingDay = mix(vec3(.035,.105,.045),vec3(.105,.235,.075),reefColony) * (.72+.40*reefGrain);
      vec3 reefLivingNight = mix(vec3(.018,.11,.13),vec3(.055,.27,.23),reefColony);
      diffuseColor.rgb = mix(diffuseColor.rgb,mix(reefLivingNight,reefLivingDay,reefDaylight),reefCrust*.87);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float reefLace = (1.0-smoothstep(.025,.11,abs(reefColony-.48))) * reefCoverage;
      float reefPolyps = pow(max(0.0,reefNoise(vReefRockPosition*19.0)-.42)*1.72,4.0);
      totalEmissiveRadiance += mix(vec3(.02,.43,.50),vec3(.08,.61,.32),reefWarp)
        * (reefLace*.20 + reefCrust*(.11+reefPolyps*3.0)) * (1.0-reefDaylight);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>' , `#include <fog_fragment>
      #ifdef USE_FOG
        float distantReef = smoothstep(8.0,16.0,length(vReefRockPosition.xz));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, distantReef * .55 * reefDaylight);
      #endif
    `);
  };
  material.customProgramCacheKey = () => 'island7-living-encrusted-reef-v3';
  material.needsUpdate = true;
}
