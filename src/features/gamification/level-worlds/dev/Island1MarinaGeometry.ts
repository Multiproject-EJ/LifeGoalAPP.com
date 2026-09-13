import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Vertex-colour batches preserve sculpted silhouettes without one draw per detail. */
export class MarinaGeometry {
  private parts: THREE.BufferGeometry[] = [];
  add(geometry: THREE.BufferGeometry, color: number, p: number[] = [0, 0, 0], s: number[] = [1, 1, 1], r: number[] = [0, 0, 0]) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    g.deleteAttribute('uv');
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(p[0],p[1],p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0],r[1],r[2])), new THREE.Vector3(s[0],s[1],s[2]));
    g.applyMatrix4(matrix);
    const c = new THREE.Color(color), values = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) { values[i] = c.r; values[i + 1] = c.g; values[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(values, 3));
    if (!g.attributes.normal) g.computeVertexNormals();
    this.parts.push(g);
  }
  box(color: number, p: number[], s: number[], r?: number[]) { this.add(new THREE.BoxGeometry(1, 1, 1), color, p, s, r); }
  ellipsoid(color: number, p: number[], s: number[]) { this.add(new THREE.SphereGeometry(1, 12, 8), color, p, s); }
  cylinder(color: number, p: number[], radius: number, height: number, r?: number[], top = radius) { this.add(new THREE.CylinderGeometry(top, radius, height, 12), color, p, [1, 1, 1], r); }
  torus(color: number, p: number[], radius: number, tube: number, r: number[] = [Math.PI / 2, 0, 0], arc = Math.PI * 2) { this.add(new THREE.TorusGeometry(radius, tube, 6, 28, arc), color, p, [1, 1, 1], r); }
  outline(color: number, points: number[][], depth: number, y = 0) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .045, bevelThickness: .045, curveSegments: 8 });
    this.add(g, color, [0, y, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  }
  finish() {
    const result = mergeGeometries(this.parts, false)!;
    this.parts.forEach(g => g.dispose()); this.parts = [];
    result.computeBoundingSphere(); return result;
  }
}

const IVORY = 0xeee5d5, NAVY = 0x142c44, GOLD = 0xba8a43, GLASS = 0x187fa4, LIGHT = 0x86eaff;
export const MARINA_SPACECRAFT_ARCHETYPES = ['Ambassador cruiser', 'Manta wing', 'Halo explorer', 'Container hauler', 'Solar sailer', 'Orbital shuttle', 'Scarab transport', 'Twin-hull voyager', 'Survey saucer', 'Spear interceptor'] as const;

