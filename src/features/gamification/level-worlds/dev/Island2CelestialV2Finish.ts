import * as THREE from 'three';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';

type Point = [number, number, number];
type Landmark = 'palace' | 'cloudnest' | 'court' | 'archive' | 'gate';

/** Small additive accents are merged by funded phase/material, never into the approved sculpture. */
export function addCelestialV2Finish(root: THREE.Group, kind: Landmark, materials: Island2CelestialMaterials) {
  function detail(parent: THREE.Object3D, prefix: string) {
    const buckets = new Map<THREE.Material, { positions: number[]; normals: number[]; indices: number[] }>();
    function add(geometry: THREE.BufferGeometry, material: THREE.Material, at: Point = [0, 0, 0], scale: Point = [1, 1, 1], rotation?: THREE.Quaternion) {
      geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), rotation ?? new THREE.Quaternion(), new THREE.Vector3(...scale)));
      const bucket = buckets.get(material) ?? { positions: [], normals: [], indices: [] }; buckets.set(material, bucket);
      const offset = bucket.positions.length / 3;
      bucket.positions.push(...Array.from(geometry.getAttribute('position').array)); bucket.normals.push(...Array.from(geometry.getAttribute('normal').array));
      if (geometry.index) bucket.indices.push(...Array.from(geometry.index.array, i => i + offset));
      else for (let i = 0; i < geometry.getAttribute('position').count; i += 1) bucket.indices.push(offset + i);
      geometry.dispose();
    }
    function box(at: Point, scale: Point, material: THREE.Material = materials.gold, rotation?: THREE.Quaternion) { add(new THREE.BoxGeometry(1, 1, 1), material, at, scale, rotation); }
    function line(points: THREE.Vector3[], width = 0.008, material: THREE.Material = materials.gold) {
      if (points.length < 2) return;
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(3, points.length - 1), width, 3, false), material);
    }
    function star(at: Point, radius: number, facing = 1) {
      box(at, [radius * 0.26, radius * 2, 0.008], materials.gold);
      box(at, [radius * 1.4, radius * 0.24, 0.009], materials.gold);
      add(new THREE.OctahedronGeometry(radius * 0.40), materials.gold, [at[0], at[1], at[2] + facing * 0.01], [1, 1.3, 0.3]);
    }
    function planter(at: Point, width: number) {
      box([at[0], at[1] + 0.037, at[2]], [width, 0.075, 0.14], materials.ivoryShade);
      for (let i = 0; i < 3; i += 1) {
        const x = at[0] + (i - 1) * width * 0.28;
        add(new THREE.IcosahedronGeometry(1, 0), i % 2 ? materials.foliageDark : materials.foliageMid, [x, at[1] + 0.10, at[2]], [width * 0.24, 0.065, 0.095]);
        add(new THREE.OctahedronGeometry(0.028), i % 2 ? materials.blossomLilac : materials.blossomWhite, [x + 0.015, at[1] + 0.148, at[2] + 0.025]);
      }
    }
    function banner(at: Point, width: number, height: number) {
      const shape = new THREE.Shape(); shape.moveTo(-width / 2, height / 2); shape.lineTo(width / 2, height / 2); shape.lineTo(width / 2, -height / 2); shape.lineTo(0, -height * 0.38); shape.lineTo(-width / 2, -height / 2); shape.closePath();
      add(new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false }), materials.sapphire, at);
      box([at[0], at[1] + height / 2, at[2]], [width + 0.055, 0.022, 0.035]);
      star([at[0], at[1] + height * 0.12, at[2] + 0.021], width * 0.24);
    }
    function flush() {
      let index = 0;
      for (const [material, bucket] of buckets) {
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3)); geometry.setIndex(bucket.indices);
        const item = new THREE.Mesh(geometry, material); item.name = `${prefix}_FINISH_BATCH_${index++}`; item.userData.constructionStage = 4; item.receiveShadow = true; parent.add(item);
      }
    }
    return { add, box, line, star, planter, banner, flush };
  }

  if (kind === 'palace') {
    for (const phase of [1, 2, 3]) {
      const parent = root.getObjectByName(`SOLSPIRE_FUNDED_L${phase}`); if (!parent) continue;
      const d = detail(parent, `PALACE_L${phase}`);
      if (phase === 1) {
        for (const side of [-1, 1]) { d.banner([side * 0.47, 1.06, 0.902], 0.15, 0.45); d.planter([side * 0.89, 0.43, 0.95], 0.32); }
        d.star([0, 1.385, 0.898], 0.082);
      }
      if (phase === 2) for (const side of [-1, 1]) { d.banner([side * 0.70, 1.86, 0.002], 0.15, 0.39); d.planter([side * 0.52, 1.38, -0.80], 0.27); }
      // Gold ribs follow exact authored row vertices, rather than approximating the Blender crown by cones.
      const roofs: THREE.Mesh[] = [];
      parent.traverse(item => { if (item instanceof THREE.Mesh && item.name.includes('BLENDER') && item.material === materials.sapphire) roofs.push(item); });
      for (const roof of roofs) {
        const pos = roof.geometry.getAttribute('position'); const rows = new Map<number, THREE.Vector3[]>(); const bounds = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
        const cx = (bounds.min.x + bounds.max.x) / 2, cz = (bounds.min.z + bounds.max.z) / 2;
        for (let i = 0; i < pos.count; i += 1) { const p = new THREE.Vector3().fromBufferAttribute(pos, i); const key = Math.round(p.y * 10000); const row = rows.get(key) ?? []; row.push(p); rows.set(key, row); }
        const ordered = [...rows.entries()].sort((a, b) => a[0] - b[0]);
        const count = roof.name.includes('PRINCIPAL') ? 8 : 4;
        for (let rib = 0; rib < count; rib += 1) {
          const angle = rib / count * Math.PI * 2, direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
          const points = ordered.map(([, row]) => row.reduce((best, p) => (p.x - cx) * direction.x + (p.z - cz) * direction.z > (best.x - cx) * direction.x + (best.z - cz) * direction.z ? p : best, row[0]).clone().addScaledVector(direction, 0.006));
          d.line(points, roof.name.includes('PRINCIPAL') ? 0.009 : 0.006);
        }
      }
      d.flush();
    }
  }
  if (kind === 'cloudnest') {
    const first = root.getObjectByName('CLOUDNEST_FUNDED_L1');
    if (first) {
      const d = detail(first, 'CLOUDNEST_L1');
      for (const side of [-1, 1]) d.planter([-0.16 + side * 0.73, 0.53, 0.62], 0.29);
      const tree = root.getObjectByName('CLOUDNEST_ROOTED_CLOUD_TREE');
      const sockets = tree?.userData.branchSockets as Point[] | undefined;
      sockets?.forEach((point, i) => { if (i % 2) return; const p = new THREE.Vector3(...point).add(tree!.position);
        for (let petal = 0; petal < 3; petal += 1) d.add(new THREE.OctahedronGeometry(0.039), petal === 1 ? materials.blossomLilac : materials.blossomWhite, [p.x + Math.cos(petal * 2.1 + i) * 0.06, p.y + 0.018, p.z + Math.sin(petal * 2.1 + i) * 0.06], [1, 0.65, 1]);
      }); d.flush();
    }
    const second = root.getObjectByName('CLOUDNEST_FUNDED_L2');
    if (second) {
      const d = detail(second, 'CLOUDNEST_L2');
      for (let i = 0; i < 12; i += 1) {
        const a = (i + 0.5) / 12 * Math.PI * 2, b = (i + 1.5) / 12 * Math.PI * 2;
        const points = Array.from({ length: 5 }, (_, j) => { const t = j / 4, angle = a + (b - a) * t; return new THREE.Vector3(-0.16 + Math.sin(angle) * 1.16, 0.81 + Math.sin(t * Math.PI) * 0.13, -0.20 + Math.cos(angle) * 1.16); });
        d.line(points, 0.010);
      } d.flush();
    }
  }
  if (kind === 'court') {
    const wings: THREE.Group[] = []; root.traverse(item => { if (item.name.endsWith('_SCULPTED_WING')) wings.push(item as THREE.Group); });
    for (const wing of wings) {
      const d = detail(wing, wing.name);
      const pier = wing.getObjectByName(`${wing.name}_ARCHITECTURAL_PIER`) as THREE.Mesh; pier.geometry.computeBoundingBox(); const height = pier.geometry.boundingBox!.max.y / 1.44;
      d.banner([0, 0.65 * height, 0.134], 0.14, 0.68 * height);
      for (const side of [-1, 1]) {
        if (side < 0) d.star([0, 0.68 * height, side * 0.14], 0.045, side);
        for (let i = 1; i < 7; i += 2) {
          const tips = [[0.58, 1.04], [0.63, 1.18], [0.65, 1.33], [0.645, 1.48], [0.61, 1.63], [0.55, 1.79], [0.43, 1.92]];
          const startX = 0.075 + i * 0.023, startY = (0.76 + i * 0.074) * height, [tipX, relY] = tips[i];
          const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(startX, startY, side * 0.062), new THREE.Vector3(startX + (tipX - startX) * 0.23, startY + (relY * height - startY) * 0.49, side * 0.063), new THREE.Vector3(tipX - 0.075, relY * height - 0.075 * height, side * 0.042), new THREE.Vector3(tipX, relY * height, 0));
          d.line(Array.from({ length: 5 }, (_, j) => curve.getPoint(0.16 + j * 0.16)), 0.0055, materials.ivoryShade);
        }
      } d.flush();
    }
  }
  if (kind === 'archive') {
    for (const phase of [1, 2]) {
      const parent = root.getObjectByName(`ARCHIVE_FUNDED_L${phase}`); if (!parent) continue; const d = detail(parent, `ARCHIVE_L${phase}`);
      for (const side of [-1, 1]) d.planter([side * (phase === 1 ? 0.92 : 0.66), phase === 1 ? 0.43 : 1.30, phase === 1 ? 0.25 : 0.52], 0.22);
      d.flush();
    }
    const bays: THREE.Group[] = []; root.traverse(item => { if (/ARCHIVE_(LOWER_HALL|UPPER_READING_GALLERY)_READING_BAY_\d+$/.test(item.name)) bays.push(item as THREE.Group); });
    for (const bay of bays) {
      const d = detail(bay, bay.name); d.box([0, 0.047, 0.142], [0.12, 0.025, 0.014]);
      if (bay.name.endsWith('_0')) d.star([0, 0.56, 0.104], 0.048);
      d.flush();
    }
  }
  if (kind === 'gate') {
    const frame = root.getObjectByName('GATE_SUPPORTED_INCLINED_FRAME');
    if (frame) {
      const d = detail(frame, 'GATE_L2_RUNES');
      for (const side of [-1, 1]) for (let i = 0; i < 16; i += 1) {
        const angle = (i + 0.5) / 16 * Math.PI * 2, q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle - Math.PI / 2);
        const at: Point = [Math.cos(angle) * 1.146, Math.sin(angle) * 1.146, side * 0.139];
        d.box(at, [0.010, 0.056, 0.012], materials.gold, q);
        const offset = new THREE.Vector3(i % 2 ? 0.014 : -0.014, 0.015, 0).applyQuaternion(q);
        d.box([at[0] + offset.x, at[1] + offset.y, at[2]], [0.033, 0.010, 0.012], materials.gold, q);
      } d.flush();
    }
    const surface = root.getObjectByName('GATE_VIOLET_PORTAL_DEPTH_VOLUME') as THREE.Mesh | undefined;
    if (surface) {
      const material = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, opacity: { value: 1 } }, side: THREE.DoubleSide,
        vertexShader: `varying vec2 portalPoint; void main(){ portalPoint=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float opacity; uniform float time; varying vec2 portalPoint;
          void main(){
            vec2 p=portalPoint; float r=length(p); float a=atan(p.y,p.x); float t=time*0.22;
            float spiral=pow(max(0.0, sin(a*3.0-r*15.0+t)),9.0);
            float rings=pow(max(0.0,sin(r*29.0+a*1.6-t*1.5)),18.0);
            float core=exp(-r*r*24.0); float rim=exp(-pow((r-0.91)*30.0,2.0));
            vec3 color=mix(vec3(0.075,0.018,0.24),vec3(0.34,0.10,0.74),exp(-r*r*1.6));
            color+=vec3(0.22,0.12,0.54)*spiral*(0.4+0.6*r)+vec3(0.20,0.28,0.55)*rings+vec3(0.48,0.65,0.95)*core+vec3(0.28,0.17,0.47)*rim;
            for(int i=0;i<9;i++){float f=float(i);float angle=f*2.399+t*0.13;float radius=0.28+0.065*f;vec2 star=vec2(cos(angle),sin(angle))*radius;vec2 d=abs(p-star);float sparkle=exp(-dot(d,d)*18000.0)+0.20*exp(-min(d.x*90.0+d.y*600.0,d.y*90.0+d.x*600.0));color+=vec3(0.50,0.57,0.86)*sparkle;}
            gl_FragColor=vec4(color,opacity);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }` });
      material.name = 'GATE_DEEP_VIOLET_ASTRAL_VORTEX'; material.userData.celestialClock = true; surface.material = material;
    }
  }
}
