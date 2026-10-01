import * as THREE from 'three';
import { MarinaGeometry } from './Island1MarinaGeometry';
import { createMarinaMarketPeople } from './Island1MarinaMarketPeople';
import { createMarinaMarketDetails } from './Island1MarinaMarketDetails';
import type { Island3DQuality } from './island5ThreePilotContract';
import {
  MARINA_DECK_Y, MARINA_MARKET_INNER, MARINA_MARKET_OUTER, MARINA_CANAL_INNER,
  MARINA_CANAL_HALF_ANGLE, MARINA_BRIDGE_ANGLES, MARINA_MARKET_WALK_RADIUS,
  MARINA_BRIDGE_HALF_LENGTH, MARINA_BRIDGE_HALF_WIDTH, MARINA_BRIDGE_STEPS,
  MARINA_WALK_Y, marinaBridgeHeight, marinaPolar,
} from './Island1MarinaMarketLayout';

const STONE = 0xe6ddc9, NAVY = 0x172f45, WOOD = 0xa68158;

/** Closed annular sector with a true open canal at its ends. */
function sectorGeometry(inner: number, outer: number, start: number, end: number, height: number) {
  const s = new THREE.Shape(), count = Math.ceil((end - start) * 12);
  s.moveTo(Math.sin(start) * inner, Math.cos(start) * inner);
  for (let i = 0; i <= count; i++) {
    const a = start + (end - start) * i / count;
    s.lineTo(Math.sin(a) * outer, Math.cos(a) * outer);
  }
  for (let i = count; i >= 0; i--) {
    const a = start + (end - start) * i / count;
    s.lineTo(Math.sin(a) * inner, Math.cos(a) * inner);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 1, steps: 1 });
}

export function createMarinaMarket(quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'ISLAND_1_VENETIAN_MARKET';
  root.position.y = MARINA_DECK_Y;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .67, metalness: .05 });
  const add = (name: string, geometry: THREE.BufferGeometry) => {
    const m = new THREE.Mesh(geometry, material); m.name = name;
    m.castShadow = quality !== 'low'; m.receiveShadow = true; root.add(m); return m;
  };
  const deck = new MarinaGeometry();
  const sector = (inner: number, outer: number, a: number, b: number) => {
    deck.add(sectorGeometry(inner, outer, a, b, .36), NAVY, [0, .02, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    deck.add(sectorGeometry(inner, outer, a, b, .10), STONE, [0, .12, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    deck.add(sectorGeometry(inner + .16, outer - .16, a + .009, b - .009, .01), WOOD, [0, .13, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  };
  sector(MARINA_MARKET_INNER, MARINA_CANAL_INNER, 0, Math.PI * 2);
  for (const a of MARINA_BRIDGE_ANGLES) sector(MARINA_CANAL_INNER - .03, MARINA_MARKET_OUTER, a + MARINA_CANAL_HALF_ANGLE, a + Math.PI * 2 / 5 - MARINA_CANAL_HALF_ANGLE);
  for (let n = 0; n < 440; n++) {
    const a = n / 440 * Math.PI * 2;
    const canal = MARINA_BRIDGE_ANGLES.some(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < MARINA_CANAL_HALF_ANGLE + .01);
    const outer = canal ? MARINA_CANAL_INNER - .18 : MARINA_MARKET_OUTER - .18;
    const inner = MARINA_MARKET_INNER + .18, radius = (inner + outer) / 2;
    deck.add(new THREE.PlaneGeometry(.012, outer - inner), 0x91704e, marinaPolar(radius, a, .131), [1,1,1], [-Math.PI / 2, 0, a]);
  }
  add('MARINA_MARKET_DECK_SECTORS', deck.finish());

  const bridge = new MarinaGeometry();
  const half = MARINA_BRIDGE_HALF_LENGTH, width = MARINA_BRIDGE_HALF_WIDTH;
  const shape = new THREE.Shape(); shape.moveTo(-half, -.3);
  shape.lineTo(-half, .13);
  for (let i = 0; i < MARINA_BRIDGE_STEPS * 2; i++) {
    const left = -half + i * half / MARINA_BRIDGE_STEPS;
    const right = left + half / MARINA_BRIDGE_STEPS;
    const y = marinaBridgeHeight((left + right) / 2) - MARINA_WALK_Y + .13;
    shape.lineTo(left, y); shape.lineTo(right, y);
  }
  shape.lineTo(half, .13);
  shape.lineTo(half, -.3); shape.lineTo(1.65, -.3);
  for (let i = 0; i <= 24; i++) {
    const x = 1.65 - i * 3.3 / 24;
    shape.lineTo(x, .60 * (1 - (x / 1.65) ** 2) - .12);
  }
  shape.lineTo(-half, -.3); shape.closePath();
  bridge.add(new THREE.ExtrudeGeometry(shape, { depth: width * 2, bevelEnabled: false, steps: 1 }), STONE, [0, 0, -width]);
  const bridgeMesh = new THREE.InstancedMesh(bridge.finish(), material, 5);
  bridgeMesh.name = 'MARINA_VENETIAN_STEPPED_ARCHES'; bridgeMesh.castShadow = quality !== 'low'; bridgeMesh.receiveShadow = true; root.add(bridgeMesh);
  const dummy = new THREE.Object3D();
  MARINA_BRIDGE_ANGLES.forEach((a, i) => {
    dummy.position.fromArray(marinaPolar(MARINA_MARKET_WALK_RADIUS, a, 0));
    dummy.rotation.y = a; dummy.updateMatrix(); bridgeMesh.setMatrixAt(i, dummy.matrix);
  });
  const details = createMarinaMarketDetails(root, quality);
  const people = createMarinaMarketPeople(root, quality, details.people);
  root.userData.people = { count: people.count, walkers: people.walkers };
  root.userData.propBounds = details.propBounds;
  root.userData.layout = { innerRadius: MARINA_MARKET_INNER, outerRadius: MARINA_MARKET_OUTER, bridgeAngles: MARINA_BRIDGE_ANGLES };
  root.userData.sculptRuntime = { componentIds: root.children.map(c => c.name), destruction: { breakable: false }, sockets: MARINA_BRIDGE_ANGLES.map(a => marinaPolar(MARINA_MARKET_WALK_RADIUS, a)) };
  return {
    root,
    update(progress: number, elapsed: number) {
      const reveal = THREE.MathUtils.smoothstep(progress, .04, .18);
      if (reveal > 0) people.update(elapsed);
      root.visible = reveal > 0; root.scale.y = Math.max(.001, reveal);
      root.position.y = MARINA_DECK_Y - (1 - reveal) * .8;
    },
  };
}
