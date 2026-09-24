import * as THREE from 'three';
import type { Island2WorldMaterials } from './Island2ThreeWorld';
import type { Island3DQuality } from './island5ThreePilotContract';

type Materials = Island2WorldMaterials;
type Level = 1 | 2 | 3;
type Point = readonly [number, number, number];

function mesh(root: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, at: Point, stage = 2) {
  const part = new THREE.Mesh(geometry, material);
  part.name = `SUNSHORE_V2_${name}`;
  part.position.set(...at);
  part.userData.constructionStage = stage;
  part.userData.explodeWithParent = true;
  root.add(part);
  return part;
}
function block(root: THREE.Group, name: string, size: Point, at: Point, material: THREE.Material, stage = 2) {
  return mesh(root, name, new THREE.BoxGeometry(...size), material, at, stage);
}
function pole(root: THREE.Group, name: string, from: Point, to: Point, radius: number, material: THREE.Material, stage = 2) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const part = mesh(root, name, new THREE.CylinderGeometry(radius * .9, radius, a.distanceTo(b), 8), material,
    a.clone().add(b).multiplyScalar(.5).toArray() as [number, number, number], stage);
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return part;
}
function foundation(root: THREE.Group, m: Materials) {
  mesh(root, 'LIMESTONE_FOOTING', new THREE.CylinderGeometry(1.28, 1.4, .24, 24), m.rock, [0, .24, 0], 1);
  mesh(root, 'TIMBER_DECK', new THREE.CylinderGeometry(1.25, 1.25, .12, 24), m.teak, [0, .42, 0], 1);
  for (let i = 0; i < 3; i++) block(root, `ENTRY_STEP_${i}`, [.72, .12, .23], [0, .12 + i * .11, 1.49 - i * .18], m.rock, 1);
}
function frame(root: THREE.Group, y: number, height: number, m: Materials) {
  for (const x of [-.9, .9]) for (const z of [-.73, .73]) {
    pole(root, `FRAME_${y}_${x}_${z}`, [x, y, z], [x, y + height, z], .075, m.teakDark);
    // Short knee braces give the timber joints believable support.
    pole(root, `FRAME_BRACE_${y}_${x}_${z}`, [x, y + height - .28, z], [x - Math.sign(x) * .28, y + height, z], .038, m.teak);
    const binding = mesh(root, `FRAME_BINDING_${y}_${x}_${z}`, new THREE.TorusGeometry(.08,.018,4,8), m.rope, [x,y+height-.12,z], 2);
    binding.rotation.x = Math.PI / 2;

  }
  for (const z of [-.73, .73]) block(root, `TIE_BEAM_${y}_${z}`, [1.98, .12, .14], [0, y + height, z], m.teakDark);
  for (const x of [-.9, .9]) block(root, `SIDE_BEAM_${y}_${x}`, [.14, .12, 1.6], [x, y + height, 0], m.teakDark);
}
function gableRoof(root: THREE.Group, y: number, width: number, depth: number, m: Materials, quality: Island3DQuality) {
  // A continuous curved roof on either side of the ridge: no bent flat slab.
  for (const side of [-1, 1]) {
    const positions: number[] = [], uv: number[] = [], indices: number[] = [];
    const segments = quality === 'low' ? 5 : 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = side * t * width / 2;
      const h = y + .66 * (1 - t) + .12 * Math.sin(Math.PI * t);
      for (const z of [-depth / 2, depth / 2]) { positions.push(x, h, z); uv.push(t, z > 0 ? 1 : 0); }
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    mesh(root, `THATCH_SHELL_${side}`, geometry, m.thatch, [0, 0, 0], 3);
    block(root, `THICK_EAVE_${side}`, [.13, .17, depth], [side * width / 2, y - .035, 0], m.thatch, 3);
    for (let course=1;course<4;course++) {
      const t=course/4, h=y+.66*(1-t)+.12*Math.sin(Math.PI*t);
      pole(root, `THATCH_COURSE_${side}_${course}`, [side*t*width/2,h+.012,-depth/2], [side*t*width/2,h+.012,depth/2], .018, m.rope, 3);
    }

    const fringeCount = quality === 'low' ? 10 : 22;
    for (let i = 0; i < fringeCount; i++) {
      const z = -depth / 2 + (i + .5) * depth / fringeCount;
      pole(root, `THATCH_FRINGE_${side}_${i}`, [side * (width / 2 - .12), y + .035, z],
        [side * (width / 2 + .05), y - .17 - .055 * Math.sin(i * 3), z], .024, m.thatch, 3);
    }
  }
  pole(root, 'RIDGE_BEAM', [0, y + .68, -depth / 2 - .1], [0, y + .68, depth / 2 + .1], .06, m.teak, 3);
  for (const z of [-depth / 2 + .1, depth / 2 - .1]) for (const s of [-1, 1]) {
    pole(root, `GABLE_RAFTER_${s}_${z}`, [0, y + .61, z], [s * width / 2, y - .03, z], .045, m.teakDark, 3);
  }
}
function balcony(root: THREE.Group, y: number, m: Materials) {
  for (const side of [-1, 1]) {
    pole(root, `BALCONY_SIDE_${y}_${side}`, [side * .95, y + .35, -.82], [side * .95, y + .35, .85], .035, m.teak);
    for (let i = 0; i < 7; i++) pole(root, `BALUSTER_${y}_${side}_${i}`, [side * .95, y, -.78 + i * .26], [side * .95, y + .35, -.78 + i * .26], .022, m.teakDark);
  }
  pole(root, `BALCONY_REAR_${y}`, [-.95, y + .35, -.82], [.95, y + .35, -.82], .035, m.teak);
  for (const side of [-1, 1]) pole(root, `BALCONY_FRONT_${y}_${side}`, [side * .39, y + .35, .85], [side * .95, y + .35, .85], .035, m.teak);
}

