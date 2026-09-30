import * as THREE from 'three';
import { createIsland7PalaceFacadeV2 } from './Island7PalaceFacadeV2';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Island3DQuality } from './island5ThreePilotContract';
import { ISLAND7_PALACE_AUTHORED_DATA, ISLAND7_PALACE_AUTHORED_REVISION } from './Island7PearlPalaceAuthoredData';

/** Decode only on the DEV factory path. Each invocation owns its typed arrays
 * and BufferGeometries; disposal or authoring on one palace cannot affect another. */
function bytes(encoded: string) {
  const raw = atob(encoded), result = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) result[i] = raw.charCodeAt(i);
  return result.buffer;
}

/** Source-authored Blender massing, without ornament, textures or material finish.
 * The fixed gameplay interface and additive construction stages are unchanged. */
export function createIsland7PearlPalaceV2(
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  neutralMaterial?: THREE.Material,
  night = 0,
): THREE.Group {
  const root = new THREE.Group(); root.name = 'ISLAND_7_PEARL_PALACE_V2';
  const stages = [1, 2, 3].map(number => {
    const group = new THREE.Group(); group.name = `ISLAND_7_PALACE_V2_L${number}`;
    group.userData = { constructionLevel: number, additive: true };
    if (number <= level) root.add(group);
    return group;
  });
  function add(geometry: THREE.BufferGeometry, number: number, name: string) {
    const finish = neutralMaterial ?? new THREE.MeshStandardMaterial({
      color: /FOUNDATION|ENTRANCE/.test(name) ? 0xc9ac71 : /NAVE|GALLERIES|CANOPY/.test(name) ? 0x15869b : /CROWN/.test(name) ? 0xe9ddba : 0xc9e4df,
      roughness: 0.38, metalness: 0.24, emissive: /CROWN/.test(name) ? 0x214b57 : 0x102b35, emissiveIntensity: 0.23,
    });
    if (!neutralMaterial && /TOWERS/.test(name)) {
      const shoulder = /WIDE/.test(name) ? 1.30 : /INTERMEDIATE/.test(name) ? 1.78 : 2.28;
      const positions = geometry.getAttribute('position'), colors = new Float32Array(positions.count * 3);
      const pearl = new THREE.Color(0xe5d4b4), turquoise = new THREE.Color(0x177f96), gold = new THREE.Color(0xdbad58);
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        const color = Math.abs(y - (shoulder - 0.08)) < 0.045 || Math.abs(y - 0.31) < 0.045 ? gold : y > shoulder - 0.12 ? pearl : turquoise;
        colors.set([color.r,color.g,color.b], i * 3);
      }
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      if (finish instanceof THREE.MeshStandardMaterial) { finish.color.setHex(0xffffff); finish.vertexColors = true; }
    }
    const mesh = new THREE.Mesh(geometry, finish); mesh.name = `ISLAND_7_PALACE_V2_${name}`;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { constructionLevel: number, macroPart: name, revision: ISLAND7_PALACE_AUTHORED_REVISION };
    stages[number - 1].add(mesh);
    return mesh;
  }

  // Exact established base/stair geometry, including the approach's footprint.
  const around = quality === 'high' ? 30 : quality === 'medium' ? 24 : 16;
  const plinth = new THREE.CylinderGeometry(1.85, 1.90, 0.16, around * 2);
  plinth.scale(1, 1, 0.77); plinth.translate(0, 0.08, -0.03);
  const base: THREE.BufferGeometry[] = [plinth];
  for (let i = 0; i < 7; i++) {
    const height = 0.055 * (i + 1), width = 1.52 - i * 0.072;
    const step = new THREE.BoxGeometry(width, height, 0.29);
    step.translate(0, height / 2, 1.925 - i * 0.14); base.push(step);
  }
  const baseInputs = base.map(geometry => {
    const result = geometry.index ? geometry.toNonIndexed() : geometry;
    if (result !== geometry) geometry.dispose();
    result.deleteAttribute('uv'); return result;
  });
  const foundation = mergeGeometries(baseInputs, false); baseInputs.forEach(geometry => geometry.dispose());
  if (!foundation) throw new Error('Could not merge palace base');
  add(foundation, 1, 'FOUNDATION_AND_ENTRY_STAIRS');

  for (const packed of ISLAND7_PALACE_AUTHORED_DATA[quality]) {
    if (packed.level > level) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bytes(packed.position)), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(bytes(packed.normal)), 3));
    const index = packed.indexType === 'u16' ? new Uint16Array(bytes(packed.index)) : new Uint32Array(bytes(packed.index));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    add(geometry, packed.level, packed.name);
  }
  if (level >= 2) {
    const segments = quality === 'high' ? 28 : quality === 'medium' ? 24 : 16;
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.40, segments, Math.round(segments * 0.72)), neutralMaterial ?? new THREE.MeshStandardMaterial({ color: 0xe5fff9, emissive: 0x79ffe3, emissiveIntensity: .22 + night * .55, roughness: 0.18, metalness: 0.18 }));
    pearl.name = 'ISLAND_7_PALACE_PEARL_CORE'; pearl.position.set(0, 1.45, 1.32);
    pearl.castShadow = true; pearl.receiveShadow = true;
    pearl.userData = { constructionLevel: 2, geometricRadius: 0.40, macroPart: 'royal-pearl', revision: ISLAND7_PALACE_AUTHORED_REVISION };
    stages[1].add(pearl);
  }
  stages[0].updateWorldMatrix(true, true);
  const windows: THREE.BufferGeometry[] = [];
  const windowRay = new THREE.Raycaster();
  for (let i = 0; i < 8; i++) {
    const angle = (i + 0.5) * Math.PI / 4, outward = new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    windowRay.set(outward.clone().multiplyScalar(3.2).setY(0.97),outward.clone().negate());
    const hit = windowRay.intersectObject(stages[0],true)[0]; if (!hit?.face) continue;
    const shape = new THREE.Shape(); shape.moveTo(-.085,-.20);shape.lineTo(.085,-.20);shape.lineTo(.085,.10);shape.quadraticCurveTo(.085,.19,0,.24);shape.quadraticCurveTo(-.085,.19,-.085,.10);shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape,{depth:.015,bevelEnabled:false,curveSegments:4});
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal));
    geometry.translate(hit.point.x + normal.x*.012,hit.point.y + normal.y*.012,hit.point.z + normal.z*.012); windows.push(geometry);
  }
  if(windows.length) {
    const merged=mergeGeometries(windows,false);windows.forEach(g=>g.dispose());
    if(merged){const mesh=new THREE.Mesh(merged,neutralMaterial??new THREE.MeshStandardMaterial({color:0xffda9c,emissive:0xffad54,emissiveIntensity:.25 + night * 1.2,roughness:.5}));mesh.name='ISLAND_7_PALACE_V2_WARM_PERIMETER_WINDOWS';mesh.userData.constructionLevel=1;stages[0].add(mesh);}
  }
  // Applied shell ribs and warm openings belong to the same additive level.
  if (level >= 2) {
    const trimParts: THREE.BufferGeometry[] = [];
    const pearlCollar = new THREE.TorusGeometry(0.405, 0.027, 5, quality === 'low' ? 16 : 28);
    pearlCollar.translate(0, 1.45, 1.32); trimParts.push(pearlCollar);
    const trim = mergeGeometries(trimParts, false); trimParts.forEach(g => g.dispose());
    if (trim) {
      const mesh = new THREE.Mesh(trim, neutralMaterial ?? new THREE.MeshStandardMaterial({ color: 0xefb85f, metalness: 0.45, roughness: 0.32 }));
      mesh.name = 'ISLAND_7_PALACE_V2_PEARL_BAY_GOLD_RIBS'; mesh.userData.constructionLevel = 2; stages[1].add(mesh);
    }
    const doorShape = new THREE.Shape(); doorShape.moveTo(-0.18,0.36); doorShape.lineTo(0.18,0.36); doorShape.lineTo(0.18,0.72); doorShape.quadraticCurveTo(0.16,0.87,0,0.98); doorShape.quadraticCurveTo(-0.16,0.87,-0.18,0.72); doorShape.closePath();
    const door = new THREE.Mesh(new THREE.ExtrudeGeometry(doorShape,{depth:0.025,bevelEnabled:false,curveSegments:5}), neutralMaterial ?? new THREE.MeshStandardMaterial({color:0xffd18d,emissive:0xffa944,emissiveIntensity:.35 + night * 1.3,roughness:0.4}));
    door.position.z = 1.40; door.name = 'ISLAND_7_PALACE_V2_WARM_ENTRY'; door.userData.constructionLevel = 2; stages[1].add(door);
  }
  if (level >= 2) {
    const facade = createIsland7PalaceFacadeV2(root, quality, neutralMaterial);
    facade.setNight(night); stages[1].add(facade.root);
  }
  root.userData = { revision: ISLAND7_PALACE_AUTHORED_REVISION, presentationOnly: true, macroApproval: 'pending-independent-QC',
    representationFamily: 'authored-shell-roof-palace', level, quality, additiveBuildLevels: true, terrainOwnedExternally: true,
    bossRoot: [0, 0, 0], focusSocket: [0, 1.25, 0], colliderRadius: 1.45, pearlDiameter: 0.80,
    reference: 'pearl-throne-palace/reference-packet/macro-contract.v001.json' };
  return root;
}
