import * as THREE from 'three';
import { ASSEMBLY_UPPER_CONCOURSE_Y, ASSEMBLY_LOWER_GALLERY_Y } from './Island1AssemblyLayout';
import { ISLAND_5_LANDMARKS } from './island5ThreePilotContract';
import type { Island1WorldMaterials } from './Island1ThreeWorld';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

/** Presentation-only furnishings and construction crew; no mission state ownership. */
export function createAssemblyDiplomaticHall(materials: Island1WorldMaterials, floorY: number) {
  const root = new THREE.Group();
  root.name = 'ISLAND_1_DIPLOMATIC_GENERAL_ASSEMBLY';
  const hallStone = new THREE.MeshStandardMaterial({ color: 0xd8cdb2, roughness: .68 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x805139, roughness: 0.48 });
  const upholstery = new THREE.MeshStandardMaterial({ color: 0x234b64, roughness: 0.82 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x91d7df, emissive: 0x366976, emissiveIntensity: 0.45, roughness: 0.35 });
  const dummy = new THREE.Object3D();
  const seatsPerRow = [18, 24, 30, 36, 42, 48, 54];
  const entranceAngles = ISLAND_5_LANDMARKS.filter(def => def.id !== 'boss')
    .map(def => Math.atan2(def.position[0], def.position[2]));
  const radii = [1.56, 2.35, 3.18, 4.04, 4.9, 5.73, 6.55];
  const total = seatsPerRow.reduce((sum, count) => sum + count, 0);
  const batch = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const mesh = new THREE.InstancedMesh(geometry, material, total);
    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  };
  const seats = batch('ISLAND_1_ASSEMBLY_CRATER_DELEGATE_SEATING', new THREE.BoxGeometry(0.27, 0.12, 0.27), upholstery);
  const backs = batch('ISLAND_1_ASSEMBLY_CRATER_DELEGATE_SEAT_BACKS', new THREE.BoxGeometry(0.29, 0.34, 0.08), upholstery);
  const desks = batch('ISLAND_1_ASSEMBLY_DELEGATE_DESKS', new THREE.BoxGeometry(0.4, 0.075, 0.24), timber);
  const desksBase = batch('ISLAND_1_ASSEMBLY_DESK_PEDESTALS', new THREE.BoxGeometry(0.27, 0.3, 0.12), materials.ivoryShade);
  const consoles = batch('ISLAND_1_ASSEMBLY_TRANSLATION_CONSOLES', new THREE.BoxGeometry(0.095, 0.014, 0.07), screen);
  const plates = batch('ISLAND_1_ASSEMBLY_DELEGATE_NAMEPLATES', new THREE.BoxGeometry(0.12, 0.045, 0.016), materials.gold);
  const furniture = [seats, backs, desks, desksBase, consoles, plates];
  const dais = new THREE.Group();
  dais.name = 'ISLAND_1_ASSEMBLY_PRESIDENTIAL_DAIS';
  dais.position.set(0, floorY + 0.34, -2.65);
  root.add(dais);
  const box = (parent: THREE.Group, name: string, size: number[], pos: number[], material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.name = name;
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  box(dais, 'PRESIDIUM_STONE_STAGE', [4.7, 0.25, 1.65], [0, 0, 0], materials.moonstone);
  box(dais, 'PRESIDIUM_WALNUT_DESK', [3.7, 0.46, 0.5], [0, 0.35, -0.15], timber);
  box(dais, 'PRESIDIUM_GOLD_TRIM', [3.75, 0.045, 0.53], [0, 0.59, -0.15], materials.gold);
  box(dais, 'PRESIDIUM_MARBLE_BACKDROP', [5.2, 5.0, 0.22], [0, 2.43, -0.78], hallStone);
  for (let i = -1; i <= 1; i++) {
    box(dais, 'PRESIDENT_CHAIR', [0.35, 0.6, 0.18], [i * 0.86, 0.66, -0.49], upholstery);
  }
  for(const side of [-1,1]) {
    box(dais,'PRESIDIUM_TALL_NAVY_BANNER',[.60,4.25,.035],[side*1.98,2.5,-.63],materials.navy);
    box(dais,'PRESIDIUM_BANNER_GOLD_EDGE',[.018,4.3,.04],[side*2.285,2.5,-.6],materials.gold);
    box(dais,'PRESIDIUM_STONE_PILASTER',[.18,5.15,.28],[side*2.58,2.43,-.65],materials.ivory);
  }
  box(dais,'PRESIDIUM_WALNUT_ACOUSTIC_PANEL',[3.16,1.65,.06],[0,1.4,-.635],timber);
  for(let slat=0;slat<23;slat++)box(dais,'PRESIDIUM_ACOUSTIC_FLUTING',[.042,1.69,.042],[-1.47+slat*.134,1.4,-.582],materials.gold);
  for(const y of [.54,2.28,4.89])box(dais,'PRESIDIUM_RECESSED_CORNICE',[4.9,.065,.09],[0,y,-.60],materials.ivoryShade);
  for(let step=0;step<4;step++)box(dais,'PRESIDIUM_BROAD_ARRIVAL_STEP',[3.25+step*.22,.10,.26],[0,-.06-step*.085,.90+step*.23],materials.ivoryShade);
  const emblem=new THREE.Group();emblem.name='ASSEMBLY_GLOBE_AND_LAUREL_EMBLEM';emblem.position.set(0,3.65,-.60);dais.add(emblem);
  for(let i=0;i<3;i++) {
    const meridian=new THREE.Mesh(new THREE.TorusGeometry(.84,.018,5,48),materials.gold);meridian.rotation.y=i*Math.PI/3;emblem.add(meridian);
  }
  for(const y of [-.42,0,.42]) {
    const latitude=new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(.84**2-y**2),.014,5,40),materials.gold);latitude.rotation.x=Math.PI/2;latitude.position.y=y;emblem.add(latitude);
  }
  for(const side of [-1,1])for(let i=0;i<9;i++) {
    const a=.20+i*.14;const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,7,5),materials.gold);leaf.position.set(side*(.89+Math.sin(a)*.3),-.75+Math.cos(a)*.08+i*.16,.03);leaf.scale.set(.055,.14,.02);leaf.rotation.z=-side*(.6+i*.05);emblem.add(leaf);
  }
  const centralAisle=new THREE.Group();centralAisle.name='ASSEMBLY_BROAD_NAVY_CENTRAL_AISLE';root.add(centralAisle);
  const tierEdges=[1.18,1.94,2.76,3.61,4.48,5.32,6.14,6.95];
  for(let row=0;row<7;row++) {
    const width=1.25+row*.055,y=floorY+.28+row*.4;
    box(centralAisle,'DELEGATE_NAVY_CARPET',[width,.026,tierEdges[row+1]-tierEdges[row]],[0,y+.018,(tierEdges[row]+tierEdges[row+1])/2],materials.navy);
    for(const side of [-1,1])box(centralAisle,'CENTRAL_AISLE_BRASS_EDGE',[.018,.018,tierEdges[row+1]-tierEdges[row]],[side*width/2,y+.034,(tierEdges[row]+tierEdges[row+1])/2],materials.gold);
    if(row<6)for(let step=0;step<3;step++)box(centralAisle,'CENTRAL_AISLE_STONE_RISER',[width,.10,.14],[0,y+.1+step*.1,tierEdges[row+1]-.35+step*.13],materials.ivoryShade);
  }
  compactStaticGeometry(centralAisle,'ASSEMBLY_CENTRAL_AISLE');
  const gallery = new THREE.Group();
  gallery.name = 'ISLAND_1_ASSEMBLY_INTERPRETER_GALLERIES';
  root.add(gallery);
  // Two occupied balcony levels share the lift elevation and retain a clear
  // sightline to the dais. Side stairs join the top seating tier to both.
  for(const [tier,y] of [ASSEMBLY_LOWER_GALLERY_Y,ASSEMBLY_UPPER_CONCOURSE_Y].entries()) {
    const inner=tier===0?6.60:6.02;
    const floorGeometry=new THREE.RingGeometry(inner,6.93,40,1,0,Math.PI);floorGeometry.rotateX(-Math.PI/2);
    const floor=new THREE.Mesh(floorGeometry,timber);floor.position.y=y;gallery.add(floor);
    if(tier===1)for(const side of [-1,1]){
      const extensionGeometry=new THREE.RingGeometry(6.60,6.93,20,1,side===1?-.99:Math.PI, .99);extensionGeometry.rotateX(-Math.PI/2);
      const extension=new THREE.Mesh(extensionGeometry,timber);extension.position.y=y;extension.name='UPPER_SIDE_CONCOURSE_TO_LIFT';gallery.add(extension);
      for(const r of [6.61,6.91]) {
        const path=Array.from({length:17},(_,i)=>{const a=side*(.58+i/16*(Math.PI/2-.58));return new THREE.Vector3(Math.sin(a)*r,y+.34,Math.cos(a)*r);});
        gallery.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),16,.018,4,false),materials.gold));
        for(let i=0;i<9;i++){const a=side*(.58+i/8*(Math.PI/2-.58));box(gallery,'UPPER_LIFT_APPROACH_BALUSTER',[.018,.34,.018],[Math.sin(a)*r,y+.17,Math.cos(a)*r],materials.gold);}
      }
    }
    const points=Array.from({length:65},(_,i)=>new THREE.Vector3(Math.sin(Math.PI/2+i/64*Math.PI)*inner,y+.33,Math.cos(Math.PI/2+i/64*Math.PI)*inner));
    gallery.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.024,5,false),materials.gold));
    for(let i=0;i<13;i++) {
      const a=Math.PI-1.08+i*.18;
      const booth=new THREE.Group();booth.position.set(Math.sin(a)*6.72,y+.34,Math.cos(a)*6.72);booth.rotation.y=a;
      box(booth,'GALLERY_ARCHITECTURAL_BOOTH',[.97,.64,.22],[0,0,0],hallStone);
      box(booth,'GALLERY_SMOKED_INTERPRETER_WINDOW',[.84,.40,.035],[0,.025,-.145],materials.navy);
      box(booth,'GALLERY_WALNUT_DESK',[.85,.075,.24],[0,-.15,-.25],timber);
      box(booth,'GALLERY_TRANSLATION_LIGHT',[.8,.022,.035],[0,-.19,-.16],materials.warmGlow);
      for(const x of [-.47,.47])box(booth,'GALLERY_BRASS_MULLION',[.018,.69,.035],[x,0,-.145],materials.gold);
      gallery.add(booth);
    }
  }
  for(const side of [-1,1]) {
    const points:THREE.Vector3[]=[];
    const heights=[floorY+2.68,ASSEMBLY_LOWER_GALLERY_Y,ASSEMBLY_UPPER_CONCOURSE_Y];
    for(let flight=0;flight<2;flight++)for(let step=0;step<9;step++) {
      const t=(flight+step/9)/2,a=side*(1.12+t*.96),r=6.17+t*.28,y=THREE.MathUtils.lerp(heights[flight],heights[flight+1],(step+1)/9);
      const tread=box(gallery,'CONCOURSE_SWEEPING_SIDE_STAIR',[.52,.10,.22],[Math.sin(a)*r,y,Math.cos(a)*r],hallStone);tread.rotation.y=a+Math.PI/2;
      points.push(new THREE.Vector3(Math.sin(a)*(r-.25),y+.33,Math.cos(a)*(r-.25)));
    }
    gallery.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.022,4,false),materials.gold));
    const landingAngle=side*1.60;
    const landing=box(gallery,'CONCOURSE_INTERMEDIATE_STAIR_LANDING',[.70,.12,.62],[Math.sin(landingAngle)*6.52,ASSEMBLY_LOWER_GALLERY_Y,Math.cos(landingAngle)*6.52],hallStone);landing.rotation.y=landingAngle;
    // Side walls join the monumental presidium to the rear occupied galleries.
    const connector=box(gallery,'PRESIDIUM_GALLERY_CONNECTING_WALL',[.32,2.65,2.65],[side*2.72,ASSEMBLY_LOWER_GALLERY_Y+.42,-4.63],hallStone);
    box(gallery,'PRESIDIUM_CONNECTING_WALL_GOLD_CORNICE',[.38,.07,2.70],[side*2.72,ASSEMBLY_LOWER_GALLERY_Y+1.76,-4.63],materials.gold);
    for(let i=0;i<3;i++)box(gallery,'PRESIDIUM_SIDE_RECESSED_WARM_LIGHT',[.04,.5,.12],[side*2.53,ASSEMBLY_LOWER_GALLERY_Y+.55,-3.75-i*.68],materials.warmGlow);

  }
  compactStaticGeometry(dais, 'ASSEMBLY_PRESIDIUM');
  compactStaticGeometry(gallery, 'ASSEMBLY_GALLERIES');
  const crew = new THREE.Group();
  crew.name = 'ISLAND_1_ASSEMBLY_ROBOT_BUILD_CREW';
  root.add(crew);
  const robots = Array.from({ length: 6 }, (_, i) => {
    const robot = new THREE.Group();
    robot.name = `ASSEMBLY_CONSTRUCTION_ROBOT_${i}`;
    const chassis=new THREE.Group();robot.add(chassis);
    box(chassis, 'ROBOT_BODY', [0.34, 0.36, 0.24], [0, 0, 0], materials.ivory);
    box(chassis, 'ROBOT_VISOR', [0.27, 0.09, 0.03], [0, 0.07, 0.14], materials.navy);
    box(chassis, 'ROBOT_EYES', [0.18, 0.025, 0.035], [0, 0.075, 0.165], screen);
    const tool = box(robot, 'ROBOT_WELDING_ARM', [0.045, 0.045, 0.42], [0.22, -0.1, 0.18], materials.gold);
    const weld = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), materials.warmGlow);
    weld.position.set(0.22, -0.1, 0.41);
    robot.add(weld);
    box(chassis, 'ROBOT_CARRIED_PANEL', [0.45, 0.055, 0.25], [-0.15, -0.3, 0.16], timber);
    box(chassis,'ROBOT_BRASS_TOOL_BELT',[.39,.06,.28],[0,-.13,0],materials.gold);
    for(const side of [-1,1]) {
      box(chassis,'ROBOT_HOVER_POD',[.13,.11,.25],[side*.22,-.18,0],materials.navy);
      box(chassis,'ROBOT_HOVER_THRUSTER',[.09,.03,.16],[side*.22,-.245,0],screen);
      box(chassis,'ROBOT_SHOULDER_HOUSING',[.10,.11,.14],[side*.22,.02,.02],materials.ivory);
    }
    box(chassis,'ROBOT_STATUS_BEACON',[.06,.035,.06],[0,.20,0],materials.warmGlow);
    compactStaticGeometry(chassis,`ASSEMBLY_ROBOT_CHASSIS_${i}`);
    robot.scale.setScalar(1.25);
    crew.add(robot);
    return { robot, tool, weld };
  });
  const weldingSparks=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.025),materials.warmGlow,36);
  weldingSparks.name='ASSEMBLY_ROBOT_WELDING_SPARK_BATCH';weldingSparks.frustumCulled=false;crew.add(weldingSparks);
  const smooth = (p: number, start: number, duration: number) => THREE.MathUtils.smoothstep(p, start, start + duration);
  let previous = -1;
  function update(progress: number, elapsed: number) {
    root.visible = progress > 0;
    if (!root.visible) return;
    if (progress !== previous) {
      let index = 0;
      seatsPerRow.forEach((count, row) => {
        const reveal = smooth(progress, 0.22 + row * 0.065, 0.18);
        const y = floorY + 0.28 + row * 0.4;
        for (let n = 0; n < count; n++, index++) {
          // A broad horseshoe keeps the presidential stage and central speaking floor clear.
          const a = -2.22 + 4.44 * (n + 0.5) / count;
          const arrivalAisle = row === 6 && entranceAngles.some(entry => Math.abs(Math.atan2(Math.sin(a - entry), Math.cos(a - entry))) < 0.1);
          const aisle = (Math.abs(Math.sin(a)*radii[row]) < .70+row*.025 && Math.cos(a)>0) || arrivalAisle || n === Math.floor(count / 3) || n === Math.floor(count * 2 / 3);
          const positions = [[radii[row], y + 0.2], [radii[row] + 0.12, y + 0.4], [radii[row] - 0.25, y + 0.45], [radii[row] - 0.25, y + 0.26], [radii[row] - 0.25, y + 0.5], [radii[row] - 0.35, y + 0.51]];
          furniture.forEach((mesh, part) => {
            dummy.position.set(Math.sin(a) * positions[part][0], positions[part][1] - (1 - reveal) * 0.5, Math.cos(a) * positions[part][0]);
            dummy.rotation.set(0, a, 0);
            dummy.scale.setScalar(aisle ? 0.0001 : Math.max(0.0001, reveal));
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
          });
        }
      });
      furniture.forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
      centralAisle.visible = progress > 0.35;
      dais.visible = progress > 0.67;
      dais.position.y = floorY + 0.34 - (1 - smooth(progress, 0.67, 0.2)) * 1.2;
      gallery.visible = progress > 0.78;
      gallery.position.y = -(1 - smooth(progress, 0.78, 0.17));
      previous = progress;
    }
    crew.visible = progress > 0 && progress < 1;
    robots.forEach(({ robot, tool, weld }, i) => {
      const station = Math.floor(progress * 18 + i * 4.5);
      const t = (progress * 18 + i * 4.5) % 1;
      const a = (station + smooth(t, 0.58, 0.4)) * 2.39996;
      const row = Math.min(6, progress * 7);
      const lowerRow = Math.floor(row);
      const r = THREE.MathUtils.lerp(radii[lowerRow], radii[Math.min(6, lowerRow + 1)], row - lowerRow) + 0.16;
      robot.position.set(Math.sin(a) * r, floorY + 0.83 + row * 0.4 + Math.sin(elapsed * 3 + i) * 0.025, Math.cos(a) * r);
      robot.rotation.y = a + Math.PI;
      tool.rotation.x = Math.sin(elapsed * 14 + i) * 0.12;
      weld.visible = t < 0.58;
      weld.scale.setScalar(0.4 + Math.abs(Math.sin(elapsed * 29 + i)));
      for(let j=0;j<6;j++) {
        const pulse=(elapsed*2.4+j/6+i*.13)%1,angle=j*2.399+i;
        const toolPoint=new THREE.Vector3(.275,-.125,.51).applyAxisAngle(new THREE.Vector3(0,1,0),robot.rotation.y).add(robot.position);
        dummy.position.copy(toolPoint).add(new THREE.Vector3(Math.sin(angle)*pulse*.30,pulse*.30-pulse*pulse*.52,Math.cos(angle)*pulse*.30));
        dummy.rotation.set(pulse*8,angle,0);dummy.scale.setScalar(weld.visible?1-pulse:.0001);dummy.updateMatrix();weldingSparks.setMatrixAt(i*6+j,dummy.matrix);
      }
    });
    weldingSparks.instanceMatrix.needsUpdate=true;
  }
  return { root, update };
}