/** Fixed foundation and frame persist in all levels; additional storey is additive. */
export function createSunshoreV2HabitLodge(level: Level, quality: Island3DQuality, m: Materials) {
  const root = new THREE.Group(); root.name = `SUNSHORE_V2_HABIT_L${level}`;
  foundation(root, m);
  frame(root, .48, 1.03, m);
  balcony(root, .48, m);
  // L1 is a usable open training pergola, whose beams become the L2 floor joists.
  for (const z of [-.42, 0, .42]) block(root, `PERGOLA_JOIST_${z}`, [1.85, .075, .075], [0, 1.51, z], m.teak, 3);
  pole(root, 'BAG_ROPE', [.5, 1.5, -.4], [.5, 1.26, -.4], .016, m.rope, 4);
  mesh(root, 'TRAINING_BAG', new THREE.CylinderGeometry(.14, .17, .57, 10), m.ink, [.5, .98, -.4], 4);
  block(root, 'TRAINING_MAT', [.55, .018, .62], [-.4, .492, .15], m.oceanCloth, 4);
  block(root, 'L1_WELCOME_PLAQUE', [.28, .15, .04], [-.9, 1.3, .81], m.mangoGold, 5);
  if (level >= 2) {
    block(root, 'UPPER_VERANDA', [2.06, .13, 1.84], [0, 1.61, 0], m.teak, 1);
    frame(root, 1.68, .88, m); balcony(root, 1.68, m);
    gableRoof(root, 2.58, 2.55, 2.05, m, quality);
    for (let i = 0; i < 9; i++) block(root, `UPPER_STAIR_${i}`, [.56, .13, .2], [0, .56 + i * .125, 1.53 - i * .13], m.teak, 2);
    for (const s of [-1, 1]) pole(root, `STAIR_RAIL_${s}`, [s * .33, .9, 1.53], [s * .33, 2.03, .49], .035, m.teakDark);
    block(root, 'UPPER_TRAINING_BOARD', [.7, .45, .07], [0, 2.1, -.72], m.ink, 4);
    block(root, 'UPPER_SUN_BADGE', [.18, .18, .02], [0, 2.12, -.67], m.mangoGold, 5);
  }
  if (level === 3) {
    for (const s of [-1, 1]) {
      block(root, `WELCOME_BANNER_${s}`, [.29, .64, .025], [s * .77, 2.18, .82], m.oceanCloth, 4);
      mesh(root, `BANNER_SUN_${s}`, new THREE.TorusGeometry(.075, .016, 5, 12), m.mangoGold, [s * .77, 2.25, .84], 5);
      pole(root, `BRACE_${s}`, [s * .9, 2.1, -.73], [s * .5, 2.56, -.73], .04, m.teak, 2);
      block(root, `SIDE_PLANTER_${s}`, [.18, .2, .68], [s * 1.04, 1.73, 0], m.teakDark, 1);
    }
  }
  addLandmarkMagic(root, 'habit', level, m);
  root.userData.sculptRuntime = { modelId: 'sunshore-v2-habit', buildLevel: level, clickable: true, explodable: true,
    sockets: { entrance: [0, .35, 1.45], upperDeck: [0, 1.68, 0] }, colliders: [{ type: 'box', size: [2.8, 3.3, 3.2] }], destructionGroups: [{ id: 'habit', breakable: false }] };
  return root;
}

