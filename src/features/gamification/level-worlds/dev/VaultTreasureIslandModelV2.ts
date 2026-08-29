import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import type {
  VaultIslandQuality,
  VaultTreasureIslandOptions,
  VaultTreasureIslandRuntime,
} from './VaultTreasureIslandModel';
import type { VaultIslandPerimeterStyle } from '../services/islandRunVaultCustomization';
import { createVaultSurfacePatternTexture } from './VaultPremiumLookdev';

type Materials = ReturnType<typeof createMaterials>['materials'];

const CLIFF_RADIUS = 2.82;
const GARDEN_Y = 2.18;
const PALACE_Y = 2.4;

function segments(quality: VaultIslandQuality, low: number, medium: number, high: number) {
  return quality === 'low' ? low : quality === 'medium' ? medium : high;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], name: string) {
  const output = new THREE.Mesh(geometry, material);
  output.name = name;
  output.castShadow = true;
  output.receiveShadow = true;
  return output;
}

function cylinder(top: number, bottom: number, height: number, count: number, material: THREE.Material, name: string) {
  return mesh(new THREE.CylinderGeometry(top, bottom, height, count), material, name);
}

function band(radius: number, tube: number, material: THREE.Material, quality: VaultIslandQuality, name: string) {
  const output = mesh(
    new THREE.TorusGeometry(radius, tube, segments(quality, 6, 8, 10), segments(quality, 48, 72, 104)),
    material,
    name,
  );
  output.rotation.x = Math.PI / 2;
  return output;
}

function cylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material, name: string) {
  const direction = end.clone().sub(start);
  const output = cylinder(radius, radius, direction.length(), 5, material, name);
  output.position.copy(start).add(end).multiplyScalar(0.5);
  output.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return output;
}

function archedPanel(width: number, sideHeight: number, depth: number) {
  const radius = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.lineTo(radius, sideHeight);
  shape.absarc(0, sideHeight, radius, 0, Math.PI, false);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: Math.min(0.018, depth * 0.18),
    bevelThickness: Math.min(0.012, depth * 0.12),
    bevelSegments: 2,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createPalaceShellGeometry() {
  const shape = new THREE.Shape();
  const outline = [
    [-1.32, 0], [-1.32, 1.56], [-1.08, 1.56], [-1.08, 1.9], [-0.84, 1.9], [-0.84, 2.2],
    [0.84, 2.2], [0.84, 1.9], [1.08, 1.9], [1.08, 1.56], [1.32, 1.56], [1.32, 0],
  ] as const;
  shape.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  const portal = new THREE.Path();
  portal.moveTo(-0.42, 0.01);
  portal.lineTo(0.42, 0.01);
  portal.lineTo(0.42, 0.82);
  portal.absarc(0, 0.82, 0.42, 0, Math.PI, false);
  portal.lineTo(-0.42, 0.01);
  portal.closePath();
  shape.holes.push(portal);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1.48,
    bevelEnabled: true,
    bevelSize: 0.045,
    bevelThickness: 0.035,
    bevelSegments: 3,
    curveSegments: 18,
  });
  geometry.translate(0, 0, -0.74);
  return geometry;
}

