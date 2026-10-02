import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';

/** Original branching reef, grown on raycast terrain rather than a painted backdrop. */
export function createIsland7ReefGardenV2(shelf: THREE.Object3D, quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'ISLAND_7_V2_REEF_GARDENS';
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  const anchors: THREE.Vector3[] = [];
  const maxColonies = quality === 'low' ? 15 : quality === 'medium' ? 24 : 37;
  const foundations = [[-4.55,-4.05],[4.55,-4.05],[-4.55,4.05],[4.55,4.05]];
  shelf.updateWorldMatrix(true, true);
  const plant = (x: number, z: number, separation: number) => {
    if (Math.hypot(x,z) < 4.8 || foundations.some(([bx,bz]) => Math.hypot(x-bx,z-bz) < 1.85)) return;
    ray.set(new THREE.Vector3(x,25,z),down);
    const hit = ray.intersectObject(shelf,true)[0];
    if (hit && hit.point.y > -6 && hit.point.y < 4.5 && anchors.every(p => p.distanceTo(hit.point) > separation)) anchors.push(hit.point.clone());
  };
  // Spend most of the existing plant budget in irregular beds beside the
  // architecture. The inward entrance sector and board remain unobstructed.
  const rimBudget = Math.floor(maxColonies * .80);
  for (let sample=0; sample<120 && anchors.length<rimBudget; sample++) {
    for (const [bx,bz] of foundations) {
      if (anchors.length >= rimBudget) break;
      const outward = sample % 4 === 0 ? Math.atan2(bz,bx) : Math.PI * .5;
      const a = outward + Math.sin(sample*2.399963)*1.10;
      const radius = 1.90 + (sample%5)*.16;
      plant(bx+Math.cos(a)*radius,bz+Math.sin(a)*radius,.30);
    }
  }
  for (let i=0; i<1500 && anchors.length<maxColonies; i++) {
    const a=i*2.3999632297, r=5.0+(i%23)*.30;
    plant(Math.cos(a)*r,Math.sin(a)*r,.9);
  }
  const stems: THREE.Matrix4[] = [], tips: THREE.Matrix4[] = [], blades: THREE.Matrix4[] = [], fans: THREE.Matrix4[] = [];
  const stemColors: THREE.Color[] = [], tipColors: THREE.Color[] = [];
  const pose = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  const palette = [0x4ee2d2, 0xaa75dd, 0x428ac7, 0xed9aae];
  const branch = (a: THREE.Vector3, b: THREE.Vector3, width: number, color: THREE.Color, end = false) => {
    const delta = b.clone().sub(a);
    pose.position.copy(a).add(b).multiplyScalar(0.5); pose.quaternion.setFromUnitVectors(up, delta.clone().normalize());
    pose.scale.set(width, delta.length(), width); pose.updateMatrix(); stems.push(pose.matrix.clone()); stemColors.push(color);
    if (end) { pose.position.copy(b); pose.quaternion.identity(); pose.scale.setScalar(width * 1.65); pose.updateMatrix(); tips.push(pose.matrix.clone()); tipColors.push(color.clone().lerp(new THREE.Color(0xd9fff0), 0.40)); }
  };
  anchors.forEach((point, index) => {
    const color = new THREE.Color(palette[index % palette.length]);
    const height = 0.36 + (index % 7) * 0.14;
    const yaw = index * 1.731;
    const local = (x: number,y: number,z: number) => new THREE.Vector3(x,y,z).applyAxisAngle(up,yaw).add(point);
    const stemTop = local(0.05,height * 0.74,0);
    branch(point, stemTop, 0.065, color);
    for (const side of [-1, 1]) {
      const fork = local(side * 0.21,height * 0.62,0.035);
      branch(local(0,height * 0.26,0),fork,0.045,color);
      branch(fork,local(side * 0.34,height * 0.97,0.10),0.028,color,true);
      branch(fork,local(side * 0.10,height * 1.03,-0.09),0.025,color,true);
    }
    branch(stemTop,local(0.10,height * 1.2,0.06),0.033,color,true);
    if (index % 2 === 0) {
      pose.position.copy(point).add(new THREE.Vector3(0.2,0.05,0.15)); pose.rotation.set(0,yaw,0);
      pose.scale.setScalar(0.48+(index%5)*0.10); pose.updateMatrix();fans.push(pose.matrix.clone());
      for (let leaf = 0; leaf < 3; leaf++) {
        pose.position.copy(point).add(new THREE.Vector3(Math.cos(leaf*2.1)*0.23,0,Math.sin(leaf*2.1)*0.23));
        pose.rotation.set(0,yaw + leaf * 2.1,0); pose.scale.set(0.7 + leaf * 0.15,0.6 + (index % 4)*0.18,1); pose.updateMatrix(); blades.push(pose.matrix.clone());
      }
    }
  });
  // Instanced colour affects diffuse AND emission, preserving cyan/violet families at night.
  const makeMaterial = (emission: number) => {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.08, emissive: 0xffffff, emissiveIntensity: emission });
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif');
    };
    material.customProgramCacheKey = () => 'island7-reef-instance-emission-v1';
    return material;
  };
  const stemMaterial = makeMaterial(0.03), tipMaterial = makeMaterial(0.2);
  const kelpMaterial = new THREE.MeshStandardMaterial({ color: 0x338d72, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x0c493f, emissiveIntensity: 0.1 });
  // A shared GPU current bends each leaf from its fixed base. Instance position
  // offsets the phase so adjacent beds do not move in mechanical lockstep.
  const currentTime = { value: 0 };
  kelpMaterial.onBeforeCompile = shader => {
    shader.uniforms.reefCurrentTime = currentTime;
    shader.vertexShader = `uniform float reefCurrentTime;
      vec4 reefLeafCurrent(vec3 p, float phase) {
        float h = clamp(p.y / 1.30, 0.0, 1.0);
        float a = reefCurrentTime * .65 + phase + h * .80;
        float b = reefCurrentTime * .51 + phase * .73 + h * .55;
        return vec4(.07 * h*h * sin(a), .035 * h*h * cos(b),
          .07 / 1.30 * (2.0*h*sin(a) + .80*h*h*cos(a)),
          .035 / 1.30 * (2.0*h*cos(b) - .55*h*h*sin(b)));
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      #include <beginnormal_vertex>
      float reefPhase = 0.0;
      #ifdef USE_INSTANCING
        reefPhase = dot(instanceMatrix[3].xz, vec2(1.31, .87));
      #endif
      vec4 reefFlow = reefLeafCurrent(position, reefPhase);
      objectNormal.y -= reefFlow.z * objectNormal.x + reefFlow.w * objectNormal.z;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      transformed.xz += reefFlow.xy;
    `);
  };
  kelpMaterial.customProgramCacheKey = () => 'island7-rooted-kelp-current-v1';
  const livingBatches: { mesh: THREE.InstancedMesh; nightColors: THREE.Color[]; dayColors: THREE.Color[] }[] = [];
  const batch = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, transforms: THREE.Matrix4[], colors?: THREE.Color[]) => {
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length); mesh.name = name;
    transforms.forEach((matrix,index) => { mesh.setMatrixAt(index,matrix); if (colors) mesh.setColorAt(index,colors[index]); });
    if (colors) livingBatches.push({ mesh, nightColors: colors.map(c => c.clone()), dayColors: colors.map((_, i) => new THREE.Color([0x397b50, 0x519563, 0x287660, 0x78a66b][i % 4])) });
    mesh.computeBoundingSphere(); root.add(mesh); return mesh;
  };
  batch('ISLAND_7_BRANCHING_CORAL',new THREE.CylinderGeometry(0.65,1,1,4,1,true),stemMaterial,stems,stemColors);
  batch('ISLAND_7_LUMINOUS_CORAL_TIPS',new THREE.OctahedronGeometry(1,0),tipMaterial,tips,tipColors);
  // Closed, tapered leaves retain volume when seen across the canyon.
  const leafPositions: number[] = [], leafIndices: number[] = [];
  const leafRows = 6, leafSides = 4;
  for (let row = 0; row <= leafRows; row++) {
    const t = row / leafRows;
    const width = .008 + Math.pow(Math.sin(Math.PI * t), .85) * .13;
    for (let side = 0; side < leafSides; side++) {
      const angle = side / leafSides * Math.PI * 2;
      leafPositions.push(Math.sin(t * 3.8) * .22 + Math.cos(angle) * width,
        t * 1.30, t * t * .25 + Math.sin(angle) * width * .24);
      if (row < leafRows) {
        const a = row * leafSides + side, b = row * leafSides + (side + 1) % leafSides;
        leafIndices.push(a, b, a + leafSides, b, b + leafSides, a + leafSides);
      }
    }
  }
  leafIndices.push(0, 2, 1, 0, 3, 2);
  const last = leafRows * leafSides;
  leafIndices.push(last, last + 1, last + 2, last, last + 2, last + 3);
  // Reverse the parametric winding so the closed leaf normals face outward.
  for (let i = 0; i < leafIndices.length; i += 3) [leafIndices[i + 1], leafIndices[i + 2]] = [leafIndices[i + 2], leafIndices[i + 1]];
  const ribbon = new THREE.BufferGeometry();
  ribbon.setAttribute('position', new THREE.Float32BufferAttribute(leafPositions, 3));
  ribbon.setIndex(leafIndices); ribbon.computeVertexNormals();
  const kelp = batch('ISLAND_7_RIBBON_KELP', ribbon, kelpMaterial, blades);
  // Account for maximum shader displacement when the static instance bounds cull.
  if (kelp.boundingSphere) kelp.boundingSphere.radius += .15;
  // A cupped fan with a rolled, scalloped rim and a real thin back surface.
  const fanPositions: number[] = [], fanIndices: number[] = [];
  const rings = 3, segments = 12, surfaceVertices = (rings + 1) * (segments + 1);
  for (let face = 0; face < 2; face++) {
    for (let ring = 0; ring <= rings; ring++) for (let segment = 0; segment <= segments; segment++) {
      const t = ring / rings, a = (segment / segments - .5) * 2.65;
      const r = .022 + t * .70;
      const scallop = 1 + Math.cos(a * 7) * .045 * t * t;
      fanPositions.push(Math.sin(a) * r * scallop, Math.cos(a) * r * scallop,
        r * r * .36 + Math.sin(a * 4) * .025 * t + (face ? -.015 : .015));
      if (ring < rings && segment < segments) {
        const v = face * surfaceVertices + ring * (segments + 1) + segment;
        if (face) fanIndices.push(v, v + 1, v + segments + 1, v + 1, v + segments + 2, v + segments + 1);
        else fanIndices.push(v, v + segments + 1, v + 1, v + 1, v + segments + 1, v + segments + 2);
      }
    }
  }
  const seam = (a: number, b: number) => fanIndices.push(a, b, a + surfaceVertices, b, b + surfaceVertices, a + surfaceVertices);
  for (let i = 0; i < segments; i++) { seam(i + 1, i); seam(rings * (segments + 1) + i, rings * (segments + 1) + i + 1); }
  for (let i = 0; i < rings; i++) { seam(i * (segments + 1), (i + 1) * (segments + 1)); seam((i + 1) * (segments + 1) + segments, i * (segments + 1) + segments); }
  for (let i = 0; i < fanIndices.length; i += 3) [fanIndices[i + 1], fanIndices[i + 2]] = [fanIndices[i + 2], fanIndices[i + 1]];
  const fanGeometry = new THREE.BufferGeometry();
  fanGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fanPositions, 3));
  fanGeometry.setIndex(fanIndices); fanGeometry.computeVertexNormals();
  const fanMaterial=makeMaterial(.04);fanMaterial.side=THREE.DoubleSide;
  batch('ISLAND_7_SCALLOPED_PLATE_CORAL',fanGeometry,fanMaterial,fans,fans.map((_,i)=>new THREE.Color(i%2?0x8550a9:0x258f9d)));
  const rubbleTransforms:THREE.Matrix4[]=[],rubbleColors:THREE.Color[]=[];
  anchors.forEach((point,index)=>{
    for(let stone=0;stone<4;stone++){
      const a=stone*1.7+index*.43,x=point.x+Math.cos(a)*.28,z=point.z+Math.sin(a)*.28;
      ray.set(new THREE.Vector3(x,point.y+1,z),down);const hit=ray.intersectObject(shelf,true)[0];
      if(!hit || Math.abs(hit.point.y-point.y)>.4)continue;
      pose.position.copy(hit.point).add(new THREE.Vector3(0,.025,0));pose.rotation.set(.15*Math.sin(index),a,.1*Math.cos(stone));
      pose.scale.set(.23+stone*.025,.09+(index%3)*.025,.20+stone*.035);pose.updateMatrix();rubbleTransforms.push(pose.matrix.clone());
      rubbleColors.push(new THREE.Color(index%3===0?0x4d7688:index%3===1?0x356b6d:0x527d75));
    }
  });
  batch('ISLAND_7_ENCRUSTED_REEF_RUBBLE',new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98,metalness:0}),rubbleTransforms,rubbleColors);
  let nightMix=0;
  const blendColor = new THREE.Color();
  root.userData.colonies = anchors.length;
  return {
    root,
    animate: (elapsed: number) => {
      currentTime.value = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
      tipMaterial.emissiveIntensity = (.025 + nightMix * 2.4) * (1 + Math.sin(elapsed * .65) * .08);
      fanMaterial.emissiveIntensity = .015 + nightMix * (.48 + Math.sin(elapsed * .43 + 1.2) * .04);
    },
    setNight: (night: number) => {
      nightMix = THREE.MathUtils.clamp(night, 0, 1);
      for (const { mesh, dayColors, nightColors } of livingBatches) {
        dayColors.forEach((day, i) => mesh.setColorAt(i, blendColor.copy(day).lerp(nightColors[i], nightMix)));
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      stemMaterial.emissiveIntensity = .015 + nightMix * .65;
      tipMaterial.emissiveIntensity = .025 + nightMix * 2.4;
      fanMaterial.emissiveIntensity = .015 + nightMix * .48;
      kelpMaterial.color.setHex(0x43864b).lerp(new THREE.Color(0x288d80), nightMix);
      kelpMaterial.emissive.setHex(0x20bc92);
      kelpMaterial.emissiveIntensity = .01 + nightMix * .28;
    },
  };
}