function pavilion(root: THREE.Group, y: number, radius: number, m: Materials, canopy: THREE.Material, quality: Island3DQuality, offsetZ = 0) {
  const points = [new THREE.Vector2(radius, 0), new THREE.Vector2(radius * .85, .14), new THREE.Vector2(radius * .5, .37), new THREE.Vector2(.025, .62)];
  mesh(root, `PAVILION_CANOPY_${offsetZ}`, new THREE.LatheGeometry(points, quality === 'low' ? 16 : 32), canopy, [0, y, offsetZ], 3);
  if (canopy === m.thatch) for (let i = 0; i < (quality === 'low' ? 20 : 40); i++) {
    const a = i / (quality === 'low' ? 20 : 40) * Math.PI * 2;
    pole(root, `CANOPY_FRINGE_${i}`, [Math.cos(a) * (radius - .07), y + .04, offsetZ + Math.sin(a) * (radius - .07)],
      [Math.cos(a) * (radius + .03), y - .12 - .035 * Math.sin(i * 2), offsetZ + Math.sin(a) * (radius + .03)], .023, m.thatch, 3);
  }
  const rim = mesh(root, 'PAVILION_EAVE', new THREE.TorusGeometry(radius, .055, 5, quality === 'low' ? 20 : 36), canopy, [0, y, offsetZ], 3); rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = Math.cos(a) * radius * .84, z = offsetZ + Math.sin(a) * radius * .84;
    pole(root, `CANOPY_POST_${i}`, [x, .48, z], [x, y + .12, z], .048, m.teakDark);
    pole(root, `CANOPY_RAFTER_${i}`, [x, y + .12, z], [0, y + .58, offsetZ], .025, m.teak, 3);
  }
  mesh(root, 'CANOPY_FINIAL', new THREE.SphereGeometry(.085, 10, 8), m.mangoGold, [0, y + .7, offsetZ], 5);
}
function bookcase(root: THREE.Group, x: number, z: number, yaw: number, m: Materials, quality: Island3DQuality) {
  const shelf = new THREE.Group(); shelf.name = `SUNSHORE_V2_BOOKCASE_${x}_${z}`; shelf.position.set(x, .48, z); shelf.rotation.y = yaw;
  // Open-backed shelving keeps book silhouettes readable from both approach directions.
  block(shelf, 'SHELF_BACK_RAIL', [.7, .07, .04], [0, .95, -.13], m.teakDark);
  for (const side of [-1, 1]) block(shelf, `SHELF_SIDE_${side}`, [.055, 1.05, .3], [side * .37, .52, 0], m.teak);
  for (let row = 0; row < 3; row++) {
    block(shelf, `SHELF_LEDGE_${row}`, [.77, .045, .33], [0, .07 + row * .31, 0], m.teak, 4);
    const count = quality === 'low' ? 5 : 8;
    for (let i = 0; i < count; i++) block(shelf, `BOOK_${row}_${i}`, [.057, .18 + .025 * ((i + row) % 3), .18], [-.29 + i * .58 / (count - 1), .18 + row * .31, .025], [m.oceanCloth, m.paper, m.flowerCoral, m.ink][(i + row) % 4], 4);
  }
  root.add(shelf);
}
function trim(root: THREE.Group, radius: number, y: number, m: Materials, quality: Island3DQuality) {
  const count = quality === 'low' ? 12 : 20;
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2;
    if (Math.sin(a) > .8) continue;
    pole(root, `DECK_RAIL_${i}_${y}`, [Math.cos(a) * radius, y, Math.sin(a) * radius], [Math.cos(a) * radius, y + .35, Math.sin(a) * radius], .025, m.teakDark, 2);
  }
  const rail = mesh(root, `DECK_RAIL_CAP_${y}`, new THREE.TorusGeometry(radius, .03, 5, 32, Math.PI * 1.58), m.teak, [0, y + .35, 0], 2);
  rail.rotation.set(Math.PI / 2, 0, .71);
}
function identity(root: THREE.Group, id: string, level: Level) {
  root.userData.sculptRuntime = { modelId: `sunshore-v2-${id}`, buildLevel: level, clickable: true, explodable: true,
    sockets: { entrance: [0, .35, 1.45] }, colliders: [{type:'cylinder',radius:1.4,height:3.2}], destructionGroups:[{id,breakable:false}] };
  return root;
}
export function createSunshoreV2EggGrotto(level: Level, quality: Island3DQuality, m: Materials) {
  const root = new THREE.Group(); root.name = `SUNSHORE_V2_HATCHERY_L${level}`; foundation(root, m);
  const nest = new THREE.Group(); nest.name = 'SUNSHORE_V2_WOVEN_NEST'; nest.position.set(0, .57, .65);
  for (let i = 0; i < 6; i++) {
    const ring = mesh(nest, `NEST_WEAVE_${i}`, new THREE.TorusGeometry(.48 + i * .025, .039, 5, 24), i % 2 ? m.rope : m.teak, [0, i * .038, 0], 2);
    ring.rotation.set(Math.PI / 2 + Math.sin(i * 2) * .035, .04 * Math.sin(i), i * .21);
  }
  const egg = mesh(nest, 'HATCHERY_EGG', new THREE.SphereGeometry(.48, quality === 'low' ? 14 : 24, 16), m.egg, [0, .68, 0], 4); egg.scale.set(.85, 1.25, .85);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399, y = -.28 + i * .065, r = .406 * Math.sqrt(1 - (y / .6) ** 2);
    const spot = mesh(nest, `EGG_SPECKLE_${i}`, new THREE.SphereGeometry(.035 + i % 3 * .008, 6, 4), m.mangoGold, [Math.cos(a)*r,.68+y,Math.sin(a)*r],5); spot.scale.y=.7;
  }
  root.add(nest);
  if (level >= 2) pavilion(root, 1.8, .82, m, m.thatch, quality, -.66);
  if (level === 3) {
    trim(root, 1.18, .49, m, quality);
    for (const s of [-1,1]) {
      const planter = mesh(root, `NEST_GARDEN_${s}`, new THREE.CylinderGeometry(.27,.2,.24,10),m.teak,[s*.91,.59,.61],1);
      planter.userData.constructionStage=1;
      for(let i=0;i<5;i++) {
        const leaf=mesh(root,`NEST_LEAF_${s}_${i}`,new THREE.SphereGeometry(.16,8,5),m.leaf,[s*.91+Math.cos(i*1.26)*.15,.79,.61+Math.sin(i*1.26)*.15],4);leaf.scale.set(.8,.45,1.6);leaf.rotation.y=i*1.26;
      }
      mesh(root,`NEST_FLOWER_${s}`,new THREE.SphereGeometry(.1,8,6),m.flowerCoral,[s*.91,.84,.61],5);
    }
  }
  addLandmarkMagic(root, 'hatchery', level, m);
  return identity(root,'hatchery',level);
}
export function createSunshoreV2StarArchive(level: Level, quality: Island3DQuality, m: Materials) {
  const root = new THREE.Group();root.name=`SUNSHORE_V2_WISDOM_L${level}`;foundation(root,m);
  bookcase(root,0,-.85,0,m,quality);
  for(const s of [-1,1]) bookcase(root,s*.69,-.46,-s*.85,m,quality);
  pole(root,'READING_TABLE_LEG',[0,.48,.4],[0,.81,.4],.11,m.teakDark,4);
  mesh(root,'READING_TABLE',new THREE.CylinderGeometry(.38,.38,.07,16),m.teak,[0,.85,.4],4);
  for(const s of [-1,1]) {const page=block(root,`OPEN_BOOK_${s}`,[.19,.025,.3],[s*.097,.909,.4],m.paper,4);page.rotation.z=s*.1;}
  block(root,'LIBRARY_ENTRY_BADGE',[.22,.09,.035],[0,.39,1.37],m.mangoGold,5);
  // A book-shaped sign is readable from the normal board camera.
  pole(root,'BOOK_SIGN_POST',[-.68,.48,1.02],[-.68,1.27,1.02],.035,m.teakDark,4);
  for(const side of [-1,1]) {
    const cover=block(root,`BOOK_SIGN_COVER_${side}`,[.23,.3,.035],[-.68+side*.115,1.25,1.03],m.oceanCloth,4);cover.rotation.y=side*-.18;
    const page=block(root,`BOOK_SIGN_PAGE_${side}`,[.19,.25,.02],[-.68+side*.11,1.25,1.058],m.paper,4);page.rotation.y=side*-.18;
  }

  if(level>=2) {
    frame(root,.48,1.36,m);gableRoof(root,1.9,2.56,2.03,m,quality);trim(root,1.15,.48,m,quality);
    for(const s of [-1,1]) {
      block(root,`READING_BENCH_${s}`,[.26,.09,.68],[s*.79,.73,.37],m.teak,4);
      for(const z of [.11,.63]) block(root,`BENCH_LEG_${s}_${z}`,[.08,.23,.08],[s*.79,.61,z],m.teakDark,4);
    }
  }
  if(level===3) {
    for(const s of [-1,1]) {
      block(root,`ARCHIVE_BANNER_${s}`,[.23,.57,.024],[s*.93,1.41,.8],m.oceanCloth,4);
      const star=mesh(root,`ARCHIVE_STAR_${s}`,new THREE.OctahedronGeometry(.075),m.mangoGold,[s*.93,1.46,.827],5);star.scale.z=.25;
    }
    mesh(root,'STAR_GLOBE',new THREE.SphereGeometry(.15,14,10),m.lagoonGlass,[-.72,.99,.38],4);
    const meridian=mesh(root,'GLOBE_MERIDIAN',new THREE.TorusGeometry(.2,.018,5,20),m.mangoGold,[-.72,.99,.38],5);meridian.rotation.z=.4;
    pole(root,'GLOBE_STAND',[-.72,.77,.38],[-.72,.84,.38],.045,m.teakDark,4);
  }
  addLandmarkMagic(root, 'wisdom', level, m);
  return identity(root,'wisdom',level);
}
export function createSunshoreV2Oracle(level: Level,quality:Island3DQuality,m:Materials) {
  const root=new THREE.Group();root.name=`SUNSHORE_V2_EVENT_L${level}`;foundation(root,m);
  mesh(root,'ORACLE_BASIN',new THREE.CylinderGeometry(.52,.64,.17,24),m.teak,[0,.56,0],1);
  mesh(root,'ORACLE_WATER',new THREE.CylinderGeometry(.49,.49,.026,24),m.lagoonGlass,[0,.66,0],4);
  pole(root,'ORACLE_SPINDLE',[0,.66,0],[0,1.01,0],.07,m.mangoGold,2);
  const globe=mesh(root,'ORACLE_LAGOON_GLASS',new THREE.SphereGeometry(.35,quality==='low'?16:24,16),m.crystal,[0,1.23,0],4);globe.scale.y=1.12;
  const meridian=mesh(root,'ORACLE_MERIDIAN',new THREE.TorusGeometry(.46,.028,6,28),m.mangoGold,[0,1.23,0],5);meridian.rotation.z=.38;
  if(level>=2) {pavilion(root,1.97,1.3,m,m.oceanCloth,quality);trim(root,1.13,.49,m,quality);}
  if(level===3) {
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      const ring=mesh(root,`CANOPY_SEAM_${i}`,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0,2.61,0),new THREE.Vector3(Math.cos(a)*.65,2.34,Math.sin(a)*.65),new THREE.Vector3(Math.cos(a)*1.3,1.99,Math.sin(a)*1.3)]),8,.013,4,false),m.rope,[0,0,0],3);
      ring.userData.explodeWithParent=true;
      pole(root,`LANTERN_CORD_${i}`,[Math.cos(a)*1.04,1.98,Math.sin(a)*1.04],[Math.cos(a)*1.04,1.72,Math.sin(a)*1.04],.012,m.rope,4);
      mesh(root,`ORACLE_LANTERN_${i}`,new THREE.SphereGeometry(.065,8,6),m.egg,[Math.cos(a)*1.04,1.64,Math.sin(a)*1.04],5);
    }
  }
  addLandmarkMagic(root, 'event', level, m);
  return identity(root,'event',level);
}