function createCalmWaterNormalTexture(size = 128) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const nx = Math.cos(u * 2.0 + Math.sin(v * 1.5)) * 0.22 + Math.cos(v * 3.0) * 0.08;
      const nz = Math.sin(v * 2.0 + Math.cos(u * 1.25)) * 0.2 + Math.sin(u * 3.5) * 0.07;
      const normal = new THREE.Vector3(nx, 1, nz).normalize();
      const offset = (y * size + x) * 4;
      data[offset] = Math.round((normal.x * 0.5 + 0.5) * 255);
      data[offset + 1] = Math.round((normal.z * 0.5 + 0.5) * 255);
      data[offset + 2] = Math.round((normal.y * 0.5 + 0.5) * 255);
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = 'vault-v2-calm-water-normal-field';
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createMaterials() {
  const hammered = createVaultSurfacePatternTexture('vault-v2-hammered-metal', 'hammered-metal', 7, 7);
  const marbleVein = createVaultSurfacePatternTexture('vault-v2-marble-vein', 'marble-vein', 3.5, 5.5);
  const cutStone = createVaultSurfacePatternTexture('vault-v2-cut-stone', 'cut-stone', 8, 5);
  hammered.colorSpace = THREE.NoColorSpace;
  marbleVein.colorSpace = THREE.NoColorSpace;
  cutStone.colorSpace = THREE.NoColorSpace;
  const materials = {
    seabed: new THREE.MeshStandardMaterial({ color: '#168f9d', roughness: 0.92, metalness: 0 }),
    reefSand: new THREE.MeshStandardMaterial({ color: '#7ac7b7', roughness: 0.86, metalness: 0, transparent: true, opacity: 0.5 }),
    foam: new THREE.MeshBasicMaterial({ color: '#d9fbff', transparent: true, opacity: 0.46, blending: THREE.AdditiveBlending, depthWrite: false }),
    sunDisc: new THREE.MeshBasicMaterial({ color: '#ffd35a', fog: false, toneMapped: false }),
    sunHalo: new THREE.MeshBasicMaterial({ color: '#ff941f', fog: false, transparent: true, opacity: 0.46, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    cloudWarm: new THREE.MeshStandardMaterial({ color: '#e99350', roughness: 1, metalness: 0, emissive: '#3b1300', emissiveIntensity: 0.1, transparent: true, opacity: 0.56, depthWrite: false }),
    cloudShadow: new THREE.MeshStandardMaterial({ color: '#6f5d68', roughness: 1, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false }),
    rock: new THREE.MeshStandardMaterial({ color: '#59636a', roughness: 0.86, metalness: 0.02 }),
    horizonRock: new THREE.MeshStandardMaterial({ color: '#2f5c5b', roughness: 0.92, metalness: 0, emissive: '#173b36', emissiveIntensity: 0.14 }),
    horizonGreen: new THREE.MeshStandardMaterial({ color: '#214f41', roughness: 0.96, metalness: 0 }),
    stone: new THREE.MeshPhysicalMaterial({ color: '#cbb895', roughness: 0.7, roughnessMap: cutStone, bumpMap: cutStone, bumpScale: 0.065, envMapIntensity: 0.48 }),
    stoneShade: new THREE.MeshStandardMaterial({ color: '#7f6b52', roughness: 0.86, bumpMap: cutStone, bumpScale: 0.075 }),
    limestone: new THREE.MeshPhysicalMaterial({ color: '#e3d1ae', roughness: 0.5, roughnessMap: cutStone, metalness: 0, clearcoat: 0.06, clearcoatRoughness: 0.52, bumpMap: cutStone, bumpScale: 0.052, envMapIntensity: 0.7 }),
    marble: new THREE.MeshPhysicalMaterial({ color: '#f2e3ca', roughness: 0.34, metalness: 0.01, clearcoat: 0.3, clearcoatRoughness: 0.26, bumpMap: marbleVein, bumpScale: 0.022, envMapIntensity: 0.84 }),
    gold: new THREE.MeshPhysicalMaterial({ color: '#d7a029', roughness: 0.1, metalness: 1, clearcoat: 0.62, clearcoatRoughness: 0.045, bumpMap: hammered, bumpScale: 0.009, emissive: '#2a1000', emissiveIntensity: 0.045, envMapIntensity: 2.15 }),
    royalGold: new THREE.MeshPhysicalMaterial({ color: '#ffd552', roughness: 0.12, metalness: 0.62, clearcoat: 0.78, clearcoatRoughness: 0.045, bumpMap: hammered, bumpScale: 0.008, emissive: '#8a3e00', emissiveIntensity: 0.17, envMapIntensity: 3.1 }),
    darkGold: new THREE.MeshPhysicalMaterial({ color: '#8e5d10', roughness: 0.22, metalness: 1, bumpMap: hammered, bumpScale: 0.016, envMapIntensity: 1.55 }),
    blackMetal: new THREE.MeshPhysicalMaterial({ color: '#11161c', roughness: 0.24, metalness: 0.82, clearcoat: 0.45, clearcoatRoughness: 0.1, envMapIntensity: 1.5 }),
    silver: new THREE.MeshPhysicalMaterial({ color: '#e5edf2', roughness: 0.085, metalness: 1, clearcoat: 0.72, clearcoatRoughness: 0.04, bumpMap: hammered, bumpScale: 0.008, envMapIntensity: 2.3 }),
    blue: new THREE.MeshPhysicalMaterial({ color: '#082d6d', roughness: 0.11, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.65 }),
    garden: new THREE.MeshStandardMaterial({ color: '#2f7254', roughness: 0.86 }),
    gardenDark: new THREE.MeshStandardMaterial({ color: '#174a38', roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: '#5b351e', roughness: 0.82 }),
    window: new THREE.MeshPhysicalMaterial({ color: '#07192b', roughness: 0.18, metalness: 0.14, clearcoat: 0.72, emissive: '#d78928', emissiveIntensity: 0.58, envMapIntensity: 1.1 }),
    void: new THREE.MeshStandardMaterial({ color: '#030913', roughness: 0.8, metalness: 0, emissive: '#06152b', emissiveIntensity: 0.2 }),
    warmGlow: new THREE.MeshBasicMaterial({ color: '#ffd681', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    cyan: new THREE.MeshPhysicalMaterial({ color: '#55d6e8', roughness: 0.055, transmission: 0.5, thickness: 0.44, clearcoat: 1, emissive: '#073844', emissiveIntensity: 0.22, envMapIntensity: 1.95 }),
    purple: new THREE.MeshPhysicalMaterial({ color: '#6925b9', roughness: 0.055, transmission: 0.3, thickness: 0.34, clearcoat: 1, emissive: '#260549', emissiveIntensity: 0.2, envMapIntensity: 1.95 }),
    ruby: new THREE.MeshPhysicalMaterial({ color: '#c9274b', roughness: 0.06, transmission: 0.22, thickness: 0.3, clearcoat: 1, emissive: '#410613', emissiveIntensity: 0.16, envMapIntensity: 1.85 }),
    sail: new THREE.MeshStandardMaterial({ color: '#fff4de', roughness: 0.5, side: THREE.DoubleSide }),
  };
  materials.stone.name = 'vault-v2-weathered-honey-limestone';
  materials.stoneShade.name = 'vault-v2-deep-limestone-reveal';
  materials.limestone.name = 'vault-v2-dressed-honey-limestone';
  materials.marble.name = 'vault-v2-polished-warm-marble-trim';
  materials.royalGold.name = 'vault-v2-royal-solid-gold';
  return { materials, textures: [hammered, marbleVein, cutStone] };
}

function addBoat(root: THREE.Group, materials: Materials, x: number, z: number, scale: number, rotation: number) {
  const boat = new THREE.Group();
  boat.name = 'vault-v2-sailboat';
  boat.position.set(x, -0.18, z);
  boat.userData.basePosition = boat.position.clone();
  boat.userData.phase = Math.abs(x * 0.71 + z * 0.43);
  boat.rotation.y = rotation;
  boat.scale.setScalar(scale);
  const hull = mesh(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), materials.darkGold, 'vault-v2-boat-hull');
  hull.rotation.z = Math.PI / 2;
  boat.add(hull);
  const mast = cylinder(0.012, 0.016, 0.65, 6, materials.gold, 'vault-v2-boat-mast');
  mast.position.y = 0.33;
  boat.add(mast);
  const sail = mesh(new THREE.ConeGeometry(0.25, 0.55, 3), materials.sail, 'vault-v2-boat-sail');
  sail.position.set(0.12, 0.38, 0);
  sail.rotation.z = -Math.PI / 2;
  boat.add(sail);
  root.add(boat);
  return boat;
}

function addCloudBank(
  root: THREE.Group,
  materials: Materials,
  quality: VaultIslandQuality,
  position: readonly [number, number, number],
  scale: number,
  phase: number,
) {
  const cloud = new THREE.Group();
  cloud.name = 'vault-v2-animated-three-dimensional-cloud-bank';
  cloud.position.set(...position);
  cloud.userData.basePosition = cloud.position.clone();
  cloud.userData.phase = phase;
  const puffCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8;
  for (let index = 0; index < puffCount; index += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.62 + (index % 3) * 0.16,
        segments(quality, 8, 12, 18),
        segments(quality, 6, 8, 12),
      ),
      index % 4 === 0 ? materials.cloudShadow : materials.cloudWarm,
    );
    puff.name = 'vault-v2-soft-volumetric-cloud-puff';
    puff.position.set(
      (index - (puffCount - 1) * 0.5) * 0.54,
      Math.sin(index * 1.43 + phase) * 0.2,
      Math.cos(index * 1.17 + phase) * 0.18,
    );
    puff.scale.set(1.2, 0.38 + (index % 2) * 0.12, 0.62);
    puff.castShadow = false;
    puff.receiveShadow = false;
    cloud.add(puff);
  }
  cloud.scale.setScalar(scale);
  root.add(cloud);
  return cloud;
}

function addEnvironment(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const sunDirection = new THREE.Vector3(-0.44, 0.045, -0.9).normalize();
  const sky = new Sky();
  sky.name = 'vault-v2-three-dimensional-sunset-sky-dome';
  sky.scale.setScalar(10000);
  sky.frustumCulled = false;
  const skyMaterial = sky.material as THREE.ShaderMaterial;
  skyMaterial.uniforms.turbidity.value = 11.2;
  skyMaterial.uniforms.rayleigh.value = 1.0;
  skyMaterial.uniforms.mieCoefficient.value = 0.012;
  skyMaterial.uniforms.mieDirectionalG.value = 0.91;
  skyMaterial.uniforms.sunPosition.value.copy(sunDirection).multiplyScalar(1000);
  skyMaterial.uniforms.cloudScale.value = 0.001;
  skyMaterial.uniforms.cloudSpeed.value = 0.018;
  skyMaterial.uniforms.cloudCoverage.value = 0.58;
  skyMaterial.uniforms.cloudDensity.value = 0.7;
  skyMaterial.uniforms.cloudElevation.value = 0.46;
  skyMaterial.uniforms.showSunDisc.value = 0;
  sky.renderOrder = -1000;
  root.add(sky);

  const goldenSkyMaterial = new THREE.ShaderMaterial({
    name: 'vault-v2-animated-golden-scattering-material',
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      time: { value: 0 },
      sunDirection: { value: sunDirection.clone() },
    },
    vertexShader: `
      varying vec3 vVaultSkyDirection;
      void main() {
        vVaultSkyDirection = normalize(position);
        vec4 projectedPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectedPosition.xyww;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 sunDirection;
      varying vec3 vVaultSkyDirection;

      void main() {
        vec3 direction = normalize(vVaultSkyDirection);
        float elevation = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
        float horizon = pow(1.0 - clamp(abs(direction.y), 0.0, 1.0), 1.35);
        float sunFacing = pow(max(dot(direction, normalize(sunDirection)), 0.0), 4.0);
        float cloudWaveA = sin(direction.x * 18.0 + direction.z * 11.0 + time * 0.025);
        float cloudWaveB = sin(direction.x * 31.0 - direction.z * 17.0 - time * 0.018);
        float cloudNoise = cloudWaveA * 0.58 + cloudWaveB * 0.42;
        float cloudBand = smoothstep(0.18, 0.82, cloudNoise) * horizon;

        vec3 zenith = vec3(0.48, 0.30, 0.29);
        vec3 upperAmber = vec3(1.0, 0.49, 0.10);
        vec3 horizonGold = vec3(1.0, 0.76, 0.27);
        vec3 sunsetOrange = vec3(1.0, 0.32, 0.055);
        vec3 cloudGold = vec3(1.0, 0.76, 0.34);
        vec3 color = mix(zenith, upperAmber, pow(horizon, 0.58) * 0.96);
        color = mix(color, horizonGold, pow(horizon, 1.55) * 0.82);
        color = mix(color, sunsetOrange, horizon * sunFacing * 0.68);
        color = mix(color, cloudGold, cloudBand * (0.4 + sunFacing * 0.25));
        color += vec3(1.0, 0.62, 0.18) * pow(sunFacing, 2.4) * 0.34;
        color *= mix(0.9, 1.08, elevation);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const goldenSky = new THREE.Mesh(
    new THREE.SphereGeometry(9200, segments(quality, 16, 24, 32), segments(quality, 10, 16, 20)),
    goldenSkyMaterial,
  );
  goldenSky.name = 'vault-v2-animated-golden-scattering-dome';
  goldenSky.frustumCulled = false;
  goldenSky.renderOrder = -999;
  goldenSky.castShadow = false;
  goldenSky.receiveShadow = false;
  root.add(goldenSky);

  const sunsetSun = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, segments(quality, 12, 18, 24), segments(quality, 8, 12, 16)),
    materials.sunDisc,
  );
  sunsetSun.name = 'vault-v2-three-dimensional-sunset-sun';
  sunsetSun.position.set(-5.8, 4.35, -15);
  sunsetSun.castShadow = false;
  sunsetSun.receiveShadow = false;
  sunsetSun.renderOrder = 10;
  const sunsetHalo = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, segments(quality, 12, 18, 24), segments(quality, 8, 12, 16)),
    materials.sunHalo,
  );
  sunsetHalo.name = 'vault-v2-three-dimensional-sunset-halo';
  sunsetHalo.position.copy(sunsetSun.position);
  sunsetHalo.castShadow = false;
  sunsetHalo.receiveShadow = false;
  sunsetHalo.renderOrder = 11;
  root.add(sunsetSun, sunsetHalo);

  const seabed = mesh(
    new THREE.PlaneGeometry(180, 180, 1, 1),
    materials.seabed,
    'vault-v2-submerged-crystalline-seabed',
  );
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -1.45;
  seabed.castShadow = false;
  seabed.receiveShadow = false;
  root.add(seabed);
  const reefPatches = [
    [-8, 8, 3.8, 1.8], [7.5, 10, 4.4, 2.1], [-10, -2, 3.1, 1.5],
    [9.5, -4, 3.6, 1.7], [-3, 14, 2.8, 1.3], [2.2, 13.5, 5.2, 2.5],
  ] as const;
  reefPatches.forEach(([x, z, width, depth], index) => {
    const reef = mesh(
      new THREE.CircleGeometry(1, segments(quality, 20, 28, 36)),
      materials.reefSand,
      'vault-v2-submerged-sunlit-reef-patch',
    );
    reef.rotation.x = -Math.PI / 2;
    reef.rotation.z = index * 0.74;
    reef.scale.set(width, depth, 1);
    reef.position.set(x, -1.4 + (index % 2) * 0.015, z);
    reef.castShadow = false;
    reef.receiveShadow = false;
    root.add(reef);
  });

  const waterNormals = createCalmWaterNormalTexture(quality === 'low' ? 64 : 128);
  const ocean = new Water(new THREE.PlaneGeometry(180, 180, 1, 1), {
    textureWidth: quality === 'low' ? 128 : 256,
    textureHeight: quality === 'low' ? 128 : 256,
    waterNormals,
    sunDirection,
    sunColor: '#ffc164',
    waterColor: '#25a6aa',
    distortionScale: 0.62,
    alpha: 0.74,
    fog: true,
  });
  ocean.name = 'vault-v2-ocean';
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.34;
  ocean.castShadow = false;
  ocean.receiveShadow = true;
  ocean.material.transparent = true;
  ocean.material.depthWrite = false;
  (ocean.material as THREE.ShaderMaterial).uniforms.size.value = 0.82;
  root.add(ocean);
  const waveCount = quality === 'low' ? 8 : 16;
  for (let index = 0; index < waveCount; index += 1) {
    const foamMaterial = materials.foam.clone();
    foamMaterial.opacity = 0.1 + (index % 4) * 0.035;
    const arcRadius = 3.05 + (index % 8) * 0.62;
    const arc = 0.42 + (index % 5) * 0.11;
    const foam = mesh(new THREE.TorusGeometry(arcRadius, 0.008 + (index % 3) * 0.004, 5, segments(quality, 28, 42, 60), arc), foamMaterial, 'vault-v2-natural-ocean-wave-arc');
    foam.rotation.x = -Math.PI / 2;
    foam.rotation.z = (index * 2.399) % (Math.PI * 2);
    foam.position.set(Math.sin(index * 1.73) * 0.7, -0.31 + (index % 3) * 0.003, Math.cos(index * 1.37) * 0.5);
    foam.userData.phase = index * 0.63;
    root.add(foam);
  }
  const distant = [[-9.2, -10.5, 0.72], [9.0, -10.8, 0.68], [-10.2, -3.4, 0.48], [9.8, -2.8, 0.52]] as const;
  distant.forEach(([x, z, scale], islandIndex) => {
    const island = mesh(new THREE.SphereGeometry(0.64, 12, 7), materials.horizonRock, 'vault-v2-distant-island');
    island.scale.set(1.15 * scale, 0.28 * scale, 0.72 * scale);
    island.position.set(x, -0.27, z);
    root.add(island);
    for (let index = 0; index < 3; index += 1) {
      const crown = mesh(new THREE.SphereGeometry(0.11 * scale, 8, 6), materials.horizonGreen, 'vault-v2-distant-tree');
      crown.scale.set(1.1, 0.85, 1);
      crown.position.set(x + (index - 1) * 0.2, 0.02, z + ((index + islandIndex) % 2) * 0.1);
      root.add(crown);
    }
  });
  const horizonIslands = [[-7.4, -13.2, 1.9], [-3.1, -16.4, 1.25], [3.2, -16.2, 1.4], [7.7, -12.8, 2.0]] as const;
  horizonIslands.forEach(([x, z, scale], islandIndex) => {
    const rock = mesh(new THREE.SphereGeometry(0.78, 14, 8), materials.horizonRock, 'vault-v2-horizon-cliff-island');
    rock.scale.set(1.35 * scale, 0.32 * scale, 0.76 * scale);
    rock.position.set(x, -0.22, z);
    root.add(rock);
    for (let peak = 0; peak < 3; peak += 1) {
      const mountain = mesh(new THREE.DodecahedronGeometry(0.42 * scale, 1), materials.horizonRock, 'vault-v2-horizon-mountain-peak');
      mountain.scale.set(1.05 - peak * 0.12, 1.18 + peak * 0.18, 0.86);
      mountain.position.set(x + (peak - 1) * 0.48 * scale, 0.18 + peak * 0.1, z + ((peak + islandIndex) % 2) * 0.2);
      root.add(mountain);
      const tree = mesh(new THREE.SphereGeometry(0.15 * scale, 8, 6), materials.horizonGreen, 'vault-v2-horizon-cypress');
      tree.scale.set(1.2, 0.78, 1);
      tree.position.set(x + (peak - 1) * 0.38 * scale, 0.55 + peak * 0.09, z - 0.24);
      root.add(tree);
    }
  });
  addCloudBank(root, materials, quality, [-8.5, 5.0, -15], 0.82, 0.4);
  addCloudBank(root, materials, quality, [-1.5, 6.3, -20], 0.62, 1.8);
  addCloudBank(root, materials, quality, [4.2, 4.8, -16], 0.52, 3.1);
  addCloudBank(root, materials, quality, [8.6, 5.8, -21], 0.7, 4.4);
  addCloudBank(root, materials, quality, [-4.8, 3.85, -12], 0.4, 5.7);
  addBoat(root, materials, -4.1, 3.15, 0.9, -0.55);
  addBoat(root, materials, 4.25, 2.65, 0.62, 0.68);
  addBoat(root, materials, -3.45, -1.85, 0.52, 0.12);
  return { ocean, sky, goldenSky, waterNormals };
}

function addRockAndMasonry(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const backing = cylinder(2.68, 2.86, 1.92, segments(quality, 40, 64, 80), materials.stoneShade, 'vault-v2-massive-cliff-backing');
  backing.position.y = 0.78;
  root.add(backing);
  const lowerRock = cylinder(2.77, 3.02, 0.52, segments(quality, 22, 30, 42), materials.rock, 'vault-v2-faceted-rock-waterline');
  lowerRock.position.y = -0.02;
  root.add(lowerRock);
  const blockCount = quality === 'low' ? 24 : quality === 'medium' ? 32 : 40;
  const rows = quality === 'low' ? 6 : 8;
  for (let row = 0; row < rows; row += 1) {
    const angularOffset = row % 2 === 0 ? 0 : Math.PI / blockCount;
    for (let index = 0; index < blockCount; index += 1) {
      const angle = (index / blockCount) * Math.PI * 2 + angularOffset;
      const block = mesh(new THREE.BoxGeometry((Math.PI * 2 * CLIFF_RADIUS) / blockCount * 0.9, 0.19, 0.19), row % 3 === 0 ? materials.stone : materials.limestone, 'vault-v2-individual-ashlar-block');
      block.position.set(Math.sin(angle) * CLIFF_RADIUS, 0.2 + row * 0.225, Math.cos(angle) * CLIFF_RADIUS);
      block.rotation.y = angle;
      root.add(block);
    }
  }
  for (let index = 0; index < 38; index += 1) {
    const angle = (index / 38) * Math.PI * 2;
    const radius = 2.92 + (index % 3) * 0.08;
    const rock = mesh(new THREE.DodecahedronGeometry(0.19 + (index % 4) * 0.025, 0), materials.rock, 'vault-v2-waterline-rock');
    rock.position.set(Math.sin(angle) * radius, -0.17 + (index % 2) * 0.05, Math.cos(angle) * radius);
    rock.rotation.set(angle * 0.6, angle, angle * 0.23);
    root.add(rock);
  }
  const courses: Array<[number, number, number, THREE.Material, string]> = [
    [2.84, 0.3, 0.025, materials.gold, 'vault-v2-lower-foundation-gold-course'],
    [2.84, 0.99, 0.035, materials.gold, 'vault-v2-lower-gallery-cornice'],
    [2.82, 1.68, 0.038, materials.gold, 'vault-v2-upper-gallery-cornice'],
    [2.78, 1.96, 0.055, materials.marble, 'vault-v2-cliff-crown-cornice'],
  ];
  courses.forEach(([radius, y, tube, material, name]) => {
    const course = band(radius, tube, material, quality, name);
    course.position.y = y;
    root.add(course);
  });
}

function addGalleryBay(root: THREE.Group, materials: Materials, quality: VaultIslandQuality, angle: number, bottomY: number, index: number) {
  const bay = new THREE.Group();
  bay.name = bottomY < 1 ? 'vault-v2-lower-inhabited-gallery-bay' : 'vault-v2-upper-inhabited-gallery-bay';
  bay.position.set(Math.sin(angle) * 2.925, bottomY, Math.cos(angle) * 2.925);
  bay.rotation.y = angle;
  const stoneReveal = mesh(archedPanel(0.56, 0.44, 0.12), materials.stoneShade, 'vault-v2-deep-gallery-stone-reveal');
  stoneReveal.position.z = -0.035;
  bay.add(stoneReveal);
  bay.add(mesh(archedPanel(0.48, 0.4, 0.085), materials.void, 'vault-v2-deep-gallery-recess'));
  const shadowPocket = mesh(archedPanel(0.37, 0.31, 0.035), materials.void, 'vault-v2-gallery-inner-shadow-pocket');
  shadowPocket.position.z = 0.09;
  bay.add(shadowPocket);
  const stoneArch = mesh(new THREE.TorusGeometry(0.28, 0.05, 8, segments(quality, 18, 26, 34), Math.PI), materials.limestone, 'vault-v2-gallery-stone-arch');
  stoneArch.position.set(0, 0.44, 0.065);
  bay.add(stoneArch);
  const goldArch = mesh(new THREE.TorusGeometry(0.24, 0.018, 7, segments(quality, 18, 28, 38), Math.PI), materials.gold, 'vault-v2-gallery-inner-gold-arch');
  goldArch.position.set(0, 0.4, 0.105);
  bay.add(goldArch);
  for (const side of [-1, 1] as const) {
    const jamb = cylinder(0.018, 0.028, 0.41, 7, materials.gold, 'vault-v2-gallery-gold-jamb');
    jamb.position.set(side * 0.24, 0.205, 0.105);
    bay.add(jamb);
  }
  const plinth = cylinder(0.12, 0.15, 0.07, 10, materials.darkGold, 'vault-v2-gallery-treasure-plinth');
  plinth.position.set(0, 0.08, 0.12);
  bay.add(plinth);
  const treasureMaterial = index % 3 === 0 ? materials.purple : index % 3 === 1 ? materials.cyan : materials.ruby;
  const treasure = mesh(index % 4 === 0 ? new THREE.OctahedronGeometry(0.1, 0) : new THREE.ConeGeometry(0.085, 0.2, 6), treasureMaterial, 'vault-v2-visible-gallery-treasure');
  treasure.position.set(0, 0.26, 0.15);
  bay.add(treasure);
  const reliquaryHalo = mesh(new THREE.TorusGeometry(0.115, 0.014, 7, 24), materials.gold, 'vault-v2-gallery-reliquary-halo');
  reliquaryHalo.position.set(0, 0.27, 0.145);
  bay.add(reliquaryHalo);
  const canopy = mesh(new THREE.BoxGeometry(0.38, 0.035, 0.13), materials.gold, 'vault-v2-gallery-gilded-canopy');
  canopy.position.set(0, 0.6, 0.075);
  bay.add(canopy);
  const sill = mesh(new THREE.BoxGeometry(0.58, 0.055, 0.17), materials.marble, 'vault-v2-gallery-projecting-marble-sill');
  sill.position.set(0, 0.015, 0.075);
  bay.add(sill);
  for (const side of [-1, 1] as const) {
    const sideColumn = cylinder(0.022, 0.032, 0.53, 8, materials.gold, 'vault-v2-gallery-turned-gold-column');
    sideColumn.position.set(side * 0.255, 0.28, 0.1);
    bay.add(sideColumn);
  }
  const glow = mesh(new THREE.CircleGeometry(0.18, 18), materials.warmGlow, 'vault-v2-gallery-case-glow');
  glow.position.set(0, 0.27, 0.12);
  bay.add(glow);
  const museumLabel = mesh(new THREE.BoxGeometry(0.24, 0.055, 0.025), materials.blue, 'vault-v2-gallery-midnight-enamel-museum-label');
  museumLabel.position.set(0, 0.075, 0.19);
  bay.add(museumLabel);
  const labelStud = mesh(new THREE.OctahedronGeometry(0.018, 0), materials.gold, 'vault-v2-gallery-museum-label-gold-stud');
  labelStud.position.set(-0.09, 0.075, 0.21);
  bay.add(labelStud);
  root.add(bay);
}

function addGallerySconce(root: THREE.Group, materials: Materials, angle: number, y: number, index: number) {
  const sconce = new THREE.Group();
  sconce.name = 'vault-v2-gallery-jeweled-wall-sconce';
  sconce.position.set(Math.sin(angle) * 3.055, y, Math.cos(angle) * 3.055);
  sconce.rotation.y = angle;
  const backplate = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.028, 12), materials.gold, 'vault-v2-gallery-sconce-hammered-gold-backplate');
  backplate.rotation.x = Math.PI / 2;
  backplate.position.z = 0.025;
  sconce.add(backplate);
  const arm = cylinder(0.012, 0.018, 0.16, 7, materials.darkGold, 'vault-v2-gallery-sconce-curved-arm');
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, -0.03, 0.1);
  sconce.add(arm);
  const jewel = mesh(new THREE.OctahedronGeometry(0.055, 0), index % 2 === 0 ? materials.cyan : materials.purple, 'vault-v2-gallery-sconce-luminous-jewel');
  jewel.position.set(0, 0.03, 0.19);
  sconce.add(jewel);
  const crown = mesh(new THREE.ConeGeometry(0.055, 0.11, 8), materials.gold, 'vault-v2-gallery-sconce-gold-crown');
  crown.position.set(0, 0.13, 0.19);
  sconce.add(crown);
  root.add(sconce);
}

function addInhabitedGalleries(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const bayCount = quality === 'low' ? 11 : 13;
  for (const bottomY of [0.32, 1.04]) {
    for (let index = 0; index < bayCount; index += 1) {
      const angle = THREE.MathUtils.lerp(-Math.PI * 0.68, Math.PI * 0.68, index / (bayCount - 1));
      if (Math.abs(angle) >= 0.24) addGalleryBay(root, materials, quality, angle, bottomY, index + (bottomY > 1 ? 2 : 0));
    }
    const rearBayCount = quality === 'low' ? 5 : 6;
    for (let index = 0; index < rearBayCount; index += 1) {
      const angle = THREE.MathUtils.lerp(Math.PI * 0.78, Math.PI * 1.22, index / (rearBayCount - 1));
      addGalleryBay(root, materials, quality, angle, bottomY, index + 40 + (bottomY > 1 ? 3 : 0));
    }
  }
  const count = quality === 'low' ? 12 : 15;
  for (let index = 0; index < count; index += 1) {
    const angle = THREE.MathUtils.lerp(-Math.PI * 0.72, Math.PI * 0.72, index / (count - 1));
    if (Math.abs(angle) < 0.18) continue;
    const buttress = cylinder(0.062, 0.1, 1.64, 7, materials.limestone, 'vault-v2-two-floor-gallery-buttress');
    buttress.position.set(Math.sin(angle) * 3.025, 1, Math.cos(angle) * 3.025);
    root.add(buttress);
    const finial = mesh(new THREE.OctahedronGeometry(0.075, 0), index % 3 === 0 ? materials.cyan : materials.gold, 'vault-v2-gallery-buttress-finial');
    finial.position.set(Math.sin(angle) * 3.025, 1.86, Math.cos(angle) * 3.025);
    root.add(finial);
  }
  const rearButtressCount = quality === 'low' ? 5 : 6;
  for (let index = 0; index < rearButtressCount; index += 1) {
    const angle = THREE.MathUtils.lerp(Math.PI * 0.76, Math.PI * 1.24, index / (rearButtressCount - 1));
    const buttress = cylinder(0.062, 0.1, 1.64, 7, materials.limestone, 'vault-v2-rear-two-floor-gallery-buttress');
    buttress.position.set(Math.sin(angle) * 3.025, 1, Math.cos(angle) * 3.025);
    root.add(buttress);
    const finial = mesh(new THREE.OctahedronGeometry(0.075, 0), index % 2 === 0 ? materials.cyan : materials.gold, 'vault-v2-rear-gallery-buttress-finial');
    finial.position.set(Math.sin(angle) * 3.025, 1.86, Math.cos(angle) * 3.025);
    root.add(finial);
  }
  if (quality !== 'low') {
    for (const y of [0.75, 1.45]) {
      for (let index = 0; index < 8; index += 1) {
        const angle = THREE.MathUtils.lerp(-Math.PI * 0.66, Math.PI * 0.66, index / 7);
        if (Math.abs(angle) > 0.18) addGallerySconce(root, materials, angle, y, index + (y > 1 ? 1 : 0));
      }
    }
  }
}

function addGrandVaultPortal(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const portal = new THREE.Group();
  portal.name = 'vault-v2-grand-front-vault-portal';
  portal.position.set(0, 0.32, 3.02);
  portal.add(mesh(archedPanel(1.46, 0.98, 0.34), materials.limestone, 'vault-v2-vault-monumental-stone-surround'));
  const recess = mesh(archedPanel(1.06, 0.78, 0.1), materials.void, 'vault-v2-vault-deep-entry-pocket');
  recess.position.z = 0.205;
  portal.add(recess);
  const outerArch = mesh(new THREE.TorusGeometry(0.67, 0.062, 10, segments(quality, 32, 48, 68), Math.PI), materials.gold, 'vault-v2-vault-outer-gold-arch');
  outerArch.position.set(0, 0.98, 0.24);
  portal.add(outerArch);
  const door = mesh(new THREE.CircleGeometry(0.42, segments(quality, 28, 40, 56)), materials.blackMetal, 'vault-v2-vault-round-door');
  door.position.set(0, 0.56, 0.24);
  portal.add(door);
  const inset = mesh(new THREE.CircleGeometry(0.34, segments(quality, 24, 36, 52)), materials.blue, 'vault-v2-vault-blue-door-inset');
  inset.position.set(0, 0.56, 0.255);
  portal.add(inset);
  const dial = mesh(new THREE.TorusGeometry(0.23, 0.026, 8, 36), materials.gold, 'vault-v2-vault-door-dial');
  dial.position.set(0, 0.56, 0.28);
  portal.add(dial);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const spoke = mesh(new THREE.BoxGeometry(0.025, 0.19, 0.022), materials.gold, 'vault-v2-vault-door-spoke');
    spoke.position.set(Math.sin(angle) * 0.11, 0.56 + Math.cos(angle) * 0.11, 0.3);
    spoke.rotation.z = -angle;
    portal.add(spoke);
  }
  for (const side of [-1, 1] as const) {
    const column = cylinder(0.06, 0.09, 1.08, 10, materials.gold, 'vault-v2-vault-fluted-column');
    column.position.set(side * 0.58, 0.56, 0.22);
    portal.add(column);
    const gem = mesh(new THREE.OctahedronGeometry(0.09, 0), side < 0 ? materials.purple : materials.cyan, 'vault-v2-vault-column-gem');
    gem.position.set(side * 0.58, 1.15, 0.24);
    portal.add(gem);
  }
  const plaque = mesh(new THREE.BoxGeometry(0.72, 0.18, 0.08), materials.blue, 'vault-v2-the-vault-plaque');
  plaque.position.set(0, 1.36, 0.19);
  portal.add(plaque);
  const plaqueGem = mesh(new THREE.OctahedronGeometry(0.055, 0), materials.gold, 'vault-v2-vault-plaque-gem');
  plaqueGem.position.set(-0.29, 1.36, 0.25);
  portal.add(plaqueGem);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#0b2f63';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = '#6d4308';
      context.lineWidth = 10;
      context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
      context.fillStyle = '#f4c858';
      context.font = '700 66px Georgia, serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('THE VAULT', canvas.width / 2, canvas.height / 2 + 4);
      const labelTexture = new THREE.CanvasTexture(canvas);
      labelTexture.colorSpace = THREE.SRGBColorSpace;
      labelTexture.userData.vaultGeneratedLabel = true;
      const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, toneMapped: false });
      const label = mesh(new THREE.PlaneGeometry(0.6, 0.15), labelMaterial, 'vault-v2-the-vault-readable-label');
      label.position.set(0.04, 1.36, 0.245);
      portal.add(label);
    }
  }
  root.add(portal);
}

function addMarinaApproach(root: THREE.Group, materials: Materials) {
  const approach = new THREE.Group();
  approach.name = 'vault-v2-marina-stair-and-gate';
  for (let index = 0; index < 12; index += 1) {
    const t = index / 11;
    const step = mesh(new THREE.BoxGeometry(1.12 + t * 0.52, 0.07, 0.22), materials.marble, 'vault-v2-marina-marble-step');
    step.position.set(0, 0.4 - t * 0.56, 3.12 + t * 1.08);
    approach.add(step);
  }
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < 6; index += 1) {
      const t = index / 5;
      const post = cylinder(0.018, 0.027, 0.35, 7, materials.gold, 'vault-v2-marina-stair-post');
      post.position.set(side * (0.64 + t * 0.22), 0.48 - t * 0.44, 3.15 + t * 0.92);
      approach.add(post);
      const lamp = mesh(new THREE.OctahedronGeometry(0.045, 0), index % 2 === 0 ? materials.cyan : materials.gold, 'vault-v2-marina-post-lamp');
      lamp.position.set(side * (0.64 + t * 0.22), 0.69 - t * 0.44, 3.15 + t * 0.92);
      approach.add(lamp);
    }
  }
  const rail = mesh(new THREE.BoxGeometry(2.55, 0.06, 0.07), materials.gold, 'vault-v2-marina-gate-rail');
  rail.position.set(0, 0.25, 4.34);
  approach.add(rail);
  for (let index = -8; index <= 8; index += 1) {
    const height = 0.5 + (1 - Math.abs(index) / 11) * 0.28;
    const picket = cylinder(0.018, 0.022, height, 7, materials.gold, 'vault-v2-marina-gate-picket');
    picket.position.set(index * 0.135, 0.23 + height / 2, 4.34);
    approach.add(picket);
  }
  for (const side of [-1, 1] as const) {
    const pier = mesh(new THREE.BoxGeometry(0.26, 0.86, 0.28), materials.marble, 'vault-v2-marina-gate-pier');
    pier.position.set(side * 1.32, 0.35, 4.34);
    approach.add(pier);
    const finial = mesh(new THREE.OctahedronGeometry(0.1, 0), materials.gold, 'vault-v2-marina-gate-finial');
    finial.position.set(side * 1.32, 0.86, 4.34);
    approach.add(finial);
  }
  const crest = mesh(new THREE.OctahedronGeometry(0.16, 0), materials.blue, 'vault-v2-marina-gate-crest');
  crest.position.set(0, 0.7, 4.36);
  approach.add(crest);
  root.add(approach);
}

function addBracelet(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const bracelet = new THREE.Group();
  bracelet.name = 'vault-v2-articulated-charm-bracelet';
  const radius = 3.22;
  const braidY = 2.27;
  const structuralRails = [
    [radius - 0.17, braidY, materials.silver, 'vault-v2-bracelet-inner-silver-rail'],
    [radius + 0.17, braidY, materials.silver, 'vault-v2-bracelet-outer-silver-rail'],
    [radius, braidY - 0.17, materials.gold, 'vault-v2-bracelet-lower-gold-rail'],
    [radius, braidY + 0.17, materials.gold, 'vault-v2-bracelet-upper-gold-rail'],
  ] as const;
  structuralRails.forEach(([railRadius, railY, material, name]) => {
    const rail = band(railRadius, 0.052, material, quality, name);
    rail.position.y = railY;
    bracelet.add(rail);
  });

  const strandCount = quality === 'low' ? 4 : 6;
  const curvePoints = quality === 'low' ? 96 : quality === 'medium' ? 144 : 192;
  for (let strand = 0; strand < strandCount; strand += 1) {
    const phase = (strand / strandCount) * Math.PI * 2;
    const direction = strand % 2 === 0 ? 1 : -1;
    const points: THREE.Vector3[] = [];
    for (let pointIndex = 0; pointIndex < curvePoints; pointIndex += 1) {
      const theta = (pointIndex / curvePoints) * Math.PI * 2;
      const weaveAngle = theta * 10 * direction + phase;
      const weaveRadius = 0.235;
      const radial = radius + Math.cos(weaveAngle) * weaveRadius;
      points.push(new THREE.Vector3(
        Math.sin(theta) * radial,
        braidY + Math.sin(weaveAngle) * weaveRadius,
        Math.cos(theta) * radial,
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.35);
    bracelet.add(mesh(
      new THREE.TubeGeometry(curve, curvePoints, quality === 'high' ? 0.044 : 0.034, segments(quality, 5, 6, 8), true),
      direction > 0 ? materials.gold : materials.silver,
      direction > 0 ? 'vault-v2-bracelet-openwork-gold-diagonal' : 'vault-v2-bracelet-openwork-silver-diagonal',
    ));
  }

  const collarCount = quality === 'low' ? 8 : 10;
  const localY = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < collarCount; index += 1) {
    const angle = (index / collarCount) * Math.PI * 2;
    const collar = new THREE.Group();
    collar.name = 'vault-v2-bracelet-openwork-link-coupler';
    collar.position.set(Math.sin(angle) * radius, braidY, Math.cos(angle) * radius);
    collar.quaternion.setFromUnitVectors(localY, new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)));
    const ring = mesh(new THREE.TorusGeometry(0.252, 0.025, 8, 28), index % 2 === 0 ? materials.gold : materials.darkGold, 'vault-v2-bracelet-heavy-gold-collar');
    ring.rotation.x = Math.PI / 2;
    collar.add(ring);
    bracelet.add(collar);
  }

  const stationCount = 6;
  for (let index = 0; index < stationCount; index += 1) {
    const angle = (index / stationCount) * Math.PI * 2 + Math.PI / 6;
    const station = new THREE.Group();
    station.name = 'vault-v2-bracelet-gem-station';
    station.position.set(Math.sin(angle) * radius, braidY, Math.cos(angle) * radius);
    station.quaternion.setFromUnitVectors(localY, new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)));
    const stationMaterial = index % 2 === 0 ? materials.purple : materials.cyan;
    station.add(cylinder(0.29, 0.29, 0.44, segments(quality, 16, 24, 32), stationMaterial, 'vault-v2-bracelet-enamel-gem-core'));
    for (const y of [-0.2, 0.2]) {
      const collar = mesh(new THREE.TorusGeometry(0.292, 0.038, 9, 30), materials.gold, 'vault-v2-bracelet-gem-station-gold-collar');
      collar.rotation.x = Math.PI / 2;
      collar.position.y = y;
      station.add(collar);
    }
    const bezel = mesh(new THREE.TorusGeometry(0.17, 0.027, 8, 28), materials.gold, 'vault-v2-bracelet-gem-bezel');
    bezel.position.z = 0.265;
    station.add(bezel);
    const jewel = mesh(new THREE.OctahedronGeometry(0.13, 0), index % 3 === 0 ? materials.ruby : stationMaterial, 'vault-v2-bracelet-faceted-station-jewel');
    jewel.position.z = 0.29;
    station.add(jewel);
    bracelet.add(station);
  }

  [-1.22, -0.82, -0.42, 0, 0.42, 0.82, 1.22].forEach((angle, index) => {
    const x = Math.sin(angle) * 3.22;
    const z = Math.cos(angle) * 3.22;
    const length = 0.45 + (index % 3) * 0.1;
    const chain = cylinder(0.015, 0.015, length, 7, materials.gold, 'vault-v2-hanging-charm-chain');
    chain.position.set(x, 2.08 - length / 2, z);
    bracelet.add(chain);
    const charm = mesh(index % 2 === 0 ? new THREE.OctahedronGeometry(0.15, 0) : new THREE.IcosahedronGeometry(0.13, 0), index % 3 === 0 ? materials.purple : index % 3 === 1 ? materials.cyan : materials.gold, 'vault-v2-hanging-faceted-charm');
    charm.position.set(x, 1.83 - length, z);
    charm.userData.baseY = charm.position.y;
    charm.userData.phase = index * 0.7;
    bracelet.add(charm);
    const medallion = mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 28), materials.gold, 'vault-v2-hanging-charm-medallion');
    medallion.position.copy(charm.position);
    medallion.rotation.y = angle;
    bracelet.add(medallion);
  });
  root.add(bracelet);
  return bracelet;
}

function addGardenPerimeter(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const gardenRing = new THREE.Group();
  gardenRing.name = 'vault-v2-living-garden-perimeter';
  const radius = 3.2;
  const ringY = 2.25;

  const foundation = band(radius, 0.19, materials.limestone, quality, 'vault-v2-garden-ring-limestone-planter-wall');
  foundation.position.y = ringY;
  const soil = band(radius, 0.135, materials.gardenDark, quality, 'vault-v2-garden-ring-deep-soil-bed');
  soil.position.y = ringY + 0.11;
  const innerRail = band(radius - 0.19, 0.035, materials.gold, quality, 'vault-v2-garden-ring-inner-gold-rail');
  innerRail.position.y = ringY + 0.08;
  const outerRail = band(radius + 0.19, 0.045, materials.gold, quality, 'vault-v2-garden-ring-outer-gold-rail');
  outerRail.position.y = ringY + 0.08;
  gardenRing.add(foundation, soil, innerRail, outerRail);

  const plantingCount = quality === 'low' ? 12 : quality === 'medium' ? 16 : 20;
  for (let index = 0; index < plantingCount; index += 1) {
    const angle = (index / plantingCount) * Math.PI * 2;
    const station = new THREE.Group();
    station.name = 'vault-v2-garden-ring-planted-station';
    station.position.set(Math.sin(angle) * radius, ringY + 0.12, Math.cos(angle) * radius);
    station.rotation.y = angle;

    const planter = cylinder(0.105, 0.14, 0.13, 10, materials.limestone, 'vault-v2-garden-ring-fluted-limestone-planter');
    planter.position.y = 0.02;
    station.add(planter);

    if (index % 4 === 0) {
      const trunk = cylinder(0.025, 0.038, 0.25, 7, materials.wood, 'vault-v2-garden-ring-cypress-trunk');
      trunk.position.y = 0.2;
      station.add(trunk);
      for (let layer = 0; layer < 3; layer += 1) {
        const crown = mesh(new THREE.ConeGeometry(0.14 - layer * 0.022, 0.24, 9), layer % 2 === 0 ? materials.gardenDark : materials.garden, 'vault-v2-garden-ring-sculpted-cypress');
        crown.position.y = 0.34 + layer * 0.11;
        station.add(crown);
      }
      const trellis = mesh(new THREE.TorusGeometry(0.21, 0.018, 7, 24, Math.PI), materials.gold, 'vault-v2-garden-ring-gilded-rose-trellis');
      trellis.position.set(0, 0.29, 0.05);
      station.add(trellis);
    } else {
      const shrub = mesh(new THREE.DodecahedronGeometry(0.14, 1), index % 2 === 0 ? materials.garden : materials.gardenDark, 'vault-v2-garden-ring-clipped-shrub');
      shrub.scale.set(1.15, 0.82, 0.92);
      shrub.position.y = 0.2;
      station.add(shrub);
      for (let blossom = 0; blossom < 3; blossom += 1) {
        const bloom = mesh(new THREE.OctahedronGeometry(0.035, 0), (index + blossom) % 3 === 0 ? materials.ruby : (index + blossom) % 3 === 1 ? materials.purple : materials.cyan, 'vault-v2-garden-ring-jewel-blossom');
        bloom.position.set((blossom - 1) * 0.075, 0.31 + (blossom % 2) * 0.035, 0.08);
        station.add(bloom);
      }
    }
    gardenRing.add(station);
  }

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const lantern = new THREE.Group();
    lantern.name = 'vault-v2-garden-ring-crystal-lantern';
    lantern.position.set(Math.sin(angle) * (radius + 0.02), ringY + 0.18, Math.cos(angle) * (radius + 0.02));
    lantern.rotation.y = angle;
    const post = cylinder(0.014, 0.022, 0.34, 7, materials.gold, 'vault-v2-garden-ring-lantern-post');
    post.position.y = 0.12;
    const jewel = mesh(new THREE.OctahedronGeometry(0.07, 0), index % 2 === 0 ? materials.cyan : materials.purple, 'vault-v2-garden-ring-luminous-jewel');
    jewel.position.y = 0.34;
    lantern.add(post, jewel);
    gardenRing.add(lantern);
  }

  root.add(gardenRing);
  return gardenRing;
}

function addGoldCastlePerimeter(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const castleRing = new THREE.Group();
  castleRing.name = 'vault-v2-solid-gold-castle-perimeter';
  const radius = 3.22;
  const ringY = 2.25;

  for (const [y, tube, material, name] of [
    [ringY - 0.19, 0.085, materials.darkGold, 'vault-v2-gold-castle-heavy-lower-molding'],
    [ringY - 0.03, 0.12, materials.royalGold, 'vault-v2-gold-castle-solid-parapet-molding'],
    [ringY + 0.22, 0.045, materials.gold, 'vault-v2-gold-castle-crown-rail'],
  ] as const) {
    const rail = band(radius, tube, material, quality, name);
    rail.position.y = y;
    castleRing.add(rail);
  }

  const panelCount = quality === 'low' ? 12 : quality === 'medium' ? 16 : 20;
  for (let index = 0; index < panelCount; index += 1) {
    const angle = (index / panelCount) * Math.PI * 2;
    const panel = new THREE.Group();
    panel.name = 'vault-v2-gold-castle-relief-panel';
    panel.position.set(Math.sin(angle) * radius, ringY, Math.cos(angle) * radius);
    panel.rotation.y = angle;

    const panelWidth = (Math.PI * 2 * radius) / panelCount * 0.78;
    panel.add(mesh(new THREE.BoxGeometry(panelWidth, 0.42, 0.13), materials.royalGold, 'vault-v2-gold-castle-solid-wall-panel'));
    const recess = mesh(new THREE.BoxGeometry(panelWidth * 0.62, 0.2, 0.022), materials.darkGold, 'vault-v2-gold-castle-hammered-recess');
    recess.position.z = 0.087;
    panel.add(recess);
    const medallion = cylinder(0.092, 0.092, 0.035, 16, materials.royalGold, 'vault-v2-gold-castle-relief-medallion');
    medallion.rotation.x = Math.PI / 2;
    medallion.position.z = 0.12;
    panel.add(medallion);
    const rosette = mesh(new THREE.OctahedronGeometry(0.055, 0), index % 5 === 0 ? materials.ruby : materials.gold, 'vault-v2-gold-castle-sun-rosette');
    rosette.position.z = 0.15;
    panel.add(rosette);

    for (const side of [-1, 1] as const) {
      const scroll = mesh(new THREE.TorusGeometry(0.115, 0.018, 7, 20, Math.PI * 1.45), materials.gold, 'vault-v2-gold-castle-filigree-scroll');
      scroll.position.set(side * panelWidth * 0.24, 0, 0.12);
      scroll.rotation.z = side < 0 ? 0.55 : Math.PI + 0.55;
      panel.add(scroll);
    }
    for (let merlon = -1; merlon <= 1; merlon += 1) {
      const battlement = mesh(new THREE.BoxGeometry(panelWidth * 0.19, 0.14, 0.14), materials.royalGold, 'vault-v2-gold-castle-crenellated-merlon');
      battlement.position.set(merlon * panelWidth * 0.29, 0.27, 0);
      panel.add(battlement);
    }
    castleRing.add(panel);
  }

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const tower = new THREE.Group();
    tower.name = 'vault-v2-gold-castle-ornamental-tower';
    tower.position.set(Math.sin(angle) * (radius + 0.02), ringY + 0.12, Math.cos(angle) * (radius + 0.02));
    const body = cylinder(0.13, 0.16, 0.56, 12, materials.royalGold, 'vault-v2-gold-castle-solid-tower-body');
    tower.add(body);
    const crown = cylinder(0.2, 0.17, 0.12, 12, materials.darkGold, 'vault-v2-gold-castle-tower-crown');
    crown.position.y = 0.34;
    tower.add(crown);
    for (let merlon = 0; merlon < 6; merlon += 1) {
      const merlonAngle = (merlon / 6) * Math.PI * 2;
      const battlement = mesh(new THREE.BoxGeometry(0.065, 0.12, 0.065), materials.royalGold, 'vault-v2-gold-castle-tower-merlon');
      battlement.position.set(Math.sin(merlonAngle) * 0.15, 0.45, Math.cos(merlonAngle) * 0.15);
      tower.add(battlement);
    }
    const spire = mesh(new THREE.ConeGeometry(0.1, 0.3, 8), materials.royalGold, 'vault-v2-gold-castle-filigree-spire');
    spire.position.y = 0.62;
    tower.add(spire);
    const finial = mesh(new THREE.OctahedronGeometry(0.055, 0), index % 2 === 0 ? materials.ruby : materials.cyan, 'vault-v2-gold-castle-jeweled-finial');
    finial.position.y = 0.82;
    tower.add(finial);
    castleRing.add(tower);
  }

  root.add(castleRing);
  return castleRing;
}

function addTree(root: THREE.Group, materials: Materials, x: number, z: number, scale: number) {
  const trunk = cylinder(0.025 * scale, 0.04 * scale, 0.28 * scale, 6, materials.wood, 'vault-v2-garden-tree-trunk');
  trunk.position.set(x, GARDEN_Y + 0.14 * scale, z);
  root.add(trunk);
  for (let layer = 0; layer < 3; layer += 1) {
    const crown = mesh(new THREE.ConeGeometry((0.18 - layer * 0.025) * scale, 0.3 * scale, 9), materials.gardenDark, 'vault-v2-formal-cypress-crown');
    crown.position.set(x, GARDEN_Y + (0.31 + layer * 0.15) * scale, z);
    root.add(crown);
  }
}

function addGardenBench(root: THREE.Group, materials: Materials, angle: number) {
  const radius = 1.72;
  const bench = new THREE.Group();
  bench.name = 'vault-v2-garden-gilded-bench';
  bench.position.set(Math.sin(angle) * radius, GARDEN_Y + 0.16, Math.cos(angle) * radius);
  bench.rotation.y = angle;
  const seat = mesh(new THREE.BoxGeometry(0.54, 0.055, 0.18), materials.wood, 'vault-v2-garden-bench-polished-seat');
  const back = mesh(new THREE.BoxGeometry(0.54, 0.28, 0.04), materials.wood, 'vault-v2-garden-bench-polished-back');
  back.position.set(0, 0.17, -0.08);
  bench.add(seat, back);
  for (const side of [-1, 1] as const) {
    const leg = cylinder(0.018, 0.025, 0.22, 7, materials.gold, 'vault-v2-garden-bench-gold-leg');
    leg.position.set(side * 0.22, -0.08, 0);
    bench.add(leg);
    const finial = mesh(new THREE.OctahedronGeometry(0.035, 0), side < 0 ? materials.cyan : materials.purple, 'vault-v2-garden-bench-set-jewel');
    finial.position.set(side * 0.24, 0.34, -0.1);
    bench.add(finial);
  }
  root.add(bench);
}

function addGardenLantern(root: THREE.Group, materials: Materials, angle: number, index: number) {
  const radius = 2.32;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const post = cylinder(0.018, 0.034, 0.52, 8, materials.gold, 'vault-v2-garden-jewel-lantern-post');
  post.position.set(x, GARDEN_Y + 0.28, z);
  root.add(post);
  const collar = mesh(new THREE.TorusGeometry(0.075, 0.016, 7, 20), materials.darkGold, 'vault-v2-garden-lantern-crown');
  collar.rotation.x = Math.PI / 2;
  collar.position.set(x, GARDEN_Y + 0.55, z);
  root.add(collar);
  const lantern = mesh(new THREE.OctahedronGeometry(0.075, 0), index % 2 === 0 ? materials.cyan : materials.purple, 'vault-v2-garden-luminous-cut-stone-lantern');
  lantern.position.set(x, GARDEN_Y + 0.61, z);
  root.add(lantern);
  const cap = mesh(new THREE.ConeGeometry(0.07, 0.13, 8), materials.gold, 'vault-v2-garden-lantern-gold-cap');
  cap.position.set(x, GARDEN_Y + 0.72, z);
  root.add(cap);
}

function addGardenPlanter(root: THREE.Group, materials: Materials, angle: number, index: number) {
  const radius = 1.42;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const planter = cylinder(0.13, 0.17, 0.16, 12, materials.marble, 'vault-v2-garden-fluted-marble-planter');
  planter.position.set(x, GARDEN_Y + 0.11, z);
  root.add(planter);
  const rim = mesh(new THREE.TorusGeometry(0.14, 0.018, 7, 24), materials.gold, 'vault-v2-garden-planter-gold-rim');
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, GARDEN_Y + 0.2, z);
  root.add(rim);
  const topiary = mesh(new THREE.DodecahedronGeometry(0.13, 1), materials.gardenDark, 'vault-v2-garden-sculpted-topiary');
  topiary.scale.y = 1.35;
  topiary.position.set(x, GARDEN_Y + 0.38, z);
  root.add(topiary);
  const jewel = mesh(new THREE.OctahedronGeometry(0.035, 0), index % 3 === 0 ? materials.ruby : index % 3 === 1 ? materials.cyan : materials.purple, 'vault-v2-garden-topiary-jewel-flower');
  jewel.position.set(x, GARDEN_Y + 0.54, z);
  root.add(jewel);
}

function addGarden(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const terrace = cylinder(2.52, 2.62, 0.22, segments(quality, 48, 72, 96), materials.marble, 'vault-v2-raised-garden-terrace');
  terrace.position.y = 2.02;
  root.add(terrace);
  const lawn = cylinder(2.31, 2.34, 0.055, segments(quality, 48, 72, 96), materials.garden, 'vault-v2-formal-garden-lawn');
  lawn.position.y = GARDEN_Y;
  root.add(lawn);
  const pathRing = band(2.04, 0.12, materials.marble, quality, 'vault-v2-garden-marble-ring-path');
  pathRing.position.y = GARDEN_Y + 0.03;
  root.add(pathRing);
  const pathInlay = band(2.04, 0.018, materials.gold, quality, 'vault-v2-garden-ring-gold-inlay');
  pathInlay.position.y = GARDEN_Y + 0.14;
  root.add(pathInlay);
  const outerRail = band(2.46, 0.022, materials.gold, quality, 'vault-v2-garden-outer-gold-balustrade-rail');
  outerRail.position.y = GARDEN_Y + 0.34;
  root.add(outerRail);
  const balusterCount = quality === 'low' ? 18 : 32;
  for (let index = 0; index < balusterCount; index += 1) {
    const angle = (index / balusterCount) * Math.PI * 2;
    if (Math.cos(angle) > 0.84 && Math.abs(Math.sin(angle)) < 0.3) continue;
    const post = cylinder(0.014, 0.022, 0.32, 7, index % 4 === 0 ? materials.gold : materials.marble, 'vault-v2-garden-turned-balustrade-post');
    post.position.set(Math.sin(angle) * 2.46, GARDEN_Y + 0.18, Math.cos(angle) * 2.46);
    root.add(post);
  }
  const spokeCount = quality === 'low' ? 8 : 12;
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = (index / spokeCount) * Math.PI * 2;
    const path = mesh(new THREE.BoxGeometry(0.17, 0.035, 1.8), materials.marble, 'vault-v2-radial-marble-garden-path');
    path.position.set(Math.sin(angle) * 1.12, GARDEN_Y + 0.04, Math.cos(angle) * 1.12);
    path.rotation.y = angle;
    root.add(path);
    const inlay = mesh(new THREE.BoxGeometry(0.025, 0.012, 1.82), materials.gold, 'vault-v2-radial-path-gold-inlay');
    inlay.position.copy(path.position);
    inlay.position.y += 0.03;
    inlay.rotation.y = angle;
    root.add(inlay);
    const medallion = mesh(new THREE.CircleGeometry(0.12, segments(quality, 16, 24, 32)), index % 2 === 0 ? materials.blue : materials.darkGold, 'vault-v2-garden-path-enamel-medallion');
    medallion.rotation.x = -Math.PI / 2;
    medallion.position.set(Math.sin(angle) * 1.95, GARDEN_Y + 0.07, Math.cos(angle) * 1.95);
    root.add(medallion);
    const medallionRim = mesh(new THREE.TorusGeometry(0.12, 0.014, 7, 24), materials.gold, 'vault-v2-garden-path-medallion-gold-rim');
    medallionRim.rotation.x = Math.PI / 2;
    medallionRim.position.copy(medallion.position);
    medallionRim.position.y += 0.004;
    root.add(medallionRim);
  }
  const treeCount = quality === 'low' ? 10 : 16;
  for (let index = 0; index < treeCount; index += 1) {
    const angle = (index / treeCount) * Math.PI * 2 + 0.12;
    const radius = index % 2 === 0 ? 1.78 : 2.17;
    if (!(Math.cos(angle) > 0.72 && Math.abs(Math.sin(angle)) < 0.35)) addTree(root, materials, Math.sin(angle) * radius, Math.cos(angle) * radius, 0.75 + (index % 4) * 0.08);
  }
  if (quality !== 'low') {
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      const radius = 1.58 + (index % 3) * 0.19;
      const flower = mesh(new THREE.IcosahedronGeometry(0.035 + (index % 2) * 0.01, 0), index % 3 === 0 ? materials.purple : index % 3 === 1 ? materials.ruby : materials.cyan, 'vault-v2-garden-set-gem-flower');
      flower.position.set(Math.sin(angle) * radius, GARDEN_Y + 0.12, Math.cos(angle) * radius);
      root.add(flower);
    }
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + Math.PI / 6;
      addGardenLantern(root, materials, angle, index);
      addGardenPlanter(root, materials, angle + Math.PI / 16, index);
    }
    for (const angle of [-2.32, -0.82, 0.82, 2.32]) addGardenBench(root, materials, angle);
  }
}

function addFountain(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const fountain = new THREE.Group();
  fountain.name = 'vault-v2-front-crystal-fountain';
  fountain.position.set(0, GARDEN_Y + 0.09, 1.58);
  const basin = mesh(new THREE.TorusGeometry(0.36, 0.07, 10, segments(quality, 32, 48, 64)), materials.gold, 'vault-v2-fountain-gold-basin');
  basin.rotation.x = Math.PI / 2;
  fountain.add(basin);
  const water = mesh(new THREE.CircleGeometry(0.31, 36), materials.cyan, 'vault-v2-fountain-water');
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.01;
  fountain.add(water);
  const crystal = mesh(new THREE.ConeGeometry(0.16, 0.65, 6), materials.cyan, 'vault-v2-fountain-crystal-spire');
  crystal.position.y = 0.34;
  fountain.add(crystal);
  const base = cylinder(0.17, 0.22, 0.17, 10, materials.marble, 'vault-v2-fountain-marble-base');
  base.position.y = 0.08;
  fountain.add(base);
  root.add(fountain);
}

function addSmallDome(parent: THREE.Group, materials: Materials, quality: VaultIslandQuality, x: number, y: number, z: number, radius: number, prefix: string) {
  const dome = mesh(new THREE.SphereGeometry(radius, segments(quality, 14, 20, 28), segments(quality, 7, 10, 14), 0, Math.PI * 2, 0, Math.PI / 2), materials.blue, `${prefix}-blue-dome`);
  dome.position.set(x, y, z);
  dome.scale.y = 0.82;
  parent.add(dome);
  const rim = band(radius * 0.98, radius * 0.055, materials.gold, quality, `${prefix}-gold-dome-rim`);
  rim.position.set(x, y, z);
  parent.add(rim);
  if (quality !== 'low') {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x + Math.sin(angle) * radius * 0.92, y + 0.01, z + Math.cos(angle) * radius * 0.92),
        new THREE.Vector3(x + Math.sin(angle) * radius * 0.48, y + radius * 0.62, z + Math.cos(angle) * radius * 0.48),
        new THREE.Vector3(x, y + radius * 0.78, z),
      );
      parent.add(mesh(new THREE.TubeGeometry(curve, 10, radius * 0.022, 5, false), materials.gold, `${prefix}-three-dimensional-gold-rib`));
    }
  }
  const finial = cylinder(radius * 0.035, radius * 0.085, radius * 0.5, 8, materials.gold, `${prefix}-gold-finial`);
  finial.position.set(x, y + radius * 0.95, z);
  parent.add(finial);
}

function addPavilion(root: THREE.Group, materials: Materials, quality: VaultIslandQuality, x: number, z: number) {
  const pavilion = new THREE.Group();
  pavilion.name = 'vault-v2-garden-domed-pavilion';
  const base = cylinder(0.36, 0.42, 0.12, 16, materials.marble, 'vault-v2-pavilion-base');
  base.position.set(x, GARDEN_Y + 0.08, z);
  pavilion.add(base);
  const roof = band(0.33, 0.035, materials.gold, quality, 'vault-v2-pavilion-roof-ring');
  roof.position.set(x, GARDEN_Y + 0.72, z);
  pavilion.add(roof);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const column = cylinder(0.022, 0.032, 0.58, 7, materials.marble, 'vault-v2-pavilion-column');
    column.position.set(x + Math.sin(angle) * 0.29, GARDEN_Y + 0.39, z + Math.cos(angle) * 0.29);
    pavilion.add(column);
  }
  addSmallDome(pavilion, materials, quality, x, GARDEN_Y + 0.72, z, 0.32, 'vault-v2-pavilion');
  root.add(pavilion);
}

function addGardenPavilions(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  addPavilion(root, materials, quality, -1.68, 1.02);
  addPavilion(root, materials, quality, 1.68, 1.02);
  addPavilion(root, materials, quality, -1.86, -0.74);
  addPavilion(root, materials, quality, 1.86, -0.74);
}

function addPalaceWindow(palace: THREE.Group, materials: Materials, quality: VaultIslandQuality, x: number, y: number, z: number, scale: number) {
  const group = new THREE.Group();
  group.name = 'vault-v2-palace-arched-facade-window';
  group.position.set(x, y, z);
  group.add(mesh(archedPanel(0.24 * scale, 0.36 * scale, 0.035), materials.window, 'vault-v2-palace-window-deep-warm-recess'));
  const arch = mesh(new THREE.TorusGeometry(0.12 * scale, 0.018 * scale, 7, segments(quality, 18, 26, 36), Math.PI), materials.gold, 'vault-v2-palace-window-gold-arch');
  arch.position.set(0, 0.36 * scale, 0.045);
  group.add(arch);
  for (const side of [-1, 1] as const) {
    const jamb = cylinder(0.012 * scale, 0.016 * scale, 0.36 * scale, 6, materials.gold, 'vault-v2-palace-window-gold-jamb');
    jamb.position.set(side * 0.12 * scale, 0.18 * scale, 0.045);
    group.add(jamb);
  }
  palace.add(group);
}

function addPalacePodium(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const podium = cylinder(1.43, 1.62, 0.2, segments(quality, 24, 36, 48), materials.marble, 'vault-v2-palace-raised-podium');
  podium.position.y = PALACE_Y - 0.08;
  root.add(podium);
  const podiumBand = band(1.48, 0.045, materials.gold, quality, 'vault-v2-palace-podium-gold-band');
  podiumBand.position.y = PALACE_Y + 0.03;
  root.add(podiumBand);
  for (let index = 0; index < 12; index += 1) {
    const t = index / 11;
    const step = mesh(new THREE.BoxGeometry(0.9 + t * 0.7, 0.055, 0.2), materials.marble, 'vault-v2-palace-grand-marble-step');
    step.position.set(0, PALACE_Y + 0.02 - t * 0.27, 0.84 + t * 1.02);
    root.add(step);
  }
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < 7; index += 1) {
      const t = index / 6;
      const post = cylinder(0.016, 0.024, 0.28, 7, materials.gold, 'vault-v2-palace-stair-baluster');
      post.position.set(side * (0.52 + t * 0.25), PALACE_Y + 0.16 - t * 0.22, 0.9 + t * 0.86);
      root.add(post);
    }
  }
}

function addTower(palace: THREE.Group, materials: Materials, quality: VaultIslandQuality, x: number, z: number, radius: number, height: number, front: boolean) {
  const body = cylinder(radius, radius * 1.07, height, segments(quality, 12, 18, 24), materials.marble, 'vault-v2-integrated-palace-tower');
  body.position.set(x, PALACE_Y + height / 2, z);
  palace.add(body);
  const lowerBand = band(radius * 1.03, 0.025, materials.gold, quality, 'vault-v2-palace-tower-lower-gold-band');
  lowerBand.position.set(x, PALACE_Y + height * 0.47, z);
  palace.add(lowerBand);
  const upperBand = band(radius * 1.04, 0.035, materials.gold, quality, 'vault-v2-palace-tower-upper-gold-band');
  upperBand.position.set(x, PALACE_Y + height, z);
  palace.add(upperBand);
  const windowAngles = front ? [-0.55, 0, 0.55] : [0, Math.PI * 0.5, Math.PI];
  for (const floor of [0.3, 0.68]) {
    windowAngles.forEach((angle, index) => {
      const panel = mesh(archedPanel(0.14, 0.24, 0.025), materials.window, 'vault-v2-palace-tower-warm-window');
      panel.position.set(x + Math.sin(angle) * (radius + 0.012), PALACE_Y + height * floor, z + Math.cos(angle) * (radius + 0.012));
      panel.rotation.y = angle;
      palace.add(panel);
      const gem = mesh(new THREE.OctahedronGeometry(0.035, 0), index % 2 === 0 ? materials.cyan : materials.purple, 'vault-v2-palace-tower-window-gem');
      gem.position.copy(panel.position);
      gem.position.y += 0.35;
      palace.add(gem);
    });
  }
  addSmallDome(palace, materials, quality, x, PALACE_Y + height, z, radius * 1.12, 'vault-v2-palace-tower');
}

function addMainDome(palace: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const baseY = PALACE_Y + 2.56;
  const drum = cylinder(0.82, 0.9, 0.56, segments(quality, 18, 28, 36), materials.marble, 'vault-v2-palace-main-dome-drum');
  drum.position.set(0, baseY - 0.27, -0.14);
  palace.add(drum);
  const cornice = band(0.86, 0.045, materials.gold, quality, 'vault-v2-main-dome-drum-gold-cornice');
  cornice.position.set(0, baseY, -0.14);
  palace.add(cornice);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const window = mesh(archedPanel(0.13, 0.19, 0.02), materials.window, 'vault-v2-main-dome-drum-window');
    window.position.set(Math.sin(angle) * 0.86, baseY - 0.34, -0.14 + Math.cos(angle) * 0.86);
    window.rotation.y = angle;
    palace.add(window);
  }
  const radius = 0.98;
  const dome = mesh(new THREE.SphereGeometry(radius, segments(quality, 18, 28, 40), segments(quality, 9, 14, 20), 0, Math.PI * 2, 0, Math.PI / 2), materials.blue, 'vault-v2-monumental-blue-main-dome');
  dome.position.set(0, baseY, -0.14);
  dome.scale.y = 0.94;
  palace.add(dome);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(Math.sin(angle) * radius * 1.035, baseY + 0.01, -0.14 + Math.cos(angle) * radius * 1.035),
      new THREE.Vector3(Math.sin(angle) * radius * 0.68, baseY + radius * 0.72, -0.14 + Math.cos(angle) * radius * 0.68),
      new THREE.Vector3(0, baseY + radius * 0.985, -0.14),
    );
    palace.add(mesh(new THREE.TubeGeometry(curve, 16, 0.036, 7, false), materials.gold, 'vault-v2-main-dome-true-gold-rib'));
  }
  const lantern = cylinder(0.17, 0.23, 0.42, 12, materials.marble, 'vault-v2-main-dome-lantern');
  lantern.position.set(0, baseY + 1.12, -0.14);
  palace.add(lantern);
  const lanternBand = band(0.2, 0.028, materials.gold, quality, 'vault-v2-main-dome-lantern-band');
  lanternBand.position.set(0, baseY + 1.31, -0.14);
  palace.add(lanternBand);
  const spire = cylinder(0.022, 0.065, 0.66, 9, materials.gold, 'vault-v2-main-dome-tall-spire');
  spire.position.set(0, baseY + 1.63, -0.14);
  palace.add(spire);
  const crownGem = mesh(new THREE.OctahedronGeometry(0.095, 0), materials.cyan, 'vault-v2-main-dome-crown-gem');
  crownGem.position.set(0, baseY + 2, -0.14);
  palace.add(crownGem);
}

function addPalaceFamily1(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const palace = new THREE.Group();
  palace.name = 'vault-v2-ornate-two-floor-palace-ensemble';
  const shell = mesh(createPalaceShellGeometry(), [materials.marble, materials.window], 'vault-v2-continuous-two-floor-palace-shell');
  shell.position.set(0, PALACE_Y, -0.12);
  palace.add(shell);
  for (const side of [-1, 1] as const) {
    const wing = mesh(new THREE.BoxGeometry(0.62, 1.52, 1.42), materials.marble, 'vault-v2-palace-attached-side-wing');
    wing.position.set(side * 1.22, PALACE_Y + 0.76, -0.1);
    palace.add(wing);
    const wingRoof = mesh(new THREE.BoxGeometry(0.72, 0.11, 1.5), materials.gold, 'vault-v2-palace-wing-gold-roofline');
    wingRoof.position.set(side * 1.22, PALACE_Y + 1.55, -0.1);
    palace.add(wingRoof);
  }
  const floorCornice = mesh(new THREE.BoxGeometry(2.76, 0.11, 1.58), materials.marble, 'vault-v2-palace-first-floor-heavy-cornice');
  floorCornice.position.set(0, PALACE_Y + 0.96, -0.1);
  palace.add(floorCornice);
  const floorGold = mesh(new THREE.BoxGeometry(2.82, 0.045, 1.62), materials.gold, 'vault-v2-palace-first-floor-gold-course');
  floorGold.position.set(0, PALACE_Y + 1.02, -0.1);
  palace.add(floorGold);
  const roofCornice = mesh(new THREE.BoxGeometry(2.92, 0.14, 1.68), materials.marble, 'vault-v2-palace-roof-heavy-cornice');
  roofCornice.position.set(0, PALACE_Y + 2.08, -0.1);
  palace.add(roofCornice);
  const roofGold = mesh(new THREE.BoxGeometry(2.98, 0.045, 1.72), materials.gold, 'vault-v2-palace-roof-gold-course');
  roofGold.position.set(0, PALACE_Y + 2.16, -0.1);
  palace.add(roofGold);
  const frontZ = 0.67;
  for (const x of [-1.13, -0.83, -0.56, 0.56, 0.83, 1.13]) {
    const pilaster = cylinder(0.045, 0.065, 1.92, 8, materials.marble, 'vault-v2-palace-two-floor-facade-pilaster');
    pilaster.position.set(x, PALACE_Y + 0.98, frontZ + 0.09);
    palace.add(pilaster);
    const capital = cylinder(0.075, 0.075, 0.08, 8, materials.gold, 'vault-v2-palace-facade-gold-capital');
    capital.position.set(x, PALACE_Y + 1.93, frontZ + 0.09);
    palace.add(capital);
  }
  for (const floor of [0.22, 1.18]) {
    for (const x of [-1.02, -0.72, 0.72, 1.02]) addPalaceWindow(palace, materials, quality, x, PALACE_Y + floor, frontZ + 0.1, floor > 1 ? 0.88 : 1);
  }
  const entry = mesh(archedPanel(0.78, 0.82, 0.08), materials.window, 'vault-v2-palace-deep-empty-atrium-mouth');
  entry.position.set(0, PALACE_Y + 0.02, frontZ + 0.14);
  palace.add(entry);
  const entryGlow = mesh(archedPanel(0.58, 0.66, 0.03), materials.warmGlow, 'vault-v2-palace-atrium-inner-glow');
  entryGlow.position.set(0, PALACE_Y + 0.1, frontZ + 0.19);
  palace.add(entryGlow);
  const entryArch = mesh(new THREE.TorusGeometry(0.47, 0.055, 9, segments(quality, 36, 52, 72), Math.PI), materials.gold, 'vault-v2-palace-monumental-entry-gold-arch');
  entryArch.position.set(0, PALACE_Y + 0.84, frontZ + 0.24);
  palace.add(entryArch);
  for (const side of [-1, 1] as const) {
    const column = cylinder(0.045, 0.07, 0.94, 9, materials.gold, 'vault-v2-palace-monumental-entry-column');
    column.position.set(side * 0.47, PALACE_Y + 0.47, frontZ + 0.24);
    palace.add(column);
  }
  const balcony = mesh(new THREE.BoxGeometry(1.36, 0.1, 0.34), materials.marble, 'vault-v2-palace-ceremonial-balcony');
  balcony.position.set(0, PALACE_Y + 1.15, frontZ + 0.18);
  palace.add(balcony);
  const rail = mesh(new THREE.BoxGeometry(1.45, 0.045, 0.04), materials.gold, 'vault-v2-palace-balcony-gold-rail');
  rail.position.set(0, PALACE_Y + 1.42, frontZ + 0.35);
  palace.add(rail);
  for (let index = -5; index <= 5; index += 1) {
    if (index === 0) continue;
    const baluster = cylinder(0.013, 0.018, 0.26, 6, materials.gold, 'vault-v2-palace-balcony-baluster');
    baluster.position.set(index * 0.115, PALACE_Y + 1.29, frontZ + 0.35);
    palace.add(baluster);
  }
  const crest = mesh(new THREE.BoxGeometry(0.72, 0.18, 0.08), materials.blue, 'vault-v2-palace-crest-plaque');
  crest.position.set(0, PALACE_Y + 1.72, frontZ + 0.24);
  palace.add(crest);
  const crestGem = mesh(new THREE.OctahedronGeometry(0.085, 0), materials.cyan, 'vault-v2-palace-crest-gem');
  crestGem.position.set(0, PALACE_Y + 1.72, frontZ + 0.31);
  palace.add(crestGem);
  const crestArch = mesh(new THREE.TorusGeometry(0.38, 0.035, 8, segments(quality, 30, 44, 60), Math.PI), materials.gold, 'vault-v2-palace-upper-crest-arch');
  crestArch.position.set(0, PALACE_Y + 1.78, frontZ + 0.27);
  palace.add(crestArch);
  for (let index = -8; index <= 8; index += 1) {
    const x = index * 0.16;
    const parapet = cylinder(0.014, 0.021, 0.25 + (index % 2 === 0 ? 0.08 : 0), 6, materials.gold, 'vault-v2-palace-roofline-gold-parapet');
    parapet.position.set(x, PALACE_Y + 2.28, frontZ + 0.16);
    palace.add(parapet);
    if (index % 2 === 0) {
      const jewel = mesh(new THREE.OctahedronGeometry(0.035, 0), index % 4 === 0 ? materials.cyan : materials.purple, 'vault-v2-palace-roofline-set-jewel');
      jewel.position.set(x, PALACE_Y + 2.5, frontZ + 0.16);
      palace.add(jewel);
    }
  }
  const parapetRail = mesh(new THREE.BoxGeometry(2.76, 0.035, 0.035), materials.gold, 'vault-v2-palace-roofline-gold-rail');
  parapetRail.position.set(0, PALACE_Y + 2.36, frontZ + 0.16);
  palace.add(parapetRail);
  for (const side of [-1, 1] as const) {
    for (const floor of [0.28, 1.2]) {
      for (const z of [-0.5, -0.08, 0.34]) {
        const sideWindow = mesh(archedPanel(0.2, 0.3, 0.03), materials.window, 'vault-v2-palace-side-arched-window');
        sideWindow.position.set(side * 1.545, PALACE_Y + floor, z);
        sideWindow.rotation.y = side * Math.PI / 2;
        palace.add(sideWindow);
      }
    }
    const flyingButtress = cylinderBetween(
      new THREE.Vector3(side * 1.18, PALACE_Y + 1.62, -0.58),
      new THREE.Vector3(side * 1.5, PALACE_Y + 0.88, -0.72),
      0.045,
      materials.gold,
      'vault-v2-palace-gold-flying-buttress',
    );
    palace.add(flyingButtress);
  }
  addTower(palace, materials, quality, -1.38, 0.15, 0.38, 2.22, true);
  addTower(palace, materials, quality, 1.38, 0.15, 0.38, 2.22, true);
  addTower(palace, materials, quality, -1.18, -0.72, 0.31, 1.92, false);
  addTower(palace, materials, quality, 1.18, -0.72, 0.31, 1.92, false);
  if (quality !== 'low') {
    for (const x of [-0.72, -0.43, 0.43, 0.72]) {
      const turret = cylinder(0.1, 0.13, 0.52, 10, materials.marble, 'vault-v2-palace-roof-crown-turret');
      turret.position.set(x, PALACE_Y + 2.4, -0.48);
      palace.add(turret);
      addSmallDome(palace, materials, quality, x, PALACE_Y + 2.65, -0.48, 0.15, 'vault-v2-palace-roof-turret');
    }
  }
  addMainDome(palace, materials, quality);
  root.add(palace);
}

function createWingChapelGeometry(width: number, height: number, depth: number) {
  const halfWidth = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, height * 0.78);
  shape.lineTo(0, height);
  shape.lineTo(-halfWidth, height * 0.78);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function addPalaceFamily2(root: THREE.Group, materials: Materials, quality: VaultIslandQuality) {
  const palace = new THREE.Group();
  palace.name = 'vault-v2-palace-family-002-octagonal-basilica';

  const core = cylinder(1.02, 1.16, 2.12, segments(quality, 12, 16, 20), materials.marble, 'vault-v2-palace-f2-continuous-octagonal-core');
  core.position.set(0, PALACE_Y + 1.06, -0.2);
  palace.add(core);
  for (const [radius, y, tube, name] of [
    [1.13, PALACE_Y + 0.08, 0.04, 'vault-v2-palace-f2-foundation-gold-course'],
    [1.08, PALACE_Y + 1.02, 0.045, 'vault-v2-palace-f2-floor-separation-gold-course'],
    [1.04, PALACE_Y + 2.08, 0.055, 'vault-v2-palace-f2-roof-gold-course'],
  ] as const) {
    const course = band(radius, tube, materials.gold, quality, name);
    course.position.set(0, y, -0.2);
    palace.add(course);
  }

  for (const side of [-1, 1] as const) {
    const wing = mesh(createWingChapelGeometry(0.86, 1.72, 1.34), materials.marble, 'vault-v2-palace-f2-gabled-wing-chapel');
    wing.position.set(side * 1.02, PALACE_Y, -0.12);
    palace.add(wing);
    const wingCourse = mesh(new THREE.BoxGeometry(0.9, 0.06, 1.42), materials.gold, 'vault-v2-palace-f2-wing-floor-course');
    wingCourse.position.set(side * 1.02, PALACE_Y + 0.86, -0.12);
    palace.add(wingCourse);
    for (const floor of [0.2, 0.98]) {
      addPalaceWindow(palace, materials, quality, side * 1.02, PALACE_Y + floor, 0.59, floor > 0.5 ? 0.82 : 0.94);
    }
  }

  const narthexSurround = mesh(archedPanel(1.1, 1.03, 0.34), materials.marble, 'vault-v2-palace-f2-projecting-vaulted-narthex');
  narthexSurround.position.set(0, PALACE_Y + 0.03, 0.79);
  palace.add(narthexSurround);
  const narthexMouth = mesh(archedPanel(0.72, 0.78, 0.08), materials.void, 'vault-v2-palace-f2-deep-atrium-mouth');
  narthexMouth.position.set(0, PALACE_Y + 0.08, 1.005);
  palace.add(narthexMouth);
  const narthexArch = mesh(new THREE.TorusGeometry(0.46, 0.06, 10, segments(quality, 36, 52, 72), Math.PI), materials.gold, 'vault-v2-palace-f2-monumental-entry-arch');
  narthexArch.position.set(0, PALACE_Y + 1.05, 1.02);
  palace.add(narthexArch);
  for (const side of [-1, 1] as const) {
    const jamb = cylinder(0.052, 0.078, 1.08, 10, materials.gold, 'vault-v2-palace-f2-entry-solomonic-column');
    jamb.position.set(side * 0.46, PALACE_Y + 0.56, 1.02);
    palace.add(jamb);
    const shoulder = mesh(new THREE.OctahedronGeometry(0.075, 0), side < 0 ? materials.purple : materials.cyan, 'vault-v2-palace-f2-entry-shoulder-gem');
    shoulder.position.set(side * 0.46, PALACE_Y + 1.16, 1.06);
    palace.add(shoulder);
  }
  for (let index = 0; index < 7; index += 1) {
    const innerStep = mesh(new THREE.BoxGeometry(0.58 - index * 0.025, 0.055, 0.15), materials.marble, 'vault-v2-palace-f2-visible-atrium-descent-step');
    innerStep.position.set(0, PALACE_Y + 0.2 - index * 0.055, 1.02 - index * 0.11);
    palace.add(innerStep);
  }
  const innerDoor = mesh(new THREE.CircleGeometry(0.3, 36), materials.blue, 'vault-v2-palace-f2-inner-blue-vault-door');
  innerDoor.position.set(0, PALACE_Y + 0.52, 1.06);
  palace.add(innerDoor);
  const innerDoorRing = mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 40), materials.gold, 'vault-v2-palace-f2-inner-vault-door-gold-ring');
  innerDoorRing.position.set(0, PALACE_Y + 0.52, 1.075);
  palace.add(innerDoorRing);

  const balcony = mesh(new THREE.BoxGeometry(1.18, 0.1, 0.36), materials.marble, 'vault-v2-palace-f2-narthex-balcony');
  balcony.position.set(0, PALACE_Y + 1.32, 0.93);
  palace.add(balcony);
  const balconyRail = mesh(new THREE.BoxGeometry(1.25, 0.045, 0.045), materials.gold, 'vault-v2-palace-f2-narthex-balcony-rail');
  balconyRail.position.set(0, PALACE_Y + 1.62, 1.11);
  palace.add(balconyRail);
  for (let index = -4; index <= 4; index += 1) {
    const baluster = cylinder(0.014, 0.02, 0.28, 6, materials.gold, 'vault-v2-palace-f2-balcony-baluster');
    baluster.position.set(index * 0.125, PALACE_Y + 1.48, 1.11);
    palace.add(baluster);
  }
  const crest = mesh(createWingChapelGeometry(0.84, 0.56, 0.12), materials.blue, 'vault-v2-palace-f2-sculpted-blue-crest-gable');
  crest.position.set(0, PALACE_Y + 1.58, 1.01);
  palace.add(crest);
  const crestFrame = mesh(new THREE.TorusGeometry(0.18, 0.028, 8, 32), materials.gold, 'vault-v2-palace-f2-crest-gold-frame');
  crestFrame.position.set(0, PALACE_Y + 1.86, 1.1);
  palace.add(crestFrame);
  const crestGem = mesh(new THREE.OctahedronGeometry(0.095, 0), materials.cyan, 'vault-v2-palace-f2-crest-cyan-gem');
  crestGem.position.set(0, PALACE_Y + 1.86, 1.15);
  palace.add(crestGem);

  const facadeAngles = [-2.3, -1.92, -1.5, -1.1, -0.72, 0.72, 1.1, 1.5, 1.92, 2.3];
  for (const floor of [0.2, 1.16]) {
    facadeAngles.forEach((angle, index) => {
      const radius = 1.03;
      const window = mesh(archedPanel(0.2, 0.32, 0.03), materials.window, 'vault-v2-palace-f2-radial-warm-window');
      window.position.set(Math.sin(angle) * radius, PALACE_Y + floor, -0.2 + Math.cos(angle) * radius);
      window.rotation.y = angle;
      palace.add(window);
      const goldArch = mesh(new THREE.TorusGeometry(0.1, 0.015, 7, 24, Math.PI), materials.gold, 'vault-v2-palace-f2-radial-window-gold-arch');
      goldArch.position.set(Math.sin(angle) * 1.055, PALACE_Y + floor + 0.32, -0.2 + Math.cos(angle) * 1.055);
      goldArch.rotation.y = angle;
      palace.add(goldArch);
      const keystone = mesh(new THREE.OctahedronGeometry(0.035, 0), index % 2 === 0 ? materials.gold : materials.purple, 'vault-v2-palace-f2-window-keystone');
      keystone.position.copy(window.position);
      keystone.position.y += 0.47;
      palace.add(keystone);
    });
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const pilaster = cylinder(0.035, 0.055, 1.9, 7, materials.marble, 'vault-v2-palace-f2-two-floor-radial-pilaster');
    pilaster.position.set(Math.sin(angle) * 1.08, PALACE_Y + 0.98, -0.2 + Math.cos(angle) * 1.08);
    palace.add(pilaster);
    const capital = cylinder(0.068, 0.068, 0.07, 8, materials.gold, 'vault-v2-palace-f2-radial-pilaster-gold-capital');
    capital.position.set(Math.sin(angle) * 1.08, PALACE_Y + 1.91, -0.2 + Math.cos(angle) * 1.08);
    palace.add(capital);
  }

  addTower(palace, materials, quality, -1.34, 0.18, 0.31, 2.36, true);
  addTower(palace, materials, quality, 1.34, 0.18, 0.31, 2.36, true);
  addTower(palace, materials, quality, -1.12, -0.8, 0.27, 2.08, false);
  addTower(palace, materials, quality, 1.12, -0.8, 0.27, 2.08, false);
  addTower(palace, materials, quality, -0.7, 0.42, 0.18, 1.16, true);
  addTower(palace, materials, quality, 0.7, 0.42, 0.18, 1.16, true);

  for (const x of [-0.68, -0.4, 0.4, 0.68]) {
    const turret = cylinder(0.085, 0.12, 0.5, 10, materials.marble, 'vault-v2-palace-f2-roof-crown-turret');
    turret.position.set(x, PALACE_Y + 2.34, -0.52);
    palace.add(turret);
    addSmallDome(palace, materials, quality, x, PALACE_Y + 2.58, -0.52, 0.13, 'vault-v2-palace-f2-roof-turret');
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const post = cylinder(0.014, 0.022, 0.29, 6, materials.gold, 'vault-v2-palace-f2-roof-jewel-parapet');
    post.position.set(Math.sin(angle) * 1.05, PALACE_Y + 2.2, -0.2 + Math.cos(angle) * 1.05);
    palace.add(post);
    const gem = mesh(new THREE.OctahedronGeometry(0.035, 0), index % 3 === 0 ? materials.cyan : materials.gold, 'vault-v2-palace-f2-roof-parapet-gem');
    gem.position.copy(post.position);
    gem.position.y += 0.19;
    palace.add(gem);
  }
  addMainDome(palace, materials, quality);
  root.add(palace);
}

function addWarmLights(root: THREE.Group, quality: VaultIslandQuality) {
  if (quality === 'low') return;
  const positions = [[0, 1.05, 3.25, 1.45], [-1.35, 1.2, 2.65, 0.85], [1.35, 1.2, 2.65, 0.85], [0, 3.65, 1.1, 1.15]] as const;
  positions.forEach(([x, y, z, intensity], index) => {
    const light = new THREE.PointLight(index === 3 ? '#ffd38a' : '#ffc86c', intensity, index === 3 ? 4.2 : 2.8, 2);
    light.name = 'vault-v2-warm-architectural-light';
    light.position.set(x, y, z);
    root.add(light);
  });
  if (quality === 'high') {
    for (const angle of [-0.78, -0.38, 0.38, 0.78]) {
      const light = new THREE.PointLight('#ffd18a', 0.42, 1.45, 2);
      light.name = 'vault-v2-gallery-museum-sconce-light';
      light.position.set(Math.sin(angle) * 3.16, 1.12, Math.cos(angle) * 3.16);
      root.add(light);
    }
    for (const angle of [-2.3, -0.78, 0.78, 2.3]) {
      const light = new THREE.PointLight('#9deeff', 0.28, 1.35, 2);
      light.name = 'vault-v2-garden-jewel-lantern-light';
      light.position.set(Math.sin(angle) * 2.32, GARDEN_Y + 0.63, Math.cos(angle) * 2.32);
      root.add(light);
    }
  }
}

export function createVaultTreasureIslandModelV2(options: VaultTreasureIslandOptions = {}): VaultTreasureIslandRuntime {
  const quality = options.quality ?? 'high';
  const root = new THREE.Group();
  root.name = 'vault-treasure-island-lab-model-v2';
  root.userData.sculptRuntime = {
    id: 'vault-island-exterior-v2',
    representation: 'procedural-threejs-source-led-luxury-environment',
    sourceSha256: '5f2841dcf97303c7e8cf8091d0c02a0c22f24904eeea41044df68ab4a583fa57',
    quality,
    productionUnits: 18,
    version: 2,
  };
  root.userData.palaceReady = false;
  const materialSet = createMaterials();
  const { materials, textures } = materialSet;
  const environment = addEnvironment(root, materials, quality);
  addRockAndMasonry(root, materials, quality);
  addInhabitedGalleries(root, materials, quality);
  addGrandVaultPortal(root, materials, quality);
  addMarinaApproach(root, materials);
  addGarden(root, materials, quality);
  addFountain(root, materials, quality);
  addGardenPavilions(root, materials, quality);
  const perimeterStyles: Record<VaultIslandPerimeterStyle, THREE.Group> = {
    charms: addBracelet(root, materials, quality),
    garden: addGardenPerimeter(root, materials, quality),
    'gold-castle': addGoldCastlePerimeter(root, materials, quality),
  };
  const setPerimeterStyle = (style: VaultIslandPerimeterStyle) => {
    const selectedStyle: VaultIslandPerimeterStyle = style in perimeterStyles ? style : 'charms';
    Object.entries(perimeterStyles).forEach(([id, group]) => {
      group.visible = id === selectedStyle;
    });
    root.userData.perimeterStyle = selectedStyle;
  };
  setPerimeterStyle(options.perimeterStyle ?? 'charms');
  addPalacePodium(root, materials, quality);
  const palaceMount = new THREE.Group();
  palaceMount.name = 'vault-v2-blender-palace-mount';
  palaceMount.position.y = PALACE_Y;
  root.add(palaceMount);
  let loadedPalace: THREE.Object3D | null = null;
  if (typeof window !== 'undefined') {
    const loader = new GLTFLoader();
    loader.load(
      '/assets/islands/special/vault-island/vault-palace.glb',
      (gltf) => {
        loadedPalace = gltf.scene;
        loadedPalace.name = 'vault-v2-blender-palace-v015';
        loadedPalace.traverse((child) => {
          child.castShadow = true;
          child.receiveShadow = true;
          if (!(child instanceof THREE.Mesh)) return;
          const palaceMaterials = Array.isArray(child.material) ? child.material : [child.material];
          palaceMaterials.forEach((palaceMaterial) => {
            if (!(palaceMaterial instanceof THREE.MeshStandardMaterial)) return;
            const materialName = palaceMaterial.name.toLowerCase();
            if (materialName.includes('white-marble')) {
              palaceMaterial.name = 'vault-palace-dressed-honey-limestone';
              palaceMaterial.color.set('#e0cdaa');
              palaceMaterial.roughness = 0.5;
              palaceMaterial.roughnessMap = textures[2];
              palaceMaterial.metalness = 0;
              palaceMaterial.bumpMap = textures[2];
              palaceMaterial.bumpScale = 0.048;
              palaceMaterial.envMapIntensity = 0.74;
            } else if (materialName.includes('polished-gold')) {
              palaceMaterial.color.set('#d7a029');
              palaceMaterial.metalness = 1;
              palaceMaterial.roughness = 0.1;
              palaceMaterial.bumpMap = textures[0];
              palaceMaterial.bumpScale = 0.006;
              palaceMaterial.envMapIntensity = 2.15;
            } else if (materialName.includes('midnight-enamel')) {
              palaceMaterial.color.set('#062c70');
              palaceMaterial.roughness = 0.1;
              palaceMaterial.envMapIntensity = 1.7;
            } else if (materialName.includes('warm-glass')) {
              palaceMaterial.color.set('#100e08');
              palaceMaterial.emissive.set('#a14f09');
              palaceMaterial.emissiveIntensity = 0.3;
              palaceMaterial.roughness = 0.18;
            } else if (materialName.includes('cyan-gem')) {
              palaceMaterial.color.set('#55d6e8');
              palaceMaterial.emissive.set('#073844');
              palaceMaterial.emissiveIntensity = 0.18;
              palaceMaterial.roughness = 0.055;
              palaceMaterial.envMapIntensity = 1.95;
            } else if (materialName.includes('amethyst')) {
              palaceMaterial.color.set('#6925b9');
              palaceMaterial.emissive.set('#260549');
              palaceMaterial.emissiveIntensity = 0.16;
              palaceMaterial.roughness = 0.055;
              palaceMaterial.envMapIntensity = 1.95;
            }
            palaceMaterial.needsUpdate = true;
          });
        });
        palaceMount.add(loadedPalace);
        root.userData.palaceReady = true;
        root.userData.palaceAsset = 'assets/islands/special/vault-island/vault-palace.glb';
      },
      undefined,
      (error) => {
        root.userData.palaceLoadError = error instanceof Error ? error.message : String(error);
      },
    );
  }
  addWarmLights(root, quality);
  const bracelet = root.getObjectByName('vault-v2-articulated-charm-bracelet');
  const charms: THREE.Object3D[] = [];
  const boats: THREE.Object3D[] = [];
  const clouds: THREE.Object3D[] = [];
  const waveArcs: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (child.name === 'vault-v2-hanging-faceted-charm') charms.push(child);
    if (child.name === 'vault-v2-sailboat') boats.push(child);
    if (child.name === 'vault-v2-animated-three-dimensional-cloud-bank') clouds.push(child);
    if (child instanceof THREE.Mesh && child.name === 'vault-v2-natural-ocean-wave-arc') {
      child.userData.baseRotationZ = child.rotation.z;
      child.userData.baseOpacity = (child.material as THREE.MeshBasicMaterial).opacity;
      waveArcs.push(child);
    }
  });
  return {
    root,
    setPerimeterStyle,
    update: (elapsedSeconds: number) => {
      if (!options.animated) return;
      (environment.ocean.material as THREE.ShaderMaterial).uniforms.time.value = elapsedSeconds * 0.18;
      (environment.sky.material as THREE.ShaderMaterial).uniforms.time.value = elapsedSeconds;
      (environment.goldenSky.material as THREE.ShaderMaterial).uniforms.time.value = elapsedSeconds;
      if (bracelet) bracelet.rotation.y = Math.sin(elapsedSeconds * 0.25) * 0.008;
      if (loadedPalace) loadedPalace.rotation.y = Math.sin(elapsedSeconds * 0.16) * 0.005;
      charms.forEach((charm, index) => {
        const baseY = Number(charm.userData.baseY) || charm.position.y;
        charm.position.y = baseY + Math.sin(elapsedSeconds * 1.1 + Number(charm.userData.phase || index)) * 0.018;
        charm.rotation.y = elapsedSeconds * 0.22 + index * 0.4;
      });
      boats.forEach((boat, index) => {
        const base = boat.userData.basePosition as THREE.Vector3;
        const phase = Number(boat.userData.phase || index);
        boat.position.y = base.y + Math.sin(elapsedSeconds * 0.72 + phase) * 0.028;
        boat.position.x = base.x + Math.sin(elapsedSeconds * 0.08 + phase) * 0.055;
        boat.rotation.z = Math.sin(elapsedSeconds * 0.64 + phase) * 0.025;
      });
      clouds.forEach((cloud, index) => {
        const base = cloud.userData.basePosition as THREE.Vector3;
        const phase = Number(cloud.userData.phase || index);
        cloud.position.x = base.x + Math.sin(elapsedSeconds * 0.018 + phase) * 0.34;
        cloud.position.y = base.y + Math.sin(elapsedSeconds * 0.024 + phase) * 0.045;
      });
      waveArcs.forEach((wave, index) => {
        const phase = Number(wave.userData.phase || index);
        wave.rotation.z = Number(wave.userData.baseRotationZ) + Math.sin(elapsedSeconds * 0.11 + phase) * 0.014;
        (wave.material as THREE.MeshBasicMaterial).opacity = Number(wave.userData.baseOpacity) * (0.8 + Math.sin(elapsedSeconds * 0.34 + phase) * 0.2);
      });
    },
    dispose: () => {
      const ownedMaterials = new Set<THREE.Material>(Object.values(materials));
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        childMaterials.forEach((material) => {
          if (!ownedMaterials.has(material)) {
            const generatedMap = (material as THREE.MeshBasicMaterial).map;
            if (generatedMap?.userData.vaultGeneratedLabel) generatedMap.dispose();
            material.dispose();
          }
        });
      });
      ownedMaterials.forEach((material) => material.dispose());
      environment.waterNormals.dispose();
      const reflectionTexture = (environment.ocean.material as THREE.ShaderMaterial).uniforms.mirrorSampler?.value as THREE.Texture | undefined;
      reflectionTexture?.dispose();
      materialSet.textures.forEach((texture) => texture.dispose());
    },
  };
}
