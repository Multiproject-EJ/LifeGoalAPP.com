import * as THREE from 'three';
import type { CrownCitadelMaterials } from './CrownCitadelThreeModel';
import type { Island3DQuality } from './island5ThreePilotContract';

/** User-selected compact three-storey palace. No gameplay or sibling edits.
 * +Y up / +Z entry. Dimensions are recorded in the opening-games sculpt spec. */
export const OPENING_PALACE_ENVELOPE = Object.freeze({
  shellRadius: 1.42, floorY: .30, upperFloorY: 1.52,
  topFloorY: 2.85, topHallRadius: 1.18,
  roofY: 3.86, roofRadius: 1.31, roofRise: .76, maxHeight: 5.55,
  turretRadius: 1.88, stairFront: 2.55, protectedRouteRadius: 2.85,
});

function group(parent: THREE.Group, name: string) {
  const result = new THREE.Group();
  result.name = name;
  result.userData.partId = name;
  result.userData.landmarkId = 'boss';
  parent.add(result);
  return result;
}

function add(parent: THREE.Group, name: string, geometry: THREE.BufferGeometry,
  material: THREE.Material, x: number, y: number, z: number, stage: number) {
  const node = new THREE.Mesh(geometry, material);
  node.name = name;
  node.position.set(x, y, z);
  node.castShadow = true;
  node.receiveShadow = true;
  node.userData = { constructionStage: stage, landmarkId: 'boss',
    partId: parent.name, explodeWithParent: true };
  parent.add(node);
  return node;
}

function disk(parent: THREE.Group, name: string, radius: number, height: number,
  y: number, material: THREE.Material, stage: number, segments: number) {
  return add(parent, name, new THREE.CylinderGeometry(radius, radius, height, segments),
    material, 0, y, 0, stage);
}

function ring(parent: THREE.Group, name: string, radius: number, thickness: number,
  y: number, material: THREE.Material, stage: number, segments: number) {
  const node = add(parent, name, new THREE.TorusGeometry(radius, thickness, 4, segments),
    material, 0, y, 0, stage);
  node.rotation.x = Math.PI / 2;
  return node;
}

/** Open-bottom arch, bent in object space into a thick cylindrical masonry bay.
 * There is no room-sized solid or painted-on doorway behind these apertures. */
function arcadeBay(radius: number, height: number, opening: number, depth: number) {
  const halfWidth = radius * Math.PI / 12 + .002;
  const shoulder = height - opening - .16;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(-halfWidth, height);
  for (let i = 1; i <= 8; i++) shape.lineTo(-halfWidth + 2 * halfWidth * i / 8, height);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(opening, 0);
  shape.lineTo(opening, shoulder);
  shape.absarc(0, shoulder, opening, 0, Math.PI, false);
  shape.lineTo(-opening, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: false, curveSegments: 8, steps: 1,
  });
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const angle = positions.getX(i) / radius;
    const r = radius - depth + positions.getZ(i);
    positions.setXYZ(i, Math.sin(angle) * r, positions.getY(i), Math.cos(angle) * r);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function arcFloor(radius: number, halfAngle: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= 40; i++) {
    const a = -halfAngle + 2 * halfAngle * i / 40;
    shape.lineTo(Math.sin(a) * radius, Math.cos(a) * radius);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function crownRelief(width: number) {
  const s = new THREE.Shape();
  const points = [[-.5,0],[-.5,.46],[-.22,.24],[0,.66],[.22,.24],[.5,.46],[.5,0]];
  points.forEach(([x,y],i) => i ? s.lineTo(x*width,y*width) : s.moveTo(x*width,y*width));
  s.closePath();
  return new THREE.ExtrudeGeometry(s,{depth:.012,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:1});
}

function bannerShape(width: number, height: number) {
  const s = new THREE.Shape();
  s.moveTo(-width/2,height);s.lineTo(width/2,height);s.lineTo(width/2,0);
  s.lineTo(0,height*.13);s.lineTo(-width/2,0);s.closePath();
  return new THREE.ExtrudeGeometry(s,{depth:.018,bevelEnabled:false});
}

/** Only the exposed annulus of a tread, with constant-width carpet edges.
 * A full pie sector would overlap inside the hall into a triangular wedge. */
function runnerTread(outer: number, inner: number, halfWidth: number) {
  const shape=new THREE.Shape();
  for(let i=0;i<=20;i++){
    const x=-halfWidth+2*halfWidth*i/20,z=Math.sqrt(outer*outer-x*x);
    if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);
  }
  for(let i=20;i>=0;i--){
    const x=-halfWidth+2*halfWidth*i/20;
    shape.lineTo(x,Math.sqrt(inner*inner-x*x));
  }
  shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:false});
  geo.rotateX(Math.PI/2);return geo;
}