type MagicLandmark = 'habit' | 'hatchery' | 'wisdom' | 'event';
function magicPivot(root: THREE.Group, name: string, at: Point, axis: 'y' | 'z', speed: number, bob = 0) {
  const pivot = new THREE.Group(); pivot.name = `SUNSHORE_V2_${name}`; pivot.position.set(...at);
  pivot.userData.sunshoreMagicMotion = {axis, speed, bob};
  root.add(pivot); return pivot;
}
function crystal(root: THREE.Group, name: string, at: Point, size: number, material: THREE.Material) {
  const part = mesh(root, name, new THREE.OctahedronGeometry(size), material, at, 5);
  part.scale.y = 1.65; return part;
}
function celestialDial(root: THREE.Group, name: string, at: Point, radius: number, m: Materials) {
  const dial = magicPivot(root, name, at, 'z', .16);
  mesh(dial, 'DIAL_RIM', new THREE.TorusGeometry(radius, .022, 5, 24), m.mangoGold, [0,0,0], 5);
  crystal(dial, 'DIAL_HEART', [0,0,0], radius*.34, m.magicTeal);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const star=mesh(dial, `DIAL_RAY_${i}`, new THREE.OctahedronGeometry(.046), i%2?m.magicViolet:m.mangoGold,
      [Math.cos(a)*radius,Math.sin(a)*radius,0],5);
    star.scale.y=1.65;star.rotation.z=a-Math.PI/2;
  }
  return dial;
}

