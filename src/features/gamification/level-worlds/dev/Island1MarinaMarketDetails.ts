import * as THREE from 'three';
import { MarinaGeometry } from './Island1MarinaGeometry';
import type { Island3DQuality } from './island5ThreePilotContract';
import {
  MARINA_BRIDGE_ANGLES, MARINA_BRIDGE_HALF_LENGTH, MARINA_BRIDGE_HALF_WIDTH,
  MARINA_MARKET_WALK_RADIUS, MARINA_MARKET_OUTER, MARINA_SPOKE_ANGLE,
  MARINA_CANAL_HALF_ANGLE, MARINA_WALK_Y, marinaBridgeHeight, marinaPolar,
} from './Island1MarinaMarketLayout';

const IVORY = 0xece2cf, CREAM = 0xffedce, NAVY = 0x183550, GOLD = 0xc29a50;
const WOOD = 0xa97c4f, GREEN = 0x537b40;
const v = (x: number, y: number, z: number) => [x, y, z];
function ball(b: MarinaGeometry, c: number, p: number[], scale: number[]) {
  b.add(new THREE.SphereGeometry(1, 6, 3), c, p, scale);
}
function cylinder(b: MarinaGeometry, c: number, p: number[], radius: number, height: number, top = radius) {
  b.add(new THREE.CylinderGeometry(top, radius, height, 5), c, p);
}

export interface MarketPersonSocket { position: [number, number, number]; angle: number; seated: boolean }