/** Facade relief follows the accepted masonry; never scales the macro model.
 * Side glazing sits behind the arch reveals. Central front/rear bays stay open. */
function addPalaceOrnament(root: THREE.Group, level: 1 | 2 | 3,
  m: CrownCitadelMaterials, segments: number) {
  const shell = root.getObjectByName('palace-shell') as THREE.Group;
  const facade = group(shell,'palace-facade');
  const amber = new THREE.MeshStandardMaterial({color:0xe8b65a,emissive:0xffb52d,
    emissiveIntensity:.3,roughness:.28,metalness:.08});
  amber.userData.openingCeremonyWindow = true;
  const teal = new THREE.MeshStandardMaterial({color:0x168f99,roughness:.7});
  const crest = crownRelief(.16);
  const floors = level >= 2
    ? [{r:1.42,y:.33,h:1.14,w:.245},{r:1.42,y:1.58,h:1.25,w:.245},{r:1.18,y:2.85,h:.95,w:.20}]
    : [{r:1.42,y:.33,h:1.14,w:.245}];
  floors.forEach(({r,y,h,w},storey) => {
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;
      const bay=group(facade,`PALACE_FACADE_${storey}_${i}`);
      bay.rotation.y=a;
      const opening=storey===0&&i===0?.32:w;
      const shoulder=h-opening-.16;
      const points=[new THREE.Vector3(-opening,0,0),new THREE.Vector3(-opening,shoulder*.5,0)];
      for(let j=0;j<=16;j++){
        const t=Math.PI-j*Math.PI/16;
        points.push(new THREE.Vector3(Math.cos(t)*opening,shoulder+Math.sin(t)*opening,0));
      }
      points.push(new THREE.Vector3(opening,shoulder*.5,0),new THREE.Vector3(opening,0,0));
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(
        Math.sin(p.x/r)*(r+.025),p.y+y,Math.cos(p.x/r)*(r+.025))));
      // Keep the authored curve/radius and every ornament. These tiny tubes
      // previously spent more triangles than the entire dome at phone scale.
      add(bay,`ARCH_GOLD_${storey}_${i}`,new THREE.TubeGeometry(curve,24,.018,4,false),m.gold,0,0,0,3);
      // A keystone anchors the arch apex rather than dangling above the wall.
      add(bay,`ARCH_KEYSTONE_${storey}_${i}`,new THREE.OctahedronGeometry(.048),m.gold,
        0,y+h-.12,r+.035,5).scale.set(.7,1.3,.45);
      const ca=Math.PI/12;
      const cx=Math.sin(ca)*(r+.035),cz=Math.cos(ca)*(r+.035);
      add(bay,`PILASTER_${storey}_${i}`,new THREE.CylinderGeometry(.05,.063,h-.12,12),
        m.limestoneBright,cx,y+h/2,cz,2);
      for(const [label,cy,rad] of [['FOOT',y+.045,.083],['CAPITAL',y+h-.035,.095]] as const){
        add(bay,`${label}_${storey}_${i}`,new THREE.CylinderGeometry(rad,rad*.90,.08,12),m.gold,cx,cy,cz,3);
      }
      if(level>=3){
        for(const side of [-1,1]){
          const volute=new THREE.CatmullRomCurve3([[.01,0],[.08,.045],[.10,.085],[.055,.105],[.04,.07]]
            .map(([x,dy])=>new THREE.Vector3(cx+side*x,y+h-.10+dy,cz+.035)));
          add(bay,`VOLUTE_${storey}_${i}_${side}`,new THREE.TubeGeometry(volute,8,.015,4,false),m.gold,0,0,0,5);
        }
      }
      if(i!==0&&i!==6){
        const glass=new THREE.Shape();
        const gw=opening*.84,gh=shoulder-.04;
        glass.moveTo(-gw,0);glass.lineTo(gw,0);glass.lineTo(gw,gh);
        glass.absarc(0,gh,gw,0,Math.PI,false);glass.closePath();
        add(bay,`RECESSED_GLASS_${storey}_${i}`,new THREE.ExtrudeGeometry(glass,{depth:.02,bevelEnabled:false,curveSegments:8}),
          amber,0,y+.035,r-.095,4);
        add(bay,`WINDOW_MULLION_${storey}_${i}`,new THREE.BoxGeometry(.019,gh+gw,.025),
          m.gold,0,y+.035+(gh+gw)/2,r-.068,4);
        add(bay,`WINDOW_TRANSOM_${storey}_${i}`,new THREE.BoxGeometry(gw*2,.018,.025),
          m.gold,0,y+.035+gh*.62,r-.065,4);
      }
    }
    // Layered continuous cornices make the storeys read around the whole model.
    ring(facade,`STOREY_GOLD_BASE_${storey}`,r+.045,.027,y+.035,m.gold,3,segments);
    ring(facade,`STOREY_GOLD_CORNICE_${storey}`,r+.06,.036,y+h-.015,m.gold,3,segments);
  });
  const balcony=root.getObjectByName('palace-balcony') as THREE.Group;
  for(let i=0;i<7;i++){
    const a=-.66+i*.22;
    const bracket=add(balcony,`BALCONY_CORBEL_${i}`,new THREE.CylinderGeometry(.10,.035,.20,4),
      m.limestoneBright,Math.sin(a)*1.56,1.34,Math.cos(a)*1.56,3);
    bracket.rotation.y=a+Math.PI/4;
  }
  // Begin inset on the second tread: no textile projects onto the grass.
  // Each tread strip touches its curved riser and the next strip above it.
  for(let i=1;i<7;i++){
    const radius=2.55-i*.16;
    add(balcony,`STAIR_RUNNER_${i}`,runnerTread(radius+.008,radius-.16-.008,.235),
      m.banner,0,.07+i*.09-.24+.009,0,3);
    if(i>1){
      const a=Math.asin(.235/(radius+.008));
      add(balcony,`STAIR_RUNNER_RISER_${i}`,
        new THREE.CylinderGeometry(radius+.008,radius+.008,.10,24,1,true,-a,2*a),
        m.banner,0,.07+i*.09-.24-.04,0,3);
    }
  }
  add(balcony,'STAIR_RUNNER_FOOT_TRIM',new THREE.BoxGeometry(.49,.012,.025),
    m.gold,0,.07+.09-.24+.016,2.38,3);
  add(balcony,'PALACE_LANDING_RUNNER',new THREE.BoxGeometry(.47,.009,1.66),
    m.banner,0,.379, .625,3);
  if(level>=2){
    ring(balcony,'UPPER_BALCONY_GOLD_CAP',1.48,.015,3.095,m.gold,3,segments);
    const apron=group(balcony,'BALCONY_ROYAL_APRON');
    add(apron,'BALCONY_BANNER_BORDER',bannerShape(.46,.34),m.gold,0,1.27,1.714,4);
    add(apron,'BALCONY_BANNER_FIELD',bannerShape(.405,.285),m.banner,0,1.30,1.736,4);
    add(apron,'BALCONY_CROWN_BADGE',crest,m.gold,0,1.37,1.76,5);
  }
  const turrets=root.getObjectByName('palace-turrets') as THREE.Group;
  turrets.children.forEach((child,i)=>{
    const tower=child as THREE.Group;
    const h=i===1||i===2?3.36:2.62;
    ring(tower,`TURRET_PLINTH_MOULDING_${i}`,.33,.028,.14,m.gold,3,segments/2);
    if(level<2)return;
    for(const y of [1.05,h-.12]) ring(tower,`TURRET_BELT_${i}_${y}`,.295,.027,y,m.gold,3,segments/2);
    for(let side=0;side<2;side++){
      const panel=group(tower,`TURRET_BANNER_${i}_${side}`);
      panel.rotation.y=(i===1||i===2?Math.PI:0)+side*Math.PI;
      const bh=h>3?1.62:1.19,by=h-bh-.23;
      add(panel,`TURRET_BORDER_${i}_${side}`,bannerShape(.255,bh),m.gold,0,by,.289,4);
      add(panel,`TURRET_TEXTILE_${i}_${side}`,bannerShape(.209,bh-.075),side===0?m.banner:teal,0,by+.04,.312,4);
      add(panel,`TURRET_BADGE_${i}_${side}`,crest,m.gold,0,by+bh*.54,.339,5);
    }
    const roofPoints=[[.37,0],[.29,.16],[.16,.40],[0,.69]];
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;
      const c=new THREE.CatmullRomCurve3(roofPoints.map(([r,y])=>new THREE.Vector3(Math.sin(a)*(r+.005),h+y,Math.cos(a)*(r+.005))));
      add(tower,`TURRET_ROOF_RIB_${i}_${j}`,new THREE.TubeGeometry(c,8,.011,4,false),m.gold,0,0,0,5).userData.island4Roof=true;
    }
    add(tower,`TURRET_SPIRE_${i}`,new THREE.ConeGeometry(.04,.16,12),m.gold,0,h+.75,0,5).userData.island4Roof=true;
    if(level>=3){
      const roof=root.getObjectByName('palace-dome') as THREE.Group;
      // Tangential scroll relief follows the dome surface, rather than a
      // screen-facing graphic or decoration suspended in open space.
      if(i===0)for(let j=0;j<12;j++){
        const a=j*Math.PI/6;
        const motif=group(roof,'DOME_SCROLL_'+j);motif.rotation.y=a;
        for(const side of [-1,1]){
          const c=new THREE.CatmullRomCurve3([[0,.02],[.10,.05],[.14,.13],[.10,.19],[.04,.17],[.055,.11]]
            .map(([x,y])=>{const dy=y+.035;const radius=1.31*Math.sqrt(1-(dy/.76)**2)+.018;return new THREE.Vector3(side*x,3.86+dy,Math.sqrt(radius*radius-x*x));}));
          add(motif,`DOME_SCROLL_TENDRIL_${j}_${side}`,new THREE.TubeGeometry(c,12,.016,4,false),m.gold,0,0,0,5).userData.island4Roof=true;
        }
      }
    }
  });
  const interior=group(shell,'palace-interior');
  add(interior,'CEREMONIAL_DAIS',new THREE.CylinderGeometry(.30,.34,.07,32),m.gold,0,.41,-.55,4);
  add(interior,'DAIS_PURPLE_INLAY',new THREE.CylinderGeometry(.26,.26,.014,32),m.banner,0,.453,-.55,4);
  if(level>=3){
    const crown=root.getObjectByName('crown') as THREE.Group;
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      add(crown,`CROWN_JEWEL_${i}`,new THREE.OctahedronGeometry(.045),i%2?m.pearlAccent:m.purpleRoofBright,
        Math.sin(a)*.50,.13,Math.cos(a)*.50,4);
    }
  }
}