/** Small articulated ornaments; each level keeps all earlier funded parts. */
function addLandmarkMagic(root: THREE.Group, id: MagicLandmark, level: Level, m: Materials) {
  if(level<2)return;
  for(const side of [-1,1]) {
    mesh(root, `MAGIC_ENTRY_PLINTH_${side}`, new THREE.CylinderGeometry(.13,.17,.13,8),m.rock,[side*.53,.44,1.21],1);
    pole(root, `MAGIC_ENTRY_STEM_${side}`,[side*.53,.49,1.21],[side*.53,.72,1.21],.035,m.mangoGold,4);
    crystal(root, `MAGIC_ENTRY_CRYSTAL_${side}`,[side*.53,.82,1.21],.105,side<0?m.magicTeal:m.magicViolet);
  }
  if(id==='habit') {
    // A sunwheel under each gable gives both approaches a recognizable identity.
    for(const side of [-1,1]) celestialDial(root,`HABIT_SUNWHEEL_${side}`,[0,2.91,side*1.035],.22,m);
    if(level===3) {
      const heart=magicPivot(root,'HABIT_LEVITATING_FOCUS',[0,2.08,.24],'y',.35,.055);
      crystal(heart,'FOCUS_CRYSTAL',[0,0,0],.16,m.magicTeal);
      const hoop=mesh(heart,'FOCUS_ORBIT',new THREE.TorusGeometry(.25,.018,5,24),m.mangoGold,[0,0,0],5);hoop.rotation.x=.65;
      for(const side of [-1,1])for(let i=0;i<4;i++) {
        const leaf=mesh(root,`VERANDA_LEAF_${side}_${i}`,new THREE.SphereGeometry(.11,7,5),m.leaf,[side*1.04,1.91+i%2*.045,-.24+i*.16],4);
        leaf.scale.set(.65,1.2,1);leaf.rotation.z=side*.4;
        if(i%2===0)crystal(root,`PLANTER_GEM_${side}_${i}`,[side*1.04,2.06,-.24+i*.16],.055,m.magicViolet);
      }
    }
  } else if(id==='hatchery') {
    const halo=mesh(root,'EGG_GUARDIAN_HALO',new THREE.TorusGeometry(.67,.026,6,32),m.mangoGold,[0,1.27,.39],4);
    halo.rotation.z=.15;
    if(level===3) {
      const stars=magicPivot(root,'EGG_CONSTELLATION',[0,1.27,.4],'z',-.12);
      for(let i=0;i<5;i++) {
        const a=i*Math.PI*2/5;
        crystal(stars,`EGG_ORBIT_STAR_${i}`,[Math.cos(a)*.67,Math.sin(a)*.67,0],.075,i%2?m.magicViolet:m.magicTeal);
      }
      const moon=mesh(root,'HATCHERY_MOON',new THREE.TorusGeometry(.18,.037,6,24,Math.PI*1.55),m.mangoGold,[0,2.54,-.66],5);
      moon.rotation.z=-.4;
      crystal(root,'MOON_HEART',[0,2.55,-.66],.085,m.magicViolet);
    }
  } else if(id==='wisdom') {
    for(const side of [-1,1])celestialDial(root,`ARCHIVE_STAR_CLOCK_${side}`,[0,2.2,side*1.026],.19,m);
    if(level===3) {
      const book=magicPivot(root,'FLOATING_STAR_ATLAS',[0,1.22,.5],'y',.12,.07);
      for(const side of [-1,1]) {
        const cover=block(book,`ATLAS_COVER_${side}`,[.21,.024,.28],[side*.108,-.022,0],m.ink,4);cover.rotation.z=side*.22;
        const page=block(book,`ATLAS_PAGE_${side}`,[.19,.027,.26],[side*.103,0,0],m.paper,4);page.rotation.z=side*.22;
        for(let i=0;i<3;i++)mesh(book,`ATLAS_STAR_${side}_${i}`,new THREE.OctahedronGeometry(.018),m.magicViolet,[side*(.04+i*.05),.045,-.075+i*.055],5);
      }
      const orrery=magicPivot(root,'ARCHIVE_ROOF_ORRERY',[0,2.69,0],'y',.19);
      const orbit=mesh(orrery,'PLANET_ORBIT',new THREE.TorusGeometry(.25,.019,5,24),m.mangoGold,[0,0,0],5);orbit.rotation.x=.65;
      crystal(orrery,'ARCHIVE_NORTH_STAR',[0,0,0],.12,m.magicViolet);
      for(const side of [-1,1])mesh(orrery,`PLANET_${side}`,new THREE.SphereGeometry(.055,8,6),m.magicTeal,[side*.25,0,0],5);
    }
  } else {
    // The existing globe and meridian become the inner moving mechanism.
    const globe=root.getObjectByName('SUNSHORE_V2_ORACLE_LAGOON_GLASS');
    if(globe)globe.userData.sunshoreMagicMotion={axis:'y',speed:.22,bob:.035};
    const ring=root.getObjectByName('SUNSHORE_V2_ORACLE_MERIDIAN');
    if(ring)ring.userData.sunshoreMagicMotion={axis:'y',speed:-.18,bob:0};
    if(level===3) {
      const astrolabe=magicPivot(root,'ORACLE_SKY_ASTROLABE',[0,2.75,0],'y',.23);
      for(const side of [-1,1]) {
        const orbit=mesh(astrolabe,`ASTROLABE_ORBIT_${side}`,new THREE.TorusGeometry(.28,.021,6,28),m.mangoGold,[0,0,0],5);
        orbit.rotation.set(side*.65,side*.5,0);
        crystal(astrolabe,`ORBIT_GEM_${side}`,[side*.28,0,0],.075,side<0?m.magicViolet:m.magicTeal);
      }
      crystal(astrolabe,'ASTROLABE_CORE',[0,0,0],.13,m.magicTeal);
      for(let i=0;i<8;i++) {
        const a=i*Math.PI/4;
        crystal(root,`CANOPY_STAR_${i}`,[Math.cos(a)*.73,2.35,Math.sin(a)*.73],.047,i%2?m.magicViolet:m.magicTeal);
      }
    }
  }
}

/** Capture base transforms once; updates move only rigid, batch-compatible pivots. */
export function createSunshoreLandmarkMagicRuntime(roots: Iterable<THREE.Object3D>) {
  const entries: {object:THREE.Object3D; y:number; rotation:THREE.Euler; axis:'y'|'z';speed:number;bob:number}[]=[];
  for(const root of roots)root.traverse(object=>{
    const motion=object.userData.sunshoreMagicMotion;
    if(motion)entries.push({object,y:object.position.y,rotation:object.rotation.clone(),...motion});
  });
  return {update(elapsed:number,reducedMotion:boolean) {
    const time=reducedMotion?0:elapsed;
    for(const item of entries) {
      item.object.rotation.copy(item.rotation);
      item.object.rotation[item.axis]+=time*item.speed;
      item.object.position.y=item.y+Math.sin(time*.85)*item.bob;
    }
  }};
}