export function createMarinaMarketDetails(root: THREE.Group, quality: Island3DQuality) {
  const masonry = new MarinaGeometry(), stalls = new MarinaGeometry(), furniture = new MarinaGeometry();
  const plants = new MarinaGeometry(), metal = new MarinaGeometry(), glow = new MarinaGeometry();
  const people: MarketPersonSocket[] = [];
  const signs: THREE.BufferGeometry[] = [];
  const names = ['COFFEE', 'BAKERY', 'FRESH BITES', 'APERITIVO', 'VOYAGERS'];
  let signMap: THREE.CanvasTexture | undefined;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#183550'; ctx.fillRect(0,0,1280,128);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '500 27px Georgia';
      names.forEach((name,i) => {
        ctx.strokeStyle = '#c29a50'; ctx.strokeRect(i*256+8,12,240,104);
        ctx.fillStyle = '#f5e7cb'; ctx.fillText(name,i*256+128,66);
      });
      signMap = new THREE.CanvasTexture(canvas); signMap.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const propBounds: { x: number; z: number; radius: number; kind: string }[] = [];
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), axis = new THREE.Vector3(0, 1, 0);
  const place = (out: MarinaGeometry, part: MarinaGeometry, a: number, r: number, y = .13) => {
    const g = part.finish();
    matrix.compose(new THREE.Vector3(...marinaPolar(r, a, y)), quaternion.setFromAxisAngle(axis, a), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(matrix);
    // MarinaGeometry.add applies its color. Retain authored local vertex colors when merging.
    out.addColored(g);
  };
  const socket = (a: number, r: number, x: number, z: number, facing: number, seated: boolean) => {
    const p = new THREE.Vector3(x, 0, z).applyAxisAngle(axis, a).add(new THREE.Vector3(...marinaPolar(r, a)));
    people.push({ position: p.toArray() as [number, number, number], angle: a + facing, seated });
  };
  const plant = (a: number, r: number, tree: boolean) => {
    const b = new MarinaGeometry();
    cylinder(b, IVORY, v(0, .23, 0), tree ? .43 : .33, .45, tree ? .49 : .38);
    cylinder(b, GOLD, v(0, .43, 0), tree ? .49 : .38, .055);
    b.add(new THREE.CircleGeometry(tree ? .43 : .32, 8), 0x4b3b26, v(0, .46, 0), [1,1,1], [-Math.PI / 2,0,0]);
    if (tree) {
      cylinder(b, 0x776046, v(0, .91, 0), .055, 1.0);
      for (let i = 0; i < 6; i++) {
        const t = i * 2.39996;
        ball(b, [GREEN, 0x698d47, 0x436c3d][i % 3], v(Math.sin(t) * .24, 1.39 + i % 2 * .12, Math.cos(t) * .24), v(.37, .36, .37));
      }
    } else {
      for (let i = 0; i < (quality === 'low' ? 3 : 5); i++) {
        const t = i * 2.39996;
        ball(b, i % 2 ? GREEN : 0x71944d, v(Math.sin(t) * .22, .61, Math.cos(t) * .22), v(.21, .20, .21));
        ball(b, i % 2 ? 0xeaaac0 : 0xffe6a8, v(Math.sin(t) * .29, .77, Math.cos(t) * .29), v(.07, .05, .07));
      }
    }
    place(plants, b, a, r);
    const p = marinaPolar(r, a); propBounds.push({ x: p[0], z: p[2], radius: tree ? .55 : .40, kind: 'planter' });
  };
  const lamp = (a: number, r: number, base = .13) => {
    const b = new MarinaGeometry(), g = new MarinaGeometry();
    cylinder(b, NAVY, v(0, .07, 0), .13, .14);
    cylinder(b, GOLD, v(0, .85, 0), .028, 1.6);
    cylinder(b, GOLD, v(0, 1.60, 0), .083, .10);
    ball(g, 0xffdb8c, v(0, 1.76, 0), v(.14, .18, .14));
    cylinder(b, GOLD, v(0, 1.94, 0), .06, .035);
    place(metal, b, a, r, base); place(glow, g, a, r, base);
  };
  // Balusters and stone handrails follow the actual rising treads.
  for (const a of MARINA_BRIDGE_ANGLES) {
    const b = new MarinaGeometry();
    for (const side of [-1, 1]) {
      const z = side * (MARINA_BRIDGE_HALF_WIDTH - .06);
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const x = -MARINA_BRIDGE_HALF_LENGTH + i * MARINA_BRIDGE_HALF_LENGTH / 10;
        const y = marinaBridgeHeight(x) - MARINA_WALK_Y;
        points.push(new THREE.Vector3(x, y + .65, z));
        if (i % 4 === 0) {
          b.box(IVORY, v(x, y + .06, z), v(.13, .12, .14));
          cylinder(b, IVORY, v(x, y + .32, z), .045, .47, .058);
          ball(b, IVORY, v(x, y + .28, z), v(.067, .095, .067));
        }
      }
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, .065, 4, false), IVORY);
      for (const x of [-MARINA_BRIDGE_HALF_LENGTH, MARINA_BRIDGE_HALF_LENGTH]) {
        b.box(IVORY, v(x, .36, z), v(.23, .72, .23));
        b.box(GOLD, v(x, .75, z), v(.28, .045, .28));
      }
    }
    place(masonry, b, a, MARINA_MARKET_WALK_RADIUS);
    plant(a - .20, MARINA_MARKET_WALK_RADIUS + 1.85, false);
    plant(a + .20, MARINA_MARKET_WALK_RADIUS + 1.85, false);
  }

  // Canal-edge rails leave openings only where the bridge meets each quay.
  for (const center of MARINA_BRIDGE_ANGLES) for (const side of [-1, 1]) {
    const a = center + side * (MARINA_CANAL_HALF_ANGLE + .008);
    for (const [start, end] of [[12.6, 16.1], [18.9, 20.7]]) {
      const b = new MarinaGeometry(), length = end - start;
      b.box(GOLD, v(0, .54, 0), v(.027, .028, length));
      for (let z = -length / 2; z <= length / 2 + .01; z += length / Math.ceil(length / .6)) cylinder(b, GOLD, v(0, .28, z), .018, .56);
      place(metal, b, a, (start + end) / 2);
    }
  }
  // Paired booths in five quiet sectors leave every radial arrival aisle clear.
  for (let section = 0; section < 5; section++) {
    const center = (2 * section + 1.5) * MARINA_SPOKE_ANGLE;
    for (let side = 0; side < 2; side++) {
      const a = center + (side ? .115 : -.115), radius = 14.35;
      const b = new MarinaGeometry(), booth = section * 2 + side;
      b.box(NAVY, v(0, .045, 0), v(2.72, .09, 1.95));
      b.box(WOOD, v(0, .24, .52), v(2.4, .40, .62));
      b.box(IVORY, v(0, .465, .50), v(2.52, .08, .77));
      for (const x of [-.80, 0, .80]) {
        b.box(0x876342, v(x, .25, .841), v(.66, .24, .023));
        b.box(GOLD, v(x, .37, .86), v(.68, .025, .024));
      }
      for (const x of [-1.22, 1.22]) for (const z of [-.80, .80]) cylinder(b, GOLD, v(x, .70, z), .025, 1.4);
      const roof = new THREE.BufferGeometry();
      roof.setAttribute('position', new THREE.Float32BufferAttribute([
        -1.38,1.42,-.97, -1.38,1.68,0, 1.38,1.68,0,
        -1.38,1.42,-.97, 1.38,1.68,0, 1.38,1.42,-.97,
        -1.38,1.68,0, -1.38,1.42,.97, 1.38,1.42,.97,
        -1.38,1.68,0, 1.38,1.42,.97, 1.38,1.68,0,
      ], 3)); roof.computeVertexNormals();
      b.add(roof, CREAM);
      for (const z of [-.97, .97]) {
        b.box(NAVY, v(0, 1.36, z), v(2.76, .13, .045));
        for (let n = 0; n < 13; n++) b.add(new THREE.CircleGeometry(1, 8), NAVY, v(-1.27 + n * .212, 1.29, z), v(.105, .08, 1));
      }
      // Distinct exhibitors, coffee, bakery, fresh food and drinks.
      if (booth % 5 === 0) {
        b.box(NAVY, v(-.6, .71, .5), v(.55, .42, .38));
        b.box(GOLD, v(-.6, .74, .707), v(.41, .04, .02));
        for (const x of [-.73, -.49]) cylinder(b, CREAM, v(x, .555, .82), .065, .10);
      } else if (booth % 5 === 4) {
        ball(b, IVORY, v(0, .75, .49), v(.61, .10, .30));
        ball(b, 0x2677a0, v(0, .83, .44), v(.21, .09, .16));
        b.box(GOLD, v(0, .61, .50), v(.07, .22, .07));
      } else {
        for (let n = 0; n < 8; n++) {
          const x = -.91 + n % 4 * .55, z = .37 + Math.floor(n / 4) * .27;
          b.box(IVORY, v(x, .523, z), v(.39, .025, .22));
          if (booth % 5 === 3) cylinder(b, [0xdd9159, 0x73ac62, 0xc55a49][n % 3], v(x, .65, z), .061, .22);
          else ball(b, booth % 5 === 1 ? 0xcf945a : [0xc66b40, 0x86a452, 0xe6bd6b][n % 3], v(x, .57, z), v(.15, .055, .07));
        }
      }
      const sign = new THREE.PlaneGeometry(1.17,.25);
      const uv = sign.getAttribute('uv');
      for(let i=0;i<uv.count;i++) uv.setX(i,(uv.getX(i)+booth%5)/5);
      sign.translate(0,.26,.866); sign.rotateY(a);
      sign.translate(...marinaPolar(radius,a,.13)); signs.push(sign);
      place(stalls, b, a, radius); socket(a, radius, 0, -.02, Math.PI, false);
      const p = marinaPolar(radius, a); propBounds.push({ x: p[0], z: p[2], radius: 1.55, kind: 'kiosk' });
    }
    for (const offset of [-.18, .18]) {
      const a = center + offset, radius = 19.4, b = new MarinaGeometry();
      cylinder(b, IVORY, v(0, .025, 0), 1.10, .05);
      cylinder(b, NAVY, v(0, .27, 0), .06, .47);
      cylinder(b, CREAM, v(0, .51, 0), .46, .075);
      for (const x of [-.15, .16]) {
        cylinder(b, GOLD, v(x, .56, .04), .085, .014);
        cylinder(b, CREAM, v(x, .615, .04), .047, .1);
      }
      for (const side of [-1, 1]) {
        const x = side * .72;
        b.box(NAVY, v(x, .13, .12), v(.42, .24, .43));
        ball(b, CREAM, v(x, .27, .12), v(.25, .075, .26));
        b.box(CREAM, v(x + side * .20, .43, .12), v(.10, .36, .49));
        socket(a, radius, x, .12, side * Math.PI / 2, true);
      }
      if (offset > 0) {
        cylinder(b, GOLD, v(0, 1.1, 0), .02, 1.12);
        b.add(new THREE.ConeGeometry(.96, .35, 12, 1, true), CREAM, v(0, 1.79, 0));
      }
      place(furniture, b, a, radius);
      const p = marinaPolar(radius, a); propBounds.push({ x: p[0], z: p[2], radius: 1.13, kind: 'cafe' });
    }
    plant(center, 19.65, true);
    plant(center, 12.65, true);
    for (const side of [-1, 1]) plant(center + side * .25, 14.25, false);
  }
  for (let i = 0; i < 10; i++) {
    const a = i * MARINA_SPOKE_ANGLE;
    lamp(a + .17, 11.85); lamp(a + .17, 20.3);
  }
  // Edge rails deliberately break at all ten radial dock connections.
  for (let i = 0; i < 120; i++) {
    const a = i * Math.PI * 2 / 120;
    const atDock = Math.abs(Math.sin(a * 5)) < .28;
    const atCanal = MARINA_BRIDGE_ANGLES.some(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < MARINA_CANAL_HALF_ANGLE + .015);
    if (atDock || atCanal) continue;
    const b = new MarinaGeometry();
    cylinder(b, GOLD, v(0, .28, 0), .018, .56);
    b.box(GOLD, v(0, .53, 0), v(1.11, .026, .026));
    place(metal, b, a, MARINA_MARKET_OUTER - .08);
  }
  const add = (name: string, b: MarinaGeometry, roughness: number, metalness = 0, emissive = false) => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness, side: THREE.DoubleSide,
      ...(emissive ? { emissive: 0xffc477, emissiveIntensity: .8 } : {}) });
    const mesh = new THREE.Mesh(b.finish(), mat); mesh.name = name; mesh.castShadow = quality !== 'low' && !emissive; mesh.receiveShadow = !emissive; root.add(mesh);
  };
  const signGeometry = new THREE.BufferGeometry();
  const signPositions = new Float32Array(signs.length * 18), signUvs = new Float32Array(signs.length * 12);
  signs.forEach((g,i) => { const flat=g.toNonIndexed(); signPositions.set(flat.getAttribute('position').array,i*18); signUvs.set(flat.getAttribute('uv').array,i*12); flat.dispose(); g.dispose(); });
  signGeometry.setAttribute('position',new THREE.BufferAttribute(signPositions,3));
  signGeometry.setAttribute('uv',new THREE.BufferAttribute(signUvs,2));signGeometry.computeVertexNormals();
  const signMesh=new THREE.Mesh(signGeometry,new THREE.MeshStandardMaterial({...(signMap?{map:signMap}:{}),color:signMap?0xffffff:NAVY,roughness:.8}));
  signMesh.name='MARINA_MARKET_STALL_SIGNAGE';root.add(signMesh);
  add('MARINA_BRIDGE_BALUSTRADES', masonry, .66);
  add('MARINA_MARKET_PAVILIONS_AND_DISPLAYS', stalls, .66, .06);
  add('MARINA_CAFE_FURNITURE', furniture, .70);
  add('MARINA_MARKET_PLANTING', plants, .83);
  add('MARINA_MARKET_BRASS_LANTERNS_AND_RAILS', metal, .32, .72);
  add('MARINA_MARKET_WARM_GLOBES', glow, .4, .0, true);
  return { people, propBounds };
}