export function createMarinaCraftGeometry(family: number, yacht = false) {
  const b = new MarinaGeometry(), type = Math.floor(family / 5) % 10, variant = family % 5;
  const paints = [IVORY, 0x285a7a, 0x713e7b, 0xb64d3c, 0x6c907e];
  const paint = paints[variant], accent = variant === 0 ? GOLD : IVORY;
  const v = variant * .12;
  const pod = (x: number, z: number, size = 1) => {
    b.ellipsoid(NAVY, [x, .12, z], [.23 * size, .22 * size, .75 * size]);
    b.cylinder(accent, [x, .12, z + .50 * size], .22 * size, .22, [Math.PI / 2, 0, 0]);
    b.cylinder(LIGHT, [x, .12, z + .63 * size], .145 * size, .025, [Math.PI / 2, 0, 0]);
  };
  const windowStrip = (x: number, count: number, start: number, spacing: number) => {
    for (let i = 0; i < count; i++) {
      const z=start+i*spacing, contour=Math.sqrt(Math.max(.1,1-((z+.22)/2.2)**2));
      b.ellipsoid(GLASS,[x*contour,.32,z],[.022,.085,.13]);
    }
  };
  if (yacht) {
    b.outline(IVORY, [[0, -2.5], [.65, -1.35], [.7, 1.8], [-.7, 1.8], [-.65, -1.35]], .34, .06);
    b.box(0xa87b52, [0, .15, .4], [1.14, .09, 2.55]);
    b.ellipsoid(IVORY, [0, .38, -.25], [.56, .34, 1.2]);
    b.ellipsoid(GLASS, [0, .52, -.55], [.48, .18, .55]);
    b.box(IVORY, [0, .8, .2], [.8, .09, 1.2]);
    if (variant % 2) { b.cylinder(GOLD, [0, 1.65, .5], .025, 2.9); b.outline(IVORY, [[0, 0], [0, 2.4], [1.2, .2]], .02); }
    return b.finish();
  }
  switch (type) {
    case 0: // Layered cruise liner, uninterrupted tapered upper shell.
      b.ellipsoid(NAVY, [0, -.08, 0], [.83 + v, .32, 2.35]);
      b.ellipsoid(paint, [0, .12, -.22], [.9 + v, .4, 2.2]);
      b.ellipsoid(accent, [0, .43, .02], [.66, .2, 1.6]);
      b.ellipsoid(GLASS, [0, .40, -1.15], [.64, .19, .73]);
      b.box(accent, [0, .7, .25], [.17, .13, 1.3]);
      // Forward boarding vestibule joins the nose and reaches the docking ramp.
      b.box(NAVY,[0,-.24,-2.18],[.58,.70,.46]);
      for(const s of [-1,1])b.box(accent,[s*.30,-.24,-2.34],[.065,.76,.12]);
      b.box(accent,[0,.13,-2.34],[.64,.06,.14]);
      b.box(LIGHT,[0,.065,-2.415],[.42,.045,.025]);
      for (const s of [-1, 1]) { pod(s * (.9 + v), .8, 1.2); windowStrip(s * (.79 + v), 7, -1.1, .35); }
      break;
    case 1: // Continuous crescent wing rather than a box stuck through a cone.
      b.outline(paint, [[0,-2.6], [.55,-.9], [2.3+v,.65], [2.6+v,1.8], [1,.82], [0,1.2], [-1,.82], [-2.6-v,1.8], [-2.3-v,.65], [-.55,-.9]], .21, .13);
      b.ellipsoid(NAVY, [0,.21,-.3],[.4,.24,1.65]);
      b.ellipsoid(GLASS,[0,.44,-.9],[.3,.14,.61]);
      for(const s of [-1,1]){pod(s*1.45,.76,.8);b.box(accent,[s*.9,.19,.03],[.055,.035,1.45],[0,-s*.58,0]);}
      break;
    case 2:
      b.torus(paint,[0,.14,0],1.53+v,.27); b.torus(NAVY,[0,-.04,0],1.55+v,.18);
      b.torus(LIGHT,[0,.32,0],1.53+v,.055);
      b.ellipsoid(paint,[0,.25,-1.63-v],[.48,.4,.7]); b.ellipsoid(GLASS,[0,.49,-1.77-v],[.38,.22,.35]);
      for(let i=0;i<6+variant;i++){const a=i/(6+variant)*Math.PI*2;b.box(accent,[Math.sin(a)*(1.53+v),.32,Math.cos(a)*(1.53+v)],[.24,.22,.4],[0,a,0]);}
      break;
    case 3:
      b.box(NAVY,[0,0,0],[1.45,.34,4.1]);
      for(let i=0;i<3+variant%2;i++)for(const s of [-1,1]){b.cylinder(paint,[s*.48,.38,-.9+i*.77],.4,.66,[Math.PI/2,0,0]);b.torus(accent,[s*.48,.38,-1.2+i*.77],.4,.035,[0,0,0]);}
      b.box(IVORY,[0,.27,-1.94],[1.14,.65,.6]);b.box(GLASS,[0,.45,-2.26],[.95,.22,.03]);
      for(const s of [-1,1])pod(s*.83,1.66,1.35);
      break;
    case 4:
      b.ellipsoid(paint,[0,.1,0],[.46,.35,1.8]);
      b.torus(GOLD,[0,.75,.2],1.12,.055,[0,0,0]);
      for(const s of [-1,1]) {
        b.add(new THREE.ConeGeometry(.75,2.7+v,3),paint,[s*.83,1.3,.2],[.65,1,.13],[0,0,-s*.23]);
        b.box(GOLD,[s*.83,1.3,.24],[.035,2.65,.05],[0,0,-s*.23]);pod(s*.45,.9,.7);
      }
      b.ellipsoid(GLASS,[0,.34,-1.06],[.31,.18,.5]);
      break;
    case 5:
      b.outline(paint,[[0,-2.5],[.65,-1.65],[.85,.9],[.42,1.7],[-.5,1.7],[-.7,-1.1]],.48,.18);
      b.ellipsoid(GLASS,[0,.44,-1.25],[.45,.22,.68]);
      b.outline(accent,[[-.45,.15],[1.7,-.15],[2.1,1.25],[.3,1.18]],.13,.0);
      pod(-.97,.48,1.3);pod(1.45,.62,1.1);
      b.add(new THREE.ConeGeometry(.6,1.3+v,3),paint,[0,.82,1.0],[.13,1,.7]);
      break;
    case 6:
      b.ellipsoid(NAVY,[0,0,0],[1.12,.3,1.6]); b.ellipsoid(paint,[0,.22,.1],[1.05,.63,1.5]);
      b.ellipsoid(GLASS,[0,.47,-1.02],[.63,.35,.61]);
      b.box(GOLD,[0,.85,.28],[.08,.04,1.58]);
      for(const s of [-1,1])for(let i=0;i<3;i++){b.box(accent,[s*1.1,.1,-.7+i*.7],[.8,.12,.16],[0,s*(.4-i*.3),s*.2]);pod(s*1.46,-.7+i*.7,.55);}
      break;
    case 7:
      for(const s of [-1,1]){
        b.ellipsoid(paint,[s*(.7+v),.14,0],[.36,.36,2.45]);pod(s*(.7+v),1.75,1.1);
        b.ellipsoid(GLASS,[s*(.7+v),.41,-1.25],[.26,.15,.7]);
      }
      b.box(NAVY,[0,.13,.3],[1.8+v*2,.22,1.05]);b.ellipsoid(accent,[0,.39,.3],[.66,.26,.6]);
      if(variant>1)b.torus(GOLD,[0,.5,.6],.5,.045,[0,0,0]);
      break;
    case 8:
      b.ellipsoid(NAVY,[0,0,0],[1.8+v,.23,1.8]);b.ellipsoid(paint,[0,.2,0],[1.73+v,.34,1.73]);
      b.torus(LIGHT,[0,.05,0],1.72,.038);b.ellipsoid(GLASS,[0,.49,-.16],[.77,.48,.77]);
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;b.ellipsoid(accent,[Math.sin(a)*1.2,.39,Math.cos(a)*1.2],[.16,.06,.16]);}
      if(variant>2)for(const s of [-1,1])b.outline(paint,[[s*1,0],[s*2.6,1.8],[s*1.25,1]],.15,.05);
      break;
    case 9:
      b.outline(paint,[[0,-3.1],[.48,-.4],[1.7+v,1.5],[.52,.95],[.28,2],[-.28,2],[-.52,.95],[-1.7-v,1.5],[-.48,-.4]],.22,.1);
      b.ellipsoid(NAVY,[0,.12,-.3],[.28,.3,2.18]);b.ellipsoid(GLASS,[0,.44,-.48],[.22,.16,.71]);
      for(const s of [-1,1]){pod(s*.59,1.3,.95);b.box(GOLD,[s*.75,.22,.62],[.04,.03,1.25],[0,-s*.6,0]);}
      break;
  }
  // Variant-specific physical hardware: different sail, antenna, dorsal and pod layouts.
  if(variant===1 || variant===4)for(const s of [-1,1])b.box(accent,[s*.32,.55,.75],[.055,.55+v,.6],[.2,0,s*.25]);
  if(variant===2)b.torus(GOLD,[0,.63,.7],.34,.045,[0,0,0]);
  if(variant===3){b.cylinder(GOLD,[.38,.78,.65],.025,.8);b.ellipsoid(LIGHT,[.38,1.21,.65],[.07,.07,.07]);}
  // Boarding hatch, landing skids, engine fittings are readable at the dock camera.
  for(const s of [-1,1])b.box(NAVY,[s*.37,-.29,.2],[.11,.16,1.15]);
  b.box(accent,[.42,.18,.38],[.09,.33,.43]);
  return b.finish();
}