export function createIsland4OpeningPalaceModel(options: {
  level: 1 | 2 | 3; quality: Island3DQuality; materials: CrownCitadelMaterials;
}) {
  const { level, quality, materials: m } = options;
  const root = new THREE.Group();
  root.name = 'OPENING_PALACE';
  root.userData.sculptRuntime = { world: 'island-002-opening-palace', pass: 'compact-ornate-facade',
    clickable: true, explodable: true, socket: 'canonical boss origin', status: 'macro-approved-facade-review',
    destructionGroups: ['palace-shell', 'palace-dome', 'crown', 'palace-turrets', 'palace-balcony'] };
  const segments = quality === 'low' ? 32 : 48;
  const plinthLift = .24;
  const shell = group(root, 'palace-shell');
  const floors = group(shell, 'interior-floors');
  disk(floors, 'PALACE_GROUND_FLOOR', 1.48, .14, .30, m.limestone, 1, segments);
  const lower = group(shell, 'lower-arcade');
  const lowerBay = arcadeBay(1.42, 1.14, .245, .14);
  for (let i = 0; i < 12; i++) {
    const node = add(lower, 'PALACE_LOWER_ARCH_' + i,
      i === 0 ? arcadeBay(1.42, 1.14, .32, .14) : lowerBay, m.limestone, 0, .33, 0, 2);
    node.rotation.y = i * Math.PI / 6;
  }
  disk(floors, 'PALACE_UPPER_FLOOR', 1.48, .12, 1.50, m.limestone, 2, segments);

  const balcony = group(root, 'palace-balcony');
  add(balcony, 'PALACE_SUPPORTED_BALCONY', arcFloor(1.70, .78, .12),
    m.limestoneBright, 0, 1.52, 0, 2);
  // Raised edge belongs to the supported balcony, not decorative dressing.
  for (let i = 0; i <= 14; i++) {
    const a = -.78 + 1.56 * i / 14;
    add(balcony, 'PALACE_BALCONY_PIER_' + i, new THREE.CylinderGeometry(.028,.035,.20,8),
      m.limestoneBright, Math.sin(a)*1.68, 1.62, Math.cos(a)*1.68, 3);
  }
  const rail = add(balcony, 'PALACE_BALCONY_RAIL',
    new THREE.TorusGeometry(1.68,.035,6,32,1.56),m.limestoneBright,0,1.73,0,3);
  rail.rotation.set(Math.PI/2,0,Math.PI/2-.78);
  add(lower, 'PALACE_PROJECTING_ENTRY', arcadeBay(1.51,1.14,.32,.12),
    m.limestoneBright,0,.33,0,2);
  // Curved treads reach the same floor plane; never extend into the tile gutter.
  for (let i = 0; i < 7; i++) {
    add(balcony, 'PALACE_ENTRY_TREAD_' + i, arcFloor(2.55 - i * .16, .49, .09),
      m.limestoneBright, 0, .07 + i * .09 - plinthLift, 0, 1);
  }
  const turrets = group(root, 'palace-turrets');
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2;
    const tower = group(turrets, 'PALACE_TURRET_' + i);
    tower.position.set(Math.sin(angle) * 1.88, .30, Math.cos(angle) * 1.88);
    const h = i === 1 || i === 2 ? 3.36 : 2.62;
    disk(tower, 'TURRET_FOOTING_' + i, .36, .16, .04, m.limestoneShade, 1, segments / 2);
    disk(tower, 'TURRET_BODY_' + i, .29, .98, .49, m.limestone, 2, segments / 2);
    if (level >= 2) disk(tower, 'TURRET_UPPER_BODY_' + i, .29, h-.98, .98+(h-.98)/2, m.limestone, 2, segments / 2);
    const collar = add(shell, 'TURRET_MASONRY_COLLAR_' + i,
      new THREE.BoxGeometry(.37, .74, .48), m.limestone,
      Math.sin(angle) * 1.54, .76, Math.cos(angle) * 1.54, 2);
    collar.rotation.y = angle;
    if (level >= 2) {
      // Radial masonry spines connect each turret to the upper floors, not
      // merely to a low ground-wall collar. Rear spines meet the narrower hall.
      const middleSpine = add(shell, 'TURRET_MIDDLE_SPINE_' + i,
        new THREE.BoxGeometry(.32, 1.14, .52), m.limestone,
        Math.sin(angle)*1.55, 2.19, Math.cos(angle)*1.55, 2);
      middleSpine.rotation.y = angle;
      if (i === 1 || i === 2) {
        const upperSpine = add(shell, 'TURRET_UPPER_SPINE_' + i,
          new THREE.BoxGeometry(.30, .98, .72), m.limestone,
          Math.sin(angle)*1.47, 3.30, Math.cos(angle)*1.47, 2);
        upperSpine.rotation.y = angle;
      }
      const roof = add(tower, 'TURRET_PURPLE_CAP_' + i,
        new THREE.ConeGeometry(.37, .69, segments / 2), m.purpleRoof, 0, h + .345, 0, 5);
      roof.userData.island4Roof = true;
      ring(tower, 'TURRET_EAVE_' + i, .36, .025, h, m.gold, 5, segments / 2);
    }
  }
  if (level >= 2) {
    const upper = group(shell, 'upper-arcade');
    const upperBay = arcadeBay(1.42, 1.25, .245, .14);
    for (let i = 0; i < 12; i++) {
      const node = add(upper, 'PALACE_UPPER_ARCH_' + i, upperBay, m.limestoneBright, 0, 1.58, 0, 2);
      node.rotation.y = i * Math.PI / 6;
    }
    disk(floors, 'PALACE_THIRD_FLOOR', 1.49, .14, 2.79, m.limestone, 1, segments);
    const top = group(shell, 'upper-hall');
    const topBay = arcadeBay(1.18, .95, .20, .14);
    for (let i = 0; i < 12; i++) {
      const node = add(top, 'PALACE_TOP_ARCH_' + i, topBay, m.limestoneBright, 0, 2.85, 0, 2);
      node.rotation.y = i * Math.PI / 6;
    }
    add(balcony, 'PALACE_UPPER_BALCONY', arcFloor(1.50, 1.05, .12), m.limestoneBright, 0, 2.85, 0, 2);
    for (let i = 0; i < 48; i++) {
      const a = Math.PI*2*i/48;
      add(balcony, 'PALACE_UPPER_BALUSTER_' + i, new THREE.CylinderGeometry(.026,.032,.22,8),
        m.limestoneBright,Math.sin(a)*1.48,2.96,Math.cos(a)*1.48,3);
    }
    ring(balcony, 'PALACE_UPPER_RAIL', 1.48, .035, 3.07, m.limestoneBright, 3, segments);
    disk(shell, 'PALACE_ROOF_CORNICE', 1.31, .14, 3.81, m.limestoneBright, 3, segments);
    const roof = group(root, 'palace-dome');
    const profile = Array.from({ length: 25 }, (_, i) => {
      const a = i / 24 * Math.PI / 2;
      return new THREE.Vector2(1.31 * Math.cos(a), .76 * Math.sin(a));
    });
    const dome = add(roof, 'PALACE_ROYAL_DOME', new THREE.LatheGeometry(profile, segments),
      m.purpleRoof, 0, 3.86, 0, 5);
    dome.userData.island4Roof = true;
    ring(roof, 'PALACE_DOME_EAVE', 1.31, .026, 3.87, m.gold, 5, segments);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const curve = new THREE.CatmullRomCurve3(profile.map(p =>
        new THREE.Vector3(Math.sin(a) * (p.x + .012), p.y + 3.87, Math.cos(a) * (p.x + .012))));
      add(roof, 'PALACE_ROOF_MERIDIAN_' + i, new THREE.TubeGeometry(curve, 24, .015, 5, false),
        m.gold, 0, 0, 0, 5).userData.island4Roof = true;
    }
    if (level >= 3) {
      const crown = group(root, 'crown');
      crown.position.y = 4.58;
      // The seating drum embeds in the dome; cage ribs rise entirely above it.
      disk(crown, 'CROWN_SEATING_DRUM', .49, .12, .015, m.gold, 1, segments);
      ring(crown, 'CROWN_BASE_RING', .49, .031, .08, m.gold, 3, segments);
      ring(crown, 'CROWN_MIDDLE_RING', .49, .019, .27, m.gold, 3, segments);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const curve = new THREE.CatmullRomCurve3([[.49,.08],[.51,.22],[.41,.36],[.23,.47],[.065,.52]]
          .map(([r,y]) => new THREE.Vector3(Math.sin(a)*r, y, Math.cos(a)*r)));
        add(crown, 'CROWN_OPEN_RIB_' + i, new THREE.TubeGeometry(curve, 18, .025, 6, false), m.gold, 0, 0, 0, 2);
      }
      disk(crown, 'CROWN_TOP_COLLAR', .095, .05, .54, m.gold, 3, 16);
      add(crown, 'CROWN_FINIAL', new THREE.OctahedronGeometry(.08), m.gold, 0, .61, 0, 5).scale.y = 1.5;
      crown.traverse(n => { n.userData.island4Roof = true; });
    }
  }
  addPalaceOrnament(root,level,m,segments);
  // Lift architecture as one assembly onto a grounded plinth. Treads retain
  // their explicit ground-space heights; no floating first step.
  for (const child of root.children) child.position.y += plinthLift;
  const plinth = group(root, 'palace-plinth');
  disk(plinth, 'PALACE_RAISED_PLINTH', 1.48, .46, .24, m.limestoneShade, 1, segments);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    add(plinth, 'TURRET_PLINTH_' + i, new THREE.CylinderGeometry(.36,.39,.50,segments/2),
      m.limestoneShade,Math.sin(a)*1.88,.25,Math.cos(a)*1.88,1);
  }
  for(const [name,y,z] of [['entry',.62,1.45],['balcony',1.78,1.55],['crown',4.82,0]] as const){
    const socket=new THREE.Object3D();socket.name='PALACE_SOCKET_'+name;socket.position.set(0,y,z);root.add(socket);
  }
  root.userData.sculptRuntime.sockets=['PALACE_SOCKET_entry','PALACE_SOCKET_balcony','PALACE_SOCKET_crown'];
  root.userData.sculptRuntime.colliderProxies=[{type:'cylinder',radius:1.42,height:3.8,center:[0,2.14,0],purpose:'presentation picking only; not gameplay collision'}];
  return root;
}
